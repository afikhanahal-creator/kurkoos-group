-- after GoTrue migrated: what the Supabase platform grants on auth
grant usage on schema auth to anon, authenticated, service_role, postgres;
grant select on auth.users to postgres;
grant execute on all functions in schema auth to anon, authenticated, service_role;
alter role service_role bypassrls;
-- and what it grants on storage once the storage service has migrated
grant all on all tables in schema storage to anon, authenticated, service_role;
grant all on all sequences in schema storage to anon, authenticated, service_role;
grant all on all functions in schema storage to anon, authenticated, service_role;
