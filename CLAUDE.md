# Kurkoos Group website

## Supabase free plan — storage budget (the project was restricted on 2026-11-06)

The free plan's 1 GB of files and 5 GB of traffic are per Supabase **organization**. This project and the Afik Hanahal one
shared an org, passed 1.1 GB together (this one 930 MB, mostly Meta ad captures in `engine-media/blob/meta/`) and every request
of both sites answered 402. Keep this project in an organization of its own. Rules: ad captures are 1600px webp q75 and an ad
that stopped running keeps only its creative (`scripts/meta_capture/prune.cjs`); `up.cjs` stops at 75% of the quota
(`public.storage_usage()`, `scripts/storage/storage-usage.sql` — sizes only, readable with the publishable key); videos are re-encoded
in place by `scripts/storage/recompress-videos.cjs`; every upload carries `cache-control: max-age=31536000`. The Afik site's
daily cron reads `storage_usage()` and texts the office once a day while this project passes 70%.

**The owner stays on the free plan (2026-11-15), even while the organization is still on Pro.** `storage_usage()` reports a
1 GB quota and must never be raised without the owner's decision. Work frugally: target under 750 MB, check
`storage_usage()` before any bulk upload, and stop at 75%. Ad captures are now 1200px webp q70, and a running ad keeps no
old preview (`prune.cjs --previews`). Engine photos and studio designs are re-encoded in place by
`scripts/storage/recompress-images.cjs`. Every temporary anon policy (`policies_*_on.sql`) is dropped right after the run.

## Every page lives in the page editor

The owner edits the site pages in the admin tab "עמודים", the visual page editor. **Every new page must be added to the editor in the same change that adds the page.** No exceptions without the owner's approval.

When you add a route to `src/App.jsx`:
1. Build the page from sections, following `docs/agents/page-editor-conversion.md`.
2. Add a definition at `src/lib/pageBuilder/defs/<page>.js` whose `route` matches the route in `App.jsx`, then import it in `defs/index.js`.
3. Only if the page truly cannot be edited (an article, a legal page, a tool), add it to `EXCLUDED` in `defs/index.js` with a reason.

`scripts/check-pages.mjs` runs as part of `npm run build`, and it fails when a route is neither covered nor excluded.

## Finance system (/admin/finance)

KURKOOS FINANCE AI, the internal invoice system: `docs/finance/README.md`. Rules: approval, export and the audit trail are enforced in
`supabase/finance.sql` (RLS + triggers), never only in the screens. Finance members who are not admins must not reach the website admin:
re-run `supabase/finance.sql` after adding a site table (it adds RESTRICTIVE policies to every public table), and keep the
`FINANCE_ONLY_OK` check in `api/[fn].js`. Run `scripts/finance-e2e` (docs/finance/TESTING.md) after changing the finance system.
A change to the finance screens goes through `docs/finance/DESIGN-REVIEW-PROCESS.md`: its size sets the gates, and gate 4
(`node scripts/finance-e2e/review.mjs` after `run.mjs`) must exit 0 before you ask the owner to merge.
Tax rules (VAT rate, allocation threshold, ceilings) live only in `src/pages/finance/taxRules.js`, as dated versions with a source: a change in the law is a new
version, never an edit of an old one, and never from a news article (`docs/finance/TAX-RULES.md`). Run `node scripts/finance-tax-tests.mjs` after touching them.

## Who may change the site (site_staff)

Sign-up is open, so a signed-in account is not an admin by itself. Only accounts in `public.site_staff` (or finance admins) can
change site tables, read leads, DMs and drafts, or upload and delete images. `supabase/site_staff.sql` adds RESTRICTIVE policies
to every non-finance public table and to storage writes: re-run it after adding a site table. A new team member who edits the
site needs one line: `insert into public.site_staff (user_id, email) select id, email from auth.users where email = '<email>';`
