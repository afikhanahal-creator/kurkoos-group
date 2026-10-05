"""The effects catalog: overlays, full-screen scenes and transitions, all drawn on BGR numpy frames.

Overlay renderers get (frame, o, a, R): the frame to draw on, the overlay dict, seconds since its start, the Renderer
(fonts, plan, face position, brand colours). Scenes return a whole new canvas. Transitions post-process the frame around a
cut seam. Every effect keeps the rules: nothing on the face, Hebrew through Pillow+RAQM, text only from the plan.
"""
from __future__ import annotations
import math
import os
import random

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import hebtext as T

W, H = 1080, 1920
NAVY, RED, TEAL, MIST, PALE, PAPER, WHITE, INK = (58, 41, 7), (12, 11, 169), (114, 85, 16), (200, 182, 143), (238, 232, 219), (248, 246, 244), (255, 255, 255), (42, 31, 11)
RGB = lambda bgr: (bgr[2], bgr[1], bgr[0])
EMOJI_FONT = next((p for p in ("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts", "NotoColorEmoji.ttf")) if os.path.exists(p) and os.path.getsize(p) > 100000), None)

# the catalog: id -> Hebrew name, group, one line. The page shows this list; the plan uses the ids.
CATALOG = [
    ("hook", "הוק פתיחה", "text", "משפט פתיחה בקופסאות אדומות ב-3 השניות הראשונות"),
    ("title", "כותרת ענקית", "text", "מילים שעולות אחת אחת, כרטיס פרק"),
    ("callout", "תווית", "text", "תווית קטנה: מחיר, שם, מקום"),
    ("lowerthird", "שם ותפקיד", "text", "פס תחתון עם מי מדבר"),
    ("cta", "קריאה לפעולה", "text", "עקבו / כתבו בתגובות, בסוף"),
    ("list", "רשימה נבנית", "text", "3 טיפים שנבנים פריט אחרי פריט"),
    ("keyword", "מילת מפתח קופצת", "text", "המילה החשובה קופצת באדום על המילה המדוברת"),
    ("emoji", "אימוג'י", "graphics", "ריאקציה שקופצת ליד הראש"),
    ("counter", "מונה מספרים", "graphics", "מספר שרץ: 10x, 97%, ₪"),
    ("arrow", "חץ מצויר", "graphics", "חץ שמצביע על משהו"),
    ("circle", "עיגול סימון", "graphics", "עיגול סביב דבר"),
    ("progress", "פס התקדמות", "graphics", "פס דק לאורך כל הסרטון"),
    ("flash", "הבזק", "frame", "הבזק לבן לרגע גילוי"),
    ("vignette", "וינייטה", "frame", "החשכה בקצוות למיקוד"),
    ("wash", "שטיפה אדומה", "frame", "רגע הבעיה"),
    ("lightleak", "דליפת אור", "frame", "אור חם אורגני"),
    ("glitch", "גליץ'", "frame", "פסים דיגיטליים לרגע"),
    ("burst", "פיצוץ קונפטי", "energy", "קונפטי או ניצוצות לרגע חגיגה"),
    ("scene_kinetic", "סצנה: טיפוגרפיה קינטית", "scene", "המילים המדוברות הופכות לתמונה"),
    ("scene_statement", "סצנה: הצהרה", "scene", "משפט מרכזי על מסך מלא"),
    ("scene_number", "סצנה: מספר", "scene", "מספר גדול עם תווית"),
    ("scene_list", "סצנה: רשימה", "scene", "מה מקבלים, פריט אחרי פריט"),
    ("scene_steps", "סצנה: שלבים", "scene", "1 → 2 → 3"),
    ("scene_compare", "סצנה: לפני ואחרי", "scene", "שתי עמודות"),
    ("tr_flash", "מעבר הבזק", "transition", "על החיתוך"),
    ("tr_whip", "מעבר ויפ", "transition", "טשטוש תנועה מהיר"),
    ("tr_zoom", "מעבר זום", "transition", "זום פנימה על החיתוך"),
    ("tr_glitch", "מעבר גליץ'", "transition", "פסים דיגיטליים"),
    ("tr_shake", "מעבר רעידה", "transition", "רעידה קצרה"),
    ("tr_fade", "מעבר פייד", "transition", "דעיכה לשחור"),
    ("tr_slide", "מעבר החלקה", "transition", "הקטע הבא נכנס מהצד"),
    ("tr_wipe", "מעבר ניגוב", "transition", "קו שחושף את הבא"),
    ("tr_push", "מעבר דחיפה", "transition", "הקטע הבא דוחף את הקודם"),
    ("punchin", "פאנץ' אין", "motion", "זום קל בין משפטים"),
    ("freeze", "פריים קפוא", "motion", "רגע של עצירה לפני הגילוי"),
]
PRESETS = {
    "clean":     {"he": "נקי ומינימליסטי", "caption": "karaoke", "max_words": 3, "accent": RED, "bg": "navy", "punch": 1.04,
                  "effects": ["keyword", "progress", "tr_fade"], "transitions": ["tr_fade"]},
    "punchy":    {"he": "אנרגטי", "caption": "punch", "max_words": 2, "accent": RED, "bg": "blur", "punch": 1.08,
                  "effects": ["hook", "keyword", "emoji", "counter", "progress", "cta", "punchin", "tr_whip", "tr_flash", "tr_zoom"], "transitions": ["tr_whip", "tr_flash", "tr_zoom"]},
    "cinematic": {"he": "קולנועי", "caption": "karaoke", "max_words": 3, "accent": MIST, "bg": "blur", "punch": 1.06,
                  "effects": ["vignette", "lightleak", "keyword", "tr_fade", "tr_lightleak"], "transitions": ["tr_fade"]},
    "produced":  {"he": "מופק מלא (סצנות)", "caption": "karaoke", "max_words": 3, "accent": RED, "bg": "blur", "punch": 1.1,
                  "effects": ["hook", "keyword", "counter", "scene_kinetic", "scene_number", "scene_list", "progress", "cta", "punchin", "tr_flash", "tr_zoom", "tr_whip"], "transitions": ["tr_flash", "tr_zoom", "tr_whip"]},
    "educational": {"he": "חינוכי (רשימות ושלבים)", "caption": "karaoke", "max_words": 3, "accent": TEAL, "bg": "navy", "punch": 1.05,
                  "effects": ["lowerthird", "keyword", "scene_list", "scene_steps", "callout", "progress", "tr_fade", "tr_slide"], "transitions": ["tr_slide", "tr_fade"]},
    "ad":        {"he": "פרסומת", "caption": "punch", "max_words": 2, "accent": RED, "bg": "blur", "punch": 1.1,
                  "effects": ["hook", "keyword", "scene_number", "scene_compare", "counter", "burst", "cta", "progress", "punchin", "tr_flash", "tr_push"], "transitions": ["tr_flash", "tr_push"]},
    "minimal":   {"he": "חיתוך וכתוביות בלבד", "caption": "karaoke", "max_words": 3, "accent": RED, "bg": "navy", "punch": 1.0,
                  "effects": [], "transitions": []},
}


