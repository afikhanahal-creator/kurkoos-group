import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '../../i18n/index.jsx'
import Icon from './Icon.jsx'
import './AccessibilityButton.css'

const KEY = 'kurkoos-a11y'

const defaults = {
  // toggles
  dark: false, light: false, monochrome: false, contrast: false,
  readable: false, links: false, headings: false, highlightAll: false,
  bigButtons: false, reading: false, kbd: false,
  imageAlt: false, muteMedia: false, readAloud: false, virtualKbd: false,
  // levels
  zoom: 0, enlarge: 0,
  fontScale: 0, lineSpace: 0, wordSpace: 0, letterSpace: 0,
  cursor: null, // 'black' | 'white'
  colors: { bg: null, headings: null, text: null },
}

/* ---------- מיפוי רמות ---------- */
const ZOOM = [1, 1.12, 1.25]
const LINE = [1.6, 1.9, 2.3, 2.8]
const WORD = ['normal', '0.12em', '0.24em', '0.4em']
const LETTER = ['normal', '0.04em', '0.09em', '0.15em']

function applyColors(c) {
  const h = document.documentElement
  ;[
    '--color-bg', '--color-surface', '--color-surface-alt', '--color-bg-soft',
    '--color-primary-900', '--color-primary-700', '--color-primary-500',
    '--color-primary', '--color-secondary', '--color-text',
  ].forEach((v) => h.style.removeProperty(v))

  if (c.bg != null) {
    h.style.setProperty('--color-bg', `hsl(${c.bg} 38% 96%)`)
    h.style.setProperty('--color-surface', `hsl(${c.bg} 45% 99%)`)
    h.style.setProperty('--color-surface-alt', `hsl(${c.bg} 36% 93%)`)
    h.style.setProperty('--color-bg-soft', `hsl(${c.bg} 36% 93%)`)
  }
  if (c.headings != null) {
    const col = `hsl(${c.headings} 65% 30%)`
    h.style.setProperty('--color-primary-900', col)
    h.style.setProperty('--color-primary-700', col)
    h.style.setProperty('--color-primary-500', col)
    h.style.setProperty('--color-primary', col)
    h.style.setProperty('--color-secondary', col)
  }
  if (c.text != null) h.style.setProperty('--color-text', `hsl(${c.text} 22% 20%)`)
}

function apply(s) {
  const h = document.documentElement
  const cls = {
    'a11y-dark': s.dark,
    'a11y-light': s.light,
    'a11y-monochrome': s.monochrome,
    'a11y-contrast': s.contrast,
    'a11y-readable': s.readable,
    'a11y-links': s.links,
    'a11y-headings': s.headings,
    'a11y-highlight-all': s.highlightAll,
    'a11y-big-buttons': s.bigButtons,
    'a11y-reading': s.reading,
    'a11y-kbd': s.kbd,
    'a11y-readaloud': s.readAloud,
    'a11y-enlarge-1': s.enlarge === 1,
    'a11y-enlarge-2': s.enlarge === 2,
    'a11y-cursor-black': s.cursor === 'black',
    'a11y-cursor-white': s.cursor === 'white',
    'a11y-line': s.lineSpace > 0,
    'a11y-word': s.wordSpace > 0,
    'a11y-letter': s.letterSpace > 0,
  }
  Object.entries(cls).forEach(([k, v]) => h.classList.toggle(k, v))

  h.style.setProperty('--a11y-zoom', ZOOM[s.zoom] || 1)
  h.style.fontSize = s.fontScale ? `${100 + s.fontScale * 7}%` : ''
  h.style.setProperty('--a11y-line', LINE[s.lineSpace])
  h.style.setProperty('--a11y-word', WORD[s.wordSpace])
  h.style.setProperty('--a11y-letter', LETTER[s.letterSpace])

  applyColors(s.colors)
}

/* ============================================================
   אייקונים (inline SVG) — סגנון קווי אחיד בצבעי הפאלטה.
   ============================================================ */
