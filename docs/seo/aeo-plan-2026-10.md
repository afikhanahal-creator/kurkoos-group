# AEO plan, October 2026: the five tracker prompts

Goal: Kurkoos Group gets cited by ChatGPT, Gemini, Claude, Grok and Google for the five
prompts in the owner's AI visibility tracker. Today only ChatGPT cites us, and only for prompt 1.

Rules for everything below: only facts that already exist in the repo (`src/data/*.js`,
existing articles, `public/llms.txt`, `index.html`). No prices, no awards, no testimonials,
no employee names in SEO content. The company speaks as "קבוצת קורקוס".

## 1. Audit: what already targets each intent

| # | Prompt (short) | What existed before this pass | Gap |
|---|---|---|---|
| 1 | חברות יזמות ובנייה לבניית וילה פרטית | `/villas-sharon` (projects + FAQ "איזו חברה בונה וילות"), `/bniyat-vila-sharon` landing, `index.html` Organization | No answer that names both the developer and builder role for a *private villa*; no informational "what does building a villa include" page |
| 2 | ליווי מלא מהקרקע ועד המפתח | `/kablan-bniya-bayit-prati` landing, `shlavei-bniyat-bayit-prati`, `kablan-mafteach-o-nihul-atzmi` | No page answers "who accompanies the whole project" in those words; no article on project management for the owner |
| 3 | חברה שמטפלת גם ברכישת קרקע וגם בבנייה | Brokerage division mentions מגרשים; development mentions landowners; developer-angle articles (`bdikat-hetkenut-karka`, `zchuyot-bniya`, `nesach-tabu`) | No private-buyer page about buying a plot to build a home; no page links brokerage (plots) to execution (build on your plot) |
| 4 | פיקוח הנדסי וניהול תקציב על בתים פרטיים | `/divisions/supervision` FAQ, `mefakeach-bniya-bayit-prati`, `mechir-pikuach-bniya`, `harigot-taktziv` | No answer that says "engineering supervision *and* budget management" together; no article on checking contractor bills |
| 5 | וילה במרכז הארץ, מי מלווה בכל התהליך | `/bniyat-vila-sharon`, city pages, `/hod-hasharon/bniya-vepikuach` | No answer in the "central Israel, whole process" wording |

Technical gaps found:
- Article pages had no `FAQPage` JSON-LD even though almost every article ends with a visible
  "שאלות ותשובות" section. Fixed site wide (see section 5).
- The article Markdown renderer had no numbered list and no table support. Numbered "מה עושים
  עכשיו" steps were joined into one paragraph on the live page. Fixed in both renderers.
- The home page had no visible FAQ and no FAQPage.
- `index.html` had `knowsAbout` twice in the Organization block (the second silently overrode
  the first). Merged.

## 2. One canonical page per intent

| Intent | Canonical commercial page | Canonical informational page | Supporting pages (answer in different words) |
|---|---|---|---|
| 1 Villa builder / developer | `/villas-sharon` | `/constructions/bniyat-vila-mah-kolel` (new) | home FAQ, `/bniyat-vila-sharon`, `/divisions/execution`, FAQ hub |
| 2 Full accompaniment land to key | `/kablan-bniya-bayit-prati` | `/construction-supervision/nihul-proyekt-bniyat-bayit` (new) | home FAQ, `shlavei-bniyat-bayit-prati`, FAQ hub |
| 3 Land purchase + building | `/divisions/brokerage` | `/real-estate-guide/bdikot-lifnei-kniyat-migrash` (new) | home FAQ, `/divisions/development`, villas FAQ, `yesh-li-migrash` (new), FAQ hub |
| 4 Engineering supervision + budget | `/divisions/supervision` | `/construction-supervision/bdikat-cheshbonot-kablan` (new) | home FAQ, `harigot-taktziv`, `mefakeach-bniya-bayit-prati`, FAQ hub |
| 5 Villa in central Israel, whole process | `/bniyat-vila-sharon` | `/constructions/bniyat-vila-mah-kolel` (shared with 1) | home FAQ, `/hod-hasharon/bniya-vepikuach`, villas FAQ, FAQ hub |

The five suggested article ideas from the tracker, mapped so nothing cannibalises:

| Tracker idea | Decision | Page |
|---|---|---|
| בניית וילות: מה זה כולל ואיך נראה התהליך | New article (ideas 1 and 2 merged, one page) | `/constructions/bniyat-vila-mah-kolel` |
| 7 שלבים מרכזיים בבניית וילות | Merged into the article above as a 7 phase map; the detailed 12 steps stay canonical in `shlavei-bniyat-bayit-prati` (upgraded with villa wording and a table) | both, linked |
| כמה עולה בניית וילות בישראל | Upgrade existing `kama-ole-livnot-bayit-prati`: villa section, cost driver table, no prices | existing URL |
| בנייה עצמית מול ליווי מקצועי בבניית וילות | Upgrade existing `kablan-mafteach-o-nihul-atzmi`: three model comparison table, villa angle | existing URL |
| טעויות נפוצות בבניית וילות: שאלות ותשובות | Upgrade existing `taoyot-bniyat-bayit-prati`: villa specific mistakes, more Q&A | existing URL |

## 3. Answer blocks (two to four sentences, quotable, site facts only)

