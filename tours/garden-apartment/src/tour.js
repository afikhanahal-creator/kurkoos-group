// סיור תלת-ממדי בדירת גן 250 מ"ר (קומת כניסה 151 + מרתף 99).
// יחידות: מטרים. x = מזרח, z = דרום (צפון = -z), y = למעלה.
// רצפת קומת הכניסה y=0, רצפת המרתף y=-4.10.
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ---------------------------------------------------------------- קבועים
const GY = 0;            // רצפת קומת כניסה
const BY = -4.10;        // רצפת מרתף
const NET = 3.40;        // גובה מתחת להנמכות הגבס
const GROSS = 3.80;      // גובה עד התקרה הקונסטרוקטיבית
const SLAB = 0.30;       // עובי תקרה
const SPAN = 2.4;        // טקסטורה אחת = 2x2 אריחים של 120 ס"מ
const RISER = (GY - BY) / 22;

// ---------------------------------------------------------------- רנדרר
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 400);
const MAXANI = renderer.capabilities.getMaxAnisotropy();

// ---------------------------------------------------------------- טקסטורות פרוצדורליות
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = MAXANI;
  return t;
}
function addNoise(ctx, size, amt, r) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

// פורצלן 120x120: ארבעה אריחים שונים בכל טקסטורה, עם עורקים, עננות ופוגה דקה.
function porcelain({ base, vein = null, veins = 0, veinW = 2, veinA = 0.35, cloud = 0.08, grain = 8, grout = '#cfc9bf', seed = 1, speck = 0 }) {
  return canvasTex(1024, (ctx, n) => {
    const r = rng(seed);
    const T = n / 2;
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      ctx.save();
      ctx.beginPath(); ctx.rect(tx * T, ty * T, T, T); ctx.clip();
      ctx.fillStyle = base; ctx.fillRect(tx * T, ty * T, T, T);
      for (let k = 0; k < 26; k++) {
        const x = tx * T + r() * T, y = ty * T + r() * T, rad = 30 + r() * 160;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const light = r() < 0.5;
        g.addColorStop(0, light ? `rgba(255,255,255,${cloud * r()})` : `rgba(60,50,40,${cloud * r()})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      if (vein && veins) {
        const [vr, vg, vb] = hexRgb(vein);
        ctx.filter = 'blur(1.1px)';
        for (let v = 0; v < veins; v++) {
          let x = tx * T + r() * T, y = ty * T + r() * T;
          let a = -0.6 + r() * 1.2 + (r() < 0.5 ? 0 : Math.PI);
          const steps = 60 + r() * 90;
          const w0 = 0.6 + r() * veinW;
          ctx.strokeStyle = `rgba(${vr},${vg},${vb},${veinA * (0.45 + r() * 0.55)})`;
          ctx.lineWidth = w0; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < steps; s++) {
            a += (r() - 0.5) * 0.5;
            x += Math.cos(a) * (5 + r() * 6); y += Math.sin(a) * (5 + r() * 6);
            ctx.lineTo(x, y);
            if (r() < 0.025) { ctx.stroke(); ctx.lineWidth = Math.max(0.4, w0 * (0.3 + r())); ctx.beginPath(); ctx.moveTo(x, y); }
          }
          ctx.stroke();
        }
        ctx.filter = 'none';
      }
      if (speck) {
        for (let k = 0; k < speck; k++) {
          ctx.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,40,40'},${0.15 + r() * 0.25})`;
          ctx.fillRect(tx * T + r() * T, ty * T + r() * T, 1 + r() * 2, 1 + r() * 2);
        }
      }
      ctx.restore();
    }
    addNoise(ctx, n, grain, r);
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, n, 2); ctx.fillRect(0, T - 1, n, 2); ctx.fillRect(0, n - 1, n, 1);
    ctx.fillRect(0, 0, 2, n); ctx.fillRect(T - 1, 0, 2, n); ctx.fillRect(n - 1, 0, 1, n);
  });
}
const TX = {
  living: porcelain({ base: '#ebe7e0', vein: '#8c8378', veins: 7, veinW: 2.2, veinA: 0.42, cloud: 0.07, grout: '#d9d3c9', seed: 11 }),
  bedroom: porcelain({ base: '#d6c8b2', vein: '#a8957a', veins: 3, veinW: 1.2, veinA: 0.25, cloud: 0.10, grain: 10, grout: '#c2b49e', seed: 21, speck: 900 }),
  bath: porcelain({ base: '#6a6660', vein: '#d8d2c8', veins: 6, veinW: 1.6, veinA: 0.45, cloud: 0.09, grain: 8, grout: '#5a5752', seed: 31 }),
  bathWall: porcelain({ base: '#e4e0da', vein: '#9a9187', veins: 5, veinW: 1.6, veinA: 0.35, cloud: 0.06, grout: '#d2ccc3', seed: 41 }),
  basement: porcelain({ base: '#b8b4ad', cloud: 0.16, grain: 14, grout: '#a6a199', seed: 51, speck: 2500 }),
  outdoor: porcelain({ base: '#a9a49a', cloud: 0.12, grain: 18, grout: '#8f8a80', seed: 61, speck: 4000 }),
};
TX.grass = canvasTex(512, (ctx, n) => {
  const r = rng(7);
  ctx.fillStyle = '#58783a'; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 14000; i++) {
    const g = 90 + r() * 70;
    ctx.strokeStyle = `rgba(${40 + r() * 40},${g},${30 + r() * 25},0.8)`;
    ctx.lineWidth = 1;
    const x = r() * n, y = r() * n;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4); ctx.stroke();
  }
});
TX.deck = canvasTex(1024, (ctx, n) => {
  const r = rng(9);
  const pw = n / SPAN * 0.145;
  for (let row = 0; row * pw < n; row++) {
    const y = row * pw;
    let x = -r() * n * 0.5;
    while (x < n) {
      const len = n * (0.35 + r() * 0.5);
      const c = 110 + r() * 30;
      ctx.fillStyle = `rgb(${c + 20},${c * 0.68},${c * 0.45})`;
      ctx.fillRect(x, y, len, pw);
      for (let k = 0; k < 7; k++) {
        ctx.strokeStyle = `rgba(60,35,20,${0.08 + r() * 0.12})`;
        ctx.beginPath(); const yy = y + r() * pw; ctx.moveTo(x, yy); ctx.lineTo(x + len, yy + (r() - 0.5) * 4); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,18,10,0.9)'; ctx.fillRect(x + len - 2, y, 2, pw);
      x += len;
    }
    ctx.fillStyle = 'rgba(25,15,8,0.95)'; ctx.fillRect(0, y + pw - 3, n, 3);
  }
});
TX.oak = canvasTex(512, (ctx, n) => {
  const r = rng(13);
  ctx.fillStyle = '#b89268'; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = `rgba(${90 + r() * 40},${60 + r() * 30},${30 + r() * 20},${0.10 + r() * 0.15})`;
    ctx.lineWidth = 0.5 + r() * 2;
    const y = r() * n; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= n; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 3 + (r() - 0.5) * 2);
    ctx.stroke();
  }
});
TX.stone = canvasTex(1024, (ctx, n) => {
  const r = rng(17);
  const bw = n / SPAN * 1.2, bh = n / SPAN * 0.6;
  for (let y = 0; y < n; y += bh) for (let x = (Math.round(y / bh) % 2) * bw / 2 - bw; x < n; x += bw) {
    const c = 205 + r() * 18;
    ctx.fillStyle = `rgb(${c},${c - 8},${c - 22})`; ctx.fillRect(x, y, bw, bh);
  }
  addNoise(ctx, n, 18, r);
  ctx.fillStyle = 'rgba(120,110,95,0.6)';
  for (let y = 0; y < n; y += bh) {
    ctx.fillRect(0, y, n, 2);
    for (let x = (Math.round(y / bh) % 2) * bw / 2 - bw; x < n; x += bw) ctx.fillRect(x, y, 2, bh);
  }
});
TX.gravel = canvasTex(512, (ctx, n) => {
  const r = rng(19);
  ctx.fillStyle = '#8f8a82'; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) {
    const c = 110 + r() * 110;
    ctx.fillStyle = `rgb(${c},${c - 4},${c - 10})`;
    ctx.beginPath(); ctx.arc(r() * n, r() * n, 1 + r() * 2.5, 0, Math.PI * 2); ctx.fill();
  }
});
TX.grate = canvasTex(256, (ctx, n) => {
  ctx.clearRect(0, 0, n, n);
  ctx.fillStyle = '#3a3c3e';
  const step = n / 24;
  for (let i = 0; i < 24; i++) ctx.fillRect(i * step, 0, step * 0.28, n);
  for (let j = 0; j < 6; j++) ctx.fillRect(0, j * n / 6, n, step * 0.4);
});

// ---------------------------------------------------------------- חומרים
const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  paint: std({ color: 0xf1eee8, roughness: 0.92 }),
  cut: std({ color: 0x3b3b3d, roughness: 0.9 }),
  facade: std({ map: TX.stone, roughness: 0.85 }),
  concrete: std({ color: 0xb9b4aa, roughness: 0.9 }),
  paving: std({ map: TX.outdoor, roughness: 0.8 }),
  gypsum: std({ color: 0xf7f6f3, roughness: 0.95 }),
  living: std({ map: TX.living, roughness: 0.16, envMapIntensity: 1.2 }),
  bedroom: std({ map: TX.bedroom, roughness: 0.5 }),
  bath: std({ map: TX.bath, roughness: 0.28, envMapIntensity: 1.1 }),
  bathWall: std({ map: TX.bathWall, roughness: 0.22, envMapIntensity: 1.1 }),
  basement: std({ map: TX.basement, roughness: 0.45 }),
  outdoor: std({ map: TX.outdoor, roughness: 0.8 }),
  grass: std({ map: TX.grass, roughness: 1 }),
  deck: std({ map: TX.deck, roughness: 0.75 }),
  gravel: std({ map: TX.gravel, roughness: 1 }),
  glass: std({ color: 0xcfe2e3, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide }),
  frame: std({ color: 0x2b2d30, roughness: 0.38, metalness: 0.65 }),
  trim: std({ color: 0xf4f3ef, roughness: 0.45 }),
  doorLeaf: std({ color: 0xefece6, roughness: 0.42 }),
  entryDoor: std({ color: 0x3a2f28, roughness: 0.55 }),
  steel: std({ color: 0x8d9296, roughness: 0.45, metalness: 0.7 }),
  oak: std({ map: TX.oak, roughness: 0.6 }),
  walnut: std({ color: 0x5b412f, roughness: 0.55 }),
  lacquer: std({ color: 0xf2f1ed, roughness: 0.35 }),
  quartz: std({ color: 0xedebe6, roughness: 0.18, envMapIntensity: 1.2 }),
  darkStone: std({ color: 0x2f2f30, roughness: 0.25 }),
  blackSteel: std({ color: 0x1c1c1e, roughness: 0.35, metalness: 0.7 }),
  chrome: std({ color: 0xdedede, roughness: 0.12, metalness: 1 }),
  ceramic: std({ color: 0xf8f8f6, roughness: 0.12 }),
  mirror: std({ color: 0xd5dade, roughness: 0.02, metalness: 1, envMapIntensity: 2 }),
  linen: std({ color: 0xf3f0ea, roughness: 1 }),
  duvet: std({ color: 0xe4ddd1, roughness: 1 }),
  pillow: std({ color: 0xf7f5f0, roughness: 1 }),
  fabricHead: std({ color: 0xb9ab97, roughness: 1 }),
  fabric: std({ color: 0xd4cec4, roughness: 1 }),
  fabricDark: std({ color: 0x5f6166, roughness: 1 }),
  sage: std({ color: 0x95a08a, roughness: 1 }),
  terracotta: std({ color: 0xb5715a, roughness: 1 }),
  rug: std({ color: 0xcfc5b5, roughness: 1 }),
  rugDark: std({ color: 0x8a8478, roughness: 1 }),
  leaf: std({ color: 0x55743f, roughness: 0.9, flatShading: true }),
  leafDark: std({ color: 0x3f5a32, roughness: 0.9, flatShading: true }),
  olive: std({ color: 0x8a9a6e, roughness: 0.9, flatShading: true }),
  trunk: std({ color: 0x6b5038, roughness: 1 }),
  pot: std({ color: 0xcfc7ba, roughness: 0.8 }),
  screen: std({ color: 0x0c0c0e, roughness: 0.15, metalness: 0.3 }),
  teak: std({ color: 0x9a6a43, roughness: 0.7 }),
  cushion: std({ color: 0xe8e2d6, roughness: 1 }),
  light: std({ color: 0xfff6e6, emissive: 0xfff1d8, emissiveIntensity: 2.2 }),
  slot: std({ color: 0x2a2a2a, roughness: 0.8 }),
  kids1: std({ color: 0xe7b85c, roughness: 0.8 }),
  kids2: std({ color: 0x7fb0c9, roughness: 0.8 }),
  kids3: std({ color: 0xd98a7c, roughness: 0.8 }),
  grateMat: std({ map: TX.grate, transparent: false, alphaTest: 0.5, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
  soil: std({ color: 0x6d5a45, roughness: 1 }),
  earth: std({ color: 0x7a7468, roughness: 1 }),
};

// ---------------------------------------------------------------- קבוצות
const G = {
  ground: new THREE.Group(), base: new THREE.Group(), out: new THREE.Group(),
  ceilG: new THREE.Group(), ceilB: new THREE.Group(), roof: new THREE.Group(),
  slab: new THREE.Group(), labels: new THREE.Group(), lights: new THREE.Group(),
};
Object.values(G).forEach((g) => scene.add(g));
const colliders = [];
const wallMeshes = [];

// UV בקואורדינטות עולם, כדי שהאריחים יהיו 120x120 בכל משטח.
function worldUV(geo) {
  const p = geo.attributes.position, nm = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(nm.getX(i)), ay = Math.abs(nm.getY(i));
    let u, v;
    if (ay > 0.5) { u = x; v = -z; } else if (ax > 0.5) { u = z * -Math.sign(nm.getX(i)); v = y; } else { u = x * Math.sign(nm.getZ(i)); v = y; }
    uv.setXY(i, u / SPAN, v / SPAN);
  }
  uv.needsUpdate = true;
}
function bx(x1, x2, y1, y2, z1, z2, mat, parent, o = {}) {
  const geo = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  geo.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  worldUV(geo);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.recv !== false;
  m.matrixAutoUpdate = false;
  parent.add(m);
  if (o.wall) { m.userData.wall = true; wallMeshes.push(m); }
  if (o.glass) m.userData.glass = true;
  if (o.collide) colliders.push({ x1, x2, y1, y2, z1, z2 });
  return m;
}
const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
function faceMats(f = {}) {
  return FACES.map((k) => f[k] || (k === 'py' ? M.cut : M.paint));
}
const floorQ = (x1, x2, z1, z2, y, mat, parent) => bx(x1, x2, y - 0.02, y, z1, z2, mat, parent, { cast: false });
const ceilQ = (x1, x2, z1, z2, y, parent) => bx(x1, x2, y, y + 0.02, z1, z2, M.gypsum, parent, { cast: false });

