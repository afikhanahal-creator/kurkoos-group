import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import './image-editor.css'

/* ============================================================
   ImageEditor — עורך תמונות מודרני לאדמין.
   • מסגרת חיתוך (cover): לפי המקום באתר / לרוחב / לאורך / ריבוע / פס
   • גרירה, זום (סליידר + גלגלת), סיבוב חופשי + 90°, היפוכים
   • פילטרים עם תצוגה מקדימה חיה, כיוונון צבע, צביעה (Tint)
   • פינות מעוגלות, הסרת רקע לבן (ללוגואים)
   • השוואת לפני/אחרי בלחיצה ארוכה, ייצוא WebP ברזולוציה מלאה
   הכל בצד לקוח (Canvas). פלט: Blob שמועלה לאחסון.
   ============================================================ */

const ASPECTS = [
  { id: 'landscape', label: 'לרוחב', icon: '▭', w: 560, h: 380 },
  { id: 'portrait', label: 'לאורך', icon: '▯', w: 400, h: 540 },
  { id: 'square', label: 'ריבוע', icon: '◻', w: 470, h: 470 },
  { id: 'wide', label: 'פס רחב', icon: '▬', w: 660, h: 300 },
]

const PRESETS = [
  { id: 'none',  label: 'מקורי',    f: { brightness: 100, contrast: 100, saturate: 100, hue: 0, sepia: 0, grayscale: 0 } },
  { id: 'vivid', label: 'חי',       f: { brightness: 104, contrast: 116, saturate: 160, hue: 0, sepia: 0, grayscale: 0 } },
  { id: 'warm',  label: 'חמים',     f: { brightness: 104, contrast: 102, saturate: 120, hue: -10, sepia: 22, grayscale: 0 } },
  { id: 'cool',  label: 'קריר',     f: { brightness: 102, contrast: 104, saturate: 112, hue: 14, sepia: 0, grayscale: 0 } },
  { id: 'fade',  label: 'דהוי',     f: { brightness: 108, contrast: 88,  saturate: 82,  hue: 0, sepia: 10, grayscale: 0 } },
  { id: 'sepia', label: 'ספיה',     f: { brightness: 105, contrast: 100, saturate: 100, hue: 0, sepia: 62, grayscale: 0 } },
  { id: 'bw',    label: 'שחור לבן', f: { brightness: 106, contrast: 112, saturate: 0,   hue: 0, sepia: 0, grayscale: 100 } },
]
const BLENDS = [
  { id: 'multiply', label: 'הכהיה' },
  { id: 'screen', label: 'הבהרה' },
  { id: 'overlay', label: 'חפיפה' },
  { id: 'color', label: 'צבע' },
]
const TABS = [
  { id: 'crop', label: 'חיתוך ומיקום' },
  { id: 'look', label: 'פילטרים' },
  { id: 'color', label: 'צבע' },
  { id: 'bg', label: 'רקע' },
]

const NEUTRAL_F = PRESETS[0].f
const cssFilter = (f) => `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) sepia(${f.sepia}%) grayscale(${f.grayscale}%)`
const sameF = (a, b) => Object.keys(NEUTRAL_F).every((k) => a[k] === b[k])

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function parseAspect(a) {
  if (typeof a !== 'string') return null
  const p = a.split('/').map((x) => parseFloat(x.trim()))
  if (p.length === 2 && p[0] > 0 && p[1] > 0) return p[0] / p[1]
  return null
}

/* סליידר אחיד — מוגדר מחוץ לקומפוננטה כדי שלא יעשה remount בכל רינדור
   (remount באמצע גרירה מפיל את ה-pointer capture ושובר את הסליידר) */
function Slider({ label, min, max, step = 1, value, onChange, display }) {
  return (
    <label className="imed__slider">
      <span className="imed__slider-lbl">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
      <b className="imed__slider-val">{display ?? value}</b>
    </label>
  )
}

