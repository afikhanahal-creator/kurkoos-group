"""Shared drawing kit for the signature effects: sprites, easing, post effects, procedural worlds and the
synthesized sound effects. Every helper works on BGR uint8 frames (OpenCV) and BGRA uint8 sprites.
"""
from __future__ import annotations
import math
import os
import wave

import cv2
import numpy as np

import hebtext as T

W, H, FPS = 1080, 1920, 30
NAVY, RED, TEAL, MIST, WHITE = (58, 41, 7), (12, 11, 169), (114, 85, 16), (200, 182, 143), (255, 255, 255)
GLOW = (215, 205, 40)          # bright teal for glows and rims (BGR)
GOLD = (40, 180, 235)
GREY_BG = (38, 38, 38)


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = clamp(x)
    return x ** 3


def ease_in_out(x):
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def back_out(x, s=1.9):
    x = clamp(x) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def spring(t, f=2.4, z=0.6):
    """Closed form step response of a damped spring, 0 before t=0, settles at 1."""
    if t <= 0:
        return 0.0
    w = 2 * math.pi * f
    if z >= 1:
        return 1 - math.exp(-w * t) * (1 + w * t)
    wd = w * math.sqrt(1 - z * z)
    return 1 - math.exp(-z * w * t) * (math.cos(wd * t) + (z * w / wd) * math.sin(wd * t))


def hash01(n: int) -> float:
    n = (n * 2654435761) & 0xFFFFFFFF
    n ^= n >> 15
    n = (n * 2246822519) & 0xFFFFFFFF
    n ^= n >> 13
    return (n & 0xFFFFFF) / float(0x1000000)


# ---------------------------------------------------------------- sprites
def text_sprite(text: str, size: int, color=WHITE, weight: int = 700, pad: int = 10, stroke: int = 0, stroke_color=(0, 0, 0)) -> np.ndarray:
    im = T.render_text(text, size, (color[2], color[1], color[0]), weight, stroke=stroke, stroke_color=(stroke_color[2], stroke_color[1], stroke_color[0]), pad=pad)
    a = np.asarray(im)
    return np.ascontiguousarray(a[..., [2, 1, 0, 3]])


def fit_text(text: str, max_w: int, size: int, weight: int = 700) -> int:
    w = T.measure(text, size, weight)[0]
    return size if w <= max_w else max(18, int(size * max_w / max(1, w)))


def rrect(w: int, h: int, r: int, color, alpha: int = 255, border: int = 0, border_color=None, ss: int = 3) -> np.ndarray:
    """Anti-aliased rounded rectangle sprite (drawn 3x then reduced)."""
    W2, H2, R2 = w * ss, h * ss, max(1, r * ss)
    im = np.zeros((H2, W2, 4), np.uint8)

    def fill(img, x0, y0, x1, y1, rr, col):
        rr = int(min(rr, (x1 - x0) // 2, (y1 - y0) // 2))
        cv2.rectangle(img, (x0 + rr, y0), (x1 - rr, y1), col, -1)
        cv2.rectangle(img, (x0, y0 + rr), (x1, y1 - rr), col, -1)
        for cx, cy in ((x0 + rr, y0 + rr), (x1 - rr, y0 + rr), (x0 + rr, y1 - rr), (x1 - rr, y1 - rr)):
            cv2.circle(img, (cx, cy), rr, col, -1)
    if border:
        fill(im, 0, 0, W2 - 1, H2 - 1, R2, tuple(border_color or WHITE) + (255,))
        b = border * ss
        fill(im, b, b, W2 - 1 - b, H2 - 1 - b, max(1, R2 - b), tuple(color) + (alpha,))
    else:
        fill(im, 0, 0, W2 - 1, H2 - 1, R2, tuple(color) + (alpha,))
    return cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)


def compose(back: np.ndarray, front: np.ndarray, x: int, y: int) -> None:
    """Paste BGRA sprite `front` onto BGRA sprite `back` at x,y (in place)."""
    h, w = front.shape[:2]
    roi = back[y:y + h, x:x + w]
    fa = front[..., 3:4].astype(np.float32) / 255
    ba = roi[..., 3:4].astype(np.float32) / 255
    oa = fa + ba * (1 - fa)
    rgb = (front[..., :3] * fa + roi[..., :3] * ba * (1 - fa)) / np.maximum(oa, 1e-4)
    roi[..., :3] = rgb.astype(np.uint8)
    roi[..., 3:4] = (oa * 255).astype(np.uint8)


def glowed(spr: np.ndarray, radius: int, color=GLOW, strength: float = 1.2) -> np.ndarray:
    p = radius * 2
    s = cv2.copyMakeBorder(spr, p, p, p, p, cv2.BORDER_CONSTANT, value=0)
    a = s[..., 3].astype(np.float32) / 255
    g = np.clip(cv2.GaussianBlur(a, (0, 0), radius) * strength, 0, 1)
    oa = a + g * (1 - a)
    rgb = (s[..., :3].astype(np.float32) * a[..., None] + np.array(color, np.float32) * (g * (1 - a))[..., None]) / np.maximum(oa, 1e-4)[..., None]
    return np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (oa * 255).astype(np.uint8)])


