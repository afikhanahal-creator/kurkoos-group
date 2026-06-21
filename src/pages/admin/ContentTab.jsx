import { useState } from 'react'
import ArticlesManager from './ArticlesManager.jsx'
import { mergeArticles } from '../../lib/yazamut.js'
import { mergeConstructions } from '../../lib/constructions.js'
import { mergeSupervision } from '../../lib/supervision.js'
import { mergeBrokerage } from '../../lib/brokerage.js'
import './ContentTab.css'

/* ============================================================
   ContentTab — טאב אחד לכל ארבעת טורי הכתבות.
   בורר עליון (כפתורים מקטעיים) מחליף בין הטורים, וכל טור מנוהל ע"י
   ArticlesManager. כך התפריט הימני נשאר נקי עם פריט אחד בלבד.
   ============================================================ */
const COLUMNS = [
  {
    id: 'yazamut', label: 'יזמות נדל״ן',
    key: 'yazamut_articles', merge: mergeArticles, route: '/yazamut-nadlan', folder: 'yazamut',
    cats: ['התחדשות עירונית', 'מימון ויזמות', 'רגולציה ותכנון', 'קרקע ומכרזים', 'מגמות שוק'],
    author: 'המערכת · טור יזמות נדל"ן', authorTitle: 'פרשנות נדל"ן · קבוצת קורקוס',
    aiStyle: 'Israeli real estate, editorial magazine cover photography, high end architecture, modern, clean composition, natural light, premium, photorealistic, ultra detailed, no text, no logos, no watermark',
  },
  {
    id: 'constructions', label: 'ביצוע ובנייה',
    key: 'constructions_articles', merge: mergeConstructions, route: '/constructions', folder: 'constructions',
    cats: ['שלבי ביצוע', 'בטיחות באתר', 'איכות וליקויים', 'בירוקרטיה ורישוי', 'ניהול אתר', 'חומרים ושיטות'],
    author: 'המערכת, טור ביצוע ובנייה', authorTitle: 'ביצוע ובנייה · קבוצת קורקוס',
    aiStyle: 'Israeli construction site, editorial magazine photography, building process, professional, clean composition, natural light, premium, photorealistic, ultra detailed, no text, no logos, no watermark',
  },
  {
    id: 'supervision', label: 'פיקוח פרויקטים',
    key: 'supervision_articles', merge: mergeSupervision, route: '/construction-supervision', folder: 'supervision',
    cats: ['פיקוח ביצוע', 'בקרת איכות', 'ליקויים ובדק', 'ניהול תקציב וסיכונים', 'לוחות זמנים', 'מסירה וטופס 4'],
    author: 'המערכת, שכינתא', authorTitle: 'שכינתא · ניהול ויזום פרויקטים בקבוצת קורקוס',
    aiStyle: 'Israeli construction site supervision, editorial magazine photography, building inspection and quality control detail, professional, clean composition, natural light, premium, photorealistic, ultra detailed, no text, no logos, no watermark',
  },
  {
    id: 'brokerage', label: 'תיווך ועסקאות',
    key: 'brokerage_articles', merge: mergeBrokerage, route: '/real-estate-guide', folder: 'brokerage',
    cats: ['מכירה', 'רכישה', 'השכרה', 'השקעות', 'משא ומתן', 'רגולציה ומיסוי'],
    author: 'המערכת, המדריך לרוכש ולמוכר', authorTitle: 'תיווך ועסקאות · קבוצת קורקוס',
    aiStyle: 'luxury real estate, Mansion Global and Sotheby\'s magazine editorial photography, elegant property interior, natural daylight, clean composition, photorealistic, ultra detailed, no people, no text, no logos, no watermark',
  },
]

export default function ContentTab() {
  const [colId, setColId] = useState(COLUMNS[0].id)
  const col = COLUMNS.find((c) => c.id === colId) || COLUMNS[0]

  return (
    <div className="ctab">
      <div className="ctab__switch" role="tablist" aria-label="בחירת טור">
        {COLUMNS.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === colId}
            className={`ctab__seg ${c.id === colId ? 'is-on' : ''}`}
            onClick={() => setColId(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ArticlesManager key={col.id} config={col} />
    </div>
  )
}
