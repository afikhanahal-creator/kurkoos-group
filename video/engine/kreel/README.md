# kreel: מנוע הרילס של קבוצת קורקוס

מנוע אחד לכל רילס הפרויקטים והמותג. כל סרטון הוא קובץ `project.json` אחד: תסריט קריינות, ציר זמן, צילומים ואפקטים. האפקטים מודולריים (`fx.py`), והמותג נלקח מ־`src/styles/tokens.css` (`kit.py`), כך שאין צבע או פונט שלא מהמותג.

## הפקודות

```
python3 video/projects/fetch_media.py                                   # מוריד את המדיה מספריית מנוע התוכן (פעם אחת)
python3 video/engine/kreel/render.py video/projects/<שם>/project.json --preview   # תצוגה מקדימה: out/preview.jpg
python3 video/engine/kreel/render.py video/projects/<שם>/project.json --frame 12.4 # פריים אחד לבדיקה
python3 video/engine/kreel/render.py video/projects/<שם>/project.json             # out/video.mp4, out/captions.srt, out/timeline.json
python3 video/engine/kreel/music.py  video/projects/<שם>/project.json             # out/music.wav: מוזיקה ואפקטים קוליים לפי האפקטים
python3 video/engine/kreel/mix.py    video/projects/<שם>/project.json [--tts]     # הסרטון הסופי, -14 LUFS
```

## קריינות

הקריינות היא רשימת `lines` בקובץ הפרויקט, כל משפט עם זמן התחלה וסוף. הכתוביות נחתכות מאותם משפטים, ולכן הן תמיד תואמות לקריינות.
- **מוקלטת:** קובץ לכל משפט בתיקייה `vo/` של הפרויקט, בשמות `01`, `02` וכן הלאה (wav, mp3 או m4a). `mix.py` מכניס כל משפט לזמן שלו, מאיץ עד 12% משפט ארוך מעט, ומנמיך את המוזיקה מתחת לדיבור.
- **נוצרת:** `mix.py --tts` עם `OPENAI_API_KEY` בסביבה, אותו ספק כמו `server/tts.js` באתר. אין מפתח בקוד.

## מבנה project.json

```
duration                      אורך בשניות
lines: [{start, end, text}]   הקריינות, וממנה הכתוביות
scenes: [{
  start, end                  זמני הסצנה
  shots: [{src, t0, dur | len, fx, fy, push, zoom, in}]   צילומים בזה אחר זה. src: וידאו או תמונה. in: "wipe" למעבר בקו
  dim, shade, shade_from, captions, mark, punch           כהות, הצללה תחתונה, כתוביות, לוגו בפינה, זום קטן בחיתוך
  effects: [{type, at, until, ...}]                       at ו-until בשניות מתחילת הסצנה
}]
```

## האפקטים (`fx.py`)

| type | מה הוא עושה | פרמטרים עיקריים |
|---|---|---|
| `title` | שורות כותרת שעולות אחת אחרי השנייה, פס אדום מעליהן | `lines [[טקסט, גודל, משקל, צבע]]`, `x`, `y`, `anchor` |
| `chapter` | כרטיס פרק עם מספר אדום גדול, ואז תגית פרק קבועה למעלה | `num`, `text`, `chip`, `dur` |
| `pill` | תגית מעוגלת | `text`, `bg`, `x`, `y`, `size` |
| `blueprint` | קווי שרטוט שנמתחים על התמונה, רשת, מלבנים | `paths`, `rects`, `grid`, `dur`, `out` |
| `dims` | קווי מידה עם תווית | `items [{a, b, label}]` |
| `checks` | סימוני בדיקה: טבעת, וי ותווית | `points [[x, y, תווית]]` |
| `markers` | נקודות ממוספרות עם תווית (סיור מסירה) | `points [[x, y, תווית]]` |
| `freeze` | עצירת פריים, מושחר וצבוע בכחול, עם מסגרת | `at`, `dur` |
| `scan` | קו סריקה דיגיטלי שעובר על אזור | `rect`, `dur` |
| `float` | איור או תמונה כמדבקה שקופצת ומרחפת | `src`, `x`, `y`, `w`, `rot` |
| `roles` | כרטיסי תפקידים עם איור, מחוברים בקו | `items [{label, img, sub}]` |
| `checklist` | רשימה שמסומנת שורה אחרי שורה | `title`, `items` |
| `invoice` | חשבון חלקי בטאבלט, שורות עם סטטוס וחותמת | `rows [[פריט, סטטוס]]`, `tag`, `stamp_at` |
| `progress` | פס התקדמות שמתמלא | `label`, `dur` |
| `chips` | רשימת הפרקים בסגנון הקרוסלה | `items [[מספר, טקסט]]` |
| `icons` | אייקוני קו בעיגולים: מדידה, מסמך, וי, מצלמה, קסדה | `items [{kind, x, y}]` |
| `stamp` | חותמת אדומה שנוחתת | `text`, `x`, `y`, `rot` |
| `chat` | בתוך הצ'אט: הפריים מתכווץ לכרטיס, עיגול בהיר מתרחב, תיבת צ'אט מקלידה, תשובה עם פס התקדמות, חזרה לפריים | `prompt`, `thumb`, `dur` |
| `endcard` | סגיר מותג: לוגו ושורות | `lines` |

## כללים

- טקסט על המסך רק מהתסריט שאושר או ממקור באתר. בלי מספרים, מחירים או אישורים שלא נמדדו. החשבון בטאבלט מסומן "דוגמה להמחשה".
- צילומי אתר אמיתיים של הקבוצה (`video/videos/*/assets/seg`), איורי המותג ותמונות הספרייה. לא מציגים תמונה כפרויקט של הקבוצה אם היא לא.
- אין מקפים כסימן פיסוק בכתוביות. אין ״ בפונט Almoni, ולכן כותבים ".
