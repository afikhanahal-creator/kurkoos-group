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
  money_cols text[] := array['supplier_name', 'supplier_vat_id', 'doc_type', 'doc_number', 'issue_date', 'currency', 'amount_before_vat', 'vat_amount', 'total_amount', 'business_id', 'project_id', 'category', 'category_id'];
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
    -- back in review: every signature is cleared, the next approval starts over
    if new.status = 'review' and old.status in ('approved', 'sent') then
      new.approved_by := null; new.approved_at := null; new.first_approved_by := null; new.first_approved_at := null;
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

-- ============================================================
-- v3 (2026-11-08): master data, smart assignment, allocations, rules engine, control
-- How the spec's tables map here: organizations = this Supabase project (one organization);
-- organization_memberships = fin_members; companies = fin_businesses; document_extractions = fin_documents.extraction
-- (Claude's raw answer, never edited) + field_confidence + ai_snapshot; document_company_assignments = fin_documents.business_id;
-- document_project_allocations = fin_document_allocations; expense_rules = fin_rules (+ fin_rule_hits); approval_records =
-- fin_audit rows with action approved/second_approval; processing_jobs = fin_agent_runs + fin_sync_runs; export_records = fin_exports.
-- ============================================================

-- companies
alter table public.fin_businesses add column if not exists commercial_name text;
alter table public.fin_businesses add column if not exists name_en text;
alter table public.fin_businesses add column if not exists address text;
alter table public.fin_businesses add column if not exists phone text;
alter table public.fin_businesses add column if not exists email text;
alter table public.fin_businesses add column if not exists accounting_system_id text;
alter table public.fin_businesses add column if not exists accountant_name text;
alter table public.fin_businesses add column if not exists notes text;
alter table public.fin_businesses add column if not exists active boolean not null default true;
alter table public.fin_businesses add column if not exists archived_at timestamptz;
do $$ begin
  create unique index if not exists fin_businesses_vat_uq on public.fin_businesses (vat_id) where vat_id is not null and vat_id <> '';
exception when unique_violation then
  raise notice 'two companies share a VAT number: fix them, then re-run this file';
end $$;

-- projects
alter table public.fin_projects add column if not exists project_type text;
alter table public.fin_projects add column if not exists manager_id uuid;
alter table public.fin_projects add column if not exists manager_name text;
alter table public.fin_projects add column if not exists start_date date;
alter table public.fin_projects add column if not exists expected_end date;
alter table public.fin_projects add column if not exists budget numeric(16, 2);
alter table public.fin_projects add column if not exists archived_at timestamptz;

-- suppliers
alter table public.fin_suppliers add column if not exists trading_name text;
alter table public.fin_suppliers add column if not exists vat_number text;
alter table public.fin_suppliers add column if not exists supplier_type text;
alter table public.fin_suppliers add column if not exists contact_person text;
alter table public.fin_suppliers add column if not exists email text;
alter table public.fin_suppliers add column if not exists phone text;
alter table public.fin_suppliers add column if not exists website text;
alter table public.fin_suppliers add column if not exists address text;
alter table public.fin_suppliers add column if not exists status text not null default 'active';
alter table public.fin_suppliers add column if not exists normalized_name text;
alter table public.fin_suppliers add column if not exists suggested_from uuid;   -- the document that suggested it
alter table public.fin_suppliers add column if not exists match_confidence numeric;
alter table public.fin_suppliers add column if not exists approved_by uuid;
alter table public.fin_suppliers add column if not exists archived_at timestamptz;
alter table public.fin_suppliers drop constraint if exists fin_suppliers_status_check;
alter table public.fin_suppliers add constraint fin_suppliers_status_check check (status in ('pending', 'active', 'archived'));
-- one normalizer for supplier names (the server calls it too): legal suffixes removed only as whole words
create or replace function public.fin_norm(t text) returns text language sql immutable as $$
  select nullif(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(t, '')),
    '(בע"מ|בע״מ|\mבעמ\M|ושות׳|ושות''|\mושות\M|ש\.ת\.פ|\mשתפ\M|\(\d+\))', ' ', 'g'),
    '\m(ltd|inc|llc|limited|co)\M\.?', ' ', 'g'), '[^[:alnum:]א-ת]+', '', 'g'), '')
$$;
grant execute on function public.fin_norm(text) to authenticated, service_role;
update public.fin_suppliers set normalized_name = public.fin_norm(name) where normalized_name is distinct from public.fin_norm(name);
update public.fin_suppliers set normalized_name = public.fin_norm(name) where normalized_name is null;
do $$ begin
  create unique index if not exists fin_suppliers_norm_uq on public.fin_suppliers (normalized_name) where normalized_name is not null and status <> 'archived';
