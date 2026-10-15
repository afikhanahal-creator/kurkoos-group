"""Ramchal cottages, Facebook 4:5, v3: full frame footage, an elevator style floor display (-1 / 0 / +1),
headlines that rise word by word and leave before the cut, counting numbers, icon features, a tour progress line.
python3 fb3.py [--preview] -> out/ramhal_fb3.mp4
"""
import os, sys, subprocess, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import listing_reel as R

W, H, FPS = 1080, 1350, 30
R.W, R.H = W, H
NIGHT, DEEP, CREAM, PERI, GREEN = R.NIGHT, R.DEEP, R.CREAM, R.PERI, R.GREEN
F = R.F
HERE = R.HERE
RTL = lambda s: 'rtl' if any('֐' <= c <= '׿' for c in s) else None
ease = lambda t: 1 - (1 - max(0, min(1, t))) ** 3

# ---------- footage ----------
CAPS = {}
def seg_frame(seg, i):
    key = f"seg2/s_{seg[0]}_{seg[1]}.mp4"
    if key not in CAPS: CAPS[key] = cv2.VideoCapture(os.path.join(HERE, key))
    c = CAPS[key]; nf = int(c.get(cv2.CAP_PROP_FRAME_COUNT))
    c.set(cv2.CAP_PROP_POS_FRAMES, max(0, min(nf - 1, i))); ok, f = c.read()
    return cv2.cvtColor(f, cv2.COLOR_BGR2RGB)

def look(mid):
    a = mid.astype(np.float32); m = a.reshape(-1, 3)
    bright = m[m.sum(1) > np.percentile(m.sum(1), 85)]; g = bright.mean(0); gain = (g.mean() / g) * .65 + .35
    a = a * gain; return gain, np.percentile(a, 1.0), np.percentile(a, 99.4)

def full(rgb, lk, fy=.45):
    gain, lo, hi = lk
    a = np.clip((rgb.astype(np.float32) * gain - lo) / max(1, hi - lo) * 255, 0, 255).astype(np.uint8)
    a = a[:a.shape[0] - 66]                                           # InShOt strip
    h0, w0 = a.shape[:2]; ch = round(w0 * H / W); y = int((h0 - ch) * fy); a = a[y:y + ch]
    return Image.fromarray(a).resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.8, percent=55, threshold=2)).convert('RGBA')

def grad(im, top=.42, strength=.9, top_band=True):
    g = np.zeros((H, 1), np.float32); y = np.arange(H)[:, None] / H
    g = np.clip((y - top) / (1 - top), 0, 1) ** 1.35 * strength
    if top_band: g = np.maximum(g, np.clip((.16 - y) / .16, 0, 1) ** 1.6 * .55)
    a = Image.fromarray((np.repeat(g, W, 1) * 255).astype(np.uint8))
    sh = Image.new('RGBA', (W, H), NIGHT + (255,)); sh.putalpha(a); im.alpha_composite(sh)

# ---------- interface ----------
TOTAL = [1]
def progress(im, gf):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, W, 8), fill=(255, 255, 255, 40))
    x = W - W * gf / TOTAL[0]; d.rectangle((x, 0, W, 8), fill=PERI)       # fills from the right, like the reading direction

FLOORS = {-1: 'מרתף', 0: 'קומת הכניסה', 1: 'קומה עליונה'}
def floor_display(im, fl, f):
    """the elevator display, top right: the three floors, the current one lit"""
    d = ImageDraw.Draw(im); x1 = W - 48; y = 54
    lab = FLOORS[fl]; fl_font = F(800, 64); lab_font = F(500, 40)
    lw = d.textlength(lab, font=lab_font, direction='rtl')
    box_w = 96 + 24 + lw + 36
    d.rounded_rectangle((x1 - box_w, y, x1, y + 96), radius=48, fill=NIGHT + (225,))
    d.rounded_rectangle((x1 - 96, y, x1, y + 96), radius=48, fill=PERI)
    num = {-1: '-1', 0: '0', 1: '+1'}[fl]
    d.text((x1 - 48, y + 50), num, font=fl_font, fill=NIGHT, anchor='mm')
    d.text((x1 - 96 - 22, y + 50), lab, font=lab_font, fill=CREAM, anchor='rm', direction='rtl')
    # the three steps under it: which floor of three
    for k, v in enumerate((1, 0, -1)):
        cx = x1 - 48; cy = y + 128 + k * 26
        d.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=GREEN if v == fl else (232, 228, 216, 90))

