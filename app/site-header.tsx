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
    <Link href="/" className="brand"><span className="logo" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 511.44 511.44" width="22" height="22">
  <path d="M113.44,257.09l92.51,92.51s.02.01.02.02l48.37,48.37h0s.06.05.06.05c.77.69,1.94.67,2.67-.05l92.51-92.51s.02-.02.03-.03l48.37-48.36h0s.12-.16.12-.16c.61-.77.56-1.87-.13-2.58l-92.51-92.51s-.02-.02-.03-.02l-48.37-48.37h0s0,0,0,0h0c-.69-.77-1.86-.82-2.61-.11l-.12.11-92.51,92.51s-.02.02-.02.03l-48.37,48.37h0c-.79.71-.82,1.91-.07,2.66l.07.07Z&#10;       M208.3,255.72c0-26.19,21.23-47.42,47.42-47.42h0c26.19,0,47.42,21.23,47.42,47.42h0c0,26.19-21.23,47.43-47.42,47.43h0c-26.19,0-47.42-21.23-47.42-47.42h0Z" />
  <circle cx="255.72" cy="255.72" r="15.44" />
  <path d="M74.9,436.54c23.48,23.48,50.83,41.92,81.28,54.8,31.54,13.34,65.03,20.1,99.54,20.1s68.01-6.76,99.54-20.1c30.45-12.88,57.8-31.32,81.28-54.8,23.48-23.48,41.92-50.83,54.8-81.28,13.34-31.54,20.1-65.03,20.1-99.54s-6.76-68.01-20.1-99.54c-12.88-30.45-31.32-57.8-54.8-81.28-23.48-23.48-50.83-41.92-81.28-54.8C323.73,6.76,290.24,0,255.72,0s-68.01,6.76-99.54,20.1c-30.45,12.88-57.8,31.32-81.28,54.8-23.48,23.48-41.92,50.83-54.8,81.28C6.76,187.71,0,221.2,0,255.72s6.76,68.01,20.1,99.54c12.88,30.45,31.32,57.8,54.8,81.28Z&#10;       M40.46,321.44c15.88,17.87,39.03,29.13,64.81,29.13h55.6v55.6c0,25.78,11.26,48.93,29.13,64.81-71.34-21.82-127.72-78.21-149.54-149.54Z&#10;       M321.44,470.98c17.87-15.88,29.13-39.03,29.13-64.81v-55.6h55.6c25.78,0,48.94-11.26,64.81-29.13-21.82,71.34-78.21,127.72-149.54,149.54Z&#10;       M470.98,190c-15.88-17.87-39.03-29.13-64.81-29.13h-55.6v-55.6c0-25.78-11.26-48.93-29.13-64.81,71.34,21.82,127.72,78.21,149.54,149.54Z&#10;       M190,40.46c-17.87,15.88-29.13,39.03-29.13,64.81v55.6h-55.6c-25.78,0-48.94,11.26-64.81,29.13C62.28,118.67,118.67,62.28,190,40.46Z&#10;       M30.83,247.15c45.82-2.96,89.17-22.47,121.83-55.13l31.15-31.15h0l8.21-8.21c32.66-32.66,52.17-76.01,55.14-121.83,2.84-.11,5.7-.16,8.57-.16s5.73.05,8.57.16c2.96,45.82,22.47,89.17,55.13,121.83l31.15,31.15h0s8.21,8.2,8.21,8.2c32.66,32.66,76.01,52.17,121.83,55.13.11,2.84.16,5.7.16,8.57s-.05,5.73-.16,8.57c-45.82,2.96-89.17,22.47-121.83,55.13l-31.15,31.15h0l-8.21,8.21c-32.66,32.66-52.17,76.01-55.14,121.83-2.84.11-5.7.16-8.57.16s-5.73-.05-8.57-.16c-2.96-45.82-22.47-89.17-55.13-121.83l-31.15-31.15h0s-8.21-8.2-8.21-8.2c-32.66-32.66-76.01-52.17-121.83-55.14-.11-2.84-.16-5.7-.16-8.57s.05-5.73.16-8.57Z" />
</svg>
</span><span style={{fontWeight: "900"}}>هــــــمیـــاد<small style={{fontWeight:"700"}}>دفتر یادداشت</small></span></Link>
    <nav className="actions" aria-label="ناوبری اصلی">
      <Link className="nav-link" href={admin ? '/' : '/admin'}>{admin ? 'صفحهٔ عمومی' : 'پنل مدیریت'}</Link>
      <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="حالت روز" aria-pressed={light} title="تغییر حالت روز و شب">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" focusable="false">
          {light ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
            : <path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z" />}
        </svg>
        <span>روز / شب</span>
      </button>
    </nav>
  </div></header>;
}