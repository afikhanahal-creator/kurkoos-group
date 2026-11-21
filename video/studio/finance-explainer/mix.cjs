#!/usr/bin/env node
// The explainer's sound: every voice line at its place on the clock (timeline.js), over a quiet bed if one is given.
//   node studio/finance-explainer/mix.cjs [--music bed.wav] -o out/finance-explainer-voice.wav
// Voice lines: projects/finance-explainer/vo/v01.wav … (made by engine/kreel/tts_gemini.py, the group's narrator).
// Prints the config for the renderer (out/finance-explainer-config.json = { durations }), so picture and voice share one clock.
'use strict'
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process')
const ROOT = path.resolve(__dirname, '..', '..'), VO = path.join(ROOT, 'projects', 'finance-explainer', 'vo')
const { timeline, TEMPO } = require('./timeline.js')
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const out = path.resolve(arg('-o') || path.join(ROOT, 'out', 'finance-explainer-voice.wav')), music = arg('--music')
const durations = JSON.parse(fs.readFileSync(path.join(VO, 'durations.json'), 'utf8'))
const T = timeline({}, durations)
const missing = T.voice.filter((v) => !fs.existsSync(path.join(VO, v.id + '.wav')) || !durations[v.id])
// --partial: a preview while some lines are not made yet (they stay silent, the picture keeps their estimated length)
if (missing.length && !process.argv.includes('--partial')) { console.error('missing voice lines: ' + missing.map((v) => v.id).join(', ')); process.exit(1) }
T.voice = T.voice.filter((v) => !missing.includes(v))
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(path.join(path.dirname(out), 'finance-explainer-config.json'), JSON.stringify({ durations }))
const inputs = [], filters = []
T.voice.forEach((v, i) => { inputs.push('-i', path.join(VO, v.id + '.wav')); filters.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atempo=${TEMPO},adelay=${Math.round(v.at * 1000)}:all=1[v${i}]`) })
const n = T.voice.length
filters.push(`${T.voice.map((_, i) => `[v${i}]`).join('')}amix=inputs=${n}:normalize=0:duration=longest,apad=whole_dur=${T.duration}[voice]`)
if (music) {
  inputs.push('-i', path.resolve(music))
  // the bed sits well under the voice and dips further while someone speaks; it fades out with the picture
  filters.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=0:${T.duration},volume=0.32,afade=t=in:d=1.2,afade=t=out:st=${(T.duration - 2).toFixed(2)}:d=2[bed]`)
  filters.push('[voice]asplit=2[vo][key]', '[bed][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=420[duck]', '[vo][duck]amix=inputs=2:normalize=0:duration=first[mix]')
} else filters.push('[voice]anull[mix]')
filters.push(`[mix]loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:${T.duration}[out]`)
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ar', '48000', out], { stdio: 'inherit' })
if (r.status) process.exit(r.status)
console.log(JSON.stringify({ out, seconds: T.duration, lines: n, music: !!music, first: T.voice[0], last: T.voice[n - 1] }, null, 1))