# ---------------------------------------------------------------- helpers
def ease_out(x): x = min(1.0, max(0.0, x)); return 1 - (1 - x) ** 3
def ease_in_out(x): x = min(1.0, max(0.0, x)); return 0.5 - 0.5 * math.cos(math.pi * x)
def fade_edges(a, dur, fin=0.25, fout=0.3):
    return min(1.0, ease_out(a / fin) if fin else 1.0, (1 - ease_in_out((a - dur + fout) / fout)) if a > dur - fout else 1.0)


def rounded_box(frame, x0, y0, x1, y1, color, r=18, alpha=1.0):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    if x1 - x0 < 2 * r + 2 or y1 - y0 < 2 * r + 2:
        r = max(1, min((x1 - x0) // 2 - 1, (y1 - y0) // 2 - 1))
    ov = frame.copy()
    cv2.rectangle(ov, (x0 + r, y0), (x1 - r, y1), color, -1)
    cv2.rectangle(ov, (x0, y0 + r), (x1, y1 - r), color, -1)
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        cv2.circle(ov, (cx, cy), r, color, -1)
    cv2.addWeighted(ov, alpha, frame, 1 - alpha, 0, frame)


def text_box(frame, text, size, x_center, y_top, bg, fg, alpha=1.0, pad=None, r=18, weight=700, scale=1.0):
    im = T.render_text(text, size, RGB(fg), weight, pad=pad or int(size * 0.32))
    if scale != 1:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))))
    bx, by = int(x_center - im.width / 2), int(y_top)
    if bg is not None:
        rounded_box(frame, bx, by, bx + im.width, by + im.height, bg, r=r, alpha=alpha)
    T.paste(frame, im, bx, by, alpha)
    return bx, by, im.width, im.height


def safe_top(R, lines=1, size=72):
    """A y for text above the hair (or the top band when nobody is in frame)."""
    face = R.plan.get("face")
    if face:
        return max(50, int(face["top"] * H) - int(lines * size * 1.3) - 30)
    return int(0.09 * H)


