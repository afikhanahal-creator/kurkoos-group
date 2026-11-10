// Design QA: the checklist items that visual-qa.mjs (layout, dropdowns) and ui-audit.mjs (contrast, focus ring, touch,
// type, motion timing) do not measure. The checklist itself: docs/finance/DESIGN-QA-CHECKLIST.md.
//   Interaction  keyboard order (every Tab stop visible, not under a sticky bar, never on hidden content), disabled
//                buttons that look disabled, hover feedback on buttons
//   Content      empty, loading and error states actually render (search with no results, a slow list, a failed answer)
//   A11y         reduced motion stops every animation, images have alt, the app is rtl/he
//   Cross        text grows with the browser's font setting (150%) without breaking the layout; the hover preview is
//                sharp at 2x density
//   New UI       the conductor's "for confirmation" bar, row pill and document banner; the hover preview (fast, beside
//                the name, inside the screen)
// Runs after run.mjs (uses its data). Adds one "for confirmation" document when there is none.
// Writes $OUT/design-qa.json and prints PASS/FAIL lines.  node scripts/finance-e2e/design-qa.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const OUT = `${process.env.OUT || '/var/tmp/fin-shots'}/design-qa`
const APP = 'http://127.0.0.1:5180/admin/finance'
fs.mkdirSync(OUT, { recursive: true })
const sql = (q) => execSync(`psql -At -h 127.0.0.1 -p 54329 -U postgres -c ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim()

// a document the conductor was unsure about, so the confirmation UI has something to show
if (sql("select count(*) from fin_documents where status='review' and issues @> '[{\"code\":\"needs_confirmation\"}]'") === '0') {
  sql(`insert into fin_documents select (jsonb_populate_record(null::fin_documents, to_jsonb(d) || jsonb_build_object('id', gen_random_uuid(), 'file_hash', null, 'file_name', 'scan_0042.pdf', 'status', 'review', 'supplier_name', null, 'supplier_id', null, 'total_amount', null, 'duplicate_state', null, 'issues', '[{"level":"warn","code":"needs_confirmation","field":null,"message":"המערכת לא בטוחה שזה חשבונית או קבלה."}]'::jsonb, 'created_at', now()))).* from fin_documents d where file_mime = 'application/pdf' and file_path is not null order by created_at limit 1`)
}
const confirmId = sql("select id from fin_documents where status='review' and issues @> '[{\"code\":\"needs_confirmation\"}]' order by created_at desc limit 1")
const reviewId = sql("select id from fin_documents where status='review' order by created_at limit 1")

const results = []
const check = (id, what, pass, detail) => { results.push({ id, what, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${what} — ${detail}`) }
const browser = await chromium.launch()
async function session(width, opts = {}) {
  const phone = width < 700
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, deviceScaleFactor: opts.dpr || 1, locale: 'he-IL', hasTouch: phone, isMobile: phone, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' })
  const page = await ctx.newPage()
  await page.goto(APP); await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x'); await page.click('button[type=submit]')
  await page.waitForSelector('.fin__main'); await page.waitForTimeout(700)
  return { ctx, page }
}
const open = async (page, path, wait = 600) => { await page.goto(`${APP}${path}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(wait) }

// ---------- reduced motion ----------
{
  const { ctx, page } = await session(1440, { reduce: true })
  const moving = []
  for (const path of ['', '/documents', `/documents/${reviewId}`, '/assistant', '/activity']) {
    await open(page, path, 900)
    const m = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => { const t = a.effect?.getComputedTiming?.() || {}; return { el: a.effect?.target?.className?.toString().slice(0, 40), dur: t.duration, it: t.iterations } }).filter((a) => a.it === Infinity || a.dur > 50))
    const tr = await page.evaluate(() => getComputedStyle(document.querySelector('.fin-btn') || document.body).transitionDuration)
    if (m.length || !/^0s/.test(tr)) moving.push({ path: path || '/', anims: m.slice(0, 3), btnTransition: tr })
  }
  check('RM1', 'הפחתת תנועה: אף אנימציה לא רצה ואין מעברים בכפתורים', !moving.length, moving.length ? JSON.stringify(moving).slice(0, 300) : '5 מסכים, 0 אנימציות')
  await ctx.close()
}

// ---------- keyboard order and states ----------
{
  const { ctx, page } = await session(1440)
  for (const [name, path] of [['overview', ''], ['documents', '/documents'], ['document', `/documents/${reviewId}`], ['assistant', '/assistant']]) {
    await open(page, path)
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0) })
    const bad = []; const seen = new Set(); let stops = 0
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press('Tab')
      const s = await page.evaluate(() => {
        const real = document.activeElement
        if (!real || real === document.body) return null
        // the custom select keeps its native <select> under the visible box for the keyboard; the box shows the ring
        const el = real.classList.contains('fin-sel__native') ? real.closest('.fin-sel') : real
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
        const hidden = !r.width || !r.height || cs.visibility === 'hidden' || cs.opacity === '0' || !!el.closest('[aria-hidden="true"], [inert]')
        const out = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth
        const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)); const cy = Math.min(innerHeight - 1, Math.max(0, r.top + (r.height > 120 ? r.height / 2 : Math.min(r.height / 2, 12))))
        const hit = document.elementFromPoint(cx, cy)
        const covered = !out && hit && !el.contains(hit) && !hit.contains(el) && !hit.closest('label')?.contains(el)
        return { key: real.outerHTML.slice(0, 120), name: (el.getAttribute('aria-label') || el.textContent || el.placeholder || el.tagName).trim().slice(0, 30), hidden, out, covered: covered ? (hit.className?.toString() || hit.tagName).slice(0, 40) : null }
      })
      if (!s) continue
      if (seen.has(s.key)) break
      seen.add(s.key); stops++
      if (s.hidden || s.out || s.covered) bad.push(`${s.name}${s.hidden ? ' (מוסתר)' : ''}${s.out ? ' (מחוץ למסך)' : ''}${s.covered ? ` (מכוסה ע״י ${s.covered})` : ''}`)
    }
    check(`KB-${name}`, `מקלדת: כל עצירת Tab נראית, בתוך המסך ולא מכוסה`, !bad.length && stops > 3, `${stops} עצירות${bad.length ? `, בעיות: ${bad.slice(0, 4).join(' | ')}` : ''}`)
  }

  // disabled buttons look disabled; hover gives feedback
  await open(page, '/assistant')
  const dis = await page.evaluate(() => [...document.querySelectorAll('.fin button:disabled')].filter((b) => b.getBoundingClientRect().width).map((b) => { const cs = getComputedStyle(b); return { name: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 24), op: +cs.opacity, cur: cs.cursor, ok: +cs.opacity < 0.8 || cs.cursor === 'not-allowed' || cs.cursor === 'default' } }))
  check('ST1', 'כפתור מושבת נראה מושבת (שקיפות או סמן)', dis.every((d) => d.ok), dis.length ? dis.map((d) => `${d.name}: ${d.op}/${d.cur}`).slice(0, 4).join(', ') : 'אין כפתור מושבת במסך (שליחה ריקה)')
  await open(page, '/documents')
  const hov = []
  for (const sel of ['.fin-btn--primary', '.fin-btn:not(.fin-btn--primary)', '.fin-nav a, .fin__nav a']) {
    const el = page.locator(sel).first(); if (!(await el.count())) continue
    const before = await el.evaluate((e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.boxShadow, c.borderColor, c.color, c.transform].join('|') })
    await el.hover(); await page.waitForTimeout(350)
    const after = await el.evaluate((e) => { const c = getComputedStyle(e); return [c.backgroundColor, c.boxShadow, c.borderColor, c.color, c.transform].join('|') })
    hov.push({ sel, changed: before !== after }); await page.mouse.move(5, 5)
  }
  check('ST2', 'מעבר עכבר משנה את המראה של כפתורים וקישורי ניווט', hov.every((h) => h.changed), hov.map((h) => `${h.sel.split(',')[0]}: ${h.changed}`).join(', '))

  // empty state
  await page.fill('input[aria-label="חיפוש מסמכים"]', 'zzqqxx-אין-כזה'); await page.waitForTimeout(500)
  const empty = await page.locator('.fin-empty').first().innerText().catch(() => '')
  check('CT1', 'מצב ריק: חיפוש בלי תוצאות מציג הסבר', /אין מסמכים שמתאימים/.test(empty), empty.replace(/\s+/g, ' ').slice(0, 80) || 'אין הודעה')

  // images have alt; rtl + he
  const misc = await page.evaluate(() => ({ noAlt: [...document.querySelectorAll('.fin img:not([alt])')].map((i) => i.src.slice(-40)), dir: getComputedStyle(document.querySelector('.fin')).direction, lang: document.querySelector('.fin')?.closest('[lang]')?.getAttribute('lang') }))
  check('A11', 'תמונות עם alt, כיוון rtl ושפה he', !misc.noAlt.length && misc.dir === 'rtl' && /^he/.test(misc.lang || ''), `בלי alt: ${misc.noAlt.length}, כיוון: ${misc.dir}, שפה: ${misc.lang}`)
  await ctx.close()
}

// ---------- loading and error states ----------
{
  const { ctx, page } = await session(1440)
  await page.route('**/rest/v1/fin_documents*', async (r) => { await new Promise((ok) => setTimeout(ok, 1800)); await r.continue() })
  await page.goto(`${APP}/documents`); await page.waitForTimeout(500)
  const loading = await page.evaluate(() => !!document.querySelector('.fin-skel, .fin-boot, [aria-busy="true"], .fin-loading'))
  await page.screenshot({ path: `${OUT}/loading-documents.png` })
  check('CT2', 'מצב טעינה: רשימה איטית מציגה שלד ולא מסך ריק', loading, loading ? 'מוצג שלד/טעינה' : 'לא נמצא סימן טעינה')
  await page.unrouteAll({ behavior: 'ignoreErrors' })

  await open(page, '/assistant')
  await page.route('**/api/finance', async (r) => { const b = r.request().postDataJSON?.() || {}; if (b.action !== 'ask') return r.continue(); await new Promise((ok) => setTimeout(ok, 1200)); await r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) }) })
  await page.fill('.fin-chat__composer textarea', 'כמה הוצאנו החודש?'); await page.keyboard.press('Enter'); await page.waitForTimeout(400)
  const thinking = await page.locator('.fin-chat__thinking[role=status]').count()
  const composerBusy = await page.evaluate(() => { const b = document.querySelector('.fin-chat__composer button[type=submit]'); return b ? b.disabled : null })
  await page.waitForTimeout(1500)
  const errText = await page.locator('.fin-chat__row.is-ai').last().innerText().catch(() => '')
  await page.screenshot({ path: `${OUT}/assistant-error.png` })
  check('CT3', 'צ׳אט: מצב חשיבה מוצג והשליחה ננעלת בזמן ההמתנה', thinking > 0 && composerBusy !== false, `חשיבה: ${thinking}, שליחה נעולה: ${composerBusy}`)
  check('CT4', 'צ׳אט: שגיאת שרת מוצגת כהודעה ברורה והמסך ממשיך לעבוד', errText.length > 5 && !/undefined|\[object/.test(errText) && (await page.locator('.fin-chat__composer textarea').isEnabled()), errText.replace(/\s+/g, ' ').slice(0, 90))
  await ctx.close()
}

// ---------- text that grows with the browser's font setting ----------
{
  for (const w of [1440, 390]) {
    const { ctx, page } = await session(w)
    const sizes = []; const broken = []
    for (const [name, path] of [['overview', ''], ['documents', '/documents'], ['document', `/documents/${reviewId}`], ['settings', '/settings']]) {
      await open(page, path)
      const base = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.fin__main p, .fin__main td, .fin__main small') || document.body).fontSize))
      await page.addStyleTag({ content: 'html { font-size: 150% !important; }' }); await page.waitForTimeout(300)
      const r = await page.evaluate(() => ({ size: parseFloat(getComputedStyle(document.querySelector('.fin__main p, .fin__main td, .fin__main small') || document.body).fontSize), over: document.documentElement.scrollWidth - document.documentElement.clientWidth }))
      sizes.push(`${name} ${base}→${r.size}`)
      if (r.over > 1) broken.push(`${name} גלילה אופקית ${r.over}px`)
      if (w === 390 && name === 'documents') await page.screenshot({ path: `${OUT}/text150-documents-390.png` })
    }
    check(`TX-${w}`, `גופן דפדפן 150%: הטקסט גדל והמסך לא נשבר (${w}px)`, !broken.length, `${sizes.join(', ')}${broken.length ? ` | ${broken.join(', ')}` : ''}`)
    await ctx.close()
  }
}

// ---------- the conductor's confirmation UI ----------
for (const w of [1440, 390]) {
  const { ctx, page } = await session(w)
  await open(page, '/documents', 900)
  const bar = page.locator('.fin-dupbar.is-confirm')
  const barText = await bar.innerText().catch(() => '')
  const pill = await page.locator('.fin-duppill.is-confirm').count()
  const barBox = await bar.boundingBox().catch(() => null)
  check(`CF1-${w}`, `רשימת מסמכים: פס "מחכים לאישור" וסימון "לאישור" בשורה (${w}px)`, /מחכ/.test(barText) && pill > 0 && barBox && barBox.x >= 0 && barBox.x + barBox.width <= w + 1, `פס: "${barText.split('\n')[0].slice(0, 50)}", סימונים: ${pill}`)
  await page.screenshot({ path: `${OUT}/confirm-bar-${w}.png` })
  await open(page, `/documents/${confirmId}`, 900)
  const banner = page.locator('.fin-panel__confirm')
  const btns = await banner.locator('button').evaluateAll((bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth } }))
  const minH = w < 700 ? 44 : 24   // WCAG 2.5.8 on desktop, the 44px touch rule on phones
  check(`CF2-${w}`, `מסמך לאישור: שאלה ברורה ושני כפתורים, בגודל מגע ובתוך המסך (${w}px)`, btns.length === 2 && btns.every((b) => b.h >= minH && b.inside), btns.map((b) => `${b.t} ${b.w}×${b.h}${b.inside ? '' : ' חורג'}`).join(', ') || 'אין באנר')
  await banner.screenshot({ path: `${OUT}/confirm-banner-${w}.png` }).catch(() => {})
  await ctx.close()
}

// ---------- dark theme through the real switch (headings, ink surfaces, the chat bubble) ----------
{
  const { ctx, page } = await session(1440)
  await page.evaluate(() => localStorage.setItem('kurkoos-adm-theme', 'dark'))
  const RATIO = `(el) => { const p = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\\/]+/).map(Number); return { r, g, b, a } }
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    let e = el; let bg = null; while (e) { const c = p(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) { bg = c; break } e = e.parentElement }
    const fg = p(getComputedStyle(el).color); if (!fg || !bg) return 99; const [x, y] = [lum(fg), lum(bg)].sort((a, b) => b - a); return +((x + 0.05) / (y + 0.05)).toFixed(2) }`
  const low = []
  for (const path of ['/today', '/settings', '/mailboxes', '/documents', '/assistant']) {
    await open(page, path, 900)
    if (path === '/assistant') { await page.fill('.fin-chat__composer textarea', 'כמה הוצאנו החודש?'); await page.keyboard.press('Enter'); await page.waitForTimeout(2500) }
    const r = await page.evaluate((src) => { const ratio = eval(src); return [...document.querySelectorAll('.fin__content :is(h1, h2, h3, h4), .fin__top h1, .fin-chat__bubble.is-me, .fin-action strong, .fin-mono')].filter((el) => el.getBoundingClientRect().width).map((el) => ({ t: el.textContent.trim().slice(0, 24), r: ratio(el) })).filter((x) => x.r < 4.5) }, RATIO)
    low.push(...r.map((x) => `${path} "${x.t}" ${x.r}`))
  }
  await page.screenshot({ path: `${OUT}/dark-assistant.png` })
  check('DK1', 'מצב כהה (דרך המתג האמיתי): כותרות, משטחים כהים ובועת הצ׳אט בניגודיות 4.5:1', !low.length, low.length ? low.slice(0, 5).join(' | ') : '5 מסכים, הכול 4.5:1 ומעלה')
  await page.evaluate(() => localStorage.setItem('kurkoos-adm-theme', 'light'))
  await ctx.close()
}

// ---------- the hover preview, at 2x density ----------
{
  const { ctx, page } = await session(1440, { dpr: 2 })
  await open(page, '/documents', 900)
  const row = page.locator('.fin-table tbody tr[data-mime="application/pdf"]').filter({ has: page.locator('.fin-peek') }).filter({ hasText: '₪' }).first()   // a read invoice with a real PDF (a scanned TIFF is low resolution by nature)
  await row.hover(); await page.waitForTimeout(150)
  const name = row.locator('.fin-peek').first()
  const t0 = Date.now(); await name.hover()
  await page.waitForFunction(() => { const i = document.querySelector('.fin-peek__pop img'); return i && i.complete && i.naturalWidth > 0 }, null, { timeout: 5000 }).catch(() => {})
  const ms = Date.now() - t0
  const g = await page.evaluate(() => {
    const pop = document.querySelector('.fin-peek__pop'); const nm = document.querySelector('.fin-peek:hover') || document.querySelector('.fin-peek')
    if (!pop) return null
    const p = pop.getBoundingClientRect(); const n = nm.getBoundingClientRect(); const img = pop.querySelector('img')
    const overlap = !(p.right <= n.left || p.left >= n.right || p.bottom <= n.top || p.top >= n.bottom)
    return { w: Math.round(p.width), h: Math.round(p.height), inside: p.left >= 0 && p.top >= 0 && p.right <= innerWidth && p.bottom <= innerHeight, overlap, natural: img?.naturalWidth || 0, shown: Math.round(img?.getBoundingClientRect().width || 0), dpr: devicePixelRatio }
  })
  await page.screenshot({ path: `${OUT}/peek-1440@2x.png` })
  check('PK1', 'תצוגה מרחפת: נפתחת מהר, ליד השם ולא עליו, בתוך המסך', g && g.inside && !g.overlap && ms < 1500, g ? `${ms}ms, ${g.w}×${g.h}, בתוך המסך: ${g.inside}, מכסה את השם: ${g.overlap}` : 'לא נפתחה')
  check('PK2', 'תצוגה מרחפת: חדה במסך ברזולוציה כפולה', g && g.natural >= g.shown * g.dpr * 0.9, g ? `ציור ${g.natural}px לתצוגה ${g.shown}px ×${g.dpr}` : 'לא נפתחה')
  await ctx.close()
}

await browser.close()
fs.writeFileSync(`${OUT}/design-qa.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 1))
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exitCode = failed.length ? 1 : 0
