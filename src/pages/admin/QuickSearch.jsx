import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* חיפוש מהיר בניהול (Ctrl+K): מקלידים כמה אותיות ועוברים לכל לשונית במקלדת */
export default function QuickSearch({ tabs, onPick }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const k = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o) }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => inputRef.current?.focus(), 0) } }, [open])

  const list = useMemo(() => {
    const n = q.trim()
    return tabs.filter((t) => !n || t.label.includes(n) || (t.sub || '').includes(n) || t.group.includes(n))
  }, [q, tabs])

  const pick = (t) => { setOpen(false); onPick(t) }
  const onKey = (e) => {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(list.length - 1, x + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
    if (e.key === 'Enter' && list[i]) pick(list[i])
  }

  return (
    <>
      <button type="button" className="adm-qs__btn" onClick={() => setOpen(true)} aria-label="חיפוש מהיר בניהול" title="חיפוש מהיר (Ctrl+K)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>חיפוש מהיר</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && createPortal(
        <div className="adm-qs" dir="rtl" onClick={() => setOpen(false)}>
          <div className="adm-qs__box" role="dialog" aria-modal="true" aria-label="חיפוש מהיר" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              className="adm-qs__input"
              value={q}
              onChange={(e) => { setQ(e.target.value); setI(0) }}
              onKeyDown={onKey}
              placeholder="לאן עוברים? למשל: לידים, עמודים, פרויקטים"
              aria-label="חיפוש לשונית"
              role="combobox"
              aria-expanded="true"
              aria-controls="adm-qs-list"
              aria-activedescendant={list[i] ? `qs-${list[i].id}` : undefined}
            />
            <ul className="adm-qs__list" id="adm-qs-list" role="listbox">
              {list.map((t, k) => (
                <li key={t.id} id={`qs-${t.id}`} role="option" aria-selected={k === i} className={k === i ? 'is-on' : ''} onMouseEnter={() => setI(k)} onClick={() => pick(t)}>
                  <strong>{t.label}</strong>
                  <span>{t.group} · {t.sub}</span>
                </li>
              ))}
              {!list.length && <li className="adm-qs__none">לא נמצאה לשונית. נסו מילה אחרת.</li>}
            </ul>
            <p className="adm-qs__foot">חיצים לבחירה · Enter למעבר · Esc לסגירה</p>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
