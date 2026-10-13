"""Ramchal cottages, Ra'anana: a 30 second magazine reel in the Afik HaNahal palette.
Static frames only (no camera moves), hard cuts on the beat, type that snaps in.
python3 render.py [--preview N]  -> out/ramhal.mp4
"""
import os, sys, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = '/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/images/'
W, H, FPS = 1080, 1920, 30
BPM = 120; BEAT = 60 / BPM
NIGHT, DEEP, CREAM, PERI, GREEN = (9, 9, 15), (14, 14, 28), (232, 228, 216), (132, 144, 216), (130, 246, 127)

def F(w, s): return ImageFont.truetype(os.path.join(HERE, 'fonts', f'Rubik-{w}.ttf'), s)

# ---------- pictures: crop watermarks and clutter, clean grade ----------
def grade(im, lift=1.0, warm_fix=True):
    im = im.convert('RGB')
    a = np.asarray(im).astype(np.float32)
    if warm_fix:  # neutral whites: pull the warm cast of the phone video toward the walls' real white
        m = a.reshape(-1, 3)
        bright = m[m.sum(1) > np.percentile(m.sum(1), 85)]
        g = bright.mean(0); a *= (g.mean() / g)[None, None, :] * .6 + .4
    lo, hi = np.percentile(a, 1.5), np.percentile(a, 99.2)
    a = np.clip((a - lo) / max(1, hi - lo) * 255 * lift, 0, 255)
    im = Image.fromarray(a.astype(np.uint8))
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(.92)
    return im

def cover(im, w, h, fx=.5, fy=.5):
    iw, ih = im.size; s = max(w / iw, h / ih)
    im = im.resize((max(w, round(iw * s)), max(h, round(ih * s))), Image.LANCZOS)
    x = round((im.width - w) * fx); y = round((im.height - h) * fy)
    im = im.crop((x, y, x + w, y + h))
    return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))

def load(name, crop=None, **g):
    im = Image.open(os.path.join(IMG if not name.startswith('st/') else HERE, name)).convert('RGB')
    if crop: im = im.crop(crop)
    return grade(im, **g)

P = {}
def prep():
    P['render'] = load('37.jpg', warm_fix=False)                       # architect's rendering
    P['living'] = load('34.jpg', crop=(0, 60, 1200, 896))              # glass walls, ground floor
    P['open'] = load('36.webp', crop=(0, 80, 1600, 1280))              # living room and stairs, yad2 mark cut away
    P['down'] = load('33.jpg', crop=(0, 40, 1200, 896))                # stairs down to the basement
    P['bed'] = load('35.jpg', crop=(0, 70, 560, 480))                  # bedroom, yad2 mark cut away
    v = lambda n: load('st/' + n, crop=(0, 0, 464, 776))               # InShOt mark cut away
    P['stairs'] = v('v02_600.png'); P['stairs2'] = v('v01_228.png'); P['hall'] = v('v04_813.png')
    P['door'] = v('v06_933.png'); P['win'] = v('v08_1117.png'); P['view'] = load('st/v11_1350.png', crop=(0, 0, 464, 560))

# ---------- type ----------
def text(d, xy, s, font, fill, anchor='ra'):
    d.text(xy, s, font=font, fill=fill, anchor=anchor, direction='rtl' if any('֐' <= c <= '׿' for c in s) else None, features=['-kern'] if False else None)

def ease(t): t = max(0, min(1, t)); return 1 - (1 - t) ** 3

def snap(f, start, dur=6):  # 0..1 over a few frames
    return ease((f - start) / dur)

def layer(base, draw_fn):
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); draw_fn(ImageDraw.Draw(ov)); base.alpha_composite(ov)

def type_in(base, f, s0, lines):
    """lines: [(text, font, color, x, y)] each enters 6 frames after the previous, sliding 36px up"""
    for i, (s, font, col, x, y) in enumerate(lines):
        k = snap(f, s0 + i * 4)
        if k <= 0: continue
        ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
        text(d, (x, y + (1 - k) * 36), s, font, col + (int(255 * k),))
        base.alpha_composite(ov)

def bar(base, f, s0, x1, y, w, col=PERI, h=10):
    k = snap(f, s0, 7); ov = ImageDraw.Draw(base)
    if k > 0: ov.rectangle((x1 - w * k, y, x1, y + h), fill=col)