exception when unique_violation then
  raise notice 'fin_suppliers has suppliers with the same normalized name: merge them in the suppliers screen, then re-run this file';
end $$;

-- categories
alter table public.fin_categories add column if not exists name_en text;
alter table public.fin_categories add column if not exists description text;
alter table public.fin_categories add column if not exists parent_id uuid references public.fin_categories(id) on delete restrict;
alter table public.fin_categories add column if not exists accounting_code text;
alter table public.fin_categories add column if not exists vat_treatment text;
alter table public.fin_categories add column if not exists business_ids uuid[];
alter table public.fin_categories add column if not exists active boolean not null default true;
alter table public.fin_categories add column if not exists created_at timestamptz default now();
alter table public.fin_categories add column if not exists keywords text[] default '{}';

-- documents: a category is a real relation (category_id), the name stays for exports and history
alter table public.fin_documents add column if not exists category_id uuid references public.fin_categories(id) on delete restrict;
alter table public.fin_documents add column if not exists supplier_email text;
alter table public.fin_documents add column if not exists ai_snapshot jsonb;      -- what the agents proposed, to measure accuracy
alter table public.fin_documents add column if not exists requires_second_approval boolean not null default false;
alter table public.fin_documents add column if not exists first_approved_by uuid;
alter table public.fin_documents add column if not exists first_approved_at timestamptz;
alter table public.fin_documents add column if not exists archived_at timestamptz;
update public.fin_documents d set category_id = c.id from public.fin_categories c where d.category_id is null and d.category = c.name;
create index if not exists fin_documents_category_idx on public.fin_documents (category_id);
create index if not exists fin_documents_business_idx on public.fin_documents (business_id);

-- master data that has documents is archived, never deleted
do $$ begin
  alter table public.fin_documents drop constraint if exists fin_documents_supplier_id_fkey;
  alter table public.fin_documents add constraint fin_documents_supplier_id_fkey foreign key (supplier_id) references public.fin_suppliers(id) on delete restrict;
  alter table public.fin_documents drop constraint if exists fin_documents_project_id_fkey;
  alter table public.fin_documents add constraint fin_documents_project_id_fkey foreign key (project_id) references public.fin_projects(id) on delete restrict;
  alter table public.fin_documents drop constraint if exists fin_documents_business_id_fkey;
  alter table public.fin_documents add constraint fin_documents_business_id_fkey foreign key (business_id) references public.fin_businesses(id) on delete restrict;
  alter table public.fin_projects drop constraint if exists fin_projects_business_id_fkey;
  alter table public.fin_projects add constraint fin_projects_business_id_fkey foreign key (business_id) references public.fin_businesses(id) on delete restrict;
end $$;

-- splitting one invoice across projects. The rows always add up to the document (fin_set_allocations).
create table if not exists public.fin_document_allocations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.fin_documents(id) on delete cascade,
  project_id uuid not null references public.fin_projects(id) on delete restrict,
  amount numeric(14, 2) not null,
  vat_amount numeric(14, 2),
  note text,
  created_by uuid,
  created_at timestamptz default now()
);
create index if not exists fin_alloc_doc_idx on public.fin_document_allocations (document_id);
create index if not exists fin_alloc_project_idx on public.fin_document_allocations (project_id);

create or replace function public.fin_set_allocations(p_document uuid, p_rows jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare d record; s numeric; v numeric; n int; uid uuid := auth.uid(); mail text;
begin
  if not public.fin_has_role(array['admin', 'finance_manager']) then raise exception 'only finance staff can split documents'; end if;
  select * into d from public.fin_documents where id = p_document;
  if d.id is null or not public.fin_business_ok(d.business_id) then raise exception 'document not found'; end if;
  n := coalesce(jsonb_array_length(p_rows), 0);
  if n > 0 then
    select coalesce(sum((r->>'amount')::numeric), 0), coalesce(sum(nullif(r->>'vat_amount', '')::numeric), 0) into s, v from jsonb_array_elements(p_rows) r;
    if abs(s - coalesce(d.total_amount, 0)) > 0.01 then raise exception 'SPLIT_TOTAL:% != %', s, d.total_amount; end if;
    if exists (select 1 from jsonb_array_elements(p_rows) r join public.fin_projects p on p.id = (r->>'project_id')::uuid where d.business_id is not null and p.business_id is distinct from d.business_id) then
      raise exception 'a project of another company cannot share this document';
    end if;
  end if;
  delete from public.fin_document_allocations where document_id = p_document;
  insert into public.fin_document_allocations (document_id, project_id, amount, vat_amount, note, created_by)
  select p_document, (r->>'project_id')::uuid, (r->>'amount')::numeric, nullif(r->>'vat_amount', '')::numeric, r->>'note', uid from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r;
  -- one project: the document points at it; several: the allocations carry the projects
  update public.fin_documents set project_id = case when n = 1 then (p_rows->0->>'project_id')::uuid when n = 0 then project_id else null end where id = p_document;
  select email into mail from public.fin_members where user_id = uid;
  insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email) values ('document', p_document::text, 'split', jsonb_build_object('rows', p_rows), uid, mail);
  return n;
