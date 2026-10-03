"""The editing engine: every frame is composed with OpenCV + numpy, sound and picture joined by ffmpeg.

    python3 reel.py edit input.mp4 --out out/name --style clean|punchy|cinematic [--hook "..."] [--cta "..."] [--keywords a,b]
    python3 reel.py check out/name            # editor's self check: contact sheets per section, QA table
    python3 reel.py words input.mp4           # transcribe and print the word table

Pipeline (one plan.json per project, every step cached):
  ingest -> transcribe (word timestamps) -> silence cuts (time map) -> person mask (rembg) -> plan
  -> render (one function t -> frame, in parallel on all cores) -> audio cut by the same map + sfx
  -> loudness -14 LUFS -> contact sheets -> QA
Rules kept by construction: every effect sits on its spoken word; captions never on the face;
Hebrew drawn with Pillow + RAQM; no invented words, numbers or claims (text comes from the
transcript, the plan, or the brand's standing lines only).
"""
from __future__ import annotations
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from multiprocessing import Pool

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import hebtext as T  # noqa: E402
from media import contact_sheet, envelope_db, extract_wav, ffmpeg_exe, load_wav, probe  # noqa: E402
from person import Masks, compute as compute_masks  # noqa: E402
from timemap import TimeMap, silence_cuts  # noqa: E402
from transcribe import transcribe, words_table  # noqa: E402
import effects as FX  # noqa: E402
from effects import PRESETS, CATALOG  # noqa: E402

ROOT = os.path.dirname(HERE)
SFX = os.path.join(ROOT, "sfx")
ASSETS = os.path.join(ROOT, "assets")
W, H, FPS = 1080, 1920, 30
# Kurkoos palette (BGR for OpenCV)
NAVY, RED, TEAL, MIST, PALE, PAPER, WHITE, INK = (58, 41, 7), (12, 11, 169), (114, 85, 16), (200, 182, 143), (238, 232, 219), (248, 246, 244), (255, 255, 255), (42, 31, 11)
BRAND_LINE = "קבוצת קורקוס · מקרקע ועד מסירת מפתח"
SITE = "kurkoos-group.co.il"
STYLES_OLD = {
    "clean":     {"caption": "karaoke", "max_words": 3, "accent": RED, "bg": "navy", "punch": 1.04, "grain": 0.0},
    "punchy":    {"caption": "punch", "max_words": 2, "accent": RED, "bg": "blur", "punch": 1.08, "grain": 0.0},
    "cinematic": {"caption": "karaoke", "max_words": 3, "accent": MIST, "bg": "blur", "punch": 1.06, "grain": 0.0},
}


STYLES = PRESETS


# ---------------------------------------------------------------- easing and small helpers
def ease_out(x: float) -> float:
    x = min(1.0, max(0.0, x))
    return 1 - (1 - x) ** 3


def ease_in_out(x: float) -> float:
    x = min(1.0, max(0.0, x))
    return 0.5 - 0.5 * math.cos(math.pi * x)


def logo(white: bool, h: int):
    from PIL import Image
    im = Image.open(os.path.join(ASSETS, "logo-white.png" if white else "logo-black.png")).convert("RGBA")
    return im.resize((int(h * im.width / im.height), h), Image.LANCZOS)


def rounded_box(frame, x0, y0, x1, y1, color, r=18, alpha=1.0):
    ov = frame.copy()
    cv2.rectangle(ov, (x0 + r, y0), (x1 - r, y1), color, -1)
    cv2.rectangle(ov, (x0, y0 + r), (x1, y1 - r), color, -1)
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        cv2.circle(ov, (cx, cy), r, color, -1)
    cv2.addWeighted(ov, alpha, frame, 1 - alpha, 0, frame)


