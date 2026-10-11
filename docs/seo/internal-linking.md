# מפת קישורים פנימיים: Pillar → Cluster → Supporting → Project → Service

**172 זוגות קישור.** כל ה-URL בטבלה נבדקו מול רשימת 101 העמודים המרונדרים (audit.json) ומול 3 עמודי פרויקט שמופיעים ב-GSC. אין קישור לעמוד שלא קיים, ואין קישור לעמוד שהוצע ב-CREATE ועוד לא נבנה.

## למה זה הצעד החשוב ביותר באתר

ספירה בקבצי המקור (`src/content/*/*.js`) מראה ש-50 מתוך 66 הכתבות החיות לא מכילות אף קישור פנימי בגוף הטקסט. הקישורים היחידים שלהן הם:

- 15 קישורי הניווט הקבועים (SITE_LINKS) בגרסה הסטטית.
- בלוק "עוד מהמדריך" ב-React. הבלוק מציג את 3 הכתבות האחרונות בטור, לא את הכתבות הקשורות בנושא (ConstructionsArticle.jsx, שורה 25: `.slice(0, 3)`).

לכן גוגל לא מקבל אות על ההיררכיה. כתבת בדיקת הבטון, למשל, מדורגת על "בדיקת בטון" בלי שאף עמוד באתר מקשר אליה בעוגן "בדיקת בטון".

## כללי ביצוע

- **שכבה:** SAFE. הוספת קישור בגוף טקסט קיים לא משנה עיצוב או תוכן עסקי. כשצריך לנסח משפט מקשר חדש, מוסיפים משפט אחד, לא מחליפים פסקה.
- **איפה עורכים:** כתבות ב-`src/content/<טור>/<קובץ>.js`, בתחביר markdown `[עוגן](/נתיב)`. ה-prerender כבר ממיר את התחביר ל-`<a>` (פונקציית mdToHtml). עמודי שירות ב-`src/data/divisions.js` (related, intro, faqs). עמודי נחיתה ב-`src/data/houseLanding.js`. מילון ב-`src/data/glossary.js`.
- **עוגנים:** בעברית טבעית, משתנים בין עמודים. לא חוזרים על אותו עוגן מדויק יותר מ-3 פעמים לאותו יעד.
- **כמות:** 3 עד 6 קישורים חדשים בגוף כל כתבה, לא יותר.
- **בעיה שכדאי לתקן (REVIEW):** לשנות את "עוד מהמדריך" כך שיציג כתבות מאותו אשכול (לפי תגית או מילון ידני). זה שינוי לוגיקה בלי שינוי עיצוב.
- **עמודי פרויקט:** שלושה URL אומתו ב-GSC (`/projects/ben-gurion-17`, `/projects/project-hankin-41`, `/projects/hahumash-22-24`) ונכללים בשכבות D4-D5. טקסט בעמודי פרויקט נערך ב-CMS (תיאור הפרויקט), לא בקוד. שאר הפרויקטים: לפי `/sitemap-pages.xml`, באותה תבנית.

## היררכיה
```
בית
├── /bniyat-vila-sharon (Pillar A) ── /kablan-bniya-bayit-prati, /constructions/kablan-mafteach…, /kama-ole…, /loach-zmanim…, harigot-taktziv
├── /divisions/supervision (Pillar B) ── mefakeach-bniya-bayit-prati, mefakeach-mul-kablan, concrete…, bdek-dira…, likuei-bniya-tkufat-bedek
├── /divisions/development (Pillar C) ── bdikat-hetkenut-karka, doch-efes, itur-hizdamnut, tazrim-timing
├── /projects (Pillar D) ── /villas-sharon, /divisions/residential, /real-estate-sharon, /divisions/brokerage
└── /real-estate-guide + /real-estate-glossary + /real-estate-calculators (E)
```

## טבלת הזוגות