// ---------------------------------------------------------------- קירות ופתחים
// wall(): קיר בציר אחד עם פתחים. פתח = {a,b,sill,head,kind,...}, a/b לאורך הקיר, sill/head מעל הרצפה.
function wall(x1, x2, z1, z2, lvl, o = {}) {
  const fl = lvl === 'B' ? BY : GY;
  const y1 = o.y1 ?? (lvl === 'B' ? BY : -SLAB);
  const y2 = o.y2 ?? (lvl === 'B' ? -SLAB : GROSS);
  const parent = o.parent || (lvl === 'B' ? G.base : G.ground);
  const axis = (x2 - x1) >= (z2 - z1) ? 'x' : 'z';
  const mats = faceMats(o.faces);
  const ops = (o.ops || []).slice().sort((p, q) => p.a - q.a);
  const L1 = axis === 'x' ? x1 : z1, L2 = axis === 'x' ? x2 : z2;
  const seg = (a, b, ya, yb) => {
    if (b - a < 1e-4 || yb - ya < 1e-4) return;
    if (axis === 'x') bx(a, b, ya, yb, z1, z2, mats, parent, { wall: true, collide: true });
    else bx(x1, x2, ya, yb, a, b, mats, parent, { wall: true, collide: true });
  };
  let cur = L1;
  for (const op of ops) {
    seg(cur, op.a, y1, y2);
    seg(op.a, op.b, y1, fl + op.sill);
    seg(op.a, op.b, fl + op.head, y2);
    opening(op, axis, x1, x2, z1, z2, fl, parent);
    cur = op.b;
  }
  seg(cur, L2, y1, y2);
}

function opening(o, axis, x1, x2, z1, z2, fl, parent) {
  const t0 = axis === 'x' ? z1 : x1, t1 = axis === 'x' ? z2 : x2, tm = (t0 + t1) / 2;
  const A = o.a, Bb = o.b, ys = fl + o.sill, yh = fl + o.head;
  const put = (a, b, ya, yb, c, d, mat, opt = {}) =>
    axis === 'x' ? bx(a, b, ya, yb, c, d, mat, parent, opt) : bx(c, d, ya, yb, a, b, mat, parent, opt);
  const isDoor = ['door', 'entry', 'mamad', 'arch'].includes(o.kind);
  if (isDoor || o.kind === 'vit') {
    // משטח רצפה בתוך עובי הקיר
    put(A, Bb, fl - 0.02, fl, t0, t1, o.floorMat || (fl === BY ? M.basement : M.living), { cast: false });
  }
  if (o.kind === 'arch') return;
  if (isDoor) {
    const fr = o.kind === 'mamad' ? M.steel : o.kind === 'entry' ? M.entryDoor : M.trim;
    put(A, A + 0.03, ys, yh, t0 - 0.01, t1 + 0.01, fr);
    put(Bb - 0.03, Bb, ys, yh, t0 - 0.01, t1 + 0.01, fr);
    put(A, Bb, yh - 0.03, yh, t0 - 0.01, t1 + 0.01, fr);
    const w = Bb - A - 0.06;
    const th = o.kind === 'door' ? 0.045 : 0.07;
    const hingeAt = o.hinge === 'b' ? Bb - 0.03 : A + 0.03;
    const la = o.hinge === 'b' ? hingeAt - th : hingeAt, lb = la + th;
    const face = o.swing > 0 ? t1 : t0;
    const ta = o.swing > 0 ? face : face - w, tb = o.swing > 0 ? face + w : face;
    const leaf = o.kind === 'mamad' ? M.steel : o.kind === 'entry' ? M.entryDoor : M.doorLeaf;
    put(la, lb, ys + 0.008, yh - 0.035, ta, tb, leaf);
    const hf = o.swing > 0 ? tb : ta;               // הקצה החופשי
    const h1 = o.swing > 0 ? hf - 0.2 : hf + 0.06, h2 = o.swing > 0 ? hf - 0.06 : hf + 0.2;
    put(la - 0.035, lb + 0.035, ys + 1.02, ys + 1.045, h1, h2, o.kind === 'entry' ? M.chrome : M.blackSteel);
    if (o.kind === 'entry') put(la - 0.03, lb + 0.03, ys + 0.6, ys + 1.9, h1 + 0.05, h1 + 0.08, M.chrome);
    return;
  }
  if (o.kind === 'win' || o.kind === 'mwin') {
    const fw = o.kind === 'mwin' ? 0.07 : 0.05, fd = o.kind === 'mwin' ? 0.05 : 0.035;
    const fm = o.kind === 'mwin' ? M.steel : M.frame;
    put(A, Bb, ys, ys + fw, tm - fd, tm + fd, fm);
    put(A, Bb, yh - fw, yh, tm - fd, tm + fd, fm);
    put(A, A + fw, ys, yh, tm - fd, tm + fd, fm);
    put(Bb - fw, Bb, ys, yh, tm - fd, tm + fd, fm);
    if (Bb - A > 1.25) put((A + Bb) / 2 - 0.025, (A + Bb) / 2 + 0.025, ys, yh, tm - fd, tm + fd, fm);
    put(A + fw, Bb - fw, ys + fw, yh - fw, tm - 0.008, tm + 0.008, M.glass, { cast: false, glass: true });
    // אדן פנימי מאבן
    const inP = o.inside === 'p';
    put(A - 0.03, Bb + 0.03, ys - 0.03, ys, inP ? tm : t0 - 0.03, inP ? t1 + 0.03 : tm, M.quartz);
    if (o.kind === 'mwin') put(A, Bb, yh - 0.02, yh + 0.0, inP ? t0 : t1 - 0.1, inP ? t0 + 0.1 : t1, M.steel); // מסילת התריס
    return;
  }
  if (o.kind === 'vit') {
    // ויטרינת הזזה: מסילה, כנפיים בשני מסלולים, זכוכית עבה
    put(A, Bb, ys, ys + 0.025, tm - 0.07, tm + 0.07, M.frame);
    put(A, Bb, yh - 0.06, yh, tm - 0.07, tm + 0.07, M.frame);
    put(A, A + 0.04, ys, yh, tm - 0.07, tm + 0.07, M.frame);
    put(Bb - 0.04, Bb, ys, yh, tm - 0.07, tm + 0.07, M.frame);
    for (const [pa, pb, lane] of o.panels) {
      const c = tm + (lane ? 0.035 : -0.035);
      const f = 0.045;
      put(pa, pa + f, ys + 0.025, yh - 0.06, c - 0.025, c + 0.025, M.frame);
      put(pb - f, pb, ys + 0.025, yh - 0.06, c - 0.025, c + 0.025, M.frame);
      put(pa, pb, ys + 0.025, ys + 0.09, c - 0.025, c + 0.025, M.frame);
      put(pa, pb, yh - 0.12, yh - 0.06, c - 0.025, c + 0.025, M.frame);
      put(pa + f, pb - f, ys + 0.09, yh - 0.12, c - 0.012, c + 0.012, M.glass, { cast: false, glass: true });
    }
    for (const [ca, cb] of o.blocks) {
      if (axis === 'x') colliders.push({ x1: ca, x2: cb, y1: ys, y2: yh, z1: t0, z2: t1 });
      else colliders.push({ x1: t0, x2: t1, y1: ys, y2: yh, z1: ca, z2: cb });
    }
  }
}

// מעקה זכוכית H=105 עם פרופיל עליון
function rail(x1, x2, z1, z2, y, parent, h = 1.05) {
  const ax = (x2 - x1) >= (z2 - z1);
  const cx1 = ax ? x1 : (x1 + x2) / 2 - 0.01, cx2 = ax ? x2 : (x1 + x2) / 2 + 0.01;
  const cz1 = ax ? (z1 + z2) / 2 - 0.01 : z1, cz2 = ax ? (z1 + z2) / 2 + 0.01 : z2;
  bx(cx1, cx2, y, y + h - 0.04, cz1, cz2, M.glass, parent, { cast: false, glass: true });
  bx(ax ? x1 : cx1 - 0.015, ax ? x2 : cx2 + 0.015, y + h - 0.04, y + h, ax ? cz1 - 0.015 : z1, ax ? cz2 + 0.015 : z2, M.blackSteel, parent);
  bx(ax ? x1 : cx1 - 0.02, ax ? x2 : cx2 + 0.02, y, y + 0.05, ax ? cz1 - 0.02 : z1, ax ? cz2 + 0.02 : z2, M.blackSteel, parent);
  colliders.push({ x1: Math.min(x1, cx1 - 0.03), x2: Math.max(x2, cx2 + 0.03), y1: y, y2: y + h, z1: Math.min(z1, cz1 - 0.03), z2: Math.max(z2, cz2 + 0.03) });
}

// ---------------------------------------------------------------- קומת כניסה
const g0 = G.ground;
const F = M.facade, TB = M.bathWall;

