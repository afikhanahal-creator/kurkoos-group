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

  // סנכרון אם ה-override השתנה מבחוץ (החלפת עמוד)
  useEffect(() => { setValue(override != null ? override : def) }, [field.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (v) => {
    try {
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
    <div className={`hdg__row ${changed ? 'hdg__row--changed' : ''}`}>
      <div className="hdg__row-head">
        <div className="hdg__row-meta">
          <span className={`hdg__badge hdg__badge--${field.level}`}>{LEVEL_LABEL[field.level]}</span>
          <span className="hdg__row-label">{field.label}</span>
          {changed && (
            <button type="button" className="hdg__reset" onClick={() => setValue(def)} title="חזרה לטקסט המקורי">
              ↺ איפוס
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
  const [activePage, setActivePage] = useState(HEADINGS_REGISTRY[0]?.pageId)

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

  // כמה כותרות שונו בכל עמוד (לתג מונה ליד שם העמוד)
  const changedCount = useCallback((page) =>
    page.fields.filter((f) => overrides[f.key] != null && overrides[f.key] !== dictDefault(f.key)).length, [overrides])

  const query = q.trim()
  // במצב חיפוש — תוצאות שטוחות מכל העמודים; אחרת — העמוד הנבחר בלבד
  const searchResults = useMemo(() => {
    if (!query) return null
    return HEADINGS_REGISTRY
      .map((page) => ({
        ...page,
        fields: page.fields.filter((f) =>
          page.pageLabel.includes(query) ||
          f.label.includes(query) ||
          (overrides[f.key] || dictDefault(f.key)).includes(query)),
      }))
      .filter((page) => page.fields.length > 0)
  }, [query, overrides])

  const current = HEADINGS_REGISTRY.find((p) => p.pageId === activePage) || HEADINGS_REGISTRY[0]

  // קיבוץ הטאבים לפי מקור: דף הבית מול עמודים פנימיים (לתצוגה מסודרת)
  const groupOf = (page) => (page.pageId.startsWith('page-') ? 'עמודים פנימיים' : 'דף הבית')
  const tabGroups = HEADINGS_REGISTRY.reduce((acc, page) => {
    const g = groupOf(page)
    ;(acc[g] = acc[g] || []).push(page)
    return acc
  }, {})

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
        <p className="hdg__hint">בחרו עמוד וערכו את כל הכותרות שלו. כל שינוי <strong>נשמר אוטומטית</strong> ומתעדכן באתר. לשליטה בגדלים/משקלים גלובליים (H1–H5) — טאב <strong>פונטים</strong>.</p>
        <div className="hdg__search">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש כותרת או עמוד…" aria-label="חיפוש כותרת" />
          {q && <button type="button" className="hdg__search-clear" onClick={() => setQ('')} aria-label="ניקוי">✕</button>}
        </div>
      </div>

      {/* מצב חיפוש — תוצאות מכל העמודים */}
      {searchResults ? (
        searchResults.length === 0 ? (
          <p className="hdg__empty">לא נמצאו כותרות התואמות "{query}".</p>
        ) : (
          <div className="hdg__results">
            {searchResults.map((page) => (
              <section key={page.pageId} className="hdg__resgroup">
                <h3 className="hdg__resgroup-title">{page.pageLabel}</h3>
                {page.fields.map((field) => (
                  <HeadingRow key={field.key} field={field} override={overrides[field.key]} onSaved={onSaved} />
                ))}
              </section>
            ))}
          </div>
        )
      ) : (
        // מצב רגיל — טאבים של עמודים + תוכן העמוד הנבחר
        <div className="hdg__layout">
          <nav className="hdg__tabs" aria-label="עמודים">
            {Object.entries(tabGroups).map(([groupLabel, pages]) => (
              <div className="hdg__tabgroup" key={groupLabel}>
                <span className="hdg__tabgroup-label">{groupLabel}</span>
                {pages.map((page) => {
                  const n = changedCount(page)
                  return (
                    <button
                      key={page.pageId}
                      type="button"
                      className={`hdg__tab ${page.pageId === current.pageId ? 'is-active' : ''}`}
                      onClick={() => setActivePage(page.pageId)}
                    >
                      <span className="hdg__tab-label">{page.pageLabel}</span>
                      {n > 0 && <span className="hdg__tab-count" title={`${n} כותרות נערכו`}>{n}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="hdg__content">
            <div className="hdg__content-head">
              <h2 className="hdg__content-title">{current.pageLabel}</h2>
              <span className="hdg__content-path">{current.pagePath}</span>
            </div>
            {current.fields.map((field) => (
              <HeadingRow key={field.key} field={field} override={overrides[field.key]} onSaved={onSaved} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
