import { useEffect, useLayoutEffect, useRef } from 'react'

/* Column widths a person sets by hand. Dragging the edge of a column head changes its width; the widths are kept in
   this browser per table (a preference, no data), and a double click on an edge returns the table to its own layout.
   On a phone the tables are cards, so nothing is applied there.

   Only the dragged column changes. The columns before it stay exactly where they are, the ones after it follow the edge,
   and when the columns together are narrower than the frame the spare room goes to the last data column (the browser used
   to spread it over every column, so a neighbour moved the other way while one was being dragged). A table wider than
   its frame scrolls sideways inside it, head and rows together, with the row's name pinned so a scrolled row still says
   whose it is. */
const KEY = (k) => `fin-cols:${k}`
const read = (k) => { try { const v = JSON.parse(localStorage.getItem(KEY(k)) || 'null'); return Array.isArray(v) && v.every((n) => Number.isFinite(n)) ? v : null } catch { return null } }
const MIN = 56
const FALLBACK = 120   // a column that was hidden when the widths were saved (a narrower window) and is shown now

export function useResizableColumns(key) {
  const ref = useRef(null)
  const heads = (table) => [...(table.tHead?.rows[0]?.cells || [])]
  const clear = (table) => { table.style.tableLayout = ''; table.style.width = ''; table.style.minWidth = ''; heads(table).forEach((th) => { th.style.width = '' }); table.classList.remove('is-sized') }
  const shown = (th) => th.offsetParent !== null || th.getClientRects().length > 0
  // the column that takes the spare room: the last one that holds data (an unnamed last column is the row's actions)
  const filler = (ths) => {
    const vis = ths.map((th, i) => (shown(th) ? i : -1)).filter((i) => i >= 0)
    const last = vis[vis.length - 1]
    return vis.length > 1 && !ths[last].textContent.trim() ? vis[vis.length - 2] : last
  }
  const apply = (table, w) => {
    const ths = heads(table)
    if (!w || w.length !== ths.length || !table.tHead || getComputedStyle(table.tHead).display === 'none') { clear(table); return }
    const px = ths.map((th, i) => (!shown(th) ? 0 : w[i] >= MIN ? w[i] : w[i] > 0 ? Math.max(w[i], 24) : FALLBACK))
    const sum = px.reduce((a, b) => a + b, 0)
    const wrap = table.closest('.fin-table-wrap'); const room = wrap ? wrap.clientWidth : 0
    if (room > sum) px[filler(ths)] += room - sum
    table.style.tableLayout = 'fixed'; table.style.minWidth = '0'
    table.style.width = `${Math.max(sum, room)}px`
    ths.forEach((th, i) => { th.style.width = `${px[i]}px` })
    table.classList.add('is-sized')
  }
  /* the row's name stays in view while the table scrolls sideways: the checkbox column (when there is one) and the
     name column are pinned to the start edge. The offsets are measured, so they follow a resized checkbox column. */
  const pin = (table) => {
    const ths = heads(table); const row = table.tBodies[0]?.rows[0]
    ths.forEach((th) => th.classList.remove('fin-pin', 'fin-pin--main'))
    if (!row || !table.tHead || getComputedStyle(table.tHead).display === 'none') { table.classList.remove('has-pin'); return }
    const cells = [...row.cells]; const main = cells.findIndex((c) => c.classList.contains('fin-td-main'))
    if (main < 0 || cells.length !== ths.length) { table.classList.remove('has-pin'); return }
    const check = main > 0 && cells[main - 1].classList.contains('fin-table__check') ? main - 1 : -1
    if (check >= 0) ths[check].classList.add('fin-pin')
    ths[main].classList.add('fin-pin', 'fin-pin--main')
    table.style.setProperty('--pin-main', `${check >= 0 ? Math.round(ths[check].getBoundingClientRect().width) : 0}px`)
    table.classList.add('has-pin')
  }
  const scrolled = (table) => {
    const wrap = table.closest('.fin-table-wrap'); if (!wrap) return
    const x = Math.abs(wrap.scrollLeft); const max = wrap.scrollWidth - wrap.clientWidth
    wrap.classList.toggle('is-scrolled', x > 1); wrap.classList.toggle('has-more', max - x > 1)
  }
  // after every render: the same widths go back on (rows and columns may have changed)
  useLayoutEffect(() => { const t = ref.current; if (t) { apply(t, read(key)); pin(t); scrolled(t) } })
  useEffect(() => {
    const table = ref.current
    if (!table) return undefined
    table.classList.add('fin-table--resizable')
    let drag = null; let moved = false
    const rtl = () => getComputedStyle(table).direction === 'rtl'
    // a boundary is grabbed from either side of it (12px each way): the column that ends there is the one that changes
    const GRIP = 12
    const edge = (e) => {
      const th = e.target.closest?.('th')
      if (!th || th.parentNode !== table.tHead?.rows[0]) return null
      const r = th.getBoundingClientRect(); const ths = heads(table); const i = ths.indexOf(th)
      const toEnd = rtl() ? e.clientX - r.left : r.right - e.clientX          // distance to this column's far edge
      const toStart = rtl() ? r.right - e.clientX : e.clientX - r.left        // distance to its near edge (the previous column's far edge)
      if (toEnd <= GRIP && i < ths.length - 1) return th
      if (toStart <= GRIP && i > 0) return ths[i - 1]
      return null
    }
    let line = null
    const guide = (x) => {
      if (x == null) { line?.remove(); line = null; return }
      if (!line) { line = document.createElement('div'); line.className = 'fin-colguide'; document.body.appendChild(line) }
      const wrap = table.closest('.fin-table-wrap') || table; const r = wrap.getBoundingClientRect()
      Object.assign(line.style, { left: `${x}px`, top: `${Math.max(0, r.top)}px`, height: `${Math.min(innerHeight, r.bottom) - Math.max(0, r.top)}px` })
    }
    const down = (e) => {
      const th = edge(e)
      if (!th || e.button > 0) return
      e.preventDefault()
      const ths = heads(table)
      // the widths somebody chose (kept without the spare room the filling column is given), else what is on screen now
      const saved = read(key); const now = ths.map((c) => Math.round(c.getBoundingClientRect().width)); const i = ths.indexOf(th)
      const base = saved && saved.length === ths.length ? saved.map((v, k) => (v >= MIN || !shown(ths[k]) ? v : now[k])) : now
      drag = { i, x: e.clientX, base, start: now[i], dir: rtl() ? -1 : 1 }
      moved = false; document.body.classList.add('fin-col-resizing'); try { table.setPointerCapture?.(e.pointerId) } catch { /* not a pointer */ }
    }
    const move = (e) => {
      if (!drag) { if (table.tHead) table.tHead.style.cursor = edge(e) ? 'col-resize' : ''; return }
      const w = [...drag.base]; w[drag.i] = Math.max(MIN, drag.start + (e.clientX - drag.x) * drag.dir)
      drag.now = w; moved = true; apply(table, w); pin(table); scrolled(table)
      const r = heads(table)[drag.i].getBoundingClientRect(); guide(drag.dir < 0 ? r.left : r.right)
    }
    const up = () => {
      if (!drag) return
      if (drag.now) { try { localStorage.setItem(KEY(key), JSON.stringify(drag.now.map(Math.round))) } catch { /* private mode */ } }
      drag = null; guide(null); document.body.classList.remove('fin-col-resizing')
    }
    // a drag that ends on a sortable head must not also sort
    const click = (e) => { if (moved) { moved = false; e.stopPropagation(); e.preventDefault() } }
    const reset = (e) => { if (!edge(e)) return; try { localStorage.removeItem(KEY(key)) } catch { /* noop */ } clear(table); pin(table); scrolled(table) }
    const onResize = () => { apply(table, read(key)); pin(table); scrolled(table) }
    const wrap = table.closest('.fin-table-wrap'); const onScroll = () => scrolled(table)
    wrap?.addEventListener('scroll', onScroll, { passive: true })
    table.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
    table.addEventListener('click', click, true); table.addEventListener('dblclick', reset); window.addEventListener('resize', onResize)
    return () => { wrap?.removeEventListener('scroll', onScroll); table.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); table.removeEventListener('click', click, true); table.removeEventListener('dblclick', reset); window.removeEventListener('resize', onResize) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}
