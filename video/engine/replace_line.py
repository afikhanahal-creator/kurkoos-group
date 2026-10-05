"""Replace one sentence with a new recording, without re-shooting (guide: "מי שמקשיב לא שומע איפה נכנס המשפט החדש").

    python3 replace_line.py clip.mp4 --new take.wav --sentence "200 אלף קמ\"ש" --words clip.words.json --new-words take.words.json --preview
    python3 replace_line.py clip.mp4 --new take.wav --sentence "..." --words ... --new-words ... --apply [--mouth-visible]

Transcripts: each file in its own folder (the transcriber overwrites transcript.json in its folder). Whisper word times
can be off by up to a second, the first word most of all, so every cut point sits on the nearest dip of the loudness
curve, never on a whisper time; a graph with a line at each word start is written for checking.
Steps: find the sentence by its text; cut inside the silence before and after it; trim the new take to 50 ms before its
first word and 60 ms after its last; match the background noise (afftdn=nr=6 when the take is noisier, the source's own
room tone added when it is quieter); EQ the take toward the sentence it replaces (about 80% of the difference, only
100 Hz to 10 kHz, at most 6 dB each way); match the level to the active speech of the 10 s before the join (silences
excluded); 40 ms fades at each side. If the take is longer or shorter, everything after it moves by that difference
(captions, effects and B-roll are shifted in the words file and reported); a shorter line trims the picture under it
from its end, a longer one asks for a B-roll to cover the difference (the picture is held otherwise). Delivers the fixed
video, the fixed voice as a separate wav, and first a 10 s preview around the join.
"""
from __future__ import annotations
import argparse, difflib, json, os, re, subprocess, tempfile
import numpy as np

SR = 48000


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def load(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(r.stdout, np.float32).copy()


def save(a, path):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "pcm_s24le", path], input=a.astype(np.float32).tobytes())


def env(a, hop=0.01):
    n = int(SR * hop); k = len(a) // n
    return 20 * np.log10(np.sqrt((a[: k * n].reshape(k, n) ** 2).mean(1) + 1e-12)), hop


def dip(db, hop, t, span=0.35):
    """The quietest 10 ms near t (where to cut), instead of trusting the whisper time."""
    i0, i1 = max(0, int((t - span) / hop)), min(len(db), int((t + span) / hop) + 1)
    j = i0 + int(np.argmin(db[i0:i1]))
    return (j + 0.5) * hop


def norm(s):
    return re.sub(r"[^\w֐-׿]", "", s)


def find_sentence(words, text):
    target = norm(text); best, bi, bj = 0.0, 0, 0
    for i in range(len(words)):
        acc = ""
        for j in range(i, min(len(words), i + 40)):
            acc += norm(words[j]["text"])
            r = difflib.SequenceMatcher(None, acc, target).ratio()
            if r > best:
                best, bi, bj = r, i, j
            if len(acc) > len(target) * 1.6:
                break
    return bi, bj, best


