---
name: animation-studio
description: "סטודיו אנימציה: studio level motion graphics built from code with Hebrew text, delivered as a 60fps MP4. Eight styles: UI that morphs, huge kinetic headlines on hard-cut colour, a word that breaks into particles, text rings, a hand-drawn doodle character, a flat explainer illustration, glowing neon branches, a pencil blueprint that turns 3D. Use when asked for an animation from scratch: תיצור לי אנימציה, אנימציה ברמה של סטודיו, פתיח לריל, כותרות קינטיות, לוגו מתפרק לחלקיקים, אנימציה מסבירה. For editing footage that was already shot use kurkoos-video-pro instead."
---

# סטודיו אנימציה

כל אנימציה היא דף אחד שבו המיקום של כל דבר נקבע לפי השנייה: פונקציה `seek(t)`, בלי טיימרים, בלי CSS transitions ובלי מצב
שנשמר בין פריימים. המנוע מצלם את הדף ומחבר ל-MP4 ב-60 פריימים לשנייה, עם 4 צילומי ביניים בכל פריים שממוזגים לטשטוש תנועה.

## הזרימה (לא מדלגים על שלב)
1. **שואלים איזה סגנון**, אם לא נאמר. מציגים את שמונת הסגנונות בטבלה למטה.
2. **קוראים את קובץ הסגנון** ב-`references/` ושואלים בדיוק את שאלות ה-`<קלט>` שלו.
3. **מראים תוכנית לפני קוד**, לפי ה-`<התחלה>` של הסגנון: טבלת גריד, רשימת שלבים עם זמנים, חלוקת מילים לטבעות וכו'.
   לא כותבים שורת קוד לפני אישור. תיקון של רשימה לוקח דקה, תיקון של אנימציה גמורה לוקח שעה.
4. **בונים** ב-`video/studio/<סגנון>/index.html` על `video/studio/lib` (ראו "החוזה" למטה). אם יש תבנית בנויה, מתחילים ממנה.
5. **פריים לכל שלב** לפני רינדור מלא, ומראים את גיליון הפריימים:
   `node video/engine/anim_render.cjs video/studio/<סגנון>/index.html --stills --config input.json -o out/<שם>.mp4`
6. **בדיקה**: אם לדף יש `check(t)`, מריצים `--check` על כל הפריימים ומתקנים עד 0 בעיות.
7. **סבב בדיקה בזול**: `--preview` (חצי גודל, 30fps, בלי טשטוש תנועה). את הגרסה המלאה מרנדרים רק בסוף.
8. **רינדור מלא**: `node video/engine/anim_render.cjs ... -o out/<שם>.mp4` (אפשר `--audio song.wav`). הדוח מחזיר
   ffprobe (1080x1920, yuv420p, 60/1) ובדיקת הבזקים: אף שנייה עם יותר משלושה הבזקים (קפיצה של יותר מ-2% בבהירות).

| סגנון | קובץ | תבנית בנויה |
|---|---|---|
| ממשק שמשנה צורה, להדגמת מוצר | `references/01-ui-morph.md` | אין עדיין |
| כותרות ענק על רקע צבעוני, לפתיחים | `references/02-kinetic-headline.md` | `video/studio/kinetic/` |
| מילה שמתפרקת לחלקיקים, להצגת מותג | `references/03-particle-word.md` | `video/studio/particles/` |
| טקסט שנסגר לטבעות מסתובבות | `references/04-text-rings.md` | אין עדיין |
| דמות מצוירת ביד, למסר קליל | `references/05-doodle-character.md` | אין עדיין |
| איור שטוח שמסביר תהליך | `references/06-explainer-illustration.md` | אין עדיין |
| ענפי ניאון זוהרים, לרגע דרמטי | `references/07-neon-branches.md` | אין עדיין |
| שרטוט עיפרון שהופך לתלת ממד | `references/08-blueprint-to-3d.md` | אין עדיין |

במדריך המקורי כתוב "9 פרומפטים", אבל בטקסט שהודבק היו שמונה. אם המשתמש מביא את התשיעי, מוסיפים אותו כ-`09-*.md` באותו מבנה.

## החוזה של דף (`video/studio/lib/studio.js`)
```js
Studio.define({w, h, duration, stages:[{t, label}], fonts:['900 100px "Noto Sans Hebrew Var"'], build, seek, check})
```
- `Studio.config(defaults)` ממזג את הקלט מ-`--config input.json`.
- `Studio.step(t, {f, z})`: קפיץ בנוסחה סגורה. `Studio.track(t, [[t0,v0],[t1,v1],...])`: ערך שמשנה יעד, קפיץ אחד לכל שינוי.
- `Studio.hash(n)` לרעד ולריצוד (מספר הפריים המוצג `Math.round(t*60)` או צעד `Math.floor(t*10)`), `Studio.rng(seed)` רק בזמן הבנייה.
- הפונטים מקבצים מקומיים בלבד (`video/studio/lib/fonts.css`): Noto Sans Hebrew משתנה עם `wght 100..900` ו-`wdth 62.5..100`
  (גם ה-subset הלטיני, בשביל `·`), Rubik 700/800, Amatic SC 700 עברית ולטינית, JetBrains Mono לתוויות טכניות.
  `define` מחכה ל-`document.fonts.load` ונכשל בקול אם פונט לא נטען, כדי שכרום לא יעבור בשקט לפונט אחר.
- `check(t)` מחזיר רשימת בעיות לפריים (מילים שנוגעות, יציאה מהאזור הבטוח). המנוע מריץ אותו עם `--check`.

## שלוש טעויות שהורסות אנימציה בעברית
1. מילה שנחשפת מאחורי קו חיתוך (mask): בעברית החלק העליון של האותיות נראה כמו שורת מקפים. כל מילה נכנסת שלמה, עולה קצת,
   וה-opacity שלה עולה מ-0 ל-1.
2. להתחיל לכתוב קוד לפני שהרשימה אושרה.
3. לרנדר כל בדיקה באיכות מלאה. בסבבים: `--stills` ו-`--preview`. מלא רק בסוף.

## כללי קורקוס
- טקסט על המסך רק מהמשתמש או משורות המותג. בלי מספרים, ציטוטים או טענות מומצאים.
- בלי מקף בין שתי מילים. `dir="rtl"` לא על תגית ה-html; ב-canvas `ctx.direction = 'rtl'`; ב-SVG כל מילה ב-`<text direction="rtl">`.
- צבעי המותג כשמבקשים "בצבעים שלנו": `#07293a` כחול לילה, `#105572` טורקיז, `#8fb6c8` ערפל, `#f7f8fa` נייר, `#a90b0c` אדום.
- מוסרים קובץ. לא מפרסמים ולא מתזמנים לרשתות.

## התקנה
`cd video && npm install` (playwright-core, הפונטים), ffmpeg ו-ffprobe ב-PATH. כרומיום: `/opt/pw-browsers` בענן, או
`KURKOOS_CHROME=/path/to/chrome`. מהירות: בערך 2 דקות לכל 8 שניות של 1080x1920 ברינדור מלא בענן.
