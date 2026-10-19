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

/* ============================================================
   כל העמודים שנבנים בעורך. עמוד חדש באתר חייב להופיע כאן (הגדרה
   ב-defs/<page>.js עם route זהה ל-App.jsx), או ב-EXCLUDED עם סיבה.
   scripts/check-pages.mjs מכשיל את ה-build אם עמוד לא נוסף.
   ============================================================ */
export const DEFS = [home, about, contact, team, careers, projects, sharon, division, villas, house, hodAnswer].filter(Boolean)

/* עמודים שלא נבנים בעורך, ולמה. מנוהלים במקום אחר */
export const EXCLUDED = {
  '/projects/:slug': 'עמודי פרויקט, מנוהלים בלשונית "פרויקטים ונכסים"',
  '/blog': 'רשימת כתבות, נבנית אוטומטית מהכתבות',
  '/yazamut-nadlan': 'אינדקס מדריך, נבנה אוטומטית מהכתבות',
  '/yazamut-nadlan/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/constructions': 'אינדקס מדריך, נבנה אוטומטית מהכתבות',
  '/constructions/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/construction-supervision': 'אינדקס מדריך, נבנה אוטומטית מהכתבות',
  '/construction-supervision/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/real-estate-guide': 'אינדקס מדריך, נבנה אוטומטית מהכתבות',
  '/real-estate-guide/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/madrich-yazamim': 'אינדקס מדריך, נבנה אוטומטית מהכתבות',
  '/madrich-yazamim/:slug': 'כתבה, מנוהלת בלשונית "מאמרים ומדריכים"',
  '/real-estate-glossary': 'מילון מונחים, נבנה מקובץ הנתונים',
  '/real-estate-calculators': 'מחשבונים, כלי אינטראקטיבי',
  '/shelot-ve-tshuvot': 'מרכז השאלות, נבנה מקובץ הנתונים ומייצר נתונים מובנים לגוגל',
  '/livy-yazamim': 'עמוד תוכנית הליווי, נבנה מקובץ הנתונים',
  '/accessibility': 'עמוד משפטי',
  '/privacy': 'עמוד משפטי',
  '/terms': 'עמוד משפטי',
  '/style-guide': 'עמוד פנימי למעצבים',
  '*': 'עמוד 404',
}

export const GROUP_LABELS = { main: 'עמודים מרכזיים', div: 'חטיבות', land: 'עמודי נחיתה', city: 'ערים', other: 'עמודים נוספים' }

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
