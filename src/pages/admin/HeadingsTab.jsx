import { useEffect, useMemo, useState, useCallback } from 'react'
import he from '../../i18n/he.js'
import { HEADINGS_REGISTRY, loadHeadingOverrides, saveHeading } from '../../lib/headings.js'
import useAutosave from '../../hooks/useAutosave.js'
import SaveIndicator from '../../components/admin/SaveIndicator.jsx'
import { toast } from '../../lib/toast.js'

const LEVEL_LABEL = { h1: 'H1', h2: 'H2', subtitle: 'תת־כותרת' }

// ערך ברירת מחדל מהמילון העברי לפי נתיב i18n (למשל 'hero.subtitle')
function dictDefault(key) {
  return key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), he) ?? ''
}

function HeadingRow({ field, override, onSaved }) {
  const def = dictDefault(field.key)
  const [value, setValue] = useState(override != null ? override : def)

  const save = useCallback(async (v) => {
    try {
      // ערך זהה לברירת המחדל → מנקים את ה-override (חוזרים לטקסט המקורי)
      await saveHeading(field.key, v === def ? '' : v)
      onSaved?.(field.key, v === def ? '' : v)
    } catch (e) { toast.error('שמירת הכותרת נכשלה — נסו שוב'); throw e }
  }, [field.key, def, onSaved])

  const { status } = useAutosave(value, save)
  const len = (value || '').length
  const tooLong = field.maxLength ? len > field.maxLength : false
  const changed = value !== def
  const multiline = !field.maxLength || field.maxLength > 70

  return (
    <div className="hdg__row">
      <div className="hdg__row-head">
        <div className="hdg__row-meta">
          <span className="hdg__row-label">{field.label}</span>
          <span className={`hdg__badge hdg__badge--${field.level}`}>{LEVEL_LABEL[field.level]}</span>
          {changed && (
            <button type="button" className="hdg__reset" onClick={() => setValue(def)} title="חזרה לטקסט המקורי">
              איפוס
            </button>
          )}
        </div>
        <SaveIndicator status={status} />
      </div>

      {multiline ? (
        <textarea
          className="hdg__input"
          dir="auto"
          rows={Math.min(5, Math.max(2, Math.ceil((value || '').length / 60)))}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="הקלידו טקסט…"
        />
      ) : (
        <input
          className="hdg__input"
          dir="auto"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="הקלידו טקסט…"
        />
      )}

      {field.maxLength && (
        <span className={`hdg__count ${tooLong ? 'hdg__count--over' : ''}`}>
          {len} / {field.maxLength} תווים
        </span>
      )}
    </div>
  )
}

export default function HeadingsTab() {
  const [overrides, setOverrides] = useState({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(() => HEADINGS_REGISTRY.map((p) => p.pageId)) // הכול פתוח כברירת מחדל

  useEffect(() => {
    let on = true
    loadHeadingOverrides()
      .then((o) => { if (on) setOverrides(o) })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [])

  const onSaved = useCallback((key, value) => {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value) next[key] = value; else delete next[key]
      return next
    })
  }, [])

  const query = q.trim()
  const filtered = useMemo(() => HEADINGS_REGISTRY
    .map((page) => ({
      ...page,
      fields: page.fields.filter((f) =>
        !query ||
        page.pageLabel.includes(query) ||
        f.label.includes(query) ||
        (overrides[f.key] || dictDefault(f.key)).includes(query)
      ),
    }))
    .filter((page) => page.fields.length > 0), [query, overrides])

  const toggle = (id) => setOpen((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  if (loading) {
    return (
      <div className="hdg">
        {[0, 1, 2].map((i) => <div key={i} className="hdg__skeleton" />)}
      </div>
    )
  }

  return (
    <div className="hdg">
      <div className="hdg__toolbar">
        <p className="hdg__hint">עורכים כאן את כל הכותרות והטקסטים של האתר. כל שינוי נשמר אוטומטית ומתעדכן באתר (ייתכן שיידרש רענון בעמוד הציבורי). לשליטה ב<strong>גדלים ובמשקלים</strong> של הכותרות (H1–H5) — טאב <strong>פונטים</strong>.</p>
        <div className="hdg__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש כותרת או עמוד…" aria-label="חיפוש כותרת" />
          {q && <button type="button" className="hdg__search-clear" onClick={() => setQ('')} aria-label="ניקוי">✕</button>}
        </div>
      </div>

      {filtered.length === 0 && <p className="hdg__empty">לא נמצאו כותרות התואמות "{query}".</p>}

      <div className="hdg__pages">
        {filtered.map((page) => {
          const isOpen = open.includes(page.pageId)
          return (
            <section key={page.pageId} className="hdg__page">
              <button type="button" className="hdg__page-head" onClick={() => toggle(page.pageId)} aria-expanded={isOpen}>
                <svg className={`hdg__chev ${isOpen ? 'hdg__chev--open' : ''}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                <span className="hdg__page-label">{page.pageLabel}</span>
                <span className="hdg__page-path">{page.pagePath}</span>
              </button>
              {isOpen && (
                <div className="hdg__page-body">
                  {page.fields.map((field) => (
                    <HeadingRow key={field.key} field={field} override={overrides[field.key]} onSaved={onSaved} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
