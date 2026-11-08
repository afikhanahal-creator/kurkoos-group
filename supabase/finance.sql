-- ============================================================
-- KURKOOS FINANCE AI — schema v2 (2026-11-08; safe to re-run)
-- The internal system at /admin/finance: invoices and receipts collected from the connected
-- mailboxes (Gmail, Outlook), uploads and the phone camera, read by Claude, validated, assigned to
-- a company and a project, reviewed and approved by people, and exported to the accountant.
--
-- Access is enforced HERE, in the database (RLS), not only in the screens:
--   admin            everything, users, mailboxes, integrations, automations
--   finance_manager  documents, review, approval, reports, exports, suppliers, projects, rules
--   employee         uploads, connects mailboxes, sees only the documents they brought in
--   accountant       read-only: approved/exported documents, reports, export history
-- A member can be limited to some of the group's companies (fin_members.business_ids).
--
-- Members other than admin are "finance-only": the restrictive policies at the end stop them from
-- writing (or reading private) website content, because the website admin trusts every signed-in user.
--
-- Secrets (OAuth tokens, accounting API keys) live in tables with RLS and no policy: server only.
-- Files live in the private bucket finance-docs; a file is readable only by whoever can read its document.
-- Storage quota: the free plan's 1 GB is shared by the whole organization (CLAUDE.md); the server
-- stops importing at 75% (public.storage_usage()).
-- ============================================================

-- ---------- companies, projects, people ----------
create table if not exists public.fin_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_id text,                       -- ע.מ / ח.פ for VAT
  reg_number text,                   -- registration number, when different
  accountant_email text,
  export_settings jsonb default '{}'::jsonb,   -- { format, destination, integration_id }
  color text default '#105572',
  sort int default 0,
  created_at timestamptz default now()
);
alter table public.fin_businesses add column if not exists reg_number text;
alter table public.fin_businesses add column if not exists export_settings jsonb default '{}'::jsonb;

create table if not exists public.fin_members (
  user_id uuid primary key,
  email text not null,
  full_name text,
  role text not null default 'employee' check (role in ('admin', 'finance_manager', 'employee', 'accountant')),
  business_ids uuid[],               -- null = every company
  active boolean not null default true,
  invited_by uuid,
  created_at timestamptz default now(),
  last_seen_at timestamptz
);
create unique index if not exists fin_members_email_uq on public.fin_members (lower(email));

create table if not exists public.fin_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  business_id uuid references public.fin_businesses(id) on delete set null,
  location text,
  status text not null default 'active' check (status in ('planning', 'active', 'on_hold', 'done')),
  assigned uuid[] default '{}',      -- fin_members.user_id
  keywords text[] default '{}',      -- words that point a document at this project (street, project name)
  notes text,
  created_at timestamptz default now()
);
create unique index if not exists fin_projects_code_uq on public.fin_projects (lower(code)) where code is not null and code <> '';

create table if not exists public.fin_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  vat_deductible_pct numeric default 100,
  sort int default 0
);

create table if not exists public.fin_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_id text,
  email_domain text,
  default_category text,
  default_business_id uuid references public.fin_businesses(id) on delete set null,
  default_project_id uuid references public.fin_projects(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);
alter table public.fin_suppliers add column if not exists default_project_id uuid references public.fin_projects(id) on delete set null;
create unique index if not exists fin_suppliers_vat_uq on public.fin_suppliers (vat_id) where vat_id is not null and vat_id <> '';

-- ---------- mailboxes ----------
create table if not exists public.fin_mailboxes (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'gmail' check (provider in ('gmail', 'outlook', 'imap')),
  email text not null,
  business_id uuid references public.fin_businesses(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'revoked')),
  query text,                        -- extra search terms
  days_back int default 90,          -- first scan window
  last_sync_at timestamptz,          -- last COMPLETE scan (the next one starts from here)
  last_success_at timestamptz,
  last_scan_at timestamptz,          -- last attempt, complete or not
  last_error text,
  docs_found int default 0,
  errors_count int default 0,
  connected_by uuid,
  created_at timestamptz default now(),
  unique (provider, email)
);
alter table public.fin_mailboxes add column if not exists days_back int default 90;
alter table public.fin_mailboxes add column if not exists last_success_at timestamptz;
alter table public.fin_mailboxes add column if not exists last_scan_at timestamptz;
alter table public.fin_mailboxes add column if not exists errors_count int default 0;

