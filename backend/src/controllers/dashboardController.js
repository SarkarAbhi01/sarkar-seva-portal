const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/helpers');

function scopeToAdmin(req, extraWhere = {}) {
  if (req.admin.role === 'SUPERADMIN') return extraWhere;
  return { ...extraWhere, ownerId: req.admin.id };
}

// GET /api/dashboard/summary
// Superadmin: platform-wide metrics. Subadmin: metrics for their own services/orders only.
const getSummary = asyncHandler(async (req, res) => {
  const serviceWhere = req.admin.role === 'SUPERADMIN' ? {} : { ownerId: req.admin.id };
  const orderWhere = scopeToAdmin(req);

  const [
    totalServices, activeServices,
    totalOrders, pendingOrders, completedOrders,
    totalSubadmins, revenueAgg,
  ] = await Promise.all([
    prisma.service.count({ where: serviceWhere }),
    prisma.service.count({ where: { ...serviceWhere, status: 'PUBLISHED' } }),
    prisma.order.count({ where: orderWhere }),
    prisma.order.count({ where: { ...orderWhere, status: 'PENDING' } }),
    prisma.order.count({ where: { ...orderWhere, status: 'COMPLETED' } }),
    req.admin.role === 'SUPERADMIN' ? prisma.admin.count({ where: { role: 'SUBADMIN' } }) : Promise.resolve(undefined),
    prisma.order.aggregate({ where: { ...orderWhere, paymentStatus: 'PAID' }, _sum: { amount: true } }),
  ]);

  const summary = {
    totalServices,
    activeServices,
    totalOrders,
    pendingOrders,
    completedOrders,
    revenue: revenueAgg._sum.amount || 0,
    ...(req.admin.role === 'SUPERADMIN' ? { totalSubadmins } : {}),
  };

  res.json({ success: true, summary });
});

module.exports = { getSummary };
