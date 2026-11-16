import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as api from './api.js'
import { findPaper, flatten, applyLook, convex } from './docscan.js'
import { popRoot } from './Select.jsx'
import { Icon } from './ui.jsx'

/* Crop and straighten a photographed receipt by hand, like the document scanner in iPhone Notes.
   Step 1, corners: the photo with four corners to drag (a magnifier shows the spot under the finger), "find the paper"
   puts them on the sheet, "whole picture" on the frame; arrow keys move the chosen corner (Shift: 5 times as far).
   Step 2, result: the flat page, a look (colour, grey, black and white, as photographed) and a quarter turn.
   Save makes it the document's file (server: crop-save). The photo as it was taken stays with the document as an
   attachment, and every later edit starts again from it, so nothing is lost by cropping too tight. */
const SRC_MAX = 3000          // the photo is worked on at most this big (memory on a phone)
const LOOKS = [['color', 'צבע'], ['gray', 'אפור'], ['bw', 'שחור-לבן'], ['none', 'מקורי']]
const LABEL = ['הפינה הימנית העליונה', 'הפינה השמאלית העליונה', 'הפינה השמאלית התחתונה', 'הפינה הימנית התחתונה']

export default function CropEditor({ doc, onClose, onSaved }) {
  const [src, setSrc] = useState(null)            // { canvas, w, h, from: 'original' | 'file' }
  const [err, setErr] = useState('')
  const [corners, setCorners] = useState(null)    // [tl, tr, br, bl] as fractions of the photo
  const [step, setStep] = useState('corners')
  const [look, setLook] = useState('color')
  const [turn, setTurn] = useState(0)
  const [active, setActive] = useState(-1)
  const [drag, setDrag] = useState(-1)
  const [busy, setBusy] = useState(false)
  const stage = useRef(null)
  const loupe = useRef(null)
  const resultRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  // the photo as it was taken when it is kept, else the document's file
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const orig = (await api.loadAttachments(doc.id).catch(() => [])).find((a) => a.kind === 'file' && String(a.note || '').startsWith('הצילום המקורי'))
        const blob = orig ? await api.attachmentBlob(orig) : await api.fileBlob(doc)
        const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
        const k = Math.min(1, SRC_MAX / Math.max(bmp.width, bmp.height))
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.()
        if (!alive) return
        setSrc({ canvas: c, w: c.width, h: c.height, from: orig ? 'original' : 'file' })
        setCorners(auto(c) || full())
      } catch (e) { if (alive) setErr(`לא הצלחנו לפתוח את התמונה: ${e.message}`) }
    })()
    return () => { alive = false }
  }, [doc.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const full = () => [[0, 0], [1, 0], [1, 1], [0, 1]]
  function auto(c) {
    const g = c.getContext('2d').getImageData(0, 0, c.width, c.height)
    const f = findPaper(g.data, c.width, c.height)
    return f.skip ? null : f.corners.map(([x, y]) => [x / c.width, y / c.height])
  }

  // the photo fitted into the stage
  useEffect(() => {
    if (!stage.current) return undefined
    const ro = new ResizeObserver(() => setBox({ w: stage.current?.clientWidth || 0, h: stage.current?.clientHeight || 0 }))
    ro.observe(stage.current)
    return () => ro.disconnect()
  }, [src, step])
  const fit = useMemo(() => {
    if (!src || !box.w) return null
    const k = Math.min((box.w - 48) / src.w, (box.h - 48) / src.h)
    const w = src.w * k; const h = src.h * k
    return { k, w, h, x: (box.w - w) / 2, y: (box.h - h) / 2 }
  }, [src, box])
  const photoUrl = useMemo(() => (src ? src.canvas.toDataURL('image/jpeg', 0.9) : ''), [src])

  // dragging a corner
  const toFrac = (e) => {
    const r = stage.current.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left - fit.x) / fit.w)), Math.min(1, Math.max(0, (e.clientY - r.top - fit.y) / fit.h))]
  }
  const move = (i, p) => setCorners((cs) => { const n = cs.map((c) => [...c]); n[i] = p; return n })
  const onDown = (i) => (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); setDrag(i); setActive(i) }
  const onMove = (e) => { if (drag < 0 || !fit) return; move(drag, toFrac(e)); drawLoupe(drag, toFrac(e)) }
  const onUp = () => setDrag(-1)
  const onKey = (i) => (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!d) return
    e.preventDefault()
    const s = (e.shiftKey ? 0.05 : 0.01)
    const [x, y] = corners[i]; move(i, [Math.min(1, Math.max(0, x + d[0] * s)), Math.min(1, Math.max(0, y + d[1] * s))])
  }
  // the magnifier: the photo around the finger, twice as big, with a cross at the point
  function drawLoupe(i, [fx, fy]) {
    const c = loupe.current; if (!c || !src) return
    const g = c.getContext('2d'); const S = c.width; const R = 40 * (src.w / fit.w) / 2.5
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S)
    g.drawImage(src.canvas, fx * src.w - R, fy * src.h - R, R * 2, R * 2, 0, 0, S, S)
    g.strokeStyle = '#8cc4dc'; g.lineWidth = 2
    g.beginPath(); g.moveTo(S / 2, S / 2 - 12); g.lineTo(S / 2, S / 2 + 12); g.moveTo(S / 2 - 12, S / 2); g.lineTo(S / 2 + 12, S / 2); g.stroke()
  }

  const valid = corners && convex(corners.map(([x, y]) => [x * (src?.w || 1), y * (src?.h || 1)]))
  // step 2: the flat page in the chosen look, turned
  const result = useMemo(() => {
    if (step !== 'result' || !src || !corners) return null
    const img = src.canvas.getContext('2d').getImageData(0, 0, src.w, src.h)
    const f = flatten(img.data, src.w, src.h, corners.map(([x, y]) => [x * src.w, y * src.h]))
    applyLook(f.rgba, f.width, f.height, look)
    const c = document.createElement('canvas'); c.width = f.width; c.height = f.height
    c.getContext('2d').putImageData(new ImageData(f.rgba, f.width, f.height), 0, 0)
    if (!turn) return c
    const r = document.createElement('canvas'); const side = turn % 180 !== 0
    r.width = side ? c.height : c.width; r.height = side ? c.width : c.height
    const g = r.getContext('2d'); g.translate(r.width / 2, r.height / 2); g.rotate((turn * Math.PI) / 180); g.drawImage(c, -c.width / 2, -c.height / 2)
    return r
  }, [step, src, corners, look, turn])
  useEffect(() => {
    const host = resultRef.current
    if (!host) return
    host.replaceChildren()
    if (result) { result.className = 'fin-crop__page'; host.appendChild(result) }
  }, [result])

  const save = async () => {
    if (!result) return
    setBusy(true); setErr('')
    try {
      const blob = await new Promise((ok) => result.toBlob(ok, 'image/jpeg', 0.85))
      const saved = await api.saveCrop(doc, blob)
      onSaved?.(saved)
      onClose()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const pts = fit && corners ? corners.map(([x, y]) => [fit.x + x * fit.w, fit.y + y * fit.h]) : []
  return createPortal(
    <div className="fin-crop" role="dialog" aria-modal="true" aria-label="חיתוך ויישור">
      <header className="fin-crop__head">
        <button type="button" className="fin-crop__txt" onClick={onClose}>ביטול</button>
        <strong>{step === 'corners' ? 'גוררים את הפינות לקצוות הקבלה' : 'התוצאה'}</strong>
        {step === 'corners'
          ? <button type="button" className="fin-crop__txt is-main" disabled={!valid} onClick={() => setStep('result')}>המשך</button>
          : <button type="button" className="fin-crop__txt is-main" disabled={busy || !result} onClick={save}>{busy ? 'שומר…' : 'שמירה'}</button>}
      </header>
      {err && <p className="fin-crop__err" role="alert">{err}</p>}
      {!src && !err && <div className="fin-crop__stage" aria-busy="true"><span className="fin-crop__wait">טוען את הצילום…</span></div>}
      {src && step === 'corners' && (
        <div className="fin-crop__stage" ref={stage} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {fit && <img className="fin-crop__photo" src={photoUrl} alt="" draggable={false} style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h }} />}
          {fit && corners && (
            <svg className="fin-crop__svg" width={box.w} height={box.h} aria-hidden="true">
              <path d={`M0 0H${box.w}V${box.h}H0Z M${pts.map((p) => p.join(' ')).join(' L')}Z`} fillRule="evenodd" className="fin-crop__shade" />
              <polygon points={pts.map((p) => p.join(',')).join(' ')} className={`fin-crop__edge ${valid ? '' : 'is-bad'}`} />
            </svg>
          )}
          {fit && corners && pts.map(([x, y], i) => (
            <button key={i} type="button" className={`fin-crop__handle ${active === i ? 'is-on' : ''}`} style={{ left: x, top: y }}
              onPointerDown={onDown(i)} onFocus={() => setActive(i)} onKeyDown={onKey(i)} aria-label={`${LABEL[i]}. החצים מזיזים אותה`} />
          ))}
          {drag >= 0 && fit && <canvas ref={loupe} width={120} height={120} className="fin-crop__loupe" style={{ left: Math.min(box.w - 130, Math.max(10, pts[drag][0] - 60)), top: pts[drag][1] > 150 ? pts[drag][1] - 150 : pts[drag][1] + 40 }} aria-hidden="true" />}
        </div>
      )}
      {src && step === 'result' && <div className="fin-crop__stage fin-crop__result" ref={resultRef} aria-label="הקבלה אחרי חיתוך ויישור" />}
      <footer className="fin-crop__foot">
        {step === 'corners' ? (
          <>
            <button type="button" className="fin-crop__tool" onClick={() => setCorners(auto(src.canvas) || full())} disabled={!src}><Icon name="sparkle" size={18} /><span>זיהוי אוטומטי</span></button>
            <button type="button" className="fin-crop__tool" onClick={() => setCorners(full())} disabled={!src}><Icon name="expand" size={18} /><span>כל התמונה</span></button>
            {!valid && corners && <span className="fin-crop__hint" role="status">הפינות חוצות זו את זו. מסדרים אותן לפי הסדר.</span>}
          </>
        ) : (
          <>
            <button type="button" className="fin-crop__tool" onClick={() => setStep('corners')}><Icon name="chev" size={18} style={{ transform: 'rotate(-90deg)' }} /><span>חזרה לפינות</span></button>
            <span className="fin-crop__looks" role="radiogroup" aria-label="מראה">
              {LOOKS.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={look === k} className={look === k ? 'is-on' : ''} onClick={() => setLook(k)}>{l}</button>)}
            </span>
            <button type="button" className="fin-crop__tool" onClick={() => setTurn((t) => (t + 90) % 360)}><Icon name="rotate" size={18} /><span>סיבוב</span></button>
          </>
        )}
      </footer>
    </div>,
    popRoot(),
  )
}
