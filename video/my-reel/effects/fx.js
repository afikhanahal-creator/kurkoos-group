/* 14 word-timed effects for the Kurkoos reel, one design language (see ../style.md).
   Every effect is a function (tl, t, p, ctx) that creates its DOM at build time and adds tweens to the ONE paused
   GSAP timeline at absolute time t. Nothing animates on its own: no CSS animations, no timers, no Math.random (rng(seed)
   only), so a seek to any frame gives the same pixels as the preview. Elements are plain absolutely positioned nodes
   (never .clip, never data-start), hidden at time 0 and shown only by the timeline. */
(function () {
  const FX = {};
  const ACCENT = () => (window.__REEL_STYLE && window.__REEL_STYLE.accent) || '#FF7A3D';
  const W = 1080, H = 1920;
  const EASE_IN = 'power3.out', EASE_OUT = 'power2.in';
  const ENTER = 0.35, EXIT = 0.25;
  // deterministic random (mulberry32) for anything that needs scatter
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
  FX.rng = rng;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let uid = 0;
  function node(layer, html, style) {
    const host = document.getElementById(layer);
    const el = document.createElement('div');
    el.className = 'fx';
    el.id = 'fx-' + (++uid);
    el.setAttribute('dir', 'rtl');
    if (style) el.setAttribute('style', style);
    el.innerHTML = html;
    host.appendChild(el);
    gsap.set(el, { autoAlpha: 0 });
    return el;
  }
  // in: fromTo at t; out: to at t+dur-EXIT. Returns the element for extra tweens.
  function inOut(tl, el, t, dur, from, to, outTo) {
    tl.fromTo(el, Object.assign({ autoAlpha: 0 }, from), Object.assign({ autoAlpha: 1, duration: ENTER, ease: EASE_IN, immediateRender: false }, to), t);
    tl.to(el, Object.assign({ autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, outTo || {}), t + Math.max(ENTER + 0.1, dur - EXIT));
    return el;
  }
  const letters = (s) => [...String(s)].map((ch) => `<span class="ch">${ch === ' ' ? '&nbsp;' : E(ch)}</span>`).join('');
  const ICONS = {
    home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    key: 'M14 4a6 6 0 1 0 5.2 9H21l1 1-2 2-2-2-2 2 2 2v2h-3l-2-2h-2a6 6 0 1 1 1-10z',
    money: 'M3 6h18v12H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9h.01M18 15h.01',
    heart: 'M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z',
    check: 'M4 12.5 10 18 20 7',
    star: 'm12 3 2.8 5.9 6.2.8-4.5 4.3 1.1 6.3L12 17.3 6.4 20.3l1.1-6.3L3 9.7l6.2-.8z',
    pin: 'M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22zm0-9.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6z'
  };
  const svgIcon = (name, size, color) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[name] || ICONS.star}"/></svg>`;

  /* 01 title: counter + name at the top, letters one by one */
  FX.title = (tl, t, p, ctx) => {
    const n = String(p.n || ctx.n || 1).padStart(2, '0');
    const el = node('titles', `<div class="t-count">${n}/14</div><div class="t-name">${letters(p.text || p.name || '')}</div>`,
      `right:72px;top:180px;width:936px;text-align:right`);
    const chars = el.querySelectorAll('.ch');
    tl.set(el, { autoAlpha: 1 }, t);
    tl.fromTo(el.querySelector('.t-count'), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3, ease: EASE_IN, immediateRender: false }, t);
    tl.fromTo(chars, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32, ease: EASE_IN, stagger: 0.035, immediateRender: false }, t + 0.05);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(0.6, (p.dur || 1.5) - EXIT));
    return el;
  };
  /* 02 pill: the spoken word in an accent pill, bottom third */
  FX.pill = (tl, t, p) => {
    const el = node('front', `<div class="pill">${E(p.text)}</div>`, `left:0;right:0;top:1270px;display:flex;justify-content:center`);
    return inOut(tl, el, t, p.dur || 1.2, { y: 60, scale: 0.86 }, { y: 0, scale: 1 }, { y: 20 });
  };
  /* 03 behind: a huge accent word behind the cutout */
  FX.behind = (tl, t, p) => {
    const el = node('behind', `<div class="big">${E(p.text)}</div>`, `left:0;right:0;top:780px;text-align:center`);
    tl.fromTo(el, { autoAlpha: 0, x: 220 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: EASE_IN, immediateRender: false }, t);
    tl.to(el, { autoAlpha: 0, x: -220, duration: 0.3, ease: EASE_OUT }, t + Math.max(0.6, (p.dur || 1.5) - 0.3));
    return el;
  };
  /* 04 counter: a number runs from 0 to the value */
  FX.counter = (tl, t, p) => {
    const el = node('front', `<div class="num">0${E(p.suffix || '')}</div><div class="lbl">${E(p.label || '')}</div>`, `left:0;right:0;top:1180px;text-align:center`);
    const num = el.querySelector('.num'), target = +p.value || 0, suf = p.suffix || '';
    const o = { v: 0 };
    tl.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: ENTER, ease: EASE_IN, immediateRender: false }, t);
    tl.to(o, { v: target, duration: 0.55, ease: 'power2.out', onUpdate: () => { num.textContent = Math.round(o.v) + suf } }, t + 0.05);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(0.8, (p.dur || 1.5) - EXIT));
    return el;
  };
  /* 05 underline: a short line of text, an accent line draws under it right to left */
  FX.underline = (tl, t, p) => {
    const el = node('front', `<div class="line-txt">${E(p.text)}</div><svg class="uline" width="936" height="14" viewBox="0 0 936 14"><path d="M930 7 Q 468 1 6 7" fill="none" stroke="${ACCENT()}" stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`,
      `left:72px;width:936px;top:1240px;text-align:center`);
    const path = el.querySelector('path');
    tl.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: ENTER, ease: EASE_IN, immediateRender: false }, t);
    tl.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.inOut', immediateRender: false }, t + 0.15);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(0.8, (p.dur || 1.3) - EXIT));
    return el;
  };
  /* 06 card: info card slides in from the right, out to the left */
  FX.card = (tl, t, p) => {
    const el = node('front', `<div class="card"><div class="card-bar"></div><div class="card-t">${E(p.title)}</div><div class="card-x">${E(p.text)}</div></div>`, `left:72px;right:72px;top:1200px`);
    return inOut(tl, el, t, p.dur || 1.5, { x: 160 }, { x: 0 }, { x: -120 });
  };
  /* 07 punch: the whole frame (source and cutout together) punches in and settles back */
  FX.punch = (tl, t, p, ctx) => {
    const z = +p.zoom || 1.08;
    tl.to(ctx.frame, { scale: z, duration: 0.12, ease: 'power3.out', transformOrigin: '50% 40%' }, t);
    tl.to(ctx.frame, { scale: 1, duration: Math.max(0.4, (p.dur || 1) - 0.12), ease: 'power2.inOut' }, t + 0.12);
    return ctx.frame;
  };
  /* 08 checklist: three rows, each with an accent check circle that fills */
  FX.checklist = (tl, t, p) => {
    const items = (p.items || []).slice(0, 3);
    const el = node('front', `<div class="chk">${items.map((s) => `<div class="row"><span class="dot">${svgIcon('check', 26, '#111')}</span><span class="txt">${E(s)}</span></div>`).join('')}</div>`, `left:72px;right:72px;top:1170px`);
    const rows = el.querySelectorAll('.row'), dots = el.querySelectorAll('.dot');
    tl.set(el, { autoAlpha: 1 }, t);
    tl.fromTo(rows, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: EASE_IN, stagger: 0.18, immediateRender: false }, t);
    tl.fromTo(dots, { scale: 0.4 }, { scale: 1, duration: 0.28, ease: 'back.out(1.4)', stagger: 0.18, immediateRender: false }, t + 0.08);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(0.9, (p.dur || 1.5) - EXIT));
    return el;
  };
  /* 09 quote: a speech bubble by the shoulder (below the face zone) */
  FX.quote = (tl, t, p) => {
    const el = node('front', `<div class="bubble">${E(p.text)}<i class="tail"></i></div>`, `left:72px;width:600px;top:1000px`);
    return inOut(tl, el, t, p.dur || 1.5, { scale: 0.85, y: 16, transformOrigin: '80% 100%' }, { scale: 1, y: 0, ease: 'back.out(1.3)' }, { y: 14 });
  };
  /* 10 pin: a location pin drops, a label unfolds beside it */
  FX.pin = (tl, t, p) => {
    const el = node('front', `<div class="pinrow"><span class="pinico">${svgIcon('pin', 44, '#111')}</span><span class="pinlbl">${E(p.text)}</span></div>`, `left:72px;top:1140px`);
    const ico = el.querySelector('.pinico'), lbl = el.querySelector('.pinlbl');
    tl.set(el, { autoAlpha: 1 }, t);
    tl.fromTo(ico, { y: -120, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'back.out(1.4)', immediateRender: false }, t);
    tl.fromTo(lbl, { autoAlpha: 0, x: -24 }, { autoAlpha: 1, x: 0, duration: 0.28, ease: EASE_IN, immediateRender: false }, t + 0.22);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(0.8, (p.dur || 1.4) - EXIT));
    return el;
  };
  /* 11 icon: an accent circle with an icon pops by the shoulder, optional label */
  FX.icon = (tl, t, p) => {
    const el = node('front', `<div class="icowrap"><div class="ico">${svgIcon(p.icon || 'star', 56, '#111')}</div>${p.text ? `<div class="icolbl">${E(p.text)}</div>` : ''}</div>`, `right:96px;top:1080px;text-align:center`);
    return inOut(tl, el, t, p.dur || 1.2, { scale: 0.5, transformOrigin: '50% 50%' }, { scale: 1, ease: 'back.out(1.4)' }, { scale: 0.8 });
  };
  /* 12 split: two rounded panels side by side, the second a beat after the first */
  FX.split = (tl, t, p) => {
    const el = node('front', `<div class="split"><div class="pane">${E(p.a)}</div><div class="div"></div><div class="pane">${E(p.b)}</div></div>`, `left:72px;right:72px;top:1180px`);
    const panes = el.querySelectorAll('.pane');
    tl.set(el, { autoAlpha: 1 }, t);
    tl.fromTo(panes, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: EASE_IN, stagger: 0.16, immediateRender: false }, t);
    tl.fromTo(el.querySelector('.div'), { scaleY: 0 }, { scaleY: 1, duration: 0.3, ease: EASE_IN, immediateRender: false }, t + 0.1);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(0.9, (p.dur || 1.5) - EXIT));
    return el;
  };
  /* 13 bar: an accent bar with one word sweeps behind the speaker, below the face */
  FX.bar = (tl, t, p) => {
    const el = node('behind', `<div class="bar">${E(p.text)}</div>`, `left:0;right:0;top:1040px`);
    tl.fromTo(el, { autoAlpha: 0, x: 420 }, { autoAlpha: 1, x: 0, duration: 0.38, ease: EASE_IN, immediateRender: false }, t);
    tl.to(el, { autoAlpha: 0, x: -420, duration: 0.3, ease: EASE_OUT }, t + Math.max(0.6, (p.dur || 1.3) - 0.3));
    return el;
  };
  /* 14 cta: an accent button rises at the bottom and is pressed once */
  FX.cta = (tl, t, p) => {
    const el = node('front', `<div class="cta"><span>${E(p.text)}</span><b>←</b></div>`, `left:0;right:0;top:1480px;display:flex;justify-content:center`);
    tl.fromTo(el, { autoAlpha: 0, y: 80 }, { autoAlpha: 1, y: 0, duration: ENTER, ease: EASE_IN, immediateRender: false }, t);
    tl.to(el, { scale: 0.96, duration: 0.1, ease: 'power2.in' }, t + 0.55);
    tl.to(el, { scale: 1, duration: 0.18, ease: 'back.out(1.5)' }, t + 0.65);
    tl.to(el, { autoAlpha: 0, duration: EXIT, ease: EASE_OUT }, t + Math.max(1, (p.dur || 1.5) - EXIT));
    return el;
  };
  window.FX14 = FX;
})();