end $$;
grant execute on function public.fin_set_allocations(uuid, jsonb) to authenticated;

-- moves the documents of a duplicate supplier to the one that stays, then removes the duplicate
create or replace function public.fin_merge_suppliers(p_from uuid, p_into uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare n int; uid uuid := auth.uid(); mail text;
begin
  if not public.fin_has_role(array['admin', 'finance_manager']) then raise exception 'only finance staff can merge suppliers'; end if;
  if p_from = p_into then raise exception 'same supplier'; end if;
  update public.fin_documents set supplier_id = p_into where supplier_id = p_from;
  get diagnostics n = row_count;
  update public.fin_rules set match = jsonb_set(match, '{supplier_id}', to_jsonb(p_into::text)) where match->>'supplier_id' = p_from::text;
  delete from public.fin_suppliers where id = p_from;
  select email into mail from public.fin_members where user_id = uid;
  insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email) values ('supplier', p_into::text, 'merged', jsonb_build_object('from', p_from, 'documents', n), uid, mail);
  return n;
end $$;
grant execute on function public.fin_merge_suppliers(uuid, uuid) to authenticated;

-- settings the administrator controls (supplier mode, confidence thresholds)
create table if not exists public.fin_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid,
  updated_at timestamptz default now()
);
insert into public.fin_settings (key, value) values
  ('supplier_mode', '"controlled"'),          -- controlled: new suppliers wait for approval · automatic: created above the threshold
  ('supplier_auto_threshold', '0.92'),
  ('category_auto_threshold', '0.85'),
  ('project_auto_threshold', '0.9'),
  ('second_approval_amount', '50000')
on conflict (key) do nothing;
alter table public.fin_settings enable row level security;

-- rules engine: who changed a rule, and every time it acted
alter table public.fin_rules add column if not exists updated_by uuid;
alter table public.fin_rules add column if not exists updated_at timestamptz default now();
alter table public.fin_rules drop constraint if exists fin_rules_kind_check;
alter table public.fin_rules add constraint fin_rules_kind_check check (kind in (
  'supplier_category', 'supplier_company', 'supplier_project', 'keyword_project', 'project_code', 'sender_company',
  'recipient_company', 'keyword_category', 'amount_flag', 'amount_approval', 'missing_vat_flag'));
create table if not exists public.fin_rule_hits (
  id bigint generated always as identity primary key,
  rule_id uuid references public.fin_rules(id) on delete cascade,
  document_id uuid references public.fin_documents(id) on delete cascade,
  outcome text,                       -- applied | suggested | flagged | overridden
  detail text,
  at timestamptz default now()
);
create index if not exists fin_rule_hits_rule_idx on public.fin_rule_hits (rule_id, at desc);
alter table public.fin_rule_hits enable row level security;

create or replace function public.fin_rules_touch() returns trigger language plpgsql security definer set search_path = '' as $$
declare mail text;
begin
  select email into mail from public.fin_members where user_id = auth.uid();
  if tg_op = 'DELETE' then
    insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email) values ('rule', old.id::text, 'deleted', to_jsonb(old) - 'hits' - 'last_hit_at', auth.uid(), mail);
    return old;
  end if;
  if auth.uid() is not null then new.updated_by := auth.uid(); new.updated_at := now(); end if;
  if tg_op = 'INSERT' or (to_jsonb(new) - 'hits' - 'last_hit_at' - 'updated_at' - 'updated_by') is distinct from (to_jsonb(old) - 'hits' - 'last_hit_at' - 'updated_at' - 'updated_by') then
    insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
    values ('rule', new.id::text, case when tg_op = 'INSERT' then 'created' else 'updated' end, jsonb_build_object('name', new.name, 'kind', new.kind, 'enabled', new.enabled, 'priority', new.priority, 'match', new.match, 'action', new.action), auth.uid(), mail);
  end if;
  return new;
end $$;
drop trigger if exists fin_rules_touch on public.fin_rules;
create trigger fin_rules_touch before insert or update on public.fin_rules for each row execute function public.fin_rules_touch();
drop trigger if exists fin_rules_audit_del on public.fin_rules;
create trigger fin_rules_audit_del after delete on public.fin_rules for each row execute function public.fin_rules_touch();

