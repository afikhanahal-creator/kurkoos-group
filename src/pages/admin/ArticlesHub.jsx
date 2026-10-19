import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchSettingKey, setSetting, uploadMedia, invalidate } from '../../lib/cms.js'
import { mergeArticles as mergeYazamut, loadSeed as loadYazamut } from '../../lib/yazamut.js'
import { mergeConstructions, loadSeed as loadConstructions } from '../../lib/constructions.js'
import { mergeSupervision, loadSeed as loadSupervision } from '../../lib/supervision.js'
import { mergeBrokerage, loadSeed as loadBrokerage } from '../../lib/brokerage.js'
import { mergeArticles as mergeMentor, loadSeed as loadMentor } from '../../lib/mentorguide.js'
import ArticleCover from '../../components/ui/ArticleCover.jsx'
import AiImageButton from './AiImageButton.jsx'
import { toast } from '../../lib/toast.js'
import './ArticlesHub.css'

/* ============================================================
   כל הכתבות באתר במקום אחד: חמשת הטורים, עם חיפוש, סינון לפי נושא,
   קטגוריה, תאריך, סטטוס וכתבות בלי תמונה. לחיצה על כתבה פותחת חלון
   עם הפרטים, קישור לאתר, ותמונות: כריכה (העלאה, החלפה, הסרה, יצירה
   ב-AI) ותמונות נוספות לכתבה. כל שינוי נשמר כעריכה על הכתבה, באותו
   מקום שבו "מאמרים ומדריכים" שומר, כך שהאתר מתעדכן מיד.
   ============================================================ */

const SITE = 'https://www.kurkoos-group.co.il'
export const HUB_COLUMNS = [
  { id: 'constructions', label: 'ביצוע ובנייה', key: 'constructions_articles', merge: mergeConstructions, load: loadConstructions, route: '/constructions', color: '#105572',
    ai: 'Israeli construction site, editorial magazine photography, building process, professional, clean composition, natural light, premium, photorealistic, ultra detailed, no text, no logos, no watermark' },
  { id: 'supervision', label: 'פיקוח בנייה', key: 'supervision_articles', merge: mergeSupervision, load: loadSupervision, route: '/construction-supervision', color: '#07293a',
    ai: 'Israeli construction site supervision, editorial magazine photography, building inspection and quality control detail, professional, natural light, photorealistic, no text, no logos, no watermark' },
  { id: 'brokerage', label: 'רוכש ומוכר', key: 'brokerage_articles', merge: mergeBrokerage, load: loadBrokerage, route: '/real-estate-guide', color: '#a90b0c',
    ai: 'luxury real estate editorial photography, elegant property interior, natural daylight, clean composition, photorealistic, no people, no text, no logos, no watermark' },
  { id: 'yazamut', label: 'יזמות נדל"ן', key: 'yazamut_articles', merge: mergeYazamut, load: loadYazamut, route: '/yazamut-nadlan', color: '#5a93ad',
    ai: 'Israeli real estate development, editorial magazine cover photography, high end architecture, modern, natural light, photorealistic, no text, no logos, no watermark' },
  { id: 'mentor', label: 'יזמים צעירים', key: 'mentorguide_articles', merge: mergeMentor, load: loadMentor, route: '/madrich-yazamim', color: '#3d7a62',
    ai: 'young real estate entrepreneurs, editorial magazine photography, planning and site visit, natural light, photorealistic, no text, no logos, no watermark' },
]
const colOf = (id) => HUB_COLUMNS.find((c) => c.id === id)

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })
const fmt = (d) => { try { return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return d } }
const monthKey = (d) => String(d || '').slice(0, 7)
const monthLabel = (k) => { try { return new Date(`${k}-01T12:00:00`).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) } catch { return k } }
function statusOf(a) {
  if (a.deleted) return { id: 'deleted', label: 'בסל' }
  if (a.archived) return { id: 'archived', label: 'בארכיון' }
  if (a.published === false) return { id: 'draft', label: 'לא מפורסם' }
  if (String(a.date || '').slice(0, 10) > today()) return { id: 'scheduled', label: 'מתוזמן' }
  return { id: 'live', label: 'באתר' }
}
const imagesOf = (a) => (Array.isArray(a.images) ? a.images.filter((x) => x && x.url) : [])