// יחידת הורים
wall(1.94, 5.89, -0.25, 0, 'G', { faces: { nz: F }, y2: 4.10 });
wall(1.94, 2.14, -0.25, 3.27, 'G', { faces: { nx: F }, y2: 4.10 });
wall(1.94, 2.14, 3.27, 5.65, 'G', { faces: { nx: TB } });
wall(5.59, 5.89, -0.25, 2.60, 'G', { faces: { px: F }, y2: 4.10, ops: [{ a: 0.60, b: 2.20, sill: 0.9, head: 2.4, kind: 'win', inside: 'n' }] });
wall(5.59, 5.89, 2.60, 5.95, 'G');
wall(-0.72, 1.94, 5.65, 5.75, 'G', { faces: { nz: TB }, ops: [{ a: 0.60, b: 1.40, sill: 0, head: 2.1, kind: 'door', hinge: 'b', swing: -1, floorMat: M.bath }] });
wall(1.94, 5.59, 5.65, 5.75, 'G', { ops: [{ a: 3.40, b: 4.20, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: -1, floorMat: M.bedroom }] });
wall(-0.72, 1.94, 3.27, 3.47, 'G', { faces: { nz: F, pz: TB }, y2: 4.10 });
wall(-0.72, -0.52, 3.47, 5.65, 'G', { faces: { nx: F, px: TB }, y2: 4.10 });
wall(-0.72, 0.50, 5.75, 6.65, 'G');                                   // פיר וקיר מערבי של המעבר
wall(-1.94, 4.45, 6.65, 6.75, 'G', { faces: { nx: F } });
wall(4.35, 4.45, 5.75, 6.65, 'G', { ops: [{ a: 5.80, b: 6.60, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: 1 }] }); // דלת יחידת ההורים
// בליטת המדרגות
wall(-1.94, -1.69, 6.65, 8.50, 'G', { faces: { nx: F }, y2: 4.10 });
wall(-1.94, -0.25, 8.25, 8.50, 'G', { faces: { pz: F } });
// שירותי אורחים
wall(2.80, 2.95, 6.75, 8.35, 'G', { faces: { px: TB } });
wall(4.25, 4.45, 6.75, 8.35, 'G', { ops: [{ a: 7.00, b: 7.70, sill: 0, head: 2.1, kind: 'door', hinge: 'b', swing: 1 }] });
wall(2.80, 4.45, 8.25, 8.35, 'G', { faces: { nz: TB } });
// קיר מערבי חיצוני + דלת כניסה
wall(-0.25, 0, 8.25, 16.24, 'G', { faces: { nx: F }, y2: 4.10, ops: [{ a: 8.70, b: 9.70, sill: 0, head: 2.4, kind: 'entry', hinge: 'a', swing: 1 }] });
// ממ"ד
wall(5.59, 10.71, 2.60, 2.90, 'G', { faces: { nz: F }, y2: 4.10 });
wall(10.13, 10.71, 2.90, 5.65, 'G', { faces: { px: F }, y2: 4.10, ops: [{ a: 3.80, b: 4.80, sill: 1.0, head: 2.0, kind: 'mwin', inside: 'n' }] });
wall(5.59, 7.22, 5.65, 5.95, 'G', { ops: [{ a: 6.10, b: 6.90, sill: 0, head: 2.0, kind: 'mamad', hinge: 'a', swing: 1 }] });
wall(7.22, 10.71, 5.65, 5.95, 'G', { faces: { pz: TB } });
// חדר רחצה כללי
wall(7.17, 7.27, 5.95, 8.29, 'G', { faces: { px: TB }, ops: [{ a: 7.30, b: 8.10, sill: 0, head: 2.1, kind: 'door', hinge: 'b', swing: 1, floorMat: M.bath }] });
wall(10.46, 10.71, 5.95, 8.49, 'G', { faces: { px: F, nx: TB }, y2: 4.10, ops: [{ a: 6.80, b: 7.40, sill: 1.5, head: 2.2, kind: 'win', inside: 'n' }] });
wall(5.87, 7.22, 8.29, 8.49, 'G', { ops: [{ a: 6.25, b: 7.05, sill: 0, head: 2.1, kind: 'door', hinge: 'b', swing: 1, floorMat: M.bedroom }] });
wall(7.22, 10.46, 8.29, 8.49, 'G', { faces: { nz: TB } });
// חדר שינה 2
wall(5.87, 6.12, 8.49, 11.29, 'G');
wall(10.46, 10.71, 8.49, 11.54, 'G', { faces: { px: F }, y2: 4.10, ops: [{ a: 9.30, b: 10.70, sill: 0.9, head: 2.4, kind: 'win', inside: 'n' }] });
wall(5.87, 10.46, 11.29, 11.54, 'G');
// סלון
wall(10.46, 10.71, 11.54, 16.24, 'G', { faces: { px: F }, y2: 4.10, ops: [{ a: 12.30, b: 13.80, sill: 0.9, head: 2.4, kind: 'win', inside: 'n' }] });
wall(-0.25, 10.71, 15.99, 16.24, 'G', {
  faces: { pz: F }, y2: 4.10, ops: [
    { a: 0.66, b: 5.86, sill: 0, head: NET, kind: 'vit', panels: [[0.66, 1.98, 1], [3.20, 4.54, 0], [3.22, 4.56, 1], [4.54, 5.86, 0]], blocks: [[0.66, 1.98], [3.20, 5.86]] },
    { a: 6.31, b: 9.21, sill: 0, head: NET, kind: 'vit', panels: [[6.31, 7.78, 1], [6.33, 7.80, 0]], blocks: [[6.31, 7.80]] },
  ],
});
// מעקות חדר המדרגות
rail(0, 2.05, 8.22, 8.28, 0, g0);
rail(2.05, 2.80, 7.47, 7.53, 0, g0);
// לובי הבניין (שטח משותף, נקודת ההתחלה)
wall(-4.25, -1.94, 8.25, 8.50, 'G', { faces: { pz: F } });
wall(-4.25, -4.00, 8.50, 11.75, 'G', { faces: { px: F } });
wall(-4.25, -0.25, 11.50, 11.75, 'G', { faces: { nz: F } });
floorQ(-4.0, -0.25, 8.50, 11.50, GY, M.outdoor, g0);
ceilQ(-4.0, -0.25, 8.50, 11.50, 3.0, G.ceilG);
bx(-4.0, -0.25, 3.02, 3.8, 8.5, 11.5, M.gypsum, G.ceilG, { cast: false });

// רצפות פורצלן 120x120
const GF = [
  [0, 5.87, 8.25, 11.54, M.living], [0, 10.46, 11.54, 15.99, M.living],
  [4.45, 7.17, 5.75, 8.29, M.living], [4.45, 5.87, 8.29, 8.49, M.living], [0.50, 4.35, 5.75, 6.65, M.living],
  [2.05, 2.80, 7.50, 8.25, M.living],
  [2.14, 5.59, 0, 5.65, M.bedroom], [5.89, 10.13, 2.90, 5.65, M.bedroom], [6.12, 10.46, 8.49, 11.29, M.bedroom],
  [-0.52, 1.94, 3.47, 5.65, M.bath], [7.27, 10.46, 5.95, 8.29, M.bath], [2.95, 4.25, 6.75, 8.25, M.bath],
];
GF.forEach(([a, b, c, d, m]) => floorQ(a, b, c, d, GY, m, g0));
// תקרות גבס 3.40
const GC = [
  [2.14, 5.59, 0, 5.65], [-0.52, 1.94, 3.47, 5.65], [0.50, 4.35, 5.75, 6.65], [4.45, 7.17, 5.75, 8.29],
  [5.89, 10.13, 2.90, 5.65], [7.27, 10.46, 5.95, 8.29], [2.95, 4.25, 6.75, 8.25], [6.12, 10.46, 8.49, 11.29],
  [0, 5.87, 8.25, 11.54], [-1.69, 2.80, 6.75, 8.25], [0, 10.46, 11.54, 15.99], [4.45, 5.87, 8.29, 8.49],
];
GC.forEach(([a, b, c, d]) => ceilQ(a, b, c, d, NET, G.ceilG));

// ---------------------------------------------------------------- מרתף
const g1 = G.base;
const CF = M.facade;
wall(-0.25, 0, 0.35, 6.75, 'B');
wall(-0.25, 0, 8.25, 10.89, 'B');
wall(-0.25, 2.04, 0.35, 0.60, 'B');
wall(1.94, 2.04, -1.22, 2.58, 'B');
wall(1.94, 5.89, -1.22, -0.97, 'B');
wall(2.04, 5.49, 2.58, 2.68, 'B', { ops: [{ a: 3.20, b: 4.00, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: -1 }] });
wall(5.49, 5.89, -1.90, 2.60, 'B', {
  y2: 0, faces: { px: CF }, ops: [
    { a: -0.40, b: 2.00, sill: 0, head: 2.6, kind: 'vit', panels: [[-0.40, 0.82, 1], [-0.38, 0.84, 0]], blocks: [[-0.40, 0.84]], floorMat: M.basement },
  ],
});
wall(5.49, 6.25, 2.60, 9.81, 'B', {
  ops: [
    { a: 3.00, b: 3.70, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: 1, floorMat: M.bath },
    { a: 7.10, b: 7.90, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: 1 },
  ],
});
wall(5.89, 10.71, 2.60, 2.80, 'B', {
  y2: 0, faces: { nz: CF, pz: TB }, ops: [
    { a: 6.60, b: 7.50, sill: 1.4, head: 2.4, kind: 'win', inside: 'p' },
    { a: 9.20, b: 10.10, sill: 1.8, head: 2.4, kind: 'win', inside: 'p' },
  ],
});
wall(5.59, 10.53, -1.90, -1.65, 'B', { y2: 0, faces: { pz: CF } });
wall(10.28, 10.53, -1.65, 2.60, 'B', { y2: 0, faces: { nx: CF } });
wall(10.46, 10.71, 2.80, 10.06, 'B', { faces: { px: M.concrete }, ops: [{ a: 6.40, b: 8.90, sill: 1.05, head: 2.6, kind: 'win', inside: 'n' }] });
wall(7.85, 8.86, 2.80, 5.60, 'B', { faces: { nx: TB, px: TB } });
wall(6.25, 10.46, 5.60, 5.70, 'B', { ops: [{ a: 9.20, b: 9.90, sill: 0, head: 2.1, kind: 'door', hinge: 'b', swing: -1, floorMat: M.bath }] });
wall(5.49, 10.71, 9.81, 10.06, 'B');
wall(-0.25, 5.49, 8.25, 8.35, 'B', { ops: [{ a: 3.20, b: 4.00, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: 1 }] });
wall(2.61, 2.71, 8.35, 10.64, 'B', { ops: [{ a: 9.20, b: 10.00, sill: 0, head: 2.1, kind: 'door', hinge: 'a', swing: -1 }] });
wall(4.71, 5.49, 8.35, 10.06, 'B');
wall(-0.25, 2.71, 10.64, 10.89, 'B');
wall(2.61, 4.81, 10.56, 10.81, 'B');
wall(-1.94, 5.49, 6.65, 6.75, 'B', { ops: [{ a: 3.00, b: 4.60, sill: 0, head: 2.5, kind: 'arch' }] });
wall(-1.94, -1.69, 6.65, 8.50, 'B');
wall(-1.94, -0.25, 8.25, 8.50, 'B');
// חצר חלון לסטודיו (מתחת לסבכה)
wall(11.71, 11.96, 3.12, 10.06, 'B', { y2: 0, faces: { nx: M.concrete } });
wall(10.71, 11.96, 3.12, 3.37, 'B', { y2: 0, faces: { pz: M.concrete } });
wall(10.71, 11.96, 9.81, 10.06, 'B', { y2: 0, faces: { nz: M.concrete } });
floorQ(10.71, 11.71, 3.37, 9.81, BY, M.gravel, g1);

const BF = [
  [0, 5.49, 2.68, 6.65, M.basement], [0, 1.94, 0.60, 2.68, M.basement], [2.04, 5.49, -0.97, 2.58, M.basement],
  [6.25, 7.85, 2.80, 5.60, M.bath], [8.86, 10.46, 2.80, 5.60, M.bath], [6.25, 10.46, 5.70, 9.81, M.basement],
  [2.05, 5.49, 6.75, 8.25, M.basement], [2.71, 4.71, 8.35, 10.56, M.basement], [0, 2.61, 8.35, 10.64, M.basement],
  [5.89, 10.28, -1.65, 2.60, M.outdoor],
];
BF.forEach(([a, b, c, d, m]) => floorQ(a, b, c, d, BY, m, g1));
const BCy = BY + NET;
const BC = [
  [0, 5.49, 2.68, 6.65], [0, 1.94, 0.60, 2.68], [2.04, 5.49, -0.97, 2.58], [6.25, 7.85, 2.80, 5.60],
  [8.86, 10.46, 2.80, 5.60], [6.25, 10.46, 5.70, 9.81], [2.80, 5.49, 6.75, 8.25], [2.05, 2.80, 7.50, 8.25],
  [2.71, 4.71, 8.35, 10.56], [0, 2.61, 8.35, 10.64],
];
BC.forEach(([a, b, c, d]) => ceilQ(a, b, c, d, BCy, G.ceilB));

