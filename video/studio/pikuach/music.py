"""Original track for the "פיקוח" reel, synthesized in code (no samples). 118 BPM, D minor, steady and confident:
a warm pad, kick on the beat, off-beat hats, a plucked arpeggio on every scene (an inspector ticking items off), a low hit plus a short riser into every cut
(the cuts come from voice/timings.js, so the music follows the voice), and an open chord on the end card.
Leaves the mid range free for the voice.
    python3 video/studio/pikuach/music.py  ->  video/studio/pikuach/music.wav"""
import json, os, re, wave
import numpy as np
H = os.path.dirname(os.path.abspath(__file__))
VT = json.loads(re.search(r'window\.VT=(.*);', open(os.path.join(H, 'voice/timings.js'), encoding='utf8').read()).group(1))
COVER = VT.get('cover', 0)
CUT = [COVER] + [max(0, x['a'] - .18) for x in VT['lines'][1:]]
END = CUT[-1]; DUR = round(VT['voice'] + 1.1, 2)
SR, BPM = 48000, 118; B = 60 / BPM; n = int(SR * DUR)
L, R = np.zeros(n), np.zeros(n); rng = np.random.default_rng(71)
T = lambda d: np.arange(int(SR * d)) / SR
f = lambda m: 440 * 2 ** ((m - 69) / 12)
def env(d, a=.005, r=.3): k = T(d); return np.minimum(1, k / a) * np.exp(-k / r)
def add(sig, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i >= n or i < 0: return
    j = min(n, i + len(sig)); s = sig[:j - i] * g
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))
def kick(): k = T(.45); return np.sin(2 * np.pi * (44 + 95 * np.exp(-k / .03)) * k) * env(.45, .002, .14)
def hat(): x = np.diff(np.diff(rng.standard_normal(int(SR * .05)), prepend=0), prepend=0); return x * env(.05, .0005, .012)
def pad(notes, d):
    k = T(d); s = sum(np.sin(2 * np.pi * f(m) * k + .3 * np.sin(2 * np.pi * .23 * k + i)) + .3 * np.sin(2 * np.pi * f(m) * 2.003 * k) for i, m in enumerate(notes))
    return s * np.minimum(1, k / .8) * np.minimum(1, (d - k) / .8) / len(notes)
def boom(d=1.4):
    k = T(d); sub = np.sin(2 * np.pi * (38 + 55 * np.exp(-k / .08)) * k) * np.exp(-k / .45)
    nz = np.convolve(rng.standard_normal(len(k)), np.ones(60) / 60, 'same') * np.exp(-k / .15); return np.tanh(1.4 * sub) + .7 * nz
def riser(d=.45): k = T(d); x = np.convolve(rng.standard_normal(len(k)), np.ones(5) / 5, 'same'); return x * (k / d) ** 2.2 * .5
def pluck(m, d=.5): k = T(d); return (np.sin(2 * np.pi * f(m) * k) + .25 * np.sin(2 * np.pi * f(m) * 3 * k)) * env(d, .002, .12)
def bell(m, d=2.5): k = T(d); return (np.sin(2 * np.pi * f(m) * k) + .4 * np.sin(2 * np.pi * f(m) * 2.76 * k) * np.exp(-k / .3)) * env(d, .003, .9)
CH = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 48, 53, 57], [48, 55, 60, 64]]   # Dm Bb F C
t, i = 0.0, 0
while t < END: add(pad(CH[i % 4], 8 * B + .8), t, .15); t += 8 * B; i += 1
add(pad([50, 57, 62, 65, 69], DUR - END), END, .2)
for b in range(int(END / B)):
    at = b * B; root = CH[int(at / (8 * B)) % 4][0] - 12
    if b % 2 == 0: k = T(B * .9); add(np.tanh(1.2 * np.sin(2 * np.pi * f(root) * k)) * env(B * .9, .01, .3), at, .2)
    if at >= CUT[1] - .01: add(kick(), at, .5)
    add(hat(), at + B / 2, .14, .3 if b % 2 else -.3)
for c in CUT[1:]: add(boom(), c - .01, .32); add(riser(), c - .45, .45)
if COVER: add(boom(), COVER - .01, .36); add(riser(), COVER - .45, .4)   # the hit out of the cover into the hook
for i, c in enumerate(CUT[:-1]):
    ch = CH[int(c / (8 * B)) % 4]
    for j in range(3): add(pluck(ch[(j + i) % 4] + 12), c + .2 + j * B / 2, .16, -.25 + .25 * j)
add(bell(74, 3.0), END + .05, .3); add(bell(81, 2.6), END + .3, .22, .3)
mix = np.stack([L, R], 1); mix *= np.minimum(1, (DUR - np.arange(n) / SR) / 1.0)[:, None]
mix /= max(1e-9, np.abs(mix).max()) / .8
with wave.open(os.path.join(H, 'music.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('music.wav', DUR, 's')
