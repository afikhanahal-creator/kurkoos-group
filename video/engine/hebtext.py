"""Hebrew text drawn with Pillow + RAQM (right to left, correct shaping). Never cv2.putText for Hebrew.

    from hebtext import Text
    T = Text(fonts_dir)
    T.draw(frame_bgr, "שלום", x=1000, y=200, size=72, color=(255,255,255), anchor="ra", weight=700)
"""
from __future__ import annotations
import os
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFont, features

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(os.path.dirname(HERE), "fonts")
assert features.check("raqm"), "Pillow without RAQM: Hebrew would come out reversed"


@lru_cache(maxsize=64)
def font(weight: int = 700, size: int = 64, fonts_dir: str = FONTS):
    w = 700 if weight >= 600 else (300 if weight <= 300 else 400)
    p = os.path.join(fonts_dir, f"Almoni-{w}.ttf")
    if not os.path.exists(p):
        p = os.path.join(fonts_dir, "Heebo.ttf")
    f = ImageFont.truetype(p, size)
    if "Heebo" in p:
        try:
            f.set_variation_by_name("Bold" if weight >= 600 else "Regular")
        except Exception:
            pass
    return f


def measure(text: str, size: int, weight: int = 700) -> tuple[int, int]:
    f = font(weight, size)
    l, t, r, b = f.getbbox(text, direction="rtl")
    return r - l, b - t


def render_text(text: str, size: int, color, weight: int = 700, stroke: int = 0, stroke_color=(0, 0, 0), pad: int = 8) -> Image.Image:
    """RGBA image of the text, tight box plus padding."""
    f = font(weight, size)
    l, t, r, b = f.getbbox(text, direction="rtl", stroke_width=stroke)
    im = Image.new("RGBA", (max(1, r - l + 2 * pad), max(1, b - t + 2 * pad)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((pad - l, pad - t), text, font=f, fill=tuple(color) + (255,), direction="rtl",
           stroke_width=stroke, stroke_fill=tuple(stroke_color) + (255,))
    return im


def paste(frame_bgr: np.ndarray, im: Image.Image, x: int, y: int, alpha: float = 1.0) -> None:
    """Alpha-composite an RGBA PIL image onto a BGR numpy frame, in place. x,y = top left."""
    H, W = frame_bgr.shape[:2]
    w, h = im.size
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    crop = np.asarray(im)[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    a = crop[..., 3:4] / 255.0 * alpha
    rgb = crop[..., :3][..., ::-1]
    dst = frame_bgr[y0:y1, x0:x1].astype(np.float32)
    frame_bgr[y0:y1, x0:x1] = (dst * (1 - a) + rgb * a).astype(np.uint8)


def draw(frame_bgr: np.ndarray, text: str, x: int, y: int, size: int, color=(255, 255, 255), weight: int = 700,
         anchor: str = "ra", stroke: int = 0, stroke_color=(0, 0, 0), alpha: float = 1.0, scale: float = 1.0) -> tuple[int, int, int, int]:
    """Draw Hebrew text. anchor: 'ra' right/top, 'la' left/top, 'ma' centre/top, 'mm' centre/middle. Returns the box drawn."""
    im = render_text(text, size, color, weight, stroke, stroke_color)
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    w, h = im.size
    if anchor[0] == "r":
        x0 = x - w
    elif anchor[0] == "m":
        x0 = x - w // 2
    else:
        x0 = x
    y0 = y - h // 2 if anchor[1] == "m" else y
    paste(frame_bgr, im, x0, y0, alpha)
    return x0, y0, w, h


def wrap(text: str, size: int, max_w: int, weight: int = 700) -> list[str]:
    words = text.split()
    lines, cur = [], []
    for w in words:
        trial = " ".join(cur + [w])
        if cur and measure(trial, size, weight)[0] > max_w:
            lines.append(" ".join(cur))
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(" ".join(cur))
    return lines
