import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
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
  phone: '050-685-5656',
  phoneHref: '+972506855656',
  email: 'kurkoosgroup.sales@gmail.com',
  site: 'kurkoos-group.co.il',
  siteHref: 'https://kurkoos-group.co.il',
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
      'המידע האישי שנאסף מוגבל לנתונים הדרושים לספק לך חווית שימוש מותאמת אישית. האיסוף מתרחש כאשר אתה נרשם לחשבון אישי ועושה שימוש בשירותים, יוצר עמנו קשר (דוא"ל, טלפון, WhatsApp או טופס יצירת קשר), או גולש בשירותים הדיגיטליים באופן חופשי.',
    ], sub: [
      { t: 'מידע שנמסר בעת הרישום:', ul: ['שם פרטי ושם משפחה', 'מספר טלפון נייד', 'דואר אלקטרוני', 'שם משתמש', 'כל מידע אחר שתבחר לשתף אותנו בו'] },
      { t: 'מידע שנמסר ביצירת קשר:', ul: ['שם פרטי ושם משפחה', 'מספר הטלפון', 'כתובת הדוא"ל', 'נושא פנייתך', 'תוכן שאלתך / בקשתך'] },
    ], pAfter: ['שיחות טלפון עשויות להיות מוקלטות לצורך הכשרת צוות או לאיכות שירות.'] },
    { h: 'מטרות השימוש במידע', ul: [
      'מתן השירותים, טיפול בפניות ורישום לחשבון אישי.',
      'שיפור חווית השימוש, מדידת ביצועים ועיבוד מידע סטטיסטי.',
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
    { icon: 'accessibility', t: 'תפריט נגישות מתקדם', d: 'סרגל כלים ייעודי הנפתח מכל עמוד באתר ומאפשר התאמה אישית של חוויית הגלישה.' },
    { icon: 'contrast', t: 'ניגודיות והתאמת צבעים', d: 'מצבי ניגודיות כהה, בהיר ומונוכרום, לצד התאמה חופשית של צבעי הרקע, הכותרות והתכנים.' },
    { icon: 'textSize', t: 'התאמות גופן וריווח', d: 'הגדלת הטקסט, גופן קריא וכוונון הריווח בין שורות, מילים ואותיות.' },
    { icon: 'shield', t: 'עמידה בתקן הישראלי', d: 'האתר הונגש בהתאם לתקנות הנגישות והתקן הישראלי ת״י 5568 ברמת AA.' },
  ],
  en: [
    { icon: 'accessibility', t: 'Advanced accessibility menu', d: 'A dedicated toolbar, available on every page, for personalising the browsing experience.' },
    { icon: 'contrast', t: 'Contrast & colour control', d: 'Dark, light and monochrome contrast modes, plus free adjustment of background, heading and text colours.' },
    { icon: 'textSize', t: 'Font & spacing controls', d: 'Larger text, a readable font and tuning of line, word and letter spacing.' },
    { icon: 'shield', t: 'Standards compliance', d: 'Built per the Israeli accessibility regulations and standard SI 5568, level AA.' },
  ],
}

