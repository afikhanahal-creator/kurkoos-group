-- ============================================================
-- KURKOOS CMS — schema, RLS, storage, seed
-- ============================================================

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- projects ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text,
  description text,
  location text,
  address text,
  gush text,
  chelka text,
  status text default 'planning',
  hero_image_url text,
  gallery jsonb default '[]'::jsonb,
  amenities jsonb default '[]'::jsonb,
  seo_title text,
  seo_description text,
  pages jsonb default '[]'::jsonb,     -- עמודים שבהם הפרויקט מופיע: ["development","execution","featured","brokerage"]
  is_published boolean default true,
  is_archived boolean default false,
  sort_order int default 0,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- שדרוג למסדי-נתונים קיימים: עמודות חדשות אם חסרות
alter table public.projects add column if not exists pages jsonb default '[]'::jsonb;
alter table public.projects add column if not exists sections jsonb default '[]'::jsonb;     -- אילו מקטעים מוצגים בעמוד הפרויקט
alter table public.projects add column if not exists developers jsonb default '[]'::jsonb;   -- יזמי הפרויקט [{name, logo, bio}]
alter table public.projects add column if not exists card_layout text default 'normal';      -- תצוגת כרטיס בגלריה: normal | wide | tall
alter table public.projects add column if not exists stats_scale text default 'normal';       -- גודל קוביות הנתונים: small | normal | large
-- ⚠️ יש להריץ קובץ זה מחדש ב-Supabase (SQL editor) אחרי כל הוספת עמודות, אחרת שמירה מהאדמין תיכשל.
-- נתוני הפרויקט (סקלרים) — תיבות הסטטיסטיקה בבאנר
alter table public.projects add column if not exists towers int;                              -- מספר בניינים
alter table public.projects add column if not exists units int;                               -- יחידות דיור
alter table public.projects add column if not exists floors text;                             -- קומות (טקסט, למשל "7-8")
alter table public.projects add column if not exists architects text;                         -- אדריכלים
alter table public.projects add column if not exists year int;                                -- שנת אכלוס
-- שדות מובנים (jsonb)
alter table public.projects add column if not exists video jsonb default '{}'::jsonb;          -- {type:'youtube', id} — סרטון בודד (הירו)
alter table public.projects add column if not exists videos jsonb default '[]'::jsonb;          -- [{type:'youtube'|'file', id|src, title}] — מספר סרטונים לפרויקט
alter table public.projects add column if not exists coords jsonb default '{}'::jsonb;          -- {lat, lng} — סמן מפה מלוטש
alter table public.projects add column if not exists map_link text;                            -- קישור Google Maps (נגזרות ממנו קואורדינטות למפה)
alter table public.projects add column if not exists environment jsonb default '{}'::jsonb;     -- {title, text, image}
alter table public.projects add column if not exists plan_groups jsonb default '[]'::jsonb;     -- [{rooms, label, plans:[{label, img}]}]
alter table public.projects add column if not exists gallery_groups jsonb default '[]'::jsonb;  -- [{label, images:[url]}]
-- מאפיינים (features) נשמרים בעמודת amenities הקיימת

-- ---------- properties ----------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  unit_number text,
  type text,
  rooms numeric,
  floor text,
  size_sqm numeric,
  garden_sqm numeric,
  balcony_sqm numeric,
  price numeric,
  price_visible boolean default true,
  status text default 'available',
  floor_plan_url text,
  gallery jsonb default '[]'::jsonb,
  features jsonb default '[]'::jsonb,
  description text,
  is_published boolean default true,
  is_archived boolean default false,
  sort_order int default 0,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists properties_project_id_idx on public.properties(project_id);

