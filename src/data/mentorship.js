/* ============================================================
   ליווי יזמי נדל"ן — שלומי קורקוס
   נתוני הדף: שלבי הליווי, כלים, יתרונות, שאלות נפוצות.
   ============================================================ */

export const mentorshipMeta = {
  title:    { he: 'ליווי יזמי נדל"ן', en: 'Real Estate Entrepreneur Mentorship' },
  subtitle: { he: 'מאפס לעצמאי, הדרך המלאה עם שלומי קורקוס וקבוצת קורקוס', en: 'From zero to independent — the full journey with Shlomi Kurkoos & Kurkoos Group' },
  lead: {
    he: 'יותר מ30 שנות ניסיון בשטח, כמה כובעים מקצועיים בתוך אותה מסגרת: ייזום, ביצוע, פיקוח, תיווך. ורשת קשרים אמיתית בתעשייה. זה הבסיס לתוכנית ליווי שמלווה יזמים צעירים מהעסקה הראשונה ועד לעצמאות מלאה.',
    en: 'Over 30 years of hands-on experience, multiple professional roles within one framework — development, execution, supervision, brokerage — and a genuine industry network. This is the foundation of a mentorship programme that accompanies young entrepreneurs from their first deal to full independence.',
  },
}

export const pillars = [
  {
    icon: 'building',
    title: { he: '+30 שנות ניסיון', en: '30+ years of experience' },
    desc:  { he: 'שלומי קורקוס עבר את כל שלבי התעשייה מהשטח, ממגרש ריק ועד מסירת מפתח. הניסיון הזה מקצר עשור של טעויות.', en: 'Shlomi Kurkoos has lived every stage of the industry, from an empty plot to handing over keys. That experience shortens a decade of mistakes.' },
  },
  {
    icon: 'shield',
    title: { he: 'כמה כובעים, ערך אמיתי', en: 'Multiple hats — real value' },
    desc:  { he: 'ייזום, ביצוע, פיקוח ותיווך תחת קורת גג אחת. בכל שלב בדרך יש בקבוצה את הכלי המתאים.', en: 'Development, execution, supervision and brokerage under one roof. At every stage of the journey the Group has the right tool.' },
  },
  {
    icon: 'handshake',
    title: { he: 'רשת קשרים בתעשייה', en: 'Industry network' },
    desc:  { he: 'קשרים עם עורכי דין, שמאים, בנקים, רשויות ויזמים. נגישות שלוקח שנים לבנות, נפתחת מהיום הראשון.', en: 'Connections with lawyers, appraisers, banks, authorities and developers — access that takes years to build, open from day one.' },
  },
  {
    icon: 'check',
    title: { he: 'ליווי אקדמי עד עצמאות', en: 'Academic-style mentorship to independence' },
    desc:  { he: 'תוכנית מובנית עם שלבים ברורים, כלים ותבניות, ומעבר אל עצמאות אמיתית. לא קורס שיווקי, אלא שותפות מקצועית.', en: 'A structured programme with clear stages, tools and templates, progressing to real independence — not a marketing course, but a professional partnership.' },
  },
]