def words_in(im, text, font, color, x_right, y, f, start, out_at=None, stagger=3):
    """a headline set right to left, each word rising 40px and fading in; the whole line leaves upward before the cut"""
    d = ImageDraw.Draw(im); ws = text.split(' '); sp = d.textlength(' ', font=font)
    widths = [d.textlength(w, font=font, direction=RTL(w)) for w in ws]
    x = x_right
    out = 1.0
    if out_at is not None and f >= out_at: out = 1 - ease((f - out_at) / 5)
    for i, (w, ww) in enumerate(zip(ws, widths)):
        k = ease((f - start - i * stagger) / 7)
        if k > 0 and out > 0:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            yy = y + (1 - k) * 40 - (1 - out) * 24
            od.text((x, yy), w, font=font, fill=color + (int(255 * k * out),), anchor='ra', direction=RTL(w))
            im.alpha_composite(ov)
        x -= ww + sp
    return x_right - x

def underline(im, x_right, y, w, f, start, out_at=None, col=GREEN):
    k = ease((f - start) / 8); o = 1 - ease((f - out_at) / 5) if out_at is not None and f >= out_at else 1
    if k > 0 and o > 0: ImageDraw.Draw(im).rectangle((x_right - w * k, y, x_right, y + 10), fill=col + (int(255 * o),))

def caption(im, f, n, title, sub=None, eyebrow=None):
    out = n - 7
    x = W - 64; y = H - (300 if sub else 220)
    if eyebrow: words_in(im, eyebrow, F(500, 42), PERI, x, y - 80, f, 1, out)
    words_in(im, title, F(800, 104), CREAM, x, y, f, 3, out)
    tw = ImageDraw.Draw(im).textlength(title, font=F(800, 104), direction='rtl')
    underline(im, x, y + 132, min(tw, 260), f, 8, out)
    if sub: words_in(im, sub, F(500, 54), CREAM, x, y + 166, f, 10, out, stagger=2)

