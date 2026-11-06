# Meta Ads Library capture

Keeps a copy of every competitor ad we track (collection `meta_ads`) inside the content engine: the creative itself
(the picture Meta serves, 600px, or one frame of the video) and a 4K screenshot of the public ad card, with the ad text,
start date, CTA and landing page. Rows land in collection `comp_shots` (ids `meta_<ad id>`, `source: "meta"`), files in
the `engine-media` bucket under `blob/meta/`. The engine shows them in the competitor folders and in the header gallery.

What it does not do: log in, solve CAPTCHAs, or touch anything beyond the public ad page. If Meta answers with a login
wall the run stops and says so. Keep the daily volume small (new ads only).

## Needs

- Chromium from Playwright (`/opt/pw-browsers/chromium`) and `playwright-core` on `NODE_PATH`, `ffmpeg` (`/usr/bin/ffmpeg`), Python with Pillow.
- Network access to `www.facebook.com`, `*.facebook.com`, `*.fbcdn.net` and `*.supabase.co` (environment allowlist).
- The engine's publishable key (read from `public/engine/bridge.js`) can read `meta_ads` (policy "meta ads public read").
- Writing needs the temporary policies in `policies_on.sql` (storage insert/update under `blob/meta/`, `comp_shots` rows
  whose id starts with `meta_`). Run it before `up.cjs` and `policies_off.sql` after, with the Supabase connector.

## Run

```
export NODE_PATH=<dir that holds node_modules/playwright-core>
node scripts/meta_capture/crawl.cjs --status active --workers 3 --chunk 20      # all active ads, resumable
node scripts/meta_capture/crawl.cjs --only C001,C002                             # a few competitors
node scripts/meta_capture/up.cjs --dry                                           # what would be uploaded
node scripts/meta_capture/up.cjs --budget-mb 500                                 # upload within a storage budget
```

`crawl.cjs` writes one JSON per ad into `out/` (skipped on the next run when the shot exists). `up.cjs` groups ads by
creative (same page, picture and text), uploads one row per creative with the newest ad id (`ad_ids` lists the copies),
and remembers uploaded ids in `up.done`.

## Sizes (free Supabase plan, 1 GB — the project was restricted on 2026-11-06)

The free plan's 1 GB of files is counted per Supabase **organization**: on 2026-11-06 this project (930 MB, 486 MB of it Meta
captures) and the Afik Hanahal one shared an org, passed 1.1 GB together and every request of both sites answered 402.
Keep this project in an organization of its own, and keep the captures small:

- A card is 1600px wide, webp q75 (about 60 KB; it was 2400px / q80, 130 KB). `shrink.cjs` re-saves older ones in place.
- `prune.cjs` — ads that stopped running keep only the creative (~40 KB); the card screenshot and the old preview are deleted.
  Run it before every capture round: `node prune.cjs --dry`, then `node prune.cjs`.
- `up.cjs` reads the whole project's files (`public.storage_usage()`, `scripts/storage/storage-usage.sql`) and stops before it passes
  `--cap-pct` (75%) of 1 GB. `--budget-mb` still caps one run.
- The Afik site's daily cron reads the same function and texts the office once a day while this project passes 70%.
- Videos: `scripts/storage/recompress-videos.cjs` re-encodes them in place (H.264, short side ≤ 1080 px, kept only when 25% smaller).
