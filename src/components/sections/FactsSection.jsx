import { Link } from 'react-router-dom'
import Reveal from '../ui/Reveal.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { EDIT_MODE } from '../../lib/pageBuilder/layout.js'
import { factKey, statusOf } from '../../data/pageFacts.js'
import './FactsSection.css'

/* ============================================================
   סקשן עובדות: כותרת, פסקאות, כרטיסים ושורת קישורים. משמש את עמודי
   האודות, הצוות, הפרויקטים, נדל"ן בשרון והמחשבונים, כל אחד עם בלוקים
   משלו מ-data/pageFacts.js. אותה שפה חזותית כמו כרטיסי השאלות בעמוד
   השרון: רקע לבן, מסגרת דקה ופינות מעוגלות.

   כל טקסט נקרא דרך t() במפתח facts.<page>.<block>.<field>, כך שעריכה
   בעורך העמודים (כותרות האתר) גוברת על ברירת המחדל מ-pageFacts.js.
   data-kc-key מסמן לעורך איפה כל שדה מוצג. כתובות הקישורים לא נראות
   על המסך, ולכן בעורך בלבד הן מוצגות בתגית מוסתרת שהעורך מזהה.
   ============================================================ */
export default function FactsSection({ page, block, cmsStatus }) {
  const { t } = useI18n()
  if (!block) return null
  const { id, eyebrow, paras = [], items = [], links = [], soft } = block
  const key = (f) => factKey(page, id, f)
  const tx = (f, def) => {
    const v = t(key(f))
    return v == null || v === key(f) || v === '' ? def : String(v)
  }
  /* בעורך: תגית מוסתרת עם כתובת הקישור, כדי שהעורך ירשום את השדה */
  const target = (f, val) => (EDIT_MODE ? <span hidden data-kc-key={key(f)}>{val}</span> : null)
  const titleId = `facts-${id}-title`
  return (
    <section className={`section facts${soft ? ' section--soft' : ''}`} aria-labelledby={titleId}>
      <div className="container">
        <Reveal className="facts__head">
          {eyebrow && <span className="eyebrow" data-kc-key={key('eyebrow')}>{tx('eyebrow', eyebrow)}</span>}
          <h2 className="section-title" id={titleId} data-kc-key={key('title')}>{tx('title', block.title)}</h2>
        </Reveal>
        {paras.length > 0 && (
          <Reveal className="facts__text">
            {paras.map((p, i) => <p key={i} data-kc-key={key(`paras.${i}`)}>{tx(`paras.${i}`, p)}</p>)}
          </Reveal>
        )}
        {items.length > 0 && (
          <ul className="facts__grid">
            {items.map((it, i) => {
              const status = it.cms ? statusOf(it, cmsStatus) : ''
              const to = it.to ? tx(`items.${i}.to`, it.to) : ''
              return (
                <Reveal as="li" key={i} delay={i * 0.05} className="facts__card">
                  <h3><span data-kc-key={key(`items.${i}.t`)}>{tx(`items.${i}.t`, it.t)}</span>{status ? `. ${status}.` : ''}</h3>
                  <p data-kc-key={key(`items.${i}.d`)}>{tx(`items.${i}.d`, it.d)}</p>
                  {to && <Link to={to} className="facts__more" data-kc-key={key(`items.${i}.link`)}>{tx(`items.${i}.link`, it.link || it.t)}</Link>}
                  {it.to && target(`items.${i}.to`, to)}
                </Reveal>
              )
            })}
          </ul>
        )}
        {links.length > 0 && (
          <Reveal className="facts__links">
            <ul>
              {links.map((l, i) => {
                const to = tx(`links.${i}.to`, l.to)
                return (
                  <li key={i}>
                    <Link to={to} data-kc-key={key(`links.${i}.label`)}>{tx(`links.${i}.label`, l.label)}</Link>
                    {target(`links.${i}.to`, to)}
                  </li>
                )
              })}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  )
}
