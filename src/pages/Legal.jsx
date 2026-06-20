import { useI18n } from '../i18n/index.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import './InfoPage.css'
import './Legal.css'

/* ============================================================
   דף משפטי. kind = 'accessibility' | 'privacy' | 'terms'.
   ל-'privacy' מוצג מסמך מלא ומפורט (תיקון 13 לחוק הגנת הפרטיות) עם
   פרטי קבוצת קורקוס. accessibility/terms — טקסט תמציתי.
   ============================================================ */

// פרטי החברה — מקור אמת אחד. ⚠️ ח.פ. + שם החברה הרשום להשלמה ע"י הלקוח.
const COMPANY = {
  name: { he: 'קבוצת קורקוס', en: 'Kurkoos Group' },
  regNo: '',                         // ח.פ. — להשלמה
  addr: { he: 'הנגר 24, הוד-השרון, מגדלי Amy — מגדל A', en: '24 HaNagar St., Hod HaSharon, Amy Towers — Tower A' },
  phone: '050-685-5656',
  phoneHref: '+972506855656',
  email: 'kurkoos.sales@gmail.com',
  site: 'kurkoos-group.co.il',
  siteHref: 'https://kurkoos-group.co.il',
  updated: '20/06/2026',
}

const EMAIL = COMPANY.email

const privacyDoc = {
  he: [
    { h: 'מבוא', p: [
      `ברוך הבא לאתר האינטרנט ו/או הפלטפורמה ו/או כלל השירותים המוצעים בהם (להלן: "השירותים הדיגיטליים") של קבוצת קורקוס (להלן: "החברה").`,
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
          <Reveal className="container priv-doc">
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
          </Reveal>
        </section>
      </>
    )
  }

  // ---- accessibility / terms ----
  const body = {
    he: {
      accessibility: 'אתר קורקוס גרופ שואף לאפשר גלישה נוחה ונגישה לכלל המשתמשים, לרבות אנשים עם מוגבלות. האתר נבנה בהתאם להנחיות הנגישות (WCAG) וכולל תמיכה בניווט מקלדת, ניגודיות צבעים וטקסט חלופי לתמונות. נתקלתם בבעיה? נשמח לשמוע בכתובת kurkoos.sales@gmail.com.',
      terms: 'השימוש באתר כפוף לתנאים אלה. התכנים באתר מוצגים למטרות מידע כללי בלבד ואינם מהווים התחייבות או הצעה מחייבת. קבוצת קורקוס שומרת על זכותה לעדכן את התכנים והתנאים בכל עת.',
    },
    en: {
      accessibility: 'The Kurkoos Group website strives to provide a comfortable and accessible experience for all users, including people with disabilities. The site is built per WCAG accessibility guidelines and supports keyboard navigation, color contrast and alternative text for images. Found an issue? We would love to hear at kurkoos.sales@gmail.com.',
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
