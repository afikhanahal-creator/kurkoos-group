# Kurkoos · Meta Ads Library scan agent

Runs as a scheduled Routine on Sunday, Tuesday and Thursday mornings, Asia/Jerusalem, in a fresh session with the **Meta Ads**, **Supabase** and **metricool** connectors. One run scans the Meta Ad Library for the 8 confirmed competitor pages scanned longest ago (section 1), upserts what it finds into the content engine's database, marks ads that disappeared, and writes a run log. It never bypasses CAPTCHAs, rate limits, logins or any Meta protection: when access is limited it records the limit and stops.

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

## 1. Each run, in order (cheap rotation, since 2 November 2026)

The old procedure tried all 66 confirmed pages every morning and copied every ad by hand into SQL twice. It ran out of
space after 4 to 15 pages every day. Now each run scans **only the 8 pages that were scanned longest ago**, and the
database does the bookkeeping (functions in `supabase/migrations/20261102120000_meta_scan_rotation.sql`). Three runs a
week (Sunday, Tuesday, Thursday) cover all the pages in about three weeks.

1. **Start.** `select meta_scan_start('routine')` returns the scan id.
2. **Pick the pages.** `select * from meta_next_pages(8)`. Scan these and nothing else. Never add or edit page entries.
3. **Scan each page, one call only.** `ads_library_search` with `page_ids: [page_id]`, `countries: ["IL"]`,
   `ad_active_status: "ACTIVE"`, `limit: 50`. No keyword slices (they cost a lot and rarely complete a page); a page
   with more than 50 ads is simply `partial`. On an error, retry once; if it fails again, record it with
   `select meta_ingest('<scan>','<page_id>',null,'[]','<short error>')` and go on.
4. **Store the page right away, compactly.**
   `select meta_ingest('<scan>', '<page_id>', <estimated_total_count>, '[["<ad id>","<link title>",<ad_creation_time>,<ad_delivery_start_time>], ...]')`.
   Only these four values per ad, copied from the tool result once (title trimmed, may be ""; times as the tool gives
   them, unix seconds or ISO). The function upserts `meta_ads`, computes `group_key`, counts new ads, and marks ads
   that stopped (only when the page was read completely), and records the page in `meta_page_state` and in the run doc.
   Never write the ad upsert SQL yourself and never save the ads to a file first.
5. **Finish.** `select meta_scan_finish('<scan>', '["<Hebrew note>", ...]')` refreshes `meta_summary` of every
   competitor touched, writes `comps`, `totals` and `status` and returns them. Notes: new ads worth a look, partial pages.
6. **Once a week only (Sunday run):** section 5 (competitor galleries from Metricool) and section 6 (ad pictures, with
   `--new-days 7`). On Tuesday and Thursday skip both.

If the Meta Ads connector is unavailable: `meta_scan_start`, then `meta_scan_finish` with a Hebrew note (status
becomes `failed`), and stop.

## 2. What the Library returns, and what it does not

`ads_library_search` returns per ad: `id, page_id, page_name, ad_creative_link_title, ad_creation_time, ad_delivery_start_time, ad_snapshot_url, currency`. It does **not** return the body text, the image or video, the destination URL, an end date or the delivery status beyond the active filter. Never invent those. The snapshot URL is the only way to see the creative; the system shows it as a link.

## 3. Grouping key

`group_key` = title → trim → remove `>>`, `>`, `|`, quotes, emojis and punctuation → collapse whitespace → lowercase. An empty title gives `""` and is never grouped. "Similar message" groups (shared words) are computed in the UI, never stored.

## 4. Honesty rules

- Counts in the UI come from the database, never from this agent's memory.
- A page whose results are partial is shown as partial; the UI never says "כל המודעות" for it.
- Days on air are computed from `start` in Asia/Jerusalem; a one day difference from the Meta page is possible.
- No scraping of facebook.com, no CAPTCHA or login workarounds, no second account. If the connector refuses, the run is `failed` and the dashboard says so.

## 5. Competitor galleries (comp_posts), Sunday run only

After the Meta Ads part, refresh the organic posts the competitors publish, for the "הגלריה שלהם" block and the "גלריות המתחרים" view (V181).