-- master data trail (suppliers, categories, projects, companies)
create or replace function public.fin_master_audit() returns trigger language plpgsql security definer set search_path = '' as $$
declare mail text; ent text := replace(replace(tg_table_name, 'fin_', ''), 'businesses', 'company');
begin
  ent := case ent when 'suppliers' then 'supplier' when 'categories' then 'category' when 'projects' then 'project' else ent end;
  select email into mail from public.fin_members where user_id = auth.uid();
  if tg_op = 'DELETE' then
    insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email) values (ent, old.id::text, 'deleted', jsonb_build_object('name', old.name), auth.uid(), coalesce(mail, 'agent'));
    return old;
  end if;
  insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
  values (ent, new.id::text, case when tg_op = 'INSERT' then 'created' when (to_jsonb(new)->>'archived_at') is not null and (to_jsonb(old)->>'archived_at') is null then 'archived' else 'updated' end,
          jsonb_build_object('name', new.name), auth.uid(), coalesce(mail, 'agent'));
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['fin_suppliers', 'fin_categories', 'fin_projects', 'fin_businesses'] loop
    execute format('drop trigger if exists fin_master_audit on public.%I', t);
    execute format('create trigger fin_master_audit after insert or update or delete on public.%I for each row execute function public.fin_master_audit()', t);
  end loop;
end $$;

-- supplier name normalization + an approved supplier needs a valid identity
create or replace function public.fin_suppliers_norm() returns trigger language plpgsql as $$
begin
  new.normalized_name := public.fin_norm(new.name);
  new.vat_id := nullif(regexp_replace(coalesce(new.vat_id, ''), '\D', '', 'g'), '');
  if new.status = 'active' and (tg_op = 'INSERT' or old.status = 'pending') and auth.uid() is not null then new.approved_by := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists fin_suppliers_norm on public.fin_suppliers;
create trigger fin_suppliers_norm before insert or update on public.fin_suppliers for each row execute function public.fin_suppliers_norm();

-- documents: keep category_id and category in step, inherit the company of the project, dual approval above the threshold
create or replace function public.fin_documents_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pb uuid;
begin
  if new.category_id is distinct from (case when tg_op = 'UPDATE' then old.category_id end) and new.category_id is not null then
    select name into new.category from public.fin_categories where id = new.category_id;
  elsif new.category is distinct from (case when tg_op = 'UPDATE' then old.category end) then
    select id into new.category_id from public.fin_categories where name = new.category;
  end if;
  if new.project_id is not null then
    select business_id into pb from public.fin_projects where id = new.project_id;
    if new.business_id is null then new.business_id := pb;
    elsif pb is not null and pb <> new.business_id then raise exception 'PROJECT_COMPANY: the project belongs to another company';
    end if;
  end if;
  -- dual approval: the threshold is the administrator's setting, computed here; a person cannot set or clear the
  -- flag or the first signature through the API
  if tg_op = 'UPDATE' and uid is not null then
    new.first_approved_by := old.first_approved_by; new.first_approved_at := old.first_approved_at;
    new.requires_second_approval := coalesce(abs(new.total_amount), 0) >= coalesce((select (value #>> '{}')::numeric from public.fin_settings where key = 'second_approval_amount'), 0)
      and coalesce((select (value #>> '{}')::numeric from public.fin_settings where key = 'second_approval_amount'), 0) > 0
      or (old.requires_second_approval and new.total_amount is not distinct from old.total_amount);
  end if;
  if tg_op = 'UPDATE' and new.status = 'approved' and old.status <> 'approved' and new.requires_second_approval then
    if new.first_approved_by is null and old.first_approved_by is null then
      -- first signature: recorded, the document stays in review until someone else signs
      new.first_approved_by := uid; new.first_approved_at := now(); new.status := old.status;
      insert into public.fin_audit (entity, entity_id, action, changes, user_id, user_email)
      values ('document', new.id::text, 'first_approval', jsonb_build_object('total_amount', new.total_amount), uid, (select email from public.fin_members where user_id = uid));
    elsif coalesce(new.first_approved_by, old.first_approved_by) = uid then
      raise exception 'SECOND_APPROVAL: a second, different approver is required';
    end if;
  end if;
  return new;
end $$;
-- BEFORE triggers run in name order: relations ("fin_documents_a_…") must run before the guard
drop trigger if exists fin_documents_relations on public.fin_documents;
drop trigger if exists fin_documents_a_relations on public.fin_documents;
create trigger fin_documents_a_relations before insert or update on public.fin_documents for each row execute function public.fin_documents_relations();

-- document status: archived (kept, hidden from the work queues)
alter table public.fin_documents drop constraint if exists fin_documents_status_check;
alter table public.fin_documents add constraint fin_documents_status_check check (status in ('processing', 'review', 'approved', 'sent', 'rejected', 'duplicate', 'failed', 'archived'));

-- RLS for the new tables
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('fin_document_allocations', 'fin_settings', 'fin_rule_hits') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
grant select, insert, update, delete on public.fin_document_allocations, public.fin_settings to authenticated;
grant select on public.fin_rule_hits to authenticated;
revoke all on public.fin_document_allocations, public.fin_settings, public.fin_rule_hits from anon;
create policy "fin_alloc read" on public.fin_document_allocations for select to authenticated using (document_id in (select id from public.fin_documents));
create policy "fin_settings read" on public.fin_settings for select to authenticated using (public.fin_role() is not null);
create policy "fin_settings write" on public.fin_settings for update to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));
create policy "fin_rule_hits read" on public.fin_rule_hits for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));

-- permissions per the spec: companies and global rules are admin-only; suppliers, categories, projects are finance staff
drop policy if exists "fin_rules write" on public.fin_rules;
create policy "fin_rules write" on public.fin_rules for all to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));
-- an accountant sees the companies they serve; finance staff see suppliers; employees see active ones
drop policy if exists "fin_suppliers read" on public.fin_suppliers;
create policy "fin_suppliers read" on public.fin_suppliers for select to authenticated using (public.fin_role() is not null and (status <> 'pending' or public.fin_has_role(array['admin', 'finance_manager'])));
-- categories limited to some companies stay visible (they are reference data); restriction applies in the screens