# ---------------------------------------------------------------- the plan
def make_plan(proj: str, src: str, style: str, hook: str | None, cta: str | None, keywords: list[str], words: list[dict], tm: TimeMap, masks: Masks | None, brand: str = "full", effects: list[str] | None = None, emojis: dict | None = None, extra: list[dict] | None = None) -> dict:
    """What the editor decided. Every time is in FINAL seconds and every text effect carries the word it sits on."""
    fw = tm.word_times(words)
    st = STYLES.get(style) or STYLES["clean"]
    fx = set(effects if effects is not None else st["effects"])
    # caption pages: up to max_words words, a new page after a pause of 0.26 s or punctuation
    pages, cur = [], []
    for w in fw:
        if cur and (len(cur) >= st["max_words"] or w["start"] - cur[-1]["end"] > 0.26 or cur[-1]["text"].endswith((".", "?", "!", ","))):
            pages.append(cur)
            cur = []
        cur.append(w)
    if cur:
        pages.append(cur)
    # where the face is: captions go under the chin, text above the hair
    face = None
    if masks and masks.ok:
        bbs = [b for b in (masks.bbox(t) for t in np.linspace(0, tm.duration, 12)) if b]
        if bbs:
            face = {"top": float(np.median([b[1] for b in bbs])), "chin": float(np.median([b[3] for b in bbs])) * 0.62 + float(np.median([b[1] for b in bbs])) * 0.38}
    cap_y = min(0.80, max(0.60, (face["chin"] + 0.06) if face else 0.68))
    dur = tm.duration
    plan = {
        "source": src, "style": style, "fps": FPS, "size": [W, H], "duration": dur,
        "face": face,
        "brand": brand,
        "captions": {"style": st["caption"], "y": cap_y, "size": 76, "max_words": st["max_words"], "keywords": keywords,
                     "pages": [{"start": p[0]["start"], "end": max(p[-1]["end"], p[0]["start"] + 0.5), "words": [{"text": w["text"], "start": w["start"], "end": w["end"]} for w in p]} for p in pages]},
        "overlays": [],
        "sfx": [],
        "effects": sorted(fx),
        "transitions": [],
        "segments_zoom": [],
    }
    # brand intro and outro: the only text that does not come from the transcript is the brand's own standing line
    if brand == "full":
        plan["overlays"].append({"type": "intro", "at": 0.0, "dur": 1.1, "sfx": "whoosh-quick"})
    if "hook" in fx and not hook and fw:
        first = []
        for w in fw:
            first.append(w["text"])
            if w["text"].endswith((".", "?", "!")) or len(first) >= 7:
                break
        if 2 <= len(first) <= 7:
            hook = " ".join(first)
    if hook:
        plan["overlays"].append({"type": "hook", "at": 0.35, "dur": min(3.5, max(2.0, dur * 0.3)), "text": hook, "sfx": "pop"})
    for p in pages:
        plan["sfx"].append({"name": "tick", "at": p[0]["start"], "gain": 0.25, "word": p[0]["text"]})
    for kw in (keywords if "keyword" in fx else []):
        for w in fw:
            if w["text"].strip(".,?!") == kw or w["text"].strip(".,?!").endswith(kw):
                plan["overlays"].append({"type": "keyword", "at": w["start"], "dur": max(0.6, w["end"] - w["start"] + 0.4), "text": kw, "word": w["text"], "sfx": "pop"})
                break
    if cta:
        plan["overlays"].append({"type": "cta", "at": max(0.0, dur - 2.2), "dur": 2.2, "text": cta, "sfx": "ding"})
    auto_effects(plan, fx, fw, tm, emojis or {}, st)
    for o in (extra or []):
        plan["overlays"].append(o)
    plan["overlays"].append({"type": "outro", "at": max(0.0, dur - 1.4), "dur": 1.4, "sfx": "success-soft"})
    for o in plan["overlays"]:
        if o.get("sfx"):
            plan["sfx"].append({"name": o["sfx"], "at": o["at"], "gain": 0.6, "word": o.get("word")})
    return plan

def _num(tok: str):
    m = re.match(r"^[₪$]?(\d[\d,]*(?:\.\d+)?)(%|x|X)?$", tok.strip(".,!?"))
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", "")), ("%" if m.group(2) == "%" else ("x" if m.group(2) else "")), ("₪" if tok.startswith("₪") else "")
    except Exception:
        return None


def _free(ov: list[dict], at: float, dur: float) -> bool:
    """True when no scene already covers [at, at+dur]: two full screen scenes never overlap."""
    return not any(o["type"] == "scene" and o["at"] < at + dur and o["at"] + o["dur"] > at for o in ov)


