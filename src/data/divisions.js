/* ============================================================
   תחומי הפעילות (דיוויזיות), שירותי הליבה של קורקוס גרופ.
   כל תחום מקבל דף נחיתה מלא: באנר, אינטרו, "למה אנחנו",
   פרויקטים, מדריך, סיפורי הצלחה.
   ------------------------------------------------------------
   slug     : נתיב הדף (/divisions/<slug>)
   icon     : שם אייקון מ-Icon.jsx
   category : מסנן את הפרויקטים הרלוונטיים; null = כל הפרויקטים
   ============================================================ */

export const divisions = [
  {
    slug: 'residential',
    // כותרת ותיאור לחיפוש. התווית בתפריט נשארת קצרה, וזו הצורה שגוגל מציג
    seoTitle: 'פרויקטים למגורים בהוד השרון ובאזור המרכז',
    seoDescription: 'דירות, וילות ובתים פרטיים של קורקוס גרופ בהוד השרון ובאזור המרכז: פרויקטים בבנייה ובתכנון, מיזמות ותכנון דרך הביצוע והפיקוח ועד מסירת המפתח. המשרד ברחוב הנגר 24, הוד השרון.',
    icon: 'house',
    category: 'residential',
    name: { he: 'פרויקטים למגורים', en: 'Residential projects' },
    menuTitle: { he: 'מגורים', en: 'Residential' },
    hero: {
      title: { he: 'פרויקטים למגורים בהוד השרון ובאזור המרכז', en: 'Residential projects in Hod HaSharon and central Israel' },
      subtitle: {
        he: 'בתים שנבנים סביב האנשים שגרים בהם, מאיכות הבנייה ועד תחושת הקהילה.',
        en: 'Homes built around the people who live in them, from build quality to a sense of community.',
      },
      image: '/divisions/kurkoos-showcase-poster.jpg',
    },
    intro: {
      he: 'תחום המגורים של קורקוס מתמחה בייזום והקמה של פרויקטים למגורים ברמת גימור גבוהה, עם דגש על תכנון חכם, אור טבעי ומרחבים משותפים שמייצרים קהילה. אנחנו מלווים את הרוכשים מהרגע הראשון ועד מסירת המפתח, ובאחריות מלאה גם אחרי.',
      en: 'The Kurkoos residential division specializes in initiating and building high-finish residential projects, emphasizing smart planning, natural light and shared spaces that create community. We accompany buyers from day one to key handover, with full responsibility after, too.',
    },
    why: [
      { icon: 'shield', title: { he: 'איכות בלתי מתפשרת', en: 'Uncompromising quality' }, desc: { he: 'בקרת איכות בכל שלב, חומרים מהשורה הראשונה וגימור מוקפד.', en: 'Quality control at every stage, premium materials and meticulous finish.' } },
      { icon: 'handshake', title: { he: 'ליווי אישי', en: 'Personal guidance' }, desc: { he: 'מלווה רוכשים ייעודי לכל לקוח, לאורך כל הדרך.', en: 'A dedicated buyer representative for every client, all the way.' } },
      { icon: 'check', title: { he: 'שקיפות מלאה', en: 'Full transparency' }, desc: { he: 'דיווח שוטף על התקדמות הבנייה ולוחות הזמנים.', en: 'Ongoing reporting on construction progress and schedule.' } },
      { icon: 'building', title: { he: 'תכנון מתקדם', en: 'Advanced planning' }, desc: { he: 'אדריכלות עכשווית, מרחבים משותפים ובית חכם.', en: 'Contemporary architecture, shared spaces and smart homes.' } },
    ],
    guide: {
      title: { he: 'המדריך לרכישת דירה', en: 'The apartment-buying guide' },
      desc: { he: 'כל מה שצריך לדעת לפני שקונים דירה על הנייר, שלב אחר שלב.', en: 'Everything to know before buying off-plan, step by step.' },
    },
    /* שאלות נפוצות, מוצגות בעמוד ומוזנות ל-Structured Data (FAQPage) */
    faqs: [
      {
            "q": {
                  "he": "מה חשוב לבדוק כשקונים דירה חדשה מקבלן?",
                  "en": "What should you check when buying a new apartment from a developer?"
            },
            "a": {
                  "he": "לפני רכישת דירה חדשה חשוב לבדוק את זהות היזם והקבלן המבצע, את המפרט הטכני המצורף לחוזה, את הבטוחות לפי חוק המכר, את לוחות הזמנים למסירה ואת התוכניות המאושרות של הפרויקט. מומלץ להיעזר בעורך דין מטעמכם שמתמחה במקרקעין לפני חתימה.",
                  "en": "Before buying a new apartment, check who the developer and contractor are, the technical specification attached to the contract, the Sale Law guarantees, delivery timelines and the project's approved plans. Use your own real-estate lawyer before signing."
            }
      },
      {
            "q": {
                  "he": "אילו בטוחות מקבל רוכש דירה חדשה בישראל?",
                  "en": "What guarantees does a new-home buyer receive in Israel?"
            },
            "a": {
                  "he": "חוק המכר (דירות) (הבטחת השקעות) מחייב את המוכר להעמיד בטוחה על כל תשלום מעבר ל-7% ממחיר הדירה, לרוב ערבות בנקאית או פוליסת ביטוח. בנוסף קובע חוק המכר תקופת בדק ותקופת אחריות שבהן היזם אחראי לתיקון ליקויים בדירה.",
                  "en": "Israel's Sale Law requires the seller to secure any payment above 7% of the price, usually with a bank guarantee or insurance policy. The law also sets inspection and warranty periods in which the developer must repair defects."
            }
      },
      {
            "q": {
                  "he": "מה קורה אחרי מסירת המפתח?",
                  "en": "What happens after key handover?"
            },
            "a": {
                  "he": "אחרי המסירה מתחילה תקופת הבדק הקבועה בחוק המכר, שבמהלכה היזם אחראי לתקן ליקויים שמתגלים בדירה, כאשר משך התקופה משתנה לפי סוג הליקוי. מומלץ לתעד ליקויים בפרוטוקול המסירה ולדווח בכתב על כל ליקוי שמתגלה.",
                  "en": "After handover the statutory inspection period begins, during which the developer must fix defects; its length varies by defect type. Document defects in the handover protocol and report new ones in writing."
            }
      },
      {
            "q": {
                  "he": "מה ההבדל בין קניית דירה על הנייר לדירה מוכנה?",
                  "en": "What is the difference between buying off-plan and a finished home?"
            },
            "a": {
                  "he": "בקנייה על הנייר רוכשים דירה לפני או במהלך הבנייה, לרוב במחיר נמוך יותר ועם אפשרות לשינויי דיירים, אך עם המתנה עד המסירה. בדירה מוכנה רואים בדיוק מה קונים ונכנסים מהר, לרוב במחיר גבוה יותר. בשני המקרים חשוב לבדוק את היזם, החוזה והבטוחות.",
                  "en": "Off-plan means buying before or during construction, usually at a lower price with customization options but a wait until delivery. A finished home is what-you-see-is-what-you-get with fast entry, usually at a higher price. Either way, check the developer, contract and guarantees."
            }
      }
],
  },
  {
    slug: 'execution',
    // כותרת ותיאור לחיפוש. התווית בתפריט נשארת קצרה, וזו הצורה שגוגל מציג
    seoTitle: 'ביצוע ובנייה: קבלן מבצע בהוד השרון ובאזור המרכז',
    seoDescription: 'ראיתה, זרוע הביצוע של קורקוס גרופ, היא קבלן מבצע לפרויקטים למגורים בהוד השרון ובאזור המרכז: שלד, מעטפת וגימור, בקרת איכות וניהול קבלני משנה, מהיסודות ועד מסירת המפתח.',
    icon: 'crane',
    category: null,
    name: { he: 'ראיתה. ביצוע מנצח.', en: 'Raita. Winning execution.' },
    menuTitle: { he: 'ביצוע', en: 'Execution' },
    hero: {
      title: { he: 'ביצוע ובנייה', en: 'Execution & Construction' },
      subtitle: {
        he: 'מהיסודות ועד מסירת המפתח, בנייה איכותית, בזמן ובתקציב, עם צוותי שטח מהמנוסים בארץ.',
        en: 'From foundations to handover, quality construction, on time and on budget, with some of Israel’s most experienced field teams.',
      },
      // תמונת רקע מאתר בנייה אמיתי, שמור את הקובץ ב: public/divisions/execution-bg.jpg
      image: '/divisions/execution-bg.jpg',
    },
    intro: {
      he: 'זרוע הביצוע של קורקוס מתרגמת תכניות לבניינים. אנחנו מבצעים פרויקטים מורכבים בסטנדרט הגבוה ביותר, שלד, מעטפת וגימור, תוך בקרת איכות בכל שלב, ניהול קבלני משנה ועמידה קפדנית בלוחות זמנים ובתקציב. אנחנו בונים גם עבור הפרויקטים שלנו וגם כקבלן מבצע עבור יזמים וגופים מוסדיים.',
      en: 'The Kurkoos execution arm turns plans into buildings. We deliver complex projects to the highest standard, structure, envelope and finish, with quality control at every stage, subcontractor management and strict adherence to schedule and budget. We build both for our own projects and as a contractor for developers and institutional clients.',
    },
    why: [
      { icon: 'crane', title: { he: 'ביצוע מקצועי', en: 'Professional execution' }, desc: { he: 'צוותי שטח מנוסים ושיטות בנייה מתקדמות בכל פרויקט.', en: 'Experienced field teams and advanced construction methods on every project.' } },
      { icon: 'check', title: { he: 'בקרת איכות', en: 'Quality control' }, desc: { he: 'בקרה הדוקה מהשלד ועד הגימור, מול מפרט ותקנים.', en: 'Tight control from structure to finish, against spec and standards.' } },
      { icon: 'shield', title: { he: 'בטיחות בעבודה', en: 'Site safety' }, desc: { he: 'תרבות בטיחות מחמירה ועמידה מלאה בתקני הבנייה.', en: 'A strict safety culture and full compliance with building codes.' } },
      { icon: 'building', title: { he: 'עמידה בזמנים ובתקציב', en: 'On time, on budget' }, desc: { he: 'ניהול פרויקט קפדני ושקיפות מלאה בכל אבן דרך.', en: 'Rigorous project management and full transparency at every milestone.' } },
    ],
    guide: {
      title: { he: 'המדריך לתהליך הבנייה', en: 'The construction-process guide' },
      desc: { he: 'מה קורה באתר מהחפירה ועד מסירת המפתח, שלב אחר שלב.', en: 'What happens on site from excavation to handover, step by step.' },
    },
    /* שאלות נפוצות, מוצגות בעמוד ומוזנות ל-Structured Data (FAQPage) */
    faqs: [
      {
        q: { he: 'האם קורקוס גרופ היא קבלן מבצע?', en: 'Is Kurkoos Group a general contractor?' },
        a: {
          he: 'כן. ראיתה היא זרוע הביצוע של קורקוס גרופ, והיא משמשת קבלן מבצע לפרויקטים למגורים בהוד השרון ובאזור המרכז: שלד, מעטפת וגימור, בקרת איכות וניהול קבלני משנה. הקבוצה מבצעת גם את הפרויקטים שהיא מייזמת בעצמה וגם פרויקטים עבור יזמים וגופים אחרים.',
          en: 'Yes. Raita is the execution arm of Kurkoos Group and acts as the general contractor for residential projects in Hod HaSharon and central Israel: structure, envelope and finishing, quality control and subcontractor management, both for the group\u2019s own projects and for other developers.',
        },
      },

      {
            "q": {
                  "he": "מה כולל שלב הביצוע בפרויקט בנייה?",
                  "en": "What does the execution stage of a construction project include?"
            },
            "a": {
                  "he": "שלב הביצוע כולל את עבודות העפר והביסוס, הקמת השלד, עבודות המעטפת והאיטום, מערכות החשמל, האינסטלציה והמיזוג, עבודות הגמר והפיתוח הסביבתי, עד קבלת טופס 4 ומסירת הדירות. לאורך כל הדרך מתבצעות בדיקות איכות ובקרת התקדמות מול לוחות הזמנים.",
                  "en": "Execution covers earthworks and foundations, the structural frame, envelope and waterproofing, electrical, plumbing and HVAC systems, finishing works and site development, through Form 4 and apartment handover, with ongoing quality checks and schedule control."
            }
      },
      {
            "q": {
                  "he": "מה זה טופס 4?",
                  "en": "What is Form 4?"
            },
            "a": {
                  "he": "טופס 4 הוא אישור אכלוס שמנפיקה הרשות המקומית, המאשר שהמבנה נבנה בהתאם להיתר וראוי לחיבור לתשתיות חשמל, מים וביוב. בלי טופס 4 אי אפשר לאכלס את הבניין כחוק, ולכן קבלתו היא אבן דרך מרכזית בסיום כל פרויקט.",
                  "en": "Form 4 is the occupancy approval issued by the local authority confirming the building matches its permit and can be connected to utilities. Legal occupancy is impossible without it, making it a key project milestone."
            }
      },
      {
            "q": {
                  "he": "איך שומרים על לוחות זמנים בפרויקט בנייה?",
                  "en": "How do you keep a construction project on schedule?"
            },
            "a": {
                  "he": "שמירה על לוח זמנים מתחילה בתכנון ביצוע מפורט לפני עליית הקבלן לשטח, וממשיכה במעקב התקדמות שוטף, תיאום מוקדם של קבלני משנה וחומרים, וטיפול מיידי בחסמים כשהם עוד קטנים. פערים מזוהים מוקדם דרך השוואה שוטפת בין התכנון לביצוע בפועל.",
                  "en": "Staying on schedule starts with detailed execution planning before mobilization and continues with ongoing progress tracking, early coordination of subcontractors and materials, and resolving blockers while they are small."
            }
      },
      {
            "q": {
                  "he": "מה ההבדל בין קבלן ראשי לקבלן משנה?",
                  "en": "What is the difference between a main contractor and a subcontractor?"
            },
            "a": {
                  "he": "הקבלן הראשי אחראי כלפי המזמין על ביצוע הפרויקט כולו: ניהול האתר, לוחות הזמנים, הבטיחות והאיכות. קבלני המשנה מבצעים עבורו עבודות ייעודיות כמו חשמל, אינסטלציה, אלומיניום או גמר, באחריות ובתיאום של הקבלן הראשי.",
                  "en": "The main contractor is responsible to the client for the whole project: site management, schedule, safety and quality. Subcontractors perform specific trades such as electrical, plumbing or finishes under the main contractor's coordination."
            }
      }
],
  },
  {
    slug: 'development',
    // כותרת ותיאור לחיפוש. התווית בתפריט נשארת קצרה, וזו הצורה שגוגל מציג
    seoTitle: 'יזמות נדל"ן בהוד השרון ובאזור המרכז',
    seoDescription: 'קורקוס יזמות מייזמת פרויקטים למגורים מאיתור הקרקע ובדיקות ההיתכנות, דרך התכנון והרישוי, ועד השיווק והמסירה, בהוד השרון ובאזור המרכז.',
    icon: 'building',
    category: null,
    name: { he: 'קורקוס יזמות', en: 'Kurkoos Development' },
    menuTitle: { he: 'יזמות', en: 'Development' },
    hero: {
      title: { he: 'ייזום נדל"ן', en: 'Real-estate development' },
      subtitle: {
        he: 'מאיתור הקרקע ועד מסירת המפתח, יוזמים פרויקטים שמייצרים ערך לרוכשים, לשותפים ולסביבה.',
        en: 'From land acquisition to key handover, initiating projects that create value for buyers, partners and the surroundings.',
      },
      image: '/divisions/humash-22-24.webp',
    },
    intro: {
      he: 'זרוע הייזום של קורקוס היא המנוע שמניע כל פרויקט. אנחנו מאתרים קרקעות והזדמנויות, מובילים תכנון ורישוי מול הרשויות, בונים מבנה פיננסי איתן ומנהלים את הסיכון, ומלווים את הפרויקט מהרעיון הראשוני ועד שהדיירים מקבלים את המפתח. כל יזמה נמדדת בערך האמיתי שהיא מייצרת לכל הצדדים.',
      en: 'The Kurkoos development arm is the engine behind every project. We identify land and opportunities, lead planning and permitting with the authorities, build a solid financial structure and manage risk, guiding each project from the initial idea until residents receive their keys. Every venture is measured by the real value it creates for all sides.',
    },
    why: [
      { icon: 'building', title: { he: 'ראייה אסטרטגית', en: 'Strategic vision' }, desc: { he: 'איתור קרקעות והזדמנויות עם פוטנציאל ערך אמיתי.', en: 'Sourcing land and opportunities with real value potential.' } },
      { icon: 'shield', title: { he: 'איתנות פיננסית', en: 'Financial strength' }, desc: { he: 'מבנה הון יציב, ביטחונות וערבויות מלאות לאורך הפרויקט.', en: 'A stable capital structure, securities and full guarantees throughout.' } },
      { icon: 'check', title: { he: 'תכנון ורישוי', en: 'Planning & permitting' }, desc: { he: 'ניהול מקצועי של הליכים מול רשויות ומוסדות תכנון.', en: 'Professional management of processes with authorities and planning bodies.' } },
      { icon: 'handshake', title: { he: 'שותפות לטווח ארוך', en: 'Long-term partnership' }, desc: { he: 'יחסים הוגנים ושקופים עם בעלי קרקע ושותפים.', en: 'Fair, transparent relationships with landowners and partners.' } },
    ],
    guide: {
      title: { he: 'המדריך ליזמות נדל"ן', en: 'The development guide' },
      desc: { he: 'איך פרויקט נולד, מאיתור הקרקע ועד קבלת ההיתר.', en: 'How a project is born, from land sourcing to building permit.' },
    },
    /* שאלות נפוצות, מוצגות בעמוד ומוזנות ל-Structured Data (FAQPage) */
    faqs: [
      {
            "q": {
                  "he": "מה עושה חברת יזמות נדל״ן?",
                  "en": "What does a real-estate development company do?"
            },
            "a": {
                  "he": "חברת יזמות נדל״ן מובילה פרויקט מהרעיון ועד המסירה: איתור קרקע ובדיקות היתכנות, תכנון ורישוי מול הרשויות, גיוס מימון וליווי בנקאי, ניהול הביצוע, שיווק ומכירת הדירות ומסירתן לרוכשים. היזם נושא באחריות הכוללת לפרויקט ולתוצאה שלו.",
                  "en": "A developer leads a project from idea to handover: sourcing land and feasibility checks, planning and permits, financing, managing construction, marketing and sales, and delivering to buyers. The developer bears overall responsibility for the project."
            }
      },
      {
            "q": {
                  "he": "מה ההבדל בין יזם לקבלן?",
                  "en": "What is the difference between a developer and a contractor?"
            },
            "a": {
                  "he": "היזם הוא הגורם שמוביל את הפרויקט ונושא באחריות הכוללת: הוא רוכש את הקרקע, מתכנן, מממן, משווק ומוכר. הקבלן הוא הגורם המקצועי שמבצע את עבודות הבנייה בפועל עבור היזם. לעיתים קבוצה אחת מחזיקה בשני הכובעים, כמו קבוצת קורקוס שפועלת גם בייזום וגם בביצוע.",
                  "en": "The developer leads the project and bears overall responsibility: buying the land, planning, financing, marketing and selling. The contractor physically builds it for the developer. Sometimes one group does both, as Kurkoos does with its development and execution arms."
            }
      },
      {
            "q": {
                  "he": "איך מתחיל פרויקט נדל״ן?",
                  "en": "How does a real-estate project begin?"
            },
            "a": {
                  "he": "פרויקט מתחיל באיתור קרקע מתאימה ובבדיקות היתכנות: מצב תכנוני וזכויות בנייה, בדיקות משפטיות של הבעלות, ובדיקה כלכלית שנקראת דוח אפס שמעריכה עלויות, הכנסות ורווחיות. רק אחרי שהבדיקות מאשרות את הכדאיות מתקדמים לרכישה, לתכנון ולרישוי.",
                  "en": "A project starts with sourcing suitable land and feasibility checks: planning status and building rights, legal ownership checks, and a financial appraisal (zero report) estimating costs, revenue and profitability. Only then do purchase, planning and permits proceed."
            }
      },
      {
            "q": {
                  "he": "כמה זמן נמשך פרויקט יזמות למגורים?",
                  "en": "How long does a residential development project take?"
            },
            "a": {
                  "he": "משך הפרויקט משתנה מאוד לפי היקפו ולפי המצב התכנוני של הקרקע. ככלל, שלבי התכנון והרישוי הם לרוב החלק הארוך והפחות צפוי בתהליך, בעוד שהבנייה עצמה נמשכת בדרך כלל שנתיים עד שלוש בפרויקט מגורים טיפוסי. קרקע עם תוכנית מאושרת מקצרת את הדרך משמעותית.",
                  "en": "Duration varies greatly with scope and the land's planning status. Planning and permitting are usually the longest, least predictable part, while construction itself typically takes two to three years for a residential project. Land with an approved plan shortens the path significantly."
            }
      }
],
  },
  {
    slug: 'supervision',
    // כותרת ותיאור לחיפוש. התווית בתפריט נשארת קצרה, וזו הצורה שגוגל מציג
    seoTitle: 'ניהול ופיקוח פרויקטים בהוד השרון ובאזור המרכז',
    seoDescription: 'שכינתא, זרוע הפיקוח של קורקוס גרופ, מנהלת ומפקחת על פרויקטי בנייה מטעם המזמין: בקרת איכות, בקרת תקציב ולוחות זמנים, בדיקות קבלה ומסירה.',
    icon: 'shield',
    category: null,
    name: { he: 'שכינתא פיקוח', en: 'Shechinta Supervision' },
    menuTitle: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
    hero: {
      title: { he: 'פיקוח פרויקטים', en: 'Project supervision' },
      subtitle: {
        he: 'עיניים מקצועיות על כל פרט, פיקוח הנדסי צמוד שמבטיח איכות, בטיחות ועמידה בתקציב ובזמנים.',
        en: 'Professional eyes on every detail, close engineering supervision that ensures quality, safety, budget and schedule.',
      },
      image: '/execution-gallery/4.jpg',
    },
    intro: {
      he: 'זרוע הפיקוח של שכינתא שומרת שכל פרויקט מבוצע בדיוק כפי שתוכנן. צוות המפקחים שלנו מלווה את הבנייה מההיתר ועד המסירה, בודק איכות וחומרים, מאשר חשבונות קבלן, מנהל לוחות זמנים ותקציב ואוכף תקני בטיחות. אנחנו מספקים שירותי פיקוח גם לפרויקטים שלנו וגם ללקוחות חיצוניים: יזמים, גופים מוסדיים ובעלי נכסים.',
      en: 'The Shechinta supervision arm ensures every project is executed exactly as planned. Our supervisors accompany construction from permit to handover, checking quality and materials, approving contractor invoices, managing schedule and budget, and enforcing safety standards. We provide supervision for our own projects and for external clients alike: developers, institutional bodies and property owners.',
    },
    why: [
      { icon: 'shield', title: { he: 'פיקוח הנדסי צמוד', en: 'Close engineering oversight' }, desc: { he: 'נוכחות בשטח ובקרה רציפה לאורך כל הבנייה.', en: 'On-site presence and continuous control throughout construction.' } },
      { icon: 'check', title: { he: 'בקרת איכות וחומרים', en: 'Quality & materials control' }, desc: { he: 'בדיקה שיטתית מול המפרט ומול תקני הבנייה.', en: 'Systematic checking against the spec and building standards.' } },
      { icon: 'building', title: { he: 'בקרת תקציב וחשבונות', en: 'Budget & billing control' }, desc: { he: 'אישור חשבונות קבלן ומניעת חריגות תקציב.', en: 'Contractor-invoice approval and prevention of budget overruns.' } },
      { icon: 'crane', title: { he: 'ניהול לוחות זמנים', en: 'Schedule management' }, desc: { he: 'תיאום קבלנים ועמידה באבני הדרך של הפרויקט.', en: 'Contractor coordination and meeting project milestones.' } },
    ],
    guide: {
      title: { he: 'המדריך לפיקוח בנייה', en: 'The construction-supervision guide' },
      desc: { he: 'מה תפקיד המפקח ולמה הוא חוסך לכם זמן וכסף.', en: 'What a supervisor does and why it saves you time and money.' },
    },
    /* שאלות נפוצות, מוצגות בעמוד ומוזנות ל-Structured Data (FAQPage) */
    faqs: [
      {
        q: { he: 'האם קורקוס גרופ מבצעת ניהול ופיקוח על פרויקטים?', en: 'Does Kurkoos Group provide project management and supervision?' },
        a: {
          he: 'כן. שכינתא היא זרוע הניהול והפיקוח של קורקוס גרופ, והיא מנהלת ומפקחת על פרויקטי בנייה מטעם המזמין: בקרת איכות בשלבי הביצוע, בקרת תקציב ולוחות זמנים, בדיקות קבלה וליווי עד המסירה. השירות ניתן גם ללקוחות חיצוניים ולא רק לפרויקטים של הקבוצה.',
          en: 'Yes. Shchinta is the project management and supervision arm of Kurkoos Group, supervising construction projects on behalf of the client: quality control during execution, budget and schedule control, acceptance testing and handover, for external clients as well as the group\u2019s own projects.',
        },
      },

      {
            "q": {
                  "he": "מה עושה מפקח בנייה?",
                  "en": "What does a construction supervisor do?"
            },
            "a": {
                  "he": "מפקח בנייה מבצע בקרה מקצועית על עבודות הבנייה מטעם מזמין העבודה: בודק שהביצוע תואם לתוכניות, למפרט ולתקנים, מאשר שלבי עבודה וחשבונות קבלן, עוקב אחרי לוחות זמנים ומתעד את ההתקדמות. המפקח הוא העיניים המקצועיות של המזמין באתר.",
                  "en": "A construction supervisor professionally controls the works on the client's behalf: verifying execution matches plans, specs and standards, approving work stages and contractor invoices, tracking schedule and documenting progress."
            }
      },
      {
            "q": {
                  "he": "מה כולל פיקוח על פרויקט בנייה?",
                  "en": "What does construction supervision include?"
            },
            "a": {
                  "he": "פיקוח מלא כולל בדיקות איכות בשלבים קריטיים כמו יציקות ואיטום, בקרת התאמה לתוכניות ולהיתר, בדיקת חשבונות חלקיים של הקבלן לפני תשלום, מעקב לוחות זמנים ותקציב, ניהול ישיבות אתר ותיעוד שוטף, וליווי מסירות ובדיקת תיקון ליקויים.",
                  "en": "Full supervision includes quality checks at critical stages such as concrete pours and waterproofing, verifying conformity to plans and permit, reviewing contractor payment applications, schedule and budget tracking, site meetings, documentation and handover support."
            }
      },
      {
            "q": {
                  "he": "למה חשוב פיקוח בנייה מטעם המזמין?",
                  "en": "Why is client-side supervision important?"
            },
            "a": {
                  "he": "בלי גורם מקצועי מטעם המזמין, האינטרס של הקבלן הוא שיקבע בשטח. מפקח עצמאי מזהה ליקויים כשעוד קל וזול לתקן אותם, מוודא שכל שקל בחשבון הקבלן משקף עבודה שבוצעה בפועל, ושומר שהפרויקט יעמוד באיכות, בתקציב ובלוח הזמנים שהוגדרו.",
                  "en": "Without a professional on the client's side, the contractor's interest sets the tone. An independent supervisor catches defects while they are cheap to fix, ensures every invoice reflects work actually done, and protects quality, budget and schedule."
            }
      },
      {
            "q": {
                  "he": "מה ההבדל בין מפקח בנייה למנהל פרויקט?",
                  "en": "What is the difference between a supervisor and a project manager?"
            },
            "a": {
                  "he": "מנהל פרויקט מוביל את הפרויקט כולו מטעם המזמין: תכנון, התקשרויות, תקציב ולוחות זמנים ברמת העל. מפקח הבנייה מתמקד בבקרת הביצוע בשטח: איכות, התאמה לתוכניות ואישור חשבונות. בפרויקטים רבים שני התפקידים משלימים זה את זה, ולעיתים גורם אחד ממלא את שניהם.",
                  "en": "A project manager leads the whole project for the client: planning, contracting, budget and high-level schedule. A supervisor focuses on on-site execution control: quality, conformity and invoice approval. The roles complement each other and are sometimes combined."
            }
      }
],
  },
  {
    slug: 'brokerage',
    // כותרת ותיאור לחיפוש. התווית בתפריט נשארת קצרה, וזו הצורה שגוגל מציג
    seoTitle: 'תיווך ושיווק נכסים בהוד השרון ובאזור המרכז',
    seoDescription: 'אפיק הנחל, זרוע התיווך של קורקוס גרופ, מלווה רוכשים ומוכרים ומשווקת פרויקטים בהוד השרון ובאזור המרכז, מהערכת השווי ועד החתימה.',
    icon: 'brokerage',
    category: null,
    name: { he: 'אפיק הנחל', en: 'Afik Hanachal' },
    menuTitle: { he: 'תיווך', en: 'Brokerage' },
    hero: {
      title: { he: 'תיווך ושיווק', en: 'Brokerage & Marketing' },
      subtitle: {
        he: 'מומחים בשיווק בתי יוקרה ואיתור מגרשים וקרקעות בשרון ובמרכז, המלווים אתכם בתהליך הרכישה והמכירה עד למציאת הנכס המדויק עבורכם',
        en: 'Experts in luxury home marketing and sourcing plots and land across the Sharon and central regions, guiding you through buying and selling until we find the exact property for you.',
      },
      image: '/afik-hanahal-cover.webp',
    },
    intro: {
      he: 'זרוע התיווך והשיווק של קורקוס מחברת בין אנשים לבתים. אנחנו משווקים את הפרויקטים של הקבוצה ושל לקוחותינו, מלווים רוכשים ומוכרים לאורך כל העסקה, ומתאימים לכל לקוח את הנכס המדויק לצרכים, לתקציב ולחלום שלו. עם היכרות עמוקה של השוק, שקיפות מלאה ושירות אישי, אנחנו הופכים את אחת ההחלטות הגדולות בחיים לתהליך בטוח ונעים.',
      en: 'The Kurkoos brokerage and marketing arm connects people with homes. We market the group’s projects and our clients’ properties, accompany buyers and sellers throughout the deal, and match each client with the exact property for their needs, budget and dream. With deep market knowledge, full transparency and personal service, we turn one of life’s biggest decisions into a safe, pleasant process.',
    },
    why: [
      { icon: 'handshake', title: { he: 'ליווי אישי לאורך העסקה', en: 'Personal guidance throughout' }, desc: { he: 'מתווך ייעודי שמלווה אתכם מהחיפוש ועד חתימת החוזה.', en: 'A dedicated agent guiding you from search to signing.' } },
      { icon: 'building', title: { he: 'שיווק פרויקטים', en: 'Project marketing' }, desc: { he: 'אסטרטגיית שיווק חכמה שמציגה כל פרויקט במלוא הערך שלו.', en: 'Smart marketing strategy that presents each project at its full value.' } },
      { icon: 'check', title: { he: 'התאמת הנכס המדויק', en: 'The right-fit property' }, desc: { he: 'הבנה עמוקה של הצרכים והתאמה מדויקת מתוך השוק כולו.', en: 'A deep grasp of your needs and a precise match from the whole market.' } },
      { icon: 'shield', title: { he: 'שקיפות וביטחון', en: 'Transparency & confidence' }, desc: { he: 'מידע מלא, מחירים הוגנים וליווי משפטי בכל שלב.', en: 'Full information, fair pricing and legal support at every stage.' } },
    ],
    guide: {
      title: { he: 'המדריך לרוכש ולמוכר', en: 'The buyer & seller guide' },
      desc: { he: 'איך לקנות או למכור נכון, צעד אחר צעד, בלי הפתעות.', en: 'How to buy or sell right, step by step, with no surprises.' },
    },
    /* שאלות נפוצות, מוצגות בעמוד ומוזנות ל-Structured Data (FAQPage) */
    faqs: [
      {
            "q": {
                  "he": "מה ההבדל בין תיווך נדל״ן לשיווק פרויקטים?",
                  "en": "What is the difference between brokerage and project marketing?"
            },
            "a": {
                  "he": "תיווך מחבר בין מוכר לקונה בנכס בודד, לרוב יד שנייה, והמתווך מלווה את שני הצדדים עד העסקה. שיווק פרויקטים הוא ליווי מכירות שלם של פרויקט חדש מטעם היזם: אסטרטגיית מחיר, חומרי שיווק, ניהול מכירות וליווי רוכשים. אפיק הנחל, זרוע התיווך והשיווק של קורקוס גרופ, פועלת בשני התחומים.",
                  "en": "Brokerage connects a seller and buyer on a single, usually second-hand property. Project marketing is full sales management of a new project for the developer: pricing strategy, marketing assets, sales and buyer guidance. Afik Hanachal, Kurkoos Group's brokerage arm, does both."
            }
      },
      {
            "q": {
                  "he": "איך קובעים מחיר נכון לדירה לפני מכירה?",
                  "en": "How do you price a home correctly before selling?"
            },
            "a": {
                  "he": "תמחור נכון מבוסס על עסקאות אמת שנסגרו לאחרונה בנכסים דומים באזור, ולא על מחירי פרסום. משקללים את מצב הנכס, הקומה, הכיוונים, החניה והמעלית, ובוחנים את היצע הנכסים המתחרים כרגע בשוק. מחיר פתיחה גבוה מדי מבריח קונים רציניים ומאריך את זמן המכירה.",
                  "en": "Correct pricing relies on recently closed deals for similar properties nearby, not asking prices. Factor in condition, floor, orientation, parking and elevator, and the competing supply. An inflated opening price drives serious buyers away and lengthens the sale."
            }
      },
      {
            "q": {
                  "he": "מה חשוב לדעת לפני חתימה על הסכם בלעדיות?",
                  "en": "What should you know before signing an exclusivity agreement?"
            },
            "a": {
                  "he": "הסכם בלעדיות נותן למתווך אחד את זכות השיווק לתקופה מוגדרת, ובתמורה הוא מחויב לפי החוק לבצע פעולות שיווק מוגדרות. לפני חתימה חשוב לוודא מה תקופת הבלעדיות, אילו פעולות שיווק הובטחו בכתב, ומה גובה דמי התיווך. בלעדיות למתווך שעובד באמת היא כלי שמשרת את המוכר.",
                  "en": "Exclusivity gives one agent the marketing rights for a set period and legally obligates defined marketing actions in return. Before signing, confirm the period, the written marketing commitments and the fee. Exclusivity with an agent who truly works serves the seller."
            }
      },
      {
            "q": {
                  "he": "איך נערכים נכון למכירת דירה?",
                  "en": "How do you prepare to sell a home?"
            },
            "a": {
                  "he": "מתחילים באיסוף המסמכים: נסח טאבו, היתרים ותשריט, ומוודאים שאין חריגות רישום. ממשיכים בהכנת הנכס לצילום ולהצגה, בקביעת מחיר מבוסס נתונים ובבניית תוכנית שיווק. במקביל כדאי לבדוק מראש את היבטי המס של העסקה, ובעיקר מס שבח ופטורים אפשריים.",
                  "en": "Start by collecting documents: title extract, permits and floor plan, and verify there are no registration issues. Prepare the property for photos and viewings, set a data-based price and build a marketing plan. Check the tax side, especially capital-gains exemptions, in advance."
            }
      }
],
  },
]

export function getDivision(slug) {
  return divisions.find((d) => d.slug === slug)
}

export default divisions
