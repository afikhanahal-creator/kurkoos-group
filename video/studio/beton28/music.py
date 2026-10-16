"""Original track for the "28 ימים" reel, synthesized in code (no samples). 120 BPM, D minor, driving but clean:
a warm pad, a soft kick, a clock tick that speeds up while the calendar fills (days 1 to 7, then 8 to 28), a low hit at every
scene change, a muted stop at the fast forward X, and an open chord on the end card. Leaves the mid range free for a voice.
The story is written on a 53.9 s timeline and plays 1.25x faster (index.html SPEED): W() maps story seconds to real seconds.
On top of the pulse: kick on every beat, off-beat hats, and a short noise riser into every scene change.

    python3 video/studio/beton28/music.py  ->  video/studio/beton28/music.wav (43.62 s, 48 kHz stereo)
"""
import os, wave
import numpy as np

H = os.path.dirname(os.path.abspath(__file__))
SP = 1.25
W = lambda x: x / SP
SR, DUR, BPM = 48000, 43.62, 120
B = 60 / BPM
n = int(SR * DUR)
L, R = np.zeros(n), np.zeros(n)
rng = np.random.default_rng(28)
T = lambda d: np.arange(int(SR * d)) / SR
f = lambda m: 440 * 2 ** ((m - 69) / 12)
SC = [W(x) for x in (0, 3.0, 6.5, 10.5, 13.5, 19.0, 24.0, 28.0, 33.5, 39.0, 44.5, 49.9)]  # scene starts (index.html S)


def env(d, a=.005, r=.3):
    k = T(d)
    return np.minimum(1, k / a) * np.exp(-k / r)


def add(sig, at, g=1.0, pan=0.0):
    i = int(at * SR)
    if i >= n or i < 0:
        return
    j = min(n, i + len(sig))
    s = sig[:j - i] * g
    L[i:j] += s * (1 - max(0, pan))
    R[i:j] += s * (1 + min(0, pan))


def kick():
    k = T(.5)
    return np.sin(2 * np.pi * (42 + 90 * np.exp(-k / .035)) * k) * env(.5, .002, .16)


def tick(hi=False):
    x = np.diff(rng.standard_normal(int(SR * .025)), prepend=0)
    return x * env(.025, .0005, .006) * (1.2 if hi else .8)


def pad(notes, d):
    k = T(d)
    s = sum(np.sin(2 * np.pi * f(m) * k + .3 * np.sin(2 * np.pi * .21 * k + i)) + .35 * np.sin(2 * np.pi * f(m) * 2.003 * k) for i, m in enumerate(notes))
    a = np.minimum(1, k / 1.2) * np.minimum(1, (d - k) / 1.2)
    return s * a / len(notes)


def boom(d=2.0):
    k = T(d)
    sub = np.sin(2 * np.pi * (36 + 50 * np.exp(-k / .1)) * k) * np.exp(-k / .6)
    nz = np.convolve(rng.standard_normal(len(k)), np.ones(80) / 80, 'same') * np.exp(-k / .2)
    return np.tanh(1.5 * sub) + .8 * nz


def bell(m, d=2.5):
    k = T(d)
    return (np.sin(2 * np.pi * f(m) * k) + .4 * np.sin(2 * np.pi * f(m) * 2.76 * k) * np.exp(-k / .3)) * env(d, .003, .9)


# chords per scene: Dm, Bb, F, C, Dm ... resolving to F on the end card
CH = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]]
t = 0.0
i = 0
while t < W(49.9):
    add(pad(CH[i % 4], 4 * B * 2 + 1.2), t, .16)
    t += 4 * B * 2
    i += 1
add(pad([41, 53, 57, 60, 65], 3.6), W(49.9), .2)
# bass on the beat from the first scene change, kick on 1 and 3 from the calendar on
for b in range(int(W(49.9) / B)):
    at = b * B
    if at < W(3.0):
        continue
    root = CH[int(at / (8 * B)) % 4][0] - 12
    if b % 2 == 0:
        k = T(B * .9)
        add(np.tanh(1.2 * np.sin(2 * np.pi * f(root) * k)) * env(B * .9, .01, .35), at, .22)
    if at >= W(6.5) and not (W(10.5 + 2.2) <= at < W(13.5)):
        add(kick(), at, .55)
# the clock: days 1 to 7, then 8 to 28 (same easing window as the calendar)
for d in range(1, 8):
    add(tick(True), W(13.9 + 3.8 * (d - 1) / 7), .5, -.2)
for d in range(8, 29):
    add(tick(d == 28), W(19.3 + 3.1 * (d - 8) / 21), .45, .2)
add(bell(74), W(17.5), .22)          # day 7 chip
add(bell(77), W(22.4), .26)          # day 28 tick
# scene hits; the fast forward stop
for at in SC[1:]:
    add(boom(), at - .02, .35)
add(boom(1.2), W(12.7), .5)
add(bell(62, 3.5), W(50.1), .3)
add(bell(69, 3.0), W(50.35), .22, .3)
# energy: off-beat hats from the calendar to the end card, a short riser into every scene change
def hat():
    x = np.diff(rng.standard_normal(int(SR * .05)), prepend=0); x = np.diff(x, prepend=0)
    return x * env(.05, .0005, .012)
for b in range(int(W(3.0) / B), int(W(49.9) / B)):
    if W(10.5 + 2.2) <= b * B < W(13.5):
        continue
    add(hat(), b * B + B / 2, .16, .3 if b % 2 else -.3)
def riser(d=.7):
    k = T(d); x = rng.standard_normal(len(k)); x = np.convolve(x, np.ones(6) / 6, 'same')
    return x * (k / d) ** 2.2 * .5
for at in SC[2:]:
    add(riser(), at - .7, .5)

mix = np.stack([L, R], 1)
fade = np.minimum(1, (DUR - np.arange(n) / SR) / 1.2)[:, None]
mix *= fade
mix /= max(1e-9, np.abs(mix).max()) / .8
with wave.open(os.path.join(H, 'music.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('music.wav', DUR, 's')
