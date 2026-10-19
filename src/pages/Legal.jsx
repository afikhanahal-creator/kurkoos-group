import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import { track } from '../lib/track.js'
import DEF from '../lib/pageBuilder/defs/legal.js'
import { PageSections } from '../lib/pageBuilder/PageRenderer.jsx'
import './InfoPage.css'
import './Legal.css'

/* ============================================================
   דף משפטי. kind = 'accessibility' | 'privacy' | 'terms'.
   ל-'privacy' מוצג מסמך מלא ומפורט (תיקון 13 לחוק הגנת הפרטיות) עם
   פרטי קבוצת קורקוס. accessibility/terms — טקסט תמציתי.
   ============================================================ */

// פרטי החברה — מקור אמת אחד. ⚠️ ח.פ. להשלמה כשיתקבל.
const COMPANY = {
  name: { he: 'קבוצת קורקוס נכסים חברה לבניין ויזמות בע״מ', en: 'Kurkoos Group Assets — Construction & Development Ltd.' },
  shortName: { he: 'קבוצת קורקוס', en: 'Kurkoos Group' },
  regNo: '',                         // ח.פ. — להשלמה
  addr: { he: 'הנגר 24, הוד-השרון, מגדלי Amy — מגדל A', en: '24 HaNagar St., Hod HaSharon, Amy Towers — Tower A' },
  phone: '055-981-1814',
  phoneHref: '+972559811814',
  email: 'kurkoosgroup.sales@gmail.com',
  site: 'kurkoos-group.co.il',
  siteHref: 'https://www.kurkoos-group.co.il',
  updated: '20/06/2026',
}

const EMAIL = COMPANY.email

