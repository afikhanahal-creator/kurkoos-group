const { chromium, devices } = require('playwright-core');
const OUT = '/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad/qa2/';
async function launch() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
  await ctx.addInitScript(() => { localStorage.setItem('pro_seen', 'true'); localStorage.setItem('ag_v104_done_v1', '1'); localStorage.setItem('ag_v107_done_v1', '1'); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto('http://localhost:8765/t15.html', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(9000);
  return { browser, ctx, page, errors };
}
const E = (page, code) => page.evaluate(c => window.__E(c), code);
async function tap(page, sel) {
  const r = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; }, sel);
  if (!r) throw new Error('no element ' + sel);
  await page.touchscreen.tap(r.x, r.y);
  return r;
}
async function openDrawerView(page, id) {
  await tap(page, '.tbar [data-app="menu"]');
  await page.waitForTimeout(400);
  await page.evaluate(i => { const el = document.querySelector(`#side [data-view="${i}"]`); el && el.scrollIntoView({ block: 'center' }); }, id);
  await page.waitForTimeout(150);
  await tap(page, `#side [data-view="${id}"]`);
  await page.waitForTimeout(900);
}
const rect = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height, display: cs.display, vis: cs.visibility, op: cs.opacity, cls: el.className }; }, sel);
module.exports = { launch, E, tap, openDrawerView, rect, OUT };
