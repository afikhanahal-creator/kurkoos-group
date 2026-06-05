# קורקוס גרופ — אתר תדמית | Kurkoos Group Website

אתר נדל"ן דו-לשוני (עברית RTL / אנגלית) שנבנה ב-**React + Vite** עם **Framer Motion**.
יזמות · בנייה · פיקוח · תיווך.

## הרצה מקומית

```bash
npm install      # התקנת תלויות (פעם אחת)
npm run dev      # הרצת שרת פיתוח -> http://localhost:5173
npm run build    # בנייה לפרודקשן (תיקיית dist)
npm run preview  # תצוגה מקדימה של הבנייה
```

## איך משנים תוכן — הכל בתיקיית `src/data/`

| קובץ | מה הוא שולט |
|------|-------------|
| `src/data/site.js` | שם, טלפון, אימייל, כתובת, רשתות חברתיות, ניווט |
| `src/data/projects.js` | הפרויקטים — כולל תמונות, גלריה וסרטונים |
| `src/data/team.js` | חברי הצוות |
| `src/data/activities.js` | תחומי הפעילות (4 הכרטיסים) |
| `src/data/stats.js` | המספרים בסקשן "במספרים" |
| `src/data/valueChain.js` | שלבי התהליך (אקורדיון) |

כל שדה טקסט הוא דו-לשוני: `{ he: 'עברית', en: 'English' }`.

## פונטי המותג

פונטי המותג (Almoni לגוף, Fb Metropolis לכותרות, PowerStation Solid לדקורטיבי)
הם בתשלום. שים את הקבצים ב-`public/fonts/` לפי ההוראות ב-[public/fonts/README.md](public/fonts/README.md)
והם ייטענו אוטומטית. עד אז האתר משתמש ב-Rubik/Assistant כ-fallback.
ההגדרות: `src/styles/fonts.css` (טעינה) + `src/styles/tokens.css` (משתנים).

## איך משנים צבעים — קובץ אחד בלבד

ערוך את `src/styles/tokens.css`. שינוי צבע שם משפיע על כל האתר:

```css
--color-primary:   #000000;  /* שחור */
--color-secondary: #105572;  /* טורקיז */
--color-accent:    #a90b0c;  /* אדום */
--color-bg:        #ffffff;  /* רקע לבן */
```

## איך מוסיפים תמונות וסרטונים לפרויקט

1. צור תיקייה: `public/projects/<slug>/` (לדוגמה `public/projects/park-residence/`).
2. שים שם את התמונות, ועדכן ב-`src/data/projects.js` את `cover` ו-`gallery`.
3. לסרטון YouTube: הדבק את מזהה הסרטון ב-`video: { type: 'youtube', id: 'XXXX' }`.
   לסרטון קובץ: שים קובץ ב-public ועדכן `video: { type: 'file', src: '/projects/.../clip.mp4' }`.

> עד שתעלה תמונות אמיתיות, האתר מציג placeholder ממותג אוטומטית — אז הוא נראה מצוין גם עכשיו.

## תמונות מומלצות להוסיף ל-`public/`

- `public/hero.jpg` — תמונת רקע ל-Hero (ראה `src/components/sections/Hero.css` להחלפה).
- `public/logo.svg` — לוגו אמיתי (ראה `src/components/layout/Logo.jsx`).
- `public/team/*.jpg` — תמונות צוות.
- `public/projects/<slug>/*.jpg` — תמונות פרויקטים.

## מבנה הפרויקט

```
src/
  data/         ← תוכן (ערוך כאן)
  i18n/         ← תרגומים he/en
  styles/       ← tokens.css (צבעים) + global.css
  components/
    layout/     ← Header, Footer, Logo
    sections/   ← סקשני עמוד הבית
    ui/         ← רכיבים לשימוש חוזר (כרטיסים, אייקונים, אנימציות)
  pages/        ← Home, Projects, ProjectDetail, Team, About
```
