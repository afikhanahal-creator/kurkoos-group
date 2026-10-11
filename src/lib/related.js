/* ============================================================
   בחירת הכתבות לבלוק "עוד מהמדריך" בתחתית כתבה.

   קודם הבלוק הציג את שלוש הכתבות האחרונות בטור, בלי קשר לנושא. כתבה על
   בדיקת בטון קיבלה מתחתיה כתבות על חוזה שכירות או על טופס 4, פשוט כי
   הן פורסמו אחרונות. זה לא עוזר לקורא, וגם לא מעביר לגוגל אות על
   הקשר בין הכתבות באותו נושא.

   עכשיו: הרשימה שמגיעה לכאן היא כבר כתבות אותו טור, ממוינות מהחדשה
   לישנה. כל כתבה מקבלת ניקוד לפי הקרבה לכתבה הנוכחית (תגיות משותפות,
   אותה קטגוריה, מילים משותפות במילת המפתח ובכותרת). הגבוהות ביותר
   נבחרות, ובשוויון, או כשאין קשר בכלל, נשאר הסדר המקורי מהחדשה לישנה.
   אותו מספר כתבות ואותו עיצוב, רק בחירה אחרת.
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

/* current: הכתבה הנוכחית. list: כתבות הטור, מהחדשה לישנה. */
export function relatedArticles(current, list, count = 3) {
  const others = (list || []).filter((a) => a && a.slug !== current?.slug)
  if (!current) return others.slice(0, count)
  const cur = profile(current)
  return others
    .map((a, i) => ({ a, i, s: score(cur, profile(a)) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .slice(0, count)
    .map((x) => x.a)
}
