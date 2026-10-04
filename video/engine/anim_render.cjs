#!/usr/bin/env node
// Shared renderer of the animation studio (skill: animation-studio).
//
//   node engine/anim_render.cjs studio/kinetic/index.html --stills            one frame per stage + a contact sheet
//   node engine/anim_render.cjs studio/kinetic/index.html --check             runs the page's own geometry check on every frame
//   node engine/anim_render.cjs studio/kinetic/index.html --preview -o a.mp4  half size, 30fps, no motion blur (test rounds)
//   node engine/anim_render.cjs studio/kinetic/index.html -o a.mp4            full render: 60fps, 4 sub-frames per frame
//   options: --config c.json (template inputs) --audio song.wav --fps 60 --sub 4 --from 0 --to 9 --png
//
// The page publishes window.STUDIO = {w, h, duration, stages:[{t,label}], seek(t), check?(t), ready} (studio/lib/studio.js).
// Every screenshot goes straight into ffmpeg (image2pipe at fps*sub), nothing is written to disk:
// tmix=frames=4 blends the sub-frames, select=eq(mod(n\,4)\,3) keeps the frame where all four were blended,
// setpts=N/(60*TB) gives a 60fps yuv420p MP4. The sub-frames sit around each frame across half its duration.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };

function args(argv) {
  const a = { page: null, out: null, stills: false, check: false, preview: false, fps: 60, sub: 4, from: null, to: null, config: null, audio: null, png: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '-o' || k === '--out') a.out = v(); else if (k === '--stills') a.stills = true; else if (k === '--check') a.check = true;
    else if (k === '--preview') a.preview = true; else if (k === '--fps') a.fps = +v(); else if (k === '--sub') a.sub = +v();
    else if (k === '--from') a.from = +v(); else if (k === '--to') a.to = +v(); else if (k === '--config') a.config = v();
    else if (k === '--audio') a.audio = v(); else if (k === '--png') a.png = true; else if (!a.page) a.page = k;
  }
  if (!a.page) { console.error('usage: anim_render.cjs <page.html> [--stills|--check|--preview] [-o out.mp4]'); process.exit(2); }
  if (a.preview) { a.fps = Math.min(a.fps, 30); a.sub = 1; }
  return a;
}

