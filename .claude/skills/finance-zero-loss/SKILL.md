---
name: finance-zero-loss
description: Keeps KURKOOS FINANCE from losing a document between the mailbox, the system and Google Drive, and keeps the Drive archive ordered and in sync. Use before changing the mail scan, the document pipeline, the Drive archive or the reconciliation agent; when the owner asks "is anything missing", "did all invoices arrive", "check the Drive", "סנכרון", "לא לפספס מסמך", "לבדוק שהכול בדרייב", "חסרה חשבונית"; and after every deploy that touches server/finance or supabase/finance.sql.
---

# Finance zero-loss: mailbox → system → Google Drive

One promise: **a document that reached a connected mailbox is either in the system and in Drive, or it is on a list a person
can see, with the reason.** Never silently skipped, never reported as done when it is not.

Read `docs/finance/DRIVE-ARCHIVE-PLAN.md` and `docs/finance/SCAN-AND-COMPANIES-PLAN.md` for the design. This skill is the
operating procedure and the rules that must survive every change.

## The chain, and where each link keeps its proof

| Link | Code | Proof it is complete |
|---|---|---|
| Mail → messages checked | `server/finance/scan.js` | one row per message in `fin_scan_items`; a job is `done` only after the verify pass found nothing left, else `incomplete` |
| Message → document | `server/finance/pipeline.js` (`messageProcessor`) | kept → `fin_documents`; not kept → `fin_skipped` with the class and reason |
| Document → reports | `src/pages/finance/format.js` (`counts`), `ledger.js` | a receipt that pays a held invoice is not counted twice; duplicates never count |
| Document → Drive | `server/finance/archive.js` | one row per document in `fin_drive_files`; `verified` only after the file was read back (name, folder, size, md5 or SHA-256) |
| System ↔ Drive | `archive.js` reconciliation (`fin_drive_reconciles`) | `completed` only when nothing is left, else `completed_with_issues` with `fin_drive_repairs` |

## Rules that must never be broken

1. **Nothing is "done" on an answer alone.** An upload is verified by reading the file back. A scan is done only after its
   completeness pass. A reconciliation is completed only with zero outstanding.
2. **Every message and every document has a row with a status.** "Not found" and "not checked" are different states. A failure
   stays visible (`failed`, `needs_review`, `incomplete`) until a person or a retry resolves it. Never delete a failed row to
   make a number look right.
3. **Retries never duplicate.** Drive files carry the document id in `appProperties.kd`; a retry looks for that file first.
   Queue rows are claimed with `SKIP LOCKED` under a lease. One lock per Drive connection (`fin_cloud_lock`).
4. **Nothing of the user's is deleted or moved.** The archive touches only files it made (`drive.file` scope). A file that no
   longer belongs goes to the Drive trash, never erased. Unknown files in the archive are reported, not touched. The one
   removal in the code is the temporary Google document used to turn an email receipt into a PDF.
5. **Only invoices and receipts go to Drive** (`fin_drive_eligible` in SQL and `eligible` in `archive.js` must stay the same
   rule): invoice, invoice_receipt, receipt, credit, supplier_bill, as a PDF, an image, or an email that is itself the receipt
   (uploaded as a PDF). If you change one side, change the other and the e2e in the same commit.
6. **An email that is itself the receipt is a receipt** (`bodyReceipt` in `pipeline.js`), not a payment confirmation. Otherwise
   it disappears from the reports and from Drive (this happened with Meta ads receipts).
7. **Order by the document, not by the email:** company folder → year → `MM - month` by the date printed on the document;
   name = `date_supplier_type_number_amount-currency.ext`; a missing detail is left out, never invented.
8. **A correction in the system moves the file.** Company, supplier, type, number, date, amount or status changed → the trigger
   `fin_drive_doc_changed` queues the row and the next run renames or moves the archive's own file.
9. **Background work resumes from its checkpoint** (scan: page token + last message; reconciliation: page token; upload: row
   status). Never restart a whole job to get past an error.
10. **Secrets never leave their place.** Tokens in `fin_cloud_secrets` / `fin_mailbox_secrets` (server only); the minute run's
    secret is made inside Vault (`finance_tick_secret`) and checked with `fin_tick_ok`.

## Health check (run it when asked "is anything missing", and after every deploy)

Run `health.sql` from this folder against the production project with the Supabase tool (`execute_sql`, read-only). Read the
result top to bottom; every line below must hold, or you report it to the owner in plain Hebrew with the numbers.

- `scan.jobs`: no job stuck `running` with `updated` segments older than 15 minutes; `incomplete` jobs → list their problems
  (`fin_scan_items` failed / unreadable) to the owner; they are decided on the "ניהול סריקות" screen.
- `scan.coverage`: every active mailbox has a job that starts at least a year back. If not, the night run
  (`ensureCoverage`) creates it; say so.
- `pipeline.stuck`: 0 documents `processing` for more than an hour; `failed` documents are listed, not hidden.
- `drive.gap`: `eligible_docs = verified + pending + failed + needs_review + duplicate + withdrawn_excluded`. Any eligible
  document **without a row** is a bug: the enqueue did not see it. Investigate before anything else.
- `drive.false_verified` cannot be seen from SQL: start a reconciliation (`drive-reconcile`, or the button "בדיקת כל המסמכים
  מול Drive") and read its report. `missing`, `trashed`, `wrong_folder`, `wrong_name`, `changed` must all end restored or
  corrected; `outstanding` must be 0 for "הושלמה ואומתה".
- `cron`: `finance-scan-tick` exists and its last runs succeeded; `net._http_response` shows 200 from `scan-tick`.
- `drive.connection`: status `active`, `enabled` true, `last_error` null. `error` means the owner must reconnect (one click);
  a reconnection keeps the same archive and starts a check, it never uploads twice.

When a number does not add up, find which link lost it, in this order: `fin_scan_items` (was the message checked?) →
`fin_skipped` (was it rejected, and why?) → `fin_documents` (status, doc_type, file_mime) → `fin_drive_files` (status, error,
attempts) → `fin_drive_events` (what happened to it). Report the document and the link, then fix the cause, not the row.

## Before changing any link

1. Read the link's code and its e2e scenario: `SCAN`, `FORMATS`, `CLOUD`, `ARCHIVE`, `V14` in `scripts/finance-e2e/run.mjs`.
2. A new way to lose a document gets a test first: make the Drive fake (`scripts/finance-e2e/fakes.mjs`) or the Gmail fake
   fail that way (`/__drive?upload503=1&lose=1&rate403=1&nomd5=1`, `remove`, `trash`, `move`, `rename`, `change`, `seed`).
3. SQL goes into `supabase/finance.sql`, idempotent; apply it twice locally. Production SQL is run by the owner (or through
   the Supabase tool when the owner approves the prompt); verify afterwards with `health.sql`.
4. Run `node scripts/finance-e2e/run.mjs` and then `node scripts/finance-e2e/review.mjs`; both must pass before asking to merge
   (CLAUDE.md, `docs/finance/DESIGN-REVIEW-PROCESS.md`). Do not edit files the app imports while a run is in progress.
5. After the deploy: `health.sql`, then one reconciliation, then tell the owner the numbers.

## What to tell the owner

Plain Hebrew, numbers first: how many messages were checked, how many documents were kept and how many were skipped and why,
how many are in Drive and verified, and the exact list of what still needs a person. If something is missing, say which
document and which link, and what is being done. Never "הכול תקין" without the health check and a completed reconciliation.