export const stages = [
  {
    num: '01',
    id: 'sourcing',
    title: { he: 'איתור קרקע ועסקאות', en: 'Land & deal sourcing' },
    icon: 'pin',
    color: '#3a7bd5',
    desc: {
      he: 'לומדים לזהות הזדמנויות לפני שכולם רואים אותן: שכונות בעלייה, עסקאות מחיר מציאה, קרקעות חקלאיות לשינוי ייעוד, ופרויקטי התחדשות עירונית (תמ"א 38, פינוי בינוי).',
      en: 'Learning to spot opportunities before everyone else — rising neighbourhoods, bargain deals, agricultural land re-zoning, and urban renewal projects.',
    },
    tools: [
      { he: 'מפות GIS ובסיסי נתוני רשות מקרקעי ישראל', en: 'GIS maps & Israel Land Authority databases' },
      { he: 'ניתוח שוק שכונתי ומגמות מחיר', en: 'Neighbourhood market analysis & price trends' },
      { he: 'מתודולוגיית ה Off Market, עסקאות לפני המדיה', en: 'Off-market methodology — deals before the media' },
      { he: 'רשימת בדיקות לאיתור קרקע', en: 'Land-sourcing checklist' },
    ],
  },
  {
    num: '02',
    id: 'feasibility',
    title: { he: 'בדיקת היתכנות ודוח 0', en: 'Feasibility study & Report 0' },
    icon: 'check',
    color: '#16688c',
    desc: {
      he: 'כל עסקה נבחנת לפני שמוציאים שקל. נלמד לבנות דוח 0 מלא: הכנסות צפויות, עלויות בנייה, עלויות מימון, ומרווח רווח ריאלי, כולל ניתוח רגישות לשינויי שוק.',
      en: 'Every deal examined before spending a shekel. We learn to build a complete Report 0: projected revenues, construction costs, financing costs, and realistic profit margin — including sensitivity analysis for market changes.',
    },
    tools: [
      { he: 'תבנית דוח 0 מלאה עם נוסחאות', en: 'Full Report 0 template with formulas' },
      { he: 'מחשבון עלויות בנייה ועסקה', en: 'Construction & transaction cost calculator' },
      { he: 'ניתוח רגישות, מה קורה כאשר X משתנה', en: 'Sensitivity analysis — what happens when X changes' },
      { he: 'כיצד לקרוא חוות דעת שמאי', en: 'How to read an appraiser\'s valuation' },
    ],
  },
  {
    num: '03',
    id: 'negotiation',
    title: { he: 'משא ומתן וסגירת עסקה', en: 'Negotiation & closing the deal' },
    icon: 'handshake',
    color: '#8c6d1f',
    desc: {
      he: 'המשא ומתן הוא המקום שבו עושים (או מפסידים) את הכסף. נלמד טכניקות מוכחות: מתי להוריד מחיר, מתי ללכת, איך לבנות term sheet שמגן על כולם, ואיך לקרוא את המוכר.',
      en: 'Negotiation is where money is made (or lost). We learn proven techniques: when to lower the price, when to walk, how to structure a term-sheet that protects everyone, and how to read the seller.',
    },
    tools: [
      { he: 'מסגרת מו"מ, 7 שלבים', en: 'Negotiation framework — 7 steps' },
      { he: 'תבנית Letter of Intent (LOI)', en: 'Letter of Intent (LOI) template' },
      { he: 'רשימת סעיפי הגנה בזיכרון דברים', en: 'MOU protective-clause checklist' },
      { he: 'ניתוח BATNA: כוח המשא ומתן האמיתי', en: 'BATNA analysis — your real negotiation power' },
    ],
  },
  {
    num: '04',
    id: 'legal',
    title: { he: 'ליווי משפטי ועורכי דין', en: 'Legal support & lawyers' },
    icon: 'shield',
    color: '#105572',
    desc: {
      he: 'עורך הדין הנכון הוא נכס, לא הוצאה. נלמד לבחור עורך דין נדל"ן, מה הוא צריך לבדוק (נסח טאבו, חריגות בנייה, שעבודים), ואיך לנהל את הממשק כדי שלא תהיו עיוורים.',
      en: 'The right lawyer is an asset, not an expense. We learn to choose a real estate lawyer, what they need to check (land registry, building violations, liens), and how to manage the interface so you\'re never blind.',
    },
    tools: [
      { he: 'שאלות חובה לראיון עורך דין', en: 'Must-ask questions when interviewing a lawyer' },
      { he: 'רשימת בדיקות Due Diligence משפטי', en: 'Legal due diligence checklist' },
      { he: 'הסבר: נסח טאבו, אישורי זכויות ורישום', en: 'Explained: land registry extract, rights & registration' },
      { he: 'מה לכלול בהסכם הרכישה', en: 'What to include in the purchase agreement' },
    ],
  },
  {
    num: '05',
    id: 'financing',
    title: { he: 'אסטרטגיית מימון בנקאי', en: 'Bank financing strategy' },
    icon: 'building',
    color: '#2e9e6b',
    desc: {
      he: 'מימון הוא הדלק של כל פרויקט. נלמד לבנות תיק בנקאי מנצח, להבין מה הבנק מחפש, לנהל משא ומתן על תנאי האשראי, ואיך לבנות מבנה מימון שמגן על ההון העצמי שלכם.',
      en: 'Financing is every project\'s fuel. We learn to build a winning bank dossier, understand what the bank is looking for, negotiate credit terms, and structure financing that protects your equity.',
    },
    tools: [
      { he: 'מבנה תיק בנקאי: מה הבנק רוצה לראות', en: 'Bank dossier structure — what the bank wants to see' },
      { he: 'טבלת השוואת מסלולי מימון', en: 'Financing-track comparison table' },
      { he: 'חישוב LTV, DSCR ויחסי כיסוי', en: 'LTV, DSCR and coverage-ratio calculator' },
      { he: 'מו"מ מול בנקים: הטריקים שעובדים', en: 'Bank negotiation — the tricks that work' },
    ],
  },
  {
    num: '06',
    id: 'licensing',
    title: { he: 'היתרים, רישוי ובירוקרטיה', en: 'Permits, licensing & bureaucracy' },
    icon: 'check',
    color: '#e0a106',
    desc: {
      he: 'הבירוקרטיה היא מכשול שיזמים מתחילים מזלזלים בו, ומשלמים ביוקר. נלמד את תהליך ההיתר מהתחלה ועד הסוף: תב"ע, ועדות, תנאים מוקדמים, ואיך לנהל ציר זמן שלא ישתגע.',
      en: 'Bureaucracy is the obstacle rookie developers underestimate — and pay for. We learn the permit process end-to-end: zoning plans, committees, preconditions, and how to manage a timeline that doesn\'t spiral.',
    },
    tools: [
      { he: 'תרשים זרימה: מהיתר עד טופס 4', en: 'Flow chart: from permit to Form 4' },
      { he: 'רשימת גורמים ורשויות לתיאום', en: 'Stakeholder & authority coordination list' },
      { he: 'תבנית ניהול סיכוני רישוי', en: 'Licensing risk-management template' },
      { he: 'שאלות לאדריכל/יועץ תכנון לפני החתימה', en: 'Questions for architect/planning consultant before signing' },
    ],
  },
  {
    num: '07',
    id: 'cashflow',
    title: { he: 'ניהול תזרים ותקציב פרויקט', en: 'Project cashflow & budget management' },
    icon: 'crane',
    color: '#d64545',
    desc: {
      he: 'פרויקטים לא נכשלים מחוסר כסף. הם נכשלים מחוסר נזילות. נלמד לבנות תזרים מזומנים לפרויקט, לנהל חריגות, לדעת מתי לגייס ומתי לבלום, ולשמור שהפרויקט נושם.',
      en: 'Projects don\'t fail from lack of money — they fail from lack of liquidity. We learn to build a project cashflow, manage overruns, know when to raise and when to hold, and keep the project breathing.',
    },
    tools: [
      { he: 'גיליון תזרים פרויקט, 18 חודשים', en: 'Project cashflow sheet — 18 months' },
      { he: 'מדד חריגה תקציבית: Early Warning', en: 'Budget-overrun index — Early Warning' },
      { he: 'ניהול חשבונות קבלן ואישורים', en: 'Contractor invoicing & approval management' },
      { he: 'תבנית דו"ח חודשי ליזם', en: 'Monthly developer report template' },
    ],
  },
  {
    num: '08',
    id: 'supervision',
    title: { he: 'פיקוח ובנייה', en: 'Supervision & construction' },
    icon: 'shield',
    color: '#16688c',
    desc: {
      he: 'הפיקוח הוא עיניים בשטח כשהכסף שלכם עובד. נלמד לבחור מפקח, מה לדרוש ממנו, כיצד לקרוא דו"חות פיקוח, ואיך להיות המנכ"ל ולא הצלחפת של הפרויקט שלכם.',
      en: 'Supervision is eyes on the ground when your money is working. We learn to choose a supervisor, what to demand from them, how to read supervision reports, and how to be the CEO — not the firefighter — of your project.',
    },
    tools: [
      { he: 'שאלות לבחירת מפקח בנייה', en: 'Questions for choosing a construction supervisor' },
      { he: 'לוח ביקורות שטח חודשי', en: 'Monthly site-inspection schedule' },
      { he: 'רשימת סעיפי איכות לבדיקה בכל שלב', en: 'Quality-item checklist per construction stage' },
      { he: 'ניהול קבלנים: חוזים, עיכובים ובונוסים', en: 'Contractor management — contracts, delays & bonuses' },
    ],
  },
  {
    num: '09',
    id: 'marketing',
    title: { he: 'שיווק, מכירות ומימוש', en: 'Marketing, sales & realisation' },
    icon: 'pin',
    color: '#8c6d1f',
    desc: {
      he: 'שיווק טוב מתחיל עוד לפני שיש פיתרון. נלמד לתזמן שיווק לשוק, לבחור ערוצים, לעבוד עם מתווכים, לתמחר נכון, ולסגור עסקאות שמעשירות ולא רק "מוכרות".',
      en: 'Good marketing starts before there is a product. We learn to time the market, choose channels, work with brokers, price correctly, and close deals that enrich — not just "sell".',
    },
    tools: [
      { he: 'תוכנית שיווק לפרויקט, תבנית', en: 'Project marketing plan — template' },
      { he: 'מדריך תמחור: ניתוח עסקאות שוק ומדדי מכירה', en: 'Pricing guide: market transactions & sales benchmarks' },
      { he: 'ניהול סוכני מכירות ועמלות', en: 'Managing sales agents & commissions' },
      { he: 'לוח זמנים שיווקי: מתי לפרסם ומתי לא', en: 'Marketing timeline — when to advertise and when not to' },
    ],
  },
  {
    num: '10',
    id: 'delivery',
    title: { he: 'מסירה ובניית מוניטין', en: 'Delivery & reputation building' },
    icon: 'check',
    color: '#2e9e6b',
    desc: {
      he: 'המסירה היא הגדרת המוניטין שלכם. עסקה גרועה שנסגרת יפה יכולה להיות עסקה טובה. נלמד תהליך מסירה שמפחית ליקויים, מנהל ציפיות, ומוביל להמלצות, המנוע הטוב ביותר לעסקה הבאה.',
      en: 'Delivery defines your reputation — a poor deal that closes beautifully can become a good deal. We learn a delivery process that reduces defects, manages expectations, and leads to referrals — the best engine for the next deal.',
    },
    tools: [
      { he: 'פרוטוקול מסירת דירה, רשימת 100 סעיפים', en: 'Apartment handover protocol — 100+ item checklist' },
      { he: 'ניהול ליקויים ובדק: מה החוק מחייב', en: 'Defect & warranty management — what the law requires' },
      { he: 'בניית מותג אישי כיזם נדל"ן', en: 'Building a personal brand as a real estate developer' },
      { he: 'תבנית להפקת לקחים בסיום פרויקט', en: 'Project post-mortem template' },
    ],
  },
]

