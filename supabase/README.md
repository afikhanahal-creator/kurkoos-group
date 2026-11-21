# Database files

There is no migration runner. Every file here is written to be run again safely in the Supabase SQL editor, and the
owner runs it. The order matters only on a new project, or when a site table is added.

| Order | File | What it holds |
|---|---|---|
| 1 | `migration.sql` | The site: projects, properties, counters, logos, leads, newsletter, site settings, the `media` bucket. Includes the hardened policies for leads, newsletter and settings. |
| 2 | `site_pages_engine.sql` | The page editor (`pages`, `page_drafts`, `page_versions`), the content engine (`engine_docs`, the `engine-media` bucket) and the old `stats` table. |
| 3 | `dm_inbox.sql` | Instagram / Facebook messages and automations (`dm_*`). Service role only. |
| 4 | `social_publishing.sql` | Direct publishing queue (`social_*`) and its cron job. |
| 5 | `migrations/20261102120000_meta_scan_rotation.sql` | Functions for the Meta ads scan agent, over `engine_docs`. |
| 6 | `security_hardening.sql` | One-time removal of two old, open policies. Safe to run again. |
| 7 | `site_staff.sql` | Who may change the site. Adds RESTRICTIVE policies to every non-finance table. **Run again after adding a site table.** |
| 8 | `finance.sql` | The whole finance system (`fin_*`). Adds RESTRICTIVE policies that keep finance-only members out of the site tables. **Run again after adding a site table.** |

## Rules

- A policy that must stay strict is defined in one file only. Permissive policies are OR-ed: a second, looser policy
  on the same table cancels the strict one. Before adding a policy, look at what the table already has
  (`select policyname, cmd, qual, with_check from pg_policies where tablename = '…'`).
- A table the code uses must have its `create table` in this folder. `site_pages_engine.sql` and the end of
  `dm_inbox.sql` were written from the live schema on 2026-11-21 for tables that had been created by hand.
- New finance work goes at the end of `finance.sql` as a new section.
- Temporary anonymous policies for bulk scripts live next to the scripts (`scripts/storage`, `scripts/meta_capture`)
  as on / off pairs, and the "off" file is run right after the script.

## Known leftovers in the live database (harmless, not in these files)

- `leads`: `leads select auth`, `leads update auth`, `leads delete auth` repeat what `leads admin all` already allows.
- `site_settings`: `write settings` repeats `settings admin write`.
- `storage.objects`: `media auth insert` repeats `media auth write`.
