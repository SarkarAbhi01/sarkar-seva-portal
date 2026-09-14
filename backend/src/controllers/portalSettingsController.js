const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/helpers');

// GET /api/public/settings - public, read-only
const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.portalSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });
  res.json({ success: true, settings });
});

// PATCH /api/settings (Superadmin only)
const updateSettings = asyncHandler(async (req, res) => {
  const {
    portalName, logoUrl, homepageHero, footerLinks,
    contactEmail, contactPhone, contactAddress, termsContent, privacyContent,
  } = req.body;

  const settings = await prisma.portalSettings.upsert({
    where: { id: 'singleton' },
    update: { portalName, logoUrl, homepageHero, footerLinks, contactEmail, contactPhone, contactAddress, termsContent, privacyContent },
    create: { id: 'singleton', portalName, logoUrl, homepageHero, footerLinks, contactEmail, contactPhone, contactAddress, termsContent, privacyContent },
  });

  res.json({ success: true, settings });
});

module.exports = { getPublicSettings, updateSettings };
