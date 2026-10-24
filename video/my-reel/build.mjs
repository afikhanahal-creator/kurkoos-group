#!/usr/bin/env node
/* plan.json -> index.html
   Layers (bottom to top): source video, "behind", speaker cutout (frame-synced with the source), "front", titles.
   One paused GSAP timeline registered as window.__timelines["main"]; effects come from effects/fx.js.
   usage: node build.mjs [plan.json] [-o index.html] */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const planPath = resolve(here, args.find((a) => !a.startsWith('-')) || 'plan.json');
const outPath = resolve(here, args.includes('-o') ? args[args.indexOf('-o') + 1] : 'index.html');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const catalog = JSON.parse(readFileSync(resolve(here, 'effects/catalog.json'), 'utf8'));
const byId = Object.fromEntries(catalog.effects.map((e) => [e.id, e]));

// transcript: {words:[{word,start,end}]} or {segments:[{words:[...]}]}
let words = [];
const tPath = resolve(here, plan.transcript || 'transcript.json');
if (existsSync(tPath)) {
  const t = JSON.parse(readFileSync(tPath, 'utf8'));
  words = t.words || (t.segments || []).flatMap((s) => s.words || []);
  words = words.map((w) => ({ word: String(w.word || w.text || '').trim(), start: +w.start, end: +w.end })).filter((w) => w.word);
}
const norm = (s) => String(s).replace(/[\s"'״׳.,!?:;()\-]+/g, '');
function wordTime(spec) {
  if (spec.at != null) return +spec.at;
  if (!spec.word) throw new Error(`effect ${spec.id}: needs "word" or "at"`);
  const after = +spec.after || 0;
  const hit = words.find((w) => w.start >= after && norm(w.word) === norm(spec.word));
  if (!hit) throw new Error(`effect ${spec.id}: word "${spec.word}" not found in transcript after ${after}s`);
  return hit.start;
}

const dur = +plan.duration;
if (!dur) throw new Error('plan.duration (seconds) is required');
const fps = +plan.fps || 30;
const accent = plan.accent || catalog.accent;
const titles = plan.titles !== false;
const rules = catalog.rules;

// resolve, sort, clamp each effect so it exits before the next one starts (style.md)
const fx = (plan.effects || []).map((spec, i) => {
  const def = byId[spec.id];
  if (!def) throw new Error(`unknown effect "${spec.id}" (see effects/catalog.json)`);
  const t = wordTime(spec);
  return { n: def.n, id: spec.id, name: def.name, layer: def.layer, t, dur: Math.min(+spec.dur || def.dur, rules.maxDuration), params: Object.assign({}, def.params, spec.params || {}), i };
}).sort((a, b) => a.t - b.t);
for (let i = 0; i < fx.length; i++) {
  const next = fx[i + 1];
  if (next && fx[i].t + fx[i].dur > next.t) fx[i].dur = Math.max(rules.enter + rules.exit + 0.1, next.t - fx[i].t - 0.05);
  if (fx[i].t + fx[i].dur > dur) fx[i].dur = Math.max(0.3, dur - fx[i].t);
}
const warnings = [];
for (const f of fx) {
  if (f.t + f.dur > dur + 1e-6) warnings.push(`${f.id}@${f.t}: runs past the end`);
  if (f.dur < rules.enter + rules.exit) warnings.push(`${f.id}@${f.t}: only ${f.dur.toFixed(2)}s before the next effect`);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const debug = !!plan.debug;
const html = `<!doctype html>
<html lang="he" dir="rtl" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="vendor/gsap.min.js"></script>
    <link rel="stylesheet" href="effects/fx.css" />
    <style>
      @font-face { font-family: 'Heebo'; src: url('assets/fonts/Heebo.ttf') format('truetype'); font-weight: 100 900; font-style: normal; font-display: block; }
      :root { --accent: ${accent}; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: 'Heebo', sans-serif; }
      #frame { position: absolute; inset: 0; transform-origin: 50% 40%; }
      #frame > video, .layer { position: absolute; inset: 0; width: 100%; height: 100%; }
      #frame > video { object-fit: cover; }
      #src { z-index: 1; ${debug ? 'filter: grayscale(1) brightness(.55);' : ''} }
      #behind { z-index: 2; }
      #cutout { z-index: 3; background: transparent; }
      #front { z-index: 4; }
      #titles { z-index: 5; }
      .layer { pointer-events: none; }
      ${debug ? '#dbg { position:absolute; left:0; right:0; top:22%; height:26%; background: rgba(255,122,61,.75); }' : ''}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1080" data-height="1920" data-fps="${fps}">
      <div id="frame">
        <video id="src" class="clip" src="${esc(plan.source || 'assets/video.mp4')}" data-start="0" data-duration="${dur}" data-media-start="${+plan.mediaStart || 0}" data-has-audio="true" data-track-index="0" playsinline preload="auto"></video>
        <div id="behind" class="layer">${debug ? '<div id="dbg"></div>' : ''}</div>
        <video id="cutout" class="clip" src="${esc(plan.cutout || 'assets/cutout.webm')}" data-start="0" data-duration="${dur}" data-media-start="${+plan.mediaStart || 0}" data-track-index="1" muted playsinline preload="auto"></video>
      </div>
      <div id="front" class="layer"></div>
      <div id="titles" class="layer"></div>
    </div>
    <script src="effects/fx.js"></script>
    <script>
      window.__REEL_STYLE = { accent: ${JSON.stringify(accent)} };
      const PLAN = ${JSON.stringify({ duration: dur, titles, effects: fx.map(({ n, id, name, layer, t, dur, params }) => ({ n, id, name, layer, t, dur, params })) })};
      const tl = gsap.timeline({ paused: true });
      const ctx = { frame: document.getElementById('frame'), n: 0 };
      tl.set({}, {}, PLAN.duration); // the timeline spans the whole film
      for (const f of PLAN.effects) {
        ctx.n = f.n;
        if (PLAN.titles && f.id !== 'title') FX14.title(tl, Math.max(0, f.t - 0.15), { n: f.n, text: f.name, dur: f.dur + 0.15 }, ctx);
        FX14[f.id](tl, f.t, Object.assign({ dur: f.dur, n: f.n }, f.params), ctx);
      }
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(outPath, html);
console.log(`wrote ${outPath}: ${dur}s, ${fx.length} effects${titles ? ' with titles' : ''}${debug ? ' [debug layers]' : ''}`);
for (const f of fx) console.log(`  ${String(f.n).padStart(2, '0')} ${f.id.padEnd(9)} at ${f.t.toFixed(2)}s for ${f.dur.toFixed(2)}s  ${f.layer}`);
for (const w of warnings) console.warn('  ! ' + w);
