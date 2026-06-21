import { useState, useEffect, useRef } from 'react'
import { fetchSettings, setSetting } from '../../lib/cms.js'
import defaultTestimonials from '../../data/testimonials.js'
import ResponsiveImageField from './ResponsiveImageField.jsx'
import ImageManager from './ImageManager.jsx'
import { toast } from '../../lib/toast.js'
import './TestimonialsTab.css'

/* ============================================================
   TestimonialsTab — ניהול כרטיסיות ההמלצות (סליידר בעמוד הבית).
   לכל המלצה: שם, פרויקט, ציטוט (עברית + אנגלית) ותמונת לקוח שניתן
   להחליף/לערוך (חיתוך, מיקוד, זום). אפשר להוסיף, למחוק ולשנות סדר.
   הנתונים נשמרים בהגדרה אחת (testimonials) כמערך JSON; ללא נתונים —
   האתר נופל-לאחור להמלצות ברירת המחדל מהקוד.
   ============================================================ */

function parseList(raw) {
  if (!raw) return null
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : null
  } catch {
    return null
  }
}

const blank = () => ({
  id: (crypto.randomUUID && crypto.randomUUID()) || `t-${Date.now()}`,
  name: { he: '', en: '' },
  project: { he: '', en: '' },
  quote: { he: '', en: '' },
  image: '',
  photos: [],   // תמונות מהבית — מוצגות בקטן בכרטיס, נפתחות במסך מלא
  archived: false, // בארכיון = מוסתר מהאתר, נשמר ב-CMS לשחזור
})

// משכפל המלצה ברירת-מחדל למבנה אחיד (id מחרוזת, שדות דו-לשוניים)
const fromDefault = (t) => ({
  id: String(t.id),
  name: { he: t.name?.he || '', en: t.name?.en || '' },
  project: { he: t.project?.he || '', en: t.project?.en || '' },
  quote: { he: t.quote?.he || '', en: t.quote?.en || '' },
  image: t.image || '',
  photos: Array.isArray(t.photos) ? t.photos : [],
  archived: !!t.archived,
})

