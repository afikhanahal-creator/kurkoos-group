-- Instagram / Facebook messages and automations (admin tab "הודעות ואוטומציות", edge function "dm").
-- Applied 2026-11-01 as migration dm_inbox_automations. Read and written only by the "dm" function (service role):
-- RLS is on with no policies, so the browser never sees a token.
create table if not exists public.dm_connections (
  id text primary key, name text, picture text, token text not null,
  connected_by uuid, connected_at timestamptz not null default now()
);
create table if not exists public.dm_accounts (
  id text primary key,
  connection_id text not null references public.dm_connections(id) on delete cascade,
  network text not null check (network in ('facebook','instagram')),
  page_id text not null, account_id text not null, name text, username text, picture text,
  token text not null, enabled boolean not null default true,
  subscribed boolean not null default false, sub_error text, connected_at timestamptz not null default now()
);
create table if not exists public.dm_threads (
  id text primary key, account_id text not null, person_id text not null,
  name text, username text, picture text, last_text text, last_dir text, last_at timestamptz,
  last_in_at timestamptz, unread int not null default 0, bot_paused boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dm_threads_acc_last on public.dm_threads(account_id, last_at desc);
create table if not exists public.dm_messages (
  id text primary key, thread_id text not null, account_id text not null,
  dir text not null check (dir in ('in','out')),
  kind text not null default 'dm' check (kind in ('dm','comment','reply')),
  text text, media_url text, post_id text, post_url text, via text, at timestamptz not null default now()
);
create index if not exists dm_messages_thread_at on public.dm_messages(thread_id, at);
create table if not exists public.dm_rules (
  id uuid primary key default gen_random_uuid(), name text not null, account_id text,
  trigger text not null check (trigger in ('comment','dm','first_dm')),
  keywords text[] not null default '{}', post_id text, reply_text text not null, public_reply text,
  enabled boolean not null default true, hits int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.dm_rule_hits (
  rule_id uuid not null references public.dm_rules(id) on delete cascade,
  person_key text not null, at timestamptz not null default now(), primary key (rule_id, person_key)
);
create table if not exists public.dm_snippets (
  id uuid primary key default gen_random_uuid(), title text not null, text text not null,
  created_at timestamptz not null default now()
);
alter table public.dm_connections enable row level security;
alter table public.dm_accounts enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_rules enable row level security;
alter table public.dm_rule_hits enable row level security;
alter table public.dm_snippets enable row level security;
