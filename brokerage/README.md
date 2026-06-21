# 🤝 המדריך לרוכש ולמוכר — קבוצת קורקוס

סוכן + תשתית לכתבה שבועית על **תיווך ועסקאות**, שמתפרסמת בעמוד
`/real-estate-guide` (עמוד התיווך מפנה לשם במקום לבלוג, "המדריך לרוכש ולמוכר").

## מה יש כאן
```
brokerage/
├── prompt.md             ← פרומפט הסוכן (system prompt).
├── content-calendar.md   ← 24 נושאי תיווך.
├── scripts/
│   └── generate-article.mjs   ← מחולל: Claude → קובץ כתבה ב-src/content/brokerage/
└── README.md
```

## איפה התוכן באתר
- **כתבות:** `src/content/brokerage/*.js` · **טעינה:** `src/lib/brokerage.js`
- **עמודים:** `src/pages/RealEstateGuide.jsx` · `src/pages/RealEstateGuideArticle.jsx`
- **נתיבים:** `/real-estate-guide` ו-`/real-estate-guide/:slug`
- **ניהול:** טאב אחד "מאמרים ומדריכים" בלוח הבקרה, בורר עליון לטור "תיווך ועסקאות".

## הפעלה אוטומטית
GitHub Action `.github/workflows/weekly-brokerage.yml` רץ כל יום ראשון ופותח PR.
צריך `ANTHROPIC_API_KEY` ב-Secrets (אותו secret של שאר הטורים).