insert into public.fin_categories (name, name_en, vat_deductible_pct, sort, keywords) values
  ('פרסום ושיווק', 'Advertising & marketing', 100, 9, '{meta,facebook,google ads,פרסום,קמפיין}'),
  ('ציוד משרדי', 'Office supplies', 100, 13, '{נייר,טונר,משרד}'),
  ('תוכנות ומערכות', 'Software & systems', 100, 8, '{מנוי,subscription,saas,license}'),
  ('שירותים מקצועיים', 'Professional services', 100, 10, '{}'),
  ('ייעוץ משפטי', 'Legal', 100, 10, '{עו״ד,עורך דין,משפטי}'),
  ('הנהלת חשבונות', 'Accounting', 100, 10, '{רו״ח,הנהלת חשבונות}'),
  ('ציוד בנייה', 'Construction equipment', 100, 3, '{מקדחה,פיגום,ציוד}'),
  ('תחבורה ורכב', 'Transport & vehicles', 66.67, 5, '{דלק,חניה,ליסינג}'),
  ('תקשורת', 'Telecom', 100, 7, '{אינטרנט,סלולר}'),
  ('שכירות ואחזקה', 'Rent & maintenance', 100, 4, '{שכירות,אחזקה}'),
  ('ביטוחים', 'Insurance', 0, 12, '{ביטוח,פוליסה}'),
  ('מימון וריבית', 'Finance & interest', 0, 16, '{ריבית,עמלה}'),
  ('הוצאות כלליות', 'General', 100, 98, '{}')
on conflict (name) do update set name_en = coalesce(public.fin_categories.name_en, excluded.name_en), keywords = case when public.fin_categories.keywords = '{}' then excluded.keywords else public.fin_categories.keywords end;
update public.fin_categories set keywords = '{צבע,בלוקים,מלט,ברזל,חומרי בניין}', name_en = coalesce(name_en, 'Building materials') where name = 'חומרי בניין';
update public.fin_categories set name_en = coalesce(name_en, 'Subcontractors') where name = 'קבלני משנה';

notify pgrst, 'reload schema';

-- ============================================================
-- v4 (2026-11-08): old receipts (mailbox backfill), mobile scanners (WhatsApp), cloud sync (Google Drive, Dropbox)
-- ============================================================

-- the period a mailbox covers; "old receipts" moves sync_from back and scans the gap once
alter table public.fin_mailboxes add column if not exists sync_from date;
alter table public.fin_mailboxes add column if not exists backfill_pending boolean not null default false;
update public.fin_mailboxes set sync_from = (created_at - make_interval(days => coalesce(days_back, 90)))::date where sync_from is null;

-- phones allowed to send documents to the office WhatsApp number
create table if not exists public.fin_whatsapp_senders (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,                 -- digits only, 972…
  label text,
  user_id uuid,
  business_id uuid references public.fin_businesses(id) on delete set null,
  active boolean not null default true,
  docs_count int not null default 0,
  last_received_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);
alter table public.fin_whatsapp_senders enable row level security;

