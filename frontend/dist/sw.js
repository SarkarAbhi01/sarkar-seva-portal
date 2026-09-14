// Minimal service worker: just enough to receive and display push notifications.
// Registered from TrackOrderPage.jsx when the customer opts in.

self.addEventListener('push', (event) => {
  let data = { title: 'Seva Portal', body: 'You have an update.', url: '/track' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/vite.svg',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/track';
  event.waitUntil(clients.openWindow(url));
});