const privacyDoc = {
  he: [
    { h: 'מבוא', p: [
      `ברוך הבא לאתר האינטרנט ו/או הפלטפורמה ו/או כלל השירותים המוצעים בהם (להלן: "השירותים הדיגיטליים") של קבוצת קורקוס נכסים חברה לבניין ויזמות בע״מ (להלן: "החברה").`,
      'החברה מייחסת חשיבות רבה לפרטיות המשתמשים בשירותים הדיגיטליים (להלן: "המשתמשים" או "אתה") ופועלת לשמירת המידע האישי שלך. אנו סבורים כי זכותך להכיר ולהבין כיצד אנו אוספים, מעבדים ומשתמשים במידע המתקבל במהלך שימושך בשירותינו. השימוש שלך בשירותים הדיגיטליים כפוף למדיניות פרטיות זו ולתקנון ותנאי השימוש, המהווים הסכם משפטי מחייב בינך לבין החברה.',
      'מדיניות פרטיות זו מפרטת את סוגי המידע הנאספים אודותיך במסגרת השימוש בשירותים הדיגיטליים, וכן את המטרות והשימושים שאנו עושים במידע זה.',
      'החברה שומרת לעצמה את הזכות להפסיק, באופן מלא או חלקי, זמני או קבוע, את פעילות השירותים הדיגיטליים בכל עת, בין היתר לצורך תחזוקה, שדרוג, תיקון תקלות, או כתוצאה מהפרעות זמניות ברשת. המשתמש מוותר מראש על כל טענה בקשר להפסקות מסוג זה.',
      'מדיניות זו כתובה בלשון זכר לשם הנוחות בלבד, אך פונה ומתייחסת באופן שווה לכלל המגדרים.',
    ] },
    { h: 'הסכמה', p: [
      'בעת הרישום לשירותים הדיגיטליים ו/או השימוש בשירות הנך מביע הסכמתך לתנאי מדיניות פרטיות זו. חלק מהשירותים טעונים מסירת מידע אישי, כגון פרטי תקשורת (שם מלא, טלפון, דוא"ל). אינך מחויב לפי דין למסור מידע זה, ומסירתו תלויה ברצונך החופשי והסכמתך לשימוש בשירותים הדיגיטליים.',
      'אנו מזמינים אותך לקרוא בעיון את מדיניות הפרטיות, ואם אינך מסכים לה — עליך לחדול מלעשות שימוש נוסף בשירותים הדיגיטליים.',
    ] },
    { h: 'הגדרות', ul: [
      '"חשבון אישי/מנוי מערכת" — חשבון משתמש ייעודי שנפתח עבורך לשימוש בשירות.',
      '"אתה" או "משתמש" — האדם אשר משתמש בשירותים הדיגיטליים בכל דרך שהיא.',
      '"מידע אישי" — מידע הקשור ו/או עשוי לזהות אדם — שם, כתובת, מספר טלפון או דוא"ל. לא חלה עליך חובה חוקית למסור מידע אישי; המסירה נעשית בהסכמתך בלבד.',
      '"פלטפורמה" — אתר האינטרנט של החברה.',
      '"שירותים דיגיטליים" — אתר האינטרנט, הפלטפורמה, מענה טלפוני או דיגיטלי ומגוון השירותים המוצעים בהם.',
      '"בעל שליטה במאגר מידע" — מי שקובע את מטרות עיבוד המידע. לצורך העניין — החברה.',
      '"מחזיק" — גורם חיצוני המעבד מידע עבור בעל השליטה.',
      '"עוגיות (Cookies)" — מחרוזת אותיות ומספרים המשמשת לאימות, מעקב ואגירת מידע אודות גולש.',
      '"נתוני שימוש" — נתונים שנאספים אוטומטית כגון משך ביקור בדף.',
      '"מכשיר/התקן" — כל רכיב המשמש לגישה לשירות — מחשב, טלפון נייד או טאבלט.',
      '"ספק שירות" — ישות, חברה, ארגון או אדם המעבד מידע מטעם החברה.',
    ] },
    { h: 'מידע שאנו אוספים', p: [
      'המידע האישי שנאסף מוגבל לנתונים הדרושים לספק לך חוויית שימוש מותאמת אישית. האיסוף מתרחש כאשר אתה נרשם לחשבון אישי ועושה שימוש בשירותים, יוצר עמנו קשר (דוא"ל, טלפון, WhatsApp או טופס יצירת קשר), או גולש בשירותים הדיגיטליים באופן חופשי.',
    ], sub: [
      { t: 'מידע שנמסר בעת הרישום:', ul: ['שם פרטי ושם משפחה', 'מספר טלפון נייד', 'דואר אלקטרוני', 'שם משתמש', 'כל מידע אחר שתבחר לשתף אותנו בו'] },
      { t: 'מידע שנמסר ביצירת קשר:', ul: ['שם פרטי ושם משפחה', 'מספר הטלפון', 'כתובת הדוא"ל', 'נושא פנייתך', 'תוכן שאלתך / בקשתך'] },
    ], pAfter: ['שיחות טלפון עשויות להיות מוקלטות לצורך הכשרת צוות או לאיכות שירות.'] },
    { h: 'מטרות השימוש במידע', ul: [
      'מתן השירותים, טיפול בפניות ורישום לחשבון אישי.',
      'שיפור חוויית השימוש, מדידת ביצועים ועיבוד מידע סטטיסטי.',
      'מילוי דרישות חוקיות (צו שיפוטי, בקשה ממשלתית וכיו"ב).',
      'זיהוי, מניעה וטיפול בתרמית, בעיות אבטחה או תקלות טכניות.',
      'הגנה בפני פגיעה בזכויות צדדים שלישיים, לרבות קניין רוחני.',
      'דיוור ישיר ויצירת קשר עם המשתמשים.',
    ] },
    { h: 'מאגרי מידע', p: [
      'המידע הנאסף יישמר במאגרי המידע של החברה ובאחריותה. החברה הינה בעלת השליטה במאגר המידע הנאסף עת פתיחת חשבון אישי, גלישה באתר או יצירת קשר.',
    ] },
    { h: 'העברת מידע לצדדים שלישיים', p: ['החברה מתחייבת לא להעביר את המידע האישי שלך לגורמים חיצוניים, אלא במקרים הבאים:'], ul: [
      'על פי דרישת המשתמש ו/או בהסכמתו המפורשת.',
      'ספקי צד ג׳ הנדרשים לתפעול השירות (אירוח, אחסון, ניתוח, סליקה) — אך ורק לצרכים רלוונטיים ובהתאם לדין.',
      'הפרת תנאי השימוש ו/או ניסיון ביצוע פעולות אסורות.',
      'צו שיפוטי המורה למסור מידע.',
      'מחלוקות משפטיות בין הצדדים.',
      'מניעת נזק חמור לרכוש ו/או לגוף החברה, המשתמש או צדדים שלישיים.',
      'העברת פעילות החברה לצד שלישי — בכפוף לקבלת מחויבויות הפרטיות.',
    ] },
    { h: 'זכות לעיון, תיקון ומחיקת המידע', p: [
      'זכות לעיון במידע ותיקונו תינתן בהתאם להוראות חוק הגנת הפרטיות, התשמ"א–1981. הנך זכאי לעיין במידע המוחזק אודותיך, בעצמך או באמצעות בא כוחך שהורשה בכתב, ולבקש לתקן או למחוק מידע שאינו נכון, שלם, ברור או מעודכן.',
      `לצורך כך ניתן לפנות אלינו לכתובת הדוא"ל: ${EMAIL}.`,
      'כל המידע אודותייך יימחק ממאגר המידע בעת בקשתך לכך, לא יאוחר מ-2 ימי עסקים ממועד פנייתך בכתב.',
    ] },
    { h: 'אבטחת מידע', p: [
      'אנו מיישמים מערכות ונהלים עדכניים ומחמירים לאבטחת מידע, כמקובל בתעשייה, על מנת למנוע שימוש לא מורשה במידע. יחד עם זאת, אין בהם בטחון מוחלט, ועל המשתמש לנקוט אמצעי הגנה מתאימים על מכשיר הקצה שלו ולשמור על חיסיון סיסמתו.',
    ] },
    { h: 'שימוש בעוגיות ומשואות רשת', p: [
      'אנו משתמשים בעוגיות (Cookies) ומשואות רשת (Web Beacons) לתפעול תקין של השירותים הדיגיטליים. עוגיות "מתמידות" שומרות פרטי התחברות ומידע נוסף לגישה נוחה. עוגיות "זמניות" משמשות לתפעול שוטף, בדיקת תקינות, ניטור ואבטחה — ונמחקות עם סגירת הדפדפן.',
      'ניתן לסרב לקבל עוגיות באמצעות הגדרות הדפדפן, אך הדבר עלול לפגוע בחוויית השימוש.',
    ] },
    { h: 'אתרים אחרים', p: [
      'השירותים הדיגיטליים עשויים להכיל קישורים לאתרים חיצוניים. שימוש באתרים אלה הוא על אחריות המשתמש בלבד, ואנו ממליצים לקרוא את מדיניות הפרטיות של אותם גורמים.',
    ] },
    { h: 'דיוור ישיר', p: [
      'אנו עשויים לשלוח מפעם לפעם מידע שיווקי ופרסומי הקשור לחברה או לשירותיה. מידע זה ישלח אליך רק אם נתת הסכמה מפורשת לכך, ותוכל בכל עת לבטל הסכמתך ולחדול מלקבל הודעות.',
    ] },
    { h: 'שינויים במדיניות הפרטיות', p: [
      'החברה שומרת על הזכות לשנות מדיניות זו בכל עת. שינויים ייכנסו לתוקף במועד העדכון האחרון המצוין בראש המסמך. המשך השימוש בשירותים לאחר תאריך העדכון מהווה הסכמה לשינויים.',
    ] },
  ],
  en: [
    { h: 'Introduction', p: [
      'Welcome to the website, platform and all services offered therein (the "Digital Services") of Kurkoos Group (the "Company").',
      'The Company attaches great importance to the privacy of users of the Digital Services ("users" or "you") and works to protect your personal information. Your use of the Digital Services is subject to this Privacy Policy and to the Terms of Use, which together form a binding legal agreement between you and the Company.',
      'This Privacy Policy details the types of information collected about you when using the Digital Services, and the purposes for which we use it.',
      'The Company reserves the right to suspend, fully or partially, temporarily or permanently, the Digital Services at any time. The user waives any claim regarding such interruptions.',
      'This policy is written in the masculine for convenience only and applies equally to all genders.',
    ] },
    { h: 'Consent', p: [
      'By registering for and/or using the Digital Services you express your consent to this Privacy Policy. Some services require providing personal information such as contact details (full name, phone, email). You are not legally required to provide this information; it is provided at your own free will.',
      'We invite you to read this Privacy Policy carefully. If you do not agree to it, you must stop using the Digital Services.',
    ] },
    { h: 'Definitions', ul: [
      '"Personal Account" — a dedicated user account opened for your use of the service.',
      '"You" or "user" — the person using the Digital Services in any way.',
      '"Personal Information" — information that relates to or may identify a person — name, address, phone number or email. There is no legal obligation to provide it; it is provided by consent only.',
      '"Platform" — the Company\'s website.',
      '"Digital Services" — the website, platform, telephone or digital response and the services offered therein.',
      '"Database Controller" — the party determining the purposes of processing. Here — the Company.',
      '"Holder" — an external party processing information on behalf of the controller.',
      '"Cookies" — a string of characters used for authentication, tracking and storing information about a visitor.',
      '"Usage Data" — automatically collected data such as time spent on a page.',
      '"Device" — any component used to access the service — computer, mobile phone or tablet.',
      '"Service Provider" — an entity processing information on behalf of the Company.',
    ] },
    { h: 'Information We Collect', p: [
      'The personal information collected is limited to data required to provide you with a personalized experience. Collection occurs when you register an account and use the services, contact us (email, phone, WhatsApp or contact form), or browse the Digital Services freely.',
    ], sub: [
      { t: 'Information provided at registration:', ul: ['First and last name', 'Mobile phone number', 'Email', 'Username', 'Any other information you choose to share'] },
      { t: 'Information provided when contacting us:', ul: ['First and last name', 'Phone number', 'Email address', 'Subject of your inquiry', 'Content of your question / request'] },
    ], pAfter: ['Phone calls may be recorded for staff training or service quality.'] },
    { h: 'Purposes of Use', ul: [
      'Providing the services, handling inquiries and account registration.',
      'Improving the user experience, measuring performance and statistical processing.',
      'Meeting legal requirements (court order, government request, etc.).',
      'Detecting, preventing and handling fraud, security issues or technical faults.',
      'Protecting against infringement of third-party rights, including intellectual property.',
      'Direct marketing and contacting users.',
    ] },
    { h: 'Databases', p: [
      'The information collected is stored in the Company\'s databases and under its responsibility. The Company is the controller of the database collected upon account creation, browsing or contact.',
    ] },
    { h: 'Transfer to Third Parties', p: ['The Company undertakes not to transfer your personal information to external parties, except in the following cases:'], ul: [
      'At the user\'s request and/or with explicit consent.',
      'Third-party providers required to operate the service (hosting, storage, analytics, payment) — only for relevant purposes and per law.',
      'Breach of the Terms of Use and/or attempted prohibited actions.',
      'A court order requiring disclosure.',
      'Legal disputes between the parties.',
      'Preventing serious harm to property or person of the Company, user or third parties.',
      'Transfer of the Company\'s activity to a third party — subject to privacy commitments.',
    ] },
    { h: 'Right to Access, Correct and Delete', p: [
      'The right to access and correct information is granted under the Protection of Privacy Law, 5741-1981. You are entitled to review the information held about you and to request corrections or deletion of information that is incorrect, incomplete, unclear or outdated.',
      `To do so, contact us at: ${EMAIL}.`,
      'All information about you will be deleted from the database upon your request, no later than 2 business days from your written request.',
    ] },
    { h: 'Data Security', p: [
      'We apply up-to-date, industry-standard security systems and procedures to prevent unauthorized use of information. However, no system is completely secure, and the user should take appropriate measures on their device and keep their password confidential.',
    ] },
    { h: 'Cookies and Web Beacons', p: [
      'We use Cookies and Web Beacons for the proper operation of the Digital Services. "Persistent" cookies store login details for convenient access. "Session" cookies are used for ongoing operation, monitoring and security — and are deleted when the browser closes.',
      'You may refuse cookies via your browser settings, but this may impair the experience.',
    ] },
    { h: 'Other Websites', p: [
      'The Digital Services may contain links to external websites. Use of these sites is at the user\'s sole responsibility, and we recommend reading their privacy policies.',
    ] },
    { h: 'Direct Marketing', p: [
      'We may occasionally send marketing and promotional information about the Company or its services. This will be sent only if you have given explicit consent, and you may withdraw consent at any time.',
    ] },
    { h: 'Changes to this Policy', p: [
      'The Company reserves the right to change this policy at any time. Changes take effect on the last-updated date stated at the top of the document. Continued use after that date constitutes consent to the changes.',
    ] },
  ],
}