-- every incoming WhatsApp message, accepted or refused (nothing disappears silently)
create table if not exists public.fin_whatsapp_inbox (
  id uuid primary key default gen_random_uuid(),
  message_id text unique,
  phone text,
  sender_id uuid references public.fin_whatsapp_senders(id) on delete set null,
  kind text,
  file_name text,
  outcome text not null,                      -- imported | duplicate | refused_unknown_number | unsupported | failed
  document_id uuid references public.fin_documents(id) on delete set null,
  detail text,
  at timestamptz default now()
);
alter table public.fin_whatsapp_inbox enable row level security;

-- cloud folders that receive copies of documents
create table if not exists public.fin_cloud_targets (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('gdrive', 'dropbox')),
  account_email text,
  folder text not null default 'Kurkoos Finance',
  structure text not null default '{company}/{period}',
  statuses text[] not null default '{approved,sent}',
  business_id uuid references public.fin_businesses(id) on delete cascade,
  enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_sync_at timestamptz,
  last_error text,
  files_synced int not null default 0,
  connected_by uuid,
  created_at timestamptz default now()
);
create table if not exists public.fin_cloud_secrets (
  target_id uuid primary key references public.fin_cloud_targets(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  folder_cache jsonb not null default '{}'::jsonb,   -- path → remote folder id (Drive)
  updated_at timestamptz default now()
);
create table if not exists public.fin_cloud_synced (
  target_id uuid references public.fin_cloud_targets(id) on delete cascade,
  document_id uuid references public.fin_documents(id) on delete cascade,
  remote_id text,
  path text,
  at timestamptz default now(),
  primary key (target_id, document_id)
);
alter table public.fin_cloud_targets enable row level security;
alter table public.fin_cloud_secrets enable row level security;
alter table public.fin_cloud_synced enable row level security;

do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('fin_whatsapp_senders', 'fin_whatsapp_inbox', 'fin_cloud_targets', 'fin_cloud_synced') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
revoke all on public.fin_cloud_secrets from anon, authenticated;
revoke all on public.fin_whatsapp_senders, public.fin_whatsapp_inbox, public.fin_cloud_targets, public.fin_cloud_synced from anon;
grant select, insert, update, delete on public.fin_whatsapp_senders, public.fin_cloud_targets to authenticated;
grant select on public.fin_whatsapp_inbox, public.fin_cloud_synced to authenticated;
-- a member registers their own phone; finance staff manage all phones
create policy "fin_wa_senders read" on public.fin_whatsapp_senders for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or user_id = auth.uid());
create policy "fin_wa_senders insert" on public.fin_whatsapp_senders for insert to authenticated with check (public.fin_has_role(array['admin', 'finance_manager']) or (public.fin_has_role(array['employee']) and user_id = auth.uid()));
create policy "fin_wa_senders update" on public.fin_whatsapp_senders for update to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or user_id = auth.uid()) with check (public.fin_has_role(array['admin', 'finance_manager']) or user_id = auth.uid());
create policy "fin_wa_senders delete" on public.fin_whatsapp_senders for delete to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or user_id = auth.uid());
create policy "fin_wa_inbox read" on public.fin_whatsapp_inbox for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']) or sender_id in (select id from public.fin_whatsapp_senders where user_id = auth.uid()));
-- cloud folders: admins connect and change them, finance managers see them
create policy "fin_cloud read" on public.fin_cloud_targets for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));
create policy "fin_cloud write" on public.fin_cloud_targets for update to authenticated using (public.fin_has_role(array['admin'])) with check (public.fin_has_role(array['admin']));
create policy "fin_cloud delete" on public.fin_cloud_targets for delete to authenticated using (public.fin_has_role(array['admin']));
create policy "fin_cloud synced read" on public.fin_cloud_synced for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager']));

alter table public.fin_agent_runs drop constraint if exists fin_agent_runs_agent_check;
alter table public.fin_agent_runs add constraint fin_agent_runs_agent_check check (agent in ('scanner', 'collector', 'ocr', 'validation', 'classification', 'export', 'summary', 'cloud', 'whatsapp', 'outbound'));
insert into public.fin_automations (key, name, description, frequency, config) values
  ('cloud_sync', 'סנכרון לענן', 'מסמכים מאושרים מועתקים לתיקיות ב-Google Drive וב-Dropbox', 'daily', '{}')
on conflict (key) do nothing;

notify pgrst, 'reload schema';

-- ============================================================
-- v4.1 (2026-11-08): review fixes for the connection screens
-- ============================================================

-- "old receipts" scans only the gap [sync_from, backfill_until), so a busy mailbox still reaches it
alter table public.fin_mailboxes add column if not exists backfill_until date;