create table if not exists public.fin_mailbox_secrets (
  mailbox_id uuid primary key references public.fin_mailboxes(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.fin_mail_seen (
  mailbox_id uuid references public.fin_mailboxes(id) on delete cascade,
  message_id text not null,
  seen_at timestamptz default now(),
  primary key (mailbox_id, message_id)
);

-- ---------- documents ----------
create table if not exists public.fin_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.fin_businesses(id) on delete set null,
  project_id uuid references public.fin_projects(id) on delete set null,
  supplier_id uuid references public.fin_suppliers(id) on delete set null,
  supplier_name text,
  supplier_vat_id text,
  doc_type text default 'invoice',
  doc_number text,
  issue_date date,
  due_date date,
  payment_date date,
  accounting_period text,            -- YYYY-MM
  currency text default 'ILS',
  amount_before_vat numeric(14, 2),
  vat_amount numeric(14, 2),
  total_amount numeric(14, 2),
  category text,
  description text,
  payment_method text,
  paid boolean default false,
  status text not null default 'processing',
  source text not null default 'upload',
  mailbox_id uuid references public.fin_mailboxes(id) on delete set null,
  email_message_id text,
  email_subject text,
  email_from text,
  email_date timestamptz,
  file_path text,
  file_name text,
  file_mime text,
  file_size int,
  file_hash text,
  extraction jsonb,                  -- Claude's raw answer, never edited
  field_confidence jsonb,            -- { supplier_name: 0.98, total_amount: 0.91, ... }
  confidence numeric,                -- the lowest key-field confidence
  issues jsonb default '[]'::jsonb,  -- [{ code, level: error|warn|info, field, message }]
  suggestions jsonb default '{}'::jsonb,  -- { business_id: {value, source, reason}, project_id: ..., category: ... }
  attempts int default 0,
  processed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  exported_at timestamptz,
  export_id uuid,
  sent_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.fin_documents add column if not exists project_id uuid references public.fin_projects(id) on delete set null;
alter table public.fin_documents add column if not exists payment_date date;
alter table public.fin_documents add column if not exists accounting_period text;
alter table public.fin_documents add column if not exists field_confidence jsonb;
alter table public.fin_documents add column if not exists issues jsonb default '[]'::jsonb;
alter table public.fin_documents add column if not exists suggestions jsonb default '{}'::jsonb;
alter table public.fin_documents add column if not exists attempts int default 0;
alter table public.fin_documents add column if not exists processed_at timestamptz;
alter table public.fin_documents add column if not exists approved_by uuid;
alter table public.fin_documents add column if not exists approved_at timestamptz;
alter table public.fin_documents add column if not exists exported_at timestamptz;
alter table public.fin_documents add column if not exists export_id uuid;
alter table public.fin_documents drop constraint if exists fin_documents_doc_type_check;
alter table public.fin_documents add constraint fin_documents_doc_type_check check (doc_type in ('invoice', 'receipt', 'invoice_receipt', 'credit', 'supplier_bill', 'payment_confirmation', 'proforma', 'quote', 'other'));
alter table public.fin_documents drop constraint if exists fin_documents_status_check;
alter table public.fin_documents add constraint fin_documents_status_check check (status in ('processing', 'review', 'approved', 'sent', 'rejected', 'duplicate', 'failed'));
alter table public.fin_documents drop constraint if exists fin_documents_source_check;
alter table public.fin_documents add constraint fin_documents_source_check check (source in ('gmail', 'outlook', 'upload', 'camera', 'forward', 'whatsapp'));
create unique index if not exists fin_documents_hash_uq on public.fin_documents (file_hash) where file_hash is not null;
create index if not exists fin_documents_issue_idx on public.fin_documents (issue_date desc);
create index if not exists fin_documents_status_idx on public.fin_documents (status);
create index if not exists fin_documents_supplier_idx on public.fin_documents (supplier_id);
create index if not exists fin_documents_project_idx on public.fin_documents (project_id);
create index if not exists fin_documents_path_idx on public.fin_documents (file_path);

-- ---------- rules, automations, agents ----------
create table if not exists public.fin_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('supplier_category', 'supplier_company', 'supplier_project', 'keyword_project', 'sender_company', 'amount_flag')),
  match jsonb not null default '{}'::jsonb,   -- { supplier_id } | { keyword } | { sender } | { min_amount }
  action jsonb not null default '{}'::jsonb,  -- { category } | { business_id } | { project_id } | { level }
  enabled boolean not null default true,
  priority int default 100,
  hits int default 0,
  last_hit_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.fin_automations (
  key text primary key,
  name text not null,
  description text,
  enabled boolean not null default true,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'monthly', 'on_event')),
  config jsonb default '{}'::jsonb,
  last_run_at timestamptz,
  last_status text,                  -- ok | error | skipped
  last_error text,
  next_run_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.fin_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('scanner', 'collector', 'ocr', 'validation', 'classification', 'export', 'summary')),
  trigger text default 'manual',     -- manual | cron | upload | retry
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text default 'running' check (status in ('running', 'ok', 'partial', 'error')),
  processed int default 0,
  errors int default 0,
  details jsonb default '{}'::jsonb
);
create index if not exists fin_agent_runs_agent_idx on public.fin_agent_runs (agent, started_at desc);

