const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
const AUDIT = () => {
  const vis = el => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const desc = el => { let s = el.tagName.toLowerCase(); if (el.id) s += '#' + el.id; else if (el.className && typeof el.className === 'string') s += '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.'); for (const a of ['data-app', 'data-v99nav', 'data-q', 'data-ga', 'data-v100', 'data-act', 'data-a', 'aria-label']) if (el.getAttribute(a)) { s += `[${a}="${el.getAttribute(a)}"]`; break; } return s; };
  const txt = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const root = document.getElementById('appmain');
  const scope = [root, document.querySelector('.tbar')].filter(Boolean);
  const all = scope.flatMap(s => [...s.querySelectorAll('*')]);
  // small tap targets
  const targets = all.filter(e => e.matches('button,a[href],input,select,textarea,[role=button],[onclick],label.chip,.chip,.ibtn,.px-btn') && vis(e));
  const small = targets.map(e => { const r = e.getBoundingClientRect(); return { sel: desc(e), txt: txt(e), w: +r.width.toFixed(1), h: +r.height.toFixed(1), top: Math.round(r.top), left: Math.round(r.left) }; }).filter(t => t.w < 40 || t.h < 40);
  // clipped text
  const clipped = all.filter(e => vis(e) && e.children.length === 0 && e.textContent.trim().length > 2).map(e => { const cs = getComputedStyle(e); const over = e.scrollWidth - e.clientWidth; return { sel: desc(e), txt: txt(e), over, ovx: cs.overflowX, tov: cs.textOverflow, ws: cs.whiteSpace, w: Math.round(e.clientWidth), top: Math.round(e.getBoundingClientRect().top) }; }).filter(c => c.over > 2 && (c.ovx === 'hidden' || c.ovx === 'clip' || c.ovx === 'auto' || c.ovx === 'scroll'));
  // horizontal overflow beyond viewport
  const offscreen = all.filter(e => vis(e)).map(e => { const r = e.getBoundingClientRect(); return { sel: desc(e), txt: txt(e), left: Math.round(r.left), right: Math.round(r.right) }; }).filter(o => o.right > innerWidth + 1 || o.left < -1).slice(0, 12);
  // contrast
  const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b, a = 1] = m.map(Number); if (a === 0) return null; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return { L: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b), a, rgb: [r, g, b] }; };
  const bgOf = el => { let n = el; while (n && n !== document.documentElement) { const cs = getComputedStyle(n); const l = lum(cs.backgroundColor); if (l && l.a > 0.9) return cs.backgroundColor; if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'image'; n = n.parentElement; } return 'rgb(255, 255, 255)'; };
  const lowc = all.filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)).map(e => { const cs = getComputedStyle(e); const fg = lum(cs.color); const bgc = bgOf(e); if (bgc === 'image') return null; const bg = lum(bgc); if (!fg || !bg) return null; const ratio = (Math.max(fg.L, bg.L) + 0.05) / (Math.min(fg.L, bg.L) + 0.05); const fs = parseFloat(cs.fontSize); const big = fs >= 24 || (fs >= 18.66 && +cs.fontWeight >= 700); return { sel: desc(e), txt: txt(e), ratio: +ratio.toFixed(2), fg: cs.color, bg: bgc, fs, need: big ? 3 : 4.5, top: Math.round(e.getBoundingClientRect().top) }; }).filter(c => c && c.ratio < c.need).slice(0, 15);
  // tiny fonts
  const tiny = all.filter(e => vis(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)).map(e => ({ sel: desc(e), txt: txt(e), fs: parseFloat(getComputedStyle(e).fontSize) })).filter(t => t.fs < 11).slice(0, 10);
  // overlaps among visible siblings with text/buttons
  const ov = [];
  const cands = all.filter(e => vis(e) && e.matches('button,a,.chip,h1,h2,h3,h4,span,p,b,strong,img,svg,input,select'));
  for (let i = 0; i < cands.length && ov.length < 10; i++) for (let j = i + 1; j < cands.length; j++) {
    const a = cands[i], b = cands[j]; if (a.contains(b) || b.contains(a)) continue; if (a.parentElement !== b.parentElement) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 3 && iy > 3 && getComputedStyle(a).position !== 'absolute' && getComputedStyle(b).position !== 'absolute') ov.push({ a: desc(a) + ' ' + txt(a), b: desc(b) + ' ' + txt(b), ix: Math.round(ix), iy: Math.round(iy), top: Math.round(ra.top) });
  }
  return { small, clipped, offscreen, lowc, tiny, ov, tbarH: Math.round(document.querySelector('.tbar').getBoundingClientRect().height) };
};
(async () => {
  const { browser, page } = await launch();
  for (const v of ['today', 'queue', 'gallery', 'videos', 'calendar', 'agent', 'templates']) {
    await openDrawerView(page, v);
    await page.evaluate(() => { document.getElementById('appmain').scrollTop = 0; });
    await page.waitForTimeout(600);
    await page.screenshot({ path: OUT + `d_${v}_1.png` });
    const a1 = await page.evaluate(AUDIT);
    await page.evaluate(() => { document.getElementById('appmain').scrollTop = 700; });
    await page.waitForTimeout(500);
    await page.screenshot({ path: OUT + `d_${v}_2.png` });
    const a2 = await page.evaluate(AUDIT);
    console.log('=== ' + v + ' tbarH=' + a1.tbarH);
    for (const k of ['small', 'clipped', 'offscreen', 'lowc', 'tiny', 'ov']) { const m = [...a1[k], ...a2[k].map(x => ({ ...x, scr: 2 }))]; if (m.length) console.log(k, JSON.stringify(m.slice(0, 14))); }
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
