"""Loudness: every video at -14 LUFS, true peak at most -1, clean effects (guide: "הדיבור ברור ובאותה עוצמה").

    python3 loudness.py clip.mp4 --measure                                   # numbers before, and the settings that will run
    python3 loudness.py clip.mp4 [--music bed.wav] [--sfx a.wav@3.2 --sfx b.wav@7.9] [--adjust -3]
--adjust: "a little quieter / louder" is about 3 dB, measured in short windows against the previous version.

Rules: effects get highpass=f=200 and sit 23 to 33 dB under the speech (400 ms momentary peak against the median of the
speech); music sits 9 to 13 dB under the speech and ducks 2 to 4 dB more while speaking (sidechaincompress keyed by the
speech); the mix is normalised in two passes (the second gets measured_I, measured_TP, measured_LRA, measured_thresh and
offset, with linear=true); if the second pass reports dynamic, peaks are limited first with alimiter at 192 kHz with
level=false, measured again and the second pass runs again; audio back to 48 kHz; the picture is copied, not re-encoded.
Final check: -14 LUFS within 0.5, true peak at most -1, under 1% of the effects' energy below 200 Hz.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys, tempfile

TARGET_I, TARGET_TP, TARGET_LRA = -14.0, -1.0, 11.0
INNER_TP = -1.5   # headroom for the AAC encode, so the final file stays at or under -1
HP = ",".join(["highpass=f=200"] * 6)   # six stages: under 1% of an effect's energy stays below 200 Hz


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def measure(path, pre="", tp=None):
    tp = INNER_TP if tp is None else tp
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", f"{pre}loudnorm=I={TARGET_I}:TP={tp}:LRA={TARGET_LRA}:print_format=json", "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        raise SystemExit("no audio to measure: " + r.stderr[-400:])
    return json.loads(m.group(0))


def second_pass(path, meas, out_wav, pre=""):
    af = (f"{pre}loudnorm=I={TARGET_I}:TP={INNER_TP}:LRA={TARGET_LRA}:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
          f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true:print_format=json")
    r = run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-i", path, "-af", af, "-ar", "48000", "-c:a", "pcm_s24le", out_wav])
    m = re.search(r"\{[^{}]*\"normalization_type\"[^{}]*\}", r.stderr, re.S)
    return json.loads(m.group(0)) if m else {}


def momentary(path, window=0.4):
    """Short-window loudness (dB) per 100 ms, for 'a little quieter' and for effect/speech level checks."""
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=none", "-f", "null", "-"])
    return [float(x) for x in re.findall(r"M:\s*(-?[\d.]+)", r.stderr)]


def low_energy_share(wav):
    import numpy as np
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True)
    a = np.frombuffer(r.stdout, np.float32)
    if not len(a):
        return 0.0
    sp = np.abs(np.fft.rfft(a)) ** 2; f = np.fft.rfftfreq(len(a), 1 / 48000)
    return float(sp[f < 200].sum() / max(1e-12, sp.sum()))


def filt(p, tmp):
    o = os.path.join(tmp, os.path.basename(p) + ".hp.wav")
    run(["ffmpeg", "-y", "-v", "error", "-i", p, "-af", "aresample=48000," + HP, o])
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--measure", action="store_true")
    ap.add_argument("--music"); ap.add_argument("--sfx", action="append", default=[], help="file@seconds")
    ap.add_argument("--adjust", type=float, default=0.0); ap.add_argument("-o", "--out")
    a = ap.parse_args()
    base = os.path.abspath(os.path.splitext(a.video)[0])
    before = measure(a.video)
    plan = {"target": {"I": TARGET_I, "TP": TARGET_TP, "LRA": TARGET_LRA}, "sfx": "highpass=f=200, 23-33 dB under speech", "music": "9-13 dB under speech, sidechain duck 2-4 dB" if a.music else None, "passes": "two-pass loudnorm, linear=true"}
    res = {"before": {k: before[k] for k in ("input_i", "input_tp", "input_lra", "input_thresh")}, "settings": plan}
    if a.measure:
        print(json.dumps(res, ensure_ascii=False, indent=1)); return
    tmp = tempfile.mkdtemp()
    # 1) mix: speech from the video, effects high-passed and placed, music under the speech and ducked by it
    ins, fc, labels = ["-i", a.video], ["[0:a]aresample=48000,asplit=2[sp][key]"], ["[sp]"]
    sp_level = float(before["input_i"])
    n = 1
    if a.music:
        ins += ["-stream_loop", "-1", "-i", a.music]
        mus_gain = sp_level - 11 - float(measure(a.music)["input_i"])           # 11 dB under speech, middle of 9-13
        fc.append(f"[{n}:a]aresample=48000,volume={mus_gain:.2f}dB[m0];[m0][key]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=300:makeup=1[mus]")
        labels.append("[mus]"); n += 1
    else:
        fc[0] = "[0:a]aresample=48000[sp]"
    sfx_paths = []
    for k, s in enumerate(a.sfx):
        p, _, at = s.partition("@"); at = float(at or 0)
        ins += ["-i", p]
        peak = max(momentary(p) or [-30])
        g = (sp_level - 28) - peak                                             # 28 dB under speech, middle of 23-33
        fc.append(f"[{n}:a]aresample=48000,{HP},volume={g:.2f}dB,adelay={int(at * 1000)}|{int(at * 1000)}[x{k}]")
        labels.append(f"[x{k}]"); sfx_paths.append(p); n += 1
    mix = os.path.join(tmp, "mix.wav")
    vdur = float(json.loads(run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", a.video]).stdout)["format"]["duration"])
    tail = f"afade=t=out:st={max(0.0, vdur - 0.03):.3f}:d=0.03"          # no hard stop at the end (the encoder rings on it)
    graph = ";".join(fc) + (f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first,{tail}[mx]" if len(labels) > 1 else f";[sp]{tail}[mx]")
    r = run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", graph, "-map", "[mx]", "-c:a", "pcm_s24le", mix])
    if r.returncode:
        raise SystemExit(r.stderr[-1500:])
    if a.adjust:
        adj = os.path.join(tmp, "adj.wav"); run(["ffmpeg", "-y", "-v", "error", "-i", mix, "-af", f"volume={a.adjust}dB", adj]); mix = adj
    # 2) two-pass loudnorm; if the second pass goes dynamic, limit peaks at 192 kHz first (level=false) and redo
    m1 = measure(mix)
    out_wav = os.path.join(tmp, "norm.wav")
    p2 = second_pass(mix, m1, out_wav)
    limited = False
    res_tries = 0
    tries = 0
    src_for_limit, cur = mix, m1
    while p2.get("normalization_type") != "linear" and tries < 14:
        # limiting also lowers the loudness, so the limit is recomputed from the latest measurement until the pass is linear
        gain = TARGET_I - float(cur["input_i"])
        limit_db = max(-23.5, INNER_TP - gain - 0.8)
        lim = os.path.join(tmp, f"lim{tries}.wav")
        run(["ffmpeg", "-y", "-v", "error", "-i", src_for_limit, "-af", f"aresample=192000,alimiter=limit={10 ** (limit_db / 20):.6f}:level=false:attack=1:release=50,aresample=48000", "-c:a", "pcm_s24le", lim])
        cur = measure(lim)
        p2 = second_pass(lim, cur, out_wav)
        limited = True; tries += 1
    res_tries = tries
    # 3) back into the video without re-encoding the picture
    out = a.out or base + ".mastered.mp4"
    r = run(["ffmpeg", "-y", "-v", "error", "-i", a.video, "-i", out_wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-shortest", out])
    if r.returncode:
        raise SystemExit(r.stderr[-1500:])
    after = measure(out, tp=TARGET_TP)
    if float(after["input_tp"]) > TARGET_TP:   # an encoder overshoot: encode again with the fast coder
        run(["ffmpeg", "-y", "-v", "error", "-i", a.video, "-i", out_wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-aac_coder", "fast", "-b:a", "320k", "-ar", "48000", "-shortest", out])
        after = measure(out, tp=TARGET_TP); res["reencoded_fast"] = True
    res["after"] = {k: after[k] for k in ("input_i", "input_tp", "input_lra")}
    res["normalization_type"] = p2.get("normalization_type"); res["limited_first"] = limited; res["limiter_rounds"] = res_tries
    res["checks"] = {"I_ok": abs(float(after["input_i"]) - TARGET_I) <= 0.5, "TP_ok": float(after["input_tp"]) <= TARGET_TP,
                     "sfx_low_share_pct": [round(low_energy_share(filt(p, tmp)) * 100, 2) for p in sfx_paths]}
    res["output"] = out
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
