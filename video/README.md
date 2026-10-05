# מנוע עריכת הווידאו של קורקוס

סקריפט Python שמרכיב כל פריים בעצמו עם OpenCV ו-numpy ומחבר תמונה וסאונד עם ffmpeg. העברית מצוירת עם Pillow
ומנוע הפריסה RAQM בפונט המותג (אלמוני, הומר מ-woff2 ל-ttf), כך שהיא יוצאת מימין לשמאל ולא הפוכה. בלי cv2.putText לעברית.

## קבצים
| קובץ | תפקיד |
|---|---|
| `engine/reel.py` | הצינור כולו: `edit` (תמלול, חיתוך שתיקות, מסכת דמות, תוכנית, רינדור מקבילי, אודיו, לאודנס), `check` (בדיקת עורך), `words` (טבלת מילים) |
| `engine/transcribe.py` | תמלול ברמת מילה: ivrit.ai מקומי (faster-whisper), או Deepgram / Groq / OpenAI עם מפתח, או ייבוא קובץ מילים. בלי מקור אמיתי: סטטוס unavailable, לעולם לא תמלול מומצא |
| `engine/timemap.py` | מפת זמן בין המקור לסרטון הסופי: חיתוך שתיקות (לא בתוך מילה, קצה בנקודה השקטה, עיגול לפריימים), פריים קפוא, ואותה מפה חותכת גם את הסאונד |
| `engine/person.py` | מסכת האדם בכל פריים עם rembg (u2net_human_seg), פעם אחת, לקובץ npz |
| `engine/hebtext.py` | טקסט עברי: מדידה, ציור, עטיפה, הדבקה עם אלפא |
| `engine/media.py` | ffmpeg (מצורף דרך imageio-ffmpeg), probe, חילוץ אודיו, מעטפת dB, גיליון קונטקט |
| `fonts/` | Almoni 300/400/700 (ttf) ו-Heebo (גיבוי) |
| `assets/` | הלוגו המלא, לבן ושחור |
| `sfx/` | ספריית צלילים CC0 (מהסקיל video-studio) |

## הרצה
```
pip install numpy opencv-python-headless pillow imageio-ffmpeg python-bidi scipy fonttools brotli "rembg[cpu]" onnxruntime faster-whisper
python3 video/engine/reel.py words clip.mp4                                   # טבלת מילים ושניות
python3 video/engine/reel.py edit clip.mp4 --out video/out/clip --style clean  # גרסה ראשונה: חיתוך שתיקות, כתוביות מונפשות, לוגו, 9:16
python3 video/engine/reel.py check video/out/clip                             # בדיקת עורך: גיליונות קונטקט 6 פריימים לשנייה, פריים שיא לכל אפקט, טבלה
```
אפשרויות: `--style clean|punchy|cinematic`, `--hook "..."`, `--cta "..."`, `--keywords מילה,מילה`, `--brand auto|full|none`
(full = לוגו פתיחה ושורת מותג; none לסרטונים שהמערכת רינדרה ושכבר נושאים אותם), `--engine local|deepgram|groq|openai`,
`--words file.json` לייבוא תמלול שנעשה במחשב אחר (למשל עם הסטודיו של הסקיל על מק).

## מה יוצא בתיקיית הפרויקט
`words.json`, `timemap.json`, `mask.npz`, `plan.json` (כל אפקט עם המילה שלו והשנייה הסופית), `reel.mp4` (מאסטר 1080x1920, 30fps, H.264 crf 18, AAC 48kHz, ‎-14 LUFS), `reel_share.mp4` (עותק להעלאה,
קצב מוגבל כך שדקה נשארת מתחת ל-20MB), `sheet_*.png` (גיליונות קונטקט), `peak_*.jpg`, `qa.md`.

## הכללים שהמנוע שומר בעצמו
- כל אפקט ממוקם לפי המילה שלו במקור ועובר דרך מפת הזמן, הסאונד נחתך באותה מפה, כך שהכול נשאר מסונכרן.
- כתוביות קריוקי (עד 3 מילים בעמוד, המילה הפעילה באדום קורקוס, מילות מפתח בתכלת) מתחת לסנטר לפי מסכת הדמות.
- טקסט על המסך רק מהתמלול, מההודעה של המשתמש או משורות המותג הקבועות. אין מספרים או ציטוטים מומצאים.
- כל רינדור נבדק בגיליון קונטקט לפני מסירה (`check`).

