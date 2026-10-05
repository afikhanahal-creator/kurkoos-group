/* ============================================================
   הגשר של מנוע התוכן: המערכת נבנתה כ-Artifact ב-claude.ai ושם היא
   מקבלת שירותים דרך window.claude.use(name). כאן, באתר, הגשר מספק את
   אותם שירותים מהתשתית של האתר, כך שהמערכת עצמה רצה כמו שהיא:
     db        מסד הנתונים: טבלת engine_docs ב-Supabase (רק מנהל מחובר)
     assets    קבצים: תיקיית engine-media ב-Supabase Storage
     sample    Claude: דרך /api/claude (המפתח יושב רק ב-Vercel)
     downloads הורדת קובץ רגילה מהדפדפן
     mcp       לא זמין כאן עדיין (Metricool, Canva, העורך בענן נשארים ב-claude.ai)
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
      try { indexedDB.deleteDatabase('kurkoos-engine') } catch (e) {}
      localStorage.setItem('engine_epoch', DATA_EPOCH)
    }
  } catch (e) {}

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
  function docSnap(id, data, exists) { return { id, exists: !!exists, data: () => (exists ? clone(data) : undefined), metadata: { fromCache: false, hasPendingWrites: false } } }
  function qSnap(map, changes) {
    const docs = [...map.entries()].map(([id, v]) => docSnap(id, v, true))
    return { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f), docChanges: () => changes || docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })), metadata: { fromCache: false, hasPendingWrites: false } }
  }
  // מטמון בדפדפן (IndexedDB): בפתיחה הראשונה נטען הכול, ובכל פתיחה אחרי זה רק מה שהשתנה
  const IDB = (() => { let p = null; return () => p || (p = new Promise((ok) => { try { const r = indexedDB.open('kurkoos-engine', 1); r.onupgradeneeded = () => r.result.createObjectStore('cols'); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null) } catch (e) { ok(null) } })) })()
  async function cacheGet(col) { const d = await IDB(); if (!d) return null; return new Promise((ok) => { try { const q = d.transaction('cols').objectStore('cols').get(col); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null) } catch (e) { ok(null) } }) }
  async function cachePut(col, v) { const d = await IDB(); if (!d) return; try { d.transaction('cols', 'readwrite').objectStore('cols').put(v, col) } catch (e) {} }
  async function pages(q) { const out = []; let off = 0; for (;;) { const r = await call(`${q}&limit=1000&offset=${off}`, { method: 'GET' }); const rows = await r.json(); out.push(...rows); if (rows.length < 1000) break; off += 1000 } return out }
  const maxTs = (rows, start) => rows.reduce((m, x) => (x.updated_at > m ? x.updated_at : m), start || '')
  async function readAll(col) {
    const c = await cacheGet(col)
    if (c && c.rows && c.last) {
      const fresh = await pages(`${T}?collection=eq.${enc(col)}&updated_at=gte.${enc(c.last)}&select=id,data,updated_at&order=updated_at`)
      const ids = new Set((await pages(`${T}?collection=eq.${enc(col)}&select=id&order=id`)).map((x) => x.id))
      const map = new Map(c.rows.filter(([id]) => ids.has(id)))
      fresh.forEach((x) => map.set(x.id, x.data))
      const last = maxTs(fresh, c.last)
      if (fresh.length || map.size !== c.rows.length) cachePut(col, { rows: [...map.entries()], last })
      return { map, last }
    }
    const rows = await pages(`${T}?collection=eq.${enc(col)}&select=id,data,updated_at&order=id`)
    const map = new Map(rows.map((x) => [x.id, x.data]))
    const last = maxTs(rows, '1970-01-01T00:00:00Z')
    cachePut(col, { rows: [...map.entries()], last })
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
        if (!map || Date.now() - full > 60000) {
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
      } catch (e) { if (onErr && e && e.code !== 'unavailable') { try { onErr(e) } catch (x) {} } }
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
      get: async () => qSnap((await readAll(col)).map),
      onSnapshot: (cb, onErr) => watchCol(col, cb, onErr),
      add: async (data) => { const id = rid(); await upsert(col, id, clone(data)); return docRef(col, id) },
    }),
    doc: (path) => { const [c, id] = splitPath(path); return docRef(c, id) },
  }
  function rid() { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join('') }

  // ---------- assets: קבצים בתיקייה engine-media
  const assets = {
    upload: async (blob) => {
      const id = rid(); const type = blob.type || 'application/octet-stream'
      await call('/storage/v1/object/engine-media/blob/' + id, { method: 'POST', headers: { 'Content-Type': type, 'x-upsert': 'true', 'cache-control': '31536000' }, body: blob })
      return { id, url: STORE + 'blob/' + id, sizeBytes: blob.size, contentType: type }
    },
    list: async () => ({ assets: [], usage: {} }),
    delete: async (id) => { await call('/storage/v1/object/engine-media/blob/' + id, { method: 'DELETE' }) },
  }

  // ---------- sample: Claude דרך השרת של האתר
  async function ask(input, opts, json) {
    opts = opts || {}
    let r
    try {
      r = await fetch('/api/claude', { method: 'POST', signal: opts.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) }, body: JSON.stringify({ input, tier: opts.modelTier || 'default', json: !!json }) })
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
    limits: async () => ({ images: false }),
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

  const SERVICES = { db, assets, sample, downloads }
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
  window.__engineBridge = { token, db, assets, readSession }
})()
