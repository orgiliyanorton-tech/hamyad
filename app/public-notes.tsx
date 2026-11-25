'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { hasConfig, key, url } from './config';
import { NoteTime, useNoteClock } from './note-time';

type PublicNote = { id: string; title: string; body: string; updated_at: string };
const pageSize = 12;
const layoutKey = 'hamyad-public-notes-layout';
const layouts = [
  { value: 'baseline', label: 'ارتفاع طبیعی کارت‌ها', path: 'M3 5h7v8H3zM14 5h7v12h-7zM3 21h18' },
  { value: 'normal', label: 'کارت‌های هم‌ارتفاع در هر ردیف', path: 'M3 5h7v14H3zM14 5h7v14h-7z' },
] as const;
type Layout = (typeof layouts)[number]['value'];

export function PublicNotes() {
  const now = useNoteClock();
  const [layout, setLayout] = useState<Layout>('baseline');
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ page: number; notes: PublicNote[] | null }>();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(layoutKey);
      if (saved === 'baseline' || saved === 'normal') setLayout(saved);
    } catch {
      // The layout still works when browser storage is unavailable.
    }
  }, []);

  function changeLayout(value: Layout) {
    setLayout(value);
    try {
      localStorage.setItem(layoutKey, value);
    } catch {
      // Keep the selected layout for this visit.
    }
  }

  useEffect(() => {
    if (!hasConfig) return;
    const db = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    let request: AbortController | undefined;
    async function load() {
      request?.abort();
      const { signal } = request = new AbortController();
      try {
        const { data, error } = await db.rpc('list_public_notes', { page_offset: page * pageSize }).abortSignal(signal);
        if (error) throw error;
        if (!signal.aborted) setResult({ page, notes: data });
      } catch {
        if (!signal.aborted) setResult({ page, notes: null });
      }
    }
    const whenVisible = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    const interval = window.setInterval(whenVisible, 30_000);
    document.addEventListener('visibilitychange', whenVisible);
    window.addEventListener('online', whenVisible);
    return () => {
      request?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', whenVisible);
      window.removeEventListener('online', whenVisible);
    };
  }, [page, retry]);

  const notes = result?.page === page ? result.notes : undefined;
  return <>
    <div className="intro">
      <span className="badge">دفتر عمومی</span>
      <div className="public-title-row">
        <h1>یادداشت‌های <em>عمومی</em></h1>
        <div className="public-layout" role="group" aria-label="چیدمان یادداشت‌های عمومی">
          {layouts.map(({ value, label, path }) => <button key={value} type="button" aria-label={label} aria-pressed={layout === value} title={label} onClick={() => changeLayout(value)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d={path} />
            </svg>
          </button>)}
        </div>
      </div>
      <p>یادداشت‌های منتشرشده را اینجا، بدون ورود، بخوان.</p>
    </div>
    {!hasConfig ? <p className="card muted">دفتر عمومی هنوز راه‌اندازی نشده است.</p>
      : notes === undefined ? <p className="card muted" role="status">در حال دریافت یادداشت‌ها…</p>
      : notes === null ? <div className="card"><p className="error" role="alert">یادداشت‌ها دریافت نشدند.</p><button onClick={() => { setResult(undefined); setRetry(n => n + 1); }}>تلاش دوباره</button></div>
      : !notes.length ? <p className="card muted">{page ? 'یادداشتی در این صفحه نیست.' : 'هنوز یادداشتی منتشر نشده است.'}</p>
      : <div className="public-feed" data-layout={layout}>{notes.slice(0, pageSize).map(note =>
      <article className="card public-note" key={note.id}>
        <header className="public-note-heading">
          <h2 className="note-title" dir="auto" title={note.title}>{note.title}</h2>
          <NoteTime value={note.updated_at} now={now} />
        </header>
        {note.body && <p dir="auto">{note.body}</p>}
      </article>)}</div>}
    {(page > 0 || (notes?.length ?? 0) > pageSize) && <nav className="actions pagination" aria-label="صفحه‌بندی یادداشت‌ها">
      <button disabled={!page} onClick={() => setPage(n => n - 1)}>صفحهٔ قبل</button>
      <button disabled={(notes?.length ?? 0) <= pageSize} onClick={() => setPage(n => n + 1)}>صفحهٔ بعد</button>
    </nav>}
  </>;
}