/* ============================================================
   הצהרת נגישות — תוכן מפורט בעברית גבוהה (ובאנגלית).
   ============================================================ */
const a11yFeatures = {
  he: [
    { icon: 'accessibility', t: 'תפריט נגישות', d: 'סרגל כלים שנפתח מכל עמוד באתר, ומאפשר התאמה אישית של התצוגה, כולל עצירת אנימציות.' },
    { icon: 'contrast', t: 'ניגודיות וצבעים', d: 'צבעי הטקסט והכפתורים נבדקו ביחס ניגודיות של 4.5:1 לפחות, ובתפריט יש מצבי ניגודיות נוספים.' },
    { icon: 'textSize', t: 'מקלדת וקורא מסך', d: 'כל הפעולות באתר זמינות במקלדת, עם סימון מיקוד גלוי, ומבנה כותרות ואזורים תקין לקוראי מסך.' },
    { icon: 'shield', t: 'ת״י 5568 ברמה AA', d: 'האתר נבדק והותאם לפי התקן הישראלי ת״י 5568 חלק 1, ברמה AA.' },
  ],
  en: [
    { icon: 'accessibility', t: 'Accessibility menu', d: 'A toolbar available on every page for personalising the display, including stopping animations.' },
    { icon: 'contrast', t: 'Contrast and colour', d: 'Text and button colours were checked for a contrast ratio of at least 4.5:1, and the menu adds further contrast modes.' },
    { icon: 'textSize', t: 'Keyboard and screen readers', d: 'Every action on the site works with a keyboard, with a visible focus indicator and a proper heading and landmark structure.' },
    { icon: 'shield', t: 'SI 5568, level AA', d: 'The site was reviewed and adapted to the Israeli standard SI 5568 part 1, level AA.' },
  ],
}

