'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function SiteHeader({ admin = false }: { admin?: boolean }) {
  const [light, setLight] = useState<boolean>();
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => {
      let saved = null;
      try { saved = localStorage.getItem('hamyad-theme'); } catch {}
      const next = saved === 'light' || (saved !== 'dark' && media.matches);
      document.documentElement.dataset.theme = next ? 'light' : 'dark';
      setLight(next);
    };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', sync); };
  }, []);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme !== 'light';
    const theme = next ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('hamyad-theme', theme); } catch {}
    setLight(next);
  }

  return <header className="mast"><div className="wrap top">
    <Link href="/" className="brand"><span className="logo" aria-hidden="true">✎</span><span>هم‌یاد<small>دفتر یادداشت</small></span></Link>
    <nav className="actions" aria-label="ناوبری اصلی">
      <Link className="nav-link" href={admin ? '/' : '/admin'}>{admin ? 'صفحهٔ عمومی' : 'پنل مدیریت'}</Link>
      <button type="button" onClick={toggleTheme} aria-label="حالت روز" aria-pressed={light} title="تغییر حالت روز و شب"><span aria-hidden="true">{light ? '☀' : '☾'}</span> روز / شب</button>
    </nav>
  </div></header>;
}
