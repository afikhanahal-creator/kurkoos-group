// סיור תלת-ממדי בדירת גן 250 מ"ר: גרסה 2 (תוכנית מתוקנת, 3 סגנונות, שעות ביום, סיור מודרך).
// יחידות: מטרים. x = מזרח, z = דרום (צפון = -z), y = למעלה. רצפת הכניסה y=0, רצפת המרתף y=-4.10.
// הקירות, הפתחים והרצפות נקראים מ-layout.json, שנוצר מסקריפט ה-Blender (מקור אחד לתוכנית).
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import LAYOUT from './layout.json';
import IMG_OAK from './assets/oak.jpg';
import IMG_HERRING from './assets/herringbone.jpg';
import IMG_PLASTER from './assets/plaster.jpg';
import IMG_STONE from './assets/stone.jpg';
import IMG_GRANITE from './assets/granite.jpg';
import IMG_WALLTILES from './assets/walltiles.jpg';
import IMG_LINEN from './assets/linen.jpg';
import IMG_VELVET from './assets/velvet.jpg';
import IMG_DECK from './assets/deck.jpg';
import IMG_PAVERS from './assets/pavers.jpg';
import IMG_WALNUT from './assets/walnut.jpg';
import IMG_RUG from './assets/rug.jpg';
import IMG_TERRAZZO from './assets/terrazzo.jpg';
import PANO_NOON from './assets/pano_noon.jpg';
import PANO_SUNSET from './assets/pano_day.jpg';
import PANO_NIGHT from './assets/pano_night.jpg';
import PH1 from './assets/photo_venice_sunset.jpg';
import PH2 from './assets/photo_misty_pines.jpg';
import PH3 from './assets/photo_kloofendal_48d_partly_cloudy.jpg';
import PH4 from './assets/photo_lake_pier.jpg';
import PH5 from './assets/photo_spaichingen_hill.jpg';
import PH6 from './assets/photo_rosendal_plains_2.jpg';
import PH7 from './assets/photo_golden_bay.jpg';
import PH8 from './assets/photo_cape_hill.jpg';

const GY = 0, BY = -4.10, NET = 3.40, GROSS = 3.80, SLAB = 0.30, SPAN = 2.4;
const RISER = (GY - BY) / 22;
const R90 = Math.PI / 2;
const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;

// ---------------------------------------------------------------- רנדרר (מהירות קודמת לאפקט)
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE || devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;           // הצללים מחושבים מחדש רק כשהשמש זזה
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 500);
camera.rotation.order = 'YXZ';
const MAXANI = Math.min(8, renderer.capabilities.getMaxAnisotropy());

