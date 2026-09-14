const webpush = require('web-push');
const prisma = require('../config/prisma');

function isPushEnabled() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureConfigured() {
  if (!isPushEnabled() || configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// Sends a push notification to every browser subscribed to updates for a
// given order. Best-effort: never throws, and prunes subscriptions that the
// browser has revoked (410 Gone) so we don't keep retrying them forever.
async function sendPushToOrder(orderId, { title, body, url }) {
  if (!isPushEnabled()) {
    console.log(`[push disabled] Would have sent "${title}" for order ${orderId}`);
    return;
  }
  ensureConfigured();

  const subs = await prisma.pushSubscription.findMany({ where: { orderId } });
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, url: url || '/track' });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription is no longer valid (user revoked permission / cleared browser data)
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Push send failed:', err.message);
        }
      }
    })
  );
}

module.exports = { isPushEnabled, sendPushToOrder };
