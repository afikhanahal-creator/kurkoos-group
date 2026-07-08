-- ============================================================
-- אבטחה — להריץ ב-Supabase Dashboard → SQL Editor
-- מחמיר RLS, מוסיף ולידציה ברמת DB, מסתיר newsletter_webhook מהציבור.
-- ============================================================

-- 1. הגבל public read של site_settings — אל תחשוף newsletter_webhook
drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings
  for select using (key <> 'newsletter_webhook');

-- 2. הגבל הכנסת ליד — שדות עם WITH CHECK ולידציה (אורכים + source תקין)
drop policy if exists "leads public insert" on public.leads;
create policy "leads public insert" on public.leads
  for insert to anon, authenticated
  with check (
    (name    is null or length(name)    <= 200) and
    (phone   is null or length(phone)   <= 30)  and
    (email   is null or length(email)   <= 200) and
    (message is null or length(message) <= 2000) and
    (notes   is null or length(notes)   <= 2000) and
    (coalesce(source, 'contact') in ('project', 'contact', 'home', 'manual'))
  );

-- 3. ולידציה פורמט מייל על newsletter_subscribers
drop policy if exists "newsletter insert public" on public.newsletter_subscribers;
create policy "newsletter insert public" on public.newsletter_subscribers
  for insert
  with check (
    email ~* '^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$'
    and length(email) <= 200
  );

-- 4. כבה הרשמה ציבורית (חשוב — לבצע גם ב-Dashboard → Authentication → Settings)
-- את זה לא ניתן לשנות ב-SQL — יש להשתמש בממשק ה-Dashboard.
-- ============================================================
-- הרצה: Supabase Dashboard → SQL Editor → הדבק ולחץ Run
-- ============================================================
