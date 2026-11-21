// The explainer's clock. Every time in the video follows the narration: a line of voice, a short breath, the next line.
// Used by the page (index.html) and by the sound mix (mix.cjs), so picture and voice can never drift apart.
//   timeline(texts, durations)   texts: { v01: 'the sentence', … }   durations: seconds per line from vo/durations.json,
//   or nothing, and then a line's length is estimated from its text (the silent version).
(function (root) {
  // the narrator is played a touch faster (the owner asked for a quicker video); the mix applies the same factor
  const TEMPO = 1.08
  function timeline(texts, dur) {
    const d = (id) => (dur && dur[id] ? dur[id] / TEMPO : Math.max(1.5, String(texts[id] || '').length * 0.072))
    const T = { voice: [] }
    const say = (id, at) => { T.voice.push({ id, at: +at.toFixed(3), end: +(at + d(id)).toFixed(3) }); return at + d(id) }
    let e = say('v01', 0.5); T.intro = { t0: 0, t1: e + 0.45 }
    T.flow = { t0: T.intro.t1 }; e = say('v02', T.flow.t0 + 0.35); T.flow.hub = e + 0.15; e = say('v03', e + 0.3); T.flow.t1 = e + 0.45
    let t = T.flow.t1; T.scenes = []
    for (let s = 0; s < 5; s++) {
      const sc = { t0: t, items: [] }; let a = t + 0.7   // 0.7 s to see the whole screen before the first line
      for (let k = 0; k < 3; k++) { const id = 'v' + String(4 + s * 3 + k).padStart(2, '0'); const end = say(id, a + 0.15); sc.items.push({ id, a, b: end + 0.18 }); a = end + 0.18 }
      sc.t1 = a + 0.2; t = sc.t1; T.scenes.push(sc)
    }
    T.outro = { t0: t }; e = say('v19', t + 0.6); T.outro.t1 = Math.max(e + 2.2, t + 5.2)
    T.duration = Math.ceil(T.outro.t1 * 10) / 10
    return T
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { timeline, TEMPO }; else root.timeline = timeline
})(typeof self !== 'undefined' ? self : this)
