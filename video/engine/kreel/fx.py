"""Kurkoos reel effects. Every effect is fx_<type>(im, t, p, ctx) -> im, where t is seconds since the scene started,
p the effect's parameters from project.json and ctx the scene context. All colours are brand names (kit.PALETTE).
Effects never invent facts: text, labels and statuses come from the project file.
"""
import math, random
from PIL import Image, ImageDraw, ImageFilter
from kit import (W, H, FPS, C, F, tx, tlen, wrap, clean, out3, inout, back_out, prog, clamp, layer, image, cover,
                 paste, round_mask, logo, shot_frame, zoom, punch, tint)

REG = {}
def fx(name):
    def deco(fn): REG[name] = fn; return fn
    return deco

def run(im, t, effects, ctx):
    for p in effects:
        fn = REG.get(p['type'])
        if fn is None: raise KeyError(f"unknown effect {p['type']}")
        a = p.get('at', 0); e = p.get('until', 1e9)
        if t < a - 1e-6 or t > e: continue
        im = fn(im, t - a, p, ctx) or im
    return im

def A(k): return int(255 * clamp(k))

@fx('freeze')
def fx_freeze(im, t, p, ctx):
    """freeze frame: the renderer holds the background frame; here only the brief white flash on entry"""
    return im

# ---------------------------------------------------------------- titles and labels
@fx('title')
def fx_title(im, t, p, ctx):
    """lines slide up one after another; optional red bar above. p: lines[[text,size,weight,color]], x, y, anchor, stagger, bar"""
    x = p.get('x', W - 80); y = p.get('y', 1200); anchor = p.get('anchor', 'ra'); st = p.get('stagger', .12)
    if p.get('bar', True):
        k = out3(t / .25); bw = p.get('bar_w', 200)
        d = ImageDraw.Draw(im)
        if anchor == 'ma': d.rectangle((W / 2 - bw / 2 * k, y - 40, W / 2 + bw / 2 * k, y - 28), fill=C('red'))
        else: d.rectangle((x - bw * k, y - 40, x, y - 28), fill=C('red'))
    yy = y
    for i, ln in enumerate(p['lines']):
        s, size = ln[0], ln[1] if len(ln) > 1 else 110
        wt = ln[2] if len(ln) > 2 else 700; col = ln[3] if len(ln) > 3 else 'paper'
        k = out3((t - i * st) / .22)
        if k > 0:
            ov = layer(); d = ImageDraw.Draw(ov)
            tx(d, (x if anchor != 'ma' else W // 2, yy + (1 - k) * 40), s, F(wt, size), C(col, A(k)), anchor)
            im.alpha_composite(ov)
        yy += int(size * 1.12)
    return im

@fx('pill')
def fx_pill(im, t, p, ctx):
    k = back_out(t / .25); size = p.get('size', 46)
    if k <= 0: return im
    s = clean(p['text']); fnt = F(700, size); bw = tlen(s, fnt) + size * 1.1; bh = size * 1.55
    card = Image.new('RGBA', (int(bw) + 2, int(bh) + 2), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, bw, bh), int(bh / 2), fill=C(p.get('bg', 'red')))
    tx(d, (bw - size * .55, size * .26), s, fnt, C(p.get('fg', 'paper')))
    x = p.get('x', W - 80); y = p.get('y', 1100)
    paste(im, card, x - bw / 2, y + bh / 2, shadow=False, scale=max(.01, .6 + .4 * k))
    return im

@fx('chapter')
def fx_chapter(im, t, p, ctx):
    """chapter slam: navy card with a big red number and the chapter line, then it parks as a chip at the top"""
    dur = p.get('dur', .7); num = str(p['num']); s = p['text']
    if t < dur:
        k_in = out3(t / .18); k_out = 1 - inout((t - dur + .2) / .2)
        a = min(k_in, k_out)
        ov = layer(); d = ImageDraw.Draw(ov)
        d.rectangle((0, 0, W, H), fill=C('navy', A(a * .92)))
        for gx in range(0, W, 60): d.line((gx, 0, gx, H), fill=C('teal', A(a * .5)), width=1)
        for gy in range(0, H, 60): d.line((0, gy, W, gy), fill=C('teal', A(a * .5)), width=1)
        sc = .8 + .2 * back_out(t / .3)
        tx(d, (W // 2, 560 - (1 - k_in) * 60), num.zfill(2), F(700, int(420 * sc)), C('red', A(a)), 'ma')
        for i, ln in enumerate(wrap(s, F(700, 92), W - 200)):
            tx(d, (W // 2, 1080 + i * 104 + (1 - out3((t - .08) / .2)) * 40), ln, F(700, 92), C('paper', A(a * out3((t - .08) / .2))), 'ma')
        im.alpha_composite(ov)
    if p.get('keep', True) and t >= dur - .15:
        k = out3((t - dur + .15) / .25)
        fnt = F(700, 44); label = f"{num.zfill(2)}  {clean(p.get('chip', s))}"
        bw = tlen(label, fnt) + 60
        ov = layer(); d = ImageDraw.Draw(ov)
        x2 = W - 60; y = 150 - (1 - k) * 30
        d.rounded_rectangle((x2 - bw, y, x2, y + 74), 37, fill=C('navy', A(k * .92)))
        d.rectangle((x2 - 14, y + 18, x2 - 6, y + 56), fill=C('red', A(k)))
        tx(d, (x2 - 30, y + 14), label, fnt, C('paper', A(k)))
        im.alpha_composite(ov)
    return im

@fx('stamp')
def fx_stamp(im, t, p, ctx):
    k = t / .22
    if k <= 0: return im
    s = clean(p.get('text', 'נבדק')); size = p.get('size', 70); fnt = F(700, size)
    bw = tlen(s, fnt) + 70; bh = size + 50
    card = Image.new('RGBA', (int(bw) + 8, int(bh) + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle((4, 4, bw, bh), 18, outline=C('red'), width=8)
    tx(d, (bw / 2 + 4, 22), s, fnt, C('red'), 'ma')
    sc = 1.9 - .9 * out3(k) if k < 1 else 1.0
    paste(im, card, p.get('x', 760), p.get('y', 760), shadow=False, scale=sc, rot=p.get('rot', -12), alpha=clamp(k * 2))
    return im

# ---------------------------------------------------------------- technical drawing
def _poly_partial(pts, k):
    """points of a polyline drawn to fraction k of its length"""
    if k >= 1: return pts
    L = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]; tot = sum(L) * k; out = [pts[0]]
    for i, l in enumerate(L):
        if tot >= l: out.append(pts[i + 1]); tot -= l
        else:
            a, b = pts[i], pts[i + 1]; r = tot / l if l else 0
            out.append((a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r)); break
    return out

@fx('blueprint')
def fx_blueprint(im, t, p, ctx):
    """technical lines drawn over the picture. p.paths: [[[x,y],...]], p.rects: [[x1,y1,x2,y2]], p.grid: [x1,y1,x2,y2]
    dur: draw time, fade: seconds to fade at 'out' (relative), col"""
    dur = p.get('dur', .8); col = p.get('col', 'mist'); w = p.get('width', 4)
    fade = 1.0
    if 'out' in p: fade = 1 - out3((t - p['out']) / p.get('fade', .4))
    if fade <= 0: return im
    ov = layer(); d = ImageDraw.Draw(ov)
    if 'grid' in p:
        x1, y1, x2, y2 = p['grid']; k = out3(t / dur); step = p.get('step', 60)
        for gx in range(int(x1), int(x2), step): d.line((gx, y1, gx, y1 + (y2 - y1) * k), fill=C(col, A(.28 * fade)), width=1)
        for gy in range(int(y1), int(y2), step): d.line((x1, gy, x1 + (x2 - x1) * k, gy), fill=C(col, A(.28 * fade)), width=1)
    items = [r for r in p.get('rects', [])]
    paths = [list(map(tuple, q)) for q in p.get('paths', [])] + [[(r[0], r[1]), (r[2], r[1]), (r[2], r[3]), (r[0], r[3]), (r[0], r[1])] for r in items]
    for i, q in enumerate(paths):
        k = out3((t - i * p.get('stagger', .08)) / dur)
        if k <= 0: continue
        pts = _poly_partial(q, k)
        if len(pts) > 1:
            d.line(pts, fill=C(col, A(fade)), width=w, joint='curve')
            hx, hy = pts[-1]
            if k < 1: d.ellipse((hx - 9, hy - 9, hx + 9, hy + 9), fill=C('paper', A(fade)))
        for (px, py) in q[:1]: d.ellipse((px - 6, py - 6, px + 6, py + 6), outline=C(col, A(fade)), width=3)
    glow = ov.filter(ImageFilter.GaussianBlur(6)); im.alpha_composite(glow); im.alpha_composite(ov)
    return im

@fx('dims')
def fx_dims(im, t, p, ctx):
    """dimension lines with end ticks and a label: items [{a:[x,y], b:[x,y], label}]"""
    st = p.get('stagger', .18); hold = p.get('hold', 9)
    ov = layer(); d = ImageDraw.Draw(ov)
    for i, it in enumerate(p['items']):
        k = out3((t - i * st) / .3); kout = 1 - out3((t - i * st - hold) / .25)
        a = min(k, kout)
        if a <= 0: continue
        (x1, y1), (x2, y2) = it['a'], it['b']; mx, my = x1 + (x2 - x1) * k, y1 + (y2 - y1) * k
        d.line((x1, y1, mx, my), fill=C('paper', A(a)), width=4)
        ang = math.atan2(y2 - y1, x2 - x1) + math.pi / 2; tl = 18
        for (px, py) in ((x1, y1), (mx, my)):
            d.line((px - tl * math.cos(ang), py - tl * math.sin(ang), px + tl * math.cos(ang), py + tl * math.sin(ang)), fill=C('paper', A(a)), width=4)
        if k > .6:
            s = clean(it['label']); fnt = F(700, 40); bw = tlen(s, fnt) + 34
            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            d.rounded_rectangle((cx - bw / 2, cy - 30, cx + bw / 2, cy + 30), 12, fill=C('navy', A(a * .9)))
            tx(d, (cx, cy - 21), s, fnt, C('paper', A(a)), 'ma')
    im.alpha_composite(ov); return im

def _tick(d, cx, cy, r, k, col, a, w=8):
    pts = [(cx - r * .45, cy + r * .02), (cx - r * .1, cy + r * .36), (cx + r * .5, cy - r * .34)]
    d.line(_poly_partial(pts, k), fill=C(col, a), width=w, joint='curve')

@fx('checks')
def fx_checks(im, t, p, ctx):
    """inspection marks on points: ring expands, then a tick. points [[x,y]], label optional per point"""
    st = p.get('stagger', .22); r = p.get('r', 56)
    ov = layer(); d = ImageDraw.Draw(ov)
    for i, pt in enumerate(p['points']):
        x, y = pt[:2]; lab = pt[2] if len(pt) > 2 else None
        k = (t - i * st) / .3
        if k <= 0: continue
        rr = r * (.5 + .5 * back_out(k))
        d.ellipse((x - rr, y - rr, x + rr, y + rr), outline=C(p.get('col', 'paper')), width=6)
        if k > .1:  # outer pulse
            pk = clamp((k - .1) / 1.2); pr = rr + 40 * pk
            d.ellipse((x - pr, y - pr, x + pr, y + pr), outline=C('mist', A(1 - pk)), width=3)
        if k > .5: _tick(d, x, y, rr, out3((k - .5) / .5), p.get('tick', 'red'), 255)
        if lab and k > .7:
            fnt = F(700, 38); bw = tlen(lab, fnt) + 30; kk = out3((k - .7) / .4)
            d.rounded_rectangle((x - bw / 2, y + rr + 14, x + bw / 2, y + rr + 70), 12, fill=C('navy', A(kk * .92)))
            tx(d, (x, y + rr + 20), lab, fnt, C('paper', A(kk)), 'ma')
    im.alpha_composite(ov); return im

@fx('markers')
def fx_markers(im, t, p, ctx):
    """defect markers for a handover walk: numbered red dots with a label card"""
    st = p.get('stagger', .3)
    ov = layer(); d = ImageDraw.Draw(ov)
    for i, (x, y, lab) in enumerate(p['points']):
        k = (t - i * st) / .25
        if k <= 0: continue
        r = 30 * back_out(k)
        d.ellipse((x - r, y - r, x + r, y + r), fill=C('red'), outline=C('paper'), width=5)
        tx(d, (x, y - 24), str(i + 1), F(700, 40), C('paper'), 'ma')
        if k > .6:
            kk = out3((k - .6) / .4); fnt = F(700, 38); bw = tlen(lab, fnt) + 34
            d.line((x + 30, y, x + 70, y), fill=C('paper', A(kk)), width=3)
            d.rounded_rectangle((x + 70, y - 30, x + 70 + bw, y + 30), 12, fill=C('paper', A(kk)))
            tx(d, (x + 70 + bw / 2, y - 21), lab, fnt, C('navy', A(kk)), 'ma')
    im.alpha_composite(ov); return im

@fx('scan')
def fx_scan(im, t, p, ctx):
    """digital scan line sweeping a region top to bottom"""
    x1, y1, x2, y2 = p.get('rect', [80, 300, W - 80, 1400]); dur = p.get('dur', 1.0)
    k = (t % (dur + .4)) / dur
    if k > 1: return im
    y = y1 + (y2 - y1) * inout(k)
    ov = layer(); d = ImageDraw.Draw(ov)
    for j in range(40): d.line((x1, y - j * 3, x2, y - j * 3), fill=C('mist', A(.012 * (40 - j))), width=3)
    d.line((x1, y, x2, y), fill=C('mist', 230), width=4)
    for (cx, cy) in ((x1, y1), (x2, y1), (x1, y2), (x2, y2)):
        sx = 1 if cx == x1 else -1; sy = 1 if cy == y1 else -1
        d.line((cx, cy, cx + 50 * sx, cy), fill=C('paper', 220), width=5); d.line((cx, cy, cx, cy + 50 * sy), fill=C('paper', 220), width=5)
    im.alpha_composite(ov); return im

# ---------------------------------------------------------------- cards and UI
def _card(w, h, bg='paper', r=26, border=None):
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), r, fill=C(bg), outline=C(border) if border else None, width=3 if border else 0)
    return c, d

def _sticker(src, w):
    """an illustration or photo as a rounded sticker with a paper rim"""
    im = image(src, gr=False); h = round(w * im.height / im.width)
    pic = im.resize((w, h), Image.LANCZOS).convert('RGBA'); pic.putalpha(round_mask(w, h, 28))
    rim = 10; c, d = _card(w + rim * 2, h + rim * 2, 'paper', 36)
    c.alpha_composite(pic, (rim, rim)); return c

_ST = {}
@fx('float')
def fx_float(im, t, p, ctx):
    """illustration sticker that pops in and bobs. p: src, x, y, w, rot, bob, out"""
    k = t / .32
    if k <= 0: return im
    key = (p['src'], p.get('w', 360))
    if key not in _ST: _ST[key] = _sticker(p['src'], p.get('w', 360))
    s = .5 + .5 * back_out(k)
    if 'out' in p:
        ko = clamp((t - p['out']) / .25)
        if ko >= 1: return im
        s *= 1 - .4 * ko
    bob = math.sin(t * 2.2 + p.get('phase', 0)) * p.get('bob', 10)
    paste(im, _ST[key], p.get('x', 300), p.get('y', 500) + bob, scale=s, rot=p.get('rot', 0) * clamp(k))
    return im

@fx('roles')
def fx_roles(im, t, p, ctx):
    """who does what: role cards in a row with an illustration each, joined by a line drawn from card to card"""
    items = p['items']; n = len(items); cw, ch = p.get('w', 300), p.get('h', 380); y = p.get('y', 1180)
    gap = (W - 80 - n * cw) / max(1, n - 1); xs = [W - 40 - cw / 2 - i * (cw + gap) for i in range(n)]
    d0 = ImageDraw.Draw(im)
    k_line = out3((t - .25) / .7)
    if k_line > 0:  # connector behind the cards
        x_from, x_to = xs[0], xs[0] + (xs[-1] - xs[0]) * k_line
        d0.line((x_from, y, x_to, y), fill=C('mist'), width=6)
    for i, it in enumerate(items):
        k = (t - i * p.get('stagger', .14)) / .3
        if k <= 0: continue
        key = ('role', it['img'], cw)
        if key not in _ST:
            c, d = _card(cw, ch, 'paper', 26, None)
            pic = cover(image(it['img'], gr=False), cw - 30, int(ch * .55)).convert('RGBA'); pic.putalpha(round_mask(cw - 30, int(ch * .55), 18))
            c.alpha_composite(pic, (15, 15))
            tx(d, (cw - 22, int(ch * .55) + 34), it['label'], F(700, 46), C('navy'))
            if it.get('sub'):
                for j, ln in enumerate(wrap(it['sub'], F(400, 32), cw - 40)[:2]): tx(d, (cw - 22, int(ch * .55) + 92 + j * 38), ln, F(400, 32), C('muted'))
            d.rectangle((cw - 12, int(ch * .55) + 40, cw - 4, int(ch * .55) + 84), fill=C('red'))
            _ST[key] = c
        paste(im, _ST[key], xs[i], y, scale=.55 + .45 * back_out(k))
    return im

@fx('checklist')
def fx_checklist(im, t, p, ctx):
    """panel with items ticked one after another. p: title, items, x, y, w, stagger"""
    items = p['items']; w = p.get('w', 820); rowh = 92; h = 120 + rowh * len(items)
    x = p.get('x', W / 2); y = p.get('y', 900); st = p.get('stagger', .28)
    k = out3(t / .3)
    if k <= 0: return im
    c, d = _card(w, h, 'paper', 30)
    tx(d, (w - 40, 30), p.get('title', ''), F(700, 54), C('navy'))
    d.rectangle((w - 40 - 120, 98, w - 40, 104), fill=C('red'))
    for i, s in enumerate(items):
        yy = 130 + i * rowh; kk = (t - .25 - i * st) / .25
        d.rounded_rectangle((w - 96, yy + 10, w - 40, yy + 66), 12, outline=C('teal'), width=4, fill=C('ice') if kk > 0 else None)
        if kk > 0: _tick(d, w - 68, yy + 38, 40, out3(kk), 'red', 255, 7)
        tx(d, (w - 120, yy + 14), s, F(700 if kk > 0 else 400, 46), C('navy' if kk > 0 else 'muted'))
    paste(im, c, x, y + (1 - k) * 60, alpha=k)
    return im

@fx('invoice')
def fx_invoice(im, t, p, ctx):
    """partial-invoice review on a tablet: each row gets checked against the work; no amounts are invented,
    rows carry the statuses given in the project file. p: title, rows [[item, status]], stamp_at"""
    rows = p['rows']; w, h = 880, 260 + 104 * len(rows); x = p.get('x', W / 2); y = p.get('y', 820)
    k = out3(t / .3)
    if k <= 0: return im
    tab = Image.new('RGBA', (w + 44, h + 44), (0, 0, 0, 0)); td = ImageDraw.Draw(tab)
    td.rounded_rectangle((0, 0, w + 43, h + 43), 46, fill=C('dark'))
    c, d = _card(w, h, 'white', 26)
    d.rectangle((0, 0, w, 120), fill=C('navy')); tx(d, (w - 36, 34), p.get('title', ''), F(700, 52), C('paper'))
    tx(d, (36, 44), p.get('tag', ''), F(400, 34), C('mist'), 'la')
    for i, (item, status) in enumerate(rows):
        yy = 150 + i * 104; kk = (t - .3 - i * .22) / .25
        d.line((30, yy + 92, w - 30, yy + 92), fill=C('line'), width=2)
        tx(d, (w - 36, yy + 20), item, F(700, 44), C('ink'))
        # progress of the line item as a bar that fills to the status' share
        share = {'בוצע': 1.0, 'בבדיקה': .65, 'לתיקון': .4}.get(status, .8)
        bk = out3(kk) * share
        d.rounded_rectangle((36, yy + 34, 330, yy + 58), 12, fill=C('ice'))
        if bk > 0: d.rounded_rectangle((330 - 294 * bk, yy + 34, 330, yy + 58), 12, fill=C('teal'))
        if kk > .6:
            col = {'בוצע': 'teal', 'בבדיקה': 'blue', 'לתיקון': 'red'}.get(status, 'teal')
            fnt = F(700, 34); bw = tlen(status, fnt) + 30
            d.rounded_rectangle((350, yy + 22, 350 + bw, yy + 70), 22, fill=C(col))
            tx(d, (350 + bw / 2, yy + 28), status, fnt, C('paper'), 'ma')
    tab.alpha_composite(c, (22, 22))
    paste(im, tab, x, y + (1 - k) * 80, alpha=k)
    sa = p.get('stamp_at')
    if sa is not None and t >= sa: fx_stamp(im, t - sa, {'text': p.get('stamp', 'נבדק'), 'x': x - 230, 'y': y + h / 2 - 60, 'rot': -10}, ctx)
    return im

@fx('progress')
def fx_progress(im, t, p, ctx):
    x, y, w = p.get('x', 100), p.get('y', 1500), p.get('w', 880); dur = p.get('dur', 1.2)
    k = out3(t / .25); fk = inout(t / dur)
    ov = layer(); d = ImageDraw.Draw(ov)
    d.rounded_rectangle((x, y, x + w, y + 30), 15, fill=C('navy', A(k * .8)))
    d.rounded_rectangle((x + w - w * fk, y, x + w, y + 30), 15, fill=C('red', A(k)))
    if p.get('label'): tx(d, (x + w, y - 64), p['label'], F(700, 44), C('paper', A(k)))
    im.alpha_composite(ov); return im

@fx('chips')
def fx_chips(im, t, p, ctx):
    """the carousel's chapter list: red number, paper text, one row at a time"""
    x = p.get('x', W - 80); y = p.get('y', 800); st = p.get('stagger', .12); size = p.get('size', 54)
    ov = layer(); d = ImageDraw.Draw(ov)
    if p.get('panel', True):
        k0 = out3(t / .25); n = len(p['items'])
        d.rounded_rectangle((60, y - 40, W - 60, y + n * int(size * 1.5) + 20), 30, fill=C('navy', A(k0 * .88)))
    for i, (num, s) in enumerate(p['items']):
        k = out3((t - .1 - i * st) / .22)
        if k <= 0: continue
        yy = y + i * int(size * 1.5) + (1 - k) * 30
        tx(d, (x - 40, yy), num, F(700, size), C('red', A(k)))
        tx(d, (x - 150, yy), s, F(700, size), C('paper', A(k)))
    im.alpha_composite(ov); return im

def _icon(d, kind, cx, cy, r, col, a):
    c = C(col, a); w = 6
    if kind == 'measure':
        d.rectangle((cx - r * .7, cy - r * .22, cx + r * .7, cy + r * .22), outline=c, width=w)
        for j in range(7): xx = cx - r * .55 + j * r * .18; d.line((xx, cy - r * .22, xx, cy - r * (.02 if j % 2 else .1)), fill=c, width=4)
    elif kind == 'doc':
        d.rectangle((cx - r * .45, cy - r * .6, cx + r * .45, cy + r * .6), outline=c, width=w)
        for j in range(3): d.line((cx - r * .28, cy - r * .3 + j * r * .3, cx + r * .28, cy - r * .3 + j * r * .3), fill=c, width=5)
    elif kind == 'check':
        d.rectangle((cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55), outline=c, width=w); _tick(d, cx, cy, r * .9, 1, col, a, 6)
    elif kind == 'camera':
        d.rounded_rectangle((cx - r * .65, cy - r * .4, cx + r * .65, cy + r * .5), 10, outline=c, width=w)
        d.ellipse((cx - r * .25, cy - r * .2, cx + r * .25, cy + r * .3), outline=c, width=w)
    elif kind == 'helmet':
        d.chord((cx - r * .6, cy - r * .55, cx + r * .6, cy + r * .6), 180, 360, outline=c, width=w); d.line((cx - r * .75, cy + r * .05, cx + r * .75, cy + r * .05), fill=c, width=w)

@fx('icons')
def fx_icons(im, t, p, ctx):
    """small line icons in navy discs: measure, doc, check, camera, helmet"""
    st = p.get('stagger', .12); r = p.get('r', 58)
    ov = layer(); d = ImageDraw.Draw(ov)
    for i, it in enumerate(p['items']):
        k = (t - i * st) / .28
        if k <= 0: continue
        x, y = it['x'], it['y'] + math.sin(t * 2 + i) * 6; rr = r * back_out(k)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=C('navy', 230), outline=C('mist'), width=4)
        if k > .4: _icon(d, it['kind'], x, y, rr * .62, 'paper', 255)
    im.alpha_composite(ov); return im

# ---------------------------------------------------------------- the inside-the-chat effect
def _chat_box(w, prompt, n_chars, cursor_on, send_k):
    fnt = F(400, 44); lines = wrap(prompt, fnt, w - 190); vis, left = [], n_chars
    for ln in lines:
        if left <= 0: break
        vis.append(ln[:left]); left -= len(ln) + 1
    h = max(220, 90 + 58 * max(1, len(lines)) + 40)
    c, d = _card(w, h, 'white', 40, 'line')
    y = 50
    for i, ln in enumerate(vis): tx(d, (w - 50, y + i * 58), ln, fnt, C('ink'))
    if cursor_on:
        last = vis[-1] if vis else ''; cx = w - 50 - tlen(last, fnt) - 8; cy = y + (len(vis) - 1 if vis else 0) * 58
        d.rectangle((cx - 4, cy + 4, cx, cy + 52), fill=C('teal'))
    # send button (bottom-left), bounces when the prompt is done
    s = 1 + .18 * math.sin(math.pi * clamp(send_k)) if 0 < send_k < 1 else 1
    r = 38 * s; bx, by = 70, h - 62
    d.ellipse((bx - r, by - r, bx + r, by + r), fill=C('red'))
    d.line((bx + 12, by + 2, bx - 14, by + 2), fill=C('paper'), width=6); d.line((bx - 14, by + 2, bx - 2, by - 12), fill=C('paper'), width=6); d.line((bx - 14, by + 2, bx - 2, by + 16), fill=C('paper'), width=6)
    return c

def _chat_answer(w, t, thumb, total):
    h = 520; c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    lg = logo(64, 'black'); c.alpha_composite(lg, (w - lg.width - 10, 0))
    for j, full in enumerate((.78, .56)):
        k = out3((t - .05 - j * .08) / .35)
        d.rounded_rectangle((w - 120 - (w - 160) * full * k, 22 + j * 46, w - 120, 46 + j * 46), 12, fill=C('line'))
    k = out3((t - .2) / .3)
    if k > 0:
        ch = 300; cc, cd = _card(w - 20, ch, 'navy', 30)
        tw = 210; pic = cover(image(thumb, gr=False), tw, ch - 40).convert('RGBA'); pic.putalpha(round_mask(tw, ch - 40, 18))
        flick = .85 + .15 * abs(math.sin(t * 18)) if t < total - .2 else 1
        pic.putalpha(pic.split()[3].point(lambda v: int(v * flick)))
        cc.alpha_composite(pic, (w - 20 - tw - 20, 20))
        tx(cd, (w - 20 - tw - 50, 40), 'הריל בעריכה', F(700, 44), C('paper'))
        tx(cd, (w - 20 - tw - 50, 100), 'קבוצת קורקוס · פיקוח בנייה', F(400, 32), C('mist'))
        pk = clamp(t / max(.1, total - .05))
        cd.rounded_rectangle((40, ch - 70, w - 20 - tw - 50, ch - 44), 13, fill=C('teal'))
        x2 = w - 20 - tw - 50; cd.rounded_rectangle((x2 - (x2 - 40) * pk, ch - 70, x2, ch - 44), 13, fill=C('red'))
        c.alpha_composite(cc.copy(), (10, int(120 + (1 - k) * 40)))
    return c

@fx('chat')
def fx_chat(im, t, p, ctx):
    """Inside the chat, ~1.5 s. 1) the frame shrinks to a rounded card at the bottom (60% of the width) while a paper
    circle grows behind it (0.35 s); 2) a white chat box types the prompt right to left with a cursor and the send
    button bounces; 3) the answer opens: logo, two grey lines stretching, a dark card with a thumbnail and a progress
    bar that fills to the end; 4) on exit the card grows back to the full frame."""
    T = p.get('dur', 1.5); base = im.copy()
    t_shr, t_type, t_ans, t_exit = .0, .3, .85, T - .25
    k_in = inout(t / .35); k_out = inout((t - t_exit) / .25)
    s = 1 - .4 * k_in + .4 * k_out                    # card scale: 1 -> .6 -> 1
    cw, chh = round(W * s), round(H * s)
    cx = W / 2; cy = H / 2 + (H * .27) * (k_in - k_out)     # parks low on the screen
    bg = Image.new('RGBA', (W, H), C('navy'))
    ov = layer(); d = ImageDraw.Draw(ov)
    R = math.hypot(W, H) * inout(t / .35) * (1 - k_out)    # clip-path: circle growing behind the card
    if R > 1: d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=C('paper'))
    bg.alpha_composite(ov)
    card = base.resize((cw, chh), Image.BICUBIC); card.putalpha(round_mask(cw, chh, round(60 * (1 - k_out) + 1)))
    if k_out < 1:
        paste(bg, card, cx, cy, shadow=s < .98)
    else:
        bg = base
    if t >= t_type - .05 and t < t_exit + .2:
        a = 1 - k_out; prompt = clean(p['prompt'])
        n = int(len(prompt) * clamp((t - t_type) / max(.1, t_ans - t_type - .1)))
        box = _chat_box(940, prompt, n, (int(t * 8) % 2 == 0) or n < len(prompt), (t - t_ans + .12) / .2)
        paste(bg, box, W / 2, 120 + box.height / 2 + (1 - out3((t - t_type + .05) / .2)) * 40, alpha=a * out3((t - t_type + .05) / .15))
        if t >= t_ans:
            ans = _chat_answer(940, t - t_ans, p['thumb'], t_exit - t_ans)
            bg.alpha_composite(Image.eval(ans, lambda v: v) if a >= 1 else _fade(ans, a), (70, 120 + box.height + 40))
    return bg

def _fade(c, a):
    c = c.copy(); c.putalpha(c.split()[3].point(lambda v: int(v * a))); return c

# ---------------------------------------------------------------- end card
@fx('endcard')
def fx_endcard(im, t, p, ctx):
    if p.get('blur'):  # a blurred photo under the tint has texture, so the navy never bands into blotches
        k0 = out3(t / .4); b = im.resize((W // 6, H // 6), Image.BILINEAR).filter(ImageFilter.GaussianBlur(p['blur'])).resize((W, H), Image.BILINEAR)
        im = Image.blend(im, b, k0)
    tint(im, 'navy', int(p.get('tint', 225) * out3(t / .3)))
    k = out3(t / .35)
    lg = logo(round(260 * (.9 + .1 * k))); lg = _fade(lg, k); im.alpha_composite(lg, ((W - lg.width) // 2, 300))
    ov = layer(); d = ImageDraw.Draw(ov); y = 720
    for i, (s, size, wt, col) in enumerate(p['lines']):
        kk = out3((t - .15 - i * .1) / .25)
        if kk > 0: tx(d, (W // 2, y + (1 - kk) * 30), s, F(wt, size), C(col, A(kk)), 'ma')
        y += int(size * 1.35)
    im.alpha_composite(ov); return im

# ---------------------------------------------------------------- clearer, slower effects (v2)
@fx('callout')
def fx_callout(im, t, p, ctx):
    """points at a real thing in the shot: a pulsing ring on the point, a line drawn to a large label card.
    p: x, y (the point), lx, ly (label centre), text, sub (optional), col"""
    x, y = p['x'], p['y']; lx, ly = p.get('lx', x), p.get('ly', y - 260)
    ov = layer(); d = ImageDraw.Draw(ov)
    k0 = back_out(t / .3)
    if k0 <= 0: return im
    r = 26 * k0; pul = (t % 1.2) / 1.2
    d.ellipse((x - r, y - r, x + r, y + r), fill=C('red'), outline=C('paper'), width=6)
    pr = r + 50 * pul; d.ellipse((x - pr, y - pr, x + pr, y + pr), outline=C('paper', A(1 - pul)), width=4)
    kl = out3((t - .15) / .35)
    if kl > 0:
        ex, ey = x + (lx - x) * kl, y + (ly - y) * kl
        d.line((x, y, ex, ey), fill=C('paper'), width=6)
    im.alpha_composite(ov)
    kc = out3((t - .4) / .3)
    if kc > 0:
        fnt = F(700, p.get('size', 62)); s = clean(p['text']); bw = tlen(s, fnt) + 70
        sub = p.get('sub'); bh = 110 + (60 if sub else 0)
        c, cd = _card(int(bw if not sub else max(bw, tlen(sub, F(400, 42)) + 70)), bh, 'paper', 24)
        cw = c.width
        cd.rectangle((cw - 14, 22, cw - 4, 88), fill=C('red'))
        tx(cd, (cw - 34, 18), s, fnt, C('navy'))
        if sub: tx(cd, (cw - 34, 104), sub, F(400, 42), C('teal'))
        paste(im, c, lx, ly, scale=.7 + .3 * kc, alpha=kc)
    return im

@fx('chapcard')
def fx_chapcard(im, t, p, ctx):
    """full chapter card that holds while the chapter is named: navy sheet with a drawing grid, the number large in red,
    the chapter line and a short subtitle. It covers the picture and fades out at 'out' (seconds)"""
    out_at = p.get('out', 2.4)
    a = min(out3(t / .35), 1 - out3((t - out_at) / .35))
    if a <= 0: return im
    ov = layer(); d = ImageDraw.Draw(ov)
    d.rectangle((0, 0, W, H), fill=C('navy', A(a)))
    for gx in range(0, W, 54): d.line((gx, 0, gx, H), fill=C('teal', A(a * .35)), width=1)
    for gy in range(0, H, 54): d.line((0, gy, W, gy), fill=C('teal', A(a * .35)), width=1)
    k1 = out3((t - .05) / .45)
    tx(d, (W // 2, 430 + (1 - k1) * 80), str(p['num']).zfill(2), F(700, 470), C('red', A(a * k1)), 'ma')
    k2 = out3((t - .3) / .4)
    for i, ln in enumerate(wrap(p['text'], F(700, 104), W - 160)):
        tx(d, (W // 2, 1000 + i * 118 + (1 - k2) * 40), ln, F(700, 104), C('paper', A(a * k2)), 'ma')
    if p.get('sub'):
        k3 = out3((t - .6) / .4)
        for i, ln in enumerate(wrap(p['sub'], F(400, 58), W - 200)):
            tx(d, (W // 2, 1290 + i * 72), ln, F(400, 58), C('mist', A(a * k3)), 'ma')
    k4 = out3((t - .2) / .5); bw = 260 * k4
    d.rectangle((W / 2 - bw / 2, 950, W / 2 + bw / 2, 964), fill=C('red', A(a)))
    im.alpha_composite(ov); return im

@fx('lower')
def fx_lower(im, t, p, ctx):
    """the chapter bar that stays on screen through the chapter: number and name, top right"""
    k = out3(t / .35)
    fnt = F(700, 50); s = clean(p['text']); num = str(p['num']).zfill(2)
    bw = tlen(s, fnt) + 170
    ov = layer(); d = ImageDraw.Draw(ov); x2 = W - 50; y = 150 - (1 - k) * 40
    d.rounded_rectangle((x2 - bw, y, x2, y + 92), 46, fill=C('navy', A(k * .94)))
    d.ellipse((x2 - 84, y + 10, x2 - 12, y + 82), fill=C('red', A(k)))
    tx(d, (x2 - 48, y + 14), num, F(700, 50), C('paper', A(k)), 'ma')
    tx(d, (x2 - 104, y + 16), s, fnt, C('paper', A(k)))
    im.alpha_composite(ov); return im

@fx('quote')
def fx_quote(im, t, p, ctx):
    """a centred statement on a navy slab, one line after another"""
    lines = p['lines']; size = p.get('size', 92); y = p.get('y', 1080)
    k = out3(t / .4)
    if k <= 0: return im
    h = len(lines) * int(size * 1.2) + 120
    ov = layer(); d = ImageDraw.Draw(ov)
    d.rounded_rectangle((70, y - 60, W - 70, y - 60 + h), 34, fill=C('navy', A(k * .9)))
    d.rectangle((W - 70 - 16, y - 20, W - 70, y + 70), fill=C('red', A(k)))
    for i, s in enumerate(lines):
        kk = out3((t - .2 - i * p.get('stagger', .5)) / .35)
        tx(d, (W - 130, y + i * int(size * 1.2) + (1 - kk) * 30), s, F(700, size), C('paper' if i % 2 == 0 else 'mist', A(kk)))
    im.alpha_composite(ov); return im

# ---------------------------------------------------------------- zoom out to an app window (v4)
@fx('zoomout')
def fx_zoomout(im, t, p, ctx):
    """placeholder in the scene pass: the zoom out works on the finished frame (captions and titles included),
    so render.frame() applies zoom_window() after the captions"""
    return im

_STEP_FONT = None
def zoom_window(im, t, p):
    """"התרחקות", about two seconds or more. 1) the whole frame shrinks to 52% with rounded corners (70 px) and a
    shadow, so it reads as an app window (0.6 s, power3.inOut); 2) a top bar on the window: three dots (red, yellow,
    green) and the logo; 3) a side panel (title + 5 steps) marks its steps one after another: pending ring, spinner,
    red check; 4) at 'back' (seconds from the start) everything returns to full screen (0.5 s, power3.inOut).
    p: title, steps [..5], back, scale (.52), side ('right' panel on the reading side)."""
    back = p.get('back', 2.0); s_min = p.get('scale', .52)
    k_in = inout(t / .6); k_out = inout((t - back) / .5)
    k = k_in * (1 - k_out)                                   # 0 full frame -> 1 window
    if k <= 0.001: return im
    base = im.convert('RGBA')
    # backdrop: the same frame, blurred and darkened (smooth, no gradient banding)
    small = base.resize((W // 8, H // 8), Image.BILINEAR).filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.BILINEAR)
    bg = small.copy(); tint(bg, 'navy', int(185 * k))
    s = 1 - (1 - s_min) * k
    ww, wh = round(W * s), round(H * s)
    # the window sits on the left, the panel on the right (Hebrew reading side)
    cx = W / 2 - (W / 2 - 40 - W * s_min / 2) * k; cy = H / 2 + 30 * k
    bar_h = round(64 * k)
    win = base.resize((ww, wh), Image.BICUBIC)
    r = max(1, round(70 * k * s / s_min * s_min))  # 70 px corners at the window size
    full = Image.new('RGBA', (ww, wh + bar_h), (0, 0, 0, 0))
    if bar_h > 2:
        bar = Image.new('RGBA', (ww, bar_h + r), C('navy'))
        bd = ImageDraw.Draw(bar)
        dr = round(11 * k) + 1
        for i, col in enumerate(('#ff5f57', '#febc2e', '#28c840')):
            x = 34 + i * 34; y = bar_h // 2
            bd.ellipse((x - dr, y - dr, x + dr, y + dr), fill=C(col))
        lg = logo(max(8, round(40 * k)))
        bar.alpha_composite(lg, (ww - lg.width - 28, max(0, (bar_h - lg.height) // 2)))
        full.alpha_composite(bar, (0, 0))
    full.alpha_composite(win, (0, bar_h))
    full.putalpha(Image.composite(full.split()[3], Image.new('L', full.size, 0), round_mask(full.width, full.height, r)))
    out = bg
    paste(out, full, cx, cy, shadow=k > .05)
    # side panel
    steps = p.get('steps', []); title = p.get('title', '')
    pk = out3((t - .35) / .35) * (1 - k_out)
    if pk > 0 and steps:
        pw = W - round(cx + W * s_min / 2) - 60; px2 = W - 30
        rows = len(steps); row_h = 118; ph = 150 + rows * row_h
        py = round(cy - ph / 2 + (1 - pk) * 50)
        ov = layer(); d = ImageDraw.Draw(ov)
        d.rounded_rectangle((px2 - pw, py, px2, py + ph), 36, fill=C('white', A(pk * .97)))
        tx(d, (px2 - 34, py + 40), title, F(700, 46), C('navy', A(pk)))
        d.rectangle((px2 - 34 - 90, py + 104, px2 - 34, py + 110), fill=C('red', A(pk)))
        t0 = .75; span = max(.4, back - t0 - .25); per = span / rows
        for i, lab in enumerate(steps):
            y = py + 150 + i * row_h; rx = px2 - 64; ry = y + 34
            ts = t - t0 - i * per                       # this step's own clock
            done = ts > per * .8; run = 0 <= ts <= per * .8
            col = 'ink' if (done or run) else 'muted'
            if done:
                kk = back_out(clamp((ts - per * .8) / .25))
                rr = 24 * kk; d.ellipse((rx - rr, ry - rr, rx + rr, ry + rr), fill=C('red', A(pk)))
                if kk > .5:
                    d.line((rx - 11, ry + 1, rx - 3, ry + 9), fill=C('white', A(pk)), width=5); d.line((rx - 3, ry + 9, rx + 12, ry - 8), fill=C('white', A(pk)), width=5)
            elif run:
                d.ellipse((rx - 22, ry - 22, rx + 22, ry + 22), outline=C('line', A(pk)), width=5)
                a0 = (ts * 540) % 360; d.arc((rx - 22, ry - 22, rx + 22, ry + 22), a0, a0 + 100, fill=C('red', A(pk)), width=5)
            else:
                for q in range(0, 360, 40): d.arc((rx - 20, ry - 20, rx + 20, ry + 20), q, q + 20, fill=C('muted', A(pk * .7)), width=3)
            for j, ln in enumerate(wrap(lab, F(700 if (done or run) else 400, 40), pw - 130)[:2]):
                tx(d, (rx - 44, y + 12 + j * 46), ln, F(700 if (done or run) else 400, 40), C(col, A(pk)))
        out.alpha_composite(ov)
    return out