// ---------------------------------------------------------------- מדרגות (U, 22 רומים)
// מהלך עליון בנתיב הדרומי (z 7.55-8.25) יורד מערבה, פודסט ביניים, מהלך תחתון בנתיב הצפוני יורד מזרחה.
function stairH(x, z) {
  if (x < -1.69 || x > 2.80 || z < 6.75 || z > 8.25) return null;
  if (x >= 2.05) return z >= 7.50 ? GY : BY;
  if (x < -0.75) return GY - 11 * RISER;
  if (z >= 7.50) { const i = Math.min(10, Math.max(1, Math.ceil((2.05 - x) / 0.28))); return GY - i * RISER; }
  const j = Math.min(10, Math.max(1, Math.ceil((x + 0.75) / 0.28)));
  return GY - (11 + j) * RISER;
}
(function buildStair() {
  const gs = G.base;
  for (let i = 1; i <= 10; i++) {
    const xa = 2.05 - i * 0.28, xb = 2.05 - (i - 1) * 0.28, top = GY - i * RISER;
    bx(xa, xb, BY, top - 0.04, 7.55, 8.25, M.trim, gs);
    bx(xa - 0.02, xb, top - 0.04, top, 7.55, 8.25, M.oak, gs);
  }
  const land = GY - 11 * RISER;
  bx(-1.69, -0.75, BY, land - 0.04, 6.75, 8.25, M.trim, gs);
  bx(-1.69, -0.75, land - 0.04, land, 6.75, 8.25, M.oak, gs);
  for (let j = 1; j <= 10; j++) {
    const xa = -0.75 + (j - 1) * 0.28, xb = -0.75 + j * 0.28, top = GY - (11 + j) * RISER;
    if (top - 0.04 > BY) bx(xa, xb, BY, top - 0.04, 6.75, 7.45, M.trim, gs);
    bx(xa, xb + 0.02, top - 0.04, top, 6.75, 7.45, M.oak, gs);
  }
  // קיר מרכזי בין שני המהלכים, מרצפת המרתף עד התקרה של קומת הכניסה
  bx(-0.75, 2.05, BY, GROSS, 7.45, 7.55, faceMats({}), gs, { wall: true, collide: true });
  // מאחזי יד
  const hr = (x1, z, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 12), M.blackSteel);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    m.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
    m.castShadow = true; gs.add(m);
  };
  hr(2.05, 8.20, GY + 0.9, -0.75, land + 0.9);
  hr(-0.75, 6.80, land + 0.9, 2.05, BY + 0.9);
  // פס LED בקיר המרכזי
  bx(-0.75, 2.05, -0.05, -0.02, 7.43, 7.45, M.light, gs, { cast: false });
})();

// ---------------------------------------------------------------- תקרות קונסטרוקטיביות וחוץ
// תקרת המרתף = רצפת קומת הכניסה, עם פתחים לחצר האנגלית, לחצר החלון ולמדרגות.
(function slabs() {
  const s = new THREE.Shape();
  s.moveTo(-1.94, -1.90); s.lineTo(11.96, -1.90); s.lineTo(11.96, 16.24); s.lineTo(-1.94, 16.24); s.closePath();
  const hole = (pts) => { const h = new THREE.Path(); h.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => h.lineTo(p[0], p[1])); h.closePath(); s.holes.push(h); };
  hole([[5.89, -1.65], [5.89, 2.60], [10.28, 2.60], [10.28, -1.65]]);
  hole([[10.71, 3.37], [10.71, 9.81], [11.71, 9.81], [11.71, 3.37]]);
  hole([[-1.69, 6.75], [-1.69, 8.25], [2.05, 8.25], [2.05, 7.50], [2.80, 7.50], [2.80, 6.75]]);
  const geo = new THREE.ExtrudeGeometry(s, { depth: SLAB, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);           // shape y -> z, extrude לכיוון -y
  worldUV(geo);
  const m = new THREE.Mesh(geo, [M.paving, M.concrete]);
  m.position.y = GY - 0.021;
  m.castShadow = true; m.receiveShadow = true;
  G.slab.add(m);
  // תקרת קומת הכניסה (קונסטרוקציה + שתי קומות מעל, לצל אמיתי על הגינה)
  const r = new THREE.Shape();
  const pts = [[-1.94, -0.25], [5.89, -0.25], [5.89, 2.60], [10.71, 2.60], [10.71, 16.24], [-1.94, 16.24]];
  r.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => r.lineTo(p[0], p[1])); r.closePath();
  const rg = new THREE.ExtrudeGeometry(r, { depth: SLAB, bevelEnabled: false });
  rg.rotateX(Math.PI / 2); worldUV(rg);
  const rm = new THREE.Mesh(rg, M.concrete);
  rm.position.y = GROSS + SLAB; rm.castShadow = true; rm.receiveShadow = true;
  G.roof.add(rm);
  const ug = new THREE.ExtrudeGeometry(r, { depth: 6.2, bevelEnabled: false });
  ug.rotateX(Math.PI / 2); worldUV(ug);
  const um = new THREE.Mesh(ug, M.facade);
  um.position.y = GROSS + SLAB + 6.2; um.castShadow = true; um.receiveShadow = true;
  G.roof.add(um);
  // פסי חלונות בחזית הקומות העליונות
  for (const fy of [5.2, 8.3]) {
    bx(0.3, 10.4, fy, fy + 1.5, 16.24, 16.28, M.screen, G.roof, { cast: false });
    bx(10.71, 10.75, fy, fy + 1.5, 3.2, 15.8, M.screen, G.roof, { cast: false });
    bx(-0.2, 10.71, fy - 0.9, fy - 0.75, 16.24, 17.6, M.concrete, G.roof);   // מרפסת של הקומה מעל
  }
})();

// קרקע חיצונית, דק, דשא, סבכה, גדר
(function outdoor() {
  const o = G.out;
  const sh = new THREE.Shape();
  sh.moveTo(-60, -60); sh.lineTo(80, -60); sh.lineTo(80, 90); sh.lineTo(-60, 90); sh.closePath();
  const h = new THREE.Path();
  h.moveTo(-1.94, -1.90); h.lineTo(-1.94, 16.24); h.lineTo(11.96, 16.24); h.lineTo(11.96, -1.90); h.closePath();
  sh.holes.push(h);
  const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / SPAN, p.getZ(i) / SPAN);
  const m = new THREE.Mesh(g, std({ map: TX.outdoor, roughness: 0.9, color: 0xe2ddd2, side: THREE.DoubleSide }));
  m.position.y = GY - 0.03; m.receiveShadow = true; o.add(m);
  bx(-60, 80, BY - 0.3, BY - 0.05, -60, 90, M.earth, scene, { cast: false });

  // דק עץ מתחת לפרגולה
  floorQ(-0.25, 10.71, 16.24, 19.54, GY + 0.01, M.deck, o);
  // דשא
  [[-0.25, 13.71, 19.54, 22.24], [11.71, 13.71, 3.37, 9.81], [10.71, 13.71, 9.81, 16.24], [10.71, 13.71, 16.24, 19.54]]
    .forEach(([a, b, c, d]) => floorQ(a, b, c, d, GY + 0.005, M.grass, o));
  // אבני דריכה בגינה הצדדית
  for (let z = 10.3; z < 16; z += 0.75) floorQ(11.75, 12.45, z, z + 0.45, GY + 0.015, M.outdoor, o);
  // סבכה מעל חצר החלון
  const gg = new THREE.PlaneGeometry(1.0, 6.44); gg.rotateX(-Math.PI / 2);
  const guv = gg.attributes.uv; for (let i = 0; i < guv.count; i++) guv.setXY(i, guv.getX(i) * 4, guv.getY(i) * 26);
  const grate = new THREE.Mesh(gg, M.grateMat); grate.position.set(11.21, GY + 0.01, 6.59);
  grate.castShadow = true; grate.receiveShadow = true; o.add(grate);
  bx(10.71, 11.71, GY - 0.02, GY + 0.012, 3.32, 3.37, M.blackSteel, o);
  bx(10.71, 11.71, GY - 0.02, GY + 0.012, 9.81, 9.86, M.blackSteel, o);
  // מעקות החצר האנגלית (ברמת הקרקע)
  rail(5.89, 10.28, -1.80, -1.74, GY, o);
  rail(10.34, 10.40, -1.80, 2.60, GY, o);
  rail(5.71, 5.77, -1.80, -0.25, GY, o);
  // גדר הגינה + גדר חיה
  const fence = (x1, x2, z1, z2) => {
    bx(x1, x2, GY, 1.05, z1, z2, M.blackSteel, o, { collide: true });
  };
  const hedge = (x1, x2, z1, z2) => bx(x1, x2, GY, 1.5, z1, z2, M.leafDark, o, { collide: true });
  fence(-0.27, -0.23, 16.24, 22.24); hedge(-0.85, -0.27, 16.24, 22.84);
  fence(-0.25, 13.71, 22.22, 22.26); hedge(-0.85, 14.31, 22.26, 22.84);
  fence(13.69, 13.73, 3.37, 22.24); hedge(13.73, 14.31, 3.37, 22.84);
  fence(10.71, 13.71, 3.35, 3.39); hedge(11.96, 14.31, 2.79, 3.35);
  // פרגולה מעל הדק
  const posts = [[-0.15, 19.44], [5.23, 19.44], [10.61, 19.44]];
  posts.forEach(([x, z]) => bx(x - 0.07, x + 0.07, GY, 3.55, z - 0.07, z + 0.07, M.blackSteel, G.roof));
  bx(-0.25, 10.71, 3.40, 3.62, 19.37, 19.51, M.blackSteel, G.roof);
  const slat = new THREE.BoxGeometry(0.05, 0.14, 3.28);
  const inst = new THREE.InstancedMesh(slat, M.blackSteel, 50);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < 50; i++) { mtx.makeTranslation(-0.1 + i * 0.218, 3.69, 17.88); inst.setMatrixAt(i, mtx); }
  inst.castShadow = true; G.roof.add(inst);
})();

