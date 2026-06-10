import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './image-editor.css'

/* ============================================================
   ImageEditor — עורך תמונות (בסגנון Canva) לוגו/תמונות.
   • הזזה (גרירה בעכבר/נייד), זום, סיבוב, היפוך
   • פילטרים מוכנים + סליידרים (בהירות/ניגודיות/רוויה/גוון)
   • צביעה (tint) עם בורר צבע + שקיפות + מצב מיזוג
   • הסרת רקע לבן (סף) — מצוין ללוגואים על רקע לבן
   • ייצוא ברזולוציה גבוהה (x1/x2/x3) → PNG שקוף
   הכל בצד-לקוח (Canvas). פלט: Blob שמועלה לאחסון.
   ============================================================ */

const FRAME_W = 560
const FRAME_H = 380

const PRESETS = [
  { id: 'none',  label: 'מקורי',     f: { brightness: 100, contrast: 100, saturate: 100, hue: 0, sepia: 0, grayscale: 0 } },
  { id: 'vivid', label: 'חי',        f: { brightness: 104, contrast: 116, saturate: 160, hue: 0, sepia: 0, grayscale: 0 } },
  { id: 'warm',  label: 'חמים',      f: { brightness: 104, contrast: 102, saturate: 120, hue: -10, sepia: 22, grayscale: 0 } },
  { id: 'cool',  label: 'קריר',      f: { brightness: 102, contrast: 104, saturate: 112, hue: 14, sepia: 0, grayscale: 0 } },
  { id: 'fade',  label: 'דהוי',      f: { brightness: 108, contrast: 88,  saturate: 82,  hue: 0, sepia: 10, grayscale: 0 } },
  { id: 'sepia', label: 'ספיה',      f: { brightness: 105, contrast: 100, saturate: 100, hue: 0, sepia: 62, grayscale: 0 } },
  { id: 'bw',    label: 'שחור-לבן',  f: { brightness: 106, contrast: 112, saturate: 0,   hue: 0, sepia: 0, grayscale: 100 } },
]
const BLENDS = [
  { id: 'multiply', label: 'הכהיה' },
  { id: 'screen', label: 'הבהרה' },
  { id: 'overlay', label: 'חפיפה' },
  { id: 'color', label: 'צבע' },
]