## תמלול: מה זמין איפה
- במחשב של חבר הצוות (מק או ווינדוס): הסקיל `video-studio` מתקין את ivrit.ai מקומית, חינם ופרטי.
- בסשן בענן של Claude Code: huggingface.co חסום, ולכן ivrit.ai לא ניתן להורדה שם. פתרונות: מפתח Deepgram (או Groq / OpenAI)
  בקובץ `video/api-keys.txt` בשורה `DEEPGRAM_API_KEY=...` (לא נכנס לגיט, ראו .gitignore), או תמלול במחשב ושליחת `words.json`.
- סרטון בלי דיבור: המנוע עובד בלי כתוביות (לוגו, מסגרת, מעברים, אאוטרו) ומסמן זאת בבדיקה.

## המנגנון במערכת (ארטיפקט)
- עמוד "סרטונים ורילס": כל סרטון שנכנס (העלאה, שיבוט ממתחרים, הנפשה) נשמר כנכס, נרשם באוסף `videos`, ונשלח לרוטינה
  "קורקוס: עורך הווידאו (רילס אוטומטי)" (`trig_01E37BdRRUdgin2XXQVpx7hN`, מודל claude-opus-5-5), שמריצה את המנוע,
  בודקת כמו עורך, מעלה את הרילס כנכס ומעדכנת את הסטטוס. כפתורי "ערוך כרילס" בחדר העריכה ובחלון ההנפשה.

## עריכה מקצועית (הסקיל kurkoos-video-pro, לפי המדריך)
שבעה תהליכים, כל אחד עם הפרומפט המקורי בקובץ משלו ב-`.claude/skills/kurkoos-video-pro/references/`, ומודול במנוע:

| מודול | מה הוא עושה | נבדק |
|---|---|---|
| `engine/cut.py` | שתיקות (silencedetect ‎-35dB מ-0.15 שנ׳), "אה" ו"אמ" (גם קול בלי מילה), מילה שנתקעה, טייק כפול ומשפט שננטש; 0.1 שנ׳ בכל חיבור ו-0.05 בקצוות; חיתוך בתוך שקט ובפריים שלם; מעבר ffmpeg אחד עם fade של 30ms; זמני מילים מחושבים מהמקור; בדיקה שאין שקט מעל 0.2 שנ׳; הצעות זום 12% | 14.0 ← 7.2 שנ׳, כל נקודות החיתוך בשקט |
| `engine/captions.py` | כתוביות בעברית כקומפוזיציה של HyperFrames: גלולה לבנה או קינטיות, Rubik מ-npm, span לכל מילה עם dir=rtl, gap, x בין 140 ל-940, בדיקת פריימים אחרי רינדור | 300 פריימים, אף פריים בלי כתובית |
| `engine/reframe.py` | 9:16 עם מעקב פנים (MediaPipe 0.10.35, VIDEO), אזור מת 8%, קפיץ בלי חריגה, קפיצה בחיתוך חד, גיליון 6 פריימים, תצוגה של 10 השניות עם הכי הרבה תנועה | פנים ב-419 מתוך 419 פריימים, חיתוך חד נתפס |
| `engine/grade.py` | LUT בזווית UV בלי לגעת בלומה, הגנה על העור (מסכת ImageSegmenter, מחלקות 2 ו-3), משיכה למותג עד 30°, שלוש עוצמות | עור L* ‏0.95, C* ‏+20%, YAVG ‏0.6% |
| `engine/loudness.py` | ‎-14 LUFS בשני מעברים linear, מגביל ב-192kHz עם level=false בלולאה עד linear, אפקטים ב-6 שלבי highpass 200, מוזיקה מתחת לדיבור עם sidechain | ‎-14.00 LUFS, שיא ‎-1.61 |
| `engine/replace_line.py` | החלפת משפט: חיתוך על שקעי העוצמה, התאמת רעש, EQ של 80% מההפרש, עוצמה מול 10 השניות שלפני, fade של 40ms, הזזת מה שבא אחרי | חיבורים בלי קפיצה, ‎+0.35 שנ׳ |
| `engine/pro.py` | מריץ את השלבים שנבחרו בחדר הסרטונים בסדר הנכון; עם `--review` עוצר אחרי התוכנית של כל שלב | שרשרת מלאה: 1080x1920, ‎-14.03 LUFS |