// ---------------------------------------------------------------- ריהוט
const grp = () => new THREE.Group();
function B(g, w, h, d, x, y, z, mat, cast = true) {
  const geo = new THREE.BoxGeometry(w, h, d); worldUV(geo);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
}
function C(g, rt, rb, h, x, y, z, mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
function place(g, parent, x, y, z, rot = 0, collide = true) {
  g.position.set(x, y, z); g.rotation.y = rot; parent.add(g); g.updateMatrixWorld(true);
  if (collide) {
    const bb = new THREE.Box3().setFromObject(g);
    colliders.push({ x1: bb.min.x, x2: bb.max.x, y1: bb.min.y, y2: bb.max.y, z1: bb.min.z, z2: bb.max.z });
  }
  return g;
}
const R90 = Math.PI / 2;
// כיוון: החזית של כל רהיט היא +z, הגב -z. rot=R90 → חזית למזרח, -R90 → למערב, PI → לצפון.
function bed(w, l) {
  const g = grp();
  B(g, w + 0.06, 0.28, l, 0, 0.14, 0, M.oak);
  B(g, w, 0.24, l - 0.06, 0, 0.40, 0.02, M.linen);
  B(g, w + 0.04, 0.07, l * 0.62, 0, 0.55, l * 0.18, M.duvet);
  B(g, w * 0.42, 0.12, 0.38, -w * 0.24, 0.58, -l / 2 + 0.3, M.pillow);
  B(g, w * 0.42, 0.12, 0.38, w * 0.24, 0.58, -l / 2 + 0.3, M.pillow);
  B(g, w + 0.3, 1.15, 0.09, 0, 0.575, -l / 2 - 0.045, M.fabricHead);
  return g;
}
function nightstand() {
  const g = grp();
  B(g, 0.5, 0.45, 0.4, 0, 0.3, 0, M.walnut);
  C(g, 0.06, 0.08, 0.3, 0.1, 0.67, 0, M.pot);
  C(g, 0.12, 0.15, 0.2, 0.1, 0.9, 0, M.light, 20).castShadow = false;
  return g;
}
function sofa(w, d = 0.95, mat = M.fabric) {
  const g = grp();
  B(g, w, 0.36, d, 0, 0.22, 0, mat);
  B(g, w - 0.36, 0.12, d - 0.28, 0, 0.46, 0.1, mat);
  B(g, w, 0.46, 0.22, 0, 0.6, -d / 2 + 0.11, mat);
  B(g, 0.18, 0.6, d, -w / 2 + 0.09, 0.32, 0, mat);
  B(g, 0.18, 0.6, d, w / 2 - 0.09, 0.32, 0, mat);
  for (let x = -w / 2 + 0.55; x < w / 2 - 0.3; x += 0.75) B(g, 0.42, 0.38, 0.12, x, 0.72, -d / 2 + 0.3, M.cushion);
  B(g, w, 0.04, d, 0, 0.02, 0, M.blackSteel);
  return g;
}
function chaise(w, l, mat = M.fabric) {
  const g = grp();
  B(g, w, 0.36, l, 0, 0.22, 0, mat);
  B(g, w - 0.1, 0.12, l - 0.1, 0, 0.46, 0, mat);
  B(g, 0.18, 0.6, l, w / 2 - 0.09, 0.32, 0, mat);
  return g;
}
function coffeeTable(w, d, h = 0.38) {
  const g = grp();
  B(g, w, 0.04, d, 0, h, 0, M.walnut);
  B(g, w - 0.2, h - 0.02, d - 0.2, 0, (h - 0.02) / 2, 0, M.darkStone);
  C(g, 0.09, 0.09, 0.06, w * 0.25, h + 0.05, 0, M.ceramic);
  return g;
}
function chair() {
  const g = grp();
  B(g, 0.46, 0.06, 0.46, 0, 0.46, 0, M.fabric);
  B(g, 0.46, 0.45, 0.05, 0, 0.72, -0.21, M.fabric);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B(g, 0.03, 0.44, 0.03, x, 0.22, z, M.blackSteel);
  return g;
}
function diningTable(w, d) {
  const g = grp();
  B(g, w, 0.05, d, 0, 0.735, 0, M.oak);
  B(g, 0.08, 0.71, d - 0.3, -w / 2 + 0.35, 0.355, 0, M.blackSteel);
  B(g, 0.08, 0.71, d - 0.3, w / 2 - 0.35, 0.355, 0, M.blackSteel);
  const bowl = C(g, 0.22, 0.12, 0.09, 0, 0.805, 0, M.ceramic, 28);
  return g;
}
function pendant(parent, x, z, ceilY, drop = 1.6, w = 1.4) {
  bx(x - 0.005, x + 0.005, ceilY - drop + 0.1, ceilY, z - 0.005, z + 0.005, M.blackSteel, parent, { cast: false });
  bx(x - w / 2, x + w / 2, ceilY - drop, ceilY - drop + 0.06, z - 0.04, z + 0.04, M.blackSteel, parent, { cast: false });
  bx(x - w / 2 + 0.03, x + w / 2 - 0.03, ceilY - drop - 0.01, ceilY - drop, z - 0.025, z + 0.025, M.light, parent, { cast: false });
}
function stool() {
  const g = grp();
  C(g, 0.19, 0.19, 0.06, 0, 0.74, 0, M.fabricDark);
  C(g, 0.025, 0.025, 0.7, 0, 0.36, 0, M.blackSteel);
  C(g, 0.2, 0.2, 0.02, 0, 0.01, 0, M.blackSteel);
  return g;
}
function wardrobe(w, h = 2.6, d = 0.6, mat = M.lacquer) {
  const g = grp();
  B(g, w, h, d, 0, h / 2, 0, mat);
  const n = Math.max(1, Math.round(w / 0.55));
  for (let i = 1; i < n; i++) B(g, 0.008, h - 0.1, 0.01, -w / 2 + i * w / n, h / 2, d / 2 + 0.002, M.cut, false);
  for (let i = 0; i < n; i++) B(g, 0.02, 0.5, 0.02, -w / 2 + (i + 0.5) * w / n + (i % 2 ? -1 : 1) * (w / n / 2 - 0.06), 1.1, d / 2 + 0.015, M.blackSteel, false);
  return g;
}
function counter(len, opts = {}) {
  const g = grp();
  B(g, len, 0.1, 0.55, 0, 0.05, -0.02, M.cut);
  B(g, len, 0.78, 0.62, 0, 0.49, 0, M.lacquer);
  B(g, len + 0.01, 0.03, 0.65, 0, 0.895, 0.01, M.quartz);
  for (let x = -len / 2 + 0.6; x < len / 2; x += 0.6) B(g, 0.006, 0.7, 0.005, x, 0.5, 0.311, M.cut, false);
  if (opts.sink != null) {
    B(g, 0.7, 0.012, 0.42, opts.sink, 0.906, 0.04, M.blackSteel, false);
    C(g, 0.015, 0.015, 0.35, opts.sink, 1.08, -0.22, M.chrome);
    B(g, 0.02, 0.02, 0.22, opts.sink, 1.25, -0.12, M.chrome);
  }
  if (opts.cook != null) B(g, 0.8, 0.01, 0.52, opts.cook, 0.915, 0.02, M.screen, false);
  return g;
}
function tallUnit(len, h) {
  const g = grp();
  B(g, len, h, 0.62, 0, h / 2, 0, M.lacquer);
  for (let x = -len / 2 + 0.6; x < len / 2; x += 0.6) B(g, 0.006, h - 0.1, 0.005, x, h / 2, 0.311, M.cut, false);
  B(g, 0.6, 0.6, 0.006, len / 2 - 0.9, 1.25, 0.312, M.screen, false);
  B(g, 0.6, 0.45, 0.006, len / 2 - 0.9, 0.75, 0.312, M.screen, false);
  return g;
}
function island(len, dep) {
  const g = grp();
  B(g, len - 0.06, 0.86, dep - 0.25, 0, 0.43, -0.1, M.walnut);
  B(g, len, 0.04, dep, 0, 0.9, 0, M.quartz);
  B(g, 0.04, 0.88, dep, -len / 2 + 0.02, 0.44, 0, M.quartz);
  B(g, 0.04, 0.88, dep, len / 2 - 0.02, 0.44, 0, M.quartz);
  B(g, 0.75, 0.012, 0.5, 0, 0.926, -0.15, M.screen, false);
  return g;
}
function toilet() {
  const g = grp();
  const bowl = C(g, 0.19, 0.16, 0.36, 0, 0.42, 0.04, M.ceramic, 24); bowl.scale.set(1, 1, 1.45);
  B(g, 0.36, 0.03, 0.5, 0, 0.615, 0.06, M.ceramic);
  B(g, 0.22, 0.14, 0.01, 0, 1.05, -0.22, M.chrome);
  return g;
}
function vanity(len, sinks = 2, withMirror = true) {
  const g = grp();
  B(g, len, 0.42, 0.48, 0, 0.62, 0, M.walnut);
  B(g, len, 0.03, 0.5, 0, 0.845, 0.01, M.quartz);
  for (let i = 0; i < sinks; i++) {
    const x = -len / 2 + (i + 0.5) * len / sinks;
    const s = C(g, 0.2, 0.17, 0.12, x, 0.92, 0.04, M.ceramic, 28); s.scale.set(1, 1, 0.8);
    C(g, 0.014, 0.014, 0.28, x, 1.0, -0.19, M.chrome);
    B(g, 0.02, 0.02, 0.14, x, 1.13, -0.13, M.chrome);
  }
  if (withMirror) {
    B(g, len, 0.95, 0.02, 0, 1.62, -0.235, M.mirror);
    B(g, len + 0.04, 0.02, 0.03, 0, 2.11, -0.23, M.light, false);
  }
  return g;
}
function shower(parent, x1, x2, z1, z2, y, glass) {
  // ראש גשם מהתקרה, ניקוז קווי, מחיצות זכוכית
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  bx(cx - 0.18, cx + 0.18, y + NET - 0.02, y + NET - 0.005, cz - 0.18, cz + 0.18, M.chrome, parent, { cast: false });
  bx(x1 + 0.05, x2 - 0.05, y - 0.005, y + 0.002, z2 - 0.08, z2 - 0.04, M.blackSteel, parent, { cast: false });
  glass.forEach(([a, b, c, d]) => {
    bx(a, b, y, y + 2.1, c, d, M.glass, parent, { cast: false, glass: true, collide: true });
    bx(a, b, y + 2.08, y + 2.1, c, d, M.blackSteel, parent);
  });
}
function plant(h = 1.2, mat = M.leaf) {
  const g = grp();
  C(g, 0.2, 0.16, 0.42, 0, 0.21, 0, M.pot);
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.32, 1), mat);
  s.position.set(0, 0.42 + h * 0.45, 0); s.scale.set(1, 1.35, 1); s.castShadow = true; g.add(s);
  return g;
}
function tree(h = 4, mat = M.leaf, crown = 1.4) {
  const g = grp();
  C(g, 0.09, 0.14, h * 0.55, 0, h * 0.275, 0, M.trunk, 10);
  for (const [x, y, z, r] of [[0, h * 0.72, 0, crown], [0.6, h * 0.62, 0.3, crown * 0.7], [-0.5, h * 0.66, -0.3, crown * 0.75], [0.1, h * 0.9, -0.2, crown * 0.6]]) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
    s.position.set(x, y, z); s.castShadow = true; s.receiveShadow = true; g.add(s);
  }
  return g;
}
function shelf(w, h, d = 0.4, mat = M.oak) {
  const g = grp();
  B(g, 0.03, h, d, -w / 2, h / 2, 0, mat); B(g, 0.03, h, d, w / 2, h / 2, 0, mat);
  for (let y = 0.05; y < h; y += 0.38) B(g, w, 0.025, d, 0, y, 0, mat);
  const r = rng(Math.round(w * 100 + h * 10));
  for (let y = 0.075; y < h - 0.3; y += 0.38) for (let x = -w / 2 + 0.08; x < w / 2 - 0.1; x += 0.06 + r() * 0.08) {
    if (r() < 0.35) continue;
    const bh = 0.18 + r() * 0.12;
    B(g, 0.04, bh, d * 0.7, x, y + bh / 2, 0, [M.terracotta, M.sage, M.fabricDark, M.linen, M.kids1][Math.floor(r() * 5)], false);
  }
  return g;
}
function rug(parent, x1, x2, z1, z2, y, mat = M.rug) { bx(x1, x2, y, y + 0.012, z1, z2, mat, parent, { cast: false }); }
function desk(w = 1.6, d = 0.75) {
  const g = grp();
  B(g, w, 0.035, d, 0, 0.74, 0, M.oak);
  B(g, 0.04, 0.72, d - 0.1, -w / 2 + 0.05, 0.36, 0, M.blackSteel);
  B(g, 0.04, 0.72, d - 0.1, w / 2 - 0.05, 0.36, 0, M.blackSteel);
  B(g, 0.6, 0.36, 0.02, 0, 1.0, -d / 2 + 0.15, M.screen);
  B(g, 0.04, 0.2, 0.04, 0, 0.84, -d / 2 + 0.15, M.blackSteel);
  return g;
}
function officeChair() {
  const g = grp();
  B(g, 0.5, 0.08, 0.48, 0, 0.47, 0, M.fabricDark);
  B(g, 0.48, 0.55, 0.06, 0, 0.82, -0.22, M.fabricDark);
  C(g, 0.03, 0.03, 0.4, 0, 0.24, 0, M.chrome);
  C(g, 0.3, 0.3, 0.03, 0, 0.04, 0, M.blackSteel);
  return g;
}
function tv(w = 1.65) {
  const g = grp();
  B(g, w, w * 0.57, 0.04, 0, 0, 0, M.screen);
  return g;
}
function washer() {
  const g = grp();
  B(g, 0.6, 0.85, 0.6, 0, 0.425, 0, M.ceramic);
  const d = C(g, 0.17, 0.17, 0.02, 0, 0.45, 0.3, M.screen, 28); d.rotation.x = R90;
  return g;
}
function outdoorSofa(w) {
  const g = grp();
  B(g, w, 0.3, 0.9, 0, 0.2, 0, M.teak);
  B(g, w - 0.1, 0.14, 0.75, 0, 0.42, 0.05, M.cushion);
  B(g, w, 0.4, 0.14, 0, 0.55, -0.38, M.teak);
  B(g, w - 0.2, 0.36, 0.14, 0, 0.66, -0.28, M.cushion);
  return g;
}
function sunbed() {
  const g = grp();
  B(g, 0.7, 0.3, 1.95, 0, 0.18, 0, M.teak);
  B(g, 0.66, 0.08, 1.4, 0, 0.37, 0.25, M.cushion);
  const back = B(g, 0.66, 0.08, 0.6, 0, 0.55, -0.62, M.cushion); back.rotation.x = -0.7;
  return g;
}
function beanbag(mat) {
  const g = grp();
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), mat);
  s.scale.set(1, 0.55, 1); s.position.y = 0.22; s.castShadow = true; g.add(s);
  return g;
}

