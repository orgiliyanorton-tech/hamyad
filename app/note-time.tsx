'use client';

import { useEffect, useState } from 'react';
import { noteDate } from './config';

const relativeTime = new Intl.RelativeTimeFormat('fa-IR', { numeric: 'always' });
const units = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
] as const;

export function useNoteClock() {
  const [now, setNow] = useState<number>();

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function NoteTime({ value, now }: { value: string; now?: number }) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;

  const absolute = noteDate.format(timestamp);
  const elapsed = now === undefined ? 0 : (now - timestamp) / 1000;
  const unit = units.find(([, seconds]) => elapsed >= seconds);
  const label = unit ? relativeTime.format(-Math.floor(elapsed / unit[1]), unit[0]) : 'الان';

  return <time className="note-time" dateTime={value} title={absolute}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
    {now === undefined ? absolute : label}
  </time>;
}
