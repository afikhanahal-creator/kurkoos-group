-- ============================================================
-- Site tables that existed only in the live database: the page editor (pages, page_drafts, page_versions), the content
-- engine's document store (engine_docs) with its storage bucket, and the old statistics table (stats).
-- Written from the live schema on 2026-11-21, so a new project can be built from the repository.
-- Idempotent: on the live database it changes nothing. Run after migration.sql and before site_staff.sql.
-- ============================================================

-- ---------- the page editor ----------
create table if not exists public.pages (
  slug text primary key,
  layout jsonb not null,
  seo jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  version integer not null default 1
);
create table if not exists public.page_drafts (
  slug text primary key,
  layout jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.page_versions (
  id bigserial primary key,
  slug text not null,
  version integer not null,
  layout jsonb not null,
  published_at timestamptz not null default now(),
  note text
);
create index if not exists page_versions_slug on public.page_versions (slug, version desc);

alter table public.pages enable row level security;
alter table public.page_drafts enable row level security;
alter table public.page_versions enable row level security;
drop policy if exists "pages public read" on public.pages;
create policy "pages public read" on public.pages for select to anon, authenticated using (true);
drop policy if exists "pages admin write" on public.pages;
create policy "pages admin write" on public.pages for all to authenticated using (true) with check (true);
drop policy if exists "page drafts admin" on public.page_drafts;
create policy "page drafts admin" on public.page_drafts for all to authenticated using (true) with check (true);
drop policy if exists "page versions admin read" on public.page_versions;
create policy "page versions admin read" on public.page_versions for select to authenticated using (true);
drop policy if exists "page versions admin insert" on public.page_versions;
create policy "page versions admin insert" on public.page_versions for insert to authenticated with check (true);

-- ---------- the content engine: one table of documents by collection ----------
create table if not exists public.engine_docs (
  collection text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists engine_docs_updated on public.engine_docs (collection, updated_at desc);

create or replace function public.engine_docs_touch() returns trigger
language plpgsql set search_path to '' as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.engine_docs_no_resurrect() returns trigger
language plpgsql set search_path to '' as $$
begin
  -- a post removed in the cloud comes back only if the incoming copy was edited after the removal
  if new.collection = 'posts' and coalesce(old.data->>'removed','0') = '1'
     and jsonb_typeof(new.data->'p') = 'object'
     and coalesce(new.data->'p'->>'upd','') <= coalesce(old.data->>'upd','') then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists engine_docs_no_resurrect on public.engine_docs;
create trigger engine_docs_no_resurrect before update on public.engine_docs for each row execute function public.engine_docs_no_resurrect();
drop trigger if exists engine_docs_touch on public.engine_docs;
create trigger engine_docs_touch before insert or update on public.engine_docs for each row execute function public.engine_docs_touch();

alter table public.engine_docs enable row level security;
drop policy if exists "engine admin all" on public.engine_docs;
create policy "engine admin all" on public.engine_docs for all to authenticated using (true) with check (true);
drop policy if exists "meta ads public read" on public.engine_docs;
create policy "meta ads public read" on public.engine_docs for select to anon using (collection = 'meta_ads');

-- the engine's files: public to read, written by a signed-in admin (site_staff.sql narrows writes to site staff)
insert into storage.buckets (id, name, public, file_size_limit)
values ('engine-media', 'engine-media', true, 209715200)
on conflict (id) do nothing;
drop policy if exists "engine media read" on storage.objects;
create policy "engine media read" on storage.objects for select to anon, authenticated using (bucket_id = 'engine-media');
drop policy if exists "engine media admin write" on storage.objects;
create policy "engine media admin write" on storage.objects for insert to authenticated with check (bucket_id = 'engine-media');
drop policy if exists "engine media admin update" on storage.objects;
create policy "engine media admin update" on storage.objects for update to authenticated using (bucket_id = 'engine-media');
drop policy if exists "engine media admin delete" on storage.objects;
create policy "engine media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'engine-media');

-- ---------- stats: an early table of homepage figures. No screen reads it today (site_counters replaced it). ----------
create table if not exists public.stats (
  id text primary key,
  value numeric not null,
  suffix text default '',
  label jsonb not null,
  sort_order integer default 0
);
alter table public.stats enable row level security;
drop policy if exists "read stats" on public.stats;
create policy "read stats" on public.stats for select using (true);
drop policy if exists "write stats" on public.stats;
create policy "write stats" on public.stats for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
