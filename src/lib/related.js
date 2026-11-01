/* ============================================================
   בחירת הכתבות לבלוק "עוד מהמדריך" בתחתית כתבה.

   קודם הבלוק הציג את שלוש הכתבות האחרונות בטור, בלי קשר לנושא. כתבה על
   בדיקת בטון קיבלה מתחתיה כתבות על חוזה שכירות או על טופס 4, פשוט כי
   הן פורסמו אחרונות. זה לא עוזר לקורא, וגם לא מעביר לגוגל אות על
   הקשר בין הכתבות באותו נושא.

   עכשיו: הרשימה שמגיעה לכאן היא כבר כתבות אותו טור, ממוינות מהחדשה
   לישנה. קודם נבחרות כתבות מאותו אשכול (clusterOf למטה), ובתוכו לפי
   ניקוד הקרבה (תגיות משותפות, אותה קטגוריה, מילים משותפות במילת המפתח
   ובכותרת). כשבאשכול אין מספיק כתבות, משלימים מהאחרונות בטור.
   אותו מספר כתבות ואותו עיצוב, רק בחירה אחרת. ה-prerender משתמש באותה
   פונקציה, כך שהסורק רואה את אותן שלוש כתבות.
   ============================================================ */

const STOP = new Set([
  'של', 'על', 'את', 'עם', 'מה', 'מי', 'איך', 'למה', 'כמה', 'לא', 'גם', 'או', 'אם', 'כל', 'זה', 'זו',
  'הוא', 'היא', 'אחרי', 'לפני', 'בלי', 'יותר', 'באמת', 'שלא', 'כדי', 'בין', 'מול', 'אחד', 'אחת',
])
const PREFIX = /^[והבלמשכ]{1,2}(?=[א-ת]{3,})/

/* מילים משמעותיות במחרוזת, בלי אות שימוש בתחילתן (ה, ב, ל, ו...) */
function words(text) {
  return String(text || '')
    .replace(/["״׳']/g, '')
    .split(/[^א-תa-zA-Z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => w.replace(PREFIX, ''))
}

function profile(a) {
  return {
    tags: new Set((Array.isArray(a.tags) ? a.tags : []).map((t) => String(t).trim()).filter(Boolean)),
    cat: String(a.category || '').trim(),
    words: new Set([...words(a.focusKeyword), ...words(a.title), ...(a.tags || []).flatMap(words)]),
  }
}

function score(cur, other) {
  let s = 0
  for (const t of other.tags) if (cur.tags.has(t)) s += 3
  /* קטגוריה רחבה ("חומרים ושיטות") היא אות חלש יותר ממילה משותפת בנושא */
  if (cur.cat && cur.cat === other.cat) s += 1
  let shared = 0
  for (const w of other.words) if (cur.words.has(w)) shared++
  return s + 2 * Math.min(shared, 3)
}

/* ---------- אשכולות ----------
   אשכול הוא הנושא הרחב של הכתבה, לפי מפת הקישורים (docs/seo/internal-linking.md):
   בטון ושלד, ליקויים ומסירה, בית פרטי, מגרשים וקרקע, מכירה, רכישה וכו'.
   הכלל הראשון שמתאים למילת המפתח, לכותרת או לתגיות קובע את האשכול, ולכן
   הסדר כאן הוא מהספציפי לכללי. כתבה שאף כלל לא מתאים לה נשארת באשכול
   של הקטגוריה שלה. */
const CLUSTERS = [
  ['hithadshut', /תמ["״]?א|פינוי בינוי|התחדשות עירונית|דייר סרבן/],
  ['mamad', /ממ["״]?ד/],
  ['beton', /בטון|יציק|שלד|זיון|גלעין|קוביי/],
  ['mesira', /ליקוי|בדק|איטום|רטיבות|מסירה|פרוטוקול/],
  ['betihut', /בטיחות|פיגום|מנהל עבודה|מנהל העבודה|יומן עבודה/],
  ['rishui', /טופס 4|אכלוס|חיבור חשמל|היתר בנייה|רישוי/],
  ['taktziv', /תקציב|חשבונות קבלן|כמה עולה|מחיר פיקוח/],
  ['karka', /מגרש|קרקע|נסח טאבו|זכויות בנייה|היתכנות|מכרז/],
  ['bayit', /בית פרטי|וילה|דו משפחתי|קבלן מפתח|מרתף/],
  ['mechira', /מכירה|למכירה|מוכר|תמחור|בלעדיות|דמי תיווך|מס שבח/],
  ['rechisha', /רכישה|קניית דירה|הון עצמי|משכנתא|יד שנייה|מקבלן/],
  ['haskara', /שכירות|שוכר|השכרה|תשואה/],
  ['mimun', /מימון|בנק|ריבית|תזרים/],
]

export function clusterOf(a) {
  if (!a) return ''
  if (a.cluster) return String(a.cluster)
  const text = [a.focusKeyword, a.title, ...(Array.isArray(a.tags) ? a.tags : [])].filter(Boolean).join(' ')
  const hit = CLUSTERS.find(([, re]) => re.test(text))
  return hit ? hit[0] : `cat:${String(a.category || '').trim()}`
}

/* current: הכתבה הנוכחית. list: כתבות הטור, מהחדשה לישנה.
   קודם כתבות מאותו אשכול, לפי הניקוד ואז מהחדשה לישנה. כשבאשכול יש
   פחות מ-count כתבות, משלימים מהכתבות האחרונות בטור. */
export function relatedArticles(current, list, count = 3) {
  const others = (list || []).filter((a) => a && a.slug !== current?.slug)
  if (!current) return others.slice(0, count)
  const cur = profile(current)
  const cl = clusterOf(current)
  const picks = others
    .map((a, i) => ({ a, i, s: score(cur, profile(a)) }))
    .filter((x) => clusterOf(x.a) === cl)
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, count)
    .map((x) => x.a)
  for (const a of others) {
    if (picks.length >= count) break
    if (!picks.includes(a)) picks.push(a)
  }
  return picks
}
