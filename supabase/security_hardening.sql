-- ============================================================
-- Security hardening of the site tables: one-time clean-up of old, open policies.
-- The hardened policies themselves now live in supabase/migration.sql (lead validation, newsletter email format,
-- settings read without the newsletter webhook), so running migration.sql again can no longer loosen them.
-- This file only removes two leftovers that were created by hand before the hardening. Permissive policies are OR-ed,
-- so while they exist the hardened ones have no effect. Safe to run again.
-- Run in: Supabase Dashboard > SQL Editor.
-- ============================================================
drop policy if exists "read settings" on public.site_settings;      -- select using (true): exposed newsletter_webhook
drop policy if exists "leads insert anon" on public.leads;          -- insert with check (true): skipped the validation

-- Public sign-up cannot be switched off in SQL: Dashboard > Authentication > Settings.