| # | שכבה | מקור | עוגן | יעד | איפה בעמוד המקור |
|---|---|---|---|---|---|
| 1 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | קבלן לבניית בית פרטי | `/kablan-bniya-bayit-prati` | בפסקת הפתיחה (lead), במשפט שמסביר מי בונה בפועל |
| 2 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | קבלן מפתח לבית פרטי | `/constructions/kablan-mafteach-o-nihul-atzmi` | בסעיף השלבים (stepsTitle), בשלב בחירת מודל הביצוע |
| 3 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | כמה עולה לבנות בית פרטי | `/constructions/kama-ole-livnot-bayit-prati` | בסעיף 'ממה בנוי המחיר בבניית וילות בשרון' (check.title) |
| 4 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | לוח זמנים לבניית בית | `/constructions/loach-zmanim-bniyat-bayit` | בסעיף השלבים, אחרי השלב האחרון (מסירה) |
| 5 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | תקציב בניית בית וחריגות | `/construction-supervision/construction-supervision-harigot-taktziv` | בסעיף 'ממה בנוי המחיר', במשפט על רזרבה |
| 6 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | פיקוח בנייה לבית פרטי | `/construction-supervision/mefakeach-bniya-bayit-prati` | בסעיף השלבים, בשלב הביצוע (who=שכינתא) |
| 7 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | חוזה בנייה לבית פרטי | `/constructions/home-construction-contract` | בסעיף 'מה בודקים לפני שבונים', בפריט על החוזה |
| 8 | A1 Pillar→Cluster | `/bniyat-vila-sharon` | בניית בית פרטי בהוד השרון | `/bniyat-bayit-prati/hod-hasharon` | בסעיף 'בונים בית פרטי באזור' (קיים, מוודאים עוגן מדויק) |
| 9 | A2 Cluster→Pillar | `/kablan-bniya-bayit-prati` | התהליך המלא של בניית בית פרטי | `/bniyat-vila-sharon` | בפסקת הפתיחה (intro.a) |
| 10 | A2 Cluster→Pillar | `/constructions/kama-ole-livnot-bayit-prati` | בניית בית פרטי מהמגרש ועד המפתח | `/bniyat-vila-sharon` | בפסקה הראשונה, אחרי ההסבר שמחיר למטר לא מספיק |
| 11 | A2 Cluster→Pillar | `/constructions/kablan-mafteach-o-nihul-atzmi` | כל שלבי בניית בית פרטי | `/bniyat-vila-sharon` | בסעיף 'מה זה קבלן מפתח', בסוף הפסקה |
| 12 | A2 Cluster→Pillar | `/constructions/loach-zmanim-bniyat-bayit` | המדריך לבניית בית פרטי | `/bniyat-vila-sharon` | בסעיף 'אז כמה זמן באמת לוקח לבנות בית' |
| 13 | A2 Cluster→Pillar | `/constructions/livchor-chevrat-bniya-bayit-prati` | בניית בית פרטי ווילה בשרון | `/bniyat-vila-sharon` | בסעיף 'איך אנחנו עונים על השאלות האלה' |
| 14 | A3 Cluster↔Cluster | `/constructions/kama-ole-livnot-bayit-prati` | לוח הזמנים משפיע על העלות | `/constructions/loach-zmanim-bniyat-bayit` | בסעיף 'מה עושה את ההבדל בתקציב' |
| 15 | A3 Cluster↔Cluster | `/constructions/kama-ole-livnot-bayit-prati` | עבודות פיתוח | `/constructions/avodot-pituach-chatzer` | בסעיף 'ממה בנוי המחיר של בית פרטי', בשורת הפיתוח |
| 16 | A3 Cluster↔Cluster | `/constructions/kama-ole-livnot-bayit-prati` | מפרט טכני | `/constructions/mifrat-techni-mah-kovea` | בסעיף 'למה שתי הצעות לא ניתנות להשוואה' |
| 17 | A3 Cluster↔Cluster | `/constructions/kama-ole-livnot-bayit-prati` | איפה בורח הכסף בבנייה פרטית | `/construction-supervision/construction-supervision-harigot-taktziv` | בסעיף 'מה עושה את ההבדל בתקציב' |
| 18 | A3 Cluster↔Cluster | `/constructions/kablan-mafteach-o-nihul-atzmi` | כמה עולה לבנות בית פרטי | `/constructions/kama-ole-livnot-bayit-prati` | בסעיף 'איפה ההבדל מורגש באמת' |
| 19 | A3 Cluster↔Cluster | `/constructions/kablan-mafteach-o-nihul-atzmi` | הסעיפים שחייבים להיות בחוזה | `/constructions/home-construction-contract` | בסעיף 'מתי קבלן מפתח מתאים' |
| 20 | A3 Cluster↔Cluster | `/constructions/kablan-mafteach-o-nihul-atzmi` | מפקח בנייה לבית פרטי | `/construction-supervision/mefakeach-bniya-bayit-prati` | בסעיף 'מתי ניהול עצמי מתאים' |
| 21 | A3 Cluster↔Cluster | `/constructions/loach-zmanim-bniyat-bayit` | בנייה מתועשת | `/constructions/industrialized-construction-schedule` | בסעיף 'איפה בדיוק נשבר הלוח בשטח' |
| 22 | A3 Cluster↔Cluster | `/constructions/loach-zmanim-bniyat-bayit` | טופס 4 | `/constructions/tofes-4-ichlus` | בסעיף 'איך בונים לוח זמנים שבאמת מחזיק', בשלב הסיום |
| 23 | A3 Cluster↔Cluster | `/constructions/loach-zmanim-bniyat-bayit` | חיבור חשמל ומים לפני אכלוס | `/constructions/hibur-hashmal-mayim-lifney-ikhlus` | באותו סעיף, בשלב הסיום |
| 24 | A3 Cluster↔Cluster | `/constructions/livchor-chevrat-bniya-bayit-prati` | חוזה בנייה לבית פרטי | `/constructions/home-construction-contract` | בבדיקה 5 'לוח תשלומים לפי התקדמות' |
| 25 | A3 Cluster↔Cluster | `/constructions/livchor-chevrat-bniya-bayit-prati` | מפרט טכני מפורט | `/constructions/mifrat-techni-mah-kovea` | בבדיקה 4 'מפרט טכני מפורט' |
| 26 | A3 Cluster↔Cluster | `/constructions/livchor-chevrat-bniya-bayit-prati` | שירות ואחריות אחרי מסירה | `/constructions/sherut-achrei-mesira` | בבדיקה 8 'אחריות אחרי המסירה' |
| 27 | A3 Cluster↔Cluster | `/constructions/home-construction-contract` | קבלן מפתח או ניהול עצמי | `/constructions/kablan-mafteach-o-nihul-atzmi` | בפסקה שמסבירה את היקף העבודה בחוזה |
| 28 | A3 Cluster↔Cluster | `/constructions/home-construction-contract` | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | בסעיף על אחריות ובדק |
| 29 | A3 Cluster↔Cluster | `/constructions/avodot-pituach-chatzer` | כמה עולה לבנות בית פרטי | `/constructions/kama-ole-livnot-bayit-prati` | בסעיף 'איך מתקצבים את זה נכון' |
| 30 | A4 Supporting→Service | `/kablan-bniya-bayit-prati` | ביצוע ובנייה עם ראיתה | `/divisions/execution` | בסעיף 'מדריכים שכדאי לקרוא' (קיים ב-HOUSE_GUIDES, מוודאים שהוא בגרסה הסטטית) |
| 31 | A4 Supporting→Service | `/constructions/kama-ole-livnot-bayit-prati` | חברת בנייה לבתים פרטיים ווילות | `/divisions/execution` | בסעיף 'איך מקבלים הצעת מחיר שאפשר לסמוך עליה' |
| 32 | A4 Supporting→Service | `/constructions/loach-zmanim-bniyat-bayit` | קבלן בנייה לבית פרטי | `/kablan-bniya-bayit-prati` | בסוף, לפני ה-CTA (בנוסף לקישור הקיים ל-/villas-sharon) |
| 33 | A5 Service→Pillar | `/divisions/execution` | המדריך לבניית בית פרטי | `/bniyat-vila-sharon` | ברשימת related (כבר קיים קישור, מעדכנים עוגן) |
| 34 | A5 Service→Cluster | `/divisions/execution` | קבלן מפתח לבית פרטי | `/constructions/kablan-mafteach-o-nihul-atzmi` | ברשימת related, פריט נוסף |
| 35 | A5 Service→Cluster | `/divisions/execution` | לוח זמנים לבניית בית | `/constructions/loach-zmanim-bniyat-bayit` | ברשימת related, פריט נוסף |
| 36 | B1 Pillar→Cluster | `/divisions/supervision` | פיקוח בנייה לבית פרטי | `/construction-supervision/mefakeach-bniya-bayit-prati` | ברשימת related (קיים, משנים עוגן ל'פיקוח בנייה לבית פרטי') |
| 37 | B1 Pillar→Cluster | `/divisions/supervision` | מה עושה מפקח בנייה | `/construction-supervision/mefakeach-mul-kablan` | בפסקת intro, במשפט על בקרת איכות |
| 38 | B1 Pillar→Cluster | `/divisions/supervision` | בדיקת בטון | `/constructions/concrete-cube-test-failure-beyetzika` | בסעיף 'למה שכינתא', בפריט על בקרת איכות |
| 39 | B1 Pillar→Cluster | `/divisions/supervision` | פיקוח על יציקת בטון | `/construction-supervision/pikuach-yetzikat-beton` | באותו סעיף, פריט בקרת איכות |
| 40 | B1 Pillar→Cluster | `/divisions/supervision` | ליקויי שלד | `/construction-supervision/construction-supervision-likuei-sheled` | בתשובת FAQ על מה המפקח בודק |
| 41 | B1 Pillar→Cluster | `/divisions/supervision` | בדק דירה וליקויי בנייה | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | בתשובת FAQ על מסירה |
| 42 | B1 Pillar→Cluster | `/divisions/supervision` | פרוטוקול מסירה לבית פרטי | `/construction-supervision/protokol-mesira-bayit-prati` | ברשימת related (קיים) |
| 43 | B1 Pillar→Cluster | `/divisions/supervision` | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | בתשובת FAQ על מה קורה אחרי מסירה |
| 44 | B1 Pillar→Cluster | `/divisions/supervision` | יומן עבודה באתר | `/construction-supervision/yoman-avoda-atar` | בסעיף החדש 'ניהול פרויקט בנייה מטעם המזמין' |
| 45 | B1 Pillar→Cluster | `/divisions/supervision` | דיווח פיקוח בנייה | `/construction-supervision/divuach-pikuach-bniya-lebait-prati` | באותו סעיף חדש |
| 46 | B1 Pillar→Cluster | `/divisions/supervision` | חריגות תקציב בבנייה פרטית | `/construction-supervision/construction-supervision-harigot-taktziv` | בסעיף 'למה שכינתא', בפריט על בקרת תקציב |
| 47 | B2 Cluster→Pillar | `/construction-supervision/mefakeach-bniya-bayit-prati` | פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | בסעיף 'פיקוח עצמאי או פיקוח בתוך הקבוצה' (קיים, מעדכנים עוגן) |
| 48 | B2 Cluster→Pillar | `/construction-supervision/mefakeach-mul-kablan` | חברת פיקוח בנייה | `/divisions/supervision` | בסעיף 'מה זה אומר ללקוח פרטי' |
| 49 | B2 Cluster→Pillar | `/construction-supervision/construction-supervision-harigot-taktziv` | ניהול ופיקוח בנייה מטעם המזמין | `/divisions/supervision` | בסעיף 'איך מפקח עוצר את הדימום' |
| 50 | B2 Cluster→Pillar | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | פיקוח בנייה בשרון | `/divisions/supervision` | בסעיף 'מה קורה כשמוסרים בלי בדיקה' |
| 51 | B2 Cluster→Pillar | `/construction-supervision/pikuach-yetzikat-beton` | פיקוח הנדסי על הבנייה | `/divisions/supervision` | בסעיף 'למה דווקא כאן הפיקוח משתלם הכי הרבה' |
| 52 | B2 Cluster→Pillar | `/construction-supervision/yoman-avoda-atar` | ניהול פרויקט בנייה | `/divisions/supervision` | בסעיף 'מי אמור לנהל את זה' |
| 53 | B2 Cluster→Pillar | `/construction-supervision/divuach-pikuach-bniya-lebait-prati` | פיקוח בנייה לבית פרטי | `/construction-supervision/mefakeach-bniya-bayit-prati` | בסעיף 'מי אחראי על הדיווח' |
| 54 | B3 Supporting chain | `/construction-supervision/mefakeach-bniya-bayit-prati` | מפקח מול קבלן | `/construction-supervision/mefakeach-mul-kablan` | בסעיף 'מה הוא לא עושה' |
| 55 | B3 Supporting chain | `/construction-supervision/mefakeach-bniya-bayit-prati` | דיווח פיקוח | `/construction-supervision/divuach-pikuach-bniya-lebait-prati` | בסעיף 'איך נראה דיווח פיקוח טוב' |
| 56 | B3 Supporting chain | `/construction-supervision/mefakeach-bniya-bayit-prati` | פרוטוקול מסירה | `/construction-supervision/protokol-mesira-bayit-prati` | בסעיף 'השלבים שבהם הוא חייב להיות באתר', בשלב המסירה |
| 57 | B3 Supporting chain | `/construction-supervision/pikuach-yetzikat-beton` | בדיקת בטון | `/constructions/concrete-cube-test-failure-beyetzika` | בסעיף 'הבדיקה שלא נגמרת כשהיציקה מתחילה' |
| 58 | B3 Supporting chain | `/construction-supervision/pikuach-yetzikat-beton` | ליקויי שלד | `/construction-supervision/construction-supervision-likuei-sheled` | בסעיף 'מה בודקים לפני שהמשאבה מתחילה' |
| 59 | B3 Supporting chain | `/constructions/concrete-cube-test-failure-beyetzika` | פיקוח על יציקת בטון | `/construction-supervision/pikuach-yetzikat-beton` | בסעיף 'איך עוצרים כשל לפני שהוא קורה' |
| 60 | B3 Supporting chain | `/constructions/concrete-cube-test-failure-beyetzika` | מנהל העבודה ביום היציקה | `/constructions/site-manager-stop-concrete-pour` | בסעיף 'למה קובייה נכשלת' |
| 61 | B3 Supporting chain | `/constructions/concrete-cube-test-failure-beyetzika` | ליקויי שלד | `/construction-supervision/construction-supervision-likuei-sheled` | בסעיף 'ומה אם הבטון באמת חלש' |
| 62 | B3 Supporting chain | `/constructions/concrete-cube-test-failure-beyetzika` | מפקח בנייה | `/divisions/supervision` | בסעיף 'מי משלם על הבלגן' |
| 63 | B3 Supporting chain | `/constructions/site-manager-stop-concrete-pour` | בדיקת בטון | `/constructions/concrete-cube-test-failure-beyetzika` | בסעיף 'מה מנהל עבודה בודק לפני שהמערבל הראשון פותח' |
| 64 | B3 Supporting chain | `/construction-supervision/construction-supervision-likuei-sheled` | בדיקת בטון | `/constructions/concrete-cube-test-failure-beyetzika` | בסעיף 'למה השלד לא סולח' |
| 65 | B3 Supporting chain | `/construction-supervision/construction-supervision-likuei-sheled` | בדק דירה לפני מסירה | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | בסעיף 'למה זה מגיע לכיס שלך' |
| 66 | B3 Supporting chain | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | ליקויי איטום | `/construction-supervision/likuei-itum` | בתת-סעיף 'רטיבות ואיטום' |
| 67 | B3 Supporting chain | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | חשמל ואינסטלציה לפני סגירת קירות | `/construction-supervision/likuei-chashmal-instalatzia-lifnei-sgira` | בתת-סעיף 'חשמל ואינסטלציה' |
| 68 | B3 Supporting chain | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | ליקויי אלומיניום ותריסים | `/construction-supervision/likuei-aluminium-trisim-bayit-hadash` | בתת-סעיף 'מישוריות, ריצוף ופתחים' |
| 69 | B3 Supporting chain | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | בתת-סעיף 'ההבדל בין ליקוי לבין אי התאמה' |
| 70 | B3 Supporting chain | `/constructions/likuei-bniya-tkufat-bedek` | שירות אחרי מסירה | `/constructions/sherut-achrei-mesira` | בסעיף 'מה לעשות כשמתגלה ליקוי' |
| 71 | B3 Supporting chain | `/constructions/likuei-bniya-tkufat-bedek` | ליקויי בנייה ובדק דירה | `/construction-supervision/construction-supervision-bdek-dira-lifney-mesira` | בסעיף 'איפה ליקויים באמת נולדים' |
| 72 | B3 Supporting chain | `/constructions/likuei-bniya-tkufat-bedek` | איטום ורטיבות חוזרת | `/constructions/itum-retivut-chozeret-oto-makom` | באותו סעיף |
| 73 | B3 Supporting chain | `/constructions/sherut-achrei-mesira` | תקופת בדק בית | `/constructions/likuei-bniya-tkufat-bedek` | בסעיף 'מה נכנס לתקופת הבדק, ומה זו בכלל' |
| 74 | B3 Supporting chain | `/constructions/sherut-achrei-mesira` | פרוטוקול מסירה | `/construction-supervision/protokol-mesira-bayit-prati` | בסעיף 'מה עושים ביום המסירה' |
| 75 | B3 Supporting chain | `/construction-supervision/likuei-itum` | למה הרטיבות חוזרת לאותו מקום | `/constructions/itum-retivut-chozeret-oto-makom` | בסעיף 'בדיקת ההצפה היא הרגע הקובע' |
| 76 | B3 Supporting chain | `/constructions/itum-retivut-chozeret-oto-makom` | איך מפקח עוצר ליקויי איטום | `/construction-supervision/likuei-itum` | בסעיף 'איך בודקים בביצוע לפני שקוברים' |
| 77 | B3 Supporting chain | `/constructions/itum-retivut-chozeret-oto-makom` | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | בסעיף 'מה זה אומר על תקופת הבדק' |
| 78 | B3 Supporting chain | `/construction-supervision/protokol-mesira-bayit-prati` | ליקויי אלומיניום | `/construction-supervision/likuei-aluminium-trisim-bayit-hadash` | בתת-סעיף 'המעטפת והאיטום' |
| 79 | B3 Supporting chain | `/construction-supervision/protokol-mesira-bayit-prati` | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | בסעיף 'ליקויים סמויים' |
| 80 | B3 Supporting chain | `/construction-supervision/likuei-chashmal-instalatzia-lifnei-sgira` | יומן העבודה באתר | `/construction-supervision/yoman-avoda-atar` | בסעיף 'הכלל שמסכם הכול' |
| 81 | B3 Supporting chain | `/madrich-yazamim/mefakeach-shave-revach` | מה עושה מפקח בנייה | `/construction-supervision/mefakeach-mul-kablan` | בסעיף 'מה מפקח טוב באמת עושה' |
| 82 | B4 Supporting→Service | `/madrich-yazamim/mefakeach-shave-revach` | פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | בסעיף 'איך בוחרים מפקח' |
| 83 | B5 Cluster-hub | `/construction-supervision` | פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | בפסקת המבוא החדשה של האינדקס |
| 84 | C1 Pillar→Cluster | `/divisions/development` | בדיקת כדאיות והיתכנות | `/madrich-yazamim/bdikat-hetkenut-karka` | ברשימת related (קיים, מעדכנים עוגן) |
| 85 | C1 Pillar→Cluster | `/divisions/development` | דוח אפס | `/madrich-yazamim/doch-efes-kli-haavoda` | בסעיף 'למה קורקוס יזמות', בפריט על בדיקות |
| 86 | C1 Pillar→Cluster | `/divisions/development` | איתור קרקע ליזמות | `/madrich-yazamim/itur-hizdamnut-lifnei-hashuk` | בפסקת intro, במשפט 'מאיתור הקרקע' |
| 87 | C1 Pillar→Cluster | `/divisions/development` | ניהול תקציב ותזרים בפרויקט | `/madrich-yazamim/tazrim-timing-lo-kesef` | בסעיף 'למה קורקוס יזמות' |
| 88 | C1 Pillar→Cluster | `/divisions/development` | זכויות בנייה | `/madrich-yazamim/zchuyot-bniya-ma-baamt-kniten` | ברשימת related (קיים) |
| 89 | C1 Pillar→Cluster | `/divisions/development` | היטל השבחה | `/yazamut-nadlan/betterment-levy-silent-brake` | בתשובת FAQ על עלויות פרויקט |
| 90 | C1 Pillar→Cluster | `/divisions/development` | עסקת קומבינציה | `/madrich-yazamim/iskat-kombinatsia` | בתשובת FAQ על דרכי רכישת קרקע |
| 91 | C2 Cluster→Pillar | `/madrich-yazamim/bdikat-hetkenut-karka` | יזמות נדל"ן | `/divisions/development` | בסעיף 'מתי מפסיקים לבדוק' |
| 92 | C2 Cluster→Pillar | `/madrich-yazamim/doch-efes-kli-haavoda` | ייזום פרויקטים למגורים | `/divisions/development` | בסעיף 'דוח חי, לא מסמך במגירה' |
| 93 | C2 Cluster→Pillar | `/madrich-yazamim/itur-hizdamnut-lifnei-hashuk` | יזם נדל"ן בהוד השרון | `/divisions/development` | בסעיף 'הנתונים מאמתים, הם לא מחליפים' |
| 94 | C2 Cluster→Pillar | `/madrich-yazamim/tazrim-timing-lo-kesef` | יזמות נדל"ן | `/divisions/development` | בסעיף 'הקבלן משולם על ביצוע, לא על נוכחות' |
| 95 | C3 Supporting chain | `/madrich-yazamim/bdikat-hetkenut-karka` | דוח אפס | `/madrich-yazamim/doch-efes-kli-haavoda` | בסעיף 'החישוב שמכריע' |
| 96 | C3 Supporting chain | `/madrich-yazamim/bdikat-hetkenut-karka` | נסח טאבו | `/madrich-yazamim/nesach-tabu-mi-baal-hakarka` | בסעיף 'מה עוד יושב על המגרש' |
| 97 | C3 Supporting chain | `/madrich-yazamim/bdikat-hetkenut-karka` | היטל השבחה | `/yazamut-nadlan/betterment-levy-silent-brake` | בסעיף 'החישוב שמכריע' |
| 98 | C3 Supporting chain | `/madrich-yazamim/itur-hizdamnut-lifnei-hashuk` | בדיקת היתכנות לפני רכישת קרקע | `/madrich-yazamim/bdikat-hetkenut-karka` | בסעיף 'הנתונים מאמתים' |
| 99 | C3 Supporting chain | `/madrich-yazamim/itur-hizdamnut-lifnei-hashuk` | קרקע מאושרת אינה דירות | `/yazamut-nadlan/karka-meusheret-lo-dirot` | בסעיף 'השוק הסמוי הוא השוק האמיתי' |
| 100 | C3 Supporting chain | `/madrich-yazamim/doch-efes-kli-haavoda` | הבנק משקיע בניירות | `/madrich-yazamim/habank-mashkia-benyarot` | בסעיף 'ארבעה אזורים, תמונה אחת' |
| 101 | C3 Supporting chain | `/madrich-yazamim/tazrim-timing-lo-kesef` | מימון חוץ בנקאי | `/yazamut-nadlan/mimun-chutz-bankai-nadlan` | בסעיף 'נורה אדומה בעשרה אחוזים' |
| 102 | C3 Supporting chain | `/yazamut-nadlan/mimun-chutz-bankai-nadlan` | תזרים ותזמון בפרויקט | `/madrich-yazamim/tazrim-timing-lo-kesef` | בסעיף 'הבדיקה שכדאי לעשות לפני' |
| 103 | C3 Supporting chain | `/yazamut-nadlan/karka-meusheret-lo-dirot` | זכויות בנייה | `/madrich-yazamim/zchuyot-bniya-ma-baamt-kniten` | בסעיף 'הסימנים שמראים איפה הקרקע עומדת' |
| 104 | C3 Supporting chain | `/yazamut-nadlan/betterment-levy-silent-brake` | בדיקת היתכנות | `/madrich-yazamim/bdikat-hetkenut-karka` | בסעיף 'המספר שמפתיע יזמים חדשים' |
| 105 | C3 Supporting chain | `/madrich-yazamim/proyekt-shelo-nimkar` | שיווק ותיווך פרויקטים | `/divisions/brokerage` | בסעיף 'שני ערוצים, שני תזמונים' |
| 106 | C3 Supporting chain | `/madrich-yazamim/mesira-dna-haproyekt-haba` | פרוטוקול מסירה | `/construction-supervision/protokol-mesira-bayit-prati` | בסעיף 'פרוטוקול מסירה מקצועי' |
| 107 | C3 Supporting chain | `/yazamut-nadlan/modular-construction-speed-promise-reality` | בנייה מתועשת מנקודת המבט של בעל הבית | `/constructions/industrialized-construction-schedule` | בסעיף 'מה מקצרים ומה לא' |
| 108 | C3 Supporting chain | `/constructions/industrialized-construction-schedule` | הכלכלה של בנייה מתועשת ליזם | `/yazamut-nadlan/modular-construction-speed-promise-reality` | בסעיף 'אז מה השורה התחתונה' |
| 109 | C4 Hub | `/yazamut-nadlan` | יזמות נדל"ן בהוד השרון | `/divisions/development` | בפסקת המבוא של האינדקס |
| 110 | C4 Hub | `/madrich-yazamim` | ליווי יזמי נדל"ן | `/livy-yazamim` | בפסקת המבוא של האינדקס |
| 111 | C4 Hub | `/livy-yazamim` | יזמות נדל"ן | `/divisions/development` | בפסקת הפתיחה |
| 112 | D1 Pillar→Cluster | `/projects` | וילות בהוד השרון | `/villas-sharon` | בסעיף 'הפרויקטים שבבנייה ובתכנון' |
| 113 | D1 Pillar→Cluster | `/projects` | דירות חדשות בהוד השרון | `/divisions/residential` | באותו סעיף, אחרי חנקין 41 |
| 114 | D1 Pillar→Cluster | `/projects` | פרויקטים חדשים בשרון | `/real-estate-sharon` | בפסקת הפתיחה |
| 115 | D1 Pillar→Service | `/projects` | פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | בסעיף 'תחומי הפעילות' (קיים, מעדכנים עוגן) |
| 116 | D2 Project→Service | `/villas-sharon` | בניית בית פרטי מהמגרש ועד המפתח | `/bniyat-vila-sharon` | בתשובת FAQ 'מה כולל התהליך של בניית בית פרטי' |
| 117 | D2 Project→Service | `/villas-sharon` | קבלן לבניית בית פרטי | `/kablan-bniya-bayit-prati` | בתשובת FAQ 'אתם בונים וילה או בית פרטי גם על מגרש שלי?' |
| 118 | D2 Project→Service | `/villas-sharon` | פיקוח בנייה לבית פרטי | `/construction-supervision/mefakeach-bniya-bayit-prati` | בתשובת FAQ 'מי מתכנן ומי מבצע את הפרויקטים?' |
| 119 | D2 Project→Cluster | `/villas-sharon` | כל הפרויקטים בהוד השרון | `/projects` | בפסקת הפתיחה |
| 120 | D3 Local | `/bniyat-bayit-prati/hod-hasharon` | פרויקטים חדשים בהוד השרון | `/projects` | בסעיף הפרויקטים (projectsTitle) |
| 121 | D3 Local | `/real-estate-sharon` | פרויקטים חדשים בהוד השרון | `/projects` | בפסקת הפתיחה |
| 122 | D3 Local | `/real-estate-sharon` | וילות בהוד השרון | `/villas-sharon` | ברשימת הזרועות, אחרי 'ביצוע ובנייה' |
| 123 | D3 Local | `/divisions/residential` | הפרויקטים בהוד השרון | `/projects` | בפסקת intro |
| 124 | D3 Local | `/divisions/residential` | קנייה מקבלן מול יד שנייה | `/real-estate-guide/kniya-mekablan-mul-yad-shniya` | בתשובת FAQ 'מה ההבדל בין קניית דירה על הנייר לדירה מוכנה?' |
| 125 | D3 Local | `/divisions/residential` | תקופת בדק | `/constructions/likuei-bniya-tkufat-bedek` | בתשובת FAQ 'מה קורה אחרי מסירת המפתח?' |
| 126 | D3 Local | `/divisions/brokerage` | וילות בהוד השרון | `/villas-sharon` | ברשימת related (קיים, מעדכנים עוגן מ'הפרויקטים בשיווק') |
| 127 | D3 Local | `/divisions/brokerage` | זיהוי קונה רציני | `/real-estate-guide/iskaot-noflot` | ברשימת related, פריט חדש |
| 128 | D4 Project | `/projects` | בן גוריון 17, יהוד-מונוסון | `/projects/ben-gurion-17` | ברשימת הפרויקטים, כרטיס הפרויקט |
| 129 | D4 Project | `/projects` | חנקין 41, מגדיאל | `/projects/project-hankin-41` | ברשימת הפרויקטים, כרטיס הפרויקט |
| 130 | D4 Project | `/projects` | פרויקט החומש 22-24 | `/projects/hahumash-22-24` | ברשימת הפרויקטים, בסעיף פרויקטים שהושלמו |
| 131 | D4 Project | `/divisions/residential` | חנקין 41: שש דירות חדשות במגדיאל | `/projects/project-hankin-41` | בפסקת intro, במשפט על הפרויקטים בשיווק |
| 132 | D4 Project | `/divisions/residential` | בן גוריון 17 ביהוד | `/projects/ben-gurion-17` | באותה פסקה |
| 133 | D4 Project | `/villas-sharon` | חנקין 41 | `/projects/project-hankin-41` | בסעיף של חנקין 41, בסוף התיאור |
| 134 | D4 Project | `/divisions/brokerage` | דירות בשיווק בבן גוריון 17 | `/projects/ben-gurion-17` | ברשימת related |
| 135 | D5 Project→Service | `/projects/ben-gurion-17` | ביצוע ובנייה | `/divisions/execution` | בבלוק הקישורים בסוף העמוד (קיים בגרסה הסטטית, מוודאים בגרסה החיה) |
| 136 | D5 Project→Service | `/projects/ben-gurion-17` | פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | באותו בלוק (קיים בסטטי) |
| 137 | D5 Project→Service | `/projects/ben-gurion-17` | דירות חדשות מהקבלן: מה לבדוק | `/real-estate-guide/kniya-mekablan-mul-yad-shniya` | בסעיף התיאור, בסוף (CMS) |
| 138 | D5 Project→Service | `/projects/project-hankin-41` | דירות חדשות בהוד השרון | `/divisions/residential` | בסעיף התיאור (CMS) |
| 139 | D5 Project→Service | `/projects/project-hankin-41` | פרויקטים חדשים בהוד השרון | `/projects` | בסעיף 'פרויקטים נוספים' |
| 140 | D5 Project→Service | `/projects/hahumash-22-24` | ביצוע ובנייה | `/divisions/execution` | בסעיף התיאור (CMS) |
| 141 | E1 Hub→Cluster | `/real-estate-guide` | בדיקות לפני רכישת דירה | `/real-estate-guide/bdikot-lifney-rechishat-dira` | בפרק המבוא החדש לרוכש |
| 142 | E1 Hub→Cluster | `/real-estate-guide` | הון עצמי לרכישת דירה | `/real-estate-guide/hon-atzmi-mashkanta-rechisha` | בפרק לרוכש, בנושא מימון |
| 143 | E1 Hub→Cluster | `/real-estate-guide` | מס רכישה | `/real-estate-guide/mas-rechisha-madregot` | בפרק לרוכש, בנושא עלויות נלוות |
| 144 | E1 Hub→Cluster | `/real-estate-guide` | תמחור דירה למכירה | `/real-estate-guide/timchur-dira-lemchira-hamechir-harishon` | בפרק המבוא החדש למוכר |
| 145 | E1 Hub→Cluster | `/real-estate-guide` | איך מזהים קונה רציני | `/real-estate-guide/iskaot-noflot` | בפרק למוכר, בנושא קונים |
| 146 | E1 Hub→Cluster | `/real-estate-guide` | מס שבח במכירת דירה | `/real-estate-guide/mas-shevach-mecirat-dira` | בפרק למוכר, בנושא מסמכים ומיסוי |
| 147 | E2 Supporting chain | `/real-estate-guide/real-return-real-estate-investment` | מחשבון תשואה | `/real-estate-calculators` | בסעיף 'איך לחשב נכון לפני שקונים' |
| 148 | E2 Supporting chain | `/real-estate-guide/real-return-real-estate-investment` | מס רכישה | `/real-estate-guide/mas-rechisha-madregot` | בסעיף 'מה שאוכל את התשואה, שורה אחר שורה' |
| 149 | E2 Supporting chain | `/real-estate-guide/real-return-real-estate-investment` | תשואה מול ריבית | `/yazamut-nadlan/rental-yield-vs-interest-rate-investor` | בסעיף 'תשואה שוטפת מול עליית ערך' |
| 150 | E2 Supporting chain | `/yazamut-nadlan/rental-yield-vs-interest-rate-investor` | איך מחשבים תשואה | `/real-estate-guide/real-return-real-estate-investment` | בסעיף 'כשהחשבון הבסיסי מתהפך' |
| 151 | E2 Supporting chain | `/real-estate-guide/hon-atzmi-mashkanta-rechisha` | מחשבון משכנתא | `/real-estate-calculators` | בתת-סעיף 'תעשו את החישוב לאחור' |
| 152 | E2 Supporting chain | `/real-estate-guide/iskaot-noflot` | הון עצמי ואישור עקרוני | `/real-estate-guide/hon-atzmi-mashkanta-rechisha` | בסעיף 'הסיבה הראשונה, מימון שלא נסגר' |
| 153 | E2 Supporting chain | `/real-estate-guide/iskaot-noflot` | זכרון דברים | `/real-estate-guide/zichron-dvarim-real-estate` | בסעיף 'הסיבה השנייה, בעיה משפטית שצפה מאוחר' |
| 154 | E2 Supporting chain | `/real-estate-guide/iskaot-noflot` | תיווך ושיווק נכסים בהוד השרון | `/divisions/brokerage` | בסעיף 'רוצים ללוות עסקה נכון' |
| 155 | E2 Supporting chain | `/real-estate-guide/timchur-dira-lemchira-hamechir-harishon` | קונה רציני | `/real-estate-guide/iskaot-noflot` | בסעיף 'מתי המחיר תקוע ומה עושים' (קיים קישור, מעדכנים עוגן) |
| 156 | E2 Supporting chain | `/real-estate-guide/kniya-mekablan-mul-yad-shniya` | דירות חדשות בהוד השרון | `/divisions/residential` | בסעיף 'מה בעצם קונים' |
| 157 | E2 Supporting chain | `/real-estate-guide/kniya-mekablan-mul-yad-shniya` | מפרט טכני | `/constructions/mifrat-techni-mah-kovea` | בסעיף 'מי נושא בסיכון' |
| 158 | E3 Glossary | `/real-estate-glossary` | פיקוח בנייה (מונח) | `/divisions/supervision` | בהגדרת המונח 'פיקוח בנייה' |
| 159 | E3 Glossary | `/real-estate-glossary` | שנת בדק ותקופת אחריות | `/constructions/likuei-bniya-tkufat-bedek` | בהגדרת המונח 'שנת בדק ותקופת אחריות' |
| 160 | E3 Glossary | `/real-estate-glossary` | דוח אפס | `/madrich-yazamim/doch-efes-kli-haavoda` | בהגדרת המונח 'דוח אפס' |
| 161 | E3 Glossary | `/real-estate-glossary` | נסח טאבו | `/madrich-yazamim/nesach-tabu-mi-baal-hakarka` | בהגדרת המונח 'נסח טאבו' |
| 162 | E3 Glossary | `/real-estate-glossary` | היטל השבחה | `/yazamut-nadlan/betterment-levy-silent-brake` | בהגדרת המונח 'היטל השבחה' |
| 163 | E3 Glossary | `/real-estate-glossary` | מפרט טכני | `/constructions/mifrat-techni-mah-kovea` | בהגדרת המונח 'מפרט טכני (מפרט מכר)' |
| 164 | E3 Glossary | `/real-estate-glossary` | טופס 4 | `/constructions/tofes-4-ichlus` | בהגדרת המונח 'טופס 4' |
| 165 | E3 Glossary | `/real-estate-glossary` | פרוטוקול מסירה | `/construction-supervision/protokol-mesira-bayit-prati` | בהגדרת המונח 'פרוטוקול מסירה' |
| 166 | E3 Glossary | `/real-estate-glossary` | עסקת קומבינציה | `/madrich-yazamim/iskat-kombinatsia` | בהגדרת המונח 'עסקת קומבינציה' |
| 167 | E3 Glossary | `/real-estate-glossary` | מס רכישה | `/real-estate-guide/mas-rechisha-madregot` | בהגדרת המונח 'מס רכישה' |
| 168 | E4 Calculators | `/real-estate-calculators` | איך מחשבים תשואה | `/real-estate-guide/real-return-real-estate-investment` | מתחת למחשבון התשואה, במשפט ההסבר |
| 169 | E4 Calculators | `/real-estate-calculators` | כמה הון עצמי צריך | `/real-estate-guide/hon-atzmi-mashkanta-rechisha` | מתחת למחשבון המשכנתא, בתשובת ה-FAQ על הון עצמי |
| 170 | F Trust | `/team` | הפרויקטים שהצוות מוביל | `/projects` | בביוגרפיה של יעקב קורקוס (מנהל פרויקטים) |
| 171 | F Trust | `/team` | פיקוח בנייה וניהול פרויקטים | `/divisions/supervision` | בביוגרפיה של מנהל הפרויקטים |
| 172 | F Trust | `/about` | הצוות שמאחורי קורקוס | `/team` | בפסקה הראשונה (קיים) |

