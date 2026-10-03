const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page, errors } = await launch();
  const r = {};
  r.initial = await E(page, 'APP.view');
  r.backInitial = (await rect(page, '#v102back') || {}).display;
  await openDrawerView(page, 'today');
  r.afterToday = { view: await E(page, 'APP.view'), back: await rect(page, '#v102back') };
  await openDrawerView(page, 'gallery');
  r.afterGallery = { view: await E(page, 'APP.view'), back: await rect(page, '#v102back') };
  await page.screenshot({ path: OUT + 'back_arrow.png' });
  // tap arrow
  const b = await rect(page, '#v102back');
  if (b && b.display !== 'none') {
    const pts = await page.evaluate(() => { const el = document.getElementById('v102back'); const bb = el.getBoundingClientRect(); return document.elementsFromPoint(bb.left + bb.width / 2, bb.top + bb.height / 2).slice(0, 3).map(e => e.id || e.className || e.tagName); });
    r.arrowStack = pts;
    await tap(page, '#v102back'); await page.waitForTimeout(800);
    r.afterArrow = { view: await E(page, 'APP.view'), url: page.url(), back: (await rect(page, '#v102back') || {}).display };
  }
  // goBack
  await openDrawerView(page, 'calendar');
  r.beforeGoBack = { view: await E(page, 'APP.view'), url: page.url(), hist: await page.evaluate(() => history.length) };
  await page.goBack(); await page.waitForTimeout(900);
  r.afterGoBack = { view: await E(page, 'APP.view'), url: page.url() };
  await page.goBack(); await page.waitForTimeout(900);
  r.afterGoBack2 = { view: await E(page, 'APP.view'), url: page.url() };
  await page.goBack(); await page.waitForTimeout(900);
  r.afterGoBack3 = { view: await E(page, 'APP.view'), url: page.url() };
  await page.goBack().catch(e => r.gb4err = String(e.message).slice(0, 80)); await page.waitForTimeout(900);
  r.afterGoBack4 = { url: page.url(), hasE: await page.evaluate(() => typeof window.__E) };
  if (r.afterGoBack4.hasE === 'function') r.afterGoBack4.view = await E(page, 'APP.view');
  console.log(JSON.stringify(r, null, 1));
  console.log('PAGEERRORS', JSON.stringify(errors.filter(e => !/404|ERR_/.test(e))));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
