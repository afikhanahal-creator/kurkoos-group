"""Person mask for every frame with rembg (u2net_human_seg), computed once and cached to an .npz.

    python3 person.py clip.mp4            # writes clip.mask.npz (uint8 masks at 1/4 size + fps)
    from person import Masks; m = Masks('clip.mask.npz'); m.at(t, (H, W)) -> float32 HxW in 0..1
"""
from __future__ import annotations
import os
import sys
import numpy as np


SEG_SMALL = (os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "selfie_segmenter.tflite"),
             "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite")


def compute(clip: str, out: str | None = None, scale: float = 0.25, every: int = 1) -> str:
    """rembg (u2net_human_seg) first; when its model cannot be downloaded (a closed network), MediaPipe's selfie
    segmenter (a small model from storage.googleapis.com, shipped with the engine); when neither works, an empty mask
    file, so effects that need the person simply draw without the cut-out instead of stopping the edit."""
    try:
        return _compute_rembg(clip, out, scale, every)
    except Exception as e:
        print("rembg unavailable:", str(e)[:160], file=sys.stderr)
    try:
        return _compute_mediapipe(clip, out, scale, every)
    except Exception as e:
        print("mediapipe unavailable:", str(e)[:160], file=sys.stderr)
    out = out or os.path.splitext(clip)[0] + ".mask.npz"
    np.savez_compressed(out, masks=np.zeros((0, 1, 1), np.uint8), fps=30.0, every=every, scale=scale)
    return out


def _compute_mediapipe(clip, out, scale, every):
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import vision, BaseOptions
    path, url = SEG_SMALL
    if not os.path.exists(path):
        import urllib.request
        os.makedirs(os.path.dirname(path), exist_ok=True)
        urllib.request.urlretrieve(url, path)
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(base_options=BaseOptions(model_asset_path=path), output_confidence_masks=True))
    cap = cv2.VideoCapture(clip)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    masks, idx = [], 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        if idx % every == 0:
            small = cv2.resize(fr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
            r = seg.segment(img)
            cm = r.confidence_masks[-1].numpy_view()
            masks.append((np.clip(cm, 0, 1) * 255).astype(np.uint8).reshape(small.shape[:2]))
        idx += 1
    cap.release()
    try:
        seg.close()
    except Exception:
        pass
    out = out or os.path.splitext(clip)[0] + ".mask.npz"
    np.savez_compressed(out, masks=np.stack(masks) if masks else np.zeros((0, 1, 1), np.uint8), fps=fps, every=every, scale=scale)
    return out


def _compute_rembg(clip, out, scale, every):
    import cv2
    from rembg import new_session, remove
    from PIL import Image
    sess = new_session("u2net_human_seg")
    cap = cv2.VideoCapture(clip)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    masks, idx = [], 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        if idx % every == 0:
            small = cv2.resize(fr, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            im = Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
            m = remove(im, session=sess, only_mask=True)
            masks.append(np.asarray(m, dtype=np.uint8))
        idx += 1
    cap.release()
    out = out or os.path.splitext(clip)[0] + ".mask.npz"
    np.savez_compressed(out, masks=np.stack(masks) if masks else np.zeros((0, 1, 1), np.uint8), fps=fps, every=every, scale=scale)
    return out


class Masks:
    def __init__(self, path: str):
        d = np.load(path)
        self.m, self.fps, self.every, self.scale = d["masks"], float(d["fps"]), int(d["every"]), float(d["scale"])
        self._cache = {}

    @property
    def ok(self) -> bool:
        return len(self.m) > 0 and self.m.max() > 30

    def at(self, src_t: float, size: tuple[int, int], feather: int = 9) -> np.ndarray:
        import cv2
        i = min(len(self.m) - 1, int(round(src_t * self.fps / self.every)))
        key = (i, size)
        if key in self._cache:
            return self._cache[key]
        H, W = size
        m = cv2.resize(self.m[i], (W, H), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255.0
        if feather:
            m = cv2.GaussianBlur(m, (feather | 1, feather | 1), 0)
        if len(self._cache) > 64:
            self._cache.clear()
        self._cache[key] = m
        return m

    def bbox(self, src_t: float) -> tuple[float, float, float, float] | None:
        """(x0, y0, x1, y1) as fractions of the frame, where the person is. None when nobody is found."""
        i = min(len(self.m) - 1, int(round(src_t * self.fps / self.every)))
        m = self.m[i] > 128
        if m.sum() < 50:
            return None
        ys, xs = np.where(m)
        h, w = m.shape
        return xs.min() / w, ys.min() / h, xs.max() / w, ys.max() / h


if __name__ == "__main__":
    print(compute(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
