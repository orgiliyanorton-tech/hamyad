'use client';

import { useEffect } from 'react';

export function RegisterPwa() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // If registration is blocked, the site still works normally online.
    });
  }, []);

  return null;
}