export default function TestimonialsTab() {
  const [list, setList] = useState(null) // null = טוען
  const [saving, setSaving] = useState(false)
  // ref למצב העדכני ביותר — לשמירה אמינה גם בתוך onBlur/אסינכרוני
  const listRef = useRef([])

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        const stored = parseList(s.testimonials)
        const init = stored || defaultTestimonials.map(fromDefault)
        listRef.current = init
        setList(init)
      })
      .catch(() => {
        const init = defaultTestimonials.map(fromDefault)
        listRef.current = init
        setList(init)
      })
  }, [])

  const persist = async (next) => {
    listRef.current = next
    setSaving(true)
    try {
      await setSetting('testimonials', JSON.stringify(next))
      toast.success('ההמלצות נשמרו')
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  // עדכון שדה מקומי (ללא שמירה) — שמירה מתבצעת ב-onBlur / בפעולות מבניות
  const setField = (id, path, value) => {
    setList((prev) => {
      const next = prev.map((it) => {
        if (it.id !== id) return it
        const copy = { ...it }
        if (path.length === 2) copy[path[0]] = { ...copy[path[0]], [path[1]]: value }
        else copy[path[0]] = value
        return copy
      })
      listRef.current = next
      return next
    })
  }

  const commit = () => persist(listRef.current)

  const setImage = (id, val) => {
    setList((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, image: val || '' } : it))
      persist(next)
      return next
    })
  }

  const setPhotos = (id, photos) => {
    setList((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, photos: Array.isArray(photos) ? photos : [] } : it))
      persist(next)
      return next
    })
  }

  const addItem = () => {
    const next = [...listRef.current, blank()]
    setList(next)
    persist(next)
  }

  // מחיקה לצמיתות — מסירה את הממליץ מה-CMS ומהאתר לחלוטין (לא ניתן לשחזר)
  const removeItem = (id) => {
    if (!window.confirm('למחוק את הממליץ לצמיתות? הוא יוסר כליל מה-CMS ומהאתר — לא ניתן לשחזר.')) return
    const next = listRef.current.filter((it) => it.id !== id)
    setList(next)
    persist(next)
  }

  // העברה לארכיון / החזרה לאתר — מוסתר מהפרונט אך נשמר ב-CMS לשחזור מהיר
  const toggleArchive = (id) => {
    const next = listRef.current.map((it) => (it.id === id ? { ...it, archived: !it.archived } : it))
    setList(next)
    persist(next)
  }

  const move = (id, dir) => {
    const arr = [...listRef.current]
    const i = arr.findIndex((it) => it.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    setList(arr)
    persist(arr)
  }

  const resetToDefaults = async () => {
    if (!window.confirm('לשחזר את המלצות ברירת המחדל? פעולה זו תחליף את הרשימה הנוכחית.')) return
    const next = defaultTestimonials.map(fromDefault)
    setList(next)
    await persist(next)
  }

  if (!list) {
    return (
      <div className="adm-msg adm-msg--loading">
        <span className="adm-spin" />טוען…
      </div>
    )
  }

  return (
    <div className="tst-tab">
      <div className="tst-tab__bar">
        <p className="tst-tab__intro">
          ניהול כרטיסיות ההמלצות שמופיעות בסליידר בעמוד הבית. ערכו שם, פרויקט וציטוט
          (עברית ואנגלית), והחליפו/ערכו את תמונת הלקוח של כל כרטיסייה. שינויים נשמרים
          אוטומטית ומתעדכנים באתר.
        </p>
        <div className="tst-tab__actions">
          <button type="button" className="tst-tab__reset" onClick={resetToDefaults} disabled={saving}>
            שחזור ברירת מחדל
          </button>
          <button type="button" className="btn btn--primary tst-tab__add" onClick={addItem} disabled={saving}>
            ＋ הוספת המלצה
          </button>
        </div>
      </div>

      {list.length === 0 && (
        <p className="tst-tab__empty">אין המלצות. הוסיפו המלצה ראשונה כדי שהסקשן יוצג באתר.</p>
      )}

      <div className="tst-grid">
        {list.map((it, idx) => (
          <section className={`tst-card${it.archived ? ' tst-card--archived' : ''}`} key={it.id}>
            <header className="tst-card__head">
              <span className="tst-card__num">#{idx + 1}</span>
              {it.archived && <span className="tst-card__badge">בארכיון · לא מוצג באתר</span>}
              <div className="tst-card__order">
                <button type="button" onClick={() => move(it.id, -1)} disabled={idx === 0} aria-label="העלאה" title="העלאה">↑</button>
                <button type="button" onClick={() => move(it.id, 1)} disabled={idx === list.length - 1} aria-label="הורדה" title="הורדה">↓</button>
              </div>
              <button
                type="button"
                className="tst-card__archive"
                onClick={() => toggleArchive(it.id)}
                title={it.archived ? 'החזרה לאתר' : 'העברה לארכיון'}
              >
                {it.archived ? '↩ החזרה לאתר' : '📥 לארכיון'}
              </button>
              <button type="button" className="tst-card__del" onClick={() => removeItem(it.id)} aria-label="מחיקה לצמיתות" title="מחיקה לצמיתות">🗑</button>
            </header>

            <div className="tst-card__image">
              <span className="tst-card__lbl">תמונת הלקוח</span>
              <ResponsiveImageField
                value={it.image}
                folder="testimonials"
                breakpoints={['desktop']}
                surfaceLabel="כרטיס ההמלצה"
                desktopAspect="1 / 1"
                onChange={(v) => setImage(it.id, v)}
              />
            </div>

            <div className="tst-card__fields">
              <div className="tst-field">
                <label className="tst-card__lbl">שם (עברית)</label>
                <input dir="rtl" value={it.name.he} onChange={(e) => setField(it.id, ['name', 'he'], e.target.value)} onBlur={commit} placeholder="למשל: משפחת לוי" />
              </div>
              <div className="tst-field">
                <label className="tst-card__lbl">שם (אנגלית)</label>
                <input dir="ltr" value={it.name.en} onChange={(e) => setField(it.id, ['name', 'en'], e.target.value)} onBlur={commit} placeholder="The Levi family" />
              </div>
              <div className="tst-field">
                <label className="tst-card__lbl">פרויקט (עברית)</label>
                <input dir="rtl" value={it.project.he} onChange={(e) => setField(it.id, ['project', 'he'], e.target.value)} onBlur={commit} placeholder="פארק רזידנס, תל אביב" />
              </div>
              <div className="tst-field">
                <label className="tst-card__lbl">פרויקט (אנגלית)</label>
                <input dir="ltr" value={it.project.en} onChange={(e) => setField(it.id, ['project', 'en'], e.target.value)} onBlur={commit} placeholder="Park Residence, Tel Aviv" />
              </div>
              <div className="tst-field tst-field--full">
                <label className="tst-card__lbl">ציטוט (עברית)</label>
                <textarea dir="rtl" rows={3} value={it.quote.he} onChange={(e) => setField(it.id, ['quote', 'he'], e.target.value)} onBlur={commit} placeholder="מה הלקוח אמר…" />
              </div>
              <div className="tst-field tst-field--full">
                <label className="tst-card__lbl">ציטוט (אנגלית)</label>
                <textarea dir="ltr" rows={3} value={it.quote.en} onChange={(e) => setField(it.id, ['quote', 'en'], e.target.value)} onBlur={commit} placeholder="What the client said…" />
              </div>

              <div className="tst-field tst-field--full">
                <label className="tst-card__lbl">תמונות מהבית (גלריה)</label>
                <p className="tst-card__hint">תמונות יפות של הבית הגמור. מוצגות בקטן בצד הכרטיס, ונפתחות במסך מלא עם מעבר בין תמונה לתמונה — מעלה משמעותית את האמון של הקוראים.</p>
                <ImageManager
                  value={Array.isArray(it.photos) ? it.photos : []}
                  onChange={(v) => setPhotos(it.id, v)}
                  folder="testimonials"
                  max={8}
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
