"""Kurkoos logo entrance as a Lottie file, all vector (no image assets).
Motion idea: an established builder. The base line is drawn, the four towers are built on it one after another
(a firm ease-out with a hair of overshoot, no bounce), the name arrives letter by letter, and the two O's slide into
their overlap, which is the logo's own signature. Lettering: outlines of Gelasio, an open font drawn to Georgia's
metrics (the logo file names Georgia, which cannot be embedded)."""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.qu2cuPen import Qu2CuPen

FONT = TTFont(sys.argv[1]); OUT = sys.argv[2]
UPM = FONT['head'].unitsPerEm; CMAP = FONT.getBestCmap(); GS = FONT.getGlyphSet(); HMTX = FONT['hmtx']
K = 3.0; OX, OY = 150 - 14 * K, 56          # logo units (viewBox 14..314 x 0..96) -> a 1200x400 canvas
FR, OP = 60, 170
INK = [0x14 / 255, 0x20 / 255, 0x2b / 255]; RED = [0xa9 / 255, 0x0b / 255, 0x0c / 255]; OCEAN = [0x10 / 255, 0x55 / 255, 0x72 / 255]
X = lambda x: round(x * K + OX, 2); Y = lambda y: round(y * K + OY, 2)

def glyph_contours(ch, size, x0, base):
    """cubic contours of a glyph in canvas units, pen at logo x0, baseline at logo y `base`"""
    rec = DecomposingRecordingPen(GS); GS[CMAP[ord(ch)]].draw(Qu2CuPen(rec, 0.5, all_cubic=True)); sc = size / UPM
    P = lambda p: (X(x0 + p[0] * sc), Y(base - p[1] * sc))
    out = []; cur = None
    for op, a in rec.value:
        if op == 'moveTo': cur = {'v': [P(a[0])], 'i': [(0, 0)], 'o': [(0, 0)]}
        elif op == 'lineTo': cur['v'].append(P(a[0])); cur['i'].append((0, 0)); cur['o'].append((0, 0))
        elif op == 'curveTo':
            c1, c2, p = P(a[0]), P(a[1]), P(a[2]); pv = cur['v'][-1]
            cur['o'][-1] = (round(c1[0] - pv[0], 2), round(c1[1] - pv[1], 2))
            cur['v'].append(p); cur['i'].append((round(c2[0] - p[0], 2), round(c2[1] - p[1], 2))); cur['o'].append((0, 0))
        elif op in ('closePath', 'endPath'):
            if len(cur['v']) > 1 and cur['v'][0] == cur['v'][-1]:      # a closing point that repeats the first
                cur['i'][0] = cur['i'][-1]; cur['v'].pop(); cur['i'].pop(); cur['o'].pop()
            out.append(cur); cur = None
    return out, HMTX[CMAP[ord(ch)]][0] * sc

EASE = {'i': {'x': [0.2], 'y': [1]}, 'o': {'x': [0.3], 'y': [0]}}
def kf(frames):
    """[(t, value), ...] -> animated property"""
    ks = []
    for n, (t, v) in enumerate(frames):
        d = {'t': t, 's': v if isinstance(v, list) else [v]}
        if n < len(frames) - 1: d.update(EASE if isinstance(v, list) and len(v) > 1 else {'i': {'x': [0.2], 'y': [1]}, 'o': {'x': [0.3], 'y': [0]}})
        ks.append(d)
    return {'a': 1, 'k': ks}