export default function ImageEditor({ src, onApply, onClose, busy = false }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const drag = useRef(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')
  const [ver, setVer] = useState(0)          // מאלץ ציור מחדש אחרי החלפת תמונת הבסיס (AI)
  const [aiBusy, setAiBusy] = useState(false)
  const [t, setT] = useState({ scale: 1, x: 0, y: 0, rot: 0, flipH: false, flipV: false })
  const [f, setF] = useState(PRESETS[0].f)
  const [tint, setTint] = useState({ color: '#105572', alpha: 0, blend: 'multiply' })
  const [bg, setBg] = useState({ remove: false, threshold: 238 })
  const [out, setOut] = useState(2)

  // סגירה ב-Escape + נעילת גלילת הרקע כל עוד העורך פתוח
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  useEffect(() => {
    setReady(false); setErr('')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imgRef.current = img; setReady(true) }
    img.onerror = () => setErr('לא ניתן לטעון את התמונה לעריכה')
    img.src = src
  }, [src])

  const filterStr = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturate}%) hue-rotate(${f.hue}deg) sepia(${f.sepia}%) grayscale(${f.grayscale}%)`

  const draw = useCallback((canvas, k = 1) => {
    const img = imgRef.current
    if (!img || !canvas) return
    const w = FRAME_W * k, h = FRAME_H * k
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.filter = filterStr
    ctx.translate(w / 2 + t.x * k, h / 2 + t.y * k)
    ctx.rotate((t.rot * Math.PI) / 180)
    ctx.scale(t.scale * (t.flipH ? -1 : 1), t.scale * (t.flipV ? -1 : 1))
    // בסיס: התאמת התמונה ל"contain" בתוך המסגרת
    const ar = img.width / img.height
    let dw = FRAME_W * k, dh = dw / ar
    if (dh > FRAME_H * k) { dh = FRAME_H * k; dw = dh * ar }
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
    ctx.restore()
    // הסרת רקע לבן
    if (bg.remove) {
      try {
        const id = ctx.getImageData(0, 0, w, h)
        const d = id.data, thr = bg.threshold
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] >= thr && d[i + 1] >= thr && d[i + 2] >= thr) d[i + 3] = 0
        }
        ctx.putImageData(id, 0, 0)
      } catch { /* tainted — מתעלמים */ }
    }
    // צביעה (tint)
    if (tint.alpha > 0) {
      ctx.save()
      ctx.globalAlpha = tint.alpha
      ctx.globalCompositeOperation = tint.blend
      ctx.fillStyle = tint.color
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }, [filterStr, t, bg, tint])

  useEffect(() => { if (ready) draw(canvasRef.current, 1) }, [draw, ready, ver])

  // הסרת רקע אוטומטית (AI) — רץ בדפדפן, חינמי, ללא מפתח (@imgly/background-removal)
  const removeBgAi = async () => {
    setAiBusy(true); setErr('')
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const resultBlob = await removeBackground(src)
      const url = URL.createObjectURL(resultBlob)
      const img = new Image()
      img.onload = () => { imgRef.current = img; URL.revokeObjectURL(url); setVer((v) => v + 1) }
      img.onerror = () => { URL.revokeObjectURL(url); setErr('טעינת התוצאה נכשלה') }
      img.src = url
    } catch (e) {
      setErr('הסרת הרקע נכשלה: ' + (e?.message || e))
    } finally { setAiBusy(false) }
  }

  const onDown = (e) => { drag.current = { sx: e.clientX, sy: e.clientY, bx: t.x, by: t.y }; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ } }
  const onMove = (e) => { const d = drag.current; if (!d) return; setT((p) => ({ ...p, x: d.bx + (e.clientX - d.sx), y: d.by + (e.clientY - d.sy) })) }
  const onUp = () => { drag.current = null }

  const reset = () => { setT({ scale: 1, x: 0, y: 0, rot: 0, flipH: false, flipV: false }); setF(PRESETS[0].f); setTint({ color: '#105572', alpha: 0, blend: 'multiply' }); setBg({ remove: false, threshold: 238 }) }

  const apply = () => {
    try {
      const c = document.createElement('canvas')
      draw(c, out)
      c.toBlob((blob) => { if (blob) onApply(blob); else setErr('הייצוא נכשל') }, 'image/png')
    } catch { setErr('הייצוא נכשל (ייתכן שמקור התמונה חוסם עריכה)') }
  }

  const setFf = (k) => (e) => setF((p) => ({ ...p, [k]: Number(e.target.value) }))

  return createPortal((
    <div className="imed" onClick={onClose}>
      <div className="imed__box" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <header className="imed__head">
          <h3>עורך התמונה</h3>
          <button type="button" className="imed__x" onClick={onClose} aria-label="סגירה" title="סגירה (Esc)">✕</button>
        </header>

        <div className="imed__body">
          <div className="imed__stage">
            {err
              ? <div className="imed__err">{err}</div>
              : (
                <canvas
                  ref={canvasRef}
                  className="imed__canvas"
                  style={{ width: FRAME_W, height: FRAME_H }}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                />
              )}
            <span className="imed__hint">גררו את התמונה להזזה · השתמשו בזום למיקום מדויק</span>
          </div>

          <div className="imed__panel">
            {/* טרנספורם */}
            <section className="imed__group">
              <h4>מיקום וסיבוב</h4>
              <div className="imed__btnrow">
                <button type="button" onClick={() => setT((p) => ({ ...p, rot: p.rot - 90 }))}>↺ 90°</button>
                <button type="button" onClick={() => setT((p) => ({ ...p, rot: p.rot + 90 }))}>↻ 90°</button>
                <button type="button" onClick={() => setT((p) => ({ ...p, flipH: !p.flipH }))}>⇋ היפוך אופקי</button>
                <button type="button" onClick={() => setT((p) => ({ ...p, flipV: !p.flipV }))}>⥯ היפוך אנכי</button>
              </div>
              <label className="imed__slider">זום <input type="range" min="0.2" max="4" step="0.01" value={t.scale} onChange={(e) => setT((p) => ({ ...p, scale: Number(e.target.value) }))} /><b>{Math.round(t.scale * 100)}%</b></label>
              <label className="imed__slider">סיבוב <input type="range" min="-180" max="180" step="1" value={t.rot} onChange={(e) => setT((p) => ({ ...p, rot: Number(e.target.value) }))} /><b>{t.rot}°</b></label>
            </section>

            {/* פילטרים מוכנים */}
            <section className="imed__group">
              <h4>פילטרים</h4>
              <div className="imed__presets">
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" className="imed__preset" onClick={() => setF(p.f)}>{p.label}</button>
                ))}
              </div>
            </section>

            {/* כיוונונים */}
            <section className="imed__group">
              <h4>כיוונון צבע</h4>
              <label className="imed__slider">בהירות <input type="range" min="50" max="160" value={f.brightness} onChange={setFf('brightness')} /><b>{f.brightness}</b></label>
              <label className="imed__slider">ניגודיות <input type="range" min="50" max="180" value={f.contrast} onChange={setFf('contrast')} /><b>{f.contrast}</b></label>
              <label className="imed__slider">רוויה <input type="range" min="0" max="220" value={f.saturate} onChange={setFf('saturate')} /><b>{f.saturate}</b></label>
              <label className="imed__slider">גוון <input type="range" min="-180" max="180" value={f.hue} onChange={setFf('hue')} /><b>{f.hue}°</b></label>
            </section>

            {/* צביעה */}
            <section className="imed__group">
              <h4>צביעה (Tint)</h4>
              <div className="imed__tintrow">
                <input type="color" value={tint.color} onChange={(e) => setTint((p) => ({ ...p, color: e.target.value }))} aria-label="בחירת צבע" />
                <select value={tint.blend} onChange={(e) => setTint((p) => ({ ...p, blend: e.target.value }))}>
                  {BLENDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
              </div>
              <label className="imed__slider">עוצמה <input type="range" min="0" max="1" step="0.02" value={tint.alpha} onChange={(e) => setTint((p) => ({ ...p, alpha: Number(e.target.value) }))} /><b>{Math.round(tint.alpha * 100)}%</b></label>
            </section>

            {/* רקע */}
            <section className="imed__group">
              <h4>רקע</h4>
              <button type="button" className="imed__btn imed__btn--ai" disabled={aiBusy} onClick={removeBgAi}>
                {aiBusy ? '✨ מסיר רקע… (טעינה ראשונה עד דקה)' : '✨ הסר רקע אוטומטית (AI)'}
              </button>
              <label className="imed__check"><input type="checkbox" checked={bg.remove} onChange={(e) => setBg((p) => ({ ...p, remove: e.target.checked }))} /> הסר רקע לבן (מהיר)</label>
              {bg.remove && <label className="imed__slider">סף <input type="range" min="180" max="255" value={bg.threshold} onChange={(e) => setBg((p) => ({ ...p, threshold: Number(e.target.value) }))} /><b>{bg.threshold}</b></label>}
            </section>

            {/* רזולוציה */}
            <section className="imed__group">
              <h4>איכות / רזולוציה</h4>
              <div className="imed__btnrow imed__btnrow--seg">
                {[1, 2, 3].map((k) => (
                  <button key={k} type="button" className={out === k ? 'is-active' : ''} onClick={() => setOut(k)}>×{k}</button>
                ))}
              </div>
              <p className="imed__note">פלט: {FRAME_W * out}×{FRAME_H * out}px (PNG שקוף)</p>
            </section>
          </div>
        </div>

        <footer className="imed__foot">
          <button type="button" className="imed__btn" onClick={reset}>איפוס</button>
          <div className="imed__foot-end">
            <button type="button" className="imed__btn" onClick={onClose}>ביטול</button>
            <button type="button" className="imed__btn imed__btn--primary" disabled={busy || !ready} onClick={apply}>{busy ? 'שומר…' : 'החל ושמור'}</button>
          </div>
        </footer>
      </div>
    </div>
  ), document.body)
}