function serve(root) {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

function chrome() {
  if (process.env.KURKOOS_CHROME) return process.env.KURKOOS_CHROME;
  const c = ['/opt/pw-browsers'].filter(fs.existsSync).flatMap(d => fs.readdirSync(d).filter(x => /^chromium-\d+$/.test(x)).map(x => path.join(d, x, 'chrome-linux', 'chrome')));
  return c.find(fs.existsSync); // undefined: playwright-core uses its own lookup
}

async function open(a) {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright-core'));
  const server = await serve(ROOT);
  const rel = path.relative(ROOT, path.resolve(a.page)).split(path.sep).join('/');
  const cfg = a.config ? '?c=' + encodeURIComponent(JSON.stringify(JSON.parse(fs.readFileSync(a.config, 'utf8')))) : '';
  const browser = await chromium.launch({ executablePath: chrome(), args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text', '--enable-gpu-rasterization', '--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/${rel}${cfg}`);
  await page.waitForFunction(() => window.STUDIO && window.STUDIO.ready, null, { timeout: 30000 });
  await page.evaluate(() => window.STUDIO.ready);
  const spec = await page.evaluate(() => ({ w: STUDIO.w, h: STUDIO.h, duration: STUDIO.duration, stages: STUDIO.stages || [], hasCheck: typeof STUDIO.check === 'function' }));
  const scale = a.preview ? 0.5 : 1;
  await page.setViewportSize({ width: spec.w, height: spec.h });
  const cdp = await page.context().newCDPSession(page);
  if (scale !== 1) await cdp.send('Emulation.setDeviceMetricsOverride', { width: spec.w, height: spec.h, deviceScaleFactor: scale, mobile: false });
  const seek = t => page.evaluate(t => window.STUDIO.seek(t), t);
  const shot = async (png) => Buffer.from((await cdp.send('Page.captureScreenshot', png ? { format: 'png', optimizeForSpeed: true } : { format: 'jpeg', quality: 95, optimizeForSpeed: true })).data, 'base64');
  const close = async () => { await browser.close(); server.close(); };
  return { page, spec, seek, shot, close, errors, scale };
}

function stem(a) { return a.out ? a.out.replace(/\.mp4$/i, '') : path.resolve(a.page).replace(/\/index\.html$/, '').replace(/\.html$/, '') + '-out'; }

async function stills(a, s) {
  const dir = stem(a) + '-stills'; fs.mkdirSync(dir, { recursive: true });
  const st = s.spec.stages.length ? s.spec.stages : [0, .25, .5, .75, .98].map(k => ({ t: k * s.spec.duration, label: '' }));
  const files = [];
  for (let i = 0; i < st.length; i++) {
    await s.seek(st[i].t); const f = path.join(dir, `stage-${String(i + 1).padStart(2, '0')}.png`);
    fs.writeFileSync(f, await s.shot(true)); files.push({ file: f, t: st[i].t, label: st[i].label });
  }
  // contact sheet, one row, each still 360px wide
  const sheet = path.join(dir, 'sheet.png');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-pattern_type', 'glob', '-i', path.join(dir, 'stage-*.png'), '-vf', `scale=360:-2,tile=${Math.min(files.length, 8)}x${Math.ceil(files.length / 8)}:padding=8:color=0x808080`, '-frames:v', '1', sheet]);
  return { stills: files, sheet: r.status === 0 ? sheet : null };
}

async function check(a, s) {
  if (!s.spec.hasCheck) return { check: 'the page has no check(t)' };
  const fps = 30, n = Math.round(s.spec.duration * fps), issues = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.min(i / fps, s.spec.duration);
    const r = await s.page.evaluate(async t => { await STUDIO.seek(t); return STUDIO.check(t); }, t);
    for (const x of r || []) issues.push({ t: +t.toFixed(3), issue: x });
  }
  const byKind = {}; issues.forEach(x => { byKind[x.issue] = (byKind[x.issue] || []); if (byKind[x.issue].length < 6) byKind[x.issue].push(x.t); });
  return { frames_checked: n + 1, issues: issues.length, first_times_by_issue: byKind };
}

async function render(a, s) {
  const out = a.out || stem(a) + '.mp4', F = a.fps, S = a.sub, D = s.spec.duration;
  const t0 = a.from != null ? a.from : 0, t1 = a.to != null ? Math.min(a.to, D) : D;
  const N = Math.round((t1 - t0) * F), span = 0.5 / F;
  const vf = S > 1 ? `tmix=frames=${S},select='eq(mod(n\\,${S})\\,${S - 1})',setpts=N/(${F}*TB),format=yuv420p` : `setpts=N/(${F}*TB),format=yuv420p`;
  const ff = ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(F * S), '-c:v', a.png ? 'png' : 'mjpeg', '-i', '-'];
  if (a.audio) ff.push('-ss', String(t0), '-i', a.audio);
  ff.push('-vf', vf, '-r', String(F), '-c:v', 'libx264', '-crf', a.preview ? '23' : '16', '-preset', a.preview ? 'veryfast' : 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (a.audio) ff.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push(out);
  const p = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const write = b => new Promise(r => p.stdin.write(b) ? r() : p.stdin.once('drain', r));
  const start = Date.now();
  for (let n = 0; n < N; n++) {
    const tc = t0 + n / F;
    for (let k = 0; k < S; k++) {
      const t = S > 1 ? Math.min(D, Math.max(0, tc + (k / (S - 1) - 0.5) * span)) : tc;
      await s.seek(t); await write(await s.shot(a.png));
    }
    if (n % F === 0) process.stderr.write(`\r${(tc).toFixed(1)}s / ${t1.toFixed(1)}s`);
  }
  p.stdin.end(); const code = await new Promise(r => p.on('close', r));
  process.stderr.write('\n');
  if (code) throw new Error('ffmpeg exited ' + code);
  return { output: path.resolve(out), frames: N, fps: F, sub_frames: S, seconds_to_render: +((Date.now() - start) / 1000).toFixed(1), probe: probe(out), flashes: flashes(out, F) };
}

function probe(f) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt,r_frame_rate,nb_frames:format=duration', '-of', 'json', f]);
  try { const j = JSON.parse(r.stdout); return Object.assign({}, j.streams[0], { duration: +j.format.duration }); } catch (e) { return null; }
}
// Flash limit, measured: mean luma per frame; a jump above 2% in one frame counts as a flash. More than 3 in any second is reported.
function flashes(f, F) {
  const r = spawnSync('ffmpeg', ['-v', 'info', '-i', f, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const y = [...(r.stderr || '').matchAll(/YAVG=([\d.]+)/g)].map(m => +m[1]);
  // consecutive jumping frames are one event (a cut blended by tmix spans two frames, a wipe several)
  const ev = []; for (let i = 1; i < y.length; i++) if (Math.abs(y[i] - y[i - 1]) > 255 * 0.02 && !(ev.length && ev[ev.length - 1].end === i - 1)) ev.push({ start: i, end: i }); else if (ev.length && ev[ev.length - 1].end === i - 1 && Math.abs(y[i] - y[i - 1]) > 255 * 0.02) ev[ev.length - 1].end = i;
  let worst = 0; for (const e of ev) worst = Math.max(worst, ev.filter(x => x.start >= e.start && x.start < e.start + F).length);
  return { events: ev.length, at_seconds: ev.map(e => +(e.start / F).toFixed(2)), worst_per_second: worst, ok: worst <= 3 };
}

(async () => {
  const a = args(process.argv.slice(2));
  const s = await open(a);
  const rep = { page: a.page, size: `${s.spec.w}x${s.spec.h}`, duration: s.spec.duration };
  try {
    if (a.stills) Object.assign(rep, await stills(a, s));
    if (a.check) Object.assign(rep, { check: await check(a, s) });
    if (!a.stills && !a.check) Object.assign(rep, await render(a, s));
  } finally { await s.close(); }
  if (s.errors.length) rep.page_errors = s.errors.slice(0, 5);
  console.log(JSON.stringify(rep, null, 1));
})().catch(e => { console.error(e.stack || String(e)); process.exit(1); });