1. Metricool connector `getAnalyticsDataByMetrics`, brand `7115159`, from 30 days ago to now (Jerusalem time), metrics `FBCP01,FBCP02,FBCP03,FBCP04,FBCP05,FBCP06,FBCP07,FBCP08,FBCP09`. Save the raw JSON result to a file (it can be large; the tool may save it for you).
2. `select id, data->>'name' as name from engine_docs where collection='competitors'` saved as `[{id,name}]` JSON.
3. `python3 scripts/comp_posts_sql.py out.sql competitors.json result.json` writes `out_0.sql`, `out_1.sql`… Run each file as is with `execute_sql`. Never write the SQL by hand.
4. Report how many posts were refreshed and the names the script printed as `unmatched` (a Metricool page with no competitor in the system).

Facts: one doc per Facebook post id. Fields `{id, comp_name, comp_ids, comp_id, network, text, image, img_exp, published, reactions, comments, shares, eng, link, source:"metricool", fetched, first_seen}`. The picture is Metricool's preview size (about 130 px) and its link expires after a few days (`img_exp`), so it is refreshed every morning. When the owner opens the gallery, the browser keeps a small copy (`thumb`) when Facebook allows it; the upsert never overwrites `thumb` or `first_seen`. Only competitors tracked in Metricool appear; Instagram competitor posts (`IGCP…`) return nothing for this brand today. Never scrape facebook.com.

`comp_shots` (V182) holds the screenshots the team uploads into each competitor folder: `{id, comp_id, comp_name, ad_id, ad_title, note, url, blob, prev, prev_blob, ai, ai_blob, w, h, bytes, type, name, added, source:"upload"}`. The original file sits untouched in storage (`engine-media/blob/`). V183 adds a clearer copy (`enh`, `ew`, `eh`, `eops`: one step enlargement of pictures under 1600px up to 3x, gentle levels, unsharp mask), and the 720px preview and the 1568px copy for Claude are made from it. The scan agent never writes or deletes there.

## 6. Ad pictures from the Library (comp_shots, source "meta"), Sunday run only: keep every ad with us

Every ad that enters `meta_ads` must also be kept in our storage, because Meta removes a commercial ad from the public
Library in Israel as soon as it stops running; after that the picture exists only with us. So this step runs once a week, for the ads first seen in the last 7 days.

The Library connector returns no pictures (section 2). The pictures come from the public ad pages, captured with
`scripts/meta_capture/` (README there): the creative Meta serves (600px picture, or one frame of the video) and a
screenshot of the ad card at 2400px wide (webp q80), one `comp_shots` row per unique creative (`id: meta_<newest ad id>`,
`ad_ids` lists the copies, `source: "meta"`, `url` the card, `creative` the picture itself, `note` the ad text, `cta`,
`landing`, `start`, `media`, `copies`). Files live under `blob/meta/` in `engine-media`. No 1080px preview any more.

Each Sunday run: ads whose `first_seen` is within the last 7 days, newest first. Steps:
1. Run `scripts/meta_capture/policies_on.sql` with the Supabase connector (`execute_sql`): temporary anon write policies, limited to `blob/meta/` and `comp_shots` ids `meta_`.
2. `node scripts/meta_capture/crawl.cjs --new-days 7 --max-mb 20` then `node scripts/meta_capture/up.cjs --budget-mb <MB left below 970>`. The crawl reads only the ads first seen in the last 7 days and only the fields it needs (a few KB, not the whole table), and stops itself past 20 MB read. Exit code 3 from either script means Supabase answered 402: the monthly transfer quota is used up. Then stop this step and say so in the report; nothing is lost, the ads wait for the next run.
3. Run `scripts/meta_capture/policies_off.sql`. Never leave the write policies on.
4. Report captured creatives and the storage used. A login wall or CAPTCHA from Meta means stop and say so; never work around it.

Transfer (egress): the free plan allows 5 GB a month of data and files read out of Supabase, and going over it restricts the whole project, the content engine included. Uploads do not count. So this step never downloads pictures or whole tables, and the report says how much the crawl read ("read N recent ads (X KB from Supabase)" in `crawl.log`).

Storage: the project is on the free Supabase plan (1 GB). A new creative costs about 0.17 MB (card 0.13 + picture 0.04).
Check the bucket size first (`select sum((metadata->>'size')::bigint) from storage.objects`). Upload while it stays under
970 MB; past 950 MB say so in the report so the owner can decide on more space. Never delete stored ads to make room.
