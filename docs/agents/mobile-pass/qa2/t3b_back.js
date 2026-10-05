const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
const topId = p => E(p, "(function(){const o=__v101.top();return o?(o.id||o.className):null})()");
(async () => {
  const { browser, page, errors } = await launch();
  const r = {};
  // composer via .cmpb
  await openDrawerView(page, 'today');
  await E(page, "openComposer({})"); await page.waitForTimeout(900);
  r.composer = await page.evaluate(() => { const b = document.querySelector('.cmpb'); const vis = el => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; const c = document.querySelector('[data-app="cmpclose"]'); const cr = c && c.getBoundingClientRect(); return { cmpb: vis(b), cmpbH: b && Math.round(b.getBoundingClientRect().height), pos: b && getComputedStyle(b).position, close: cr && { top: Math.round(cr.top), left: Math.round(cr.left), w: cr.width, h: cr.height }, pinned: (() => { const p = document.getElementById('v101x'); return p ? getComputedStyle(p).display : 'absent'; })(), nav: getComputedStyle(document.getElementById('v99nav')).display }; });
  r.composer.view = await E(page, 'APP.view'); r.composer.top = await topId(page);
  await page.screenshot({ path: OUT + 'win_composer_cmpb.png' });
  await page.goBack(); await page.waitForTimeout(1000);
  r.composer.afterBack = { cmpb: await page.evaluate(() => { const b = document.querySelector('.cmpb'); return !!(b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0); }), view: await E(page, 'APP.view'), url: page.url(), nav: await page.evaluate(() => getComputedStyle(document.getElementById('v99nav')).display) };
  console.log('COMPOSER', JSON.stringify(r.composer));
  // double-pop test for each window: open on view X (stack has prev), goBack, view should stay X
  const wins = [
    ['lightbox', 'gallery', "GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()", '#ga-lb'],
    ['editor', 'gallery', "const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)", '#pe-root'],
    ['composer', 'today', "openComposer({})", '.cmpb'],
    ['anim', 'calendar', "document.body.insertAdjacentHTML('beforeend','<div id=\"v52m\" class=\"v52m\"><div class=\"v52box\"><header><button type=\"button\" class=\"px-ib\" data-v52=\"close\" aria-label=\"סגירה\">✕</button></header></div></div>')", '#v52m'],
    ['shapes', 'agent', "document.body.insertAdjacentHTML('beforeend','<div id=\"v68sp\"><header><button type=\"button\" data-v68=\"x\">✕</button></header><div style=\"height:3000px\"></div></div>')", '#v68sp'],
    ['tplprev', 'videos', "document.body.insertAdjacentHTML('beforeend','<div id=\"v66tp\"><div style=\"height:3000px\"></div></div>')", '#v66tp'],
  ];
  for (const [name, view, code, sel] of wins) {
    await openDrawerView(page, view);
    const before = { view: await E(page, 'APP.view'), hist: await page.evaluate(() => history.length) };
    await E(page, code); await page.waitForTimeout(900);
    const open = { top: await topId(page), hist: await page.evaluate(() => history.length) };
    await page.goBack(); await page.waitForTimeout(1000);
    const after = { winVis: await page.evaluate(s => { const b = document.querySelector(s); return !!(b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0); }, sel), view: await E(page, 'APP.view'), top: await topId(page), hist: await page.evaluate(() => history.length), url: page.url() };
    console.log(name, JSON.stringify({ before, open, after, doublePop: after.view !== before.view }));
    if (after.top) { await E(page, "const o=__v101.top();o&&__v101.closeOverlay(o)"); await page.waitForTimeout(600); }
  }
  // effects sheet on videos: open, tap close, reopen, goBack
  await openDrawerView(page, 'videos');
  const openFx = async () => { await page.evaluate(() => { const el = document.querySelector('#appviews [data-v100="editknown"]'); el && el.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(250); await tap(page, '#appviews [data-v100="editknown"]'); await page.waitForTimeout(900); return page.evaluate(() => { const s = document.querySelector('.v103sh'); return !!(s && s.getBoundingClientRect().height > 0); }); };
  const fx = { view0: await E(page, 'APP.view'), open1: await openFx() };
  const c = await rect(page, '.v103sh [data-v103="close"]'); fx.close = c && { top: c.top, left: c.left, w: c.w, h: c.h };
  if (c) { await page.touchscreen.tap(c.left + c.w / 2, c.top + c.h / 2); await page.waitForTimeout(900); }
  fx.afterTap = await page.evaluate(() => !!document.querySelector('.v103sh'));
  fx.viewAfterTap = await E(page, 'APP.view');
  fx.open2 = await openFx();
  if (!fx.open2) { await page.screenshot({ path: OUT + 'win_effects_reopen_fail.png' }); fx.btn = await rect(page, '#appviews [data-v100="editknown"]'); fx.open3 = await openFx(); }
  await page.goBack(); await page.waitForTimeout(1000);
  fx.afterBack = { sheet: await page.evaluate(() => !!document.querySelector('.v103sh')), view: await E(page, 'APP.view'), url: page.url() };
  console.log('EFFECTS', JSON.stringify(fx));
  console.log('PAGEERRORS', JSON.stringify(errors.filter(e => !/404|ERR_/.test(e))));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
