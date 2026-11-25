-- Run once in the Supabase SQL Editor after schema.sql. Safe to run again.
begin;

create table if not exists public.hamyad_push_devices (
  id text primary key,
  subscription jsonb not null,
  unread integer not null default 0,
  revision bigint not null default 0,
  delivered_revision bigint not null default 0,
  retry_at timestamptz not null default '-infinity'
);

create table if not exists public.hamyad_published_notes (
  note_id uuid primary key references public.notes(id) on delete cascade
);

alter table public.hamyad_push_devices enable row level security;
alter table public.hamyad_published_notes enable row level security;
revoke all on public.hamyad_push_devices, public.hamyad_published_notes from public, anon, authenticated;
grant select, insert, update, delete on public.hamyad_push_devices to service_role;

create index if not exists hamyad_pending_push_idx on public.hamyad_push_devices (retry_at)
  where unread > 0 and revision > delivered_revision;

-- Existing public notes are not new announcements.
insert into public.hamyad_published_notes (note_id)
select id from public.notes where is_public
on conflict do nothing;

create or replace function public.hamyad_count_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_public then return new; end if;
  insert into public.hamyad_published_notes (note_id) values (new.id) on conflict do nothing;
  if found then
    update public.hamyad_push_devices set unread = unread + 1, revision = revision + 1, retry_at = '-infinity';
  end if;
  return new;
end;
$$;
revoke all on function public.hamyad_count_publication() from public, anon, authenticated;
drop trigger if exists hamyad_count_publication on public.notes;
create trigger hamyad_count_publication after insert or update of is_public on public.notes
for each row execute function public.hamyad_count_publication();

create or replace function public.hamyad_pending_pushes()
returns table (id text, subscription jsonb, unread integer, revision bigint)
language sql stable set search_path = '' as $$
  select d.id, d.subscription, d.unread, d.revision
  from public.hamyad_push_devices d
  where d.unread > 0 and d.revision > d.delivered_revision and d.retry_at <= now()
  order by d.retry_at, d.id limit 60;
$$;
revoke all on function public.hamyad_pending_pushes() from public, anon, authenticated;
grant execute on function public.hamyad_pending_pushes() to service_role;

commit;
