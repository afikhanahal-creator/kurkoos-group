-- ============================================================
-- KURKOOS GROUP — סכמת CMS ל-Supabase
-- הריצו את כל הקובץ ב: Supabase → SQL Editor → New query → Run
-- כולל: טבלאות, אבטחה (RLS), bucket אחסון, ונתוני התחלה (seed).
-- ============================================================

-- ---------- ניקוי התקנה ישנה (כדי להתחיל נקי) ----------
drop table if exists projects cascade;
drop table if exists stats cascade;
drop table if exists site_settings cascade;

-- ---------- טבלאות ----------
-- שימו לב: אם כבר הרצתם גרסה קודמת של הסכמה — יש להריץ את הקובץ מחדש כדי
-- שהעמודות החדשות (map_query, environment, plans, plan_groups, gallery_groups)
-- ייווצרו. בלעדיהן שדות אלו לא יישמרו מהאדמין.
create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name jsonb not null,                 -- {"he":"...","en":"..."}
  city jsonb,                          -- {"he":"...","en":"..."}
  status text,                         -- planning | construction | marketing | completed
  category text,                       -- residential | commercial | renewal
  year int,
  units int,
  towers int,                          -- מספר בניינים
  floors text,                         -- קומות (יכול להיות טווח, "7-8")
  architects jsonb,                    -- {"he":"...","en":"..."}
  type jsonb,                          -- {"he":"...","en":"..."}
  short jsonb,                         -- {"he":"...","en":"..."}
  description jsonb,                   -- {"he":"...","en":"..."}
  cover text,
  gallery jsonb default '[]'::jsonb,   -- ["url", ...]
  features jsonb default '[]'::jsonb,  -- [{"he":"...","en":"..."}]
  specs jsonb default '[]'::jsonb,     -- [{"label":"קומות","value":"7-8"}]
  video jsonb,                         -- {"type":"youtube","id":"..."}
  map_query text,                      -- שאילתת המפה ל-Google Maps (site: mapQuery)
  environment jsonb,                   -- {"title":{..},"text":{..},"image":"url"}
  plans jsonb default '[]'::jsonb,     -- ["url", ...] (תוכניות שטוחות, גיבוי)
  plan_groups jsonb default '[]'::jsonb,    -- [{"rooms":2,"label":{..},"plans":[{"label":{..},"img":"url"}]}] (site: planGroups)
  gallery_groups jsonb default '[]'::jsonb, -- [{"label":{..},"images":["url"]}] (site: galleryGroups)
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists stats (
  id text primary key,                 -- 'years' | 'projects' | 'units' | 'sqm'
  value numeric not null,
  suffix text default '',
  label jsonb not null,                -- {"he":"...","en":"..."}
  sort_order int default 0
);

create table if not exists site_settings (
  key text primary key,                -- 'logo_main' | 'logo_white' | ...
  value jsonb
);

-- ---------- אבטחה (RLS): קריאה ציבורית, כתיבה למחוברים בלבד ----------
alter table projects      enable row level security;
alter table stats         enable row level security;
alter table site_settings enable row level security;

drop policy if exists "read projects"  on projects;
drop policy if exists "write projects" on projects;
create policy "read projects"  on projects for select using (true);
create policy "write projects" on projects for all to authenticated using (true) with check (true);

drop policy if exists "read stats"  on stats;
drop policy if exists "write stats" on stats;
create policy "read stats"  on stats for select using (true);
create policy "write stats" on stats for all to authenticated using (true) with check (true);

drop policy if exists "read settings"  on site_settings;
drop policy if exists "write settings" on site_settings;
create policy "read settings"  on site_settings for select using (true);
create policy "write settings" on site_settings for all to authenticated using (true) with check (true);

-- ---------- אחסון תמונות (bucket ציבורי 'media') ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read"   on storage.objects;
drop policy if exists "media auth write"     on storage.objects;
drop policy if exists "media auth update"    on storage.objects;
drop policy if exists "media auth delete"    on storage.objects;
create policy "media public read"  on storage.objects for select using (bucket_id = 'media');
create policy "media auth write"   on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media auth update"  on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media auth delete"  on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ---------- נתוני התחלה (seed) ----------
insert into stats (id, value, suffix, label, sort_order) values
  ('years',    25,   '+', '{"he":"שנות ניסיון","en":"Years of experience"}', 1),
  ('projects', 80,   '+', '{"he":"פרויקטים","en":"Projects"}',               2),
  ('units',    3200, '+', '{"he":"יחידות דיור","en":"Housing units"}',       3),
  ('sqm',      450,  'K', '{"he":"מ\"ר שנבנו","en":"Sq.m built"}',            4)
