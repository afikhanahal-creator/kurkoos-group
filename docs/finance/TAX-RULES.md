# The compliance agent and the rules registry (ISRAEL_TAX_RULES_ENGINE)

Screen: `/admin/finance/compliance` ("ציות ומס"). A note inside every document ("בדיקת ציות"). A mark on the documents
list for a document that needs a fix or the accountant.

The system is a control tool that prepares material for the accountant. It never changes a figure on a document, never
approves a document and never files anything. A doubt is a note.

## Where things live

| What | File |
|---|---|
| The rules registry: every rate, threshold and ceiling, with source, dates, versions | `src/pages/finance/taxRules.js` |
| The check of one document and of all of them (pure functions) | `src/pages/finance/compliance.js` |
| The VAT service the check builds on | `src/pages/finance/vatRules.js` |
| The nightly agent: the check over all documents, the watch over the sources, the accountant's confirmations | `server/finance/compliance.js` |
| The screen, the note in a document, the accountant's workbook | `src/pages/finance/Compliance.jsx` |
| The engine's tests (formulas, registry, the twenty scenarios) | `scripts/finance-tax-tests.mjs` |
| End to end (screen, log, watch, workbook) | scenario `TAX` in `scripts/finance-e2e/run.mjs` |

No table was added. State lives in `fin_settings` (`tax_audit_state`, `tax_audit_last`, `tax_watch_state`,
`tax_rules_confirmed`); every event is a line in `fin_audit` (`tax_checked`, `tax_check_run`, `tax_source_changed`,
`tax_source_value_missing`, `tax_source_acknowledged`, `tax_rule_confirmed`, `tax_watch_run`).

## Rules for changing a rule

1. A rate, threshold or ceiling is written only in `taxRules.js`. Nothing else holds a number.
2. A change in the law is a **new version** of the rule, with `from` (and `to` on the previous one). Never edit an old
   version: a document is checked against the version in force on its own date, so old documents keep their answer.
3. Every rule names its source and its kind (law, regulation, authority, professional). `verified` is the day the value
   was compared with that source, `verifiedHow` says against what.
4. Never enter a change from a news article. The watch only raises a note; a person enters the change with its source.
5. Bump `ENGINE_VERSION`, and run `node scripts/finance-tax-tests.mjs` (add a case for the new version).

## What the check does for a document

Identification (what the law requires on the document was read), validity (supplier number check digit, the same number
under two names, dates), arithmetic against the rate of the document's date, input VAT (document type, category
percentage against the regulation for that kind of expense, allocation number, six months, foreign supplier), income tax
(a separate answer: percentage and amount recognised), credit notes (linked, full or partial, over-credit), receipts
(linked to their tax invoice, counted once), a second copy, cash above the ceiling, a reminder about tax withheld at
source. Each point carries a level (ok, info, doubt, error) and the rule and version it used.

Statuses: נקלט, בתהליך זיהוי, ממתין לבדיקה, תקין, תקין בכפוף לאישור, דורש תיקון, דורש בדיקת רואה חשבון, לא מוכר לצורכי מס,
לא ניתן לקיזוז מע״מ, מוכן לייצוא לרואה החשבון, יוצא לרואה החשבון. They are computed; the document's own status column is
not changed.

## Research (2026-11-13): what was verified and how

- **Read in the official gazette (Reshumot PDFs):** the VAT rate order and all its amendments (16% 2010, 17% 1.9.2012,
  18% 2.6.2013, 17% 1.10.2015, 18% 1.1.2025); the allocation-number thresholds 20,000 (2025), 10,000 (1.1.2026) and
  5,000 (1.6.2026, the permanent text; no further step is legislated); section 32(18) of the Income Tax Ordinance (from
  1.1.2026 an expense whose input VAT was denied for lack of an allocation number is not deductible either); the cash
  ceiling of ₪6,000 from 1.8.2022.
