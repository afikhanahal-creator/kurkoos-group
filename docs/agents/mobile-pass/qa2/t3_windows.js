const { launch, E, tap, openDrawerView, rect, OUT } = require('./common');
const CLOSERS = '[data-v103="close"],[data-ga="lbx"],[data-pe-a="close"],[data-app="cmpclose"],[data-v52="close"],[data-v68="x"],[data-dg="cancel"],[data-v63="close"],[data-v65="x"],[data-px="close"],[data-v66="close"],[data-v66="x"],[data-v44="close"],[data-v50m="close"],button[aria-label="סגור"],button[aria-label="סגירה"],button[aria-label="ביטול"],button.close,.px-ib[aria-label*="סג"]';
const WINS = [
  { name: 'lightbox', sel: '#ga-lb', view: 'gallery', open: p => E(p, "GA.lb={ids:[AG.posts[0].id],i:0};gaLbRender()") },
  { name: 'editor', sel: '#pe-root', view: 'gallery', open: p => E(p, "const d=AG.posts.find(x=>/^(ed|x)_/.test(x.layout)&&!x.tpl&&peSlots(x).length);peOpen(d)") },
  { name: 'composer', sel: '#cmp-root', view: 'queue', open: p => E(p, "openComposer({})") },
  { name: 'effects', sel: '.v103sh', view: 'videos', open: async p => { await p.evaluate(() => { const el = document.querySelector('#appviews [data-v100="editknown"]'); el && el.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200); await tap(p, '#appviews [data-v100="editknown"]'); } },
  { name: 'anim', sel: '#v52m', view: 'today', open: p => p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="v52m" class="v52m"><div class="v52box"><header><button type="button" class="px-ib" data-v52="close" aria-label="סגירה">✕</button></header></div></div>')) },
  { name: 'shapes', sel: '#v68sp', view: 'today', open: p => p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="v68sp"><header><button type="button" data-v68="x" aria-label="סגירה">✕</button></header><div style="height:3000px"></div></div>')) },
  { name: 'tplprev', sel: '#v66tp', view: 'today', open: p => p.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="v66tp"><div style="height:3000px;background:#eee">tall</div></div>')) },
];
async function state(page, sel) {
  return page.evaluate(({ sel, CLOSERS }) => {
    const vis = el => { if (!el) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const w = document.querySelector(sel);
    const out = { exists: !!w, winVis: vis(w) };
    if (w) { const cs = getComputedStyle(w); out.win = { pos: cs.position, z: cs.zIndex, ov: cs.overflowY, h: Math.round(w.getBoundingClientRect().height), sh: w.scrollHeight }; }
    const own = w ? [...w.querySelectorAll(CLOSERS)].filter(vis).map(x => { const r = x.getBoundingClientRect(); return { sel: x.getAttribute('data-v103') || x.getAttribute('data-ga') || x.getAttribute('data-pe-a') || x.getAttribute('data-app') || x.getAttribute('data-v52') || x.getAttribute('data-v68') || x.getAttribute('data-v66') || x.getAttribute('aria-label') || x.className, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), inTop30: r.top >= 0 && r.top < innerHeight * 0.3 && r.left < innerWidth && r.right > 0 }; }) : [];
    out.own = own;
    const b = document.getElementById('v101x');
    out.pinned = b ? (() => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const v = vis(b); let stack = null; if (v) stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).map(e => e === b ? 'SELF' : b.contains(e) ? 'child' : (e.tagName + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : ''))); return { vis: v, display: cs.display, cls: b.className, z: cs.zIndex, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), inTop30: r.top >= 0 && r.top < innerHeight * 0.3, stack }; })() : null;
    const n = document.getElementById('v99nav'); out.navDisplay = n ? getComputedStyle(n).display : 'missing';
    out.top = (window.__v101 && __v101.top() || {}).id || (window.__v101 && __v101.top() || {}).className || null;
    out.url = location.href;
    return out;
  }, { sel, CLOSERS });
}
(async () => {
  const { browser, page, errors } = await launch();
  console.log('CSS', await page.evaluate(() => { const probe = id => { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); const cs = getComputedStyle(d); const r = { pos: cs.position, z: cs.zIndex, ov: cs.overflowY, inset: [cs.top, cs.left, cs.right, cs.bottom].join(',') }; d.remove(); return r; }; return JSON.stringify({ v68sp: probe('v68sp'), v66tp: probe('v66tp') }); }));
  let curView = null;
  for (const w of WINS) {
    const errBefore = errors.length;
    const r = { name: w.name };
    try {
      if (curView !== w.view) { await openDrawerView(page, w.view); curView = w.view; }
      await page.evaluate(() => { document.getElementById('appmain').scrollTop = 0; });
      await w.open(page); await page.waitForTimeout(900);
      r.opened = await state(page, w.sel);
      await page.screenshot({ path: OUT + `win_${w.name}.png` });
      const ownTop = r.opened.own.filter(o => o.inTop30);
      const pinnedVis = r.opened.pinned && r.opened.pinned.vis;
      r.exactlyOne = (ownTop.length > 0) !== !!pinnedVis;
      // tap the visible closer
      if (pinnedVis) { await tap(page, '#v101x'); r.tapped = 'pinned'; }
      else if (ownTop.length) {
        const o = ownTop[0]; await page.touchscreen.tap(o.left + o.w / 2, o.top + o.h / 2); r.tapped = 'own:' + o.sel;
      } else r.tapped = 'none';
      await page.waitForTimeout(900);
      r.afterTap = await state(page, w.sel);
      r.closedByTap = !r.afterTap.winVis;
      if (!r.closedByTap) { await page.screenshot({ path: OUT + `win_${w.name}_notclosed.png` }); await E(page, "const o=__v101.top();o&&__v101.closeOverlay(o)"); await page.waitForTimeout(900); }
      // reopen and goBack
      await w.open(page); await page.waitForTimeout(900);
      r.reopened = (await state(page, w.sel)).winVis;
      await page.goBack(); await page.waitForTimeout(1000);
      r.afterBack = await state(page, w.sel);
      r.closedByBack = !r.afterBack.winVis;
      if (!r.closedByBack) { await E(page, "const o=__v101.top();o&&__v101.closeOverlay(o)"); await page.waitForTimeout(900); }
      r.navAfter = await page.evaluate(() => getComputedStyle(document.getElementById('v99nav')).display);
      r.viewAfter = await E(page, 'APP.view');
      r.errs = errors.slice(errBefore).filter(e => !/404|ERR_/.test(e));
    } catch (e) { r.err = String(e.message).slice(0, 300); await page.screenshot({ path: OUT + `win_${w.name}_err.png` }); }
    console.log(JSON.stringify(r));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
