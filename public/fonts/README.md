# הפונטים של האתר (עודכן 19.10.2026)

## מה מותקן
| תפקיד | font-family | קובץ | משקל |
|------|-------------|------|------|
| גוף, Almoni Light | `Almoni` | `almoni-300.woff2` | 300 |
| גוף, Almoni Regular | `Almoni` | `almoni-400.woff2` | 400 (מוצג גם כשמבקשים 500) |
| גוף, Almoni Bold | `Almoni` | `almoni-700.woff2` | 700 (מוצג גם כשמבקשים 600 עד 900) |
| כותרות, Heebo | `Heebo` | Google Fonts, פונט משתנה | 300 עד 900 |

- **מקור הקבצים:** "Almoni DL AAA", גרסה 1.000 משנת 2011, של AlefAlefAlef.
- **השוואה לקבצים שהבעלים העלה ב-19.10.2026:** ב-TTF וב-OTF יש בדיוק את אותם שלושה משקלים. ב-TTF יש 301 תווים, כמו בקבצים כאן. אין במשפחה Medium או Black.
- **החלטת הבעלים מ-19.10.2026:** הכותרות נשארות ב-Heebo, והגוף ב-Almoni.

## הגדרות ישנות ב-`src/styles/fonts.css`
יש שם הגדרות ל-Fb Metropolis ול-PowerStation Solid, אבל הקבצים לא נקנו ולא קיימים בתיקייה.
- **אין בהן שימוש:** אף רכיב לא מבקש את הפונטים האלה.
- **מה זה גורם:** אזהרה בזמן הבנייה בלבד. הדפדפן לא מוריד שום דבר.
- **השארתי אותן:** כדי שאם יירכשו, יספיק לשים כאן את הקבצים בשמות `fb-metropolis-400.woff2`, `fb-metropolis-700.woff2` ו-`powerstation-solid-400.woff2`.

## הוספת משקל חדש
1. ממירים OTF או TTF ל-woff2: `fonttools ttLib.woff2 compress <file>`.
2. שומרים את הקובץ כאן.
3. מוסיפים `@font-face` ב-`src/styles/fonts.css`.
4. מעדכנים את `FONT_FILES` ב-`src/lib/fonts.js`, כדי שמפת המשקלים בלשונית "פונטים וטיפוגרפיה" תציג אותו כמותקן.

מחקר מלא: `docs/typography/type-audit-2026-10-19.md`.