- **Read in the consolidated text on Wikisource (unofficial transcription, to be spot-checked against the official
  text):** VAT law sections 30, 31, 38, 41, 47; VAT regulations 14, 15, 15א, 16, 18, 6ד; income-tax expense regulations
  (refreshments 80%, hospitality, gifts ₪240, mobile ₪1,380, travel, lodging); vehicle expense regulations (45% or
  expenses less the benefit value); bookkeeping instructions 9, 9א, 23א, 25; withholding regulations.
- **Not verified:** any Tax Authority page (gov.il answers 403 to automated reading), so the 5.5.2024 administrative
  start of allocation numbers rests on professional sources only; that no VAT-rate change is announced after 11/2026;
  the official indexation notices behind the 2026 amounts (gifts, mobile, exempt-dealer ceiling ₪122,833); the Tax
  Authority's position on VAT for fuel, maintenance and leasing (regulation 18) and on light refreshments; fines as a
  non-deductible expense (not in the text of section 32; shown as "needs a check"); who must withhold tax and the small
  payment exempt from it.

## Gaps found in the existing system (and what was done)

| Gap | Risk | Done |
|---|---|---|
| The VAT rate was written in three places (VAT service, reading checks, the document panel's calculator) | A change in the law fixed in one place only | One registry; all three read it |
| The panel's "calculate" button used 18% for every document | A 2024 invoice completed with the wrong VAT | Uses the rate of the document's date |
| The VAT service knew rates only from 10/2015 | An older document checked against the wrong rate | Rates from 2010 |
| The hospitality rule named regulation 15א | Wrong citation to the accountant | Regulation 16 (hospitality) and 15א (employee benefits) |
| The 2026 allocation thresholds were marked "by the owner's instruction" | Unsourced rule | Verified in the gazette |
| No income-tax answer at all | "Recognised" was implied to equal the expense | A separate answer per document, by kind of expense |
| A missing allocation number was shown as a VAT matter only | From 2026 the expense itself is lost | Second note, section 32(18) |
| No check of the category percentage against the regulation | Fuel in a 100% category claims a third too much | Note with the amount |
| No cash check, no over-credit check, no supplier-number check digit | Silent errors | Added |

## What still needs the accountant

Every rule is "waiting for the accountant's confirmation" until confirmed on the screen (admin or accountant). In
particular: the vehicle rule (the system shows 45% as a conservative estimate), mobile phones, gifts, travel and lodging
ceilings (annual calculations the system does not do), fixed assets and depreciation, foreign suppliers (reverse charge),
input VAT of a company with exempt transactions (residential letting: section 41 and pro rata), withholding at source.

## Not built

- Reading the allocation number, the customer's name and the invoice's "מקור" mark from the file itself (the check uses
  what the reading agent extracted).
- Checking a supplier number or an allocation number against the Tax Authority (no public API was found; nothing is
  shown as verified with the authority).
- Per-year ceilings (gifts per recipient, mobile per year, travel days): the system flags, the accountant calculates.
- A PDF of the per-document report and an export in a bookkeeping program's own format (the workbook is Excel).
- Automatic entry of a change in the law: by design, a person enters it.

## The report for the accountant (`/admin/finance/report`)

`src/pages/finance/accountantReport.js` (the lines, the summary, the workbook, CSV, the page to print),
`src/pages/finance/xlsxPro.js` (the styled workbook writer), `src/pages/finance/AccountantReport.jsx` (choosing the
documents). Tests: `node scripts/finance-report-tests.mjs` (the file is built, unpacked and read back) and scenario
`REPORT` in the e2e suite. Rules of the report: nothing is filled in that the system does not know (no exchange rate is
held, so a foreign document has no shekel amount and is outside the totals); a credit note is a negative line; a receipt
that pays a tax invoice already in the system is listed and marked "not counted"; only VAT printed on a tax invoice
counts as allowed, an estimate is a note. Links go to the document's copy in Google Drive when there is one, otherwise to
the document in the system (sign-in needed).