// --- סלון, מטבח ופינת אוכל
place(tallUnit(1.6, NET), g0, 0.31, GY, 11.1, R90);
bx(0, 0.02, 0.92, 1.6, 11.9, 15.6, M.quartz, g0, { cast: false });
place(counter(3.7, { sink: -0.6, cook: 1.1 }), g0, 0.31, GY, 13.75, R90);
bx(0.0, 0.55, 2.2, 2.32, 13.55, 14.35, M.blackSteel, g0);            // מנדף
bx(0.0, 0.3, 2.32, NET, 13.75, 14.15, M.lacquer, g0);
place(island(2.5, 1.0), g0, 2.05, GY, 13.65, R90);
[12.9, 13.65, 14.4].forEach((z) => place(stool(), g0, 2.85, GY, z, 0, false));
place(diningTable(2.4, 1.0), g0, 4.6, GY, 13.7, 0);
[-0.75, 0, 0.75].forEach((dx) => { place(chair(), g0, 4.6 + dx, GY, 13.0, 0, false); place(chair(), g0, 4.6 + dx, GY, 14.4, Math.PI, false); });
pendant(G.ceilG, 4.6, 13.7, NET, 1.75, 1.6);
rug(g0, 6.8, 9.9, 12.5, 15.3, GY);
place(sofa(2.8), g0, 8.3, GY, 14.88, Math.PI);
place(chaise(0.9, 1.25), g0, 6.95, GY, 13.85, 0);
place(coffeeTable(1.2, 0.7), g0, 8.5, GY, 13.45);
place(sofa(0.9, 0.85, M.sage), g0, 10.0, GY, 13.4, -R90);
const media = grp(); B(media, 2.6, 0.42, 0.45, 0, 0.45, 0, M.walnut); place(media, g0, 8.3, GY, 11.77, 0);
place(tv(1.65), g0, 8.3, GY + 1.55, 11.565, 0, false);
place(plant(1.6), g0, 9.95, GY, 15.5, 0);
place(plant(1.1, M.leafDark), g0, 5.5, GY, 11.9, 0);
// עמוד RHS
bx(10.18, 10.33, GY, NET, 15.69, 15.84, M.blackSteel, g0, { collide: true });
// מבואת כניסה
const bench = grp(); B(bench, 1.2, 0.42, 0.4, 0, 0.21, 0, M.oak); place(bench, g0, 3.6, GY, 8.56, 0);
bx(3.0, 4.2, 1.2, 2.2, 8.35, 8.37, M.mirror, g0, { cast: false });
place(plant(1.3), g0, 0.45, GY, 10.0, 0);
// פס תאורה עקיפה בגבס של הסלון + גופי תאורה שקועים
bx(0.2, 10.26, NET - 0.012, NET - 0.002, 11.62, 11.7, M.light, G.ceilG, { cast: false });
bx(10.3, 10.38, NET - 0.012, NET - 0.002, 11.7, 15.9, M.light, G.ceilG, { cast: false });
function downlights(parent, pts, y) { pts.forEach(([x, z]) => bx(x - 0.045, x + 0.045, y - 0.006, y, z - 0.045, z + 0.045, M.light, parent, { cast: false })); }
function acSlot(parent, x1, x2, z, y) { bx(x1, x2, y - 0.006, y, z - 0.025, z + 0.025, M.slot, parent, { cast: false }); }
downlights(G.ceilG, [[1.5, 9.4], [3.5, 9.4], [1.2, 12.4], [1.2, 15.0], [6.5, 15.2], [10.0, 12.2], [3.6, 6.2], [1.6, 6.2], [5.0, 7.0], [6.4, 7.0], [3.6, 7.5]], NET);
acSlot(G.ceilG, 1.0, 5.0, 15.7, NET); acSlot(G.ceilG, 6.6, 10.0, 15.7, NET); acSlot(G.ceilG, 2.6, 5.2, 0.3, NET); acSlot(G.ceilG, 6.6, 9.8, 8.8, NET); acSlot(G.ceilG, 6.5, 9.6, 3.2, NET);

// --- יחידת הורים
place(bed(1.8, 2.0), g0, 3.23, GY, 1.9, R90);
place(nightstand(), g0, 2.39, GY, 0.6, R90);
place(nightstand(), g0, 2.39, GY, 3.2, R90);
const footBench = grp(); B(footBench, 1.4, 0.45, 0.42, 0, 0.225, 0, M.fabricHead); place(footBench, g0, 4.5, GY, 1.9, -R90);
place(sofa(0.85, 0.85, M.sage), g0, 5.15, GY, 2.6, -R90 - 0.4);
rug(g0, 3.6, 5.4, 0.5, 3.3, GY, M.rugDark);
// חדר ארונות: ארונות גב-אל-גב כמחיצה, ומדפים לאורך הקיר הדרומי
place(wardrobe(2.55, NET - 0.02, 0.55, M.oak), g0, 3.415, GY, 4.125, 0);
place(wardrobe(1.16, NET - 0.02, 0.45, M.oak), g0, 2.72, GY, 5.425, Math.PI);
place(wardrobe(1.29, NET - 0.02, 0.45, M.oak), g0, 4.945, GY, 5.425, Math.PI);
bx(2.14, 2.16, 0.5, 2.3, 4.45, 5.15, M.mirror, g0, { cast: false });
bx(2.2, 4.62, NET - 0.01, NET - 0.002, 4.75, 4.85, M.light, G.ceilG, { cast: false });
// חדר רחצה הורים 2.46x2.18
bx(-0.52, -0.32, GY, NET, 3.47, 4.37, M.bathWall, g0, { collide: true });     // פיר ונטה
place(toilet(), g0, -0.02, GY, 3.92, R90);
shower(g0, -0.52, 0.43, 4.37, 5.65, GY, [[-0.32, 0.43, 4.36, 4.38], [0.42, 0.44, 4.37, 5.0]]);
bx(-0.52, -0.40, 1.1, 1.13, 4.7, 5.4, M.quartz, g0);                           // מדף אבן במקלחת
place(vanity(1.7, 2), g0, 1.70, GY, 4.45, -R90);
for (let y = 0.85; y < 1.6; y += 0.12) bx(0.4, 0.9, y, y + 0.02, 3.49, 3.53, M.chrome, g0, { cast: false }); // מחמם מגבות
// מעבר + שירותי אורחים
place(toilet(), g0, 3.6, GY, 7.0, 0);
place(vanity(0.45, 1, false), g0, 3.2, GY, 7.85, R90);
bx(2.95, 2.97, 1.2, 2.0, 7.6, 8.1, M.mirror, g0, { cast: false });

// --- ממ"ד
place(desk(1.5, 0.65), g0, 7.6, GY, 3.25, 0);
place(officeChair(), g0, 7.6, GY, 3.8, Math.PI, false);
place(sofa(1.9, 0.9, M.fabricHead), g0, 6.36, GY, 4.4, R90);
place(shelf(1.0, 2.0, 0.35), g0, 9.4, GY, 3.08, 0);

// --- חדר רחצה כללי
shower(g0, 7.27, 8.47, 5.95, 7.05, GY, [[7.27, 7.97, 7.04, 7.06]]);
place(vanity(1.6, 2), g0, 9.1, GY, 8.05, Math.PI);
place(toilet(), g0, 9.9, GY, 6.2, 0);

// --- חדר שינה 2
place(bed(1.6, 2.0), g0, 7.21, GY, 10.0, R90);
place(nightstand(), g0, 6.37, GY, 11.06, R90);
place(wardrobe(1.9, 2.6, 0.6), g0, 9.45, GY, 10.99, Math.PI);
place(desk(1.2, 0.6), g0, 10.16, GY, 9.9, -R90);
place(officeChair(), g0, 9.6, GY, 9.9, R90, false);

// --- מרתף
// מיני בר
place(counter(1.6, { sink: 0.3 }), g1, 0.31, BY, 1.6, R90);
bx(0, 0.35, BY + 1.5, BY + 1.53, 0.8, 2.4, M.oak, g1);
bx(0, 0.35, BY + 1.9, BY + 1.93, 0.8, 2.4, M.oak, g1);
bx(0, 0.02, BY + 0.92, BY + 1.5, 0.8, 2.4, M.darkStone, g1, { cast: false });
place(stool(), g1, 0.95, BY, 1.2, 0, false); place(stool(), g1, 0.95, BY, 2.0, 0, false);
// מרחב משפחה
rug(g1, 1.9, 4.8, 3.4, 6.2, BY, M.rugDark);
place(sofa(2.6, 0.95, M.fabricDark), g1, 2.0, BY, 4.8, R90);
place(coffeeTable(1.1, 0.7), g1, 3.6, BY, 4.8, R90);
const media2 = grp(); B(media2, 2.2, 0.42, 0.42, 0, 0.45, 0, M.walnut); place(media2, g1, 5.28, BY, 5.0, -R90);
place(tv(1.85), g1, 5.47, BY + 1.5, 5.0, -R90, false);
place(plant(1.3), g1, 0.45, BY, 6.2, 0);
// חדר משחקים
rug(g1, 2.6, 5.0, -0.5, 2.1, BY, std({ color: 0xd7d0c0, roughness: 1 }));
const kt = grp(); B(kt, 0.9, 0.03, 0.6, 0, 0.5, 0, M.oak); [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]].forEach(([x, z]) => B(kt, 0.04, 0.5, 0.04, x, 0.25, z, M.oak));
place(kt, g1, 3.8, BY, 0.8, 0);
[[3.4, 0.35], [4.2, 0.35], [3.4, 1.25], [4.2, 1.25]].forEach(([x, z], i) => { const c = grp(); B(c, 0.32, 0.04, 0.32, 0, 0.3, 0, [M.kids1, M.kids2, M.kids3, M.kids2][i]); B(c, 0.32, 0.3, 0.03, 0, 0.45, -0.15, [M.kids1, M.kids2, M.kids3, M.kids2][i]); B(c, 0.28, 0.3, 0.28, 0, 0.14, 0, M.oak); place(c, g1, x, BY, z, i < 2 ? 0 : Math.PI, false); });
place(shelf(1.8, 1.2, 0.35), g1, 2.24, BY, 0.6, R90);
place(beanbag(M.kids2), g1, 4.8, BY, -0.3, 0);
place(beanbag(M.kids3), g1, 4.9, BY, 1.9, 0);
const tent = grp(); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.5, 4), std({ color: 0xf0e6d6, roughness: 1 })); cone.position.y = 0.75; cone.castShadow = true; tent.add(cone); place(tent, g1, 2.8, BY, -0.3, 0.5);
// חדרי רחצה במרתף
place(vanity(0.85, 1, false), g1, 7.425, BY, 3.04, 0);
place(toilet(), g1, 7.6, BY, 4.0, -R90);
shower(g1, 6.25, 7.85, 4.45, 5.60, BY, [[6.25, 7.15, 4.44, 4.46]]);
place(vanity(0.8, 1), g1, 9.1, BY, 4.6, R90);
place(toilet(), g1, 10.2, BY, 4.35, -R90);
shower(g1, 8.86, 10.46, 2.80, 3.95, BY, [[9.4, 10.46, 3.94, 3.96]]);
// סטודיו
rug(g1, 7.2, 9.6, 6.9, 9.2, BY);
place(sofa(2.2, 0.9), g1, 7.6, BY, 6.15, 0);
place(coffeeTable(1.0, 0.6), g1, 7.6, BY, 7.25);
place(desk(1.8, 0.8), g1, 10.06, BY, 7.65, -R90);
place(officeChair(), g1, 9.4, BY, 7.65, R90, false);
place(shelf(2.4, 2.3, 0.35), g1, 7.8, BY, 9.63, Math.PI);
place(plant(1.4), g1, 6.6, BY, 9.4, 0);
// חדר שירות ומחסן
place(washer(), g1, 3.1, BY, 10.26, Math.PI);
place(washer(), g1, 3.75, BY, 10.26, Math.PI);
place(counter(0.6, { sink: 0 }), g1, 4.4, BY, 10.24, Math.PI);
place(shelf(1.2, 2.0, 0.4, M.steel), g1, 4.5, BY, 9.0, -R90);
place(shelf(2.2, 2.2, 0.45, M.steel), g1, 1.2, BY, 10.4, Math.PI);
place(shelf(1.5, 2.2, 0.45, M.steel), g1, 0.25, BY, 9.2, R90);
// חצר אנגלית
const planter = grp(); B(planter, 1.4, 0.55, 1.4, 0, 0.275, 0, M.concrete); B(planter, 1.3, 0.02, 1.3, 0, 0.54, 0, M.soil);
place(planter, g1, 9.0, BY, 0.0, 0);
place(tree(3.2, M.olive, 0.9), g1, 9.0, BY + 0.55, 0.0, 0, false);
const bench2 = grp(); B(bench2, 1.8, 0.45, 0.45, 0, 0.225, 0, M.teak); place(bench2, g1, 7.4, BY, -1.35, 0);
[-1.1, 0.6, 2.0].forEach((z) => { const t = grp(); C(t, 0.22, 0.18, 0.45, 0, 0.225, 0, M.pot); const cn = new THREE.Mesh(new THREE.ConeGeometry(0.32, 2.6, 8), M.leafDark); cn.position.y = 1.7; cn.castShadow = true; t.add(cn); place(t, g1, 9.9, BY, z, 0); });

