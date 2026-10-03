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
