'use client';

import { useEffect, useState } from 'react';

const endpoint = '/.netlify/functions/note-push';

async function saveSubscription(action: 'subscribe' | 'unsubscribe', subscription: PushSubscription) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, subscription }),
  });
  if (!response.ok) throw new Error('Could not save push subscription');
}

export function markPublicNotesSeen() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: 'HAMYAD_NOTES_SEEN' });
}

export function NoteNotifications() {
  const [setup, setSetup] = useState<{ registration: ServiceWorkerRegistration; key: string }>();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('در حال بررسی امکان ارسال اعلان…');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setStatus('برای آزمایش اعلان، نسخهٔ منتشرشده در Netlify را باز کن.');
      return;
    }
    if (!('serviceWorker' in navigator)
      || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('اعلان در این مرورگر یا حالت در دسترس نیست. روی آیفون، هم‌یاد را از آیکون صفحهٔ اصلی باز کن.');
      return;
    }
    let cancelled = false;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch(endpoint, { signal: abort.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { publicKey } = await response.json();
        if (typeof publicKey !== 'string' || !/^[\w-]{87}$/.test(publicKey)) throw new Error('invalid public key');
        if (!cancelled) setStatus('در انتظار فعال‌شدن سرویس برنامه…');
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setEnabled(!!subscription);
          setSetup({ registration, key: publicKey });
          setStatus('');
        }
      } catch {
        if (!cancelled) setStatus('سرویس اعلان در دسترس نیست. تنظیمات Netlify یا اتصال را بررسی کن.');
      }
    })();
    return () => { cancelled = true; abort.abort(); };
  }, []);

  async function toggle() {
    if (!setup || busy) return;
    setBusy(true);
    setStatus('');
    const { registration, key } = setup;
    let created: PushSubscription | undefined;
    try {
      if (enabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await saveSubscription('unsubscribe', subscription);
          await subscription.unsubscribe();
        }
        registration.active?.postMessage({ type: 'HAMYAD_PUSH_DISABLED' });
        setEnabled(false);
        setStatus('اعلان‌ها در این دستگاه غیرفعال شدند.');
      } else {
        // Call subscribe directly in the click handler so Safari can request permission.
        if (Notification.permission === 'denied') {
          setStatus('اجازهٔ اعلان را از تنظیمات برنامه یا مرورگر فعال کن.');
          return;
        }
        const applicationServerKey = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0));
        created = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        await saveSubscription('subscribe', created);
        setEnabled(true);
        setStatus('اعلان یادداشت‌های جدید در این دستگاه فعال شد.');
      }
    } catch {
      if (created) await created.unsubscribe().catch(() => {});
      setStatus(Notification.permission === 'denied' ? 'اجازهٔ اعلان را از تنظیمات برنامه یا مرورگر فعال کن.'
        : 'تنظیم اعلان‌ها انجام نشد. دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="note-notifications">
    <button type="button" aria-pressed={enabled} disabled={!setup || busy} onClick={toggle}>اعلان یادداشت‌های جدید: {setup ? (enabled ? 'روشن' : 'خاموش') : 'در دسترس نیست'}</button>
    <span className="muted" role="status">{status}</span>
  </div>;
}
