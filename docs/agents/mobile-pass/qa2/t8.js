const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page } = await launch();
  await openDrawerView(page, 'templates');
  console.log(JSON.stringify(await page.evaluate(() => { const R = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; }; const b = [...document.querySelectorAll('#appviews button')].find(x => /^כל \d+$/.test(x.textContent.trim()) && x.getBoundingClientRect().height > 0); if (!b) return null; const p = b.parentElement; const h = p.querySelector('h2,h3,h4,b'); const para = [...p.children].find(e => e !== b && e.textContent.length > 120); return { btn: R(b), sel: b.tagName + '.' + b.className + '[' + Object.entries(b.dataset).map(([k, v]) => k + '=' + v).join(',') + ']', pos: getComputedStyle(b).position, parent: p.tagName + '.' + p.className, parentDisplay: getComputedStyle(p).display, heading: h && { txt: h.textContent.trim().slice(0, 30), r: R(h) }, para: para && { tag: para.tagName + '.' + para.className, r: R(para), fs: getComputedStyle(para).fontSize, lh: getComputedStyle(para).lineHeight } }; })));
  await openDrawerView(page, 'queue');
  console.log(JSON.stringify(await page.evaluate(() => { const e = [...document.querySelectorAll('#appviews span')].find(s => s.textContent.trim() === 'ציון גיוון'); const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { fs: cs.fontSize, color: cs.color, r: [Math.round(b.top), Math.round(b.left), Math.round(b.width), Math.round(b.height)], parent: e.parentElement.className }; })));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
