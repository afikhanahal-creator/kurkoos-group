import home from './home.js'
import about from './about.js'
import contact from './contact.js'
import team from './team.js'
import careers from './careers.js'
import projects from './projects.js'
import sharon from './sharon.js'
import division from './division.js'
import villas from './villas.js'
import house from './house.js'
import hodAnswer from './hodAnswer.js'
import mentorship from './mentorship.js'
import faqHub from './faqHub.js'
import glossary from './glossary.js'
import calculators from './calculators.js'
import blog from './blog.js'
import guides from './guides.js'
import legal from './legal.js'

/* ============================================================
   כל העמודים שנבנים בעורך. עמוד חדש באתר חייב להופיע כאן (הגדרה
   ב-defs/<page>.js עם route זהה ל-App.jsx), או ב-EXCLUDED עם סיבה.
   scripts/check-pages.mjs מכשיל את ה-build אם עמוד לא נוסף.
   ============================================================ */
export const DEFS = [home, about, contact, team, careers, projects, sharon, division, villas, house, hodAnswer, mentorship, faqHub, glossary, calculators, blog, guides, legal].filter(Boolean)

/* עמודים שלא נבנים בעורך, ולמה. מנוהלים במקום אחר */
export const EXCLUDED = {
  '/projects/:slug': 'עמודי פרויקט, מנוהלים בלשונית "פרויקטים ונכסים"',
  '/yazamut-nadlan/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/constructions/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/construction-supervision/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/real-estate-guide/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/madrich-yazamim/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/style-guide': 'עמוד פנימי למעצבים',
  '*': 'עמוד 404',
}

export const GROUP_LABELS = { main: 'עמודים מרכזיים', div: 'חטיבות', land: 'עמודי נחיתה', city: 'ערים', guides: 'מדריכים, מידע וכלים', legal: 'עמודים משפטיים', other: 'עמודים נוספים' }

/* כל העמודים לעריכה: [{ path, label, group, def }] */
export function allPages() {
  const out = []
  for (const def of DEFS) {
    const pages = def.pages || [[def.route, def.label]]
    for (const [path, label, group] of pages) out.push({ path, label, group: group || def.group || 'other', def })
  }
  return out
}
export const defFor = (path) => allPages().find((p) => p.path === path)?.def || null