create table if not exists public.fin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid references public.fin_mailboxes(id) on delete cascade,
  trigger text default 'manual',
  attempt int default 1,
  started_at timestamptz default now(),
  finished_at timestamptz,
  scanned int default 0,
  imported int default 0,
  skipped int default 0,
  error text
);
alter table public.fin_sync_runs add column if not exists trigger text default 'manual';
alter table public.fin_sync_runs add column if not exists attempt int default 1;

create table if not exists public.fin_summaries (
  day date primary key,
  data jsonb not null,
  sent_to text[],
  created_at timestamptz default now()
);

-- ---------- exports and accounting integrations ----------
create table if not exists public.fin_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('file', 'icount', 'morning', 'hashavshevet', 'rivhit', 'priority')),
  name text not null,
  business_id uuid references public.fin_businesses(id) on delete cascade,
  enabled boolean not null default false,
  config jsonb default '{}'::jsonb,  -- non-secret settings only
  status text default 'not_configured',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz default now()
);
create table if not exists public.fin_integration_secrets (
  integration_id uuid primary key references public.fin_integrations(id) on delete cascade,
  secret jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.fin_exports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.fin_businesses(id) on delete set null,
  period text,
  format text not null,              -- zip | csv | excel | pdf | api
  destination text not null,         -- download | email | integration name
  integration_id uuid references public.fin_integrations(id) on delete set null,
  document_ids uuid[] not null,
  doc_count int not null,
  total numeric(14, 2),
  vat_total numeric(14, 2),
  status text not null default 'done' check (status in ('done', 'pending', 'failed')),
  error text,
  user_id uuid,
  user_email text,
  created_at timestamptz default now()
);

-- ---------- audit log ----------
create table if not exists public.fin_audit (
  id bigint generated always as identity primary key,
  entity text not null,              -- document | member | rule | export | mailbox | automation ...
  entity_id text,
  action text not null,              -- created | updated | approved | rejected | exported | deleted | ...
  changes jsonb,
  user_id uuid,
  user_email text,
  at timestamptz default now()
);
create index if not exists fin_audit_entity_idx on public.fin_audit (entity, entity_id, at desc);

-- ============================================================
-- role helpers
-- ============================================================
create or replace function public.fin_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.fin_members where user_id = auth.uid() and active
$$;

create or replace function public.fin_has_role(roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = any(roles) from public.fin_members where user_id = auth.uid() and active), false)
$$;

