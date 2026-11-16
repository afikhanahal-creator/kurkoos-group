# What reading costs, and how it is kept low

Code: `server/finance/pipeline.js` (`readDocument`), `server/finance/extract.js` (`firstReadOk`, `slim`),
`server/finance/budget.js`, screen `src/pages/finance/AiCost.jsx` (in the agents screen).

## Before reading: free checks

1. A file already in the system (same bytes) or already skipped is never read again.
2. Rules on the file name, the sender and the subject: an invoice name or a known supplier goes straight to reading;
   a quote, contract, newsletter or a sender that only ever sent such files is skipped, unread (`triage.js` `gate`).
3. Only unclear files get one short question to the small model (`triage`).

## The reading, in tiers

| Tier | Model (default) | When |
|---|---|---|
| 1 | small: `FINANCE_MODEL_FIRST`, `claude-haiku-5-5` | every document |
| 2 | mid: `FINANCE_MODEL_EXTRACT`, `claude-sonnet-5-5` | only when the small reading fails `firstReadOk` |
| 3 | strong: `FINANCE_MODEL_VERIFY`, `claude-opus-5-5` | the critical fields only, when the reading is still unsure (`needsVerify`) |

The small reading is kept only when all of these hold: it says it is an expense document; there is a total, a supplier
and a date (not in the future, not older than seven years); a tax document has a number; the model is sure of the total
(85%) and of the date, supplier, number, VAT and company id (80%); net + VAT = total (within 1); in shekels, the VAT is
0%, 17% or 18% of the net; a printed company id passes the check digit; the image is not blurry or cropped. Otherwise the
mid model reads the document from the start and the small reading is dropped (never mixed in). Why it was sent up is kept
in `extraction.reading.why`; which tier read it in `extraction.reading.tier` (`small`, `escalated`, `mid`).

`FINANCE_TIERED=0` turns the tiers off (every document read by the mid model, as before).

Also: the fixed instructions are a cached system prompt (read from the cache at a tenth of the price); the email text is
trimmed (blank runs and quoted earlier messages removed, at most 12,000 characters instead of 40,000).

## The cap

`fin_settings.ai_budget` = `{ day_usd, month_usd }` (default 2 and 20; admins change it in the agents screen). The spend is
what the runs wrote (`fin_agent_runs.details.cost_usd` + `triage_usd`), by the Israeli day and month, plus what this
process spent since. Over the cap, the automatic readings stop: a file from mail (and from a history scan) is stored with
the issue `budget_wait` and read the next night; the nightly retries wait too. What a person sends (an upload, WhatsApp,
"read again") is always read.

## Measured (production, before the tiers)

102 documents read: 6,000–9,000 input and about 700 output tokens each on the mid model, about $0.02 a document;
$2.15 for the one history scan of 2026-11-10 (112 documents), $0.02–0.14 a day since.

## Tests

Scenario `ECON` in `scripts/finance-e2e/run.mjs`: the checks case by case, a clean invoice read by the small model only, one
whose small reading does not add up sent to the mid model (whose total is kept), a file over the cap kept unread and then
read by a person, the cost card, and an employee refused when changing the cap. Not measured against the real models: how
often the small model is enough on real documents is seen in the agents screen after a few days.
