require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL || 'admin@sevaportal.com';
  const password = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Superadmin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: { name: 'Superadmin', email, passwordHash, role: 'SUPERADMIN' },
  });

  await prisma.portalSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      portalName: 'Seva Portal',
      homepageHero: {
        headline: 'All Your Essential Services in One Place',
        subheadline: 'Fast, reliable service processing — from application to completion.',
        ctaPrimary: 'Explore Services',
        ctaSecondary: 'Track Your Order',
      },
      contactEmail: email,
    },
  });

  console.log(`Superadmin created: ${admin.email}`);
  console.log(`Login with the password set in SEED_SUPERADMIN_PASSWORD, then change it immediately.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
