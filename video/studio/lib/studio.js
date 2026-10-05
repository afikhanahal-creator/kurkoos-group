// Animation studio runtime. Every template is one page whose look is a pure function of time:
// Studio.define({w, h, duration, stages, fonts, seek, check}) publishes window.STUDIO for engine/anim_render.cjs.
// No CSS transitions, no timers, no state carried between frames. Randomness only at build time, from a fixed seed.
(function () {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = k => (k = clamp(k), k * k * (3 - 2 * k));

  // Closed-form step response of a damped spring, 0 before t=0, settling at 1.
  // f is the natural frequency in Hz, z the damping ratio (0.7 gives a small overshoot, 1 none).
  function step(t, o) {
    if (t <= 0) return 0;
    const f = (o && o.f) || 2.2, z = o && o.z != null ? o.z : 0.72, w = 2 * Math.PI * f;
    if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  // A value that changes target several times: one spring per change, summed. keys = [[t0, v0], [t1, v1], ...].
  function track(t, keys, o) {
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * step(t - keys[i][0], keys[i][2] || o);
    return v;
  }
  // Integer hash to [0,1), and a seeded generator for build time.
  function hash(n) { n = (n | 0) ^ 0x9e3779b9; n = Math.imul(n ^ (n >>> 16), 0x85ebca6b); n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // Config: template defaults merged with ?c=<json> from the renderer.
  function config(def) {
    try { const q = new URLSearchParams(location.search).get('c'); return Object.assign({}, def, q ? JSON.parse(q) : {}); } catch (e) { return Object.assign({}, def); }
  }
  // Load every font the page names and fail loudly if Chrome would fall back silently.
  async function fonts(list, sample) {
    await Promise.all(list.map(f => document.fonts.load(f, sample || 'אבגדהוזחטיכלמנסעפצקרשת·.0123456789')));
    const missing = list.filter(f => !document.fonts.check(f, sample || 'אב'));
    if (missing.length) throw new Error('fonts not loaded: ' + missing.join(', '));
  }
  function define(spec) {
    document.body.style.width = spec.w + 'px'; document.body.style.height = spec.h + 'px';
    const ready = (async () => { await fonts(spec.fonts || []); if (spec.build) await spec.build(); await spec.seek(0); return true; })();
    window.STUDIO = Object.assign({}, spec, { ready });
    return window.STUDIO;
  }
  window.Studio = { clamp, lerp, smooth, step, track, hash, rng, config, fonts, define };
})();
