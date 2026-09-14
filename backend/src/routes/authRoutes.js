const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Slow down brute-force login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()],
  validate,
  ctrl.login
);

router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);

router.get('/me', requireAuth, ctrl.me);
router.patch(
  '/me',
  requireAuth,
  [body('name').optional().isString().trim().isLength({ min: 2 }), body('phone').optional().isString()],
  validate,
  ctrl.updateProfile
);
router.post(
  '/change-password',
  requireAuth,
  [body('currentPassword').isString().notEmpty(), body('newPassword').isString().isLength({ min: 8 })],
  validate,
  ctrl.changePassword
);

module.exports = router;
