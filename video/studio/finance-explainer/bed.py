"""The music of the finance film: an upbeat product-launch track, made of pure tones only.
    python3 studio/finance-explainer/bed.py <seconds> <out.wav> [cues.json]
cues (written by mix.cjs from timeline.js): {"beat": 0.5, "problem": t, "drop": t, "features": [t, ...], "outro": t, "final": t}.
Every scene of the film starts on a beat of this track, so the music is cut to the same clock as the picture.

THE OWNER'S RULE: no white noise anywhere, ever. There is no noise source in this file: no random numbers, no hiss, no
noise hi-hat, no snare, no noise riser, no whoosh. Every sound is a sum of sines:
  kick   a sine whose pitch drops fast (150 Hz to 48 Hz), a short click-free attack
  bass   a sine with two soft harmonics, on the off-beat eighths, pumping against the kick
  pluck  the motif: a bright arpeggio, six harmonics that die away fast (the higher, the faster)
  stab   a short chord on beats two and four: the backbeat, where a clap would be
  tick   two very high sines for 30 ms on the off-beats: the 'hat'
  pad    a soft held chord under everything; it swells into the answer
  rise   a sine that glides up an octave in the bar before the answer (the lift)
  toms   pitched sine drops on the last beats before the answer, the fill
Form: the promise and the problem are lighter (pluck in eighths, kick on one and three); the answer lifts everything
(four on the floor, off-beat bass, sixteenth plucks, backbeat, ticks), a bright chord marks each new feature, and on
the closing line the drums step back until one last full chord on the beat after the last word, left to ring.
D major, I V vi IV, 120 BPM. 48 kHz stereo."""
import sys, json, wave
import numpy as np
SR = 48000; D = float(sys.argv[1]); OUT = sys.argv[2]
C = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
BEAT = C.get('beat', 0.5); BAR = 4 * BEAT
PROBLEM = C.get('problem', 4.0); DROP = C.get('drop', 13.0); FEATS = C.get('features', []); OUTRO = C.get('outro', D - 5); FINAL = C.get('final', D - 2.2)
n = int(SR * D); L = np.zeros(n); R = np.zeros(n)
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(t0, sig, gain, pan=0.5):
    """place a sound at t0 seconds; pan 0 = left, 1 = right (equal power)"""
    i0 = int(round(t0 * SR))
    if i0 >= n or i0 + len(sig) <= 0: return
    a, b = max(0, i0), min(n, i0 + len(sig)); s = sig[a - i0:b - i0] * gain
    L[a:b] += s * np.cos(pan * np.pi / 2); R[a:b] += s * np.sin(pan * np.pi / 2)

def tt(sec): return np.arange(int(sec * SR)) / SR
def attack(x, ms=3):
    k = min(len(x), int(SR * ms / 1000)); x[:k] *= np.sin(np.linspace(0, np.pi / 2, k)) ** 2; return x
def tail(x, ms=12):
    k = min(len(x), int(SR * ms / 1000)); x[-k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2; return x

def kick():
    x = tt(0.42); ph = 2 * np.pi * (48 * x + (150 - 48) / 28 * (1 - np.exp(-28 * x)))
    return tail(attack(np.sin(ph) * np.exp(-x * 7.5), 1.5))
def bass(m, dur):
    x = tt(dur); f = hz(m)
    s = np.sin(2 * np.pi * f * x) + 0.32 * np.sin(4 * np.pi * f * x) + 0.12 * np.sin(6 * np.pi * f * x)
    return tail(attack(s * np.exp(-x * 3.0), 6), 25)
def pluck(m, dur=0.55):
    x = tt(dur); f = hz(m); s = np.zeros_like(x)
    for h in range(1, 7): s += np.sin(2 * np.pi * f * h * x + 0.3 * h) * np.exp(-x * (5 + 4.5 * h)) / h
    return tail(attack(s, 2), 30)
def stab(ms):
    x = tt(0.32); s = np.zeros_like(x)
    for m in ms:
        f = hz(m); s += (np.sin(2 * np.pi * f * x) + 0.4 * np.sin(4 * np.pi * f * x) + 0.15 * np.sin(6 * np.pi * f * x)) * np.exp(-x * 11)
    return tail(attack(s / len(ms), 2), 30)
def tick():
    x = tt(0.04); s = np.sin(2 * np.pi * 7400 * x) + 0.6 * np.sin(2 * np.pi * 10300 * x)
    return tail(attack(s * np.exp(-x * 120), 0.6), 6)
def bell(ms, dur=1.6):
    x = tt(dur); s = np.zeros_like(x)
    for m in ms:
        f = hz(m); s += (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 2.0 * f * x) + 0.18 * np.sin(2 * np.pi * 3.01 * f * x)) * np.exp(-x * 2.4)
    return tail(attack(s / len(ms), 3), 60)
