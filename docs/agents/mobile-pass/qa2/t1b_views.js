const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page, errors } = await launch();
  // drawer scroll check
  await tap(page, '.tbar [data-app="menu"]'); await page.waitForTimeout(400);
  const side = await page.evaluate(() => { const s = document.getElementById('side'); const cs = getComputedStyle(s); const items = [...s.querySelectorAll('[data-view]')].map(e => { const b = e.getBoundingClientRect(); return [e.dataset.view, Math.round(b.top), Math.round(b.bottom), Math.round(b.height)]; }); return { ov: cs.overflowY, sh: s.scrollHeight, ch: s.clientHeight, items }; });
  console.log('SIDE', JSON.stringify(side));
  await page.screenshot({ path: OUT + 'drawer_open.png' });
  await page.touchscreen.tap(30, 400); await page.waitForTimeout(400);
  console.log('side open after outside tap?', await page.evaluate(() => !!document.querySelector('#side.open')));
  let prevView = await E(page, 'APP.view');
  for (const id of ['cloner', 'competitors', 'analyze', 'times', 'settings', 'fonts']) {
    const errBefore = errors.length;
    let r = { id };
    try {
      await openDrawerView(page, id);
      r.view = await E(page, 'APP.view');
      r.sideOpen = await page.evaluate(() => !!document.querySelector('#side.open'));
      r.scrollW = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      r.pillTop = (await rect(page, '#v106x') || {}).display;
      await page.evaluate(() => { document.getElementById('appmain').scrollTop = 1e6; });
      await page.waitForTimeout(500);
      r.main2 = await page.evaluate(() => { const a = document.getElementById('appmain'); return { st: a.scrollTop, sh: a.scrollHeight, ch: a.clientHeight, atEnd: Math.abs(a.scrollTop + a.clientHeight - a.scrollHeight) <= 2 }; });
      const t = await rect(page, '.tbar'), n = await rect(page, '#v99nav'), p = await rect(page, '#v106x');
      r.tbarTop = t.top; r.navBottom = n.bottom; r.navDisplay = n.display; r.pillEnd = p && [p.display, p.cls, p.top, p.left];
      await page.screenshot({ path: OUT + `v_${id}_end.png` });
      if (r.main2.st > 420) {
        await tap(page, '#v106x'); await page.waitForTimeout(800);
        r.afterPill = { view: await E(page, 'APP.view'), st: await page.evaluate(() => document.getElementById('appmain').scrollTop), prevView };
      }
      r.errs = errors.slice(errBefore).filter(e => !/404|ERR_/.test(e));
      await page.evaluate(() => { document.getElementById('appmain').scrollTop = 0; });
      await page.screenshot({ path: OUT + `v_${id}_top.png` });
    } catch (e) { r.err = String(e.message).slice(0, 200); }
    prevView = id;
    console.log(JSON.stringify(r));
  }
  console.log('PAGEERRORS', JSON.stringify(errors.filter(e => !/404|ERR_/.test(e))));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
