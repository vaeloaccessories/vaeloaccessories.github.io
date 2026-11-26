// VAELO Yönetim · bildirim servisi (telefon uygulaması kapalıyken de bildirimi gösterir)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { metin: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.baslik || 'VAELO', {
    body: d.metin || 'Yeni bildirim', icon: '/yonetim/ikon-192.png', badge: '/yonetim/ikon-192.png',
    data: { url: d.url || '/yonetim/' }, tag: 'vaelo-' + Date.now(),
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/yonetim/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => {
    for (const c of l) if (c.url.includes('/yonetim/')) return c.focus();
    return self.clients.openWindow(url);
  }));
});
