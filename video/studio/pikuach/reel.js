// Shared runtime of the 30 s supervision reels (a.html, b.html). A page lists its scenes, one per voice line, and calls Reel.run.
// The look is a pure function of t (seek safe): the drawing sheet, the two sides legend ("בנייה | פיקוח"), captions read from
// voice/<reel>-timings.js, cuts (the ruler wipe, or a zoom through a point), the camera, the phone strip, the end card, check(t).
// Real photos sit in panels (rounded, a soft shadow, a slow Ken Burns push) and the supervision layer is drawn on top of them,
// in the photo's own coordinates so it moves with the push. Footage is drawn frame by frame on a canvas from decoded frames.
(function () {
const NAVY = '#07293a', TEAL = '#105572', MIST = '#8fb6c8', PAPER = '#f7f8fa', RED = '#a90b0c', LINE = '#c9d6de', CONC = '#9fb1bb';
const {clamp, lerp, smooth} = Studio;
const $ = id => document.getElementById(id);
const P = (u, a, d) => clamp((u - a) / d);
const expo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const back = x => { const c1 = 1.70158, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const quadIn = x => x * x;
const E = (u, a, d) => expo(P(u, a, d));
const B = (u, a, d) => back(P(u, a, d));
const vis = (el, on) => { el.style.display = on ? 'block' : 'none'; return on; };
// a whole word or label rises into place (never revealed behind a mask: half a Hebrew word reads like dashes)
function rise(el, u, a, d, dy) { const p = E(u, a, d || .5); el.style.opacity = clamp(p * 1.4); el.style.transform = `translateY(${(1 - p) * (dy == null ? 34 : dy)}px)`; return p; }
const draw = (el, p) => { el.style.strokeDashoffset = 1 - clamp(p); };
const panelDraw = (el, p) => { draw(el, p); el.style.fillOpacity = clamp(p * 1.6); };
const land = (el, s, rot) => { el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; el.style.transform = `scale(${Math.max(0, s)})${rot ? ` rotate(${rot}deg)` : ''}`; el.style.opacity = clamp(s * 3); };
const landEl = (el, s, origin) => { el.style.transformOrigin = origin || '50% 50%'; el.style.transform = `scale(${Math.max(0, s)})`; el.style.opacity = clamp(s * 3); };
const drop = (el, u, a, d, dy) => { const p = P(u, a, d || .45); el.style.transform = `translateY(${(1 - back(p)) * -(dy || 140)}px)`; el.style.opacity = clamp(p * 4); };
const DL = 'pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"';
const svg = inner => `<svg width="1080" height="1920" class="abs">${inner}</svg>`;
const hdr = (id, n, title, sub) => `<div class="hdr" id="${id}"><div class="mk"><b>${String(n).padStart(2, '0')}</b><i>פיקוח</i></div><div class="tt">${sub ? `<small>${sub}</small>` : ''}<span>${title}</span></div></div>`;
const tick = (x, y, s, col, cls) => `<path class="${cls || ''}" d="M${x - 22 * s} ${y + 1 * s} C${x - 16 * s} ${y + 6 * s} ${x - 10 * s} ${y + 12 * s} ${x - 6 * s} ${y + 17 * s} C${x + 2 * s} ${y + 4 * s} ${x + 12 * s} ${y - 9 * s} ${x + 25 * s} ${y - 19 * s}" fill="none" stroke="${col}" stroke-width="${11 * s}" stroke-linecap="round" stroke-linejoin="round" ${DL}/>`;
const ring = (cls, cx, cy, r, w) => `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RED}" stroke-width="${w || 7}" ${DL} transform="rotate(-90 ${cx} ${cy})"/>`;
const lens = (id, r, cls) => `<g id="${id}" class="${cls == null ? 'ln' : cls}"><circle r="${r}" fill="#ffffff55" stroke="${RED}" stroke-width="${r / 8}"/><path d="M${r * .7} ${r * .7} L${r * 1.5} ${r * 1.5}" stroke="${RED}" stroke-width="${r / 4}" stroke-linecap="round"/></g>`;
// a pinned check point on a photo: a red frame drawn around a real feature, a leader and a label chip
const pin = (id, x, y, w, h, label, lx, ly, lw) => `<g id="${id}"><path class="pf" d="M${x + 14} ${y} H${x + w - 14} Q${x + w} ${y} ${x + w} ${y + 14} V${y + h - 14} Q${x + w} ${y + h} ${x + w - 14} ${y + h} H${x + 14} Q${x} ${y + h} ${x} ${y + h - 14} V${y + 14} Q${x} ${y} ${x + 14} ${y} Z" fill="none" stroke="${RED}" stroke-width="7" ${DL}/>
   <path class="pl" d="M${lx < x ? x : x + w} ${y + h / 2} L${lx < x ? lx + lw : lx} ${ly + 32}" stroke="${RED}" stroke-width="5" fill="none" ${DL}/>
   <g class="pc"><rect x="${lx}" y="${ly}" width="${lw}" height="64" rx="32" fill="${PAPER}" stroke="${RED}" stroke-width="4" filter="url(#sh)"/><text x="${lx + lw - 24}" y="${ly + 45}" font-size="38" fill="${RED}">${label}</text></g></g>`;
function pinAnim(g, u, a) { draw(g.querySelector('.pf'), E(u, a, .45)); draw(g.querySelector('.pl'), E(u, a + .3, .25)); const c = g.querySelector('.pc'); land(c, B(u, a + .45, .4)); }
// a real photo in a rounded panel: id_k is the Ken Burns group (photo and its overlays), id_o the overlays (photo coordinates)
const photo = (id, src, x, y, w, h, over) => `<defs><clipPath id="${id}_c"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24"/></clipPath></defs>
  <rect x="${x}" y="${y + 14}" width="${w}" height="${h}" rx="24" fill="${NAVY}" opacity=".18" filter="url(#bl)"/>
  <g class="ln" id="${id}"><g clip-path="url(#${id}_c)"><g id="${id}_k"><image id="${id}_i" href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" style="filter:saturate(.92) contrast(1.04)"/>
   <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${NAVY}" opacity=".06"/><g id="${id}_o">${over || ''}</g></g></g>
   <rect class="pfr" x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="none" stroke="#ffffff" stroke-width="3" opacity=".6"/></g>`;
// the Ken Burns push: scale s around a point of the photo, held while hold > 0
const kb = (id, u, len, fx, fy, s0, s1) => { const s = lerp(s0 || 1, s1 || 1.09, smooth(clamp(u / len))); $(id + '_k').setAttribute('transform', `translate(${fx} ${fy}) scale(${s}) translate(${-fx} ${-fy})`); };
// footage on a canvas (frames decoded before the render starts)
const FOOT = {};
function footage(id, dir, n, x, y, w, h) { FOOT[id] = {dir, n, imgs: []}; return `<div class="ln foot" id="${id}_w" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><canvas id="${id}" width="${w}" height="${h}"></canvas></div>`; }
function frameAt(id, u) { const f = FOOT[id]; if (!f || !f.imgs.length) return; const i = Math.max(0, Math.min(f.n - 1, Math.floor(u * 30))); const c = $(id); c.getContext('2d').drawImage(f.imgs[i], 0, 0, c.width, c.height); }
async function loadFootage() { for (const [id, f] of Object.entries(FOOT)) { f.imgs = await Promise.all(Array.from({length: f.n}, (_, i) => { const im = new Image(); im.src = `${f.dir}/${String(i + 1).padStart(3, '0')}.jpg`; return im.decode().then(() => im); })); } }
// a paper card with depth (a soft shadow, paper grain, a slight 3D tilt)
const card = (id, x, y, w, h, inner, tilt) => `<div class="card" id="${id}" data-tilt="${tilt || ''}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><svg width="${w}" height="${h}" class="abs" style="overflow:visible">${inner}</svg></div>`;
const tiltCard = (el, p, ry, rx, rz) => { el.style.opacity = clamp(p * 2); el.style.transform = `perspective(1600px) translateY(${(1 - p) * 120}px) rotateY(${ry * (1 + (1 - p) * 1.5)}deg) rotateX(${rx}deg) rotateZ(${rz || 0}deg)`; };

function run(cfg) {
  const L = window.VT.lines, NS = L.length - 1;
  const CUT = L.map(x => Math.max(0, x.a - .2)); CUT[0] = window.VT.cover || 0;
  const END = CUT[NS], DUR = +(window.VT.voice + cfg.tail).toFixed(2);
  const SC = [];
  // the sheet, the wipe, the grain
  $('sheet').innerHTML = (() => { let s = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${NAVY}" flood-opacity=".22"/></filter><filter id="bl"><feGaussianBlur stdDeviation="14"/></filter></defs>`;
    for (let x = 60; x <= 1020; x += 60) s += `<line x1="${x}" y1="60" x2="${x}" y2="1860" stroke="${LINE}" stroke-width="${x % 300 === 0 ? 2 : 1}" opacity=".55"/>`;
    for (let y = 60; y <= 1860; y += 60) s += `<line x1="60" y1="${y}" x2="1020" y2="${y}" stroke="${LINE}" stroke-width="${y % 300 === 0 ? 2 : 1}" opacity=".55"/>`;
    s += `<rect x="40" y="40" width="1000" height="1840" fill="none" stroke="${MIST}" stroke-width="4"/>`;
    [[40, 40, 1, 1], [1040, 40, -1, 1], [40, 1880, 1, -1], [1040, 1880, -1, -1]].forEach(([x, y, a, b]) => s += `<path d="M${x} ${y + b * 80} V${y} H${x + a * 80}" fill="none" stroke="${NAVY}" stroke-width="8"/>`);
    return s; })();
  $('wipe').innerHTML = `<rect width="1080" height="300" fill="${MIST}"/>` + Array.from({length: 55}, (_, i) => `<path d="M${20 + i * 19.6} 0 V${i % 10 === 0 ? 90 : i % 5 === 0 ? 60 : 34}" stroke="${TEAL}" stroke-width="4"/>`).join('') + `<rect y="292" width="1080" height="8" fill="${RED}"/>`;
  (() => { const c = $('grain'), x = c.getContext('2d'), d = x.createImageData(540, 960), r = Studio.rng(9); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); c.style.width = '1080px'; c.style.height = '1920px'; })();
  // captions
  const CAPS = [];
  L.forEach(x => { if (!x.cap) return; const parts = x.cap.split('|'), tot = parts.reduce((n, p) => n + p.length, 0); let a = x.a;
    parts.forEach(p => { const b = a + (x.b - x.a) * p.length / tot; CAPS.push([a - .05, b + (p === parts[parts.length - 1] ? .25 : 0), p]); a = b; }); });
  CAPS.forEach(c => { c.html = c[2].split(' ').map(w => w[0] === '~' ? `<span class="w rd">${w.slice(1)}</span>` : `<span class="w">${w}</span>`).join(' '); });
  let capCur = -1;
  function caption(t) {
    const i = CAPS.findIndex(c => t >= c[0] && t < c[1]), box = $('cap');
    if (i < 0 || t >= END) { box.style.opacity = 0; capCur = -1; return; }
    const c = CAPS[i]; if (capCur !== i) { $('capb').innerHTML = c.html; capCur = i; }
    box.style.opacity = Math.min(E(t, c[0], .2), 1 - quadIn(P(t, c[1] - .12, .12)));
    box.style.transform = `translateY(${(1 - E(t, c[0], .35)) * 24}px)`;
    const ws = $('capb').children, n = ws.length, span = Math.min(.9, (c[1] - c[0]) * .45);
    for (let j = 0; j < n; j++) { const a = c[0] + .05 + span * j / n, p = E(t, a, .3); ws[j].style.opacity = .2 + .8 * p; ws[j].style.transform = `translateY(${(1 - p) * 12}px)`; }
  }
  // scenes
  cfg.scenes.forEach(sc => { const d = document.createElement('div'); d.className = 'sc'; d.innerHTML = `<div class="cam">${sc.html}</div>`; $('world').appendChild(d); SC.push(d); });
  if (cfg.build) cfg.build();
  $('end').innerHTML = `<img id="e0" src="logo.png" alt="" style="position:absolute;left:418px;top:330px;width:244px">
    <div class="big" id="e1" style="top:650px;font-size:150px;color:${PAPER}">דברו איתנו</div>
    <div class="big" id="e2" style="top:830px;font-size:66px;color:${MIST};font-weight:400">${cfg.endLine}</div>
    <div class="big" id="e3" style="top:990px"><span style="display:inline-block;background:${RED};color:${PAPER};font-size:96px;padding:22px 60px 30px;border-radius:999px" dir="ltr">055-981-1814</span></div>
    <div class="big" id="e4" style="top:1200px;font-size:58px;color:${PAPER};font-weight:400" dir="ltr">www.kurkoos-group.co.il</div>
    <div class="big" id="e5" style="top:1310px;font-size:50px;color:${MIST};font-weight:400">מקרקע ועד מסירת מפתח</div>`;
  // camera: a gentle push in, and a soft zoom step at every caption part
  const BEATS = L.map((x, m) => { const a = CUT[m], e = CUT[m + 1] || DUR; return CAPS.filter(c => c[0] > a + .5 && c[0] < e - .5).map(c => c[0] - a); });
  function camera(m, u, len) {
    const keys = [[0, 0]].concat(BEATS[m].map((b, i) => [b, i % 2 ? 0 : 1]));
    const z = Studio.track(u, keys, {f: 2.6, z: .9}), cam = SC[m].firstElementChild;
    cam.style.transformOrigin = '50% 42%'; cam.style.transform = `scale(${1.03 - .03 * E(u, 0, .5) + .014 * smooth(u / len) + .012 * z})`;
  }
  const ZOOM = cfg.zoom || {}, H2 = .17, HZ = .22;
  function show(m, t, y0, y1, zoom) {
    const d = SC[m], u = t - CUT[m], len = (CUT[m + 1] || DUR) - CUT[m];
    vis(d, true); d.style.clipPath = y0 <= 0 && y1 >= 1920 ? 'none' : `inset(${Math.max(0, y0)}px 0 ${Math.max(0, 1920 - y1)}px 0)`; d.dataset.y0 = y0; d.dataset.y1 = y1;
    d.style.opacity = zoom ? zoom.o : 1; d.style.visibility = zoom && zoom.o < .002 ? 'hidden' : '';
    d.style.transform = zoom ? `scale(${zoom.s})` : 'none'; d.style.transformOrigin = zoom ? `${zoom.f[0]}px ${zoom.f[1]}px` : '50% 50%'; d.dataset.leaving = zoom && zoom.out ? '1' : '';
    camera(m, u, len); cfg.scenes[m].anim(u, len, sel => [...d.querySelectorAll(sel)]);
    // anything faded out to 0 is hidden, not drawn at opacity 0: Chromium's software renderer reuses the surface of a same-size
    // sibling for an invisible opacity group (the equal cards of the 54 s reel showed a cut copy of one card in another's slot)
    d.querySelectorAll('[style*="opacity"]').forEach(el => { el.style.visibility = +el.style.opacity < .002 ? 'hidden' : ''; });
  }
  function seek(t) {
    const n = CUT.filter(c => c <= t).length - 1;
    SC.forEach(s => vis(s, false));
    let j = -1; for (let i = 0; i < NS; i++) if ((i > 0 || CUT[0] > 0) && Math.abs(t - CUT[i]) < (ZOOM[i] ? HZ : H2)) j = i;
    let yb = -400, pw = 0;
    if (j >= 0 && ZOOM[j]) { const p = (t - CUT[j] + HZ) / (2 * HZ), f = ZOOM[j];
      show(j - 1, t, -1, 2000, {s: 1 + 1.4 * quadIn(p), o: 1 - smooth(p), f, out: true}); show(j, t, -1, 2000, {s: 1.35 - .35 * expo(p), o: smooth(p), f}); }
    else if (j >= 0) { const p = (t - CUT[j] + H2) / (2 * H2); pw = p; yb = lerp(-300, 1920, p); show(j, t, -1, yb); if (j > 0) show(j - 1, t, yb + 300, 2000); }
    else if (n >= 0 && n < NS) show(n, t, -1, 2000);
    else if (n === NS && t < END + .9) show(NS - 1, t, -1, 2000);   // the last scene stays under the end card while it comes down
    vis($('wipe'), j >= 0 && !ZOOM[j]); $('wipe').style.top = yb + 'px';
    vis($('cover'), n < 0 || j === 0); $('cover').style.clipPath = j === 0 ? `inset(${yb + 300}px 0 0 0)` : 'none';
    const ctaAt = CUT[cfg.ctaFrom], ctaOn = t >= ctaAt && t < END; vis($('cta'), ctaOn); $('cta').style.transform = `translateY(${(1 - E(t, ctaAt, .5)) * -90}px)`;
    const m = Math.max(0, Math.min(n, NS - 1)), side = j > 0 && !ZOOM[j] && (!cfg.sides[j] || !cfg.sides[j - 1]) ? '' : (cfg.sides[j >= 0 && (ZOOM[j] || pw > .5) ? j : (j >= 0 ? j - 1 : m)] || '');   // no legend while a scene without one is on screen
    $('legend').style.display = n >= 0 && t < END && side ? 'flex' : 'none';
    $('legend').querySelector('.b').classList.toggle('on', side.includes('b')); $('legend').querySelector('.p').classList.toggle('on', side.includes('p'));
    const u = t - CUT[m], len = (CUT[m + 1] || DUR) - CUT[m];
    $('sheet').style.transform = `scale(${1 + .012 * smooth(u / len)}) translateY(${-10 * smooth(u / len)}px)`;
    const e = clamp((t - END) / .9); vis($('end'), t >= END); $('end').style.clipPath = `inset(0 0 ${(1 - e) * 100}% 0)`;
    rise($('e0'), t - END, .35, .6, 30); ['e1', 'e2', 'e3', 'e4', 'e5'].forEach((id, i) => rise($(id), t - END, .5 + i * .16, .6, 30));
    caption(t);
  }
  function check(t) {
    const out = [], cap = $('cap').getBoundingClientRect();
    if (+$('cap').style.opacity > .5 && (cap.top < 0 || cap.bottom > 1840)) out.push('caption outside safe area');
    if ($('capb').getBoundingClientRect().height > 260) out.push('caption taller than 3 lines');
    if (+$('cap').style.opacity > .5 && $('cover').style.display !== 'none' && $('cover').style.clipPath === 'none') out.push('caption over the cover');
    const shown = e => { let o = 1; for (let x = e; x && x !== document.body; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden') return false; o *= +cs.opacity; } return o > .5; };
    const tight = e => { if (e instanceof SVGElement) return e.getBoundingClientRect(); const pill = e.querySelector('span[style*="padding"]'); if (pill) return pill.getBoundingClientRect(); if (e.classList.contains('chip') || e.classList.contains('hdr')) return e.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
    const inView = ([e, r]) => { const d = e.closest('.sc'); return !d || (d.dataset.leaving !== '1' && r.bottom > +d.dataset.y0 && r.top < +d.dataset.y1); };
    const T = [...document.querySelectorAll('#world .sc text, #world .sc .lbl, #world .sc .chip, #world .sc .big, #world .sc .hdr')].filter(shown).map(e => [e, tight(e)]).filter(([, r]) => r.width > 0).filter(inView);
    const leaf = e => { if (!(e instanceof SVGGElement)) { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return (r.width > 0 || r.height > 0) && +cs.opacity > .05 && cs.visibility !== 'hidden' ? [r] : []; } return [...e.children].flatMap(leaf); };
    const uni = rs => rs.length ? rs.reduce((a, b) => ({left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom)})) : null;
    // a photo panel is as big as its frame (its overlays may wait outside it, clipped away)
    const box = e => { const f = e.querySelector && e.querySelector(':scope > .pfr'); if (f) return f.getBoundingClientRect(); return e instanceof SVGGElement ? uni(leaf(e)) : e.getBoundingClientRect(); };
    const Ln = [...document.querySelectorAll('#world .sc .ln, #world .sc .card')].filter(shown).map(e => [e, box(e)]).filter(([, r]) => r && r.right > r.left).filter(inView);
    const cutTo = ([e, r]) => { const d = e.closest('.sc'); if (!d) return [e, r]; return [e, {left: r.left, right: r.right, top: Math.max(r.top, +d.dataset.y0), bottom: Math.min(r.bottom, +d.dataset.y1)}]; };
    T.splice(0, T.length, ...T.map(cutTo)); Ln.splice(0, Ln.length, ...Ln.map(cutTo));
    const same = (a, b) => a.closest('.sc') === b.closest('.sc');
    const hit = (a, b, m) => a.left < b.right + m && b.left < a.right + m && a.top < b.bottom + m && b.top < a.bottom + m;
    const nm = e => (e.textContent || e.id || e.tagName).trim().slice(0, 18);
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const [a, ra] = T[i], [b, rb] = T[j]; if (a.contains(b) || b.contains(a) || !same(a, b)) continue; if (hit(ra, rb, 12)) out.push('text on text: ' + nm(a) + ' / ' + nm(b)); }
    T.forEach(([a, ra]) => Ln.forEach(([b, rb]) => { if (a.contains(b) || b.contains(a) || !same(a, b)) return; if (hit(ra, rb, 24)) out.push('text on lines: ' + nm(a) + ' / ' + nm(b)); }));
    T.forEach(([a, r]) => { if (r.left < 50 || r.right > 1030 || r.top < 120) out.push('cut off: ' + nm(a)); });
    ['cta', 'legend'].forEach(id => { if ($(id).style.display === 'none') return; const rc = $(id).getBoundingClientRect(); T.concat(Ln).forEach(([e, r]) => { if (hit(r, rc, 16)) out.push('under the ' + id + ': ' + nm(e)); }); });
    if ($('cta').style.display !== 'none' && $('legend').style.display !== 'none' && hit($('cta').getBoundingClientRect(), $('legend').getBoundingClientRect(), 12)) out.push('phone strip on the legend');
    if (+$('cap').style.opacity > .5) { const rc = $('capb').getBoundingClientRect(); T.concat(Ln).forEach(([e, r]) => { if (hit(r, rc, 50)) out.push('under caption: ' + nm(e)); }); }
    if (t >= END + .8) { const els = [...document.querySelectorAll('#end .big')].map(e => tight(e)); for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (hit(els[i], els[j], 12)) out.push('end card overlap'); }
    return [...new Set(out)];
  }
  window.REEL = {CUT, END, DUR};
  Studio.define({
    w: 1080, h: 1920, duration: DUR,
    stages: L.map((x, i) => ({t: +(Math.min((CUT[i + 1] || DUR) - .25, CUT[i] + 2.6)).toFixed(2), label: 'line ' + x.i})).concat([{t: +(DUR - .4).toFixed(2), label: 'end'}]),
    fonts: ['700 60px Almoni', '400 60px Almoni'], build: loadFootage, seek, check,
  });
}
window.Reel = {NAVY, TEAL, MIST, PAPER, RED, LINE, CONC, $, P, E, B, expo, back, quadIn, rise, draw, panelDraw, land, landEl, drop, DL, svg, hdr, tick, ring, lens, pin, pinAnim, photo, kb, footage, frameAt, card, tiltCard, run};
})();