create or replace function public.fin_business_ok(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select business_ids is null or bid = any(business_ids) or (bid is null and role in ('admin', 'finance_manager'))
                   from public.fin_members where user_id = auth.uid() and active), false)
$$;

-- finance-only members (everyone except admin) are kept away from the website admin
create or replace function public.fin_is_external() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.fin_members where user_id = auth.uid() and role <> 'admin')
$$;

-- the very first person to open the system becomes its admin; after that only invitations add people
create or replace function public.fin_claim_admin() returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); mail text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.fin_members) then
    return (select role from public.fin_members where user_id = uid and active);
  end if;
  select email into mail from auth.users where id = uid;
  insert into public.fin_members (user_id, email, role) values (uid, coalesce(mail, ''), 'admin');
  insert into public.fin_audit (entity, entity_id, action, user_id, user_email) values ('member', uid::text, 'claimed_admin', uid, mail);
  return 'admin';
end $$;

create or replace function public.fin_me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'role', (select role from public.fin_members where user_id = auth.uid() and active),
    'business_ids', (select business_ids from public.fin_members where user_id = auth.uid() and active),
    'has_members', exists (select 1 from public.fin_members)
  )
$$;

-- ============================================================
-- documents: guard rails + audit trail
-- ============================================================
create or replace function public.fin_documents_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r text := public.fin_role();
  money_cols text[] := array['supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'business_id', 'project_id', 'category'];
  c text;
  changed boolean := false;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    foreach c in array money_cols loop
      if (to_jsonb(new) -> c) is distinct from (to_jsonb(old) -> c) then changed := true; end if;
    end loop;
    -- an approved or exported record never changes silently: the AI (no user) may not touch it,
    -- and a person who edits its money fields sends it back to review
    if old.status in ('approved', 'sent') and changed then
      if uid is null then raise exception 'approved document % cannot be changed automatically', old.id; end if;
      if new.status = old.status then
        new.status := 'review'; new.approved_by := null; new.approved_at := null;
      end if;
    end if;
    if new.status in ('approved', 'sent') and old.status not in ('approved', 'sent') then
      if uid is not null and coalesce(r, '') not in ('admin', 'finance_manager') then
        raise exception 'only an admin or a finance manager can approve';
      end if;
      if new.status = 'sent' and old.status <> 'approved' then raise exception 'only approved documents can be exported'; end if;
      if new.status = 'approved' then new.approved_by := uid; new.approved_at := now(); end if;
    end if;
    if new.accounting_period is null or new.issue_date is distinct from old.issue_date then
      new.accounting_period := to_char(coalesce(new.issue_date, new.created_at::date), 'YYYY-MM');
    end if;
  else
    new.accounting_period := coalesce(new.accounting_period, to_char(coalesce(new.issue_date, now()::date), 'YYYY-MM'));
    if uid is not null then new.created_by := coalesce(new.created_by, uid); end if;
    if new.status in ('approved', 'sent') then new.status := 'review'; end if;   -- nothing is born approved
  end if;
  return new;
end $$;
drop trigger if exists fin_documents_touch on public.fin_documents;
drop trigger if exists fin_documents_guard on public.fin_documents;
create trigger fin_documents_guard before insert or update on public.fin_documents for each row execute function public.fin_documents_guard();

create or replace function public.fin_documents_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text;
  diff jsonb := '{}'::jsonb;
  k text;
  skip text[] := array['updated_at', 'extraction', 'field_confidence', 'issues', 'suggestions', 'attempts', 'processed_at', 'confidence', 'approved_at', 'approved_by'];
  act text;
begin
  if uid is not null then select email into mail from public.fin_members where user_id = uid; end if;
  if tg_op = 'INSERT' then
    insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
    values ('document', new.id::text, 'created', jsonb_build_object('source', new.source, 'file_name', new.file_name), uid, coalesce(mail, case when uid is null then 'agent' end));
    return new;
  end if;
  if tg_op = 'DELETE' then
    insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
    values ('document', old.id::text, 'deleted', jsonb_build_object('supplier_name', old.supplier_name, 'total_amount', old.total_amount, 'file_name', old.file_name), uid, coalesce(mail, 'agent'));
    return old;
  end if;
  for k in select jsonb_object_keys(to_jsonb(new)) loop
    if k = any(skip) then continue; end if;
    if (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) then
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(old) -> k, 'to', to_jsonb(new) -> k));
    end if;
  end loop;
  if diff = '{}'::jsonb and new.extraction is not distinct from old.extraction then return new; end if;
  act := case
    when new.status is distinct from old.status and new.status = 'approved' then 'approved'
    when new.status is distinct from old.status and new.status = 'rejected' then 'rejected'
    when new.status is distinct from old.status and new.status = 'sent' then 'exported'
    when new.status is distinct from old.status and new.status = 'duplicate' then 'marked_duplicate'
    when new.extraction is distinct from old.extraction then 'ai_processed'
    else 'updated' end;
  insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
  values ('document', new.id::text, act, diff, uid, coalesce(mail, case when uid is null then 'agent' end));
  return new;
