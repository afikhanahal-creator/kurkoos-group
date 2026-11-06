# Kurkoos Group website

## Supabase free plan — storage budget (the project was restricted on 2026-11-06)

The free plan's 1 GB of files and 5 GB of traffic are per Supabase **organization**. This project and the Afik Hanahal one
shared an org, passed 1.1 GB together (this one 930 MB, mostly Meta ad captures in `engine-media/blob/meta/`) and every request
of both sites answered 402. Keep this project in an organization of its own. Rules: ad captures are 1600px webp q75 and an ad
that stopped running keeps only its creative (`scripts/meta_capture/prune.cjs`); `up.cjs` stops at 75% of the quota
(`public.storage_usage()`, `server/storage-usage.sql` — sizes only, readable with the publishable key); videos are re-encoded
in place by `scripts/storage/recompress-videos.cjs`; every upload carries `cache-control: max-age=31536000`. The Afik site's
daily cron reads `storage_usage()` and texts the office once a day while this project passes 70%.

## Every page lives in the page editor

The owner edits the site pages in the admin tab "עמודים", the visual page editor. **Every new page must be added to the editor in the same change that adds the page.** No exceptions without the owner's approval.

When you add a route to `src/App.jsx`:
1. Build the page from sections, following `docs/agents/page-editor-conversion.md`.
2. Add a definition at `src/lib/pageBuilder/defs/<page>.js` whose `route` matches the route in `App.jsx`, then import it in `defs/index.js`.
3. Only if the page truly cannot be edited (an article, a legal page, a tool), add it to `EXCLUDED` in `defs/index.js` with a reason.

`scripts/check-pages.mjs` runs as part of `npm run build`, and it fails when a route is neither covered nor excluded.
