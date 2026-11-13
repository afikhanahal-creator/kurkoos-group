# Google Drive: the file manager and two-way sync

Screen: `/admin/finance/drive`. Engine: `server/finance/archive.js` (the archive: queue, upload, read-back, the full
check) and `server/finance/driveSync.js` (the other direction, folders a person makes, the trash, accounts). The plan of
the archive itself is in `DRIVE-ARCHIVE-PLAN.md`.

## What was there before

One direction only. The system was the source of truth: every document went up to a folder computed from its company
and month, was read back and verified, and a nightly full check compared every row with Drive. Anything a person did in
Drive to the archive's files was undone: a renamed file got its name back, a moved file returned to its folder, a
trashed file was uploaded again.

## What changed

**The other direction (two-way sync).** What a person does in Drive to the archive's files is now followed:

| Done in Drive | What the system does |
|---|---|
| A file renamed | The name is kept (`name_override`), on every later run too |
| A file moved into a company's month folder | The document is assigned to that company and accounting month (not for an approved or sent document: it only stays where it was put) |
| A file moved into any other folder (one made here, one made in Drive, a company's own folder) | The file stays there; the document's details are not changed |
| A file moved to the Drive trash | The document leaves the archive and appears in this screen's trash. The document itself stays in the system and is not uploaded again |
| A file taken out of the Drive trash | Back in the archive, checked again |
| A file deleted for good | Put back from our storage (a deletion for good is not a wish the system can read) |
| A folder made here renamed in Drive | The name follows, and the paths of the documents in it |
| A folder made here trashed in Drive | Its documents go to this screen's trash; the folder leaves the list |

How it is read: Drive's own change list (`changes.list`) with the page token kept per connection
(`fin_settings.drive_sync_state`). It runs every minute with the scan tick, once a minute while the screen is open, and
on "סנכרן עכשיו". The full check (`archive.reconcile`, nightly and on the button) is the safety net and uses the same
rule (`archive.adopt`), so the two never disagree. A token Drive no longer accepts starts again from now and the full
check covers the gap. Push notifications (`changes.watch`) are not used: they need a verified public address, and
Google does not promise every notice arrives; the change list is the source of truth either way.

Two-way sync can be turned off (the accounts view, admins only; `fin_settings.drive_two_way`). When off, the old rule
holds: the archive's files return to the name and folder the system gives them.

**Folders a person makes.** "תיקייה חדשה" creates a real folder in Drive, under the archive's root or inside any
folder. It can be renamed (in Drive too) and deleted when empty (a trashed folder takes its contents with it in Drive,
so a folder with documents is refused). A document moved into it stays there; its company and month do not change.
"Back to the company and month folder" undoes that.

**The trash.** "העברה לאשפה" takes the copy out of the archive (to the Drive trash) and keeps the document. The trash
view lists those and the ones trashed in Drive, with "שחזור" (the same file comes out of the Drive trash when it is
still there) and "מחיקה לצמיתות מהמערכת" (the document, its files and its copy; asks first).

**The screen.** Navigation like Drive: כל הקבצים, התיקייה שלי, אחרונים, מסומנים בכוכב, שותפו איתי, חשבוניות, קבלות,
חשבוניות זיכוי, מסמכים לבדיקה, אשפה, חשבונות מחוברים. Search over name, supplier, number, company number, amount,
currency, date, folder, description and account. Sort by document date, name, upload date, size, type. One line of
state (מחובר ומסונכרן / מסנכרן כעת / ממתינים לסנכרון / שגיאת סנכרון / חשבון מנותק) with the time of the last reading
of Drive. Per file: the history of what happened to it, who did it, from where to where.

**Accounts.** Each connected Google account on its own: state, files in sync, waiting, errors, in the trash, the room
Drive reports, last upload, last reading of Drive, last full check, and the permission it holds. Another account is
connected from there; every document's file belongs to the account it went up to.

## No new table

- A folder a person made: a row of `fin_drive_folders` whose key ends in `m:<id>` under its parent's key
  (`root/m:ab12`, `b:<company>/2026/11/m:cd34`).
- A document kept in a chosen folder: a row `pin:<document id>`; its `name` is the folder's key, or `ext` for a folder
  made in Drive.
- Page tokens: `fin_settings.drive_sync_state`. The switch: `fin_settings.drive_two_way`.
- Every step is a line of `fin_drive_events` (`renamed_in_drive`, `moved_in_drive`, `trashed_in_drive`,
  `restored_in_drive`, `restored_by_user`, `folder_created`, `folder_renamed`, `folder_renamed_in_drive`,
  `folder_deleted`, `folder_trashed_in_drive`, `pin_lost`) and the larger ones also of `fin_audit`.

## The limit that matters: what the connection can see

The Google permission is `drive.file`: the system sees and manages only files and folders it created. So:

- Files a person uploads straight into Drive, and files others shared, are not listed and cannot be changed or deleted
  by the system. "שותפו איתי" explains this instead of showing a list.
- A folder made in Drive is known only by its id: a document moved into it shows as "תיקייה שנוצרה ב-Drive".
- To list and manage the whole Drive, the connection needs the full `drive` permission. Google treats it as a
  restricted permission: an app that asks for it must pass Google's verification (and a security assessment for most
  uses). That is the owner's decision and a change in the Google Cloud project, not in this code alone.

## Tests

Scenario `SYNC2` in `scripts/finance-e2e/run.mjs`, against a stand-in for Drive that keeps a change list like the real
one (`scripts/finance-e2e/fakes.mjs`): each line of the table above, the full check after it (nothing is corrected
back), the screen (trash, restore, a new folder, history, accounts), an employee refused, and two-way sync off. The
older archive scenarios run with two-way sync off, because they test the one-way rules.

Not checked against the real Google Drive: no test here talks to Google.

## Not built

- Listing files the system did not create, and "shared with me" (needs the wider permission above).
- Push notifications from Drive.
- Copying a file (a document has one file in Drive, by design: the same bytes never go up twice).
- Uploading straight into a chosen folder (an upload goes to the company and month folder; it can be moved after).
- Starring folders, and search inside the text of a document.
- A content conflict (the same file edited in Drive): as before, the changed copy goes to the Drive trash and the
  original is uploaded again; the event is recorded.
