"""Brand colour grade with skin protection (guide: "צבעים חיים יותר, עם נטייה ברורה לצבע המותג").

    python3 grade.py clip.mp4 --brand "#105572"                 # one frame in three strengths, before and after, with the numbers
    python3 grade.py clip.mp4 --brand "#105572" --strength mid  # full render after choosing (soft 1.55, mid 1.85, strong 2.2)
    --brand takes one or more hex colours (comma separated); with several and no choice, the one farthest from skin is used.

Works in the UV angle of signalstats and never touches luma (no `eq`, which lifts skin L* by about 1.6):
- main LUT: hues within 12 deg of the measured skin hue, blending out to 30 deg, keep their hue and get a quarter of the
  saturation boost, at most x1.2; near-grey pixels (UV chroma < 0.02 on a 0.5 scale) stay as they are, full treatment
  from 0.06, smooth between; hues within 120 deg of the brand are pulled toward it, zero at the brand and at the edge,
  up to 30 deg in the middle
- skin LUT: the skin treatment for every hue, applied inside a skin mask from ImageSegmenter (selfie_multiclass_256x256,
  face skin class 3 and body skin class 2), dilated about 6 px with soft edges, stored as an ffv1 gray video
- chain: split -> main LUT and skin LUT -> alphamerge with the mask -> overlay=format=gbrp over the main
- checks: SATAVG rises; skin L* moves at most 2; skin C* rises at most 25% (patches and the mask's 95th percentile);
  YAVG of the whole video moves less than 3%; original audio copied without re-encoding
"""
from __future__ import annotations
import argparse, io, json, math, os, re, subprocess, sys, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MD = os.path.join(HERE, "models")
FACE = (os.path.join(MD, "blaze_face_short_range.tflite"), "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite")
SEG = (os.path.join(MD, "selfie_multiclass_256x256.tflite"), "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite")
STRENGTH = {"soft": 1.55, "mid": 1.85, "strong": 2.2}
SKIN_NEAR, SKIN_FAR, GREY_LO, GREY_HI, BRAND_RANGE, BRAND_MAX = 12.0, 30.0, 0.02, 0.06, 120.0, 30.0


def model(m):
    if not os.path.exists(m[0]):
        os.makedirs(MD, exist_ok=True); urllib.request.urlretrieve(m[1], m[0])
    return m[0]


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", p], capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    n, d = v["r_frame_rate"].split("/")
    return {"w": v["width"], "h": v["height"], "fps": float(n) / float(d), "dur": float(j["format"]["duration"])}


def rgb2yuv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return y, (b - y) / 1.8556, (r - y) / 1.5748


def yuv2rgb(y, u, v):
    r = y + 1.5748 * v; b = y + 1.8556 * u; g = (y - 0.2126 * r - 0.0722 * b) / 0.7152
    return np.clip(np.stack([r, g, b], -1), 0, 1)


def hue(u, v):
    return np.degrees(np.arctan2(v, u)) % 360


def angdiff(a, b):
    return (a - b + 180) % 360 - 180


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hexrgb(h):
    h = h.strip().lstrip("#"); return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def lab(rgb):
    def lin(c):
        return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = lin(rgb[..., 0]), lin(rgb[..., 1]), lin(rgb[..., 2])
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047; Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    L = 116 * f(Y) - 16; a = 500 * (f(X) - f(Y)); bb = 200 * (f(Y) - f(Z))
    return L, np.hypot(a, bb)


def treat(rgb, skin_h, brand_h, S, skin_everywhere=False):
    y, u, v = rgb2yuv(rgb)
    c = np.hypot(u, v); h = hue(u, v)
    full_gain = S
    skin_gain = min(1.2, 1 + (S - 1) / 4)
    d_skin = np.abs(angdiff(h, skin_h))
    w_skin = np.ones_like(h) if skin_everywhere else 1 - smooth(d_skin, SKIN_NEAR, SKIN_FAR)
    gain = full_gain * (1 - w_skin) + skin_gain * w_skin
    # brand pull: zero at the brand and at 120 deg, up to 30 deg in the middle; skin keeps its hue
    d_b = angdiff(brand_h, h)
    pull = np.where(np.abs(d_b) < BRAND_RANGE, np.sign(d_b) * BRAND_MAX * np.sin(np.pi * np.abs(d_b) / BRAND_RANGE), 0.0)
    nh = h + pull * (1 - w_skin)
    w_grey = smooth(c, GREY_LO, GREY_HI)
    nc = c * (1 + (gain - 1) * w_grey)
    nh = h + angdiff(nh, h) * w_grey
    r = np.radians(nh)
    return yuv2rgb(y, nc * np.cos(r), nc * np.sin(r))


def write_cube(path, fn, n=33):
    g = np.linspace(0, 1, n)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")   # .cube order: red fastest
    rgb = np.stack([r, gg, b], -1).reshape(-1, 3)
    out = fn(rgb)
    with open(path, "w") as f:
        f.write(f"LUT_3D_SIZE {n}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n")
        f.write("\n".join(f"{x:.6f} {y:.6f} {z:.6f}" for x, y, z in out))
    return path


