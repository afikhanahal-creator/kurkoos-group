import { useEffect, useLayoutEffect, useRef } from 'react'

/* Column widths a person sets by hand. Dragging the edge of a column head changes its width; the widths are kept in
   this browser per table (a preference, no data), and a double click on an edge returns the table to its own layout.
   On a phone the tables are cards, so nothing is applied there. */
const KEY = (k) => `fin-cols:${k}`
const read = (k) => { try { const v = JSON.parse(localStorage.getItem(KEY(k)) || 'null'); return Array.isArray(v) && v.every((n) => Number.isFinite(n)) ? v : null } catch { return null } }
const MIN = 56

export function useResizableColumns(key) {
  const ref = useRef(null)
  const heads = (table) => [...(table.tHead?.rows[0]?.cells || [])]
  const clear = (table) => { table.style.tableLayout = ''; table.style.width = ''; table.style.minWidth = ''; heads(table).forEach((th) => { th.style.width = '' }); table.classList.remove('is-sized') }
  const apply = (table, w) => {
    const ths = heads(table)
    if (!w || w.length !== ths.length || !table.tHead || getComputedStyle(table.tHead).display === 'none') { clear(table); return }
    table.style.tableLayout = 'fixed'; const sum = w.reduce((a, b) => a + b, 0)
    table.style.width = `${sum}px`; table.style.minWidth = '100%'
    ths.forEach((th, i) => { th.style.width = `${w[i]}px` })
    table.classList.add('is-sized')
  }
  // after every render: the same widths go back on (rows and columns may have changed)
  useLayoutEffect(() => { const t = ref.current; if (t) apply(t, read(key)) })
  useEffect(() => {
    const table = ref.current
    if (!table) return undefined
    table.classList.add('fin-table--resizable')
    let drag = null; let moved = false
    const rtl = () => getComputedStyle(table).direction === 'rtl'
    const edge = (e) => {
      const th = e.target.closest?.('th')
      if (!th || th.parentNode !== table.tHead?.rows[0]) return null
      const r = th.getBoundingClientRect()
      return (rtl() ? e.clientX - r.left : r.right - e.clientX) <= 9 ? th : null
    }
    const down = (e) => {
      const th = edge(e)
      if (!th || e.button > 0) return
      e.preventDefault()
      const ths = heads(table)
      drag = { i: ths.indexOf(th), x: e.clientX, w: ths.map((c) => Math.round(c.getBoundingClientRect().width)), dir: rtl() ? -1 : 1 }
      moved = false; document.body.classList.add('fin-col-resizing')
    }
    const move = (e) => {
      if (!drag) { if (table.tHead) table.tHead.style.cursor = edge(e) ? 'col-resize' : ''; return }
      const w = [...drag.w]; w[drag.i] = Math.max(MIN, drag.w[drag.i] + (e.clientX - drag.x) * drag.dir)
      drag.now = w; moved = true; apply(table, w)
    }
    const up = () => {
      if (!drag) return
      if (drag.now) { try { localStorage.setItem(KEY(key), JSON.stringify(drag.now.map(Math.round))) } catch { /* private mode */ } }
      drag = null; document.body.classList.remove('fin-col-resizing')
    }
    // a drag that ends on a sortable head must not also sort
    const click = (e) => { if (moved) { moved = false; e.stopPropagation(); e.preventDefault() } }
    const reset = (e) => { if (!edge(e)) return; try { localStorage.removeItem(KEY(key)) } catch { /* noop */ } clear(table) }
    const onResize = () => apply(table, read(key))
    table.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    table.addEventListener('click', click, true); table.addEventListener('dblclick', reset); window.addEventListener('resize', onResize)
    return () => { table.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); table.removeEventListener('click', click, true); table.removeEventListener('dblclick', reset); window.removeEventListener('resize', onResize) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}
