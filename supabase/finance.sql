-- ============================================================
-- Kurkoos Finance — invoice collection and bookkeeping (2026-11-08; safe to re-run)
-- The internal system at /admin/finance: invoices and receipts are pulled from the
-- connected mailboxes (Gmail), from manual uploads and from the phone camera, Claude reads
-- each one, and the office reviews, approves and sends them to the accountant.
--
-- Access: every table is for signed-in admins only (same model as the rest of the admin).
-- The mailbox OAuth tokens sit in fin_mailbox_secrets, which has RLS on and NO policy, so
-- only the server (service_role) can read them. They never reach the browser.
--
-- Storage: the private bucket finance-docs. The free plan's 1 GB is shared by the whole
-- organization (CLAUDE.md), so server/finance.js stops importing at 75% of the quota.
-- ============================================================

-- the companies of the group, so every document belongs to the right books
create table if not exists public.fin_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_id text,                       -- ח.פ / ע.מ
  accountant_email text,             -- where the monthly package goes
  color text default '#105572',
  sort int default 0,
  created_at timestamptz default now()
);

create table if not exists public.fin_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  vat_deductible_pct numeric default 100,   -- how much of the VAT can be claimed (רכב: 66.67, כיבוד: 0 ...)
  sort int default 0
);

create table if not exists public.fin_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_id text,
  email_domain text,
  default_category text,
  default_business_id uuid references public.fin_businesses(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);
create unique index if not exists fin_suppliers_vat_uq on public.fin_suppliers (vat_id) where vat_id is not null and vat_id <> '';

-- a connected mailbox (no secrets here)
create table if not exists public.fin_mailboxes (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'gmail' check (provider in ('gmail', 'outlook', 'imap')),
  email text not null,
  business_id uuid references public.fin_businesses(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'revoked')),
  query text,                        -- extra Gmail search terms, optional
  last_sync_at timestamptz,
  last_error text,
  docs_found int default 0,
  connected_by uuid,
  created_at timestamptz default now(),
  unique (provider, email)
);

-- the OAuth tokens: server only
create table if not exists public.fin_mailbox_secrets (
  mailbox_id uuid primary key references public.fin_mailboxes(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.fin_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.fin_businesses(id) on delete set null,
  supplier_id uuid references public.fin_suppliers(id) on delete set null,
  supplier_name text,
  supplier_vat_id text,
  doc_type text default 'invoice' check (doc_type in ('invoice', 'receipt', 'invoice_receipt', 'credit', 'proforma', 'quote', 'other')),
  doc_number text,
  issue_date date,
  due_date date,
  currency text default 'ILS',
  amount_before_vat numeric(14, 2),
  vat_amount numeric(14, 2),
  total_amount numeric(14, 2),
  category text,
  description text,
  payment_method text,
  paid boolean default false,
  status text not null default 'processing' check (status in ('processing', 'review', 'approved', 'sent', 'rejected', 'duplicate', 'failed')),
  source text not null default 'upload' check (source in ('gmail', 'outlook', 'upload', 'camera', 'forward', 'whatsapp')),
  mailbox_id uuid references public.fin_mailboxes(id) on delete set null,
  email_message_id text,
  email_subject text,
  email_from text,
  email_date timestamptz,
  file_path text,                    -- inside the finance-docs bucket
  file_name text,
  file_mime text,
  file_size int,
  file_hash text,                    -- sha256, one document per file
  extraction jsonb,                  -- Claude's raw answer
  confidence numeric,                -- 0..1
  notes text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists fin_documents_hash_uq on public.fin_documents (file_hash) where file_hash is not null;
create index if not exists fin_documents_issue_idx on public.fin_documents (issue_date desc);
create index if not exists fin_documents_status_idx on public.fin_documents (status);
create index if not exists fin_documents_supplier_idx on public.fin_documents (supplier_id);

create table if not exists public.fin_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid references public.fin_mailboxes(id) on delete cascade,
  started_at timestamptz default now(),
  finished_at timestamptz,
  scanned int default 0,
  imported int default 0,
  skipped int default 0,
  error text
);

-- every Gmail message already looked at, so a sync never reads (and pays Claude for) the same email twice
create table if not exists public.fin_mail_seen (
  mailbox_id uuid references public.fin_mailboxes(id) on delete cascade,
  message_id text not null,
  seen_at timestamptz default now(),
  primary key (mailbox_id, message_id)
);

create or replace function public.fin_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists fin_documents_touch on public.fin_documents;
create trigger fin_documents_touch before update on public.fin_documents for each row execute function public.fin_touch();

-- RLS: admins (authenticated) only; the secrets table has no policy at all
alter table public.fin_businesses enable row level security;
alter table public.fin_categories enable row level security;
alter table public.fin_suppliers enable row level security;
alter table public.fin_mailboxes enable row level security;
alter table public.fin_mailbox_secrets enable row level security;
alter table public.fin_documents enable row level security;
alter table public.fin_sync_runs enable row level security;
alter table public.fin_mail_seen enable row level security;   -- server only, no policy

do $$
declare t text;
begin
  foreach t in array array['fin_businesses', 'fin_categories', 'fin_suppliers', 'fin_mailboxes', 'fin_documents', 'fin_sync_runs'] loop
    execute format('drop policy if exists "%s admin all" on public.%I', t, t);
    execute format('create policy "%s admin all" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
revoke all on public.fin_mailbox_secrets from anon, authenticated;

-- the private bucket for the files
insert into storage.buckets (id, name, public, file_size_limit)
values ('finance-docs', 'finance-docs', false, 15728640)
on conflict (id) do update set public = false;

drop policy if exists "finance docs admin read" on storage.objects;
create policy "finance docs admin read" on storage.objects for select to authenticated using (bucket_id = 'finance-docs');
drop policy if exists "finance docs admin insert" on storage.objects;
create policy "finance docs admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'finance-docs');
drop policy if exists "finance docs admin delete" on storage.objects;
create policy "finance docs admin delete" on storage.objects for delete to authenticated using (bucket_id = 'finance-docs');

-- starting data
insert into public.fin_businesses (name, sort) select * from (values ('קורקוס גרופ', 0)) v(name, sort)
where not exists (select 1 from public.fin_businesses);

insert into public.fin_categories (name, vat_deductible_pct, sort) values
  ('חומרי בניין', 100, 1),
  ('קבלני משנה', 100, 2),
  ('ציוד וכלים', 100, 3),
  ('שכירות', 100, 4),
  ('רכב ודלק', 66.67, 5),
  ('חשמל, מים וארנונה', 100, 6),
  ('תקשורת ואינטרנט', 100, 7),
  ('תוכנה ומנויים', 100, 8),
  ('פרסום ושיווק', 100, 9),
  ('ייעוץ ושירותים מקצועיים', 100, 10),
  ('ביטוח', 0, 11),
  ('משרד וציוד משרדי', 100, 12),
  ('כיבוד ואירוח', 0, 13),
  ('נסיעות', 100, 14),
  ('עמלות בנק', 0, 15),
  ('אחר', 100, 99)
on conflict (name) do nothing;