const Svg = ({ children, fill = 'none' }) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill={fill} stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const ICON = {
  moon: <Svg><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></Svg>,
  speaker: <Svg><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a4 4 0 0 1 0 7" /></Svg>,
  keyboard: <Svg><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></Svg>,
  eye: <Svg><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>,
  contrast: <Svg><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" /></Svg>,
  sun: <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>,
  image: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m3 16 5-5 4 4 3-3 6 6" /></Svg>,
  font: <Svg><path d="M5 20 12 4l7 16" /><path d="M8 14h8" /></Svg>,
  zoomA: <Svg><circle cx="10.5" cy="10.5" r="7" /><path d="m21 21-4.5-4.5" /><path d="M8.6 13 10.5 7l1.9 6M9.2 11.2h2.6" /></Svg>,
  highlighter: <Svg><path d="m15 5 4 4-9 9H6v-4l9-9Z" /><path d="M14 6 18 10" /></Svg>,
  hHead: <Svg><path d="M6 5v14M14 5v14M6 12h8" /><path d="M18 9 21 9" /></Svg>,
  hLink: <Svg><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></Svg>,
  zoomDoc: <Svg><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></Svg>,
  reading: <Svg><path d="M3 5h18v14H3Z" /><path d="M12 5v14M6.5 9H9M6.5 12.5H9M15 9h2.5M15 12.5h2.5" /></Svg>,
  expand: <Svg><path d="M9 4 4 4 4 9M15 4h5v5M15 20h5v-5M9 20H4v-5" /><path d="m4 4 6 6M20 4l-6 6M20 20l-6-6M4 20l6-6" /></Svg>,
  summary: <Svg><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h6M8 12h8M8 16h5" /></Svg>,
  mute: <Svg><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="m16 9 5 6M21 9l-5 6" /></Svg>,
}

/* ============================================================
   מקלדת וירטואלית — מקלידה לתוך השדה הממוקד.
   ============================================================ */
const ROWS_HE = [
  ['ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'],
  ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
  ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ'],
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
]
const ROWS_EN = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
]