-- ---------- site_counters ----------
create table if not exists public.site_counters (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label_he text,
  value text,
  suffix text,
  location_hint text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- site_logos (logo carousel) ----------
create table if not exists public.site_logos (
  id uuid primary key default gen_random_uuid(),
  name text,
  image_url text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- לוגו: סקלת גודל לכל לוגו (קרוסלת שותפים)
alter table public.site_logos add column if not exists scale numeric default 1;
-- לוגו: מיקום (גרירה למרכוז) — אחוזי הזזה אופקי/אנכי
alter table public.site_logos add column if not exists pos_x numeric default 0;
alter table public.site_logos add column if not exists pos_y numeric default 0;

-- ---------- leads (CRM — פניות מטופסי האתר) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  message text,
  project jsonb,            -- שם הפרויקט שממנו הגיעה הפנייה ({he,en} או טקסט)
  source text default 'project',  -- מקור הפנייה: project | contact | ...
  status text default 'new',      -- new | in_progress | done | ...
  contacted boolean default false,
  notes text,
  is_archived boolean default false,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at triggers
drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists trg_properties_updated on public.properties;
create trigger trg_properties_updated before update on public.properties for each row execute function public.set_updated_at();
drop trigger if exists trg_counters_updated on public.site_counters;
create trigger trg_counters_updated before update on public.site_counters for each row execute function public.set_updated_at();
drop trigger if exists trg_logos_updated on public.site_logos;
create trigger trg_logos_updated before update on public.site_logos for each row execute function public.set_updated_at();
drop trigger if exists trg_leads_updated on public.leads;
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.projects enable row level security;
alter table public.properties enable row level security;
alter table public.site_counters enable row level security;
alter table public.site_logos enable row level security;
alter table public.leads enable row level security;

-- public (anon) read of published/active rows
drop policy if exists "projects public read" on public.projects;
create policy "projects public read" on public.projects for select to anon, authenticated
  using (is_published = true and is_archived = false);

drop policy if exists "properties public read" on public.properties;
create policy "properties public read" on public.properties for select to anon, authenticated
  using (is_published = true and is_archived = false);

drop policy if exists "counters public read" on public.site_counters;
create policy "counters public read" on public.site_counters for select to anon, authenticated
  using (is_active = true);

drop policy if exists "logos public read" on public.site_logos;
create policy "logos public read" on public.site_logos for select to anon, authenticated
  using (is_active = true);

-- authenticated admin: full access on everything
drop policy if exists "projects admin all" on public.projects;
create policy "projects admin all" on public.projects for all to authenticated using (true) with check (true);
drop policy if exists "properties admin all" on public.properties;
create policy "properties admin all" on public.properties for all to authenticated using (true) with check (true);
drop policy if exists "counters admin all" on public.site_counters;
create policy "counters admin all" on public.site_counters for all to authenticated using (true) with check (true);
drop policy if exists "logos admin all" on public.site_logos;
create policy "logos admin all" on public.site_logos for all to authenticated using (true) with check (true);

-- leads: כל מבקר יכול לשלוח פנייה (insert), אך רק מנהל מחובר רואה/מנהל אותן
drop policy if exists "leads public insert" on public.leads;
create policy "leads public insert" on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "leads admin all" on public.leads;
create policy "leads admin all" on public.leads for all to authenticated using (true) with check (true);

-- ============================================================
-- Storage bucket for media (public read, authenticated write)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
drop policy if exists "media auth insert" on storage.objects;
create policy "media auth insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media');
drop policy if exists "media auth update" on storage.objects;
create policy "media auth update" on storage.objects for update to authenticated
  using (bucket_id = 'media');
drop policy if exists "media auth delete" on storage.objects;
create policy "media auth delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media');

-- ============================================================
-- Seed: counters
-- ============================================================
insert into public.site_counters (key, label_he, value, suffix, location_hint, sort_order) values
  ('years_experience', 'שנות ניסיון', '25', '+', 'סקשן "במספרים" + הירו', 1),
  ('projects_total',   'פרויקטים',     '80', '+', 'סקשן "במספרים" + הירו', 2),
  ('housing_units',    'יחידות דיור',  '3200', '+', 'סקשן "במספרים" + הירו', 3),
  ('sqm_built',        'מ"ר שנבנו',     '450', 'K', 'סקשן "במספרים"', 4)
on conflict (key) do nothing;

-- ============================================================
-- Seed: logos (logo carousel)
-- ============================================================
insert into public.site_logos (name, sort_order) values
  ('Bank Leumi', 1),
  ('Shikun & Binui', 2),
  ('Azrieli', 3),
  ('Electra', 4),
  ('Africa Israel', 5),
  ('Menora', 6)
on conflict do nothing;

-- ============================================================
-- Seed: projects (from existing site data)
-- ============================================================
insert into public.projects (slug, name, subtitle, description, location, status, hero_image_url, gallery, sort_order) values
  ('park-residence', 'פארק רזידנס', 'מגורי יוקרה', 'פרויקט הדגל של הקבוצה: מגדל מגורים יוקרתי המשלב אדריכלות עכשווית, שטחים ירוקים ותחושת קהילה. כל דירה תוכננה למקסם אור טבעי ונוף פתוח.', 'תל אביב', 'marketing', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1280&q=80', '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1280&q=80"]'::jsonb, 1),
  ('marina-towers', 'מגדלי המרינה', 'מגורים ומסחר', 'מתחם מגורים ומסחר המשלב חיי עיר עם שלווה של קו החוף. תכנון מוקפד יוצר איזון בין פרטיות לקהילתיות.', 'הרצליה', 'construction', 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1280&q=80', '["https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1280&q=80"]'::jsonb, 2),
  ('green-heights', 'גרין הייטס', 'מגורים', 'פרויקט מגורים בסטנדרט בנייה ירוקה, עם מערכות חיסכון באנרגיה, גגות ירוקים ועיצוב נוף עשיר.', 'רעננה', 'completed', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1280&q=80', '["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1280&q=80"]'::jsonb, 3),
  ('city-center-renewal', 'התחדשות מרכז העיר', 'התחדשות עירונית', 'התחדשות עירונית בקנה מידה גדול, המשלבת שדרוג איכות החיים של הדיירים הקיימים עם תוספת יחידות דיור ומרחב ציבורי מזמין.', 'בת ים', 'planning', 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1280&q=80', '["https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1280&q=80"]'::jsonb, 4)
on conflict (slug) do nothing;

-- ============================================================
-- Lead email notifications (settings tab)
--   • lead_notify_recipients — נמענים שיקבלו מייל על כל ליד חדש
--   • lead_notify_settings    — הגדרת האוטומציה (שורת בודדת, id=1)
-- ============================================================
create table if not exists public.lead_notify_recipients (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.lead_notify_settings (
  id int primary key default 1,
  enabled boolean default true,
  subject text default 'ליד חדש מהאתר: {{name}}',
  reply_to text,
  include_fields jsonb default '["name","phone","email","project","message","source","created_at"]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint lead_notify_settings_singleton check (id = 1)
);
insert into public.lead_notify_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_notify_recipients_updated on public.lead_notify_recipients;
create trigger trg_notify_recipients_updated before update on public.lead_notify_recipients for each row execute function public.set_updated_at();
drop trigger if exists trg_notify_settings_updated on public.lead_notify_settings;
create trigger trg_notify_settings_updated before update on public.lead_notify_settings for each row execute function public.set_updated_at();

alter table public.lead_notify_recipients enable row level security;
alter table public.lead_notify_settings enable row level security;

-- רק מנהל מחובר רואה/מנהל את הנמענים וההגדרות (ה-API שולח המיילים משתמש ב-service role ועוקף RLS)
drop policy if exists "notify recipients admin all" on public.lead_notify_recipients;
create policy "notify recipients admin all" on public.lead_notify_recipients for all to authenticated using (true) with check (true);
drop policy if exists "notify settings admin all" on public.lead_notify_settings;
create policy "notify settings admin all" on public.lead_notify_settings for all to authenticated using (true) with check (true);
