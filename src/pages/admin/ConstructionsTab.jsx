import { useState, useEffect, useRef } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import { mergeConstructions } from '../../lib/constructions.js'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import AiImageButton from './AiImageButton.jsx'
import { toast } from '../../lib/toast.js'
import './YazamutTab.css'

const aiPrompt = (a) => [
  a.coverAlt || a.title,
  a.category,
  'Israeli construction site, editorial magazine photography, building process, professional, clean composition, natural light, premium, photorealistic, ultra detailed, no text, no logos, no watermark',
].filter(Boolean).join('. ')

/* ConstructionsTab — ניהול כתבות "המדריך לתהליך הבנייה" (/constructions).
   זהה במבנה ל-YazamutTab: טאב לכל כתבה, עריכה מלאה, החלפת תמונה, ארכיון ומחיקה.
   נשמר בהגדרה 'constructions_articles'. */

const CATS = ['שלבי ביצוע', 'בטיחות באתר', 'איכות וליקויים', 'בירוקרטיה ורישוי', 'ניהול אתר', 'חומרים ושיטות']

const blank = () => ({
  slug: `katava-${Date.now()}`,
  title: '',
  date: new Date().toISOString().slice(0, 10),
  author: 'המערכת, טור ביצוע ובנייה',
  authorTitle: 'ביצוע ובנייה · קבוצת קורקוס',
  category: 'שלבי ביצוע',
  tags: [],
  focusKeyword: '',
  metaTitle: '',
  metaDescription: '',
  cover: '',
  coverAlt: '',
  excerpt: '',
  readingTime: '5 דקות קריאה',
  published: true,
  archived: false,
  deleted: false,
  body: '',
})

