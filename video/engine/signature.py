"""Signature effects: the 16 big moments from the editing guide, each placed on its spoken word.

    python3 signature.py catalog                      # every effect, its params and its sound
    python3 signature.py sfx                          # synthesize the effect sounds into video/sfx/sig
    python3 signature.py worlds --out dir             # preview the world backgrounds for approval
    python3 reel.py edit clip.mp4 --out out/x --sig sig.json [--music bed.wav]

sig.json is a list of requests, each {"kind": ..., "word": "<word as spoken>", ...params}. A word is matched in the
transcript (punctuation ignored); "n" picks the n-th occurrence, "words" lists the words for multi-beat effects.
A request whose word is not in the transcript is skipped and reported (an effect that does not fit is dropped,
never forced). Every time inside the engine is final time; freezes are inserted into the time map first.

Order of drawing for one frame (see Sig.frame):
  scene (worlds, giant town, hologram room) -> person layer effects -> captions -> overlays (titles, stamps, cards)
  -> pop layer (person above the frame) -> whole-frame effects (zoom, cube, shatter, flip, blackout)
  -> post (cold tint, colour split, flash, camera shake) ; the VHS rewind tail is built from rendered frames.
"""
from __future__ import annotations
import json
import math
import os
import re
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sigkit as K  # noqa: E402
from sigkit import W, H, FPS, NAVY, RED, TEAL, MIST, WHITE, GLOW, GOLD, clamp, ease_out, ease_in, ease_in_out, back_out, spring  # noqa: E402

SFX_DIR = os.path.join(os.path.dirname(HERE), "sfx", "sig")

# id, Hebrew name, what it does, params (beyond "word"), its sounds
CATALOG = [
    ("opening", "פתיחה אפורה וסלאם", "אפור ובלי עריכה עד המילה, ואז צבע, רקע זז, זוהר, כותרת נוחתת, רעידה והבזק. שלוש הצצות לרגעים שיבואו",
     {"title": "טקסט הכותרת", "tag_after": "הטקסט החדש של התגית", "cta": "כפתור הקריאה לפעולה"}, ["slam", "glitch"]),
    ("title3d", "כותרת תלת־ממדית", "הטקסט עף מפי 5.5 ונוחת עם 16 שכבות עומק, זוהר ופס אדום", {"text": "טקסט הכותרת"}, ["whoosh-in", "impact"]),
    ("shatter", "התנפצות זכוכית", "סדקים, כ-50 רסיסי וורונוי שעפים עם כוח משיכה, ואז מתאחים", {}, ["crack", "shatter", "glass-rev"]),
    ("popout", "יציאה מהמסגרת", "הדמות גדלה פי 1.8 מעל המסגרת והכותרת, עם אור קצה וצל", {}, ["whoosh-up", "whoosh"]),
    ("flip", "היפוך תלת־ממדי", "כל הריל מתהפך סביב הציר האופקי, נשאר הפוך לרגע, וחוזר", {}, ["whoosh", "whoosh"]),
    ("worlds", "עולמות", "השחרה, בום, והרקע מתחלף לעולמות עם הדמות גזורה בתוכם", {"words": "המילים של כל עולם", "worlds": "space, underwater, city או נתיבי תמונות"}, ["boom", "whoosh-in"]),
    ("freeze", "עצירת זמן", "החזקה של 0.7 שניות, גוון קר, פרלקסה 2.5D, גל הדף, שעון עצר", {}, ["freeze", "release"]),
    ("giant", "ענק", "עיר מיניאטורית, הדמות גדלה בשלוש קפיצות כבדות", {}, ["stomp"]),
    ("pixel", "פירוק לפיקסלים", "הדמות מתפרקת לבלוקים של 12 פיקסלים שעפים, ונבנית מחדש", {}, ["crumble", "rebuild"]),
    ("zoom", "זום אינסופי", "טלפון שמראה את הריל עצמו, צלילה על כל מילה", {"words": "מילים לצלילות"}, ["dive"]),
    ("cube", "קובייה", "המסגרת הופכת לקובייה עם כרטיס מונפש על כל פאה", {"words": "ארבע מילים", "cards": "ad, stop, invite, deck עם טקסט"}, ["cube"]),
    ("money", "חותמות וכסף", "שתי חותמות אדומות, קו מחיקה ונפילה, תגיות ומונה שצונח ל-0", {"stamps": "שתי חותמות", "strike_word": "מילת המחיקה", "amount": "הסכום", "tags": "שלוש תגיות", "final_tag": "התגית באפס"}, ["stamp", "strike", "fall", "counter"]),
    ("comment", "תגובה והודעה", "מילת קוד מוקלדת בתיבת תגובה, לב, והתראת הודעה פרטית", {"code": "מילת הקוד", "notif": "טקסט ההתראה"}, ["key", "pop", "notification"]),
    ("hologram", "הולוגרמה", "הדמות מתגלה כהולוגרמה בטורקיז, תגיות וכוונת", {"until_word": "סוף המשפט", "tags_word": "מילת התגיות", "tags": "שלוש תגיות"}, ["holo-on", "pop", "holo-off"]),
    ("goal", "מונה עוקבים", "מספר סופר ליעד עם פס התקדמות, קונפטי, רעידה והבזק", {"from": "המספר היום", "to": "היעד"}, ["counter", "confetti"]),
    ("gold", "חותמת זהב", "חותמת זהב נוחתת מפי 2.4 עם קרני אור וניצוצות", {"text": "טקסט החותמת"}, ["stamp-gold"]),
    ("follow", "כפתור עקוב", "כפתור עקוב, אצבע לוחצת, במעקב, לבבות", {}, ["click", "sparkle"]),
    ("rewind", "הרצה לאחור VHS", "אחרי הסוף הריל רץ אחורה ב-1.3 שניות עד הפריים הראשון", {}, ["rewind"]),
]
KINDS = {c[0] for c in CATALOG}


def norm(w: str) -> str:
    return re.sub(r"[^\w֐-׿]", "", re.sub(r"[֑-ׇ]", "", w or "")).strip()


def find_word(words: list[dict], token: str, n: int = 1, after: float = -1.0):
    """Source-time word whose text matches token (exact, then ends-with, then contains)."""
    t = norm(token)
    if not t:
        return None
    for test in (lambda x: x == t, lambda x: x.endswith(t) or x.startswith(t), lambda x: t in x):
        k = 0
        for w in words:
            if w["start"] <= after:
                continue
            if test(norm(w["text"])):
                k += 1
                if k == n:
                    return w
    return None


# ---------------------------------------------------------------- planning
def plan_signature(reqs: list[dict], words: list[dict], tm) -> tuple[list[dict], list[dict]]:
    """Resolve requests to final times. Freezes go into the time map first (they shift everything after them).
    Returns (items, skipped)."""
    skipped, items = [], []
    # 1. freezes in the time map
    for r in reqs:
        if r.get("kind") == "freeze":
            w = find_word(words, r.get("word", ""), r.get("n", 1))
            if not w:
                skipped.append({"kind": "freeze", "word": r.get("word"), "why": "המילה לא נמצאה בתמלול"})
                r["_skip"] = True
                continue
            tm.insert_freeze(w["start"], float(r.get("hold", 0.7)))
            r["_src"] = w["start"]
    # 2. everything in final time
    for r in reqs:
        k = r.get("kind")
        if k not in KINDS or r.get("_skip"):
            if k not in KINDS:
                skipped.append({"kind": k, "why": "סוג אפקט לא מוכר"})
            continue
        it = {kk: v for kk, v in r.items() if not kk.startswith("_")}
        if k == "rewind":
            items.append(it)
            continue
        if k == "freeze":
            # the frozen stretch starts at the dst time of the source word (the first frame of the hold)
            for s in tm.segs:
                if s["kind"] == "freeze" and abs(s["src"] - r["_src"]) < 1e-6:
                    it.update(at=s["dst"], dur=s["dur"], word_text=r.get("word"))
            items.append(it)
            continue
        w = find_word(words, r.get("word", ""), r.get("n", 1))
        at = tm.dst_time(w["start"]) if w else None
        if at is None:
            skipped.append({"kind": k, "word": r.get("word"), "why": "המילה לא נמצאה בתמלול" if not w else "המילה נחתכה"})
            continue
        it["at"], it["word_text"] = at, w["text"]
        it["end_word"] = tm.dst_time(w["end"] - 0.01) or at + 0.3
        seq = []
        last = w["start"]
        for tok in r.get("words", []) or []:
            ww = find_word(words, tok, 1, last - 1e-3)
            if ww:
                t2 = tm.dst_time(ww["start"])
                if t2 is not None:
                    seq.append({"text": ww["text"], "at": t2})
                    last = ww["start"]
        it["beats"] = seq
        for key in ("strike_word", "tags_word", "until_word"):
            if r.get(key):
                ww = find_word(words, r[key], 1, w["start"] - 1e-3)
                it[key + "_at"] = tm.dst_time(ww["start"]) if ww else None
        items.append(it)
    # durations
    D = tm.duration
    for it in items:
        k = it["kind"]
        b = [x["at"] for x in it.get("beats", [])]
        if k == "rewind":
            it["at"], it["dur"] = D, 1.3
            continue
        if k == "opening":
            it["dur"] = max(1.0, D - it["at"] - 0.3)
        elif k == "title3d":
            it["dur"] = float(it.get("dur", 1.6))
        elif k == "shatter":
            it["dur"] = 1.15
        elif k == "popout":
            it["dur"] = float(it.get("hold", 1.0)) + 0.2
        elif k == "flip":
            it["dur"] = 1.25
        elif k == "worlds":
            if not b:
                b = [it["at"]]
            if b[0] != it["at"]:
                b = [it["at"]] + b
            it["beats_at"] = b[:6]
            it["dur"] = float(it.get("hold", 2.0)) + (b[-1] - it["at"])
        elif k == "giant":
            it["dur"] = 1.9
        elif k == "pixel":
            it["dur"] = 1.75
        elif k in ("zoom", "cube"):
            last = b[-1] if b else it["at"]
            it["beats_at"] = b
            it["dur"] = (last - it["at"]) + (1.4 if k == "zoom" else 1.7)
        elif k == "money":
            sa = it.get("strike_word_at") or it["at"] + 1.2
            it["strike_at"] = sa
            it["dur"] = (sa - it["at"]) + 2.8
        elif k == "comment":
            it["dur"] = 3.2
        elif k == "hologram":
            ua = it.get("until_word_at") or it["at"] + 3.0
            it["dur"] = max(1.6, ua - it["at"] + 0.4)
        elif k == "goal":
            it["dur"] = 2.6
        elif k == "gold":
            it["dur"] = 2.2
        elif k == "follow":
            it["dur"] = 2.4
        it["dur"] = min(it.get("dur", 1.5), max(0.3, D - it["at"]))
    items.sort(key=lambda x: x.get("at", 1e9))
    # two big moments on top of each other read as noise: report every overlap so the plan can be fixed before render
    for i, x in enumerate(items):
        for y in items[i + 1:]:
            if x["kind"] == "opening" or y["kind"] == "opening" or "rewind" in (x["kind"], y["kind"]):
                continue
            if y["at"] < x["at"] + x["dur"] - 0.05:
                skipped.append({"kind": y["kind"], "word": y.get("word_text"), "why": f"חופף ל{dict((c[0], c[1]) for c in CATALOG)[x['kind']]} ({x['at']:.2f} עד {x['at'] + x['dur']:.2f}). כדאי לבחור מילה מאוחרת יותר", "warn": True})
    return items, skipped