export default function ImageEditor({ src, onApply, onClose, busy = false, aspect = null }) {
  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const imgRef = useRef(null)
  const drag = useRef(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')
  const [ver, setVer] = useState(0)          // מאלץ ציור מחדש אחרי החלפת תמונת הבסיס (AI)

  const [tab, setTab] = useState('crop')
  const [compare, setCompare] = useState(false)   // לחיצה ארוכה על "לפני" — מציג את המקור
  const [thumb, setThumb] = useState('')          // תמונת בסיס קטנה לתצוגות הפילטרים

  // מסגרת "לפי המקום באתר" — מה שממסגרים כאן זה בדיוק מה שיוצג
  const surfaceFrame = useMemo(() => {
    const r = parseAspect(aspect)
    if (!r) return null
    return r >= 1
      ? { id: 'surface', label: 'לפי המקום', icon: '★', w: 560, h: Math.max(150, Math.round(560 / r)) }
      : { id: 'surface', label: 'לפי המקום', icon: '★', w: Math.max(150, Math.round(540 * r)), h: 540 }
  }, [aspect])
  const aspects = useMemo(() => (surfaceFrame ? [surfaceFrame, ...ASPECTS] : ASPECTS), [surfaceFrame])
  const [aspectId, setAspectId] = useState(surfaceFrame ? 'surface' : 'landscape')
  const ASP = aspects.find((a) => a.id === aspectId) || aspects[0]
  const FRAME_W = ASP.w
  const FRAME_H = ASP.h

  const [t, setT] = useState({ scale: 1, x: 0, y: 0, rot: 0, flipH: false, flipV: false })
  const [f, setF] = useState(NEUTRAL_F)
  const [tint, setTint] = useState({ color: '#105572', alpha: 0, blend: 'multiply' })
  const [bg, setBg] = useState({ remove: false, threshold: 238 })
  const [radius, setRadius] = useState(0)
  const activePreset = useMemo(() => PRESETS.find((p) => sameF(p.f, f))?.id || 'custom', [f])

  /* Esc לסגירה + נעילת גלילת הרקע (עם פיצוי סקרולבר נגד "קפיצה") */
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const sbw = window.innerWidth - document.documentElement.clientWidth
    const prevOverflow = document.body.style.overflow
    const prevPad = document.body.style.paddingInlineEnd
    document.body.style.overflow = 'hidden'
    if (sbw > 0) document.body.style.paddingInlineEnd = `${sbw}px`
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingInlineEnd = prevPad
    }
  }, [onClose])

  /* טעינת המקור. cache-bust מאלץ שליפת CORS נקייה כדי שהקנבס יוכל לייצא */
  useEffect(() => {
    setReady(false); setErr('')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgRef.current = img; setReady(true) }
    img.onerror = () => setErr('לא ניתן לטעון את התמונה לעריכה')
    img.src = src + (src.includes('?') ? '&' : '?') + 'cors=' + Date.now()
  }, [src])

  const filterStr = cssFilter(f)

  const draw = useCallback((canvas, k = 1, { neutral = false } = {}) => {
    const img = imgRef.current
    if (!img || !canvas) return
    const w = FRAME_W * k, h = FRAME_H * k
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    if (!neutral) ctx.filter = filterStr
    ctx.translate(w / 2 + t.x * k, h / 2 + t.y * k)
    ctx.rotate((t.rot * Math.PI) / 180)
    ctx.scale(t.scale * (t.flipH ? -1 : 1), t.scale * (t.flipV ? -1 : 1))
    // מילוי מלא של המסגרת (cover) — המסגרת חותכת, לא מרפדת בפסים ריקים
    const ar = img.width / img.height
    let dw = FRAME_W * k, dh = dw / ar
    if (dh < FRAME_H * k) { dh = FRAME_H * k; dw = dh * ar }
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
    ctx.restore()
    if (!neutral && bg.remove) {
      try {
        const id = ctx.getImageData(0, 0, w, h)
        const d = id.data, thr = bg.threshold
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] >= thr && d[i + 1] >= thr && d[i + 2] >= thr) d[i + 3] = 0
        }
        ctx.putImageData(id, 0, 0)
      } catch { /* tainted — מתעלמים */ }
    }
    if (!neutral && tint.alpha > 0) {
      ctx.save()
      ctx.globalAlpha = tint.alpha
      ctx.globalCompositeOperation = tint.blend
      ctx.fillStyle = tint.color
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
    if (!neutral && radius > 0) {
      const r = radius * Math.min(w, h)
      ctx.save()
      ctx.globalCompositeOperation = 'destination-in'
      ctx.fillStyle = '#000'
      roundRectPath(ctx, 0, 0, w, h, r)
      ctx.fill()
      ctx.restore()
    }
  }, [filterStr, t, bg, tint, radius, FRAME_W, FRAME_H])

  useEffect(() => { if (ready) draw(canvasRef.current, 1, { neutral: compare }) }, [draw, ready, ver, compare])

  /* תמונת בסיס קטנה לתצוגות המקדימות של הפילטרים (הפילטר עצמו — CSS חי) */
  useEffect(() => {
    if (!ready || !imgRef.current) return
    try {
      const img = imgRef.current
      const c = document.createElement('canvas')
      const tw = 96, th = 64
      c.width = tw; c.height = th
      const ctx = c.getContext('2d')
      const ar = img.width / img.height
      let dw = tw, dh = dw / ar
      if (dh < th) { dh = th; dw = dh * ar }
      ctx.drawImage(img, (tw - dw) / 2, (th - dh) / 2, dw, dh)
      setThumb(c.toDataURL('image/jpeg', 0.7))
    } catch { setThumb('') }
  }, [ready, ver])

  /* גרירה — מפוצה על יחס התצוגה (הקנבס מוצג מוקטן במסכים צרים) */
  const dispRatio = () => {
    const el = canvasRef.current
    return el ? (el.getBoundingClientRect().width || FRAME_W) / FRAME_W : 1
  }
  const onDown = (e) => {
    drag.current = { sx: e.clientX, sy: e.clientY, bx: t.x, by: t.y, r: dispRatio() }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    setT((p) => ({ ...p, x: d.bx + (e.clientX - d.sx) / d.r, y: d.by + (e.clientY - d.sy) / d.r }))
  }
  const onUp = () => { drag.current = null }

  /* זום בגלגלת העכבר מעל הקנבס */
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const d = e.deltaY < 0 ? 0.08 : -0.08
      setT((p) => ({ ...p, scale: Math.min(5, Math.max(0.2, Math.round((p.scale + d) * 100) / 100)) }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const reset = () => {
    setT({ scale: 1, x: 0, y: 0, rot: 0, flipH: false, flipV: false })
    setF(NEUTRAL_F)
    setTint({ color: '#105572', alpha: 0, blend: 'multiply' })
    setBg({ remove: false, threshold: 238 })
    setRadius(0)
  }

  /* ייצוא: הצד הארוך = רזולוציית המקור (תקרה 4096, רצפה 1280) */
  const srcLong = ready && imgRef.current ? Math.max(imgRef.current.width, imgRef.current.height) : 0
  const targetLong = srcLong ? Math.min(4096, Math.max(1280, srcLong)) : 1920
  const exportK = targetLong / Math.max(FRAME_W, FRAME_H)

  /* רשת ביטחון: פסים שקופים שנשארו בשוליים נחתכים לפני השמירה */
  const trimTransparentEdges = (c) => {
    try {
      const ctx = c.getContext('2d', { willReadFrequently: true })
      const { width: w, height: h } = c
      const d = ctx.getImageData(0, 0, w, h).data
      const rowEmpty = (y) => { for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 8) return false; return true }
      const colEmpty = (x) => { for (let y = 0; y < h; y += 2) if (d[(y * w + x) * 4 + 3] > 8) return false; return true }
      let top = 0; while (top < h - 1 && rowEmpty(top)) top++
      let bottom = h - 1; while (bottom > top && rowEmpty(bottom)) bottom--
      let left = 0; while (left < w - 1 && colEmpty(left)) left++
      let right = w - 1; while (right > left && colEmpty(right)) right--
      const sw = right - left + 1, sh = bottom - top + 1
      if (sw >= w - 2 && sh >= h - 2) return c
      if (sw < 50 || sh < 50) return c
      const out = document.createElement('canvas')
      out.width = sw; out.height = sh
      out.getContext('2d').drawImage(c, left, top, sw, sh, 0, 0, sw, sh)
      return out
    } catch { return c }
  }

  const apply = () => {
    try {
      const c = trimTransparentEdges((() => { const cv = document.createElement('canvas'); draw(cv, exportK); return cv })())
      c.toBlob((blob) => { if (blob) onApply(blob); else setErr('הייצוא נכשל') }, 'image/webp', 0.95)
    } catch { setErr('הייצוא נכשל (ייתכן שמקור התמונה חוסם עריכה)') }
  }

  const setFf = (k) => (e) => setF((p) => ({ ...p, [k]: Number(e.target.value) }))
  const bumpScale = (d) => setT((p) => ({ ...p, scale: Math.min(5, Math.max(0.2, Math.round((p.scale + d) * 100) / 100)) }))

  return createPortal((
    <div className="imed" onClick={onClose}>
      <div className="imed__box" dir="rtl" onClick={(e) => e.stopPropagation()}>

        <header className="imed__head">
          <h3>עורך התמונה</h3>
          <div className="imed__head-actions">
            <button
              type="button" className="imed__compare" disabled={!ready}
              onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)}
              onPointerLeave={() => setCompare(false)} onPointerCancel={() => setCompare(false)}
              title="החזיקו כדי לראות את המקור"
            >
              {compare ? 'המקור' : 'לפני / אחרי'}
            </button>
            <button type="button" className="imed__reset" onClick={reset}>איפוס הכל</button>
            <button type="button" className="imed__x" onClick={onClose} aria-label="סגירה" title="סגירה (Esc)">✕</button>
          </div>
        </header>

        <div className="imed__body">
          {/* ==== במה ==== */}
          <div className="imed__stage" ref={stageRef}>
            <div className="imed__aspects" role="tablist" aria-label="מסגרת החיתוך">
              {aspects.map((a) => (
                <button
                  key={a.id} type="button" role="tab" aria-selected={aspectId === a.id}
                  className={`imed__aspbtn ${aspectId === a.id ? 'is-active' : ''}`}
                  onClick={() => setAspectId(a.id)}
                >
                  <i aria-hidden="true">{a.icon}</i>{a.label}
                </button>
              ))}
            </div>

            <div className="imed__canvas-wrap">
              {err
                ? <div className="imed__err">{err}</div>
                : (
                  <canvas
                    ref={canvasRef}
                    className={`imed__canvas ${compare ? 'is-compare' : ''}`}
                    style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}`, maxWidth: FRAME_W }}
                    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                    onDoubleClick={() => setT((p) => ({ ...p, x: 0, y: 0 }))}
                  />
                )}
              {!ready && !err && <div className="imed__loading"><span className="imed__spin" />טוען תמונה…</div>}
            </div>

            <div className="imed__zoombar">
              <button type="button" className="imed__step" onClick={() => bumpScale(-0.1)} aria-label="הקטנה">−</button>
              <input type="range" min="0.2" max="5" step="0.01" value={t.scale} onChange={(e) => setT((p) => ({ ...p, scale: Number(e.target.value) }))} aria-label="זום" />
              <button type="button" className="imed__step" onClick={() => bumpScale(0.1)} aria-label="הגדלה">+</button>
              <b className="imed__zoom-val">{Math.round(t.scale * 100)}%</b>
              <span className="imed__hint">גרירה להזזה · גלגלת לזום · לחיצה כפולה למרכוז</span>
            </div>
          </div>

          {/* ==== פאנל ==== */}
          <div className="imed__panel">
            <div className="imed__tabs" role="tablist">
              {TABS.map((tb) => (
                <button key={tb.id} type="button" role="tab" aria-selected={tab === tb.id}
                  className={`imed__tab ${tab === tb.id ? 'is-active' : ''}`} onClick={() => setTab(tb.id)}>
                  {tb.label}
                </button>
              ))}
            </div>

            <div className="imed__panel-body">
              {tab === 'crop' && (
                <>
                  <section className="imed__group">
                    <h4>סיבוב והיפוך</h4>
                    <div className="imed__btnrow">
                      <button type="button" onClick={() => setT((p) => ({ ...p, rot: p.rot - 90 }))}>↺ 90°</button>
                      <button type="button" onClick={() => setT((p) => ({ ...p, rot: p.rot + 90 }))}>↻ 90°</button>
                      <button type="button" className={t.flipH ? 'is-active' : ''} onClick={() => setT((p) => ({ ...p, flipH: !p.flipH }))}>⇋ אופקי</button>
                      <button type="button" className={t.flipV ? 'is-active' : ''} onClick={() => setT((p) => ({ ...p, flipV: !p.flipV }))}>⥯ אנכי</button>
                    </div>
                    <Slider label="סיבוב עדין" min={-45} max={45} value={t.rot > 180 ? t.rot - 360 : t.rot} display={`${t.rot}°`} onChange={(e) => setT((p) => ({ ...p, rot: Number(e.target.value) }))} />
                  </section>

                  <section className="imed__group">
                    <h4>פינות</h4>
                    <div className="imed__seg">
                      <button type="button" className={radius === 0 ? 'is-active' : ''} onClick={() => setRadius(0)}>רגילות</button>
                      <button type="button" className={radius > 0 && radius < 0.5 ? 'is-active' : ''} onClick={() => setRadius((r) => (r > 0 && r < 0.5 ? r : 0.12))}>מעוגלות</button>
                      <button type="button" className={radius >= 0.5 ? 'is-active' : ''} onClick={() => setRadius(0.5)}>עיגול מלא</button>
                    </div>
                    {radius > 0 && radius < 0.5 && (
                      <Slider label="עוצמת עיגול" min={0.02} max={0.4} step={0.01} value={radius} display={`${Math.round(radius * 100)}%`} onChange={(e) => setRadius(Number(e.target.value))} />
                    )}
                    <p className="imed__note imed__note--soft">שימו לב: האתר מעגל פינות אוטומטית בכרטיסים ובגלריות — עיגול כאן נצרב בקובץ עצמו.</p>
                  </section>
                </>
              )}

              {tab === 'look' && (
                <section className="imed__group">
                  <h4>פילטרים מוכנים</h4>
                  <div className="imed__presets">
                    {PRESETS.map((p) => (
                      <button key={p.id} type="button"
                        className={`imed__preset ${activePreset === p.id ? 'is-active' : ''}`}
                        onClick={() => setF(p.f)}>
                        {thumb
                          ? <img src={thumb} alt="" style={{ filter: cssFilter(p.f) }} draggable="false" />
                          : <span className="imed__preset-ph" />}
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                  {activePreset === 'custom' && <p className="imed__note imed__note--soft">כיוונון מותאם אישית (טאב "צבע")</p>}
                </section>
              )}

              {tab === 'color' && (
                <>
                  <section className="imed__group">
                    <h4>כיוונון צבע</h4>
                    <Slider label="בהירות" min={50} max={160} value={f.brightness} onChange={setFf('brightness')} />
                    <Slider label="ניגודיות" min={50} max={180} value={f.contrast} onChange={setFf('contrast')} />
                    <Slider label="רוויה" min={0} max={220} value={f.saturate} onChange={setFf('saturate')} />
                    <Slider label="גוון" min={-180} max={180} value={f.hue} display={`${f.hue}°`} onChange={setFf('hue')} />
                    <button type="button" className="imed__minireset" onClick={() => setF(NEUTRAL_F)}>איפוס כיוונון</button>
                  </section>

                  <section className="imed__group">
                    <h4>צביעה (Tint)</h4>
                    <div className="imed__tintrow">
                      <input type="color" value={tint.color} onChange={(e) => setTint((p) => ({ ...p, color: e.target.value }))} aria-label="בחירת צבע" />
                      <select value={tint.blend} onChange={(e) => setTint((p) => ({ ...p, blend: e.target.value }))}>
                        {BLENDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                      </select>
                    </div>
                    <Slider label="עוצמה" min={0} max={1} step={0.02} value={tint.alpha} display={`${Math.round(tint.alpha * 100)}%`} onChange={(e) => setTint((p) => ({ ...p, alpha: Number(e.target.value) }))} />
                  </section>
                </>
              )}

              {tab === 'bg' && (
                <section className="imed__group">
                  <h4>הסרת רקע</h4>
                  <label className="imed__check">
                    <input type="checkbox" checked={bg.remove} onChange={(e) => setBg((p) => ({ ...p, remove: e.target.checked }))} />
                    הסרת רקע לבן (מהיר, ללוגואים)
                  </label>
                  {bg.remove && <Slider label="רגישות" min={180} max={255} value={bg.threshold} onChange={(e) => setBg((p) => ({ ...p, threshold: Number(e.target.value) }))} />}
                  <p className="imed__note imed__note--soft">הרקע שמוסר נשמר כשקיפות. באתר יוצג על רקע העמוד.</p>
                </section>
              )}
            </div>
          </div>
        </div>

        <footer className="imed__foot">
          <span className="imed__quality">
            נשמר ב-{Math.round(FRAME_W * exportK)}×{Math.round(FRAME_H * exportK)}px · WebP · האיכות מוגבלת לרזולוציית המקור
          </span>
          <div className="imed__foot-end">
            <button type="button" className="imed__btn" onClick={onClose}>ביטול</button>
            <button type="button" className="imed__btn imed__btn--primary" disabled={busy || !ready} onClick={apply}>
              {busy ? <><span className="imed__spin" /> שומר…</> : 'החל ושמור'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  ), document.body)
}