end $$;
drop trigger if exists fin_documents_audit on public.fin_documents;
create trigger fin_documents_audit after insert or update or delete on public.fin_documents for each row execute function public.fin_documents_audit();

-- ============================================================
-- export: the only way a document becomes "sent". Checks the role, that every document is
-- approved, and that none was exported before (unless a re-export is asked for explicitly).
-- ============================================================
create or replace function public.fin_record_export(
  p_ids uuid[], p_business_id uuid, p_period text, p_format text, p_destination text,
  p_integration_id uuid default null, p_allow_reexport boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mail text;
  bad int;
  again int;
  eid uuid;
  t numeric; v numeric;
begin
  if not public.fin_has_role(array['admin', 'finance_manager']) then raise exception 'only an admin or a finance manager can export'; end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then raise exception 'no documents selected'; end if;
  select count(*) into bad from public.fin_documents where id = any(p_ids) and (status not in ('approved', 'sent') or not public.fin_business_ok(business_id));
  if bad > 0 then raise exception '% documents are not approved, export stopped', bad; end if;
  select count(*) into again from public.fin_documents where id = any(p_ids) and exported_at is not null;
  if again > 0 and not p_allow_reexport then raise exception 'ALREADY_EXPORTED:%', again; end if;
  select email into mail from public.fin_members where user_id = uid;
  select coalesce(sum(case when doc_type = 'credit' then -total_amount else total_amount end), 0),
         coalesce(sum(case when doc_type = 'credit' then -vat_amount else vat_amount end), 0)
    into t, v from public.fin_documents where id = any(p_ids);
  insert into public.fin_exports (business_id, period, format, destination, integration_id, document_ids, doc_count, total, vat_total, user_id, user_email)
  values (p_business_id, p_period, p_format, p_destination, p_integration_id, p_ids, array_length(p_ids, 1), t, v, uid, mail)
  returning id into eid;
  update public.fin_documents set status = 'sent', exported_at = now(), sent_at = now(), export_id = eid where id = any(p_ids);
  insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
  values ('export', eid::text, 'exported', jsonb_build_object('count', array_length(p_ids, 1), 'format', p_format, 'destination', p_destination, 'period', p_period, 'reexport', again > 0), uid, mail);
  insert into public.fin_agent_runs (agent, trigger, finished_at, status, processed, details)
  values ('export', 'manual', now(), 'ok', array_length(p_ids, 1), jsonb_build_object('export_id', eid, 'format', p_format, 'destination', p_destination));
  return eid;
end $$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.fin_businesses enable row level security;
alter table public.fin_members enable row level security;
alter table public.fin_projects enable row level security;
alter table public.fin_categories enable row level security;
alter table public.fin_suppliers enable row level security;
alter table public.fin_mailboxes enable row level security;
alter table public.fin_mailbox_secrets enable row level security;
alter table public.fin_mail_seen enable row level security;
alter table public.fin_documents enable row level security;
alter table public.fin_rules enable row level security;
alter table public.fin_automations enable row level security;
alter table public.fin_agent_runs enable row level security;
alter table public.fin_sync_runs enable row level security;
alter table public.fin_summaries enable row level security;
alter table public.fin_integrations enable row level security;
alter table public.fin_integration_secrets enable row level security;
alter table public.fin_exports enable row level security;
alter table public.fin_audit enable row level security;

-- drop every earlier policy on the finance tables, then create the role-based ones
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename like 'fin\_%' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
revoke all on public.fin_mailbox_secrets, public.fin_integration_secrets, public.fin_mail_seen from anon, authenticated;
revoke all on public.fin_businesses, public.fin_members, public.fin_projects, public.fin_categories, public.fin_suppliers, public.fin_mailboxes,
  public.fin_documents, public.fin_rules, public.fin_automations, public.fin_agent_runs, public.fin_sync_runs, public.fin_summaries,
  public.fin_integrations, public.fin_exports, public.fin_audit from anon;
grant select, insert, update, delete on public.fin_businesses, public.fin_members, public.fin_projects, public.fin_categories, public.fin_suppliers,
  public.fin_mailboxes, public.fin_documents, public.fin_rules, public.fin_automations, public.fin_agent_runs, public.fin_sync_runs,
  public.fin_summaries, public.fin_integrations, public.fin_exports to authenticated;
grant select on public.fin_audit to authenticated;

-- companies: every member sees the companies they work with; admins edit
create policy "fin_businesses read" on public.fin_businesses for select to authenticated using (public.fin_business_ok(id));
create policy "fin_businesses write" on public.fin_businesses for all to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));

