const offlinePage = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#191a1d">
  <title>هم‌یاد | آفلاین</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 24px; font: 16px/1.8 system-ui, sans-serif; }
    main { max-width: 28rem; margin: 12vh auto; }
  </style>
</head>
<body>
  <main>
    <h1>اتصال برقرار نیست</h1>
    <p>برای دیدن یا ویرایش یادداشت‌ها به اینترنت وصل شو و دوباره صفحه را باز کن.</p>
    <a href="">تلاش دوباره</a>
  </main>
</body>
</html>`;

const pushApi = '/.netlify/functions/note-push';
const notificationTag = 'hamyad-new-notes';
let badgeTask = Promise.resolve();

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function runBadgeTask(event, task) {
  badgeTask = badgeTask.then(task).catch(() => {});
  event.waitUntil(badgeTask);
}

function pushRequest(data) {
  return fetch(pushApi, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function setBadge(count) {
  try {
    if (count > 0) await self.navigator.setAppBadge?.(count);
    else await self.navigator.clearAppBadge?.();
  } catch {
    // Some devices only support the system notification's dot.
  }
}

async function clearAlerts() {
  await setBadge(0);
  const alerts = await self.registration.getNotifications({ tag: notificationTag });
  for (const alert of alerts) alert.close();
}

self.addEventListener('push', event => {
  runBadgeTask(event, async () => {
    let payload = {};
    try { payload = event.data?.json() ?? {}; } catch {}
    let count = Number.isSafeInteger(payload.unread) && payload.unread > 0 ? payload.unread : 0;
    if (typeof payload.id === 'string') {
      try {
        const response = await pushRequest({ action: 'count', id: payload.id });
        if (response.ok) {
          const { unread } = await response.json();
          if (Number.isSafeInteger(unread) && unread >= 0) count = unread;
        }
      } catch {}
    }
    await self.registration.showNotification('هم‌یاد', {
      body: count > 0 ? `${count.toLocaleString('fa-IR')} یادداشت عمومی جدید` : 'یادداشت‌های عمومی را در هم‌یاد ببین.',
      icon: '/icons/hamyad-192.png',
      badge: '/icons/hamyad-notification-badge.png',
      tag: notificationTag,
      silent: count === 0,
      lang: 'fa',
      dir: 'rtl',
    });
    await setBadge(count);
  });
});

self.addEventListener('message', event => {
  if (event.data?.type === 'HAMYAD_PUSH_DISABLED') {
    runBadgeTask(event, clearAlerts);
  } else if (event.data?.type === 'HAMYAD_NOTES_SEEN') {
    runBadgeTask(event, async () => {
      const subscription = await self.registration.pushManager.getSubscription();
      if (!subscription) return;
      const response = await pushRequest({ action: 'read', subscription });
      if (response.ok) await clearAlerts();
    });
  }
});

self.addEventListener('notificationclick', event => {
  if (event.notification.tag !== notificationTag) return;
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const publicPage = windows.find(client => new URL(client.url).pathname === '/');
    if (publicPage) await publicPage.focus();
    else await self.clients.openWindow('/');
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  // Leave assets, API requests and note data untouched; never cache responses.
  if (request.method !== 'GET' || request.mode !== 'navigate' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(request).catch(() => new Response(offlinePage, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })));
});
