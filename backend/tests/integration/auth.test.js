jest.mock('../../src/config/prisma');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');

const app = createApp();

describe('POST /api/auth/login', () => {
  test('rejects an unknown email with a generic message (no user enumeration)', async () => {
    prisma.admin.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('rejects a correct email with the wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prisma.admin.findUnique.mockResolvedValue({
      id: 'admin-1', email: 'admin@example.com', passwordHash, role: 'SUBADMIN', status: 'ACTIVE',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  test('rejects login for a suspended account even with the correct password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prisma.admin.findUnique.mockResolvedValue({
      id: 'admin-1', email: 'admin@example.com', passwordHash, role: 'SUBADMIN', status: 'SUSPENDED',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'correct-password' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  test('issues an access token and sets a refresh cookie on success', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    prisma.admin.findUnique.mockResolvedValue({
      id: 'admin-1', name: 'Test Admin', email: 'admin@example.com', passwordHash, role: 'SUBADMIN', status: 'ACTIVE',
    });
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.activityLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.admin.email).toBe('admin@example.com');
    expect(res.headers['set-cookie']?.[0]).toMatch(/seva_refresh_token=/);
  });

  test('rejects malformed input (invalid email) with a 422 validation error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'x' });

    expect(res.status).toBe(422);
  });
});