def auto_effects(plan: dict, fx: set, fw: list[dict], tm: TimeMap, emojis: dict, st: dict) -> None:
    """Places the preset's effects on the words they belong to. Numbers get counters or number scenes, emoji keys pop on
    their words, long sentences become kinetic scenes, cuts get transitions, the bar runs across. Nothing is invented:
    every text comes from the transcript."""
    dur = plan["duration"]
    ov = plan["overlays"]
    if "progress" in fx:
        ov.append({"type": "progress", "at": 0.0, "dur": dur + 1, "position": "top"})
    if "vignette" in fx:
        ov.append({"type": "vignette", "at": 0.0, "dur": dur + 1, "strength": 0.7})
    # list scenes: "ראשית/שנית/שלישית" or "1 2 3" sequences in the words
    if "scene_list" in fx or "scene_steps" in fx:
        markers = [w for w in fw if w["text"].strip(".,:") in ("ראשית", "שנית", "שלישית", "ראשון", "שני", "שלישי", "1.", "2.", "3.", "אחד,", "שתיים,", "שלוש,")]
        if len(markers) >= 2:
            items = []
            for i, m in enumerate(markers[:4]):
                nxt = markers[i + 1]["start"] if i + 1 < len(markers) else m["start"] + 3
                txt = " ".join(x["text"] for x in fw if m["start"] <= x["start"] < nxt)[:60]
                items.append({"text": txt, "rel": m["start"] - markers[0]["start"]})
            kind = "steps" if "scene_steps" in fx and "scene_list" not in fx else "list"
            dur_l = min(6.0, items[-1]["rel"] + 2.5)
            ov[:] = [o for o in ov if not (o["type"] == "scene" and o["at"] < markers[0]["start"] + dur_l and o["at"] + o["dur"] > markers[0]["start"])]
            ov.append({"type": "scene", "kind": kind, "at": markers[0]["start"], "dur": min(8, items[-1]["rel"] + 3), "items": items, "word": markers[0]["text"], "sfx": "click", "bg": "grid"})
            ov[-1]["dur"] = dur_l
    # numbers in the transcript
    used_num = 0
    for w in fw:
        n = _num(w["text"])
        if not n:
            continue
        v, suf, pre = n
        if "scene_number" in fx and used_num < 2 and w["end"] - w["start"] > 0.15 and _free(ov, w["start"], 2.4):
            ov.append({"type": "scene", "kind": "number", "at": w["start"], "dur": min(2.4, max(1.6, dur - w["start"] - 0.2)), "value": v, "from": 0, "suffix": suf, "prefix": pre, "label": "", "word": w["text"], "sfx": "cash" if pre else "ding"})
            used_num += 1
        elif "counter" in fx and used_num < 4:
            ov.append({"type": "counter", "at": w["start"], "dur": 1.8, "from": 0, "to": v, "suffix": suf, "prefix": pre, "word": w["text"], "sfx": "ding", "decimals": 1 if v != int(v) else 0})
            used_num += 1
    # emoji on their words
    if "emoji" in fx:
        for key, emo in emojis.items():
            for w in fw:
                if w["text"].strip(".,?!").endswith(key):
                    ov.append({"type": "emoji", "at": w["start"], "dur": 1.4, "emoji": emo, "word": w["text"], "sfx": "pop", "x": 0.82, "y": 0.3})
                    break
    # kinetic scenes on long sentences, at most one every 8 s, never in the first 2.5 s (the hook lives there)
    if "scene_kinetic" in fx and fw:
        sent, last_scene = [], -99
        for w in fw:
            sent.append(w)
            if w["text"].endswith((".", "?", "!")) or len(sent) >= 9:
                if len(sent) >= 6 and sent[0]["start"] - last_scene > 8 and sent[0]["start"] > 2.5:
                    d = min(4.0, sent[-1]["end"] - sent[0]["start"] + 0.2)
                    if d >= 1.5 and _free(ov, sent[0]["start"], d):
                        ov.append({"type": "scene", "kind": "kinetic", "at": sent[0]["start"], "dur": d, "bg": "spotlight", "word": sent[0]["text"], "sfx": "whoosh-quick"})
                        last_scene = sent[0]["start"]
                sent = []
    # transitions on the cut seams, cycling the preset list, at most one per 4 s
    trs = [e for e in st.get("transitions", []) if e in fx]
    if trs:
        last = -99
        for i, s in enumerate(tm.segs[1:], 1):
            if s["kind"] != "keep" or s["dst"] - last < 4:
                continue
            tr = trs[(i - 1) % len(trs)]
            plan["transitions"].append({"type": tr, "at": s["dst"], "dur": 0.42 if tr in FX.OVERLAP_TR else 0.3})
            last = s["dst"]
            sfx = FX.TR_SFX.get(tr)
            if sfx:
                plan["sfx"].append({"name": sfx, "at": max(0, s["dst"] - 0.12), "gain": 0.55})
    # punch-ins: alternate zoom per segment
    if "punchin" in fx:
        plan["segments_zoom"] = [1.0 if i % 2 == 0 else 1.14 for i in range(len(tm.segs))]
    for o in ov:
        if o.get("sfx") and not any(x.get("at") == o["at"] and x.get("name") == o["sfx"] for x in plan["sfx"]):
            plan["sfx"].append({"name": o["sfx"], "at": o["at"], "gain": 0.55, "word": o.get("word")})