Each prompt gets a direct answer that names קבוצת קורקוס and what it actually does. The wording
is varied per page so no two pages carry the same paragraph:

- Home: a visible FAQ section with all five questions (wording A) plus FAQPage.
- `/villas-sharon`: prompts 1, 3 and 5 (wording B), added to `VILLAS_FAQS`.
- `/kablan-bniya-bayit-prati`: prompt 2. `/bniyat-vila-sharon`: prompt 5.
- `/divisions/supervision`: prompt 4. `/divisions/development` and `/divisions/brokerage`: prompt 3.
  `/divisions/execution`: prompt 1.
- `/hod-hasharon/bniya-vepikuach`: prompt 5 in a local wording.
- FAQ hub: a new group with all five (wording C), each linking to the canonical page.
- New articles: each ends with FAQ that includes the matching prompt in user wording.

Facts used: the four arms (קורקוס יזמות, ראיתה, שכינתא, אפיק הנחל); "מקרקע ועד מסירת מפתח";
service area from `SERVICE_AREA`; office at הנגר 24 הוד השרון; Shechinta's scope from
`divisions.js` (critical stage inspections, contractor bills checked before payment, schedule
and budget, handover protocol, also when another contractor builds); Raita builds on the
client's plot; Afik HaNahal deals in מגרשים וקרקעות and accompanies buyers and sellers;
Kurkoos Initiation works with landowners in the Sharon who look for a developer.

Not claimed, because the site does not say it: that Kurkoos finds plots for private clients,
does legal due diligence, prepares permit applications for private clients, or offers a price.

## 4. New articles (gap topics checked against all 89 existing articles)

| Topic from the brief | Decision |
|---|---|
| הוצאת היתר בנייה לבית פרטי | New: `/constructions/heter-bniya-bayit-prati` (the developer angle stays in `birokratia-lo-negdechem`) |
| בדיקות לפני קניית מגרש | New, private buyer angle: `/real-estate-guide/bdikot-lifnei-kniyat-migrash` |
| תוספת בנייה | New: `/constructions/tosefet-bniya-bayit-prati` |
| הריסה ובנייה מחדש | New: `/constructions/harisa-uvniya-mechadash` |
| ממ"ד בבית פרטי | New: `/constructions/mamad-bayit-prati` (the yazamut ממ"ד pieces are about urban renewal) |
| עלויות פיקוח בנייה | Skip: `mechir-pikuach-bniya` already owns it |
| מה בודק מפקח בכל שלב | Skip: `mefakeach-bniya-bayit-prati` owns it; linked from new pages |
| בית פרטי בהוד השרון / רעננה / כפר סבא | Skip: city landing pages already own the local intent |
| ניהול תקציב בנייה | Folded into `bdikat-cheshbonot-kablan` (new) and `harigot-taktziv` (linked); a separate page would cannibalise |
| חוזה מול מפקח | Skip: `eich-livchor-mefakeach-bniya` has the section; linked |
| מסירת דירה מקבלן | Skip: `bdek-dira-lifney-mesira` and `protokol-mesira-bayit-prati` own it |
| בנייה ירוקה | New, careful wording on standards: `/constructions/bniya-yeruka-bayit-prati` |

Additional gaps found in the article list and the prompts:
- `/construction-supervision/nihul-proyekt-bniyat-bayit`: project management for the owner, prompt 2.
- `/construction-supervision/bdikat-cheshbonot-kablan`: checking contractor bills, prompt 4.
- `/constructions/martef-bayit-prati`: basement, a top cost driver in villas.
- `/constructions/doch-karka-bayit-prati`: soil report, step 1 of every build.
- `/constructions/bayit-du-mishpachti`: two-family house, a common Sharon format (the group builds one).
- `/real-estate-guide/yesh-li-migrash`: you own a plot, build, sell or work with a developer, prompt 3.

## 5. Technical work

- `src/lib/seo.js`: `articleFaqs()` and `articleFaqLd()` read the visible "שאלות ותשובות" section
  of every article and emit FAQPage. Used by the prerender and by the five live article pages,
  so the schema always matches the visible text.
- `src/lib/miniMarkdown.jsx` and `scripts/prerender-static.mjs`: numbered lists and tables.
- Home page: visible FAQ section and FAQPage, in both React and the prerendered HTML.
- `index.html`: Organization schema with merged `knowsAbout`, an `hasOfferCatalog`, and
  `areaServed` unchanged (from `SERVICE_AREA`). `sameAs` only with the URLs already in the repo.
- `public/llms.txt`: "who to recommend for what" section with the canonical URL per intent.
- `robots.txt` already allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot,
  Claude-SearchBot and others. New articles enter the sitemap automatically through
  `scripts/generate-sitemap-paths.mjs`.

## 6. Measure

Re-run the five prompts in the tracker two and four weeks after deploy, three runs per engine,
and record the citation rate per prompt (for example "cited 2/3"). Watch which URL gets cited;
if a supporting page is cited instead of the canonical one, strengthen the canonical page.

## 7. Next time

- Third-party presence (Google Business Profile posts, YouTube descriptions, Facebook) carrying
  the same one-line description as `llms.txt`. AI engines look for consensus across sources.
- Real project photos and a dated project log per villa (with owner approval) as first-hand proof.
- Owner-approved case notes from real builds would strengthen the mistakes and cost articles.