st = lambda v: {'a': 0, 'k': v}
def path(c): return {'ty': 'sh', 'ks': st({'i': [list(p) for p in c['i']], 'o': [list(p) for p in c['o']], 'v': [list(p) for p in c['v']], 'c': True})}
def rect_path(x, y, w, h): return {'v': [(X(x), Y(y)), (X(x + w), Y(y)), (X(x + w), Y(y + h)), (X(x), Y(y + h))], 'i': [(0, 0)] * 4, 'o': [(0, 0)] * 4}
layers = []
def layer(name, contours, color, anchor, **ks):
    base = {'o': st(100), 'r': st(0), 'p': st(list(anchor)), 'a': st(list(anchor)), 's': st([100, 100])}; base.update(ks)
    layers.append({'ddd': 0, 'ind': len(layers) + 1, 'ty': 4, 'nm': name, 'sr': 1, 'ao': 0, 'bm': 0, 'ip': 0, 'op': OP, 'st': 0, 'ks': base,
        'shapes': [{'ty': 'gr', 'nm': name, 'it': [path(c) for c in contours] + [{'ty': 'fl', 'c': st(color + [1]), 'o': st(100), 'r': 1},
            {'ty': 'tr', 'p': st([0, 0]), 'a': st([0, 0]), 's': st([100, 100]), 'r': st(0), 'o': st(100)}]}]})

# --- the name, letter by letter (drawn first so later layers sit under them in Lottie's top-first order) ---
letters = []; pen = 86.0
for ch, color, dx in [('K', INK, 0), ('U', INK, 0), ('R', INK, 0), ('K', INK, 0), ('O', RED, 0), ('O', OCEAN, -15), ('S', INK, 2)]:
    pen += dx; cs, adv = glyph_contours(ch, 40, pen, 56); letters.append((ch, color, cs, pen + adv / 2)); pen += adv + 2
T0 = 44
# ocean O above the red O (the logo's order): it is added first
order = [5, 4, 0, 1, 2, 3, 6]
for idx in order:
    ch, color, cs, cx = letters[idx]; a = (X(cx), Y(56)); t = T0 + idx * 4
    slide = 26 if idx == 5 else -26 if idx == 4 else 0         # the two O's start apart and meet
    if slide:
        layer(f'O-{"ocean" if idx == 5 else "red"}', cs, color, a, o=kf([(t, 0), (t + 14, 100)]), p=kf([(t, [a[0] + slide, a[1] + 14]), (t + 16, [a[0] + slide, a[1]]), (t + 30, [a[0] + slide, a[1]]), (t + 56, [a[0], a[1]])]))
    else:
        layer(f'letter-{ch}{idx}', cs, color, a, o=kf([(t, 0), (t + 14, 100)]), p=kf([(t, [a[0], a[1] + 14]), (t + 18, [a[0], a[1]])]))
# --- GROUP: a quiet line, letters fading in with their tracking ---
pen = 88.0
for n, ch in enumerate('GROUP'):
    cs, adv = glyph_contours(ch, 15, pen, 83); a = (X(pen + adv / 2), Y(83)); t = 96 + n * 4
    layer(f'group-{ch}', cs, INK, a, o=kf([(t, 0), (t + 16, 100)]), p=kf([(t, [a[0] - 10, a[1]]), (t + 18, [a[0], a[1]])])); pen += adv + 9
# --- the towers, built on the base one after another ---
for i, (x, y, w, h) in enumerate([(23, 32, 5, 44), (34, 12, 8, 64), (46, 22, 6, 54), (56, 42, 4, 34)]):
    a = (X(x + w / 2), Y(y + h)); t = 10 + i * 7
    layer(f'tower-{i + 1}', [rect_path(x, y, w, h)], INK, a, s=kf([(t, [100, 0]), (t + 24, [100, 106]), (t + 34, [100, 100])]))
# --- the base line, drawn from its start ---
a = (X(20), Y(78.25))
layer('base', [rect_path(20, 77.5, 44, 1.5)], OCEAN, a, s=kf([(0, [0, 100]), (22, [100, 100])]))

json.dump({'v': '5.7.4', 'fr': FR, 'ip': 0, 'op': OP, 'w': 1200, 'h': 400, 'nm': 'Kurkoos Group logo entrance', 'ddd': 0, 'assets': [], 'layers': layers}, open(OUT, 'w'), separators=(',', ':'))
print('layers', len(layers), 'bytes', len(open(OUT).read()))