export default function ConstructionsTab() {
  const [list, setList] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)
  const listRef = useRef([])

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        const merged = mergeConstructions(s.constructions_articles)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
        listRef.current = merged
        setList(merged)
        setActiveId(merged[0]?.slug || null)
      })
      .catch(() => { listRef.current = []; setList([]) })
  }, [])

  const persist = async (next) => {
    listRef.current = next
    setSaving(true)
    try {
      await setSetting('constructions_articles', JSON.stringify(next))
      toast.success('הכתבות נשמרו')
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e.message || e))
    } finally { setSaving(false) }
  }

  const setField = (slug, key, value) => {
    setList((prev) => {
      const next = prev.map((a) => (a.slug === slug ? { ...a, [key]: value } : a))
      listRef.current = next
      return next
    })
  }
  const commit = () => persist(listRef.current)
  const setAndSave = (slug, key, value) => {
    setList((prev) => {
      const next = prev.map((a) => (a.slug === slug ? { ...a, [key]: value } : a))
      persist(next)
      return next
    })
  }

  const addItem = () => {
    const item = blank()
    const next = [item, ...listRef.current]
    setList(next)
    setActiveId(item.slug)
    persist(next)
  }

  const removeItem = (slug) => {
    if (!window.confirm('למחוק את הכתבה? היא תוסר מהאתר. ניתן לשחזר מהסל.')) return
    setAndSave(slug, 'deleted', true)
  }

  if (!list) {
    return <div className="adm-msg adm-msg--loading"><span className="adm-spin" />טוען…</div>
  }

  const active = list.find((a) => a.slug === activeId) || list[0]

  const statusBadge = (a) => {
    if (a.deleted) return <span className="yzt-badge yzt-badge--del">בסל</span>
    if (a.archived) return <span className="yzt-badge yzt-badge--arc">בארכיון</span>
    if (new Date(a.date).getTime() > Date.now()) return <span className="yzt-badge yzt-badge--sch">מתוזמן</span>
    if (a.published === false) return <span className="yzt-badge">טיוטה</span>
    return <span className="yzt-badge yzt-badge--live">באתר</span>
  }

  return (
    <div className="yzt">
      <div className="yzt__bar">
        <p className="yzt__intro">
          ניהול כתבות "המדריך לתהליך הבנייה" שמופיעות ב-<code>/constructions</code>. בחרו כתבה בטאב,
          ערכו ונסחו מחדש כל שדה, החליפו תמונה (שדה ריק = כריכה מעוצבת אוטומטית), ארכבו או מחקו.
          שינויים נשמרים אוטומטית.
        </p>
        <button type="button" className="btn btn--primary yzt__add" onClick={addItem} disabled={saving}>＋ כתבה חדשה</button>
      </div>

      <div className="yzt__tabs" role="tablist">
        {list.map((a) => (
          <button
            key={a.slug}
            type="button"
            role="tab"
            aria-selected={a.slug === activeId}
            className={`yzt__tab ${a.slug === activeId ? 'is-on' : ''} ${a.deleted ? 'is-del' : ''}`}
            onClick={() => setActiveId(a.slug)}
            title={a.title || a.slug}
          >
            <span className="yzt__tab-title">{a.title || '(ללא כותרת)'}</span>
            {statusBadge(a)}
          </button>
        ))}
      </div>

      {active && (
        <section className="yzt-edit" key={active.slug}>
          <header className="yzt-edit__head">
            <h3>{active.title || '(כתבה חדשה)'}</h3>
            <div className="yzt-edit__actions">
              {active.deleted ? (
                <button type="button" className="yzt-btn" onClick={() => setAndSave(active.slug, 'deleted', false)}>↩ שחזור מהסל</button>
              ) : (
                <>
                  <button type="button" className="yzt-btn" onClick={() => setAndSave(active.slug, 'archived', !active.archived)}>
                    {active.archived ? '↩ החזרה לאתר' : '📥 לארכיון'}
                  </button>
                  <button type="button" className="yzt-btn yzt-btn--del" onClick={() => removeItem(active.slug)}>🗑 מחיקה</button>
                </>
              )}
            </div>
          </header>

          <div className="yzt-grid2">
            <label className="yzt-field"><span>כותרת</span>
              <input dir="rtl" value={active.title} onChange={(e) => setField(active.slug, 'title', e.target.value)} onBlur={commit} placeholder="כותרת הכתבה" />
            </label>
            <label className="yzt-field"><span>קטגוריה (קובעת את הכריכה המעוצבת)</span>
              <select value={active.category} onChange={(e) => setAndSave(active.slug, 'category', e.target.value)}>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="yzt-field"><span>תאריך פרסום (עתידי = יעלה לבד באותו יום)</span>
              <input type="date" value={active.date} onChange={(e) => setAndSave(active.slug, 'date', e.target.value)} />
            </label>
            <label className="yzt-field"><span>זמן קריאה</span>
              <input dir="rtl" value={active.readingTime || ''} onChange={(e) => setField(active.slug, 'readingTime', e.target.value)} onBlur={commit} placeholder="5 דקות קריאה" />
            </label>
            <label className="yzt-field"><span>מילת מפתח ראשית (SEO)</span>
              <input dir="rtl" value={active.focusKeyword || ''} onChange={(e) => setField(active.slug, 'focusKeyword', e.target.value)} onBlur={commit} placeholder="למשל: טופס 4" />
            </label>
            <label className="yzt-field"><span>תגיות (מופרדות בפסיק)</span>
              <input dir="rtl" value={(active.tags || []).join(', ')} onChange={(e) => setField(active.slug, 'tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} onBlur={commit} placeholder="ביצוע, בטיחות, רישוי" />
            </label>
            <label className="yzt-field"><span>meta title (עד 60 תווים)</span>
              <input dir="rtl" maxLength={70} value={active.metaTitle || ''} onChange={(e) => setField(active.slug, 'metaTitle', e.target.value)} onBlur={commit} placeholder="כותרת ל-SEO עם מילת המפתח" />
            </label>
            <label className="yzt-field"><span>meta description (עד 155 תווים)</span>
              <input dir="rtl" maxLength={170} value={active.metaDescription || ''} onChange={(e) => setField(active.slug, 'metaDescription', e.target.value)} onBlur={commit} placeholder="תיאור ל-SEO שמזמין קליק" />
            </label>
            <label className="yzt-field"><span>כתובת (slug)</span>
              <input dir="ltr" value={active.slug} readOnly className="yzt-readonly" title="לא ניתן לשנות כתובת של כתבה קיימת" />
            </label>
          </div>

          <label className="yzt-field"><span>תקציר (excerpt)</span>
            <textarea dir="rtl" rows={2} value={active.excerpt || ''} onChange={(e) => setField(active.slug, 'excerpt', e.target.value)} onBlur={commit} placeholder="שני משפטים על הזווית של הכתבה" />
          </label>

          <label className="yzt-field"><span>גוף הכתבה (Markdown) — לעריכה ולניסוח מחדש</span>
            <textarea dir="rtl" rows={18} className="yzt-body" value={active.body || ''} onChange={(e) => setField(active.slug, 'body', e.target.value)} onBlur={commit} placeholder="## כותרת משנה&#10;&#10;פסקה…" />
          </label>

          <div className="yzt-field">
            <span>תמונת כריכה (ריק = כריכה מעוצבת אוטומטית לפי הקטגוריה)</span>
            <ResponsiveImageField
              value={active.cover}
              folder="constructions"
              breakpoints={['desktop']}
              surfaceLabel="כריכת הכתבה"
              desktopAspect="16 / 10"
              onChange={(v) => setAndSave(active.slug, 'cover', v || '')}
            />
            <div className="yzt-ai-row">
              <AiImageButton promptText={aiPrompt(active)} folder="constructions" onImage={(url) => setAndSave(active.slug, 'cover', url)} />
              <span className="yzt-ai-hint">יוצר תמונה אוטומטית (OpenAI) ומעלה אותה ככריכה. דורש OPENAI_API_KEY ב-Vercel.</span>
            </div>
            <input dir="rtl" className="yzt-altinput" value={active.coverAlt || ''} onChange={(e) => setField(active.slug, 'coverAlt', e.target.value)} onBlur={commit} placeholder="תיאור התמונה (alt) לנגישות ו-SEO" />
          </div>
        </section>
      )}
    </div>
  )
}