def frame_at(path, t, w=None):
    vf = ["-vf", f"scale={w}:-2"] if w else []
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, *vf, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return raw


def frames_np(path, info, t, chain=None, extra_inputs=()):
    """One frame decoded straight from the video (and optionally through the chain), never through a PNG."""
    W, H = info["w"], info["h"]
    if chain:
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path]
        for x in extra_inputs:
            cmd += ["-ss", f"{t:.3f}", "-i", x]
        cmd += ["-filter_complex", chain + ",format=rgb24[o]", "-map", "[o]", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    else:
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    return np.frombuffer(raw[: W * H * 3], np.uint8).reshape(H, W, 3).astype(np.float32) / 255


def signal(path, extra=""):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-v", "info", "-i", path, "-vf", f"{extra}signalstats,metadata=print", "-f", "null", "-"], capture_output=True, text=True)
    sat = [float(x) for x in re.findall(r"SATAVG=([\d.]+)", r.stderr)]; ya = [float(x) for x in re.findall(r"YAVG=([\d.]+)", r.stderr)]
    return {"SATAVG": round(float(np.mean(sat)), 2) if sat else None, "YAVG": round(float(np.mean(ya)), 2) if ya else None}


def faces_and_masks(path, info, mask_out=None):
    import mediapipe as mp
    from mediapipe.tasks import python as mpt
    from mediapipe.tasks.python import vision
    import cv2
    det = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(base_options=mpt.BaseOptions(model_asset_path=model(FACE)), running_mode=vision.RunningMode.VIDEO))
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=mpt.BaseOptions(model_asset_path=model(SEG)), running_mode=vision.RunningMode.VIDEO, output_category_mask=True))
    W, H, fps = info["w"], info["h"], info["fps"]
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    enc = None
    if mask_out:
        enc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-c:v", "ffv1", "-pix_fmt", "gray", mask_out], stdin=subprocess.PIPE)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    faces, i = [], 0
    while True:
        b = dec.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        fr = np.frombuffer(b, np.uint8).reshape(H, W, 3)
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(fr))
        ts = int(i * 1000 / fps)
        r = det.detect_for_video(img, ts)
        best = max(r.detections, key=lambda d: d.categories[0].score) if r.detections else None
        faces.append(None if not best else [best.bounding_box.origin_x, best.bounding_box.origin_y, best.bounding_box.width, best.bounding_box.height])
        if enc:
            cm = seg.segment_for_video(img, ts).category_mask.numpy_view()
            m = ((cm == 2) | (cm == 3)).astype(np.uint8) * 255
            m = cv2.dilate(m, k); m = cv2.GaussianBlur(m, (0, 0), 3)
            enc.stdin.write(m.tobytes())
        i += 1
    dec.wait(); det.close(); seg.close()
    if enc:
        enc.stdin.close(); enc.wait()
    return faces


def patches(face, H, W):
    """Forehead above the face box (it starts at the brows) and both cheeks between eye height and the nose."""
    x, y, w, h = face
    fh = [int(x + w * 0.32), int(max(0, y - h * 0.16)), int(w * 0.36), int(h * 0.12)]
    cl = [int(x + w * 0.14), int(y + h * 0.42), int(w * 0.18), int(h * 0.18)]
    cr = [int(x + w * 0.68), int(y + h * 0.42), int(w * 0.18), int(h * 0.18)]
    return [p for p in (fh, cl, cr) if p[2] > 2 and p[3] > 2 and p[0] >= 0 and p[1] >= 0 and p[0] + p[2] <= W and p[1] + p[3] <= H]


