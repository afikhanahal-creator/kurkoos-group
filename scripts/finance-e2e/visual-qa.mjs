// Visual QA of the whole finance app, run after run.mjs (it uses the data that run leaves behind).
// Every route at 9 widths: horizontal overflow, elements cut by the viewport edge, controls smaller than the touch
// minimum on phones, and console errors. Then each dropdown and menu type is exercised on its own: open, search,
// keyboard, Escape, click outside, long labels, empty results, the phone sheet, and staying inside the viewport.
// Writes $OUT/qa/*.png and $OUT/qa/visual-qa.json.  node scripts/finance-e2e/visual-qa.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const OUT = `${process.env.OUT || '/var/tmp/fin-shots'}/qa`
const APP = 'http://127.0.0.1:5180/admin/finance'
fs.mkdirSync(OUT, { recursive: true })
const sql = (q) => execSync(`psql -At -h 127.0.0.1 -p 54329 -U postgres -c ${JSON.stringify(q)}`, { encoding: 'utf8' }).trim()

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]
const SHOT_AT = new Set([390, 1440])
const one = (q) => sql(q) || 'none'
const ROUTES = [
  ['overview', ''], ['dashboard', '/today'], ['assistant', '/assistant'], ['send', '/send'], ['connections', '/connections'], ['documents', '/documents'], ['receipts', '/receipts'], ['new', '/new'], ['pending', '/pending'], ['document', `/documents/${one("select id from fin_documents where status='review' order by created_at limit 1")}`],
  ['reports', '/reports'], ['companies', '/companies'], ['company', `/companies/${one('select id from fin_businesses order by sort limit 1')}`],
  ['projects', '/projects'], ['project', `/projects/${one('select id from fin_projects order by created_at limit 1')}`], ['suppliers', '/suppliers'],
  ['supplier', `/suppliers/${one('select id from fin_suppliers order by created_at limit 1')}`], ['categories', '/categories'], ['data', '/data'],
  ['automations', '/automations'], ['agents', '/agents'], ['mailboxes', '/mailboxes'], ['scans', '/scans'], ['drive', '/drive'], ['complete', '/complete'], ['fixed', '/fixed'], ['scanners', '/scanners'], ['integrations', '/integrations'],
  ['cloud', '/cloud'], ['activity', '/activity'], ['delivery', '/delivery'], ['exports', '/exports'], ['users', '/users'], ['settings', '/settings'],
]

const browser = await chromium.launch()
const errors = []
async function session(width) {
  const phone = width < 700
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, deviceScaleFactor: 1, locale: 'he-IL', hasTouch: phone, isMobile: phone })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${width}px pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource|realtime\/v1\/websocket/.test(m.text())) errors.push(`${width}px console: ${m.text().slice(0, 160)}`) })
  await page.goto(APP); await page.fill('input[type=email]', 'admin@kurkoos.test'); await page.fill('input[type=password]', 'Passw0rd!x'); await page.click('button[type=submit]')
  await page.waitForSelector('.fin__main'); await page.waitForTimeout(800)
  return { ctx, page }
}
const audit = (page, phone) => page.evaluate((phone) => {
  const vw = document.documentElement.clientWidth
  const overflow = document.documentElement.scrollWidth - vw
  const cut = []; const small = []
  for (const el of document.querySelectorAll('.fin__main button, .fin__main a, .fin__main input, .fin__main .fin-sel, .fin__main .fin-pill, .fin__main h2, .fin__main h3')) {
    if (el.closest('.fin-table-wrap, .fin-sel__native, [hidden], .fin-tabs, .fin-scroll-x')) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden' || st.opacity === '0') continue
    if (r.left < -1 || r.right > vw + 1) cut.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`)
    if (phone && (el.tagName === 'BUTTON' || el.classList.contains('fin-sel')) && !el.closest('.fin-cell-btn, .fin-check, .fin-chipbtn') && (r.height < 32 || r.width < 32)) small.push(`${(el.innerText || el.getAttribute('aria-label') || el.className).toString().trim().slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}`)
  }
  return { overflow, cut: [...new Set(cut)].slice(0, 6), small: [...new Set(small)].slice(0, 6) }
}, phone)

// ---------- 1. every route at every width ----------
const grid = {}
for (const w of WIDTHS) {
  const { ctx, page } = await session(w)
  for (const [name, path] of ROUTES) {
    await page.goto(`${APP}${path}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(450)
    const a = await audit(page, w < 700)
    ;(grid[name] ||= {})[w] = a
    if (SHOT_AT.has(w)) await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: false })
  }
  await ctx.close()
}