-- members: you see yourself; admins see and manage everyone
create policy "fin_members read" on public.fin_members for select to authenticated using (user_id = auth.uid() or public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_members write" on public.fin_members for all to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));

-- reference data: members read; finance staff edit (categories: admin)
create policy "fin_projects read" on public.fin_projects for select to authenticated using (public.fin_role() is not null and public.fin_business_ok(business_id));
create policy "fin_projects write" on public.fin_projects for all to authenticated using (public.fin_has_role(array['admin', 'finance_manager'])) with check (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_categories read" on public.fin_categories for select to authenticated using (public.fin_role() is not null);
create policy "fin_categories write" on public.fin_categories for all to authenticated using (public.fin_has_role(array['admin', 'finance_manager'])) with check (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_suppliers read" on public.fin_suppliers for select to authenticated using (public.fin_role() is not null);
create policy "fin_suppliers write" on public.fin_suppliers for all to authenticated using (public.fin_has_role(array['admin', 'finance_manager'])) with check (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_rules read" on public.fin_rules for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_rules write" on public.fin_rules for all to authenticated using (public.fin_has_role(array['admin', 'finance_manager'])) with check (public.fin_has_role(array['admin', 'finance_manager']));

-- mailboxes: admins and finance managers see all; an employee sees the ones they connected
create policy "fin_mailboxes read" on public.fin_mailboxes for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or (public.fin_has_role(array['employee']) and connected_by = auth.uid()));
create policy "fin_mailboxes write" on public.fin_mailboxes for update to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or connected_by = auth.uid()) with check (public.fin_has_role(array['admin', 'finance_manager']) or connected_by = auth.uid());
create policy "fin_mailboxes delete" on public.fin_mailboxes for delete to authenticated using (public.fin_has_role(array['admin']));

-- documents
create policy "fin_documents read" on public.fin_documents for select to authenticated using (
  (public.fin_has_role(array['admin', 'finance_manager']) and public.fin_business_ok(business_id))
  or (public.fin_has_role(array['accountant']) and status in ('approved', 'sent') and public.fin_business_ok(business_id))
  or (public.fin_has_role(array['employee']) and (created_by = auth.uid() or mailbox_id in (select id from public.fin_mailboxes where connected_by = auth.uid())))
);
create policy "fin_documents insert" on public.fin_documents for insert to authenticated with check (
  public.fin_has_role(array['admin', 'finance_manager', 'employee']) and created_by = auth.uid() and status = 'processing'
);
create policy "fin_documents update" on public.fin_documents for update to authenticated using (
  (public.fin_has_role(array['admin', 'finance_manager']) and public.fin_business_ok(business_id))
  or (public.fin_has_role(array['employee']) and created_by = auth.uid() and status in ('processing', 'review', 'failed'))
) with check (
  (public.fin_has_role(array['admin', 'finance_manager']) and public.fin_business_ok(business_id))
  or (public.fin_has_role(array['employee']) and created_by = auth.uid() and status in ('processing', 'review', 'failed', 'rejected'))
);
create policy "fin_documents delete" on public.fin_documents for delete to authenticated using (public.fin_has_role(array['admin']) or (public.fin_has_role(array['finance_manager']) and status not in ('approved', 'sent')));

-- operations data
create policy "fin_automations read" on public.fin_automations for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_automations write" on public.fin_automations for update to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));
create policy "fin_agent_runs read" on public.fin_agent_runs for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_sync_runs read" on public.fin_sync_runs for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or mailbox_id in (select id from public.fin_mailboxes where connected_by = auth.uid()));
create policy "fin_summaries read" on public.fin_summaries for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_integrations read" on public.fin_integrations for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_integrations write" on public.fin_integrations for all to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));
create policy "fin_exports read" on public.fin_exports for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager', 'accountant']) and public.fin_business_ok(business_id));
create policy "fin_audit read" on public.fin_audit for select to authenticated using (
  public.fin_has_role(array['admin', 'finance_manager'])
  or (entity = 'document' and entity_id in (select id::text from public.fin_documents))   -- the trail of what you can see
);
-- inserts into runs, summaries, exports and audit happen only through the server or the security-definer functions

