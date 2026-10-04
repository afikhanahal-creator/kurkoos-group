# עורך הווידאו במערכת (v100)

## מה נבנה
- **מנוע עריכה** ב-`video/engine` (ראו `video/README.md`): OpenCV ו-numpy מרכיבים כל פריים, ffmpeg מחבר תמונה וסאונד,
  עברית עם Pillow ו-RAQM בפונט אלמוני, תמלול ברמת מילה, מפת זמן שחותכת שתיקות ואת הסאונד יחד, מסכת דמות עם rembg,
  רינדור מקבילי, לאודנס ‎-14 LUFS, גיליונות קונטקט ובדיקת עורך.
- **הסקיל video-studio** מותקן ב-`.claude/skills/video-studio` (הסטודיו המלא למק או ווינדוס, כולל ivrit.ai מקומי).
- **רוטינה** "קורקוס: עורך הווידאו (רילס אוטומטי)", `trig_01E37BdRRUdgin2XXQVpx7hN`, מודל claude-opus-5-5, סשן חדש לכל סרטון:
  מורידה את הסרטון מהארטיפקט, מריצה את המנוע, בודקת כמו עורך, מעלה את הרילס כנכס ומעדכנת את אוסף `videos`.
- **בדף** (`v100.js`): עמוד "סרטונים ורילס" (העלאה, סטטוס, תוצאה, הורדה, "ערוך כרילס" לכל סרטון במערכת), חוק אוטומטי:
  כל קובץ וידאו שנכנס דרך כל שדה קובץ או גרירה (העלאת חומרים לסוכן, שיבוט ממתחרים, סטודיו) נשמר כנכס, נרשם ונשלח לעורך;
  כפתור "ערוך כרילס עם העורך" בחלון ההנפשה (ואוטומטית כשהמתג דולק); כפתור "רילס מהסרטון" בחדר העריכה.

## מה נערך עכשיו
ששת הסרטונים שהיו במערכת (kurkoos-v1..3 ב-4:5, reel-1..3 ב-9:16), כולם בלי פסקול דיבור, נערכו לרילס 9:16 בסגנון
קולנועי או נקי: רקע מותג, פאנץ' אין איטי, פייד, אאוטרו עם הלוגו ושורת המותג, צלילי מעבר, לאודנס. ה-QA של כל אחד בתיקייה `qa/`.
העותקים להעלאה (מתחת ל-5MB) נשמרו כנכסים בארטיפקט ורשומים באוסף `videos` עם status done.

## מגבלות שחשוב לדעת
- בסשן הענן huggingface.co חסום, ולכן ivrit.ai לא זמין שם. תמלול בסשן הענן דורש מפתח Deepgram (או Groq / OpenAI)
  ב-`video/api-keys.txt`, או תמלול במחשב עם הסקיל ושליחת `words.json`. בלי זה, סרטון עם דיבור נערך בלי כתוביות והסטטוס אומר זאת.
- נכסים בארטיפקט מוגבלים ל-20MB לקובץ; לכן יש `reel_share.mp4` בקצב מוגבל. המאסטר באיכות מלאה נשאר בסשן.
- בתיקיית ההעלאות של השיחה לא היה סרטון מצולם (רק תמונות וקובץ אקסל), ולכן גרסת "חיתוך שתיקות וכתוביות מונפשות"
  נבדקה עם רשימת מילים כתובה ביד על סרטון קיים (בדיקת מנוע בלבד, לא נמסרה), והסרטונים שבמערכת נערכו ללא כתוביות כי אין בהם דיבור.

