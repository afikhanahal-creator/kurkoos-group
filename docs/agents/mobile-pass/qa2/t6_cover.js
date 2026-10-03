const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
(async () => {
  const { browser, page } = await launch();
  for (const v of ['today', 'queue', 'gallery', 'videos', 'calendar', 'agent', 'templates', 'ideas', 'articles']) {
    await openDrawerView(page, v);
    for (const st of [0, 700]) {
      await page.evaluate(s => { document.getElementById('appmain').scrollTop = s; }, st); await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const n = document.getElementById('v99nav'); const out = [];
        for (const b of n.children) { const bb = b.getBoundingClientRect(); const x = bb.left + bb.width / 2, y = bb.top + bb.height / 2; const st = document.elementsFromPoint(x, y); const topEl = st[0]; const inNav = n.contains(topEl); if (!inNav) { let c = topEl; while (c && c.parentElement && getComputedStyle(c).position !== 'fixed' && getComputedStyle(c).position !== 'sticky' && getComputedStyle(c).position !== 'absolute') c = c.parentElement; const cr = c.getBoundingClientRect(); out.push({ btn: b.dataset.v99nav, hit: topEl.tagName + (topEl.id ? '#' + topEl.id : '') + '.' + (topEl.className || ''), cover: c.tagName + (c.id ? '#' + c.id : '') + '.' + String(c.className).split(' ').slice(0, 2).join('.'), pos: getComputedStyle(c).position, z: getComputedStyle(c).zIndex, top: Math.round(cr.top), bottom: Math.round(cr.bottom), left: Math.round(cr.left), right: Math.round(cr.right), txt: (c.textContent || '').trim().slice(0, 40) }); } }
        return out;
      });
      if (r.length) { console.log(v, 'scrollTop=' + st, JSON.stringify(r)); await page.screenshot({ path: OUT + `cover_${v}_${st}.png` }); }
    }
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
