const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const serviceRoutes = require('./serviceRoutes');
const orderRoutes = require('./orderRoutes');
const publicRoutes = require('./publicRoutes');
const dashboardCtrl = require('../controllers/dashboardController');
const settingsCtrl = require('../controllers/portalSettingsController');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/services', serviceRoutes);
router.use('/orders', orderRoutes);
router.use('/public', publicRoutes);

router.get('/dashboard/summary', requireAuth, dashboardCtrl.getSummary);

router.patch('/settings', requireAuth, requireRole('SUPERADMIN'), settingsCtrl.updateSettings);

module.exports = router;
