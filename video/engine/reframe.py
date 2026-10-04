"""1080x1920 reframe that keeps the face in the frame (guide: "הפנים שלי תמיד בפריים").

    python3 reframe.py clip.mp4 --detect              # face track + a 6-frame before/after sheet, no render
    python3 reframe.py clip.mp4 --preview             # low-res render of the 10 s with the most movement
    python3 reframe.py clip.mp4 --render              # full render, original audio copied without re-encoding

Needs MediaPipe 0.10.35 in a venv (the newest crashes on Mac): `python3 -m venv .mpvenv && .mpvenv/bin/pip install
mediapipe==0.10.35`, and the model blaze_face_short_range.tflite next to this file (downloaded on first run).
Rules: FaceDetector in VIDEO mode, the highest-score face per frame (hands can score as faces, lower), frames with no
face take the nearest found value; a dead zone of about 8% of the source width (about 150 px at 1920) where the window
does not move; outside it the window follows with a critically damped spring (never overshoots) until the face is back
at the edge of the zone, faster near the window edge; the window is the full source height and height x 9/16 wide,
scaled to 1080x1920; it never leaves the source; at a hard cut in the source (scene > 0.3) it jumps in the same frame.
Another person counts only when seen more than 1 s in a row with a score above 0.8; then the script stops and asks.
"""
from __future__ import annotations
import argparse, json, os, re, subprocess, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "blaze_face_short_range.tflite")
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", p], capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    n, d = v["r_frame_rate"].split("/")
    return {"w": v["width"], "h": v["height"], "fps": float(n) / float(d), "dur": float(j["format"]["duration"]), "frames": int(v.get("nb_frames") or 0)}


def frames(path, w, h, scale=1.0):
    sw, sh = int(w * scale) // 2 * 2, int(h * scale) // 2 * 2
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={sw}:{sh}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    n = sw * sh * 3
    import numpy as np
    while True:
        b = p.stdout.read(n)
        if len(b) < n:
            break
        try:
            yield np.frombuffer(b, np.uint8).reshape(sh, sw, 3)
        except GeneratorExit:
            p.kill(); raise
    p.wait()


def scene_cuts(path, fps):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vf", "select='gt(scene,0.3)',showinfo", "-f", "null", "-"], capture_output=True, text=True)
    return sorted({round(float(t) * fps) for t in re.findall(r"pts_time:([\d.]+)", r.stderr)})


def detect(path, info):
    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision
    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    det = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(base_options=mpt.BaseOptions(model_asset_path=MODEL), running_mode=vision.RunningMode.VIDEO, min_detection_confidence=0.5))
    scale = min(1.0, 960 / info["w"])
    track, others = [], []
    for i, fr in enumerate(frames(path, info["w"], info["h"], scale)):
        res = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=fr), int(i * 1000 / info["fps"]))
        fs = sorted(res.detections, key=lambda d: -d.categories[0].score)
        if fs:
            b = fs[0].bounding_box
            track.append({"x": (b.origin_x + b.width / 2) / scale, "y": (b.origin_y + b.height / 2) / scale, "w": b.width / scale, "h": b.height / scale, "s": fs[0].categories[0].score})
        else:
            track.append(None)
        others.append(sum(1 for d in fs[1:] if d.categories[0].score > 0.8))
    det.close()
    # frames without a face take the nearest frame that had one
    idx = [i for i, t in enumerate(track) if t]
    if not idx:
        raise SystemExit("לא נמצאו פנים בסרטון. אין לפי מה לחתוך.")
    for i, t in enumerate(track):
        if not t:
            j = min(idx, key=lambda k: abs(k - i)); track[i] = dict(track[j], filled=True)
    # a second person: more than 1 s in a row with score > 0.8
    run_, longest = 0, 0
    for o in others:
        run_ = run_ + 1 if o else 0; longest = max(longest, run_)
    return track, longest / info["fps"]


def path_x(track, info, cuts):
    """Dead zone ~8% of source width, critically damped spring that never overshoots, jump at hard cuts."""
    W, H, fps = info["w"], info["h"], info["fps"]
    cw = int(round(H * 9 / 16 / 2) * 2)
    cw = min(cw, W)
    dz = 0.08 * W / 2
    lo, hi = cw / 2, W - cw / 2
    cx = min(max(track[0]["x"], lo), hi); v = 0.0
    out, cutset = [], set(cuts)
    for i, t in enumerate(track):
        fx = t["x"]
        if i in cutset:
            cx = min(max(fx, lo), hi); v = 0.0
        else:
            off = fx - cx
            if abs(off) > dz:
                target = fx - math.copysign(dz, off)
                edge = abs(off) / (cw / 2)                       # faster when the face nears the window edge
                omega = 6.0 + 18.0 * max(0.0, min(1.0, (edge - 0.3) / 0.6))
                dt = 1 / fps
                x0 = cx - target
                # exact critically damped step: never overshoots the target
                e = math.exp(-omega * dt)
                nx = (x0 + (v + omega * x0) * dt) * e
                v = (v - omega * (v + omega * x0) * dt) * e
                cx = target + nx
                if (off > 0 and cx > target) or (off < 0 and cx < target):
                    cx, v = target, 0.0
            else:
                v *= 0.5
        cx = min(max(cx, lo), hi)
        out.append(cx)
    return out, cw