on conflict (id) do nothing;

insert into projects (slug, name, city, status, category, year, units, type, short, description, cover, gallery, features, video, sort_order) values
(
  'park-residence',
  '{"he":"פארק רזידנס","en":"Park Residence"}',
  '{"he":"תל אביב","en":"Tel Aviv"}',
  'marketing','residential',2025,96,
  '{"he":"מגורי יוקרה","en":"Luxury residential"}',
  '{"he":"מגדל מגורים בן 24 קומות עם נוף לפארק, לובי מלונאי ומפרט טכני עשיר.","en":"A 24-storey residential tower overlooking the park, with a hotel-style lobby and rich specification."}',
  '{"he":"פרויקט הדגל של הקבוצה — מגדל מגורים יוקרתי המשלב אדריכלות עכשווית, שטחים ירוקים ותחושת קהילה.","en":"The group flagship — a luxury residential tower combining contemporary architecture, green spaces and a sense of community."}',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1280&q=80',
  '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1280&q=80"]',
  '[{"he":"לובי בסטנדרט מלונאי","en":"Hotel-standard lobby"},{"he":"בריכה וחדר כושר","en":"Pool & gym"},{"he":"חניון תת-קרקעי","en":"Underground parking"}]',
  '{"type":"youtube","id":""}', 1
),
(
  'marina-towers',
  '{"he":"מגדלי המרינה","en":"Marina Towers"}',
  '{"he":"הרצליה","en":"Herzliya"}',
  'construction','commercial',2026,140,
  '{"he":"מגורים ומסחר","en":"Mixed-use"}',
  '{"he":"שני מגדלים עם חזית מסחרית תוססת ומרפסות ים, במיקום מבוקש סמוך למרינה.","en":"Two towers with a vibrant commercial frontage and sea-view balconies, steps from the marina."}',
  '{"he":"מתחם מגורים ומסחר המשלב חיי עיר עם שלווה של קו החוף.","en":"A mixed-use complex blending lively city life with the calm of the coastline."}',
  'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1280&q=80',
  '["https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1280&q=80"]',
  '[{"he":"מרפסות עם נוף לים","en":"Sea-view balconies"},{"he":"רחוב מסחרי","en":"Commercial street"},{"he":"גינה קהילתית","en":"Community garden"}]',
  '{"type":"youtube","id":""}', 2
),
(
  'green-heights',
  '{"he":"גרין הייטס","en":"Green Heights"}',
  '{"he":"רעננה","en":"Raanana"}',
  'completed','residential',2023,64,
  '{"he":"מגורים","en":"Residential"}',
  '{"he":"פרויקט בוטיק ירוק עם דירות גן ופנטהאוזים, שזכה לפרס בנייה ירוקה.","en":"A green boutique project with garden apartments and penthouses, winner of a green-building award."}',
  '{"he":"פרויקט מגורים בסטנדרט בנייה ירוקה, עם מערכות חיסכון באנרגיה, גגות ירוקים ועיצוב נוף עשיר.","en":"A residential project built to green standards, with energy-saving systems, green roofs and rich landscaping."}',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1280&q=80',
  '["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1280&q=80"]',
  '[{"he":"תקן בנייה ירוקה","en":"Green-building certified"},{"he":"דירות גן ופנטהאוז","en":"Garden & penthouse units"},{"he":"מערכות חכמות","en":"Smart-home systems"}]',
  '{"type":"youtube","id":""}', 3
),
(
  'city-center-renewal',
  '{"he":"התחדשות מרכז העיר","en":"City Center Renewal"}',
  '{"he":"בת ים","en":"Bat Yam"}',
  'planning','renewal',2027,210,
  '{"he":"התחדשות עירונית","en":"Urban renewal"}',
  '{"he":"פרויקט פינוי-בינוי רחב היקף המחדש שכונה שלמה עם דיור מודרני ומרחב ציבורי.","en":"A large-scale evacuation-reconstruction project renewing an entire neighborhood with modern housing and public space."}',
  '{"he":"התחדשות עירונית בקנה מידה גדול, המשלבת שדרוג איכות החיים של הדיירים הקיימים עם תוספת יחידות דיור.","en":"Large-scale urban renewal combining an upgraded quality of life for existing residents with added housing."}',
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1280&q=80',
  '["https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1280&q=80","https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1280&q=80"]',
  '[{"he":"פינוי-בינוי","en":"Evacuation-reconstruction"},{"he":"מרחב ציבורי חדש","en":"New public realm"},{"he":"דיור בר-השגה","en":"Affordable housing mix"}]',
  '{"type":"youtube","id":""}', 4
)
on conflict (slug) do nothing;
