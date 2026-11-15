/* ISRAEL_TAX_RULES_ENGINE: the one registry of the tax and bookkeeping rules the system checks documents against.

   Every rule says where it comes from (law, regulation, the tax authority, or a professional reading), since when it
   applies, what its value is, and when it was last compared with its source. A value that the law changes over time
   (the VAT rate, the allocation-number threshold, a ceiling) is a list of versions with dates: a document is always
   checked against the version in force on ITS date, so a change in the law never rewrites the answer for an older
   document. A change in the law is one new version here, with its source and its date; nothing else in the system
   holds a rate or a threshold.

   What this file is not: it is not legal advice and it is not the accountant. `verified` is the day the value was
   compared with the source named beside it, and `verifiedHow` says against what (the text of the law, or a secondary
   source only). A rule the accountant has not confirmed is shown as such on the compliance screen; the accountant's
   confirmations are kept in the database (fin_settings "tax_rules_confirmed"), not here. */
export const ENGINE_VERSION = '2026-11-14.1'
export const ISRAEL_TAX_RULES_ENGINE = 'ISRAEL_TAX_RULES_ENGINE'

export const SOURCE_KIND = { law: 'חוק', regulation: 'תקנות / צו', authority: 'הוראת רשות המסים', professional: 'פרשנות מקצועית', system: 'הגדרת המערכת' }
const pctShow = (v) => `${Math.round(v * 10000) / 100}%`
const ils = (v) => `${Number(v).toLocaleString('he-IL')} ₪`

/* placeholders are filled by RULE_DATA below; the shape of every rule:
   { id, name, area, text, source: { kind, name, url }, published, applies, versions: [{ v, from, to, value, note }],
     show(value), verified, verifiedHow, caveat } */
export const RULES = {}
const rule = (r) => { RULES[r.id] = r; return r }

// ---------- VAT ----------
rule({ id: 'vat_rate', area: 'vat', name: 'שיעור המע״מ', applies: 'כל מסמך עם מע״מ', show: pctShow,
  text: 'שיעור המע״מ נקבע לפי תאריך המסמך. החישוב נבדק מול השיעור שהיה בתוקף באותו יום.',
  source: { kind: 'regulation', name: 'צו מס ערך מוסף (שיעור המס על עסקה ועל יבוא טובין)', url: '' },
  versions: [
    { v: '2010-01', from: '2010-01-01', to: '2012-08-31', value: 0.16 },
    { v: '2012-09', from: '2012-09-01', to: '2013-06-01', value: 0.17 },
    { v: '2013-06', from: '2013-06-02', to: '2015-09-30', value: 0.18 },
    { v: '2015-10', from: '2015-10-01', to: '2024-12-31', value: 0.17 },
    { v: '2025-01', from: '2025-01-01', to: null, value: 0.18 },
  ], verified: null, verifiedHow: '', caveat: 'השיעור נקבע לפי מועד החיוב במס של העסקה, שלרוב הוא תאריך החשבונית אבל לא תמיד. לא נמצאה הודעה על שינוי שיעור אחרי נובמבר 2026.' })
rule({ id: 'vat_zero_exempt', area: 'vat', name: 'מע״מ בשיעור אפס, עסקה פטורה ועוסק פטור', applies: 'חשבונית בלי מע״מ', show: () => 'אין מס תשומות',
  text: 'בחשבונית בלי מע״מ (עסקה בשיעור אפס, עסקה פטורה, או ספק שהוא עוסק פטור) אין מס תשומות לקיזוז. המערכת לא מניחה מע״מ שלא מודפס.',
  source: { kind: 'law', name: 'חוק מס ערך מוסף, סעיפים 30, 31 ו-47(א)', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 0 }], verified: null, verifiedHow: '' })
rule({ id: 'vat_deduction_document', area: 'vat', name: 'מסמך שמאפשר ניכוי מס תשומות', applies: 'חשבונית מס, חשבונית מס/קבלה, קבלה, חשבון עסקה', show: () => 'חשבונית מס בלבד',
  text: 'מס תשומות מנוכה רק לפי חשבונית מס שהוצאה כדין, הצהרת יבוא או מסמך אחר שאישר המנהל, ורק על תשומות שמשמשות בעסקה החייבת במס (סעיף 41). קבלה, אישור תשלום וחשבון עסקה אינם מספיקים. חריג: קבלה שנושאת את הכותרת "חשבונית מס" ואת כל הפרטים הנדרשים.',
  source: { kind: 'law', name: 'חוק מס ערך מוסף, סעיפים 38(א) ו-41', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 'tax_invoice' }], verified: null, verifiedHow: '' })