// --- גינה ודק
place(diningTable(2.2, 1.0), G.out, 2.6, GY, 17.9, 0);
[-0.7, 0, 0.7].forEach((dx) => { place(chair(), G.out, 2.6 + dx, GY, 17.2, 0, false); place(chair(), G.out, 2.6 + dx, GY, 18.6, Math.PI, false); });
place(outdoorSofa(2.6), G.out, 9.8, GY, 18.0, -R90);
place(outdoorSofa(1.0), G.out, 7.4, GY, 18.0, R90);
place(coffeeTable(1.1, 0.6), G.out, 8.6, GY, 18.0, R90);
place(sunbed(), G.out, 4.4, GY, 21.0, Math.PI);
place(sunbed(), G.out, 5.4, GY, 21.0, Math.PI);
place(tree(4.6, M.leaf, 1.6), G.out, 1.3, GY, 21.0, 0);
place(tree(4.2, M.olive, 1.3), G.out, 12.4, GY, 20.6, 0);
place(tree(3.6, M.leaf, 1.2), G.out, 12.9, GY, 12.2, 0);
place(plant(1.4), G.out, 10.2, GY, 16.7, 0);
place(plant(1.2, M.leafDark), G.out, 0.25, GY, 16.7, 0);

// ---------------------------------------------------------------- חדרים (שם ושטח)
// שטח = מכפלת המידות הנטו של כל חלק בחדר.
const ROOMS = [
  { id: 'lobby', lvl: 'G', name: 'לובי הבניין', note: 'שטח משותף · הכניסה לדירה', rects: [[-4.0, -0.25, 8.5, 11.5]] },
  { id: 'foyer', lvl: 'G', name: 'מבואת כניסה', rects: [[0, 5.87, 8.25, 11.54]] },
  { id: 'great', lvl: 'G', name: 'מטבח, פינת אוכל וסלון', rects: [[0, 10.46, 11.54, 15.99]] },
  { id: 'master', lvl: 'G', name: 'חדר שינה הורים', rects: [[2.14, 5.59, 0, 3.85]] },
  { id: 'dress', lvl: 'G', name: 'חדר ארונות', rects: [[2.14, 5.59, 3.85, 5.65]] },
  { id: 'mbath', lvl: 'G', name: 'חדר רחצה הורים', rects: [[-0.52, 1.94, 3.47, 5.65]] },
  { id: 'passage', lvl: 'G', name: 'מעבר יחידת הורים', rects: [[0.50, 4.35, 5.75, 6.65]] },
  { id: 'hall', lvl: 'G', name: 'מסדרון', rects: [[4.45, 5.59, 5.75, 8.29], [5.59, 7.17, 5.95, 8.29]] },
  { id: 'wc', lvl: 'G', name: 'שירותי אורחים', rects: [[2.95, 4.25, 6.75, 8.25]] },
  { id: 'mamad', lvl: 'G', name: 'ממ״ד / חדר שינה', rects: [[5.89, 10.13, 2.90, 5.65]] },
  { id: 'bath', lvl: 'G', name: 'חדר רחצה', rects: [[7.27, 10.46, 5.95, 8.29]] },
  { id: 'bed2', lvl: 'G', name: 'חדר שינה', rects: [[6.12, 10.46, 8.49, 11.29]] },
  { id: 'stairs', lvl: 'S', name: 'מדרגות למרתף', rects: [[-1.69, 2.80, 6.75, 8.25]] },
  { id: 'deck', lvl: 'G', name: 'מרפסת דק עם פרגולה', rects: [[-0.25, 10.71, 16.24, 19.54]] },
  { id: 'garden', lvl: 'G', name: 'גינה פרטית', areaOverride: 13.96 * 6.0 + 3.0 * 12.87, note: 'כולל הדק', rects: [[-0.25, 13.71, 19.54, 22.24], [10.71, 13.71, 3.37, 19.54]] },
  { id: 'family', lvl: 'B', name: 'מרחב משפחה ומיני בר', rects: [[0, 5.49, 2.68, 6.65], [0, 1.94, 0.60, 2.68]] },
  { id: 'play', lvl: 'B', name: 'חדר משחקים', rects: [[2.04, 5.49, -0.97, 2.58]] },
  { id: 'bbath1', lvl: 'B', name: 'חדר רחצה (מרתף)', rects: [[6.25, 7.85, 2.80, 5.60]] },
  { id: 'bbath2', lvl: 'B', name: 'חדר רחצה (מרתף)', rects: [[8.86, 10.46, 2.80, 5.60]] },
  { id: 'studio', lvl: 'B', name: 'סטודיו', rects: [[6.25, 10.46, 5.70, 9.81]] },
  { id: 'bhall', lvl: 'B', name: 'מבואת מרתף', rects: [[2.05, 5.49, 6.75, 8.25]] },
  { id: 'service', lvl: 'B', name: 'חדר שירות', rects: [[2.71, 4.71, 8.35, 10.56]] },
  { id: 'storage', lvl: 'B', name: 'מחסן', rects: [[0, 2.61, 8.35, 10.64]] },
  { id: 'court', lvl: 'B', name: 'חצר אנגלית', rects: [[5.89, 10.28, -1.65, 2.60]] },
];
ROOMS.forEach((r) => {
  r.area = r.areaOverride ?? r.rects.reduce((s, [a, b, c, d]) => s + (b - a) * (d - c), 0);
  const [a, b, c, d] = r.rects[0];
  r.cx = (a + b) / 2; r.cz = (c + d) / 2;
});

// תוויות במבט מלמעלה
function label(text, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.direction = 'rtl'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  const rr = 22; ctx.beginPath(); ctx.roundRect(8, 18, 496, 124, rr); ctx.fill();
  ctx.fillStyle = '#1f2328'; ctx.font = 'bold 46px "Segoe UI", Arial, sans-serif'; ctx.fillText(text, 256, 74);
  ctx.fillStyle = '#5a6068'; ctx.font = '38px "Segoe UI", Arial, sans-serif'; ctx.fillText(sub, 256, 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  sp.scale.set(2.9, 0.91, 1); sp.renderOrder = 10;
  return sp;
}
const fmtArea = (a) => `${a.toFixed(1)} מ״ר`;
ROOMS.forEach((r) => {
  if (['lobby', 'passage', 'stairs'].includes(r.id)) return;
  const sp = label(r.name, fmtArea(r.area));
  sp.position.set(r.cx, (r.lvl === 'B' ? BY : GY) + 2.0, r.cz);
  sp.userData.lvl = r.lvl;
  G.labels.add(sp);
});
G.labels.visible = false;

// ---------------------------------------------------------------- אור
const hemi = new THREE.HemisphereLight(0xdfe8f3, 0xa69a86, 0.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2df, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
const sc = sun.shadow.camera;
sc.left = -19; sc.right = 19; sc.top = 19; sc.bottom = -19; sc.near = 1; sc.far = 110;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025;
sun.target.position.set(5.5, 0, 9);
scene.add(sun); scene.add(sun.target);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.28;

// שמיים
(function sky() {
  const t = canvasTex(256, (ctx, n) => {
    const g = ctx.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#6f9fd3'); g.addColorStop(0.48, '#bcd6ee'); g.addColorStop(0.52, '#dfe6df'); g.addColorStop(1, '#b9b9a9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const s = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false }));
  scene.add(s);
})();

// תאורה פנימית חמה (אפשר לכבות)
[[2.5, 3.1, 13.8, 9], [7.8, 3.1, 13.8, 9], [3, 3.1, 9.8, 7], [3.8, 3.1, 1.9, 6], [3.8, 3.1, 4.8, 4], [0.7, 3.1, 4.5, 4], [5.8, 3.1, 7.0, 5],
  [8, 3.1, 4.3, 6], [8.8, 3.1, 7.1, 5], [8.3, 3.1, 9.9, 6], [3.6, 3.1, 7.5, 3], [-2.1, 2.7, 10, 5],
  [2.7, BY + 3.1, 4.7, 10], [1.0, BY + 3.1, 1.6, 6], [3.8, BY + 3.1, 0.8, 9], [8.3, BY + 3.1, 7.7, 10], [7.0, BY + 3.1, 4.2, 4],
  [9.6, BY + 3.1, 4.2, 4], [4.0, BY + 3.1, 7.5, 5], [3.7, BY + 3.1, 9.5, 4], [1.3, BY + 3.1, 9.5, 4], [0.5, BY + 2.6, 7.5, 3]]
  .forEach(([x, y, z, i]) => { const l = new THREE.PointLight(0xffd9ad, i * 0.65, 9, 2); l.position.set(x, y, z); G.lights.add(l); });
downlights(G.ceilB, [[1.5, 4.0], [3.5, 4.0], [1.5, 5.8], [3.5, 5.8], [3.0, 0.0], [4.6, 0.0], [3.0, 1.8], [4.6, 1.8], [7.3, 6.6], [9.3, 6.6], [7.3, 8.9], [9.3, 8.9], [3.6, 7.5], [4.8, 7.5], [1.0, 1.6]], BCy);

// מיקום השמש: קו רוחב 31.9°, זמן שמש = שעון + 20 דקות (+1 שעה שעון קיץ).
function sunDir(day, hour, dst) {
  const lat = 31.9 * Math.PI / 180;
  const decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + day) / 365);
  const solar = hour + 0.33 - (dst ? 1 : 0);
  const H = (solar - 12) * 15 * Math.PI / 180;
  const sinEl = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
  const el = Math.asin(sinEl);
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;
  return { el, az, v: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)) };
}
const DATES = { today: [327, false], dec: [355, false], mar: [80, false], jun: [172, true] };
let sunState = { date: 'today', hour: 10 };
function updateSun() {
  const [day, dst] = DATES[sunState.date];
  const s = sunDir(day, sunState.hour, dst);
  sun.position.copy(sun.target.position).addScaledVector(s.v, 60);
  const k = Math.max(0, Math.min(1, s.el / 0.25));
  sun.intensity = 3.2 * k;
  sun.color.setHSL(0.09, 0.8, 0.82 + 0.12 * k);
  hemi.intensity = 0.22 + 0.3 * k;
  return s;
}