-- ============================================================
-- the private bucket: a file is readable only through a document you can read
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('finance-docs', 'finance-docs', false, 15728640)
on conflict (id) do update set public = false;

drop policy if exists "finance docs admin read" on storage.objects;
drop policy if exists "finance docs admin insert" on storage.objects;
drop policy if exists "finance docs admin delete" on storage.objects;
drop policy if exists "finance docs read" on storage.objects;
drop policy if exists "finance docs insert" on storage.objects;
drop policy if exists "finance docs delete" on storage.objects;
create policy "finance docs read" on storage.objects for select to authenticated
  using (bucket_id = 'finance-docs' and (
    exists (select 1 from public.fin_documents d where d.file_path = storage.objects.name)
    or (owner = auth.uid() and public.fin_has_role(array['admin', 'finance_manager', 'employee']))   -- the uploader, before the document row exists
  ));
create policy "finance docs insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'finance-docs' and name like 'uploads/%' and public.fin_has_role(array['admin', 'finance_manager', 'employee']));
create policy "finance docs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'finance-docs' and public.fin_has_role(array['admin']));

-- ============================================================
-- finance-only members stay out of the website admin.
-- The site's own policies trust every signed-in user ("for all to authenticated using (true)").
-- RESTRICTIVE policies are ANDed with them: an accountant or employee cannot write any site table,
-- and cannot read site tables that the public cannot read either (leads, newsletter ...).
-- Re-run this file after adding site tables.
-- ============================================================
do $$
declare t record; public_read boolean;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname not like 'fin\_%' and c.relrowsecurity loop
    execute format('drop policy if exists "fin external no insert" on public.%I', t.relname);
    execute format('drop policy if exists "fin external no update" on public.%I', t.relname);
    execute format('drop policy if exists "fin external no delete" on public.%I', t.relname);
    execute format('drop policy if exists "fin external no read" on public.%I', t.relname);
    execute format('create policy "fin external no insert" on public.%I as restrictive for insert to authenticated with check (not public.fin_is_external())', t.relname);
    execute format('create policy "fin external no update" on public.%I as restrictive for update to authenticated using (not public.fin_is_external())', t.relname);
    execute format('create policy "fin external no delete" on public.%I as restrictive for delete to authenticated using (not public.fin_is_external())', t.relname);
    select exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.relname and p.cmd in ('SELECT', 'ALL')
                   and p.permissive = 'PERMISSIVE' and ('anon' = any(p.roles) or 'public' = any(p.roles))) into public_read;
    if not public_read then
      execute format('create policy "fin external no read" on public.%I as restrictive for select to authenticated using (not public.fin_is_external())', t.relname);
    end if;
  end loop;
