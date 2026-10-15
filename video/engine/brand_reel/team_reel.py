"""Kurkoos Group 9:16 reel: "מה בוחרים קודם? את הצוות." Blueprint sheet look, real site footage, Almoni type, cuts on a 120 BPM grid.
python3 team.py [--preview] -> out/team.mp4 (silent); music is added by mux.sh
"""
import os, sys, subprocess, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = '/home/user/kurkoos-group/public/'
FONTS = '/home/user/kurkoos-group/video/fonts/'
UP = '/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/images/'
W, H, FPS = 1080, 1920, 30
NAVY, TEAL, MIST, PAPER, RED, WHITE = (7, 41, 58), (16, 85, 114), (143, 182, 200), (247, 248, 250), (169, 11, 12), (255, 255, 255)
def F(w, s): return ImageFont.truetype(FONTS + f'Almoni-{w}.ttf', s)
ease = lambda t: 1 - (1 - max(0, min(1, t))) ** 3
RTL = lambda s: 'rtl' if any('֐' <= c <= '׿' for c in s) else None

# ---------- the sheet: navy, a fine blueprint grid, crop marks, the logo ----------
def sheet():
    im = Image.new('RGBA', (W, H), NAVY + (255,)); d = ImageDraw.Draw(im)
    for x in range(0, W, 60): d.line((x, 0, x, H), fill=(143, 182, 200, 18))
    for y in range(0, H, 60): d.line((0, y, W, y), fill=(143, 182, 200, 18))
    for (x, y, sx, sy) in ((40, 40, 1, 1), (W - 40, 40, -1, 1), (40, H - 40, 1, -1), (W - 40, H - 40, -1, -1)):
        d.line((x, y, x + 46 * sx, y), fill=MIST + (150,), width=3); d.line((x, y, x, y + 46 * sy), fill=MIST + (150,), width=3)
    return im
SHEET = sheet()
LOGO = Image.open(os.path.join(HERE, 'logo_h_white.png')).convert('RGBA'); LOGO.thumbnail((330, 90))
LOGO_BIG = Image.open(os.path.join(HERE, 'logo_white.png')).convert('RGBA'); LOGO_BIG.thumbnail((420, 420))
RAITA = Image.open(PUB + 'divisions/raita-logo.webp').convert('RGBA'); RAITA.thumbnail((300, 260))
SHCH = Image.open(PUB + 'divisions/shchinta-logo.webp').convert('RGBA'); SHCH.thumbnail((260, 260))

# ---------- media ----------
cap = cv2.VideoCapture(PUB + 'divisions/kurkoos-showcase.mp4'); VF = cap.get(cv2.CAP_PROP_FPS) or 30
def vframe(t):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * VF)); ok, f = cap.read()
    return Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
def photo(path, crop=None):
    im = Image.open(path).convert('RGB')
    return im.crop(crop) if crop else im
POUR = photo(UP + '38.webp', (300, 505, 1080, 905))            # the pour from the post, without its type
SKETCH = photo(PUB + 'divisions/humash-22-24-sketch.webp')
SITE1 = photo(PUB + 'execution-gallery/1.jpg'); SITE6 = photo(PUB + 'execution-gallery/6.jpg'); FORM = photo(PUB + 'divisions/execution-bg.jpg')

def fit(im, w, h, fx=.5, fy=.5):
    iw, ih = im.size; s = max(w / iw, h / ih); im = im.resize((max(w, round(iw * s)), max(h, round(ih * s))), Image.LANCZOS)
    x = round((im.width - w) * fx); y = round((im.height - h) * fy)
    im = im.crop((x, y, x + w, y + h)).filter(ImageFilter.UnsharpMask(radius=1.4, percent=50, threshold=2))
    return ImageEnhance.Contrast(im).enhance(1.05)

def framed(base, media, y, h, f):
    """the picture sits on the sheet like a plate on a drawing: a thin mist rule and dimension ticks"""
    base.paste(media.convert('RGB'), (0, y))
    d = ImageDraw.Draw(base)
    d.line((0, y - 2, W, y - 2), fill=MIST + (120,), width=2); d.line((0, y + h + 1, W, y + h + 1), fill=MIST + (120,), width=2)
    for x in range(60, W, 120): d.line((x, y + h + 1, x, y + h + 14), fill=MIST + (120,), width=2)

