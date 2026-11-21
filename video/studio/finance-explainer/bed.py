"""A quiet bed for the finance film: warm, slow, and made of pure tones only.
    python3 studio/finance-explainer/bed.py <seconds> <out.wav>
No noise source anywhere in this file (no random numbers, no hiss, no whoosh, no cymbal): every sound is a sum of sines.
A soft pad on four chords, a low root, and a gentle bell-like note on the beat. 48 kHz stereo."""
import sys, wave
import numpy as np
SR = 48000; D = float(sys.argv[1]); OUT = sys.argv[2]
BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
n = int(SR * D); t = np.arange(n) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
# F major 7, G 6, A minor 7, C major 9: open and calm, never resolving hard
CHORDS = [[53, 60, 64, 69], [55, 62, 64, 71], [57, 60, 64, 67], [48, 55, 62, 64]]
L = np.zeros(n); R = np.zeros(n)
def env(x0, x1, attack, release):
    e = np.zeros(n); i0, i1 = max(0, int(x0 * SR)), min(n, int(x1 * SR))
    if i1 <= i0: return e
    seg = np.ones(i1 - i0); a = min(len(seg), int(attack * SR)); r = min(len(seg), int(release * SR))
    seg[:a] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(a) / a); seg[-r:] *= 0.5 + 0.5 * np.cos(np.pi * np.arange(r) / r)
    e[i0:i1] = seg; return e
bars = int(np.ceil(D / BAR)) + 1
for b in range(bars):
    ch = CHORDS[b % 4]; x0 = b * BAR
    e = env(x0 - 0.6, x0 + BAR + 0.9, 1.4, 1.6)                      # each chord breathes into the next
    for k, m in enumerate(ch):
        f = hz(m); pan = 0.5 + 0.28 * (-1) ** k
        tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t + 0.6) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t)
        L += e * tone * 0.050 * (1 - pan); R += e * tone * 0.050 * pan
    root = hz(ch[0] - 12); bass = np.sin(2 * np.pi * root * t) * env(x0, x0 + BAR, 0.3, 1.0) * 0.085
    L += bass; R += bass
    # a soft bell on beats one and three, a note of the chord, dying away
    for beat, m in ((0, ch[2] + 12), (2, ch[3] + 12)):
        s0 = x0 + beat * BEAT; i0 = int(s0 * SR)
        if i0 >= n: continue
        tt = t[i0:] - s0; f = hz(m)
        bell = (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2 * tt)) * np.exp(-tt * 2.6) * (1 - np.exp(-tt * 180)) * 0.045
        pan = 0.38 if beat == 0 else 0.62
        L[i0:] += bell * (1 - pan); R[i0:] += bell * pan
fade_in = np.clip(t / 2.0, 0, 1); fade_out = np.clip((D - t) / 3.0, 0, 1)
x = np.stack([L, R], axis=1) * (fade_in * fade_out)[:, None]
x = np.tanh(x * 1.1) / 1.1; x /= max(1e-9, np.abs(x).max()) / 0.5
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes()); w.close()
print('bed', round(D, 1), 's ->', OUT)