## עדכון לילה (3.10)
- **אפקטים**: קטלוג מלא ב-`video/engine/effects.py` (35 אפקטים: טקסט, גרפיקה, מסך מלא, אנרגיה, 6 סצנות, 9 מעברים, פאנץ' אין, פריים קפוא) ו-7 פריסטים.
  המנוע ממקם אוטומטית לפי התמלול: מספרים למונים או לסצנת מספר, ראשית/שנית לסצנת רשימה, משפט ארוך לסצנה קינטית, מעברים על החיתוכים,
  אימוג'י על המילה שלו. `python3 video/engine/reel.py catalog`.
- **בדף**: כל כפתור "ערוך כרילס" פותח גיליון בחירה (`v103.js`): סגנון, כל האפקטים כצ'יפים, הוק, קריאה לפעולה, מילות מפתח, אימוג'י.
  הבחירה נשלחת לרוטינה ב-JSON (preset, effects, hook, cta, keywords, emojis).
- **הרוטינה** רצה בסשן ללא ריפו, ולכן המנוע מגיע מתוך הארטיפקט: הקובץ המפורסם `video_engine_bundle.json` (76 קבצים, 4.6MB:
  מנוע, פונטים, לוגו, צלילים, הסקיל). להתעדכן: לבנות מחדש את הקובץ (docs/agents/video-editor/bundle.py) ולפרסם.
- **ניווט במובייל**: `v101.js` (כפתור חזרה מוצמד בכל חלון, חזרה של הטלפון סוגרת חלון), `v102.js` (היסטוריית עמודים, חץ אחורה בכותרת,
  תפריט בצד ימין בסרגל התחתון, הסרגל נעלם מתחת לכל חלון). בדיקת QA של סוכן נפרד: 18 עמודים, 7 חלונות, הכל עובר אחרי התיקונים
  (כותרת בשורה אחת גם עם חץ אחורה, סרגל הביטול מעל הסרגל התחתון, תווית "עוד" בצד הנכון).
- **מדיה**: 24 תמונות מהאתר וסרטון התדמית הועלו כנכסים ונרשמו באוסף `photos` (סוגים: site, render, drawing, people, brand).
  Google Drive: למחבר אין הרשאת קריאה (Insufficient scope), צריך לחבר מחדש את Google Drive בהגדרות claude.ai עם גישה לקבצים.
- **גיוון תמונות** (`v104.js`): מעבר אוטומטי פעם אחת שמחליף תמונות שחוזרות על עצמן בתמונה אחרת מאותו סוג, כפתור "גיוון תמונות"
  בגלריה, בסוכן וברעיונות, עם ביטול.

## עדכון בוקר (3.10, המשך)
- **גלילה במובייל מהשורש**: בטלפון הגוף של הדף כבר לא גולל; הגלילה היא בתוך `#appmain` (עמודה: כותרת, גוף גולל, סרגל תחתון).
  כך הכותרת, הסרגל והכפתורים המוצמדים נשארים במקום גם בתוך האפליקציה של Claude. כשגוללים למטה מופיע כפתור צף "חזרה ✕"
  שחוזר לעמוד הקודם (או לראש העמוד). האייקונים בסרגל אחידים (קו 1.9, 22px). הכפתור המוצמד של חלון בוחר פינה שלא מכסה כפתור אחר,
  ולא מופיע כשלחלון יש כפתור סגירה משלו בחלק העליון. (`v106.js`, `k106css.txt`)
- **מדיה נוספת**: 9 פריימים מובחנים מתוך סרטון התדמית (זיהוי חילופי סצנה) ו-15 לוגואים של שותפים נוספו לספרייה
  (סוג site ו-brand). Google Drive עדיין בלי הרשאת קריאה (Insufficient scope) בחיבור הזה.
- **פוסטים מתמונות חדשות** (`v107.js`): כל תמונה חדשה בספרייה עם פחות משני פוסטים מקבלת פוסטים על תבניות חזקות
  (משפחות היזמים, "מהמתחרים", מגזין), עם טקסט שמועתק מפוסט מאושר מאותו סוג (אין טקסט מומצא). פעם אחת אוטומטית אחרי טעינת
  הספרייה, וכפתור "פוסטים מתמונות חדשות" בגלריה, בסוכן וברעיונות.

## V108 · the editor on phones: no flash, a true full preview

Root cause of the "flash" on every tap: `peRender()` rebuilds the whole `#pe-root` and the `.pe` shell carries
`animation:pxIn` (opacity 0 to 1), so every tap replayed the entrance fade; the preview canvas was also blank
until `peDraw()` finished loading images. `v108.js` wraps `peRender`: the entrance animation runs only on open
(`#pe-root.v108live .pe{animation:none}`), every canvas (main preview, lighting tiles, layout thumbnails) is
copied into its replacement synchronously, and scroll positions (body, tool strip, tabs) are restored.
A full-screen preview (`#v108pv`) opens from the expand button on the canvas and from "מסך גדול": post view or
feed view (brand name + caption from the post itself), 4:5 / 1:1 / 9:16, slides, download, X, back gesture
and Escape close only the preview. Phone layout: save button shows when there is something to save,
preset tiles in two columns on narrow phones, quieter tool strip. Tests: `v108t.cjs` (phone), `v108d.cjs`.

## V109 · second QA pass on phones (agent report, all fixed)

- Back gesture double pop: V101 closed the window and V102 then also left the view. V101 now records the
  time it handled a popstate and V102 ignores a popstate within 900 ms of it (`build109.py`).
- Gallery: the selection strip (`.ga-selbar`) covered the bottom nav with "0 נבחרו". Hidden until a card is
  selected, and it sits above the nav when shown.
- Effects sheet: closing without sending left "ערוך כרילס" disabled forever (the promise never settled).
  The sheet now has an onCancel path that resolves it with null.
- Toolbar actions (בחר הכל, גיוון תמונות, פוסטים מתמונות חדשות) were 40 px icon boxes with overflowing labels;
  on phones they are labelled pills in their own toolbar row.
- The floating "חזרה" pill covered the "+" button; it now sits bottom left above the nav and hides while
  the selection strip is open.
- Agent status dot contrast, week/month segments 40 px tall, score caption 11 px, footer colour,
  checkbox/favourite buttons moved off the card's red rule, template shelf header stacks on phones.
- Known and left as is: chip rows (today KPIs, queue stats, gallery tabs) scroll sideways with a peeking item.

## V110 · the website's project media, in the library

The live site is blocked from the container, but its media lives in the Supabase project `kurkoos-cms`
(table `projects`: hero_image_url, about_image_url, environment.image, gallery[], videos[] of type file). The
inventory is in `site_media.json` (9 projects, 90 unique images, 15 mp4). `v110.js` inlines it and the user's
browser fetches each file (public storage, CORS open), downscales images to 2400 px, uploads to the artifact
asset store, writes `photos` docs (name, project key, kind render/site, tags website,<slug>,<status>, src) and
`videos` docs (source website, origin, status queued, brand auto; files over 20 MB are skipped and listed).
Deduplication by source URL, so re-running imports only what is new. After the images land, V107 builds two
posts per new photo and V104 diversifies repeated photos. Runs once automatically per version when the page
has the asset store, and from "ייבוא מהאתר" in the gallery, the videos room and the agent. Test: `v110t.cjs`
(mocked network and store).

V110b: a dump of the `photos` collection showed the browser pass had never run on the user's device, and a
query of `storage.objects` in the `media` bucket found 100 more images (40 KB and up, logos excluded) that no
project page links: activities, testimonials, before and after, covers, extra project and environment files.
They are listed in `site_media.json` under `extra` (path, project key, kind, name, tags; `base2` is the public
storage root) and `imageList()` appends them. Older CMS docs store a relative `src` (`projects/...`), so
deduplication now also compares the path after `/media/`. The auto-run flag moved to `ag_v110_done_v2`, and a
bar under the toolbar in the gallery and the agent (`#v110bar`, `k110css.txt`) shows how many website images
are still missing with an "ייבוא עכשיו" button, or explains that the import needs claude.ai with edit rights.
Test result: 137 images, 137 imported, 268 posts, nothing re-imported on the second run.

## V111 · speed and cache (measured on the phone profile, local server)

Measured first: boot transferred 13.6 MB (3.5 MB page, 2.5 MB template and copy JSON, about 8 MB of library
photos preloaded for every post by `preloadPosts(AG.posts)` after the uploads load), 1.1 s of long tasks,
2.6 MB of localStorage (posts and workflow versions), thumbnails 10 ms each cold and cached in memory only.
`v111.js`:
- `preloadPosts` is capped to the first 12 posts; thumbnails already load their photos lazily through the
  IntersectionObserver and `ensureImgs`, which now also fills `PHOTOS[p.id]` for legacy photoKey posts.
- `fetch` is fronted by the Cache API (`kc-cache-v1`) for same-origin photos, `/_blob/` assets, fonts and
  JSON (JSON is stale while revalidate, media is immutable). Second visit: 0.1 to 0.9 MB instead of 9 MB.
- Rendered thumbnails persist in IndexedDB (`kurkoos_thumbs`, key = `sigOf(post, slide)`, JPEG 0.82), so the
  gallery, queue and calendar paint from the store without fetching the full photos; an edit changes the
  signature, entries older than 45 days are pruned.
First boot now transfers 9.0 MB (page plus data plus the first screen's photos). Scripts: `perf1.cjs`,
`perf2.cjs`, `perf3.cjs`.

## V112 · imported batches become posts

Photos written straight into the shared `photos` collection (Google Drive import done from the session, the
website import, anything with a `batch` field) are turned into posts by the page itself: once per unseen batch
it builds two posts per new photo (V107) and swaps repeated photos (V104), then marks the batch in
localStorage. `drive_prep.py` turns the Drive inventory into an import plan (project from folder names, kind
render/site/ad, duplicates by title and size dropped, guide icons and logos skipped).

## V113 · the freezes (measured under 4x CPU throttling, the phone profile)

Profile of boot: 3.3 s inside `overflowOf` (the V73 clarity gate redraws every template post at 1080x1350 on
every load to check text overflow, in 9 ms slices every 40 ms, so a phone stutters for minutes), 1.4 s in
`stats` (logo auto placement reads four full corner regions with getImageData per draw). The website import
then ran `__v107.build` (3.7 s in one task) and `__v104.diversify` (4.3 s, `usage()` rescans every post for
every candidate) and two parallel downscale workers. Fixes in `v113.js` and `build113.py`:
- clarity verdicts persist in localStorage (`v73_ok_v1`, key = the gate's own signature) and are seeded into
  `p._ovk` before the pass, so a reload checks only posts that changed;
- `stats` samples a 24x24 downscale of each corner instead of the full region;
- `usage()` is memoised for 250 ms (diversify 4.3 s to 0.5 s);
- V107 `build` takes `keys` and `quiet`; `__v113.buildChunked` builds five photos per chunk with a 60 ms gap and
  renders once (worst task 3.7 s to 0.3 s); V110 and V112 use it;
- the import runs one file at a time, breathes 120 ms between files, pauses while the tab is hidden, reads
  image sizes from the file header and only downscales files over 1.5 MB or 2600 px; videos import
  automatically on desktops only (phones use the button).

## V115 · the photo library inside the editor

The image tab's "החלפת תמונה" section is now a browser over the whole library (built in set, website,
Google Drive, uploads): search, a source segmented control with counts, project chips with counts, kind chips
(only kinds that exist), and the photos grouped by project in collapsible sections (the post's project, or the
current photo's project, opens first; collapsed sections do not load their images). "הספרייה במסך מלא" opens
`#v115lib`: the same filters in a sticky header, a wide grid with captions (6 columns at 1366 px), one click
replaces the selected photo and closes. "העלאת תמונות" (multiple) uploads to the asset store, writes `photos`
docs filed under the post's project, registers them and picks the first. Back gesture and Escape close only the
library (V101 knows `#v115lib`). Test: `v115t.cjs` (phone and desktop, mocked store).

## V116 · the date a photo was already used

Every library tile in the editor (inline picker and full screen library) carries a badge with the earliest
scheduled or published post that uses the photo ("מתוזמן 12.10", "פורסם 24.9", "+2" when there are more),
the full list with post titles in the tooltip, and a switch "להסתיר תמונות שכבר בלוח" that hides them while
choosing. Source: `APP.sched.items` with a date, resolved through `itemPost` and `imgKeysOf`; items with
status sent or published count as published. Test: `v116t.cjs`.

## V117 · steady with 1,500 posts (speed, round two)

Measured with a library the size of the user's (380 Drive photos, 1,121 to 1,501 posts) and 4x CPU throttling.
Root causes: the V73 clarity gate drew a full 1080x1350 slide for every unchecked post in the background, about
55 slides a second, for minutes after each photo batch, also while the editor was open (a keystroke took 1.3 s);
`composerSave` re-rendered the hidden legacy agent list (1,500 cards) on every save (813 ms); `calPost(k)` scanned
all posts per call inside `check()`; the shape tab re-drew 46 full slides for its layout tiles on every render; and
the composer crashed on a post whose article has no title (`p.article.t`), so "שמור שינויים" did nothing.
`v117.js` and the source patches in `build117.py`:
- clarity check: queue from `__v117q` (nothing while the editor or composer is open; scheduled posts, then
  hand-made, then auto-built template posts; 40 per pass), 160 ms between slices, half-size canvas, a 10 s timer
  resumes idle passes; `window.__v117nocache` marks those draws
- `calPost` through a key index; the legacy `#agent` section is skipped while hidden and rendered once if shown
- `composerSave` wrapped: a thrown error is shown as a toast instead of a silent no-op
- `peLayThumbs` draws layout tiles from a 432x540 cache keyed by the clone's content (46 draws to 2)
- V31 cloud sync yields to the page every 120 posts; new photo batches build one post per photo (was two)
Test `v117t.cjs`: save 44 ms (was 813), zero background draws while editing, shape tab second open 2 draws.

## V118 · the editor on a desk

Desktop only (phones keep V108), `k118css.txt` and `v118.js`: paper background with the brand 60 px drawing
grid on the stage, the canvas uses the height, one white stage bar in two rows (expand, format, safe areas,
before/after, logo, animation; zoom, add text/image, reel), side panel 400 px on paper with white cards, Heebo
section headings with a red tick, the Claude rewrite card in night blue placed after the headline block, the
score header on paper instead of yellow, issue rows as cards. Test `v118t.cjs`: no page overflow, 7 tab columns,
rewrite card after the headline, no errors on 1440 and 1280 wide.

## V119 · speed, round three (phone profile, 4x CPU, 1,500 posts)

Measured with `boot.cjs` (boot: long tasks in the first 14 s) and `inter.cjs` (one number per interaction) after
seeding the storage like the user's. Root causes found this round and what changed (`v119.js`, patches in
`build119.py`):
- the two big storage keys (`ag_posts` 2.6 MB, `pro_wf` 1.4 MB, plus `app_sched`) were serialised and written
  inside every action; now they are flushed on idle time 3 s after the last change and on pagehide
- the V99 pencil decorated every thumbnail with a forced layout per card (2.4 to 3.9 s on the agent and ideas
  views); now an IntersectionObserver decorates cards as they scroll in
- film grain drew thousands of 1.5 px rectangles per slide (four renderers); now a 256 px noise tile per
  (alpha, seed, density) is drawn as a repeating pattern
- the quality score cache was cleared on every render by design; now its epoch changes only when posts or
  schedule items are added or removed, a photo is registered, or every 10 minutes, and an idle warmer fills it
  after boot so the first gallery open is warm
- the clarity gate's first pass waits 20 s after boot and later slices run on idle callbacks
- the V101 pinned close button computed overlays on desktops where it never shows; V117's hidden check and
  V118's desk check no longer force layout
- layout tiles in the shape tab are drawn at tile size (432x540) through a frame budgeted queue
- the editor photo library renders tiles only for open project sections; a closed section renders on open
Before and after (ms, sync part of the action): agent view 826 to 375, ideas 800 to 407, editor close 689 to
298, image tab 657 to 259, composer save 813 to 408, shape tab first open one 3.3 s task to 24 tasks under
350 ms; boot long tasks 4.6 s to 3.2 s (the remaining 2 s is parsing 3.2 MB of script, which only a smaller
page would change).

## V120 · closing the editor without saving changes nothing

Reported as a critical bug: edits made in the editor and not saved still changed the post. Cause: V82 (which
wraps every later module, since new modules are inserted before the V83 marker) saved on close with an undo
bar ("השינויים נשמרו בפוסט"). Now the V82 branch is off when V120 is present, and V120's outermost `peClose`
wrapper does this on a dirty close: keep the working copy as an in-memory draft, close with force (nothing is
applied, the post keeps its saved state), and show a bar "סגרת בלי לשמור. הפוסט נשאר כפי שהיה" with
"חזרה לעריכה", which reopens the editor on the same post and puts the draft back (waiting for the editor
since `peOpen` is asynchronous). Explicit save ("שמירה", "אישור") is unchanged. Test `v120t.cjs` on desktop and
phone: the post is unchanged after X, the bar restores the draft, save then applies, a second dirty close is
discarded; `v108t`/`v109t` still pass.

## V121 · the chosen time always wins in the composer

Report: picking a date in the composer did not move the post to it. With real clicks the main path worked
(schedule panel, date picker, "תזמן"), so the fix closes the paths around it: "הוסף לתור" used the next free
slot even when a time had been picked in the open schedule panel, and the date picker updated the composer only
through the input's events. Now `cqueue` saves to the picked time when there is one (`__v121.pickedAt()`), the
picker writes `APP.cmp.at` directly and turns the schedule on, a `change` on the time input does the same, and a
composer render that throws shows a toast instead of a stale footer. Test `bug5.cjs`: pick 23.10 18:30, save
through the queue path, the item lands on 2026-10-23T18:30.

## V122 · big previews when choosing a template or a shape

The full screen template picker (V66) and shapes library (V68) get a size control (קטן, בינוני, גדול; large by
default on desks, medium on phones, remembered in `v122_size`). Template tiles are drawn at 300, 440 or 640 px
wide to stay sharp. "תצוגה גדולה" (or a double click on a tile) opens a lightbox with the current choice at the
full screen height, with previous and next, arrow keys, Enter to apply and Esc to close only the lightbox (the
key handler is on `window` so it runs before the libraries' own Escape). Phone rules use `!important` to beat
an older two-column rule. Test `v122t.cjs`: desktop large 2 columns of 465 px, small 4; phone 1, 2 or 3
columns; lightbox 742 px tall on desktop; next and apply change the layout; Esc keeps the library open.

## V123 · the date picker on desks is a centred dialog

Report: the calendar did not open properly. Measured at 1576x923: the V44 picker opened as a 380x900 panel
pinned to the top of the screen beside the field, covering half of the composer. Now on screens wider than
700 px it is a centred 820 px dialog over a dimmed page (`box-shadow` backdrop, outside click still closes):
the month and quick chips on one side, hour, minutes and fine tuning on the other, the footer across.
`v123.js` re-wraps the picker's children after every redraw (a MutationObserver, since V44 rebuilds it with
innerHTML) and clears the inline position V44 sets; `k123css.txt` holds the layout. Phones keep the bottom
sheet. Test `pk.cjs`: desk 820x496 centred, phone sheet unchanged, picking 21.10 at 17:30 sets the composer to
2026-10-21T17:30 and closes the picker.

## V124 · design and function pass over every page

Inventory: 18 pages screenshotted on desk and phone (`ux_shots.cjs`), and `sweep.cjs` clicks every button
on every page except destructive or outward ones (518 clicks): no script errors. Fixed:
- page actions wrapped into two or three rows inside the header and pushed above the screen, shrinking
  "פוסט חדש" to 67 px; on desks they now sit on their own quiet row under the title (`.tbar.v124acts`)
- the gallery's 51 topic chips fold to two lines with "כל הנושאים (N)"; the selected chip stays visible
- video cards show a frame of the video instead of a black box (`#t=0.6`, preload metadata)
- settings: picking a time adds the slot at once; "+" with no time opens the picker; the Google AI card
  spans the column
- agent: an empty command focuses the field and explains what to write; the uploads "צור סדרה" says when
  there are no new materials instead of claiming drafts were made
- the fonts table scrolls inside its card on phones; the website import notice uses the calm teal style
Regressions `v108t`, `v118t`, `v120t`, `v122t` pass.

## V125 · the video studio kit's elements in every post image

Source: the video-studio skill's animation kit (`.claude/skills/video-studio/assets/remotion-kit/src/kit`),
whose overlays and looks only existed for video. `v125.js` redraws the still-image ones on canvas, in brand
colours, as a new shapes-library category "אלמנטים מהסטודיו" (269 elements), so they appear in the shape tab,
the full screen shapes library (V68, V122 sizes) and are draggable like any decoration:
- marker arrow (kit `Arrow`): curved marker stroke with an open head, from each corner toward the centre
- hand-drawn circle (kit `Circle`): ellipse overshooting its start by 15%, around the middle, top, under the
  headline or the bottom
- step progress bar (kit `ProgressBar`, frozen): five segments filled right to left, step 1 to 5, top or bottom
- sparkles and brand-colour confetti (kit `Burst`, frozen mid-flight) from a corner
- light leak (kit `LightLeak`): warm, gold or mist glow screened over a corner
- colour wash (kit `Wash`, multiply) in night blue, Kurkoos red or teal; vignette (kit `Vignette`)
- label stickers (kit `Callout` as a sticker): חדש, לפני, אחרי, בבנייה, נמסר, למכירה, טיפ, שאלה, in Heebo 900
The kit's colour looks (`looks.ts`) join the lighting presets, mapped onto the editor's adjustment scale:
טבעי חד, פאנצ'י, קולנועי, וינטג', ניאון, שחור לבן דרמטי. Test `v125t.cjs`: every family draws, the
"קולנועי" look applies {c:12,s:-14,w:8,b:-4,v:40}, the library lists 269 tiles; `v108t`, `v120t`, `v122t` pass.

## V126 · professional edit steps in the video room

A panel under the auto editor ("שלבי עריכה מקצועית"): cut silences and repeated takes, 9:16 face tracking, brand
colour (off, soft, mid, strong), captions (off, white pill, kinetic) with an accent colour, loudness at -14 LUFS, and
"show me before rendering". Saved in `vid_pro`; `__vid.queueDoc` is wrapped so every queued video carries
`pro: {steps, ...}`, which `video/engine/pro.py` runs in order (cut, reframe, grade, captions, loudness). The guide's
prompts live in `.claude/skills/kurkoos-video-pro/references/`. Test `v126t.cjs` on desk and phone.