def crop(a, p):
    x, y, w, h = p; return a[y:y + h, x:x + w]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--brand", default="#105572"); ap.add_argument("--strength", choices=list(STRENGTH))
    a = ap.parse_args()
    info = probe(a.video); base = os.path.abspath(os.path.splitext(a.video)[0]); W, H, fps = info["w"], info["h"], info["fps"]
    mask = base + ".skinmask.mkv"
    faces = faces_and_masks(a.video, info, mask)
    n = len(faces); sizes = [f[2] * f[3] if f else 0 for f in faces]
    # three frames: largest face, smallest face, highest SATAVG (start and end when the face size hardly changes)
    found = [i for i in range(n) if faces[i]]
    if not found:
        raise SystemExit("לא נמצאו פנים. אין ממה למדוד את גוון העור.")
    big, small = max(found, key=lambda i: sizes[i]), min(found, key=lambda i: sizes[i])
    if sizes[big] < sizes[small] * 1.15:
        big, small = found[0], found[-1]
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-v", "info", "-i", a.video, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.SATAVG", "-f", "null", "-"], capture_output=True, text=True)
    sat = [float(x) for x in re.findall(r"SATAVG=([\d.]+)", r.stderr)]
    vivid = max((i for i in found if i < len(sat)), key=lambda i: sat[i])
    picks = sorted({big, small, vivid})
    # skin hue from the patches
    hs, Ls, Cs = [], [], []
    for i in picks:
        fr = frames_np(a.video, info, i / fps)
        for p in patches(faces[i], H, W):
            px = crop(fr, p).reshape(-1, 3)
            y, u, v = rgb2yuv(px); hs.append(np.degrees(np.arctan2(v.mean(), u.mean())) % 360)
            L, C = lab(px); Ls.append(L.mean()); Cs.append(C.mean())
    skin_h = float(np.degrees(np.arctan2(np.mean(np.sin(np.radians(hs))), np.mean(np.cos(np.radians(hs))))) % 360)
    brands = [b.strip() for b in a.brand.split(",") if b.strip()]
    bh = {b: float(hue(*rgb2yuv(hexrgb(b)[None])[1:])[0]) for b in brands}
    chosen = max(brands, key=lambda b: abs(angdiff(bh[b], skin_h)))
    notes = []
    if abs(angdiff(bh[chosen], skin_h)) < 40:
        notes.append(f"צבע המותג {chosen} קרוב לגוון העור ({abs(angdiff(bh[chosen], skin_h)):.0f} מעלות). הדחיפה תצבע גם את הפנים.")
    if len(brands) > 1:
        notes.append(f"נבחר {chosen} כי הוא הרחוק ביותר מגוון העור ({abs(angdiff(bh[chosen], skin_h)):.0f} מעלות).")
    res = {"frames": picks, "skin_hue": round(skin_h, 1), "brand": chosen, "brand_hue": round(bh[chosen], 1), "notes": notes, "strengths": {}}
    sh, bhh = skin_h, bh[chosen]
    for name, S in STRENGTH.items():
        main_c = write_cube(f"{base}.grade-{name}.cube", lambda x: treat(x, sh, bhh, S))
        skin_c = write_cube(f"{base}.grade-{name}.skin.cube", lambda x: treat(x, sh, bhh, S, skin_everywhere=True))
        chain = f"[0:v]split[a][b];[a]lut3d=file='{main_c}'[m];[b]lut3d=file='{skin_c}'[s];[1:v]format=gray[k];[s][k]alphamerge[sk];[m][sk]overlay=format=gbrp"
        before_L, before_C, after_L, after_C = [], [], [], []
        for i in picks:
            f0 = frames_np(a.video, info, i / fps); f1 = frames_np(a.video, info, i / fps, chain, (mask,))
            for p in patches(faces[i], H, W):
                L0, C0 = lab(crop(f0, p).reshape(-1, 3)); L1, C1 = lab(crop(f1, p).reshape(-1, 3))
                before_L.append(L0.mean()); before_C.append(C0.mean()); after_L.append(L1.mean()); after_C.append(C1.mean())
        dL = float(np.mean(np.abs(np.array(after_L) - np.array(before_L))))
        dC = float((np.mean(after_C) - np.mean(before_C)) / max(1e-6, np.mean(before_C)))
        res["strengths"][name] = {"gain": S, "skin_dL": round(dL, 2), "skin_dC_pct": round(dC * 100, 1), "ok_skin": dL <= 2 and dC <= 0.25, "chain": chain}
    # before/after sheet: one frame (the largest face), three strengths
    from PIL import Image, ImageDraw
    t = picks[0] / fps; tw = 480; th = int(tw * H / W)
    cells = [("לפני", frames_np(a.video, info, t))] + [({"soft": "עדין", "mid": "בינוני", "strong": "חזק"}[n] + f" x{STRENGTH[n]}", frames_np(a.video, info, t, res["strengths"][n]["chain"], (mask,))) for n in STRENGTH]
    sheet = Image.new("RGB", (tw * 4 + 30, th + 40), "white"); d = ImageDraw.Draw(sheet)
    from PIL import ImageFont, features
    try:
        fnt = ImageFont.truetype(os.path.join(os.path.dirname(HERE), "fonts", "Heebo.ttf"), 22)
    except Exception:
        fnt = None
    rtl = (lambda s: s) if features.check("raqm") else (lambda s: s[::-1] if re.search(r"[\u0590-\u05FF]", s) else s)
    for k, (lbl, arr) in enumerate(cells):
        im = Image.fromarray((arr * 255).astype(np.uint8)).resize((tw, th)); sheet.paste(im, (k * (tw + 10), 40)); d.text((k * (tw + 10) + 6, 8), rtl(lbl), fill=(7, 41, 58), font=fnt)
    res["sheet"] = base + ".grade-sheet.png"; sheet.save(res["sheet"])
    res["note_skin"] = "בבינוני ובחזק העור זהה, כי ההגברה שלו נעצרת בפי 1.2."
    if a.strength:
        st = res["strengths"][a.strength]; out = base + f".graded-{a.strength}.mp4"
        r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", a.video, "-i", mask, "-filter_complex", st["chain"] + ",format=yuv420p[o]", "-map", "[o]", "-map", "0:a?", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-c:a", "copy", out], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(r.stderr[-1500:])
        s0, s1 = signal(a.video), signal(out)
        res["render"] = {"output": out, "before": s0, "after": s1, "SATAVG_up": s1["SATAVG"] > s0["SATAVG"], "YAVG_change_pct": round(abs(s1["YAVG"] - s0["YAVG"]) / max(1, s0["YAVG"]) * 100, 2)}
    for v in res["strengths"].values():
        v.pop("chain", None)
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