/* עריכה של כתבה אחת: קוראים את העריכות העדכניות של הטור, מעדכנים רק את הכתבה הזו ושומרים */
async function patchArticle(col, slug, patch) {
  const raw = await fetchSettingKey(col.key)
  let list = []
  try { list = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [] } catch { list = [] }
  if (!Array.isArray(list)) list = []
  const i = list.findIndex((x) => x && x.slug === slug)
  if (i >= 0) list[i] = { ...list[i], ...patch }
  else list.push({ slug, ...patch })
  await setSetting(col.key, JSON.stringify(list))
  try { invalidate('settings') } catch { /* noop */ }
}

export default function ArticlesHub() {
  const [all, setAll] = useState(null)
  const [q, setQ] = useState('')
  const [col, setCol] = useState('all')
  const [cat, setCat] = useState('')
  const [period, setPeriod] = useState('all')
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState('live')
  const [noImg, setNoImg] = useState(false)
  const [sort, setSort] = useState('new')
  const [view, setView] = useState('grid')
  const [open, setOpen] = useState(null)   // { col, slug }
  const [limit, setLimit] = useState(36)

  const load = async () => {
    const rows = await Promise.all(HUB_COLUMNS.map(async (c) => {
      try {
        const [raw] = await Promise.all([fetchSettingKey(c.key).catch(() => null), c.load()])
        return c.merge(raw).filter((a) => a && a.slug).map((a) => ({ ...a, _col: c.id }))
      } catch { return [] }
    }))
    setAll(rows.flat())
  }
  useEffect(() => { load() }, [])
  useEffect(() => { setLimit(36) }, [q, col, cat, period, month, status, noImg, sort])

  const cats = useMemo(() => {
    if (!all) return []
    const s = new Set(all.filter((a) => col === 'all' || a._col === col).map((a) => a.category).filter(Boolean))
    return [...s].sort((x, y) => x.localeCompare(y, 'he'))
  }, [all, col])
  const months = useMemo(() => (all ? [...new Set(all.map((a) => monthKey(a.date)).filter(Boolean))].sort().reverse() : []), [all])

  const list = useMemo(() => {
    if (!all) return []
    const t = today()
    const since = period === 'week' ? 7 : period === 'month' ? 31 : period === 'q' ? 92 : 0
    const minDate = since ? new Date(Date.now() - since * 864e5).toISOString().slice(0, 10) : ''
    const needle = q.trim()
    const out = all.filter((a) => {
      const st = statusOf(a).id
      if (status !== 'any' && st !== status) return false
      if (status === 'any' && st === 'deleted') return false
      if (col !== 'all' && a._col !== col) return false
      if (cat && a.category !== cat) return false
      if (month && monthKey(a.date) !== month) return false
      if (minDate && (String(a.date).slice(0, 10) < minDate || String(a.date).slice(0, 10) > t)) return false
      if (noImg && a.cover) return false
      if (needle && !`${a.title} ${a.excerpt || ''} ${a.focusKeyword || ''} ${(a.tags || []).join(' ')}`.includes(needle)) return false
      return true
    })
    out.sort((x, y) => sort === 'old' ? String(x.date).localeCompare(String(y.date)) : sort === 'az' ? String(x.title).localeCompare(String(y.title), 'he') : String(y.date).localeCompare(String(x.date)))
    return out
  }, [all, q, col, cat, period, month, status, noImg, sort])

  if (!all) return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען את כל הכתבות…</div>

  const counts = Object.fromEntries(HUB_COLUMNS.map((c) => [c.id, all.filter((a) => a._col === c.id && statusOf(a).id === 'live').length]))
  const liveAll = all.filter((a) => statusOf(a).id === 'live')
  const withImg = liveAll.filter((a) => a.cover).length
  const current = open && all.find((a) => a._col === open.col && a.slug === open.slug)
  const anyFilter = q || col !== 'all' || cat || period !== 'all' || month || status !== 'live' || noImg

  return (
    <div className="ahub">
      <div className="ahub__summary">
        <span><b>{liveAll.length}</b> כתבות באתר</span>
        <span><b>{withImg}</b> עם תמונה משלהן</span>
        <span><b>{liveAll.length - withImg}</b> עם כריכה מעוצבת אוטומטית</span>
        <button type="button" className={`ahub__chip ahub__chip--warn${noImg ? ' is-on' : ''}`} aria-pressed={noImg} onClick={() => setNoImg(!noImg)}>רק כתבות בלי תמונה</button>
      </div>

      <div className="ahub__cols" role="group" aria-label="נושא">
        <button type="button" className={`ahub__col${col === 'all' ? ' is-on' : ''}`} aria-pressed={col === 'all'} onClick={() => { setCol('all'); setCat('') }}>כל הנושאים <small>{liveAll.length}</small></button>
        {HUB_COLUMNS.map((c) => (
          <button key={c.id} type="button" style={{ '--c': c.color }} className={`ahub__col${col === c.id ? ' is-on' : ''}`} aria-pressed={col === c.id} onClick={() => { setCol(c.id); setCat('') }}>
            <i aria-hidden="true" />{c.label} <small>{counts[c.id]}</small>
          </button>
        ))}
      </div>

      <div className="ahub__bar">
        <label className="ahub__search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש בכותרת, בתקציר ובמילות המפתח" aria-label="חיפוש כתבה" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="קטגוריה"><option value="">כל הקטגוריות</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <select value={month} onChange={(e) => { setMonth(e.target.value); setPeriod('all') }} aria-label="חודש"><option value="">כל החודשים</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        <div className="ahub__seg" role="group" aria-label="תקופה">
          {[['all', 'הכל'], ['week', 'שבוע'], ['month', 'חודש'], ['q', '3 חודשים']].map(([k, l]) => (
            <button key={k} type="button" className={period === k ? 'is-on' : ''} aria-pressed={period === k} onClick={() => { setPeriod(k); setMonth('') }}>{l}</button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="סטטוס">
          <option value="live">באתר</option><option value="scheduled">מתוזמנות</option><option value="draft">לא מפורסמות</option><option value="archived">בארכיון</option><option value="any">כל הסטטוסים</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="מיון"><option value="new">החדשות קודם</option><option value="old">הישנות קודם</option><option value="az">לפי שם</option></select>
        <div className="ahub__seg" role="group" aria-label="תצוגה">
          <button type="button" className={view === 'grid' ? 'is-on' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')}>מגזין</button>
          <button type="button" className={view === 'list' ? 'is-on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>רשימה</button>
        </div>
      </div>

      <p className="ahub__count" role="status">{list.length} כתבות{anyFilter ? ' לפי הסינון' : ''}
        {anyFilter && <button type="button" className="ahub__clear" onClick={() => { setQ(''); setCol('all'); setCat(''); setPeriod('all'); setMonth(''); setStatus('live'); setNoImg(false) }}>ניקוי הסינון</button>}
      </p>

      {!list.length && <p className="ahub__empty">לא נמצאו כתבות. נסו מילה אחרת או נקו את הסינון.</p>}

      <div className={view === 'grid' ? 'ahub__grid' : 'ahub__list'}>
        {list.slice(0, limit).map((a, i) => {
          const c = colOf(a._col); const st = statusOf(a); const n = imagesOf(a).length
          return (
            <button type="button" key={a._col + a.slug} className={`ahub__card${view === 'grid' && i === 0 && !anyFilter ? ' is-lead' : ''}`} style={{ '--c': c.color }} onClick={() => setOpen({ col: a._col, slug: a.slug })}>
              <span className="ahub__img">
                {a.cover ? <img src={a.cover} alt="" loading="lazy" decoding="async" /> : <ArticleCover article={a} variant="card" />}
                <span className="ahub__imgtag">{a.cover ? (n ? `${n + 1} תמונות` : 'תמונה') : 'כריכה אוטומטית'}</span>
              </span>
              <span className="ahub__body">
                <span className="ahub__kicker"><i aria-hidden="true" />{c.label}{a.category ? ` · ${a.category}` : ''}</span>
                <span className="ahub__title">{a.title || 'ללא כותרת'}</span>
                {view === 'grid' && a.excerpt && <span className="ahub__excerpt">{a.excerpt}</span>}
                <span className="ahub__meta"><time>{fmt(a.date)}</time>{st.id !== 'live' && <em className={`ahub__st ahub__st--${st.id}`}>{st.label}</em>}{a.readingTime && <span>{a.readingTime}</span>}</span>
              </span>
            </button>
          )
        })}
      </div>
      {list.length > limit && <button type="button" className="ahub__more" onClick={() => setLimit(limit + 36)}>עוד {Math.min(36, list.length - limit)} כתבות</button>}

      {current && <ArticleDrawer a={current} onClose={() => setOpen(null)} onSaved={(patch) => setAll((prev) => prev.map((x) => (x._col === current._col && x.slug === current.slug ? { ...x, ...patch } : x)))} />}
    </div>
  )
}

/* ---------- חלון כתבה: פרטים ותמונות ---------- */
function ArticleDrawer({ a, onClose, onSaved }) {
  const c = colOf(a._col)
  const url = `${c.route}/${a.slug}`
  const [busy, setBusy] = useState('')
  const coverRef = useRef(null)
  const moreRef = useRef(null)
  const closeRef = useRef(null)
  const imgs = imagesOf(a)

  useEffect(() => {
    const back = document.activeElement
    closeRef.current && closeRef.current.focus()
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; back && back.focus && back.focus() }
  }, [onClose])

  const save = async (patch, msg) => {
    try { await patchArticle(c, a.slug, patch); onSaved(patch); toast.success(msg || 'נשמר. הכתבה באתר עודכנה') }
    catch (e) { toast.error('השמירה נכשלה: ' + ((e && e.message) || e)) }
  }
  const uploadCover = async (file) => {
    if (!file) return
    setBusy('cover')
    try { const u = await uploadMedia(file, `articles/${c.id}`); await save({ cover: u, coverAlt: a.coverAlt || a.title }, 'התמונה הועלתה והוגדרה ככריכה') }
    catch (e) { toast.error('ההעלאה נכשלה: ' + ((e && e.message) || e)) } finally { setBusy('') }
  }
  const uploadMore = async (files) => {
    const fs = [...(files || [])].slice(0, 12)
    if (!fs.length) return
    setBusy('more')
    try {
      const added = []
      for (const f of fs) { const u = await uploadMedia(f, `articles/${c.id}`); added.push({ url: u, alt: '' }) }
      await save({ images: [...imgs, ...added] }, `${added.length} תמונות נוספו לכתבה`)
    } catch (e) { toast.error('ההעלאה נכשלה: ' + ((e && e.message) || e)) } finally { setBusy('') }
  }
  const setImg = (i, patch) => save({ images: imgs.map((x, j) => (j === i ? { ...x, ...patch } : x)) }, 'נשמר')
  const moveImg = (i, d) => { const n = [...imgs]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; save({ images: n }, 'הסדר נשמר') }
  const asCover = (i) => { const n = [...imgs]; const [it] = n.splice(i, 1); if (a.cover) n.unshift({ url: a.cover, alt: a.coverAlt || '' }); save({ cover: it.url, coverAlt: it.alt || a.title, images: n }, 'התמונה הוגדרה ככריכה') }

  return createPortal(
    <div className="ahd" dir="rtl" onClick={onClose}>
      <aside className="ahd__panel" role="dialog" aria-modal="true" aria-label={`הכתבה ${a.title}`} onClick={(e) => e.stopPropagation()} style={{ '--c': c.color }}>
        <header className="ahd__head">
          <span className="ahd__kicker"><i aria-hidden="true" />{c.label}{a.category ? ` · ${a.category}` : ''}</span>
          <button type="button" ref={closeRef} className="ahd__x" onClick={onClose} aria-label="סגירה">✕</button>
        </header>
        <div className="ahd__scroll">
          <div className="ahd__hero">
            {a.cover ? <img src={a.cover} alt={a.coverAlt || ''} /> : <ArticleCover article={a} variant="card" />}
          </div>
          <h2 className="ahd__title">{a.title}</h2>
          <p className="ahd__meta"><time>{fmt(a.date)}</time> · {statusOf(a).label}{a.readingTime ? ` · ${a.readingTime}` : ''}{a.focusKeyword ? ` · מילת מפתח: ${a.focusKeyword}` : ''}</p>
          {a.excerpt && <p className="ahd__excerpt">{a.excerpt}</p>}
          <div className="ahd__links">
            <a className="ahd__btn ahd__btn--pri" href={url} target="_blank" rel="noopener noreferrer">פתיחת הכתבה באתר</a>
            <button type="button" className="ahd__btn" onClick={async () => { try { await navigator.clipboard.writeText(SITE + url); toast.success('הקישור הועתק') } catch { toast.error('ההעתקה נחסמה') } }}>העתקת קישור</button>
          </div>

          <section className="ahd__sec">
            <h3>תמונת הכריכה</h3>
            <p className="ahd__help">התמונה הראשית של הכתבה: מופיעה בראש הכתבה, בכרטיס ברשימות ובשיתוף ברשתות. בלי תמונה מוצגת כריכה מעוצבת אוטומטית.</p>
            <div className="ahd__acts">
              <button type="button" className="ahd__btn ahd__btn--pri" disabled={busy === 'cover'} onClick={() => coverRef.current && coverRef.current.click()}>{busy === 'cover' ? 'מעלה…' : a.cover ? 'החלפת תמונה' : 'העלאת תמונה'}</button>
              <AiImageButton promptText={[a.coverAlt || a.title, a.category, c.ai].filter(Boolean).join('. ')} folder={`articles/${c.id}`} onImage={(u) => save({ cover: u, coverAlt: a.coverAlt || a.title }, 'תמונת ה-AI הוגדרה ככריכה')} />
              {a.cover && <button type="button" className="ahd__btn ahd__btn--danger" onClick={() => { if (window.confirm('להסיר את תמונת הכריכה? תוצג כריכה מעוצבת אוטומטית.')) save({ cover: '' }, 'התמונה הוסרה') }}>הסרה</button>}
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { uploadCover(e.target.files && e.target.files[0]); e.target.value = '' }} />
            </div>
            {a.cover && (
              <label className="ahd__field"><span>תיאור התמונה (לנגישות ולגוגל)</span>
                <input defaultValue={a.coverAlt || ''} onBlur={(e) => { if (e.target.value !== (a.coverAlt || '')) save({ coverAlt: e.target.value }, 'התיאור נשמר') }} />
              </label>
            )}
          </section>

          <section className="ahd__sec">
            <h3>תמונות נוספות לכתבה <small>{imgs.length}</small></h3>
            <p className="ahd__help">תמונות שישולבו בגוף הכתבה. אפשר להעלות כמה בבת אחת, לסדר, להגדיר אחת ככריכה ולהסיר.</p>
            <div className="ahd__drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); uploadMore(e.dataTransfer.files) }}>
              <button type="button" className="ahd__btn" disabled={busy === 'more'} onClick={() => moreRef.current && moreRef.current.click()}>{busy === 'more' ? 'מעלה…' : 'הוספת תמונות'}</button>
              <span>או גררו לכאן כמה תמונות</span>
              <input ref={moreRef} type="file" accept="image/*" multiple hidden onChange={(e) => { uploadMore(e.target.files); e.target.value = '' }} />
            </div>
            {imgs.length > 0 && (
              <ol className="ahd__imgs">
                {imgs.map((im, i) => (
                  <li key={im.url + i}>
                    <img src={im.url} alt={im.alt || ''} loading="lazy" />
                    <input aria-label={`תיאור תמונה ${i + 1}`} placeholder="תיאור התמונה" defaultValue={im.alt || ''} onBlur={(e) => { if (e.target.value !== (im.alt || '')) setImg(i, { alt: e.target.value }) }} />
                    <span className="ahd__imgacts">
                      <button type="button" onClick={() => moveImg(i, -1)} disabled={i === 0} aria-label="למעלה">↑</button>
                      <button type="button" onClick={() => moveImg(i, 1)} disabled={i === imgs.length - 1} aria-label="למטה">↓</button>
                      <button type="button" onClick={() => asCover(i)}>לכריכה</button>
                      <button type="button" className="is-danger" onClick={() => { if (window.confirm('להסיר את התמונה מהכתבה?')) save({ images: imgs.filter((_, j) => j !== i) }, 'התמונה הוסרה') }} aria-label="הסרה">✕</button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>,
    document.body
  )
}
