---
name: kurkoos-video-pro
description: "High-end Hebrew video editing for Kurkoos Group: cut silences, fillers and repeated takes; Hebrew captions (white pill or kinetic); 9:16 reframe that keeps the face in frame; brand colour grade with skin protection; loudness at -14 LUFS with clean effects and ducked music; replace one wrong sentence with a new recording; effects placed on the words that asked for them. Use for any request to edit, cut, caption, reframe, colour, master, fix or animate a video or reel: תערוך סרטון, תחתוך שתיקות, כתוביות, ריל, 9:16, צבע מותג, עוצמת קול, תחליף משפט, אפקטים."
---

# עורך הווידאו של קורקוס (רמה מקצועית)

שמונה תהליכים ו-18 אפקטי חתימה, כל אחד עם הפרומפט המקורי מהמדריך בקובץ משלו ועם מודול במנוע (`video/engine`). קוראים את הקובץ של
התהליך לפני שמתחילים, ושומרים על הסדר שלו: קודם שואלים על הקלט, אחר כך מראים תוכנית או תצוגה, ורק אחרי אישור מרנדרים.

| בקשה | קובץ | מודול |
|---|---|---|
| חיתוך שתיקות, "אה" ו"אמ", טייקים כפולים | `references/01-cut.md` | `cut.py` |
| כתוביות בעברית: גלולה או קינטיות | `references/02-captions.md` | `captions.py` (HyperFrames) |
| 9:16 עם הפנים תמיד בפריים | `references/03-reframe.md` | `reframe.py` (MediaPipe) |
| צבע מותג עם הגנה על העור | `references/04-grade.md` | `grade.py` (MediaPipe + LUT) |
| עוצמה -14 LUFS, אפקטים בלי בס, מוזיקה מתחת לדיבור | `references/05-loudness.md` | `loudness.py` |
| החלפת משפט בהקלטה חדשה | `references/06-replace-line.md` | `replace_line.py` |
| אפקטים לפי מה שנאמר בצילום | `references/07-voice-directed-effects.md` | סקילים `hyperframes*` |
| אנימציה שקופה מעל הסרטון, כרטיס על כל מילה | `references/08-transparent-overlay.md` | `overlay.py` (HyperFrames MOV) |
| **פרומפט הבסיס: המנוע (תמיד ראשון)** | `references/10-base-engine.md` | `reel.py`, `timemap.py`, `person.py`, `hebtext.py` |
| כל האפקטים על המילים שלהם (בקשה מרוכזת) | `references/11-all-effects.md` | `signature.py` |
| פתיחה אפורה וסלאם | `references/12-opening-slam.md` | `opening` |
| כותרת תלת־ממדית | `references/13-title-3d.md` | `title3d` |
| התנפצות זכוכית | `references/14-shatter.md` | `shatter` |
| יציאה מהמסגרת | `references/15-pop-out.md` | `popout` |
| היפוך תלת־ממדי | `references/16-flip.md` | `flip` |
| עולמות | `references/17-worlds.md` | `worlds` |
| עצירת זמן | `references/18-time-freeze.md` | `freeze` |
| ענק | `references/19-giant.md` | `giant` |
| פירוק לפיקסלים | `references/20-pixel-break.md` | `pixel` |
| זום אינסופי | `references/21-infinite-zoom.md` | `zoom` |
| קובייה | `references/22-cube.md` | `cube` |
| חותמות וכסף | `references/23-money.md` | `money` |
| תגובה והודעה | `references/24-comment-dm.md` | `comment` |
| הולוגרמה | `references/25-hologram.md` | `hologram` |
| סיום: מונה, חותמת זהב, עקוב | `references/26-finale.md` | `goal`, `gold`, `follow` |
| הרצה לאחור VHS | `references/27-rewind.md` | `rewind` |
| הסאונד | `references/28-sound.md` | `signature.py sfx`, מיקס ב-`reel.py` |
| בדיקת עורך | `references/29-review.md` | `reel.py check` |

## מצב תוכנית: אישור לפני רינדור
כל עבודה מתחילה בפרומפט הבסיס, ואז בתוכנית בלבד:
```
python3 video/engine/reel.py edit clip.mp4 --out out/x --sig sig.json [--music bed.wav] --plan-only
```
זה כותב `plan.md` (טבלת המילים והשניות, כל אפקט עם המילה והזמן, חפיפות ודילוגים) ו-`plan_preview.png` (פריים מהרגע החזק של
כל אפקט, מאותה פונקציית פריים של הרינדור). מראים למשתמש ומחכים לאישור. רק אחרי אישור: אותה פקודה בלי `--plan-only`,
ואז `reel.py check out/x` ובדיקה של כל `sheet_sig*.png` ו-`peak_sig*.jpg`. `sig.json` הוא רשימה של `{kind, word, ...}`;
`python3 video/engine/signature.py catalog` מדפיס את כל הסוגים והפרמטרים. אפקט שהמילה שלו לא בתמלול מדולג ומדווח.

סדר מומלץ לסרטון מלא: חיתוך → החלפת משפט (אם צריך) → 9:16 → צבע → כתוביות → עוצמה. הכתוביות והאפקטים נבנים מזמני
המילים שחושבו בחיתוך, ולעולם לא מתמלול מחדש של קובץ חתוך.

## לפני שמתחילים
- מה צריך להיות מותקן: `cd video && npm install` (HyperFrames, GSAP, Rubik); ffmpeg ו-ffprobe ב-PATH; `npx hyperframes browser ensure`;
  ל-MediaPipe: `python3 -m venv video/.mpvenv && video/.mpvenv/bin/pip install mediapipe==0.10.35 opencv-python-headless pillow numpy`
  (בלינוקס גם `apt-get install libgles2 libegl1`). הבדיקה: `npx hyperframes doctor`.
- תמלול: `npx hyperframes transcribe <file> --language he --model large-v3` צריך את whisper.cpp ואת המודל מ-Hugging Face. בסביבת
  הענן של Claude Code הם חסומים, ושם משתמשים ב-`video/engine/transcribe.py` עם מפתח Deepgram, Groq או OpenAI, או בקובץ מילים
  שנוצר במחשב של המשתמש. לעולם לא ממציאים תמלול.
- סקילים קשורים שמותקנים בריפו: `hyperframes` (נקודת כניסה), `hyperframes-cli`, `hyperframes-core`, `hyperframes-animation`,
  `hyperframes-keyframes`, `hyperframes-audio`, `hyperframes-creative`, `hyperframes-registry`, `hyperframes-studio`, `media-use`
  (כולל `transcript-cut --plan`), ו-`video-studio` (ספריית סאונד ואנימציה), ו-`animation-studio` (אנימציות מלאות מאפס, 8 סגנונות).

## כללי המותג בכל סרטון
- טקסט על המסך רק ממה שנאמר, מההודעה של המשתמש או משורות המותג הקבועות. בלי מספרים או ציטוטים מומצאים.
- צבע הדגשה: אדום קורקוס `#a90b0c`. צבע לדחיפת גוון: טורקיז `#105572` (האדום קרוב לגוון העור).
- בלי מקפים כסימן פיסוק בכתוביות.
- לא מפרסמים ולא מתזמנים לרשתות. מוסרים קבצים.
