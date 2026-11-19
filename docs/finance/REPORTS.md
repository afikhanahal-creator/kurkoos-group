# Scheduled reports

The screen "כללים ואוטומציה" (`src/pages/finance/Automations.jsx` + `ReportsCenter.jsx`) lets an admin set up reports that
go out by themselves. The server side is `server/finance/reports.js`.

## What a report is

`fin_automations.config.reports` of the `morning_report` row holds a list (no new table):

| Field | Meaning |
|---|---|
| `id`, `name`, `enabled` | identity and the on / off switch |
| `template` | `morning` (the built-in morning report), `daily`, `expenses`, `documents`, `executive`, `custom` |
| `fields` | for `custom`: which figures and tables appear (`FIELDS`) |
| `companies` | `'all'` or a list of company ids |
| `period`, `from`, `to` | today, yesterday, last 7 days, this / previous week, this / previous month, custom dates |
| `tz` | the time zone the hours are read in (default `Asia/Jerusalem`) |
| `slots` | `[{ id, day 0–6 (Sunday = 0), time 'HH:MM', enabled }]`, several a day |
| `users` | member ids who get the email (`'managers'` only in the built-in default) |
| `wa` | ids of `fin_whatsapp_senders` rows who get the short WhatsApp text |
| `ai` | add up to three AI lines, written only from the report's own figures and marked as AI |

`config.templates` keeps the custom field sets saved for reuse. `cleanReports()` drops anything that is not valid or that
points at a member, number or company that does not exist.

## How it is sent

- Until an admin saves reports (`config.reports` is not a list) nothing changes: the 07:00 cron emails the morning report to
  every manager. Once reports are saved, the cron stops emailing and the schedule decides.
- The five-minute tick (`scan-tick` in `server/finance.js`) calls `reportsTick()`: every enabled slot whose hour has come
  today in the report's time zone, and not more than 90 minutes ago, is sent.
- Once only: before sending, a row `report_sent:<report>:<slot>:<date>` is inserted into `fin_settings` (primary key). A
  second tick or a second server finds the row and skips. Rows older than 8 days are removed.
- Email goes through `sendMail` (Resend, from "Kurkoos Finance"). WhatsApp goes through `sendText` in `whatsapp.js`: the one
  connected Green API line is the sender, and the recipients can only be numbers registered in `fin_whatsapp_senders`.
- Every sending is a row in `fin_agent_runs` (agent `summary`, `details.kind = 'report'`) with the figures that were sent
  and one result per recipient. So a past report opens exactly as it was, and "שליחה חוזרת" resends only the failed ones.

## Server actions

`reports-view` (admin, finance manager): the screen data, `op: history | open | preview`.
`reports` (admin): `op: save | send | test | retry | tick`. A test goes only to the caller's own email.

## Limits

- One WhatsApp line sends for everyone. WhatsApp gets a short text with a link, not the full report.
- A slot missed by more than 90 minutes (the server was down) is not sent late.
- AI lines need an Anthropic key with credit and respect the daily and monthly budget; without them the report goes out
  with the computed figures only.
