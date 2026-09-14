const prisma = require('../config/prisma');
const { asyncHandler, buildOrderNumber, paginationParams, paginatedResponse } = require('../utils/helpers');
const { hashToken, generateUploadToken, uploadTokenExpiry } = require('../utils/tokens');
const { sendEmail, orderPlacedEmail, statusChangedEmail, paymentReceivedEmail, deliverableReadyEmail } = require('../utils/email');
const { sendPushToOrder } = require('../utils/push');

function scopeToAdmin(req, extraWhere = {}) {
  if (req.admin.role === 'SUPERADMIN') return extraWhere;
  return { ...extraWhere, ownerId: req.admin.id };
}

// ------------------------------------------------------------------
// PUBLIC: place an order (no login required for customers)
// POST /api/public/orders
// ------------------------------------------------------------------
const createOrder = asyncHandler(async (req, res) => {
  const { serviceId, customerName, customerEmail, customerPhone, notes } = req.body;

  const service = await prisma.service.findFirst({ where: { id: serviceId, status: 'PUBLISHED' } });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found or not currently available.' });

  const customer = await prisma.customer.create({
    data: { name: customerName, email: customerEmail, phone: customerPhone },
  });

  const count = await prisma.order.count();
  const orderNumber = buildOrderNumber(count + 1);

  // Generate a one-time upload token: only its hash is stored, the plain value
  // is returned once in this response so only the customer who placed the
  // order can later attach documents to it.
  const uploadToken = generateUploadToken();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      serviceId: service.id,
      ownerId: service.ownerId,
      customerId: customer.id,
      amount: service.price,
      notes,
      uploadTokenHash: hashToken(uploadToken),
      uploadTokenExpiresAt: uploadTokenExpiry(),
      statusHistory: { create: { status: 'PENDING', note: 'Order placed by customer.' } },
    },
    include: { service: { select: { title: true } }, customer: true },
  });

  // Best-effort confirmation email — never blocks the response if it fails/unconfigured
  const emailContent = orderPlacedEmail(order, service);
  sendEmail({ to: customer.email, ...emailContent }).catch(() => {});

  // Real-time notification to the owning admin (and Superadmin room)
  const io = req.app.get('io');
  if (io) {
    io.to(`admin:${service.ownerId}`).emit('new_order', {
      orderId: order.id, orderNumber: order.orderNumber, serviceTitle: order.service.title,
    });
    io.to('role:SUPERADMIN').emit('new_order', {
      orderId: order.id, orderNumber: order.orderNumber, serviceTitle: order.service.title,
    });
  }

  res.status(201).json({
    success: true,
    order: { id: order.id, orderNumber: order.orderNumber, status: order.status },
    // Shown ONLY here, once. The server never returns the plain token again —
    // it is required to upload documents against this order later.
    documentUploadToken: uploadToken,
    message: 'Order placed successfully. Save your order number and upload token — the upload token is shown only once.',
  });
});

// PUBLIC: track an order by order number + email/phone (no admin auth)
// GET /api/public/orders/track?orderNumber=SP-2026-000123&contact=email_or_phone
const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, contact } = req.query;
  if (!orderNumber || !contact) {
    return res.status(400).json({ success: false, message: 'orderNumber and contact are required.' });
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      customer: { OR: [{ email: contact }, { phone: contact }] },
    },
    select: {
      id: true, orderNumber: true, status: true, paymentStatus: true, amount: true, createdAt: true, updatedAt: true,
      service: { select: { title: true } },
      statusHistory: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
      documents: {
        where: { type: 'DELIVERABLE' },
        select: { id: true, fileName: true, fileUrl: true, uploadedAt: true },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  });

  if (!order) return res.status(404).json({ success: false, message: 'No matching order found.' });
  res.json({ success: true, order });
});

// ------------------------------------------------------------------
// ADMIN: scoped order management
// ------------------------------------------------------------------

// GET /api/orders
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { status, serviceId, search } = req.query;

  const where = scopeToAdmin(req, {
    ...(status ? { status } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  });

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        service: { select: { title: true } },
        customer: { select: { name: true, email: true, phone: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ success: true, ...paginatedResponse(orders, total, page, limit) });
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: scopeToAdmin(req, { id: req.params.id }),
    include: {
      service: true,
      customer: true,
      owner: { select: { id: true, name: true } },
      documents: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, order });
});

// PATCH /api/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['PENDING', 'IN_PROGRESS', 'DOCUMENTS_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of ${allowed.join(', ')}.` });
  }

  const existing = await prisma.order.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!existing) return res.status(404).json({ success: false, message: 'Order not found.' });

  const order = await prisma.order.update({
    where: { id: existing.id },
    data: {
      status,
      statusHistory: { create: { status, note, changedById: req.admin.id } },
    },
    include: { customer: true },
  });

  // Best-effort customer notifications — never block the response on these
  const emailContent = statusChangedEmail(order, status, note);
  sendEmail({ to: order.customer.email, ...emailContent }).catch(() => {});
  sendPushToOrder(order.id, {
    title: `Order ${order.orderNumber} updated`,
    body: `Status changed to ${status.replace('_', ' ')}${note ? `: ${note}` : ''}`,
  }).catch(() => {});

  res.json({ success: true, order });
});