-- one cloud sync per target at a time (cron and the button can overlap)
alter table public.fin_cloud_targets add column if not exists syncing_until timestamptz;
alter table public.fin_cloud_targets add column if not exists files_failed int not null default 0;

-- OAuth state is single use
create table if not exists public.fin_oauth_used (nonce text primary key, at timestamptz default now());
alter table public.fin_oauth_used enable row level security;
revoke all on public.fin_oauth_used from anon, authenticated;

-- claims a target for one sync run (true) or reports that another run holds it (false)
create or replace function public.fin_cloud_lock(p_target uuid, p_minutes int default 5)
returns boolean language sql volatile security definer set search_path = '' as $$
  with c as (update public.fin_cloud_targets set syncing_until = now() + make_interval(mins => p_minutes)
             where id = p_target and (syncing_until is null or syncing_until < now()) returning 1)
  select exists (select 1 from c);
$$;
revoke all on function public.fin_cloud_lock(uuid, int) from public, anon, authenticated;
grant execute on function public.fin_cloud_lock(uuid, int) to service_role;

-- documents a cloud target still needs, filtered in SQL (no page cap that stalls after the oldest N)
create or replace function public.fin_cloud_pending(p_target uuid, p_limit int default 200)
returns setof public.fin_documents language sql stable security definer set search_path = '' as $$
  select d.* from public.fin_documents d, public.fin_cloud_targets t
  where t.id = p_target and d.status = any(t.statuses) and d.file_path is not null
    and (t.business_id is null or d.business_id = t.business_id)
    and not exists (select 1 from public.fin_cloud_synced s where s.target_id = t.id and s.document_id = d.id)
  order by d.created_at, d.id limit greatest(1, least(p_limit, 1000));
$$;
revoke all on function public.fin_cloud_pending(uuid, int) from public, anon, authenticated;
grant execute on function public.fin_cloud_pending(uuid, int) to service_role;

-- a phone may be registered only for a company the user may see; employees register only their own phone
drop policy if exists "fin_wa_senders insert" on public.fin_whatsapp_senders;
drop policy if exists "fin_wa_senders update" on public.fin_whatsapp_senders;
create policy "fin_wa_senders insert" on public.fin_whatsapp_senders for insert to authenticated with check (
  public.fin_business_ok(business_id)
  and (public.fin_has_role(array['admin', 'finance_manager']) or (public.fin_has_role(array['employee']) and user_id = auth.uid())));
create policy "fin_wa_senders update" on public.fin_whatsapp_senders for update to authenticated
  using (public.fin_has_role(array['admin', 'finance_manager']) or user_id = auth.uid())
  with check (public.fin_business_ok(business_id) and (public.fin_has_role(array['admin', 'finance_manager']) or user_id = auth.uid()));
-- counters belong to the server
revoke update on public.fin_whatsapp_senders from authenticated;
grant update (label, business_id, user_id, active) on public.fin_whatsapp_senders to authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- v5 (2026-11-08): automatic delivery (webhooks + email forwarding), organization view
-- ============================================================

-- where documents are sent automatically: a webhook (signed JSON) or an email address (the file as an attachment)
create table if not exists public.fin_outbound (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('webhook', 'email')),
  name text,
  target text not null,                          -- https URL or email address
  events text[] not null default '{document.received}',
  business_id uuid references public.fin_businesses(id) on delete set null,
  enabled boolean not null default true,
  sent_count int not null default 0,
  fail_count int not null default 0,
  last_status text,
  last_at timestamptz,
  created_by uuid,
  created_at timestamptz default now()
);
-- the webhook signing secret, server only
create table if not exists public.fin_outbound_secrets (
  outbound_id uuid primary key references public.fin_outbound(id) on delete cascade,
  secret text not null
);
-- one row per (destination, event, document); the server drains it with retries
create table if not exists public.fin_outbound_queue (
  id bigserial primary key,
  outbound_id uuid not null references public.fin_outbound(id) on delete cascade,
  event text not null,
  document_id uuid references public.fin_documents(id) on delete cascade,
  attempts int not null default 0,
  next_at timestamptz not null default now(),
  done_at timestamptz,
  last_status int,
  last_error text,
  created_at timestamptz default now(),
  unique (outbound_id, event, document_id)
);
create index if not exists fin_outbound_queue_due on public.fin_outbound_queue (next_at) where done_at is null;
alter table public.fin_outbound enable row level security;
alter table public.fin_outbound_secrets enable row level security;
alter table public.fin_outbound_queue enable row level security;
revoke all on public.fin_outbound_secrets from anon, authenticated;
revoke all on public.fin_outbound, public.fin_outbound_queue from anon;
revoke insert, update, delete on public.fin_outbound, public.fin_outbound_queue from authenticated;
grant select on public.fin_outbound, public.fin_outbound_queue to authenticated;
drop policy if exists "fin_outbound read" on public.fin_outbound;
drop policy if exists "fin_outbound_queue read" on public.fin_outbound_queue;
create policy "fin_outbound read" on public.fin_outbound for select to authenticated using (public.fin_has_role(array['admin']));
create policy "fin_outbound_queue read" on public.fin_outbound_queue for select to authenticated using (public.fin_has_role(array['admin']));

