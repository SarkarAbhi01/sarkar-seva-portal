const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const paymentCtrl = require('./controllers/paymentController');

function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

  // IMPORTANT: the Razorpay webhook needs the *raw* request body to verify
  // its HMAC signature, so it must be registered with express.raw() before
  // the global express.json() parser below would otherwise consume it.
  app.post(
    '/api/public/payments/webhook',
    express.raw({ type: 'application/json' }),
    paymentCtrl.razorpayWebhook
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Serve uploaded documents/images
  app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

  app.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
