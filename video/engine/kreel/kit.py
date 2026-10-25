"""Kurkoos reel kit: brand, type, media and captions shared by every effect and every project.

Brand values come from src/styles/tokens.css (the site's single source of truth). Nothing here invents a colour.
Type is Almoni (300/400/700). Hebrew is shaped with raqm (RTL), Almoni has no gershayim glyph so ״ is written as ".
"""
import os, math, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
W, H, FPS = 1080, 1920, 30

# ---------------- brand (src/styles/tokens.css) ----------------
def hex2(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
PALETTE = {
    'navy': hex2('#07293a'),     # --color-primary-900
    'teal': hex2('#105572'),     # --color-primary-700
    'blue': hex2('#16688c'),     # --color-primary-500
    'mist': hex2('#8fb6c8'),     # --color-primary-300
    'ice': hex2('#e7eef1'),      # --color-primary-100
    'red': hex2('#a90b0c'),      # --color-accent-500
    'paper': hex2('#f7f8fa'),    # --color-bg
    'white': hex2('#ffffff'),    # --color-surface
    'line': hex2('#e2e6ec'),     # --color-border
    'ink': hex2('#1a1f2b'),      # --color-text
    'muted': hex2('#58606e'),    # --color-text-muted
    'dark': hex2('#07222e'),     # --color-bg-dark
}
def C(name, a=None):
    """colour by brand name, or a hex string; optional alpha 0..255"""
    c = PALETTE.get(name) if isinstance(name, str) and not name.startswith('#') else (hex2(name) if isinstance(name, str) else tuple(name))
    return c + (int(a),) if a is not None else c

FONT_DIR = os.path.join(ROOT, 'video', 'videos', 'szold-ground', 'assets', 'fonts')
_FC = {}
def F(weight, size):
    k = (weight, size)
    if k not in _FC: _FC[k] = ImageFont.truetype(os.path.join(FONT_DIR, f'Almoni-{int(weight)}.ttf'), int(size))
    return _FC[k]

def heb(s): return any('֐' <= c <= '׿' for c in str(s))
def clean(s): return str(s).replace('״', '"').replace('׳', "'")

def tx(d, xy, s, font, fill, anchor='ra'):
    s = clean(s)
    d.text(xy, s, font=font, fill=fill, anchor=anchor, direction='rtl' if heb(s) else None)

def tlen(s, font):
    s = clean(s); return ImageDraw.Draw(Image.new('L', (4, 4))).textlength(s, font=font, direction='rtl' if heb(s) else None)

def wrap(s, font, maxw):
    words = clean(s).split(); lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if tlen(t, font) <= maxw or not cur: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

# ---------------- easing ----------------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def out3(t): t = clamp(t); return 1 - (1 - t) ** 3
def inout(t): t = clamp(t); return 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2
def back_out(t, s=1.7): t = clamp(t) - 1; return 1 + (s + 1) * t ** 3 + s * t ** 2
def prog(t, a, d): return clamp((t - a) / max(1e-6, d))

# ---------------- media ----------------
def resolve(src):
    if os.path.isabs(src): return src
    for base in (os.getcwd(), ROOT):
        p = os.path.join(base, src)
        if os.path.exists(p): return p
    return os.path.join(ROOT, src)

def grade(im, warm_fix=False):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    if warm_fix:
        m = a.reshape(-1, 3); br = m[m.sum(1) > np.percentile(m.sum(1), 85)]
        g = br.mean(0); a *= (g.mean() / g)[None, None, :] * .55 + .45
    lo, hi = np.percentile(a, 1.0), np.percentile(a, 99.4)
    a = np.clip((a - lo) / max(1, hi - lo) * 255, 0, 255)
    im = Image.fromarray(a.astype(np.uint8))
    return ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(.96)).enhance(1.04)

def cover(im, w, h, fx=.5, fy=.5, z=1.0):
    iw, ih = im.size; s = max(w / iw, h / ih) * z
    nw, nh = max(w, round(iw * s)), max(h, round(ih * s))
    im = im.resize((nw, nh), Image.BICUBIC)
    x = round((nw - w) * fx); y = round((nh - h) * fy)
    return im.crop((x, y, x + w, y + h))

_IMG = {}
def image(src, gr=True):
    k = (src, gr)
    if k not in _IMG:
        im = Image.open(resolve(src)).convert('RGB')
        _IMG[k] = grade(im) if gr else im
    return _IMG[k]