export const faqs = [
  {
    q: { he: 'מה ההבדל בין ליווי זה לבין קורס נדל"ן רגיל?', en: 'What is the difference between this mentorship and a regular real estate course?' },
    a: { he: 'קורס מלמד תיאוריה. הליווי שלנו מלמד מציאות. כל כלי, תבנית ושיטת עבודה שתקבלו נבנו מתוך עסקאות אמיתיות שביצענו בעצמנו בשטח. אתם לא מקבלים ייעוץ מהצד. אתם נכנסים לתוך ה DNA של פרויקטים אמיתיים ולומדים מבפנים איך עסקת נדל"ן באמת נסגרת. פרקטי לחלוטין, תואם לתעשייה, וההיפך הגמור מאקדמיה.', en: 'Courses teach theory. Our mentorship is based on real deals, tools we use ourselves, and a network that actually opens. We are not consultants — we are partners in the project\'s DNA.' },
  },
  {
    q: { he: 'האם צריך הון עצמי כדי להתחיל?', en: 'Do I need equity to start?' },
    a: { he: 'לא בהכרח כהון לפרויקט הראשון. חלק ניכר מהתוכנית מוקדש בדיוק לשאלה הזו: איך לבנות הון ראשוני, שותפויות אסטרטגיות ומבני מימון יצירתיים שמאפשרים להתחיל עם מינימום הון עצמי.', en: 'Not necessarily as equity for the first project. A significant part of the programme is dedicated precisely to this question — how to build initial capital, strategic partnerships and creative financing structures that allow starting with minimal equity.' },
  },
  {
    q: { he: 'כמה זמן לוקחת התוכנית?', en: 'How long does the programme take?' },
    a: { he: 'תלוי בקצב שלכם ובמחויבות. יזמים שעובדים בעצימות גבוהה מוצאים את עצמם מוכנים לעסקה עצמאית תוך 12 עד 18 חודשים. אנחנו מתאימים את הקצב לחיים האמיתיים שלכם.', en: 'Depends on your pace and commitment. Entrepreneurs who work with high intensity find themselves ready for an independent deal within 12–18 months. We adapt the pace to your real life.' },
  },
  {
    q: { he: 'מה קורה אם אני טועה בעסקה?', en: 'What happens if I make a mistake in a deal?' },
    a: { he: 'קורים טעויות, זה חלק מהתהליך. המטרה שלנו היא להקטין אותן, לא למנוע אותן לחלוטין. ולכן יש צוות שיוצר רשת ביטחון. לפני שחותמים, תמיד עוצרים לבדיקה משותפת.', en: 'Mistakes happen — that is part of the process. Our goal is to minimise them, not prevent them entirely. That is why there is a team creating a "safety net" — before signing, we always stop for a joint review.' },
  },
]
