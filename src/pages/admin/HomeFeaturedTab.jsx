import { useState, useEffect, useRef } from 'react'
import { fetchSettings, setSetting, listProjectCards, cmsRowToCard } from '../../lib/cms.js'
import { optimizeSrc } from '../../lib/responsiveImage.js'
import { toast } from '../../lib/toast.js'
import './HomeFeaturedTab.css'

/* ============================================================
   HomeFeaturedTab — בחירת הפרויקטים שיופיעו ב"פרויקטים נבחרים" בדף הבית.
   בוחרים עד 4 פרויקטים מתוך רשימה עם תמונות. כשמגיעים ל-4 — חסום, ויש
   להסיר אחד כדי להחליף. הסדר נשמר (נקבע סדר התצוגה בדף הבית).
   נשמר כהגדרה אחת (home_featured) = מערך slugs מסודר.
   ============================================================ */

const MAX = 4
const nameOf = (p) => (typeof p?.name === 'string' ? p.name : (p?.name?.he || p?.name?.en || p?.slug || ''))
const cityOf = (p) => (typeof p?.city === 'string' ? p.city : (p?.city?.he || p?.city?.en || ''))

export default function HomeFeaturedTab() {
  const [projects, setProjects] = useState(null) // null = טוען
  const [selected, setSelected] = useState([])    // מערך slugs מסודר
  const [showAll, setShowAll] = useState(false)    // מצב "כל הפרויקטים בדף הבית"
  const [saving, setSaving] = useState(false)
  const selRef = useRef([])

  useEffect(() => {
    Promise.all([listProjectCards(), fetchSettings()])
      .then(([rows, s]) => {
        const cards = (rows || []).map(cmsRowToCard)
        setProjects(cards)
        let sel = s.home_featured
        if (typeof sel === 'string') { try { sel = JSON.parse(sel) } catch { sel = [] } }
        sel = Array.isArray(sel) ? sel.filter(Boolean) : []
        const exist = new Set(cards.map((c) => c.slug))
        sel = sel.filter((x) => exist.has(x)).slice(0, MAX)   // משאירים רק slugs קיימים
        selRef.current = sel
        setSelected(sel)
        setShowAll(s.home_featured_all === true || s.home_featured_all === 'true')
      })
      .catch(() => setProjects([]))
  }, [])

  const toggleAll = async () => {
    const next = !showAll
    setShowAll(next)
    setSaving(true)
    try {
      await setSetting('home_featured_all', next)
      toast.success(next ? 'כל הפרויקטים יוצגו בדף הבית' : 'חזרה לבחירה ידנית של עד 4')
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  const persist = async (next) => {
    selRef.current = next
    setSelected(next)
    setSaving(true)
    try {
      await setSetting('home_featured', JSON.stringify(next))
      toast.success('נשמר — דף הבית יתעדכן')
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  const toggle = (slug) => {
    const cur = selRef.current
    if (cur.includes(slug)) { persist(cur.filter((s) => s !== slug)); return }
    if (cur.length >= MAX) { toast.error(`אפשר לבחור עד ${MAX} פרויקטים. הסירו אחד כדי להחליף.`); return }
    persist([...cur, slug])
  }

  const move = (slug, dir) => {
    const arr = [...selRef.current]
    const i = arr.indexOf(slug)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    persist(arr)
  }

  if (!projects) {
    return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען…</div>
  }

  const bySlug = new Map(projects.map((p) => [p.slug, p]))
  const chosen = selected.map((s) => bySlug.get(s)).filter(Boolean)
  const full = selected.length >= MAX

  return (
    <div className="hf-tab">
      <div className="hf-tab__bar">
        <p className="hf-tab__intro">
          בחרו עד <strong>{MAX}</strong> פרויקטים שיופיעו ב"פרויקטים נבחרים" בדף הבית (בדסקטופ).
          לחיצה על פרויקט מוסיפה/מסירה אותו. כשנבחרו {MAX} — יש להסיר אחד כדי להחליף.
          גררו בעזרת החצים כדי לקבוע את סדר ההצגה.
        </p>
        <span className={`hf-tab__count ${full ? 'is-full' : ''}`}>{selected.length}/{MAX}</span>
      </div>

      {/* מצב "כל הפרויקטים" — דריסת ההגבלה ל-4 והצגת כולם בדף הבית */}
      <button
        type="button"
        className={`hf-allbtn ${showAll ? 'is-on' : ''}`}
        onClick={toggleAll}
        disabled={saving}
        aria-pressed={showAll}
      >
        <span className="hf-allbtn__check">{showAll ? '✓' : ''}</span>
        <span className="hf-allbtn__txt">
          <strong>הצגת כל הפרויקטים בדף הבית</strong>
          <small>{showAll ? 'פעיל — כל הפרויקטים מוצגים. כבו כדי לבחור ידנית עד 4.' : 'הפעלה תציג את כל הפרויקטים (מתעלם מהבחירה הידנית).'}</small>
        </span>
      </button>

      {showAll && (
        <p className="hf-allnote">מצב "כל הפרויקטים" פעיל — הבחירה הידנית למטה שמורה אך אינה בתוקף כרגע.</p>
      )}

      <div className={showAll ? 'hf-dim' : ''}>

      {/* הנבחרים — בסדר התצוגה */}
      <div className="hf-chosen">
        <h3 className="hf-chosen__title">הפרויקטים שיוצגו בדף הבית</h3>
        {chosen.length === 0 ? (
          <p className="hf-chosen__empty">עדיין לא נבחרו פרויקטים. בחרו מהרשימה למטה.</p>
        ) : (
          <ol className="hf-chosen__list">
            {chosen.map((p, i) => (
              <li className="hf-chosen__item" key={p.slug}>
                <span className="hf-chosen__num">{i + 1}</span>
                <span className="hf-chosen__thumb">
                  {p.cover ? <img src={optimizeSrc(p.cover, 160)} alt="" loading="lazy" /> : <span className="hf-ph" />}
                </span>
                <span className="hf-chosen__name">{nameOf(p)}</span>
                <span className="hf-chosen__ord">
                  <button type="button" onClick={() => move(p.slug, -1)} disabled={i === 0 || saving} aria-label="הקדמה" title="הקדמה">↑</button>
                  <button type="button" onClick={() => move(p.slug, 1)} disabled={i === chosen.length - 1 || saving} aria-label="אחור" title="אחור">↓</button>
                </span>
                <button type="button" className="hf-chosen__rm" onClick={() => toggle(p.slug)} disabled={saving} aria-label="הסרה" title="הסרה">✕</button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ספריית כל הפרויקטים — בחירה ויזואלית */}
      <h3 className="hf-lib__title">כל הפרויקטים</h3>
      {projects.length === 0 ? (
        <p className="hf-chosen__empty">אין פרויקטים. צרו פרויקטים בלשונית "פרויקטים ונכסים".</p>
      ) : (
        <div className="hf-grid">
          {projects.map((p) => {
            const idx = selected.indexOf(p.slug)
            const isSel = idx >= 0
            const disabled = !isSel && full
            return (
              <button
                type="button"
                key={p.slug}
                className={`hf-card ${isSel ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                onClick={() => toggle(p.slug)}
                disabled={saving}
                title={disabled ? `נבחרו כבר ${MAX} — הסירו אחד כדי להחליף` : nameOf(p)}
              >
                <span className="hf-card__media">
                  {p.cover ? <img src={optimizeSrc(p.cover, 300)} alt="" loading="lazy" decoding="async" /> : <span className="hf-ph" />}
                  {isSel && <span className="hf-card__check">{idx + 1}</span>}
                </span>
                <span className="hf-card__name">{nameOf(p)}</span>
                {cityOf(p) && <span className="hf-card__city">{cityOf(p)}</span>}
              </button>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