# ---------- type ----------
def words(im, text, font, color, xr, y, f, start, stagger=2, pop=True, anchor='ra'):
    """each word drops in: 18% bigger and transparent, to place in 5 frames"""
    d = ImageDraw.Draw(im); ws = text.split(' '); sp = d.textlength(' ', font=font)
    wd = [d.textlength(w, font=font, direction=RTL(w)) for w in ws]; total = sum(wd) + sp * (len(ws) - 1)
    x = xr if anchor == 'ra' else (W + total) / 2
    for i, (w, ww) in enumerate(zip(ws, wd)):
        k = ease((f - start - i * stagger) / 5)
        if k > 0:
            sc = 1 + (.18 * (1 - k) if pop else 0)
            fnt = font if sc == 1 else ImageFont.truetype(font.path, max(8, int(font.size * sc)))
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            od.text((x - (ww * (sc - 1)) / 2, y - (font.size * (sc - 1)) / 2), w, font=fnt, fill=color + (int(255 * k),), anchor='ra', direction=RTL(w))
            im.alpha_composite(ov)
        x -= ww + sp
    return total

def rule(im, xr, y, w, f, start, col=RED, h=12):
    k = ease((f - start) / 6)
    if k > 0: ImageDraw.Draw(im).rectangle((xr - w * k, y, xr, y + h), fill=col)

def chip(im, s, xr, y, f, start, bg=RED):
    k = ease((f - start) / 5)
    if k <= 0: return
    fnt = F(700, 40); d = ImageDraw.Draw(im); tw = d.textlength(s, font=fnt, direction='rtl')
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov); a = int(255 * k)
    od.rounded_rectangle((xr - tw - 44, y, xr, y + 64), radius=32, fill=bg + (a,))
    od.text((xr - 22, y + 34), s, font=fnt, fill=WHITE + (a,), anchor='rm', direction='rtl'); im.alpha_composite(ov)

def base(f, label=None):
    im = SHEET.copy(); im.alpha_composite(LOGO, (64, 70))
    if label: chip(im, label, W - 64, 76, f, 0)
    return im

# ---------- scenes ----------
MX = W - 80
def media_scene(beats, media_fn, lines, label=None, my=520, mh=900, sub=None):
    n = beats * 15
    def p(f):
        im = base(f, label)
        framed(im, media_fn(f, mh), my, mh, f)
        y = 230
        for i, (t, fnt, col) in enumerate(lines):
            words(im, t, fnt, col, MX, y, f, 2 + i * 5); y += int(fnt.size * 1.08)
        rule(im, MX, my - 40, 200, f, 6)
        if sub: words(im, sub, F(400, 54), MIST, MX, my + mh + 50, f, 8, stagger=1, pop=False)
        return im
    return n, p

def vid(t0, t1, fx=.5):
    def m(f, h):
        t = t0 + (t1 - t0) * min(1, f / 60)                       # footage runs at its own pace
        return fit(vframe(t), W, h, fx)
    return m
def still(img, fx=.5, fy=.5):
    cache = {}
    def m(f, h):
        if h not in cache: cache[h] = fit(img, W, h, fx, fy)
        return cache[h]
    return m

def team_scene(beats, logo, name, verb, media_fn, label):
    n = beats * 15
    def p(f):
        im = base(f, label)
        framed(im, media_fn(f, 960), 760, 960, f)
        k = ease((f - 1) / 6)
        if k > 0:
            lg = logo.copy(); a = lg.split()[3].point(lambda v: int(v * k)); lg.putalpha(a)
            im.alpha_composite(lg, (MX - lg.width, 250 + int((1 - k) * 30)))
        words(im, name, F(700, 150), WHITE, MX - 330, 300, f, 4)
        words(im, verb + '.', F(700, 150), MIST, MX - 330, 470, f, 8)
        rule(im, MX, 690, 200, f, 9)
        return im
    return n, p

def step(beats, num, title, media_fn):
    n = beats * 15
    def p(f):
        im = base(f, 'איך זה עובד')
        framed(im, media_fn(f, 900), 820, 900, f)
        k = ease((f - 1) / 6)
        if k > 0:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
            od.text((MX, 190 + (1 - k) * 40), num, font=F(700, 300), fill=RED + (int(255 * k),), anchor='ra')
            im.alpha_composite(ov)
        y = 520
        for i, t in enumerate(title):
            words(im, t, F(700, 110), WHITE, MX, y, f, 5 + i * 4); y += 122
        return im
    return n, p