// PATCH /api/orders/:id/payment  (mark payment status)
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const allowed = ['UNPAID', 'PAID', 'REFUNDED', 'FAILED'];
  if (!allowed.includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: `paymentStatus must be one of ${allowed.join(', ')}.` });
  }

  const existing = await prisma.order.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!existing) return res.status(404).json({ success: false, message: 'Order not found.' });

  const order = await prisma.order.update({
    where: { id: existing.id },
    data: { paymentStatus },
    include: { customer: true },
  });

  if (paymentStatus === 'PAID') {
    const emailContent = paymentReceivedEmail(order);
    sendEmail({ to: order.customer.email, ...emailContent }).catch(() => {});
    sendPushToOrder(order.id, {
      title: `Payment received — ${order.orderNumber}`,
      body: `We've received your payment of ₹${Number(order.amount).toLocaleString('en-IN')}.`,
    }).catch(() => {});
  }

  res.json({ success: true, order });
});

// PATCH /api/orders/:id/assign  (Superadmin only - reassign to a different admin)
const reassignOrder = asyncHandler(async (req, res) => {
  const { newOwnerId } = req.body;

  const newOwner = await prisma.admin.findUnique({ where: { id: newOwnerId } });
  if (!newOwner) return res.status(404).json({ success: false, message: 'Target admin not found.' });

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      ownerId: newOwnerId,
      statusHistory: { create: { status: 'PENDING', note: `Reassigned to ${newOwner.name} by Superadmin.`, changedById: req.admin.id } },
    },
  });

  const io = req.app.get('io');
  if (io) io.to(`admin:${newOwnerId}`).emit('order_reassigned', { orderId: order.id, orderNumber: order.orderNumber });

  res.json({ success: true, order });
});

// GET /api/orders/:id/documents - list documents (scoped)
const listOrderDocuments = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const documents = await prisma.orderDocument.findMany({ where: { orderId: order.id } });
  res.json({ success: true, documents });
});

// POST /api/orders/:id/documents - customer uploads a document (multipart, `upload` middleware applied in route).
// Requires the one-time `uploadToken` issued when the order was placed, so a
// stranger who merely knows/guesses the order ID cannot attach files to it.
const uploadOrderDocument = asyncHandler(async (req, res) => {
  const { uploadToken } = req.body;

  if (!uploadToken) {
    return res.status(401).json({ success: false, message: 'An upload token is required to attach documents to this order.' });
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  if (!order.uploadTokenHash || hashToken(uploadToken) !== order.uploadTokenHash) {
    return res.status(403).json({ success: false, message: 'Invalid or expired upload token.' });
  }
  if (order.uploadTokenExpiresAt && order.uploadTokenExpiresAt < new Date()) {
    return res.status(403).json({ success: false, message: 'This upload link has expired. Please contact support.' });
  }

  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const document = await prisma.orderDocument.create({
    data: {
      orderId: order.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      type: 'CUSTOMER_UPLOAD',
    },
  });

  res.status(201).json({ success: true, document });
});

// ------------------------------------------------------------------
// ADMIN: deliver completed work to the customer
// ------------------------------------------------------------------

// POST /api/orders/:id/deliverables (admin, multipart, ownership-scoped)
// Uploads the finished work file and notifies the customer by email + push
// that it's ready to download from the Track Order page.
const uploadDeliverable = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: scopeToAdmin(req, { id: req.params.id }),
    include: { customer: true },
  });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const document = await prisma.orderDocument.create({
    data: {
      orderId: order.id,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      type: 'DELIVERABLE',
    },
  });

  const emailContent = deliverableReadyEmail(order, req.file.originalname);
  sendEmail({ to: order.customer.email, ...emailContent }).catch(() => {});
  sendPushToOrder(order.id, {
    title: `Your work is ready — ${order.orderNumber}`,
    body: `${req.file.originalname} is available to download.`,
  }).catch(() => {});

  res.status(201).json({ success: true, document });
});

// GET /api/orders/:id/deliverables (admin, ownership-scoped)
const listDeliverables = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const deliverables = await prisma.orderDocument.findMany({
    where: { orderId: order.id, type: 'DELIVERABLE' },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json({ success: true, deliverables });
});

// DELETE /api/orders/:id/deliverables/:docId (admin, ownership-scoped) - remove a mistaken upload
const deleteDeliverable = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  await prisma.orderDocument.deleteMany({ where: { id: req.params.docId, orderId: order.id, type: 'DELIVERABLE' } });
  res.json({ success: true, message: 'Deliverable removed.' });
});

// ------------------------------------------------------------------
// PUBLIC: push notification opt-in for a specific order
// ------------------------------------------------------------------

// GET /api/public/push/vapid-key - the browser needs this to subscribe
const getVapidPublicKey = asyncHandler(async (req, res) => {
  res.json({ success: true, publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/public/orders/:id/push-subscribe
// Gated by the same uploadToken as document uploads — only the customer who
// placed the order can register a browser to receive updates about it.
const subscribeToPush = asyncHandler(async (req, res) => {
  const { uploadToken, subscription } = req.body;

  if (!uploadToken || !subscription?.endpoint || !subscription?.keys) {
    return res.status(400).json({ success: false, message: 'uploadToken and a valid push subscription are required.' });
  }

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  if (!order.uploadTokenHash || hashToken(uploadToken) !== order.uploadTokenHash) {
    return res.status(403).json({ success: false, message: 'Invalid or expired upload token.' });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { orderId: order.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      orderId: order.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  res.status(201).json({ success: true, message: 'Subscribed to notifications for this order.' });
});

module.exports = {
  createOrder, trackOrder,
  listOrders, getOrder, updateOrderStatus, updatePaymentStatus, reassignOrder,
  listOrderDocuments, uploadOrderDocument,
  uploadDeliverable, listDeliverables, deleteDeliverable,
  getVapidPublicKey, subscribeToPush,
};
