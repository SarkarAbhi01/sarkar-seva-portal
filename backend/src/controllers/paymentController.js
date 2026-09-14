const crypto = require('crypto');
const prisma = require('../config/prisma');
const { razorpay, isRazorpayEnabled } = require('../config/razorpay');
const { asyncHandler } = require('../utils/helpers');
const { sendEmail, paymentReceivedEmail } = require('../utils/email');
const { sendPushToOrder } = require('../utils/push');

// POST /api/public/payments/create-order
// Creates a Razorpay order for an existing Seva order and stores the Razorpay order id.
const createPaymentOrder = asyncHandler(async (req, res) => {
  if (!isRazorpayEnabled()) {
    return res.status(503).json({ success: false, message: 'Online payments are not configured on this portal yet.' });
  }

  const { orderId } = req.body;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (order.paymentStatus === 'PAID') {
    return res.status(409).json({ success: false, message: 'This order has already been paid.' });
  }

  // Razorpay expects the amount in the smallest currency unit (paise for INR)
  const amountInPaise = Math.round(Number(order.amount) * 100);

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order.orderNumber,
    notes: { sevaOrderId: order.id },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  res.json({
    success: true,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// POST /api/public/payments/verify
// Called by the frontend immediately after Razorpay Checkout succeeds, to
// verify the payment signature before trusting it client-side. The webhook
// (below) is the source of truth for server-to-server confirmation, but this
// gives the customer instant feedback without waiting for the webhook.
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({ success: false, message: 'Payment verification failed.' });
  }

  const order = await prisma.order.findUnique({ where: { razorpayOrderId }, include: { customer: true } });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      razorpayPaymentId,
      razorpaySignature,
      statusHistory: { create: { status: order.status, note: 'Payment verified via Razorpay Checkout.' } },
    },
  });

  const emailContent = paymentReceivedEmail({ ...updated, customer: order.customer });
  sendEmail({ to: order.customer.email, ...emailContent }).catch(() => {});
  sendPushToOrder(updated.id, {
    title: `Payment received — ${updated.orderNumber}`,
    body: `We've received your payment of ₹${Number(updated.amount).toLocaleString('en-IN')}.`,
  }).catch(() => {});

  const io = req.app.get('io');
  if (io) io.to(`admin:${updated.ownerId}`).emit('payment_received', { orderId: updated.id, orderNumber: updated.orderNumber });

  res.json({ success: true, message: 'Payment verified.' });
});

// POST /api/public/payments/webhook
// Server-to-server confirmation from Razorpay. This is the authoritative
// source of truth for payment status — verify the signature using the raw
// request body (see route wiring) before trusting the payload.
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook.');
    return res.status(503).json({ success: false, message: 'Webhook not configured.' });
  }

  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (expected !== signature) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
  }

  const payload = JSON.parse(req.body.toString());

  if (payload.event === 'payment.captured') {
    const razorpayOrderId = payload.payload.payment.entity.order_id;
    const paymentId = payload.payload.payment.entity.id;

    const order = await prisma.order.findUnique({ where: { razorpayOrderId }, include: { customer: true } });
    if (order && order.paymentStatus !== 'PAID') {
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          razorpayPaymentId: paymentId,
          statusHistory: { create: { status: order.status, note: 'Payment confirmed via Razorpay webhook.' } },
        },
      });

      const emailContent = paymentReceivedEmail({ ...updated, customer: order.customer });
      sendEmail({ to: order.customer.email, ...emailContent }).catch(() => {});
      sendPushToOrder(updated.id, {
        title: `Payment received — ${updated.orderNumber}`,
        body: `We've received your payment of ₹${Number(updated.amount).toLocaleString('en-IN')}.`,
      }).catch(() => {});

      const io = req.app.get('io');
      if (io) io.to(`admin:${updated.ownerId}`).emit('payment_received', { orderId: updated.id, orderNumber: updated.orderNumber });
    }
  }

  // Always 200 quickly so Razorpay doesn't retry unnecessarily
  res.json({ success: true });
});

module.exports = { createPaymentOrder, verifyPayment, razorpayWebhook };