rule({ id: 'vat_six_months', area: 'vat', name: 'ניכוי בתוך שישה חודשים', applies: 'חשבונית מס', show: (v) => `${v} חודשים`,
  text: 'מס תשומות מנוכה בתוך שישה חודשים מיום הוצאת החשבונית. חשבונית ישנה יותר שעוד לא אושרה מסומנת לבדיקת רואה החשבון.',
  source: { kind: 'law', name: 'חוק מס ערך מוסף, סעיף 38(א)', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 6 }], verified: null, verifiedHow: '' })
rule({ id: 'vat_allocation', area: 'vat', name: 'מספר הקצאה (חשבוניות ישראל)', applies: 'חשבונית מס מעל הסף', show: (v) => `מעל ${ils(v)} לפני מע״מ`,
  text: 'חשבונית מס שסכומה בלא המס עולה על הסף צריכה מספר הקצאה מרשות המסים, אחרת הקונה אינו מנכה את מס התשומות שבה. מ-1.1.2026 גם ההוצאה עצמה אינה מוכרת במס הכנסה. חשבונית בשיעור אפס אינה בתחולה. המספר יכול להתבקש גם אחרי הוצאת החשבונית, אבל מגבלת ששת החודשים אינה נדחית.',
  source: { kind: 'law', name: 'חוק מס ערך מוסף, סעיפים 38(א1) ו-47(א2); חוק ההתייעלות הכלכלית 2023-2024 (ס״ח 3045) וחוק התקציב 2025 (ס״ח 3384)', url: '' },
  versions: [
    { v: '2024-05', from: '2024-05-05', to: '2024-12-31', value: 25000, note: 'בחוק מ-1.1.2024; רשות המסים החילה בפועל מ-5.5.2024 (מועד שנמצא רק במקורות מקצועיים)' },
    { v: '2025-01', from: '2025-01-01', to: '2025-12-31', value: 20000 },
    { v: '2026-01', from: '2026-01-01', to: '2026-05-31', value: 10000 },
    { v: '2026-06', from: '2026-06-01', to: null, value: 5000, note: 'הנוסח הקבוע של הסעיף; לא נחקקה מדרגה נוספת' },
  ], verified: null, verifiedHow: '' })
rule({ id: 'vat_mixed_use', area: 'vat', name: 'תשומות לשימוש מעורב, עסקי ופרטי', applies: 'הוצאה שמשמשת גם שלא לעסק', show: () => '2/3 או 1/4',
  text: 'תשומה שמשמשת גם לעסק וגם שלא לעסק מנוכה לפי חלק השימוש לעסק. כשהחלק לא נקבע: עיקר השימוש לעסק, שני שלישים ממס התשומות; עיקר השימוש שלא לעסק, רבע.',
  source: { kind: 'regulation', name: 'תקנות מס ערך מוסף, תקנה 18', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: { mostlyBusiness: 2 / 3, mostlyPrivate: 1 / 4 } }], verified: null, verifiedHow: '' })
rule({ id: 'vat_vehicle', area: 'vat', name: 'רכב פרטי', applies: 'רכישת רכב פרטי, דלק ואחזקת רכב', show: () => 'רכישה: אין ניכוי · הוצאות שוטפות: לפי תקנה 18',
  text: 'מס התשומות על רכישה או יבוא של רכב פרטי (כולל רכב מסחרי עד 3,500 ק״ג) אינו ניתן לניכוי, חוץ מעסקים שהרכב הוא מלאי או כלי העבודה שלהם. תקנה 14 חלה רק על רכישה ויבוא; על דלק, אחזקה וליסינג חל כלל השימוש המעורב שבתקנה 18.',
  source: { kind: 'regulation', name: 'תקנות מס ערך מוסף, תקנות 14 ו-18', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 2 / 3 }], verified: null, verifiedHow: '', caveat: 'נוסח התקנות אומת. החלת תקנה 18 על דלק, אחזקה וליסינג היא הקריאה המקובלת; לא נקראה הוראה של רשות המסים בעניין.' })
rule({ id: 'vat_hospitality', area: 'vat', name: 'אירוח, ארוחות והטבות לעובדים', applies: 'כיבוד, מסעדות, אירוח, מתנות לעובדים', show: () => 'אין ניכוי (חריג: אורח מחו״ל)',
  text: 'מס תשומות בשל הוצאות אירוח אינו ניתן לניכוי, פרט לאירוח אדם מחוץ לארץ (תקנה 16). גם מס תשומות בשל עובד (ארוחה, מתנה, דיור, בידור) אינו ניתן לניכוי, אלא אם נמכר לעובד ודווח כעסקה (תקנה 15א).',
  source: { kind: 'regulation', name: 'תקנות מס ערך מוסף, תקנות 15א ו-16', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 0 }], verified: null, verifiedHow: '', caveat: 'שכיבוד קל במשרד נכנס לתקנות האלה היא הקריאה המקובלת; לא נקראה הוראה של רשות המסים.' })
