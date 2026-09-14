jest.mock('../../src/config/prisma');

const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');
const { signAccessToken, hashToken } = require('../../src/utils/tokens');

const app = createApp();

const subadminA = { id: 'sub-a', role: 'SUBADMIN', email: 'a@example.com', status: 'ACTIVE' };
const subadminB = { id: 'sub-b', role: 'SUBADMIN', email: 'b@example.com', status: 'ACTIVE' };

function authHeaderFor(admin) {
  return `Bearer ${signAccessToken(admin)}`;
}

function mockCurrentAdmin(admin) {
  prisma.admin.findUnique.mockImplementation(({ where }) => {
    if (where.id === admin.id) return Promise.resolve(admin);
    return Promise.resolve(null);
  });
}

describe('POST /api/orders/:id/deliverables — completed work delivery', () => {
  test('Subadmin B cannot upload a deliverable to Subadmin A\'s order', async () => {
    mockCurrentAdmin(subadminB);
    // Ownership-scoped lookup returns nothing because ownerId doesn't match subadminB
    prisma.order.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/orders/order-owned-by-a/deliverables')
      .set('Authorization', authHeaderFor(subadminB))
      .attach('file', Buffer.from('fake pdf content'), 'result.pdf');

    expect(res.status).toBe(404);
    const whereArg = prisma.order.findFirst.mock.calls[0][0].where;
    expect(whereArg.ownerId).toBe(subadminB.id);
  });

  test('the owning Subadmin can upload a deliverable, which is saved with type DELIVERABLE', async () => {
    mockCurrentAdmin(subadminA);
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-1', ownerId: subadminA.id,
      customer: { email: 'customer@example.com', name: 'Test Customer' },
    });
    prisma.orderDocument.create.mockResolvedValue({ id: 'doc-1', fileName: 'result.pdf', type: 'DELIVERABLE' });

    const res = await request(app)
      .post('/api/orders/order-1/deliverables')
      .set('Authorization', authHeaderFor(subadminA))
      .attach('file', Buffer.from('fake pdf content'), 'result.pdf');

    expect(res.status).toBe(201);
    expect(prisma.orderDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'DELIVERABLE', orderId: 'order-1' }) })
    );
  });
});

describe('POST /api/public/orders/:id/push-subscribe — token-gated opt-in', () => {
  test('rejects a subscription attempt with a wrong/missing upload token', async () => {
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', uploadTokenHash: hashToken('real-token') });

    const res = await request(app)
      .post('/api/public/orders/order-1/push-subscribe')
      .send({
        uploadToken: 'wrong-token',
        subscription: { endpoint: 'https://fcm.googleapis.com/xyz', keys: { p256dh: 'abc', auth: 'def' } },
      });

    expect(res.status).toBe(403);
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  test('accepts a subscription with the correct upload token', async () => {
    const realToken = 'real-token';
    prisma.order.findUnique.mockResolvedValue({ id: 'order-1', uploadTokenHash: hashToken(realToken) });
    prisma.pushSubscription.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/public/orders/order-1/push-subscribe')
      .send({
        uploadToken: realToken,
        subscription: { endpoint: 'https://fcm.googleapis.com/xyz', keys: { p256dh: 'abc', auth: 'def' } },
      });

    expect(res.status).toBe(201);
    expect(prisma.pushSubscription.upsert).toHaveBeenCalled();
  });
});
