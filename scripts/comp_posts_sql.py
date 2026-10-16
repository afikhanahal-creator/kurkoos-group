"""Metricool competitor posts (FBCP rows) -> upsert SQL for engine_docs collection comp_posts.

python3 scripts/comp_posts_sql.py out.sql competitors.json rows1.json [rows2.json ...]

competitors.json: [{"id":..., "name":...}] from
  select id, data->>'name' as name from engine_docs where collection='competitors'
rows*.json: the raw result of Metricool getAnalyticsDataByMetrics with metrics FBCP01..FBCP09 ({"rows":[...]}).
Writes out_0.sql, out_1.sql ... (about 25 KB each). A stored picture copy (thumb) and first_seen are never overwritten.
"""
import datetime, json, re, sys

def norm(s):
    s = re.sub(r'[^\w\s]', ' ', str(s or '')).lower()
    return [w for w in s.split() if len(w) > 1 and w not in ('בע', 'מ', 'בעמ')]

def match(name, comps):
    """competitor ids whose first name word appears among the Metricool page name words"""
    words = set(norm(name))
    ids = [c['id'] for c in comps if norm(c['name']) and norm(c['name'])[0] in words]
    return ids

def main():
    out, comps = sys.argv[1], json.load(open(sys.argv[2], encoding='utf8'))
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3))).isoformat(timespec='seconds')
    seen = {}
    for f in sys.argv[3:]:
        for r in json.load(open(f, encoding='utf8'))['rows']:
            name, pid, img, text, _day, ts, rea, com, sha = (list(r) + [None] * 9)[:9]
            ids = match(name, comps)
            t = ts or ''
            pub = f'{t[0:4]}-{t[4:6]}-{t[6:8]}T{t[8:10]}:{t[10:12]}:{t[12:14]}+03:00' if len(t) == 14 else None
            m = re.search(r'[?&]oe=([0-9A-Fa-f]+)', img or '')
            exp = datetime.datetime.fromtimestamp(int(m.group(1), 16), datetime.timezone.utc).isoformat(timespec='seconds') if m else None
            n = lambda x: int(x) if x not in (None, '') and str(x).lstrip('-').isdigit() else 0
            seen[pid] = dict(id=pid, comp_name=name, comp_ids=ids, comp_id=ids[0] if ids else '', network='fb', text=text or '',
                             image=img or '', img_exp=exp, published=pub, reactions=n(rea), comments=n(com), shares=n(sha),
                             eng=n(rea) + n(com) + n(sha), link='https://www.facebook.com/' + pid, source='metricool',
                             fetched=now, first_seen=now)
    q = lambda s: "'" + s.replace("'", "''") + "'"
    items = list(seen.values())
    for ci, i in enumerate(range(0, max(len(items), 1), 12)):
        ch = items[i:i + 12]
        if not ch:
            break
        vals = [f"('comp_posts',{q(d['id'])},{q(json.dumps(d, ensure_ascii=False, separators=(',', ':')))}::jsonb)" for d in ch]
        sql = ("insert into engine_docs(collection,id,data) values " + ",".join(vals) +
               " on conflict (collection,id) do update set data = engine_docs.data || (excluded.data - 'thumb' - 'first_seen')"
               " || case when engine_docs.data ? 'first_seen' then '{}'::jsonb else jsonb_build_object('first_seen', excluded.data->>'fetched') end,"
               " updated_at=now();")
        open(out.replace('.sql', f'_{ci}.sql'), 'w', encoding='utf8').write(sql)
    unmatched = sorted({d['comp_name'] for d in items if not d['comp_ids']})
    print(len(items), 'posts', 'unmatched:', unmatched)

main()