def blit(dst: np.ndarray, spr: np.ndarray, cx: float, cy: float, scale: float = 1.0, angle: float = 0.0, alpha: float = 1.0, sy: float | None = None) -> None:
    """Draw sprite centred at (cx, cy), scaled (sy: separate vertical scale), rotated (degrees), with alpha."""
    if alpha <= 0.003 or scale <= 0.001:
        return
    h, w = spr.shape[:2]
    a, b = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    sx, syy = scale, scale if sy is None else sy
    M = np.array([[a * sx, b * syy, 0.0], [-b * sx, a * syy, 0.0]])
    M[:, 2] = np.array([cx, cy]) - M[:, :2] @ np.array([w / 2, h / 2])
    pts = np.array([[0, 0, 1], [w, 0, 1], [w, h, 1], [0, h, 1]], np.float64) @ M.T
    HH, WW = dst.shape[:2]
    x0, y0 = max(0, int(math.floor(pts[:, 0].min()))), max(0, int(math.floor(pts[:, 1].min())))
    x1, y1 = min(WW, int(math.ceil(pts[:, 0].max())) + 1), min(HH, int(math.ceil(pts[:, 1].max())) + 1)
    if x1 <= x0 or y1 <= y0:
        return
    M2 = M.copy()
    M2[0, 2] -= x0
    M2[1, 2] -= y0
    out = cv2.warpAffine(spr, M2, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    al = out[..., 3:4].astype(np.float32) * (alpha / 255.0)
    roi = dst[y0:y1, x0:x1]
    roi[:] = (roi.astype(np.float32) * (1 - al) + out[..., :3].astype(np.float32) * al).astype(np.uint8)


def add_light(dst: np.ndarray, layer: np.ndarray, strength: float = 1.0) -> None:
    """Additive light (layer is float32 BGR 0..255)."""
    np.clip(dst.astype(np.float32) + layer * strength, 0, 255, out=layer)
    dst[:] = layer.astype(np.uint8)


def over(dst: np.ndarray, src: np.ndarray, mask: np.ndarray) -> None:
    m = mask[..., None] if mask.ndim == 2 else mask
    dst[:] = (dst.astype(np.float32) * (1 - m) + src.astype(np.float32) * m).astype(np.uint8)


# ---------------------------------------------------------------- post effects
def shake(frame: np.ndarray, dx: float, dy: float, rot: float = 0.0, zoom: float = 1.0) -> np.ndarray:
    if abs(dx) < 0.3 and abs(dy) < 0.3 and abs(rot) < 0.02 and abs(zoom - 1) < 1e-3:
        return frame
    M = cv2.getRotationMatrix2D((W / 2, H / 2), rot, zoom * (1 + (abs(dx) + abs(dy)) / W))
    M[0, 2] += dx
    M[1, 2] += dy
    return cv2.warpAffine(frame, M, (frame.shape[1], frame.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def flash(frame: np.ndarray, a: float, color=WHITE) -> np.ndarray:
    if a <= 0.003:
        return frame
    f = frame.astype(np.float32)
    return np.clip(f + (np.array(color, np.float32) - f) * clamp(a), 0, 255).astype(np.uint8)


def rgb_split(frame: np.ndarray, px: float) -> np.ndarray:
    s = int(round(px))
    if s == 0:
        return frame
    out = frame.copy()
    out[..., 2] = np.roll(frame[..., 2], s, axis=1)
    out[..., 0] = np.roll(frame[..., 0], -s, axis=1)
    return out


def cold(frame: np.ndarray, k: float) -> np.ndarray:
    if k <= 0.003:
        return frame
    f = frame.astype(np.float32)
    g = f.mean(axis=2, keepdims=True)
    c = f * 0.45 + g * 0.55
    c = c * np.array([1.22, 1.04, 0.82], np.float32) + np.array([18, 6, -6], np.float32)
    return np.clip(f * (1 - k) + c * k, 0, 255).astype(np.uint8)


def grey(frame: np.ndarray, k: float = 1.0) -> np.ndarray:
    if k <= 0.003:
        return frame
    g = cv2.cvtColor(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
    if k >= 0.997:
        return g
    return cv2.addWeighted(frame, 1 - k, g, k, 0)


def zoom_center(frame: np.ndarray, z: float, cx: float = W / 2, cy: float = H / 2) -> np.ndarray:
    if abs(z - 1) < 1e-4:
        return frame
    M = np.array([[z, 0, cx - z * cx], [0, z, cy - z * cy]], np.float64)
    return cv2.warpAffine(frame, M, (frame.shape[1], frame.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def mosaic(img: np.ndarray, block: int) -> np.ndarray:
    h, w = img.shape[:2]
    s = cv2.resize(img, (max(1, w // block), max(1, h // block)), interpolation=cv2.INTER_AREA)
    return cv2.resize(s, (w, h), interpolation=cv2.INTER_NEAREST)


# ---------------------------------------------------------------- small icons
def stopwatch(size: int) -> np.ndarray:
    ss = 3
    S = size * ss
    im = np.zeros((S, S, 4), np.uint8)
    c = (S // 2, int(S * 0.56))
    r = int(S * 0.38)
    cv2.rectangle(im, (S // 2 - S // 14, int(S * 0.06)), (S // 2 + S // 14, int(S * 0.16)), WHITE + (255,), -1)
    cv2.circle(im, c, r, WHITE + (255,), -1, cv2.LINE_AA)
    cv2.circle(im, c, int(r * 0.84), (120, 70, 20, 255), -1, cv2.LINE_AA)
    for k in range(12):
        a = k * math.pi / 6
        p0 = (int(c[0] + math.cos(a) * r * 0.7), int(c[1] + math.sin(a) * r * 0.7))
        p1 = (int(c[0] + math.cos(a) * r * 0.78), int(c[1] + math.sin(a) * r * 0.78))
        cv2.line(im, p0, p1, WHITE + (255,), ss * 2, cv2.LINE_AA)
    cv2.line(im, c, (c[0], c[1] - int(r * 0.62)), WHITE + (255,), ss * 4, cv2.LINE_AA)
    cv2.line(im, c, (c[0] + int(r * 0.4), c[1] + int(r * 0.2)), (215, 205, 40, 255), ss * 4, cv2.LINE_AA)
    return cv2.resize(im, (size, size), interpolation=cv2.INTER_AREA)


def heart(size: int, color=(60, 40, 235)) -> np.ndarray:
    ss = 3
    S = size * ss
    im = np.zeros((S, S, 4), np.uint8)
    t = np.linspace(0, 2 * math.pi, 120)
    x = 16 * np.sin(t) ** 3
    y = -(13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t))
    pts = np.stack([x / 36 * S + S / 2, y / 36 * S + S / 2], 1).astype(np.int32)
    cv2.fillPoly(im, [pts], tuple(color) + (255,), cv2.LINE_AA)
    return cv2.resize(im, (size, size), interpolation=cv2.INTER_AREA)


def finger(size: int) -> np.ndarray:
    """A pointing hand cursor (white with dark outline), tip at the top centre."""
    ss = 3
    S = size * ss
    im = np.zeros((S, S, 4), np.uint8)
    u = S / 10
    body = np.array([[4.2, 0.6], [5.8, 0.6], [5.8, 4.2], [7.4, 4.0], [8.6, 4.6], [8.6, 7.6], [7.4, 9.6], [3.6, 9.6], [2.0, 7.0], [1.4, 5.4], [2.2, 5.0], [4.2, 6.2]]) * u
    pts = body.astype(np.int32)
    cv2.fillPoly(im, [pts], (30, 30, 30, 255), cv2.LINE_AA)
    inner = ((body - body.mean(0)) * 0.86 + body.mean(0)).astype(np.int32)
    cv2.fillPoly(im, [inner], (255, 255, 255, 255), cv2.LINE_AA)
    return cv2.resize(im, (size, size), interpolation=cv2.INTER_AREA)


def check_mark(size: int, color=WHITE) -> np.ndarray:
    ss = 3
    S = size * ss
    im = np.zeros((S, S, 4), np.uint8)
    cv2.polylines(im, [np.array([[S * 0.18, S * 0.52], [S * 0.42, S * 0.76], [S * 0.84, S * 0.28]], np.int32)], False, tuple(color) + (255,), int(S * 0.13), cv2.LINE_AA)
    return cv2.resize(im, (size, size), interpolation=cv2.INTER_AREA)


# ---------------------------------------------------------------- procedural worlds (no image model key: drawn in code)
def _noise(h, w, scale, seed):
    rng = np.random.default_rng(seed)
    small = rng.random((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)


def fbm(h, w, seed, octaves=5, base=256):
    acc, amp, tot = np.zeros((h, w), np.float32), 1.0, 0.0
    for o in range(octaves):
        acc += _noise(h, w, max(2, base >> o), seed + o * 17) * amp
        tot += amp
        amp *= 0.55
    acc /= tot
    return (acc - acc.min()) / max(1e-6, acc.max() - acc.min())


def world_space(w=W, h=H, seed=3) -> dict:
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    base = np.array([40, 8, 6], np.float32) * (1 - yy) + np.array([70, 14, 30], np.float32) * yy
    img = np.repeat(base, w, axis=1)
    n1, n2 = fbm(h, w, seed, 6, 512), fbm(h, w, seed + 50, 6, 384)
    neb1 = np.clip((n1 - 0.45) * 2.4, 0, 1) ** 1.6
    neb2 = np.clip((n2 - 0.5) * 2.6, 0, 1) ** 1.8
    img += neb1[..., None] * np.array([200, 60, 150], np.float32) + neb2[..., None] * np.array([210, 170, 40], np.float32)
    rng = np.random.default_rng(seed)
    for _ in range(2600):
        x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
        b = rng.random() ** 3 * 220 + 25
        img[y, x] = np.minimum(255, img[y, x] + b)
    # a planet low in the frame
    cx, cy, r = int(w * 0.78), int(h * 0.83), int(w * 0.32)
    Y, X = np.ogrid[:h, :w]
    d = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / r
    disk = np.clip((1 - d) * 40, 0, 1)
    shade = np.clip(1.1 - ((X - cx + r * 0.5) ** 2 + (Y - cy + r * 0.5) ** 2) ** 0.5 / (r * 1.6), 0.08, 1)
    planet = np.array([150, 90, 60], np.float32) * shade[..., None]
    img = img * (1 - disk[..., None]) + planet * disk[..., None]
    rim = np.clip(1 - np.abs(d - 1) * 30, 0, 1) * (X < cx)
    img += rim[..., None] * np.array([255, 200, 120], np.float32) * 0.6
    stars = [(int(rng.integers(0, w)), int(rng.integers(0, h)), rng.random() * 6, 1.5 + rng.random() * 3, 1 + int(rng.random() * 3)) for _ in range(160)]
    return {"img": np.clip(img, 0, 255).astype(np.uint8), "stars": stars, "rim": (255, 120, 210), "name": "חלל"}


def world_underwater(w=W, h=H, seed=5) -> dict:
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    img = np.repeat(np.array([150, 120, 20], np.float32) * (1 - yy) + np.array([60, 35, 4], np.float32) * yy, w, axis=1)
    X = np.arange(w, dtype=np.float32)[None, :]
    Y = np.arange(h, dtype=np.float32)[:, None]
    for k in range(6):   # god rays from the surface
        x0 = w * (0.1 + 0.16 * k)
        ray = np.clip(1 - np.abs((X - x0) - (Y * 0.25)) / (40 + 20 * k % 3), 0, 1) * np.clip(1 - Y / (h * 0.9), 0, 1)
        img += ray[..., None] * np.array([90, 80, 30], np.float32) * 0.5
    sand = np.clip((Y - h * 0.86) / (h * 0.14), 0, 1) * np.ones_like(X)
    img = img * (1 - sand[..., None]) + np.array([120, 170, 190], np.float32) * sand[..., None] * (0.7 + 0.3 * fbm(h, w, seed, 4, 64)[..., None])
    rng = np.random.default_rng(seed)
    bubbles = [(rng.random() * w, rng.random() * h, 4 + rng.random() * 14, 60 + rng.random() * 140, rng.random() * 6) for _ in range(70)]
    return {"img": np.clip(img, 0, 255).astype(np.uint8), "bubbles": bubbles, "rim": (255, 230, 90), "name": "מתחת למים"}


def world_city(w=W, h=H, seed=9) -> dict:
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    img = np.repeat(np.array([60, 10, 22], np.float32) * (1 - yy) + np.array([110, 30, 90], np.float32) * yy, w, axis=1)
    rng = np.random.default_rng(seed)
    horizon = int(h * 0.74)
    for layer, (shade, hmax) in enumerate(((0.45, 0.55), (0.7, 0.42), (1.0, 0.3))):
        x = 0
        while x < w:
            bw = int(rng.integers(60, 170))
            bh = int(h * hmax * (0.35 + rng.random() * 0.65))
            col = np.array([40, 18, 24], np.float32) * shade + 8
            cv2.rectangle(img, (x, horizon - bh), (x + bw, horizon), tuple(float(c) for c in col), -1)
            for wy in range(horizon - bh + 16, horizon - 10, 22):
                for wx in range(x + 10, x + bw - 10, 18):
                    if rng.random() < 0.38:
                        c = (255, 230, 120) if rng.random() < 0.5 else (200, 120, 255)
                        cv2.rectangle(img, (wx, wy), (wx + 7, wy + 10), tuple(float(v) * (0.5 + 0.5 * shade) for v in c), -1)
            if layer == 2 and rng.random() < 0.4:
                ny = horizon - bh - 6
                c = (255, 80, 255) if rng.random() < 0.5 else (255, 255, 60)
                cv2.line(img, (x + 6, ny), (x + bw - 6, ny), c, 5)
            x += bw + int(rng.integers(4, 18))
    ground = img[horizon:].copy()
    refl = cv2.flip(img[max(0, 2 * horizon - h):horizon], 0)
    refl = cv2.resize(refl, (w, h - horizon))
    img[horizon:] = (refl * 0.35 + ground * 0.2 + np.array([40, 10, 20], np.float32) * 0.45)
    for k in range(5):   # neon floor lines
        y = horizon + int((h - horizon) * (k + 1) / 6) ** 1
        cv2.line(img, (0, y), (w, y), (255, 60, 255) if k % 2 else (255, 255, 60), 2)
    streaks = [(rng.random(), horizon - rng.random() * h * 0.5, 300 + rng.random() * 900, (255, 80, 255) if rng.random() < 0.5 else (255, 255, 80), 0.5 + rng.random()) for _ in range(14)]
    return {"img": np.clip(img, 0, 255).astype(np.uint8), "streaks": streaks, "rim": (255, 90, 255), "name": "עיר עתידנית"}


def mini_city(w: int, h: int, seed=11) -> np.ndarray:
    """A tilt-shift miniature town, daylight, for the giant effect."""
    rng = np.random.default_rng(seed)
    img = np.zeros((h, w, 3), np.float32)
    sky = int(h * 0.38)
    yy = np.linspace(0, 1, sky, dtype=np.float32)[:, None, None]
    img[:sky] = np.repeat(np.array([235, 205, 150], np.float32) * (1 - yy) + np.array([240, 225, 200], np.float32) * yy, w, axis=1)
    img[sky:] = np.array([110, 165, 120], np.float32)
    for r in range(4):   # roads
        y = sky + int((h - sky) * (0.2 + 0.25 * r))
        cv2.rectangle(img, (0, y), (w, y + max(6, h // 40)), (90, 90, 95), -1)
        for x in range(0, w, 40):
            cv2.line(img, (x, y + max(3, h // 80)), (x + 18, y + max(3, h // 80)), (230, 230, 230), 2)
    rows = sorted([sky + int((h - sky) * f) for f in rng.random(46) * 0.95])
    for y in rows:
        x = int(rng.integers(0, w))
        s = 0.5 + (y - sky) / max(1, h - sky) * 1.2
        bw, bh = int((20 + rng.random() * 40) * s), int((20 + rng.random() * 70) * s)
        col = [(200, 220, 245), (170, 200, 240), (210, 230, 230), (190, 190, 235), (225, 225, 240)][int(rng.integers(0, 5))]
        cv2.rectangle(img, (x, y - bh), (x + bw, y), col, -1)
        cv2.rectangle(img, (x, y - bh), (x + bw, y - bh + max(3, bh // 6)), (60, 70, 160), -1)
        for wy in range(y - bh + 8, y - 4, max(6, int(10 * s))):
            for wx in range(x + 4, x + bw - 4, max(6, int(10 * s))):
                cv2.rectangle(img, (wx, wy), (wx + max(2, int(4 * s)), wy + max(2, int(4 * s))), (120, 90, 60), -1)
        if rng.random() < 0.7:
            tx = x + bw + int(8 * s)
            cv2.circle(img, (tx, y - int(10 * s)), int(10 * s), (60, 130, 60), -1)
    img = np.clip(img, 0, 255).astype(np.uint8)
    # tilt shift: sharp band in the middle, blur growing to top and bottom
    blur = cv2.GaussianBlur(img, (0, 0), 7)
    yy = np.abs(np.linspace(-1, 1, h, dtype=np.float32) - 0.15)[:, None, None]
    k = np.clip((yy - 0.25) * 2.2, 0, 1)
    out = img * (1 - k) + blur * k
    hsv = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.35, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)


WORLDS = {"space": world_space, "underwater": world_underwater, "city": world_city}


# ---------------------------------------------------------------- synthesized sound effects (48 kHz mono, no third party rights)
SR = 48000


def _env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(1e-4, a)) * np.exp(-t / max(1e-4, d))


def _bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def _norm(x, peak=0.89):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def _sweep(n, f0, f1):
    f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def _rev(x, n_echo=6, d=0.045, k=0.42):
    out = np.concatenate([x, np.zeros(int(SR * d * n_echo))])
    for i in range(1, n_echo + 1):
        s = int(SR * d * i * (1 + 0.13 * i))
        if s < len(out):
            out[s:s + len(x)] += x[: len(out) - s] * (k ** i)
    return out


def synth_all(out_dir: str) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    rng = np.random.default_rng(42)
    N = lambda s: int(SR * s)
    noise = lambda s: rng.standard_normal(N(s))
    snd = {}
    n = N(1.6)
    snd["slam"] = _rev(_sweep(n, 140, 32) * _env(n, 0.002, 0.45) * 1.0 + _bp(noise(1.6), 60, 3000) * _env(n, 0.001, 0.08) * 0.8)
    n = N(2.4)
    snd["boom"] = _rev(_sweep(n, 90, 24) * _env(n, 0.004, 0.9) + _bp(noise(2.4), 30, 500) * _env(n, 0.01, 0.6) * 0.6, 8, 0.07, 0.5)
    n = N(0.5)
    snd["impact"] = _sweep(n, 180, 50) * _env(n, 0.001, 0.12) + _bp(noise(0.5), 200, 5000) * _env(n, 0.001, 0.03) * 0.5
    for name, (lo, hi, dur, rise) in {"whoosh": (300, 4000, 0.55, 0.5), "whoosh-in": (400, 6000, 0.35, 0.85), "whoosh-up": (500, 7000, 0.45, 0.7), "dive": (200, 5000, 1.0, 0.92)}.items():
        n = N(dur)
        t = np.arange(n) / n
        env = np.exp(-((t - rise) / 0.22) ** 2)
        x = _bp(noise(dur), lo, hi) * env
        if name == "dive":
            x += _sweep(n, 120, 900) * env * 0.4
        snd[name] = x
    n = N(0.2)
    crack = np.zeros(n)
    for k in range(9):
        s = int(rng.integers(0, n - 300))
        crack[s:s + 240] += _bp(rng.standard_normal(240), 2000, 12000) * np.exp(-np.arange(240) / 40)
    snd["crack"] = crack
    n = N(1.1)
    sh = _bp(noise(1.1), 1500, 14000) * _env(n, 0.001, 0.12)
    for k in range(60):
        s = int(rng.integers(0, N(0.7)))
        f = 2500 + rng.random() * 5000
        L = N(0.08 + rng.random() * 0.25)
        seg = np.sin(2 * np.pi * f * np.arange(L) / SR) * np.exp(-np.arange(L) / (L / 4)) * (0.25 + rng.random() * 0.3)
        sh[s:s + L] += seg[: len(sh) - s]
    sh[:N(0.5)] += _sweep(N(0.5), 120, 40) * _env(N(0.5), 0.001, 0.12) * 0.8
    snd["shatter"] = sh
    snd["glass-rev"] = sh[::-1] * np.linspace(0.2, 1, len(sh))
    n = N(0.7)
    snd["stomp"] = _rev(_sweep(n, 70, 28) * _env(n, 0.002, 0.25) + _bp(noise(0.7), 40, 900) * _env(n, 0.003, 0.18) * 0.9, 4, 0.06, 0.4)
    n = N(0.7)
    cr = np.zeros(n)
    for k in range(140):
        s = int(rng.integers(0, n - 500))
        L = int(80 + rng.random() * 300)
        cr[s:s + L] += _bp(rng.standard_normal(L), 1500 + rng.random() * 3000, 9000) * np.exp(-np.arange(L) / (L / 3)) * (0.3 + rng.random() * 0.7) * (1 - s / n)
    snd["crumble"] = cr
    snd["rebuild"] = cr[::-1]
    n = N(0.9)
    t = np.arange(n) / n
    snd["freeze"] = np.concatenate([_bp(noise(0.9), 3000, 14000) * t ** 3, np.sin(2 * np.pi * 2093 * np.arange(N(0.5)) / SR) * _env(N(0.5), 0.001, 0.2) * 0.5])
    n = N(0.6)
    snd["release"] = _bp(noise(0.6), 300, 8000) * _env(n, 0.001, 0.1) + _sweep(n, 600, 120) * _env(n, 0.001, 0.15) * 0.5
    n = N(0.6)
    ct = np.zeros(n)
    for k in range(18):
        s = int(n * (1 - (1 - k / 18) ** 0.6))
        L = N(0.012)
        ct[s:s + L] += np.sin(2 * np.pi * (1800 + 40 * k) * np.arange(L) / SR) * np.exp(-np.arange(L) / (L / 3))
    snd["counter"] = ct
    n = N(0.05)
    snd["key"] = _bp(noise(0.05), 1500, 9000) * _env(n, 0.0005, 0.006)
    n = N(0.35)
    snd["stamp"] = _sweep(n, 160, 60) * _env(n, 0.001, 0.07) + _bp(noise(0.35), 200, 3000) * _env(n, 0.001, 0.04) * 0.8
    n = N(1.2)
    gold = snd["stamp"].copy()
    gold = np.concatenate([gold, np.zeros(n - len(gold))])
    for f in (1568, 2093, 2637, 3136):
        gold += np.sin(2 * np.pi * f * np.arange(n) / SR) * _env(n, 0.01, 0.35) * 0.15
    snd["stamp-gold"] = gold
    n = N(0.3)
    snd["strike"] = _bp(noise(0.3), 1200, 7000) * np.sin(np.linspace(0, np.pi, n)) ** 2 * (0.6 + 0.4 * np.sin(np.arange(n) / SR * 2 * np.pi * 30))
    n = N(0.7)
    t = np.arange(n) / n
    snd["fall"] = _bp(noise(0.7), 300, 3000) * np.exp(-((t - 0.4) / 0.25) ** 2) + _sweep(n, 900, 150) * np.exp(-((t - 0.4) / 0.3) ** 2) * 0.3
    n = N(0.8)
    snd["holo-on"] = _sweep(n, 200, 2400) * _env(n, 0.02, 0.4) * 0.6 + _bp(noise(0.8), 3000, 12000) * (rng.random(n) < 0.02) * 0.8
    snd["holo-off"] = snd["holo-on"][::-1]
    n = N(1.0)
    cf = np.zeros(n)
    for k in range(40):
        s = int(rng.integers(0, n - 800))
        L = int(200 + rng.random() * 500)
        cf[s:s + L] += _bp(rng.standard_normal(L), 2000, 10000) * np.exp(-np.arange(L) / (L / 4)) * (1 - s / n)
    cf[:N(0.3)] += _sweep(N(0.3), 300, 80) * _env(N(0.3), 0.001, 0.06)
    snd["confetti"] = cf
    n = N(1.3)
    t = np.arange(n) / SR
    f = 300 + 2600 * (t / 1.3) ** 1.6
    rw = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25 + _bp(noise(1.3), 1000, 9000) * 0.35
    rw *= (0.7 + 0.3 * np.sin(2 * np.pi * 7 * t)) * np.minimum(1, t / 0.05) * np.minimum(1, (1.3 - t) / 0.08)
    snd["rewind"] = _bp(rw, 150, 12000)
    n = N(0.6)
    snd["cube"] = _bp(noise(0.6), 300, 5000) * np.exp(-((np.arange(n) / n - 0.4) / 0.2) ** 2) + _sweep(n, 120, 60) * _env(n, 0.25, 0.1) * 0.0
    n = N(0.25)
    snd["pulse"] = np.sin(2 * np.pi * 110 * np.arange(n) / SR) * _env(n, 0.005, 0.08)
    paths = {}
    for k, x in snd.items():
        x = _norm(x)
        p = os.path.join(out_dir, f"sig-{k}.wav")
        with wave.open(p, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes((x * 32767).astype(np.int16).tobytes())
        paths[k] = p
    return paths
