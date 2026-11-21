"""No white noise in a Kurkoos video. Ever. (The owner asked for this more than once.)

Gemini TTS ends every answer with a burst of white noise: about 0.1 s, louder than the speech, right after the voice
has gone quiet. Between two lines it is heard as a hiss on every cut. This module finds it, removes it, and checks a
finished sound track for anything like it.

    from vo_noise import strip_burst, noise_events
    python3 video/engine/kreel/vo_noise.py check <file.wav> [...]         exit 1 if a noise burst is found (wav, not AAC)
    python3 video/engine/kreel/vo_noise.py clean <folder with *.wav>      removes the burst from every file in place
"""
import os, subprocess, sys, glob
import numpy as np

def _frames(x, sr, ms=10):
    n = int(sr * ms / 1000); k = len(x) // n
    return n, np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(axis=1)) if k else np.zeros(0)

def flatness(seg, sr=48000):
    """Spectral flatness over the whole band, 0 (a tone or a voice) to 1 (white noise). Measured on 48 kHz PCM:
    speech stays under 0.3 (sibilants included), the burst is 0.35 and up. An AAC track must be checked from the wav
    it was encoded from, because the encoder removes the top of the band."""
    if len(seg) < 64: return 0.0
    s = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) + 1e-9
    return float(np.exp(np.mean(np.log(s))) / np.mean(s))

def burst_start(x, sr):
    """Sample index where the trailing noise burst starts, or None. The burst: the last loud run of the file (at most
    0.4 s), with a flat spectrum, that begins after a pause."""
    n, fr = _frames(x, sr)
    if len(fr) < 12: return None
    j = len(fr)
    while j > 0 and fr[j - 1] < 0.004: j -= 1          # silence after the burst
    end = j
    while j > 0 and fr[j - 1] >= 0.02: j -= 1           # the loud run itself
    run = end - j
    if run < 2 or run > 40: return None
    seg = x[j * n:end * n]
    if fr[j:end].mean() < 0.2: return None               # the burst is louder than any consonant; a quiet run is speech
    if flatness(seg, sr) < 0.22: return None             # a voice, not noise
    before = fr[max(0, j - 2):j]                        # the 20 ms before it
    if len(before) and before.min() > 0.1 * fr[j:end].max(): return None    # no pause at all: part of a word
    return j * n

def strip_burst(x, sr, keep=0.12, fade=0.03):
    """x without its trailing bursts (there can be two, one after the other): cut at the end of the speech, keep a
    short tail of room, fade the last 30 ms. Returns (samples, how many were removed)."""
    y = x; b = None
    for _ in range(6):
        nb = burst_start(y, sr)
        if nb is None: break
        b = nb; y = y[:b]
    if b is None: return x, 0
    n, fr = _frames(y, sr)
    e = len(fr)
    while e > 20 and fr[e - 1] < 0.003: e -= 1
    y = y[:min(len(y), e * n + int(sr * keep))].copy(); f = min(len(y), int(sr * fade))
    if f: y[-f:] *= np.linspace(1, 0, f)
    return y, len(x) - len(y)

def noise_events(x, sr, level=0.03):
    """Every stretch of at least 40 ms that is loud and flat (white noise, static, a hiss): [(seconds, length, rms)]."""
    n = int(sr * 0.02); out = []; run = None
    for i in range(0, len(x) - n, n):
        seg = x[i:i + n]; r = float(np.sqrt((seg ** 2).mean()))
        hit = r >= level and flatness(seg, sr) >= 0.3
        if hit and run is None: run = [i, r]
        elif hit: run[1] = max(run[1], r)
        elif run is not None:
            if i - run[0] >= 2 * n: out.append((round(run[0] / sr, 2), round((i - run[0]) / sr, 2), round(run[1], 3)))
            run = None
    if run is not None and len(x) - run[0] >= 2 * n: out.append((round(run[0] / sr, 2), round((len(x) - run[0]) / sr, 2), round(run[1], 3)))
    return out

def load(path, sr=48000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768

def save(path, x, sr=48000):
    tmp = path + '.tmp.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-', tmp], input=(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
    os.replace(tmp, path)

if __name__ == '__main__':
    cmd, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 2 else ('', [])
    if cmd == 'clean':
        for p in sorted(glob.glob(os.path.join(args[0], '*.wav'))):
            y, cut = strip_burst(load(p), 48000)
            if cut: save(p, y)
            print(os.path.basename(p), 'removed', round(cut / 48, 0), 'ms')
    elif cmd == 'check':
        bad = 0
        for p in args:
            ev = noise_events(load(p), 48000)
            print(os.path.basename(p), 'noise:', ev if ev else 'none'); bad += len(ev)
        sys.exit(1 if bad else 0)
    else: print(__doc__); sys.exit(2)
