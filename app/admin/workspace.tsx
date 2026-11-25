'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import { hasConfig, key, noteDate, url } from '../config';
import { SiteHeader } from '../site-header';

const columns = 'id,title,body,updated_at,revision,is_public';
const syncInterval = 12_000;
type Note = { id: string; title: string; body: string; updated_at: string; revision: number; is_public: boolean };
type Draft = { title: string; body: string; revision: number | null; is_public: boolean };
const empty: Draft = { title: '', body: '', revision: null, is_public: false };
let client: SupabaseClient | undefined;

export function Workspace() {
  const [db, setDb] = useState<SupabaseClient>();
  const [session, setSession] = useState<Session | null>();
  useEffect(() => {
    if (!hasConfig) return;
    const connection = client ??= createClient(url!, key!);
    setDb(connection);
    const { data: { subscription } } = connection.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => subscription.unsubscribe();
  }, []);

  return <>
    <SiteHeader admin />
    <main className="wrap">
      <div className="intro"><span className="badge">فضای شخصی</span><h1>دفتر <em>یادداشت‌ها</em></h1><p>بنویس، ذخیره کن و روی دستگاه دیگه ادامه بده.</p></div>
      {!hasConfig ? <section className="card login"><h2>اتصال به Supabase هنوز تنظیم نشده</h2><p>برای راه‌اندازی، فایل <bdi>README.fa.md</bdi> پروژه را ببین.</p></section>
        : !db || session === undefined ? <p role="status">در حال بررسی ورود…</p>
        : session ? <Notes key={session.user.id} db={db} /> : <Login db={db} />}
    </main>
  </>;
}

function Login({ db }: { db: SupabaseClient }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const { error } = await db.auth.signInWithPassword({ email: String(fields.get('email')).trim(), password: String(fields.get('password')) });
      if (error) setError('ورود انجام نشد. ایمیل، رمز عبور و اتصال اینترنت را بررسی کن.');
    } catch { setError('ارتباط برقرار نشد. دوباره تلاش کن.'); }
    finally { setBusy(false); }
  }
  return <form className="card login" onSubmit={login}>
    <h2>ورود به پنل</h2><p>با همان حساب، روی همهٔ دستگاه‌ها وارد شو.</p>
    <label>ایمیل<input name="email" type="email" autoComplete="username" dir="ltr" required /></label>
    <label>رمز عبور<input name="password" type="password" autoComplete="current-password" dir="ltr" required /></label>
    <button className="primary" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}