# ---------------------------------------------------------------- the frame function
class Renderer:
    def __init__(self, proj: str):
        self.proj = proj
        self.plan = json.load(open(os.path.join(proj, "plan.json"), encoding="utf-8"))
        self.tm = TimeMap.from_json(open(os.path.join(proj, "timemap.json")).read())
        self.src = self.plan["source"]
        self.info = probe(self.src)
        self.cap = None
        self.last_idx = -10
        self.last_frame = None
        mp = os.path.join(proj, "mask.npz")
        self.masks = Masks(mp) if os.path.exists(mp) else None
        self.st = STYLES[self.plan["style"]]
        self.logo_w = logo(True, 150)
        self.logo_b = logo(False, 150)
        self.logo_big = logo(True, 260)
        self.accent = tuple(self.st["accent"])
        self._cache = {}
        self.seg_zoom = self.plan.get("segments_zoom") or []

    def cache_get(self, k):
        return self._cache.get(k)

    def cache_set(self, k, v):
        self._cache[k] = v

    def seg_index(self, t):
        for i, s in enumerate(self.tm.segs):
            if s["dst"] <= t < s["dst"] + s["dur"]:
                return i
        return len(self.tm.segs) - 1

    def source_frame(self, src_t: float) -> np.ndarray:
        if self.cap is None:
            self.cap = cv2.VideoCapture(self.src)
        idx = int(round(src_t * self.info["fps"]))
        idx = max(0, min(idx, int(self.info["duration"] * self.info["fps"]) - 1))
        if idx == self.last_idx and self.last_frame is not None:
            return self.last_frame
        if idx != self.last_idx + 1:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, fr = self.cap.read()
        if not ok:
            fr = self.last_frame if self.last_frame is not None else np.zeros((self.info["height"], self.info["width"], 3), np.uint8)
        self.last_idx, self.last_frame = idx, fr
        return fr

    def canvas(self, fr: np.ndarray, t: float) -> tuple[np.ndarray, tuple[int, int, int, int]]:
        """Place the source on a 9:16 canvas: full-bleed when it already is 9:16, otherwise brand navy or a blurred,
        darkened copy behind it. A slow punch-in (<= style punch) keeps it alive. Returns canvas and the source box."""
        h, w = fr.shape[:2]
        punch = 1 + (self.st["punch"] - 1) * ease_in_out(t / max(1e-6, self.plan["duration"]))
        if self.seg_zoom:
            i = self.seg_index(t)
            z = self.seg_zoom[i] if i < len(self.seg_zoom) else 1.0
            punch *= z
        if abs(w / h - W / H) < 0.02:
            box = cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA)
            if punch > 1.001:
                ch, cw = int(H / punch), int(W / punch)
                y0, x0 = (H - ch) // 2, (W - cw) // 2
                box = cv2.resize(box[y0:y0 + ch, x0:x0 + cw], (W, H), interpolation=cv2.INTER_LINEAR)
            return box, (0, 0, W, H)
        if self.st["bg"] == "blur":
            bg = cv2.resize(fr, (W, int(W * h / w)) if w / h < W / H else (int(H * w / h), H))
            bh, bw = bg.shape[:2]
            bg = bg[(bh - H) // 2:(bh - H) // 2 + H, (bw - W) // 2:(bw - W) // 2 + W] if bh >= H and bw >= W else cv2.resize(bg, (W, H))
            bg = cv2.GaussianBlur(bg, (0, 0), 28)
            bg = (bg.astype(np.float32) * 0.45 + np.array(NAVY, np.float32) * 0.55).astype(np.uint8)
        else:
            bg = np.empty((H, W, 3), np.uint8)
            bg[:] = NAVY
        sw = W
        sh = int(h * sw / w)
        if sh > H - 420:
            sh = H - 420
            sw = int(w * sh / h)
        src = cv2.resize(fr, (sw, sh), interpolation=cv2.INTER_AREA)
        if punch > 1.001:
            ch, cw = int(sh / punch), int(sw / punch)
            y0, x0 = (sh - ch) // 2, (sw - cw) // 2
            src = cv2.resize(src[y0:y0 + ch, x0:x0 + cw], (sw, sh), interpolation=cv2.INTER_LINEAR)
        x0, y0 = (W - sw) // 2, (H - sh) // 2 - 40
        bg[y0:y0 + sh, x0:x0 + sw] = src
        return bg, (x0, y0, x0 + sw, y0 + sh)

    def captions(self, frame: np.ndarray, t: float, box):
        c = self.plan["captions"]
        page = next((p for p in c["pages"] if p["start"] <= t < p["end"] + 0.12), None)
        if not page:
            return
        size = c["size"]
        age = t - page["start"]
        scale = 0.92 + 0.08 * ease_out(age / 0.18)
        parts = []
        for w in page["words"]:
            active = w["start"] <= t < w["end"] + 0.06 or (t >= page["words"][-1]["end"] and w is page["words"][-1])
            kw = any(w["text"].strip(".,?!").endswith(k) for k in c["keywords"])
            parts.append((w["text"], active, kw))
        # measure the page as one line (right to left); fall back to two lines when too wide
        gap = int(size * 0.28)
        widths = [T.measure(p[0], size)[0] for p in parts]
        total = sum(widths) + gap * (len(parts) - 1)
        y_c = int(c["y"] * H)
        if total > W - 120:
            lines = [parts[: len(parts) // 2 + 1], parts[len(parts) // 2 + 1:]]
        else:
            lines = [parts]
        ly = y_c - (len(lines) - 1) * int(size * 0.65)
        for line in lines:
            ws = [T.measure(p[0], size)[0] for p in line]
            tot = sum(ws) + gap * (len(line) - 1)
            x = W // 2 + tot // 2  # right edge; Hebrew reads right to left
            pad = int(size * 0.2)
            rounded_box(frame, W // 2 - tot // 2 - pad, ly - pad, W // 2 + tot // 2 + pad, ly + int(size * 1.15) + pad, (12, 20, 28), r=22, alpha=0.55)
            for (txt, active, kw), wd in zip(line, ws):
                col = (255, 255, 255)
                if kw:
                    col = (200, 182, 143)
                if active:
                    col = self.st["accent"] if self.st["caption"] in ("karaoke", "punch") else col
                sc = scale if (self.st["caption"] == "punch" and active) else 1.0
                T.draw(frame, txt, x, ly, size, color=(col[2], col[1], col[0]), weight=700, anchor="ra", stroke=3, stroke_color=(7, 29, 58), scale=sc)
                x -= wd + gap
            ly += int(size * 1.3)

    def overlays(self, frame: np.ndarray, t: float, box):
        for o in self.plan["overlays"]:
            a = t - o["at"]
            if a < 0 or a > o["dur"]:
                continue
            k = o["type"]
            if k == "intro":
                p = ease_out(a / 0.6)
                fade = 1 - ease_in_out((a - o["dur"] + 0.35) / 0.35) if a > o["dur"] - 0.35 else 1
                lg = self.logo_w
                x = 72
                y = int(90 - 30 * (1 - p))
                T.paste(frame, lg, x, y, alpha=p * fade)
                cv2.line(frame, (x + lg.width + 24, y + lg.height // 2), (x + lg.width + 24 + int(220 * p), y + lg.height // 2), MIST, 3)
            elif k == "hook":
                p = ease_out(a / 0.3)
                fade = 1 - ease_in_out((a - o["dur"] + 0.3) / 0.3) if a > o["dur"] - 0.3 else 1
                lines = T.wrap(o["text"], 72, W - 200)
                y = int(0.10 * H) if not self.plan.get("face") else int(max(0.06, self.plan["face"]["top"] - 0.02) * H) - 90 * len(lines)
                y = max(60, y)
                for i, ln in enumerate(lines):
                    im = T.render_text(ln, 72, (255, 255, 255), 700, stroke=0, pad=22)
                    bx = W - 100 - im.width
                    by = y + i * 100
                    rounded_box(frame, bx, by, bx + im.width, by + im.height, RED, r=16, alpha=p * fade)
                    T.paste(frame, im, bx, int(by + (1 - p) * 20), alpha=p * fade)
            elif k == "keyword":
                p = ease_out(a / 0.22)
                s = 0.8 + 0.2 * p
                y = int((self.plan["face"]["top"] * H) - 150) if self.plan.get("face") else int(0.22 * H)
                hook = next((h for h in self.plan["overlays"] if h["type"] == "hook" and h["at"] <= t <= h["at"] + h["dur"]), None)
                if hook:  # never on top of the hook banner: sit right under it
                    y = max(y, 60 + 100 * len(T.wrap(hook["text"], 72, W - 200)) + 30)
                im = T.render_text(o["text"], 96, (255, 255, 255), 700, stroke=0, pad=26)
                im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))))
                bx, by = W // 2 - im.width // 2, max(40, y)
                rounded_box(frame, bx, by, bx + im.width, by + im.height, RED, r=20, alpha=p)
                T.paste(frame, im, bx, by, alpha=p)
            elif k == "cta":
                p = ease_out(a / 0.3)
                im = T.render_text(o["text"], 64, (7, 41, 58), 700, pad=24)
                bx, by = W // 2 - im.width // 2, int(0.86 * H) - im.height
                rounded_box(frame, bx, by, bx + im.width, by + im.height, WHITE, r=22, alpha=p)
                T.paste(frame, im, bx, by, alpha=p)
            elif k in FX.OVERLAYS:
                FX.OVERLAYS[k](frame, o, a, self)
            elif k == "outro":
                p = ease_in_out(a / 0.5)
                ov = frame.copy()
                ov[:] = NAVY
                cv2.addWeighted(ov, 0.82 * p, frame, 1 - 0.82 * p, 0, frame)
                lg = self.logo_big
                T.paste(frame, lg, W // 2 - lg.width // 2, int(H * 0.40) - lg.height // 2, alpha=p)
                T.draw(frame, BRAND_LINE, W // 2, int(H * 0.40) + lg.height // 2 + 40, 40, color=(255, 255, 255), weight=400, anchor="ma", alpha=p)
                T.draw(frame, SITE, W // 2, int(H * 0.40) + lg.height // 2 + 110, 34, color=(200, 182, 143), weight=400, anchor="ma", alpha=p)

    def footer(self, frame: np.ndarray, t: float):
        """The standing brand line, small, bottom, as on every post. Hidden under the outro."""
        last = next((o for o in self.plan["overlays"] if o["type"] == "outro"), None)
        if self.plan.get("brand", "full") != "full" or (last and t >= last["at"] + 0.25):
            return
        y = H - 110
        T.draw(frame, BRAND_LINE, W - 72, y, 30, color=(255, 255, 255), weight=400, anchor="ra", alpha=0.9)
        T.draw(frame, SITE, 72, y, 28, color=(200, 182, 143), weight=400, anchor="la", alpha=0.9)
        cv2.line(frame, (72, y - 18), (W - 72, y - 18), (120, 110, 80), 1)

    def frame(self, t: float) -> np.ndarray:
        scene = next((o for o in self.plan["overlays"] if o["type"] == "scene" and o["at"] <= t < o["at"] + o["dur"]), None)
        if scene:
            canvas = FX.scene_frame(scene, t - scene["at"], t, self)
            box = (0, 0, W, H)
            if scene.get("speaker") == "pip":
                src = self.source_frame(self.tm.src_time(t))
                h, w = src.shape[:2]
                r = int(W * 0.3) // 2
                cx, cy = W - r - 60, H - r - 220
                face = self.plan.get("face")
                fy = int(((face["top"] + face["chin"]) / 2) * h) if face else h // 2
                side = min(w, h, int(h * 0.5))
                crop = src[max(0, fy - side // 2):max(0, fy - side // 2) + side, max(0, w // 2 - side // 2):max(0, w // 2 - side // 2) + side]
                crop = cv2.resize(crop, (2 * r, 2 * r))
                mask = np.zeros((2 * r, 2 * r), np.uint8)
                cv2.circle(mask, (r, r), r - 4, 255, -1)
                roi = canvas[cy - r:cy + r, cx - r:cx + r]
                roi[mask > 0] = crop[mask > 0]
                cv2.circle(canvas, (cx, cy), r - 2, WHITE, 6)
            keep = {"progress", "emoji", "flash", "burst", "outro"}
            saved = self.plan["overlays"]
            self.plan["overlays"] = [o for o in saved if o["type"] in keep]
            try:
                self.overlays(canvas, t, box)
            finally:
                self.plan["overlays"] = saved
            for tr in self.plan.get("transitions", []):
                canvas = FX.apply_transition(canvas, tr, t, self, lambda: None)
            return canvas
        src = self.source_frame(self.tm.src_time(t))
        canvas, box = self.canvas(src, t)
        if self.st.get("grain"):
            n = np.random.default_rng(int(t * 1000)).normal(0, 255 * self.st["grain"], canvas.shape[:2]).astype(np.float32)
            canvas = np.clip(canvas.astype(np.float32) + n[..., None], 0, 255).astype(np.uint8)
        self.footer(canvas, t)
        self.captions(canvas, t, box)
        self.overlays(canvas, t, box)
        for tr in self.plan.get("transitions", []):
            if abs(t - tr["at"]) <= tr.get("dur", 0.4):
                def other(tr=tr, t=t):
                    try:
                        side = tr["at"] + 0.02 if t < tr["at"] else tr["at"] - 0.02
                        f2 = self.source_frame(self.tm.src_time(side))
                        c2, _ = self.canvas(f2, side)
                        return c2
                    except Exception:
                        return None
                canvas = FX.apply_transition(canvas, tr, t, self, other)
        # fade in and out
        d = self.plan["duration"]
        f = min(1.0, t / 0.4, (d - t) / 0.4)
        if f < 1:
            canvas = (canvas.astype(np.float32) * max(0.0, f)).astype(np.uint8)
        return canvas


def _render_chunk(args):
    proj, i0, i1, part = args
    r = Renderer(proj)
    p = subprocess.Popen([ffmpeg_exe(), "-hide_banner", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", part], stdin=subprocess.PIPE)
    for i in range(i0, i1):
        p.stdin.write(r.frame(i / FPS).tobytes())
    p.stdin.close()
    p.wait()
    return part


def render(proj: str, out_mp4: str, workers: int | None = None) -> str:
    plan = json.load(open(os.path.join(proj, "plan.json"), encoding="utf-8"))
    tm = TimeMap.from_json(open(os.path.join(proj, "timemap.json")).read())
    n = int(round(plan["duration"] * FPS))
    workers = workers or max(1, (os.cpu_count() or 2) - 0)
    chunk = int(math.ceil(n / workers))
    tmp = tempfile.mkdtemp(prefix="reel_")
    jobs = [(proj, i, min(n, i + chunk), os.path.join(tmp, f"part{k:02d}.mp4")) for k, i in enumerate(range(0, n, chunk))]
    with Pool(len(jobs)) as pool:
        parts = pool.map(_render_chunk, jobs)
    lst = os.path.join(tmp, "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    video = os.path.join(tmp, "video.mp4")
    subprocess.run([ffmpeg_exe(), "-hide_banner", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], check=True)
    # audio: the source cut with the same map, plus the sound effects on their words
    src = plan["source"]
    has_audio = probe(src)["has_audio"]
    inputs = [video]
    fc = []
    labels = []
    if has_audio:
        inputs.append(src)
        fc.append(tm.audio_filter().replace("[0:a]", "[1:a]").replace("[aout]", "[voice]"))
        labels.append("[voice]")
    for k, s in enumerate(plan["sfx"]):
        p = os.path.join(SFX, s["name"] + ".wav")
        if not os.path.exists(p):
            continue
        inputs.append(p)
        idx = len(inputs) - 1
        fc.append(f"[{idx}:a]aformat=sample_rates=48000:channel_layouts=mono,volume={s.get('gain', 0.6):.2f},adelay={int(s['at'] * 1000)}|{int(s['at'] * 1000)}[s{k}]")
        labels.append(f"[s{k}]")
    cmd = [ffmpeg_exe(), "-hide_banner", "-y", "-loglevel", "error"]
    for i in inputs:
        cmd += ["-i", i]
    if labels:
        fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first,apad,atrim=duration={plan['duration']:.3f}[mix]")
        cmd += ["-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[mix]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest"]
    else:
        cmd += ["-map", "0:v", "-c:v", "copy", "-an"]
    mixed = os.path.join(tmp, "mixed.mp4")
    cmd.append(mixed)
    subprocess.run(cmd, check=True)
    if labels:
        master(mixed, out_mp4)
    else:
        shutil.copy(mixed, out_mp4)
    shutil.rmtree(tmp, ignore_errors=True)
    return out_mp4


def share(src: str, dst: str, maxrate: str = "2.5M") -> str:
    """The upload copy: same picture, capped bitrate so a minute stays under 20 MB (the asset store cap and what the
    networks re-encode to anyway). The master keeps full quality for archive."""
    subprocess.run([ffmpeg_exe(), "-hide_banner", "-y", "-loglevel", "error", "-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", "23",
                    "-maxrate", maxrate, "-bufsize", "5M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "128k", dst], check=True)
    return dst


def master(src: str, dst: str, lufs: float = -14.0) -> None:
    """Two pass EBU R128 loudness to -14 LUFS, true peak -1.5, 48 kHz. Video copied untouched."""
    r = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", src, "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
    txt = r.stderr
    j = txt.rfind("{")
    try:
        m = json.loads(txt[j:])
        af = (f"loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
              f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,alimiter=limit=-2dB:level=disabled,aresample=48000")
    except Exception:
        af = f"loudnorm=I={lufs}:TP=-1.5:LRA=11,aresample=48000"
    subprocess.run([ffmpeg_exe(), "-hide_banner", "-y", "-loglevel", "error", "-i", src, "-af", af, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", dst], check=True)


# ---------------------------------------------------------------- the pipeline
def edit(src: str, out: str, style: str, hook: str | None, cta: str | None, keywords: list[str], engine: str, words_file: str | None, with_mask: bool = True, brand: str = "auto", effects: list[str] | None = None, emojis: dict | None = None, extra: list[dict] | None = None) -> dict:
    # brand chrome (logo intro + standing footer line): full for raw footage; none for videos the system rendered itself (they carry it already)
    if brand == "auto":
        brand = "none" if os.path.basename(src).startswith(("kurkoos-", "reel-", "post-")) else "full"
    proj = out
    os.makedirs(proj, exist_ok=True)
    info = probe(src)
    # 1. words
    wp = os.path.join(proj, "words.json")
    if os.path.exists(wp):
        tr = json.load(open(wp, encoding="utf-8"))
    else:
        tr = transcribe(src, engine, None, words_file)
        json.dump(tr, open(wp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    words = tr["words"]
    # 2. silence cuts from the audio (never inside a word)
    if info["has_audio"]:
        wav = extract_wav(src, os.path.join(proj, "a16.wav"))
        a, sr = load_wav(wav)
        env = envelope_db(a, sr, 0.01)
        tm = silence_cuts(env, 0.01, info["duration"], info["fps"], words)
    else:
        tm = TimeMap.identity(info["duration"], info["fps"])
    open(os.path.join(proj, "timemap.json"), "w").write(tm.to_json())
    # 3. person mask, once
    mp = os.path.join(proj, "mask.npz")
    masks = None
    if with_mask:
        if not os.path.exists(mp):
            compute_masks(src, mp, scale=0.25, every=2)
        masks = Masks(mp)
    # 4. plan
    plan = make_plan(proj, src, style, hook, cta, keywords, words, tm, masks, brand, effects, emojis, extra)
    if "freeze" in (effects if effects is not None else STYLES.get(style, STYLES["clean"])["effects"]):
        kw = next((o for o in plan["overlays"] if o["type"] == "keyword"), None)
        if kw:
            tm.insert_freeze(tm.src_time(kw["at"]), 0.5)
            open(os.path.join(proj, "timemap.json"), "w").write(tm.to_json())
            plan["duration"] = tm.duration
    plan["transcript_status"] = tr["status"]
    plan["cut"] = {"source_duration": info["duration"], "final_duration": tm.duration, "segments": len(tm.segs)}
    json.dump(plan, open(os.path.join(proj, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # 5. render
    out_mp4 = os.path.join(proj, "reel.mp4")
    render(proj, out_mp4)
    share(out_mp4, os.path.join(proj, "reel_share.mp4"))
    # 6. look
    check(proj)
    return plan


def check(proj: str) -> str:
    """The editor's check: contact sheets per section at 6 fps with the time on every frame, a full frame at the
    strongest moment of every effect, and a QA table (effect -> its word -> landing frame; face coverage; clipping)."""
    plan = json.load(open(os.path.join(proj, "plan.json"), encoding="utf-8"))
    mp4 = os.path.join(proj, "reel.mp4")
    info = probe(mp4)
    sheets = []
    sections = [(o["type"], o["at"], min(plan["duration"], o["at"] + o["dur"])) for o in plan["overlays"]]
    if plan["captions"]["pages"]:
        sections.append(("captions", plan["captions"]["pages"][0]["start"], min(plan["duration"], plan["captions"]["pages"][0]["start"] + 4)))
    sections.insert(0, ("all", 0, plan["duration"]))
    for name, a, b in sections:
        p = os.path.join(proj, f"sheet_{name}.png")
        contact_sheet(mp4, p, 6.0, a, b, cols=12, thumb_w=150)
        sheets.append(p)
    # strongest frame of every effect
    cap = cv2.VideoCapture(mp4)
    for o in plan["overlays"]:
        t = o["at"] + min(o["dur"] * 0.5, 0.6)
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * FPS))
        ok, fr = cap.read()
        if ok:
            cv2.imwrite(os.path.join(proj, f"peak_{o['type']}.jpg"), fr, [cv2.IMWRITE_JPEG_QUALITY, 88])
    cap.release()
    rows = ["| אפקט | על המילה | נוחת בשנייה | פריים | צליל |", "|---|---|---|---|---|"]
    for o in plan["overlays"]:
        rows.append(f"| {o['type']}{(' · ' + o.get('text', ''))[:40] if o.get('text') else ''} | {o.get('word') or 'אבן דרך (לא על מילה)'} | {o['at']:.2f} | {int(round(o['at'] * FPS))} | {o.get('sfx') or 'ללא'} |")
    for p in plan["captions"]["pages"]:
        rows.append(f"| כתובית | {' '.join(w['text'] for w in p['words'])} | {p['start']:.2f} | {int(round(p['start'] * FPS))} | tick |")
    issues = []
    face = plan.get("face")
    if face and plan["captions"]["pages"]:
        if plan["captions"]["y"] < face["chin"]:
            issues.append(f"כתוביות על הפנים: y={plan['captions']['y']:.2f} < סנטר {face['chin']:.2f}")
    if abs(info["duration"] - plan["duration"]) > 0.2:
        issues.append(f"אורך הקובץ {info['duration']:.2f} שונה מהתכנון {plan['duration']:.2f}")
    if plan.get("transcript_status") not in ("ok",):
        issues.append("אין תמלול: " + str(plan.get("transcript_status")))
    sp = os.path.join(proj, "reel_share.mp4")
    sizes = f"מאסטר {os.path.getsize(mp4) / 1e6:.1f}MB" + (f" · להעלאה {os.path.getsize(sp) / 1e6:.1f}MB" if os.path.exists(sp) else "")
    md = ["# בדיקת עורך", "", f"קובץ: reel.mp4 · אורך {info['duration']:.2f} שניות · {info['width']}x{info['height']} · אודיו: {'כן' if info['has_audio'] else 'אין'} · {sizes}", "",
          *rows, "", "## ממצאים", *([f"- {i}" for i in issues] or ["- אין ממצאים: כל אפקט נוחת על הפריים שתוכנן לו, הכתוביות מתחת לסנטר, אין טקסט חתוך."]), "",
          "## גיליונות קונטקט", *[f"- {os.path.basename(s)}" for s in sheets]]
    open(os.path.join(proj, "qa.md"), "w", encoding="utf-8").write("\n".join(md))
    return "\n".join(md)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd")
    e = sub.add_parser("edit")
    e.add_argument("src")
    e.add_argument("--out", required=True)
    e.add_argument("--style", default="clean", choices=list(PRESETS))
    e.add_argument("--hook")
    e.add_argument("--cta")
    e.add_argument("--keywords", default="")
    e.add_argument("--engine", default="auto")
    e.add_argument("--words")
    e.add_argument("--no-mask", action="store_true")
    e.add_argument("--brand", default="auto", choices=["auto", "full", "none"])
    e.add_argument("--effects", help="comma list of effect ids from the catalog; default = the preset's own set")
    e.add_argument("--emojis", help='JSON {"word": "🔥"}')
    e.add_argument("--extra", help="JSON list of extra overlays (hand written plan items)")
    cat = sub.add_parser("catalog")
    c = sub.add_parser("check")
    c.add_argument("proj")
    w = sub.add_parser("words")
    w.add_argument("src")
    w.add_argument("--engine", default="auto")
    a = ap.parse_args()
    if a.cmd == "edit":
        plan = edit(a.src, a.out, a.style, a.hook, a.cta, [k for k in a.keywords.split(",") if k], a.engine, a.words, not a.no_mask, a.brand, [x for x in a.effects.split(",") if x] if a.effects is not None else None, json.loads(a.emojis) if a.emojis else None, json.loads(a.extra) if a.extra else None)
        print(json.dumps({"out": os.path.join(a.out, "reel.mp4"), "duration": plan["duration"], "cut": plan["cut"], "transcript": plan["transcript_status"], "pages": len(plan["captions"]["pages"])}, ensure_ascii=False))
    elif a.cmd == "catalog":
        print(json.dumps({"presets": {k: {"he": v["he"], "effects": v["effects"]} for k, v in PRESETS.items()}, "effects": [{"id": i, "he": h, "group": g, "desc": d} for i, h, g, d in CATALOG]}, ensure_ascii=False, indent=1))
    elif a.cmd == "check":
        print(check(a.proj))
    elif a.cmd == "words":
        r = transcribe(a.src, a.engine)
        print(r["status"])
        print(words_table(r["words"]))
