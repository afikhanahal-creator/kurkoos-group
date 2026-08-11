import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import { stages, pillars, faqs } from '../data/mentorship.js'
import '../components/sections/Activities.css'   // card-effect: נוזל/ברק/זוהר/הטיה 3D
import './Mentorship.css'

const iconMap = {
  pin: 'location',
  check: 'check',
  handshake: 'handshake',
  shield: 'shield',
  building: 'building',
  crane: 'crane',
}

/* ---- המדריך ליזם המתחיל: 10 כתבות (שלב → כתבה) ---- */
const guideArticles = [
  {
    num: '01',
    stage: 'איתור קרקע ועסקאות',
    title: 'איך מזהים הזדמנות לפני שהשוק מגלה אותה',
    lead: 'הטעות הנפוצה ביותר של יזמים מתחילים: לחפש עסקאות במקום שכולם כבר מחפשים.',
    paragraphs: [
      'רוב היזמים המתחילים פותחים את יד2 ואת אתרי המתווכים. זאת לא הגישה השגויה — זאת הגישה שמוזמנת לשלם מחיר מלא. עסקה טובה שמפורסמת ברבים כבר מתומחרת לפי התחרות. המציאה נעלמת ברגע שהמוכר מבין שיש שלושה קונים.',
      'ההזדמנויות שממש שוות כסף נמצאות בשוק שאינו נראה. יורשים שמחזיקים בנכס שאינם יודעים מה לעשות איתו. קשישים הגרים בדירות גדולות מדי. בעלי קרקע חקלאית שממתינים לשינוי ייעוד. בתים ישנים בשכונות שמתחילות לעבור שינוי. אלה האנשים שצריך להגיע אליהם לפני שהם מגיעים לפרסום.',
      'הכלי הכי חזק ביד היזם המתחיל הוא היכולת להקשיב. לצאת לשכונה, לדבר עם בעלי חנויות, להכיר שמאים מקומיים ועורכי דין שעוסקים בנדל"ן. כל אחד מהם יודע על נכסים שאינם בשוק. הרשת הזו נבנית לאורך שנים, אבל מי שמתחיל לבנות אותה עכשיו יהנה ממנה מהר.',
      'ניתוח GIS ומאגרי נתוני רשות מקרקעי ישראל הם כלים שמאמתים מה שהרגשתם בשטח. לאחר שיצאתם לשכונה ומצאתם הזדמנות פוטנציאלית, בדקו: מה ייעוד המגרש? מה הבנייה המאושרת? האם יש תוכניות שינוי? השאלות האלה משלימות את ניתוח השטח ואינן מחליפות אותו.',
    ],
    insight: 'ההזדמנות הטובה ביותר שתמצאו היא אחת שאתם הראשונים לראות, לפני שהיא מופיעה בפרסום.',
  },
  {
    num: '02',
    stage: 'בדיקת היתכנות ודוח 0',
    title: 'דוח 0: הכלי שמבדיל בין יזם שמתקדם ליזם שמשלם שכר לימוד',
    lead: 'לפני שמוציאים שקל על עסקה, בונים את המספרים. דוח 0 הוא הבסיס של כל ניתוח יזמי.',
    paragraphs: [
      'דוח 0 הוא לא רק גיליון אקסל עם מספרים. הוא השיחה שאתם מנהלים עם המציאות לפני שהיא הופכת יקרה. יזמים שדילגו עליו בגלל שהעסקה נראתה ברורה שילמו ביוקר על ההבנה שהיא לא הייתה כל כך ברורה.',
      'הדוח מורכב מארבעה אזורים: הכנסות צפויות לפי מחירי עסקאות קיימות, עלויות בנייה לפי מפרט ריאלי עם חיץ של 10 עד 15 אחוז, עלויות מימון כולל ריבית ועמלות ותקופת הפרויקט, ועלויות עסקה כגון עורך דין ומס שבח. ההפרש הוא הרווח לפני שמשלמים על הקרקע.',
      'הנקודה שכולם מדלגים עליה: ניתוח רגישות. מה קורה אם מחירי המכירה יורדים בחמישה אחוז? מה קורה אם עלויות הבנייה עולות בעשרה אחוז? מה קורה אם הפרויקט מתעכב בשישה חודשים? יזם שעבר ניתוח רגישות לא מופתע, הוא מוכן.',
      'דוח 0 כמעט לעולם לא נשאר זהה לאורך חיי הפרויקט. הוא מתעדכן עם כל שלב: בסגירת העסקה, בתחילת הביצוע, בכל חריגה מהתכנון. היזם שמחזיק דוח עדכני תמיד יודע איפה הפרויקט שלו עומד.',
    ],
    insight: 'דוח 0 לא נועד לשכנע אתכם לקנות. הוא נועד לתת לכם את הכוח לוותר על עסקה שאינה עובדת.',
  },
  {
    num: '03',
    stage: 'משא ומתן וסגירת עסקה',
    title: 'המשא ומתן לא מתחיל בפגישה',
    lead: 'כוח ניהול המשא ומתן נקבע הרבה לפני שיושבים מול המוכר.',
    paragraphs: [
      'הטעות הנפוצה ביותר בניהול משא ומתן: להיכנס לחדר כשאתם חייבים את העסקה. המוכר מרגיש זאת. ה-BATNA שלכם, כלומר הטוב ביותר שיש לכם מחוץ לשולחן המשא ומתן, הוא הנשק הכי חד שיש לכם. בניין אחר שאתם בודקים. עסקה אחרת שנמצאת בשלב מתקדם. היכולת לצאת מהחדר בלי להסתכל אחורה.',
      'בניית הצעת מחיר נכונה: לא מה שהמוכר ביקש פחות כמה אחוזים, אלא מה שמצדיק ניתוח העסקה שלכם. אם הדוח 0 אומר שהעסקה עובדת ב-3.2 מיליון, אז 3.5 מיליון שהמוכר ביקש אינו רק קצת יקר, הוא פשוט לא עובד. הצגה של ניתוח מובנה בפני המוכר הופכת שיחה ממקח וממכר לדיון עסקי.',
      'זיכרון דברים הוא לא גשר לחוזה. הוא כבר מסמך מחייב לכל דבר מהותי. כל סעיף שחסר בזיכרון דברים הוא נקודת מחלוקת שתתעורר בחוזה. הרשימה שחייבת להיות שם: מחיר, מועד השלמה, תנאים מתלים, פיצוי מוסכם, ומה קורה אם אחד הצדדים יוצא.',
      'לאחר הסגירה, השומרים על יחסים טובים עם המוכר מקבלים לעתים קרובות הפניות ועסקאות נוספות. המוכר של היום הוא הנותן הפניות של מחר.',
    ],
    insight: 'ניהול משא ומתן לא נועד לנצח. הוא נועד להגיע לעסקה שעובדת לשני הצדדים ומבוצעת בפועל.',
  },
  {
    num: '04',
    stage: 'ליווי משפטי ועורכי דין',
    title: 'עורך דין נדל"ן: נכס שמשלמים עליו פחות מהנזק שהוא מונע',
    lead: 'הבחירה בעורך הדין הנכון שווה הרבה יותר מהפרש שכר הטרחה.',
    paragraphs: [
      'יזמים מתחילים לעתים קרובות מחפשים עורך דין לפי המחיר. זאת גישה שמשלמים עליה ביוקר. עורך דין נדל"ן שאינו מכיר את הרישום בטאבו, את היסטוריית החריגות, ואת מנגנוני שינוי הייעוד לא שווה לכם כסף.',
      'מה עורך הדין שלכם חייב לבדוק לפני חתימה: נסח טאבו עדכני, אישורי זכויות ורישום מלא, שעבודים ומשכנתאות על הנכס, חריגות בנייה וחשיפה לצו הריסה, זכויות שכנים ועדיפויות רכישה, ובדיקת ייעוד מול תב"ע עדכנית.',
      'כיצד לבחור: שאלו כמה עסקאות דומות ייצג בשנה האחרונה. בקשו שלוש הפניות מלקוחות. ברורו האם הוא ילווה אתכם אישית. עורך דין ממשרד גדול לא בהכרח טוב יותר מעצמאי מנוסה, ולעתים קרובות אף פחות זמין.',
      'בחוזה הרכישה עצמו ודאו שיש: פיצוי מוסכם מפורש, מנגנון ביטול ברור, תנאים מתלים מנוסחים בדיוק, ולוח תשלומים מדויק. הנוסח "בכפוף לקבלת מימון" יוצר מחלוקות. ציינו: מאיזה בנק, באיזו ריבית מרבית, ועד איזה תאריך.',
    ],
    insight: 'עורך דין טוב לא רק בודק. הוא מלמד אתכם לראות את המלכודות לבד, עסקה אחר עסקה.',
  },
  {
    num: '05',
    stage: 'אסטרטגיית מימון בנקאי',
    title: 'הבנק לא משקיע בחלומות — הוא משקיע בניירות',
    lead: 'תיק בנקאי מוצלח אינו עסק של כמה דפים. הוא תוצר של הכנה מדוקדקת.',
    paragraphs: [
      'כשאתם ניגשים לבנק, אתם לא באים לבקש כסף. אתם באים להציג עסקה שמצדיקה אשראי. ההבדל הזה הוא ההבדל בין מי שיוצא עם מימון לבין מי שיוצא עם הבטחה לחזור.',
      'מה הבנק מחפש: הון עצמי אמיתי שאינו הלוואות, ניסיון עבר עם עסקאות שנסגרו, כושר החזר מוכח ממקורות הכנסה נוספים, בטוחות ראויות, ותחזית תזרים פרויקט הגיונית. כל אחד מאלה הוא עמוד שתומך בהחלטת האשראי.',
      'LTV הוא המדד הראשון שהבנק בודק: כמה אשראי מתוך שווי הנכס. בפרויקטי ייזום, יזמים מתחילים יכולים לצפות ל-60 עד 70 אחוז לכל היותר. כדי לפצות, צריך לבנות מבנה מימון שכולל הון עצמי, שותפויות אסטרטגיות, קרנות מימון חלופיות, ומימון ביניים.',
      'על משא ומתן מול הבנק: הריבית הראשונה שמציעים אינה הריבית הסופית. ביקוש מכמה בנקים במקביל, הצגת מספר חלופות, ופגישה עם מנהל סניף ולא רק עם פקיד — כל אלה משנים את התנאים. הצעה מבנק אחד היא מנוף מול השני.',
    ],
    insight: 'הבנק מוסיף אשראי למי שמוכיח שאינו צריך אותו. ההכנה היא ההון שאינו מופיע בדפי החשבון.',
  },
  {
    num: '06',
    stage: 'היתרים, רישוי ובירוקרטיה',
    title: 'הבירוקרטיה לא נגדכם — היא פשוט לא בצד שלכם',
    lead: 'הבנת תהליך ההיתרים מראש חוסכת חודשים של עיכוב ועשרות אלפי שקלים.',
    paragraphs: [
      'יזמים מתחילים נוטים להעריך בחסר את משך זמן ההיתרים. "שנה, שנה וחצי" הן הערכות שנגמרות לעתים קרובות בשנתיים ושלוש. הסיבה: תהליך ההיתר אינו לינארי. הוא תהליך שבו כל שלב מותנה בשלב קודם, וכל ועדה מתנהלת לפי לוח הזמנים שלה.',
      'שלבי תהליך ההיתר: הגשת בקשה לוועדה המקומית, עמידה בתנאים מוקדמים בנוגע לכבישים וניקוז וחיבורי תשתית, הנפקת ההיתר, וקבלת טופס 4 שהוא תעודת הגמר. בכל נקודה עשויות להופיע דרישות נוספות שלא היו ידועות מראש.',
      'שני נושאים שדורשים תשומת לב מיוחדת: חריגות בנייה ותב"ע. חריגות קיימות בנכס שרכשתם מחייבות טיפול לפני ואחרי ההיתר. תב"ע שאינה תואמת לתכנון שלכם מחייבת הגשת תוכנית בנין עיר חדשה, תהליך שלוקח לרוב שנתיים עד שלוש.',
      'הכלים שעוזרים: אדריכל שמכיר את הוועדה המקומית, יועץ תכנוני שמכיר את הפקידים, ורישום קפדני של כל שיחה ומסמך. המלצה ברורה: לא לחתום על זיכרון דברים שאינו כולל תנאי מתלה ברור לגבי קבלת היתר בנייה.',
    ],
    insight: 'יזם שמבין בירוקרטיה אינו נלחם במערכת. הוא עובד איתה. וזה שווה חודשים בלוח הזמנים.',
  },
  {
    num: '07',
    stage: 'ניהול תזרים ותקציב פרויקט',
    title: 'פרויקטים לא נכשלים בגלל חוסר כסף — הם נכשלים בגלל תזמון לא נכון',
    lead: 'ניהול תזרים הוא המיומנות שמבדילה בין יזם שמסיים פרויקטים ליזם שמתקשה להתקדם.',
    paragraphs: [
      'יזם שיש לו מספיק כסף על הנייר אבל אין לו נזילות ברגע הנכון לא יכול לשלם לקבלן ולא יכול להמשיך את הפרויקט. זה לא מצב נדיר. זה המצב הנפוץ ביותר שגורם לפרויקטים להיתקע.',
      'תזרים פרויקט טוב מאפשר לראות קדימה: מתי צפויים כספי מכירות? מתי יש לשלם לקבלן? מתי מגיעים תשלומי ריבית לבנק? מתי מגיעים תשלומי מס? כאשר מציבים את כל אלה על ציר הזמן, אפשר לראות מראש איפה יהיו חורים בתזרים ולפתור אותם לפני שהם מתרחשים.',
      'Early Warning System הוא מדד האזהרה המוקדם. ברגע שחריגה בסעיף מסוים עוברת עשרה אחוז מהתקציב המקורי, מדליקים נורה אדומה. לא מחכים לסוף החודש ולא מחכים שיצטברו חריגות. בכל שלב בנייה יש נקודת בקרה.',
      'כדי שהתזרים יעבוד, הקבלן צריך להיות תחת מנגנון תשלום שמתגמל ביצוע ולא נוכחות. חשבוניות מאושרות על בסיס אחוזי התקדמות אמיתיים. מפקח בנייה מקצועי מאפשר זאת.',
    ],
    insight: 'תזרים מזומנים הוא הדם של הפרויקט. ניהולו לא מסתיים עם ההכנה — הוא תהליך שבועי לאורך כל חיי הפרויקט.',
  },
  {
    num: '08',
    stage: 'פיקוח ובנייה',
    title: 'מפקח בנייה טוב שווה כמה אחוזי רווח בסיום הפרויקט',
    lead: 'הפיקוח הוא השקעה שמשתלמת בכל פרויקט שאתם לא נמצאים בו בכל יום.',
    paragraphs: [
      'יזמים מתחילים לעתים קרובות מנסים לחסוך בפיקוח. "אגיע לבדוק אחרי כל שלב." הבעיה: כשמגיעים, כבר מאוחר לתקן חלק מהדברים. בטון שיצא לא חוזר לתוך הקאלוף.',
      'מה מפקח בנייה טוב עושה: נוכחות שבועית בשטח עם דוחות כתובים, אישור חשבוניות של קבלן רק לפי התקדמות אמיתית, זיהוי ליקויים בשלב הבנייה כשהתיקון זול ולא במסירה כשהתיקון יקר, ותיעוד מלא שמגן עליכם משפטית.',
      'בחירת המפקח: שאלו על ניסיון בפרויקטים דומים. בקשו לראות דוחות ביקורת שטח מפרויקטים קודמים. ברורו האם יהיה אותו אדם לאורך כל הפרויקט. האם מחויב לביקורת שבועית?',
      'ניהול קבלנים דרך המפקח: כל שינוי מהחוזה המקורי יוצא בכתב וחתום על ידי שני הצדדים. כל עיכוב מתועד עם מנגנון קנסות שהוסכם מראש. קבלן שיודע שיש מפקח מקצועי מתנהל בצורה שונה לחלוטין.',
    ],
    insight: 'המפקח הוא לא "בן אדם שיושב באתר". הוא מנהל הפרויקט בשטח כשאתם עוסקים בדברים אחרים.',
  },
  {
    num: '09',
    stage: 'שיווק, מכירות ומימוש',
    title: 'הפרויקט הטוב ביותר שלא נמכר הוא כישלון',
    lead: 'שיווק ומכירות הם מיומנויות שניתן ללמוד, אבל דורשות הכנה שמתחילה הרבה לפני שיש מה למכור.',
    paragraphs: [
      'טיימינג הוא הכל בשיווק נדל"ן. יזמים שמתחילים לשווק כשהפרויקט כבר בשלבי בנייה מפסידים את חלון ה-Pre-Sale, כלומר מכירות מוקדמות שמסייעות במימון ומשפרות את תנאי האשראי מול הבנק. תוכנית שיווק טובה מתחילה להיבנות מרגע שאישור שינוי הייעוד התקבל.',
      'תמחור: הטעות הנפוצה היא להסתמך רק על ממוצע עסקאות בשכונה. ממוצעים כוללים דירות לא משופצות, בניינים ישנים, ולעתים עסקאות שמגלמות מצוקה. יזם שיודע לנתח עסקאות השוואתיות בצורה נכונה יכול לתמחר ביתר בצדק ולמכור מהר יותר.',
      'ערוצי שיווק: מתווכים יכולים להאיץ מכירות משמעותית, אבל עלות העמלה נגסת ברווח. יזמים שמשקיעים בשיווק עצמאי יכולים להוזיל עלויות. שימוש בשני הערוצים בנקודות זמן שונות היא האסטרטגיה החכמה.',
      'תהליך המכירה: מהרגע שיש רוכש רציני, להוביל אותו בתהליך מסודר. פגישת היכרות, הצגת הפרויקט, ישיבה עם עורך הדין שלהם, חתימת זיכרון דברים, ועד לחתימת חוזה. רוכש שמרגיש שהתהליך מסודר קונה מהר יותר.',
    ],
    insight: 'שיווק טוב לא מוכר. הוא גורם לרוכש לקנות. ההבדל הוא בין לחץ לבין אמון.',
  },
  {
    num: '10',
    stage: 'מסירה ובניית מוניטין',
    title: 'המסירה היא ה-DNA של הפרויקט הבא שלכם',
    lead: 'מסירה מוצלחת לא מסיימת פרויקט. היא מתחילה את המוניטין.',
    paragraphs: [
      'רוב היזמים תופסים את המסירה כסוף התהליך. היזמים שמצליחים לאורך זמן תופסים אותה כהתחלה — של מוניטין, של הפניות, של הפרויקט הבא. רוכש שמקבל דירה בדיוק כפי שהובטח, ואולי יותר טוב, הוא סוכן המכירות הטוב ביותר שלכם.',
      'פרוטוקול מסירה: לפני מסירה, ערכו בדיקת ליקויים פנימית מקיפה עם יותר ממאה סעיפים. תקנו כל ליקוי שאפשר לפני שהרוכש מגיע. בפגישת המסירה עצמה, ליוו את הרוכש בכל חדר, תועדו כל ממצא, והתחייבו ללוח זמנים לתיקון המאגר.',
      'מה החוק אומר: חוק המכר דירות קובע אחריות לליקויים לתקופות שונות, שבע שנים לליקויים מבניים ופחות לאלמנטים אחרים. יזם שמכיר את חוקי הבדק יודע מה הוא חייב ומה הוא אינו חייב.',
      'בניית מוניטין: בסוף כל פרויקט, ערכו ישיבת הפקת לקחים. מה עבד, מה לא, מה הייתם עושים אחרת. כתבו אותה. השיטה הזאת מייצרת צבירה של ידע ארגוני שמהווה נכס אמיתי לפרויקט הבא.',
    ],
    insight: 'מסירה היא לא רגע. היא תהליך. יזם שמנהל אותה נכון יוצר ממנה דלק לפרויקט הבא.',
  },
]