end $$;
drop policy if exists "fin external no storage write" on storage.objects;
drop policy if exists "fin external no storage update" on storage.objects;
drop policy if exists "fin external no storage delete" on storage.objects;
create policy "fin external no storage write" on storage.objects as restrictive for insert to authenticated with check (bucket_id = 'finance-docs' or not public.fin_is_external());
create policy "fin external no storage update" on storage.objects as restrictive for update to authenticated using (bucket_id = 'finance-docs' or not public.fin_is_external());
create policy "fin external no storage delete" on storage.objects as restrictive for delete to authenticated using (bucket_id = 'finance-docs' or not public.fin_is_external());

grant execute on function public.fin_role(), public.fin_has_role(text[]), public.fin_business_ok(uuid), public.fin_is_external(), public.fin_claim_admin(), public.fin_me(),
  public.fin_record_export(uuid[], uuid, text, text, text, uuid, boolean) to authenticated;
revoke execute on function public.fin_claim_admin(), public.fin_record_export(uuid[], uuid, text, text, text, uuid, boolean) from anon;

-- ============================================================
-- starting data
-- ============================================================
insert into public.fin_businesses (name, sort) select 'קורקוס גרופ', 0 where not exists (select 1 from public.fin_businesses);

insert into public.fin_categories (name, vat_deductible_pct, sort) values
  ('חומרי בניין', 100, 1), ('קבלני משנה', 100, 2), ('ציוד וכלים', 100, 3), ('שכירות', 100, 4),
  ('רכב ודלק', 66.67, 5), ('חשמל, מים וארנונה', 100, 6), ('תקשורת ואינטרנט', 100, 7), ('תוכנה ומנויים', 100, 8),
  ('פרסום ושיווק', 100, 9), ('ייעוץ ושירותים מקצועיים', 100, 10), ('אגרות והיטלים', 0, 11), ('ביטוח', 0, 12),
  ('משרד וציוד משרדי', 100, 13), ('כיבוד ואירוח', 0, 14), ('נסיעות', 100, 15), ('עמלות בנק', 0, 16), ('אחר', 100, 99)
on conflict (name) do nothing;

insert into public.fin_automations (key, name, description, frequency, config) values
  ('daily_scan', 'סריקת תיבות המייל', 'כל התיבות המחוברות נסרקות לחשבוניות חדשות', 'daily', '{}'),
  ('auto_process', 'עיבוד אוטומטי של קבצים חדשים', 'כל קובץ שנאסף או הועלה נקרא מיד ע״י Claude', 'on_event', '{}'),
  ('retry_failed', 'ניסיון חוזר למסמכים שנכשלו', 'מסמך שהקריאה שלו נכשלה מקבל עד 3 ניסיונות', 'daily', '{"max_attempts": 3}'),
  ('amount_flag', 'סימון סכומים חריגים', 'מסמך מעל הסכום מסומן לבדיקה', 'on_event', '{"min_amount": 50000}'),
  ('duplicate_check', 'זיהוי כפילויות', 'אותו קובץ, או אותו ספק עם אותו מספר מסמך', 'on_event', '{}'),
  ('connection_alerts', 'התראה על תיבה מנותקת', 'מייל למנהלים כשתיבה נכשלת', 'daily', '{}'),
  ('missing_docs', 'התראה על מסמכים חסרים', 'ספקים קבועים שלא הגיעה מהם חשבונית החודש', 'monthly', '{}'),
  ('daily_summary', 'סיכום יומי', 'דוח יומי: חדשים, לבדיקה, כפולים, תקלות, מוכנים לייצוא', 'daily', '{"email": true}'),
  ('monthly_package', 'הכנת חבילה חודשית לרו״ח', 'ב-3 לחודש: תזכורת למסמכים מאושרים מהחודש הקודם', 'monthly', '{"day": 3}')
on conflict (key) do nothing;

-- tell PostgREST to pick up the new tables and functions now
notify pgrst, 'reload schema';
