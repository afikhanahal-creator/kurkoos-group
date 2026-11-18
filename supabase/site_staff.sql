-- Site staff: who may change the website from a signed-in session.
--
-- Why: Auth allows open sign-up with auto-confirm, and the site's RLS policies were written as
-- "authenticated = admin" (e.g. `pages ALL true`, `leads ALL true`, storage `media` insert/delete).
-- Anyone who registered an account could read every lead and change or delete pages and images.
-- These RESTRICTIVE policies add one condition on top of every existing policy: the signed-in user must
-- be in public.site_staff (or be a finance admin). Anonymous visitors are not affected (the contact form,
-- the newsletter form and public page reads keep working), and the server's service role bypasses RLS.
--
-- Safe to re-run. Run it again after adding a site table (it covers every public table that is not fin_*).
-- To add a person:   insert into public.site_staff (user_id, email) select id, email from auth.users where email = '<email>';
-- To remove a person: delete from public.site_staff where email = '<email>';

create table if not exists public.site_staff (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);
alter table public.site_staff enable row level security;
revoke all on table public.site_staff from anon, authenticated;

-- Seed: everyone who already had an account when this was added (2026-11-18). Later accounts are added by hand.
insert into public.site_staff (user_id, email)
select id, email from auth.users where created_at < '2026-11-18'
on conflict (user_id) do nothing;

create or replace function public.is_site_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.site_staff s where s.user_id = auth.uid())
    or exists (select 1 from public.fin_members m where m.user_id = auth.uid() and m.active and m.role = 'admin')
  )
$$;
revoke all on function public.is_site_staff() from public;
grant execute on function public.is_site_staff() to anon, authenticated;

-- Every public table except the finance tables (they have their own role checks) and site_staff itself.
do $$
declare
  t text;
  anon_reads boolean;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname not like 'fin\_%' and c.relname <> 'site_staff'
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "site staff insert" on public.%I', t);
    execute format('drop policy if exists "site staff update" on public.%I', t);
    execute format('drop policy if exists "site staff delete" on public.%I', t);
    execute format('drop policy if exists "site staff select" on public.%I', t);

    execute format('create policy "site staff insert" on public.%I as restrictive for insert to authenticated with check (public.is_site_staff())', t);
    execute format('create policy "site staff update" on public.%I as restrictive for update to authenticated using (public.is_site_staff()) with check (public.is_site_staff())', t);
    execute format('create policy "site staff delete" on public.%I as restrictive for delete to authenticated using (public.is_site_staff())', t);

    -- Tables the public cannot read (leads, DMs, drafts, tokens, backups) are hidden from non-staff accounts too.
    select exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t and p.permissive = 'PERMISSIVE'
        and p.cmd in ('SELECT', 'ALL') and p.roles && array['anon', 'public']::name[]
        and coalesce(p.qual, 'true') not ilike '%auth.%'
    ) into anon_reads;
    if not anon_reads then
      execute format('create policy "site staff select" on public.%I as restrictive for select to authenticated using (public.is_site_staff())', t);
    end if;
  end loop;
end $$;

-- Storage: only staff may upload, replace or delete site images. finance-docs keeps its own role checks.
drop policy if exists "site staff storage insert" on storage.objects;
drop policy if exists "site staff storage update" on storage.objects;
drop policy if exists "site staff storage delete" on storage.objects;
create policy "site staff storage insert" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id = 'finance-docs' or public.is_site_staff());
create policy "site staff storage update" on storage.objects as restrictive for update to authenticated
  using (bucket_id = 'finance-docs' or public.is_site_staff()) with check (bucket_id = 'finance-docs' or public.is_site_staff());
create policy "site staff storage delete" on storage.objects as restrictive for delete to authenticated
  using (bucket_id = 'finance-docs' or public.is_site_staff());
