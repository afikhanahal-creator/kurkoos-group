# 🛡️ פיקוח פרויקטים — קבוצת קורקוס

סוכן + תשתית לכתבה שבועית על **פיקוח פרויקטים בנייה**, שמתפרסמת בעמוד
`/construction-supervision` (עמוד הפיקוח מפנה לשם במקום לבלוג, "המדריך לפיקוח בנייה").

## מה יש כאן
```
construction_supervision/
├── prompt.md             ← פרומפט הסוכן (system prompt). הלב.
├── content-calendar.md   ← 24 נושאי פיקוח, כ-6 חודשים קדימה.
├── scripts/
│   └── generate-article.mjs   ← מחולל: Claude → קובץ כתבה ב-src/content/supervision/
└── README.md
```

## איפה התוכן באתר
- **כתבות:** `src/content/supervision/*.js` — כל קובץ = כתבה. נטענות אוטומטית.
- **טעינה:** `src/lib/supervision.js`
- **עמודים:** `src/pages/Supervision.jsx` (רשימה) · `src/pages/SupervisionArticle.jsx` (כתבה)
- **נתיבים:** `/construction-supervision` ו-`/construction-supervision/:slug`
- **ניהול:** טאב "פיקוח פרויקטים" בלוח הבקרה (עריכה, ניסוח מחדש, החלפת תמונה, תמונת AI, ארכיון, מחיקה).

## הפעלה אוטומטית
GitHub Action `.github/workflows/weekly-supervision.yml` רץ כל יום ראשון ופותח PR
עם כתבה חדשה. צריך להגדיר פעם אחת `ANTHROPIC_API_KEY` ב-Settings → Secrets → Actions
(אותו secret של שאר הטורים). ליצירת תמונות AID דרך ה-CMS, הגדירו `OPENAI_API_KEY` ב-Vercel.
