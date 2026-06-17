import { fetchSettings, setSetting } from './cms.js'

/* ============================================================
   מרשם הכותרות (Headings Registry) — מקור אמת יחיד לכל הקופי
   הניתן לעריכה ב"טאב כותרות". כל field.key הוא מפתח i18n אמיתי
   (למשל 'hero.subtitle'); עריכה נשמרת כ-override ב-site_settings
   תחת 'heading.<key>', ושכבת ה-i18n מחילה אותו על t() — כך
   העריכה מתעדכנת באתר הציבורי בלי לגעת בכל רכיב בנפרד.
   ============================================================ */

// level: 'h1' | 'h2' | 'subtitle'  ·  maxLength אופציונלי (ל-SEO/עיצוב)
export const HEADINGS_REGISTRY = [
  {
    pageId: 'home-hero', pageLabel: 'דף הבית — אזור הפתיחה (Hero)', pagePath: '/',
    fields: [
      { key: 'hero.subtitle', label: 'תת־כותרת ראשית', level: 'subtitle', maxLength: 240 },
      { key: 'hero.ctaPrimary', label: 'כפתור ראשי', level: 'subtitle', maxLength: 30 },
      { key: 'hero.watchFilm', label: 'כפתור סרטון', level: 'subtitle', maxLength: 30 },
    ],
  },
  {
    pageId: 'home-activities', pageLabel: 'דף הבית — תחומי פעילות', pagePath: '/',
    fields: [
      { key: 'activities.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'activities.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'activities.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 260 },
    ],
  },
  {
    pageId: 'home-projects', pageLabel: 'דף הבית — פרויקטים נבחרים', pagePath: '/',
    fields: [
      { key: 'projects.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'projects.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'projects.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 200 },
    ],
  },
  {
    pageId: 'home-valuechain', pageLabel: 'דף הבית — התהליך שלנו', pagePath: '/',
    fields: [
      { key: 'valueChain.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'valueChain.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'valueChain.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 280 },
    ],
  },
  {
    pageId: 'home-story', pageLabel: 'דף הבית — הסיפור שלנו', pagePath: '/',
    fields: [
      { key: 'story.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'story.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'story.short', label: 'פסקה ראשונה', level: 'subtitle' },
    ],
  },
  {
    pageId: 'home-warranty', pageLabel: 'דף הבית — האחריות שלנו', pagePath: '/',
    fields: [
      { key: 'warranty.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'warranty.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'warranty.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 260 },
    ],
  },
  {
    pageId: 'home-team', pageLabel: 'דף הבית — הצוות', pagePath: '/',
    fields: [
      { key: 'team.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'team.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'team.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 200 },
    ],
  },
  {
    pageId: 'home-map', pageLabel: 'דף הבית — פריסה ארצית', pagePath: '/',
    fields: [
      { key: 'map.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'map.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'map.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 200 },
    ],
  },
  {
    pageId: 'home-stats', pageLabel: 'דף הבית — במספרים', pagePath: '/',
    fields: [
      { key: 'stats.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'stats.title', label: 'כותרת', level: 'h2', maxLength: 60 },
    ],
  },
  {
    pageId: 'home-testimonials', pageLabel: 'דף הבית — המלצות לקוחות', pagePath: '/',
    fields: [
      { key: 'testimonials.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'testimonials.title', label: 'כותרת', level: 'h2', maxLength: 60 },
      { key: 'testimonials.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 200 },
    ],
  },
  {
    pageId: 'home-partners', pageLabel: 'דף הבית — שותפים ולקוחות', pagePath: '/',
    fields: [
      { key: 'partners.title', label: 'כותרת', level: 'h2', maxLength: 60 },
    ],
  },
  {
    pageId: 'contact', pageLabel: 'צור קשר', pagePath: '/#contact',
    fields: [
      { key: 'contact.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'contact.title', label: 'כותרת', level: 'h2', maxLength: 70 },
      { key: 'contact.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 200 },
    ],
  },
  {
    pageId: 'newsletter', pageLabel: 'דף הבית — ניוזלטר', pagePath: '/',
    fields: [
      { key: 'newsletter.title', label: 'כותרת', level: 'h2', maxLength: 50 },
      { key: 'newsletter.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 160 },
    ],
  },

  /* ---- עמודים פנימיים (לא דף הבית) ---- */
  {
    pageId: 'page-about', pageLabel: 'עמוד אודות', pagePath: '/about',
    fields: [
      { key: 'pages.about.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'pages.about.title', label: 'כותרת ראשית', level: 'h1', maxLength: 60 },
      { key: 'pages.about.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 220 },
    ],
  },
  {
    pageId: 'page-projects', pageLabel: 'עמוד פרויקטים', pagePath: '/projects',
    fields: [
      { key: 'pages.projects.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'pages.projects.title', label: 'כותרת ראשית', level: 'h1', maxLength: 60 },
      { key: 'pages.projects.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 220 },
    ],
  },
  {
    pageId: 'page-team', pageLabel: 'עמוד הצוות', pagePath: '/team',
    fields: [
      { key: 'pages.team.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'pages.team.title', label: 'כותרת ראשית', level: 'h1', maxLength: 60 },
      { key: 'pages.team.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 220 },
    ],
  },
  {
    pageId: 'page-careers', pageLabel: 'עמוד דרושים', pagePath: '/careers',
    fields: [
      { key: 'pages.careers.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'pages.careers.title', label: 'כותרת ראשית', level: 'h1', maxLength: 60 },
      { key: 'pages.careers.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 220 },
      { key: 'pages.careers.openings', label: 'כותרת "משרות פתוחות"', level: 'h2', maxLength: 60 },
    ],
  },
  {
    pageId: 'page-blog', pageLabel: 'עמוד בלוג', pagePath: '/blog',
    fields: [
      { key: 'pages.blog.eyebrow', label: 'תווית עליונה', level: 'subtitle', maxLength: 40 },
      { key: 'pages.blog.title', label: 'כותרת ראשית', level: 'h1', maxLength: 60 },
      { key: 'pages.blog.lead', label: 'טקסט מוביל', level: 'subtitle', maxLength: 220 },
    ],
  },
  {
    pageId: 'page-legal', pageLabel: 'עמודים משפטיים', pagePath: '/accessibility · /privacy · /terms',
    fields: [
      { key: 'pages.legal.accessibility', label: 'כותרת — הצהרת נגישות', level: 'h1', maxLength: 60 },
      { key: 'pages.legal.privacy', label: 'כותרת — מדיניות פרטיות', level: 'h1', maxLength: 60 },
      { key: 'pages.legal.terms', label: 'כותרת — תקנון ותנאי שימוש', level: 'h1', maxLength: 60 },
    ],
  },
]

export const HEADING_PREFIX = 'heading.'

// טוען את כל ה-overrides שהוגדרו (map: i18nKey -> value)
export async function loadHeadingOverrides() {
  const all = await fetchSettings()
  const out = {}
  for (const [k, v] of Object.entries(all || {})) {
    if (k.startsWith(HEADING_PREFIX) && v != null && String(v) !== '') {
      out[k.slice(HEADING_PREFIX.length)] = v
    }
  }
  return out
}

// שומר/מנקה override לכותרת בודדת
export async function saveHeading(key, value) {
  await setSetting(HEADING_PREFIX + key, value ?? '')
}
