const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page, errors } = await launch();
  const views = await E(page, "VIEWS.flatMap(g=>g[1].map(v=>v[0]))");
  console.log('VIEWS', JSON.stringify(views));
  const sideViews = await page.evaluate(() => [...document.querySelectorAll('#side [data-view]')].map(e => e.dataset.view));
  console.log('SIDE', JSON.stringify(sideViews));
  const res = [];
  let prevView = null;
  for (const id of views) {
    const errBefore = errors.length;
    let r = { id };
    try {
      const inSide = await page.evaluate(i => !!document.querySelector(`#side [data-view="${i}"]`), id);
      r.inSide = inSide;
      if (inSide) await openDrawerView(page, id); else { await E(page, `APP.view='${id}';render()`); await page.waitForTimeout(800); }
      r.view = await E(page, 'APP.view');
      r.sideOpen = await page.evaluate(() => !!document.querySelector('#side.open'));
      r.scrollW = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      const m = await page.evaluate(() => { const a = document.getElementById('appmain'); return { sh: a.scrollHeight, ch: a.clientHeight, st: a.scrollTop, ov: getComputedStyle(a).overflowY }; });
      r.main = m;
      // pill at top
      r.pillTop = await rect(page, '#v106x');
      // scroll to end
      await page.evaluate(() => { document.getElementById('appmain').scrollTop = 1e6; });
      await page.waitForTimeout(500);
      const m2 = await page.evaluate(() => { const a = document.getElementById('appmain'); return { st: a.scrollTop, sh: a.scrollHeight, ch: a.clientHeight, atEnd: Math.abs(a.scrollTop + a.clientHeight - a.scrollHeight) <= 2 }; });
      r.main2 = m2;
      r.tbar = await rect(page, '.tbar');
      r.nav = await rect(page, '#v99nav');
      r.pillEnd = await rect(page, '#v106x');
      r.ih = await page.evaluate(() => innerHeight);
      await page.screenshot({ path: OUT + `v_${id}_end.png` });
      // pill tap
      if (m2.st > 420) {
        const pr = await rect(page, '#v106x.on');
        if (pr && pr.display !== 'none') {
          await tap(page, '#v106x');
          await page.waitForTimeout(800);
          r.afterPill = { view: await E(page, 'APP.view'), st: await page.evaluate(() => document.getElementById('appmain').scrollTop), prevView };
        } else r.afterPill = 'pill not shown';
      }
      r.errs = errors.slice(errBefore);
      await page.evaluate(() => { document.getElementById('appmain').scrollTop = 0; });
      await page.screenshot({ path: OUT + `v_${id}_top.png` });
    } catch (e) { r.err = String(e.message).slice(0, 200); }
    prevView = id;
    res.push(r);
    console.log(JSON.stringify(r));
  }
  console.log('ERRORS', JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