rule({ id: 'vat_foreign_supplier', area: 'vat', name: 'ספק מחוץ לישראל', applies: 'חשבונית של ספק זר', show: () => 'לבדיקת רו״ח',
  text: 'במסמך של ספק זר אין מע״מ ישראלי לקיזוז. כשהמוכר או נותן השירות בעסקה בישראל הוא תושב חוץ, תשלום המס חל על הקונה, אלא אם יש בידו חשבונית. ההכרעה אצל רואה החשבון.',
  source: { kind: 'regulation', name: 'תקנות מס ערך מוסף, תקנה 6ד', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 'review' }], verified: null, verifiedHow: '' })
rule({ id: 'vat_credit_note', area: 'vat', name: 'חשבונית זיכוי', applies: 'חשבונית זיכוי', show: () => 'מקטינה את ההוצאה ואת מס התשומות',
  text: 'הודעת זיכוי מציינת את מספרי החשבוניות שאליהן היא מתייחסת ואת סיבת הזיכוי, ואינה עולה על החשבונית. היא מקטינה את ההוצאה ואת מס התשומות שנוכה לפי החשבונית, פעם אחת, ואינה נרשמת כהוצאה חדשה.',
  source: { kind: 'regulation', name: 'הוראות מס הכנסה (ניהול פנקסי חשבונות) (מס׳ 2), סעיפים 9(ה) ו-23א', url: '' }, versions: [{ v: '1', from: '1976-07-01', to: null, value: 'reduce' }], verified: null, verifiedHow: '' })

// ---------- income tax ----------
rule({ id: 'income_general', area: 'income', name: 'הוצאה בייצור הכנסה', applies: 'כל הוצאה', show: () => 'מוכרת במלואה',
  text: 'יציאות והוצאות שיצאו כולן בייצור ההכנסה בשנת המס ולשם כך בלבד מותרות בניכוי, אלא אם סעיף 32 או התקנות מגבילים אותן (הוצאה פרטית, הוצאה הונית, ארוחות ועוד).',
  source: { kind: 'law', name: 'פקודת מס הכנסה, סעיפים 17 ו-32', url: '' }, versions: [{ v: '1', from: '1961-01-01', to: null, value: 1 }], verified: null, verifiedHow: '' })
rule({ id: 'income_refreshments', area: 'income', name: 'כיבוד במקום העסק', applies: 'כיבוד קל', show: pctShow,
  text: 'מותרים בניכוי 80% מהוצאות כיבוד קל במקום העיסוק (שתייה חמה או קרה, עוגיות וכיוצא באלה). ארוחות ומסעדות אינן כיבוד.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי הוצאות מסויימות), התשל״ב-1972, תקנה 2(1)', url: '' }, versions: [{ v: '1', from: '1998-01-01', to: null, value: 0.8 }], verified: null, verifiedHow: '' })
rule({ id: 'income_meals', area: 'income', name: 'ארוחות, מסעדות ואירוח', applies: 'מסעדות, ארוחות, אירוח', show: () => 'לא מוכר (חריג: אורח מחו״ל)',
  text: 'הוצאות אירוח בישראל אינן מותרות בניכוי, למעט הוצאה סבירה לאירוח אדם מחוץ לארץ. ארוחות (אש״ל) אינן מותרות, חוץ מארוחת בוקר שכלולה בלינה מוכרת.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי הוצאות מסויימות), תקנות 2(2א) ו-3; פקודת מס הכנסה, סעיף 32(1)', url: '' }, versions: [{ v: '1', from: '1998-01-01', to: null, value: 0 }], verified: null, verifiedHow: '' })
rule({ id: 'income_gifts', area: 'income', name: 'מתנות', applies: 'מתנות ללקוחות, לספקים ולעובדים', show: (v) => `עד ${ils(v)} לאדם לשנה`,
  text: 'מתנה שניתנה במסגרת קשרי עסקים מוכרת עד תקרה שנתית לאדם (לאדם בחו״ל: 15 דולר), ובלבד שנרשמו פרטי המקבל והמקום ויש קבלה. מעל התקרה ההוצאה אינה מוכרת.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי הוצאות מסויימות), התשל״ב-1972, תקנה 2(4)', url: '' }, versions: [{ v: '2024', from: '2024-01-01', to: '2027-12-31', value: 240, note: 'הסכום קפוא לשנים 2024 עד 2027' }], verified: null, verifiedHow: '', caveat: 'הסכום נלקח מהערות העדכון שבנוסח המאוחד; הודעת העדכון הרשמית לא נקראה. למסמכים מלפני 2024 התקרה הייתה אחרת.' })
