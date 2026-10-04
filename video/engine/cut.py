"""Silence and filler cutter (guide: "סרטון שבו הדיבור זורם בלי חורים").

    python3 cut.py clip.mp4 --words clip.words.json --plan            # writes clip.cutplan.json + prints the cut table, cuts nothing
    python3 cut.py clip.mp4 --apply clip.cutplan.json [--keep 12.3-13.1] # after approval: one ffmpeg pass, words remapped, verified

Rules (from the guide, enforced here):
- every silence (silencedetect, about -35 dB, from 0.15 s) is removed; each join keeps 0.1 s in total, half after the
  previous word and half before the next, so no consonant is cut; 0.05 s at the start and at the end
- "אה"/"אמ" fillers, stuck words (the same word twice in a row), a sentence said twice (the last full take stays) and a
  sentence started and abandoned are removed; whisper rarely writes fillers, so voice with no word on it is removed too
- a natural self-correction and repetitions the creator marks with --keep stay
- every cut point sits inside silence, at the quietest 10 ms within it, and is rounded to a whole frame
- the cut is one ffmpeg pass (trim/atrim per segment, concat) with 30 ms fades at every join; resolution is kept
- word times in the cut file are computed from the original transcript (never re-transcribe the cut file)
- the result is measured again: no silence longer than 0.2 s may remain
- joins where the picture jumps get a suggested 12% punch-in
"""
from __future__ import annotations
import argparse, json, math, os, re, subprocess, sys, time

FILLERS = {"אה", "אהה", "אהם", "אמ", "אממ", "אם-", "אה-", "אממם", "הממ", "אֶה", "אֶמ", "uh", "um", "umm", "erm"}
NOISE_DB, MIN_SIL = -35, 0.15
PAD, EDGE, FADE = 0.05, 0.05, 0.030


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path])
    j = json.loads(r.stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    num, den = (v["r_frame_rate"].split("/") if v else ("30", "1"))
    return {"dur": float(j["format"]["duration"]), "fps": float(num) / float(den or 1), "w": v and v["width"], "h": v and v["height"], "audio": bool(a)}


def silences(path, db=NOISE_DB, d=MIN_SIL):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", f"silencedetect=noise={db}dB:d={d}", "-f", "null", "-"])
    out, s = [], None
    for line in r.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", line)
        if m:
            s = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and s is not None:
            out.append([max(0.0, s), float(m.group(1))]); s = None
    if s is not None:
        out.append([s, probe(path)["dur"]])
    return out


def envelope(path, hop=0.01):
    """RMS in dBFS per 10 ms, from the audio itself (whisper word edges are not exact)."""
    import numpy as np
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True)
    a = np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768.0
    n = int(16000 * hop); k = len(a) // n
    rms = np.sqrt((a[: k * n].reshape(k, n) ** 2).mean(1) + 1e-12)
    return 20 * np.log10(rms), hop


def norm(t):
    return re.sub(r"[^\w֐-׿]", "", t).strip()