def text_scene(beats, lines, label=None, bg=None, media=None):
    n = beats * 15
    back = None
    if media is not None:
        back = fit(media, W, H).filter(ImageFilter.GaussianBlur(6)).convert('RGBA'); back.alpha_composite(Image.new('RGBA', (W, H), NAVY + (215,)))
    def p(f):
        im = base(f, label)
        if back is not None: im = back.copy(); g = SHEET.copy(); g.putalpha(90); im.alpha_composite(g); im.alpha_composite(LOGO, (64, 70))
        y = 640
        for i, (t, fnt, col) in enumerate(lines):
            words(im, t, fnt, col, MX, y, f, 2 + i * 6); y += int(fnt.size * 1.12)
        rule(im, MX, 580, 220, f, 4)
        return im
    return n, p

def end_scene(beats):
    n = beats * 15
    def p(f):
        im = SHEET.copy(); k = ease(f / 8)
        lg = LOGO_BIG.copy(); lg.putalpha(lg.split()[3].point(lambda v: int(v * k))); im.alpha_composite(lg, ((W - lg.width) // 2, 360))
        words(im, 'מקרקע ועד מסירת מפתח.', F(700, 76), WHITE, 0, 900, f, 6, anchor='mm', pop=False)
        k2 = ease((f - 12) / 6)
        if k2 > 0:
            ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov); a = int(255 * k2)
            od.rounded_rectangle((W // 2 - 360, 1040, W // 2 + 360, 1190), radius=75, fill=RED + (a,))
            od.text((W // 2, 1117), '055-981-1814', font=F(700, 96), fill=WHITE + (a,), anchor='mm')
            od.text((W // 2, 1270), 'kurkoos-group.co.il', font=F(400, 56), fill=MIST + (a,), anchor='mm')
            im.alpha_composite(ov)
        return im
    return n, p

B = F(700, 150); B2 = F(700, 120); M = F(400, 70)
PLAN = [
    media_scene(5, still(POUR), [('מה בוחרים', B, WHITE), ('קודם?', B, MIST)], 'לבעלי מגרש', my=600, mh=1040),
    media_scene(2, still(SKETCH, .5, .5), [('לפני תוכנית.', B, WHITE)], my=600, mh=1040),
    media_scene(2, still(POUR, .2), [('לפני יציקה.', B, WHITE)], my=600, mh=1040),
    media_scene(3, vid(2.6, 3.6), [('לפני הזמנת', B, WHITE), ('חומרים.', B, WHITE)], my=600, mh=1040),
    media_scene(5, vid(3.6, 5.2), [('בוחרים מי יחזיק', B2, WHITE), ('את הפרויקט.', B2, MIST)], my=600, mh=1040),
    team_scene(5, RAITA, 'ראיתה', 'בונה', vid(1.0, 2.5), 'אצלנו'),
    team_scene(5, SHCH, 'שכינתא', 'מפקחת', still(SITE6), 'אצלנו'),
    media_scene(5, vid(7.0, 8.9), [('צוות אחד', B, WHITE), ('מהקרקע ועד המפתח.', F(700, 100), MIST)], my=600, mh=1040),
    step(6, '1', ['בדיקה ראשונית', 'של המגרש.'], still(SITE1)),
    step(6, '2', ['ביצוע הבנייה', 'עם ראיתה.'], vid(9.0, 10.2)),
    step(6, '3', ['פיקוח של שכינתא', 'עד המסירה.'], vid(10.2, 11.8)),
    text_scene(5, [('שמרו את הסרטון', B2, WHITE), ('לפני שבוחרים קבלן.', B2, MIST)], media=SITE1),
    text_scene(4, [('שלחו למי', B2, WHITE), ('שיש לו מגרש.', B2, MIST)], media=FORM),
    text_scene(5, [('כתבו "צוות"', B2, WHITE), ('בתגובות', B2, WHITE), ('לשיחת היכרות.', B2, MIST)], media=POUR),
    end_scene(8),
]

def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    total = sum(n for n, _ in PLAN); print('seconds', total / FPS)
    with open(os.path.join(HERE, 'out', 'cuts.txt'), 'w') as fh:
        t = 0
        for n, _ in PLAN: fh.write(f'{t / FPS}\n'); t += n
    if '--preview' in sys.argv:
        for i, (n, p) in enumerate(PLAN): p(n - 3).convert('RGB').resize((360, 640)).save(os.path.join(HERE, 'out', f'pv{i:02d}.png'))
        return
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', os.path.join(HERE, 'out', 'team_v.mp4')]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n, p in PLAN:
        for f in range(n): pr.stdin.write(p(f).convert('RGB').tobytes())
    pr.stdin.close(); pr.wait(); print('done')

if __name__ == '__main__':
    main()
