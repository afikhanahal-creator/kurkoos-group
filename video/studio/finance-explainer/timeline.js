// The explainer's clock. Every time in the video follows the narration: one sentence per part of the story.
// Used by the page (index.html) and by the sound mix (mix.cjs), so picture, voice and music can never drift apart.
//   timeline(texts, durations)   texts: { v01: 'the sentence', … }   durations: seconds per line from vo/*.wav (at the
//   narrator's own pace), or nothing, and then a line's length is estimated from its text (a silent draft).
// The story: v01 the promise · v02 the problem · v03 the answer · v04–v08 five things it does for you · v09 the name.
// v4 (2026-11-21): faster. The narrator runs at TEMPO (mix.cjs applies atempo=TEMPO, so a line lasts duration / TEMPO),
// the gaps are short, and every change of scene lands on a beat of the music (BPM): the music is cut to the same grid.
(function (root) {
  const TEMPO = 1.1                  // 10% quicker than the narrator's own pace: still natural, noticeably livelier
  const BPM = 120, BEAT = 60 / BPM   // the music's pulse; every scene starts on a beat
  const onBeat = (x) => Math.ceil(x / BEAT - 1e-6) * BEAT
  function timeline(texts, dur) {
    const d = (id) => (dur && dur[id] ? dur[id] / TEMPO : Math.max(2, String(texts[id] || '').length * 0.078))
    const T = { voice: [], v: {}, beat: BEAT, bpm: BPM, tempo: TEMPO }
    const say = (id, at) => { const e = { id, at: +at.toFixed(3), end: +(at + d(id)).toFixed(3) }; T.voice.push(e); T.v[id] = e; return e.end }
    let e = say('v01', 0.5); T.intro = { t0: 0, t1: onBeat(e + 0.2) }
    e = say('v02', T.intro.t1 + 0.25); T.problem = { t0: T.intro.t1, t1: onBeat(e + 0.25) }
    e = say('v03', T.problem.t1 + 0.3); T.answer = { t0: T.problem.t1, t1: onBeat(e + 0.3) }
    let t = T.answer.t1; T.features = []
    for (let k = 0; k < 5; k++) { const id = 'v0' + (4 + k); e = say(id, t + 0.4); const t1 = onBeat(e + 0.25); T.features.push({ id, t0: t, t1 }); t = t1 }
    e = say('v09', t + 0.45); T.outro = { t0: t, t1: e + 2.2 }
    T.final = onBeat(e - 0.1)        // the music's last chord, on the first beat after the last word
    T.duration = Math.ceil(Math.max(T.outro.t1, T.final + 2.0) * 10) / 10
    return T
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { timeline, TEMPO, BPM }; else { root.timeline = timeline; root.TEMPO = TEMPO }
})(typeof self !== 'undefined' ? self : this)
