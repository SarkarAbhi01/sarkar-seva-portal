const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/serviceController');

const router = express.Router();

router.use(requireAuth); // both roles allowed; visibility is scoped inside the controller

router.get('/', ctrl.listServices);
router.get('/:id', ctrl.getService);

const createValidators = [
  body('title').isString().trim().isLength({ min: 3 }),
  body('description').isString().trim().isLength({ min: 10 }),
  body('price').isFloat({ min: 0 }),
  body('estimatedDays').optional().isInt({ min: 0 }),
  body('requiredDocs').optional().isArray(),
];

// Separate chain instances for PATCH so `.optional()` doesn't mutate the create chains above
const updateValidators = [
  body('title').optional().isString().trim().isLength({ min: 3 }),
  body('description').optional().isString().trim().isLength({ min: 10 }),
  body('price').optional().isFloat({ min: 0 }),
  body('estimatedDays').optional().isInt({ min: 0 }),
  body('requiredDocs').optional().isArray(),
];

router.post('/', createValidators, validate, ctrl.createService);
router.patch('/:id', updateValidators, validate, ctrl.updateService);
router.patch('/:id/status', [body('status').isIn(['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'SUSPENDED'])], validate, ctrl.setServiceStatus);
router.delete('/:id', ctrl.deleteService);

module.exports = router;
