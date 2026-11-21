"""The music of the finance film: the group's own track, the one from the Raita team reel.
    python3 studio/finance-explainer/bed.py <seconds> <out.wav> [cues.json]
cues (written by mix.cjs from timeline.js): {"beat": 0.5, "problem": t, "drop": t, "features": [t, ...], "outro": t, "final": t}.

The owner asked for the music of our other videos ("like the Raita video"). No track library exists in the project:
every Kurkoos reel carries music written in code. This is the Raita team reel's generator
(engine/brand_reel/music_beat.py) played to this film's clock: D minor, Dm Bb F C, 120 BPM, the same pad, the same
off-beat bass, the same kick on every beat, the same snare on two and four and hats between the beats.

Two things are different, because of the owner's standing rule (no white noise, CLAUDE.md):
  - no whoosh on the cuts (in the reel it was a 160 ms swell of noise before every cut);
  - the snare and the hats keep their body and their click, but the click is at most 20 ms long. There is no
    stretch of noise anywhere; engine/kreel/vo_noise.py checks the file and the mix fails if it finds one.
Form: pad and bass alone under the promise, the kick joins at the problem, the full kit from the answer on, the drums
step back on the closing line, and one chord on the beat after the last word is left to ring."""
import sys, json, wave
import numpy as np
SR = 48000; D = float(sys.argv[1]); OUT = sys.argv[2]
C = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
B = C.get('beat', 0.5)
PROBLEM = C.get('problem', 4.0); DROP = C.get('drop', 13.0); FEATS = C.get('features', []); OUTRO = C.get('outro', D - 5); FINAL = C.get('final', D - 2.2)
n = int(SR * D); L = np.zeros(n); R = np.zeros(n); rng = np.random.default_rng(7)   # the reel's seed; used only for the drum clicks

def add(sig, at, g=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= n or i < 0: return
    j = min(n, i + len(sig)); s = sig[:j - i] * g
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))
def env(d, a=.002, r=.2):
    k = np.arange(int(SR * d)) / SR; return np.minimum(1, k / a) * np.exp(-k / r)
f = lambda m: 440 * 2 ** ((m - 69) / 12)

def kick():
    k = np.arange(int(SR * .35)) / SR; return np.sin(2 * np.pi * (48 + 110 * np.exp(-k / .035)) * k) * env(.35, .001, .11)
def click(ms, decay):
    """the stick on the skin: a few milliseconds, gone before it can be heard as a hiss"""
    x = np.diff(rng.standard_normal(int(SR * ms / 1000)), prepend=0); k = np.arange(len(x)) / SR
    return x / max(1e-9, np.abs(x).max()) * np.exp(-k / decay)
def hat():
    k = np.arange(int(SR * .05)) / SR
    body = (np.sin(2 * np.pi * 7300 * k) + .6 * np.sin(2 * np.pi * 9100 * k + 1) + .4 * np.sin(2 * np.pi * 11200 * k + 2)) * np.exp(-k / .012) * .35
    c = click(14, .004); body[:len(c)] += c * .5; return body
def snare():
    k = np.arange(int(SR * .22)) / SR
    body = (np.sin(2 * np.pi * 190 * k) * .55 + np.sin(2 * np.pi * 330 * k) * .25 + np.sin(2 * np.pi * 475 * k) * .12) * env(.22, .001, .07)
    c = click(20, .006); body[:len(c)] += c * .55; return body

PROG = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]]   # Dm Bb F C
bars = int(D / (4 * B)) + 1
for b in range(bars):
    t0 = b * 4 * B; ch = PROG[b % 4]; d = 4 * B; k = np.arange(int(SR * d)) / SR
    if t0 >= FINAL: break
    pad = sum(np.sin(2 * np.pi * f(m) * k) + .25 * np.sin(2 * np.pi * f(m + 12) * 1.002 * k) for m in ch) / 8
    pad *= np.minimum(1, k / .3) * np.minimum(1, (d - k) / .3); add(pad, t0, .14)
    for q in range(8):
        bt = t0 + q * B / 2; kk = np.arange(int(SR * B * .4)) / SR
        if bt >= FINAL - 1e-6: continue
        full = DROP <= bt < OUTRO
        if q % 2 == 1: add(np.tanh(2.2 * np.sin(2 * np.pi * f(ch[0] - 12) * kk)) * env(B * .4, .003, .1), bt, .24 if bt >= PROBLEM else .14)
        if full: add(hat(), bt + B / 4, .12, .25)
    for q in range(4):
        bt = t0 + q * B
        if bt >= FINAL - 1e-6 or bt < 0.4: continue
        full = DROP <= bt < OUTRO
        if full or (PROBLEM <= bt < DROP and q in (0, 2)) or (bt >= OUTRO and q == 0): add(kick(), bt, .95)
        if full and q in (1, 3): add(snare(), bt, .32)
# a brighter octave of the chord on the answer and on every new feature: the film's own accents, tones only
for t in [DROP] + list(FEATS):
    ch = PROG[int(round(t / (4 * B))) % 4]; k = np.arange(int(SR * 1.2)) / SR
    add(sum(np.sin(2 * np.pi * f(m + 12) * k) for m in ch) / 4 * np.minimum(1, k / .004) * np.exp(-k / .32), t, .16)
# the last chord, on the beat after the last word, left to ring
ch = PROG[0]; k = np.arange(int(SR * max(.5, D - FINAL))) / SR
last = sum(np.sin(2 * np.pi * f(m) * k) + .3 * np.sin(2 * np.pi * f(m + 12) * k) for m in ch) / 6 * np.minimum(1, k / .006) * np.exp(-k / 1.1)
add(last, FINAL, .5); add(kick(), FINAL, .9)

m = np.abs(np.stack([L, R])).max(); L /= m * 1.1; R /= m * 1.1
t = np.arange(n) / SR; fd = np.minimum(1, t / .05) * np.minimum(1, (D - t) / .4); L *= fd; R *= fd
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 32767).astype(np.int16).tobytes()); w.close()
print('music', round(D, 1), 's ->', OUT)