/* ---- FAQ Accordion ---- */
function FaqItem({ item, isOpen, onToggle }) {
  const bodyRef = useRef(null)
  const [maxH, setMaxH] = useState(0)
  useEffect(() => {
    if (bodyRef.current) setMaxH(isOpen ? bodyRef.current.scrollHeight : 0)
  }, [isOpen])
  return (
    <div className={`mfaq__item ${isOpen ? 'is-open' : ''}`}>
      <button className="mfaq__q" onClick={onToggle} aria-expanded={isOpen}>
        <span>{item.q.he}</span>
        <Icon name="chevron" size={20} className="mfaq__chevron" />
      </button>
      <div className="mfaq__body" style={{ maxHeight: maxH }}>
        <p className="mfaq__a" ref={bodyRef}>{item.a.he}</p>
      </div>
    </div>
  )
}

/* ================================================================
   עמוד ראשי
   ================================================================ */
export default function Mentorship() {
  const [openFaq, setOpenFaq] = useState(null)
  const [openStage, setOpenStage] = useState(null)
  const [openArticle, setOpenArticle] = useState(null)

  return (
    <>
      <PageHeader
        eyebrow="מנטורינג"
        title='ליווי יזמי נדל"ן'
        lead='תוכנית מובנית שמלווה יזמים צעירים מהרעיון ועד לעסקה העצמאית — עם שלומי קורקוס וצוות קורקוס גרופ, שלושים שנה בשטח.'
        crumbs={[{ label: 'מנטורינג' }]}
      />

      {/* ---- היכרות עם שלומי ---- */}
      <section className="mentor-intro">
        <div className="container">
          <Reveal className="mentor-intro__inner">
            <div className="mentor-intro__content">
              <span className="eyebrow mentor-intro__eyebrow">שלומי קורקוס, מייסד קורקוס גרופ</span>
              <h2 className="mentor-intro__heading">
                שלושים שנה בשטח.<br />בכל שלב של הדרך.
              </h2>
              <p className="mentor-intro__para">
                אני לא מלמד מה שקראתי בספר. אני מלמד מה שעשיתי — פרויקט אחר פרויקט, טעות אחר טעות, עסקה אחר עסקה. הקמתי ארבע חטיבות שמכסות את כל שלבי הפרויקט: ייזום, ביצוע, פיקוח ותיווך. יזם שעובד איתי לא צריך לרכז מידע ממספר גורמים — הכל נמצא תחת מטרייה אחת.
              </p>
              <p className="mentor-intro__para">
                הניסיון הזה לא נמכר בקורס מקוון ולא נרכש באקדמיה. הוא נצבר בשטח, בישיבות עם בנקים, בוועדות תכנון, במסירות שהלכו טוב ובמסירות שלימדו אותי יותר. מה שאני מציע הוא ליווי אישי וצמוד — כדי שהדרך שלכם תהיה קצרה ובטוחה יותר משלי.
              </p>
              <div className="mentor-intro__stats">
                <div className="mentor-intro__stat">
                  <span className="mentor-intro__stat-num">+30</span>
                  <span className="mentor-intro__stat-label">שנות ניסיון</span>
                </div>
                <div className="mentor-intro__stat">
                  <span className="mentor-intro__stat-num">4</span>
                  <span className="mentor-intro__stat-label">חטיבות עסקיות</span>
                </div>
                <div className="mentor-intro__stat">
                  <span className="mentor-intro__stat-num">1:1</span>
                  <span className="mentor-intro__stat-label">ליווי אישי</span>
                </div>
              </div>
            </div>
            <aside className="mentor-intro__quote-card">
              <p className="mentor-intro__quote-text">
                "יזמות נדל"ן היא מקצוע. לא השקעה. לא הימור. מקצוע שלומדים עם מנטור שכבר עשה את הדרך."
              </p>
              <span className="mentor-intro__quote-sig">שלומי קורקוס</span>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* ---- יתרונות — card-effect ---- */}
      <section className="section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">למה זה שונה</span>
            <h2 className="section-title">מה שאי אפשר ללמוד בקורס</h2>
            <p className="mentor-section-lead">
              ניסיון, רשת קשרים ומסגרת מקצועית מלאה — שלושת הדברים שקובעים עסקת נדל"ן — אינם נמכרים בחבילת לימוד. הם נרכשים עם מנטור שחי אותם.
            </p>
          </Reveal>
          <div className="mentor-pillars">
            {pillars.map((p, i) => (
              <Reveal key={i}>
                <div className="mentor-pillar card-effect">
                  <div className="card-inner">
                    <span className="card__liquid" aria-hidden="true" />
                    <span className="card__shine" aria-hidden="true" />
                    <span className="card__glow" aria-hidden="true" />
                    <div className="card__content mentor-pillar__content">
                      <div className="card__image mentor-pillar__icon">
                        <Icon name={iconMap[p.icon] || 'check'} size={28} />
                      </div>
                      <div className="card__text">
                        <h3 className="card__title">{p.title.he}</h3>
                        <p className="card__description">{p.desc.he}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- השוואה ---- */}
      <section className="section section--alt">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">הדרך לעסקה הראשונה</span>
            <h2 className="section-title">מה נדרש כדי לסגור עסקת נדל"ן</h2>
          </Reveal>
          <div className="mentor-compare">
            <div className="mentor-compare__col">
              <h3 className="mentor-compare__head">מה העסקה דורשת</h3>
              <ul className="mentor-compare__list">
                {[
                  'ניתוח שוק מעמיק ואיתור הזדמנות מוקדמת',
                  'בדיקת היתכנות ודוח 0 מבוסס מספרים',
                  'משא ומתן שמגן על הרווח',
                  'ליווי משפטי שמכיר את המלכודות',
                  'מימון בנקאי בתנאים שעובדים לפרויקט',
                  'ניהול היתרים ובירוקרטיה',
                  'פיקוח שטח שמגן על האיכות והתקציב',
                  'שיווק ומכירות שמממשים את הרווח',
                  'מסירה שבונה מוניטין לפרויקט הבא',
                  'רשת קשרים שפותחת דלתות',
                ].map((item, i) => (
                  <li key={i} className="mentor-compare__item">
                    <Icon name="check" size={14} className="mentor-compare__check" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mentor-compare__col mentor-compare__col--accent">
              <h3 className="mentor-compare__head">מה הליווי מספק</h3>
              <ul className="mentor-compare__list">
                {[
                  'ניסיון של 30 שנה שמקצר עשור של טעויות',
                  'תבניות עבודה ודוחות מהשטח',
                  'ליווי אישי בכל שלב, לא ייעוץ כללי',
                  'גישה לרשת של עורכי דין, שמאים ובנקים',
                  'ארבע חטיבות עסקיות תחת מטרייה אחת',
                  'מנגנון בדיקת עסקה לפני שחותמים',
                  'זמינות שוטפת, שאלות ותשובות בזמן אמת',
                  'ליווי מסגירת העסקה ועד למסירת המפתח',
                  'הפקת לקחים משותפת בסיום כל שלב',
                  'שותפות שמבוססת על הצלחה',
                ].map((item, i) => (
                  <li key={i} className="mentor-compare__item">
                    <Icon name="check" size={14} className="mentor-compare__check mentor-compare__check--accent" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 10 שלבים — click-expand ---- */}
      <section className="section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">תוכנית הליווי</span>
            <h2 className="section-title">עשרה שלבים. דרך אחת.</h2>
            <p className="mentor-section-lead">
              כל שלב בנוי על הידע שנצבר בשלב שלפניו. לחצו על כל שלב לפרטים נוספים.
            </p>
          </Reveal>
          <div className="mentor-stages">
            {stages.map((s) => {
              const isOpen = openStage === s.id
              return (
                <Reveal
                  key={s.id}
                  as="article"
                  className={`mentor-stage ${isOpen ? 'is-open' : ''}`}
                  onClick={() => setOpenStage(isOpen ? null : s.id)}
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenStage(isOpen ? null : s.id)
                    }
                  }}
                >
                  <div className="mentor-stage__header">
                    <span className="mentor-stage__num">{s.num}</span>
                    <Icon name="chevron" size={14} className="mentor-stage__chevron" />
                  </div>
                  <h3 className="mentor-stage__title">{s.title.he}</h3>
                  <p className="mentor-stage__desc">{s.desc.he}</p>
                  <div className="mentor-stage__expand">
                    <ul className="mentor-stage__tools">
                      {s.tools.map((tool, ti) => (
                        <li key={ti} className="mentor-stage__tool">
                          <Icon name="check" size={11} className="mentor-stage__tool-ic" />
                          <span>{tool.he}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---- המדריך ליזם המתחיל — 10 כתבות ---- */}
      <section className="section section--alt mentor-guide">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">מדריך</span>
            <h2 className="section-title">המדריך ליזם המתחיל</h2>
            <p className="mentor-section-lead">
              עשרה נושאי ליבה, עשרה מאמרים שנכתבו מניסיון ישיר. לחצו על כל כתבה לקריאה מלאה.
            </p>
          </Reveal>
          <div className="mentor-guide__grid">
            {guideArticles.map((art, i) => {
              const isOpen = openArticle === i
              return (
                <Reveal key={i}>
                  <article
                    className={`mentor-guide__card ${isOpen ? 'is-open' : ''}`}
                    onClick={() => setOpenArticle(isOpen ? null : i)}
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpenArticle(isOpen ? null : i)
                      }
                    }}
                  >
                    <div className="mentor-guide__card-top">
                      <div className="mentor-guide__card-meta">
                        <span className="mentor-guide__card-num">{art.num}</span>
                        <span className="mentor-guide__card-stage">{art.stage}</span>
                      </div>
                      <Icon name="chevron" size={14} className="mentor-guide__card-chevron" />
                    </div>
                    <h3 className="mentor-guide__card-title">{art.title}</h3>
                    <p className="mentor-guide__card-lead">{art.lead}</p>
                    <div className="mentor-guide__card-expand">
                      <div className="mentor-guide__card-body">
                        {art.paragraphs.map((p, pi) => <p key={pi}>{p}</p>)}
                      </div>
                      <blockquote className="mentor-guide__insight">
                        <Icon name="quote" size={16} className="mentor-guide__insight-ic" aria-hidden="true" />
                        <span>{art.insight}</span>
                      </blockquote>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </div>
          <Reveal className="mentor-guide__footer">
            <Link to="/yazamut-nadlan" className="btn btn--outline">
              כל הכתבות במדריך ליזמות נדל"ן
              <Icon name="arrow" size={16} className="mentor-guide__footer-arrow" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---- שאלות נפוצות ---- */}
      <section className="section">
        <div className="container mentor-faq-wrap">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">שאלות נפוצות</span>
            <h2 className="section-title">שאלות שכדאי לשאול לפני שמתחילים</h2>
          </Reveal>
          <div className="mentor-faq">
            {faqs.map((f, i) => (
              <FaqItem
                key={i}
                item={f}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA — רקע לבן ---- */}
      <section className="mentor-cta">
        <div className="container">
          <Reveal className="mentor-cta__inner">
            <div className="mentor-cta__text">
              <h2 className="mentor-cta__title">הצעד הראשון הוא שיחה</h2>
              <p className="mentor-cta__desc">
                אין כאן טופס שמציב אתכם בתור. אנחנו מדברים עם יזמים ברצינות, מבינים את הרקע שלכם, ומחליטים ביחד אם הליווי מתאים. שיחת ההיכרות ללא עלות וללא מחויבות.
              </p>
              <div className="mentor-cta__actions">
                <a href="/#contact" className="btn btn--primary btn--lg">
                  השאירו פרטים לשיחת היכרות
                  <Icon name="arrow" size={18} className="mentor-cta__arrow" />
                </a>
                <a href="tel:0506855656" className="mentor-cta__phone">
                  <Icon name="phone" size={16} />
                  050-6855656
                </a>
              </div>
            </div>
            <ul className="mentor-cta__badges" aria-label="יתרונות הליווי">
              {[
                'ליווי אישי 1:1 לכל יזם',
                'שלושים שנה בשטח',
                'ארבע חטיבות עסקיות',
                'רשת קשרים בתעשייה',
              ].map((b) => (
                <li key={b} className="mentor-cta__badge">
                  <Icon name="check" size={14} className="mentor-cta__badge-ic" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---- מדריך ליזמות — בתחתית הדף ---- */}
      <section className="section mentor-guide-section">
        <div className="container">
          <Reveal className="division-guide__band" variant="scale">
            <div>
              <span className="eyebrow">לקריאה נוספת</span>
              <h2 className="division-guide__title">המדריך ליזמות נדל"ן</h2>
              <p className="division-guide__desc">מדריך מקיף שמכסה את כל ההיבטים של עסקת נדל"ן, מאיתור הקרקע ועד מסירת המפתח.</p>
            </div>
            <Link to="/yazamut-nadlan" className="btn btn--primary btn--lg">
              קראו את המדריך
              <Icon name="arrow" size={20} className="division-guide__arrow" />
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  )
}
