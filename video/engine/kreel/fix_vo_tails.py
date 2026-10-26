"""Clean voice files made before the noise fix: drops the white noise burst at the end of each vo/*.wav.
    python3 video/engine/kreel/fix_vo_tails.py video/projects/<name>/vo"""
import sys, glob, subprocess, os, numpy as np
def clean(path, sr=48000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
    n = int(sr * .01); fr = [float(np.sqrt((x[i:i + n] ** 2).mean())) for i in range(0, len(x) // n * n, n)]
    # the burst: the trailing run of loud frames, right after at least 100 ms of near silence
    j = len(fr)
    while j > 0 and (fr[j - 1] > .02 or j > len(fr) - 4): j -= 1
    end = len(fr) * n
    if j < len(fr) and j >= 10 and max(fr[j - 10:j]) < .01:
        end = j * n
        while end > n * 20 and fr[end // n - 1] < .003: end -= n
    cut = (len(x) - end) * 1000 // sr
    x = x[:min(len(x), end + int(sr * .12))].copy(); f = int(sr * .03); x[-f:] *= np.linspace(1, 0, f)
    tmp = path + '.tmp.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-', tmp], input=(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes(), check=True)
    os.replace(tmp, path); return cut
for p in sorted(glob.glob(os.path.join(sys.argv[1], '*.wav'))): print(os.path.basename(p), 'trimmed', clean(p), 'ms')
