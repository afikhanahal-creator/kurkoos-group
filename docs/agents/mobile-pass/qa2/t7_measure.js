const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
(async () => {
  const { browser, page } = await launch();
  const out = {};
  for (const v of ['gallery', 'agent', 'templates', 'videos']) {
    await openDrawerView(page, v);
    out['tbar_' + v] = await page.evaluate(() => {
      const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
      const tb = document.querySelector('.tbar'); const rows = [...tb.children].map(c => ({ cls: c.className, id: c.id, r: R(c) }));
      const btns = [...tb.querySelectorAll('button,a,label,select,input')].filter(b => b.closest("#vact")).map(b => { const r = R(b); const txt = (b.textContent || '').trim().slice(0, 30); const sw = b.scrollWidth; const cs = getComputedStyle(b); return { sel: b.tagName.toLowerCase() + (b.id ? '#' + b.id : '') + '.' + String(b.className).split(' ').slice(0, 2).join('.') + (b.dataset.app ? `[data-app=${b.dataset.app}]` : b.dataset.ga ? `[data-ga=${b.dataset.ga}]` : b.dataset.v100 ? `[data-v100=${b.dataset.v100}]` : ''), txt, r, scrollW: sw, overflow: cs.overflow, ws: cs.whiteSpace, fs: cs.fontSize, labelSpan: (() => { const s = b.querySelector('span,b'); return s ? R(s) : null; })() }; });
      return { tbarH: R(tb).h, rows, btns };
    });
  }
  // pill vs tbar buttons on today
  await openDrawerView(page, 'today');
  await page.evaluate(() => { document.getElementById('appmain').scrollTop = 900; }); await page.waitForTimeout(600);
  out.pill = await page.evaluate(() => {
    const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const p = document.getElementById('v106x'); const pr = R(p); const under = [...document.querySelectorAll('.tbar button')].map(b => ({ sel: b.dataset.app || b.id || b.className, r: R(b) })).filter(x => Math.min(x.r.right, pr.right) - Math.max(x.r.left, pr.left) > 0 && Math.min(x.r.bottom, pr.bottom) - Math.max(x.r.top, pr.top) > 0);
    const c = document.elementsFromPoint(34, 32).slice(0, 3).map(e => e.id || e.dataset.app || e.tagName); return { pill: pr, cls: p.className, z: getComputedStyle(p).zIndex, overlaps: under, atNewBtnCenter: c };
  });
  await page.screenshot({ path: OUT + 'pill_over_tbar.png', clip: { x: 0, y: 0, width: 390, height: 70 } });
  // today small targets
  await page.evaluate(() => { document.getElementById('appmain').scrollTop = 0; }); await page.waitForTimeout(400);
  out.todaySmall = await page.evaluate(() => { const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), left: +b.left.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; }; const e = document.querySelector('.v99edit'); const cs = e && getComputedStyle(e, '::before'); return { v99edit: e && { r: R(e), before: cs && [cs.width, cs.height, cs.content] }, kpis: [...document.querySelectorAll('.px-kpi')].map(k => ({ txt: k.textContent.trim().slice(0, 20), r: R(k) })) }; });
  // agent switch and offscreen svg
  await openDrawerView(page, 'agent');
  out.agent = await page.evaluate(() => {
    const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const lbl = [...document.querySelectorAll('#appviews *')].find(e => e.children.length === 0 && e.textContent.trim() === 'מוכן');
    let sw = null; if (lbl) { const p = lbl.closest('label') || lbl.parentElement; const inp = p.querySelector('input'); const vis = p.querySelector('input ~ *, .sw, .toggle, span'); sw = { parent: p.tagName + '.' + p.className, inputR: inp && R(inp), inputType: inp && inp.type, inputOpacity: inp && getComputedStyle(inp).opacity, siblings: [...p.children].map(c => ({ tag: c.tagName, cls: c.className, r: R(c), bg: getComputedStyle(c).backgroundColor, border: getComputedStyle(c).borderColor, bgBefore: getComputedStyle(c, '::before').backgroundColor })) }; }
    const off = [...document.querySelectorAll('svg')].filter(s => s.getBoundingClientRect().right > innerWidth).map(s => ({ parent: s.parentElement.tagName + '.' + s.parentElement.className + '[' + (s.parentElement.dataset.app || s.parentElement.getAttribute('aria-label') || '') + ']', r: R(s), parentR: R(s.parentElement), parentText: s.parentElement.textContent.trim().slice(0, 20) }));
    return { sw, off };
  });
  // gallery selbar
  await openDrawerView(page, 'gallery');
  out.selbar = await page.evaluate(() => { const s = document.querySelector('.ga-selbar'); const cs = getComputedStyle(s); const b = s.getBoundingClientRect(); return { cls: s.className, opacity: cs.opacity, vis: cs.visibility, pe: cs.pointerEvents, transform: cs.transform, bottom: cs.bottom, r: { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), h: +b.height.toFixed(1) }, visibleH: Math.max(0, Math.min(innerHeight, b.bottom) - Math.max(0, b.top)), nav: (() => { const n = document.getElementById('v99nav').getBoundingClientRect(); return { top: n.top, bottom: n.bottom }; })(), text: s.textContent.trim().slice(0, 60), selCount: (s.querySelector('b') || {}).textContent }; });
  out.galleryOverlap = await page.evaluate(() => { const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; }; const c = document.querySelector('button.ga-chk'); const o = c && c.parentElement.querySelector('button.ga-open'); return c && { chk: R(c), open: o && R(o), chkBorder: getComputedStyle(c).borderColor, chkBg: getComputedStyle(c).backgroundColor }; });
  // double pop evidence
  await E(page, "GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()"); await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + 'doublepop_1_lightbox_on_gallery.png' });
  await page.goBack(); await page.waitForTimeout(1000);
  out.doublePop = { viewAfterBack: await E(page, 'APP.view'), lb: await page.evaluate(() => !!document.getElementById('ga-lb')) };
  await page.screenshot({ path: OUT + 'doublepop_2_after_goBack.png' });
  // calendar segmented + templates 'כל 10'
  await openDrawerView(page, 'calendar');
  out.cal = await page.evaluate(() => { const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), left: +b.left.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; }; return { cm: [...document.querySelectorAll('[data-app="cm"]')].map(b => ({ txt: b.textContent.trim(), r: R(b) })), help: [...document.querySelectorAll('#appviews button')].filter(b => b.textContent.trim() === '?').map(b => R(b)), emptyDays: [...document.querySelectorAll('#appviews .cal-day, #appviews [class*="day"]')].slice(0, 8).map(d => ({ cls: d.className, h: Math.round(d.getBoundingClientRect().height), txt: d.textContent.trim().slice(0, 15) })) }; });
  await openDrawerView(page, 'templates');
  out.tpl = await page.evaluate(() => { const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; }; const b = [...document.querySelectorAll('#appviews button')].find(x => /כל \d+/.test(x.textContent)); if (!b) return null; const p = b.parentElement; const para = [...p.querySelectorAll('p,div,span')].find(e => e !== b && e.textContent.length > 100 && !e.contains(b)); return { btn: R(b), pos: getComputedStyle(b).position, parent: p.tagName + '.' + p.className, parentR: R(p), para: para && { tag: para.tagName + '.' + para.className, r: R(para), fs: getComputedStyle(para).fontSize, lh: getComputedStyle(para).lineHeight, lines: Math.round(para.getBoundingClientRect().height / parseFloat(getComputedStyle(para).lineHeight)) }, fav: (() => { const f = document.querySelector('button.tv-fav'); const o = f && f.parentElement.querySelector('button.ga-open'); return f && { fav: R(f), open: o && R(o) }; })() }; });
  for (const k in out) console.log(k, JSON.stringify(k.startsWith("tbar_") ? out[k].btns : out[k]));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