def tom(m):
    x = tt(0.3); f0 = hz(m); ph = 2 * np.pi * (f0 * 0.7 * x + f0 * 0.3 / 12 * (1 - np.exp(-12 * x)))
    return tail(attack(np.sin(ph) * np.exp(-x * 9), 1.5))

# D A Bm G — bright and forward. Pad voicings, bass roots, arpeggio notes (an octave up, the motif)
CH = [([62, 66, 69, 74], 38, [74, 78, 81, 86]), ([61, 64, 69, 73], 45, [73, 76, 81, 85]),
      ([62, 66, 71, 74], 47, [71, 74, 78, 83]), ([62, 67, 71, 74], 43, [71, 74, 79, 83])]
ARP = [0, 2, 1, 3, 2, 1, 3, 2]     # the motif's shape over eight steps
END = FINAL                         # nothing new starts at or after the last chord except that chord itself
bars = int(np.ceil(D / BAR)) + 1
for b in range(bars):
    x0 = b * BAR
    if x0 >= END: break
    pad_v, root, arp = CH[b % 4]
    full = DROP <= x0 < OUTRO                       # the body of the film
    # pad: soft held chord; louder once the answer arrives, softer again under the closing line
    x = tt(BAR + 0.6); env = np.minimum(1, x / 0.35) * np.minimum(1, np.maximum(0, (BAR + 0.6 - x) / 0.5))
    pad = sum(np.sin(2 * np.pi * hz(m) * x) + 0.3 * np.sin(2 * np.pi * hz(m) * 2.003 * x) for m in pad_v) / 4 * env
    add(x0, pad, 0.05 if full else 0.035, 0.5)
    for s in range(16):                             # sixteenth steps
        t0 = x0 + s * BEAT / 4
        if t0 >= END: break
        beat, sub = divmod(s, 4)
        body = DROP <= t0 < OUTRO
        # kick: one and three until the answer; four on the floor in the body; one per bar under the closing line
        if sub == 0 and t0 >= PROBLEM - 1e-6 and (body or (t0 < DROP and beat in (0, 2)) or (t0 >= OUTRO and beat == 0)):
            add(t0, kick(), 0.55)
        # bass on the off-beat eighths (pumping between the kicks), from the problem on
        if sub == 2 and t0 >= PROBLEM - 1e-6 and t0 < END: add(t0, bass(root, BEAT * 0.45), 0.20 if body else 0.14)
        # the motif: eighths until the answer, sixteenths in the body, eighths again at the close
        if (body or sub % 2 == 0):
            k = (s if body else s // 2) % 8
            add(t0, pluck(arp[ARP[k]] + (12 if body and s % 8 == 7 else 0)), 0.075 if body else 0.065, 0.32 if k % 2 else 0.68)
        if body and sub == 0 and beat in (1, 3): add(t0, stab(pad_v), 0.085, 0.5)
        if body and sub == 2: add(t0, tick(), 0.014, 0.62)
# the lift into the answer: a sine glide up an octave over the bar before it, and a fill of falling toms on its last beat
g0 = DROP - BAR
if g0 > 0:
    x = tt(BAR); f = 220 * 2 ** (x / BAR); ph = 2 * np.pi * np.cumsum(f) / SR
    add(g0, (np.sin(ph) + 0.4 * np.sin(1.5 * ph)) * (x / BAR) ** 2, 0.05, 0.5)
    for i, m in enumerate([55, 52, 50, 47]): add(DROP - BEAT + i * BEAT / 4, tom(m), 0.30, 0.35 + 0.1 * i)
# a bright chord at the answer and at each new feature (on the beat the screen changes)
for t0 in [DROP] + list(FEATS):
    add(t0, bell([74, 78, 81]), 0.07, 0.5)
# the end: one full chord on the beat after the last word, left to ring
add(FINAL, kick(), 0.6); add(FINAL, bass(38, 1.6), 0.22); add(FINAL, bell([62, 66, 69, 74, 78], 2.4), 0.12)
add(FINAL, stab([62, 66, 69, 74]), 0.1)
x = tt(2.6); add(FINAL, sum(np.sin(2 * np.pi * hz(m) * x) for m in [50, 57, 62, 66]) / 4 * np.exp(-x * 1.4) * np.minimum(1, x / 0.01), 0.08)

fade_in = np.clip(np.arange(n) / SR / 0.4, 0, 1); fade_out = np.clip((D - np.arange(n) / SR) / 0.6, 0, 1)
x = np.stack([L, R], axis=1) * (fade_in * fade_out)[:, None]
x = np.tanh(x * 1.2) / 1.2; x /= max(1e-9, np.abs(x).max()) / 0.6
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
print('music', round(D, 1), 's ->', OUT)
