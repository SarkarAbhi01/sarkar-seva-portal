const Razorpay = require('razorpay');

// If Razorpay keys aren't configured, online payments are simply disabled —
// admins can still mark orders PAID manually from the dashboard. We never
// throw at require-time so the rest of the app keeps working either way.
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function isRazorpayEnabled() {
  return Boolean(razorpay);
}

module.exports = { razorpay, isRazorpayEnabled };
