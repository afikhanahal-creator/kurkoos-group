-- Competitor ad scan (Meta Ad Library): cheap rotation.
-- The scan agent used to copy every ad by hand into long SQL and tried all 66 pages a day,
-- which ran out of space after a few pages. These functions do the bookkeeping inside the
-- database, so the agent passes only a compact list per page and scans a few pages per run.
-- Called only through the Supabase connector (execute_sql); not exposed to the site's keys.

create or replace function public.meta_now_iso() returns text
language sql stable set timezone to 'Asia/Jerusalem' as $$
  select to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM')
$$;

create or replace function public.meta_group_key(t text) returns text
language sql immutable as $$
  select lower(btrim(regexp_replace(regexp_replace(coalesce(t, ''), '[^[:alnum:][:space:]]', '', 'g'), '\s+', ' ', 'g')))
$$;

-- Next pages to scan: confirmed pages, the ones scanned longest ago first (never scanned first).
create or replace function public.meta_next_pages(n int default 8)
returns table(page_id text, page_name text, comp_id text, comp_name text, last_scanned text)
language sql stable as $$
  with pages as (
    select e->>'page_id' as page_id, e->>'page_name' as page_name, c.id as comp_id, c.data->>'name' as comp_name
    from engine_docs c, jsonb_array_elements(c.data->'meta_pages') e
    where c.collection = 'competitors' and coalesce((e->>'confirmed')::boolean, false)
  ), last as (
    select p.*, coalesce(
      (select s.data->>'at' from engine_docs s where s.collection = 'meta_page_state' and s.id = p.page_id),
      (select max(a.data->>'last_seen') from engine_docs a where a.collection = 'meta_ads' and a.data->>'page_id' = p.page_id)
    ) as last_scanned
    from pages p
  )
  select page_id, page_name, comp_id, comp_name, last_scanned
  from last order by last_scanned asc nulls first, comp_id limit n
$$;

-- Open a run doc and return its id.
create or replace function public.meta_scan_start(p_trigger text default 'routine') returns text
language plpgsql set timezone to 'Asia/Jerusalem' as $$
declare sid text := 'scan_' || to_char(now(), 'YYYYMMDD"T"HH24MI');
begin
  insert into engine_docs(collection, id, data)
  values ('meta_scans', sid, jsonb_build_object('id', sid, 'started', meta_now_iso(), 'trigger', p_trigger,
          'status', 'running', 'mode', 'rotation', 'pages', '[]'::jsonb))
  on conflict (collection, id) do update set data = excluded.data, updated_at = now();
  return sid;
end $$;

-- Store one page's results. p_ads is a compact array: [[ad_id, title, ad_creation_time, ad_delivery_start_time], ...]
-- (times as unix seconds or ISO text, exactly as the Ad Library returns them). p_error marks a page that failed.
create or replace function public.meta_ingest(p_scan text, p_page text, p_est int, p_ads jsonb, p_error text default null)
returns jsonb language plpgsql as $$
declare
  v_comp text; v_comp_name text; v_page_name text; v_now text := meta_now_iso();
  v_found int := coalesce(jsonb_array_length(p_ads), 0);
  v_partial boolean; v_new int := 0; v_gone int := 0; r jsonb;