// ---------- 2. dropdowns and menus, one type at a time ----------
const checks = []
const check = (id, what, pass, detail) => { checks.push({ id, what, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id} ${what} — ${detail}`) }
const inView = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 }, sel)

{ // desktop
  const { ctx, page } = await session(1440)
  // a filter dropdown on the documents list: open, options, keyboard, select, Escape, outside click
  await page.goto(`${APP}/documents`); await page.waitForTimeout(800)
  await page.locator('button[aria-controls="fin-doc-filters"]').click(); await page.waitForTimeout(250)
  const sel = page.locator('#fin-doc-filters .fin-sel').first()
  await sel.locator('.fin-sel__btn').click(); await page.waitForTimeout(250)
  const opts = await page.locator('.fin-sel__pop [role=option]').count()
  const inside = await inView(page, '.fin-sel__pop')
  await page.screenshot({ path: `${OUT}/dd-filter-open-1440.png` })
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(250)
  const closedAfterEnter = !(await page.locator('.fin-sel__pop').count())
  const nativeVal = await sel.locator('select').inputValue()
  check('DD1', 'פילטר: פתיחה, חצים ו-Enter בוחרים, נסגר', opts > 1 && inside && closedAfterEnter && nativeVal !== '', `${opts} אפשרויות, בתוך המסך: ${inside}, ערך: ${nativeVal}`)
  await sel.locator('.fin-sel__btn').click(); await page.waitForTimeout(150); await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  const escClosed = !(await page.locator('.fin-sel__pop').count())
  const focusBack = await page.evaluate(() => document.activeElement?.classList.contains('fin-sel__native'))
  await sel.locator('.fin-sel__btn').click(); await page.waitForTimeout(150); await page.mouse.click(700, 860); await page.waitForTimeout(150)
  const outsideClosed = !(await page.locator('.fin-sel__pop').count())
  check('DD2', 'Escape וקליק בחוץ סוגרים, הפוקוס חוזר לשדה', escClosed && focusBack && outsideClosed, `Escape: ${escClosed}, פוקוס: ${focusBack}, בחוץ: ${outsideClosed}`)
  // keyboard only: Tab to the field, ArrowDown opens
  await sel.locator('select').focus(); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200)
  const kbOpen = await page.locator('.fin-sel__pop').count(); await page.keyboard.press('Escape')
  check('DD3', 'מקלדת בלבד: חץ למטה על השדה פותח את הרשימה', kbOpen === 1, `נפתח: ${kbOpen === 1}`)
  // a long searchable list inside a dialog: search, empty result, long names wrap, list scrolls inside
  sql("insert into fin_projects (name, code, business_id) select 'פרויקט עם שם ארוך במיוחד לבדיקת שבירת שורות ברשימה הנפתחת ' || g || ' ' || left(b.name, 6), 'QA-' || g || '-' || left(b.id::text, 4), b.id from generate_series(1, 14) g cross join fin_businesses b on conflict do nothing")
  await page.goto(`${APP}/projects`); await page.waitForTimeout(800)
  await page.reload(); await page.waitForTimeout(900)
  await page.goto(`${APP}/documents/${one("select id from fin_documents where status='review' and business_id is not null order by created_at limit 1")}`); await page.waitForTimeout(1300)
  const projSel = page.locator('.fin-panel .fin-sel').filter({ has: page.locator('option', { hasText: 'QA-' }) }).first()
  const hasProj = await projSel.count()
  if (hasProj) {
    await projSel.locator('.fin-sel__btn').click(); await page.waitForTimeout(250)
    const hasSearch = await page.locator('.fin-sel__search input').count()
    const before = await page.locator('.fin-sel__pop [role=option]').count()
    await page.keyboard.type('ארוך במיוחד QA-12-'); await page.waitForTimeout(150)
    const after = await page.locator('.fin-sel__pop [role=option]').count()
    await page.screenshot({ path: `${OUT}/dd-search-1440.png` })
    const scrolls = await page.evaluate(() => { const l = document.querySelector('.fin-sel__list'); return l ? l.scrollHeight >= l.clientHeight : false })
    await page.keyboard.press('Control+a'); await page.keyboard.type('אין כזה פרויקט'); await page.waitForTimeout(150)
    const empty = await page.locator('.fin-sel__empty').innerText().catch(() => '')
    const inside2 = await inView(page, '.fin-sel__pop')
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
    const panelStillOpen = await page.locator('.fin-panel').count()
    check('DD4', 'רשימה ארוכה: חיפוש, "אין תוצאות", שמות ארוכים, בתוך המסך, Escape לא סוגר את החלון שמאחור', hasSearch && after >= 1 && before > after && /אין תוצאות/.test(empty) && inside2 && panelStillOpen && scrolls, `חיפוש: ${!!hasSearch}, ${before}→${after}, ריק: "${empty}", בתוך המסך: ${inside2}, החלון נשאר: ${!!panelStillOpen}`)
  } else check('DD4', 'רשימה ארוכה עם חיפוש', false, 'לא נמצא שדה פרויקט בחלון המסמך')
  // a dropdown at the bottom of the screen opens upward instead of being cut
  await page.goto(`${APP}/documents`); await page.waitForTimeout(800)
  await page.locator('button[aria-controls="fin-doc-filters"]').click(); await page.waitForTimeout(250)
  const low = page.locator('#fin-doc-filters .fin-sel').first()
  const lowBottom = await low.evaluate((el) => el.getBoundingClientRect().bottom)
  await page.setViewportSize({ width: 1440, height: Math.round(lowBottom + 40) }); await page.waitForTimeout(250)
  const nearBottom = await low.evaluate((el) => innerHeight - el.getBoundingClientRect().bottom)
  await low.locator('.fin-sel__btn').click(); await page.waitForTimeout(250)
  const flip = await inView(page, '.fin-sel__pop')
  const up = await page.evaluate(() => { const p = document.querySelector('.fin-sel__pop').getBoundingClientRect(); const b = document.querySelector('#fin-doc-filters .fin-sel').getBoundingClientRect(); return p.bottom <= b.top + 1 })
  await page.screenshot({ path: `${OUT}/dd-flip-1440.png` })
  check('DD5', 'שדה בתחתית המסך נפתח כלפי מעלה ולא נחתך', flip && up, `מרחק מהתחתית: ${Math.round(nearBottom)}px, למעלה: ${up}, בתוך המסך: ${flip}`)
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 900 })
  // ⋮ menu inside a card: floats, arrows move, Escape closes, focus returns
  await page.goto(`${APP}/mailboxes`); await page.waitForTimeout(800)
  const more = page.locator('.fin-more .fin-icon-btn').first()
  await more.click(); await page.waitForTimeout(200)
  const menuInView = await inView(page, '.fin-more__pop')
  const firstFocused = await page.evaluate(() => document.activeElement?.getAttribute('role'))
  await page.keyboard.press('ArrowDown'); const second = await page.evaluate(() => document.activeElement?.innerText)
  await page.screenshot({ path: `${OUT}/menu-1440.png` })
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  const menuClosed = !(await page.locator('.fin-more__pop').count()); const back = await page.evaluate(() => document.activeElement?.getAttribute('aria-haspopup'))
  check('MN1', 'תפריט ⋮: בתוך המסך, פוקוס על הפריט הראשון, חצים, Escape מחזיר פוקוס', menuInView && firstFocused === 'menuitem' && !!second && menuClosed && back === 'menu', `בתוך המסך: ${menuInView}, פוקוס: ${firstFocused}, חץ: "${second}", חזר: ${back}`)
  // collapsible sidebar
  await page.locator('.fin__collapse').click(); await page.waitForTimeout(300)
  const railW = await page.locator('.fin__side').evaluate((el) => el.getBoundingClientRect().width)
  await page.screenshot({ path: `${OUT}/rail-1440.png` })
  await page.reload(); await page.waitForTimeout(800)
  const kept = await page.locator('.fin.is-collapsed').count()
  await page.locator('.fin__collapse').click(); await page.waitForTimeout(200)
  check('NAV1', 'תפריט צד מתכווץ לפס אייקונים ונשמר אחרי רענון', railW < 100 && kept === 1, `רוחב: ${Math.round(railW)}px, נשמר: ${kept === 1}`)
  // Tab stays inside a dialog
  await page.goto(`${APP}/users`); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /הוספת רו״ח או חבר צוות|^הזמנה$/ }).first().click(); await page.waitForTimeout(300)
  let escaped = false
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => !!document.activeElement?.closest('.fin-modal')))) { escaped = true; break } }
  await page.keyboard.press('Escape')
  check('MD1', 'Tab נשאר בתוך חלון פתוח', !escaped, `יצא מהחלון: ${escaped}`)
  await ctx.close()
}

for (const w of [320, 390]) { // phones
  const { ctx, page } = await session(w)
  await page.goto(`${APP}/documents`); await page.waitForTimeout(900)
  await page.locator('button[aria-controls="fin-doc-filters"]').tap(); await page.waitForTimeout(250)
  const sel = page.locator('#fin-doc-filters .fin-sel').first()
  await sel.locator('.fin-sel__btn').tap(); await page.waitForTimeout(350)
  const sheet = await page.locator('.fin-sel__pop.is-sheet').count()
  const fits = await inView(page, '.fin-sel__pop')
  const rowH = await page.locator('.fin-sel__pop [role=option]').first().evaluate((el) => el.getBoundingClientRect().height)
  await page.screenshot({ path: `${OUT}/dd-sheet-${w}.png` })
  await page.locator('.fin-sel__pop [role=option]').nth(1).tap(); await page.waitForTimeout(250)
  const picked = await sel.locator('select').inputValue()
  check(`DD6-${w}`, `טלפון ${w}px: רשימה נפתחת כגיליון תחתון, שורות 44px+, בחירה בנגיעה`, sheet === 1 && fits && rowH >= 44 && picked !== '', `גיליון: ${sheet === 1}, בתוך המסך: ${fits}, גובה שורה: ${Math.round(rowH)}, ערך: ${picked}`)
  await page.goto(`${APP}/mailboxes`); await page.waitForTimeout(800)
  await page.locator('.fin-more .fin-icon-btn').first().tap(); await page.waitForTimeout(350)
  const actionSheet = await page.locator('.fin-more__pop.is-sheet').count(); const cancel = await page.locator('.fin-more__cancel').count()
  await page.screenshot({ path: `${OUT}/menu-sheet-${w}.png` })
  await page.locator('.fin-more__cancel').tap(); await page.waitForTimeout(250)
  check(`MN2-${w}`, `טלפון ${w}px: תפריט ⋮ כגיליון פעולות עם "ביטול"`, actionSheet === 1 && cancel === 1 && !(await page.locator('.fin-more__pop').count()), `גיליון: ${actionSheet === 1}`)
  await page.goto(`${APP}/companies`); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /הוסף חברה/ }).first().tap().catch(() => {}); await page.waitForTimeout(400)
  const dlg = await page.evaluate(() => { const b = document.querySelector('.fin-modal__box'); if (!b) return null; const r = b.getBoundingClientRect(); return { bottom: Math.round(innerHeight - r.bottom), top: Math.round(r.top), w: Math.round(r.width) } })
  await page.screenshot({ path: `${OUT}/dialog-${w}.png` })
  check(`MD2-${w}`, `טלפון ${w}px: חלון נפתח כגיליון לרוחב המסך ולא חורג`, dlg && dlg.bottom === 0 && dlg.top >= 0 && dlg.w === w, JSON.stringify(dlg))
  await ctx.close()
}

await browser.close()
const bad = Object.entries(grid).flatMap(([r, byW]) => Object.entries(byW).filter(([, a]) => a.overflow > 0 || a.cut.length || a.small.length).map(([w, a]) => ({ route: r, width: Number(w), ...a })))
fs.writeFileSync(`${OUT}/visual-qa.json`, JSON.stringify({ at: new Date().toISOString(), widths: WIDTHS, routes: ROUTES.map((r) => r[0]), problems: bad, checks, errors }, null, 1))
console.log(`\nroutes × widths: ${ROUTES.length} × ${WIDTHS.length}; with problems: ${bad.length}`)
for (const b of bad) console.log(`  ${b.route} @${b.width}: overflow ${b.overflow}${b.cut.length ? ` · cut ${b.cut.join(' | ')}` : ''}${b.small.length ? ` · small ${b.small.join(' | ')}` : ''}`)
console.log(`checks: ${checks.filter((c) => c.pass).length}/${checks.length}; console errors: ${errors.length}`)
for (const e of errors.slice(0, 10)) console.log(`  ${e}`)