התקנה: `cd video && npm install` (HyperFrames 0.8.121, GSAP, Rubik), `npx hyperframes browser ensure`, ffmpeg במערכת;
`python3 -m venv video/.mpvenv && video/.mpvenv/bin/pip install mediapipe==0.10.35 opencv-python-headless pillow numpy`
(בלינוקס גם `apt-get install libgles2 libegl1`). המודלים של MediaPipe יורדים לבד ל-`engine/models/` בהרצה הראשונה.
תמלול: `npx hyperframes transcribe` צריך את whisper.cpp ואת המודל מ-Hugging Face, שחסומים בסביבת הענן; שם עובדים עם
`engine/transcribe.py` ומפתח ענן, או עם קובץ מילים מהמחשב של המשתמש.

### אנימציה שקופה מעל הסרטון (`engine/overlay.py`)
כרטיסים קטנים עם מילה ואייקון שנכנסים בדיוק כשהמילה נאמרת, לפי קובץ המילים. משטחים אטומים ב-88%, טקסט אטום, קפיץ ואז עצירה,
ובפורמט לאורך לא מעל y 300. יוצאים `.mov` שקוף (ProRes 4444, `yuva444p12le`), בדיקה מעל ירוק מלא, ו-MP4 על גוון כהה של המותג.
```
python3 engine/overlay.py --words clip.words.json --card "פרומפט:chat" --card "סקילים:layers" --size 1080x1920 --side left --snap
python3 engine/overlay.py --words clip.words.json --card "פרומפט:chat" --card "סקילים:layers" --size 1080x1920 --side left --render
```

## סטודיו אנימציה (הסקיל animation-studio)
אנימציות מלאות מאפס עם טקסט בעברית, 8 סגנונות (הפרומפטים המקוריים ב-`.claude/skills/animation-studio/references`).
כל אנימציה היא דף ב-`studio/<סגנון>/index.html` שמחשב את הכל מ-`seek(t)` (`studio/lib/studio.js`, פונטים מקומיים ב-`studio/lib/fonts.css`).
המנוע המשותף `engine/anim_render.cjs` מצלם את הדף ב-240 צילומים לשנייה ישר ל-ffmpeg, ממזג כל 4 (`tmix`) ומוציא MP4 ב-60fps:
```
node engine/anim_render.cjs studio/kinetic/index.html --stills            # פריים לכל שלב + גיליון, לאישור
node engine/anim_render.cjs studio/kinetic/index.html --check             # אף מילה לא נוגעת ולא יוצאת מהאזור הבטוח
node engine/anim_render.cjs studio/kinetic/index.html --preview -o a.mp4  # סבב בדיקה זול: חצי גודל, 30fps
node engine/anim_render.cjs studio/kinetic/index.html -o a.mp4 [--config input.json] [--audio song.wav]
```
תבניות בנויות: `studio/kinetic` (כותרות ענק על צבעים מתחלפים) ו-`studio/particles` (מילה שמתפרקת לחלקיקים, כדור, גלקסיה וחזרה).

## אפקטי חתימה על המילים (`engine/signature.py`)
18 אפקטים מהמדריך, כל אחד על המילה שלו עם צליל משלו באותו פריים: פתיחה אפורה וסלאם, כותרת תלת־ממדית, התנפצות וורונוי,
יציאה מהמסגרת, היפוך תלת־ממדי, עולמות (חלל, מתחת למים, עיר עתידנית, מצוירים בקוד או מתמונות), עצירת זמן עם פלייט נקי
ופרלקסה, ענק מעל עיר מיניאטורית, פירוק לפיקסלים, זום אינסופי לטלפון, קובייה עם ארבעה כרטיסים, חותמות ומונה שצונח לאפס,
תגובה והודעה פרטית, הולוגרמה, מונה עוקבים, חותמת זהב, כפתור עקוב, והרצה לאחור בסגנון קלטת שסוגרת לולאה.
```
python3 engine/signature.py sfx                       # הצלילים, מסונתזים בקוד (בלי זכויות של אחרים)
python3 engine/reel.py edit clip.mp4 --out out/x --sig sig.json --music bed.wav --plan-only   # תוכנית לאישור
python3 engine/reel.py edit clip.mp4 --out out/x --sig sig.json --music bed.wav               # רינדור אחרי אישור
python3 engine/reel.py check out/x                    # גיליון לכל אפקט, פריים שיא, טבלת אפקט, מילה, פריים וצליל
python3 tools/fx_previews.py --clip c.mp4 --words w.json --mask m.npz --out fx   # תצוגות לגלריה במערכת
python3 tools/make_bundle.py video_engine_bundle.json # החבילה שהעורך בענן פורס
```
המוזיקה שותקת בהשחרה שלפני העולמות ובעצירת הזמן; המיקס מנורמל ל-14- LUFS.
