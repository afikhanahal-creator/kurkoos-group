"""Cinematic corporate bed for a Kurkoos reel, with sound effects placed from the project file.
python3 video/engine/kreel/music.py video/projects/<name>/project.json  -> out/music.wav (48 kHz stereo)

Bed: low string pad (Am F C G), an eighth-note pulse, a piano pluck motif, kick and clap that enter after the hook.
Effects (from the scenes): whoosh into every shot, a low impact on every chapter slam and scene start, a tick per
inspection mark, a soft key click per typed character in the chat, a thud on the stamp, a chord on the end card.
Everything is synthesised here, so no licence is needed."""
import os, sys, json, wave
import numpy as np
SR = 48000
pj = json.load(open(sys.argv[1], encoding='utf-8')); OUT = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'out')
D = pj['duration']; BPM = pj.get('music', {}).get('bpm', 108); B = 60 / BPM
n = int(SR * (D + .4)); L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(7)
def add(sig, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i >= n or i < 0: return
    j = min(n, i + len(sig)); s = sig[:j - i] * g
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))
def env(d, a=.003, r=.2): k = np.arange(int(SR * d)) / SR; return np.minimum(1, k / a) * np.exp(-k / r)
def lp(x, a=.08):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
f = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
end_at = pj['scenes'][-1]['start']
# pad: detuned saws, slowly opened low-pass
bars = int(D / (4 * B)) + 1
for b in range(bars):
    t0 = b * 4 * B; ch = prog[b % 4]; d = 4 * B; k = np.arange(int(SR * d)) / SR
    saw = sum(((k * f(m) * det) % 1 * 2 - 1) for m in ch for det in (1, 1.004)) / 6
    pad = np.convolve(saw, np.ones(40) / 40, 'same') * np.minimum(1, k / .4) * np.minimum(1, (d - k) / .4)
    add(pad, t0, .12 + .05 * min(1, t0 / 8))
    # sub pulse on eighths
    for q in range(8):
        bt = t0 + q * B / 2
        if bt >= end_at: break
        kk = np.arange(int(SR * B * .45)) / SR
        add(np.sin(2 * np.pi * f(ch[0] - 24) * kk) * env(B * .45, .004, .09), bt, .32)
    # pluck motif
    for q, m in enumerate([ch[2] + 12, ch[1] + 12, ch[0] + 12, ch[1] + 12]):
        bt = t0 + q * B
        if bt >= end_at: break
        kk = np.arange(int(SR * .5)) / SR
        add((np.sin(2 * np.pi * f(m) * kk) + .3 * np.sin(4 * np.pi * f(m) * kk)) * env(.5, .002, .16), bt, .08, .2 if q % 2 else -.2)
    # drums after the hook
    for q in range(4):
        bt = t0 + q * B
        if bt < 3.8 or bt >= end_at: continue
        kk = np.arange(int(SR * .35)) / SR
        add(np.sin(2 * np.pi * np.cumsum(46 + 90 * np.exp(-kk / .03)) / SR) * env(.35, .001, .11), bt, .7)
        if q in (1, 3): add(np.convolve(rng.standard_normal(int(SR * .2)), np.ones(5) / 5, 'same') * env(.2, .001, .05), bt, .18)
        add(np.diff(rng.standard_normal(int(SR * .04)), prepend=0) * env(.04, .001, .012), bt + B / 2, .1, .3)
# effects from the scenes
def whoosh(at, g=.35):
    k = np.arange(int(SR * .3)) / SR; w = np.convolve(rng.standard_normal(len(k)), np.ones(30) / 30, 'same') * np.sin(np.pi * k / .3) ** 2; add(w, at - .2, g)
def impact(at, g=.8):
    k = np.arange(int(SR * 1.2)) / SR
    add(np.sin(2 * np.pi * 40 * k) * env(1.2, .002, .35) + .25 * np.convolve(rng.standard_normal(len(k)), np.ones(12) / 12, 'same') * env(1.2, .001, .08), at, g)
def tick(at, g=.25, p=0):
    k = np.arange(int(SR * .06)) / SR; add(np.sin(2 * np.pi * 2200 * k) * env(.06, .0005, .012), at, g, p)
def key(at): add(np.diff(rng.standard_normal(int(SR * .012)), prepend=0) * env(.012, .0003, .003), at, .12, .1)
def thud(at): k = np.arange(int(SR * .4)) / SR; add(np.sin(2 * np.pi * 70 * k) * env(.4, .001, .07), at, .6)
for sc in pj['scenes']:
    s0, s1 = sc['start'], sc['end']; durs = [sh.get('len', sh.get('dur', 1.0)) for sh in sc['shots']]
    scale = (s1 - s0) / max(1e-6, sum(durs)); acc = s0
    if s0 > .1: whoosh(s0, .45)
    for d in durs[:-1]:
        acc += d * scale; whoosh(acc, .28)
    for e in sc.get('effects', []):
        at = s0 + e.get('at', 0); ty = e['type']
        if ty == 'chapter': impact(at, .9)
        elif ty == 'checks':
            for i, _ in enumerate(e['points']): tick(at + i * e.get('stagger', .22) + .15, .28, (-.3 if i % 2 else .3))
        elif ty == 'checklist':
            for i, _ in enumerate(e['items']): tick(at + .25 + i * e.get('stagger', .28) + .1, .22)
        elif ty in ('stamp',): thud(at)
        elif ty == 'invoice' and e.get('stamp_at') is not None: thud(at + e['stamp_at'] + .05)
        elif ty == 'freeze': impact(at, .45)
        elif ty == 'chat':
            T = e.get('dur', 1.5); m = len(e['prompt'])
            for i in range(0, m, 2): key(at + .3 + (T * .37) * i / m)
            k = np.arange(int(SR * .12)) / SR; add(np.sin(2 * np.pi * (600 + 900 * k / .12) * k) * env(.12, .002, .05), at + .8, .3)
            tick(at + T - .05, .3)
        elif ty == 'endcard':
            k = np.arange(int(SR * 2.4)) / SR
            add(sum(np.sin(2 * np.pi * f(m) * k) for m in (45, 57, 64, 69)) / 4 * env(2.4, .01, 1.1), at, .45); impact(at, .6)
mix = np.stack([L, R], 1); mix /= max(1e-9, np.abs(mix).max()) / .89
fd = int(SR * .5); mix[-fd:] *= np.linspace(1, 0, fd)[:, None]
os.makedirs(OUT, exist_ok=True)
with wave.open(os.path.join(OUT, 'music.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('music.wav', round(len(mix) / SR, 2), 's')
