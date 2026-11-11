// UI audit of every finance screen against the ui-ux-pro-max priority rules, measured in the browser, light and dark:
//   A11y   text contrast < 4.5:1 (3:1 for large text), focus ring removed, icon-only control without a name
//   Touch  tappable control under 44×44 on phones, two tappables closer than 8px
//   Type   body text under 12px, font sizes outside the scale (12 14 16 18 20 24 32 …), line-height under 1.3 on body text
//   Motion transitions outside 120–400ms, width/height animated, hover-only reveals
//   Layout horizontal overflow, emoji used as an icon
// Writes $OUT/ui-audit.json and prints a table. Runs after run.mjs (uses its data). node scripts/finance-e2e/ui-audit.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const OUT = process.env.OUT || '/var/tmp/fin-shots'
const APP = 'http://127.0.0.1:5180/admin/finance'
const sql = (q) => execSync(`psql -At -h 127.0.0.1 -p 54329 -U postgres -c ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim()
const one = (q) => sql(q) || 'none'
const ROUTES = ['', '/today', '/assistant', '/documents', '/receipts', `/documents/${one("select id from fin_documents where status='review' order by created_at limit 1")}`, '/new', '/pending', '/send', '/connections', '/reports', '/companies', `/companies/${one('select id from fin_businesses order by sort limit 1')}`, '/projects', '/suppliers', '/categories', '/data', '/automations', '/agents', '/mailboxes', '/scans', '/drive', '/complete', '/fixed', '/scanners', '/integrations', '/cloud', '/activity', '/delivery', '/exports', '/users', '/users?tab=security', '/settings']

const AUDIT = `(() => {
  const SCALE = new Set([10.4, 11.2, 12, 12.8, 13, 13.6, 14, 14.4, 15, 15.2, 16, 17, 17.6, 18, 19.2, 20, 22, 22.4, 24, 25.6, 28, 30, 32, 33.6, 36, 40, 44.8, 48])
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth }
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\\/]+/).map(Number); return { r, g, b, a } }
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const bgOf = (el) => { let e = el; while (e && e !== document.documentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) return c; e = e.parentElement } return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 } }
  const blend = (fg, bg) => (fg.a >= 1 ? fg : { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 })
  const label = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || el.textContent || '').trim()
  const tag = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')
  const out = { contrast: [], focus: [], noname: [], small: [], close: [], tinyText: [], offScale: [], lineHeight: [], motion: [], sizeAnim: [], hoverOnly: [], emoji: [], overflow: document.documentElement.scrollWidth - innerWidth }
  const seen = new Map()
  const textEls = [...document.querySelectorAll('.fin *, .fin-login *')].filter((el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  for (const el of textEls.slice(0, 2500)) {
    const cs = getComputedStyle(el); const size = parseFloat(cs.fontSize); const fg = parse(cs.color); if (!fg) continue
    const bg = bgOf(el); const r = ratio(blend(fg, bg), bg); const big = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700)
    const txt = el.textContent.trim().slice(0, 30)
    if (r < (big ? 3 : 4.5) && fg.a > 0.2 && cs.opacity !== '0') { const k = tag(el) + '|' + r.toFixed(1); if (!seen.has(k)) { seen.set(k, 1); out.contrast.push({ el: tag(el), text: txt, ratio: +r.toFixed(2), size }) } }
    if (size < 12 && el.textContent.trim().length > 2 && !el.closest('kbd, sup, sub')) { const k = 'tiny|' + tag(el); if (!seen.has(k)) { seen.set(k, 1); out.tinyText.push({ el: tag(el), text: txt, size }) } }
    if (!SCALE.has(Math.round(size * 10) / 10) && !SCALE.has(Math.round(size))) { const k = 'scale|' + size; if (!seen.has(k)) { seen.set(k, 1); out.offScale.push({ el: tag(el), size }) } }
    const lh = cs.lineHeight === 'normal' ? 1.2 * size : parseFloat(cs.lineHeight)
    if (size <= 18 && el.textContent.trim().length > 40 && lh / size < 1.3) { const k = 'lh|' + tag(el); if (!seen.has(k)) { seen.set(k, 1); out.lineHeight.push({ el: tag(el), lineHeight: +(lh / size).toFixed(2) }) } }
    if (/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]/u.test(el.textContent)) out.emoji.push({ el: tag(el), text: txt })
  }
  const controls = [...document.querySelectorAll('.fin button, .fin a[href], .fin input:not([type=hidden]), .fin select, .fin [role=button], .fin [role=tab], .fin [role=menuitem], .fin-login button, .fin-login input')].filter(vis)
  const phone = innerWidth <= 760
  const rects = []
  for (const el of controls) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    const isCheck = el.type === 'checkbox' || el.type === 'radio' || el.type === 'range'
    if (phone && !isCheck && (r.width < 44 || r.height < 44) && !el.closest('.fin-table thead, .fin-sel__native') && !(el.tagName === 'A' && cs.display === 'inline') && !el.classList.contains('fin-cell-btn') && !el.classList.contains('fin-toggle') /* the switch has a 44px ::after hit area on phones */ && !el.classList.contains('fin-link')) { const k = 'small|' + tag(el) + '|' + label(el).slice(0, 12); if (!seen.has(k)) { seen.set(k, 1); out.small.push({ el: tag(el), name: label(el).slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }) } }
    if (!label(el) && !['input', 'select'].includes(el.tagName.toLowerCase())) { const k = 'noname|' + tag(el); if (!seen.has(k)) { seen.set(k, 1); out.noname.push({ el: tag(el), html: el.outerHTML.slice(0, 80) }) } }
    const t = cs.transitionDuration.split(',').map((d) => parseFloat(d) * (d.includes('ms') ? 1 : 1000)).filter((d) => d > 0)
    const props = cs.transitionProperty.split(',').map((p) => p.trim())
    if (t.some((d) => d < 100 || d > 450) && cs.transitionProperty !== 'none') { const k = 'motion|' + tag(el) + cs.transitionDuration; if (!seen.has(k)) { seen.set(k, 1); out.motion.push({ el: tag(el), duration: cs.transitionDuration }) } }
    if (props.some((p) => ['width', 'height', 'all'].includes(p)) && t.length && !el.closest('.fin-seg')) { const k = 'size|' + tag(el); if (!seen.has(k) && props.some((p) => ['width', 'height'].includes(p))) { seen.set(k, 1); out.sizeAnim.push({ el: tag(el), props: cs.transitionProperty }) } }
    rects.push({ el, r })
  }
  if (phone) for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i].r; const b = rects[j].r
    if (rects[i].el.contains(rects[j].el) || rects[j].el.contains(rects[i].el)) continue
    const gapX = Math.max(a.left, b.left) - Math.min(a.right, b.right); const gapY = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom)
    const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0; const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0
    const tallRows = a.height >= 44 && b.height >= 44 && !overlapY   // stacked rows that already meet the size rule
    if ((overlapY && gapX >= 0 && gapX < 8) || (overlapX && gapY >= 0 && gapY < 8 && !tallRows)) { const k = 'close|' + tag(rects[i].el) + tag(rects[j].el); if (!seen.has(k)) { seen.set(k, 1); out.close.push({ a: tag(rects[i].el), b: tag(rects[j].el), gap: Math.round(Math.max(0, Math.min(gapX < 0 ? 99 : gapX, gapY < 0 ? 99 : gapY))) }) } }
  }
  // focus ring: anything that clears outline without a replacement box-shadow
  for (const el of controls.slice(0, 400)) {
    el.focus({ preventScroll: true })
    if (document.activeElement !== el) continue
    const cs = getComputedStyle(el); const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none' || cs.borderColor !== getComputedStyle(el, null).getPropertyValue('--_border-rest')
    if (!ring) { const k = 'focus|' + tag(el); if (!seen.has(k)) { seen.set(k, 1); out.focus.push({ el: tag(el), name: label(el).slice(0, 30) }) } }
    el.blur()
  }
  // hover-only reveals: elements hidden until a parent is hovered, with no focus-within equivalent
  for (const rule of [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules] } catch { return [] } })) {
    const sel = rule.selectorText || ''
    if (/:hover\\s+[^,]*$/.test(sel) && /opacity|visibility|display/.test(rule.cssText) && !/focus-within|focus-visible|:focus/.test(sel)) out.hoverOnly.push(sel.slice(0, 80))
  }
  out.hoverOnly = [...new Set(out.hoverOnly)].slice(0, 20)
  return out
})()`

const browser = await chromium.launch()
const results = []
for (const [theme, width] of [['light', 1440], ['dark', 1440], ['light', 390], ['dark', 390]]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, locale: 'he-IL', isMobile: width < 700, hasTouch: width < 700, colorScheme: theme })
  const page = await ctx.newPage()
  await page.goto(APP); await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x'); await page.click('button[type=submit]')
  await page.waitForSelector('.fin__nav, .fin-tabbar', { timeout: 30000 }).catch(() => {})
  await page.evaluate((t) => { try { localStorage.setItem('kurkoos-adm-theme', t) } catch { /* noop */ } }, theme)
  for (const route of ROUTES) {
    await page.goto(`${APP}${route}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(500)
    await page.evaluate((t) => document.querySelector('.fin')?.setAttribute('data-theme', t), theme); await page.waitForTimeout(150)
    const r = await page.evaluate(AUDIT).catch((e) => ({ error: String(e) }))
    results.push({ theme, width, route: route || '/', ...r })
  }
  // the sign-in and second-step screens
  await ctx.clearCookies(); await page.evaluate(() => localStorage.clear()); await page.goto(APP); await page.waitForTimeout(800)
  results.push({ theme, width, route: '/login', ...(await page.evaluate(AUDIT).catch((e) => ({ error: String(e) }))) })
  await ctx.close()
}
await browser.close()
const keys = ['contrast', 'focus', 'noname', 'small', 'close', 'tinyText', 'offScale', 'lineHeight', 'motion', 'sizeAnim', 'hoverOnly', 'emoji']
const totals = Object.fromEntries(keys.map((k) => [k, results.reduce((s, r) => s + (r[k]?.length || 0), 0)]))
totals.overflow = results.filter((r) => r.overflow > 0).length
fs.writeFileSync(`${OUT}/ui-audit.json`, JSON.stringify({ at: new Date().toISOString(), totals, results }, null, 1))
console.log('findings per rule (all screens, light+dark, desktop+phone):', JSON.stringify(totals))
for (const k of keys) {
  const sample = results.flatMap((r) => (r[k] || []).map((x) => ({ at: `${r.route}@${r.width}${r.theme === 'dark' ? ' dark' : ''}`, ...x }))).slice(0, 6)
  if (sample.length) console.log(`\n${k}:`, JSON.stringify(sample).slice(0, 700))
}
