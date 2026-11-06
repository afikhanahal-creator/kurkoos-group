-- Storage watch (2026-11-06; safe to re-run). The free plan's quota is per Supabase ORGANIZATION: on 2026-11-06 this project
-- (930 MB, mostly Meta ad captures) and the Afik Hanahal one shared an org, passed 1.1 GB together and both were restricted.
-- The Afik site's daily cron (afik-hanahal: api/cron/warm.js supabaseWatch) reads this with the publishable key and texts the
-- office once a day while the project passes 70% of 1 GB; scripts/meta_capture/up.cjs stops uploading at 75%.
-- Sizes only — never a name, a path or any content.
create or replace function public.storage_usage()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0),
    'storage_files', (select count(*) from storage.objects),
    'buckets', (select coalesce(jsonb_object_agg(bucket_id, bytes), '{}'::jsonb) from (select bucket_id, sum((metadata->>'size')::bigint) bytes from storage.objects group by bucket_id) x)
  )
$$;
revoke all on function public.storage_usage() from public;
grant execute on function public.storage_usage() to anon, authenticated, service_role;