def sfx_for(items: list[dict], D: float) -> list[dict]:
    """Every effect's sounds on their frames (final seconds)."""
    out = []
    add = lambda n, t, g=0.7, w=None, k=None: out.append({"name": "sig/sig-" + n if not n.startswith("@") else n[1:], "at": max(0.0, round(t * FPS) / FPS), "gain": g, "word": w, "kind": k})
    for it in items:
        k, a, w = it["kind"], it.get("at", 0), it.get("word_text")
        if k == "opening":
            add("slam", a, 0.95, w, k)
            for p in it.get("peeks", []):
                add("@glitch-blip", p, 0.45, None, k)
        elif k == "title3d":
            add("whoosh-in", max(0, a - 0.05), 0.6, w, k)
            add("impact", a + 0.25, 0.75, w, k)
        elif k == "shatter":
            add("crack", a - 0.15, 0.6, w, k)
            add("shatter", a, 0.9, w, k)
            add("glass-rev", a + 0.55, 0.55, w, k)
        elif k == "popout":
            add("whoosh-up", a, 0.6, w, k)
            add("whoosh", a + it["dur"] - 0.25, 0.4, w, k)
        elif k == "flip":
            add("whoosh", a, 0.65, w, k)
            add("whoosh", a + 0.78, 0.6, w, k)
        elif k == "worlds":
            add("pulse", a - 0.55, 0.35, None, k)
            add("boom", a, 1.0, w, k)
            for b in it["beats_at"][1:]:
                add("whoosh-in", b, 0.6, None, k)
        elif k == "freeze":
            add("freeze", a, 0.75, w, k)
            add("release", a + it["dur"], 0.7, w, k)
        elif k == "giant":
            for s in range(3):
                add("stomp", a + s * 0.3, 0.9, w if s == 0 else None, k)
        elif k == "pixel":
            add("crumble", a, 0.7, w, k)
            add("rebuild", a + 0.95, 0.6, w, k)
        elif k == "zoom":
            add("whoosh-in", a, 0.5, w, k)
            for b in it["beats_at"]:
                add("dive", b, 0.65, None, k)
        elif k == "cube":
            add("cube", a, 0.6, w, k)
            for b in it["beats_at"]:
                add("cube", b, 0.6, None, k)
        elif k == "money":
            add("stamp", a, 0.8, w, k)
            add("stamp", a + 0.5, 0.8, None, k)
            sa = it["strike_at"]
            add("strike", sa, 0.6, None, k)
            add("fall", sa + 0.25, 0.5, None, k)
            for i in range(3):
                add("@pop", sa + 0.75 + 0.15 * i, 0.5, None, k)
            add("counter", sa + 1.25, 0.6, None, k)
            add("@ding", sa + 1.75, 0.6, None, k)
        elif k == "comment":
            add("@pop", a, 0.5, w, k)
            code = it.get("code", "")
            for i in range(len(code)):
                add("key", a + 0.35 + i * 0.09, 0.35, None, k)
            te = a + 0.35 + len(code) * 0.09 + 0.15
            add("@mouse-click", te, 0.6, None, k)
            add("@pop", te + 0.1, 0.5, None, k)
            add("@notification", te + 0.6, 0.7, None, k)
        elif k == "hologram":
            add("holo-on", a, 0.6, w, k)
            ta = it.get("tags_word_at")
            if ta:
                for i in range(3):
                    add("@pop", ta + 0.22 * i, 0.45, None, k)
            add("holo-off", a + it["dur"] - 0.25, 0.5, None, k)
        elif k == "goal":
            add("counter", a, 0.6, w, k)
            add("confetti", a + 1.4, 0.8, None, k)
        elif k == "gold":
            add("stamp-gold", a, 0.85, w, k)
        elif k == "follow":
            add("whoosh-up", a, 0.45, w, k)
            add("@mouse-click", a + 0.95, 0.7, None, k)
            add("@sparkle", a + 1.05, 0.5, None, k)
        elif k == "rewind":
            add("rewind", D, 0.85, None, k)
    return out


def music_mutes(items: list[dict]) -> list[tuple[float, float]]:
    """Windows where the music goes silent: the blackout before the worlds, and time freezes."""
    m = []
    for it in items:
        if it["kind"] == "worlds":
            m.append((it["at"] - float(it.get("blackout", 0.7)), it["at"]))
        if it["kind"] == "freeze":
            m.append((it["at"], it["at"] + it["dur"]))
    return m