rule({ id: 'income_phone', area: 'income', name: 'טלפון נייד', applies: 'חשבונות סלולר', show: (v) => `לא מוכר: הנמוך מבין ${ils(v)} לשנה או מחצית ההוצאה`,
  text: 'מהוצאות טלפון נייד לא מותר בניכוי הסכום הנמוך מבין הסכום השנתי שבתקנה או מחצית ההוצאה. טלפון נייד שהועמד לרשות עובד מוכר למעסיק במלואו (העובד ממוסה על שווי השימוש). החישוב השנתי אצל רואה החשבון.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי הוצאות מסויימות), התשל״ב-1972, תקנה 2ב(ג)', url: '' }, versions: [{ v: '2023', from: '2023-01-01', to: '2027-12-31', value: 1380 }], verified: null, verifiedHow: '', caveat: 'הסכום נלקח מהערות העדכון שבנוסח המאוחד; הודעת העדכון הרשמית לא נקראה.' })
rule({ id: 'income_vehicle', area: 'income', name: 'הוצאות רכב', applies: 'דלק, ליסינג, ביטוח רכב, תיקונים, חניה', show: (v) => `הגבוה מבין: ההוצאות פחות שווי השימוש, או ${pctShow(v)}`,
  text: 'רכב שהועמד לרשות עובד מוכר במלואו (העובד ממוסה על שווי השימוש). אחרת, הוצאות רכב עד 3,500 ק״ג מוכרות בסכום הגבוה מבין ההוצאות פחות שווי השימוש, או 45% מההוצאות. רכב של 3,500 ק״ג ומעלה, רכב עבודה ורכב תפעולי מחוץ להגבלה. המערכת מציגה 45% כהערכה שמרנית; החישוב אצל רואה החשבון.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי הוצאות רכב), התשנ״ה-1995, תקנות 1 עד 3', url: '' }, versions: [{ v: '1', from: '2008-01-01', to: null, value: 0.45 }], verified: null, verifiedHow: '' })
rule({ id: 'income_travel', area: 'income', name: 'נסיעות לחו״ל ולינה', applies: 'טיסות, מלונות, אש״ל', show: () => 'בתקרות, לפי התקנות',
  text: 'נסיעה לחו״ל: טיסה עד מחיר מחלקת עסקים; לינה ושהייה עד תקרות בדולרים שמתעדכנות כל שנה. לינה בארץ אינה מוכרת בטווח 100 ק״מ מהבית או ממקום העיסוק, ומעליו בתקרה. החישוב אצל רואה החשבון.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי הוצאות מסויימות), התשל״ב-1972, תקנות 2(2) ו-2(2א)', url: '' }, versions: [{ v: '1', from: '1998-01-01', to: null, value: 'review' }], verified: null, verifiedHow: '' })
rule({ id: 'income_fines', area: 'income', name: 'קנסות', applies: 'קנסות, דוחות חניה ותנועה', show: () => 'לא מוכר',
  text: 'קנס אינו הוצאה בייצור הכנסה ולכן אינו מוכר. זה הכלל המקובל, על בסיס סעיף 17 והפסיקה; הוא אינו כתוב במפורש בסעיף 32.',
  source: { kind: 'professional', name: 'פקודת מס הכנסה, סעיף 17, ופסיקה', url: '' }, versions: [{ v: '1', from: '2010-01-01', to: null, value: 0 }], verified: null, verifiedHow: '', unverified: true, caveat: 'לא נמצא נוסח חוק מפורש. מסומן כהערכה ולבדיקת רואה החשבון.' })
rule({ id: 'income_donations', area: 'income', name: 'תרומות', applies: 'תרומות', show: () => 'זיכוי ממס, לא הוצאה',
  text: 'תרומה למוסד ציבורי מאושר אינה הוצאה: היא מזכה בזיכוי ממס (לחברה, בשיעור מס החברות), מסכום מינימלי ועד תקרה. מטופלת אצל רואה החשבון.',
  source: { kind: 'law', name: 'פקודת מס הכנסה, סעיף 46', url: '' }, versions: [{ v: '1', from: '1961-01-01', to: null, value: 0 }], verified: null, verifiedHow: '' })
rule({ id: 'income_fixed_asset', area: 'income', name: 'רכוש קבוע', applies: 'ציוד, מחשבים, ריהוט, מכונות', show: (v) => `נבדק מעל ${ils(v)}`,
  text: 'ציוד שמשמש את העסק יותר משנה אינו הוצאה שוטפת: הוא מוכר בפחת לאורך שנים, בשיעורים שבתקנות הפחת. הסף כאן הוא רק הסכום שממנו המערכת מעירה; ההחלטה אצל רואה החשבון.',
  source: { kind: 'law', name: 'פקודת מס הכנסה, סעיפים 21 ו-32(3); תקנות מס הכנסה (פחת), 1941. הסף לסימון: הגדרת המערכת', url: '' }, versions: [{ v: '1', from: '2020-01-01', to: null, value: 2500 }], verified: null, verifiedHow: '' })

