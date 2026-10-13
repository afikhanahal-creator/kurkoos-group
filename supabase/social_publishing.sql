-- Direct publishing from the content engine (applied as migrations social_direct_publishing and social_publish_cron).
-- Tokens and settings are readable only by the service role (RLS on, no policies).
create table if not exists public.social_config (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.social_config enable row level security;
create table if not exists public.social_accounts (
  id text primary key, network text not null check (network in ('facebook','instagram','tiktok','youtube')),
  name text, username text, page_id text, account_id text not null, token text not null, picture text,
  connected_by uuid, connected_at timestamptz not null default now());
alter table public.social_accounts enable row level security;
create table if not exists public.social_queue (
  item_id text primary key, post_id text, label text, at timestamptz not null, nets text[] not null default '{}',
  text_fb text, text_ig text, media_url text,
  status text not null default 'queued' check (status in ('queued','publishing','done','partial','error','cancelled')),
  results jsonb not null default '{}'::jsonb, attempts int not null default 0, last_error text, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.social_queue enable row level security;
create index if not exists social_queue_due on public.social_queue (status, at);
insert into public.social_config(key, value) values ('cron_secret', encode(extensions.gen_random_bytes(24), 'hex')) on conflict (key) do nothing;

create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('social-publish', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://filnzlnvujnlazwcxbuq.supabase.co/functions/v1/social',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select value from public.social_config where key='cron_secret')),
    body := '{"a":"run"}'::jsonb, timeout_milliseconds := 120000);
$$);
