# Kurkoos · Meta Ads Library scan agent

Runs as a scheduled Routine every morning at 06:00 Asia/Jerusalem, in a fresh session with the **Meta Ads** and **Supabase** connectors. One run scans the Meta Ad Library for every competitor page the owner confirmed, upserts what it finds into the content engine's database, marks ads that disappeared, and writes a run log. It never bypasses CAPTCHAs, rate limits, logins or any Meta protection: when access is limited it records the limit and stops.

## 0. Where everything lives

Supabase project `filnzlnvujnlazwcxbuq`, table `public.engine_docs` (`collection text, id text, data jsonb, updated_at timestamptz`, conflict key `(collection, id)`). Read and write with the Supabase connector (`execute_sql`). Never delete rows. Never touch collections other than the four below plus `competitors`.

| collection | one doc per | id |
|---|---|---|
| `competitors` | company in the מתחרים tab | `C001`…, `mc-…`, user ids |
| `meta_ads` | ad in the Meta Ad Library | the Meta ad id (string) |
| `meta_scans` | scan run | `scan_<YYYYMMDDTHHMM>` (Jerusalem time) |
| `meta_favorites` | ad the team starred inside the system (owner writes, agent only reads) | the Meta ad id |

### `competitors.data` fields the agent uses

```
meta_pages: [{page_id, page_name, confirmed: true|false, uncertain: true|false, source: "auto"|"owner"}]
meta_summary: {active, stars, new7, gone, groups, est_total, partial, last_scan, last_scan_status}
```

Only pages with `confirmed: true` are scanned. Never add or change a page entry; that is the owner's decision in the system.

### `meta_ads.data`

```
{id, page_id, page_name, comp_id, comp_name,
 title            (ad_creative_link_title, trimmed, may be ""),
 created, start   (unix seconds from Meta: ad_creation_time, ad_delivery_start_time),
 snapshot_url, currency,
 status           "active" | "inactive",
 first_seen, last_seen   (ISO, Jerusalem),
 last_scan        (scan id),
 seen             (number of scans that returned it),
 gone_at          (ISO or null: first scan that did not return it while it was active),
 group_key        (normalized title, see 3),
 history          [{scan, status, title}]  (append only when status or title changes, keep the last 20)}
```

Days on air are **computed**, never stored: `floor((now_jerusalem - start) / 86400)`. ⭐ is `status === "active" && days >= 60`. That is our own rule of thumb, not a Meta figure.

### `meta_scans.data`

```
{id, started, finished, trigger: "routine"|"manual", status: "ok"|"partial"|"failed",
 comps: [{comp_id, comp_name,
          pages: [{page_id, found, est_total, partial, slices, error}],
          active, new, gone, stars}],
 totals: {comps, pages, ads_seen, new, gone, stars, partial_pages, errors},
 notes: ["…"]}
```

## 1. Each run, in order

1. **Start the run doc.** Insert `meta_scans` doc with `started`, `trigger`, `status: "running"`.
2. **Load competitors.** `select id, data->>'name', data->'meta_pages' from engine_docs where collection='competitors' and data ? 'meta_pages'`. Keep only pages with `confirmed = true`.
3. **Scan each page.** Call the Meta Ads connector `ads_library_search` with `page_ids: [page_id]`, `countries: ["IL"]`, `ad_active_status: "ACTIVE"`, `limit: 50`. Record `estimated_total_count`.
   - If `estimated_total_count > 50`, the result is **partial** (Meta returns the newest first, so the oldest ads, the ones most likely to be ⭐, are the ones cut off). Run up to 6 extra slices with the same `page_ids` and `search_terms` from this list, in order, stopping when the union reaches the estimate: `דירות`, `פרויקט`, `לפרטים`, `בוטיק`, `מבצע`, `פנטהאוז`. Merge by ad id. Mark the page `partial: true` if the union is still smaller than the estimate.
   - A connector error, empty permission, or rate limit: record `error` on the page, do not retry more than twice (wait a minute between retries), continue with the next page.
4. **Upsert ads.** For every ad returned: `insert into engine_docs (collection,id,data) values ('meta_ads', <ad id>, <data>) on conflict (collection,id) do update set data = engine_docs.data || excluded.data, updated_at = now()`, where the inserted data has `status: "active"`, `last_seen`, `last_scan`, `seen: coalesce(old.seen,0)+1`, `first_seen` only if the row is new (use a CASE on `engine_docs.data ? 'first_seen'`). Append to `history` only when `status` or `title` changed.
5. **Mark the gone ones.** For every ad of a scanned page with `status = "active"` whose `last_scan` is older than the previous **two** runs (that is, missing twice in a row): set `status: "inactive"`, `gone_at`, append history. Pages that errored this run are skipped here: a failed page never marks its ads gone.
6. **Per competitor summary.** Write `meta_summary` on the competitor doc: `active`, `stars` (active and ≥60 days), `new7` (first_seen within 7 days), `gone` (inactive), `groups` (distinct non-empty `group_key` among active ads), `est_total` (sum of page estimates), `partial` (any page partial), `last_scan`, `last_scan_status`.
7. **Finish the run doc.** `finished`, `status` (`ok` when no page errored and none partial; `partial` when some pages are partial or errored; `failed` when the connector could not be used at all), `totals`, `notes` (one Hebrew sentence per noteworthy thing: new ads, ads that crossed 60 days today, pages blocked).

## 2. What the Library returns, and what it does not