def tag(base, s, x, y, bg=NIGHT, fg=CREAM, size=34):
    d = ImageDraw.Draw(base); fnt = F(500, size); bw = d.textlength(s, font=fnt, direction='rtl') + 36
    d.rounded_rectangle((x - bw, y, x, y + size + 22), radius=(size + 22) // 2, fill=bg)
    text(d, (x - 18, y + 9), s, fnt, fg)

# ---------- scenes (start beat, beats, painter) ----------
def bg(col=NIGHT): return Image.new('RGBA', (W, H), col + (255,))

def sc_open(f, k):
    im = bg()
    type_in(im, f, 2, [('רעננה.', F(800, 190), CREAM, W - 90, 720)])
    if f >= 30: type_in(im, f, 30, [('רחוב רמח״ל.', F(800, 150), PERI, W - 90, 940)])
    bar(im, f, 10, W - 90, 670, 220, GREEN, 12)
    return im

def full(key, fx=.5, fy=.5, shade=True):
    im = cover(P[key], W, H, fx, fy).convert('RGBA')
    if shade:
        g = Image.new('L', (1, H)); [g.putpixel((0, y), int(255 * min(1, max(0, (y - H * .42) / (H * .38))) ** 1.3 * .94)) for y in range(H)]
        sh = Image.new('RGBA', (W, H), NIGHT + (255,)); sh.putalpha(g.resize((W, H))); im.alpha_composite(sh)
    return im

def sc_hero(f, k):
    im = full('render', .22, .5)
    tag(im, 'הדמיה', W - 60, 70, bg=(9, 9, 15), size=30)
    type_in(im, f, 3, [('קוטג׳ים חדשים', F(800, 128), CREAM, W - 80, 1430), ('למכירה ברמח״ל, רעננה', F(500, 64), GREEN, W - 80, 1600)])
    return im

def stat(num, unit, sub=None, col=CREAM):
    def p(f, k):
        im = bg()
        type_in(im, f, 1, [(num, F(900, 420), col, W - 70, 620)])
        type_in(im, f, 6, [(unit, F(700, 110), PERI, W - 80, 1110)])
        if sub: type_in(im, f, 10, [(sub, F(400, 58), CREAM, W - 80, 1270)])
        bar(im, f, 4, W - 80, 570, 260, GREEN, 12)
        return im
    return p

def photo(key, title, sub=None, fx=.5, fy=.5, chip=None):
    def p(f, k):
        im = full(key, fx, fy)
        if chip: tag(im, chip, W - 60, 70, size=30)
        lines = [(title, F(800, 104), CREAM, W - 80, 1480)]
        if sub: lines.append((sub, F(500, 58), GREEN, W - 80, 1620))
        type_in(im, f, 3, lines)
        return im
    return p

def grid(keys, title, sub=None):
    """magazine grid: the phone frames at their own size (no blur), night paper, cream captions"""
    def p(f, k):
        im = bg(); m = 40; gw = (W - 3 * m) // 2; gh = round(gw * 1.35)
        cells = [(m, 150), (2 * m + gw, 150), (m, 150 + gh + m), (2 * m + gw, 150 + gh + m)][:len(keys)]
        if len(keys) == 2: cells = [(m, 260), (2 * m + gw, 260)]; gh = round(gw * 1.9)
        for i, ((x, y), key) in enumerate(zip(cells, keys)):
            if f < 1 + i * 3: continue
            im.paste(cover(P[key], gw, gh), (x, y))
        yy = cells[-1][1] + gh + 80
        type_in(im, f, 6, [(title, F(800, 92), CREAM, W - 60, yy)] + ([(sub, F(500, 54), GREEN, W - 60, yy + 120)] if sub else []))
        return im
    return p

def checklist(items):
    def p(f, k):
        im = bg(DEEP)
        type_in(im, f, 1, [('בבית', F(500, 60), PERI, W - 90, 560)])
        y = 700
        for i, s in enumerate(items):
            s0 = 6 + i * 7
            if f < s0: break
            d = ImageDraw.Draw(im); kk = snap(f, s0)
            d.rectangle((W - 90 - 18, y + 26, W - 90, y + 44), fill=GREEN)
            type_in(im, f, s0, [(s, F(700, 82), CREAM, W - 130, y)])
            y += 150
        return im
    return p

def sc_ready(f, k):
    im = full('open', .5, .4, shade=False)
    ov = Image.new('RGBA', (W, H), NIGHT + (150,)); im.alpha_composite(ov)
    type_in(im, f, 2, [('מוכן', F(900, 260), CREAM, W - 80, 640), ('לכניסה.', F(900, 260), GREEN, W - 80, 900)])
    return im

LOGO = None
def afik_logo(col, h):
    s = h / 440; img = Image.new('RGBA', (int(460 * s) + 4, int(440 * s) + 4), (0, 0, 0, 0)); d = ImageDraw.Draw(img); lw = max(2, int(11 * s))
    for a, b, c, e in [(182, 46, 52, 308), (182, 46, 312, 308), (272, 46, 272, 308), (404, 46, 404, 308), (118, 191, 404, 191)]:
        d.line((a * s, b * s, c * s, e * s), fill=col, width=lw)
    fnt = ImageFont.truetype(os.path.join(HERE, 'fonts', 'Rubik-300.ttf'), int(20 * s))
    def spaced(y, txt, size, sp):
        f2 = ImageFont.truetype(os.path.join(HERE, 'fonts', 'Rubik-300.ttf' if size < 18 else 'Rubik-300.ttf'), int(size * s))
        tw = sum(d.textlength(ch, font=f2) for ch in txt) + sp * s * (len(txt) - 1); x = 228 * s - tw / 2
        for ch in txt: d.text((x, y * s), ch, font=f2, fill=col); x += d.textlength(ch, font=f2) + sp * s
    spaced(340, 'AFIK HANACHAL', 20, 8); spaced(374, 'REAL ESTATE', 14, 5)
    return img

def sc_end(f, k):
    im = bg()
    if f >= 2:
        lg = afik_logo(CREAM + (255,), 380); im.alpha_composite(lg, ((W - lg.width) // 2, 400))
    type_in(im, f, 8, [('לפרטים ולתיאום ביקור', F(500, 64), PERI, W // 2, 1000)])
    type_in(im, f, 12, [('055-981-1814', F(800, 120), CREAM, W // 2, 1110)])
    type_in(im, f, 16, [('afikhanahal.co.il', F(400, 54), CREAM, W // 2, 1280)])
    type_in(im, f, 20, [('אפיק הנחל · ייזום, שיווק ותיווך', F(500, 46), GREEN, W // 2, 1400)])
    return im

def centered(fn):
    return fn

# fix anchor for centered end card text
_text = text
def text(d, xy, s, font, fill, anchor='ra'):
    a = 'ma' if xy[0] == W // 2 else anchor
    d.text(xy, s, font=font, fill=fill, anchor=a, direction='rtl' if any('֐' <= c <= '׿' for c in s) else None)

# beats: 60 beats = 30 seconds
SCENES = [
    (4, sc_open),
    (5, sc_hero),
    (2, stat('270', 'מ״ר בנוי')),
    (2, stat('250', 'מ״ר מגרש')),
    (4, photo('living', 'תקרות גבוהות', 'והרבה אור טבעי', .5, .5)),
    (3, photo('open', 'סלון פתוח', 'גימור ברמה גבוהה', .55, .5)),
    (2, stat('5', 'חדרים')),
    (2, stat('4', 'חדרי שינה')),
    (4, grid(['stairs', 'hall', 'win', 'door'], 'הקומה העליונה', 'חדרי שינה ומרפסת')),
    (3, photo('bed', 'חדר שינה', None, .5, .5)),
    (3, photo('down', 'מרתף גדול', 'עם ממ״ד ושירותים צמודים', .5, .6)),
    (3, photo('render', 'חניה לשני רכבים', None, .02, .62, chip='הדמיה')),
    (5, checklist(['מיזוג מתקדם', 'מרתף עם ממ״ד', 'חניה לשני רכבים', 'מיקום שקט ומבוקש'])),
    (4, grid(['view', 'stairs2'], 'שקט ומבוקש', 'ליד בתי ספר מובילים ובתי כנסת')),
    (4, sc_ready),
    (6, sc_end),
]

def timeline():
    t = 0; out = []
    for beats, fn in SCENES:
        n = round(beats * BEAT * FPS); out.append((t, n, fn)); t += n
    return out, t

def main():
    prep(); os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    tl, total = timeline()
    total = min(total, 30 * FPS)
    prev = '--preview' in sys.argv
    if prev:
        for i, (s, n, fn) in enumerate(tl):
            if s >= total: break
            fn(n - 1, 1).convert('RGB').resize((360, 640)).save(os.path.join(HERE, 'out', f'pv{i:02d}.png'))
        return
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', os.path.join(HERE, 'out', 'video.mp4')]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    fi = 0
    for s, n, fn in tl:
        for f in range(n):
            if fi >= total: break
            pr.stdin.write(fn(f, f / n).convert('RGB').tobytes()); fi += 1
    pr.stdin.close(); pr.wait()
    with open(os.path.join(HERE, 'out', 'cuts.txt'), 'w') as fh: fh.write('\n'.join(str(s / FPS) for s, n, fn in tl if s < total))
    print('frames', fi)

if __name__ == '__main__':
    main()
