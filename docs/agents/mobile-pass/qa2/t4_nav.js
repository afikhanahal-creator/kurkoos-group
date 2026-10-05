const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page, errors } = await launch();
  const r = {};
  r.nav = await page.evaluate(() => {
    const n = document.getElementById('v99nav'); if (!n) return null;
    const cs = getComputedStyle(n);
    return { display: cs.display, dir: cs.direction, children: [...n.children].map(b => { const bb = b.getBoundingClientRect(); const svg = b.querySelector('svg'); return { tag: b.tagName, key: b.dataset.v99nav, label: b.textContent.trim(), left: Math.round(bb.left), right: Math.round(bb.right), w: Math.round(bb.width), h: Math.round(bb.height), svg: !!svg, shapes: svg ? svg.querySelectorAll('path,rect,circle,line,polyline,polygon').length : 0, current: b.getAttribute('aria-current') }; }) };
  });
  console.log('NAV', JSON.stringify(r.nav));
  await page.screenshot({ path: OUT + 'nav_bar.png' });
  const taps = [];
  for (const key of ['today', 'queue', 'calendar', 'gallery']) {
    const before = await E(page, 'APP.view');
    const b = await page.evaluate(k => { const el = document.querySelector(`#v99nav [data-v99nav="${k}"]`); if (!el) return null; const bb = el.getBoundingClientRect(); return { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; }, key);
    if (!b) { taps.push({ key, err: 'no button' }); continue; }
    await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(800);
    const after = await E(page, 'APP.view');
    const cur = await page.evaluate(() => (document.querySelector('#v99nav [aria-current="page"]') || {}).dataset?.v99nav);
    taps.push({ key, before, after, current: cur });
  }
  console.log('TAPS', JSON.stringify(taps));
  // menu
  const m = await page.evaluate(() => { const el = document.querySelector('#v99nav [data-v99nav="__menu"]'); const bb = el.getBoundingClientRect(); return { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2 }; });
  await page.touchscreen.tap(m.x, m.y); await page.waitForTimeout(500);
  r.menuOpen = await page.evaluate(() => ({ open: !!document.querySelector('#side.open'), nav: getComputedStyle(document.getElementById('v99nav')).display, side: (() => { const s = document.getElementById('side'); const b = s.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) }; })() }));
  await page.screenshot({ path: OUT + 'nav_menu_open.png' });
  // tap outside
  const outsideX = r.menuOpen.side.left > 50 ? 20 : 370;
  await page.touchscreen.tap(outsideX, 420); await page.waitForTimeout(500);
  r.menuAfterOutside = await page.evaluate(() => ({ open: !!document.querySelector('#side.open'), nav: getComputedStyle(document.getElementById('v99nav')).display }));
  console.log('MENU', JSON.stringify({ open: r.menuOpen, afterOutside: r.menuAfterOutside, outsideX }));
  console.log('PAGEERRORS', JSON.stringify(errors.filter(e => !/404|ERR_/.test(e))));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
