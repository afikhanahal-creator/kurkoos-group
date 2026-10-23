/* ============================================================
   הגשר של מנוע התוכן: המערכת נבנתה כ-Artifact ב-claude.ai ושם היא
   מקבלת שירותים דרך window.claude.use(name). כאן, באתר, הגשר מספק את
   אותם שירותים מהתשתית של האתר, כך שהמערכת עצמה רצה כמו שהיא:
     db        מסד הנתונים: טבלת engine_docs ב-Supabase (רק מנהל מחובר)
     assets    קבצים: תיקיית engine-media ב-Supabase Storage
     sample    Claude: דרך /api/claude (המפתח יושב רק ב-Vercel)
     downloads הורדת קובץ רגילה מהדפדפן
     mcp       Metricool דרך /api/metricool (המפתח ב-Vercel). Canva והעורך בענן נשארים ב-claude.ai
   ההתחברות היא ההתחברות של עמוד האדמין, מאותו דפדפן.
   ============================================================ */
(function () {
  const SB = 'https://filnzlnvujnlazwcxbuq.supabase.co'
  const KEY = 'sb_publishable_dp1IAlmBTz_UvV8UVID1JA_KtKLX5pR' // מפתח ציבורי, אותו מפתח שהאתר עצמו משתמש בו
  const AUTH_KEY = 'sb-filnzlnvujnlazwcxbuq-auth-token'
  const STORE = SB + '/storage/v1/object/public/engine-media/'
  window.__ENGINE_HOST = 'site'
  window.__BLOB = STORE + 'blob/'

  // ---------- גרסת נתונים: כשהנתונים באתר הוחלפו (העברה מהמערכת הקודמת), דפדפן שפתח את המערכת לפני כן
  // מחזיק עותק ישן בזיכרון שלו. פעם אחת מנקים אותו, כדי שלא ייכתב בחזרה מעל הנתונים האמיתיים.
  const DATA_EPOCH = '2026-10-05-import'
  try {
    if (localStorage.getItem('engine_epoch') !== DATA_EPOCH) {
      const keep = new Set([AUTH_KEY])
      // ההגדרות של האתר עצמו (עוגיות, שפה, נגישות, אדמין) נשארות
      const SITE = /^(sb-|kurkoos-|kc_|a11y|accessibility|engine_epoch$)/
      Object.keys(localStorage).forEach((k) => { if (!keep.has(k) && !SITE.test(k)) localStorage.removeItem(k) })
      localStorage.setItem('engine_epoch', DATA_EPOCH)
    }
  } catch (e) {}

  try { const d = indexedDB.deleteDatabase('kurkoos-engine'); d.onblocked = () => {} } catch (e) {}

  // ---------- עדכונים חד פעמיים: ב-claude.ai כל אחד מהם רץ פעם אחת וסימן את עצמו בזיכרון הדפדפן.
  // באתר זה דפדפן חדש, ובלי הסימון הם רצו שוב על כל הנתונים (החליפו תמונות, כתבו מחדש טקסטים).
  // הנתונים מגיעים לכאן אחרי שכל העדכונים האלה כבר עברו עליהם, אז באתר הם נחשבים כבוצעו.
  const ONCE = /^(ag_seed_|ag_v\d|ag_weekly_|ag_art_auto|cp_patch|soc_import|v129_mig$|pro_seen$)/
  try {
    const get = Storage.prototype.getItem
    Storage.prototype.getItem = function (k) {
      const v = get.call(this, k)
      return v === null && this === window.localStorage && ONCE.test(String(k)) ? 'true' : v
    }
  } catch (e) {}

  // ---------- ההתחברות של האדמין (Supabase שומר אותה ב-localStorage של האתר)
  let refreshing = null
  function readSession() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null') } catch (e) { return null } }
  async function token() {
    let s = readSession()
    if (!s || !s.access_token) throw err('not_signed_in', 'צריך להתחבר לאדמין')
    if ((s.expires_at || 0) * 1000 > Date.now() + 60000) return s.access_token
    if (!refreshing) refreshing = (async () => {
      const r = await fetch(SB + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) })
      if (!r.ok) throw err('not_signed_in', 'ההתחברות פגה. התחברו שוב לאדמין')
      const n = await r.json()
      const next = Object.assign({}, s, n, { expires_at: n.expires_at || Math.floor(Date.now() / 1000) + (n.expires_in || 3600) })
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(next)) } catch (e) {}
      return next.access_token
    })().finally(() => { refreshing = null })
    return refreshing
  }
  function err(code, message) { const e = new Error(message || code); e.code = code; return e }
  function codeOf(status) { return status === 401 || status === 403 ? 'invalid_argument' : status === 429 ? 'resource_exhausted' : status === 413 ? 'invalid_argument' : 'unavailable' }
  async function call(path, init, tries) {
    tries = tries || 0
    let r
    try { r = await fetch(SB + path, Object.assign({}, init, { headers: Object.assign({ apikey: KEY, Authorization: 'Bearer ' + (await token()) }, (init && init.headers) || {}) })) }
    catch (e) { if (e && e.code) throw e; if (tries < 2) { await wait(600 * (tries + 1)); return call(path, init, tries + 1) } throw err('unavailable', 'אין חיבור') }
    if (r.status >= 500 && tries < 2) { await wait(700 * (tries + 1)); return call(path, init, tries + 1) }
    if (!r.ok) { let m = ''; try { m = (await r.json()).message || '' } catch (e) {} throw err(codeOf(r.status), m || ('HTTP ' + r.status)) }
    return r
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)))

  // ---------- db: מסמכים בסגנון Firestore על טבלה אחת
  const T = '/rest/v1/engine_docs'
  const enc = encodeURIComponent
  // own: the rows belong to this snapshot only (a one-shot read), so data() hands them out without a deep copy
  function docSnap(id, data, exists, own) { return { id, exists: !!exists, data: () => (exists ? (own ? data : clone(data)) : undefined), metadata: { fromCache: false, hasPendingWrites: false } } }
  function qSnap(map, changes, own) {
    const docs = [...map.entries()].map(([id, v]) => docSnap(id, v, true, own))
    return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f), docChanges: () => changes || docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })), metadata: { fromCache: false, hasPendingWrites: false } }
  }
  // מטמון בדפדפן (IndexedDB): בפתיחה הראשונה נטען הכול, ובכל פתיחה אחרי זה רק מה שהשתנה
  const IDB = (() => { let p = null; return () => p || (p = new Promise((ok) => { try { const r = indexedDB.open('kurkoos-engine-' + DATA_EPOCH, 1); const t = setTimeout(() => ok(null), 3000); r.onupgradeneeded = () => r.result.createObjectStore('cols'); r.onsuccess = () => { clearTimeout(t); ok(r.result) }; r.onerror = () => { clearTimeout(t); ok(null) }; r.onblocked = () => { clearTimeout(t); ok(null) } } catch (e) { ok(null) } })) })()
  async function cacheGet(col) { const d = await IDB(); if (!d) return null; return new Promise((ok) => { try { const q = d.transaction('cols').objectStore('cols').get(col); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null) } catch (e) { ok(null) } }) }
  async function cachePut(col, v) { const d = await IDB(); if (!d) return; try { const tx = d.transaction('cols', 'readwrite'); tx.objectStore('cols').put(v, col); tx.oncomplete = () => { try { localStorage.setItem(HINT + col, v.last); localStorage.setItem(HINT + 'n_' + col, String(v.rows.length)) } catch (e) {} } } catch (e) {} }
  // V196: the put copies the whole collection on the main thread (posts: about 14 MB), so for a watched collection it runs
  // when the page is idle (at most 4 s later, and right away when the page is hidden); a newer write for the same collection
  // replaces an older one. A one-shot read hands its rows to the app without a copy, so its put stays immediate: the cache
  // keeps what the server sent, not what the app did to it afterwards.
  const later = new Map(); let laterT = 0
  function flushLater() { laterT = 0; const all = [...later.entries()]; later.clear(); all.forEach(([c, v]) => cachePut(c, v)) }
  function cachePutLater(col, v) { later.set(col, v); if (laterT) return; laterT = 1; const go = () => { if (laterT) flushLater() }; if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500) }
  addEventListener('pagehide', () => { if (later.size) flushLater() })
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && later.size) flushLater() })
  // דפים של 1000 שורות. הדף הראשון מחזיר גם את המספר הכולל, ושאר הדפים נטענים במקביל (בטלפון זה הבדל של שניות ארוכות)
  // V196: guess = how many pages are expected (from the last read of this collection); those are requested at once,
  // with the first one, instead of after the first answer (on a phone that answer waits for the page script to finish)
  // V196: after the page script has run and the first frame is painted (the shell and the skeleton cards); the reads that
  // start while the page is still loading wait for it before they parse anything, so they do not hold up the first paint
  const booted = new Promise((ok) => {
    let done = false; const go = () => { if (!done) { done = true; setTimeout(ok, 0) } }
    const frame = () => { try { requestAnimationFrame(go) } catch (e) { go() } }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', frame); else frame()
    setTimeout(go, 4000)
  })
  async function pages(q, onProgress, guess, wait) {
    const P = 1000
    const spec = new Map()
    const json = (r) => (wait ? booted.then(() => r.json()) : r.json())
    for (let k = 1; k < (guess || 0) && k < 40; k++) { const off = k * P; const p = call(`${q}&limit=${P}&offset=${off}`, { method: 'GET' }).then(json); p.catch(() => {}); spec.set(off, p) }
    const r0 = await call(`${q}&limit=${P}&offset=0`, { method: 'GET', headers: { Prefer: 'count=exact' } })
    const first = await json(r0)
    const m = /\/(\d+)$/.exec(r0.headers.get('content-range') || '')
    const total = m ? +m[1] : null
    if (onProgress) onProgress(first.length, total)
    if (first.length < P) return first
    if (total == null) { const out = first.slice(); let off = P; for (;;) { const rows = await (spec.get(off) || call(`${q}&limit=${P}&offset=${off}`, { method: 'GET' }).then((r) => r.json())); out.push(...rows); if (onProgress) onProgress(out.length, null); if (rows.length < P) break; off += P } return out }
    let got = first.length
    const offs = []; for (let off = P; off < total; off += P) offs.push(off)
    const rest = new Array(offs.length)
    let next = 0
    const worker = async () => { while (next < offs.length) { const i = next++; const sp = spec.get(offs[i]); rest[i] = sp ? await sp : await (await call(`${q}&limit=${P}&offset=${offs[i]}`, { method: 'GET' })).json(); got += rest[i].length; if (onProgress) onProgress(got, total) } }
    // V196: up to eight pages at once (the posts are nine pages; four at a time took three rounds on a phone)
    await Promise.all([worker(), worker(), worker(), worker(), worker(), worker(), worker(), worker()])
    return first.concat(...rest)
  }
  // ---------- פס טעינה: עד שהפוסטים מגיעים מהשרת המערכת לא נראית ריקה
  const LOAD = { el: null }
  function loadBar(text) {
    try {
      if (text == null) { if (LOAD.el) { LOAD.el.remove(); LOAD.el = null } return }
      if (!LOAD.el) {
        const el = document.createElement('div'); el.id = 'engine-loading'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite')
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483646;background:#07293a;color:#fff;font:600 15px/1.4 Almoni,Heebo,Arial,sans-serif;direction:rtl;text-align:center;padding:10px 16px calc(10px + 3px);box-shadow:0 2px 8px rgba(0,0,0,.2)'
        el.innerHTML = '<span></span><i style="position:absolute;right:0;bottom:0;height:3px;background:#a90b0c;width:0;transition:width .3s"></i>'
        ;(document.body || document.documentElement).appendChild(el); LOAD.el = el
      }
      LOAD.el.querySelector('span').textContent = text.t
      LOAD.el.querySelector('i').style.width = Math.round((text.f || 0) * 100) + '%'
    } catch (e) {}
  }
  const maxTs = (rows, start) => rows.reduce((m, x) => (x.updated_at > m ? x.updated_at : m), start || '')
  // V196: the cursor of each cached collection is also kept in localStorage, so a read that starts before IndexedDB has
  // answered (the posts, while the page is still loading) can already ask the server for the right rows
  const HINT = 'engine_cur_'
  const freshQ = (col, last) => `${T}?collection=eq.${enc(col)}&updated_at=gte.${enc(last)}&select=id,data,updated_at&order=updated_at`
  const idsQ = (col) => `${T}?collection=eq.${enc(col)}&select=id&order=id`
  const fullQ = (col) => `${T}?collection=eq.${enc(col)}&select=id,data,updated_at&order=id`
  const progOf = (col, cached) => col !== 'posts' ? null : cached
    ? (n, t) => { if (t > 200) loadBar({ t: `מעדכן פוסטים ששונו… ${Math.min(n, t).toLocaleString('he-IL')} מתוך ${t.toLocaleString('he-IL')}`, f: n / t }) }
    : (n, t) => loadBar({ t: t ? `טוען את הפוסטים מהשרת… ${Math.min(n, t).toLocaleString('he-IL')} מתוך ${t.toLocaleString('he-IL')}` : 'טוען את הפוסטים מהשרת…', f: t ? n / t : 0.1 })
  async function readAll(col, own, early) {
    const put = own ? cachePut : cachePutLater
    if (early) await booted
    const c = await cacheGet(col)
    if (c && c.rows && c.last) {
      // the rows changed since the cursor and the list of ids are asked for together (they were one after the other)
      const use = early && early.last === c.last && early.fresh
      const freshP = use ? early.fresh : pages(freshQ(col, c.last), progOf(col, true))
      const idsP = use ? early.ids : pages(idsQ(col))
      const fresh = await freshP
      const ids = new Set((await idsP).map((x) => x.id))
      const map = new Map(c.rows.filter(([id]) => ids.has(id)))
      // updated_at=gte returns the newest rows again every time; only a row that really differs counts as a change
      let changed = map.size !== c.rows.length
      fresh.forEach((x) => { if (!changed) { const o = map.get(x.id); if (o === undefined || JSON.stringify(o) !== JSON.stringify(x.data)) changed = true } map.set(x.id, x.data) })
      const last = maxTs(fresh, c.last)
      if (changed || last !== c.last) put(col, { rows: [...map.entries()], last })
      if (col === 'posts') loadBar(null)
      return { map, last }
    }
    const prog = progOf(col, false)
    if (prog) prog(0, null)
    const rows = await (early && early.full ? early.full : pages(fullQ(col), prog))
    const map = new Map(rows.map((x) => [x.id, x.data]))
    const last = maxTs(rows, '1970-01-01T00:00:00Z')
    put(col, { rows: [...map.entries()], last })
    if (col === 'posts') loadBar(null)
    return { map, last }
  }
  async function readOne(col, id) {
    const r = await call(`${T}?collection=eq.${enc(col)}&id=eq.${enc(id)}&select=data`, { method: 'GET' })
    const rows = await r.json()
    return rows.length ? rows[0].data : undefined
  }
  async function upsert(col, id, data) {
    await call(`${T}?on_conflict=collection,id`, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ collection: col, id, data }) })
    poke(col)
  }
  function deepMerge(a, b) {
    const out = Object.assign({}, a)
    Object.keys(b).forEach((k) => {
      const v = b[k]
      if (v && typeof v === 'object' && v.__delete__ === true) { delete out[k]; return }
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = deepMerge(out[k], v)
      else out[k] = v
    })
    return out
  }
  const queues = {}
  function serial(key, fn) { const p = (queues[key] || Promise.resolve()).catch(() => {}).then(fn); queues[key] = p; return p }
  function docRef(col, id) {
    return {
      id, path: col + '/' + id,
      get: async () => { const d = await readOne(col, id); return docSnap(id, d, d !== undefined) },
      set: (data) => serial(col + '/' + id, () => upsert(col, id, clone(data))),
      update: (data) => serial(col + '/' + id, async () => {
        const cur = await readOne(col, id)
        if (cur === undefined) throw err('invalid_argument', 'המסמך לא קיים')
        await upsert(col, id, deepMerge(cur, clone(data)))
      }),
      delete: () => serial(col + '/' + id, async () => { await call(`${T}?collection=eq.${enc(col)}&id=eq.${enc(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); poke(col) }),
      onSnapshot: (cb, onErr) => watchDoc(col, id, cb, onErr),
    }
  }
  // ---------- האזנה: טעינה מלאה, ואחריה בדיקה כל כמה שניות מה השתנה
  const watchers = {}
  function poke(col) { const w = watchers[col]; if (w) w.forEach((x) => x.kick()) }
  function watchCol(col, cb, onErr) {
    let map = null, last = '', stop = false, timer = 0, full = 0, busy = false
    const tick = async () => {
      if (stop || busy) return
      busy = true
      try {
        if (map && Date.now() - full > 60000) {
          // V196: the same answer as a full read (the cache plus the rows changed since its cursor, minus deleted ids), from
          // the rows in memory: only the rows changed since the last read are fetched and compared
          const rows = await pages(`${T}?collection=eq.${enc(col)}&updated_at=gte.${enc(last)}&select=id,data,updated_at&order=updated_at`)
          const ids = new Set((await pages(`${T}?collection=eq.${enc(col)}&select=id&order=id`)).map((x) => x.id))
          const changes = []
          rows.forEach((x) => { if (!ids.has(x.id)) return; const was = map.get(x.id); if (was === undefined || JSON.stringify(was) !== JSON.stringify(x.data)) { changes.push({ type: was === undefined ? 'added' : 'modified', doc: docSnap(x.id, x.data, true) }); map.set(x.id, x.data) } })
          map.forEach((v, id) => { if (!ids.has(id)) changes.push({ type: 'removed', doc: docSnap(id, v, true) }) })
          changes.forEach((c) => { if (c.type === 'removed') map.delete(c.doc.id) })
          last = maxTs(rows, last); full = Date.now()
          if (changes.length) { cachePutLater(col, { rows: [...map.entries()], last }); cb(qSnap(map, changes)) }
        } else if (!map) {
          const got = await readAll(col), next = got.map
          const changes = []
          if (map) {
            next.forEach((v, id) => { if (!map.has(id)) changes.push({ type: 'added', doc: docSnap(id, v, true) }); else if (JSON.stringify(map.get(id)) !== JSON.stringify(v)) changes.push({ type: 'modified', doc: docSnap(id, v, true) }) })
            map.forEach((v, id) => { if (!next.has(id)) changes.push({ type: 'removed', doc: docSnap(id, v, true) }) })
          }
          const first = !map
          map = next; full = Date.now(); last = got.last
          if (first || changes.length) cb(qSnap(map, first ? null : changes))
        } else {
          const rows = await pages(`${T}?collection=eq.${enc(col)}&updated_at=gte.${enc(last)}&select=id,data,updated_at&order=updated_at`)
          last = maxTs(rows, last); const changes = []
          rows.forEach((x) => { const was = map.get(x.id); if (JSON.stringify(was) !== JSON.stringify(x.data)) { changes.push({ type: was === undefined ? 'added' : 'modified', doc: docSnap(x.id, x.data, true) }); map.set(x.id, x.data) } })
          if (changes.length) cb(qSnap(map, changes))
        }
      } catch (e) {
        if (col === 'posts' && !map) loadBar({ t: e && e.code === 'not_signed_in' ? 'ההתחברות פגה. התחברו שוב בעמוד הניהול ורעננו' : 'אין חיבור לשרת כרגע. מנסה שוב…', f: 0 })
        if (onErr && e && e.code !== 'unavailable') { try { onErr(e) } catch (x) {} }
      }
      busy = false
      if (!stop) { clearTimeout(timer); timer = setTimeout(tick, document.visibilityState === 'hidden' ? 20000 : 4000) }
    }
    const me = { kick: () => { clearTimeout(timer); timer = setTimeout(tick, 300) } }
    ;(watchers[col] = watchers[col] || []).push(me)
    setTimeout(tick, 0)
    return () => { stop = true; clearTimeout(timer); watchers[col] = (watchers[col] || []).filter((x) => x !== me) }
  }
  function watchDoc(col, id, cb, onErr) {
    let lastJson = null
    return watchCol(col, (snap) => {
      const d = snap.docs.find((x) => x.id === id)
      const j = JSON.stringify(d ? d.data() : null)
      if (j !== lastJson) { lastJson = j; cb(d || docSnap(id, undefined, false)) }
    }, onErr)
  }
  function splitPath(p) { const a = String(p).split('/'); return [a.slice(0, -1).join('/'), a[a.length - 1]] }
  const db = {
    collection: (col) => ({
      id: col, path: col,
      doc: (id) => docRef(col, id),
      get: async () => { const pre = takePrefetch(col); let got = null; if (pre) { try { got = await pre } catch (e) { got = null } } if (!got) got = await readAll(col, true); return qSnap(got.map, null, true) },
      onSnapshot: (cb, onErr) => watchCol(col, cb, onErr),
      add: async (data) => { const id = rid(); await upsert(col, id, clone(data)); return docRef(col, id) },
    }),
    doc: (path) => { const [c, id] = splitPath(path); return docRef(c, id) },
  }
  // ---------- V196: the posts start loading as soon as this file runs (about two seconds before the page script asks
  // for them, while the browser is still reading the page). The first read of the posts takes this answer; it is used
  // once, and only within a minute, otherwise the read goes to the server as before.
  const PRE = {}
  // With a cursor hint the changed rows and the ids are requested right now; on a browser that never opened the engine
  // (no cursor, no sync record) the full read starts right now. Otherwise the read waits for IndexedDB, as before.
  function prefetch(col) {
    if (PRE[col]) return
    let hint = null, never = false, n = 0
    try { hint = localStorage.getItem(HINT + col); n = +(localStorage.getItem(HINT + 'n_' + col) || 0); never = !hint && localStorage.getItem('ps_h') == null } catch (e) {}
    // pages expected: from the last read, or, on a browser that never opened the engine, the size of the library (about 8,200 posts)
    const guess = Math.ceil((n || (never && col === 'posts' ? 8300 : 0)) / 1000)
    let early = null
    const quiet = (p) => { p.catch(() => {}); return p }
    if (hint) early = { last: hint, fresh: quiet(pages(freshQ(col, hint), progOf(col, true), 0, true)), ids: quiet(pages(idsQ(col), null, guess, true)) }
    else if (never) { const prog = progOf(col, false); if (prog) prog(0, null); early = { full: quiet(pages(fullQ(col), prog, guess, true)) } }
    const p = readAll(col, true, early || { late: 1 }); p.catch(() => {}); PRE[col] = { p, t: Date.now() }
  }
  function takePrefetch(col) { const x = PRE[col]; if (!x) return null; delete PRE[col]; return Date.now() - x.t < 60000 ? x.p : null }
  function rid() { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join('') }

  // ---------- assets: קבצים בתיקייה engine-media
  const assets = {
    upload: async (blob, opts) => {
      // opts.ext gives the file a real extension (Instagram fetches the published image by its URL)
      const ext = opts && /^[a-z0-9]{2,5}$/.test(String(opts.ext || '')) ? '.' + opts.ext : ''
      const id = rid() + ext; const type = blob.type || 'application/octet-stream'
      await call('/storage/v1/object/engine-media/blob/' + id, { method: 'POST', headers: { 'Content-Type': type, 'x-upsert': 'true', 'cache-control': '31536000' }, body: blob })
      return { id, url: STORE + 'blob/' + id, sizeBytes: blob.size, contentType: type }
    },
    list: async () => ({ assets: [], usage: {} }),
    delete: async (id) => { await call('/storage/v1/object/engine-media/blob/' + id, { method: 'DELETE' }) },
  }

  // ---------- sample: Claude דרך השרת של האתר
  // תמונה יכולה להיות כתובת מהאחסון שלנו, או קובץ (Blob) שהועלה עכשיו: קובץ מוקטן ל-1400 פיקסלים ונשלח כ-base64 (עד 4, עד 3.5MB יחד)
  async function toImg(x) {
    if (typeof x === 'string') return x
    if (!(x instanceof Blob)) return null
    const url = URL.createObjectURL(x)
    try {
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url })
      const s = Math.min(1, 1400 / Math.max(1, im.naturalWidth, im.naturalHeight))
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s))
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
      return { b64: c.toDataURL('image/jpeg', 0.85).split(',')[1], type: 'image/jpeg' }
    } catch (e) { return null } finally { URL.revokeObjectURL(url) }
  }
  async function imgs(list) {
    if (!Array.isArray(list) || !list.length) return undefined
    const out = []; let total = 0
    for (const x of list.slice(0, 4)) { const v = await toImg(x); if (!v) continue; const n = typeof v === 'string' ? 0 : v.b64.length; if (total + n > 3_500_000) continue; total += n; out.push(v) }
    return out.length ? out : undefined
  }
  async function ask(input, opts, json) {
    opts = opts || {}
    let r
    try {
      r = await fetch('/api/claude', { method: 'POST', signal: opts.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) }, body: JSON.stringify({ input, tier: opts.modelTier || 'default', json: !!json, images: await imgs(opts.images) }) })
    } catch (e) { if (e && e.name === 'AbortError') throw err('cancelled', 'בוטל'); if (e && e.code) throw e; throw err('unavailable', 'אין חיבור') }
    let d = {}; try { d = await r.json() } catch (e) {}
    if (!r.ok) throw err(r.status === 503 ? 'not_granted' : r.status === 429 ? 'rate_limited' : r.status === 401 ? 'not_granted' : 'unavailable', d.error || ('HTTP ' + r.status))
    const text = String(d.text || '')
    if (opts.onText) { try { opts.onText({ text, delta: text }) } catch (e) {} }
    return { text, truncated: !!d.truncated }
  }
  const sample = Object.assign((input, opts) => ask(input, opts, false), {
    json: async (input, opts) => {
      const { text } = await ask(input, opts, true)
      const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      try { return JSON.parse(m ? m[0] : text) } catch (e) { throw err('invalid_output', 'התשובה לא הייתה JSON תקין') }
    },
    limits: async () => ({ images: { maxCount: 4, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] } }),
  })

  // ---------- downloads
  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data])
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'download'
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 4000)
      return { saved: true }
    },
  }

  // ---------- mcp: Metricool דרך השרת של האתר (/api/metricool). רק כלים של Metricool, ופוסט חדש נשלח תמיד כטיוטה
  async function mcCall(tool, args) {
    let r
    try {
      r = await fetch('/api/metricool', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) }, body: JSON.stringify({ tool, args: args || {} }) })
    } catch (e) { if (e && e.code) throw e; throw err('unavailable', 'אין חיבור') }
    let d = {}; try { d = await r.json() } catch (e) {}
    if (!r.ok) throw err(d.code || (r.status === 401 ? 'not_granted' : 'tool_error'), d.error || ('HTTP ' + r.status))
    return d
  }
  const watches = []
  const mcp = {
    callTool: async (server, tool, args) => {
      if (server !== 'metricool') throw err('server_not_connected', 'החיבור הזה זמין רק ב-claude.ai')
      return { payload: await mcCall(tool, args) }
    },
    watchTool: (server, tool, input, handler) => {
      let stop = false
      const run = async () => {
        if (stop) return
        try { handler({ type: 'data', result: { payload: await mcCall(tool, input) }, cache: { storedAt: Date.now() } }) }
        catch (e) { try { handler({ type: 'error', error: e }) } catch (x) {} }
      }
      const w = { server, tool, run }
      watches.push(w); setTimeout(run, 0)
      const t = setInterval(run, 5 * 60 * 1000)
      return () => { stop = true; clearInterval(t); const i = watches.indexOf(w); if (i >= 0) watches.splice(i, 1) }
    },
    invalidate: async (server, tool) => { watches.filter((w) => w.server === server && (!tool || w.tool === tool)).forEach((w) => w.run()) },
    status: () => mcCall('status'),
  }

  // the video studio calls site routes of its own (/api/transcribe) with the same admin session
  window.__engineToken = token
  const SERVICES = { db, assets, sample, downloads, mcp }
  window.claude = { use: async (name) => (readSession() ? SERVICES[name] || null : null) }

  // ---------- בלי התחברות: מסך קצר שמפנה לאדמין
  function gate() {
    if (readSession()) return
    const g = document.createElement('div')
    g.id = 'engine-gate'
    g.setAttribute('role', 'dialog')
    g.innerHTML = '<div><b>מנוע התוכן של קבוצת קורקוס</b><p>כדי לעבוד במערכת צריך להתחבר לעמוד הניהול של האתר.</p><a href="/admin">התחברות לניהול</a></div>'
    g.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#07293a;color:#fff;display:grid;place-items:center;text-align:center;font-family:Heebo,Arial,sans-serif;direction:rtl;padding:24px'
    const st = document.createElement('style')
    st.textContent = '#engine-gate b{display:block;font-size:24px;margin-bottom:8px}#engine-gate p{margin:0 0 20px;opacity:.85}#engine-gate a{display:inline-block;background:#fff;color:#07293a;border-radius:12px;padding:12px 22px;font-weight:800;text-decoration:none}'
    document.head.appendChild(st)
    document.body.appendChild(g)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gate); else gate()
  try { if (readSession()) prefetch('posts') } catch (e) {}
  window.__engineBridge = { token, db, assets, readSession }
})()
