#!/usr/bin/env node
// The film's sound: the narrator's lines at their places on the clock (timeline.js) over a quiet bed of pure tones.
//   node studio/finance-explainer/mix.cjs                 voice + bed  -> out/finance-explainer-sound.wav
//   node studio/finance-explainer/mix.cjs --no-voice      bed only     -> out/finance-explainer-bed.wav
//   node studio/finance-explainer/mix.cjs --partial       the lines that exist; the others stay silent (a preview)
// Voice lines: projects/finance-explainer/vo/v01.wav … (engine/kreel/tts_gemini.py, the group's narrator).
// It also writes out/finance-explainer-config.json = { durations }, the clock the renderer gets with --config, so
// picture and sound are cut from the same numbers.
// There are no sound effects, and the result is checked for white noise: a hiss anywhere fails the mix.
'use strict'
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process')
const ROOT = path.resolve(__dirname, '..', '..'), PROJECT = path.join(ROOT, 'projects', 'finance-explainer'), VO = path.join(PROJECT, 'vo')
const { timeline, TEMPO } = require('./timeline.js')
const has = (k) => process.argv.includes(k)
const OUT = path.join(ROOT, 'out'); fs.mkdirSync(OUT, { recursive: true })
const run = (cmd, args) => { const r = spawnSync(cmd, args, { stdio: 'inherit' }); if (r.status) process.exit(r.status || 1) }
const seconds = (f) => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString().trim()

// every line's length: measured when its file exists, estimated from its text otherwise
const script = JSON.parse(fs.readFileSync(path.join(PROJECT, 'script.json'), 'utf8'))
const durations = {}, made = [], missing = []
for (const l of script.lines) {
  const wav = path.join(VO, l.id + '.wav')
  if (fs.existsSync(wav)) { durations[l.id] = +seconds(wav).toFixed(3); made.push(l.id) } else { durations[l.id] = +Math.max(2, l.text.length * 0.078).toFixed(3); missing.push(l.id) }
}
if (missing.length && !has('--partial') && !has('--no-voice')) { console.error('missing voice lines: ' + missing.join(', ') + ' (use --partial for a preview)'); process.exit(1) }
fs.writeFileSync(path.join(OUT, 'finance-explainer-config.json'), JSON.stringify({ durations }))
const T = timeline({}, durations)

// the bed: pure tones only (bed.py), as long as the film
const bed = path.join(OUT, 'finance-explainer-bed-raw.wav')
run('python3', [path.join(__dirname, 'bed.py'), String(T.duration), bed])

const voice = has('--no-voice') ? [] : T.voice.filter((v) => made.includes(v.id))
const out = path.join(OUT, has('--no-voice') ? 'finance-explainer-bed.wav' : 'finance-explainer-sound.wav')
const inputs = ['-i', bed], f = []
voice.forEach((v, i) => { inputs.push('-i', path.join(VO, v.id + '.wav')); f.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,${TEMPO === 1 ? '' : `atempo=${TEMPO},`}afade=t=in:d=0.02,adelay=${Math.round(v.at * 1000)}:all=1[v${i}]`) })
if (voice.length) {
  f.push(`${voice.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voice.length}:normalize=0:duration=longest,apad=whole_dur=${T.duration},volume=1.6[voice]`)
  // the bed dips gently while the narrator speaks and comes back in the pauses: no jumps in level
  f.push('[voice]asplit=2[vo][key]', `[0:a]volume=0.5[bedq]`, '[bedq][key]sidechaincompress=threshold=0.02:ratio=5:attack=120:release=900:makeup=1[duck]', '[vo][duck]amix=inputs=2:normalize=0:duration=first[mix]')
} else f.push('[0:a]volume=0.9[mix]')
f.push(`[mix]loudnorm=I=-17:TP=-2:LRA=9,alimiter=limit=0.8,atrim=0:${T.duration},afade=t=out:st=${(T.duration - 2.5).toFixed(2)}:d=2.5[out]`)
run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', f.join(';'), '-map', '[out]', '-ar', '48000', out])
// the rule of this film: no white noise, not for a fraction of a second
run('python3', [path.join(ROOT, 'engine', 'kreel', 'vo_noise.py'), 'check', out])
console.log(JSON.stringify({ out, seconds: T.duration, voiced: voice.map((v) => v.id), missing, config: 'out/finance-explainer-config.json' }))