/* תאריך עדכון הצהרת הנגישות (נפרד ממדיניות הפרטיות) */
const A11Y_UPDATED = '19/10/2026'

const a11yDoc = {
  he: {
    commitTitle: 'מחויבות החברה לנגישות',
    commit: [
      'קבוצת קורקוס רואה בהנגשת האתר והשירות חלק מהשירות עצמו. אנחנו פועלים כדי שכל אדם, כולל אנשים עם מוגבלות, יוכל לגלוש באתר, לקבל מידע וליצור קשר באופן עצמאי ושוויוני.',
    ],
    standardTitle: 'התקן ורמת ההנגשה',
    standard: [
      'האתר הונגש לפי תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג 2013, ולפי התקן הישראלי ת״י 5568 חלק 1 לנגישות תכנים באינטרנט, ברמה AA. התקן מבוסס על הנחיות WCAG 2.0 של ארגון W3C.',
    ],
    madeTitle: 'התאמות שבוצעו באתר',
    made: [
      'מבנה עמודים סמנטי: כותרת ראשית אחת בכל עמוד, היררכיית כותרות לפי התוכן, ואזורים מסומנים (כותרת עליונה, ניווט, תוכן ראשי, תחתית).',
      'קישור "דלג לתוכן" בראש כל עמוד, שמעביר את המיקוד ישירות לתוכן הראשי.',
      'תפעול מלא במקלדת: תפריט ראשי ותפריטים נפתחים, תפריט המובייל, חלונות קופצים, שאלות נפוצות, גלריות, יומן קביעת פגישה, מחשבונים וסינון כתבות.',
      'סימון מיקוד גלוי ואחיד לכל רכיב שאפשר להגיע אליו במקלדת, בצבעי המותג.',
      'חלונות קופצים (יצירת קשר, גלריה, חיפוש ותפריט הנגישות): המיקוד נכנס לחלון ונשאר בו, מקש Escape סוגר, והמיקוד חוזר לכפתור שפתח את החלון.',
      'טפסים: תווית גלויה לכל שדה, סימון שדות חובה, הודעות שגיאה כתובות שמקושרות לשדה ומוקראות לקורא מסך, והודעת הצלחה מוקראת.',
      'ניגודיות: צבעי טקסט וכפתורים עודכנו כך שיחס הניגודיות יהיה 4.5:1 לפחות, וגודל טקסט מינימלי של 12 פיקסלים.',
      'תוכן שמתחלף לבד (כותרות בעמוד הבית, המלצות, תחומי פעילות): כפתור עצירה, עצירה אוטומטית בריחוף ובמיקוד, וכיבוד הגדרת "הפחתת תנועה" של מערכת ההפעלה.',
      'תמונות: טקסט חלופי לתמונות שמעבירות מידע, ותמונות קישוטיות מוסתרות מקורא המסך.',
      'שפה וכיוון: העמודים מוגדרים בעברית ובכיוון מימין לשמאל, ולכל עמוד כותרת ייחודית.',
      'האתר מותאם לנייד ולהגדלת תצוגה עד 200% בלי אובדן תוכן.',
    ],
    testedTitle: 'איך נבדק האתר',
    tested: [
      'בדיקה אוטומטית עם axe-core בכל סוגי העמודים, במחשב ובנייד.',
      'בדיקות ידניות: מעבר מלא במקלדת בלבד, בדיקת סדר מיקוד ומלכודות מיקוד, טפסים ריקים ושגויים, הגדלת תצוגה ל-200% ותצוגה ברוחב 320 פיקסלים.',
      'בדיקת עץ הנגישות של הדפדפן (שמות, תפקידים ומצבים של רכיבים).',
      'הדפדפן שנבדק: Google Chrome (מנוע Chromium) במחשב ובתצוגת נייד. האתר אמור לעבוד גם בגרסאות עדכניות של Edge, Firefox ו-Safari.',
    ],
    toolsTitle: 'תפריט הנגישות באתר',
    toolsIntro: 'בפינת המסך יש כפתור קבוע שפותח תפריט נגישות. התפריט הוא כלי עזר נוסף, והאתר עצמו הונגש גם בלעדיו. בתפריט:',
    tools: [
      'מצבי ניגודיות: כהה, בהיר, ניגודיות מוגברת ומונוכרום.',
      'התאמת צבעים לרקעים, לכותרות ולתכנים.',
      'הגדלת גופן וכוונון הריווח בין שורות, מילים ואותיות, וגופן קריא.',
      'הגדלת תצוגה, הגדלת תכנים והגדלת כפתורים.',
      'הדגשת קישורים, כותרות ורכיבים אינטראקטיביים.',
      'עצירת אנימציות ותוכן מתחלף, והשתקת מדיה.',
      'הקראת טקסט בלחיצה, מקלדת וירטואלית, וסיכום עמוד לפי כותרות.',
      'שמירת ההעדפות בין ביקורים, ואיפוס מלא של ההתאמות.',
    ],
    limitsTitle: 'מגבלות ידועות ותכנים של צד שלישי',
    limits: [
      'מפות Google ונגן הווידאו של YouTube מוטמעים באתר ומגיעים מצד שלישי. הנגישות שלהם באחריות הספקים. כתובת המשרד מופיעה גם כטקסט, וכל מידע חיוני בסרטונים מופיע גם בטקסט בעמוד.',
      'מעבר לוואטסאפ פותח את שירות WhatsApp, שהנגישות שלו באחריות הספק. אפשר תמיד ליצור קשר גם בטלפון, במייל או בטופס באתר.',
      'האתר טרם נבדק עם קורא מסך חיצוני (למשל NVDA או VoiceOver). הבדיקה מתוכננת, ועד אז נשמח לשמוע על כל קושי.',
      'אנחנו ממשיכים לבדוק ולשפר את האתר. אם נתקלתם ברכיב שאינו נגיש, נשמח שתעדכנו אותנו ונטפל בכך.',
    ],
    contactTitle: 'פנייה בנושא נגישות',
    contactIntro: 'נתקלתם בקושי בגלישה, או שיש לכם הצעה לשיפור? אפשר לפנות אלינו בפרטים הבאים. כדי שנוכל לטפל במהירות, ציינו את העמוד, תיאור הקושי, והדפדפן או הטכנולוגיה המסייעת שבה השתמשתם.',
    coordinator: 'פניות נגישות',
  },
  en: {
    commitTitle: 'Our commitment to accessibility',
    commit: [
      'Kurkoos Group sees the accessibility of its site and service as part of the service itself. We work so that every person, including people with disabilities, can browse the site, get information and contact us independently and equally.',
    ],
    standardTitle: 'Standard and level',
    standard: [
      'The site was made accessible in line with the Equal Rights for Persons with Disabilities Regulations (Service Accessibility Adjustments), 2013, and the Israeli standard SI 5568 part 1 for web content accessibility, at level AA. The standard is based on the W3C WCAG 2.0 guidelines.',
    ],
    madeTitle: 'Adjustments made on the site',
    made: [
      'Semantic page structure: one main heading per page, a heading hierarchy that follows the content, and marked regions (header, navigation, main content, footer).',
      'A "skip to content" link at the top of every page that moves focus to the main content.',
      'Full keyboard operation: main menu and dropdowns, mobile menu, dialogs, FAQs, galleries, the booking calendar, calculators and article filters.',
      'A visible, consistent focus indicator on every element reachable by keyboard.',
      'Dialogs (contact, gallery, search and the accessibility menu): focus moves into the dialog and stays there, Escape closes it, and focus returns to the button that opened it.',
      'Forms: a visible label for every field, required fields marked, written error messages linked to the field and announced to screen readers, and an announced success message.',
      'Contrast: text and button colours updated to a contrast ratio of at least 4.5:1, and a minimum text size of 12 pixels.',
      'Content that changes on its own (home page headlines, testimonials, service areas): a pause button, pausing on hover and focus, and respect for the operating system reduced motion setting.',
      'Images: alternative text for informative images, and decorative images hidden from screen readers.',
      'Language and direction: pages are set to Hebrew, right to left, and every page has a unique title.',
      'The site adapts to mobile and to browser zoom up to 200% without loss of content.',
    ],
    testedTitle: 'How the site was tested',
    tested: [
      'Automated testing with axe-core on every page type, on desktop and mobile.',
      'Manual testing: a full keyboard-only pass, focus order and focus traps, empty and invalid forms, 200% zoom and a 320 pixel wide view.',
      'Review of the browser accessibility tree (names, roles and states of components).',
      'Browser tested: Google Chrome (Chromium) on desktop and in a mobile view. The site should also work in current versions of Edge, Firefox and Safari.',
    ],
    toolsTitle: 'The accessibility menu',
    toolsIntro: 'A fixed button in the corner of the screen opens an accessibility menu. The menu is an extra aid; the site itself is accessible without it. It includes:',
    tools: [
      'Contrast modes: dark, light, high contrast and monochrome.',
      'Colour adjustment for backgrounds, headings and content.',
      'Larger text and line, word and letter spacing, and a readable font.',
      'Display zoom, content enlargement and larger buttons.',
      'Highlighting of links, headings and interactive elements.',
      'Stopping animations and rotating content, and muting media.',
      'Click to read aloud, a virtual keyboard, and a page summary by headings.',
      'Saving preferences between visits, and a full reset.',
    ],
    limitsTitle: 'Known limitations and third-party content',
    limits: [
      'Google Maps and the YouTube player are embedded from third parties, and their accessibility is the responsibility of those providers. The office address also appears as text, and essential information in videos also appears as text on the page.',
      'WhatsApp links open the WhatsApp service, whose accessibility is the responsibility of the provider. You can always contact us by phone, email or the form on the site.',
      'The site has not yet been tested with an external screen reader (such as NVDA or VoiceOver). This is planned; until then we would be glad to hear about any difficulty.',
      'We keep testing and improving the site. If you find an element that is not accessible, please let us know and we will fix it.',
    ],
    contactTitle: 'Accessibility contact',
    contactIntro: 'Had difficulty using the site, or have a suggestion? Contact us using the details below. To help us respond quickly, please mention the page, the difficulty, and the browser or assistive technology you used.',
    coordinator: 'Accessibility requests',
  },
}

