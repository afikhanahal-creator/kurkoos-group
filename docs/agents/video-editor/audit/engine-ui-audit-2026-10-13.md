# Kurkoos content engine · heuristic + clutter audit (V172 build, 2026-10-13)

Read-only evaluation of dist/engine/t.html at 390x844 (touch) and 1440x900. Screenshots in audit/shots ({m|d}-{view}-top/scroll.png, {m|d}-flow-*.png), contact sheets audit/contact1-4.png, raw numbers m1.json / m2.json.

## Findings (severity 0-4)
| ID | View | Sev | Finding |
|---|---|---|---|
| F03 | Posts | 4 | Cards hide headline, score, status and actions (k170css: `body.v170g .v170 .ga-card figcaption, .ga-acts, .ga-q, .ga-r, .v63chip, .v152c, .ga-flag, .ga-fixv {display:none!important}`). Only `.v170meta` (12px) shows, 19/24 read "הסוכן הסמוי". |
| F10 | Editor תמונה tab | 4 | First library photo at y=2401 (phone) / 2291 (desktop). Order in base `peImage()` (ce15 ~15490): slots, crop sliders, focus grid, zoom chips, "כלים לתמונה", then V115 picker (~21460) with 4 chip rows. |
| F11 | Editor picker | 3 | Default group "כללי 238", tiles sorted least-used first, no date sort / recent chip, captions only in big mode, corner × next to pick target. |
| F12 | Editor picker | 3 | V115 `tile()` shows "חדש" for unused (`!u[k]`); Photos uses "חדש" for added in NEWD days. |
| F06 | Photos | 3 | "חדש" on 319/432 (74%); NEWD=14 in v170.js. |
| F07 | Photos | 3 | `ptile()` shows no date; no week filter; PV views exclusive (uploads + date can't combine); "העלאות שלי" off-screen at 390. |
| F08 | Photo sheet | 3 | `psheet()` footer only "פתיחה בגודל מלא" + "הסרה מהגלריה"; no "פוסט חדש מהתמונה". |
| F01 | Posts 390 | 3 | 32 controls above fold, first post y=393; `.v170qv` scrollWidth 678/342 (3 tabs hidden), `.v170pj` 1052/342 (7 chips hidden), no scroll cue. |
| F02 | Posts | 3 | No status / score / publish-date filter in sheet; `qvOk(x,F.qv)` single choice. |
| F04 | Posts select 390 | 3 | `.ga-selbar` 358x168, 5 buttons at 13px, delete next to schedule (markup in ce15 vGallery ~15910, handlers ~15946 `data-ga="schedsel"`, `data-ga="cal"`). |
| F17 | Posts select | 3 | `.ga-chk` 30x30 white circle, no selection-mode button, long press has no hint. |
| F13 | Global | 3 | `#v171chip` fixed bottom 84px z 2147481000 covers sheet footers / photo bar remove button; second "ביטול" in schedule sheet. |
| F14 | Nav 390 | 2 | Drawer `#sidenav` no backdrop / close; two menu buttons; counts disagree (nav 8122 vs page 8,145). |
| F05 | Posts 390 | 2 | Active filter pills wrap to 2 rows, project shown twice, first post y=435. |
| F15 | Filter sheet | 2 | Body 1,355px tall; "גודל תצוגה" among filters; series counts 12px. |
| F16 | Schedule sheet | 2 | v157 `draw()` says "אין משבצות פנויות" while `gaSchedule()` finds slots weeks ahead. |
| F18 | Calendar 390 | 2 | Each item 5 dark buttons incl "גררו" on touch. |
| F19 | Posts/Photos | 2 | Date grouping gives one group "החודש 8145". |
| F20 | Global | 2 | Two search boxes (header ⌘K + page search). |
| F21 | Ideas/Agent/Calendar drawer | 2 | Same posts listed again with separate filters. |
| F22 | Global | 2 | Many text nodes < 14px (10-12px). |
| F23 | Global 390 | 1 | Targets < 44: `.ibtn` 40x44, `.ga-chk` 30, chips 36-40px. |
| F24 | Posts 1440 | 1 | Hidden `.ga-selbar` peeks 5px and catches clicks (`:not(.on){visibility:hidden}` only inside a media block, ce15 ~188). |
| F25 | Photos select | 1 | `.v148box` covers `.v170new`. |
| F26 | Posts | 1 | `#v170note` takes a full row, cut at 390. |

## Walkthroughs
- Select 5 posts + schedule: 6 taps, poor discoverability, toast only.
- Photos uploaded this week: no week filter, no tile date.
- Combine filters: project, family, image type, created date combine; status and score cannot.
- Editor picker: tap tab then scroll ~2,000px.

## Top 15 fixes
1. Informative post card: headline (2 lines, 15px/600) + one status chip (מתוזמן date / דורש בדיקה score / מוכן). v170 `gaCard` wrapper.
2. Picker-first editor image tab: V115 picker first with search + "אחרונות · הפרויקט של הפוסט · הכל" + 3-col grid; crop/tools in `<details>`; filters behind "סינון". Target first tile ≤ 700px on phone.
3. Status, score, publish-date filters in sheet (multi-select, facets, pills, nActive).
4. Calmer phone posts header: quick views → one dropdown, no project chip row, one-row pills, fade masks. Target first post ≤ 240px.
5. "חדש" = 7 days or since last visit, tile dates.
6. Photo date filter + uploads toggle that combine.
7. One-row selection bars (posts `.ga-selbar`, photos `.v148bar`) with overflow menu, delete confirm.
8. Explicit selection mode on Posts, 44px checks, one-time long-press hint.
9. Undo pill never covers sheets; label "בטל פעולה"; auto-hide 30s.
10. Editor: "לא בשימוש" instead of "חדש" for unused.
11. "פוסט חדש מהתמונה" in photo sheet.
12. Matching counts, drawer backdrop, one menu, header search focuses page search.
13. Real free slots in schedule sheet.
14. Calm calendar cards on touch (מועד + ⋯ only).
15. 14px minimum text, 44px targets, selbar peek, badge collision.