`ads_library_search` returns per ad: `id, page_id, page_name, ad_creative_link_title, ad_creation_time, ad_delivery_start_time, ad_snapshot_url, currency`. It does **not** return the body text, the image or video, the destination URL, an end date or the delivery status beyond the active filter. Never invent those. The snapshot URL is the only way to see the creative; the system shows it as a link.

## 3. Grouping key

`group_key` = title → trim → remove `>>`, `>`, `|`, quotes, emojis and punctuation → collapse whitespace → lowercase. An empty title gives `""` and is never grouped. "Similar message" groups (shared words) are computed in the UI, never stored.

## 4. Honesty rules

- Counts in the UI come from the database, never from this agent's memory.
- A page whose results are partial is shown as partial; the UI never says "כל המודעות" for it.
- Days on air are computed from `start` in Asia/Jerusalem; a one day difference from the Meta page is possible.
- No scraping of facebook.com, no CAPTCHA or login workarounds, no second account. If the connector refuses, the run is `failed` and the dashboard says so.

## 5. Competitor galleries (comp_posts), same run

After the Meta Ads part, refresh the organic posts the competitors publish, for the "הגלריה שלהם" block and the "גלריות המתחרים" view (V181).

1. Metricool connector `getAnalyticsDataByMetrics`, brand `7115159`, from 30 days ago to now (Jerusalem time), metrics `FBCP01,FBCP02,FBCP03,FBCP04,FBCP05,FBCP06,FBCP07,FBCP08,FBCP09`. Save the raw JSON result to a file (it can be large; the tool may save it for you).
2. `select id, data->>'name' as name from engine_docs where collection='competitors'` saved as `[{id,name}]` JSON.
3. `python3 scripts/comp_posts_sql.py out.sql competitors.json result.json` writes `out_0.sql`, `out_1.sql`… Run each file as is with `execute_sql`. Never write the SQL by hand.
4. Report how many posts were refreshed and the names the script printed as `unmatched` (a Metricool page with no competitor in the system).

Facts: one doc per Facebook post id. Fields `{id, comp_name, comp_ids, comp_id, network, text, image, img_exp, published, reactions, comments, shares, eng, link, source:"metricool", fetched, first_seen}`. The picture is Metricool's preview size (about 130 px) and its link expires after a few days (`img_exp`), so it is refreshed every morning. When the owner opens the gallery, the browser keeps a small copy (`thumb`) when Facebook allows it; the upsert never overwrites `thumb` or `first_seen`. Only competitors tracked in Metricool appear; Instagram competitor posts (`IGCP…`) return nothing for this brand today. Never scrape facebook.com.

`comp_shots` (V182) holds the screenshots the team uploads into each competitor folder: `{id, comp_id, comp_name, ad_id, ad_title, note, url, blob, prev, prev_blob, ai, ai_blob, w, h, bytes, type, name, added, source:"upload"}`. The original file sits untouched in storage (`engine-media/blob/`). V183 adds a clearer copy (`enh`, `ew`, `eh`, `eops`: one step enlargement of pictures under 1600px up to 3x, gentle levels, unsharp mask), and the 720px preview and the 1568px copy for Claude are made from it. The scan agent never writes or deletes there.

## 6. Ad pictures from the Library (comp_shots, source "meta"), same run: keep every ad with us

Every ad that enters `meta_ads` must also be kept in our storage, because Meta removes a commercial ad from the public
Library in Israel as soon as it stops running; after that the picture exists only with us. So this step runs every day.

The Library connector returns no pictures (section 2). The pictures come from the public ad pages, captured with
`scripts/meta_capture/` (README there): the creative Meta serves (600px picture, or one frame of the video) and a
screenshot of the ad card at 2400px wide (webp q80), one `comp_shots` row per unique creative (`id: meta_<newest ad id>`,
`ad_ids` lists the copies, `source: "meta"`, `url` the card, `creative` the picture itself, `note` the ad text, `cta`,
`landing`, `start`, `media`, `copies`). Files live under `blob/meta/` in `engine-media`. No 1080px preview any more.

Each run: ads whose `first_seen` is within the last 2 days (new ads, a day of slack), newest first. Steps:
1. Run `scripts/meta_capture/policies_on.sql` with the Supabase connector (`execute_sql`): temporary anon write policies, limited to `blob/meta/` and `comp_shots` ids `meta_`.
2. `node scripts/meta_capture/crawl.cjs --new-days 2 --max-mb 20` then `node scripts/meta_capture/up.cjs --budget-mb <MB left below 970>`. The crawl reads only the ads first seen in the last 2 days and only the fields it needs (a few KB, not the whole table), and stops itself past 20 MB read. Exit code 3 from either script means Supabase answered 402: the monthly transfer quota is used up. Then stop this step and say so in the report; nothing is lost, the ads wait for the next run.
3. Run `scripts/meta_capture/policies_off.sql`. Never leave the write policies on.
4. Report captured creatives and the storage used. A login wall or CAPTCHA from Meta means stop and say so; never work around it.

Transfer (egress): the free plan allows 5 GB a month of data and files read out of Supabase, and going over it restricts the whole project, the content engine included. Uploads do not count. So this step never downloads pictures or whole tables, and the report says how much the crawl read ("read N recent ads (X KB from Supabase)" in `crawl.log`).

Storage: the project is on the free Supabase plan (1 GB). A new creative costs about 0.17 MB (card 0.13 + picture 0.04).
Check the bucket size first (`select sum((metadata->>'size')::bigint) from storage.objects`). Upload while it stays under
970 MB; past 950 MB say so in the report so the owner can decide on more space. Never delete stored ads to make room.