// ---------- bookkeeping, cash, withholding ----------
rule({ id: 'books_invoice_contents', area: 'books', name: 'הפרטים שחייבים להופיע בחשבונית מס', applies: 'חשבונית מס, חשבונית זיכוי', show: () => 'שם, מספר עוסק, מספר, תאריך, סכומים',
  text: 'חשבונית מס כוללת: שם, כתובת ומספר הרישום של העוסק, הכותרת "חשבונית מס" והמילה "מקור", תאריך, שם הלקוח, תיאור, כמות ומחיר, הסכום בלא מע״מ, סכום המע״מ ושיעורו, והסכום הכולל. מספר הקצאה, כשנדרש, מופיע על החשבונית.',
  source: { kind: 'regulation', name: 'הוראות מס הכנסה (ניהול פנקסי חשבונות) (מס׳ 2), סעיף 9(א), וסעיף 9א מתקנות מע״מ (ניהול פנקסי חשבונות); חוק מע״מ, סעיף 47', url: '' }, versions: [{ v: '1', from: '1973-01-01', to: null, value: 'fields' }], verified: null, verifiedHow: '' })
rule({ id: 'books_retention', area: 'books', name: 'שמירת מסמכים', applies: 'כל מסמך', show: (v) => `${v} שנים`,
  text: 'מערכת החשבונות נשמרת שבע שנים מתום שנת המס שאליה היא מתייחסת, או שש שנים מיום הגשת הדוח, לפי המאוחר. שמירה סרוקה מותרת בתנאים.',
  source: { kind: 'regulation', name: 'הוראות מס הכנסה (ניהול פנקסי חשבונות) (מס׳ 2), סעיף 25', url: '' }, versions: [{ v: '1', from: '1973-01-01', to: null, value: 7 }], verified: null, verifiedHow: '' })
rule({ id: 'cash_limit', area: 'cash', name: 'תקרת תשלום במזומן', applies: 'מסמך ששולם במזומן', show: ils,
  text: 'בעסקה שמחירה (כולל מע״מ) עולה על התקרה, עוסק אינו נותן ואינו מקבל במזומן יותר מ-10% מהמחיר או מסכום התקרה, לפי הנמוך. הפרה שהוטל עליה עיצום שוללת גם את ניכוי מס התשומות ואת ההוצאה.',
  source: { kind: 'law', name: 'חוק לצמצום השימוש במזומן, התשע״ח-2018, סעיף 2; צו תיקון התוספת הראשונה (ק״ת 9727)', url: '' }, versions: [{ v: '2019-01', from: '2019-01-01', to: '2022-07-31', value: 11000, note: 'מועד התחילה 1.1.2019 לא נקרא מחדש' }, { v: '2022-08', from: '2022-08-01', to: null, value: 6000 }], verified: null, verifiedHow: '' })
rule({ id: 'withholding_services', area: 'withholding', name: 'ניכוי מס במקור מתשלומים לספקים', applies: 'קבלני משנה, שירותים, נכסים', show: () => 'לפי אישור הספק',
  text: 'מתשלום בעד שירותים או נכסים, ומתשלום של קבלן בעד עבודות בנייה והובלה, מנוכה מס במקור: 20%, ו-30% כשלמקבל אין אישור על ניהול פנקסים. בפועל השיעור נקבע לפי אישור ניכוי המס של הספק. המערכת רק מזכירה לבדוק את האישור.',
  source: { kind: 'regulation', name: 'תקנות מס הכנסה (ניכוי מתשלומים בעד שירותים או נכסים), התשל״ז-1977; תקנות ניכוי מתשלומים בעד עבודות בניה והובלה', url: '' }, versions: [{ v: '1', from: '1977-01-01', to: null, value: 'check_certificate' }], verified: null, verifiedHow: '', caveat: 'מי נחשב משלם שחייב בניכוי, והסכום הקטן שפטור ממנו, לא נבדקו.' })
rule({ id: 'vat_exempt_dealer', area: 'vat', name: 'תקרת עוסק פטור', applies: 'ספק שהוא עוסק פטור', show: ils,
  text: 'עוסק שמחזור עסקאותיו בשנה אינו עולה על התקרה הוא עוסק פטור: הוא אינו רשאי להוציא חשבונית מס, ולכן אין במסמכים שלו מס תשומות.',
  source: { kind: 'law', name: 'חוק מס ערך מוסף, סעיף 1 (הגדרת עוסק פטור) וסעיף 47(א)', url: '' }, versions: [{ v: '2024', from: '2024-01-01', to: '2025-12-31', value: 120000 }, { v: '2026', from: '2026-01-01', to: '2026-12-31', value: 122833 }], verified: null, verifiedHow: '', caveat: 'הסכום ל-2026 נלקח מהערות העדכון שבנוסח המאוחד וממקורות מקצועיים; הודעת העדכון הרשמית לא נקראה.' })
