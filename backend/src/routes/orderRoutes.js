const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);

router.get('/', ctrl.listOrders);
router.get('/:id', ctrl.getOrder);
router.get('/:id/documents', ctrl.listOrderDocuments);

router.patch(
  '/:id/status',
  [body('status').isIn(['PENDING', 'IN_PROGRESS', 'DOCUMENTS_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED'])],
  validate,
  ctrl.updateOrderStatus
);

router.patch(
  '/:id/payment',
  [body('paymentStatus').isIn(['UNPAID', 'PAID', 'REFUNDED', 'FAILED'])],
  validate,
  ctrl.updatePaymentStatus
);

// Only Superadmin may reassign an order to a different Subadmin
router.patch(
  '/:id/assign',
  requireRole('SUPERADMIN'),
  [body('newOwnerId').isUUID()],
  validate,
  ctrl.reassignOrder
);

// Deliver completed work to the customer — ownership-scoped inside the controller
router.get('/:id/deliverables', ctrl.listDeliverables);
router.post('/:id/deliverables', upload.single('file'), ctrl.uploadDeliverable);
router.delete('/:id/deliverables/:docId', ctrl.deleteDeliverable);

module.exports = router;