function VirtualKeyboard({ lang, onClose }) {
  const [kb, setKb] = useState(lang === 'he' ? 'he' : 'en')
  const rows = kb === 'he' ? ROWS_HE : ROWS_EN

  const insert = (ch) => {
    const el = document.activeElement
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const v = el.value
    if (ch === '\b') {
      const from = start === end ? Math.max(0, start - 1) : start
      el.value = v.slice(0, from) + v.slice(end)
      el.setSelectionRange(from, from)
    } else {
      el.value = v.slice(0, start) + ch + v.slice(end)
      const pos = start + ch.length
      el.setSelectionRange(pos, pos)
    }
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  // onMouseDown preventDefault → שומר את הפוקוס בשדה
  const press = (e, ch) => { e.preventDefault(); insert(ch) }

  return (
    <div className="a11y-vk" role="group" aria-label="Virtual keyboard">
      <div className="a11y-vk__bar">
        <button type="button" className="a11y-vk__lang" onMouseDown={(e) => { e.preventDefault(); setKb((k) => (k === 'he' ? 'en' : 'he')) }}>
          {kb === 'he' ? 'EN' : 'עב'}
        </button>
        <span>{kb === 'he' ? 'מקלדת וירטואלית' : 'Virtual keyboard'}</span>
        <button type="button" className="a11y-vk__close" onMouseDown={(e) => { e.preventDefault(); onClose() }} aria-label="Close keyboard">✕</button>
      </div>
      {rows.map((row, ri) => (
        <div className="a11y-vk__row" key={ri}>
          {row.map((ch) => (
            <button type="button" key={ch} className="a11y-vk__key" onMouseDown={(e) => press(e, ch)}>{ch}</button>
          ))}
        </div>
      ))}
      <div className="a11y-vk__row">
        <button type="button" className="a11y-vk__key a11y-vk__key--wide" onMouseDown={(e) => press(e, '\b')}>⌫</button>
        <button type="button" className="a11y-vk__key a11y-vk__key--space" onMouseDown={(e) => press(e, ' ')}>{kb === 'he' ? 'רווח' : 'space'}</button>
        <button type="button" className="a11y-vk__key a11y-vk__key--wide" onMouseDown={(e) => press(e, '\n')}>↵</button>
      </div>
    </div>
  )
}

export default function AccessibilityButton() {
  const { lang } = useI18n()
  const he = lang === 'he'
  const [open, setOpen] = useState(false)
  const [s, setS] = useState(defaults)
  const [summary, setSummary] = useState(false)
  const [colorTab, setColorTab] = useState('bg')
  const [fontTab, setFontTab] = useState('size')
  const [headings, setHeadings] = useState([])

  /* טעינת הגדרות שמורות */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY))
      if (saved) { const merged = { ...defaults, ...saved, colors: { ...defaults.colors, ...(saved.colors || {}) } }; setS(merged); apply(merged) }
    } catch { /* ignore */ }
  }, [])

  const update = useCallback((next) => {
    setS(next)
    apply(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [])

  const reset = () => {
    const fresh = { ...defaults, colors: { ...defaults.colors } }
    update(fresh)
    setSummary(false)
  }

  /* הקראת טקסט — לחיצה על טקסט מקריאה אותו */
  useEffect(() => {
    if (!s.readAloud || !('speechSynthesis' in window)) return
    const onClick = (e) => {
      if (e.target.closest('.a11y, .a11y-panel, .a11y-vk, .a11y-fab')) return
      const el = e.target.closest('p,h1,h2,h3,h4,h5,h6,li,a,button,figcaption,label,span')
      const text = (el?.innerText || '').trim()
      if (!text) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = he ? 'he-IL' : 'en-US'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    }
    document.addEventListener('click', onClick, true)
    return () => { document.removeEventListener('click', onClick, true); window.speechSynthesis.cancel() }
  }, [s.readAloud, he])

  /* השתקת מדיה */
  useEffect(() => {
    if (!s.muteMedia) return
    const mute = () => document.querySelectorAll('audio,video').forEach((m) => { m.muted = true; if (!m.paused) m.pause() })
    mute()
    const id = setInterval(mute, 1500)
    return () => { clearInterval(id); document.querySelectorAll('audio,video').forEach((m) => { m.muted = false }) }
  }, [s.muteMedia])

  /* תיאור לתמונות — alt כ-tooltip */
  useEffect(() => {
    if (!s.imageAlt) return
    const imgs = [...document.querySelectorAll('img')]
    imgs.forEach((img) => { if (img.alt) { img.dataset.a11yPrev = img.title || ''; img.title = img.alt } })
    return () => imgs.forEach((img) => { if ('a11yPrev' in img.dataset) { img.title = img.dataset.a11yPrev; delete img.dataset.a11yPrev } })
  }, [s.imageAlt])

  /* סיכום עמוד — איסוף כותרות */
  useEffect(() => {
    if (!summary) return
    const hs = [...document.querySelectorAll('main h1, main h2, main h3')]
      .filter((el) => el.innerText.trim())
      .map((el, i) => {
        if (!el.id) el.id = `a11y-h-${i}`
        return { id: el.id, text: el.innerText.trim(), level: Number(el.tagName[1]) }
      })
    setHeadings(hs)
  }, [summary, open])

  const T = he
    ? {
      title: 'נגישות', reset: 'בטל נגישות', open: 'תפריט נגישות',
      colors: 'התאמת צבעים', colorsSub: 'שינוי צבעי האתר', resetColors: 'איפוס צבעים',
      tabsColor: { bg: 'רקעים', headings: 'כותרות', text: 'תכנים' },
      cursor: 'סמן העכבר', cursorSub: 'הגדלת סמן העכבר ושינוי צבעו', black: 'שחור', white: 'לבן',
      font: 'התאמות גופן', fontSub: 'הגדלה והקטנת הגופן', resetFont: 'אפס גופן',
      tabsFont: { size: 'גודל גופן', line: 'ריווח בין שורות', word: 'ריווח בין מילים', letter: 'ריווח אותיות' },
      summaryTitle: 'סיכום עמוד', back: 'חזרה', empty: 'לא נמצאו כותרות בעמוד',
      brand: 'נגישות קורקוס גרופ',
    }
    : {
      title: 'Accessibility', reset: 'Disable accessibility', open: 'Accessibility menu',
      colors: 'Color adjustment', colorsSub: 'Change site colors', resetColors: 'Reset colors',
      tabsColor: { bg: 'Backgrounds', headings: 'Headings', text: 'Content' },
      cursor: 'Mouse cursor', cursorSub: 'Enlarge cursor & change color', black: 'Black', white: 'White',
      font: 'Font adjustment', fontSub: 'Enlarge / reduce font', resetFont: 'Reset font',
      tabsFont: { size: 'Font size', line: 'Line spacing', word: 'Word spacing', letter: 'Letter spacing' },
      summaryTitle: 'Page summary', back: 'Back', empty: 'No headings found',
      brand: 'Kurkoos Accessibility',
    }

  const TILES = [
    { key: 'dark', icon: 'moon' }, { key: 'readAloud', icon: 'speaker' }, { key: 'kbd', icon: 'keyboard' },
    { key: 'monochrome', icon: 'eye' }, { key: 'contrast', icon: 'contrast' }, { key: 'light', icon: 'sun' },
    { key: 'imageAlt', icon: 'image' }, { key: 'readable', icon: 'font' }, { key: 'zoom', icon: 'zoomA', cycle: true, max: 2 },
    { key: 'highlightAll', icon: 'highlighter' }, { key: 'headings', icon: 'hHead' }, { key: 'links', icon: 'hLink' },
    { key: 'enlarge', icon: 'zoomDoc', cycle: true, max: 2 }, { key: 'reading', icon: 'reading' }, { key: 'bigButtons', icon: 'expand' },
    { key: 'virtualKbd', icon: 'keyboard' }, { key: 'pageSummary', icon: 'summary', action: 'summary' }, { key: 'muteMedia', icon: 'mute' },
  ]
  const LABELS = he
    ? { dark: 'ניגודיות כהה', readAloud: 'הקראת טקסט', kbd: 'ניווט מקלדת', monochrome: 'מונוכרום', contrast: 'מוד ניגודיות', light: 'ניגודיות בהירה', imageAlt: 'תיאור לתמונות', readable: 'גופן קריא', zoom: 'הגדלת תצוגה', highlightAll: 'הדגש אלמנטים', headings: 'הדגשת כותרות', links: 'הדגשת קישורים', enlarge: 'הגדלת תכנים', reading: 'תצוגה קריאה', bigButtons: 'הגדלת כפתורים', virtualKbd: 'מקלדת וירטואלית', pageSummary: 'סיכום עמוד', muteMedia: 'השתקת מדיה' }
    : { dark: 'Dark contrast', readAloud: 'Read aloud', kbd: 'Keyboard nav', monochrome: 'Monochrome', contrast: 'Contrast mode', light: 'Light contrast', imageAlt: 'Image descriptions', readable: 'Readable font', zoom: 'Zoom display', highlightAll: 'Highlight elements', headings: 'Highlight headings', links: 'Highlight links', enlarge: 'Enlarge content', reading: 'Reading view', bigButtons: 'Enlarge buttons', virtualKbd: 'Virtual keyboard', pageSummary: 'Page summary', muteMedia: 'Mute media' }

  const isActive = (tile) => {
    if (tile.action === 'summary') return summary
    if (tile.cycle) return s[tile.key] > 0
    return !!s[tile.key]
  }
  const onTile = (tile) => {
    if (tile.action === 'summary') { setSummary((v) => !v); return }
    if (tile.cycle) { update({ ...s, [tile.key]: (s[tile.key] + 1) % (tile.max + 1) }); return }
    update({ ...s, [tile.key]: !s[tile.key] })
  }

  /* ---- value helpers for font/color sliders ---- */
  const fontValue = { size: s.fontScale, line: s.lineSpace, word: s.wordSpace, letter: s.letterSpace }[fontTab]
  const fontRange = { size: [-3, 8], line: [0, 3], word: [0, 3], letter: [0, 3] }[fontTab]
  const setFont = (val) => {
    const [min, max] = fontRange
    const v = Math.max(min, Math.min(max, val))
    update({ ...s, [{ size: 'fontScale', line: 'lineSpace', word: 'wordSpace', letter: 'letterSpace' }[fontTab]]: v })
  }
  const fontPct = ((fontValue - fontRange[0]) / (fontRange[1] - fontRange[0])) * 100

  const colorVal = s.colors[colorTab] ?? 210
  const setColor = (hue) => update({ ...s, colors: { ...s.colors, [colorTab]: hue } })

  return createPortal(
    <>
      <button type="button" className="a11y-fab" onClick={() => setOpen(true)} aria-label={T.open} aria-expanded={open}>
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" fill="none"
          stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="20" cy="20" r="17" />
          <circle cx="20" cy="11.4" r="2.5" fill="currentColor" stroke="none" />
          <path d="M9.5 16.6c3.4 1.7 17.6 1.7 21 0" />
          <path d="M20 15.6V24M20 24l-4.6 7.2M20 24l4.6 7.2" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="a11y-overlay" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="a11y-panel"
              role="dialog" aria-label={T.title}
              initial={{ x: '-110%' }}
              animate={{ x: 0 }}
              exit={{ x: '-110%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              {/* כותרת */}
              <div className="a11y-panel__top">
                <button type="button" className="a11y-panel__close" onClick={() => setOpen(false)} aria-label={he ? 'סגירה' : 'Close'}>✕</button>
                <span className="a11y-panel__brandtag">{he ? 'עברית' : 'English'}</span>
                <button type="button" className="a11y-panel__quick" onClick={() => update({ ...s, contrast: !s.contrast })} aria-label="Contrast">
                  <Icon name="accessibility" size={18} />
                </button>
              </div>
              <div className="a11y-panel__titlebar"><span>{T.title}</span></div>

              <div className="a11y-panel__body">
                {summary ? (
                  /* ---- סיכום עמוד ---- */
                  <div className="a11y-summary">
                    <button type="button" className="a11y-summary__back" onClick={() => setSummary(false)}>← {T.back}</button>
                    <h4>{T.summaryTitle}</h4>
                    {headings.length === 0 ? (
                      <p className="a11y-summary__empty">{T.empty}</p>
                    ) : (
                      <ul>
                        {headings.map((hd) => (
                          <li key={hd.id} className={`a11y-summary__l${hd.level}`}>
                            <a href={`#${hd.id}`} onClick={() => { setOpen(false) }}>{hd.text}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <>
                    {/* רשת כלים */}
                    <div className="a11y-grid">
                      {TILES.map((tile) => (
                        <button
                          key={tile.key}
                          type="button"
                          className={`a11y-tile ${isActive(tile) ? 'is-on' : ''}`}
                          onClick={() => onTile(tile)}
                          aria-pressed={isActive(tile)}
                        >
                          <span className="a11y-tile__ic">{ICON[tile.icon]}</span>
                          <span className="a11y-tile__label">{LABELS[tile.key]}</span>
                          {tile.cycle && s[tile.key] > 0 && <span className="a11y-tile__lvl">{s[tile.key]}</span>}
                        </button>
                      ))}
                    </div>

                    {/* התאמת צבעים */}
                    <section className="a11y-card">
                      <header className="a11y-card__head">
                        <div><strong>{T.colors}</strong><span>{T.colorsSub}</span></div>
                        <span className="a11y-card__ic"><Icon name="accessibility" size={20} /></span>
                      </header>
                      <div className="a11y-tabs">
                        {Object.entries(T.tabsColor).map(([k, lbl]) => (
                          <button key={k} type="button" className={`a11y-tab ${colorTab === k ? 'is-on' : ''}`} onClick={() => setColorTab(k)}>{lbl}</button>
                        ))}
                      </div>
                      <input
                        type="range" min="0" max="360" value={colorVal}
                        className="a11y-hue"
                        onChange={(e) => setColor(Number(e.target.value))}
                        aria-label={T.colors}
                      />
                      <button type="button" className="a11y-link-btn" onClick={() => update({ ...s, colors: { bg: null, headings: null, text: null } })}>↺ {T.resetColors}</button>
                    </section>

                    {/* סמן עכבר */}
                    <section className="a11y-card">
                      <header className="a11y-card__head">
                        <div><strong>{T.cursor}</strong><span>{T.cursorSub}</span></div>
                      </header>
                      <div className="a11y-duo">
                        <button type="button" className={`a11y-chip ${s.cursor === 'black' ? 'is-on' : ''}`} onClick={() => update({ ...s, cursor: s.cursor === 'black' ? null : 'black' })}>{T.black}</button>
                        <button type="button" className={`a11y-chip ${s.cursor === 'white' ? 'is-on' : ''}`} onClick={() => update({ ...s, cursor: s.cursor === 'white' ? null : 'white' })}>{T.white}</button>
                      </div>
                    </section>

                    {/* התאמות גופן */}
                    <section className="a11y-card">
                      <header className="a11y-card__head">
                        <div><strong>{T.font}</strong><span>{T.fontSub}</span></div>
                        <span className="a11y-card__ic"><Icon name="textSize" size={20} /></span>
                      </header>
                      <div className="a11y-tabs a11y-tabs--wrap">
                        {Object.entries(T.tabsFont).map(([k, lbl]) => (
                          <button key={k} type="button" className={`a11y-tab ${fontTab === k ? 'is-on' : ''}`} onClick={() => setFontTab(k)}>{lbl}</button>
                        ))}
                      </div>
                      <div className="a11y-stepper">
                        <button type="button" onClick={() => setFont(fontValue - 1)} aria-label="-">−</button>
                        <div className="a11y-stepper__track"><span style={{ width: `${fontPct}%` }} /></div>
                        <button type="button" onClick={() => setFont(fontValue + 1)} aria-label="+">+</button>
                      </div>
                      <button type="button" className="a11y-link-btn" onClick={() => update({ ...s, fontScale: 0, lineSpace: 0, wordSpace: 0, letterSpace: 0 })}>↺ {T.resetFont}</button>
                    </section>
                  </>
                )}
              </div>

              {/* פוטר */}
              <div className="a11y-panel__foot">
                <button type="button" className="a11y-disable" onClick={reset}>{T.reset}</button>
                <span className="a11y-brandline">{T.brand}</span>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {s.virtualKbd && <VirtualKeyboard lang={lang} onClose={() => update({ ...s, virtualKbd: false })} />}
    </>,
    document.body
  )
}