rule({ id: 'income_allocation', area: 'income', name: 'חשבונית בלי מספר הקצאה: גם ההוצאה אינה מוכרת', applies: 'חשבונית מס מעל הסף בלי מספר הקצאה', show: () => 'ההוצאה אינה מוכרת',
  text: 'הוצאה שמס התשומות בגינה נשלל בגלל היעדר מספר הקצאה אינה מותרת בניכוי גם לצורכי מס הכנסה. חל על תשלומים והוצאות מ-1.1.2026.',
  source: { kind: 'law', name: 'פקודת מס הכנסה, סעיף 32(18); חוק התקציב 2025 (ס״ח 3384)', url: '' }, versions: [{ v: '2026-01', from: '2026-01-01', to: null, value: 0 }], verified: null, verifiedHow: '' })

// ---------- where each rule was compared with its source, and when ----------
const CHECKED = '2026-11-13'
const R = 'נוסח רשומות'; const W = 'נוסח מאוחד לא רשמי (ויקיטקסט); לאמת מול הנוסח הרשמי'
const wiki = (title) => `https://he.wikisource.org/wiki/${encodeURI(title)}`
const VAT_LAW = wiki('חוק_מס_ערך_מוסף'); const VAT_REGS = wiki('תקנות_מס_ערך_מוסף'); const IT_REGS = wiki('תקנות_מס_הכנסה_(ניכוי_הוצאות_מסויימות)'); const ITO = wiki('פקודת_מס_הכנסה'); const BOOKS = wiki('הוראות_מס_הכנסה_(ניהול_פנקסי_חשבונות)')
const SEEN = {
  vat_rate: [R, 'https://olaw.org.il/takanot/takanot-11179.pdf'], vat_zero_exempt: [W, VAT_LAW], vat_deduction_document: [W, VAT_LAW], vat_six_months: [W, VAT_LAW],
  vat_allocation: [R, 'https://fs.knesset.gov.il/25/law/25_lsr_6133485.pdf'], vat_mixed_use: [W, VAT_REGS], vat_vehicle: [W, VAT_REGS], vat_hospitality: [W, VAT_REGS], vat_foreign_supplier: [W, VAT_REGS],
  vat_credit_note: [W, BOOKS], vat_exempt_dealer: [W, VAT_LAW], income_general: [W, ITO], income_refreshments: [W, IT_REGS], income_meals: [W, IT_REGS], income_gifts: [W, IT_REGS], income_phone: [W, IT_REGS],
  income_vehicle: [W, wiki('תקנות_מס_הכנסה_(ניכוי_הוצאות_רכב)')], income_travel: [W, IT_REGS], income_donations: [W, ITO], income_fixed_asset: [W, ITO], income_allocation: [R, 'https://fs.knesset.gov.il/25/law/25_lsr_6133485.pdf'],
  books_invoice_contents: [W, BOOKS], books_retention: [W, BOOKS], cash_limit: [R, 'https://olaw.org.il/takanot/takanot-9727.pdf'],
  withholding_services: [W, wiki('תקנות_מס_הכנסה_(ניכוי_מתשלומים_בעד_שירותים_או_נכסים)')], income_fines: [null, ITO],
}
for (const [id, [how, url]] of Object.entries(SEEN)) { const r = RULES[id]; r.source.url = url; if (how) { r.verified = CHECKED; r.verifiedHow = how } }

/* the version of a rule in force on a day (null when none: before the first version, or a rule not yet in force) */
export function ruleOn(id, day) {
  const r = RULES[id]; if (!r) return null
  const d = /^\d{4}-\d{2}-\d{2}/.test(String(day || '')) ? String(day).slice(0, 10) : new Date().toISOString().slice(0, 10)
  return r.versions.find((v) => d >= v.from && (!v.to || d <= v.to)) || null
}
/* what a check writes down: the rule, the version that applied on the document's date, and the source */
export function ruleRef(id, day) {
  const r = RULES[id]; if (!r) return null
  const v = ruleOn(id, day) || r.versions[r.versions.length - 1]
  return { name: r.name, version: v.v, source: r.source }
}
/* בתוקף / עתידי / מבוטל / דורש בדיקה */
export function ruleState(r, today, watch = {}) {
  const src = WATCH.filter((w) => w.rules.includes(r.id)).map((w) => watch[w.id]).filter(Boolean)
  if (src.some((s) => ['changed', 'value_missing'].includes(s.status))) return { key: 'check', tone: 'warn', label: 'דורש בדיקה: המקור השתנה' }
  if (!r.verified || r.unverified) return { key: 'check', tone: 'warn', label: 'דורש בדיקה: לא אומת מול נוסח חוק' }
  if (ruleOn(r.id, today)) return { key: 'active', tone: 'ok', label: 'בתוקף' }
  if (r.versions.every((v) => v.from > today)) return { key: 'future', tone: 'info', label: 'עתידי' }
  return { key: 'ended', tone: 'muted', label: 'מבוטל' }
}