// ---------------------------------------------------------------- תמונות וטקסטורות
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; }); }
const IMG = {};
function texFromCanvas(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANI;
  return t;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// אריחי פורצלן 120x120 (2x2 בטקסטורה של 2.4 מ') מתמונת אבן/טיח אמיתית, בגוון הסגנון
function porcelainTex(img, tint, grout, seed, contrast = 1) {
  const n = 1024, T = n / 2, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'), r = rng(seed);
  for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
    x.save(); x.beginPath(); x.rect(tx * T, ty * T, T, T); x.clip();
    const sx = r() * (img.width * 0.5), sy = r() * (img.height * 0.5);
    x.fillStyle = tint; x.fillRect(tx * T, ty * T, T, T);
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = Math.min(1, 0.45 * contrast);
    x.drawImage(img, sx, sy, img.width * 0.5, img.height * 0.5, tx * T, ty * T, T, T);
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + r() * 0.03})`; x.fillRect(tx * T, ty * T, T, T);
    x.restore();
  }
  x.fillStyle = grout;
  [0, T - 1, n - 1].forEach((p) => { x.fillRect(0, p, n, 2); x.fillRect(p, 0, 2, n); });
  return texFromCanvas(c);
}
// פרקט קרשים (רוחב 19 ס"מ) מתמונת עץ אמיתית
function plankTex(img, tint, seed, plankW = 0.19, plankL = 1.8) {
  const n = 1024, ppm = n / SPAN, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'), r = rng(seed), pw = plankW * ppm;
  for (let row = 0; row * pw < n; row++) {
    let px = -r() * plankL * ppm;
    while (px < n) {
      const L = plankL * ppm * (0.6 + r() * 0.4);
      const sx = r() * (img.width * 0.6), sy = r() * (img.height * 0.94);
      x.drawImage(img, sx, sy, img.width * 0.4, img.height * 0.06, px, row * pw, L, pw);
      x.fillStyle = `rgba(${r() < 0.5 ? '255,240,220' : '40,20,5'},${0.04 + r() * 0.07})`; x.fillRect(px, row * pw, L, pw);
      x.fillStyle = 'rgba(20,12,6,0.55)'; x.fillRect(px + L - 1.5, row * pw, 1.5, pw);
      px += L;
    }
    x.fillStyle = 'rgba(20,12,6,0.6)'; x.fillRect(0, row * pw + pw - 1.5, n, 1.5);
  }
  x.globalCompositeOperation = 'color'; x.globalAlpha = 0.65; x.fillStyle = tint; x.fillRect(0, 0, n, n);
  x.globalCompositeOperation = 'soft-light'; x.globalAlpha = 0.5; x.fillRect(0, 0, n, n);
  return texFromCanvas(c);
}
function tintTex(img, tint, strength = 0.55) {
  // צבע הסגנון + המרקם של התמונה האמיתית (overlay): בלי להחשיך
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'overlay'; x.globalAlpha = strength; x.drawImage(img, 0, 0);
  return texFromCanvas(c);
}
function imgTex(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return texFromCanvas(c); }

// ---------------------------------------------------------------- סגנונות
const STYLES = {
  modern: {
    name: 'מודרני בהיר', wall: '#efebe4', ceiling: '#f6f4f0', trim: '#f2f0eb', livingFloor: ['plaster', '#e8e3db', '#c9c2b6', 1], bedFloor: ['oak', '#e9cfac'],
    basementFloor: '#f0dcc0', wood: '#d8b791', woodDark: '#6b4c35', cabinet: '#ece9e3', counter: '#f1efea', sofa: '#cfc8bc',
    sofaDark: '#6e6a64', bedding: '#f4f1eb', throw: '#9a8a73', accent: '#8f9b82', accent2: '#c98e6a', rug: '#d9d0c1', metal: '#1c1c1e',
    metalRough: 0.35, metalMetal: 0.7, headboard: '#cbbfae', lampShade: '#f3ede2',
  },
  med: {
    name: 'ים-תיכוני חם', wall: '#ece0cd', ceiling: '#f4ece0', trim: '#e9dcc8', livingFloor: ['stone', '#e7d6bb', '#b9a688', 1.1], bedFloor: ['herring', '#e0b47e'],
    basementFloor: '#dcae7a', wood: '#b8875a', woodDark: '#5a3b24', cabinet: '#7f8f78', counter: '#efe7da', sofa: '#e2d6c3',
    sofaDark: '#8a6a4f', bedding: '#f3ece0', throw: '#b5643f', accent: '#5f7b6e', accent2: '#c2603d', rug: '#c9a77f', metal: '#a8864f',
    metalRough: 0.3, metalMetal: 0.9, headboard: '#c4ab8c', lampShade: '#efe2cc',
  },
  lux: {
    name: 'יוקרה כהה', wall: '#5c5650', ceiling: '#e9e5df', trim: '#4a4540', livingFloor: ['granite', '#5b5753', '#2e2c2a', 1.2], bedFloor: ['walnut', '#9c7a5c'],
    basementFloor: '#8a6446', wood: '#5d4230', woodDark: '#2e221a', cabinet: '#2d2b29', counter: '#ece9e4', sofa: '#3b4a45',
    sofaDark: '#2a2a2c', bedding: '#ebe6dd', throw: '#7a5c3a', accent: '#1f3b36', accent2: '#b08a4a', rug: '#6f665c', metal: '#b8955a',
    metalRough: 0.25, metalMetal: 1.0, headboard: '#3e4846', lampShade: '#e8dcc6',
  },
};
let styleKey = 'modern';

// ---------------------------------------------------------------- חומרים (משותפים, מתעדכנים לפי סגנון ושעה)
const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  wall: std({ roughness: 0.9 }), ceiling: std({ roughness: 0.95 }), trim: std({ roughness: 0.45 }), cut: std({ color: 0x2b2b2d, roughness: 0.9 }),
  floorLiving: std({ roughness: 0.2, envMapIntensity: 1.0 }), floorBed: std({ roughness: 0.45 }), floorBasement: std({ roughness: 0.45 }),
  bathFloor: std({ roughness: 0.3 }), bathWall: std({ roughness: 0.25 }), facade: std({ roughness: 0.85 }), concrete: std({ color: 0xa9a49b, roughness: 0.9 }),
  pavers: std({ roughness: 0.85 }), deck: std({ roughness: 0.7 }), grass: std({ color: 0x5f8a3e, roughness: 1 }), gravel: std({ color: 0x8c877e, roughness: 1 }),
  wood: std({ roughness: 0.55 }), woodDark: std({ roughness: 0.5 }), cabinet: std({ roughness: 0.35 }), counter: std({ roughness: 0.15 }),
  sofa: std({ roughness: 1 }), sofaDark: std({ roughness: 1 }), bedding: std({ roughness: 1 }), throw: std({ roughness: 1 }), accent: std({ roughness: 1 }),
  accent2: std({ roughness: 1 }), rug: std({ roughness: 1 }), headboard: std({ roughness: 1 }), metal: std({}), chrome: std({ color: 0xdedede, roughness: 0.1, metalness: 1 }),
  ceramic: std({ color: 0xf6f5f2, roughness: 0.12 }), mirror: std({ color: 0xdfe4e8, roughness: 0.02, metalness: 1, envMapIntensity: 1.6 }),
  glass: std({ color: 0xe3eeef, roughness: 0.02, metalness: 0.15, transparent: true, opacity: 0.12, depthWrite: false, envMapIntensity: 1.8, side: THREE.DoubleSide }),
  drinkGlass: std({ color: 0xffffff, roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.25, depthWrite: false, envMapIntensity: 2 }),
  frame: std({ color: 0x2a2c2f, roughness: 0.35, metalness: 0.6 }), screen: std({ color: 0x070708, roughness: 0.12, metalness: 0.3 }),
  leaf: std({ color: 0x4d7a3a, roughness: 0.85 }), leafDark: std({ color: 0x35582c, roughness: 0.85 }), olive: std({ color: 0x7e8d62, roughness: 0.85 }),
  trunk: std({ color: 0x6b5038, roughness: 1 }), pot: std({ color: 0xd8cfc2, roughness: 0.75 }), potDark: std({ color: 0x47403a, roughness: 0.7 }),
  soil: std({ color: 0x5a4636, roughness: 1 }), plate: std({ color: 0xfbfaf7, roughness: 0.08 }), fruitR: std({ color: 0xb8352a, roughness: 0.4 }),
  fruitY: std({ color: 0xe9c43c, roughness: 0.45 }), fruitG: std({ color: 0x8fb04a, roughness: 0.45 }), paper: std({ color: 0xece6da, roughness: 0.9 }),
  bookA: std({ color: 0x9b4a32, roughness: 0.8 }), bookB: std({ color: 0x3d5a6b, roughness: 0.8 }), bookC: std({ color: 0xd8cbb2, roughness: 0.8 }),
  lampShade: std({ roughness: 0.9, emissive: 0xffd7a0, emissiveIntensity: 0 }), bulb: std({ color: 0xfff3dd, emissive: 0xffe2b0, emissiveIntensity: 0 }),
  downlight: std({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 0.4 }), led: std({ color: 0xffffff, emissive: 0xffe6c4, emissiveIntensity: 0 }),
  teak: std({ roughness: 0.65 }), cushion: std({ roughness: 1 }), kids1: std({ color: 0xe0b45c, roughness: 0.8 }), kids2: std({ color: 0x7fa9bf, roughness: 0.8 }),
  kids3: std({ color: 0xd08a78, roughness: 0.8 }), hedge: std({ color: 0x3c5c2e, roughness: 1 }), towel: std({ roughness: 1 }),
};
const PHOTO_M = [];

function applyStyle(key) {
  styleKey = key;
  const S = STYLES[key];
  const set = (m, col, map) => { m.color.set(col); if (map !== undefined) { m.map = map; m.needsUpdate = true; } };
  const cache = applyStyle.cache || (applyStyle.cache = {});
  const C = cache[key] || (cache[key] = {
    wall: tintTex(IMG.plaster, S.wall, 0.22),
    living: S.livingFloor[0] === 'granite' ? porcelainTex(IMG.granite, S.livingFloor[1], S.livingFloor[2], 7, S.livingFloor[3])
      : porcelainTex(S.livingFloor[0] === 'stone' ? IMG.stone : IMG.plaster, S.livingFloor[1], S.livingFloor[2], 5, S.livingFloor[3]),
    bed: S.bedFloor[0] === 'herring' ? tintTex(IMG.herring, S.bedFloor[1], 0.9) : plankTex(S.bedFloor[0] === 'walnut' ? IMG.walnut : IMG.oak, S.bedFloor[1], 9),
    basement: tintTex(IMG.herring, S.basementFloor, 0.9),
    wood: tintTex(IMG.oak, S.wood, 0.7), woodDark: tintTex(IMG.walnut, S.woodDark, 0.7),
  });
  if (C.basement) C.basement.repeat.set(SPAN / 3.4, SPAN / 3.4);
  if (S.bedFloor[0] === 'herring' && C.bed) C.bed.repeat.set(SPAN / 3.4, SPAN / 3.4);
  const tinted = (k, img, col) => (C[k + col] = C[k + col] || tintTex(img, col));
  // הקיר: טיח עדין בצבע הסגנון
  set(M.wall, '#ffffff', C.wall); set(M.ceiling, S.ceiling); set(M.trim, S.trim);
  set(M.floorLiving, '#ffffff', C.living); set(M.floorBed, '#ffffff', C.bed); set(M.floorBasement, '#ffffff', C.basement);
  set(M.wood, '#ffffff', C.wood); set(M.woodDark, '#ffffff', C.woodDark); set(M.teak, '#ffffff', C.woodDark);
  set(M.cabinet, S.cabinet); set(M.counter, S.counter);
  set(M.sofa, '#ffffff', tinted('l', IMG.linen, S.sofa)); set(M.sofaDark, '#ffffff', tinted('l', IMG.linen, S.sofaDark));
  set(M.bedding, '#ffffff', tinted('l', IMG.linen, S.bedding)); set(M.cushion, '#ffffff', tinted('l', IMG.linen, S.bedding)); set(M.towel, '#ffffff', tinted('l', IMG.linen, S.bedding));
  set(M.throw, '#ffffff', tinted('v', IMG.velvet, S.throw)); set(M.accent, '#ffffff', tinted('v', IMG.velvet, S.accent));
  set(M.accent2, '#ffffff', tinted('v', IMG.velvet, S.accent2)); set(M.headboard, '#ffffff', tinted('v', IMG.velvet, S.headboard));
  set(M.rug, '#ffffff', tinted('r', IMG.rug, S.rug));
  M.metal.color.set(S.metal); M.metal.roughness = S.metalRough; M.metal.metalness = S.metalMetal;
  M.lampShade.color.set(S.lampShade);
  renderer.shadowMap.needsUpdate = true;
  document.dispatchEvent(new CustomEvent('tourstyle', { detail: key }));
}

// ---------------------------------------------------------------- קבוצות
const G = {
  ground: new THREE.Group(), base: new THREE.Group(), out: new THREE.Group(), ceilG: new THREE.Group(), ceilB: new THREE.Group(),
  roof: new THREE.Group(), slab: new THREE.Group(), labels: new THREE.Group(), lights: new THREE.Group(),
};
Object.values(G).forEach((g) => scene.add(g));
const colliders = [];
const wallMeshes = [];
const wallBoxes = [];

function worldUV(geo) {
  const p = geo.attributes.position, nm = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(nm.getX(i)), ay = Math.abs(nm.getY(i));
    let u, v;
    if (ay > 0.5) { u = x; v = -z; } else if (ax > 0.5) { u = z * -Math.sign(nm.getX(i)); v = y; } else { u = x * Math.sign(nm.getZ(i)); v = y; }
    uv.setXY(i, u / SPAN, v / SPAN);
  }
}
function bx(x1, x2, y1, y2, z1, z2, mat, parent, o = {}) {
  if (x2 - x1 < 1e-4 || y2 - y1 < 1e-4 || z2 - z1 < 1e-4) return null;
  const geo = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  geo.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  worldUV(geo);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast !== false && !mat.transparent; m.receiveShadow = true; m.matrixAutoUpdate = false;
  parent.add(m);
  if (o.wall) { m.userData.wall = true; wallMeshes.push(m); wallBoxes.push({ x1, x2, y1, y2, z1, z2 }); }
  if (o.keep) m.userData.keep = true;
  if (o.collide) colliders.push({ x1, x2, y1, y2, z1, z2 });
  return m;
}
const floorQ = (x1, x2, z1, z2, y, mat, parent) => bx(x1, x2, y - 0.02, y, z1, z2, mat, parent, { cast: false });
const ceilQ = (x1, x2, z1, z2, y, parent) => bx(x1, x2, y, y + 0.02, z1, z2, M.ceiling, parent, { cast: false });

// ---------------------------------------------------------------- קירות ופתחים מתוך layout.json
const FACEMAT = { facade: () => M.facade, p_bathwall: () => M.bathWall, concrete: () => M.concrete };
function cladding(x1, x2, z1, z2, h1, h2, faces, parent) {
  // חיפוי דק על פאה אחת (אבן, אריחים): שכבה של 3 מ"מ, כדי שכל גוף יהיה בחומר אחד
  for (const [side, key] of Object.entries(faces || {})) {
    const mat = FACEMAT[key] && FACEMAT[key](); if (!mat) continue;
    const t = 0.003;
    if (side === 'n') bx(x1, x2, h1, h2, z1 - t, z1, mat, parent, { cast: false });
    if (side === 's') bx(x1, x2, h1, h2, z2, z2 + t, mat, parent, { cast: false });
    if (side === 'w') bx(x1 - t, x1, h1, h2, z1, z2, mat, parent, { cast: false });
    if (side === 'e') bx(x2, x2 + t, h1, h2, z1, z2, mat, parent, { cast: false });
  }
}
function buildWall(w) {
  const lvl = w.lvl, fl = lvl === 'B' ? BY : GY, parent = lvl === 'B' ? G.base : G.ground;
  const [x1, x2, z1, z2] = w.r, y1 = w.h1, y2 = w.h2;
  const axis = (x2 - x1) >= (z2 - z1) ? 'x' : 'z';
  const L1 = axis === 'x' ? x1 : z1, L2 = axis === 'x' ? x2 : z2;
  const seg = (a, b, ya, yb) => {
    if (b - a < 1e-4 || yb - ya < 1e-4) return;
    const [sx1, sx2, sz1, sz2] = axis === 'x' ? [a, b, z1, z2] : [x1, x2, a, b];
    bx(sx1, sx2, ya, yb, sz1, sz2, M.wall, parent, { wall: true, collide: true });
    bx(sx1, sx2, yb, yb + 0.004, sz1, sz2, M.cut, parent, { cast: false });
    cladding(sx1, sx2, sz1, sz2, ya, yb, w.faces, parent);
  };
  let cur = L1;
  for (const op of [...w.ops].sort((p, q) => p.a - q.a)) {
    seg(cur, op.a, y1, y2); seg(op.a, op.b, y1, fl + (op.sill || 0)); seg(op.a, op.b, fl + op.head, y2);
    opening(op, axis, x1, x2, z1, z2, fl, parent, lvl);
    cur = op.b;
  }
  seg(cur, L2, y1, y2);
}
function opening(o, axis, x1, x2, z1, z2, fl, parent, lvl) {
  const t0 = axis === 'x' ? z1 : x1, t1 = axis === 'x' ? z2 : x2, tm = (t0 + t1) / 2;
  const A = o.a, Bb = o.b, ys = fl + (o.sill || 0), yh = fl + o.head;
  const put = (a, b, ya, yb, c, d, mat, opt = {}) => axis === 'x' ? bx(a, b, ya, yb, c, d, mat, parent, opt) : bx(c, d, ya, yb, a, b, mat, parent, opt);
  const k = o.kind;
  if (['door', 'entry', 'mamad', 'arch', 'vit'].includes(k)) {
    const fm = o.floor === 'p_bath' ? M.bathFloor : o.floor === 'p_bedroom' ? M.floorBed : lvl === 'B' ? M.floorBasement : M.floorLiving;
    put(A, Bb, fl - 0.02, fl, t0, t1, fm, { cast: false });
  }
  if (k === 'arch') return;
  if (['door', 'entry', 'mamad'].includes(k)) {
    const fr = k === 'mamad' ? M.chrome : k === 'entry' ? M.woodDark : M.trim;
    put(A, A + 0.03, ys, yh, t0 - 0.01, t1 + 0.01, fr); put(Bb - 0.03, Bb, ys, yh, t0 - 0.01, t1 + 0.01, fr); put(A, Bb, yh - 0.03, yh, t0 - 0.01, t1 + 0.01, fr);
    const w = Bb - A - 0.06, th = k === 'door' ? 0.045 : 0.07;
    const hinge = o.hinge === 'b' ? Bb - 0.03 : A + 0.03;
    const la = o.hinge === 'b' ? hinge - th : hinge;
    const face = o.swing > 0 ? t1 : t0;
    const ta = o.swing > 0 ? face : face - w, tb = o.swing > 0 ? face + w : face;
    put(la, la + th, ys + 0.008, yh - 0.035, ta, tb, k === 'mamad' ? M.chrome : k === 'entry' ? M.woodDark : M.trim);
    const hf = o.swing > 0 ? tb : ta, h1 = o.swing > 0 ? hf - 0.2 : hf + 0.06, h2 = o.swing > 0 ? hf - 0.06 : hf + 0.2;
    put(la - 0.035, la + th + 0.035, ys + 1.02, ys + 1.045, h1, h2, M.metal);
    return;
  }
  if (k === 'win' || k === 'mwin') {
    const fw = k === 'mwin' ? 0.07 : 0.05, fd = k === 'mwin' ? 0.05 : 0.035, fm = k === 'mwin' ? M.chrome : M.frame;
    put(A, Bb, ys, ys + fw, tm - fd, tm + fd, fm); put(A, Bb, yh - fw, yh, tm - fd, tm + fd, fm);
    put(A, A + fw, ys, yh, tm - fd, tm + fd, fm); put(Bb - fw, Bb, ys, yh, tm - fd, tm + fd, fm);
    if (Bb - A > 1.25) put((A + Bb) / 2 - 0.025, (A + Bb) / 2 + 0.025, ys, yh, tm - fd, tm + fd, fm);
    put(A + fw, Bb - fw, ys + fw, yh - fw, tm - 0.006, tm + 0.006, M.glass, { cast: false, keep: true });
    const inp = o.inside === 'p';
    put(A - 0.03, Bb + 0.03, ys - 0.03, ys, inp ? tm : t0 - 0.03, inp ? t1 + 0.03 : tm, M.counter);
    return;
  }
  if (k === 'vit') {
    put(A, Bb, ys, ys + 0.025, tm - 0.07, tm + 0.07, M.frame); put(A, Bb, yh - 0.06, yh, tm - 0.07, tm + 0.07, M.frame);
    put(A, A + 0.04, ys, yh, tm - 0.07, tm + 0.07, M.frame); put(Bb - 0.04, Bb, ys, yh, tm - 0.07, tm + 0.07, M.frame);
    for (const [pa, pb, lane] of o.panels) {
      const c = tm + (lane ? 0.035 : -0.035), f = 0.045;
      put(pa, pa + f, ys + 0.025, yh - 0.06, c - 0.025, c + 0.025, M.frame); put(pb - f, pb, ys + 0.025, yh - 0.06, c - 0.025, c + 0.025, M.frame);
      put(pa, pb, ys + 0.025, ys + 0.09, c - 0.025, c + 0.025, M.frame); put(pa, pb, yh - 0.12, yh - 0.06, c - 0.025, c + 0.025, M.frame);
      put(pa + f, pb - f, ys + 0.09, yh - 0.12, c - 0.012, c + 0.012, M.glass, { cast: false, keep: true });
      if (axis === 'x') colliders.push({ x1: pa, x2: pb, y1: ys, y2: yh, z1: t0, z2: t1 }); else colliders.push({ x1: t0, x2: t1, y1: ys, y2: yh, z1: pa, z2: pb });
    }
  }
}
function rail(x1, x2, z1, z2, y, parent) {
  bx(x1, x2, y, y + 1.01, z1, z2, M.glass, parent, { cast: false, keep: true });
  bx(x1 - 0.005, x2 + 0.005, y + 1.01, y + 1.05, z1 - 0.015, z2 + 0.015, M.metal, parent);
  colliders.push({ x1: x1 - 0.03, x2: x2 + 0.03, y1: y, y2: y + 1.05, z1: z1 - 0.03, z2: z2 + 0.03 });
}

// ---------------------------------------------------------------- בנייה: קירות, רצפות, מדרגות, חוץ
function buildArchitecture() {
  LAYOUT.walls.forEach(buildWall);
  LAYOUT.rails.forEach((r) => rail(r.r[0], r.r[1], r.r[2], r.r[3], r.h, r.bk.startsWith('OUT') ? G.out : G.ground));
  const FM = { p_living: M.floorLiving, p_bedroom: M.floorBed, p_bath: M.bathFloor, p_basement: M.floorBasement };
  for (const [x1, x2, z1, z2, m] of LAYOUT.floors.G) { floorQ(x1, x2, z1, z2, GY, FM[m], G.ground); ceilQ(x1, x2, z1, z2, NET, G.ceilG); }
  for (const [x1, x2, z1, z2, m] of LAYOUT.floors.B) { floorQ(x1, x2, z1, z2, BY, FM[m], G.base); ceilQ(x1, x2, z1, z2, BY + NET, G.ceilB); }
  ceilQ(0, 3.22, 7.35, 9.35, NET, G.ceilG);
  // פאנלים בתחתית הקירות (8 ס"מ), רק איפה שיש קיר בפועל
  const wallAt = (fl, x, z) => wallBoxes.some((b) => b.y1 <= fl + 0.04 && b.y2 >= fl + 0.04 && x >= b.x1 - 1e-3 && x <= b.x2 + 1e-3 && z >= b.z1 - 1e-3 && z <= b.z2 + 1e-3);
  const skirt = (lvl, x1, x2, z1, z2) => {
    const fl = lvl === 'B' ? BY : GY, par = lvl === 'B' ? G.base : G.ground, t = 0.012, h = 0.08, st = 0.05;
    for (const edge of ['n', 's', 'w', 'e']) {
      const horiz = edge === 'n' || edge === 's';
      const a0 = horiz ? x1 : z1, a1 = horiz ? x2 : z2, n = Math.max(1, Math.floor((a1 - a0) / st));
      const fixed = edge === 'n' ? z1 : edge === 's' ? z2 : edge === 'w' ? x1 : x2;
      const probe = fixed + (edge === 'n' || edge === 'w' ? -0.03 : 0.03);
      let start = null;
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        const ok = i < n && (horiz ? wallAt(fl, a, probe) : wallAt(fl, probe, a));
        if (ok && start === null) start = a;
        if ((!ok || i === n) && start !== null) {
          const e = ok ? a1 : a;
          if (e - start > 0.04) {
            if (edge === 'n') bx(start, e, fl, fl + h, z1, z1 + t, M.trim, par, { cast: false });
            if (edge === 's') bx(start, e, fl, fl + h, z2 - t, z2, M.trim, par, { cast: false });
            if (edge === 'w') bx(x1, x1 + t, fl, fl + h, start, e, M.trim, par, { cast: false });
            if (edge === 'e') bx(x2 - t, x2, fl, fl + h, start, e, M.trim, par, { cast: false });
          }
          start = null;
        }
      }
    }
  };
  for (const [x1, x2, z1, z2, m] of LAYOUT.floors.G) if (m !== 'p_bath') skirt('G', x1, x2, z1, z2);
  for (const [x1, x2, z1, z2, m] of LAYOUT.floors.B) if (m !== 'p_bath') skirt('B', x1, x2, z1, z2);

  // לובי הבניין וכיס הכניסה
  floorQ(-3.5, 1.28, 9.45, 11.13, GY, M.pavers, G.ground);
  bx(-3.75, -0.25, -0.3, GROSS, 9.20, 9.45, M.facade, G.ground, { collide: true });
  bx(-3.75, -0.25, -0.3, GROSS, 11.13, 11.38, M.facade, G.ground, { collide: true });
  bx(-3.75, -3.5, -0.3, GROSS, 9.45, 11.13, M.facade, G.ground, { collide: true });
  ceilQ(-3.5, 1.28, 9.45, 11.13, 3.0, G.ceilG);
  bx(-3.5, 1.28, 3.02, GROSS, 9.45, 11.13, M.ceiling, G.ceilG, { cast: false });
  bx(10.06, 10.21, GY, NET, 16.14, 16.29, M.metal, G.ground, { collide: true });          // עמוד RHS
  floorQ(6.26, 10.65, -1.10, 3.15, BY, M.pavers, G.base);                                  // חצר אנגלית
  floorQ(10.71, 11.76, 4.28, 10.56, BY, M.gravel, G.base);                                 // חצר החלון
  // מדרגות U: 5 שלבים, 7 מדרגות פנייה, 9 שלבים (22 רומים)
  const gs = G.base;
  for (let i = 1; i <= 5; i++) {
    const xa = 2.27 - i * 0.264, xb = 2.27 - (i - 1) * 0.264, top = GY - i * RISER;
    bx(xa, xb, BY, top - 0.04, 8.40, 9.35, M.trim, gs); bx(xa - 0.02, xb, top - 0.04, top, 8.40, 9.35, M.wood, gs);
  }
  const pv = [0.95, 8.35];
  const rectRay = (ang) => {
    const dx = -Math.sin(ang * Math.PI / 180), dz = Math.cos(ang * Math.PI / 180), ts = [];
    if (dx < -1e-9) ts.push((0 - pv[0]) / dx); if (dz > 1e-9) ts.push((9.35 - pv[1]) / dz); if (dz < -1e-9) ts.push((7.35 - pv[1]) / dz);
    const t = Math.min(...ts.filter((v) => v > 0)); return [pv[0] + dx * t, pv[1] + dz * t];
  };
  const cornerA = Math.atan2(0.95, 1.0) * 180 / Math.PI;
  const corners = [[0, 9.35, cornerA], [0, 7.35, 180 - cornerA]];
  for (let k = 1; k <= 7; k++) {
    const a0 = (k - 1) * 180 / 7, a1 = k * 180 / 7, pts = [pv, rectRay(a0)];
    corners.forEach(([cx, cz, ca]) => { if (a0 < ca && ca < a1) pts.push([cx, cz]); });
    pts.push(rectRay(a1));
    const top = GY - (5 + k) * RISER;
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((p) => sh.lineTo(p[0], p[1]));
    const mk = (h0, h1, mat) => {
      const g = new THREE.ExtrudeGeometry(sh, { depth: h1 - h0, bevelEnabled: false });
      g.rotateX(Math.PI / 2); g.translate(0, h1, 0);   // shape y -> z, ההבלטה כלפי מטה מ-h1
      g.computeVertexNormals(); worldUV(g);
      const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; m.matrixAutoUpdate = false; gs.add(m);
    };
    mk(BY, top - 0.04, M.trim); mk(top - 0.04, top, M.wood);
  }
  for (let j = 1; j <= 9; j++) {
    const xa = 0.95 + (j - 1) * 0.252, xb = 0.95 + j * 0.252, top = GY - (12 + j) * RISER;
    bx(xa, xb, BY, top - 0.04, 7.35, 8.30, M.trim, gs); bx(xa, xb + 0.02, top - 0.04, top, 7.35, 8.30, M.wood, gs);
  }
  bx(0.95, 3.22, BY, GY, 8.30, 8.40, M.wall, gs, { wall: true, collide: true });
  bx(2.27, 3.22, -SLAB, GY - 0.021, 8.40, 9.35, M.concrete, G.slab);
  // רצפת הכניסה מעל המרתף (עם פתחים) ותקרה עליונה עם שתי קומות מעל
  [[-0.25, 6.26, -0.62, 7.35], [6.26, 10.71, 3.15, 7.35], [-0.25, 0.0, 7.35, 9.45], [3.22, 10.71, 7.35, 11.99], [-0.25, 3.22, 9.35, 11.99],
    [-0.25, 10.71, 11.99, 16.69], [10.71, 12.01, 3.15, 4.28], [10.71, 12.01, 10.56, 16.69], [11.76, 12.01, 4.28, 10.56]]
    .forEach(([a, b, c, d]) => bx(a, b, -SLAB, GY - 0.021, c, d, M.concrete, G.slab));
  [[-0.25, 6.26, -0.25, 7.35], [6.26, 10.71, 3.15, 7.35], [-0.25, 10.71, 7.35, 16.69], [-3.75, -0.25, 9.20, 11.38]].forEach(([a, b, c, d]) => {
    bx(a, b, GROSS, GROSS + SLAB, c, d, M.concrete, G.roof);
    bx(a, b, GROSS + SLAB, GROSS + SLAB + 6.2, c, d, M.facade, G.roof);
  });
  for (const hh of [5.0, 8.1]) {
    bx(-0.25, 10.71, hh - 0.75, hh - 0.6, 16.69, 18.10, M.concrete, G.roof);
    bx(-0.25, 10.71, hh - 0.6, hh + 0.45, 18.08, 18.10, M.glass, G.roof, { cast: false, keep: true });
    bx(0.2, 10.3, hh - 0.4, hh + 1.6, 16.69, 16.72, M.screen, G.roof, { cast: false });
  }
  // חוץ: ריצוף, דשא, דק, אדניות, סבכה, גדר וגדר חיה, פרגולה
  const o = G.out;
  [[-40, 50, -40, -1.35], [-40, -3.75, -1.35, 60], [13.71, 50, -1.35, 60], [-3.75, 13.71, 22.10, 60], [10.90, 13.71, -1.35, 1.06],
    [-3.75, 6.01, -1.35, -0.62], [-3.75, 2.31, -0.62, 0.95], [-3.75, -0.25, 0.95, 9.20], [-3.75, -0.25, 11.38, 22.10]]
    .forEach(([a, b, c, d]) => bx(a, b, -0.4, -0.03, c, d, M.pavers, o, { cast: false }));
  bx(-40, 50, BY - 0.35, BY - 0.05, -40, 60, M.concrete, scene, { cast: false });
  bx(0.97, 10.71, -0.3, GY + 0.01, 16.69, 19.69, M.deck, o);
  [[-0.25, 13.71, 19.69, 22.10], [10.71, 13.71, 16.69, 19.69], [10.71, 13.71, 10.56, 16.69], [11.76, 13.71, 4.28, 10.56], [10.71, 13.71, 1.06, 4.28]]
    .forEach(([a, b, c, d]) => bx(a, b, -0.4, GY + 0.005, c, d, M.grass, o, { cast: false }));
  for (const z of [17.0, 17.9, 18.8]) {
    bx(-0.25, 0.92, -0.3, 0.45, z, z + 0.8, M.concrete, o, { collide: true }); bx(-0.2, 0.87, 0.45, 0.47, z + 0.05, z + 0.75, M.soil, o);
    place(plant(0.6, M.leaf, M.pot, Math.round(z * 10)), o, 0.33, 0.25, z + 0.4, 0, false);
  }
  for (let z = 11.0; z < 16.0; z += 0.75) floorQ(11.9, 12.6, z, z + 0.45, GY + 0.015, M.pavers, o);
  for (let i = 0; i < 34; i++) bx(10.73 + i * 0.03, 10.738 + i * 0.03, -0.03, 0, 4.28, 10.56, M.metal, o);
  for (const z of [4.28, 5.85, 7.42, 8.99, 10.53]) bx(10.71, 11.76, -0.03, 0, z, z + 0.03, M.metal, o);
  [[-0.27, -0.23, 16.69, 22.10], [-0.25, 13.71, 22.08, 22.12], [13.69, 13.73, 1.06, 22.10], [10.90, 13.71, 1.04, 1.08]]
    .forEach(([a, b, c, d]) => bx(a, b, 0, 1.05, c, d, M.metal, o, { collide: true }));
  [[-0.85, -0.27, 16.69, 22.70], [-0.85, 14.31, 22.12, 22.70], [13.73, 14.31, 1.06, 22.70]]
    .forEach(([a, b, c, d]) => softBox(b - a, 1.5, d - c, (a + b) / 2, 0, (c + d) / 2, 0, M.hedge, o, 0.25, 0.02));
  for (const x of [1.05, 5.80, 10.55]) bx(x - 0.07, x + 0.07, 0, 3.55, 19.50, 19.64, M.metal, G.roof);
  bx(0.97, 10.71, 3.40, 3.62, 19.50, 19.64, M.metal, G.roof);
  const slat = new THREE.BoxGeometry(0.05, 0.14, 2.95);
  const inst = new THREE.InstancedMesh(slat, M.metal, 45), mtx = new THREE.Matrix4();
  for (let i = 0; i < 45; i++) { mtx.makeTranslation(1.025 + i * 0.216, 3.69, 18.165); inst.setMatrixAt(i, mtx); }
  inst.castShadow = true; G.roof.add(inst);
}

// ---------------------------------------------------------------- רהיטים: גאומטריה רכה ובנאים
function puff(geo, amt) {
  // "נפיחות": מרכז הפאות העליונה והתחתונה נדחף החוצה, כמו כרית ממולאת
  geo.computeBoundingBox(); const b = geo.boundingBox, c = new THREE.Vector3(); b.getCenter(c);
  const s = new THREE.Vector3(); b.getSize(s); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(c);
    const nx = v.x / (s.x / 2), ny = v.y / (s.y / 2), nz = v.z / (s.z / 2);
    const k = (1 - Math.min(1, nx * nx)) * (1 - Math.min(1, nz * nz));
    v.y += Math.sign(ny) * amt * k * s.y * 0.5;
    const side = 1 - 0.25 * amt * (1 - Math.min(1, ny * ny));
    p.setXYZ(i, v.x * side + c.x, v.y + c.y, v.z * side + c.z);
  }
  geo.computeVertexNormals();
  return geo;
}
function softGeo(w, h, d, r, amt) {
  const g = new RoundedBoxGeometry(w, h, d, MOBILE ? 3 : 4, Math.min(r, Math.min(w, h, d) * 0.49));
  return amt ? puff(g, amt) : g;
}
function softBox(w, h, d, x, y, z, rot, mat, parent, r = 0.06, amt = 0.15, tilt = 0) {
  const m = new THREE.Mesh(softGeo(w, h, d, r, amt), mat);
  m.position.set(x, y + h / 2, z); m.rotation.set(tilt, rot, 0, 'YXZ'); m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
const grp = () => new THREE.Group();
function B(g, w, h, d, x, y, z, mat, cast = true) {
  const geo = new THREE.BoxGeometry(w, h, d); worldUV(geo);
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast && !mat.transparent; m.receiveShadow = true; g.add(m); return m;
}
function S(g, w, h, d, x, y, z, mat, r = 0.05, amt = 0.12, tilt = 0) {
  const m = new THREE.Mesh(softGeo(w, h, d, r, amt), mat); m.position.set(x, y, z); m.rotation.x = tilt; m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function C(g, rt, rb, h, x, y, z, mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, MOBILE ? Math.max(8, seg >> 1) : seg), mat);
  m.position.set(x, y, z); m.castShadow = !mat.transparent; m.receiveShadow = true; g.add(m); return m;
}
function placePlant(g, parent, x, y, z) { place(g, parent, x, y, z, 0, false); colliders.push({ x1: x - 0.2, x2: x + 0.2, y1: y, y2: y + 0.6, z1: z - 0.2, z2: z + 0.2 }); }
function place(g, parent, x, y, z, rot = 0, collide = true) {
  g.position.set(x, y, z); g.rotation.y = rot; parent.add(g); g.updateMatrixWorld(true);
  if (collide) { const bb = new THREE.Box3().setFromObject(g); colliders.push({ x1: bb.min.x, x2: bb.max.x, y1: bb.min.y, y2: bb.max.y, z1: bb.min.z, z2: bb.max.z }); }
  return g;
}
const LAMPS = [];
// חזית = +z. rot=R90 → חזית למזרח, -R90 → למערב, PI → לצפון.
function bed(w, l) {
  const g = grp();
  B(g, w + 0.08, 0.28, l + 0.04, 0, 0.14, 0, M.wood);
  S(g, w, 0.24, l - 0.04, 0, 0.40, 0.01, M.bedding, 0.08, 0.05);
  S(g, w + 0.10, 0.10, l * 0.70, 0, 0.57, l * 0.16, M.bedding, 0.05, 0.5);
  S(g, w + 0.10, 0.08, 0.28, 0, 0.58, -l * 0.20, M.bedding, 0.04, 0.5);
  S(g, w + 0.16, 0.05, 0.46, 0, 0.645, l * 0.36, M.throw, 0.025, 0.4);
  const pw = Math.min(0.62, (w - 0.08) / 2);
  for (const lx of [-w / 4, w / 4]) {
    S(g, pw, 0.17, 0.42, lx, 0.66, -l / 2 + 0.30, M.bedding, 0.08, 0.9, -0.25);
    S(g, pw * 0.8, 0.15, 0.34, lx, 0.70, -l / 2 + 0.52, lx < 0 ? M.throw : M.accent, 0.07, 0.9, -0.4);
  }
  S(g, w + 0.32, 1.20, 0.10, 0, 0.60, -l / 2 - 0.06, M.headboard, 0.04, 0.12);
  return g;
}
function nightstand(lit = true) {
  const g = grp();
  B(g, 0.5, 0.48, 0.4, 0, 0.30, 0, M.woodDark); B(g, 0.46, 0.012, 0.36, 0, 0.30, 0.205, M.metal, false);
  C(g, 0.05, 0.07, 0.30, 0.1, 0.69, 0, M.ceramic, 20);
  const sh = C(g, 0.12, 0.16, 0.22, 0.1, 0.95, 0, M.lampShade, 24); sh.castShadow = false;
  if (lit) LAMPS.push({ g, x: 0.1, y: 0.92, z: 0 });
  return g;
}
function sofa(w, d = 0.95, mat = M.sofa, seats = null) {
  const g = grp(), n = seats || Math.max(2, Math.round((w - 0.4) / 0.85)), sw = (w - 0.36) / n;
  B(g, w, 0.08, d - 0.08, 0, 0.09, 0, M.metal);
  S(g, w, 0.32, d, 0, 0.28, 0, mat, 0.06, 0.05);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.18 + sw * (i + 0.5);
    S(g, sw - 0.02, 0.16, d - 0.26, x, 0.51, 0.1, mat, 0.07, 0.5);
    S(g, sw - 0.04, 0.46, 0.2, x, 0.78, -d / 2 + 0.22, mat, 0.08, 0.5, -0.12);
  }
  S(g, 0.18, 0.58, d, -w / 2 + 0.09, 0.40, 0, mat, 0.07, 0.15); S(g, 0.18, 0.58, d, w / 2 - 0.09, 0.40, 0, mat, 0.07, 0.15);
  S(g, 0.42, 0.40, 0.14, -w / 2 + 0.50, 0.80, -d / 2 + 0.36, M.accent, 0.07, 0.9, -0.2);
  S(g, 0.40, 0.38, 0.14, w / 2 - 0.50, 0.80, -d / 2 + 0.36, M.accent2, 0.07, 0.9, -0.25);
  return g;
}
function armchair(mat = M.accent) {
  const g = grp();
  S(g, 0.78, 0.30, 0.78, 0, 0.32, 0, mat, 0.07, 0.08); S(g, 0.60, 0.14, 0.56, 0, 0.53, 0.06, mat, 0.06, 0.5);
  S(g, 0.78, 0.48, 0.16, 0, 0.72, -0.31, mat, 0.07, 0.3, -0.1);
  S(g, 0.12, 0.50, 0.78, -0.33, 0.45, 0, mat, 0.05, 0.1); S(g, 0.12, 0.50, 0.78, 0.33, 0.45, 0, mat, 0.05, 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) C(g, 0.018, 0.012, 0.17, sx * 0.32, 0.085, sz * 0.32, M.wood, 8);
  return g;
}
function coffeeTable(r = 0.5, h = 0.38) {
  const g = grp();
  C(g, r, r, 0.035, 0, h, 0, M.counter, 40); C(g, r * 0.35, r * 0.45, h - 0.02, 0, (h - 0.02) / 2, 0, M.woodDark, 24);
  C(g, 0.07, 0.05, 0.16, r * 0.3, h + 0.1, 0.05, M.ceramic, 16);
  B(g, 0.24, 0.04, 0.18, -r * 0.25, h + 0.04, -0.06, M.bookB); B(g, 0.22, 0.03, 0.16, -r * 0.25, h + 0.075, -0.06, M.bookC);
  return g;
}
function chair(mat = M.sofa) {
  const g = grp();
  S(g, 0.46, 0.07, 0.46, 0, 0.47, 0, mat, 0.03, 0.3); S(g, 0.44, 0.42, 0.06, 0, 0.74, -0.21, mat, 0.03, 0.2, -0.08);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) C(g, 0.016, 0.014, 0.45, x, 0.225, z, M.wood, 8);
  return g;
}
function diningTable(w, d, setTable = true) {
  const g = grp();
  B(g, w, 0.045, d, 0, 0.735, 0, M.wood);
  B(g, 0.08, 0.71, d - 0.3, -w / 2 + 0.35, 0.355, 0, M.metal); B(g, 0.08, 0.71, d - 0.3, w / 2 - 0.35, 0.355, 0, M.metal);
  if (!setTable) return g;
  // שולחן ערוך: ראנר, פלייסמטים, צלחות, כוסות, סכו"ם ואגרטל פרחים
  B(g, w * 0.8, 0.003, 0.36, 0, 0.76, 0, M.throw, false);
  for (const dx of [-0.75, 0, 0.75]) for (const side of [-1, 1]) {
    const zz = side * 0.30;
    B(g, 0.42, 0.003, 0.32, dx, 0.759, zz, M.bedding, false);
    C(g, 0.135, 0.11, 0.018, dx, 0.77, zz, M.plate, 32); C(g, 0.10, 0.08, 0.015, dx, 0.785, zz, M.plate, 32);
    C(g, 0.035, 0.03, 0.13, dx + 0.17, 0.825, zz - side * 0.17, M.drinkGlass, 16);
    B(g, 0.015, 0.003, 0.19, dx - 0.17, 0.762, zz, M.chrome, false); B(g, 0.015, 0.003, 0.20, dx + 0.17, 0.762, zz, M.chrome, false);
  }
  C(g, 0.07, 0.05, 0.22, 0, 0.87, 0, M.ceramic, 20);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), i % 2 ? M.paper : M.accent2);
    s.position.set(Math.cos(a) * 0.06, 1.02 + (i % 3) * 0.02, Math.sin(a) * 0.06); g.add(s);
  }
  return g;
}
function pendant(parent, x, z, ceilY, drop = 0.75) {
  const g = grp();
  B(g, 0.006, drop - 0.2, 0.006, 0, ceilY - (drop - 0.2) / 2, 0, M.metal, false);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.lampShade);
  sh.position.y = ceilY - drop + 0.18; g.add(sh);
  const bl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.bulb); bl.position.y = ceilY - drop + 0.16; g.add(bl);
  place(g, parent, x, 0, z, 0, false);
  LAMPS.push({ g, x: 0, y: ceilY - drop + 0.1, z: 0, big: true });
}
function stool() {
  const g = grp();
  S(g, 0.38, 0.07, 0.38, 0, 0.76, 0, M.sofaDark, 0.03, 0.3); C(g, 0.022, 0.022, 0.72, 0, 0.37, 0, M.metal, 8); C(g, 0.18, 0.2, 0.02, 0, 0.01, 0, M.metal, 20);
  return g;
}
function wardrobe(w, h = 2.6, d = 0.6, mat = M.wood) {
  const g = grp(); B(g, w, h, d, 0, h / 2, 0, mat);
  const n = Math.max(1, Math.round(w / 0.55));
  for (let i = 1; i < n; i++) B(g, 0.006, h - 0.1, 0.01, -w / 2 + i * w / n, h / 2, d / 2 + 0.002, M.cut, false);
  for (let i = 0; i < n; i++) B(g, 0.02, 0.5, 0.02, -w / 2 + (i + 0.5) * w / n + (i % 2 ? -1 : 1) * (w / n / 2 - 0.06), 1.1, d / 2 + 0.015, M.metal, false);
  return g;
}
function counter(len, opts = {}) {
  const g = grp();
  B(g, len, 0.1, 0.55, 0, 0.05, -0.02, M.cut); B(g, len, 0.78, 0.62, 0, 0.49, 0, M.cabinet); B(g, len + 0.01, 0.03, 0.65, 0, 0.895, 0.01, M.counter);
  for (let x = -len / 2 + 0.6; x < len / 2; x += 0.6) B(g, 0.005, 0.7, 0.005, x, 0.5, 0.311, M.cut, false);
  if (opts.sink != null) { B(g, 0.7, 0.012, 0.42, opts.sink, 0.906, 0.04, M.metal, false); C(g, 0.015, 0.015, 0.35, opts.sink, 1.08, -0.22, M.metal, 10); B(g, 0.02, 0.02, 0.22, opts.sink, 1.25, -0.12, M.metal); }
  if (opts.cook != null) B(g, 0.8, 0.01, 0.52, opts.cook, 0.915, 0.02, M.screen, false);
  return g;
}
function tallUnit(len, h) {
  const g = grp(); B(g, len, h, 0.62, 0, h / 2, 0, M.cabinet);
  for (let x = -len / 2 + 0.6; x < len / 2; x += 0.6) B(g, 0.005, h - 0.1, 0.005, x, h / 2, 0.311, M.cut, false);
  B(g, 0.6, 0.6, 0.006, len / 2 - 0.9, 1.25, 0.312, M.screen, false); B(g, 0.6, 0.45, 0.006, len / 2 - 0.9, 0.75, 0.312, M.screen, false);
  return g;
}
function island(len, dep) {
  const g = grp();
  B(g, len - 0.06, 0.86, dep - 0.25, 0, 0.43, -0.1, M.woodDark); B(g, len, 0.04, dep, 0, 0.9, 0, M.counter);
  B(g, 0.04, 0.88, dep, -len / 2 + 0.02, 0.44, 0, M.counter); B(g, 0.04, 0.88, dep, len / 2 - 0.02, 0.44, 0, M.counter);
  // פרטים במטבח: קערת פירות, קרש חיתוך, קנקן
  C(g, 0.16, 0.09, 0.08, -0.35, 0.96, -0.05, M.woodDark, 24);
  [[0.0, 0.0, M.fruitR], [0.07, 0.03, M.fruitY], [-0.06, 0.04, M.fruitG], [0.02, -0.07, M.fruitR], [-0.04, -0.04, M.fruitY]].forEach(([a, b, m]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 10), m); s.position.set(-0.35 + a, 1.02, -0.05 + b); s.castShadow = true; g.add(s);
  });
  B(g, 0.42, 0.02, 0.28, 0.45, 0.93, 0.05, M.wood); C(g, 0.06, 0.05, 0.22, 0.75, 1.03, -0.15, M.ceramic, 16);
  return g;
}
function toilet() {
  const g = grp(); const b = C(g, 0.19, 0.16, 0.36, 0, 0.42, 0.04, M.ceramic, 24); b.scale.set(1, 1, 1.45);
  S(g, 0.36, 0.03, 0.5, 0, 0.615, 0.06, M.ceramic, 0.012, 0); B(g, 0.22, 0.14, 0.01, 0, 1.05, -0.22, M.chrome);
  return g;
}
function vanity(len, sinks = 2, mirror = true) {
  const g = grp(); B(g, len, 0.42, 0.48, 0, 0.62, 0, M.woodDark); B(g, len, 0.03, 0.5, 0, 0.845, 0.01, M.counter);
  for (let i = 0; i < sinks; i++) {
    const x = -len / 2 + (i + 0.5) * len / sinks; const s = C(g, 0.2, 0.17, 0.12, x, 0.92, 0.04, M.ceramic, 28); s.scale.set(1, 1, 0.8);
    C(g, 0.014, 0.014, 0.28, x, 1.0, -0.19, M.metal, 10); B(g, 0.02, 0.02, 0.14, x, 1.13, -0.13, M.metal);
  }
  if (mirror) { B(g, len, 0.95, 0.02, 0, 1.62, -0.235, M.mirror); B(g, len + 0.04, 0.02, 0.03, 0, 2.11, -0.23, M.led, false); }
  return g;
}
function shower(parent, x1, x2, z1, z2, y, glass) {
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  bx(cx - 0.18, cx + 0.18, y + NET - 0.02, y + NET - 0.005, cz - 0.18, cz + 0.18, M.chrome, parent, { cast: false });
  bx(x1 + 0.05, x2 - 0.05, y - 0.005, y + 0.002, z2 - 0.08, z2 - 0.04, M.metal, parent, { cast: false });
  glass.forEach(([a, b, c, d]) => { bx(a, b, y, y + 2.1, c, d, M.glass, parent, { cast: false, collide: true, keep: true }); bx(a, b, y + 2.08, y + 2.1, c, d, M.metal, parent); });
}
function plant(h = 1.2, mat = M.leaf, potMat = M.pot, seed = 1) {
  // עציץ ואשכול עלים מוארכים
  const g = grp(), r = rng(seed);
  C(g, 0.18, 0.14, 0.38, 0, 0.19, 0, potMat, 20); C(g, 0.16, 0.16, 0.02, 0, 0.375, 0, M.soil, 16);
  const leafGeo = new THREE.SphereGeometry(1, 8, 6), n = MOBILE ? 10 : 18;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, t = 0.25 + r() * 0.75, L = h * (0.22 + r() * 0.18);
    const m = new THREE.Mesh(leafGeo, r() < 0.5 ? mat : M.leafDark);
    m.scale.set(L * 0.28, 0.012, L * 0.5);
    m.position.set(Math.cos(a) * 0.16 * t, 0.4 + h * 0.45 * t + 0.05, Math.sin(a) * 0.16 * t);
    m.rotation.set(-0.9 + r() * 0.6, -a + Math.PI / 2, 0, 'YXZ'); m.translateZ(L * 0.45); m.castShadow = true; g.add(m);
  }
  C(g, 0.012, 0.012, h * 0.5, 0, 0.4 + h * 0.25, 0, M.trunk, 6);
  return g;
}
function tree(h = 4, mat = M.leaf, crown = 1.4, seed = 3) {
  const g = grp(), r = rng(seed);
  C(g, 0.09, 0.15, h * 0.55, 0, h * 0.275, 0, M.trunk, 10);
  const geo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(geo, i % 2 ? mat : M.leafDark), rr = crown * (0.55 + r() * 0.45);
    s.scale.set(rr, rr * 0.8, rr); s.position.set((r() - 0.5) * crown, h * (0.62 + r() * 0.25), (r() - 0.5) * crown); s.castShadow = true; g.add(s);
  }
  return g;
}
function shelf(w, h, d = 0.35, mat = M.wood, seed = 2) {
  const g = grp(), r = rng(seed);
  B(g, 0.03, h, d, -w / 2, h / 2, 0, mat); B(g, 0.03, h, d, w / 2, h / 2, 0, mat);
  for (let y = 0.05; y < h; y += 0.38) B(g, w, 0.025, d, 0, y, 0, mat);
  for (let y = 0.075; y < h - 0.3; y += 0.38) for (let x = -w / 2 + 0.08; x < w / 2 - 0.1; x += 0.05 + r() * 0.06) {
    if (r() < 0.3) { x += 0.12; if (r() < 0.4) C(g, 0.05, 0.04, 0.16, x, y + 0.09, 0, M.ceramic, 12); continue; }
    const bh = 0.18 + r() * 0.1; B(g, 0.035, bh, d * 0.7, x, y + bh / 2, 0, [M.bookA, M.bookB, M.bookC, M.paper][Math.floor(r() * 4)], false);
  }
  return g;
}
function rug(parent, x1, x2, z1, z2, y, mat = M.rug) { S(parent, x2 - x1, 0.014, z2 - z1, (x1 + x2) / 2, y + 0.007, (z1 + z2) / 2, mat, 0.006, 0); }
function desk(w = 1.6, d = 0.75) {
  const g = grp(); B(g, w, 0.035, d, 0, 0.74, 0, M.wood);
  B(g, 0.04, 0.72, d - 0.1, -w / 2 + 0.05, 0.36, 0, M.metal); B(g, 0.04, 0.72, d - 0.1, w / 2 - 0.05, 0.36, 0, M.metal);
  C(g, 0.06, 0.07, 0.02, w / 2 - 0.2, 0.77, -d / 2 + 0.15, M.metal, 12); C(g, 0.01, 0.01, 0.35, w / 2 - 0.2, 0.95, -d / 2 + 0.15, M.metal, 6);
  const sh = C(g, 0.06, 0.09, 0.1, w / 2 - 0.2, 1.12, -d / 2 + 0.2, M.lampShade, 16); sh.castShadow = false;
  B(g, 0.32, 0.02, 0.24, -0.2, 0.77, 0, M.screen); B(g, 0.32, 0.22, 0.01, -0.2, 0.89, -0.12, M.screen);
  return g;
}
function officeChair() {
  const g = grp(); S(g, 0.5, 0.08, 0.48, 0, 0.47, 0, M.sofaDark, 0.03, 0.3); S(g, 0.48, 0.55, 0.06, 0, 0.82, -0.22, M.sofaDark, 0.03, 0.15);
  C(g, 0.03, 0.03, 0.4, 0, 0.24, 0, M.chrome, 8); C(g, 0.3, 0.3, 0.03, 0, 0.04, 0, M.metal, 16);
  return g;
}
function artwork(parent, img, x, y, z, rot, w, h) {
  // תמונה אמיתית במסגרת עם פספרטו. rot: הכיוון שהתמונה פונה אליו (0 = דרום)
  const g = grp();
  B(g, w, h, 0.03, 0, 0, 0, M.frame); B(g, w - 0.04, h - 0.04, 0.032, 0, 0, 0.001, M.paper, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.16, h - 0.16), PHOTO_M[img]); m.position.z = 0.0175; m.userData.keep = true; g.add(m);
  place(g, parent, x, y, z, rot, false);
}
function towel(parent, x, y, z, rot, w = 0.5, h = 0.7) { const g = grp(); S(g, w, h, 0.045, 0, 0, 0, M.towel, 0.02, 0.15); place(g, parent, x, y, z, rot, false); }
function floorLamp(parent, x, z, y) {
  const g = grp(); C(g, 0.16, 0.18, 0.025, 0, 0.012, 0, M.metal, 20); C(g, 0.012, 0.012, 1.45, 0, 0.74, 0, M.metal, 8);
  const sh = C(g, 0.17, 0.22, 0.28, 0, 1.55, 0, M.lampShade, 28); sh.castShadow = false;
  place(g, parent, x, y, z, 0, true); LAMPS.push({ g, x: 0, y: 1.5, z: 0 });
}

function buildFurniture() {
  const g0 = G.ground, g1 = G.base, go = G.out, gc = G.ceilG;
  // --- מטבח (לפי התוכנית): ארונות גבוהים בצפון, קו עבודה במערב, אי באמצע
  place(tallUnit(2.87, NET), g0, 1.435, GY, 11.69, 0);
  bx(0, 0.02, 0.92, 1.6, 12.3, 15.6, M.counter, g0, { cast: false });
  place(counter(3.3, { sink: -0.65, cook: 0.6 }), g0, 0.31, GY, 13.95, R90);
  bx(0.0, 0.55, 2.2, 2.32, 13.0, 13.7, M.metal, g0); bx(0.0, 0.3, 2.32, NET, 13.15, 13.55, M.cabinet, g0);
  place(island(2.1, 0.9), g0, 2.30, GY, 14.10, R90);
  [13.4, 14.1, 14.8].forEach((z) => place(stool(), g0, 3.05, GY, z, -R90, false));
  // --- פינת אוכל
  place(diningTable(2.4, 1.0), g0, 4.55, GY, 14.15, 0);
  [-0.75, 0, 0.75].forEach((dx) => { place(chair(), g0, 4.55 + dx, GY, 13.42, 0, false); place(chair(), g0, 4.55 + dx, GY, 14.88, Math.PI, false); });
  pendant(gc, 3.95, 14.15, NET); pendant(gc, 5.15, 14.15, NET);
  // --- סלון
  rug(g0, 6.5, 9.5, 13.0, 15.5, GY);
  place(sofa(2.7, 0.98), g0, 7.95, GY, 15.90, Math.PI);
  place(armchair(), g0, 9.75, GY, 13.25, -R90 - 0.35); place(armchair(), g0, 6.45, GY, 13.35, R90 + 0.35);
  place(coffeeTable(0.5), g0, 8.0, GY, 14.25);
  const media = grp(); B(media, 2.6, 0.42, 0.45, 0, 0.41, 0, M.woodDark); B(media, 1.45, 0.83, 0.035, 0, 1.45, -0.21, M.screen);
  C(media, 0.06, 0.05, 0.3, -1.0, 0.77, 0, M.ceramic, 16); B(media, 0.3, 0.12, 0.2, 0.95, 0.68, 0, M.bookA);
  place(media, g0, 8.2, GY, 12.22, 0);
  placePlant(plant(1.7, M.leaf, M.potDark, 4), g0, 6.30, GY, 15.95);
  placePlant(plant(1.3, M.leafDark, M.pot, 5), g0, 10.05, GY, 12.45);
  floorLamp(g0, 9.65, 15.85, GY);
  artwork(g0, 0, 7.95, 1.95, 16.42, Math.PI, 1.5, 1.0);
  // --- מבואה
  const bench = grp(); B(bench, 1.2, 0.4, 0.4, 0, 0.2, 0, M.wood); S(bench, 1.1, 0.06, 0.36, 0, 0.43, 0, M.sofa, 0.025, 0.3);
  place(bench, g0, 3.97, GY, 9.66, 0);
  artwork(g0, 1, 3.97, 1.6, 9.47, 0, 1.0, 0.7);
  placePlant(plant(1.4, M.leaf, M.potDark, 6), g0, 1.75, GY, 11.0);
  // --- יחידת הורים
  place(bed(1.8, 2.0), g0, 3.67, GY, 1.9, R90);
  place(nightstand(), g0, 2.84, GY, 0.62, R90); place(nightstand(), g0, 2.84, GY, 3.18, R90);
  rug(g0, 3.1, 5.5, 0.4, 3.4, GY, M.rug);
  const ot = grp(); S(ot, 1.2, 0.42, 0.45, 0, 0.21, 0, M.headboard, 0.06, 0.2); place(ot, g0, 5.0, GY, 1.9, R90);
  place(armchair(M.accent), g0, 5.40, GY, 3.55, -R90 - 0.6);
  placePlant(plant(1.2, M.leaf, M.pot, 7), g0, 5.65, GY, 0.35);
  artwork(g0, 2, 2.575, 1.95, 1.9, R90, 1.4, 0.95);
  place(wardrobe(2.72, NET - 0.02, 0.60), g0, 3.26, GY, 6.95, Math.PI);
  place(wardrobe(1.50, NET - 0.02, 0.60), g0, 0.30, GY, 6.50, R90);
  rug(g0, 0.8, 4.4, 5.85, 6.55, GY, M.rug);
  bx(0.6, 4.4, NET - 0.012, NET - 0.002, 6.18, 6.24, M.led, gc, { cast: false });
  // חדר רחצה הורים
  bx(0.0, 0.25, GY, NET, 3.47, 4.05, M.bathWall, g0, { collide: true });
  place(toilet(), g0, 0.50, GY, 3.80, R90);
  shower(g0, 0.0, 1.05, 4.37, 5.65, GY, [[0.25, 1.05, 4.36, 4.38], [1.04, 1.06, 4.37, 5.05]]);
  place(vanity(1.70, 2), g0, 2.22, GY, 4.45, -R90);
  for (let y = 0.85; y < 1.6; y += 0.12) bx(0.95, 1.45, y, y + 0.02, 3.48, 3.52, M.chrome, g0, { cast: false });
  towel(g0, 1.2, 1.2, 3.56, 0);
  place(plant(0.5, M.leaf, M.ceramic, 8), g0, 2.25, GY + 0.86, 3.85, 0, false);
  // שירותי אורחים
  place(toilet(), g0, 3.97, GY, 7.62, 0); place(vanity(0.45, 1, false), g0, 3.57, GY, 8.6, R90);
  // ממ"ד (חדר עבודה)
  place(desk(1.5, 0.65), g0, 8.15, GY, 3.78, 0); place(officeChair(), g0, 8.15, GY, 4.4, Math.PI, false);
  place(sofa(1.6, 0.9, M.sofa, 2), g0, 6.71, GY, 4.35, R90);
  place(shelf(1.0, 2.0), g0, 9.6, GY, 3.63, 0);
  artwork(g0, 6, 6.275, 1.7, 4.35, R90, 1.2, 0.8);
  // חדר רחצה כללי
  shower(g0, 7.27, 8.47, 6.40, 7.55, GY, [[7.27, 7.97, 7.54, 7.56]]);
  place(vanity(1.6, 2), g0, 8.65, GY, 8.50, Math.PI); place(toilet(), g0, 10.18, GY, 8.30, -R90);
  const wsh = grp(); B(wsh, 0.6, 0.85, 0.6, 0, 0.425, 0, M.ceramic); const dr = C(wsh, 0.17, 0.17, 0.02, 0, 0.45, 0.3, M.screen, 24); dr.rotation.x = R90;
  place(wsh, g0, 10.13, GY, 6.73, -R90);
  towel(g0, 9.6, 1.4, 8.715, Math.PI);
  // חדר שינה 2
  place(bed(1.6, 2.0), g0, 7.21, GY, 10.5, R90); place(nightstand(), g0, 6.40, GY, 11.48, R90);
  place(wardrobe(2.0, 2.6, 0.6), g0, 9.3, GY, 11.44, Math.PI);
  place(desk(1.2, 0.6), g0, 10.16, GY, 9.8, -R90); place(officeChair(), g0, 9.55, GY, 9.8, R90, false);
  artwork(g0, 3, 6.135, 1.95, 10.5, R90, 0.9, 0.65);
  rug(g0, 7.4, 9.2, 9.2, 11.0, GY, M.rug);
  // תאורה שקועה ופסי לד
  bx(0.2, 10.26, NET - 0.012, NET - 0.002, 12.07, 12.13, M.led, gc, { cast: false });
  [[1.5, 10.2], [4.0, 10.2], [1.2, 12.9], [1.2, 15.6], [6.6, 15.8], [10.0, 12.6], [5.9, 6.6], [5.9, 8.0], [3.6, 2.0], [4.8, 4.8], [8.4, 4.8], [8.8, 7.5], [8.3, 10.3], [1.2, 4.6]]
    .forEach(([x, z]) => bx(x - 0.045, x + 0.045, NET - 0.006, NET, z - 0.045, z + 0.045, M.downlight, gc, { cast: false }));

  // --- מרתף: מיני בר, מרחב משפחה
  place(counter(1.8, { sink: 0.4 }), g1, 0.31, BY, 2.20, R90);
  bx(0, 0.35, BY + 1.5, BY + 1.53, 1.3, 3.1, M.wood, g1); bx(0, 0.35, BY + 1.9, BY + 1.93, 1.3, 3.1, M.wood, g1);
  for (let i = 0; i < 6; i++) C(g1, 0.035, 0.035, 0.3, 0.12 + (i % 3) * 0.08, BY + 1.68, 1.5 + i * 0.25, i % 2 ? M.bookA : M.screen, 12);
  place(stool(), g1, 0.95, BY, 1.8, R90, false); place(stool(), g1, 0.95, BY, 2.6, R90, false);
  rug(g1, 1.4, 4.4, 3.9, 6.6, BY, M.rug);
  place(sofa(2.5, 0.95, M.sofaDark), g1, 0.85, BY, 5.2, R90);
  place(coffeeTable(0.45), g1, 2.5, BY, 5.2);
  place(armchair(M.accent2), g1, 3.9, BY, 3.95, -R90 - 0.7);
  const media2 = grp(); B(media2, 2.2, 0.42, 0.42, 0, 0.41, 0, M.woodDark); B(media2, 1.6, 0.92, 0.035, 0, 1.45, -0.19, M.screen);
  place(media2, g1, 5.28, BY, 5.2, -R90);
  placePlant(plant(1.3, M.leaf, M.pot, 9), g1, 0.45, BY, 6.85);
  artwork(g1, 4, 0.015, BY + 1.75, 5.2, R90, 1.6, 1.05);
  floorLamp(g1, 0.45, 3.6, BY);
  // חדר משחקים
  rug(g1, 3.0, 5.6, 0.0, 2.6, BY, M.rug);
  const kt = grp(); B(kt, 0.9, 0.03, 0.6, 0, 0.5, 0, M.wood); [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]].forEach(([x, z]) => B(kt, 0.04, 0.5, 0.04, x, 0.25, z, M.wood));
  place(kt, g1, 4.3, BY, 1.2, 0);
  [[3.9, 0.7, M.kids1], [4.7, 0.7, M.kids2], [3.9, 1.7, M.kids3], [4.7, 1.7, M.kids2]].forEach(([x, z, m], i) => {
    const c = grp(); B(c, 0.3, 0.3, 0.3, 0, 0.15, 0, M.wood); S(c, 0.3, 0.05, 0.3, 0, 0.32, 0, m, 0.02, 0.3); place(c, g1, x, BY, z, i < 2 ? 0 : Math.PI, false);
  });
  place(shelf(2.4, 1.2, 0.35, M.wood, 11), g1, 2.76, BY, 1.4, R90);
  softBox(0.75, 0.45, 0.75, 5.4, BY, 0.05, 0, M.accent, g1, 0.3, 0.4); softBox(0.75, 0.45, 0.75, 5.5, BY, 1.7, 0, M.accent2, g1, 0.3, 0.4);
  colliders.push({ x1: 5.0, x2: 5.8, y1: BY, y2: BY + 0.45, z1: -0.35, z2: 0.45 }, { x1: 5.1, x2: 5.9, y1: BY, y2: BY + 0.45, z1: 1.3, z2: 2.1 });
  placePlant(plant(1.1, M.leaf, M.pot, 12), g1, 5.7, BY, -0.1);
  artwork(g1, 7, 2.575, BY + 1.65, 1.3, R90, 1.2, 0.8);
  // סטודיו
  place(desk(1.8, 0.8), g1, 10.06, BY, 8.3, -R90); place(officeChair(), g1, 9.4, BY, 8.3, R90, false);
  place(sofa(2.1, 0.9), g1, 8.4, BY, 6.7, 0);
  place(coffeeTable(0.45), g1, 8.4, BY, 7.85);
  place(armchair(M.accent), g1, 7.3, BY, 9.35, R90 + 0.5);
  place(shelf(2.4, 2.2, 0.35, M.wood, 13), g1, 8.2, BY, 10.18, Math.PI);
  placePlant(plant(1.6, M.leaf, M.potDark, 14), g1, 6.65, BY, 9.95);
  rug(g1, 7.0, 9.6, 7.2, 9.6, BY, M.rug);
  artwork(g1, 5, 8.0, BY + 1.85, 6.265, 0, 1.6, 1.0);
  // חדרי רחצה במרתף
  shower(g1, 6.25, 7.85, 3.35, 4.45, BY, [[6.95, 7.85, 4.44, 4.46]]);
  place(vanity(0.7, 1), g1, 6.49, BY, 4.95, R90); place(toilet(), g1, 7.60, BY, 5.0, -R90);
  place(vanity(0.8, 1), g1, 9.10, BY, 5.40, R90); place(toilet(), g1, 10.18, BY, 4.95, -R90);
  shower(g1, 8.86, 10.46, 3.35, 4.45, BY, [[9.40, 10.46, 4.44, 4.46]]);
  towel(g1, 7.05, BY + 1.3, 6.125, Math.PI); towel(g1, 9.0, BY + 1.3, 6.125, Math.PI);
  // חדר שירות ומחסן
  [3.1, 3.75].forEach((x) => { const w = grp(); B(w, 0.6, 0.85, 0.6, 0, 0.425, 0, M.ceramic); const d2 = C(w, 0.17, 0.17, 0.02, 0, 0.45, 0.3, M.screen, 24); d2.rotation.x = R90; place(w, g1, x, BY, 11.36, Math.PI); });
  place(counter(0.6, { sink: 0 }), g1, 4.4, BY, 11.35, Math.PI);
  place(shelf(1.2, 2.0, 0.4, M.chrome, 15), g1, 5.29, BY, 10.2, -R90);
  place(shelf(2.2, 2.2, 0.45, M.chrome, 16), g1, 1.2, BY, 11.52, Math.PI); place(shelf(1.4, 2.2, 0.45, M.chrome, 17), g1, 0.25, BY, 10.2, R90);
  // חצר אנגלית
  const pl = grp(); B(pl, 1.4, 0.55, 1.4, 0, 0.275, 0, M.concrete); B(pl, 1.3, 0.02, 1.3, 0, 0.54, 0, M.soil); place(pl, g1, 9.2, BY, 0.6, 0);
  place(tree(3.2, M.olive, 0.9, 21), g1, 9.2, BY + 0.55, 0.6, 0, false);
  const bc = grp(); B(bc, 1.8, 0.45, 0.45, 0, 0.225, 0, M.teak); place(bc, g1, 7.6, BY, -0.85, 0);
  [-0.6, 1.2, 2.6].forEach((z, i) => place(plant(2.0, M.leafDark, M.potDark, 30 + i), g1, 10.3, BY, z, 0));

  // --- דק וגינה
  place(diningTable(2.2, 1.0, false), go, 3.0, GY, 18.25, 0);
  [-0.7, 0, 0.7].forEach((dx) => { place(chair(M.cushion), go, 3.0 + dx, GY, 17.55, 0, false); place(chair(M.cushion), go, 3.0 + dx, GY, 18.95, Math.PI, false); });
  place(sofa(2.6, 0.9, M.cushion), go, 9.9, GY, 18.2, -R90);
  place(coffeeTable(0.4), go, 8.75, GY, 18.2);
  [4.6, 5.6].forEach((x) => { const sb = grp(); B(sb, 0.7, 0.3, 1.95, 0, 0.18, 0, M.teak); S(sb, 0.66, 0.08, 1.4, 0, 0.37, 0.25, M.cushion, 0.03, 0.3); const bk = S(sb, 0.66, 0.08, 0.6, 0, 0.55, -0.62, M.cushion, 0.03, 0.3); bk.rotation.x = -0.7; place(sb, go, x, GY, 21.0, Math.PI); });
  [[0.6, 21.6, 4.5, M.leaf, 1.6], [12.6, 20.6, 5.0, M.olive, 1.4], [12.9, 13.0, 4.0, M.leaf, 1.2], [-3.0, 14.0, 7.0, M.leaf, 2.2], [16.5, 8.0, 6.0, M.leafDark, 2.0],
    [6.0, 26.0, 7.5, M.leaf, 2.4], [17.0, 22.0, 6.5, M.olive, 2.0], [-2.5, 24.0, 6.0, M.leafDark, 2.0]]
    .forEach(([x, z, h, m, c], i) => place(tree(h, m, c, 40 + i), go, x, GY, z, i, i < 3));
  placePlant(plant(1.0, M.leaf, M.potDark, 50), go, 10.3, GY, 16.95);
}

// ---------------------------------------------------------------- איחוד גאומטריות לפי חומר (פחות קריאות ציור = חלק בטלפון)
function mergeGroup(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map(), toRemove = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.wall || o.userData.keep || o.material.transparent || Array.isArray(o.material)) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    const key = o.material.uuid + (o.castShadow ? 's' : 'n');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    buckets.get(key).geos.push(g); toRemove.push(o);
  });
  toRemove.forEach((o) => o.parent.remove(o));
  const merged = new THREE.Group();
  for (const { mat, cast, geos } of buckets.values()) {
    const g = mergeGeometries(geos, false); if (!g) continue;
    const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; merged.add(m);
  }
  const empty = []; group.traverse((o) => { if (o !== group && o.isGroup && o.children.length === 0) empty.push(o); });
  empty.forEach((o) => o.parent && o.parent.remove(o));
  group.add(merged);
}

// ---------------------------------------------------------------- אור, שמיים, שעות
const hemi = new THREE.HemisphereLight(0xdfe8f3, 0xa69a86, 0.4); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2df, 3);
sun.castShadow = true;
const SMAP = MOBILE ? 2048 : 4096;
sun.shadow.mapSize.set(SMAP, SMAP);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 120 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
sun.target.position.set(5.5, 0, 10); scene.add(sun, sun.target);
const pmrem = new THREE.PMREMGenerator(renderer);
const PANO = {}, ENV = {};
const DOLL_BG = new THREE.Color(0xe4e6e3);
const PANO_SUN_A = (0.626 - 0.5) * Math.PI * 2;   // מיקום זוהר השמש בתמונת השקיעה (u=0.626)

function sunDir(day, hour) {
  const lat = 31.9 * Math.PI / 180, decl = 23.44 * Math.PI / 180 * Math.sin(2 * Math.PI * (284 + day) / 365);
  const H = (hour + 0.33 - 12) * 15 * Math.PI / 180;
  const el = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;
  return { el, az, v: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)) };
}
const DAY = 327;   // 23 בנובמבר
const TIMES = {
  morning: { name: 'בוקר', hour: 8.25, sunCol: 0xffe2c0, sun: 2.6, hemi: 0.65, env: 0.25, pano: 'noon', bg: 0.9, exp: 1.0, lamps: 0 },
  noon: { name: 'צהריים', hour: 12.2, sunCol: 0xfff6ea, sun: 3.2, hemi: 0.65, env: 0.4, pano: 'noon', bg: 1.0, exp: 0.95, lamps: 0 },
  sunset: { name: 'שקיעה', hour: 16.15, sunCol: 0xffa858, sun: 2.4, hemi: 0.32, env: 0.5, pano: 'sunset', bg: 1.0, exp: 1.05, lamps: 0.35 },
  night: { name: 'לילה', hour: 16.15, sunCol: 0x9fb4ff, sun: 0.0, hemi: 0.06, env: 0.12, pano: 'night', bg: 0.9, exp: 1.1, lamps: 1 },
};
let timeKey = 'sunset';
const LAMP_LIGHTS = [];
function applyTime(key) {
  timeKey = key;
  const T = TIMES[key], s = sunDir(DAY, T.hour);
  sun.position.copy(sun.target.position).addScaledVector(s.v, 60);
  sun.color.set(T.sunCol); sun.intensity = T.sun; sun.castShadow = T.sun > 0;
  hemi.intensity = T.hemi; hemi.color.set(key === 'night' ? 0x2a3550 : key === 'sunset' ? 0xffd9b4 : 0xf4efe6); hemi.groundColor.set(0xb3a28a);   // מילוי ניטרלי-חם: קירות לבנים לא נראים כחולים
  scene.background = mode === 'doll' ? DOLL_BG : PANO[T.pano]; scene.environment = ENV[T.pano];
  scene.backgroundIntensity = T.bg; scene.environmentIntensity = T.env;
  // סיבוב השמיים: זוהר השמש בתמונה נמצא בכיוון השמש של שעת השקיעה בתוכנית
  const ss = sunDir(DAY, TIMES.sunset.hour), want = Math.atan2(-Math.cos(ss.az), Math.sin(ss.az));
  scene.backgroundRotation.set(0, want - PANO_SUN_A, 0); scene.environmentRotation.set(0, want - PANO_SUN_A, 0);
  renderer.toneMappingExposure = T.exp;
  M.lampShade.emissiveIntensity = 1.6 * T.lamps; M.bulb.emissiveIntensity = 6 * T.lamps; M.led.emissiveIntensity = 2.5 * T.lamps;
  M.downlight.emissiveIntensity = 0.4 + 3 * T.lamps;
  LAMP_LIGHTS.forEach((l) => { l.visible = T.lamps > 0; l.intensity = l.userData.base * T.lamps; });
  renderer.shadowMap.needsUpdate = true;
  document.dispatchEvent(new CustomEvent('tourtime', { detail: key }));
}
function buildLampLights() {
  // מספר מוגבל של מנורות אמיתיות (בלי צל) כדי לשמור על מהירות; השאר זוהר בלבד
  const v = new THREE.Vector3();
  const pick = MOBILE ? LAMPS.filter((l, i) => l.big || i % 2 === 0).slice(0, 5) : LAMPS.slice(0, 10);
  pick.forEach((l) => {
    l.g.updateMatrixWorld(true); v.set(l.x, l.y, l.z); l.g.localToWorld(v);
    const p = new THREE.PointLight(0xffc98a, 0, l.big ? 7 : 5, 2); p.userData.base = l.big ? 9 : 5; p.position.copy(v); G.lights.add(p); LAMP_LIGHTS.push(p);
  });
  // תאורה כללית חמה בחדרים (בלילה)
  [[5.2, 3.0, 14.2, 9], [3.6, 3.0, 10.6, 5], [4.3, 3.0, 2.6, 6], [8.4, 3.0, 4.8, 5], [8.3, 3.0, 10.3, 5], [5.9, 3.0, 7.2, 4],
    [2.7, BY + 3.0, 5.2, 7], [4.3, BY + 3.0, 1.4, 5], [8.3, BY + 3.0, 8.3, 6]].forEach(([x, y, z, i]) => {
    const p = new THREE.PointLight(0xffd2a0, 0, 10, 2); p.userData.base = i * 1.5; p.position.set(x, y, z); G.lights.add(p); LAMP_LIGHTS.push(p);
  });
}

// ---------------------------------------------------------------- חדרים, שטחים ומשפטי מכירה
const ROOMS = [
  { id: 'lobby', lvl: 'G', name: 'לובי הבניין', note: 'שטח משותף · הכניסה לדירה', rects: [[-3.5, 1.28, 9.45, 11.13]] },
  { id: 'foyer', lvl: 'G', name: 'מבואת כניסה', area: 11.4, rects: [[1.38, 5.87, 9.45, 11.99]], line: 'כניסה מרווחת עם מבט ישיר לסלון ולגינה.' },
  { id: 'great', lvl: 'G', name: 'סלון, מטבח ופינת אוכל', area: 47.4, rects: [[0, 10.46, 11.99, 16.44], [0, 1.38, 11.38, 11.99]], line: 'חלל אחד פתוח, עם ויטרינות הזזה בגובה 3.40 לגינה.' },
  { id: 'master', lvl: 'G', name: 'חדר שינה הורים', area: 19.5, rects: [[2.56, 6.01, 0, 5.65]], line: 'חדר שינה גדול, עם חלון לחצר האנגלית.' },
  { id: 'dress', lvl: 'G', name: 'חדר ארונות', area: 6.9, rects: [[0, 4.62, 5.75, 7.25]], line: 'מעבר עם ארונות לאורך הקיר, בתוך יחידת ההורים.' },
  { id: 'mbath', lvl: 'G', name: 'חדר רחצה הורים', area: 5.4, rects: [[0, 2.46, 3.47, 5.65]], line: 'מקלחון, כיור כפול וחיפוי קרמיקה עד התקרה.' },
  { id: 'hall', lvl: 'G', name: 'מסדרון', area: 6.6, rects: [[4.72, 7.17, 5.75, 8.74], [4.72, 5.87, 8.74, 9.45]] },
  { id: 'wc', lvl: 'G', name: 'שירותי אורחים', area: 2.6, rects: [[3.32, 4.62, 7.35, 9.35]] },
  { id: 'mamad', lvl: 'G', name: 'ממ״ד / חדר עבודה', area: 11.7, rects: [[6.26, 10.50, 3.45, 6.20]], line: 'ממ״ד שמשמש גם כחדר עבודה.' },
  { id: 'bath', lvl: 'G', name: 'חדר רחצה', area: 7.5, rects: [[7.27, 10.46, 6.40, 8.74]], line: 'חדר רחצה עם חלון ומקום למכונת כביסה.' },
  { id: 'bed2', lvl: 'G', name: 'חדר שינה', area: 12.2, rects: [[6.12, 10.46, 8.94, 11.74]], line: 'חדר שינה שקט עם חלון למזרח.' },
  { id: 'stairs', lvl: 'S', name: 'מדרגות למרתף', rects: [[0, 3.22, 7.35, 9.35]], line: 'מדרגות פנימיות לקומת המרתף.' },
  { id: 'deck', lvl: 'G', name: 'דק ופרגולה', area: 29.2, rects: [[0.97, 10.71, 16.69, 19.69]], line: 'דק מקורה בפרגולה, צמוד לסלון.' },
  { id: 'garden', lvl: 'G', name: 'גינה פרטית', area: 122.4, note: 'כולל הדק', rects: [[-0.25, 13.71, 19.69, 22.10], [10.71, 13.71, 1.06, 19.69]], line: 'גינה פרטית של 122 מ״ר מסביב לדירה.' },
  { id: 'family', lvl: 'B', name: 'מרחב משפחה ומיני בר', area: 26.9, rects: [[0, 5.49, 3.28, 7.25], [0, 2.46, 1.20, 3.28]], line: 'מרחב משפחה עם מיני בר, בקומה שלמה מתחת לבית.' },
  { id: 'play', lvl: 'B', name: 'חדר משחקים', area: 12.2, rects: [[2.56, 6.01, -0.37, 3.18]], line: 'חדר משחקים צמוד למרחב המשפחה.' },
  { id: 'bbath1', lvl: 'B', name: 'חדר רחצה (מרתף)', area: 4.5, rects: [[6.25, 7.85, 3.35, 6.15]] },
  { id: 'bbath2', lvl: 'B', name: 'חדר רחצה (מרתף)', area: 4.5, rects: [[8.86, 10.46, 3.35, 6.15]] },
  { id: 'studio', lvl: 'B', name: 'סטודיו', area: 17.3, rects: [[6.25, 10.46, 6.25, 10.36]], line: 'סטודיו עם חלון גדול, מתאים לעבודה מהבית.' },
  { id: 'bhall', lvl: 'B', name: 'מבואת מרתף', area: 4.5, rects: [[3.22, 5.49, 7.35, 9.35]] },
  { id: 'service', lvl: 'B', name: 'חדר שירות', area: 6.1, rects: [[2.71, 5.49, 9.45, 11.66]] },
  { id: 'storage', lvl: 'B', name: 'מחסן', area: 6.0, rects: [[0, 2.61, 9.45, 11.74]] },
  { id: 'court', lvl: 'B', name: 'חצר אנגלית', area: 18.7, rects: [[6.26, 10.65, -1.10, 3.15]] },
];
ROOMS.forEach((r) => { const [a, b, c, d] = r.rects[0]; r.cx = (a + b) / 2; r.cz = (c + d) / 2; });
const fmtArea = (a) => `${a.toFixed(1)} מ״ר`;
function label(text, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const x = c.getContext('2d'); x.direction = 'rtl'; x.textAlign = 'center';
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.roundRect(8, 18, 496, 124, 22); x.fill();
  x.fillStyle = '#1f2328'; x.font = 'bold 44px "Segoe UI", Arial, sans-serif'; x.fillText(text, 256, 74);
  x.fillStyle = '#1f4f46'; x.font = '36px "Segoe UI", Arial, sans-serif'; x.fillText(sub, 256, 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(2.9, 0.91, 1); sp.renderOrder = 10;
  return sp;
}

// ---------------------------------------------------------------- תנועה והתנגשויות
const RAD = 0.25, EYE = 1.6, STEP = 0.45;
const player = { x: -2.6, z: 10.3, feet: GY };
const COURT = [6.26, 10.65, -1.10, 3.15];
const inR = (x, z, r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
function stairH(x, z) {
  if (x < 0 || x > 3.22 || z < 7.35 || z > 9.35) return null;
  if (x >= 2.27 && z >= 8.40) return GY;
  if (x >= 0.95 && z >= 8.40) return GY - Math.min(5, Math.max(1, Math.ceil((2.27 - x) / 0.264))) * RISER;
  if (x >= 0.95 && z <= 8.30) return GY - (12 + Math.min(9, Math.max(1, Math.ceil((x - 0.95) / 0.252)))) * RISER;
  if (x >= 0.95) return GY - 12 * RISER;
  const phi = Math.atan2(-(x - 0.95), z - 8.35) * 180 / Math.PI;
  return GY - (5 + Math.min(7, Math.max(1, Math.floor(phi / (180 / 7)) + 1))) * RISER;
}
function surfaceAt(x, z, feet) {
  const c = [], s = stairH(x, z);
  if (s !== null) c.push(s, BY); else { if (!inR(x, z, COURT)) c.push(GY); c.push(BY); }
  let best = null; for (const h of c) if (h <= feet + STEP && (best === null || h > best)) best = h;
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
  if (blocked(nx, nz, h) && !blocked(player.x, player.z, player.feet)) return false;
  player.x = nx; player.z = nz; player.feet = h; return true;
}

// ---------------------------------------------------------------- שליטה
const plc = new PointerLockControls(camera, renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false; orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI * 0.47; orbit.minDistance = 4; orbit.maxDistance = 60;
let mode = 'walk', camY = player.feet + EYE;
const keys = {}, joy = { x: 0, y: 0 };
const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
addEventListener('keydown', (e) => { if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; if (mode === 'walk') e.preventDefault(); } if (e.code.startsWith('Shift')) keys.run = true; });
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; if (e.code.startsWith('Shift')) keys.run = false; });
camera.position.set(player.x, camY, player.z); camera.rotation.set(0, -R90, 0);
let drag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (mode === 'walk' && !plc.isLocked) drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
addEventListener('pointerup', (e) => { if (drag && drag.id === e.pointerId) drag = null; });
addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId || mode !== 'walk' || plc.isLocked) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  const eu = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  eu.y -= dx * 0.005; eu.x = Math.max(-1.3, Math.min(1.3, eu.x - dy * 0.004)); camera.quaternion.setFromEuler(eu);
});

function setLevel(lvl) {
  const showG = lvl !== 'B';
  G.ground.visible = showG; G.slab.visible = showG; G.out.visible = showG;
  G.labels.children.forEach((s) => { s.visible = lvl === 'B' ? s.userData.lvl === 'B' : s.userData.lvl !== 'B'; });
}
let dollLevel = 'G', walkQ = null;
function setMode(m) {
  if (mode === 'tour' && m !== 'tour' && tour.active) tourStop(false);
  mode = m;
  if (m === 'doll') {
    walkQ = walkQ || camera.quaternion.clone(); plc.unlock();
    G.ceilG.visible = G.ceilB.visible = G.roof.visible = false; G.labels.visible = true; setLevel(dollLevel);
    scene.background = DOLL_BG;   // במבט מלמעלה: רקע נקי במקום תחתית הפנורמה
    orbit.enabled = true; orbit.target.set(5, dollLevel === 'B' ? BY : 0, 9); camera.position.set(-3, 17 + (dollLevel === 'B' ? BY : 0), 26); orbit.update();
  } else {
    orbit.enabled = false; G.ceilG.visible = G.ceilB.visible = G.roof.visible = true; G.labels.visible = false; setLevel('G');
    scene.background = PANO[TIMES[timeKey].pano];
    if (m === 'walk') { camera.position.set(player.x, player.feet + EYE, player.z); if (walkQ) camera.quaternion.copy(walkQ); camY = player.feet + EYE; }
  }
  renderer.shadowMap.needsUpdate = true;
  document.dispatchEvent(new CustomEvent('tourmode', { detail: m }));
}
function setDollLevel(l) { dollLevel = l; if (mode === 'doll') { setLevel(l); const dy = (l === 'B' ? BY : 0) - orbit.target.y; orbit.target.y += dy; camera.position.y += dy; orbit.update(); } }
const SPOTS = {   // [x, z, x מבט, z מבט]
  great: [6.6, 12.5, 9.8, 16.0], master: [5.6, 5.2, 2.8, 1.4], mbath: [1.3, 5.55, 0.9, 3.5], mamad: [10.0, 5.9, 6.8, 3.8], bath: [8.3, 7.95, 10.4, 6.5],
  bed2: [9.3, 9.15, 6.6, 11.2], family: [5.0, 7.0, 0.8, 4.2], play: [5.6, 2.9, 3.0, 0.0], studio: [6.6, 9.9, 10.2, 6.8], garden: [9.0, 21.8, 4.5, 16.0],
  deck: [6.0, 17.3, 8.0, 22.0], foyer: [2.3, 10.4, 7.5, 14.5], lobby: [-2.6, 10.3, 1.3, 10.3], court: [8.0, 2.9, 8.5, -1.0], dress: [4.3, 6.2, 0.2, 6.4],
  wc: [4.3, 9.0, 3.6, 7.4], bbath1: [6.6, 5.9, 7.2, 3.4], bbath2: [9.4, 5.9, 9.8, 3.4], service: [3.4, 9.8, 4.5, 11.5], storage: [2.2, 10.0, 0.5, 11.2],
  bhall: [4.6, 8.2, 6.5, 8.0], hall: [5.3, 6.2, 5.3, 10.0],
};
function teleport(id) {
  const r = ROOMS.find((q) => q.id === id); if (!r) return;
  const [x, z, tx, tz] = SPOTS[id] || [r.cx, r.cz, r.cx, r.cz - 1];
  const yaw = Math.atan2(-(tx - x), -(tz - z));
  player.x = x; player.z = z; player.feet = r.lvl === 'B' ? BY : GY; camY = player.feet + EYE;
  walkQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.06, yaw, 0, 'YXZ'));
  if (mode !== 'walk') setMode('walk'); else { camera.quaternion.copy(walkQ); camera.position.set(x, camY, z); }
}

// ---------------------------------------------------------------- סיור מודרך לפי מסלול הקונה
// עובר דרך מרכזי הדלתות. בכל עצירה: שם החדר, שטח ומשפט אחד. בסוף עולה למבט מלמעלה. עד דקה וחצי.
const ROUTE = [   // [x, z] או [x, z, חדר, x מבט, z מבט]
  [-2.4, 10.3], [0.4, 10.3], [1.33, 10.35], [2.4, 10.5, 'foyer', 7.5, 14.5],
  [3.9, 11.9], [5.6, 12.65, 'great', 9.8, 16.0], [4.4, 12.75], [3.4, 12.85, 'kitchen', 0.4, 14.6],
  [3.05, 14.0], [3.15, 15.6], [3.3, 16.1], [3.3, 17.1], [5.9, 17.35, 'deck', 8.0, 22.0],
  [3.3, 17.1], [3.3, 16.1], [3.15, 15.6], [3.05, 14.0], [3.7, 12.7], [5.0, 11.0], [5.4, 9.2], [5.45, 8.45],
  [6.65, 8.45], [6.75, 9.2], [8.6, 9.22, 'bed2', 6.6, 11.2], [6.75, 9.2], [6.65, 8.45],
  [6.65, 7.2], [6.70, 6.0], [7.6, 5.55, 'mamad', 9.8, 3.7], [6.70, 6.0], [6.65, 7.0],
  [5.4, 6.25], [4.3, 6.2, 'dress', 0.2, 6.4], [4.1, 5.95], [4.1, 5.2], [4.7, 4.4, 'master', 2.7, 1.6],
  [4.1, 5.2], [4.1, 6.05], [5.3, 6.4], [5.4, 8.6], [5.2, 9.8], [4.4, 10.25], [2.75, 10.1], [2.75, 9.0, 'stairs', 1.0, 8.9],
  [2.0, 8.88], [1.1, 8.88], [0.5, 8.8], [0.42, 8.35], [0.5, 7.85], [1.1, 7.82], [3.0, 7.82], [4.0, 7.85],
  [4.4, 7.4], [4.4, 6.5, 'family', 0.8, 4.2], [4.72, 5.6], [4.75, 3.9], [4.75, 2.75, 'play', 3.0, 0.2], [4.75, 3.9], [4.72, 5.6], [4.4, 6.5], [4.4, 7.4],
  [4.95, 8.0], [5.9, 8.0], [6.7, 8.0, 'studio', 10.2, 7.0],
];
const STOP_INFO = { kitchen: { name: 'מטבח ופינת אוכל', area: null, line: 'אי מטבח ופינת אוכל ליד הוויטרינה, צמודים לדק.' } };
const tour = { active: false, paused: false, u: 0, curve: null, len: 0, stops: [], next: 0, hold: 0, yaw: 0, pitch: -0.04, speed: 1.75, phase: 'move', rise: 0, feet: GY };
function buildTourCurve() {
  tour.curve = new THREE.CatmullRomCurve3(ROUTE.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal', 0.5);
  tour.len = tour.curve.getLength();
  const N = 4000, samples = tour.curve.getSpacedPoints(N);
  tour.stops = [];
  let from = 0;
  ROUTE.forEach(([x, z, id, tx, tz]) => {
    if (!id) return;
    const yaw = Math.atan2(-(tx - x), -(tz - z));
    let best = from, bd = 1e9;
    for (let i = from; i <= N; i++) { const p = samples[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } if (d < 1e-4) break; }
    tour.stops.push({ id, u: best / N, yaw }); from = best + 1;
  });
}
function stopInfo(id) { const s = STOP_INFO[id]; if (s) return s; const r = ROOMS.find((q) => q.id === id); return { name: r.name, area: r.area, line: r.line }; }
function tourStart() {
  if (!tour.curve) buildTourCurve();
  plc.unlock();
  mode = 'tour'; orbit.enabled = false; G.ceilG.visible = G.ceilB.visible = G.roof.visible = true; G.labels.visible = false; setLevel('G');
  scene.background = PANO[TIMES[timeKey].pano];
  Object.assign(tour, { active: true, paused: false, u: 0, next: 0, hold: 0, phase: 'move', feet: GY, rise: 0 });
  const p = tour.curve.getPointAt(0), q = tour.curve.getPointAt(0.004);
  tour.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z)); camY = GY + EYE;
  renderer.shadowMap.needsUpdate = true;
  document.dispatchEvent(new CustomEvent('tourmode', { detail: 'tour' }));
  document.dispatchEvent(new CustomEvent('tourstop', { detail: null }));
}
function tourStop(toWalk = true) {
  tour.active = false; document.dispatchEvent(new CustomEvent('tourstop', { detail: null }));
  if (toWalk) { player.x = camera.position.x; player.z = camera.position.z; player.feet = tour.feet; walkQ = camera.quaternion.clone(); mode = 'x'; setMode('walk'); }
}
function tourNext() {
  if (!tour.active || tour.phase === 'rise') return;
  if (tour.phase === 'hold') { tour.hold = 0; return; }
  if (tour.next < tour.stops.length) tour.u = Math.max(tour.u, tour.stops[tour.next].u - 0.003);
  else tour.u = 1;
}
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
function tourUpdate(dt) {
  if (tour.paused) return;
  if (tour.phase === 'rise') {
    tour.rise += dt / 4.5; const k = Math.min(1, tour.rise), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(tour.from, tour.to, e);
    camera.lookAt(new THREE.Vector3().lerpVectors(tour.lookFrom, new THREE.Vector3(5.2, 0, 9.5), e));
    if (k > 0.55 && !tour.showedG) { tour.showedG = true; setLevel('G'); renderer.shadowMap.needsUpdate = true; }
    if (k >= 1) { tour.active = false; dollLevel = 'G'; mode = 'x'; setMode('doll'); document.dispatchEvent(new CustomEvent('tourdone')); }
    return;
  }
  if (tour.phase === 'hold') {
    tour.hold -= dt;
    tour.yaw += angDiff(tour.yaw, tour.stops[tour.next].yaw) * Math.min(1, dt * 1.5);
    if (tour.hold <= 0) { tour.phase = 'move'; tour.next++; document.dispatchEvent(new CustomEvent('tourstop', { detail: null })); }
  } else {
    tour.u = Math.min(1, tour.u + tour.speed * dt / tour.len);
    const st = tour.stops[tour.next];
    if (st && tour.u >= st.u) {
      tour.u = st.u; tour.phase = 'hold'; tour.hold = st.id === 'stairs' ? 2.0 : 2.8;
      document.dispatchEvent(new CustomEvent('tourstop', { detail: { ...stopInfo(st.id), index: tour.next + 1, count: tour.stops.length } }));
    }
    const p = tour.curve.getPointAt(tour.u), q = tour.curve.getPointAt(Math.min(1, tour.u + 0.012));
    if (q.distanceTo(p) > 1e-4) {
      const want = Math.atan2(-(q.x - p.x), -(q.z - p.z)), d = angDiff(tour.yaw, want), maxRate = 0.85 * dt;   // עד ~50° בשנייה: בלי סיבובים חדים
      tour.yaw += Math.max(-maxRate, Math.min(maxRate, d * Math.min(1, dt * 2.2)));
    }
    if (tour.u >= 1) {
      tour.phase = 'rise'; tour.rise = 0; tour.showedG = false;
      tour.from = camera.position.clone(); tour.to = new THREE.Vector3(-2.5, 17, 25);
      tour.lookFrom = camera.position.clone().add(new THREE.Vector3(-Math.sin(tour.yaw), -0.2, -Math.cos(tour.yaw)));
      G.ceilG.visible = G.ceilB.visible = G.roof.visible = false; setLevel('B'); renderer.shadowMap.needsUpdate = true;
      document.dispatchEvent(new CustomEvent('tourstop', { detail: { name: 'כל הדירה', area: 250, line: 'קומת כניסה 151 מ״ר, מרתף 99 מ״ר וגינה פרטית 122 מ״ר.', index: 0, count: 0 } }));
      return;
    }
  }
  const p = tour.curve.getPointAt(tour.u);
  const h = surfaceAt(p.x, p.z, tour.feet); if (h !== null) tour.feet = h;
  camY += (tour.feet + EYE - camY) * Math.min(1, dt * 6);
  camera.position.set(p.x, camY, p.z);
  camera.quaternion.setFromEuler(new THREE.Euler(tour.pitch, tour.yaw, 0, 'YXZ'));
}

// ---------------------------------------------------------------- HUD
let lastRoom;
function currentRoom() {
  const x = camera.position.x, z = camera.position.z, feet = mode === 'tour' ? tour.feet : player.feet;
  if (stairH(x, z) !== null) return ROOMS.find((r) => r.id === 'stairs');
  const lvl = feet > -2 ? 'G' : 'B';
  return ROOMS.find((r) => r.lvl === lvl && r.rects.some((q) => inR(x, z, q))) || null;
}
function updateHud() {
  const r = mode === 'doll' ? null : currentRoom();
  if (r === lastRoom) return; lastRoom = r;
  document.dispatchEvent(new CustomEvent('tourroom', { detail: r ? {
    name: r.name, area: r.area ? fmtArea(r.area) + (r.note ? ` · ${r.note}` : '') : (r.note || ''),
    level: r.id === 'lobby' ? 'מחוץ לדירה' : r.lvl === 'B' ? 'קומת מרתף' : r.lvl === 'S' ? 'בין הקומות' : ['deck', 'garden'].includes(r.id) ? 'קומת כניסה · חוץ' : 'קומת כניסה',
  } : null }));
}

// ---------------------------------------------------------------- לולאה
const clock = new THREE.Clock(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
let fpsAcc = 0, fpsN = 0, lowered = false;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'walk') {
    const sp = (keys.run ? 3.0 : 1.5) * dt;
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); right.crossVectors(fwd, camera.up).normalize();
    let mx = 0, mz = 0;
    if (keys.f) { mx += fwd.x; mz += fwd.z; } if (keys.b) { mx -= fwd.x; mz -= fwd.z; }
    if (keys.r) { mx += right.x; mz += right.z; } if (keys.l) { mx -= right.x; mz -= right.z; }
    mx += fwd.x * -joy.y + right.x * joy.x; mz += fwd.z * -joy.y + right.z * joy.x;
    const len = Math.hypot(mx, mz);
    if (len > 0.02) { const k = Math.min(1, len); mx = mx / len * sp * k; mz = mz / len * sp * k; for (let i = 0; i < 4; i++) { tryMove(player.x + mx / 4, player.z); tryMove(player.x, player.z + mz / 4); } }
    camY += (player.feet + EYE - camY) * Math.min(1, dt * 10);
    camera.position.set(player.x, camY, player.z);
  } else if (mode === 'tour') tourUpdate(dt);
  else orbit.update();
  updateHud();
  document.dispatchEvent(new CustomEvent('tourheading', { detail: new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y }));
  renderer.render(scene, camera);
  // מכשיר איטי: מורידים רזולוציה פעם אחת
  fpsAcc += dt; fpsN++;
  if (fpsN === 90) { if (!lowered && fpsAcc / fpsN > 1 / 34) { lowered = true; renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() * 0.75)); } fpsAcc = 0; fpsN = 0; }
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------------------------------------------------------------- מדידה (בדיקת מידות מול התוכנית)
function measure(x1, x2, z1, z2, lvl) {
  const y = (lvl === 'B' ? BY : GY) + 0.5, rc = new THREE.Raycaster(), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const span = (axis) => {
    const side = [Infinity, Infinity];
    for (let i = 0; i <= 30; i++) {
      const t = 0.04 + 0.92 * i / 30, o = axis === 'x' ? new THREE.Vector3(cx, y, z1 + (z2 - z1) * t) : new THREE.Vector3(x1 + (x2 - x1) * t, y, cz);
      [1, -1].forEach((s, k) => { rc.set(o, axis === 'x' ? new THREE.Vector3(s, 0, 0) : new THREE.Vector3(0, 0, s)); rc.far = 30; const h = rc.intersectObjects(wallMeshes, false)[0]; if (h) side[k] = Math.min(side[k], h.distance); });
    }
    return Math.round((side[0] + side[1]) * 1000) / 1000;
  };
  return { x: span('x'), z: span('z') };
}

// ---------------------------------------------------------------- הפעלה
export async function start(onProgress = () => {}) {
  const list = { oak: IMG_OAK, herring: IMG_HERRING, plaster: IMG_PLASTER, stone: IMG_STONE, granite: IMG_GRANITE, walltiles: IMG_WALLTILES, linen: IMG_LINEN,
    velvet: IMG_VELVET, deck: IMG_DECK, pavers: IMG_PAVERS, walnut: IMG_WALNUT, rug: IMG_RUG, terrazzo: IMG_TERRAZZO };
  const photos = [PH1, PH2, PH3, PH4, PH5, PH6, PH7, PH8];
  const panos = { noon: PANO_NOON, sunset: PANO_SUNSET, night: PANO_NIGHT };
  const total = Object.keys(list).length + photos.length + 3; let done = 0;
  const tick = () => onProgress(++done / total);
  await Promise.all(Object.entries(list).map(async ([k, v]) => { IMG[k] = await loadImg(v); tick(); }));
  const phImgs = await Promise.all(photos.map(async (v) => { const i = await loadImg(v); tick(); return i; }));
  phImgs.forEach((im) => { const t = imgTex(im); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; PHOTO_M.push(new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); });
  await Promise.all(Object.entries(panos).map(async ([k, v]) => {
    const im = await loadImg(v); const t = new THREE.Texture(im); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
    PANO[k] = t; ENV[k] = pmrem.fromEquirectangular(t).texture; tick();
  }));
  // חומרים קבועים מטקסטורות אמיתיות
  M.bathFloor.map = imgTex(IMG.granite); M.bathWall.map = imgTex(IMG.walltiles); M.bathWall.map.repeat.set(SPAN / 1.27, SPAN / 1.27);
  M.facade.map = imgTex(IMG.stone); M.facade.map.repeat.set(SPAN / 1.5, SPAN / 1.5);
  M.pavers.map = imgTex(IMG.pavers); M.deck.map = imgTex(IMG.deck); M.deck.map.repeat.set(SPAN / 1.8, SPAN / 1.8);
  M.concrete.map = imgTex(IMG.terrazzo);
  [M.bathFloor, M.bathWall, M.facade, M.pavers, M.deck, M.concrete].forEach((m) => { m.needsUpdate = true; });
  applyStyle('modern');
  buildArchitecture();
  buildFurniture();
  ROOMS.forEach((r) => {
    if (!r.area || ['bhall', 'storage', 'service', 'hall', 'wc'].includes(r.id)) return;
    const sp = label(r.name, fmtArea(r.area)); sp.position.set(r.cx, (r.lvl === 'B' ? BY : GY) + 2.0, r.cz); sp.userData.lvl = r.lvl; G.labels.add(sp);
  });
  G.labels.visible = false;
  buildLampLights();
  [G.ground, G.base, G.out, G.roof, G.ceilG, G.ceilB, G.slab].forEach(mergeGroup);
  applyTime('sunset');
  frame();
  return {
    plc, setMode, setDollLevel, teleport, ROOMS, STYLES, TIMES,
    setStyle: applyStyle, setTime: applyTime, tourStart, tourStop, tourNext,
    tourPause: (p) => { tour.paused = p; }, get mode() { return mode; },
    setJoy: (x, y) => { joy.x = x; joy.y = y; },
  };
}
window.__tour = {
  measure, player, colliders, get tour() { return tour; }, ROUTE, setTime: (k) => applyTime(k), setStyle: (k) => applyStyle(k),
  goto: (x, z, yaw, lvl = 'G', pitch = -0.05) => { player.x = x; player.z = z; player.feet = lvl === 'B' ? BY : GY; camY = player.feet + EYE; walkQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')); if (mode !== 'walk') { mode = 'x'; setMode('walk'); } else { camera.quaternion.copy(walkQ); camera.position.set(x, camY, z); } },
  walk: (dx, dz, n = 60) => { for (let i = 0; i < n; i++) { tryMove(player.x + dx, player.z); tryMove(player.x, player.z + dz); } return { ...player }; },
  stuck: () => blocked(player.x, player.z, player.feet),
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }),
  tourInfo: () => { if (!tour.curve) buildTourCurve(); return { len: +tour.len.toFixed(1), stops: tour.stops.length, seconds: +(tour.len / tour.speed + tour.stops.length * 2.8 + 4.5).toFixed(1) }; },
  tourJump: (u) => { tour.u = u; },
  // בדיקת המסלול: נקודות שעוברות בתוך קיר או רהיט (רדיוס 12 ס"מ)
  tourClear: () => {
    if (!tour.curve) buildTourCurve();
    const bad = []; let feet = GY;
    for (let i = 0; i <= 1500; i++) {
      const p = tour.curve.getPointAt(i / 1500), h = surfaceAt(p.x, p.z, feet);
      if (h === null) { bad.push([i, +p.x.toFixed(2), +p.z.toFixed(2), 'nofloor']); continue; }
      feet = h;
      for (const b of colliders) {
        if (b.y1 >= feet + 1.8 || b.y2 <= feet + 0.35) continue;
        const cx = Math.max(b.x1, Math.min(p.x, b.x2)), cz = Math.max(b.z1, Math.min(p.z, b.z2));
        if ((p.x - cx) ** 2 + (p.z - cz) ** 2 < 0.12 * 0.12) { bad.push([i, +p.x.toFixed(2), +p.z.toFixed(2), +feet.toFixed(2), [b.x1, b.x2, b.z1, b.z2].map((v) => +v.toFixed(2))]); break; }
      }
    }
    return bad;
  },
};
window.__startTour = start;
