import { useState, useEffect, useRef, useCallback } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import Reveal from '../components/ui/Reveal.jsx'
import Icon from '../components/ui/Icon.jsx'
import { stages, pillars, faqs } from '../data/mentorship.js'
import './Mentorship.css'

/* ============================================================
   ליווי יזמי נדל"ן — שלומי קורקוס
   עמוד ראשי: הכרה, יתרונות, 10 שלבים, מרכז הידע, FAQ, CTA.
   ============================================================ */

const ROTATE_MS = 9000

const iconMap = {
  pin: 'location',
  check: 'check',
  handshake: 'handshake',
  shield: 'shield',
  building: 'building',
  crane: 'crane',
}

const knowledgeArticles = [
  {
    stageNum: '01',
    title: 'איך מזהים הזדמנות לפני שהשוק מגלה אותה',
    lead: 'הטעות הנפוצה ביותר של יזמים מתחילים: לחפש עסקאות במקום שכולם כבר מחפשים.',
    paragraphs: [
      'רוב היזמים המתחילים פותחים את יד2 ואת אתרי המתווכים. זאת לא הגישה השגויה — זאת הגישה שמוזמנת לשלם מחיר מלא. עסקה טובה שמפורסמת ברבים כבר מתומחרת לפי התחרות. ה"מציאה" נעלמת ברגע שהמוכר מבין שיש שלושה קונים.',
      'ההזדמנויות שממש שוות כסף נמצאות בשוק שאינו נראה. יורשים שמחזיקים בנכס שאינם יודעים מה לעשות איתו. קשישים הגרים בדירות גדולות מדי. בעלי קרקע חקלאית שממתינים לשינוי ייעוד. בתים ישנים בשכונות שמתחילות לעבור שינוי. אלה האנשים שצריך להגיע אליהם לפני שהם מגיעים לפרסום.',
      'הכלי הכי חזק ביד היזם המתחיל הוא היכולת להקשיב. לצאת לשכונה, לדבר עם בעלי חנויות, להכיר שמאים מקומיים ועורכי דין שעוסקים בנדל"ן. כל אחד מהם יודע על נכסים שאינם בשוק. הרשת הזו נבנית לאורך שנים, אבל מי שמתחיל לבנות אותה עכשיו יהנה ממנה מהר.',
      'ניתוח GIS ומאגרי ישדמ"מ הם כלים שמאמתים מה שהרגשתם בשטח. לאחר שיצאתם לשכונה ומצאתם הזדמנות פוטנציאלית, בדקו: מה ייעוד המגרש? מה הבנייה המאושרת? האם יש תוכניות שינוי? השאלות האלה משלימות את ניתוח השטח ואינן מחליפות אותו.',
    ],
    insight: 'ההזדמנות הטובה ביותר שתמצאו היא אחת שאתם הראשונים לראות — לפני שהיא מופיעה בפרסום.',
  },
  {
    stageNum: '02',
    title: 'דוח 0: הכלי שמבדיל בין יזם שמתקדם ליזם שמשלם שכר לימוד',
    lead: 'לפני שמוציאים שקל על עסקה, בונים את המספרים. דוח 0 הוא הבסיס של כל ניתוח יזמי.',
    paragraphs: [
      'דוח 0 הוא לא רק גיליון אקסל עם מספרים. הוא השיחה שאתם מנהלים עם המציאות לפני שהיא הופכת יקרה. יזמים שדילגו עליו בגלל "העסקה ברורה" שילמו ביוקר על ההבנה שהיא לא הייתה כל כך ברורה.',
      'הדוח מורכב מארבעה אזורים: הכנסות צפויות לפי מחירי עסקאות קיימות ולא לפי מחירי מבוקש, עלויות בנייה לפי מפרט ריאלי עם חיץ של 10 עד 15 אחוז, עלויות מימון כולל ריבית ועמלות ותקופת הפרויקט, ועלויות עסקה כגון עורך דין ומס שבח ותיווך. ההפרש הוא הרווח לפני שמשלמים על הקרקע.',
      'הנקודה שכולם מדלגים עליה: ניתוח רגישות. מה קורה אם מחירי המכירה יורדים בחמישה אחוז? מה קורה אם עלויות הבנייה עולות בעשרה אחוז? מה קורה אם הפרויקט מתעכב בשישה חודשים? יזם שעבר ניתוח רגישות לא מופתע, הוא מוכן.',
      'דוח 0 מוכן כמעט לעולם לא נשאר זהה לאורך חיי הפרויקט. הוא מתעדכן עם כל שלב: בסגירת העסקה, בתחילת הביצוע, בכל חריגה מהתכנון. היזם שמחזיק דוח עדכני תמיד יודע איפה הפרויקט שלו עומד.',
    ],
    insight: 'דוח 0 לא נועד לשכנע אתכם לקנות. הוא נועד לתת לכם את הכוח לוותר על עסקה שאינה עובדת.',
  },
  {
    stageNum: '03',
    title: 'המשא ומתן לא מתחיל בפגישה — הוא מתחיל הרבה לפניה',
    lead: 'כוח ניהול המשא ומתן נקבע לפני שיושבים מול המוכר.',
    paragraphs: [
      'הטעות הנפוצה ביותר בניהול משא ומתן: להיכנס לחדר כשאתם "חייבים" את העסקה. המוכר מרגיש זאת. ה-BATNA שלכם, כלומר הטוב ביותר שיש לכם מחוץ לשולחן המשא ומתן, הוא הנשק הכי חד שיש לכם. בניין אחר שאתם בודקים. עסקה אחרת שנמצאת בשלב מתקדם. היכולת לצאת מהחדר בלי להסתכל אחורה.',
      'בניית הצעת מחיר נכונה: לא מה שהמוכר ביקש פחות כמה אחוזים, אלא מה שמצדיק ניתוח העסקה שלכם. אם הדוח 0 אומר שהעסקה עובדת ב-3.2 מיליון, אז 3.5 מיליון שהמוכר ביקש אינו רק "קצת ביוקר", הוא פשוט לא עובד. הצגה של ניתוח מובנה בפני המוכר הופכת שיחה ממקח וממכר לדיון עסקי.',
      'זיכרון דברים הוא לא גשר לחוזה. הוא כבר מסמך מחייב לכל דבר מהותי. כל סעיף שחסר בזיכרון דברים הוא נקודת מחלוקת שתתעורר בחוזה. הרשימה שחייבת להיות שם: מחיר, מועד השלמה, תנאים מתלים כגון היתר בנייה ומימון, פיצוי מוסכם, ומה קורה אם אחד הצדדים יוצא.',
      'לאחר הסגירה, השומרים על יחסים טובים עם המוכר מקבלים לעתים קרובות הפניות ועסקאות נוספות. המוכר של היום הוא הנותן הפניות של מחר.',
    ],
    insight: 'ניהול משא ומתן לא נועד לנצח. הוא נועד להגיע לעסקה שעובדת לשני הצדדים ומבוצעת בפועל.',
  },
  {
    stageNum: '04',
    title: 'עורך דין נדל"ן: נכס שמשלמים עליו פחות מהנזק שהוא מונע',
    lead: 'הבחירה בעורך הדין הנכון שווה הרבה יותר מהפרש שכר הטרחה.',
    paragraphs: [
      'יזמים מתחילים לעתים קרובות מחפשים עורך דין לפי המחיר. זאת גישה שמשלמים עליה ביוקר. עורך דין נדל"ן שאינו מכיר את הרישום בטאבו, את היסטוריית החריגות, ואת מנגנוני שינוי הייעוד לא שווה לכם כסף, כמה שלא יעלה.',
      'מה עורך הדין שלכם חייב לבדוק לפני חתימה: נסח טאבו עדכני עד שבוע לפני החתימה, אישורי זכויות ורישום מלא, שעבודים ומשכנתאות על הנכס, חריגות בנייה וחשיפה לצו הריסה, זכויות שכנים ועדיפויות רכישה, ובדיקת ייעוד מול תב"ע עדכנית.',
      'כיצד לבחור: שאלו כמה עסקאות דומות ייצג בשנה האחרונה. בקשו שלוש הפניות מלקוחות. ברורו האם הוא ילווה אתכם אישית או עוזר שלו. עורך דין ממשרד גדול לא בהכרח טוב יותר מעצמאי מנוסה, ולעתים קרובות אף פחות זמין.',
      'בחוזה הרכישה עצמו ודאו שיש: פיצוי מוסכם מפורש, מנגנון ביטול ברור, תנאים מתלים מנוסחים בדיוק, ולוח תשלומים מדויק. "בכפוף לקבלת מימון" הוא נוסח שיוצר מחלוקות. ציינו: מאיזה בנק, באיזו ריבית מרבית, ועד איזו תאריך.',
    ],
    insight: 'עורך דין טוב לא רק בודק. הוא מלמד אתכם לראות את המלכודות לבד, עסקה אחר עסקה.',
  },
  {
    stageNum: '05',
    title: 'הבנק לא משקיע בחלומות — הוא משקיע בניירות',
    lead: 'תיק בנקאי מוצלח אינו עסק של כמה דפים. הוא תוצר של הכנה מדוקדקת.',
    paragraphs: [
      'כשאתם ניגשים לבנק, אתם לא באים לבקש כסף. אתם באים להציג עסקה שמצדיקה אשראי. ההבדל הזה הוא ההבדל בין מי שיוצא עם מימון לבין מי שיוצא עם "נחזור אליכם".',
      'מה הבנק מחפש: הון עצמי אמיתי שאינו הלוואות, ניסיון עבר עם עסקאות שנסגרו, כושר החזר מוכח ממקורות הכנסה נוספים, בטוחות ראויות לפי שווי הנכס, ותחזית תזרים פרויקט הגיונית. כל אחד מאלה הוא עמוד שתומך בהחלטת האשראי.',
      'LTV הוא Loan to Value, המדד הראשון שהבנק בודק: כמה אשראי מתוך שווי הנכס. בפרויקטי ייזום, יזמים מתחילים יכולים לצפות ל-60 עד 70 אחוז לכל היותר. כדי לפצות, צריך לבנות מבנה מימון שכולל הון עצמי, שותפויות אסטרטגיות, קרנות מימון חלופיות, ומימון ביניים.',
      'על משא ומתן מול הבנק: הריבית הראשונה שמציעים אינה הריבית הסופית. ביקוש מכמה בנקים במקביל, הצגת מספר חלופות, ופגישה עם מנהל סניף ולא רק עם פקיד, כל אלה משנים את התנאים. הצעה מבנק אחד היא מנוף מול השני.',
    ],
    insight: 'הבנק מוסיף אשראי למי שמוכיח שאינו צריך אותו. ההכנה היא ההון שאינו מופיע בדפי החשבון.',
  },
  {
    stageNum: '06',
    title: 'הבירוקרטיה לא נגדכם — היא פשוט לא בצד שלכם',
    lead: 'הבנת תהליך ההיתרים מראש חוסכת חודשים של עיכוב ועשרות אלפי שקלים.',
    paragraphs: [
      'יזמים מתחילים נוטים להעריך בחסר את משך זמן ההיתרים. "שנה, שנה וחצי" הן הערכות שנגמרות לעתים קרובות בשנתיים ושלוש. הסיבה: תהליך ההיתר אינו לינארי. הוא תהליך שבו כל שלב מותנה בשלב קודם, וכל ועדה מתנהלת לפי לוח הזמנים שלה.',
      'שלבי תהליך ההיתר בקירוב: הגשת בקשה לוועדה המקומית, עמידה בתנאים מוקדמים בנוגע לכבישים וניקוז וחיבורי תשתית, הנפקת ההיתר, וקבלת טופס 4 שהוא תעודת הגמר. בכל נקודה עשויות להופיע דרישות נוספות שלא היו ידועות מראש.',
      'שני נושאים שדורשים תשומת לב מיוחדת: חריגות בנייה ותב"ע. חריגות קיימות בנכס שרכשתם מחייבות טיפול לפני ואחרי ההיתר. תב"ע שאינה תואמת לתכנון שלכם מחייבת הגשת תוכנית בנין עיר חדשה, תהליך שלוקח לרוב שנתיים עד שלוש בנפרד.',
      'הכלים שעוזרים: אדריכל שמכיר את הוועדה המקומית, יועץ תכנוני שמכיר את הפקידים, ורישום קפדני של כל שיחה ומסמך. המלצה ברורה: לא לחתום על זיכרון דברים שאינו כולל תנאי מתלה ברור לגבי קבלת היתר בנייה.',
    ],
    insight: 'יזם שמבין בירוקרטיה אינו נלחם במערכת. הוא עובד איתה. וזה שווה חודשים בלוח הזמנים.',
  },
  {
    stageNum: '07',
    title: 'פרויקטים לא נכשלים בגלל חוסר כסף — הם נכשלים בגלל תזמון לא נכון',
    lead: 'ניהול תזרים הוא המיומנות שמבדילה בין יזם שמסיים פרויקטים ליזם שמתקשה להתקדם.',
    paragraphs: [
      'יזם שיש לו מספיק כסף על הנייר אבל אין לו נזילות ברגע הנכון לא יכול לשלם לקבלן ולא יכול להמשיך את הפרויקט. זה לא מצב נדיר. זה המצב הנפוץ ביותר שגורם לפרויקטים להיתקע.',
      'תזרים פרויקט טוב מאפשר לראות קדימה: מתי צפויים כספי מכירות לפי לוח התשלומים החוזי? מתי יש לשלם לקבלן? מתי מגיעים תשלומי ריבית לבנק? מתי מגיעים תשלומי מס? כאשר מציבים את כל אלה על ציר הזמן, אפשר לראות מראש איפה יהיו חורים בתזרים ולפתור אותם לפני שהם מתרחשים.',
      'Early Warning System הוא מדד האזהרה המוקדם. ברגע שחריגה בסעיף מסוים עוברת עשרה אחוז מהתקציב המקורי, מדליקים נורה אדומה. לא מחכים לסוף החודש ולא מחכים שיצטברו חריגות. בכל שלב בנייה יש נקודת בקרה מוגדרת.',
      'כדי שהתזרים יעבוד, הקבלן צריך להיות תחת מנגנון תשלום שמתגמל ביצוע ולא נוכחות. חשבוניות מאושרות על בסיס אחוזי התקדמות אמיתיים ולא לפי לוח זמנים שרירותי. מפקח בנייה מקצועי מאפשר זאת.',
    ],
    insight: 'תזרים מזומנים הוא הדם של הפרויקט. ניהולו לא מסתיים עם ה"הכנה" — הוא תהליך שבועי לאורך כל חיי הפרויקט.',
  },
  {
    stageNum: '08',
    title: 'מפקח בנייה טוב שווה כמה אחוזי רווח בסיום הפרויקט',
    lead: 'הפיקוח הוא השקעה שמשתלמת בכל פרויקט שאתם לא נמצאים בו בכל יום.',
    paragraphs: [
      'יזמים מתחילים לעתים קרובות מנסים לחסוך בפיקוח. "אגיע לבדוק אחרי כל שלב." הבעיה: כשמגיעים, כבר מאוחר לתקן חלק מהדברים. בטון שיצא לא חוזר לתוך הקאלוף.',
      'מה מפקח בנייה טוב עושה: נוכחות שבועית בשטח עם דוחות כתובים, אישור חשבוניות של קבלן רק לפי התקדמות אמיתית, זיהוי ליקויים בשלב הבנייה כשהתיקון זול ולא במסירה כשהתיקון יקר, ניהול קבלני משנה, ותיעוד מלא שמגן עליכם משפטית בסכסוכים.',
      'בחירת המפקח: שאלו על ניסיון בפרויקטים דומים בגודל ובסוג. בקשו לראות דוחות ביקורת שטח מפרויקטים קודמים. ברורו האם יהיה אותו אדם לאורך כל הפרויקט. האם מחויב לביקורת שבועית? מה קורה אם יש ליקוי שלא תועד בזמן?',
      'ניהול קבלנים דרך המפקח: כל שינוי מהחוזה המקורי יוצא בכתב וחתום על ידי שני הצדדים. כל עיכוב מתועד ומנוהל עם מנגנון קנסות שהוסכם מראש. קבלן שיודע שיש מפקח מקצועי מתנהל בצורה שונה לחלוטין.',
    ],
    insight: 'המפקח הוא לא "בן אדם שיושב באתר". הוא מנהל הפרויקט בשטח כשאתם עוסקים בדברים אחרים.',
  },
  {
    stageNum: '09',
    title: 'הפרויקט הטוב ביותר שלא נמכר — הוא כישלון',
    lead: 'שיווק ומכירות הם מיומנויות שניתן ללמוד, אבל דורשות הכנה שמתחילה הרבה לפני שיש מה למכור.',
    paragraphs: [
      'טיימינג הוא הכל בשיווק נדל"ן. יזמים שמתחילים לשווק כשהפרויקט כבר בשלבי בנייה מפסידים את חלון ה-Pre-Sale, כלומר מכירות מוקדמות שמסייעות במימון ומשפרות את תנאי האשראי מול הבנק. תוכנית שיווק טובה מתחילה להיבנות מרגע שאישור שינוי הייעוד התקבל.',
      'תמחור: הטעות הנפוצה היא להסתמך רק על ממוצע עסקאות בשכונה. ממוצעים כוללים דירות לא משופצות, בניינים ישנים, ולעתים עסקאות שמגלמות מצוקה. יזם שיודע לנתח עסקאות השוואתיות בצורה נכונה, לפי מחיר למטר, קומה, כיוון, חניה ומחסן, יכול לתמחר ביתר בצדק ולמכור מהר יותר.',
      'ערוצי שיווק: מתווכים יכולים להאיץ מכירות משמעותית, אבל עלות העמלה נגסת ברווח. יזמים שמשקיעים בשיווק עצמאי דרך אתרי נכסים ורשתות חברתיות ושיתופי פעולה עם גורמים מוסדיים יכולים להוזיל עלויות. שני הערוצים אינם מנוגדים: שימוש בשניהם בנקודות זמן שונות היא האסטרטגיה החכמה.',
      'תהליך המכירה: מהרגע שיש רוכש רציני, להוביל אותו בתהליך מסודר. פגישת היכרות ראשונה, הצגת הפרויקט, ישיבה עם עורך הדין שלהם, חתימת זיכרון דברים, ועד לחתימת חוזה. כל שלב מנוהל עם ציר זמן ברור. רוכש שמרגיש שהתהליך מסודר קונה מהר יותר.',
    ],
    insight: 'שיווק טוב לא מוכר. הוא גורם לרוכש לקנות. ההבדל הוא בין לחץ לבין אמון.',
  },
  {
    stageNum: '10',
    title: 'המסירה היא ה-DNA של הפרויקט הבא שלכם',
    lead: 'מסירה מוצלחת לא מסיימת פרויקט. היא מתחילה את המוניטין.',
    paragraphs: [
      'רוב היזמים תופסים את המסירה כסוף התהליך. היזמים שמצליחים לאורך זמן תופסים אותה כהתחלה, של מוניטין, של הפניות, של הפרויקט הבא. רוכש שמקבל דירה בדיוק כפי שהובטח, ואולי יותר טוב, הוא סוכן המכירות הטוב ביותר שלכם.',
      'פרוטוקול מסירה: לפני מסירה, ערכו בדיקת ליקויים פנימית מקיפה עם יותר ממאה סעיפים. תקנו כל ליקוי שאפשר לפני שהרוכש מגיע. בפגישת המסירה עצמה, ליוו את הרוכש בכל חדר, תועדו כל ממצא בחתימת שני הצדדים, והתחייבו ללוח זמנים לתיקון המאוגר.',
      'מה החוק אומר: חוק המכר דירות קובע אחריות לליקויים לתקופות שונות, שבע שנים לליקויים מבניים ופחות לאלמנטים אחרים. יזם שמכיר את חוקי הבדק יודע מה הוא חייב ומה הוא אינו חייב, וכיצד לנהל את ציפיות הרוכש בהתאם.',
      'בניית מוניטין: בסוף כל פרויקט, ערכו ישיבת הפקת לקחים. מה עבד, מה לא, מה הייתם עושים אחרת. כתבו אותה. השיטה הזאת מייצרת צבירה של ידע ארגוני שמהווה נכס אמיתי לפרויקט הבא. רוכשים מרוצים שמפנים אתכם חוסכים עלויות שיווק גבוהות מאוד.',
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

/* ---- Knowledge Hub (Agent) ---- */
function KnowledgeHub() {
  const [active, setActive] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)
  const tabsRef = useRef(null)

  const go = useCallback((idx) => {
    setActive(idx)
    setAnimKey(k => k + 1)
    // scroll tab into view
    const tabEl = tabsRef.current?.children[idx]
    if (tabEl) tabEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [])

  const advance = useCallback(() => {
    setActive(prev => {
      const next = (prev + 1) % knowledgeArticles.length
      setAnimKey(k => k + 1)
      const tabEl = tabsRef.current?.children[next]
      if (tabEl) tabEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      return next
    })
  }, [])

  useEffect(() => {
    if (paused) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(advance, ROTATE_MS)
    return () => clearInterval(timerRef.current)
  }, [paused, advance])

  const art = knowledgeArticles[active]
  const stage = stages[active]

  return (
    <section className="section mentor-agent">
      <div className="container">
        <Reveal className="mentor-agent__head">
          <span className="eyebrow">מרכז הידע</span>
          <h2 className="mentor-agent__title">ידע מהשטח, לכל שלב בדרך</h2>
          <p className="mentor-agent__lead">כל מאמר נכתב מניסיון ישיר בעשרות פרויקטים. לא תיאוריה, לא לימודי שוק — ידע שעובד בשטח האמיתי.</p>
        </Reveal>

        <div className="mentor-agent__tabs" ref={tabsRef} role="tablist" aria-label="נושאי ידע">
          {stages.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={active === i}
              className={`mentor-agent__tab ${active === i ? 'is-active' : ''}`}
              onClick={() => go(i)}
              onFocus={() => go(i)}
            >
              <span className="mentor-agent__tab-num">{s.num}</span>
              <span className="mentor-agent__tab-name">{s.title.he}</span>
            </button>
          ))}
        </div>

        <div className="mentor-agent__progress-track">
          <div
            key={animKey}
            className={`mentor-agent__progress-fill ${paused ? 'is-paused' : ''}`}
            style={{ animationDuration: `${ROTATE_MS}ms` }}
          />
        </div>

        <div
          className="mentor-agent__panel"
          role="tabpanel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => { setPaused(false) }}
        >
          <div key={`art-${active}`} className="mentor-agent__article">
            <div className="mentor-agent__art-meta">
              <span className="mentor-agent__art-num">שלב {art.stageNum}</span>
              <span
                className="mentor-agent__art-tag"
                style={{ '--stage-color': stage.color }}
              >
                <Icon name={iconMap[stage.icon] || 'check'} size={14} />
                {stage.title.he}
              </span>
            </div>
            <h3 className="mentor-agent__art-title">{art.title}</h3>
            <p className="mentor-agent__art-lead">{art.lead}</p>
            <div className="mentor-agent__art-body">
              {art.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <blockquote className="mentor-agent__insight">
              <Icon name="quote" size={22} className="mentor-agent__insight-ic" />
              {art.insight}
            </blockquote>
          </div>

          <div className="mentor-agent__nav">
            <button
              className="mentor-agent__nav-btn"
              onClick={() => go((active - 1 + knowledgeArticles.length) % knowledgeArticles.length)}
              aria-label="מאמר קודם"
            >
              <Icon name="arrowLeft" size={18} />
            </button>
            <span className="mentor-agent__nav-count">{active + 1} / {knowledgeArticles.length}</span>
            <button
              className="mentor-agent__nav-btn"
              onClick={() => go((active + 1) % knowledgeArticles.length)}
              aria-label="מאמר הבא"
            >
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ================================================================
   עמוד ראשי
   ================================================================ */
export default function Mentorship() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <>
      <PageHeader
        eyebrow="מנטורינג"
        title='ליווי יזמי נדל"ן'
        lead='תוכנית מובנית שמלווה יזמים צעירים מהרעיון ועד לעסקה העצמאית — עם שלומי קורקוס וצוות קורקוס גרופ, שלושים שנה בשטח.'
        crumbs={[{ label: 'מנטורינג' }]}
      />

      {/* ---- Shlomi Intro ---- */}
      <section className="mentor-intro">
        <div className="container">
          <Reveal className="mentor-intro__inner">
            <div className="mentor-intro__content">
              <span className="mentor-intro__eyebrow eyebrow">שלומי קורקוס, מייסד קורקוס גרופ</span>
              <h2 className="mentor-intro__heading">
                שלושים שנה בשטח.<br />בכל שלב של הדרך.
              </h2>
              <p className="mentor-intro__para">
                אני לא מלמד מה שקראתי בספר. אני מלמד מה שעשיתי — פרויקט אחר פרויקט, טעות אחר טעות, עסקה אחר עסקה. הקמתי ארבע חטיבות שמכסות את כל שלבי הפרויקט: ייזום, ביצוע, פיקוח ותיווך. יזם שעובד איתי לא צריך לרכז מידע ממספר גורמים — הכל נמצא תחת מטרייה אחת.
              </p>
              <p className="mentor-intro__para">
                הניסיון הזה לא נמכר בקורס מקוון ולא נרכש באקדמיה. הוא נצבר בשטח, בישיבות עם בנקים, בוועדות תכנון, במסירות שהלכו טוב ובמסירות שלימדו אותי יותר. מה שאני מציע הוא ליווי אישי, צמוד ומתמשך — כדי שהדרך שלכם תהיה קצרה ובטוחה יותר משלי.
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
            <div className="mentor-intro__badge">
              <div className="mentor-intro__badge-inner">
                <Icon name="building" size={40} className="mentor-intro__badge-icon" />
                <p className="mentor-intro__badge-quote">
                  "יזמות נדל"ן היא מקצוע. לא השקעה. לא הימור. מקצוע שלומדים עם מנטור שכבר עשה את הדרך."
                </p>
                <span className="mentor-intro__badge-sig">שלומי קורקוס</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Pillars ---- */}
      <section className="section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">למה זה שונה</span>
            <h2>מה שאי אפשר ללמוד בקורס</h2>
            <p className="mentor-section-lead">
              ניסיון, רשת קשרים ומסגרת מקצועית מלאה — שלושת הדברים שקובעים עסקת נדל"ן — אינם נמכרים בחבילת לימוד. הם נרכשים עם מנטור שחי אותם.
            </p>
          </Reveal>
          <div className="mentor-pillars">
            {pillars.map((p, i) => (
              <Reveal key={i} as="article" className="mentor-pillar">
                <div className="mentor-pillar__icon-wrap">
                  <Icon name={iconMap[p.icon] || 'check'} size={26} className="mentor-pillar__icon" />
                </div>
                <h3 className="mentor-pillar__title">{p.title.he}</h3>
                <p className="mentor-pillar__desc">{p.desc.he}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- What a deal requires vs what we provide ---- */}
      <section className="section section--alt mentor-compare-section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">הדרך לעסקה הראשונה</span>
            <h2>מה נדרש כדי לסגור עסקת נדל"ן</h2>
          </Reveal>
          <div className="mentor-compare">
            <div className="mentor-compare__col mentor-compare__col--need">
              <h3 className="mentor-compare__head">מה העסקה דורשת</h3>
              <ul className="mentor-compare__list">
                {[
                  'ניתוח שוק מעמיק ואיתור הזדמנות מוקדמת',
                  'בדיקת היתכנות ודוח 0 מבוסס מספרים אמיתיים',
                  'משא ומתן שמגן על הרווח',
                  'ליווי משפטי שמכיר את המלכודות',
                  'מימון בנקאי בתנאים שעובדים לפרויקט',
                  'ניהול היתרים ובירוקרטיה בלי עיכובים מיותרים',
                  'פיקוח שטח שמגן על האיכות והתקציב',
                  'שיווק ומכירות שמממשים את הרווח',
                  'מסירה שבונה מוניטין לפרויקט הבא',
                  'רשת קשרים שפותחת דלתות',
                ].map((item, i) => (
                  <li key={i} className="mentor-compare__item">
                    <Icon name="check" size={16} className="mentor-compare__check" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mentor-compare__col mentor-compare__col--provide">
              <h3 className="mentor-compare__head">מה הליווי מספק</h3>
              <ul className="mentor-compare__list">
                {[
                  'ניסיון של 30 שנה שמקצר עשור של טעויות',
                  'תבניות עבודה ודוחות מהשטח, לא מספר תיאוריה',
                  'ליווי אישי בכל שלב, לא יעוץ כללי',
                  'גישה לרשת של עורכי דין, שמאים ובנקים',
                  'ארבע חטיבות עסקיות תחת מטרייה אחת',
                  'מנגנון בדיקת עסקה לפני שחותמים',
                  'זמינות שוטפת, שאלות ותשובות בזמן אמת',
                  'ליווי מסגירת העסקה ועד למסירת המפתח',
                  'הפקת לקחים משותפת בסיום כל שלב',
                  'שותפות שמבוססת על הצלחה, לא על שכר לימוד',
                ].map((item, i) => (
                  <li key={i} className="mentor-compare__item mentor-compare__item--provide">
                    <Icon name="check" size={16} className="mentor-compare__check mentor-compare__check--gold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 10 Stages ---- */}
      <section className="section mentor-stages-section">
        <div className="container">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">תוכנית הליווי</span>
            <h2>עשרה שלבים. דרך אחת.</h2>
            <p className="mentor-section-lead">
              כל שלב בליווי בנוי על הידע שנצבר בשלב שלפניו. אין קיצורי דרך — יש דרך נכונה.
            </p>
          </Reveal>
          <div className="mentor-stages">
            {stages.map((s) => (
              <Reveal key={s.id} as="article" className="mentor-stage">
                <div className="mentor-stage__header">
                  <span className="mentor-stage__num">{s.num}</span>
                  <div className="mentor-stage__icon-wrap" style={{ '--stage-c': s.color }}>
                    <Icon name={iconMap[s.icon] || 'check'} size={20} />
                  </div>
                </div>
                <h3 className="mentor-stage__title">{s.title.he}</h3>
                <p className="mentor-stage__desc">{s.desc.he}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Knowledge Hub ---- */}
      <KnowledgeHub />

      {/* ---- FAQ ---- */}
      <section className="section section--alt">
        <div className="container mentor-faq-wrap">
          <Reveal className="mentor-section-head">
            <span className="eyebrow">שאלות נפוצות</span>
            <h2>שאלות שכדאי לשאול לפני שמתחילים</h2>
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

      {/* ---- CTA ---- */}
      <section className="mentor-cta">
        <div className="container">
          <Reveal className="mentor-cta__inner">
            <div className="mentor-cta__text">
              <span className="mentor-cta__eyebrow">מוכנים להתחיל?</span>
              <h2 className="mentor-cta__title">הצעד הראשון הוא שיחה</h2>
              <p className="mentor-cta__desc">
                אין כאן טופס שמציב אתכם בתור. אנחנו מדברים עם יזמים ברצינות, מבינים את הרקע שלכם, ומחליטים ביחד אם הליווי מתאים לכם. שיחת ההיכרות היא ללא עלות וללא מחויבות.
              </p>
              <div className="mentor-cta__actions">
                <a href="/#contact" className="btn btn--primary btn--lg mentor-cta__btn">
                  השאירו פרטים לשיחת היכרות
                  <Icon name="arrow" size={18} className="mentor-cta__arrow" />
                </a>
                <a href={`tel:0506855656`} className="mentor-cta__phone">
                  <Icon name="phone" size={18} />
                  050-6855656
                </a>
              </div>
            </div>
            <div className="mentor-cta__badge">
              <div className="mentor-cta__badge-items">
                {[
                  { icon: 'check', text: 'ליווי אישי 1:1' },
                  { icon: 'shield', text: 'שלושים שנה בשטח' },
                  { icon: 'building', text: 'ארבע חטיבות עסקיות' },
                  { icon: 'handshake', text: 'רשת קשרים בתעשייה' },
                ].map((b, i) => (
                  <div key={i} className="mentor-cta__badge-item">
                    <Icon name={b.icon} size={18} className="mentor-cta__badge-ic" />
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