begin
  select c.id, c.data->>'name', e->>'page_name' into v_comp, v_comp_name, v_page_name
  from engine_docs c, jsonb_array_elements(c.data->'meta_pages') e
  where c.collection = 'competitors' and e->>'page_id' = p_page limit 1;
  if v_comp is null then raise exception 'page % is not on any competitor', p_page; end if;
  v_partial := p_error is null and v_found < coalesce(p_est, v_found);

  if p_error is null and v_found > 0 then
    with src as (
      select a->>0 as id, nullif(btrim(a->>1), '') as title, a->2 as created, a->3 as start
      from jsonb_array_elements(p_ads) a
    ), up as (
      insert into engine_docs(collection, id, data)
      select 'meta_ads', s.id, jsonb_build_object(
        'id', s.id, 'page_id', p_page, 'page_name', v_page_name, 'comp_id', v_comp, 'comp_name', v_comp_name,
        'title', s.title, 'group_key', meta_group_key(s.title),
        'created', case when jsonb_typeof(s.created) = 'number' then s.created
                        else to_jsonb(extract(epoch from (s.created #>> '{}')::timestamptz)::bigint) end,
        'start', case when jsonb_typeof(s.start) = 'number' then s.start
                      else to_jsonb(extract(epoch from (s.start #>> '{}')::timestamptz)::bigint) end,
        'snapshot_url', 'https://www.facebook.com/ads/library/?id=' || s.id, 'currency', 'ILS',
        'status', 'active', 'gone_at', null, 'last_seen', v_now, 'last_scan', p_scan, 'first_seen', v_now, 'seen', 1,
        'history', jsonb_build_array(jsonb_build_object('scan', p_scan, 'status', 'active', 'title', s.title)))
      from src s
      on conflict (collection, id) do update set
        data = engine_docs.data
          || jsonb_build_object('status', 'active', 'gone_at', null, 'last_seen', v_now, 'last_scan', p_scan,
                                'seen', coalesce((engine_docs.data->>'seen')::int, 0) + 1,
                                'title', coalesce(excluded.data->>'title', engine_docs.data->>'title'),
                                'group_key', case when excluded.data->>'title' is null then engine_docs.data->>'group_key'
                                                  else excluded.data->>'group_key' end)
          || case when engine_docs.data ? 'first_seen' then '{}'::jsonb else jsonb_build_object('first_seen', v_now) end
          || case when engine_docs.data->>'status' is distinct from 'active'
                    or (excluded.data->>'title' is not null and engine_docs.data->>'title' is distinct from excluded.data->>'title')
                  then jsonb_build_object('history', (
                    select coalesce(jsonb_agg(h order by i), '[]'::jsonb) from (
                      select h, i from jsonb_array_elements(coalesce(engine_docs.data->'history', '[]'::jsonb)
                        || jsonb_build_array(jsonb_build_object('scan', p_scan, 'status', 'active',
                             'title', coalesce(excluded.data->>'title', engine_docs.data->>'title')))) with ordinality x(h, i)
                      order by i desc limit 20) t))
                  else '{}'::jsonb end,
        updated_at = now()
      returning (xmax = 0) as inserted
    )
    select count(*) filter (where inserted) into v_new from up;
  end if;

  -- Ads that stopped: only when the page was read completely.
  if p_error is null and not v_partial then
    with g as (
      update engine_docs a set data = a.data || jsonb_build_object('status', 'inactive', 'gone_at', v_now,
          'history', coalesce(a.data->'history', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('scan', p_scan, 'status', 'inactive', 'title', a.data->>'title'))),
        updated_at = now()
      where a.collection = 'meta_ads' and a.data->>'page_id' = p_page and a.data->>'status' = 'active'
        and not exists (select 1 from jsonb_array_elements(p_ads) x where x->>0 = a.id)
      returning 1)
    select count(*) into v_gone from g;
  end if;

  r := jsonb_build_object('page_id', p_page, 'comp_id', v_comp, 'comp_name', v_comp_name, 'found', v_found,
         'est_total', coalesce(p_est, v_found), 'partial', v_partial, 'new', v_new, 'gone', v_gone, 'error', p_error);

  if p_error is null then
    insert into engine_docs(collection, id, data) values ('meta_page_state', p_page,
      jsonb_build_object('page_id', p_page, 'comp_id', v_comp, 'at', v_now, 'scan', p_scan,
                         'found', v_found, 'est_total', coalesce(p_est, v_found), 'partial', v_partial))
    on conflict (collection, id) do update set data = excluded.data, updated_at = now();
  end if;

  update engine_docs set data = data || jsonb_build_object('pages', coalesce(data->'pages', '[]'::jsonb) || jsonb_build_array(r)),
    updated_at = now()
  where collection = 'meta_scans' and id = p_scan;
  return r;
end $$;

-- Close the run: refresh meta_summary of every competitor touched and write totals.
create or replace function public.meta_scan_finish(p_scan text, p_notes jsonb default '[]'::jsonb)
returns jsonb language plpgsql as $$
declare v_pages jsonb; v_comps jsonb; v_totals jsonb; v_status text; v_now text := meta_now_iso();
begin
  select coalesce(data->'pages', '[]'::jsonb) into v_pages from engine_docs where collection = 'meta_scans' and id = p_scan;
  if v_pages is null then raise exception 'scan % not found', p_scan; end if;

  with comps as (select distinct p->>'comp_id' as comp_id from jsonb_array_elements(v_pages) p),
  ads as (
    select a.data->>'comp_id' as comp_id, a.data
    from engine_docs a where a.collection = 'meta_ads' and a.data->>'comp_id' in (select comp_id from comps)
  ), summ as (
    select c.comp_id, jsonb_build_object(
      'active', count(*) filter (where data->>'status' = 'active'),
      'stars', count(*) filter (where data->>'status' = 'active' and data->>'start' is not null
                 and floor((extract(epoch from now()) - (data->>'start')::numeric) / 86400) >= 60),
      'new7', count(*) filter (where (data->>'first_seen')::timestamptz > now() - interval '7 days'),
      'gone', count(*) filter (where data->>'status' = 'inactive'),
      'groups', count(distinct nullif(data->>'group_key', '')) filter (where data->>'status' = 'active'),
      'est_total', (select coalesce(sum((s.data->>'est_total')::int), 0) from engine_docs s
                    where s.collection = 'meta_page_state' and s.data->>'comp_id' = c.comp_id),
      'partial', (select coalesce(bool_or((s.data->>'partial')::boolean), false) from engine_docs s
                  where s.collection = 'meta_page_state' and s.data->>'comp_id' = c.comp_id),
      'last_scan', p_scan,
      'last_scan_status', case when exists (select 1 from jsonb_array_elements(v_pages) p
                                where p->>'comp_id' = c.comp_id and ((p->>'partial')::boolean or p->>'error' is not null))
                               then 'partial' else 'ok' end) as s
    from comps c left join ads a on a.comp_id = c.comp_id group by c.comp_id
  ), upd as (
    update engine_docs d set data = d.data || jsonb_build_object('meta_summary', s.s), updated_at = now()
    from summ s where d.collection = 'competitors' and d.id = s.comp_id returning d.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'comp_id', s.comp_id,
      'comp_name', (select p->>'comp_name' from jsonb_array_elements(v_pages) p where p->>'comp_id' = s.comp_id limit 1),
      'pages', (select jsonb_agg(p - 'comp_id' - 'comp_name') from jsonb_array_elements(v_pages) p where p->>'comp_id' = s.comp_id),
      'active', (s.s->>'active')::int, 'stars', (s.s->>'stars')::int,
      'new', (select coalesce(sum((p->>'new')::int), 0) from jsonb_array_elements(v_pages) p where p->>'comp_id' = s.comp_id),
      'gone', (select coalesce(sum((p->>'gone')::int), 0) from jsonb_array_elements(v_pages) p where p->>'comp_id' = s.comp_id))), '[]'::jsonb)
  into v_comps from summ s;

  v_totals := jsonb_build_object(
    'comps', jsonb_array_length(v_comps),
    'pages', jsonb_array_length(v_pages),
    'ads_seen', (select coalesce(sum((p->>'found')::int), 0) from jsonb_array_elements(v_pages) p),
    'new', (select coalesce(sum((p->>'new')::int), 0) from jsonb_array_elements(v_pages) p),
    'gone', (select coalesce(sum((p->>'gone')::int), 0) from jsonb_array_elements(v_pages) p),
    'stars', (select coalesce(sum((c->>'stars')::int), 0) from jsonb_array_elements(v_comps) c),
    'partial_pages', (select count(*) from jsonb_array_elements(v_pages) p where (p->>'partial')::boolean),
    'errors', (select count(*) from jsonb_array_elements(v_pages) p where p->>'error' is not null));
  v_status := case when jsonb_array_length(v_pages) = 0 then 'failed'
                   when (v_totals->>'errors')::int > 0 or (v_totals->>'partial_pages')::int > 0 then 'partial'
                   else 'ok' end;

  update engine_docs set data = data || jsonb_build_object('finished', v_now, 'status', v_status,
      'comps', v_comps, 'totals', v_totals, 'notes', coalesce(p_notes, '[]'::jsonb)), updated_at = now()
  where collection = 'meta_scans' and id = p_scan;
  return jsonb_build_object('status', v_status, 'totals', v_totals);
end $$;

revoke all on function public.meta_now_iso(), public.meta_group_key(text), public.meta_next_pages(int),
  public.meta_scan_start(text), public.meta_ingest(text, text, int, jsonb, text), public.meta_scan_finish(text, jsonb)
  from public, anon, authenticated;
