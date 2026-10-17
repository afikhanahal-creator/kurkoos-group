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

## Sizes (free Supabase plan, 1 GB)

A creative costs about 0.5 MB (4K card as webp, 1080px preview, the creative). Use `--budget-mb` and `--per-comp` to stay
inside the plan, newest ads first.
