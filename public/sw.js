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

self.addEventListener('fetch', event => {
  const request = event.request;
  // Leave assets, API requests and note data untouched; never cache responses.
  if (request.method !== 'GET' || request.mode !== 'navigate' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(request).catch(() => new Response(offlinePage, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })));
});