/* What kind of expense a document is, for the two tax questions. `category` matches the category's name, `text` matches
   the document's description and supplier; `strong` means the text wins even over a narrow category.
   income: { rule, pct (null = the general rule, 100%), review (true = an estimate the accountant settles), text }
   vat:    { rule, pct, text } when the regulations say something about this kind; null = by the category's setting */
export const KINDS = [
  { id: 'fines', label: 'קנס', strong: true, text: /קנס|דו["״]?ח (חניה|תנועה)|עבירת תנועה/, noVat: true,
    income: { rule: 'income_fines', pct: 0, review: true, text: 'קנס אינו מוכר כהוצאה, לפי הכלל המקובל (לא נמצא נוסח חוק מפורש).' }, vat: null },
  { id: 'donation', label: 'תרומה', strong: true, category: /תרומ/, text: /תרומה|סעיף 46/, noVat: true,
    income: { rule: 'income_donations', pct: 0, text: 'תרומה אינה הוצאה: היא מזכה בזיכוי ממס אצל רואה החשבון.' }, vat: null },
  { id: 'meals', label: 'ארוחות ומסעדות', strong: true, text: /מסעד|ארוח(ה|ות)|wolt|וולט|תן ?ביס|סיבוס|cibus|10bis|קייטרינג/i,
    income: { rule: 'income_meals', pct: 0, review: true, text: 'ארוחות ואירוח אינם מוכרים, למעט אירוח סביר של אדם מחו״ל. מוצג 0% עד בדיקה.' }, vat: { rule: 'vat_hospitality', pct: 0, text: 'מס התשומות אינו ניתן לניכוי' } },
  { id: 'refreshments', label: 'כיבוד', category: /כיבוד|אירוח/, text: /כיבוד|קפה|חלב|עוגיות|שתי(י)?ה/,
    income: { rule: 'income_refreshments', pct: 80, text: 'כיבוד קל במקום העסק מוכר ב-80%.' }, vat: { rule: 'vat_hospitality', pct: 0, text: 'מס התשומות אינו ניתן לניכוי' } },
  { id: 'gifts', label: 'מתנות', strong: true, category: /מתנ/, text: /מתנ(ה|ות)|שי לחג|תלושי שי|זר פרחים/,
    income: { rule: 'income_gifts', pct: 100, review: true, text: 'מתנה מוכרת רק עד התקרה השנתית לאדם; צריך לבדוק למי ניתנה וכמה.' }, vat: null },
  { id: 'vehicle', label: 'רכב ודלק', category: /רכב|דלק|תחבורה/, text: /דלק|תדלוק|סונול|פז\b|דור אלון|ליסינג|חניה|חניון|כביש 6|מוסך|צמיג|טסט|רישוי רכב/,
    income: { rule: 'income_vehicle', pct: 45, review: true, text: 'הוצאות רכב מוכרות בסכום הגבוה מבין ההוצאות פחות שווי השימוש או 45%. מוצג 45% כהערכה.' }, vat: { rule: 'vat_vehicle', pct: 66.67, text: 'מנוכים לרוב שני שלישים ממס התשומות (שימוש מעורב)' } },
  { id: 'phone', label: 'טלפון נייד', text: /סלולר|פלאפון|סלקום|פרטנר|הוט מובייל|גולן טלקום|cellcom|pelephone/i,
    income: { rule: 'income_phone', pct: 100, review: true, text: 'טלפון נייד: חלק מההוצאה אינו מוכר (הנמוך מבין הסכום השנתי שבתקנה או מחצית ההוצאה), אלא אם הועמד לרשות עובד. החישוב השנתי אצל רואה החשבון.' }, vat: null },
  { id: 'travel', label: 'נסיעות ולינה', category: /נסיע/, text: /טיסה|מלון|לינה|booking|airbnb|אל על|hotel/i,
    income: { rule: 'income_travel', pct: 100, review: true, text: 'נסיעות לחו״ל ולינה מוכרות עד תקרות; החישוב אצל רואה החשבון.' }, vat: null },
  { id: 'insurance', label: 'ביטוח', category: /ביטוח/, noVat: true, income: { rule: 'income_general', pct: null, text: '' }, vat: null },
  { id: 'finance', label: 'מימון ועמלות', category: /מימון|ריבית|עמלות|בנק/, noVat: true, income: { rule: 'income_general', pct: null, text: '' }, vat: null },
  { id: 'fees', label: 'אגרות, ארנונה והיטלים', category: /אגר|היטל|ארנונה/, text: /ארנונה|אגרת|היטל/, noVat: true, income: { rule: 'income_general', pct: null, text: '' }, vat: null },
  { id: 'subcontractors', label: 'קבלני משנה ושירותים', category: /קבלנ|שירותים מקצועיים|ייעוץ|משפטי|הנהלת חשבונות/, withholding: true, income: { rule: 'income_general', pct: null, text: '' }, vat: null },
  { id: 'equipment', label: 'ציוד', category: /ציוד|כלים/, text: /מחשב נייד|מחשב|מדפסת|ריהוט|מזגן|מכונ(ה|ת)/, asset: true, income: { rule: 'income_general', pct: null, text: '' }, vat: null },
  { id: 'general', label: 'הוצאה שוטפת', category: /.*/, income: { rule: 'income_general', pct: null, text: '' }, vat: null },
]

/* The official pages the rules come from, read once a day by the compliance agent (server/finance/compliance.js).
   `expect`: a value a rule relies on that should appear on the page; when it no longer does, the rule is marked for a
   check. `must`: words that prove the page really loaded (a bot check or an empty shell is not a reading). */
const raw = (title) => `https://he.wikisource.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`
const knesset = (id) => `https://knesset.gov.il/Odata/ParliamentInfo.svc/KNS_IsraelLaw(${id})?$format=json`
export const WATCH = [
  { id: 'vat_rate_order', label: 'צו שיעור המע״מ (נוסח מאוחד)', url: raw('צו_מס_ערך_מוסף_(שיעור_המס_על_עסקה_ועל_יבוא_טובין)'), rules: ['vat_rate'], min: 100, expect: [{ text: '18%', label: 'שיעור 18%' }] },
  { id: 'vat_law_record', label: 'חוק מס ערך מוסף: רשומת הכנסת (מועד התיקון האחרון)', url: knesset(2001068), rules: ['vat_allocation', 'vat_deduction_document', 'vat_six_months', 'vat_zero_exempt', 'vat_exempt_dealer'], min: 60, must: ['LatestPublicationDate'] },
  { id: 'vat_law_text', label: 'חוק מס ערך מוסף (נוסח מאוחד)', url: raw('חוק_מס_ערך_מוסף'), rules: ['vat_allocation', 'vat_deduction_document', 'vat_six_months', 'vat_zero_exempt', 'vat_exempt_dealer'], must: ['חשבונית מס'] },
  { id: 'vat_regs_text', label: 'תקנות מס ערך מוסף (נוסח מאוחד)', url: raw('תקנות_מס_ערך_מוסף'), rules: ['vat_mixed_use', 'vat_vehicle', 'vat_hospitality', 'vat_foreign_supplier'], must: ['מס תשומות'] },
  { id: 'ito_record', label: 'פקודת מס הכנסה: רשומת הכנסת (מועד התיקון האחרון)', url: knesset(2000943), rules: ['income_general', 'income_allocation', 'income_donations', 'income_fixed_asset'], min: 60, must: ['LatestPublicationDate'] },
  { id: 'it_expenses_regs', label: 'תקנות מס הכנסה (ניכוי הוצאות מסויימות)', url: raw('תקנות_מס_הכנסה_(ניכוי_הוצאות_מסויימות)'), rules: ['income_refreshments', 'income_meals', 'income_gifts', 'income_phone', 'income_travel'], must: ['כיבוד'] },
  { id: 'it_vehicle_regs', label: 'תקנות מס הכנסה (ניכוי הוצאות רכב)', url: raw('תקנות_מס_הכנסה_(ניכוי_הוצאות_רכב)'), rules: ['income_vehicle'], must: ['רכב'] },
  { id: 'books_text', label: 'הוראות ניהול פנקסי חשבונות', url: raw('הוראות_מס_הכנסה_(ניהול_פנקסי_חשבונות)'), rules: ['books_invoice_contents', 'books_retention', 'vat_credit_note'], must: ['פנקס'] },
  { id: 'cash_record', label: 'חוק לצמצום השימוש במזומן: רשומת הכנסת', url: knesset(2068051), rules: ['cash_limit'], min: 60, must: ['LatestPublicationDate'] },
  { id: 'allocation_page', label: 'רשות המסים: בקשת מספר הקצאה לחשבונית מס', url: 'https://www.gov.il/he/service/request-assignment-number-for-tax-invoice', rules: ['vat_allocation'], must: ['הקצאה'] },
]
