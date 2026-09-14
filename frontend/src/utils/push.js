import api from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Returns { supported, subscribed, error } and performs the opt-in flow:
// register service worker -> request notification permission -> subscribe ->
// send the subscription + uploadToken to the backend for this specific order.
export async function subscribeOrderToPush(orderId, uploadToken) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, subscribed: false, error: 'Push notifications are not supported in this browser.' };
  }

  try {
    const { data } = await api.get('/public/push/vapid-key');
    if (!data.publicKey) {
      return { supported: true, subscribed: false, error: 'Push notifications are not enabled on this portal yet.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { supported: true, subscribed: false, error: 'Notification permission was not granted.' };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post(`/public/orders/${orderId}/push-subscribe`, {
      uploadToken,
      subscription: subscription.toJSON(),
    });

    return { supported: true, subscribed: true, error: null };
  } catch (err) {
    return { supported: true, subscribed: false, error: err.response?.data?.message || err.message };
  }
}