# ---------- scenes ----------
def shot(seg, use, floor, title=None, sub=None, eyebrow=None, fy=.45, strong=False):
    pad = .5 if seg[0] >= .5 else seg[0]
    src = int((use[0] - seg[0] + pad) * 30); n = int((use[1] - use[0]) * 30)
    lk = look(seg_frame(seg, src + n // 2))
    def p(f, gf):
        im = full(seg_frame(seg, src + f), lk, fy); grad(im, .42 if strong else (.5 if title else .7), .96 if strong else (.92 if title else .6))
        floor_display(im, floor, f)
        if title: caption(im, f, n, title, sub, eyebrow)
        progress(im, gf); return im
    return n, p

def still_bg(seg, at, fy=.45, dark=.72, blur=10):
    lk = look(seg_frame(seg, at)); im = full(seg_frame(seg, at), lk, fy).filter(ImageFilter.GaussianBlur(blur))
    ov = Image.new('RGBA', (W, H), NIGHT + (int(255 * dark),)); im.alpha_composite(ov); return im

def facts(seg, at, secs=3.4):
    n = round(secs * FPS); bgim = still_bg(seg, at)
    items = [(270, 'מ״ר בנוי'), (250, 'מ״ר מגרש'), (5, 'חדרים'), (4, 'חדרי שינה')]
    def p(f, gf):
        im = bgim.copy(); out = n - 7
        words_in(im, 'הבית במספרים', F(700, 60), PERI, W - 80, 170, f, 1, out)
        cw, chh = (W - 160 - 40) // 2, 380
        for i, (v, lab) in enumerate(items):
            col = i % 2; row = i // 2
            xr = W - 80 - col * (cw + 40); y0 = 300 + row * (chh + 40)
            k = ease((f - 4 - i * 4) / 8); o = 1 - ease((f - out) / 5) if f >= out else 1
            if k <= 0 or o <= 0: continue
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov); a = int(255 * k * o)
            d.rounded_rectangle((xr - cw, y0 + (1 - k) * 30, xr, y0 + chh + (1 - k) * 30), radius=28, fill=(232, 228, 216, int(22 * k * o)), outline=(132, 144, 216, int(120 * k * o)), width=2)
            cnt = round(v * ease((f - 4 - i * 4) / 18))
            d.text((xr - 40, y0 + 40 + (1 - k) * 30), str(cnt), font=F(900, 190), fill=CREAM + (a,), anchor='ra')
            d.text((xr - 40, y0 + 270 + (1 - k) * 30), lab, font=F(700, 56), fill=GREEN + (a,), anchor='ra', direction='rtl')
            im.alpha_composite(ov)
        progress(im, gf); return im
    return n, p

def icon(d, kind, cx, cy, s, col, a):
    c = col + (a,); lw = max(4, int(s * .09))
    if kind == 'car':
        d.rounded_rectangle((cx - s * .48, cy - s * .08, cx + s * .48, cy + s * .26), radius=int(s * .1), outline=c, width=lw)
        d.line((cx - s * .32, cy - s * .08, cx - s * .2, cy - s * .3, cx + s * .2, cy - s * .3, cx + s * .32, cy - s * .08), fill=c, width=lw, joint='curve')
        for dx in (-.26, .26): d.ellipse((cx + dx * s - s * .1, cy + s * .2, cx + dx * s + s * .1, cy + s * .4), fill=c)
    elif kind == 'ac':
        for ang in (0, 60, 120):
            t = np.radians(ang); dx, dy = np.cos(t) * s * .45, np.sin(t) * s * .45
            d.line((cx - dx, cy - dy, cx + dx, cy + dy), fill=c, width=lw)
    elif kind == 'shield':
        d.polygon([(cx, cy - s * .48), (cx + s * .38, cy - s * .3), (cx + s * .32, cy + s * .18), (cx, cy + s * .48), (cx - s * .32, cy + s * .18), (cx - s * .38, cy - s * .3)], outline=c, width=lw)
    elif kind == 'pin':
        d.ellipse((cx - s * .3, cy - s * .48, cx + s * .3, cy + s * .12), outline=c, width=lw)
        d.polygon([(cx - s * .2, cy + s * .02), (cx + s * .2, cy + s * .02), (cx, cy + s * .48)], fill=c)
        d.ellipse((cx - s * .09, cy - s * .27, cx + s * .09, cy - s * .09), fill=c)

def features(seg, at, secs=4.0):
    n = round(secs * FPS); bgim = still_bg(seg, at)
    rows = [('car', 'חניה לשני רכבים', None), ('ac', 'מיזוג מתקדם', None), ('shield', 'ממ״ד במרתף', 'ושירותים צמודים'), ('pin', 'מיקום שקט ומבוקש', 'ליד בתי ספר ובתי כנסת')]
    def p(f, gf):
        im = bgim.copy(); out = n - 7
        words_in(im, 'מה עוד יש בבית', F(700, 60), PERI, W - 80, 170, f, 1, out)
        for i, (k_, t, s) in enumerate(rows):
            y0 = 300 + i * 230; k = ease((f - 5 - i * 5) / 8); o = 1 - ease((f - out) / 5) if f >= out else 1
            if k <= 0 or o <= 0: continue
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov); a = int(255 * k * o); dy = (1 - k) * 30
            d.rounded_rectangle((W - 80 - 150, y0 + dy, W - 80, y0 + 150 + dy), radius=75, fill=(132, 144, 216, int(255 * k * o)))
            icon(d, k_, W - 80 - 75, y0 + 75 + dy, 96, NIGHT, a)
            d.text((W - 80 - 190, y0 + (24 if s else 48) + dy), t, font=F(800, 66), fill=CREAM + (a,), anchor='ra', direction='rtl')
            if s: d.text((W - 80 - 190, y0 + 104 + dy), s, font=F(500, 44), fill=GREEN + (a,), anchor='ra', direction='rtl')
            im.alpha_composite(ov)
        progress(im, gf); return im
    return n, p

def ready(seg, at, secs=2.0):
    n = round(secs * FPS); bgim = still_bg(seg, at, dark=.55, blur=4)
    def p(f, gf):
        im = bgim.copy()
        words_in(im, 'מוכן', F(900, 250), CREAM, W - 80, 380, f, 1, None)
        words_in(im, 'לכניסה.', F(900, 250), GREEN, W - 80, 650, f, 6, None)
        progress(im, gf); return im
    return n, p

