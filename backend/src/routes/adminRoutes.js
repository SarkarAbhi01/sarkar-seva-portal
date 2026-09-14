const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

const router = express.Router();

// Every route here is Superadmin-only
router.use(requireAuth, requireRole('SUPERADMIN'));

router.get('/', ctrl.listAdmins);
router.get('/:id', ctrl.getAdmin);
router.get('/:id/activity', ctrl.getAdminActivity);

router.post(
  '/',
  [
    body('name').isString().trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8 }),
    body('phone').optional().isString(),
    body('subscriptionPaid').optional().isBoolean(),
  ],
  validate,
  ctrl.createAdmin
);

router.patch(
  '/:id',
  [body('name').optional().isString().trim(), body('phone').optional().isString()],
  validate,
  ctrl.updateAdmin
);

router.patch(
  '/:id/status',
  [body('status').isIn(['ACTIVE', 'SUSPENDED'])],
  validate,
  ctrl.setAdminStatus
);

router.delete('/:id', ctrl.deleteAdmin);

module.exports = router;
