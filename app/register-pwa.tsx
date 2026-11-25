'use client';

import { useEffect, useState } from 'react';

type InstallPromptEvent = Event & { prompt: () => Promise<unknown> };
const dismissKey = 'hamyad-install-dismissed';

export function RegisterPwa() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let skipped = false;
    try { skipped = sessionStorage.getItem(dismissKey) === '1'; } catch {}
    if (!standalone && !skipped) {
      setShowIosHelp(/iPhone|iPad|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    }

    const offer = (event: Event) => {
      if (standalone) return;
      event.preventDefault();
      if (!skipped) setPromptEvent(event as InstallPromptEvent);
    };
    const installed = () => {
      setPromptEvent(null);
      setShowIosHelp(false);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', installed);

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
        // If registration is blocked, the site still works normally online.
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    setPromptEvent(null);
    try { sessionStorage.setItem(dismissKey, '1'); } catch {}
  }

  function install() {
    if (!promptEvent) return;
    // Trigger the browser prompt directly from the click.
    void promptEvent.prompt().catch(() => {});
    dismiss();
  }

  if (dismissed || (!promptEvent && !showIosHelp)) return null;

  return <aside className="pwa-install" aria-label="نصب هم‌یاد">
    <div className="pwa-install-copy">
      <strong>هم‌یاد را نصب کن</strong>
      <p>{promptEvent ? 'هم‌یاد را مثل یک برنامه از صفحهٔ اصلی باز کن.'
        : 'در Safari، از منوی اشتراک‌گذاری گزینهٔ Add to Home Screen را بزن.'}</p>
    </div>
    <div className="pwa-install-actions">
      {promptEvent && <button type="button" className="primary" onClick={install}>نصب هم‌یاد</button>}
      <button type="button" onClick={dismiss}>فعلاً نه</button>
    </div>
  </aside>;
}
