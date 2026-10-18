# פיקוח: ריל לידים לקבוצת קורקוס

ריל 9:16 של כ-54 שניות על שכינתא, זרוע הפיקוח של קבוצת קורקוס, בצבעי המותג ובפונט Almoni. דיבוב Gemini (Charon), כתוביות זהות לקול, חיתוך בכל משפט מאחורי סרגל קנה מידה שגורף את הגיליון, מוזיקה מקורית מתחת לקול, וכרטיס סיום עם "דברו איתנו", הטלפון והאתר (כ-6 שניות על המסך).
המבנה: כאב של מי שבונה בית פרטי, מה הפיקוח עושה במילים של האתר, שלומי וארבע החטיבות תחת קורת גג אחת, וקריאה לפעולה.

## הפקה

```bash
python3 video/studio/pikuach/tts.py        # קריאה אחת רציפה מ-Gemini, חלוקה לשורות, voice/voice.wav ו-voice/timings.js
python3 video/studio/pikuach/music.py      # music.wav, מתוזמן לחיתוכים מתוך timings.js
cd video
node engine/anim_render.cjs studio/pikuach/index.html --check    # בדיקת גיאומטריה על כל פריים
node engine/anim_render.cjs studio/pikuach/index.html -o ../out/pikuach_video.mp4
cd ..
ffmpeg -y -i out/pikuach_video.mp4 -i video/studio/pikuach/music.wav -i video/studio/pikuach/voice/voice.wav -filter_complex \
 "[1:a]volume=0.5[m];[2:a]asplit[v1][v2];[m][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];[md][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart kurkoos-pikuach.mp4
# הכריכה: צילום של cover.html בגודל 1080x1920 -> kurkoos-pikuach-cover.png
```

- `lines.py`: הטקסט המדובר (מספרים במילים) והכתובית (~ מסמן מילה באדום, | מפצל כתובית לחלקים).
- `tts.py`: כמו ב-sirtut, עם שני שינויים. Gemini כמעט לא עוצר בין שורות יותר מאשר בפסיק, ולכן השורות נמצאות ביישור: מכל ההפסקות נבחרות אלה שנותנות לכל שורה אורך קרוב לחלקה בטקסט, עם עדיפות להפסקות ארוכות. `BREAK_FIX` מתקן שבירה אחת (בין שורה 13 ל-14) שנמצאה בתמלול בדיקה של כל שורה חתוכה. ניקוד לשמות: שכינתא, ראיתה, מנכ"ל ועוד. קצב x1.15, הפסקות 0.28 שנייה.
- `index.html`: סצנה לכל משפט. `check(t)` בודק טקסט על טקסט, טקסט על קווי שרטוט (כל מה שמסומן `.ln`, עם מרווח 24 פיקסלים), כל דבר מתחת לכתובית (מרווח 50 פיקסלים) וטקסט שנחתך בקצה. 0 בעיות על 1,614 פריימים.
- `shlomi.png`: התמונה של שלומי מ-public/team-shlomi.webp, מוקטנת. `logo.png`: מ-sirtut (לבן, רק על כחול לילה).

## העובדות ומקורן

| בסרטון | מקור |
|---|---|
| "הטעויות היקרות בבית פרטי נעלמות מהעין תוך ימים: ברזל שלא לפי התוכנית, שרוול שנשכח בתקרה, איטום שכוסה בלי בדיקת הצפה. כל אחת זולה לתיקון כשהיא גלויה, ויקרה מאוד אחרי שנסגרה בבטון או בקיר." | src/content/supervision/2026-10-11-mechir-pikuach-bniya.js, שורה 68 |
| "בלי גורם מקצועי מטעם המזמין, האינטרס של הקבלן הוא שיקבע בשטח." | src/data/divisions.js, supervision, שאלה "למה חשוב פיקוח בנייה מטעם המזמין?" |
| שכינתא, זרוע הפיקוח של קבוצת קורקוס | src/data/divisions.js (seoDescription, answer), index.html (שכינתא, ProfessionalService) |
| "המפקח הוא העיניים המקצועיות של המזמין באתר" | src/data/divisions.js, supervision, שאלה "מה עושה מפקח בנייה?" |
| בדיקות בשלבים הקריטיים כמו יציקות ואיטום, בדיקת חשבונות הקבלן לפני תשלום, מעקב לוח זמנים, ליווי המסירה עם פרוטוקול מסירה, גם כשקבלן אחר בונה את הבית | src/data/divisions.js, supervision, שאלה "האם אפשר לקבל פיקוח על בניית בית פרטי?"; "מעקב לוחות זמנים ותקציב" מהשאלה "מה כולל פיקוח על פרויקט בנייה?" |
| שלומי קורקוס, מנכ"ל ומייסד | src/data/team.js (role: 'מנכ"ל ומייסד'), public/llms.txt ("מייסד ומנכ"ל: שלומי קורקוס"), index.html (disambiguatingDescription) |
| הקבוצה בראשות שלומי קורקוס | public/llms.txt ("בראשות שלומי קורקוס") |
| ארבעה תחומים תחת קורת גג אחת | public/llms.txt, שורת הפתיחה |
| החטיבות: היזמות, הביצוע, הפיקוח, התיווך | src/components/ui/ArticleCta.jsx ("לחטיבת היזמות" וכו') |
| קורקוס יזמות (יזמות נדל"ן), ראיתה (ביצוע ובנייה), שכינתא (ניהול ופיקוח), אפיק הנחל (תיווך ושיווק) | public/llms.txt ("זרועות"), src/data/divisions.js (name), index.html (Organization של כל זרוע) |
| מקרקע ועד מסירת מפתח | index.html (slogan), public/llms.txt |
| לבחור מפקח לפני החתימה עם הקבלן | src/content/supervision/2026-10-11-eich-livchor-mefakeach-bniya.js, שורה 74 |
| 055-981-1814, https://www.kurkoos-group.co.il | src/data/site.js, public/llms.txt |

"פרויקטים מורכבים" הוא הניסוח של הבקשה, כמסקנה מארבע הזרועות תחת קבוצה אחת, ולא נתון מספרי.

## מה נשאר בחוץ

- "שלושים שנות ניסיון" (src/components/ui/ArticleCta.jsx, src/data/stats.js) ושאר המספרים ב-stats.js (פרויקטים, שביעות רצון, מסירה בזמן): stats.js מוגדר כברירת מחדל שניתנת לעריכה, ולא נמצא לו מקור מאומת, ולכן לא נכנס.
- רישיונות, הסמכות ומספר מפקחים: לא מופיעים במאגר.