def emoji_image(ch, size):
    if not EMOJI_FONT:
        return None
    try:
        f = ImageFont.truetype(EMOJI_FONT, 109)
        im = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((8, 8), ch, font=f, embedded_color=True)
        return im.resize((size, size), Image.LANCZOS)
    except Exception:
        return None


def bg_canvas(kind, t, accent=TEAL):
    """Scene backgrounds: gradient, grid, dots, spotlight, light, solid."""
    c = np.empty((H, W, 3), np.uint8)
    if kind == "light":
        c[:] = PAPER
        return c
    c[:] = NAVY
    if kind in ("gradient", "spotlight"):
        yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
        g = (np.array(NAVY, np.float32) * (1 - yy * 0.6) + np.array(TEAL, np.float32) * (yy * 0.6))
        c[:] = np.clip(g, 0, 255).astype(np.uint8)[:, None, :].repeat(W, axis=1) if False else np.clip(np.repeat(g[:, None, :], W, axis=1), 0, 255).astype(np.uint8)
        if kind == "spotlight":
            Y, X = np.ogrid[:H, :W]
            d = np.sqrt(((X - W / 2) / W) ** 2 + ((Y - H * 0.42) / H) ** 2)
            m = np.clip(1 - d * 1.6, 0, 1)[..., None]
            c[:] = np.clip(c.astype(np.float32) * (0.6 + 0.7 * m), 0, 255).astype(np.uint8)
    elif kind == "grid":
        for x in range(0, W, 90):
            cv2.line(c, (x, 0), (x, H), (80, 62, 24), 1)
        for y in range(0, H, 90):
            cv2.line(c, (0, y), (W, y), (80, 62, 24), 1)
    elif kind == "dots":
        for x in range(45, W, 90):
            for y in range(45, H, 90):
                cv2.circle(c, (x, y), 3, (110, 90, 40), -1)
    return c


# ---------------------------------------------------------------- overlays
def ov_hook(frame, o, a, R):
    p = fade_edges(a, o["dur"], 0.3, 0.3)
    lines = T.wrap(o["text"], 72, W - 200)
    y = safe_top(R, len(lines), 76) if R.plan.get("face") else int(0.10 * H)
    y = max(90, y)
    for i, ln in enumerate(lines):
        pin = ease_out((a - i * 0.08) / 0.3)
        im = T.render_text(ln, 72, (255, 255, 255), 700, pad=22)
        bx, by = W - 100 - im.width, y + i * 100
        rounded_box(frame, bx, by, bx + im.width, by + im.height, o.get("bg_bgr", RED), r=16, alpha=p * pin)
        T.paste(frame, im, bx, int(by + (1 - pin) * 20), alpha=p * pin)


def ov_title(frame, o, a, R):
    p = fade_edges(a, o["dur"], 0.2, 0.3)
    words = o["text"].split()
    size = o.get("size", 112)
    lines = T.wrap(o["text"], size, W - 160)
    y = int(o.get("y", 0.4) * H) - len(lines) * size * 0.65
    accent = set(o.get("accentWords", []))
    k = 0
    for ln in lines:
        ws = ln.split()
        widths = [T.measure(w, size)[0] for w in ws]
        gap = int(size * 0.25)
        x = W // 2 + (sum(widths) + gap * (len(ws) - 1)) // 2
        for w, wd in zip(ws, widths):
            rise = ease_out((a - k * 0.12) / 0.35)
            col = RGB(R.accent) if w.strip(".,!?") in accent else (255, 255, 255)
            T.draw(frame, w, x, int(y + (1 - rise) * 40), size, color=col, weight=700, anchor="ra", stroke=4, stroke_color=(7, 29, 58), alpha=p * rise)
            x -= wd + gap
            k += 1
        y += int(size * 1.25)


def ov_callout(frame, o, a, R):
    p = fade_edges(a, o["dur"], 0.2, 0.25)
    x = int(o.get("x", 0.5) * W)
    y = int(o.get("y", 0.3) * H)
    text_box(frame, o["text"], o.get("size", 50), x, y, o.get("bg_bgr", WHITE), o.get("fg_bgr", NAVY), alpha=p, scale=0.9 + 0.1 * ease_out(a / 0.2))


