const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page, errors } = await launch();
  const r = {};
  const btn = () => page.evaluate(() => { const el = document.querySelector('#v99nav [data-v99nav="__menu"]'); const bb = el.getBoundingClientRect(); return { x: bb.left + bb.width / 2, y: bb.top + bb.height / 2, top: bb.top, h: bb.height }; });
  await page.evaluate(() => { window.__log = []; document.addEventListener('click', e => __log.push('click:' + (e.target.closest('[data-v99nav]') ? 'nav-' + e.target.closest('[data-v99nav]').dataset.v99nav : e.target.tagName)), true); document.addEventListener('touchstart', e => __log.push('ts'), true); document.addEventListener('pointerdown', e => __log.push('pd:' + e.target.tagName), true); const s = document.getElementById('side'); new MutationObserver(() => __log.push('side:' + s.className + '@' + Math.round(performance.now()))).observe(s, { attributes: true, attributeFilter: ['class'] }); });
  let b = await btn(); r.btn = b;
  r.hit = await page.evaluate(({ x, y }) => document.elementsFromPoint(x, y).slice(0, 4).map(e => e.tagName + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '')), b);
  await page.touchscreen.tap(b.x, b.y);
  const poll = []; for (let i = 0; i < 12; i++) { await page.waitForTimeout(100); poll.push(await page.evaluate(() => !!document.querySelector('#side.open'))); }
  r.pollAfterTouchTap = poll; r.log = await page.evaluate(() => __log);
  await page.screenshot({ path: OUT + 'nav_menu_touch.png' });
  // try mouse click
  await page.evaluate(() => { __log.length = 0; document.getElementById('side').classList.remove('open'); });
  b = await btn(); await page.mouse.click(b.x, b.y); await page.waitForTimeout(600);
  r.afterMouseClick = { open: await page.evaluate(() => !!document.querySelector('#side.open')), log: await page.evaluate(() => __log) };
  await page.evaluate(() => { document.getElementById('side').classList.remove('open'); __log.length = 0; });
  // compare with tbar menu
  await tap(page, '.tbar [data-app="menu"]'); await page.waitForTimeout(600);
  r.tbarMenu = { open: await page.evaluate(() => !!document.querySelector('#side.open')), log: await page.evaluate(() => __log) };
  // outside tap closes?
  await page.touchscreen.tap(20, 420); await page.waitForTimeout(500);
  r.afterOutside = await page.evaluate(() => !!document.querySelector('#side.open'));
  // after a view change, does the nav menu button work?
  await openDrawerView(page, 'gallery'); await page.evaluate(() => { __log.length = 0; });
  b = await btn(); await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(600);
  r.afterGallery = { open: await page.evaluate(() => !!document.querySelector('#side.open')), log: await page.evaluate(() => __log), btn: b };
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
