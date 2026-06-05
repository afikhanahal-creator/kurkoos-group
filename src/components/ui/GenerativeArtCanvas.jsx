import { useRef, useEffect } from 'react'

/* ============================================================
   Generative Art — קווים נעים על קנבס. מבוסס Uiverse/Aceternity,
   הומר ל-JS ונצבע בצבעי המותג. ממלא את הקונטיינר ההורה.
   rgb = ערוצי הצבע של הקווים (ברירת מחדל: טורקיז בהיר).
   ============================================================ */
export default function GenerativeArtCanvas({ rgb = '91,168,200', count = 38 }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf
    let lines = []
    let w = 0
    let h = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      w = canvas.width = p.clientWidth || 300
      h = canvas.height = p.clientHeight || 200
    }

    class Line {
      constructor() { this.reset(true) }
      reset(spread) {
        this.x = Math.random() * w
        this.y = Math.random() * h
        this.speed = Math.random() * 0.5 + 0.1
        this.angle = Math.random() * Math.PI * 2
        this.length = Math.random() * 22 + 6
        if (!spread) { /* respawn */ }
      }
      update() {
        this.x += Math.cos(this.angle) * this.speed
        this.y += Math.sin(this.angle) * this.speed
        if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset()
      }
      draw() {
        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(this.x - Math.cos(this.angle) * this.length, this.y - Math.sin(this.angle) * this.length)
        ctx.strokeStyle = `rgba(${rgb}, ${Math.random() * 0.35 + 0.12})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    const init = () => { lines = Array.from({ length: count }, () => new Line()) }
    const animate = () => {
      ctx.clearRect(0, 0, w, h)
      lines.forEach((l) => { l.update(); l.draw() })
      raf = requestAnimationFrame(animate)
    }

    resize()
    init()
    if (reduce) {
      ctx.clearRect(0, 0, w, h)
      lines.forEach((l) => l.draw())
    } else {
      animate()
    }

    const onResize = () => { resize(); init() }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [rgb, count])

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
}
