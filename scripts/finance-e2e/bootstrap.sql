-- A local stand-in for a Supabase project, for the end-to-end test only.
-- The roles and schemas Supabase creates before any project SQL runs.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'pw'; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin login createrole password 'pw'; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then create role supabase_storage_admin login createrole password 'pw'; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to supabase_storage_admin;
create schema if not exists auth authorization supabase_auth_admin;
create schema if not exists storage authorization supabase_storage_admin;
create schema if not exists extensions;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
grant all on schema public to supabase_storage_admin, supabase_auth_admin;
grant create on database postgres to supabase_storage_admin, supabase_auth_admin;
create extension if not exists pgcrypto with schema extensions;
alter role supabase_auth_admin set search_path = auth;
alter role supabase_storage_admin set search_path = storage;
