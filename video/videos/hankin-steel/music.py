"""Original track for the Hankin 41 steel works reel, synthesized in code (no third-party samples, no vocals).
Same engine as the Szold reel: 128 BPM, E phrygian, industrial: metal clangs like rebar strikes, distorted sub bass with
sidechain, riser into the drop, an impact on every text slam, a hit on the render card and a final hit on the logo card,
all on the same grid as the cuts (plan.py). python3 music.py"""
import numpy as np, wave
from plan import schedule, B
shots, END, END2, TOTAL = schedule()
SR = 48000; DUR = TOTAL + 1.2; n = int(SR * DUR)
L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(41)
def add(sig, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i >= n or i < 0: return
    j = min(n, i + len(sig)); s = sig[:j - i] * g
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))
def env(d, a=.002, r=.2): k = np.arange(int(SR * d)) / SR; return np.minimum(1, k / a) * np.exp(-k / r)
T = lambda d: np.arange(int(SR * d)) / SR
f = lambda m: 440 * 2 ** ((m - 69) / 12)
def kick():
    k = T(.42); return np.tanh(1.6 * np.sin(2 * np.pi * (44 + 140 * np.exp(-k / .03)) * k)) * env(.42, .001, .14)
def clap():
    x = rng.standard_normal(int(SR * .2)); x = np.convolve(x, np.ones(3) / 3, 'same')
    e = sum(env(.2, .001, .012) * (np.arange(len(x)) >= int(SR * o)) for o in (0, .011, .022)) + env(.2, .001, .06)
    return x * e * .6
def metal(freq=310, d=.5, r=.18):  # FM clang: inharmonic, like a rebar strike
    k = T(d); mod = np.sin(2 * np.pi * freq * 1.41 * k) * 4.5 * np.exp(-k / .08)
    return (np.sin(2 * np.pi * freq * k + mod) + .5 * np.sin(2 * np.pi * freq * 2.76 * k)) * env(d, .001, r)
def tick(): x = np.diff(rng.standard_normal(int(SR * .03)), prepend=0); return x * env(.03, .0005, .008)
def boom(d=2.2):
    k = T(d); sub = np.sin(2 * np.pi * (34 + 60 * np.exp(-k / .09)) * k) * np.exp(-k / .7)
    nz = np.convolve(rng.standard_normal(len(k)), np.ones(60) / 60, 'same') * np.exp(-k / .25)
    return np.tanh(1.8 * sub) + 1.4 * nz
def riser(d):
    k = T(d); x = rng.standard_normal(len(k)); out = np.zeros_like(x); a = 0.0
    for i in range(0, len(x), 256):  # one pole low pass opening up
        c = 0.02 + 0.6 * (i / len(x)) ** 2; seg = x[i:i + 256]; y = np.empty_like(seg)
        for j, v in enumerate(seg): a += c * (v - a); y[j] = a
        out[i:i + 256] = y
    tone = np.sin(2 * np.pi * (180 + 900 * (k / d) ** 2) * k) * .15
    return (out * 1.6 + tone) * (k / d) ** 1.5
def bass(m, d):
    k = T(d); x = sum(np.sin(2 * np.pi * f(m) * h * k) / h for h in range(1, 7))
    return np.tanh(2.6 * x) * np.minimum(1, k / .004) * np.minimum(1, (d - k) / .02)

DROP = shots[1]['start']                                   # first cut after the title
BREAK = next(s['start'] for s in shots if s['block'] == 'line')  # the closing line, a half-time breath
nb = int(END / B) + 1
duck = np.ones(n)
add(riser(DROP), 0, .55)
add(metal(330, 1.2, .5), 0.05, .25, -.3)
for i in range(nb):
    t = i * B
    if t >= END: break
    half = BREAK <= t < BREAK + 4 * B
    if t >= DROP:
        if not half or i % 2 == 0:
            add(kick(), t, .9)
            a, b = int(t * SR), min(n, int((t + .22) * SR)); duck[a:b] = np.minimum(duck[a:b], .35 + .65 * np.linspace(0, 1, b - a) ** .6)
        if i % 4 in (1, 3) and not half: add(clap(), t, .42, .1)
        add(tick(), t + B / 2, .2, .3); add(tick(), t + B * .75, .1, -.3)
        if i % 8 == 7: add(metal(415, .4, .1), t + B / 2, .22, .4)
        if i % 16 == 15: [add(metal(300 + 40 * q, .25, .06), t + q * B / 4, .18, -.4 + .25 * q) for q in range(4)]  # fill
        # bass: E phrygian riff, eighths with rests, F on the turnaround
        riff = [40, None, 40, 41, None, 40, 43, None]
        for q in range(2):
            m = riff[(i * 2 + q) % 8]
            if m is not None and not half: add(bass(m, B / 2 * .9), t + q * B / 2, .3)
    else:
        add(tick(), t + B / 2, .08)
# impacts on the text slams, on the render card and on the logo card
for s in shots:
    if s['block'] and s['start'] > 0: add(boom(1.4), s['start'], .55); add(metal(260, .9, .3), s['start'], .2, .2)
add(riser(2 * B), END - 2 * B, .4)
add(boom(2.2), END, .8); add(metal(207, 2.0, .7), END, .25); add(metal(311, 2.0, .6), END + .01, .18, -.4)
add(boom(3.0), END2, .9); add(metal(207, 2.5, .9), END2, .3); add(metal(311, 2.5, .8), END2 + .01, .2, -.4)
# end pad: E minor colour under both cards, slow fade
k = T(TOTAL - END + 1.0); pad = sum(np.sin(2 * np.pi * f(m) * k) * (1 + .003 * h) for h, m in enumerate([52, 59, 64, 67])) / 6
add(pad * np.minimum(1, k / .6) * np.exp(-k / 3.0), END, .35)
L *= duck ** .6; R *= duck ** .6  # light sidechain on the whole bed
m = max(np.abs(L).max(), np.abs(R).max()); L /= m * 1.05; R /= m * 1.05
t = np.arange(n) / SR; fd = np.minimum(1, (DUR - t) / 1.0); L *= fd; R *= fd
w = wave.open('assets/music.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.stack([L, R], 1) * 32767).astype(np.int16).tobytes()); w.close()
print('music', round(DUR, 2), 's, drop at', round(DROP, 3), 'render card at', END, 'logo card at', END2)
