# 🅰️ מדריך הפונטים — Kurkoos Group

מסמך זה מרכז **הכל** מה שצריך כדי להטמיע, להחליף ולשנות את הפונטים באתר.
מיועד גם למתכנת וגם לבעל האתר. אין צורך לחפש בקוד — כל מה שצריך נמצא כאן.

---

## 1. מה הפונטים של האתר

| תפקיד | פונט המותג (בתשלום) | מקור רכישה | Fallback (חינמי, פעיל עכשיו) |
|-------|----------------------|------------|------------------------------|
| **גוף / טקסט ראשי** | Almoni — Light 300 / Regular 400 / Bold 700 | [AlefAlefAlef](https://alefalefalef.co.il/en/font/almoni/) | Assistant |
| **כותרות** | Fb Metropolis — Regular / Bold | [fontbit (נדב עזרא)](https://fontbit.co.il/product/%D7%9E%D7%98%D7%A8%D7%95%D7%A4%D7%95%D7%9C%D7%99%D7%A1/) | Rubik |
| **כותרות צרות** | Fb Metropolis Bold + `letter-spacing: -0.02em` | fontbit | Rubik |
| **דקורטיבי / מיוחד** | PowerStation Solid — Regular 400 | בתשלום | Rubik |

> 🟢 **כרגע האתר עובד עם ה-Fallback החינמי** (Rubik + Assistant מ-Google Fonts).
> ברגע שתתקין את קבצי המותג — הם ידרסו אוטומטית את ה-Fallback בכל האתר.

---

## 2. איפה הכל מחובר בקוד (מפת קבצים)

| מה | קובץ | תפקיד |
|----|------|-------|
| הגדרות `@font-face` | `src/styles/fonts.css` | מצביע על קבצי המותג ב-`/fonts/` |
| משתני פונט + גדלים | `src/styles/tokens.css` | `--font-heading` / `--font-body` / `--font-display` + גדלי `--fs-*` |
| החלה על האתר | `src/styles/global.css` | `body`, `h1–h6`, `.heading-condensed`, `.font-display`, `.btn`, `.eyebrow` |
| Fallback + Preload | `index.html` | טעינת Google Fonts + preload לפונטי המותג |
| ייבוא ראשי | `src/main.jsx` | מייבא את `global.css` (שמושך את כל השאר) |
| קבצי הפונט עצמם | `public/fonts/` | כאן שמים את ה-`.woff2` שרכשת |

**שרשרת הטעינה:** `main.jsx` → `global.css` → (`@import` של `tokens.css` + `fonts.css`).

---

## 3. איך מטמיעים את פונטי המותג (אחרי תשלום) — 3 צעדים

### צעד 1 — רכישה
קנה **רישיון Web** לכל פונט:
- **Almoni** → https://alefalefalef.co.il/en/font/almoni/
- **Fb Metropolis** → https://fontbit.co.il/product/מטרופוליס/
- **PowerStation Solid** → בית יציקה בתשלום

> ⚖️ חובה רישיון Web. שימוש בלי רישיון = הפרת זכויות יוצרים (בתי היציקה הישראליים אוכפים בפועל).

### צעד 2 — המרה ל-woff2
אם קיבלת קבצי `OTF` / `TTF`, המר אותם ל-`.woff2`:
- אונליין: [transfonter.org](https://transfonter.org) (בחר פלט `WOFF2`)
- או דרך הכלי `fonttools` / `glyphhanger`

### צעד 3 — הנחת הקבצים
שים את הקבצים בתיקייה `public/fonts/` **בדיוק בשמות הבאים** (חשוב! השמות חייבים להיות מדויקים):

```
public/fonts/
├── almoni-300.woff2            ← Almoni Light
├── almoni-400.woff2            ← Almoni Regular
├── almoni-700.woff2            ← Almoni Bold
├── fb-metropolis-400.woff2     ← Metropolis Regular
├── fb-metropolis-700.woff2     ← Metropolis Bold
└── powerstation-solid-400.woff2 ← PowerStation Solid
```

זהו. רענן את הדף (או הרץ build מחדש) — פונטי המותג יופיעו בכל האתר. ✅

> אפשר להוסיף גם גרסת `.woff` (תאימות לדפדפנים ישנים) — ההגדרות ב-`fonts.css` כבר מצפות לזה.

---

## 4. איך משנים דברים

### א. להחליף פונט אחד בפונט אחר
ערוך את `src/styles/tokens.css` (שורות ~52-54):

```css
--font-heading: 'Fb Metropolis', 'Rubik', system-ui, sans-serif;  /* כותרות */
--font-body:    'Almoni', 'Assistant', system-ui, sans-serif;     /* גוף */
--font-display: 'PowerStation Solid', 'Fb Metropolis', 'Rubik', system-ui, sans-serif; /* דקורטיבי */
```
- הפונט **הראשון** ברשימה הוא הראשי; השאר הם fallback לפי הסדר.
- שינוי כאן משפיע על **כל האתר** בבת אחת.

### ב. להחליף את ה-Fallback החינמי (למשל Rubik → Secular One)
כדי שה-fallback ייראה קרוב יותר ל-Metropolis עד הרכישה:
1. ב-`index.html` החלף בקישור Google Fonts את `Rubik:wght@...` ב-`Secular+One`.
2. ב-`tokens.css` החלף `'Rubik'` ב-`'Secular One'` בשורות `--font-heading` ו-`--font-display`.

> שים לב: ל-Secular One יש משקל אחד בלבד (400) — אז הכותרות ייראו כבדות גם בלי 700/800.

### ג. לשנות גודל טקסט / כותרות
כל הגדלים מוגדרים כ-tokens ב-`src/styles/tokens.css` (שורות ~56-64). שנה במקום אחד — משפיע על כל האתר:

```css
--fs-hero:    clamp(2.5rem, 5.5vw, 3.75rem);  /* כותרת ענק (Hero) */
--fs-h1:      clamp(2rem, 4vw, 2.6rem);
--fs-h2:      clamp(1.5rem, 3vw, 1.9rem);
--fs-h3:      clamp(1.2rem, 2vw, 1.35rem);
--fs-body-lg: 1.125rem;   /* 18px */
--fs-body:    1rem;       /* 16px  ← גוף טקסט בסיסי */
--fs-small:   0.875rem;   /* 14px */
```
> `clamp(min, מועדף, max)` = הטקסט מתכווץ/גדל אוטומטית לפי רוחב המסך (רספונסיבי).

### ד. לשנות עובי (weight) של הכותרות
ב-`src/styles/global.css`:
- כותרות כלליות: בלוק `h1, h2, h3...` → `font-weight: 800;`
- כותרת צרה: מחלקת `.heading-condensed` → `font-weight: 700;` + `letter-spacing: -0.02em;`

### ה. שימוש בכותרת צרה או דקורטיבי ברכיב
פשוט הוסף את המחלקה ב-JSX:
```jsx
<h2 className="heading-condensed">כותרת צרה ודחוסה</h2>
<span className="font-display">טקסט דקורטיבי</span>
```

---

## 5. שאלות נפוצות

**ש: למה אני רואה אזהרת `preload` בקונסול?**
ת: כי קבצי המותג עוד לא הותקנו ב-`public/fonts/`. האזהרה תקינה ותיעלם ברגע שתשים את הקבצים.

**ש: התקנתי את הקבצים אבל אני עדיין רואה את הפונט הישן.**
ת: (1) בדוק שהשמות **מדויקים** לפי הטבלה בסעיף 3. (2) נקה cache / רענן עם `Ctrl+Shift+R`. (3) אם יש build — הרץ `npm run build` מחדש.

**ש: אפשר להשתמש בפונט בלי לקנות?**
ת: לא — זו הפרת זכויות יוצרים. עד הרכישה האתר משתמש ב-Fallback חינמי וחוקי לחלוטין.

**ש: איך מריצים את האתר מקומית?**
ת: `npm install` ואז `npm run dev`.

---

*עודכן לאחרונה: יוני 2026 · קורקוס גרופ*