def sentences(words, gap=0.55):
    """Sentences by punctuation, or by a gap longer than `gap` between words."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        end = bool(re.search(r"[.?!:]$", w["text"].strip()))
        nxt = words[i + 1] if i + 1 < len(words) else None
        if end or not nxt or nxt["start"] - w["end"] > gap:
            out.append(cur); cur = []
    return out


def sim(a, b):
    import difflib
    return difflib.SequenceMatcher(None, a, b).ratio()


def decide(words, keep_ranges):
    """Which words go, and why: fillers, stuck words, repeated takes, abandoned sentences."""
    drop = {}
    def kept(i):
        w = words[i]
        return any(a - 0.02 <= w["start"] and w["end"] <= b + 0.02 for a, b in keep_ranges)
    for i, w in enumerate(words):
        if norm(w["text"]) in FILLERS and not kept(i):
            drop[i] = "מילת מילוי"
    for i in range(len(words) - 1):
        if norm(words[i]["text"]) and norm(words[i]["text"]) == norm(words[i + 1]["text"]) and not kept(i):
            drop.setdefault(i, "מילה שנתקעה")
    S = sentences(words)
    txt = [" ".join(norm(words[i]["text"]) for i in s) for s in S]
    for k in range(len(S) - 1):
        a, b = txt[k], txt[k + 1]
        if not a:
            continue
        finished = bool(re.search(r"[.?!:]$", words[S[k][-1]]["text"].strip()))
        same_take = sim(a, b) >= 0.8
        restart = (not finished) and (b.startswith(a[: max(6, len(a) // 2)]) or sim(a, b[: len(a)]) >= 0.75)
        if (same_take or restart) and not any(kept(i) for i in S[k]):
            why = "משפט שנאמר פעמיים (נשאר הטייק האחרון והשלם)" if same_take and finished else "משפט שהתחיל ונעזב באמצע"
            for i in S[k]:
                drop.setdefault(i, why)
    return drop


def islands(dur, sil):
    """Voiced ranges = everything that is not measured silence."""
    out, t = [], 0.0
    for s, e in sil:
        if s - t > 0.02:
            out.append([t, s])
        t = e
    if dur - t > 0.02:
        out.append([t, dur])
    return out


def quietest(db, hop, a, b):
    i0, i1 = int(a / hop), max(int(a / hop) + 1, int(b / hop))
    seg = db[i0:i1]
    if not len(seg):
        return (a + b) / 2, -120.0
    j = int(seg.argmin())
    return (i0 + j + 0.5) * hop, float(seg[j])


def plan(path, words_path, keep_ranges):
    info = probe(path); fps = info["fps"]; dur = info["dur"]
    sil = silences(path)
    db, hop = envelope(path)
    W = json.load(open(words_path, encoding="utf-8"))["words"] if words_path and os.path.exists(words_path) else []
    drop = decide(W, keep_ranges) if W else {}
    removed = []  # table rows: start, end, words, reason
    keep = []
    for a, b in islands(dur, sil):
        on = [i for i, w in enumerate(W) if w["end"] > a + 0.02 and w["start"] < b - 0.02]
        if W and not on:
            if not any(x <= a and b <= y for x, y in keep_ranges):
                removed.append([a, b, "", "קול בלי מילה (אה/אמ)"]); continue
        gone = [i for i in on if i in drop]
        if on and len(gone) == len(on):
            removed.append([a, b, " ".join(W[i]["text"] for i in on), drop[on[0]]]); continue
        if gone:  # part of the island goes: split inside it at the quietest point next to the removed words
            cur = a
            i = 0
            while i < len(on):
                if on[i] in drop:
                    j = i
                    while j + 1 < len(on) and on[j + 1] in drop:
                        j += 1
                    ga, gb = W[on[i]]["start"], W[on[j]]["end"]
                    lo = quietest(db, hop, max(cur, ga - 0.12), ga + 0.04)[0] if ga > cur + 0.05 else cur
                    hi = quietest(db, hop, gb - 0.04, min(b, gb + 0.12))[0] if gb < b - 0.05 else b
                    if lo > cur + 0.03:
                        keep.append([cur, lo])
                    removed.append([lo, hi, " ".join(W[on[k]]["text"] for k in range(i, j + 1)), drop[on[i]]])
                    cur = hi; i = j + 1
                else:
                    i += 1
            if b > cur + 0.03:
                keep.append([cur, b])
            continue
        keep.append([a, b])
    # pad every kept range by 0.05 s into its silences (0.1 s per join, 0.05 s at the edges) and snap to frames
    segs = []
    for k, (a, b) in enumerate(keep):
        a2 = max(0.0, a - (EDGE if k == 0 else PAD)); b2 = min(dur, b + (EDGE if k == len(keep) - 1 else PAD))
        a2 = math.floor(a2 * fps) / fps; b2 = math.ceil(b2 * fps) / fps
        if segs and a2 <= segs[-1][1] + 1e-6:
            segs[-1][1] = max(segs[-1][1], b2)
        else:
            segs.append([round(a2, 4), round(min(dur, b2), 4)])
    # every cut must sit in silence: report the level at each edge
    checks = []
    for a, b in segs:
        for t in (a, b):
            if 0.02 < t < dur - 0.02:
                i = int(t / hop); lvl = float(db[max(0, i - 1): i + 2].max())
                checks.append([round(t, 3), round(lvl, 1), lvl < NOISE_DB + 3])
    long_sil = [s for s in sil if s[1] - s[0] > 0.2]
    joins = []
    t_out = 0.0
    for k, (a, b) in enumerate(segs):
        t_out += b - a
        if k < len(segs) - 1:
            gap = segs[k + 1][0] - b
            joins.append({"at_out": round(t_out, 3), "at_src": round(b, 3), "removed": round(gap, 3), "zoom": gap >= 0.3})
    p = {"source": os.path.abspath(path), "fps": fps, "size": [info["w"], info["h"]], "duration": round(dur, 3), "segments": segs,
         "removed": [[round(a, 3), round(b, 3), w, r] for a, b, w, r in sorted(removed)], "cut_checks": checks,
         "joins": joins, "kept_duration": round(sum(b - a for a, b in segs), 3),
         "nothing_to_cut": not long_sil and not any(r[3].startswith("משפט") for r in removed),
         "encode_minutes_estimate": round(dur / 60 * (6 if (info["h"] or 0) >= 2000 else 1.2), 1)}
    return p


def table(p):
    rows = [f"| {a:6.2f} עד {b:6.2f} | {w or '—'} | {r} |" for a, b, w, r in p["removed"]]
    gaps = []
    segs = p["segments"]
    for k in range(len(segs) - 1):
        gaps.append(f"| {segs[k][1]:6.2f} עד {segs[k + 1][0]:6.2f} | — | שתיקה ({segs[k + 1][0] - segs[k][1]:.2f} שנ׳) |")
    head = "| זמן | מילים שנמחקות | סיבה |\n|---|---|---|"
    allr = sorted([(a, f"| {a:6.2f} עד {b:6.2f} | {w or '—'} | {r} |") for a, b, w, r in p["removed"]] +
                  [(segs[k][1], g) for k, g in enumerate(gaps)])
    return head + "\n" + "\n".join(x[1] for x in allr)


def apply(p, out, words_path=None):
    src, segs, fps = p["source"], p["segments"], p["fps"]
    parts, ins = [], []
    for k, (a, b) in enumerate(segs):
        d = b - a
        fi = f"afade=t=in:st=0:d={FADE}," if k > 0 else ""
        fo = f",afade=t=out:st={max(0, d - FADE):.4f}:d={FADE}" if k < len(segs) - 1 else ""
        parts.append(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{k}];[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,{fi}anull{fo}[a{k}]")
        ins.append(f"[v{k}][a{k}]")
    fc = ";".join(parts) + ";" + "".join(ins) + f"concat=n={len(segs)}:v=1:a=1[v][a]"
    t0 = time.time()
    r = run(["ffmpeg", "-y", "-v", "error", "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-r", str(fps),
             "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out])
    if r.returncode:
        raise SystemExit(r.stderr[-2000:])
    res = {"output": out, "seconds": round(time.time() - t0, 1)}
    # word times in the cut file come from the original transcript and the kept segments
    if words_path and os.path.exists(words_path):
        W = json.load(open(words_path, encoding="utf-8"))["words"]
        nw, offs, off = [], [], 0.0
        for a, b in segs:
            offs.append(off); off += b - a
        for w in W:  # each word goes to the kept segment it overlaps most (a word whose midpoint fell in a removed pause still stays)
            best, bi = 0.0, -1
            for k, (a, b) in enumerate(segs):
                ov = min(w["end"], b) - max(w["start"], a)
                if ov > best:
                    best, bi = ov, k
            if bi < 0 or best < 0.3 * max(0.01, w["end"] - w["start"]):
                continue
            a, b = segs[bi]
            s0, e0 = max(w["start"], a), min(w["end"], b)
            nw.append({**w, "start": round(s0 - a + offs[bi], 3), "end": round(e0 - a + offs[bi], 3)})
        nw.sort(key=lambda x: x["start"])
        wp = os.path.splitext(out)[0] + ".words.json"
        json.dump({"words": nw, "duration": round(off, 3), "engine": "remapped-from-original", "status": "ok"}, open(wp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        res["words"] = wp
    left = [s for s in silences(out) if s[1] - s[0] > 0.2]
    res["silences_over_0.2"] = left
    res["verified"] = not left
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--words")
    ap.add_argument("--keep", action="append", default=[], help="a range that must stay, e.g. 12.3-13.1")
    ap.add_argument("--plan", action="store_true")
    ap.add_argument("--apply")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()
    keep = [tuple(map(float, k.split("-"))) for k in a.keep]
    if a.apply:
        p = json.load(open(a.apply, encoding="utf-8"))
        out = a.out or os.path.splitext(p["source"])[0] + ".cut.mp4"
        print(json.dumps(apply(p, out, a.words), ensure_ascii=False, indent=1))
        return
    p = plan(a.video, a.words, keep)
    pp = os.path.splitext(a.video)[0] + ".cutplan.json"
    json.dump(p, open(pp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(table(p))
    print(f"\nplan: {pp} · {p['duration']} s → {p['kept_duration']} s · joins: {len(p['joins'])} · zoom suggested at "
          + ", ".join(f"{j['at_out']:.2f}" for j in p["joins"] if j["zoom"]))
    if p["nothing_to_cut"]:
        print("אין שתיקה ארוכה מ-0.2 שנייה ואין טייק כפול. אין מה לחתוך.")
    bad = [c for c in p["cut_checks"] if not c[2]]
    if bad:
        print("cut points not in silence:", bad)


if __name__ == "__main__":
    main()
