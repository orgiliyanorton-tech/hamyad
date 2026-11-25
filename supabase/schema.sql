-- Run once in the Supabase SQL Editor for this project.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create index notes_owner_updated_idx on public.notes(owner_id, updated_at desc);

alter table public.notes enable row level security;
revoke all privileges on table public.notes from public, anon, authenticated;
grant select, delete on public.notes to authenticated;
grant insert (title, body), update (title, body) on public.notes to authenticated;

create policy notes_select on public.notes for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy notes_insert on public.notes for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy notes_update on public.notes for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy notes_delete on public.notes for delete to authenticated
  using ((select auth.uid()) = owner_id);

create function public.bump_note_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;
create trigger bump_note_revision before update on public.notes
for each row execute function public.bump_note_revision();


-- Run after schema.sql. Safe to re-run; existing notes stay private.
begin;

alter table public.notes add column if not exists is_public boolean not null default false;
grant insert (is_public), update (is_public) on public.notes to authenticated;
create index if not exists notes_public_updated_idx on public.notes(updated_at desc, id) where is_public;

-- Keep table policies owner-only. Expose only these fields of published rows.
create or replace function public.list_public_notes(page_offset integer default 0)
returns table (id uuid, title text, body text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.id, n.title, n.body, n.updated_at
  from public.notes as n
  where n.is_public = true
  order by n.updated_at desc, n.id
  limit 13 offset greatest(coalesce(page_offset, 0), 0);
$$;
revoke all on function public.list_public_notes(integer) from public, anon, authenticated;
grant execute on function public.list_public_notes(integer) to anon, authenticated;

commit;
