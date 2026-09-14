jest.mock('../../src/config/prisma');

const request = require('supertest');
const crypto = require('crypto');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');

const app = createApp();

describe('POST /api/public/payments/create-order', () => {
  test('returns 503 when Razorpay keys are not configured (safe default)', async () => {
    // In tests/setup.js, RAZORPAY_KEY_ID / SECRET are intentionally left unset.
    const res = await request(app)
      .post('/api/public/payments/create-order')
      .send({ orderId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/not configured/i);
  });

  test('rejects a non-UUID orderId with a validation error', async () => {
    const res = await request(app)
      .post('/api/public/payments/create-order')
      .send({ orderId: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/public/payments/verify', () => {
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = 'test-razorpay-secret';
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
  });

  test('rejects a payload with a forged/incorrect signature', async () => {
    const res = await request(app)
      .post('/api/public/payments/verify')
      .send({
        razorpayOrderId: 'order_abc123',
        razorpayPaymentId: 'pay_xyz789',
        razorpaySignature: 'clearly-not-the-real-signature',
      });

    expect(res.status).toBe(400);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  test('accepts a payload with a correctly computed HMAC signature and marks the order paid', async () => {
    const razorpayOrderId = 'order_abc123';
    const razorpayPaymentId = 'pay_xyz789';
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1', ownerId: 'admin-1', status: 'PENDING', razorpayOrderId,
      customer: { email: 'customer@example.com', name: 'Test Customer' },
    });
    prisma.order.update.mockResolvedValue({ id: 'order-1', ownerId: 'admin-1', orderNumber: 'SP-2026-000001', amount: 500 });

    const res = await request(app)
      .post('/api/public/payments/verify')
      .send({ razorpayOrderId, razorpayPaymentId, razorpaySignature: validSignature });

    expect(res.status).toBe(200);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ paymentStatus: 'PAID', razorpayPaymentId }),
      })
    );
  });
});
