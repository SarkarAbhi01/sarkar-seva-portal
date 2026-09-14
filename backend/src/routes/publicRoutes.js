const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const serviceCtrl = require('../controllers/serviceController');
const orderCtrl = require('../controllers/orderController');
const settingsCtrl = require('../controllers/portalSettingsController');
const paymentCtrl = require('../controllers/paymentController');

const router = express.Router();

// Prevent order-placement spam
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many requests. Please try again shortly.' },
});

// Services (public, published-only)
router.get('/services', serviceCtrl.listPublicServices);
router.get('/services/:id', serviceCtrl.getPublicService);

// Orders (public placement + tracking)
router.post(
  '/orders',
  orderLimiter,
  [
    body('serviceId').isUUID(),
    body('customerName').isString().trim().isLength({ min: 2 }),
    body('customerEmail').isEmail().normalizeEmail(),
    body('customerPhone').isString().trim().isLength({ min: 7 }),
    body('notes').optional().isString(),
  ],
  validate,
  orderCtrl.createOrder
);

router.get(
  '/orders/track',
  [query('orderNumber').isString().notEmpty(), query('contact').isString().notEmpty()],
  validate,
  orderCtrl.trackOrder
);

// Document upload tied to an order (customer-side, no admin auth).
// Protected by the one-time `uploadToken` returned when the order was placed
// (see orderCtrl.createOrder) — verified inside the controller against its
// stored hash before any file is accepted.
router.post('/orders/:id/documents', orderLimiter, upload.single('document'), orderCtrl.uploadOrderDocument);

// Portal branding / content
router.get('/settings', settingsCtrl.getPublicSettings);

// Razorpay online payments (webhook is mounted separately in app.js — it
// needs the raw body for signature verification, before express.json() runs)
router.post(
  '/payments/create-order',
  orderLimiter,
  [body('orderId').isUUID()],
  validate,
  paymentCtrl.createPaymentOrder
);
router.post(
  '/payments/verify',
  orderLimiter,
  [
    body('razorpayOrderId').isString().notEmpty(),
    body('razorpayPaymentId').isString().notEmpty(),
    body('razorpaySignature').isString().notEmpty(),
  ],
  validate,
  paymentCtrl.verifyPayment
);

// Web push notification opt-in (free, no third-party account required)
router.get('/push/vapid-key', orderCtrl.getVapidPublicKey);
router.post(
  '/orders/:id/push-subscribe',
  orderLimiter,
  [body('uploadToken').isString().notEmpty(), body('subscription').isObject()],
  validate,
  orderCtrl.subscribeToPush
);

module.exports = router;
