const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance across the app (best practice for
// connection pooling, especially important with serverless/hot-reload).
const prisma = global.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