function Section({ s }) {
  return (
    <section className="priv-sec">
      <h2>{s.h}</h2>
      {s.p?.map((para, i) => <p key={i}>{para}</p>)}
      {s.sub?.map((g, i) => (
        <div key={i} className="priv-sub">
          <p className="priv-sub__t">{g.t}</p>
          <ul>{g.ul.map((it, j) => <li key={j}>{it}</li>)}</ul>
        </div>
      ))}
      {s.ul && <ul>{s.ul.map((it, i) => <li key={i}>{it}</li>)}</ul>}
      {s.pAfter?.map((para, i) => <p key={i}>{para}</p>)}
    </section>
  )
}

/* הסקשנים של העמוד. הסדר הקבוע ב-defs/legal.js, משותף לשלושת העמודים */
const LOCAL = {
  header: ({ ctx: { title } }) => <PageHeader title={title} crumbs={[{ label: title }]} />,
  doc: ({ ctx: { kind, lang } }) => {
    // ---- מדיניות פרטיות: מסמך מלא ----
    if (kind === 'privacy') {
      const L = (o) => (typeof o === 'string' ? o : (o[lang] || o.he))
      const isHe = lang !== 'en'
      const doc = privacyDoc[lang] || privacyDoc.he
      const contactTitle = isHe ? 'צור קשר' : 'Contact'
      const updatedLbl = isHe ? 'תאריך עדכון אחרון' : 'Last updated'
      return (
        <section className="section">
          <div className="container priv-doc">
            <div className="priv-meta">
              <span className="priv-meta__eyebrow">{isHe ? 'מסמך משפטי רשמי' : 'Official legal document'}</span>
              <span className="priv-meta__date">{updatedLbl}: {COMPANY.updated}</span>
            </div>
            <div className="priv-chips">
              <span className="priv-chip"><b>{isHe ? 'חברה' : 'Company'}</b> {L(COMPANY.name)}</span>
              {COMPANY.regNo && <span className="priv-chip"><b>{isHe ? 'ח.פ.' : 'Reg.'}</b> {COMPANY.regNo}</span>}
              <span className="priv-chip"><b>{isHe ? 'אתר' : 'Site'}</b> {COMPANY.site}</span>
            </div>

            {doc.map((s, i) => <Section key={i} s={s} />)}

            <section className="priv-sec">
              <h2>{contactTitle}</h2>
              <div className="priv-contact">
                <strong className="priv-contact__name">{L(COMPANY.name)}</strong>
                <p><b>{isHe ? 'כתובת' : 'Address'}:</b> {L(COMPANY.addr)}</p>
                <p><b>{isHe ? 'טלפון' : 'Phone'}:</b> <a href={`tel:${COMPANY.phoneHref}`} onClick={() => track('phone_click', { placement: 'legal' })}>{COMPANY.phone}</a></p>
                <p><b>{isHe ? 'דוא"ל' : 'Email'}:</b> <a href={`mailto:${COMPANY.email}`} onClick={() => track('email_click', { placement: 'legal' })}>{COMPANY.email}</a></p>
                <p><b>{isHe ? 'אתר' : 'Site'}:</b> <a href={COMPANY.siteHref} target="_blank" rel="noopener noreferrer">{COMPANY.site}</a></p>
              </div>
            </section>
          </div>
        </section>
      )
    }

    // ---- הצהרת נגישות: מסמך מפורט ----
    if (kind === 'accessibility') {
      const L = (o) => (typeof o === 'string' ? o : (o[lang] || o.he))
      const isHe = lang !== 'en'
      const d = a11yDoc[lang] || a11yDoc.he
      const feats = a11yFeatures[lang] || a11yFeatures.he
      const updatedLbl = isHe ? 'תאריך עדכון אחרון' : 'Last updated'
      return (
        <section className="section">
          <div className="container priv-doc">
            <div className="priv-meta">
              <span className="priv-meta__eyebrow">{isHe ? 'הצהרת נגישות' : 'Accessibility statement'}</span>
              <span className="priv-meta__date">{updatedLbl}: {A11Y_UPDATED}</span>
            </div>

            {/* כרטיסי דגש */}
            <div className="a11y-feats">
              {feats.map((f, i) => (
                <div className="a11y-feat" key={i}>
                  <span className="a11y-feat__ic"><Icon name={f.icon} size={26} /></span>
                  <strong>{f.t}</strong>
                  <p>{f.d}</p>
                </div>
              ))}
            </div>

            <Section s={{ h: d.commitTitle, p: d.commit }} />
            <Section s={{ h: d.standardTitle, p: d.standard }} />
            <Section s={{ h: d.madeTitle, ul: d.made }} />
            <Section s={{ h: d.testedTitle, ul: d.tested }} />

            {/* רשימת כלים עם סימוני וי */}
            <section className="priv-sec">
              <h2>{d.toolsTitle}</h2>
              <p>{d.toolsIntro}</p>
              <ul className="a11y-checks">
                {d.tools.map((it, i) => (
                  <li key={i}><span className="a11y-checks__ic"><Icon name="check" size={15} /></span>{it}</li>
                ))}
              </ul>
            </section>

            <Section s={{ h: d.limitsTitle, ul: d.limits }} />

            {/* פנייה / רכז נגישות */}
            <section className="priv-sec">
              <h2>{d.contactTitle}</h2>
              <p>{d.contactIntro}</p>
              {/* הסדרי נגישות פיזיים: לפי בעלי האתר, המשרד מקבל קהל בימים ובשעות מסוימים */}
              <p>{isHe
                ? 'המשרד מקבל קהל בימים ובשעות מסוימים. כדי שנוכל להיערך מראש להתאמות נגישות, מומלץ לתאם את ההגעה בטלפון או בדוא"ל שמופיעים כאן.'
                : 'The office receives visitors on set days and hours. To let us prepare accessibility arrangements in advance, please book your visit by phone or email below.'}</p>
              <div className="priv-contact">
                <strong className="priv-contact__name">{d.coordinator}: {L(COMPANY.shortName)}</strong>
                <p><b>{isHe ? 'כתובת' : 'Address'}:</b> {L(COMPANY.addr)}</p>
                <p><b>{isHe ? 'טלפון' : 'Phone'}:</b> <a href={`tel:${COMPANY.phoneHref}`} onClick={() => track('phone_click', { placement: 'legal' })}>{COMPANY.phone}</a></p>
                <p><b>{isHe ? 'דוא"ל' : 'Email'}:</b> <a href={`mailto:${COMPANY.email}`} onClick={() => track('email_click', { placement: 'legal' })}>{COMPANY.email}</a></p>
                <p><b>{isHe ? 'אתר' : 'Site'}:</b> <a href={COMPANY.siteHref} target="_blank" rel="noopener noreferrer">{COMPANY.site}</a></p>
              </div>
            </section>
          </div>
        </section>
      )
    }

    // ---- terms ----
    const body = {
      he: {
        terms: 'השימוש באתר כפוף לתנאים אלה. התכנים באתר מוצגים למטרות מידע כללי בלבד ואינם מהווים התחייבות או הצעה מחייבת. קבוצת קורקוס שומרת על זכותה לעדכן את התכנים והתנאים בכל עת.',
      },
      en: {
        terms: 'Use of this website is subject to these terms. Content is provided for general information only and does not constitute a binding commitment or offer. Kurkoos Group reserves the right to update content and terms at any time.',
      },
    }

    return (
      <section className="section">
        <Reveal className="container legal-prose">
          <p>{body[lang][kind]}</p>
        </Reveal>
      </section>
    )
  },
}

export default function Legal({ kind }) {
  const { t, lang } = useI18n()
  const title = t(`pages.legal.${kind}`)

  return <PageSections def={DEF} slug={`/${kind}`} local={LOCAL} ctx={{ kind, lang, title }} />
}