## קישורים נכנסים חדשים לפי יעד (10 היעדים המובילים)

| יעד | קישורים נכנסים חדשים |
|---|---|
| `/divisions/supervision` | 13 |
| `/constructions/likuei-bniya-tkufat-bedek` | 8 |
| `/bniyat-vila-sharon` | 7 |
| `/divisions/development` | 6 |
| `/projects` | 6 |
| `/construction-supervision/mefakeach-bniya-bayit-prati` | 5 |
| `/construction-supervision/protokol-mesira-bayit-prati` | 5 |
| `/constructions/mifrat-techni-mah-kovea` | 4 |
| `/divisions/execution` | 4 |
| `/constructions/concrete-cube-test-failure-beyetzika` | 4 |

## אחרי שעמודי ה-CREATE ייבנו

מוסיפים את הזוגות האלה רק אחרי שהעמוד עלה לאוויר:
- `/constructions/concrete-cube-test-failure-beyetzika` → "בדיקת פטיש שמידט" → העמוד החדש (בפרק 'מה עושים כשהמספר נמוך').
- `/bniyat-vila-sharon` → "שלבי בניית בית פרטי" → העמוד החדש (בסעיף השלבים).
- `/divisions/supervision` → "כמה עולה פיקוח בנייה" → העמוד החדש (ב-FAQ).
- `/construction-supervision/mefakeach-bniya-bayit-prati` → "איך בוחרים מפקח בנייה" → העמוד החדש.
- `/divisions/development` → "סיכונים ביזמות נדל\"ן" → העמוד החדש.