import math  # noqa: E402  (used above)


def sheet(path, info, xs, cw, out_png, track):
    """6 frames from different moments: the source with the window drawn, and the reframed result."""
    from PIL import Image, ImageDraw
    n = len(xs); picks = [int(n * k / 6 + n / 12) for k in range(6)]
    cells = []
    for f in picks:
        t = f / info["fps"]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
        import io
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        x0 = int(xs[f] - cw / 2)
        crop = im.crop((x0, 0, x0 + cw, info["h"])).resize((216, 384))
        d = ImageDraw.Draw(im); d.rectangle([x0, 0, x0 + cw, info["h"] - 1], outline=(169, 11, 12), width=8)
        fy = track[f]["y"]; d.line([0, info["h"] / 3, info["w"], info["h"] / 3], fill=(143, 182, 200), width=3)
        src = im.resize((int(384 * info["w"] / info["h"]), 384))
        cell = Image.new("RGB", (src.width + 216 + 12, 384), "white"); cell.paste(src, (0, 0)); cell.paste(crop, (src.width + 12, 0))
        cells.append(cell)
    W = max(c.width for c in cells)
    out = Image.new("RGB", (W * 2 + 12, 384 * 3 + 24), "white")
    for k, c in enumerate(cells):
        out.paste(c, ((k % 2) * (W + 12), (k // 2) * (384 + 12)))
    out.save(out_png)
    return out_png


def render(path, info, xs, cw, out, start=0.0, dur=None, low=False):
    W, H, fps = info["w"], info["h"], info["fps"]
    ow, oh = (540, 960) if low else (1080, 1920)
    f0 = int(start * fps); f1 = len(xs) if dur is None else min(len(xs), f0 + int(dur * fps))
    enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ow}x{oh}", "-r", str(fps), "-i", "-",
                            "-ss", f"{start:.3f}", *(["-t", f"{(f1 - f0) / fps:.3f}"] if dur else []), "-i", path,
                            "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "veryfast" if low else "medium", "-crf", "26" if low else "17",
                            "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", out], stdin=subprocess.PIPE)
    from PIL import Image
    for i, fr in enumerate(frames(path, W, H)):
        if i < f0:
            continue
        if i >= f1:
            break
        x0 = int(round(xs[i] - cw / 2)); x0 = max(0, min(W - cw, x0))
        im = Image.fromarray(fr[:, x0:x0 + cw]).resize((ow, oh), Image.LANCZOS)
        enc.stdin.write(im.tobytes())
    enc.stdin.close(); enc.wait()
    return out


def busiest(xs, fps, win=10):
    n = int(win * fps)
    if len(xs) <= n:
        return 0.0
    mv = [abs(xs[i + 1] - xs[i]) for i in range(len(xs) - 1)]
    best, bi, s = -1, 0, sum(mv[:n])
    for i in range(len(mv) - n):
        if s > best:
            best, bi = s, i
        s += mv[i + n] - mv[i]
    return bi / fps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--detect", action="store_true"); ap.add_argument("--preview", action="store_true"); ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    info = probe(a.video); base = os.path.abspath(os.path.splitext(a.video)[0])
    track, other = detect(a.video, info)
    cuts = scene_cuts(a.video, info["fps"])
    xs, cw = path_x(track, info, cuts)
    eyes_third = sum(1 for t in track if t["y"] - t["h"] * 0.15 < info["h"] * 0.42) / len(track)
    moved = max(xs) - min(xs)
    rep = {"frames": len(track), "faces_found": sum(1 for t in track if not t.get("filled")), "hard_cuts": cuts, "window": [cw, info["h"]],
           "upscale": round(1920 / info["h"], 2), "moved_px": round(moved), "static": moved < 4, "second_person_seconds": round(other, 2),
           "eyes_in_upper_third_share": round(eyes_third, 2)}
    if other > 1.0:
        rep["stop"] = "יש אדם נוסף בפריים יותר משנייה ברצף. צריך להחליט את מי לעקוב לפני שממשיכים."
    if info["h"] < 2000:
        rep["quality_note"] = f"המקור {info['w']}x{info['h']}: החלון מוגדל פי {rep['upscale']}. אם יש קובץ 4K כדאי לעבוד ממנו."
    json.dump({"x": [round(x, 1) for x in xs], "cw": cw, **rep}, open(base + ".reframe.json", "w"), ensure_ascii=False)
    rep["sheet"] = sheet(a.video, info, xs, cw, base + ".reframe-sheet.png", track)
    if a.preview and "stop" not in rep:
        st = busiest(xs, info["fps"]); rep["preview"] = render(a.video, info, xs, cw, base + ".reframe.preview.mp4", st, 10, low=True); rep["preview_from"] = round(st, 2)
    if a.render and "stop" not in rep:
        rep["output"] = render(a.video, info, xs, cw, base + ".9x16.mp4")
    print(json.dumps(rep, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
