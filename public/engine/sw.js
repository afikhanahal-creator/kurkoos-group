/* Content engine service worker: keeps every picture and video file it has shown once, on the device.
   Why: each picture read out of Supabase counts against the free plan's monthly transfer quota (5 GB), and
   going over it restricts the whole project. The files under storage/v1/object/public never change (each
   name carries the ad or file id), so a copy on the device is served from now on without asking Supabase.
   Only pictures and media. Data (rest/v1), sign in (auth/v1) and the engine page itself are never touched. */
const CACHE = 'kc-media-v1'
const MAX = 4000 // files kept; the oldest go first

const isMedia = (u) =>
  (u.hostname.endsWith('.supabase.co') && u.pathname.startsWith('/storage/v1/object/public/')) ||
  (u.origin === self.location.origin && /^\/engine\/(photos\/|reel-\d+\.(mp4|jpg)$|kurkoos-v\d+\.(mp4|jpg)$)/.test(u.pathname))

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('kc-media-') && k !== CACHE) await caches.delete(k)
  await self.clients.claim()
})()))

let puts = 0
async function trim(c) {
  const keys = await c.keys()
  for (let i = 0; i < keys.length - MAX; i++) await c.delete(keys[i])
}

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET') return
  let u
  try { u = new URL(r.url) } catch { return }
  if (!isMedia(u) || r.headers.has('range')) return
  e.respondWith((async () => {
    const c = await caches.open(CACHE)
    const hit = await c.match(r.url)
    if (hit) return hit
    let res
    // ask with CORS so the copy can be stored at its real size (an opaque copy is counted as several MB)
    try { res = await fetch(r.url, { mode: u.origin === self.location.origin ? 'same-origin' : 'cors', credentials: 'omit' }) }
    catch { return fetch(r) }
    if (res.ok && res.status === 200) {
      e.waitUntil(c.put(r.url, res.clone()).then(() => { if (++puts % 200 === 0) return trim(c) }).catch(() => {}))
    }
    return res
  })())
})