// ---------------------------------------------------------------- תנועה והתנגשויות
const RAD = 0.25, EYE = 1.62, STEP = 0.45;
const player = { x: -2.6, z: 9.2, feet: GY, yaw: -R90, pitch: 0 };
const courtyardHole = [5.89, 10.28, -1.65, 2.60];
function inR(x, z, r) { return x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]; }
function surfaceAt(x, z, feet) {
  const c = [];
  const s = stairH(x, z);
  if (s !== null) c.push(s, BY);
  else { if (!inR(x, z, courtyardHole)) c.push(GY); c.push(BY); }
  let best = null;
  for (const h of c) if (h <= feet + STEP && (best === null || h > best)) best = h;
  return best;
}
function blocked(x, z, feet) {
  const y1 = feet + 0.35, y2 = feet + 1.8;
  for (const b of colliders) {
    if (b.y1 >= y2 || b.y2 <= y1) continue;
    const cx = Math.max(b.x1, Math.min(x, b.x2)), cz = Math.max(b.z1, Math.min(z, b.z2));
    if ((x - cx) ** 2 + (z - cz) ** 2 < RAD * RAD) return true;
  }
  return false;
}
function tryMove(nx, nz) {
  const h = surfaceAt(nx, nz, player.feet);
  if (h === null || h < player.feet - 0.6) return false;
  if (blocked(nx, nz, h) && !blocked(player.x, player.z, player.feet)) return false;   // מי שנתקע בתוך רהיט יכול לצאת
  player.x = nx; player.z = nz; player.feet = h;
  return true;
}

// ---------------------------------------------------------------- שליטה
const plc = new PointerLockControls(camera, renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false; orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.47; orbit.minDistance = 4; orbit.maxDistance = 60;
let mode = 'walk';
let camY = player.feet + EYE;
const keys = {};
const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
addEventListener('keydown', (e) => { if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); } if (e.code.startsWith('Shift')) keys.run = true; });
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; if (e.code.startsWith('Shift')) keys.run = false; });
camera.position.set(player.x, player.feet + EYE, player.z);
camera.rotation.order = 'YXZ';
camera.rotation.set(0, player.yaw, 0);

// גרירה עם העכבר כשאין נעילת סמן (או במגע)
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (mode === 'walk' && !plc.isLocked) drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointermove', (e) => {
  if (!drag || mode !== 'walk' || plc.isLocked) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
  const eu = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  eu.y -= dx * 0.004; eu.x = Math.max(-1.4, Math.min(1.4, eu.x - dy * 0.004));
  camera.quaternion.setFromEuler(eu);
});

function setLevelVisibility(lvl) {
  const showG = lvl !== 'B';
  G.ground.visible = showG; G.slab.visible = showG; G.out.visible = showG;
  G.labels.children.forEach((s) => { s.visible = lvl === 'B' ? s.userData.lvl === 'B' : s.userData.lvl !== 'B'; });
}
let dollLevel = 'G';
let walkSaved = null;
function setMode(m) {
  mode = m;
  if (m === 'doll') {
    walkSaved = camera.quaternion.clone();
    plc.unlock();
    G.ceilG.visible = false; G.ceilB.visible = false; G.roof.visible = false;
    G.labels.visible = true;
    setLevelVisibility(dollLevel);
    orbit.enabled = true;
    orbit.target.set(5, dollLevel === 'B' ? BY : 0, 8);
    camera.position.set(-2, 15, 23);
    orbit.update();
  } else {
    orbit.enabled = false;
    G.ceilG.visible = true; G.ceilB.visible = true; G.roof.visible = true;
    G.labels.visible = false;
    setLevelVisibility('G');
    G.ground.visible = true; G.slab.visible = true; G.out.visible = true;
    camera.position.set(player.x, player.feet + EYE, player.z);
    if (walkSaved) camera.quaternion.copy(walkSaved);
    camY = player.feet + EYE;
  }
  document.dispatchEvent(new CustomEvent('tourmode', { detail: m }));
}
function setDollLevel(l) {
  dollLevel = l;
  if (mode === 'doll') {
    setLevelVisibility(l);
    const dy = (l === 'B' ? BY : 0) - orbit.target.y;
    orbit.target.y += dy; camera.position.y += dy; orbit.update();
  }
}
function teleport(id) {
  const r = ROOMS.find((q) => q.id === id);
  if (!r) return;
  const spots = {
    great: [7.4, 15.68, 0.79], master: [4.9, 0.6, 1.87], mbath: [1.0, 5.3, 0.46], mamad: [8.8, 5.2, 0.79], bath: [8.0, 7.6, -0.79],
    bed2: [9.0, 10.4, 1.35], family: [4.6, 6.2, 1.1], play: [4.0, 2.2, 0.79], studio: [7.7, 8.9, -0.79], garden: [6.6, 21.7, 0],
    deck: [4.5, 19.2, 0], foyer: [1.0, 9.2, -2.36], lobby: [-2.6, 9.2, -R90], court: [6.4, 1.9, -0.79], dress: [5.2, 4.8, R90], wc: [3.75, 7.9, 0.79],
    bbath1: [6.6, 3.4, -2.68], bbath2: [9.6, 5.3, 0.2], service: [3.4, 8.7, -2.36], storage: [2.2, 9.6, 1.57], bhall: [4.8, 7.6, -R90], hall: [5.0, 6.2, Math.PI],
  };
  const [x, z, yaw] = spots[id] || [r.cx, r.cz, 0];
  player.x = x; player.z = z; player.feet = r.lvl === 'B' ? BY : GY; player.yaw = yaw;
  camY = player.feet + EYE;
  walkSaved = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, yaw, 0, 'YXZ'));
  if (mode !== 'walk') setMode('walk');
  else { camera.quaternion.copy(walkSaved); camera.position.set(x, camY, z); }
}

// ---------------------------------------------------------------- HUD
let lastRoom = null;
function currentRoom() {
  const lvl = player.feet > -2 ? 'G' : 'B';
  if (stairH(player.x, player.z) !== null) return ROOMS.find((r) => r.id === 'stairs');
  return ROOMS.find((r) => (r.lvl === lvl) && r.rects.some((q) => inR(player.x, player.z, q))) || null;
}
function updateHud() {
  const r = mode === 'walk' ? currentRoom() : null;
  if (r !== lastRoom) {
    lastRoom = r;
    document.dispatchEvent(new CustomEvent('tourroom', { detail: r ? {
      name: r.name,
      area: ['stairs', 'lobby', 'passage'].includes(r.id) ? (r.note || '') : fmtArea(r.area) + (r.note ? ` · ${r.note}` : ''),
      level: r.id === 'lobby' ? 'מחוץ לדירה' : r.lvl === 'B' ? 'קומת מרתף' : r.lvl === 'S' ? 'בין הקומות' : (['deck', 'garden'].includes(r.id) ? 'קומת כניסה · חוץ' : 'קומת כניסה'),
    } : null }));
  }
}

// ---------------------------------------------------------------- לולאה
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'walk') {
    const sp = (keys.run ? 3.0 : 1.5) * dt;
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    let mx = 0, mz = 0;
    if (keys.f) { mx += fwd.x; mz += fwd.z; } if (keys.b) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.r) { mx += right.x; mz += right.z; } if (keys.l) { mx -= right.x; mz -= right.z; }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx = mx / len * sp; mz = mz / len * sp;
      const n = 4;
      for (let i = 0; i < n; i++) { tryMove(player.x + mx / n, player.z) ; tryMove(player.x, player.z + mz / n); }
    }
    camY += (player.feet + EYE - camY) * Math.min(1, dt * 10);
    camera.position.set(player.x, camY, player.z);
    updateHud();
  } else {
    orbit.update();
  }
  const eu = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  document.dispatchEvent(new CustomEvent('tourheading', { detail: eu.y }));
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- מדידה (בדיקת מידות מול התוכנית)
// קרניים אופקיות בגובה 0.5 מ' מהרצפה, רק מול קירות. לכל כיוון נלקח הערך השכיח מבין 31 קרניים.
function measure(x1, x2, z1, z2, lvl) {
  const y = (lvl === 'B' ? BY : GY) + 0.5;
  const rc = new THREE.Raycaster();
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  // לכל צד נלקח הקיר הקרוב ביותר (קרניים שעוברות בפתח ממשיכות רחוק יותר ולא משפיעות)
  const span = (axis) => {
    const side = [Infinity, Infinity];
    for (let i = 0; i <= 30; i++) {
      const t = 0.04 + 0.92 * i / 30;
      const o = axis === 'x' ? new THREE.Vector3(cx, y, z1 + (z2 - z1) * t) : new THREE.Vector3(x1 + (x2 - x1) * t, y, cz);
      [1, -1].forEach((s, k) => {
        rc.set(o, axis === 'x' ? new THREE.Vector3(s, 0, 0) : new THREE.Vector3(0, 0, s));
        rc.far = 30;
        const hit = rc.intersectObjects(wallMeshes, false)[0];
        if (hit) side[k] = Math.min(side[k], hit.distance);
      });
    }
    return Math.round((side[0] + side[1]) * 1000) / 1000;
  };
  return { x: span('x'), z: span('z') };
}
const CHECKS = [
  { name: 'חדר שינה הורים (כולל חדר הארונות)', lvl: 'G', r: [2.14, 5.59, 0, 5.65], plan: [3.45, 5.65] },
  { name: 'חדר רחצה הורים', lvl: 'G', r: [-0.52, 1.94, 3.47, 5.65], plan: [2.46, 2.18] },
  { name: 'ממ״ד / חדר שינה', lvl: 'G', r: [5.89, 10.13, 2.90, 5.65], plan: [4.24, 2.75] },
  { name: 'חדר רחצה כללי', lvl: 'G', r: [7.27, 10.46, 5.95, 8.29], plan: [3.19, 2.34] },
  { name: 'שירותי אורחים', lvl: 'G', r: [2.95, 4.25, 6.75, 8.25], plan: [1.30, null] },
  { name: 'חדר שינה 2', lvl: 'G', r: [6.12, 10.46, 8.49, 11.29], plan: [4.34, 2.80] },
  { name: 'מטבח, פינת אוכל וסלון', lvl: 'G', r: [0, 10.46, 11.54, 15.99], plan: [10.46, 4.45] },
  { name: 'חדר משחקים', lvl: 'B', r: [2.04, 5.49, -0.97, 2.58], plan: [3.45, 3.55] },
  { name: 'מרחב משפחה', lvl: 'B', r: [0, 5.49, 2.68, 6.65], plan: [5.49, 3.97] },
  { name: 'סטודיו', lvl: 'B', r: [6.25, 10.46, 5.70, 9.81], plan: [4.21, 4.11] },
  { name: 'חדר רחצה מרתף 1', lvl: 'B', r: [6.25, 7.85, 2.80, 5.60], plan: [1.60, 2.80] },
  { name: 'חדר רחצה מרתף 2', lvl: 'B', r: [8.86, 10.46, 2.80, 5.60], plan: [null, 2.80] },
  { name: 'חדר שירות', lvl: 'B', r: [2.71, 4.71, 8.35, 10.56], plan: [null, 2.21] },
  { name: 'מחסן', lvl: 'B', r: [0, 2.61, 8.35, 10.64], plan: [2.61, null] },
  { name: 'חצר אנגלית', lvl: 'B', r: [5.89, 10.28, -1.65, 2.60], plan: [4.39, 4.25] },
];
window.__tour = {
  measureAll: () => CHECKS.map((c) => ({ ...c, model: measure(c.r[0], c.r[1], c.r[2], c.r[3], c.lvl) })),
  rooms: () => ROOMS.map((r) => ({ id: r.id, name: r.name, area: +r.area.toFixed(2) })),
  goto: (x, z, yaw, lvl = 'G', pitch = -0.08) => {
    player.x = x; player.z = z; player.feet = lvl === 'B' ? BY : GY; camY = player.feet + EYE;
    walkSaved = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    if (mode !== 'walk') setMode('walk'); else { camera.quaternion.copy(walkSaved); camera.position.set(x, camY, z); }
  },
  walk: (dx, dz, n = 60) => { for (let i = 0; i < n; i++) { tryMove(player.x + dx, player.z); tryMove(player.x, player.z + dz); } return { ...player }; },
  stuck: () => blocked(player.x, player.z, player.feet),
  player, setMode, setDollLevel, teleport,
  setSun: (date, hour) => { sunState = { date, hour }; return updateSun(); },
  setLights: (on) => { G.lights.visible = on; },
  vitrineWidths: () => [5.86 - 0.66, 9.21 - 6.31],
};

// ---------------------------------------------------------------- ממשק
export function start() {
  updateSun();
  frame();
  return { plc, setMode, setDollLevel, teleport, ROOMS, sunState: () => sunState, setSun: (d, h) => { sunState = { date: d, hour: h }; updateSun(); }, setLights: (on) => { G.lights.visible = on; } };
}
window.__startTour = start;