# ---------------------------------------------------------------- the compositor
class Sig:
    def __init__(self, R):
        self.R = R
        self.items = R.plan.get("signature", [])
        self.D0 = R.plan.get("duration_main", R.plan["duration"])
        self.rewind = next((i for i in self.items if i["kind"] == "rewind"), None)
        self.opening = next((i for i in self.items if i["kind"] == "opening"), None)
        self._lay = {}
        self._plate = {}
        self._res = {}
        self.depth = 0

    # ---------- layers of the current frame
    def layers(self, t: float) -> dict:
        key = int(round(t * FPS * 4))
        if key in self._lay:
            return self._lay[key]
        R = self.R
        st = R.tm.src_time(t)
        fr = R.source_frame(st)
        S, box = R.canvas(fr, t)
        S = S.copy()
        if R.masks is not None and R.masks.ok:
            m = R.masks.at(st, fr.shape[:2], feather=5)
            m3 = np.repeat((m * 255).astype(np.uint8)[..., None], 3, axis=2)
            Mc, _ = R.canvas(m3, t)
            M = Mc[..., 0].astype(np.float32) / 255.0
            x0, y0, x1, y1 = box
            out = np.zeros_like(M)
            out[y0:y1, x0:x1] = M[y0:y1, x0:x1]
            M = out
        else:
            M = np.zeros((H, W), np.float32)
        ys, xs = np.where(M > 0.5)
        bb = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) > 200 else None
        d = {"S": S, "M": M, "box": box, "src_t": st, "bbox": bb}
        if len(self._lay) > 6:
            self._lay.clear()
        self._lay[key] = d
        return d

    def plate(self, L: dict) -> np.ndarray:
        """Clean plate: the background with the person painted out (cv2.inpaint on a dilated mask, quarter size)."""
        key = int(round(L["src_t"] * 100))
        if key in self._plate:
            return self._plate[key]
        S, M = L["S"], L["M"]
        q = 4
        small = cv2.resize(S, (W // q, H // q), interpolation=cv2.INTER_AREA)
        ms = cv2.resize((M > 0.15).astype(np.uint8) * 255, (W // q, H // q), interpolation=cv2.INTER_NEAREST)
        ms = cv2.dilate(ms, np.ones((9, 9), np.uint8))
        inp = cv2.inpaint(small, ms, 6, cv2.INPAINT_TELEA)
        inp = cv2.GaussianBlur(inp, (0, 0), 1.2)
        up = cv2.resize(inp, (W, H), interpolation=cv2.INTER_CUBIC)
        md = cv2.GaussianBlur(cv2.resize(ms, (W, H)).astype(np.float32) / 255.0, (0, 0), 6)[..., None]
        P = (S.astype(np.float32) * (1 - md) + up.astype(np.float32) * md).astype(np.uint8)
        if len(self._plate) > 8:
            self._plate.clear()
        self._plate[key] = P
        return P

    def person_xform(self, L: dict, scale: float, anchor_y: float, dx: float = 0.0, dy: float = 0.0, angle: float = 0.0):
        """Person layer (pixels + mask) scaled about (person centre x, anchor_y)."""
        bb = L["bbox"]
        cx = (bb[0] + bb[2]) / 2 if bb else W / 2
        M = cv2.getRotationMatrix2D((cx, anchor_y), angle, scale)
        M[0, 2] += dx
        M[1, 2] += dy
        S2 = cv2.warpAffine(L["S"], M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        M2 = cv2.warpAffine(L["M"], M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        return S2, M2

    def rim(self, frame: np.ndarray, M: np.ndarray, color, width: int = 10, strength: float = 1.0) -> None:
        mb = (M > 0.5).astype(np.uint8)
        dil = cv2.dilate(mb, np.ones((width, width), np.uint8)).astype(np.float32)
        ring = np.clip(dil - M, 0, 1)
        ring = cv2.GaussianBlur(ring, (0, 0), width * 0.6)
        layer = ring[..., None] * np.array(color, np.float32) * strength
        np.copyto(frame, np.clip(frame.astype(np.float32) + layer, 0, 255).astype(np.uint8))

    def shadow(self, frame: np.ndarray, cx: float, y: float, w: float, a: float = 0.55) -> None:
        sh = np.zeros((H, W), np.float32)
        cv2.ellipse(sh, (int(cx), int(y)), (max(4, int(w * 0.5)), max(3, int(w * 0.09))), 0, 0, 360, 1.0, -1)
        sh = cv2.GaussianBlur(sh, (0, 0), max(4, w * 0.06)) * a
        frame[:] = (frame.astype(np.float32) * (1 - sh[..., None])).astype(np.uint8)

    # ---------- caption layer (so effects can tilt, mosaic or fade it)
    def caption_layer(self, t: float, base: np.ndarray, box):
        c = base.copy()
        self.R.captions(c, t, box)
        diff = (np.abs(c.astype(np.int16) - base.astype(np.int16)).sum(axis=2) > 0).astype(np.float32)
        return c, diff

    # ---------- main
    def frame(self, t: float) -> np.ndarray:
        if self.rewind and t >= self.D0 - 1e-6:
            return self.rewind_frame(t)
        act = [i for i in self.items if i["kind"] != "rewind" and i["at"] - 0.2 <= t <= i["at"] + i["dur"] + 0.05]
        if self.opening and t < self.opening["at"]:
            return self.grey_frame(t)
        P = {"shake": [0.0, 0.0, 0.0], "flash": 0.0, "split": 0.0, "cold": 0.0, "cap_alpha": 1.0, "cap_tilt": 0.0, "cap_mosaic": 0, "zoom": 1.0}
        R = self.R
        L = self.layers(t)
        f = R.base_frame(t, captions=False, fades=not self.rewind and not self.opening)
        box = L["box"]
        if self.opening:
            self.opening_scene(f, t, L, P)
        for it in act:
            fn = getattr(self, "scene_" + it["kind"], None)
            if fn:
                r_ = fn(f, t, it, L, P)
                f = f if r_ is None else r_
        for it in act:
            fn = getattr(self, "person_" + it["kind"], None)
            if fn:
                r_ = fn(f, t, it, L, P)
                f = f if r_ is None else r_
        # whole-frame effects that carry the picture (zoom, cube) run before the captions so captions stay on top
        for it in act:
            fn = getattr(self, "carry_" + it["kind"], None)
            if fn:
                r_ = fn(f, t, it, L, P)
                f = f if r_ is None else r_
        # captions
        if P["cap_alpha"] > 0.01:
            c, mk = self.caption_layer(t, f, box)
            if P["cap_mosaic"]:
                c = K.mosaic(c, P["cap_mosaic"])
                mk = (cv2.dilate(mk, np.ones((P["cap_mosaic"], P["cap_mosaic"]), np.uint8)) > 0).astype(np.float32)
            if P["cap_tilt"]:
                ys, xs = np.where(mk > 0)
                if len(ys):
                    cc = ((xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2)
                    Mr = cv2.getRotationMatrix2D(cc, P["cap_tilt"], 1.0)
                    c = cv2.warpAffine(c, Mr, (W, H), borderMode=cv2.BORDER_REPLICATE)
                    mk = cv2.warpAffine(mk, Mr, (W, H))
            K.over(f, c, mk * P["cap_alpha"])
        if self.opening:
            self.opening_overlay(f, t, L, P)
        for it in act:
            fn = getattr(self, "over_" + it["kind"], None)
            if fn:
                r_ = fn(f, t, it, L, P)
                f = f if r_ is None else r_
        for it in act:
            fn = getattr(self, "pop_" + it["kind"], None)
            if fn:
                r_ = fn(f, t, it, L, P)
                f = f if r_ is None else r_
        for it in act:
            fn = getattr(self, "whole_" + it["kind"], None)
            if fn:
                r_ = fn(f, t, it, L, P)
                f = f if r_ is None else r_
        # post
        f = K.cold(f, P["cold"])
        f = K.rgb_split(f, P["split"])
        f = K.flash(f, P["flash"])
        sx, sy, sr = P["shake"]
        f = K.shake(f, sx, sy, sr)
        return f

    @staticmethod
    def kick(P, u, amp, decay=0.18, freq=19.0, seed=1):
        if u < 0 or u > decay * 6:
            return
        a = amp * math.exp(-u / decay)
        ph = K.hash01(seed) * 6.28
        P["shake"][0] += a * math.sin(u * 2 * math.pi * freq + ph)
        P["shake"][1] += a * 0.8 * math.cos(u * 2 * math.pi * freq * 1.13 + ph)
        P["shake"][2] += a * 0.012 * math.sin(u * 2 * math.pi * freq * 0.7)

    # ============================================================ 1. opening: grey until the word, then the slam
    def grey_frame(self, t: float) -> np.ndarray:
        op = self.opening
        L = self.layers(t)
        S, box = L["S"], L["box"]
        f = np.empty_like(S)
        f[:] = K.GREY_BG
        x0, y0, x1, y1 = box
        f[y0:y1, x0:x1] = K.grey(S[y0:y1, x0:x1])
        f = K.zoom_center(f, 1 + 0.10 * ease_in_out(t / max(0.1, op["at"])), (x0 + x1) / 2, (y0 + y1) / 2)
        self.tag(f, "בלי עריכה", L, (95, 95, 95), (210, 210, 210), 1.0)
        # three glimpses (under a quarter second) of the wildest moments ahead
        for p in op.get("peeks", []):
            if p <= t < p + 0.2 and self.depth == 0:
                tgt = op["peek_targets"][op["peeks"].index(p)]
                self.depth += 1
                try:
                    g = self.frame(tgt + (t - p))
                finally:
                    self.depth -= 1
                g = K.rgb_split(g, 16 * (1 - (t - p) / 0.2) + 6)
                band = int(H * (0.2 + 0.6 * K.hash01(int(t * FPS))))
                g[band:band + 40] = np.roll(g[band:band + 40], 60, axis=1)
                return g
        return f

    def tag(self, f, text, L, bg, fg, alpha, sy=1.0):
        box = L["box"]
        y = max(int(H * 0.11), box[1] - 300) if box[1] > 200 else int(H * 0.12)
        spr = K.text_sprite(text, 44, fg, 700, pad=0)
        pill = K.rrect(spr.shape[1] + 56, spr.shape[0] + 30, 30, bg)
        K.compose(pill, spr, 28, 15)
        K.blit(f, pill, W / 2, y, 1.0, 0, alpha, sy=sy)

    def opening_scene(self, f, t, L, P):
        op = self.opening
        u = t - op["at"]
        if u < 0:
            return
        c = clamp(u / 0.15)
        box = L["box"]
        x0, y0, x1, y1 = box
        if (x1 - x0) < W or (y1 - y0) < H:
            # the moving background lights up around the frame
            bg = self.moving_bg(t)
            mask = np.ones((H, W), np.float32)
            mask[y0:y1, x0:x1] = 0
            K.over(f, (bg.astype(np.float32) * c + np.array(K.GREY_BG, np.float32) * (1 - c)).astype(np.uint8), mask)
            # the frame's glow
            g = np.zeros((H, W), np.float32)
            cv2.rectangle(g, (x0, y0), (x1 - 1, y1 - 1), 1.0, 10)
            g = cv2.GaussianBlur(g, (0, 0), 22) * 2.2 * c
            np.copyto(f, np.clip(f.astype(np.float32) + g[..., None] * np.array(GLOW, np.float32), 0, 255).astype(np.uint8))
            cv2.rectangle(f, (x0, y0), (x1 - 1, y1 - 1), (235, 230, 160), 3, cv2.LINE_AA)
        if c < 1:
            g2 = K.grey(f, 1 - c)
            f[:] = g2
        Sig.kick(P, u, 34, 0.16, 17, 3)
        P["flash"] = max(P["flash"], 0.9 * math.exp(-u / 0.05) if u < 0.25 else 0)
        P["split"] += 18 * math.exp(-u / 0.09) if u < 0.5 else 0

    def moving_bg(self, t):
        """Animated brand background: drifting teal and red light over navy."""
        if "mbg" not in self._res:
            self._res["mbg"] = K.fbm(H // 8, W // 8, 21, 4, 48)
        n = self._res["mbg"]
        sh = int(t * 40) % n.shape[1]
        nn = np.roll(n, sh, axis=1)
        nn2 = np.roll(n[::-1], -int(t * 25) % n.shape[1], axis=1)
        a = cv2.GaussianBlur(cv2.resize(nn, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 18)[..., None]
        b = cv2.GaussianBlur(cv2.resize(nn2, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 24)[..., None]
        img = np.array(NAVY, np.float32) * 0.8 + a ** 2 * np.array([200, 160, 30], np.float32) * 0.9 + b ** 3 * np.array([40, 30, 200], np.float32) * 0.8
        return np.clip(img, 0, 255).astype(np.uint8)

    def opening_overlay(self, f, t, L, P):
        op = self.opening
        u = t - op["at"]
        if u < 0:
            return
        box = L["box"]
        # the tag flips to its new text
        k = clamp(u / 0.32)
        sy = abs(math.cos(math.pi * k))
        txt = "בלי עריכה" if k < 0.5 else (op.get("tag_after") or "עם עריכה")
        bg, fg = ((95, 95, 95), (210, 210, 210)) if k < 0.5 else (RED, WHITE)
        hold_tag = op["at"] + op["dur"]
        if t < hold_tag:
            self.tag(f, txt, L, bg, fg, 1.0, max(0.02, sy))
        # the title lands from 145% with a small overshoot and a slight turn
        title = op.get("title")
        hold = float(op.get("title_hold", 2.6))
        if title and u < hold + 0.3:
            if "op_title" not in self._res:
                sz = K.fit_text(title, W - 140, 96)
                spr = K.glowed(K.text_sprite(title, sz, WHITE, 700, pad=8, stroke=0), 14, GLOW, 0.9)
                self._res["op_title"] = spr
            spr = self._res["op_title"]
            p = clamp(u / 0.38)
            s = 1.45 - 0.45 * back_out(p, 2.2)
            ang = -7 * (1 - back_out(p, 1.6)) + 1.5
            al = clamp(u / 0.06) * (1 - clamp((u - hold) / 0.3))
            ty = box[1] - 150 if box[1] > 320 else int(H * 0.22)
            K.blit(f, spr, W / 2, ty, s, ang, al)
        # the call to action rises from below and stays
        cta = op.get("cta")
        if cta:
            self.cta_button(f, t, cta, u, P)

    def cta_button(self, f, t, cta, u, P, pump: float = 0.0, sweep: float = -1.0):
        if "cta" not in self._res:
            spr = K.text_sprite(cta, 50, WHITE, 700, pad=0)
            btn = K.rrect(spr.shape[1] + 110, spr.shape[0] + 46, 44, RED)
            K.compose(btn, spr, 55, 23)
            self._res["cta"] = btn
        btn = self._res["cta"]
        p = ease_out(clamp((u - 0.18) / 0.4))
        y = H - 300 + (1 - p) * 420
        s = 1 + pump
        if sweep >= 0:
            b2 = btn.copy()
            x = int(sweep * (b2.shape[1] + 120)) - 60
            band = np.zeros(b2.shape[:2], np.float32)
            cv2.line(band, (x, 0), (x - 50, b2.shape[0]), 1.0, 28)
            band = cv2.GaussianBlur(band, (0, 0), 8) * (b2[..., 3] / 255.0)
            b2[..., :3] = np.clip(b2[..., :3] + band[..., None] * 160, 0, 255).astype(np.uint8)
            btn = b2
        K.blit(f, btn, W / 2, y, s, 0, p)
        self._res["cta_y"] = y

    # ============================================================ 2. 3D title
    def over_title3d(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return
        key = "t3d_%d" % id(it)
        if key not in self._res:
            text = it.get("text") or it.get("word_text", "")
            sz = K.fit_text(text, int(W * 0.78), 150)
            top = K.text_sprite(text, sz, WHITE, 700, pad=4)
            n, step = 16, max(2, sz // 34)
            h, w = top.shape[:2]
            pad = n * step + 40
            canvas = np.zeros((h + pad * 2, w + pad * 2, 4), np.uint8)
            for k in range(n, 0, -1):
                q = k / n
                col = tuple(int(NAVY[c] * q + (230, 200, 30)[c] * (1 - q)) for c in range(3))
                layer = K.text_sprite(text, sz, col, 700, pad=4)
                K.compose(canvas, layer, pad + k * step, pad + k * step)
            g = K.glowed(top, 16, (255, 245, 200), 0.8)
            K.compose(canvas, g[: canvas.shape[0] - pad + 32, : canvas.shape[1] - pad + 32] if False else g, pad - 32, pad - 32)
            self._res[key] = (canvas, sz)
        spr, sz = self._res[key]
        box = L["box"]
        cy = (box[1] + box[3]) / 2
        if u < 0.25:
            p = ease_out(u / 0.25)
            s = math.exp(math.log(5.5) * (1 - p))
            al = clamp(u / 0.05)
        else:
            s, al = 1.0, 1.0
        ex = it["dur"] - 0.14
        if u > ex:
            q = clamp((u - ex) / 0.14)
            s = 1 + 2 * ease_in(q)
            al = 1 - q
        K.blit(f, spr, W / 2, cy, s, 4.0, al)
        # red bar after the landing
        if u > 0.25 and u < ex:
            q = ease_out((u - 0.27) / 0.25)
            bw = int(spr.shape[1] * 0.62 * q)
            if bw > 2:
                y = int(cy + spr.shape[0] * 0.34)
                cv2.rectangle(f, (W // 2 - bw // 2, y), (W // 2 + bw // 2, y + max(8, sz // 10)), RED, -1)
        Sig.kick(P, u - 0.25, 12, 0.08, 23, 5)

    # ============================================================ 3. shatter
    def cells(self):
        if "cells" in self._res:
            return self._res["cells"]
        rng = np.random.default_rng(7)
        pts = [(W / 2 + rng.normal(0, W * 0.16), H / 2 + rng.normal(0, H * 0.12)) for _ in range(25)] + [(rng.random() * W, rng.random() * H) for _ in range(25)]
        sub = cv2.Subdiv2D((-2, -2, W + 4, H + 4))
        for x, y in pts:
            sub.insert((float(clamp(x, 1, W - 2)), float(clamp(y, 1, H - 2))))
        facets, centers = sub.getVoronoiFacetList([])
        rect = np.array([[0, 0], [W, 0], [W, H], [0, H]], np.float32)
        cells = []
        for poly, c in zip(facets, centers):
            poly = np.array(poly, np.float32)
            ok, inter = cv2.intersectConvexConvex(poly, rect)
            if ok <= 0 or inter is None or len(inter) < 3:
                continue
            inter = inter.reshape(-1, 2)
            cc = inter.mean(0)
            d = cc - np.array([W / 2, H / 2])
            dist = float(np.linalg.norm(d)) + 1e-3
            cells.append({"poly": inter, "c": cc, "dir": d / dist, "dist": dist, "r1": rng.random(), "r2": rng.random(), "rot": rng.uniform(-1, 1)})
        self._res["cells"] = cells
        return cells

    def whole_shatter(self, f, t, it, L, P):
        u = t - it["at"]
        cells = self.cells()
        if -0.15 <= u < 0:
            # cracks spread from the centre
            r = (u + 0.15) / 0.15 * math.hypot(W, H) * 0.6
            for cl in cells:
                if cl["dist"] < r:
                    cv2.polylines(f, [cl["poly"].astype(np.int32)], True, (255, 255, 255), 3, cv2.LINE_AA)
            return f
        if u < 0 or u > it["dur"]:
            return f
        if u < 0.5:
            p = ease_out(u / 0.5)
        elif u < 0.6:
            p = 1.0
        else:
            p = 1 - ease_in_out((u - 0.6) / 0.5)
        if p < 0.002:
            return f
        out = np.empty_like(f)
        out[:] = (10, 14, 18)
        g = np.zeros((H, W), np.float32)
        cv2.circle(g, (W // 2, H // 2), int(W * 0.35), 1.0, -1)
        g = cv2.GaussianBlur(g, (0, 0), W * 0.18) * p
        np.copyto(out, np.clip(out.astype(np.float32) + g[..., None] * np.array([200, 190, 30], np.float32), 0, 255).astype(np.uint8))
        for cl in cells:
            poly = cl["poly"]
            x0, y0 = np.floor(poly.min(0)).astype(int)
            x1, y1 = np.ceil(poly.max(0)).astype(int)
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
            if x1 - x0 < 2 or y1 - y0 < 2:
                continue
            patch = f[y0:y1, x0:x1]
            pm = np.zeros((y1 - y0, x1 - x0), np.uint8)
            cv2.fillPoly(pm, [(poly - [x0, y0]).astype(np.int32)], 255, cv2.LINE_AA)
            spr = np.dstack([patch, pm])
            cv2.polylines(spr, [(poly - [x0, y0]).astype(np.int32)], True, (255, 255, 255, 255), 3, cv2.LINE_AA)
            sp = 240 + 900 * cl["r1"]
            dx, dy = cl["dir"] * sp * p
            dy += 1500 * (p ** 2) * (0.4 + cl["r2"])
            ang = cl["rot"] * 220 * p
            sc = 1 + 0.4 * p * cl["r2"]
            K.blit(out, spr, cl["c"][0] + dx, cl["c"][1] + dy, sc, ang, 1.0)
        if u >= 0:
            Sig.kick(P, u, 30, 0.2, 18, 9)
            P["flash"] = max(P["flash"], 0.75 * math.exp(-u / 0.05))
        return out

    # ============================================================ 4. pop out of the frame
    def pop_popout(self, f, t, it, L, P):
        u = t - it["at"]
        hold = float(it.get("hold", 1.0))
        if u < 0 or u > hold + 0.2 or not L["bbox"]:
            return f
        if u < hold:
            s = 1 + 0.8 * back_out(clamp(u / 0.33), 1.7)
        else:
            s = 1 + 0.8 * (1 - ease_in(clamp((u - hold) / 0.16)))
        yb = L["box"][3]
        S2, M2 = self.person_xform(L, s, yb)
        M2[yb:] = 0
        bb = L["bbox"]
        self.shadow(f, (bb[0] + bb[2]) / 2, yb - 6, (bb[2] - bb[0]) * s * 0.8, 0.5 * clamp(s - 1))
        K.over(f, S2, M2)
        self.rim(f, M2, GLOW, 12, 0.9 * clamp((s - 1) / 0.4))
        return f

    # ============================================================ 5. flip
    def whole_flip(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > 1.23:
            return f
        if u < 0.45:
            th = math.pi * ease_in_out(u / 0.45)
        elif u < 0.78:
            th = math.pi
        else:
            th = math.pi + math.pi * ease_in_out((u - 0.78) / 0.45)
        if th % (2 * math.pi) < 1e-3:
            return f
        out = np.empty_like(f)
        yy = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
        out[:] = (np.array(NAVY, np.float32) * (1 - yy * 0.5) + np.array([20, 12, 2], np.float32) * yy * 0.5).astype(np.uint8)
        hw, hh, fl = W * 0.47, H * 0.47, H * 2.4
        pts = []
        for x, y in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)):
            yr, zr = y * math.cos(th), y * math.sin(th)
            k = fl / (fl + zr)
            pts.append((W / 2 + x * k, H / 2 + yr * k))
        if abs(math.cos(th)) < 0.015:
            return out
        src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
        M = cv2.getPerspectiveTransform(src, np.float32(pts))
        warped = cv2.warpPerspective(f, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        mk = cv2.warpPerspective(np.ones((H, W), np.float32), M, (W, H))
        shade = 1 - 0.35 * abs(math.sin(th))
        K.over(out, (warped.astype(np.float32) * shade).astype(np.uint8), mk)
        return out

    # ============================================================ 6. worlds
    def world(self, i: int, spec):
        key = "world_%s" % i
        if key not in self._res:
            if isinstance(spec, str) and spec in K.WORLDS:
                self._res[key] = K.WORLDS[spec]()
            elif isinstance(spec, str) and os.path.exists(spec):
                img = cv2.imread(spec)
                ih, iw = img.shape[:2]
                k = max(W / iw, H / ih)
                img = cv2.resize(img, (int(iw * k) + 1, int(ih * k) + 1))
                y0, x0 = (img.shape[0] - H) // 2, (img.shape[1] - W) // 2
                self._res[key] = {"img": img[y0:y0 + H, x0:x0 + W], "rim": GLOW, "name": os.path.basename(spec)}
            else:
                self._res[key] = K.world_space()
        return self._res[key]

    def worlds_state(self, t, it):
        beats = it["beats_at"]
        specs = it.get("worlds") or ["space", "underwater", "city"]
        i = max([k for k, b in enumerate(beats) if t >= b] or [0])
        return i, beats[i], specs[i % len(specs)]

    def scene_worlds(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        i, b, spec = self.worlds_state(t, it)
        wd = self.world(i, spec)
        lu = t - b
        img = K.zoom_center(wd["img"], 1 + 0.06 * (lu / 3.0))
        out = img.copy()
        if "stars" in wd:
            for (x, y, ph, fr, r) in wd["stars"]:
                br = 0.5 + 0.5 * math.sin(t * fr + ph)
                cv2.circle(out, (x, y), r, (255, 255, 255), -1, cv2.LINE_AA) if br > 0.75 else None
                if br > 0.4:
                    cv2.circle(out, (x, y), r + 3, tuple(int(c * br * 0.35) for c in (255, 220, 255)), 1, cv2.LINE_AA)
        if "streaks" in wd:
            for (x0, y, ln, col, sp) in wd["streaks"]:
                x = ((x0 * (W + ln) + t * 1400 * sp) % (W + ln * 2)) - ln
                cv2.line(out, (int(x), int(y)), (int(x + ln), int(y)), col, 3, cv2.LINE_AA)
            out[::4] = (out[::4].astype(np.float32) * 0.72).astype(np.uint8)
        P["_world"] = (wd, lu)
        for b2 in it["beats_at"][1:]:
            d = t - b2
            if 0 <= d < 0.25:
                P["flash"] = max(P["flash"], 0.6 * (1 - d / 0.25))
                P["split"] += 14 * (1 - d / 0.25)
        if 0 <= u < 0.3:
            P["flash"] = max(P["flash"], 0.8 * (1 - u / 0.3))
            Sig.kick(P, u, 36, 0.22, 14, 11)
        return out

    def person_worlds(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"] or not L["bbox"] or "_world" not in P:
            return f
        wd, lu = P["_world"]
        bb = L["bbox"]
        ph = bb[3] - bb[1]
        s = (H * 0.86) / max(1, ph)
        dx = W / 2 - (bb[0] + bb[2]) / 2 + 12 * math.sin(t * 1.3)
        S2, M2 = self.person_xform(L, s * (1 + 0.02 * lu), bb[3], dx, H - bb[3] + 30 * math.sin(t * 0.9) * 0)
        ramp = np.clip((H - np.arange(H, dtype=np.float32)) / 260.0, 0, 1)[:, None]
        M2 = M2 * ramp
        self.rim(f, M2, wd["rim"], 14, 1.1)
        K.over(f, S2, M2)
        if "bubbles" in wd:
            # underwater: waves bend the picture, caustics play, bubbles rise
            yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
            mx = xx + 7 * np.sin(yy / 46 + t * 3.1)
            my = yy + 4 * np.sin(xx / 60 + t * 2.3)
            f = cv2.remap(f, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            q = 6
            ys, xs = np.mgrid[0:H // q, 0:W // q].astype(np.float32)
            c = np.abs(np.sin(xs / 7 + t * 1.7) + np.sin(ys / 9 - t * 1.3) + np.sin((xs + ys) / 11 + t))
            c = np.clip(1.2 - c, 0, 1) ** 3
            c = cv2.resize(c, (W, H)) * np.clip(1 - np.arange(H, dtype=np.float32) / H, 0, 1)[:, None]
            f = np.clip(f.astype(np.float32) + c[..., None] * np.array([90, 90, 40], np.float32), 0, 255).astype(np.uint8)
            for (x, y0, r, sp, ph) in wd["bubbles"]:
                y = (y0 - t * sp) % (H + 40)
                xx2 = x + 10 * math.sin(t * 2 + ph)
                cv2.circle(f, (int(xx2), int(y)), int(r), (255, 240, 200), 2, cv2.LINE_AA)
                cv2.circle(f, (int(xx2 - r * 0.3), int(y - r * 0.3)), max(1, int(r * 0.25)), (255, 255, 255), -1, cv2.LINE_AA)
        return f

    def whole_worlds(self, f, t, it, L, P):
        # the blackout before the word: black, the music gone, a small pulsing point of light
        bo = float(it.get("blackout", 0.7))
        u = t - it["at"]
        if -bo <= u < 0:
            out = np.zeros_like(f)
            r = 6 + 4 * (0.5 + 0.5 * math.sin((u + bo) * 2 * math.pi * 2.2))
            g = np.zeros((H, W), np.float32)
            cv2.circle(g, (W // 2, H // 2), int(r * 4), 1.0, -1)
            g = cv2.GaussianBlur(g, (0, 0), r * 3)
            np.copyto(out, np.clip(g[..., None] * np.array([255, 245, 230], np.float32), 0, 255).astype(np.uint8))
            cv2.circle(out, (W // 2, H // 2), int(r), (255, 255, 255), -1, cv2.LINE_AA)
            return out
        return f

    # ============================================================ 7. time freeze
    def scene_freeze(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u >= it["dur"]:
            if 0 <= u - it["dur"] < 0.22:
                q = (u - it["dur"]) / 0.22
                P["flash"] = max(P["flash"], 0.55 * (1 - q))
                P["split"] += 14 * (1 - q)
            return f
        p = ease_in_out(u / it["dur"])
        plate = self.plate(L)
        box = L["box"]
        x0, y0, x1, y1 = box
        cxy = ((x0 + x1) / 2, (y0 + y1) / 2)
        Mb = cv2.getRotationMatrix2D(cxy, -2.2 * p, 1.06)
        Mb[0, 2] -= 46 * p
        bgm = cv2.warpAffine(plate, Mb, (W, H), borderMode=cv2.BORDER_REFLECT)
        inner = f.copy()
        inner[y0:y1, x0:x1] = bgm[y0:y1, x0:x1]
        bb = L["bbox"]
        if bb:
            S2, M2 = self.person_xform(L, 1.0 + 0.03 * p, bb[3], 40 * p, 0, 1.8 * p)
            box_mask = np.zeros((H, W), np.float32)
            box_mask[y0:y1, x0:x1] = 1
            K.over(inner, S2, M2 * box_mask)
        f[y0:y1, x0:x1] = inner[y0:y1, x0:x1]
        P["cold"] = max(P["cold"], clamp(u / 0.1))
        P["cap_tilt"] = -4.0
        return f

    def over_freeze(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u >= it["dur"]:
            return f
        box = L["box"]
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        # shock wave
        r = int(ease_out(u / 0.5) * H * 0.75)
        a = 1 - clamp(u / 0.55)
        if a > 0 and r > 2:
            ring = np.zeros((H, W), np.float32)
            cv2.circle(ring, (int(cx), int(cy)), r, 1.0, 10, cv2.LINE_AA)
            ring = cv2.GaussianBlur(ring, (0, 0), 3) * a
            np.copyto(f, np.clip(f.astype(np.float32) + ring[..., None] * 255, 0, 255).astype(np.uint8))
        # particles frozen in the air, each with a short trail
        rng = np.random.default_rng(13)
        for _ in range(70):
            x, y = rng.random() * W, box[1] + rng.random() * (box[3] - box[1])
            ln, ang = 12 + rng.random() * 26, rng.random() * 6.28
            cv2.line(f, (int(x), int(y)), (int(x - math.cos(ang) * ln), int(y - math.sin(ang) * ln)), (255, 235, 210), 2, cv2.LINE_AA)
            cv2.circle(f, (int(x), int(y)), 3, (255, 255, 255), -1, cv2.LINE_AA)
        # stopwatch above the frame
        if "watch" not in self._res:
            self._res["watch"] = K.stopwatch(150)
        s = back_out(clamp(u / 0.25), 2.4)
        y = box[1] - 110 if box[1] > 200 else int(H * 0.15)
        K.blit(f, self._res["watch"], W / 2, y, s, 0, clamp(u / 0.08))
        return f

    # ============================================================ 8. giant
    def scene_giant(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        x0, y0, x1, y1 = L["box"]
        if "town" not in self._res:
            self._res["town"] = K.mini_city(x1 - x0, y1 - y0)
        f[y0:y1, x0:x1] = self._res["town"]
        return f

    def pop_giant(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"] or not L["bbox"]:
            return f
        steps = it.get("steps") or [1.15, 1.6, 2.2]
        s = 1.0
        prev = 1.0
        for k, sv in enumerate(steps):
            uk = u - k * 0.3
            if uk >= 0:
                s = prev + (sv - prev) * spring(uk, 4.2, 0.55)
                prev = sv
                Sig.kick(P, uk, 30, 0.12, 15, 17 + k)
        back = 0.6 + float(it.get("hold", 1.0))
        if u > back:
            s = 1 + (prev - 1) * (1 - ease_in(clamp((u - back) / 0.15)))
        yb = L["box"][3]
        S2, M2 = self.person_xform(L, s, yb)
        bb = L["bbox"]
        ramp = np.clip((yb - np.arange(H, dtype=np.float32)) / 70.0, 0, 1)[:, None]
        M2 = M2 * ramp
        x0, y0, x1, y1 = L["box"]
        self.shadow(f, (bb[0] + bb[2]) / 2, yb - 10, (bb[2] - bb[0]) * s * 0.9, 0.55)
        K.over(f, S2, M2)
        return f

    # ============================================================ 9. pixel break
    def person_pixel(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"] or not L["bbox"]:
            return f
        out_t, hold = 0.75, 0.2
        ue = u if u < out_t + hold else max(0.0, 2 * out_t + hold - u)
        ue = min(ue, out_t)
        plate = self.plate(L)
        M = L["M"]
        x0, y0, x1, y1 = L["box"]
        bm = np.zeros((H, W), np.float32)
        bm[y0:y1, x0:x1] = 1
        K.over(f, plate, np.clip(M * 1.3, 0, 1) * bm)
        S = L["S"]
        bx0, by0, bx1, by1 = L["bbox"]
        B = 12
        rng = np.random.default_rng(31)
        for by in range(by0 - by0 % B, by1, B):
            for bx in range(bx0 - bx0 % B, bx1, B):
                m = M[by:by + B, bx:bx + B]
                if m.size == 0 or m.mean() < 0.45:
                    continue
                col = S[by:by + B, bx:bx + B].reshape(-1, 3).mean(0)
                fx = (bx - bx0) / max(1, bx1 - bx0)
                fy = 1 - (by - by0) / max(1, by1 - by0)
                r = 0.05 + 0.5 * (0.5 * fx + 0.5 * fy) + rng.random() * 0.12
                q = clamp((ue - r) / 0.3)
                if q >= 0.999:
                    continue
                col = col * (1 - q) + np.array([215, 200, 40], np.float32) * q
                dx = 260 * q + 26 * q * math.sin(6 * q + bx * 0.05)
                dy = -300 * q
                sz = B * (1 + 1.3 * q)
                cx, cy = bx + B / 2 + dx, by + B / 2 + dy
                a = 1 - q
                x_0, y_0 = int(cx - sz / 2), int(cy - sz / 2)
                x_1, y_1 = int(cx + sz / 2), int(cy + sz / 2)
                if x_1 <= 0 or y_1 <= 0 or x_0 >= W or y_0 >= H:
                    continue
                if a > 0.97:
                    cv2.rectangle(f, (x_0, y_0), (x_1 - 1, y_1 - 1), tuple(float(c) for c in col), -1)
                else:
                    xa, ya, xb, yb2 = max(0, x_0), max(0, y_0), min(W, x_1), min(H, y_1)
                    roi = f[ya:yb2, xa:xb]
                    roi[:] = (roi.astype(np.float32) * (1 - a) + col * a).astype(np.uint8)
        P["cap_mosaic"] = 12 if 0.05 < ue else 0
        return f

    # ============================================================ 10. infinite zoom
    def phone(self, content: np.ndarray, sw: int, sh: int) -> np.ndarray:
        bez = int(sw * 0.06)
        ph = K.rrect(sw + bez * 2, sh + bez * 2, int(sw * 0.16), (16, 16, 18), border=3, border_color=(90, 90, 96))
        scr = cv2.resize(content, (sw, sh), interpolation=cv2.INTER_AREA)
        m = K.rrect(sw, sh, int(sw * 0.11), (255, 255, 255))[..., 3]
        spr = np.dstack([scr, m])
        K.compose(ph, spr, bez, bez)
        cv2.ellipse(ph, (ph.shape[1] // 2, bez + int(sh * 0.025)), (int(sw * 0.12), int(sh * 0.012)), 0, 0, 360, (16, 16, 18, 255), -1, cv2.LINE_AA)
        return ph

    def carry_zoom(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        box = L["box"]
        bw, bh = box[2] - box[0], box[3] - box[1]
        sh = int(bh * 0.80)
        sw = int(sh * W / H)
        if sw > bw * 0.8:
            sw = int(bw * 0.8)
            sh = int(sw * H / W)
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        app = back_out(clamp(u / 0.35), 1.6) * (1 - ease_in(clamp((u - it["dur"] + 0.3) / 0.3)))
        base = f.copy()

        def droste(levels):
            g = base.copy()
            for _ in range(levels):
                ph = self.phone(g, sw, sh)
                g2 = base.copy()
                K.blit(g2, ph, cx, cy, 1.0, 0, 1.0)
                g = g2
            return g
        C3 = droste(3)
        if app < 0.999:
            ph = self.phone(droste(2), sw, sh)
            out = base.copy()
            K.blit(out, ph, cx, cy, app, 0, clamp(app * 3))
            return out
        beat = next((b for b in it["beats_at"] if 0 <= t - b < 1.0), None)
        if beat is None:
            return C3
        p = ease_in_out((t - beat) / 1.0)
        R = W / sw
        z = R ** p
        tx = cx + (W / 2 - cx) * ((z - 1) / (R - 1))
        ty = cy + (H / 2 - cy) * ((z - 1) / (R - 1))
        Mz = np.array([[z, 0, tx - z * cx], [0, z, ty - z * cy]], np.float64)
        out = cv2.warpAffine(C3, Mz, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        b = math.sin(math.pi * p)
        if b > 0.15:   # radial zoom blur mid dive
            acc = out.astype(np.float32)
            for k in range(1, 5):
                zz = z * (1 - 0.025 * k * b)
                M2 = np.array([[zz, 0, tx - zz * cx], [0, zz, ty - zz * cy]], np.float64)
                acc += cv2.warpAffine(C3, M2, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            out = (acc / 5).astype(np.uint8)
        # the screen we are diving into, drawn sharp at its true size
        sws, shs = int(sw * z), int(sh * z)
        if sws < W * 3:
            scx, scy = tx, ty
            inner = droste(2)
            if sws >= W - 2:
                inner_s = cv2.resize(inner, (sws, shs), interpolation=cv2.INTER_LINEAR)
                x0, y0 = int(scx - sws / 2), int(scy - shs / 2)
                xa, ya = max(0, -x0), max(0, -y0)
                out = inner_s[ya:ya + H, xa:xa + W].copy() if inner_s[ya:ya + H, xa:xa + W].shape[:2] == (H, W) else out
            else:
                m = K.rrect(sws, shs, int(sws * 0.11), (255, 255, 255))
                spr = np.dstack([cv2.resize(inner, (sws, shs), interpolation=cv2.INTER_AREA), m[..., 3]])
                K.blit(out, spr, scx, scy, 1.0, 0, 1.0)
        P["cap_alpha"] = min(P["cap_alpha"], 1 - b)
        return out

    # ============================================================ 11. cube
    def card(self, kind: str, text: str, lt: float, w: int, h: int) -> np.ndarray:
        img = np.empty((h, w, 3), np.uint8)
        rng = np.random.default_rng(abs(hash(kind)) % 1000)
        hs = max(30, int(min(w, h) * 0.085))
        if kind == "ad":
            img[:] = (238, 243, 247)
            p = ease_out(clamp(lt / 0.45))
            bw_, bh_ = int(w * 0.24), int(h * 0.42)
            prod = K.rrect(bw_, bh_, int(bw_ * 0.18), NAVY)
            K.compose(prod, K.rrect(bw_, int(bh_ * 0.18), int(bw_ * 0.12), RED), 0, int(bh_ * 0.62))
            K.blit(img, prod, w * 0.38 - (1 - p) * w * 0.8, h * 0.55, 1.0, -25 * (1 - p) + 6, 1.0)
            if lt > 0.45:
                s = back_out(clamp((lt - 0.45) / 0.3), 2.6)
                K.blit(img, K.text_sprite("חדש.", int(hs * 1.6), NAVY, 700), w * 0.72, h * 0.45, s, -4, 1.0)
            if lt > 0.75:
                s = back_out(clamp((lt - 0.75) / 0.3), 2.2)
                tag = K.rrect(int(w * 0.24), int(hs * 1.4), int(hs * 0.5), RED)
                K.compose(tag, K.text_sprite("מבצע", hs, WHITE, 700, pad=0), int(w * 0.12) - int(T_w(hs, "מבצע") / 2), int(hs * 0.2))
                K.blit(img, tag, w * 0.72, h * 0.68, s, 8, 1.0)
        elif kind == "stop":
            img[:] = (30, 24, 20)
            stop_t = 0.7
            off = (lt * 2600 if lt < stop_t else stop_t * 2600 + 120 * spring(lt - stop_t, 3, 0.5)) % (h * 0.8)
            feed = np.empty((h, int(w * 0.42), 3), np.uint8)
            feed[:] = (245, 245, 245)
            ph_h = int(h * 0.26)
            for k in range(-1, 6):
                y = int(k * ph_h * 1.15 - off % (ph_h * 1.15))
                c = [(170, 120, 60), (60, 80, 170), (80, 160, 90), (150, 90, 160), (60, 150, 190)][(k + int(off // (ph_h * 1.15))) % 5]
                cv2.rectangle(feed, (10, y), (feed.shape[1] - 10, y + ph_h), c, -1)
            if lt < stop_t:
                feed = cv2.blur(feed, (1, 41))
            fx = (w - feed.shape[1]) // 2
            img[:, fx:fx + feed.shape[1]] = feed
            if lt > stop_t:
                s = back_out(clamp((lt - stop_t) / 0.25), 2.5)
                cv2.circle(img, (w // 2, h // 2), int(min(w, h) * 0.36 * s), RED, max(6, hs // 4), cv2.LINE_AA)
                K.blit(img, K.text_sprite("עוצר.", int(hs * 1.7), WHITE, 700, stroke=4, stroke_color=(20, 20, 20)), w / 2, h / 2, s, 0, 1.0)
        elif kind == "invite":
            img[:] = (40, 22, 12)
            spr = K.text_sprite(text or "הזמנה", int(hs * 1.8), (210, 235, 255), 700)
            if "inv_pts" not in self._res:
                a = spr[..., 3]
                ys, xs = np.where(a > 128)
                sel = rng.choice(len(xs), min(1600, len(xs)), replace=False)
                self._res["inv_pts"] = (xs[sel], ys[sel], rng.random((len(sel), 2)))
            xs, ys, rr = self._res["inv_pts"]
            ox, oy = (w - spr.shape[1]) / 2, (h - spr.shape[0]) / 2
            p = ease_in_out(clamp(lt / 0.8))
            for x, y, (r1, r2) in zip(xs, ys, rr):
                sx, sy = r1 * w, r2 * h
                px, py = sx + (x + ox - sx) * clamp(p * 1.15 - r1 * 0.15), sy + (y + oy - sy) * clamp(p * 1.15 - r1 * 0.15)
                cv2.circle(img, (int(px), int(py)), 2, (210, 235, 255), -1)
            if lt > 0.8:
                g = clamp((lt - 0.8) / 0.3)
                gl = K.glowed(spr, 12, (120, 200, 255), 1.0)
                K.blit(img, gl, w / 2, h / 2, 1.0, 0, g)
                for k in range(60):
                    a0 = k * 2.4
                    d = (lt - 0.8) * 900 * (0.5 + K.hash01(k))
                    x = w / 2 + math.cos(a0) * d
                    y = h / 2 + math.sin(a0) * d + 400 * (lt - 0.8) ** 2
                    col = [(60, 60, 230), (230, 200, 40), (40, 200, 255), (255, 255, 255)][k % 4]
                    cv2.rectangle(img, (int(x), int(y)), (int(x) + 8, int(y) + 5), col, -1)
        else:   # deck: three slides lift in perspective, a bar chart grows
            img[:] = (235, 232, 226)
            for k in range(3):
                p = ease_out(clamp((lt - k * 0.18) / 0.4))
                sw_, sh_ = int(w * 0.5), int(h * 0.42)
                sl = np.full((sh_, sw_, 3), (255, 255, 255), np.uint8)
                cv2.rectangle(sl, (0, 0), (sw_ - 1, sh_ - 1), (200, 190, 180), 2)
                cv2.rectangle(sl, (int(sw_ * 0.08), int(sh_ * 0.1)), (int(sw_ * 0.6), int(sh_ * 0.2)), NAVY, -1)
                tilt = 30 * (1 - p)
                src = np.float32([[0, 0], [sw_, 0], [sw_, sh_], [0, sh_]])
                cx_, cy_ = w * (0.3 + 0.2 * k), h * (0.62 - 0.14 * k) + (1 - p) * h * 0.5
                dx_ = sw_ / 2 * (1 - tilt / 90 * 0.6)
                dst = np.float32([[cx_ - dx_, cy_ - sh_ / 2], [cx_ + sw_ / 2, cy_ - sh_ / 2 * (1 - tilt / 140)], [cx_ + sw_ / 2, cy_ + sh_ / 2 * (1 - tilt / 140)], [cx_ - dx_, cy_ + sh_ / 2]])
                Mp = cv2.getPerspectiveTransform(src, dst)
                wp = cv2.warpPerspective(sl, Mp, (w, h))
                mk = cv2.warpPerspective(np.ones((sh_, sw_), np.float32), Mp, (w, h))
                K.over(img, wp, mk * p)
            gb = clamp((lt - 0.6) / 0.6)
            for k, hv in enumerate((0.35, 0.55, 0.8, 1.0)):
                bh_ = int(h * 0.3 * hv * ease_out(gb))
                x = int(w * 0.62 + k * w * 0.075)
                cv2.rectangle(img, (x, int(h * 0.86) - bh_), (x + int(w * 0.05), int(h * 0.86)), RED if k == 3 else TEAL, -1)
        if text and kind != "invite":
            lab = K.text_sprite(text, hs, NAVY if kind in ("ad", "deck") else WHITE, 700)
            K.blit(img, lab, w - lab.shape[1] / 2 - hs * 0.6, hs * 1.1, 1.0, 0, clamp(lt / 0.2))
        return img

    def carry_cube(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        x0, y0, x1, y1 = L["box"]
        bw, bh = x1 - x0, y1 - y0
        cards = (it.get("cards") or [{"kind": "ad", "text": "פרסומת"}, {"kind": "stop", "text": "ריל שעוצר"}, {"kind": "invite", "text": "הזמנה לאירוע"}, {"kind": "deck", "text": "מצגת"}])
        beats = it["beats_at"] or [it["at"] + 0.3 * k for k in range(1, len(cards) + 1)]
        faces = [lambda lt: f[y0:y1, x0:x1].copy()] + [(lambda lt, c=c: self.card(c.get("kind", "ad"), c.get("text", ""), lt, bw, bh)) for c in cards[:len(beats)]]
        rots = list(beats) + [it["at"] + it["dur"] - 0.35]
        idx, ang = 0, 0.0
        for k, b in enumerate(rots):
            if t >= b:
                idx, ang = k, ease_in_out((t - b) / 0.3)
        nxt = (idx + 1) % len(faces) if idx + 1 < len(rots) + 1 else 0
        if idx + 1 >= len(faces):
            nxt = 0
        cur_face = faces[idx](t - (rots[idx - 1] if idx > 0 else it["at"]))
        out = f.copy()
        out[y0:y1, x0:x1] = (out[y0:y1, x0:x1] * 0.25).astype(np.uint8)
        if ang <= 0.001 or ang >= 0.999:
            face = cur_face if ang < 0.5 else faces[nxt](t - rots[idx])
            out[y0:y1, x0:x1] = face
        else:
            nf = faces[nxt](t - rots[idx])
            th = ang * math.pi / 2
            fl = bw * 3.2
            a = bw / 2
            cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
            def proj(px, pz, py):
                k = fl / (fl + pz)
                return (cx + px * k, cy + py * k)
            def face_pts(rot):
                pts = []
                for (lx, ly) in ((-a, -bh / 2), (a, -bh / 2), (a, bh / 2), (-a, bh / 2)):
                    px = lx * math.cos(rot) + a * math.sin(rot)
                    pz = -lx * math.sin(rot) + a * math.cos(rot) - a
                    pts.append(proj(px, pz, ly))
                return np.float32(pts)
            src = np.float32([[0, 0], [bw, 0], [bw, bh], [0, bh]])
            for img, rot in ((cur_face, -th), (nf, math.pi / 2 - th)):
                if abs(rot) >= math.pi / 2 - 1e-3:
                    continue
                Mp = cv2.getPerspectiveTransform(src, face_pts(rot))
                wp = cv2.warpPerspective(img, Mp, (W, H))
                mk = cv2.warpPerspective(np.ones((bh, bw), np.float32), Mp, (W, H))
                shade = 0.55 + 0.45 * math.cos(rot)
                K.over(out, (wp * shade).astype(np.uint8), mk)
        # while a card is up, the face keeps talking in a round bubble with a teal ring
        if 0 < idx < len(faces) or (idx == 0 and ang > 0.5):
            self.pip(out, L, t)
        return out

    def pip(self, out, L, t):
        bb = L["bbox"]
        S = L["S"]
        if not bb:
            return
        fh = (bb[3] - bb[1])
        cx, cy = (bb[0] + bb[2]) // 2, bb[1] + int(fh * 0.22)
        side = max(40, int(fh * 0.42))
        x0, y0 = max(0, cx - side // 2), max(0, cy - side // 2)
        crop = S[y0:y0 + side, x0:x0 + side]
        if crop.size == 0:
            return
        r = int(W * 0.13)
        crop = cv2.resize(crop, (2 * r, 2 * r))
        m = np.zeros((2 * r, 2 * r), np.uint8)
        cv2.circle(m, (r, r), r - 2, 255, -1, cv2.LINE_AA)
        spr = np.dstack([crop, m])
        x0b, y0b, x1b, y1b = L["box"]
        r = min(r, int((y1b - y0b) * 0.26))
        crop = cv2.resize(S[y0:y0 + side, x0:x0 + side], (2 * r, 2 * r))
        m = np.zeros((2 * r, 2 * r), np.uint8)
        cv2.circle(m, (r, r), r - 2, 255, -1, cv2.LINE_AA)
        spr = np.dstack([crop, m])
        px, py = x1b - r - 28, y1b - r - 28
        K.blit(out, spr, px, py, 1.0, 0, 1.0)
        cv2.circle(out, (int(px), int(py)), r, GLOW, 8, cv2.LINE_AA)

    # ============================================================ 12. money
    def over_money(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        box = L["box"]
        stamps = it.get("stamps") or ["יקר", "איטי"]
        sa = it["strike_at"]
        pos = [((box[0] + box[2]) / 2 - W * 0.17, box[1] + (box[3] - box[1]) * 0.3, -9), ((box[0] + box[2]) / 2 + W * 0.17, box[1] + (box[3] - box[1]) * 0.68, 7)]
        for k, txt in enumerate(stamps[:2]):
            st = it["at"] + 0.5 * k
            lu = t - st
            if lu < 0:
                continue
            key = "stamp_%d_%s" % (k, txt)
            if key not in self._res:
                sp = K.text_sprite(txt, 92, RED, 700, pad=0)
                bw_, bh_ = sp.shape[1] + 80, sp.shape[0] + 56
                bx = K.rrect(bw_, bh_, 18, (0, 0, 0), alpha=0, border=8, border_color=RED)
                inner = K.rrect(bw_ - 28, bh_ - 28, 10, (0, 0, 0), alpha=0, border=3, border_color=RED)
                K.compose(bx, inner, 14, 14)
                K.compose(bx, sp, 40, 28)
                self._res[key] = bx
            spr = self._res[key].copy()
            x, y, ang = pos[k]
            s = 2.6 - 1.6 * ease_out(clamp(lu / 0.12))
            Sig.kick(P, lu - 0.12, 9, 0.07, 22, 40 + k)
            fall = t - (sa + 0.25)
            dy, dr, al = 0.0, 0.0, 1.0
            if t >= sa:
                q = clamp((t - sa - 0.04 * k) / 0.2)
                if q > 0:
                    cv2.line(spr, (14, spr.shape[0] // 2 + 8), (14 + int((spr.shape[1] - 28) * q), spr.shape[0] // 2 - 8), RED + (255,), 12, cv2.LINE_AA)
            if fall > 0:
                dy = 2600 * fall ** 2
                dr = (40 if k else -40) * fall * 3
                al = 1 - clamp((fall - 0.5) / 0.2)
            K.blit(f, spr, x, y + dy, s, ang + dr, al * clamp(lu / 0.03))
        # three tags, then the counter that drops to zero
        tags = it.get("tags") or ["פרומפט 1", "פרומפט 2", "פרומפט 3"]
        for k, tg in enumerate(tags[:3]):
            lu = t - (sa + 0.75 + 0.15 * k)
            if lu < 0:
                continue
            key = "mtag_%d" % k
            if key not in self._res:
                sp = K.text_sprite(tg, 46, WHITE, 700, pad=0)
                pill = K.rrect(sp.shape[1] + 50, sp.shape[0] + 30, 30, TEAL)
                K.compose(pill, sp, 25, 15)
                self._res[key] = pill
            y = box[1] + 90 + k * 0
            x = W / 2 + (k - 1) * W * 0.3
            K.blit(f, self._res[key], x, y, back_out(clamp(lu / 0.25), 2.4), 0, 1.0)
        cu = t - (sa + 1.25)
        if cu >= 0:
            amt = float(it.get("amount", 5000))
            q = clamp(cu / 0.5)
            v = amt * (1 - (1 - (1 - q) ** 3)) if q < 1 else 0.0
            v = amt * (1 - q) ** 3
            zero = q >= 1
            txt = f"{int(round(v)):,} ₪"
            col = WHITE
            sp = K.text_sprite(txt, 110, col, 700, pad=0)
            bxw, bxh = max(560, sp.shape[1] + 120), sp.shape[0] + 80
            bxs = K.rrect(bxw, bxh, 30, GLOW if zero else NAVY, border=4, border_color=WHITE)
            K.compose(bxs, sp, (bxw - sp.shape[1]) // 2, 40)
            cy = (box[1] + box[3]) / 2 + 40
            K.blit(f, bxs, W / 2, cy, back_out(clamp(cu / 0.25), 1.8) * (1 + (0.12 * math.exp(-(cu - 0.5) / 0.1) if zero else 0)), 0, 1.0)
            if zero and it.get("final_tag"):
                lu = cu - 0.5
                sp2 = K.text_sprite(it["final_tag"], 54, NAVY, 700, pad=0)
                pill = K.rrect(sp2.shape[1] + 60, sp2.shape[0] + 34, 34, WHITE)
                K.compose(pill, sp2, 30, 17)
                K.blit(f, pill, W / 2, cy + bxh / 2 + 70, back_out(clamp(lu / 0.25), 2.6), -3, 1.0)
        return f

    # ============================================================ 13. comment and DM
    def over_comment(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        code = it.get("code") or "מדריך"
        box = L["box"]
        p = ease_out(clamp(u / 0.3))
        cw, ch = int(W * 0.84), 150
        card = K.rrect(cw, ch, 40, (255, 255, 255), border=2, border_color=(225, 225, 225))
        bb, S = L["bbox"], L["S"]
        r = 46
        if bb:
            fh = bb[3] - bb[1]
            cx, cy = (bb[0] + bb[2]) // 2, bb[1] + int(fh * 0.22)
            side = max(40, int(fh * 0.42))
            crop = S[max(0, cy - side // 2):max(0, cy - side // 2) + side, max(0, cx - side // 2):max(0, cx - side // 2) + side]
            if crop.size:
                av = cv2.resize(crop, (2 * r, 2 * r))
                m = np.zeros((2 * r, 2 * r), np.uint8)
                cv2.circle(m, (r, r), r - 1, 255, -1, cv2.LINE_AA)
                K.compose(card, np.dstack([av, m]), cw - 2 * r - 28, ch // 2 - r)
        n = int(clamp((u - 0.35) / 0.09, 0, len(code)))
        typed = code[:n]
        if typed:
            sp = K.text_sprite(typed, 56, (20, 20, 20), 700, pad=0)
            K.compose(card, sp, cw - 2 * r - 56 - sp.shape[1], ch // 2 - sp.shape[0] // 2)
            caret_x = cw - 2 * r - 62 - sp.shape[1]
        else:
            caret_x = cw - 2 * r - 56
            sp = K.text_sprite("הוסיפו תגובה…", 44, (150, 150, 150), 400, pad=0)
            K.compose(card, sp, cw - 2 * r - 56 - sp.shape[1], ch // 2 - sp.shape[0] // 2)
        if int(u * 2.4) % 2 == 0 and n < len(code) + 1:
            cv2.line(card, (caret_x, ch // 2 - 30), (caret_x, ch // 2 + 30), (200, 120, 20, 255), 4)
        te = 0.35 + len(code) * 0.09 + 0.15
        send_s = 1 - 0.18 * math.exp(-((u - te) / 0.06) ** 2) if u > te - 0.2 else 1
        btn = K.rrect(92, 92, 46, (235, 150, 20) if u >= te else (200, 200, 200))
        arrow = np.zeros((92, 92, 4), np.uint8)
        cv2.fillPoly(arrow, [np.array([[60, 46], [28, 26], [34, 46], [28, 66]], np.int32)], (255, 255, 255, 255), cv2.LINE_AA)
        K.compose(btn, arrow, 0, 0)
        y = box[3] - ch / 2 - 40 if box[3] < H - 400 else H * 0.7
        K.blit(f, card, W / 2 + (1 - p) * W, y, 1.0, 0, 1.0)
        K.blit(f, btn, W / 2 - cw / 2 + 70 + (1 - p) * W, y, send_s, 0, 1.0)
        if u > te + 0.1:
            if "heart" not in self._res:
                self._res["heart"] = K.heart(110)
            hu = u - te - 0.1
            K.blit(f, self._res["heart"], W / 2 - cw / 2 + 70, y - 120 - 60 * ease_out(hu / 0.6), back_out(clamp(hu / 0.25), 3.0), 0, 1 - clamp((hu - 1.2) / 0.3))
        # the private message notification slides from the top
        nu = u - (te + 0.6)
        if nu > 0:
            q = ease_out(clamp(nu / 0.35)) * (1 - ease_in(clamp((nu - 1.9) / 0.3)))
            nw, nh = int(W * 0.9), 170
            nt = K.rrect(nw, nh, 36, (44, 40, 38), alpha=240)
            lg = K.rrect(110, 110, 26, NAVY)
            lsp = K.text_sprite("K", 70, WHITE, 700, pad=0)
            K.compose(lg, lsp, 55 - lsp.shape[1] // 2, 55 - lsp.shape[0] // 2)
            K.compose(nt, lg, nw - 140, 30)
            hd = K.text_sprite("הודעה חדשה", 34, (180, 180, 180), 400, pad=0)
            K.compose(nt, hd, nw - 170 - hd.shape[1], 30)
            body = it.get("notif") or "שלחתי לך את הקישור"
            bs = K.text_sprite(body[:40], 44, WHITE, 700, pad=0)
            K.compose(nt, bs, max(10, nw - 170 - bs.shape[1]), 86)
            K.blit(f, nt, W / 2, int(H * 0.09) + 30 - (1 - q) * 260, 1.0, 0, clamp(q * 1.5))
        # the call to action grows, beats, and a light sweeps across it
        if self.opening and self.opening.get("cta") and "cta" in self._res:
            pu = u - (te + 0.6)
            if pu > 0:
                pump = 0.18 * ease_out(clamp(pu / 0.25)) + 0.06 * math.sin(pu * 2 * math.pi * 2.2) * (pu < 1.6)
                self.cta_button(f, t, self.opening["cta"], 9.0, P, pump, (pu % 1.0))
        return f

    # ============================================================ 14. hologram
    def scene_hologram(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        x0, y0, x1, y1 = L["box"]
        scan = y0 + (y1 - y0) * ease_in_out(clamp(u / 0.55))
        end = it["dur"] - 0.25
        if u > end:
            return f
        room = np.empty((y1 - y0, x1 - x0, 3), np.uint8)
        room[:] = (26, 16, 4)
        for gx in range(0, x1 - x0, 48):
            cv2.line(room, (gx, 0), (gx, y1 - y0), (90, 70, 10), 1)
        for gy in range(int(u * 30) % 48, y1 - y0, 48):
            cv2.line(room, (0, gy), (x1 - x0, gy), (90, 70, 10), 1)
        S, M = L["S"], L["M"]
        g = cv2.cvtColor(S[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        holo = np.stack([60 + 195 * g, 50 + 205 * g ** 1.2, 0 + 140 * g ** 2.2], -1)
        rows = ((np.arange(y1 - y0) + int(u * 80)) % 6 < 2).astype(np.float32)[:, None, None]
        holo *= (1 - 0.35 * rows)
        fl = 0.86 + 0.14 * K.hash01(int(t * FPS) * 7)
        holo = holo * fl
        holo[..., 0] = np.roll(holo[..., 0], 4, axis=1)
        m = M[y0:y1, x0:x1]
        edges = cv2.Canny((g * 255).astype(np.uint8), 60, 140).astype(np.float32) / 255 * (m > 0.5)
        edges = cv2.GaussianBlur(edges, (0, 0), 2.2) * 2.2
        holo = holo + edges[..., None] * np.array([255, 255, 160], np.float32)
        comp = room.astype(np.float32) * (1 - m[..., None] * 0.85) + holo * (m[..., None] * 0.85)
        comp = np.clip(comp, 0, 255).astype(np.uint8)
        inside = f[y0:y1, x0:x1]
        line_y = int(scan - y0)
        out = inside.copy()
        out[:line_y] = comp[:line_y]
        if u < 0.6:
            cv2.line(out, (0, line_y), (x1 - x0, line_y), (255, 255, 200), 6, cv2.LINE_AA)
            glow = np.zeros(out.shape[:2], np.float32)
            cv2.line(glow, (0, line_y), (x1 - x0, line_y), 1.0, 30)
            glow = cv2.GaussianBlur(glow, (0, 0), 14)
            out = np.clip(out.astype(np.float32) + glow[..., None] * np.array(GLOW, np.float32), 0, 255).astype(np.uint8)
        f[y0:y1, x0:x1] = out
        if abs(u - it["dur"] + 0.25) < 0.2:
            P["flash"] = max(P["flash"], 0.7 * (1 - abs(u - it["dur"] + 0.25) / 0.2))
        return f

    def over_hologram(self, f, t, it, L, P):
        u = t - it["at"]
        ta = it.get("tags_word_at")
        if u < 0 or u > it["dur"] - 0.25 or ta is None or not L["bbox"]:
            return f
        bb = L["bbox"]
        fh = bb[3] - bb[1]
        cx, cy = (bb[0] + bb[2]) / 2, bb[1] + fh * 0.2
        hs = fh * 0.24
        k = ease_out(clamp((t - ta) / 0.3))
        if k > 0:
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                px, py = cx + sx * hs * (1.4 - 0.4 * k), cy + sy * hs * (1.4 - 0.4 * k)
                cv2.line(f, (int(px), int(py)), (int(px - sx * 40), int(py)), (255, 255, 200), 5, cv2.LINE_AA)
                cv2.line(f, (int(px), int(py)), (int(px), int(py - sy * 40)), (255, 255, 200), 5, cv2.LINE_AA)
        tags = it.get("tags") or []
        spots = [(cx + hs * 2.2, cy - hs * 0.5), (cx - hs * 2.2, cy + hs * 0.3), (cx + hs * 2.0, cy + hs * 1.6)]
        for i, tg in enumerate(tags[:3]):
            lu = t - (ta + 0.22 * i)
            if lu < 0:
                continue
            key = "htag_%d" % i
            if key not in self._res:
                sp = K.text_sprite(tg, 40, WHITE, 700, pad=0)
                pill = K.rrect(sp.shape[1] + 44, sp.shape[0] + 26, 24, (80, 60, 8), alpha=225, border=3, border_color=GLOW)
                K.compose(pill, sp, 22, 13)
                self._res[key] = pill
            x, y = spots[i]
            x = clamp(x, self._res[key].shape[1] / 2 + 20, W - self._res[key].shape[1] / 2 - 20)
            K.blit(f, self._res[key], x, y, back_out(clamp(lu / 0.25), 2.6), 0, 1.0)
        return f

    # ============================================================ 15. finale: goal counter, gold stamp, follow button
    def over_goal(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        a, b = float(it.get("from", 0)), float(it.get("to", 10000))
        q = clamp(u / 1.4)
        v = a + (b - a) * (1 - (1 - q) ** 3)
        box = L["box"]
        cy = (box[1] + box[3]) / 2
        txt = f"{int(round(v)):,}"
        sp = K.text_sprite(txt, 170, WHITE, 700, pad=0)
        card = K.rrect(max(sp.shape[1] + 120, 700), sp.shape[0] + 160, 40, NAVY, alpha=235)
        K.compose(card, sp, (card.shape[1] - sp.shape[1]) // 2, 40)
        bw_ = card.shape[1] - 120
        cv2.rectangle(card, (60, card.shape[0] - 70), (60 + bw_, card.shape[0] - 46), (90, 70, 20, 255), -1)
        cv2.rectangle(card, (60 + bw_ - int(bw_ * q), card.shape[0] - 70), (60 + bw_, card.shape[0] - 46), GLOW + (255,), -1)
        K.blit(f, card, W / 2, cy, back_out(clamp(u / 0.3), 1.6), 0, 1 - clamp((u - it["dur"] + 0.25) / 0.25))
        gu = u - 1.4
        if gu >= 0:
            Sig.kick(P, gu, 26, 0.16, 16, 61)
            P["flash"] = max(P["flash"], 0.6 * math.exp(-gu / 0.06))
            rng = np.random.default_rng(5)
            for k in range(140):
                ang = rng.random() * 6.28
                sp_ = 700 + rng.random() * 1400
                x = W / 2 + math.cos(ang) * sp_ * gu
                y = cy + math.sin(ang) * sp_ * gu + 1800 * gu ** 2
                col = [(60, 60, 230), (40, 200, 255), (230, 200, 40), (255, 255, 255), (200, 80, 255)][k % 5]
                rot = gu * 12 + k
                pts = cv2.boxPoints(((x, y), (18, 9), math.degrees(rot))).astype(np.int32)
                cv2.fillPoly(f, [pts], col, cv2.LINE_AA)
        return f

    def over_gold(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        box = L["box"]
        cy = (box[1] + box[3]) / 2
        txt = it.get("text") or "מאושר"
        key = "gold_" + txt
        if key not in self._res:
            sp = K.text_sprite(txt, 96, (30, 60, 110), 700, pad=0)
            d = max(sp.shape[1] + 140, 420)
            st = np.zeros((d, d, 4), np.uint8)
            cv2.circle(st, (d // 2, d // 2), d // 2 - 4, GOLD + (255,), -1, cv2.LINE_AA)
            cv2.circle(st, (d // 2, d // 2), d // 2 - 26, (110, 220, 255, 255), 6, cv2.LINE_AA)
            for k in range(40):
                a0 = k * math.pi / 20
                cv2.line(st, (int(d / 2 + math.cos(a0) * (d / 2 - 16)), int(d / 2 + math.sin(a0) * (d / 2 - 16))), (int(d / 2 + math.cos(a0) * (d / 2 - 4)), int(d / 2 + math.sin(a0) * (d / 2 - 4))), (20, 120, 190, 255), 4, cv2.LINE_AA)
            K.compose(st, sp, (d - sp.shape[1]) // 2, (d - sp.shape[0]) // 2)
            self._res[key] = K.glowed(st, 26, (90, 210, 255), 1.0)
        spr = self._res[key]
        al = 1 - clamp((u - it["dur"] + 0.25) / 0.25)
        rays = np.zeros((H, W), np.float32)
        R_ = int(W * 0.7)
        for k in range(14):
            a0 = u * 0.9 + k * math.pi / 7
            pts = np.array([[W / 2, cy], [W / 2 + math.cos(a0 - 0.08) * R_, cy + math.sin(a0 - 0.08) * R_], [W / 2 + math.cos(a0 + 0.08) * R_, cy + math.sin(a0 + 0.08) * R_]], np.int32)
            cv2.fillPoly(rays, [pts], 1.0, cv2.LINE_AA)
        rays = cv2.GaussianBlur(rays, (0, 0), 6) * 0.35 * clamp(u / 0.2) * al
        np.copyto(f, np.clip(f.astype(np.float32) + rays[..., None] * np.array([120, 210, 255], np.float32), 0, 255).astype(np.uint8))
        s = 2.4 - 1.4 * ease_out(clamp(u / 0.16))
        K.blit(f, spr, W / 2, cy, s, -8, al * clamp(u / 0.04))
        Sig.kick(P, u - 0.16, 14, 0.08, 22, 71)
        rng = np.random.default_rng(9)
        for k in range(46):
            ang = rng.random() * 6.28
            d = (u - 0.16) * (500 + rng.random() * 700)
            if d <= 0:
                continue
            x, y = W / 2 + math.cos(ang) * d, cy + math.sin(ang) * d
            a2 = 1 - clamp((u - 0.16) / 0.9)
            cv2.circle(f, (int(x), int(y)), 4, (160, 240, 255), -1, cv2.LINE_AA) if a2 > 0 else None
        return f

    def over_follow(self, f, t, it, L, P):
        u = t - it["at"]
        if u < 0 or u > it["dur"]:
            return f
        tap = 0.95
        done = u > tap + 0.08
        if "fbtn" not in self._res:
            sp = K.text_sprite("עקוב", 64, WHITE, 700, pad=0)
            b = K.rrect(sp.shape[1] + 150, sp.shape[0] + 56, 50, (235, 140, 30))
            K.compose(b, sp, 75, 28)
            sp2 = K.text_sprite("במעקב", 60, (60, 60, 60), 700, pad=0)
            ck = K.check_mark(64, (60, 60, 60))
            b2 = K.rrect(sp2.shape[1] + 190, sp2.shape[0] + 56, 50, (205, 205, 205))
            K.compose(b2, sp2, 70, 28)
            K.compose(b2, ck, b2.shape[1] - 100, (b2.shape[0] - 64) // 2)
            self._res["fbtn"] = (b, b2)
            self._res["finger"] = K.finger(150)
        b, b2 = self._res["fbtn"]
        y = H * 0.74 + (1 - ease_out(clamp(u / 0.35))) * 500
        press = 1 - 0.1 * math.exp(-((u - tap) / 0.05) ** 2)
        K.blit(f, b2 if done else b, W / 2, y, press * (1 + (0.06 * back_out(clamp((u - tap - 0.08) / 0.2), 3) - 0.06 if done else 0)), 0, 1.0)
        # the finger moves to the button and presses
        p = ease_in_out(clamp((u - 0.35) / 0.55))
        fx, fy = W * 0.86 + (W / 2 + 40 - W * 0.86) * p, H * 0.95 + (y + 36 - H * 0.95) * p
        if u < tap + 0.5:
            K.blit(f, self._res["finger"], fx + 40, fy + 60, press, -18, 1 - clamp((u - tap - 0.3) / 0.2))
        if done:
            if "heart" not in self._res:
                self._res["heart"] = K.heart(110)
            for k in range(7):
                hu = u - tap - 0.1 - 0.08 * k
                if hu < 0:
                    continue
                x = W / 2 + (K.hash01(k + 3) - 0.5) * 360 + 30 * math.sin(hu * 5 + k)
                yy = y - 80 - hu * 520
                K.blit(f, self._res["heart"], x, yy, 0.5 + 0.4 * K.hash01(k), 0, 1 - clamp((hu - 0.8) / 0.4))
        return f

    # ============================================================ 16. VHS rewind tail
    def rewind_frame(self, t: float) -> np.ndarray:
        n_total = int(round(self.R.plan["duration"] * FPS))
        t_last = (n_total - 1) / FPS
        u = clamp((t - self.D0) / max(1e-3, t_last - self.D0))
        s = (self.D0 - 1 / FPS) * (1 - u ** 2)
        self.depth += 1
        try:
            src = self.frame(max(0.0, s)) if u < 1 else self.frame(0.0)
        finally:
            self.depth -= 1
        e = math.sin(math.pi * clamp(u * 1.05)) if u < 0.95 else max(0.0, (1 - u) / 0.05) * math.sin(math.pi * 0.9975)
        if u >= 0.999:
            return src
        f = src.copy()
        rng = np.random.default_rng(int(t * FPS))
        for _ in range(int(3 + 6 * e)):
            y = int(rng.integers(0, H - 60))
            hh = int(rng.integers(8, 70))
            f[y:y + hh] = np.roll(f[y:y + hh], int(rng.integers(-90, 90) * e), axis=1)
        f = K.rgb_split(f, 10 * e)
        f[::3] = (f[::3].astype(np.float32) * (1 - 0.35 * e)).astype(np.uint8)
        noise = rng.normal(0, 18 * e, (H // 4, W // 4)).astype(np.float32)
        f = np.clip(f.astype(np.float32) + cv2.resize(noise, (W, H))[..., None], 0, 255).astype(np.uint8)
        # the big rewind symbol
        a = clamp(e * 1.6)
        if a > 0.02:
            ov = f.copy()
            cx, cy, s2 = W / 2, H * 0.42, 130
            for dx in (-s2 * 0.55, s2 * 0.55):
                pts = np.array([[cx + dx + s2 * 0.6, cy - s2], [cx + dx + s2 * 0.6, cy + s2], [cx + dx - s2 * 0.6, cy]], np.int32)
                cv2.fillPoly(ov, [pts], (255, 255, 255), cv2.LINE_AA)
            cv2.addWeighted(ov, 0.85 * a, f, 1 - 0.85 * a, 0, f)
        return f


def T_w(size, text):
    return K.T.measure(text, size)[0]


# ---------------------------------------------------------------- peeks for the opening: the wildest moments ahead
def plan_peeks(items: list[dict]) -> None:
    op = next((i for i in items if i["kind"] == "opening"), None)
    if not op:
        return
    order = ["shatter", "worlds", "giant", "flip", "hologram", "pixel", "popout", "title3d", "cube", "freeze"]
    wild = sorted([i for i in items if i["kind"] in order and i["at"] > op["at"]], key=lambda i: order.index(i["kind"]))[:3]
    strong = {"shatter": 0.2, "worlds": 0.25, "giant": 0.75, "flip": 0.6, "hologram": 0.9, "pixel": 0.5, "popout": 0.4, "title3d": 0.35, "cube": 0.6, "freeze": 0.3}
    a = op["at"]
    if a < 1.0 or not wild:
        op["peeks"], op["peek_targets"] = [], []
        return
    slots = [a * f for f in (0.3, 0.55, 0.8)][:len(wild)]
    op["peeks"] = [round(s * FPS) / FPS for s in slots]
    op["peek_targets"] = [w["at"] + strong[w["kind"]] for w in wild]


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd")
    sub.add_parser("catalog")
    sub.add_parser("sfx")
    wp = sub.add_parser("worlds")
    wp.add_argument("--out", required=True)
    wp.add_argument("--names", default="space,underwater,city")
    a = ap.parse_args()
    if a.cmd == "catalog":
        print(json.dumps([{"id": i, "he": h, "desc": d, "params": p, "sfx": s} for i, h, d, p, s in CATALOG], ensure_ascii=False, indent=1))
    elif a.cmd == "sfx":
        print(json.dumps(K.synth_all(SFX_DIR), indent=1))
    elif a.cmd == "worlds":
        os.makedirs(a.out, exist_ok=True)
        for n in a.names.split(","):
            if n in K.WORLDS:
                cv2.imwrite(os.path.join(a.out, f"world-{n}.jpg"), K.WORLDS[n]()["img"], [cv2.IMWRITE_JPEG_QUALITY, 90])
        print(a.out)