def opener(seg, use, secs=None):
    n_, p_ = shot(seg, use, 0, strong=True)
    def p(f, gf):
        im = p_(f, gf)
        # the hook: what and where, in the first second, over the house itself
        words_in(im, 'רעננה · רחוב רמח״ל', F(700, 50), GREEN, W - 64, H - 420, f, 0, n_ - 7, stagger=2)
        words_in(im, 'קוטג׳ים חדשים', F(900, 122), CREAM, W - 64, H - 340, f, 3, n_ - 7)
        words_in(im, 'למכירה', F(900, 122), CREAM, W - 64, H - 190, f, 7, n_ - 7)
        underline(im, W - 64, H - 50, 260, f, 10, n_ - 7)
        return im
    return n_, p

def end_card(secs=4.0):
    n = round(secs * FPS)
    def p(f, gf):
        im = Image.new('RGBA', (W, H), NIGHT + (255,))
        if f >= 1:
            k = ease(f / 8); lg = R.afik_logo(CREAM + (int(255 * k),), 280); im.alpha_composite(lg, ((W - lg.width) // 2, 170))
        d = ImageDraw.Draw(im)
        k = ease((f - 6) / 8)
        if k > 0:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            od.text((W // 2, 640 + (1 - k) * 30), 'לפרטים ולתיאום ביקור', font=F(500, 58), fill=PERI + (int(255 * k),), anchor='ma', direction='rtl')
            od.rounded_rectangle((W // 2 - 380, 740 + (1 - k) * 30, W // 2 + 380, 900 + (1 - k) * 30), radius=80, fill=GREEN + (int(255 * k),))
            od.text((W // 2, 820 + (1 - k) * 30), '055-981-1814', font=F(800, 100), fill=NIGHT + (int(255 * k),), anchor='mm')
            im.alpha_composite(ov)
        k = ease((f - 12) / 8)
        if k > 0:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            od.text((W // 2, 980), 'afikhanahal.co.il', font=F(400, 52), fill=CREAM + (int(255 * k),), anchor='ma')
            od.text((W // 2, 1080), 'אפיק הנחל · ייזום, שיווק ותיווך', font=F(500, 44), fill=CREAM + (int(170 * k),), anchor='ma', direction='rtl')
            im.alpha_composite(ov)
        progress(im, gf); return im
    return n, p

L = (1.0, 4.0); ST = (5.25, 7.25); UP = (23.75, 24.9); HALL = (27.9, 30.4); B1 = (34.8, 36.6); B2 = (38.8, 40.6); WIN = (40.75, 41.6); AC = (41.75, 42.7); BS1 = (9.75, 12.6); BS2 = (13.75, 16.0)
PLAN = [
    opener(ST, (5.25, 7.75)),
    facts(L, 20),
    shot(L, (1.0, 2.5), 0, 'תקרות גבוהות', 'והרבה אור טבעי'),
    shot(UP, (23.75, 24.9), 1, 'עולים למעלה'),
    shot(HALL, (27.9, 30.4), 1, '4 חדרי שינה', 'גימור ברמה גבוהה'),
    shot(B1, (34.8, 36.6), 1, 'חדרים מוארים'),
    shot(B2, (38.8, 40.6), 1),
    shot(WIN, (40.75, 41.6), 1),
    shot(AC, (41.75, 42.7), 1, 'מיזוג מתקדם'),
    shot(BS1, (9.75, 12.6), -1, 'מרתף גדול', 'עם ממ״ד ושירותים צמודים'),
    shot(BS2, (13.75, 16.0), -1),
    features(BS2, 40),
    ready(L, 80),
    end_card(),
]

def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    total = sum(n for n, _ in PLAN); TOTAL[0] = total; print('seconds', round(total / FPS, 2))
    if '--preview' in sys.argv:
        gf = 0
        for i, (n, p) in enumerate(PLAN):
            for tag, ff in (('a', 6), ('b', min(n - 9, max(14, n // 2)))):
                p(ff, gf + ff).convert('RGB').resize((432, 540)).save(os.path.join(HERE, 'out', f'f3_{i:02d}{tag}.png'))
            gf += n
        return
    out = os.path.join(HERE, 'out', 'ramhal_fb3.mp4')
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE); gf = 0
    for n, p in PLAN:
        for f in range(n): pr.stdin.write(p(f, gf).convert('RGB').tobytes()); gf += 1
    pr.stdin.close(); pr.wait(); print(out)

if __name__ == '__main__':
    main()
