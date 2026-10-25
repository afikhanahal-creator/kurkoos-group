/* ברירת המחדל לסקשן "סרטונים מהשטח" בעמוד הביצוע (מתחת לגלריה).
   מה שנשמר בעורך העמודים (site_settings: execution_showcase) גובר על כל שדה כאן.
   הסרטונים: לולאות קצרות מהצילומים שלנו (אתר הכלונסאות וסאלד), בלי סאונד. */
const V = '/divisions/showcase'

export const EXECUTION_SHOWCASE_KEY = 'execution_showcase'

export const executionShowcaseDefault = {
  badge: 'מהשטח',
  badgeWord: 'KURKOOS',
  title: 'ככה זה נראה באתר שלנו',
  text: 'סרטונים אמיתיים מאתרי הבנייה של ראיתה, זרוע הביצוע של קבוצת קורקוס: חפירה, כלונסאות, ברזל ושלד.',
  bold: 'צילום מהשטח, בלי הדמיות.',
  note: 'צילומים מפרויקטים פעילים',
  ctaLabel: 'לשיחת ייעוץ עם מהנדס',
  intensity: 'balanced',
  /* 'bento': רשת MagicBento של ארבעת הסרטונים הראשונים, 'marquee': שתי שורות מסכים נעים */
  layout: 'bento',
  videos: [
    { src: `${V}/piles-a.mp4`, poster: `${V}/piles-a.webp`, label: 'קידוח כלונסאות' },
    { src: `${V}/szold-a.mp4`, poster: `${V}/szold-a.webp`, label: 'כלוב ברזל לכלונס' },
    { src: `${V}/frame-a.mp4`, poster: `${V}/frame-a.webp`, label: 'שלד ותקרות' },
    { src: `${V}/szold-b.mp4`, poster: `${V}/szold-b.webp`, label: 'עבודות עפר' },
    { src: `${V}/piles-b.mp4`, poster: `${V}/piles-b.webp`, label: 'כלונסאות' },
    { src: `${V}/szold-c.mp4`, poster: `${V}/szold-c.webp`, label: 'קשירת ברזל' },
    { src: `${V}/frame-b.mp4`, poster: `${V}/frame-b.webp`, label: 'בלוקים וקירות' },
  ],
}

/* ממזג את מה שנשמר עם ברירת המחדל. רשימת סרטונים ריקה שנשמרה = חוזרים לברירת המחדל */
export function readExecutionShowcase(raw) {
  let v = raw
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { v = null } }
  const saved = v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  const out = { ...executionShowcaseDefault }
  for (const [k, val] of Object.entries(saved)) {
    if (k === 'videos') continue
    if (typeof val === 'string') out[k] = val
  }
  const vids = Array.isArray(saved.videos) ? saved.videos.filter((x) => x && x.src) : []
  out.videos = vids.length ? vids : executionShowcaseDefault.videos
  return out
}