class Video:
    """sequential frame reader for one shot (src from t0, dur seconds), scaled to cover W x H"""
    _cache = {}
    @classmethod
    def get(cls, src, t0, dur, fx=.5, fy=.5, speed=1.0, frame=False, pan=None):
        k = (src, t0, dur, fx, fy, speed, frame, tuple(pan) if pan else None)
        if k not in cls._cache: cls._cache[k] = cls(src, t0, dur, fx, fy, speed, frame, pan)
        return cls._cache[k]
    @classmethod
    def drop(cls, keep=()):
        for k in list(cls._cache):
            if k not in keep: cls._cache.pop(k).close()
    def __init__(self, src, t0, dur, fx, fy, speed=1.0, frame=False, pan=None):
        self.src, self.t0, self.dur, self.fx, self.fy = resolve(src), t0, dur, fx, fy
        self.speed, self.fit, self.pan = speed, frame, pan
        self.i, self.last, self.p = -1, None, None
        # a shot longer than its clip holds the clip's last frame (the slow push keeps it moving)
        d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', self.src],
                                 capture_output=True, text=True).stdout or 0)
        self.nmax = max(0, int((d - t0) / speed * FPS) - 2)
    def _open(self, start_frame=0):
        self.close()
        sp = f'setpts=PTS/{self.speed},' if self.speed != 1 else ''
        if self.pan:  # a vertical crop out of landscape footage that travels from pan[0] to pan[1] (0 = left, 1 = right)
            a, b = self.pan; Dd = max(.1, self.dur)
            vf = (f"{sp}fps={FPS},crop=ih*9/16:ih:x='(iw-ow)*({a}+({b}-{a})*min(1,(t+{start_frame / FPS})/{Dd}))':y=0,"
                  f"scale={W}:{H}:flags=lanczos,unsharp=5:5:0.8:5:5:0,eq=contrast=1.05:saturation=1.05")
        elif self.fit:  # keep the whole landscape frame: W wide, its own height, the backdrop is made in shot_frame
            vf = f'{sp}fps={FPS},scale={W}:-2:flags=lanczos'
        else:
            vf = f'{sp}fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}:(iw-{W})*{self.fx}:(ih-{H})*{self.fy}'
        if self.fit and not self.pan:
            iw, ih = map(int, subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', self.src], capture_output=True, text=True).stdout.strip().split(',')[:2])
            self.fw, self.fh = W, int(round(ih * W / iw / 2) * 2)
        else: self.fw, self.fh = W, H
        self.p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(self.t0 + start_frame / FPS * self.speed), '-i', self.src, '-t', str(self.dur * self.speed + .5),
                                   '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
        self.i = start_frame - 1
    def frame(self, f):
        f = max(0, min(f, self.nmax))
        if self.last is not None and f <= self.i and f == self.nmax: return self.last
        if self.p is None or f < self.i or f > self.i + 45: self._open(f)
        while self.i < f:
            sz = self.fw * self.fh * 3; raw = self.p.stdout.read(sz)
            if len(raw) < sz: break
            self.last = Image.frombytes('RGB', (self.fw, self.fh), raw); self.i += 1
        return self.last if self.last is not None else Image.new('RGB', (W, H), C('navy'))
    def close(self):
        if self.p: self.p.kill(); self.p = None

def shot_frame(sh, f, n):
    """one background frame for a shot: photo with a slow push, or a video frame"""
    src = sh['src']; fx, fy = sh.get('fx', .5), sh.get('fy', .5)
    k = f / max(1, n)
    if src.lower().endswith(('.mp4', '.mov', '.webm', '.m4v')):
        fit = sh.get('fit') == 'frame'
        im = Video.get(src, sh.get('t0', 0), sh.get('dur', n / FPS), fx, fy, sh.get('speed', 1.0), fit and not sh.get('pan'), sh.get('pan')).frame(f)
        if sh.get('pan'): fit = False
        if fit: return framed(im, k, sh)
        z = 1 + sh.get('push', .06) * k
        if z > 1.001: im = cover(im, W, H, .5, .5, z)
        return im.convert('RGBA')
    if sh.get('fit') == 'frame':
        return framed(image(src, sh.get('grade', True)), k, sh)
    z0 = sh.get('zoom', 1.0); push = sh.get('push', .06)
    return cover(image(src, sh.get('grade', True)), W, H, fx, fy, z0 + push * k).convert('RGBA')

def framed(im, k, sh):
    """a landscape picture inside a 9:16 frame: the picture W wide with rounded corners and a soft shadow, over a blurred,
    darkened copy of itself. sh.y: centre of the frame (default 760), push: slow zoom inside the frame"""
    im = im.convert('RGB'); fw = W - 2 * sh.get('margin', 0); fh = round(im.height * fw / im.width)
    if sh.get('aspect'): fh = round(fw / sh['aspect'])
    inner = cover(im, fw, fh, sh.get('fx', .5), sh.get('fy', .5), 1 + sh.get('push', .05) * k)
    bg = cover(im.resize((im.width // 8, im.height // 8)), W, H, .5, .5, 1.1).filter(ImageFilter.GaussianBlur(14)).convert('RGBA')
    tint(bg, 'navy', 150)
    cy = sh.get('y', 760); x = (W - fw) // 2; y = int(cy - fh / 2)
    card = inner.convert('RGBA')
    if sh.get('margin', 0): card.putalpha(round_mask(fw, fh, 28))
    sh_, (ox, oy) = drop_shadow(card, 22, .45, (0, 18)); bg.alpha_composite(sh_, (x + ox, y + oy)); bg.alpha_composite(card, (x, y))
    return bg

LOGO = {}
def logo(h, kind='white'):
    k = (h, kind)
    if k not in LOGO:
        im = Image.open(os.path.join(ROOT, 'video', 'assets', f'logo-{kind}.png')).convert('RGBA')
        LOGO[k] = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    return LOGO[k]

# ---------------- layers ----------------
def layer(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))

def shade(im, bottom=.55, strength=.9, top=0.0, col='navy'):
    g = np.linspace(0, 1, H)
    a = np.clip((g - bottom) / max(1e-6, 1 - bottom), 0, 1) ** 1.2 * strength
    if top: a = np.maximum(a, np.clip((top - g) / top, 0, 1) ** 1.4 * .7)
    m = Image.fromarray((a * 255).astype(np.uint8)[:, None].repeat(W, 1), 'L')
    ov = Image.new('RGBA', (W, H), C(col, 255)); ov.putalpha(m); im.alpha_composite(ov)

def tint(im, col='navy', a=110): im.alpha_composite(Image.new('RGBA', (W, H), C(col, a)))

def punch(im, f, frames=4, amt=.05):
    if f >= frames or f < 0: return im
    z = 1 + amt * (1 - f / frames) ** 2
    big = im.resize((round(W * z), round(H * z)), Image.BICUBIC)
    x = (big.width - W) // 2; y = (big.height - H) // 2
    return big.crop((x, y, x + W, y + H))

def zoom(im, z, cx=.5, cy=.5):
    if abs(z - 1) < 1e-4: return im
    big = im.resize((round(W * z), round(H * z)), Image.BICUBIC)
    x = round((big.width - W) * cx); y = round((big.height - H) * cy)
    return big.crop((x, y, x + W, y + H))

def round_mask(w, h, r):
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); return m

def drop_shadow(card, blur=18, alpha=.35, off=(0, 16)):
    a = card.split()[3].point(lambda v: v * alpha)
    sh = Image.new('RGBA', (card.width + blur * 4, card.height + blur * 4), (0, 0, 0, 0))
    sa = Image.new('L', sh.size, 0); sa.paste(a, (blur * 2, blur * 2))
    sh.putalpha(sa.filter(ImageFilter.GaussianBlur(blur)))
    return sh, (off[0] - blur * 2, off[1] - blur * 2)

def paste(im, card, x, y, shadow=True, scale=1.0, rot=0.0, alpha=1.0):
    """composite a card with its centre at x,y"""
    if scale != 1.0: card = card.resize((max(1, round(card.width * scale)), max(1, round(card.height * scale))), Image.BICUBIC)
    if rot: card = card.rotate(rot, Image.BICUBIC, expand=True)
    if alpha < 1: card = card.copy(); card.putalpha(card.split()[3].point(lambda v: int(v * alpha)))
    if shadow:
        sh, (ox, oy) = drop_shadow(card)
        im.alpha_composite(sh, (round(x - card.width / 2 + ox), round(y - card.height / 2 + oy)))
    im.alpha_composite(card, (round(x - card.width / 2), round(y - card.height / 2)))

# ---------------- captions ----------------
def caption_chunks(lines, maxw=W - 220, size=58):
    """split each voiceover line into readable chunks, timed by their share of the words"""
    out = []; fnt = F(700, size)
    for ln in lines:
        a, b, s = ln['start'], ln['end'], clean(ln['text'])
        words = s.split()
        groups, cur = [], []
        for w in words:
            t = ' '.join(cur + [w])
            if cur and (tlen(t, fnt) > maxw or len(cur) >= 6): groups.append(cur); cur = [w]
            else: cur.append(w)
        if cur: groups.append(cur)
        tot = sum(len(g) for g in groups); t = a
        for g in groups:
            d = (b - a) * len(g) / tot
            out.append({'start': round(t, 3), 'end': round(t + d, 3), 'text': ' '.join(g)}); t += d
    return out

def draw_caption(im, chunks, t, style=None):
    style = style or {}
    for c in chunks:
        if c['start'] <= t < c['end']:
            fnt = F(700, style.get('size', 58)); k = out3((t - c['start']) * FPS / 4)
            ov = layer(); d = ImageDraw.Draw(ov); y = style.get('y', 1690)
            tw = tlen(c['text'], fnt); x1, x2 = (W - tw) / 2 - 34, (W + tw) / 2 + 34
            d.rounded_rectangle((x1, y, x2, y + 92), 18, fill=C(style.get('bg', 'paper'), int(242 * k)))
            d.rectangle((x2 - 10, y + 18, x2, y + 74), fill=C('red', int(255 * k)))
            tx(d, (W // 2, y + 14), c['text'], fnt, C(style.get('fg', 'navy'), int(255 * k)), 'ma')
            im.alpha_composite(ov)
            return

def srt(chunks, path):
    def ts(x):
        h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
        return f'{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}'
    with open(path, 'w', encoding='utf-8') as fh:
        for i, c in enumerate(chunks, 1):
            fh.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n‫{c['text']}‬\n\n")