def ov_lowerthird(frame, o, a, R):
    p = fade_edges(a, o["dur"], 0.3, 0.3)
    y = int(o.get("y", 0.46) * H)
    w = 0.0
    slide = int((1 - ease_out(a / 0.35)) * 80)
    im = T.render_text(o["title"], 52, (255, 255, 255), 700, pad=20)
    bx = W - 72 - im.width + slide
    rounded_box(frame, bx, y, bx + im.width, y + im.height, NAVY, r=8, alpha=p * 0.95)
    cv2.rectangle(frame, (bx + im.width - 10, y), (bx + im.width, y + im.height), RED, -1)
    T.paste(frame, im, bx, y, p)
    if o.get("subtitle"):
        im2 = T.render_text(o["subtitle"], 32, RGB(NAVY), 400, pad=16)
        bx2 = W - 72 - im2.width + slide
        rounded_box(frame, bx2, y + im.height + 6, bx2 + im2.width, y + im.height + 6 + im2.height, WHITE, r=8, alpha=p * 0.95)
        T.paste(frame, im2, bx2, y + im.height + 6, p)


def ov_cta(frame, o, a, R):
    p = ease_out(a / 0.3)
    y = int(o.get("y", 0.855) * H)
    bx, by, bw, bh = text_box(frame, o["text"], 56, W // 2, y, WHITE, NAVY, alpha=p, r=22)
    hand = emoji_image(o.get("hand", "👆"), 96)
    if hand:
        bob = int(6 * math.sin(a * 6))
        T.paste(frame, hand, W // 2 - 48, by + bh + 12 + bob, p)


def ov_list(frame, o, a, R):
    p = fade_edges(a, o["dur"], 0.2, 0.3)
    y = int(o.get("y", 0.17) * H)
    if o.get("title"):
        text_box(frame, o["title"], 56, W // 2, y, RED, WHITE, alpha=p)
        y += 90
    stag = o.get("stagger", 0.6)
    for i, it in enumerate(o.get("items", [])):
        txt = it["text"] if isinstance(it, dict) else str(it)
        at = (it.get("rel") if isinstance(it, dict) and it.get("rel") is not None else i * stag)
        q = ease_out((a - at) / 0.3)
        if q <= 0:
            continue
        label = f"{i + 1}. {txt}" if o.get("numbered", True) else txt
        im = T.render_text(label, 46, RGB(NAVY), 700, pad=18)
        bx = W - 90 - im.width + int((1 - q) * 60)
        rounded_box(frame, bx, y, bx + im.width, y + im.height, WHITE, r=14, alpha=p * q * 0.96)
        T.paste(frame, im, bx, y, p * q)
        y += im.height + 14


def ov_keyword(frame, o, a, R):
    p = ease_out(a / 0.22)
    s = 0.8 + 0.2 * p
    y = safe_top(R, 1, 96) if R.plan.get("face") else int(0.22 * H)
    hook = next((h for h in R.plan["overlays"] if h["type"] == "hook" and h["at"] <= o["at"] + a <= h["at"] + h["dur"]), None)
    if hook:
        y = max(y, safe_top(R, len(T.wrap(hook["text"], 72, W - 200)), 76) + 100 * len(T.wrap(hook["text"], 72, W - 200)) + 30)
    text_box(frame, o["text"], 96, W // 2, max(40, y), R.accent, WHITE, alpha=p, r=20, scale=s)


def ov_emoji(frame, o, a, R):
    im = emoji_image(o.get("emoji", "🔥"), int(o.get("size", 0.2) * W))
    if not im:
        return
    p = ease_out(a / 0.25)
    s = 0.6 + 0.4 * p + (0.04 * math.sin(a * 9) if a > 0.25 else 0)
    im2 = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
    x, y = int(o.get("x", 0.82) * W), int(o.get("y", 0.3) * H)
    if R.plan.get("face"):
        y = min(y, max(60, int(R.plan["face"]["top"] * H) - 40))
    T.paste(frame, im2, x - im2.width // 2, y - im2.height // 2, min(1.0, p * fade_edges(a, o["dur"], 0.01, 0.25)))


def ov_counter(frame, o, a, R):
    p = fade_edges(a, o["dur"], 0.2, 0.3)
    cd = o.get("countDur", 1.1)
    q = ease_out(a / cd)
    v = o.get("from", 0) + (o["to"] - o.get("from", 0)) * q
    dec = o.get("decimals", 0)
    txt = f"{o.get('prefix', '')}{v:,.{dec}f}{o.get('suffix', '')}"
    size = o.get("size", 170)
    y = int(o.get("y", 0.33) * H)
    if R.plan.get("face") and "y" not in o:  # never on the face: above the hair, under the hook
        y = max(100, safe_top(R, 1, size) - 20)
    x = int(o.get("x", 0.5) * W)
    T.draw(frame, txt, x, y, size, color=RGB(R.accent), weight=700, anchor="ma", stroke=6, stroke_color=(7, 29, 58), alpha=p)
    if o.get("label"):
        T.draw(frame, o["label"], x, y + int(size * 1.15), 40, color=(255, 255, 255), weight=400, anchor="ma", stroke=3, stroke_color=(7, 29, 58), alpha=p)


def ov_arrow(frame, o, a, R):
    p = ease_out(a / 0.35) * fade_edges(a, o["dur"], 0.01, 0.25)
    tx, ty = int(o["x"] * W), int(o["y"] * H)
    ang = math.radians(o.get("angle", 90))
    L = int(o.get("length", 260) * p)
    sx, sy = int(tx - math.cos(ang) * L), int(ty - math.sin(ang) * L)
    col = o.get("color_bgr", RED)
    cv2.line(frame, (sx, sy), (tx, ty), col, o.get("stroke", 10), cv2.LINE_AA)
    if p > 0.9:
        for d in (-0.5, 0.5):
            ex, ey = int(tx - math.cos(ang + d) * 60), int(ty - math.sin(ang + d) * 60)
            cv2.line(frame, (tx, ty), (ex, ey), col, o.get("stroke", 10), cv2.LINE_AA)


def ov_circle(frame, o, a, R):
    p = ease_out(a / 0.45)
    cx, cy = int(o["x"] * W), int(o["y"] * H)
    rx, ry = int(o.get("w", 0.3) * W / 2), int(o.get("h", 0.2) * H / 2)
    cv2.ellipse(frame, (cx, cy), (rx, ry), -8, 0, int(360 * p), o.get("color_bgr", RED), o.get("stroke", 10), cv2.LINE_AA)


def ov_progress(frame, o, a, R):
    d = R.plan["duration"]
    frac = min(1.0, (o["at"] + a) / max(0.1, d))
    th = o.get("thickness", 10)
    y0 = 0 if o.get("position", "top") == "top" else H - th
    cv2.rectangle(frame, (0, y0), (W, y0 + th), (60, 50, 30), -1)
    cv2.rectangle(frame, (W - int(W * frac), y0), (W, y0 + th), o.get("color_bgr", RED), -1)


def ov_flash(frame, o, a, R):
    peak = o.get("peak", 0.9)
    v = peak * (1 - ease_in_out(a / max(0.05, o["dur"])))
    col = o.get("color_bgr", WHITE)
    if v > 0.01:
        frame[:] = np.clip(frame.astype(np.float32) * (1 - v) + np.array(col, np.float32) * v, 0, 255).astype(np.uint8)


def ov_vignette(frame, o, a, R):
    k = o.get("strength", 0.8) * fade_edges(a, o["dur"], 0.4, 0.4)
    m = R.cache_get("vignette")
    if m is None:
        Y, X = np.ogrid[:H, :W]
        d = np.sqrt(((X - W / 2) / (W / 2)) ** 2 + ((Y - H / 2) / (H / 2)) ** 2)
        m = np.clip(1 - np.clip(d - 0.55, 0, 1) * 1.2, 0, 1).astype(np.float32)[..., None]
        R.cache_set("vignette", m)
    frame[:] = (frame.astype(np.float32) * (1 - k * (1 - m))).astype(np.uint8)


def ov_wash(frame, o, a, R):
    v = o.get("peak", 0.35) * math.sin(math.pi * min(1, a / o["dur"]))
    col = o.get("color_bgr", RED)
    frame[:] = np.clip(frame.astype(np.float32) * (1 - v) + np.array(col, np.float32) * v, 0, 255).astype(np.uint8)


def ov_lightleak(frame, o, a, R):
    v = 0.55 * math.sin(math.pi * min(1, a / o["dur"]))
    seed = o.get("seed", 1)
    Y, X = np.ogrid[:H, :W]
    cx = W * (0.2 + 0.6 * ((seed * 0.37 + a * 0.25) % 1.0))
    d = np.sqrt(((X - cx) / (W * 0.7)) ** 2 + ((Y - H * 0.3) / (H * 0.9)) ** 2)
    m = np.clip(1 - d, 0, 1).astype(np.float32)[..., None] * v
    warm = np.array((60, 150, 255), np.float32)  # warm orange in BGR
    frame[:] = np.clip(frame.astype(np.float32) * (1 - m * 0.6) + warm * m, 0, 255).astype(np.uint8)


def ov_glitch(frame, o, a, R):
    rng = random.Random(int(a * 60) + o.get("seed", 7))
    n = rng.randint(4, 9)
    for _ in range(n):
        y = rng.randint(0, H - 40)
        h = rng.randint(8, 60)
        dx = rng.randint(-60, 60)
        frame[y:y + h] = np.roll(frame[y:y + h], dx, axis=1)
    sh = rng.randint(4, 14)
    frame[:, :, 2] = np.roll(frame[:, :, 2], sh, axis=1)
    frame[:, :, 0] = np.roll(frame[:, :, 0], -sh, axis=1)


def ov_burst(frame, o, a, R):
    rng = random.Random(o.get("seed", 3))
    n = o.get("count", 70)
    kind = o.get("kind", "confetti")
    ox, oy = o.get("x", 0.5) * W, o.get("y", 1.05) * H
    power, spread, g = o.get("power", 1.0), o.get("spread", 1.0), o.get("gravity", 1.0) * 2200
    emo = emoji_image(o.get("emoji", "💰"), 72) if kind == "emoji" else None
    for i in range(n):
        ang = math.radians(-90 + rng.uniform(-40, 40) * spread)
        sp = rng.uniform(1400, 2400) * power
        vx, vy = math.cos(ang) * sp, math.sin(ang) * sp
        x = ox + vx * a + rng.uniform(-30, 30)
        y = oy + vy * a + 0.5 * g * a * a
        if y > H + 40 or x < -40 or x > W + 40:
            continue
        if emo is not None:
            T.paste(frame, emo, int(x) - 36, int(y) - 36, 1.0)
        else:
            col = [RED, TEAL, MIST, WHITE, PALE][i % 5]
            if kind == "sparkles":
                cv2.circle(frame, (int(x), int(y)), rng.randint(3, 7), WHITE, -1)
            else:
                ang2 = a * 8 + i
                pts = np.array([[x - 10, y - 5], [x + 10, y - 5], [x + 10, y + 5], [x - 10, y + 5]], np.float32)
                M = cv2.getRotationMatrix2D((float(x), float(y)), math.degrees(ang2), 1.0)
                pts = cv2.transform(pts[None], M)[0].astype(np.int32)
                cv2.fillPoly(frame, [pts], col)


OVERLAYS = {"hook": ov_hook, "title": ov_title, "callout": ov_callout, "lowerthird": ov_lowerthird, "cta": ov_cta, "list": ov_list,
            "keyword": ov_keyword, "emoji": ov_emoji, "counter": ov_counter, "arrow": ov_arrow, "circle": ov_circle, "progress": ov_progress,
            "flash": ov_flash, "vignette": ov_vignette, "wash": ov_wash, "lightleak": ov_lightleak, "glitch": ov_glitch, "burst": ov_burst}


# ---------------------------------------------------------------- scenes (the whole frame)
def scene_frame(o, a, t, R):
    """Returns a full canvas for a scene overlay, or None when the scene wants the speaker (pip handled by caller)."""
    kind = o.get("kind", "statement")
    enter = ease_out(a / 0.35)
    leave = 1 - ease_in_out((a - o["dur"] + 0.35) / 0.35) if a > o["dur"] - 0.35 else 1.0
    c = bg_canvas(o.get("bg", "gradient"), t)
    if kind == "kinetic":
        page = next((p for p in R.plan["captions"]["pages"] if p["start"] <= t < p["end"] + 0.12), None)
        words = page["words"] if page else []
        size = 120 if len(words) <= 2 else 100
        lines = T.wrap(" ".join(w["text"] for w in words), size, W - 160)
        y = int(H * 0.42) - len(lines) * size * 0.65
        for ln in lines:
            ws = ln.split()
            widths = [T.measure(w, size)[0] for w in ws]
            gap = int(size * 0.25)
            x = W // 2 + (sum(widths) + gap * (len(ws) - 1)) // 2
            for w, wd in zip(ws, widths):
                wi = next((q for q in words if q["text"] == w), None)
                active = wi and wi["start"] <= t
                slam = ease_out((t - wi["start"]) / 0.18) if wi else 1
                col = RGB(R.accent) if (wi and wi["text"].strip(".,?!") in R.plan["captions"]["keywords"]) else (255, 255, 255)
                if active:
                    T.draw(c, w, x, y, size, color=col, weight=700, anchor="ra", scale=0.85 + 0.15 * slam, alpha=slam)
                x -= wd + gap
            y += int(size * 1.25)
    elif kind == "statement":
        if o.get("kicker"):
            T.draw(c, o["kicker"], W // 2, int(H * 0.3), 36, color=RGB(MIST), weight=400, anchor="ma")
        lines = o["text"].split("\n") if "\n" in o["text"] else T.wrap(o["text"], 96, W - 160)
        y = int(H * 0.42) - len(lines) * 60
        for i, ln in enumerate(lines):
            rise = ease_out((a - i * 0.15) / 0.4)
            T.draw(c, ln.replace("*", ""), W // 2, int(y + (1 - rise) * 30), 96, color=(255, 255, 255) if "*" not in ln else RGB(R.accent), weight=700, anchor="ma", alpha=rise)
            y += 125
    elif kind == "number":
        q = ease_out(a / o.get("countDur", 1.2))
        v = o.get("from", 0) + (o["value"] - o.get("from", 0)) * q
        txt = f"{o.get('prefix', '')}{v:,.{o.get('decimals', 0)}f}{o.get('suffix', '')}"
        if o.get("title"):
            T.draw(c, o["title"], W // 2, int(H * 0.28), 48, color=RGB(MIST), weight=400, anchor="ma")
        T.draw(c, txt, W // 2, int(H * 0.36), 220, color=RGB(R.accent), weight=700, anchor="ma")
        if o.get("label"):
            T.draw(c, o["label"], W // 2, int(H * 0.36) + 280, 56, color=(255, 255, 255), weight=700, anchor="ma")
        if o.get("oldValue") is not None:
            old = f"{o.get('prefix', '')}{o['oldValue']}{o.get('suffix', '')}"
            x0, y0, w, h = T.draw(c, old, W // 2, int(H * 0.36) + 380, 64, color=RGB(MIST), weight=400, anchor="ma")
            cv2.line(c, (x0, y0 + h // 2), (x0 + w, y0 + h // 2), RED, 6)
    elif kind in ("list", "steps"):
        items_all = o.get("items", o.get("steps", []))
        y = int(H * 0.2) if o.get("title") or len(items_all) > 3 else int(H * 0.3)
        if o.get("title"):
            T.draw(c, o["title"], W - 90, y, 64, color=(255, 255, 255), weight=700, anchor="ra")
            y += 120
        for i, it in enumerate(items_all):
            txt = it["text"] if isinstance(it, dict) else str(it)
            at = it.get("rel", i * 0.7) if isinstance(it, dict) else i * 0.7
            q = ease_out((a - at) / 0.3)
            if q <= 0:
                continue
            if kind == "steps":
                cv2.circle(c, (W - 130, y + 36), 34, R.accent, -1)
                T.draw(c, str(i + 1), W - 130, y + 36, 40, color=(255, 255, 255), weight=700, anchor="mm")
                T.draw(c, txt, W - 190, y, 52, color=(255, 255, 255), weight=700, anchor="ra", alpha=q)
                if i < len(o.get("items", o.get("steps", []))) - 1:
                    cv2.line(c, (W - 130, y + 72), (W - 130, y + 120), (120, 110, 80), 3)
            else:
                icon = emoji_image(it.get("icon", "✅"), 64) if isinstance(it, dict) else emoji_image("✅", 64)
                if icon:
                    T.paste(c, icon, W - 160, y + 8, q)
                lines_i = T.wrap(txt, 60, W - 280)
                for li, ln in enumerate(lines_i):
                    T.draw(c, ln, W - 190, y + li * 76, 60, color=(255, 255, 255), weight=700, anchor="ra", alpha=q)
                y += 76 * (len(lines_i) - 1)
                if isinstance(it, dict) and it.get("sub"):
                    T.draw(c, it["sub"], W - 170, y + 64, 32, color=RGB(MIST), weight=400, anchor="ra", alpha=q)
                    y += 40
            y += 140
    elif kind == "compare":
        half = W // 2 - 20
        cv2.rectangle(c, (W - 60 - half, int(H * 0.25)), (W - 60, int(H * 0.75)), (90, 70, 30), -1)
        cv2.rectangle(c, (60, int(H * 0.25)), (60 + half, int(H * 0.75)), TEAL, -1)
        b, af = o.get("before", {}), o.get("after", {})
        T.draw(c, b.get("title", "לפני"), W - 60 - half // 2, int(H * 0.27), 52, color=RGB(MIST), weight=700, anchor="ma")
        T.draw(c, af.get("title", "אחרי"), 60 + half // 2, int(H * 0.27), 52, color=(255, 255, 255), weight=700, anchor="ma")
        y = int(H * 0.36)
        for it in b.get("items", []):
            T.draw(c, "✕ " + str(it), W - 80, y, 40, color=RGB(PALE), weight=400, anchor="ra")
            y += 70
        q = ease_out((a - o.get("afterAt", 0.8)) / 0.3)
        y = int(H * 0.36)
        for it in af.get("items", []):
            if q > 0:
                T.draw(c, "✓ " + str(it), 60 + half - 20, y, 40, color=(255, 255, 255), weight=700, anchor="ra", alpha=q)
            y += 70
    if o.get("title_text"):
        T.draw(c, o["title_text"], W // 2, int(H * 0.12), 56, color=(255, 255, 255), weight=700, anchor="ma")
    k = enter * leave
    if k < 1:
        c = (c.astype(np.float32) * k).astype(np.uint8)
    return c


# ---------------------------------------------------------------- transitions around a cut seam
CUT_TR = {"tr_flash", "tr_whip", "tr_zoom", "tr_glitch", "tr_shake", "tr_lightleak"}
OVERLAP_TR = {"tr_fade", "tr_slide", "tr_wipe", "tr_push"}
TR_SFX = {"tr_whip": "whip", "tr_flash": "shutter", "tr_zoom": "whoosh-quick", "tr_glitch": "glitch-blip", "tr_shake": "thud", "tr_fade": None, "tr_slide": "swipe", "tr_wipe": "whoosh-quick", "tr_push": "whoosh-quick", "tr_lightleak": "whoosh-quick"}


def apply_transition(frame, tr, t, R, other):
    """tr = {type, at, dur}; frames within at±dur/2 are affected. `other(seam_side)` returns the frame from the other clip."""
    kind, at, dur = tr["type"], tr["at"], tr.get("dur", 0.4)
    x = (t - at) / dur + 0.5  # 0..1 across the transition window
    if x < 0 or x > 1:
        return frame
    if kind == "tr_flash":
        v = 0.95 * (1 - abs(x - 0.5) * 2) ** 1.5
        return np.clip(frame.astype(np.float32) * (1 - v) + 255 * v, 0, 255).astype(np.uint8)
    if kind == "tr_whip":
        k = (1 - abs(x - 0.5) * 2)
        shift = int(k * 90)
        blur = max(1, int(k * 60)) | 1
        out = np.roll(frame, shift if t < at else -shift, axis=1)
        return cv2.blur(out, (blur, 1))
    if kind == "tr_zoom":
        k = (1 - abs(x - 0.5) * 2)
        z = 1 + 0.35 * k
        ch, cw = int(H / z), int(W / z)
        y0, x0 = (H - ch) // 2, (W - cw) // 2
        out = cv2.resize(frame[y0:y0 + ch, x0:x0 + cw], (W, H), interpolation=cv2.INTER_LINEAR)
        if k > 0.5:
            out = cv2.GaussianBlur(out, (0, 0), 3 * (k - 0.5) * 2 + 0.1)
        return out
    if kind == "tr_glitch":
        o = {"dur": dur, "seed": int(at * 10)}
        ov_glitch(frame, o, t - at + dur / 2, R)
        return frame
    if kind == "tr_shake":
        k = (1 - abs(x - 0.5) * 2)
        rng = random.Random(int(t * 90))
        dx, dy = int(rng.uniform(-40, 40) * k), int(rng.uniform(-30, 30) * k)
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        return cv2.warpAffine(frame, M, (W, H), borderMode=cv2.BORDER_REFLECT)
    if kind == "tr_lightleak":
        ov_lightleak(frame, {"dur": dur, "seed": int(at)}, t - at + dur / 2, R)
        return frame
    # overlap family: needs the other side
    nxt = other()
    if nxt is None:
        return frame
    if kind == "tr_fade":
        k = ease_in_out(x)
        return cv2.addWeighted(frame, 1 - k, nxt, k, 0) if t < at else frame
    if kind == "tr_slide":
        k = ease_in_out(x)
        off = int(W * (1 - k))
        out = frame.copy()
        if t < at:
            out[:, :W - off] = nxt[:, off:] if off < W else out[:, :W - off]
            out[:, W - off:] = frame[:, W - off:]
        return out if t < at else frame
    if kind == "tr_push":
        k = ease_in_out(x)
        off = int(W * k)
        out = np.empty_like(frame)
        if t < at:
            out[:, off:] = frame[:, :W - off]
            out[:, :off] = nxt[:, W - off:]
            return out
        return frame
    if kind == "tr_wipe":
        k = ease_in_out(x)
        xx = int(W * (1 - k))
        out = frame.copy()
        if t < at:
            out[:, :xx] = nxt[:, :xx]
            cv2.line(out, (xx, 0), (xx, H), WHITE, 4)
        return out if t < at else frame
    return frame
