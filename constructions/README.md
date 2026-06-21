# 🧱 המדריך לתהליך הבנייה — קבוצת קורקוס

סוכן + תשתית לכתבה שבועית על **ביצוע ובנייה**, שמתפרסמת בעמוד `/constructions`
(עמוד הביצוע מפנה לשם במקום לבלוג, תחת "המדריך לתהליך הבנייה").

## מה יש כאן
```
constructions/
├── prompt.md             ← פרומפט הסוכן (system prompt). הלב.
├── content-calendar.md   ← 24 נושאי ביצוע, כ-6 חודשים קדימה.
├── scripts/
│   └── generate-article.mjs   ← מחולל: Claude → קובץ כתבה ב-src/content/constructions/
└── README.md
```

## איפה התוכן באתר
- **כתבות:** `src/content/constructions/*.js` — כל קובץ = כתבה. נטענות אוטומטית.
- **טעינה:** `src/lib/constructions.js`
- **עמודים:** `src/pages/Constructions.jsx` (רשימה) · `src/pages/ConstructionsArticle.jsx` (כתבה)
- **נתיבים:** `/constructions` ו-`/constructions/:slug`
- **ניהול:** טאב "המדריך לתהליך הבנייה" בלוח הבקרה (עריכה, ניסוח מחדש, החלפת תמונה, ארכיון, מחיקה).

## הפעלה אוטומטית
GitHub Action `.github/workflows/weekly-construction.yml` רץ כל יום ראשון ופותח PR
עם כתבה חדשה. צריך להגדיר פעם אחת `ANTHROPIC_API_KEY` ב-Settings → Secrets → Actions.
(אותו secret משמש גם את טור היזמות.)
