// The explainer's clock. Every time in the video follows the narration: one sentence per part of the story.
// Used by the page (index.html) and by the sound mix (mix.cjs), so picture and voice can never drift apart.
//   timeline(texts, durations)   texts: { v01: 'the sentence', … }   durations: seconds per line from vo/durations.json,
//   or nothing, and then a line's length is estimated from its text (a silent draft).
// The story: v01 the promise · v02 the problem · v03 the answer · v04–v08 five things it does for you · v09 the name.
(function (root) {
  const TEMPO = 1   // the narrator at his own pace: quick enough, and every screen gets its time
  function timeline(texts, dur) {
    const d = (id) => (dur && dur[id] ? dur[id] / TEMPO : Math.max(2, String(texts[id] || '').length * 0.078))
    const T = { voice: [], v: {} }
    const say = (id, at) => { const e = { id, at: +at.toFixed(3), end: +(at + d(id)).toFixed(3) }; T.voice.push(e); T.v[id] = e; return e.end }
    let e = say('v01', 0.7); T.intro = { t0: 0, t1: e + 0.6 }
    e = say('v02', T.intro.t1 + 0.5); T.problem = { t0: T.intro.t1, t1: e + 0.5 }
    e = say('v03', T.problem.t1 + 0.6); T.answer = { t0: T.problem.t1, t1: e + 0.7 }
    let t = T.answer.t1; T.features = []
    for (let k = 0; k < 5; k++) { const id = 'v0' + (4 + k); e = say(id, t + 0.8); T.features.push({ id, t0: t, t1: e + 0.7 }); t = e + 0.7 }
    e = say('v09', t + 0.9); T.outro = { t0: t, t1: e + 2.4 }
    T.duration = Math.ceil(T.outro.t1 * 10) / 10
    return T
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { timeline, TEMPO }; else root.timeline = timeline
})(typeof self !== 'undefined' ? self : this)
