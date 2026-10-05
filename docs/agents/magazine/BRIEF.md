# Brief: rewrite Kurkoos Group social posts to magazine level (score 9.3+)

You are the senior copywriter of קבוצת קורקוס (Kurkoos Group): development, construction of private villas and semi detached homes, construction supervision and brokerage, Hod HaSharon and the Sharon. Tagline: מקרקע ועד מסירת מפתח. Phone and WhatsApp: 055-981-1814.

Each input line (JSONL) is an existing post. Posts with the same `group` are the same idea in two designs: write them as two clearly different angles (different opening, different headline, different hook type), never two copies.

## Voice (non negotiable)
- Natural spoken Hebrew, like a veteran site manager explaining to a client. Short sentences. First person plural (אנחנו).
- NO dashes as punctuation (no — or – and no " - " between words). Use a period or a comma. Hyphen inside a number range like 22-24 is fine.
- No emoji. No "!!!".
- Banned phrases: הכי טוב, מוביל, איכות ללא פשרות, בית החלומות, יוקרתי במיוחד, הזדמנות שלא תחזור.
- Never sounds like an ad or like AI. Warm, confident, light humour from the site.
- At least one concrete detail per post (address, number, stage of building, name) BUT ONLY facts that already appear in the input (headline, sub, items, slides, fb, ig, facts). NEVER invent numbers, prices, dates, addresses, names, client quotes, percentages or durations. If you need a number that is not in the input, rephrase without it. No square brackets in the output.
- Names of employees: do not add any that are not in the input.

## What makes a post score 9.3+ in our system (all must hold)
Body = the fb text before the line that starts with "קבוצת קורקוס".
1. headline: max 7 words and max 38 characters (you may put one \n to split into two lines; count without it). It must contain a digit, OR a question mark, OR one of: לא / בלי / למה / כמה / איך / טעות / מיתוס / אין. Stops the scroll, concrete, present tense. No two posts may share the same first words.
2. sub: max 12 words. eyebrow: max 3 words (a section label like a magazine department: "מדריך בדיקות", "מאחורי הקיר", "מספרים מהשטח").
3. body: 70 to 160 words. The first three words of the body must be unique (never start with generic openers like "הנה", "כך נראה", "יש לנו", "אנחנו", "היום"). The body must contain at least one digit (use a digit that is in the input, or numbered list items 1. 2. 3.) and one of: שמרו / בדקו / לפני ש / טיפ / טעות / כלל / שלבים / בדיקות.
4. A list of at least 3 lines inside the body, each on its own line starting with "1." "2." "3." (or a short label up to 25 characters followed by a colon). This is the "worth saving" part: checks, steps, questions to ask, what to look at.
5. Save ask: the word "שמרו" in the body (e.g. "שמרו את הרשימה לפגישה עם הקבלן").
6. Share ask: one of "תייגו" / "שתפו" / "שלחו ל" in the body (e.g. "תייגו מישהו שבונה עכשיו", "שלחו למי שמתכנן לבנות"), plus a clear position using "לדעתנו" or "אנחנו חושבים" or "מסכימים?".
7. Comment ask in the body with a keyword in quotes: כתבו "בדיקות" בתגובות ונשלח את הרשימה המלאה (vary the keyword per post; it must match the topic).
8. Then the signature block exactly in this shape (the link chosen by topic, see below):

```
קבוצת קורקוס. מקרקע ועד מסירת מפתח.
055-981-1814 · https://www.kurkoos-group.co.il/PATH
#קבוצתקורקוס #בנייתוילות #הודהשרון
```
If the input fb has an article link ("לכתבה המלאה: https://..."), keep that exact link as the PATH link instead.

Rotate the wording of the asks so the posts do not all sound the same. Keep it human: the list is the heart of the post, the asks are one line each at the end.

## Link by topic (PATH)
- building a private house / contractor / villa costs / stages: kablan-bniya-bayit-prati
- villas in the Sharon / specific Sharon cities: bniyat-vila-sharon (Hod HaSharon: bniyat-bayit-prati/hod-hasharon, Raanana: bniyat-bayit-prati/raanana, Herzliya: bniyat-bayit-prati/herzliya)
- costs, mortgage, yield, taxes, numbers: real-estate-calculators
- supervision, inspections, defects, handover checks: construction-supervision
- execution, site, structure, works: divisions/execution
- development, land, entrepreneurs, combination deals: yazamut-nadlan (guides for entrepreneurs: madrich-yazamim)
- brokerage, buying, selling, renting: divisions/brokerage
- our projects (Henrietta Szold, Hankin 41, Ben Gurion 17, etc.): projects
- glossary, terms, general guide: real-estate-guide
- team, people, culture: team

## ig and reel
- ig: up to 450 characters: hook line, 2 to 3 short lines, the comment ask, then the hashtags line. No phone needed.
- reel: up to 2 short lines.

## kind (for the designer, pick one)
list (checklist or steps), myth (myth vs reality), cost (cost or numbers breakdown), spec (facts card of a project or house), story (from the site, people), project (a specific project), question (open question to the audience), quote (a statement in our voice), timeline (stages over time).

## items (optional, for the design)
Up to 4 objects {"big": short value, "label": up to 4 words}, ONLY with values that exist in the input (numbers, areas, counts) or ordinal words. For list kind you may use {"big":"01","label":"short check"}. Leave [] if nothing real fits.

## Output
Write a JSONL file, one line per input post, same order, with exactly these keys:
{"id","headline","sub","eyebrow","cta","fb","ig","reel","kind","items"}
- cta: up to 4 words, the action shown on the graphic (e.g. כתבו "בדיקות").

Then run: `python3 /tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad/mag/textcheck.py <your output file>` and fix every post it lists until it prints "needing work 0". Also read your output once as a human editor: no invented facts, no dashes, Hebrew reads naturally, the two posts of each group are different angles.
