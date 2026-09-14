const nodemailer = require('nodemailer');

let transporter = null;

function isEmailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isEmailEnabled()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

// Sends an email best-effort — never throws, so a failed/unconfigured email
// service can never break an order/payment/status-update flow.
async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email disabled] Would have sent "${subject}" to ${to}`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    await t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { sent: false, reason: 'send_error' };
  }
}

// --- Templates -------------------------------------------------------

function orderPlacedEmail(order, service) {
  return {
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `
      <p>Hi ${order.customer?.name || 'there'},</p>
      <p>Your order for <strong>${service.title}</strong> has been placed successfully.</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}<br/>
      <strong>Amount:</strong> ₹${Number(order.amount).toLocaleString('en-IN')}</p>
      <p>You can track your order status anytime using your order number and the email/phone you provided.</p>
    `,
  };
}

function statusChangedEmail(order, status, note) {
  const labels = {
    PENDING: 'Pending', IN_PROGRESS: 'In Progress', DOCUMENTS_REQUIRED: 'Documents Required',
    COMPLETED: 'Completed', REJECTED: 'Rejected', CANCELLED: 'Cancelled',
  };
  return {
    subject: `Order ${order.orderNumber} — Status Updated to ${labels[status] || status}`,
    html: `
      <p>Your order <strong>${order.orderNumber}</strong> status has changed to <strong>${labels[status] || status}</strong>.</p>
      ${note ? `<p>Note from our team: ${note}</p>` : ''}
      <p>Track your order for full details.</p>
    `,
  };
}

function paymentReceivedEmail(order) {
  return {
    subject: `Payment Received — ${order.orderNumber}`,
    html: `
      <p>We've received your payment of ₹${Number(order.amount).toLocaleString('en-IN')} for order <strong>${order.orderNumber}</strong>. Thank you!</p>
    `,
  };
}

function deliverableReadyEmail(order, fileName) {
  return {
    subject: `Your Completed Work is Ready — ${order.orderNumber}`,
    html: `
      <p>Good news! The completed work for your order <strong>${order.orderNumber}</strong> is ready${fileName ? ` (${fileName})` : ''}.</p>
      <p>Visit the Track Order page and enter your order number to download it.</p>
    `,
  };
}

module.exports = {
  isEmailEnabled,
  sendEmail,
  orderPlacedEmail,
  statusChangedEmail,
  paymentReceivedEmail,
  deliverableReadyEmail,
};