function Notes({ db }: { db: SupabaseClient }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<'loading' | 'ok' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const titleField = useRef<HTMLInputElement>(null);
  const current = notes.find(n => n.id === active);
  const value = draft ?? current ?? empty;
  const fresh = active === 'new';
  const conflict = !fresh && !!draft && (!current || current.revision !== draft.revision);
  const dirty = !!draft;

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const { data, error } = await db.from('notes').select(columns).order('updated_at', { ascending: false }).order('id');
      if (request !== sequence.current) return;
      if (error) throw error;
      setNotes(data);
      setSync('ok');
    } catch { if (request === sequence.current) setSync('error'); }
  }, [db]);

  useEffect(() => {
    void refresh();
    const whenVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(whenVisible, syncInterval);
    document.addEventListener('visibilitychange', whenVisible);
    window.addEventListener('online', whenVisible);
    return () => {
      ++sequence.current;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', whenVisible);
      window.removeEventListener('online', whenVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function open(id: string) {
    if (busy || id === active || (dirty && !window.confirm('تغییرات ذخیره نشده‌اند. کنارشان می‌گذاری؟'))) return;
    setDraft(null); setActive(id); setError(''); setNotice('');
    requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 760px)').matches) titleField.current?.scrollIntoView({ block: 'center' });
      if (id === 'new' && window.matchMedia('(pointer: fine)').matches) titleField.current?.focus({ preventScroll: true });
    });
  }

  function change(patch: Partial<Omit<Draft, 'revision'>>) {
    const next = { title: value.title, body: value.body, revision: value.revision, is_public: value.is_public, ...patch };
    const base = current ?? (fresh ? empty : undefined);
    setDraft(base && next.revision === base.revision && next.title === base.title && next.body === base.body && next.is_public === base.is_public ? null : next);
    setNotice('');
  }

  async function save(asCopy = false) {
    if (busy || !active || (!dirty && !fresh) || (conflict && !asCopy)) return;
    if (!value.title.trim() && !value.body.trim()) { setError('عنوان یا متن یادداشت را بنویس.'); return; }
    if (!asCopy && value.is_public && !current?.is_public && !window.confirm('این یادداشت بدون ورود برای همه قابل خواندن می‌شود. منتشر شود؟')) return;
    setBusy(true); setError(''); setNotice('');
    const payload = { title: value.title.trim() || 'بدون عنوان', body: value.body, is_public: !asCopy && value.is_public };
    try {
      const query = fresh || asCopy ? db.from('notes').insert(payload)
        : db.from('notes').update(payload).eq('id', active).eq('revision', value.revision!);
      const { data, error } = await query.select(columns).maybeSingle();
      if (error) throw error;
      if (!data) { setError('این یادداشت روی دستگاه دیگری تغییر کرده یا حذف شده. پیش‌نویس تو هنوز اینجاست.'); return; }
      ++sequence.current;
      setNotes(list => [data, ...list.filter(n => n.id !== data.id)]);
      setActive(data.id); setDraft(null); setNotice(asCopy ? 'یک کپی خصوصی ذخیره شد.' : data.is_public ? 'یادداشت ذخیره و منتشر شد.' : 'یادداشت به‌صورت خصوصی ذخیره شد.');
    } catch { setError('ذخیره انجام نشد. اتصال را بررسی کن؛ متنت همچنان در ویرایشگر است.'); }
    finally { setBusy(false); void refresh(); }
  }

  async function remove() {
    if (!current || busy || dirty || !window.confirm('این یادداشت برای همیشه حذف شود؟')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error } = await db.from('notes').delete().eq('id', current.id).eq('revision', current.revision).select('id').maybeSingle();
      if (error) throw error;
      if (!data) { setError('نسخهٔ یادداشت تغییر کرده؛ فهرست دوباره دریافت می‌شود.'); return; }
      ++sequence.current;
      setNotes(list => list.filter(n => n.id !== current.id)); setActive(null); setNotice('یادداشت حذف شد.');
    } catch { setError('حذف انجام نشد. دوباره تلاش کن.'); }
    finally { setBusy(false); void refresh(); }
  }

  async function logout() {
    if (busy || (dirty && !window.confirm('با خروج، پیش‌نویس ذخیره‌نشده از دست می‌رود. خارج می‌شوی؟'))) return;
    setBusy(true); setError('');
    try {
      const { error } = await db.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch { setError('خروج انجام نشد. دوباره تلاش کن.'); }
    finally { setBusy(false); }
  }

  const needle = filter.trim().toLocaleLowerCase('fa');
  const visible = notes.filter(n => `${n.title}\n${n.body}`.toLocaleLowerCase('fa').includes(needle));
  const editable = active && (fresh || current || draft);
  return <>
    <div className="toolbar"><div className="actions"><button className="primary" onClick={() => open('new')} disabled={busy}>+ یادداشت جدید</button><button onClick={() => void refresh()} disabled={busy}>به‌روزرسانی</button></div><button onClick={logout} disabled={busy}>خروج از پنل</button></div>
    <p className={'sync ' + (sync === 'error' ? 'error' : '')} role="status">{sync === 'ok' ? 'همگام‌سازی فعال است' : sync === 'loading' ? 'در حال دریافت یادداشت‌ها…' : 'ارتباط با سرور برقرار نیست. دوباره تلاش می‌شود.'}</p>
    <div className="board">
      <aside className="card list"><h2>یادداشت‌ها</h2><label className="search"><span className="sr-only">جست‌وجو در یادداشت‌ها</span><input type="search" placeholder="جست‌وجو…" value={filter} onChange={e => setFilter(e.target.value)} /></label>
        {visible.length ? <ul>{visible.map(n => <li key={n.id}><button className="note" aria-pressed={active === n.id} onClick={() => open(n.id)} disabled={busy}><bdi>{n.title}</bdi><span className="note-meta"><span className={'badge' + (n.is_public ? ' published' : '')}>{n.is_public ? 'عمومی' : 'خصوصی'}</span><time dateTime={n.updated_at}>{noteDate.format(new Date(n.updated_at))}</time></span></button></li>)}</ul>
          : <p className="muted">{needle ? 'یادداشتی پیدا نشد.' : sync === 'ok' ? 'هنوز یادداشتی نداری.' : 'فهرست هنوز دریافت نشده.'}</p>}
      </aside>
      <section className="card editor" aria-labelledby="editor-title"><h2 id="editor-title">{fresh ? 'یادداشت جدید' : 'ویرایشگر'}</h2>
        {editable ? <form onSubmit={e => { e.preventDefault(); void save(); }}>
          <label>عنوان<input ref={titleField} dir="auto" value={value.title} maxLength={120} disabled={busy} onChange={e => change({ title: e.target.value })} placeholder="مثلاً ایده‌های امروز" /></label>
          <label>متن یادداشت<textarea dir="auto" value={value.body} maxLength={20000} disabled={busy} onChange={e => change({ body: e.target.value })} placeholder="اینجا بنویس…" /></label>
          <label className="visibility"><input type="checkbox" checked={value.is_public} disabled={busy} onChange={e => change({ is_public: e.target.checked })} aria-describedby="visibility-hint" /> انتشار در صفحهٔ عمومی</label>
          <p className="muted visibility-hint" id="visibility-hint">{value.is_public ? 'پس از ذخیره، همه می‌توانند عنوان و متن را بدون ورود بخوانند.' : 'پس از ذخیره، فقط با حساب خودت می‌توانی این یادداشت را بخوانی.'}</p>
          {conflict && <p className="warning" role="alert">یادداشت روی دستگاه دیگری تغییر کرده یا حذف شده. برای حفظ متن خودت، آن را به‌صورت یک کپی خصوصی ذخیره کن.</p>}
          <div className="actions">
            <button className="primary" type="submit" disabled={busy || conflict || (!dirty && !fresh)}>{busy ? 'در حال انجام…' : value.is_public && !current?.is_public ? 'ذخیره و انتشار' : 'ذخیره'}</button>
            {conflict && <button type="button" disabled={busy} onClick={() => void save(true)}>ذخیره به‌صورت کپی خصوصی</button>}
            {dirty && <button type="button" disabled={busy} onClick={() => { if (window.confirm('پیش‌نویس کنار گذاشته شود؟')) { setDraft(null); setError(''); } }}>کنار گذاشتن پیش‌نویس</button>}
            {current && !dirty && <button className="danger" type="button" disabled={busy} onClick={remove}>حذف</button>}
          </div>
          {dirty && <p className="muted">تغییرات هنوز ذخیره نشده‌اند.</p>}
        </form> : <p className="muted">{active ? 'این یادداشت دیگر در فهرست نیست.' : 'یک یادداشت باز کن یا یادداشت جدید بساز.'}</p>}
        {notice && <p className="success" role="status">{notice}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </div>
  </>;
}