-- document events: received (read and waiting for review), approved, rejected, exported
create or replace function public.fin_outbound_enqueue() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ev text;
begin
  if tg_op = 'INSERT' then
    ev := case when new.status in ('review', 'failed') then 'document.received' end;
  elsif new.status is distinct from old.status then
    ev := case
      when new.status in ('review', 'failed') and old.status in ('processing', 'failed') then 'document.received'
      when new.status = 'approved' then 'document.approved'
      when new.status = 'rejected' then 'document.rejected'
      when new.status = 'sent' then 'document.exported'
    end;
  end if;
  if ev is null then return new; end if;
  insert into public.fin_outbound_queue (outbound_id, event, document_id)
  select o.id, ev, new.id from public.fin_outbound o
  where o.enabled and ev = any(o.events) and (o.business_id is null or o.business_id = new.business_id)
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists fin_documents_outbound on public.fin_documents;
create trigger fin_documents_outbound after insert or update of status on public.fin_documents for each row execute function public.fin_outbound_enqueue();

alter table public.fin_agent_runs drop constraint if exists fin_agent_runs_agent_check;
alter table public.fin_agent_runs add constraint fin_agent_runs_agent_check check (agent in ('scanner', 'collector', 'ocr', 'validation', 'classification', 'export', 'summary', 'cloud', 'whatsapp', 'outbound'));
insert into public.fin_automations (key, name, description, frequency, config) values
  ('outbound', 'שליחה אוטומטית', 'מסמכים חדשים ושינויי סטטוס נשלחים ל-webhook ולכתובות המייל שהוגדרו', 'on_event', '{}')
on conflict (key) do nothing;

-- one accounting system per company (a second one would export the same documents twice)
alter table public.fin_integrations drop constraint if exists fin_integrations_provider_check;
alter table public.fin_integrations add constraint fin_integrations_provider_check check (provider in ('file', 'icount', 'morning', 'hashavshevet', 'rivhit', 'priority', 'sumit', 'paperless'));
do $$ begin
  create unique index if not exists fin_integrations_one_api_per_business
    on public.fin_integrations (coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid))
    where enabled and provider not in ('file', 'hashavshevet');
exception when unique_violation then
  raise notice 'two accounting systems are enabled for one company: disable one, then run this file again';
end $$;

notify pgrst, 'reload schema';

-- v5.1: delivery counters are incremented in one statement (parallel flushes do not lose counts)
create or replace function public.fin_outbound_count(p_id uuid, p_ok boolean, p_status text)
returns void language sql volatile security definer set search_path = '' as $$
  update public.fin_outbound set
    sent_count = sent_count + case when p_ok then 1 else 0 end,
    fail_count = fail_count + case when p_ok then 0 else 1 end,
    last_status = left(p_status, 300), last_at = now()
  where id = p_id;
$$;
revoke all on function public.fin_outbound_count(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.fin_outbound_count(uuid, boolean, text) to service_role;
notify pgrst, 'reload schema';

-- ============================================================
-- v8 (2026-11-08): accountant delivery history
-- ============================================================
-- every "send to the accountant": who, to whom, which documents, and what the mail provider answered.
-- 'sent' means the provider accepted the message (it returned an id); a failure is kept with its reason.
create table if not exists public.fin_deliveries (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'email' check (channel in ('email', 'whatsapp')),
  recipients text[] not null,
  document_ids uuid[] not null,
  documents_count int not null,
  total numeric(14, 2),
  period text,
  status text not null check (status in ('sent', 'failed')),
  provider_id text,
  error text,
  attached int, linked int,
  created_by uuid, created_by_email text,
  created_at timestamptz default now()
);
create index if not exists fin_deliveries_at on public.fin_deliveries (created_at desc);
alter table public.fin_deliveries enable row level security;
revoke all on public.fin_deliveries from anon;
revoke insert, update, delete on public.fin_deliveries from authenticated;
grant select on public.fin_deliveries to authenticated;
drop policy if exists "fin_deliveries read" on public.fin_deliveries;
create policy "fin_deliveries read" on public.fin_deliveries for select to authenticated using (public.fin_has_role(array['admin', 'finance_manager', 'accountant']));
notify pgrst, 'reload schema';
