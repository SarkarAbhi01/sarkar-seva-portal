const prisma = require('../config/prisma');
const { asyncHandler, paginationParams, paginatedResponse } = require('../utils/helpers');

// Builds a Prisma `where` clause that enforces role-based visibility:
// Superadmin -> all services. Subadmin -> only their own.
function scopeToAdmin(req, extraWhere = {}) {
  if (req.admin.role === 'SUPERADMIN') return extraWhere;
  return { ...extraWhere, ownerId: req.admin.id };
}

// GET /api/services (admin dashboard - scoped)
const listServices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { status, search, ownerId } = req.query;

  const where = scopeToAdmin(req, {
    ...(status ? { status } : {}),
    // Superadmin may additionally filter by a specific Subadmin's services
    ...(req.admin.role === 'SUPERADMIN' && ownerId ? { ownerId } : {}),
    ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
  });

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { owner: { select: { id: true, name: true, role: true } }, _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  res.json({ success: true, ...paginatedResponse(services, total, page, limit) });
});

// GET /api/services/:id (admin - scoped; 404s if not owned and not superadmin)
const getService = asyncHandler(async (req, res) => {
  const service = await prisma.service.findFirst({
    where: scopeToAdmin(req, { id: req.params.id }),
    include: { owner: { select: { id: true, name: true } } },
  });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
  res.json({ success: true, service });
});

// POST /api/services
const createService = asyncHandler(async (req, res) => {
  const {
    title, tagline, description, category, iconUrl, imageUrl,
    price, estimatedDays, requiredDocs, termsAndNotes, status,
  } = req.body;

  const service = await prisma.service.create({
    data: {
      title, tagline, description, category, iconUrl, imageUrl,
      price, estimatedDays,
      requiredDocs: requiredDocs || undefined,
      termsAndNotes,
      status: status || 'DRAFT',
      ownerId: req.admin.id, // service is always owned by its creator
    },
  });

  res.status(201).json({ success: true, service });
});

// PATCH /api/services/:id (must own it, unless Superadmin)
const updateService = asyncHandler(async (req, res) => {
  const existing = await prisma.service.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!existing) return res.status(404).json({ success: false, message: 'Service not found.' });

  const {
    title, tagline, description, category, iconUrl, imageUrl,
    price, estimatedDays, requiredDocs, termsAndNotes,
  } = req.body;

  const service = await prisma.service.update({
    where: { id: existing.id },
    data: {
      title, tagline, description, category, iconUrl, imageUrl,
      price, estimatedDays,
      requiredDocs: requiredDocs || undefined,
      termsAndNotes,
    },
  });

  res.json({ success: true, service });
});

// PATCH /api/services/:id/status  { status: 'PUBLISHED' | 'UNPUBLISHED' | 'SUSPENDED' | 'DRAFT' }
const setServiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SUSPENDED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of ${allowed.join(', ')}.` });
  }

  // Only Superadmin can suspend a service; Subadmins can only publish/unpublish/draft their own.
  if (status === 'SUSPENDED' && req.admin.role !== 'SUPERADMIN') {
    return res.status(403).json({ success: false, message: 'Only Superadmin can suspend a service.' });
  }

  const existing = await prisma.service.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!existing) return res.status(404).json({ success: false, message: 'Service not found.' });

  const service = await prisma.service.update({ where: { id: existing.id }, data: { status } });
  res.json({ success: true, service });
});

// DELETE /api/services/:id
const deleteService = asyncHandler(async (req, res) => {
  const existing = await prisma.service.findFirst({ where: scopeToAdmin(req, { id: req.params.id }) });
  if (!existing) return res.status(404).json({ success: false, message: 'Service not found.' });

  await prisma.service.delete({ where: { id: existing.id } });
  res.json({ success: true, message: 'Service deleted.' });
});

// ------------------------------------------------------------------
// PUBLIC endpoints (no auth) - only PUBLISHED services are ever visible
// ------------------------------------------------------------------

// GET /api/public/services
const listPublicServices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginationParams(req.query);
  const { category, search } = req.query;

  const where = {
    status: 'PUBLISHED',
    ...(category ? { category } : {}),
    ...(search
      ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { tagline: { contains: search, mode: 'insensitive' } }] }
      : {}),
  };

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      select: {
        id: true, title: true, tagline: true, iconUrl: true, imageUrl: true,
        price: true, currency: true, estimatedDays: true, category: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  res.json({ success: true, ...paginatedResponse(services, total, page, limit) });
});

// GET /api/public/services/:id
const getPublicService = asyncHandler(async (req, res) => {
  const service = await prisma.service.findFirst({
    where: { id: req.params.id, status: 'PUBLISHED' },
    select: {
      id: true, title: true, tagline: true, description: true, iconUrl: true, imageUrl: true,
      price: true, currency: true, estimatedDays: true, requiredDocs: true, termsAndNotes: true, category: true,
    },
  });
  if (!service) return res.status(404).json({ success: false, message: 'Service not found or unavailable.' });
  res.json({ success: true, service });
});

module.exports = {
  listServices, getService, createService, updateService, setServiceStatus, deleteService,
  listPublicServices, getPublicService,
};
