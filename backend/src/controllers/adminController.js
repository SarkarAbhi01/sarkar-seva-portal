const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { asyncHandler, paginationParams, paginatedResponse } = require('../utils/helpers');

// GET /api/admins  (Superadmin only) - list all subadmins with filters + pagination
const listAdmins = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { status, search } = req.query;

  const where = {
    role: 'SUBADMIN',
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, status: true,
        subscriptionPaid: true, createdAt: true,
        _count: { select: { services: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.admin.count({ where }),
  ]);

  res.json({ success: true, ...paginatedResponse(admins, total, page, limit) });
});

// GET /api/admins/:id (Superadmin only)
const getAdmin = asyncHandler(async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, status: true,
      subscriptionPaid: true, subscriptionNote: true, createdAt: true,
      services: { select: { id: true, title: true, status: true } },
    },
  });
  if (!admin) return res.status(404).json({ success: false, message: 'Subadmin not found.' });
  res.json({ success: true, admin });
});

// POST /api/admins (Superadmin only) - create a Subadmin
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, phone, password, subscriptionPaid, subscriptionNote } = req.body;

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: 'SUBADMIN',
      // Payment collection is explicitly optional — never required to create the account.
      subscriptionPaid: Boolean(subscriptionPaid),
      subscriptionNote: subscriptionNote || null,
      createdById: req.admin.id,
    },
    select: { id: true, name: true, email: true, phone: true, status: true, subscriptionPaid: true },
  });

  await prisma.activityLog.create({
    data: { adminId: req.admin.id, action: 'CREATE_SUBADMIN', meta: { subadminId: admin.id } },
  });

  res.status(201).json({ success: true, admin });
});

// PATCH /api/admins/:id (Superadmin only)
const updateAdmin = asyncHandler(async (req, res) => {
  const { name, phone, subscriptionPaid, subscriptionNote } = req.body;

  const admin = await prisma.admin.update({
    where: { id: req.params.id },
    data: { name, phone, subscriptionPaid, subscriptionNote },
    select: { id: true, name: true, email: true, phone: true, status: true, subscriptionPaid: true },
  });

  res.json({ success: true, admin });
});

// PATCH /api/admins/:id/status (Superadmin only) - suspend / reactivate
const setAdminStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'ACTIVE' | 'SUSPENDED'
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be ACTIVE or SUSPENDED.' });
  }

  const admin = await prisma.admin.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, name: true, email: true, status: true },
  });

  // Revoke sessions immediately on suspension
  if (status === 'SUSPENDED') {
    await prisma.refreshToken.updateMany({ where: { adminId: admin.id }, data: { revoked: true } });
  }

  await prisma.activityLog.create({
    data: { adminId: req.admin.id, action: `SET_SUBADMIN_STATUS_${status}`, meta: { subadminId: admin.id } },
  });

  res.json({ success: true, admin });
});

// DELETE /api/admins/:id (Superadmin only)
const deleteAdmin = asyncHandler(async (req, res) => {
  await prisma.admin.delete({ where: { id: req.params.id } });
  await prisma.activityLog.create({
    data: { adminId: req.admin.id, action: 'DELETE_SUBADMIN', meta: { subadminId: req.params.id } },
  });
  res.json({ success: true, message: 'Subadmin deleted.' });
});

// GET /api/admins/:id/activity (Superadmin only)
const getAdminActivity = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { adminId: req.params.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({ where: { adminId: req.params.id } }),
  ]);
  res.json({ success: true, ...paginatedResponse(logs, total, page, limit) });
});

module.exports = {
  listAdmins, getAdmin, createAdmin, updateAdmin, setAdminStatus, deleteAdmin, getAdminActivity,
};
