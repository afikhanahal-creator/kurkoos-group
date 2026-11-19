# Google Drive: what proves the two-way sync

The Drive archive is checked by scenarios in `scripts/finance-e2e/run.mjs` against a fake Drive that keeps real state
(files, folders, trash, change feed, push channel). Each row below names the scenario that fails if the behaviour breaks.

## From the system to Drive

| Case | Expected | Scenario |
|---|---|---|
| A document is approved | Uploaded to company / year / month folder with a readable name; retried on failure | ARCHIVE, T14 |
| Company or month changed in the screen | The file moves to that folder in Drive; the message appears after Drive confirms | DRIVEMGR |
| A row dragged onto a company | The file moves | DRIVEMGR |
| A folder created, renamed, deleted in the screen | Exists in Drive; deleted only when empty | SYNC2 |
| A document deleted | Its copy goes to Drive's trash first | DRIVEDEL |
| Upload into a folder, star on a folder | Kept | SYNC2 |
| Rate limit, expired token, wrong folder | Retried, re-authorised, moved back | ARCHIVE |

## From Drive to the system

| Case | Expected | Scenario |
|---|---|---|
| Renamed in Drive | The new name is kept | SYNC2 |
| Moved to trash in Drive | Goes to the trash here; the document stays and is not uploaded again; restore brings the same file back | SYNC2 |
| Moved to another company's month folder | Company and month change; an approved document stays where it was reported | SYNC2 |
| Moved to a private folder | Kept there | SYNC2 |
| Deleted for good in Drive | Restored from the stored original | SYNC2 |
| A folder renamed in Drive | Updated here | SYNC2 |
| A change while the screen is open | Arrives through the push channel within seconds | SYNC2 |
| A copy deleted without going through the system | Found by the check against Drive and moved to trash | DRIVEDEL |

## Integrity

| Case | Expected | Scenario |
|---|---|---|
| Full check | Every archived document is looked up in Drive; a missing one is counted and restored, never reported as "all there" | ARCHIVE |
| The full check after Drive-side changes | Nothing is moved back | SYNC2 |
| Two-way sync switched off | The system restores its own names and folders | SYNC2 |
| A second Google account | Kept apart; every document is recorded on the account it went up to | SYNC2 |
| An employee | Cannot move, trash or delete what is not theirs | SYNC2, DRIVEDEL |

## Limits (by design)

- With the `drive.file` permission the system sees only files and folders it created. A file a person adds to an archive
  folder by hand is not visible to it. The wider `drive` permission shows them as "שותפו איתי", read only.
- A change made in Drive while the push channel is down arrives on the next minute's tick, not within seconds.
- Checked against a fake Drive. A check against the real account is the "סנכרן עכשיו" button and the full check on the
  connected accounts screen.