def spectrum(a):
    n = 4096
    if len(a) < n:
        a = np.pad(a, (0, n - len(a)))
    fr = [np.abs(np.fft.rfft(a[i:i + n] * np.hanning(n))) for i in range(0, len(a) - n + 1, n // 2)]
    return np.fft.rfftfreq(n, 1 / SR), 20 * np.log10(np.mean(fr, 0) + 1e-9)


def eq_filter(src, take):
    """About 80% of the spectral difference, 100 Hz to 10 kHz only, at most 6 dB each way, as peaking bands."""
    f, s1 = spectrum(src); _, s2 = spectrum(take)
    bands = [125, 250, 500, 1000, 2000, 4000, 8000]
    parts = []
    for b in bands:
        m = (f > b / 1.41) & (f < b * 1.41)
        d = float(np.clip(0.8 * (s1[m].mean() - s2[m].mean()), -6, 6))
        if abs(d) > 0.3:
            parts.append(f"equalizer=f={b}:t=o:w=1:g={d:.2f}")
    return ",".join(parts) or "anull", parts


def noise_floor(a, db, hop):
    q = np.percentile(db, 10)
    return float(q)


def active_level(a, db, hop, t_end, span=10.0):
    i0, i1 = max(0, int((t_end - span) / hop)), int(t_end / hop)
    seg = db[i0:i1]
    thr = np.percentile(seg, 30) + 6
    act = seg[seg > thr]
    return float(np.mean(act)) if len(act) else float(np.mean(seg))


def graph(path, a, words, cuts):
    from PIL import Image, ImageDraw
    db, hop = env(a); W, H = 1600, 260
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    dur = len(a) / SR; x = lambda t: int(t / dur * (W - 1))
    pts = [(x(i * hop), int(H - 20 - (max(-70, v) + 70) / 70 * (H - 40))) for i, v in enumerate(db)]
    d.line(pts, fill=(16, 85, 114), width=1)
    for w in words:
        d.line([x(w["start"]), 0, x(w["start"]), H], fill=(143, 182, 200))
    for c in cuts:
        d.line([x(c), 0, x(c), H], fill=(169, 11, 12), width=3)
    im.save(path); return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--new", required=True); ap.add_argument("--sentence", required=True)
    ap.add_argument("--words", required=True); ap.add_argument("--new-words", required=True)
    ap.add_argument("--preview", action="store_true"); ap.add_argument("--apply", action="store_true"); ap.add_argument("--mouth-visible", action="store_true")
    a = ap.parse_args()
    base = os.path.abspath(os.path.splitext(a.video)[0]); tmp = tempfile.mkdtemp()
    W = json.load(open(a.words, encoding="utf-8"))["words"]; NW = json.load(open(a.new_words, encoding="utf-8"))["words"]
    src = load(a.video); take = load(a.new)
    db, hop = env(src); tdb, thop = env(take)
    i, j, score = find_sentence(W, a.sentence)
    if score < 0.6:
        raise SystemExit(f"המשפט לא נמצא בתמלול (התאמה {score:.2f}). כתבו אותו כמו שנאמר.")
    # cut points on the loudness dips next to the sentence, not on whisper times
    c0 = dip(db, hop, (W[i - 1]["end"] + W[i]["start"]) / 2 if i else W[i]["start"] - 0.15)
    c1 = dip(db, hop, (W[j]["end"] + W[j + 1]["start"]) / 2 if j + 1 < len(W) else W[j]["end"] + 0.15)
    # trim the take: 50 ms before its first word, 60 ms after its last (both on the take's own loudness)
    t0 = max(0.0, dip(tdb, thop, NW[0]["start"], 0.2) - 0.05); t1 = min(len(take) / SR, dip(tdb, thop, NW[-1]["end"], 0.2) + 0.06)
    piece = take[int(t0 * SR): int(t1 * SR)]
    old = src[int(c0 * SR): int(c1 * SR)]
    # noise match
    nf_src, nf_take = noise_floor(src, db, hop), noise_floor(take, tdb, thop)
    report = {"sentence_words": " ".join(w["text"] for w in W[i:j + 1]), "match": round(score, 2), "cut": [round(c0, 3), round(c1, 3)],
              "take_trim": [round(t0, 3), round(t1, 3)], "noise_src_db": round(nf_src, 1), "noise_take_db": round(nf_take, 1)}
    p = os.path.join(tmp, "piece.wav"); save(piece, p)
    chain = []
    if nf_take > nf_src + 3:
        chain.append("afftdn=nr=6"); report["noise"] = "afftdn=nr=6 (ההקלטה החדשה רועשת יותר)"
    eq, parts = eq_filter(old, piece); chain.append(eq); report["eq"] = parts
    fixed = os.path.join(tmp, "piece_fx.wav"); run(["ffmpeg", "-y", "-v", "error", "-i", p, "-af", ",".join(chain), fixed]); piece = load(fixed)
    if nf_take < nf_src - 3:  # add the source's own room tone from its silences
        quiet = np.concatenate([src[int(k * hop * SR): int((k + 1) * hop * SR)] for k in np.where(db < nf_src + 2)[0][:400]]) if (db < nf_src + 2).any() else np.zeros(1)
        tone = np.resize(quiet, len(piece)); piece = piece + tone; report["noise"] = "רעש רקע מהמקור נוסף להקלטה"
    # level: the active speech of the 10 s before the join
    target = active_level(src, db, hop, c0); pdb, _ = env(piece)
    cur = float(np.mean(pdb[pdb > np.percentile(pdb, 30) + 6])) if (pdb > np.percentile(pdb, 30) + 6).any() else float(np.mean(pdb))
    piece *= 10 ** ((target - cur) / 20); report["gain_db"] = round(target - cur, 2)
    # 40 ms fades on both sides of each join
    f = int(0.04 * SR); ramp = np.linspace(0, 1, f)
    piece[:f] *= ramp; piece[-f:] *= ramp[::-1]
    pre, post = src[: int(c0 * SR)].copy(), src[int(c1 * SR):].copy()
    pre[-f:] *= ramp[::-1]; post[:f] *= ramp
    voice = np.concatenate([pre, piece, post]); shift = len(piece) / SR - (c1 - c0)
    report["shift_s"] = round(shift, 3)
    report["graph"] = graph(base + ".replace-graph.png", src, W, [c0, c1])
    # everything after the join moves by the difference (the words file carries captions and effects timing)
    nwords = W[:i] + [{**w, "start": round(c0 + (w["start"] - t0), 3), "end": round(c0 + (w["end"] - t0), 3)} for w in NW] + [{**w, "start": round(w["start"] + shift, 3), "end": round(w["end"] + shift, 3)} for w in W[j + 1:]]
    vw = base + ".fixed-voice.wav"; save(voice, vw); report["voice_wav"] = vw
    if a.preview or not a.apply:
        s, e = max(0.0, c0 - 5), c0 + 5
        pv = base + ".replace-preview.wav"; save(voice[int(s * SR): int(e * SR)], pv); report["preview"] = pv
    if a.apply:
        out = base + ".fixed.mp4"
        if shift < 0:      # shorter line: trim the picture under it from its end
            vf = f"[0:v]trim=0:{c1 + shift:.3f},setpts=PTS-STARTPTS[a];[0:v]trim={c1:.3f},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]"
        elif shift > 0:    # longer line: hold the frame (a B-roll should cover it)
            vf = f"[0:v]trim=0:{c1:.3f},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={shift:.3f}[a];[0:v]trim={c1:.3f},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0[v]"
            report["needs_broll"] = f"המשפט החדש ארוך ב-{shift:.2f} שנ׳. כדאי בירול שיכסה את ההפרש (בינתיים הפריים מוחזק)."
        else:
            vf = "[0:v]null[v]"
        r = run(["ffmpeg", "-y", "-v", "error", "-i", a.video, "-i", vw, "-filter_complex", vf, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-c:a", "aac", "-b:a", "256k", out])
        if r.returncode:
            raise SystemExit(r.stderr[-1500:])
        report["output"] = out
        wp = base + ".fixed.words.json"; json.dump({"words": nwords, "engine": "replaced", "status": "ok"}, open(wp, "w", encoding="utf-8"), ensure_ascii=False, indent=1); report["words"] = wp
        if a.mouth_visible:
            report["mouth"] = "רואים את הפה בזמן המשפט: כדאי לכסות בבירול או בזווית אחרת מתוך הסרטון."
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