const a11yDoc = {
  he: {
    commitTitle: 'מחויבות החברה לנגישות',
    commit: [
      'קבוצת קורקוס נכסים חברה לבניין ויזמות בע״מ רואה בהנגשת שירותיה ערך עליון, ופועלת מתוך תפיסה כי לכל אדם — לרבות אנשים עם מוגבלות — שמורה הזכות לגלוש באתר באופן עצמאי, נוח ושוויוני.',
      'השקענו משאבים רבים בהנגשת האתר ובהתאמתו לקהל רחב ככל הניתן, מתוך אמונה כי נגישות אינה דרישה טכנית בלבד אלא ביטוי מוחשי לכבוד האדם ולשוויון ההזדמנויות.',
    ],
    standardTitle: 'כפיפות לתקן ולהנחיות',
    standard: [
      'האתר נבנה והונגש בהתאם להוראות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג–2013, ובכפוף להמלצות התקן הישראלי ת״י 5568 לנגישות תכנים באינטרנט, המבוסס על הנחיות הנגישות הבין-לאומיות WCAG 2.1 ברמת AA.',
      'תהליך ההנגשה נבחן ומתוחזק באופן שוטף, ואנו ממשיכים לשפר את נגישות האתר מעת לעת בהתאם להתפתחות התקנים והטכנולוגיה.',
    ],
    toolsTitle: 'אמצעי הנגישות הזמינים באתר',
    toolsIntro: 'באתר מוטמע תפריט נגישות הנפתח באמצעות הסמל הקבוע בפינת המסך, ומציע, בין היתר, את ההתאמות הבאות:',
    tools: [
      'מצבי ניגודיות — כהה, בהיר, ניגודיות מוגברת ותצוגת מונוכרום בגווני אפור.',
      'התאמת צבעים אישית לרקעים, לכותרות ולתכני האתר.',
      'הגדלת הגופן וכוונון הריווח בין שורות, בין מילים ובין אותיות.',
      'גופן קריא וברור להקלה על הקריאה.',
      'הגדלת התצוגה, הגדלת התכנים והגדלת לחצנים ואזורי לחיצה.',
      'הדגשת קישורים, כותרות ואלמנטים אינטראקטיביים בעמוד.',
      'ניווט מלא באמצעות מקלדת, לצד מקלדת וירטואלית להזנת טקסט.',
      'הקראת טקסט בלחיצה (Text-to-Speech) בעברית ובאנגלית.',
      'הצגת תיאורים חלופיים לתמונות (טקסט חלופי).',
      'תצוגת קריאה ממוקדת וסיכום עמוד לניווט מהיר לפי כותרות.',
      'הגדלת סמן העכבר ושינוי צבעו, והשתקת מדיה אוטומטית.',
      'שמירת ההעדפות בין הביקורים באתר, לצד אפשרות לאיפוס מלא של ההתאמות.',
    ],
    extraTitle: 'התאמות נגישות נוספות שיושמו',
    extra: [
      'בניית האתר על בסיס מבנה (HTML) סמנטי ותקין, עם היררכיית כותרות ברורה.',
      'תיוג ARIA ותמיכה בקוראי מסך נפוצים.',
      'שמירה על ניגודיות צבעים מספקת בין הטקסט לרקע.',
      'אזורי לחיצה מרווחים ונוחים לתפעול.',
      'אתר רספונסיבי המותאם למגוון מסכים, ותמיכה בהגדלת תצוגת הדפדפן.',
    ],
    limitsTitle: 'הסתייגויות ומגבלות ידועות',
    limits: [
      'אנו עושים כל מאמץ להנגיש את מלוא התכנים באתר. עם זאת, ייתכן כי חלקים מסוימים — ובכלל זה תכנים של צד שלישי, קבצים מצורפים או רכיבים שטרם הותאמו במלואם — לא יהיו נגישים באופן מיטבי.',
      'אנו רואים בנגישות תהליך מתמשך, ופועלים לתיקון ולשיפור באופן שוטף. אם נתקלתם ברכיב שאינו נגיש — נשמח שתעדכנו אותנו ונפעל לתיקונו בהקדם.',
    ],
    contactTitle: 'פנייה בנושאי נגישות',
    contactIntro: 'נתקלתם בקושי בגלישה, או שיש לכם הצעה לשיפור הנגישות? נשמח לסייע. ניתן לפנות לרכז הנגישות של קבוצת קורקוס באמצעות פרטי הקשר הבאים, ואנו מתחייבים לטפל בפנייתכם במהירות ובמקצועיות:',
    coordinator: 'רכז נגישות',
  },
  en: {
    commitTitle: 'Our commitment to accessibility',
    commit: [
      'Kurkoos Group Assets — Construction & Development Ltd. regards the accessibility of its services as a core value, and acts on the belief that every person — including people with disabilities — is entitled to browse the site independently, comfortably and equally.',
      'We have invested significant resources in making the site accessible to the widest possible audience, in the belief that accessibility is not merely a technical requirement but a tangible expression of human dignity and equal opportunity.',
    ],
    standardTitle: 'Standards and guidelines',
    standard: [
      'The site was built and made accessible in accordance with the Equal Rights for Persons with Disabilities Regulations (Service Accessibility Adjustments), 2013, and the Israeli standard SI 5568 for web content accessibility, based on the international WCAG 2.1 guidelines at level AA.',
      'The accessibility of the site is reviewed and maintained on an ongoing basis, and we continue to improve it as standards and technology evolve.',
    ],
    toolsTitle: 'Accessibility features available on the site',
    toolsIntro: 'The site includes an accessibility menu, opened via the fixed icon in the corner of the screen, offering among others the following adjustments:',
    tools: [
      'Contrast modes — dark, light, high-contrast and monochrome (greyscale).',
      'Custom colour adjustment for backgrounds, headings and content.',
      'Larger font and tuning of line, word and letter spacing.',
      'A clear, readable font for easier reading.',
      'Display zoom, content enlargement and larger buttons and click areas.',
      'Highlighting of links, headings and interactive elements.',
      'Full keyboard navigation, alongside a virtual keyboard for text input.',
      'Click-to-read text-to-speech in Hebrew and English.',
      'Alternative text descriptions for images.',
      'A focused reading view and a page summary for quick heading navigation.',
      'Enlarged cursor with colour change, and automatic media muting.',
      'Saving preferences between visits, with an option to fully reset all adjustments.',
    ],
    extraTitle: 'Additional accessibility measures',
    extra: [
      'Built on valid, semantic HTML with a clear heading hierarchy.',
      'ARIA labelling and support for common screen readers.',
      'Sufficient colour contrast between text and background.',
      'Spacious, comfortable click areas.',
      'A responsive site adapted to a range of screens, with browser-zoom support.',
    ],
    limitsTitle: 'Known limitations',
    limits: [
      'We make every effort to make all content accessible. Nevertheless, certain parts — including third-party content, attached files or components not yet fully adapted — may not be optimally accessible.',
      'We see accessibility as an ongoing process and work continuously to fix and improve it. If you encounter an inaccessible element, please let us know and we will act to correct it promptly.',
    ],
    contactTitle: 'Accessibility contact',
    contactIntro: 'Encountered a difficulty browsing, or have a suggestion to improve accessibility? We are happy to help. You can reach the accessibility coordinator at Kurkoos Group using the details below, and we are committed to handling your request quickly and professionally:',
    coordinator: 'Accessibility coordinator',
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

export default function Legal({ kind }) {
  const { t, lang } = useI18n()
  const title = t(`pages.legal.${kind}`)

  // ---- מדיניות פרטיות: מסמך מלא ----
  if (kind === 'privacy') {
    const L = (o) => (typeof o === 'string' ? o : (o[lang] || o.he))
    const isHe = lang !== 'en'
    const doc = privacyDoc[lang] || privacyDoc.he
    const contactTitle = isHe ? 'צור קשר' : 'Contact'
    const updatedLbl = isHe ? 'תאריך עדכון אחרון' : 'Last updated'
    return (
      <>
        <PageHeader title={title} crumbs={[{ label: title }]} />
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
                <p><b>{isHe ? 'טלפון' : 'Phone'}:</b> <a href={`tel:${COMPANY.phoneHref}`}>{COMPANY.phone}</a></p>
                <p><b>{isHe ? 'דוא"ל' : 'Email'}:</b> <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
                <p><b>{isHe ? 'אתר' : 'Site'}:</b> <a href={COMPANY.siteHref} target="_blank" rel="noopener noreferrer">{COMPANY.site}</a></p>
              </div>
            </section>
          </div>
        </section>
      </>
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
      <>
        <PageHeader title={title} crumbs={[{ label: title }]} />
        <section className="section">
          <div className="container priv-doc">
            <div className="priv-meta">
              <span className="priv-meta__eyebrow">{isHe ? 'הצהרת נגישות' : 'Accessibility statement'}</span>
              <span className="priv-meta__date">{updatedLbl}: {COMPANY.updated}</span>
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

            <Section s={{ h: d.extraTitle, ul: d.extra }} />
            <Section s={{ h: d.limitsTitle, p: d.limits }} />

            {/* פנייה / רכז נגישות */}
            <section className="priv-sec">
              <h2>{d.contactTitle}</h2>
              <p>{d.contactIntro}</p>
              <div className="priv-contact">
                <strong className="priv-contact__name">{d.coordinator} — {L(COMPANY.name)}</strong>
                <p><b>{isHe ? 'כתובת' : 'Address'}:</b> {L(COMPANY.addr)}</p>
                <p><b>{isHe ? 'טלפון' : 'Phone'}:</b> <a href={`tel:${COMPANY.phoneHref}`}>{COMPANY.phone}</a></p>
                <p><b>{isHe ? 'דוא"ל' : 'Email'}:</b> <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
                <p><b>{isHe ? 'אתר' : 'Site'}:</b> <a href={COMPANY.siteHref} target="_blank" rel="noopener noreferrer">{COMPANY.site}</a></p>
              </div>
            </section>
          </div>
        </section>
      </>
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
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <section className="section">
        <Reveal className="container legal-prose">
          <p>{body[lang][kind]}</p>
        </Reveal>
      </section>
    </>
  )
}
