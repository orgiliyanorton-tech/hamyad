'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { hasConfig, key, noteDate, url } from './config';

type PublicNote = { id: string; title: string; body: string; updated_at: string };
const pageSize = 12;

export function PublicNotes() {
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ page: number; notes: PublicNote[] | null }>();
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

  if (!hasConfig) return <p className="card muted">دفتر عمومی هنوز راه‌اندازی نشده است.</p>;
  const notes = result?.page === page ? result.notes : undefined;
  return <>
    {notes === undefined ? <p className="card muted" role="status">در حال دریافت یادداشت‌ها…</p>
      : notes === null ? <div className="card"><p className="error" role="alert">یادداشت‌ها دریافت نشدند.</p><button onClick={() => { setResult(undefined); setRetry(n => n + 1); }}>تلاش دوباره</button></div>
      : !notes.length ? <p className="card muted">{page ? 'یادداشتی در این صفحه نیست.' : 'هنوز یادداشتی منتشر نشده است.'}</p>
      : <div className="public-feed">{notes.slice(0, pageSize).map(note => 
      <article className="card public-note" key={note.id}>
        <h2 className='note-title' dir="auto">{note.title}</h2><time dateTime={note.updated_at}>{noteDate.format(new Date(note.updated_at))}</time>
        {note.body && <p dir="auto">{note.body}</p>}
      </article>)}</div>}
    {(page > 0 || (notes?.length ?? 0) > pageSize) && <nav className="actions pagination" aria-label="صفحه‌بندی یادداشت‌ها">
      <button disabled={!page} onClick={() => setPage(n => n - 1)}>صفحهٔ قبل</button>
      <button disabled={(notes?.length ?? 0) <= pageSize} onClick={() => setPage(n => n + 1)}>صفحهٔ بعد</button>
    </nav>}
  </>;
}
