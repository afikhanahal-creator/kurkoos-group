# דירת גן 250 מ"ר: מודל Blender במידות אמיתיות (מטרים).
# הרצה: python build_apartment.py <תיקיית פלט>   (עם המודול bpy של Blender 4.2)
#
# מערכת צירים בנתונים: x = מזרח, z = דרום (צפון = -z), h = גובה. ב-Blender: X = x, Y = -z, Z = h.
# רצפת קומת הכניסה h=0, רצפת המרתף h=-4.10. תקרה 3.80, ו-3.40 מתחת להנמכות הגבס.
import math
import sys
import os
import json
import bpy

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else '.'
os.makedirs(OUT, exist_ok=True)

GY, BY = 0.0, -4.10
for _ob in list(bpy.data.objects):          # מחיקת הקובייה, המצלמה והאור של סצנת ברירת המחדל
    bpy.data.objects.remove(_ob, do_unlink=True)
NET, GROSS, SLAB = 3.40, 3.80, 0.30
R = (GY - BY) / 22                      # רום מדרגה

# ------------------------------------------------------------------ חומרים
MATS = {}


def principled(name, color, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if 'transmission' in kw:
        b.inputs['Transmission Weight'].default_value = kw['transmission']
        b.inputs['IOR'].default_value = 1.5
    if 'emission' in kw:
        b.inputs['Emission Color'].default_value = (*kw['emission'], 1)
        b.inputs['Emission Strength'].default_value = kw.get('estr', 5)
    MATS[name] = m
    return m


def tiled(name, c1, c2, grout, rough, tile=1.2, mortar=0.003, offset=0.0, vein=0.08, row=None):
    """אריח פורצלן (או קרש) בגודל אמיתי, בקואורדינטות עולם."""
    m = principled(name, c1, rough)
    nt = m.node_tree
    n = nt.nodes
    tc = n.new('ShaderNodeTexCoord')
    br = n.new('ShaderNodeTexBrick')
    br.offset = offset
    br.squash = 1.0
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Brick Width'].default_value = tile
    br.inputs['Row Height'].default_value = row or tile
    br.inputs['Mortar Size'].default_value = mortar
    br.inputs['Mortar Smooth'].default_value = 0.2
    br.inputs['Bias'].default_value = 0.0
    br.inputs['Color1'].default_value = (*c1, 1)
    br.inputs['Color2'].default_value = (*c2, 1)
    br.inputs['Mortar'].default_value = (*grout, 1)
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 2.5
    nz.inputs['Detail'].default_value = 10
    nz.inputs['Distortion'].default_value = 0.6
    mix = n.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = vein
    nt.links.new(tc.outputs['Object'], br.inputs['Vector'])
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(br.outputs['Color'], mix.inputs['A'])
    nt.links.new(nz.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], n['Principled BSDF'].inputs['Base Color'])
    return m


def grass(name):
    m = principled(name, (0.16, 0.30, 0.09), 0.95)
    nt = m.node_tree
    n = nt.nodes
    tc = n.new('ShaderNodeTexCoord')
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 18
    nz.inputs['Detail'].default_value = 12
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.10, 0.22, 0.06, 1)
    ramp.color_ramp.elements[1].color = (0.30, 0.46, 0.15, 1)
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], n['Principled BSDF'].inputs['Base Color'])
    return m


principled('paint', (0.90, 0.89, 0.86), 0.9)
principled('cut', (0.035, 0.035, 0.04), 0.9)
principled('facade', (0.80, 0.76, 0.69), 0.85)
principled('concrete', (0.55, 0.53, 0.50), 0.9)
principled('gypsum', (0.93, 0.93, 0.92), 0.95)
tiled('p_living', (0.86, 0.84, 0.80), (0.83, 0.81, 0.77), (0.70, 0.68, 0.64), 0.12, vein=0.10)
tiled('p_bedroom', (0.66, 0.57, 0.46), (0.63, 0.54, 0.43), (0.52, 0.45, 0.37), 0.45, vein=0.12)
tiled('p_bath', (0.30, 0.29, 0.28), (0.27, 0.26, 0.25), (0.20, 0.20, 0.19), 0.25, vein=0.18)
tiled('p_bathwall', (0.82, 0.80, 0.76), (0.79, 0.77, 0.73), (0.68, 0.66, 0.62), 0.2, vein=0.10)
tiled('p_basement', (0.55, 0.54, 0.51), (0.52, 0.51, 0.48), (0.42, 0.41, 0.39), 0.4, vein=0.2)
tiled('p_outdoor', (0.50, 0.48, 0.44), (0.47, 0.45, 0.41), (0.36, 0.34, 0.31), 0.8, tile=0.6, vein=0.2)
tiled('deck', (0.38, 0.21, 0.11), (0.33, 0.18, 0.09), (0.06, 0.04, 0.03), 0.7, tile=1.8, row=0.145, mortar=0.006, offset=0.5, vein=0.25)
grass('grass')
principled('gravel', (0.42, 0.40, 0.37), 1.0)
principled('glass', (0.85, 0.93, 0.94), 0.0, transmission=1.0)
principled('frame', (0.04, 0.04, 0.045), 0.35, 0.6)
principled('trim', (0.92, 0.92, 0.90), 0.4)
principled('leaf_door', (0.90, 0.89, 0.86), 0.4)
principled('entry', (0.16, 0.11, 0.08), 0.5)
principled('steel', (0.45, 0.47, 0.49), 0.4, 0.8)
principled('oak', (0.55, 0.39, 0.23), 0.55)
principled('walnut', (0.22, 0.14, 0.09), 0.5)
principled('lacquer', (0.90, 0.90, 0.88), 0.3)
principled('quartz', (0.90, 0.89, 0.87), 0.15)
principled('darkstone', (0.10, 0.10, 0.10), 0.25)
principled('black', (0.03, 0.03, 0.035), 0.35, 0.7)
principled('chrome', (0.85, 0.85, 0.85), 0.1, 1.0)
principled('ceramic', (0.95, 0.95, 0.94), 0.1)
principled('mirror', (0.9, 0.9, 0.9), 0.02, 1.0)
principled('linen', (0.92, 0.90, 0.86), 1.0)
principled('duvet', (0.80, 0.76, 0.69), 1.0)
principled('headboard', (0.55, 0.48, 0.40), 1.0)
principled('fabric', (0.72, 0.69, 0.64), 1.0)
principled('fabric_dark', (0.20, 0.21, 0.23), 1.0)
principled('sage', (0.40, 0.47, 0.36), 1.0)
principled('terracotta', (0.62, 0.32, 0.22), 1.0)
principled('rug', (0.70, 0.65, 0.56), 1.0)
principled('rug_dark', (0.35, 0.33, 0.30), 1.0)
principled('leaf', (0.12, 0.26, 0.08), 0.8)
principled('olive', (0.32, 0.38, 0.22), 0.8)
principled('trunk', (0.28, 0.19, 0.12), 1.0)
principled('pot', (0.72, 0.68, 0.62), 0.8)
principled('screen', (0.01, 0.01, 0.012), 0.15)
principled('teak', (0.45, 0.28, 0.15), 0.6)
principled('cushion', (0.86, 0.83, 0.76), 1.0)
principled('kids1', (0.85, 0.62, 0.22), 0.8)
principled('kids2', (0.35, 0.58, 0.72), 0.8)
principled('kids3', (0.78, 0.40, 0.33), 0.8)
principled('soil', (0.25, 0.18, 0.12), 1.0)
principled('light', (1, 0.95, 0.85), 0.5, emission=(1, 0.93, 0.8), estr=8)
MLIST = list(MATS.keys())
MI = {k: i for i, k in enumerate(MLIST)}

# ------------------------------------------------------------------ איסוף גאומטריה לדליים (אובייקט אחד לכל קבוצה)
BUCKETS = {}


def bucket(name):
    if name not in BUCKETS:
        BUCKETS[name] = {'v': [], 'f': [], 'm': []}
    return BUCKETS[name]


def W(x, z, h):          # נתונים -> Blender
    return (x, -z, h)


def _box_faces(o):
    # סדר פינות: 0..3 תחתון, 4..7 עליון (x1z1, x2z1, x2z2, x1z2)
    return [
        ([o + 0, o + 3, o + 2, o + 1], 'bottom'), ([o + 4, o + 5, o + 6, o + 7], 'top'),
        ([o + 0, o + 1, o + 5, o + 4], 'n'), ([o + 2, o + 3, o + 7, o + 6], 's'),
        ([o + 1, o + 2, o + 6, o + 5], 'e'), ([o + 3, o + 0, o + 4, o + 7], 'w'),
    ]


def box(bk, x1, x2, z1, z2, h1, h2, mat, faces=None):
    """קופסה מיושרת לצירים. faces: חומר שונה לפאה מסוימת (top/n/s/e/w)."""
    if x2 - x1 < 1e-5 or z2 - z1 < 1e-5 or h2 - h1 < 1e-5:
        return
    b = bucket(bk)
    o = len(b['v'])
    for h in (h1, h2):
        for (x, z) in ((x1, z1), (x2, z1), (x2, z2), (x1, z2)):
            b['v'].append(W(x, z, h))
    for f, side in _box_faces(o):
        b['f'].append(f)
        b['m'].append(MI[(faces or {}).get(side, mat)])


class Local:
    """רהיט במערכת מקומית: החזית לכיוון +z (דרום), מסובב בזווית rot סביב הציר האנכי."""

    def __init__(self, bk, ox, oz, oh, rot=0.0):
        self.bk, self.ox, self.oz, self.oh = bk, ox, oz, oh
        self.c, self.s = math.cos(rot), math.sin(rot)

    def p(self, x, z, h):
        # rot חיובי מסובב את +z לכיוון +x (כמו בסיור)
        wx = self.ox + x * self.c + z * self.s
        wz = self.oz - x * self.s + z * self.c
        return W(wx, wz, self.oh + h)

    def box(self, w, h, d, x, y, z, mat):
        b = bucket(self.bk)
        o = len(b['v'])
        for hh in (y - h / 2, y + h / 2):
            for (xx, zz) in ((x - w / 2, z - d / 2), (x + w / 2, z - d / 2), (x + w / 2, z + d / 2), (x - w / 2, z + d / 2)):
                b['v'].append(self.p(xx, zz, hh))
        for f, _ in _box_faces(o):
            b['f'].append(f)
            b['m'].append(MI[mat])

    def cyl(self, r1, r2, h, x, y, z, mat, n=24, sz=1.0):
        b = bucket(self.bk)
        o = len(b['v'])
        for hh, rr in ((y - h / 2, r2), (y + h / 2, r1)):
            for i in range(n):
                a = 2 * math.pi * i / n
                b['v'].append(self.p(x + rr * math.cos(a), z + rr * math.sin(a) * sz, hh))
        b['f'].append(list(range(o + n - 1, o - 1, -1)))
        b['m'].append(MI[mat])
        b['f'].append(list(range(o + n, o + 2 * n)))
        b['m'].append(MI[mat])
        for i in range(n):
            j = (i + 1) % n
            b['f'].append([o + i, o + j, o + n + j, o + n + i])
            b['m'].append(MI[mat])

    def sphere(self, r, x, y, z, mat, sy=1.0, n=10):
        b = bucket(self.bk)
        o = len(b['v'])
        rings = n // 2
        b['v'].append(self.p(x, z, y - r * sy))
        for i in range(1, rings):
            ph = math.pi * i / rings - math.pi / 2
            for j in range(n):
                a = 2 * math.pi * j / n
                b['v'].append(self.p(x + r * math.cos(ph) * math.cos(a), z + r * math.cos(ph) * math.sin(a), y + r * sy * math.sin(ph)))
        top = len(b['v'])
        b['v'].append(self.p(x, z, y + r * sy))
        for j in range(n):
            b['f'].append([o, o + 1 + (j + 1) % n, o + 1 + j])
            b['m'].append(MI[mat])
        for i in range(rings - 2):
            for j in range(n):
                a0 = o + 1 + i * n
                a1 = o + 1 + (i + 1) * n
                b['f'].append([a0 + j, a0 + (j + 1) % n, a1 + (j + 1) % n, a1 + j])
                b['m'].append(MI[mat])
        last = o + 1 + (rings - 2) * n
        for j in range(n):
            b['f'].append([last + j, last + (j + 1) % n, top])
            b['m'].append(MI[mat])


def prism(bk, pts, h1, h2, mat, top=None):
    """מנסרה מפוליגון בתוכנית (נקודות x,z נגד כיוון השעון במבט מלמעלה)."""
    b = bucket(bk)
    o = len(b['v'])
    n = len(pts)
    for h in (h1, h2):
        for (x, z) in pts:
            b['v'].append(W(x, z, h))
    b['f'].append(list(range(o + n - 1, o - 1, -1)))
    b['m'].append(MI[mat])
    b['f'].append(list(range(o + n, o + 2 * n)))
    b['m'].append(MI[top or mat])
    for i in range(n):
        j = (i + 1) % n
        b['f'].append([o + i, o + j, o + n + j, o + n + i])
        b['m'].append(MI[mat])


# ------------------------------------------------------------------ קירות ופתחים
WALLBOX = []
LAYOUT = {'walls': [], 'rails': []}
def wall(lvl, x1, x2, z1, z2, ops=(), faces=None, h1=None, h2=None):
    fl = BY if lvl == 'B' else GY
    h1 = h1 if h1 is not None else (BY if lvl == 'B' else -SLAB)
    h2 = h2 if h2 is not None else (-SLAB if lvl == 'B' else GROSS)
    bk = lvl + '_walls'
    LAYOUT['walls'].append({'lvl': lvl, 'r': [x1, x2, z1, z2], 'ops': [dict(o) for o in ops], 'faces': dict(faces or {}), 'h1': h1, 'h2': h2})
    fc = dict(faces or {})
    fc.setdefault('top', 'cut')
    axis = 'x' if (x2 - x1) >= (z2 - z1) else 'z'
    L1, L2 = (x1, x2) if axis == 'x' else (z1, z2)

    def seg(a, b, ha, hb):
        if b - a < 1e-5 or hb - ha < 1e-5:
            return
        if axis == 'x':
            box(bk, a, b, z1, z2, ha, hb, 'paint', fc)
            WALLBOX.append((lvl, a, b, z1, z2, ha, hb))
        else:
            box(bk, x1, x2, a, b, ha, hb, 'paint', fc)
            WALLBOX.append((lvl, x1, x2, a, b, ha, hb))
    cur = L1
    for op in sorted(ops, key=lambda o: o['a']):
        seg(cur, op['a'], h1, h2)
        seg(op['a'], op['b'], h1, fl + op.get('sill', 0))
        seg(op['a'], op['b'], fl + op['head'], h2)
        opening(lvl, op, axis, x1, x2, z1, z2, fl)
        cur = op['b']
    seg(cur, L2, h1, h2)


def opening(lvl, o, axis, x1, x2, z1, z2, fl):
    t0, t1 = (z1, z2) if axis == 'x' else (x1, x2)
    tm = (t0 + t1) / 2
    A, Bb = o['a'], o['b']
    ys, yh = fl + o.get('sill', 0), fl + o['head']
    bk = lvl + '_open'

    def put(a, b, ha, hb, c, d, mat, bkk=None):
        if axis == 'x':
            box(bkk or bk, a, b, c, d, ha, hb, mat)
        else:
            box(bkk or bk, c, d, a, b, ha, hb, mat)
    kind = o['kind']
    if kind in ('door', 'entry', 'mamad', 'arch', 'vit'):
        put(A, Bb, fl - 0.02, fl, t0, t1, o.get('floor', 'p_basement' if lvl == 'B' else 'p_living'), lvl + '_floor')
    if kind == 'arch':
        return
    if kind in ('door', 'entry', 'mamad'):
        fr = {'mamad': 'steel', 'entry': 'entry'}.get(kind, 'trim')
        put(A, A + 0.03, ys, yh, t0 - 0.01, t1 + 0.01, fr)
        put(Bb - 0.03, Bb, ys, yh, t0 - 0.01, t1 + 0.01, fr)
        put(A, Bb, yh - 0.03, yh, t0 - 0.01, t1 + 0.01, fr)
        w = Bb - A - 0.06
        th = 0.045 if kind == 'door' else 0.07
        hinge = Bb - 0.03 if o.get('hinge') == 'b' else A + 0.03
        la = hinge - th if o.get('hinge') == 'b' else hinge
        face = t1 if o['swing'] > 0 else t0
        ta, tb = (face, face + w) if o['swing'] > 0 else (face - w, face)
        lb = lvl + '_leaf' if kind == 'door' else None    # כנפי דלתות פנים בשכבה נפרדת: מוסתרות בצילומי החדרים
        put(la, la + th, ys + 0.008, yh - 0.035, ta, tb, {'mamad': 'steel', 'entry': 'entry'}.get(kind, 'leaf_door'), lb)
        hf = tb if o['swing'] > 0 else ta
        h1_, h2_ = (hf - 0.2, hf - 0.06) if o['swing'] > 0 else (hf + 0.06, hf + 0.2)
        put(la - 0.035, la + th + 0.035, ys + 1.02, ys + 1.045, h1_, h2_, 'chrome' if kind == 'entry' else 'black', lb)
        return
    if kind in ('win', 'mwin'):
        fw, fd = (0.07, 0.05) if kind == 'mwin' else (0.05, 0.035)
        fm = 'steel' if kind == 'mwin' else 'frame'
        put(A, Bb, ys, ys + fw, tm - fd, tm + fd, fm)
        put(A, Bb, yh - fw, yh, tm - fd, tm + fd, fm)
        put(A, A + fw, ys, yh, tm - fd, tm + fd, fm)
        put(Bb - fw, Bb, ys, yh, tm - fd, tm + fd, fm)
        if Bb - A > 1.25:
            put((A + Bb) / 2 - 0.025, (A + Bb) / 2 + 0.025, ys, yh, tm - fd, tm + fd, fm)
        put(A + fw, Bb - fw, ys + fw, yh - fw, tm - 0.008, tm + 0.008, 'glass', lvl + '_glass')
        inp = o.get('inside') == 'p'
        put(A - 0.03, Bb + 0.03, ys - 0.03, ys, tm if inp else t0 - 0.03, t1 + 0.03 if inp else tm, 'quartz')
        return
    if kind == 'vit':
        put(A, Bb, ys, ys + 0.025, tm - 0.07, tm + 0.07, 'frame')
        put(A, Bb, yh - 0.06, yh, tm - 0.07, tm + 0.07, 'frame')
        put(A, A + 0.04, ys, yh, tm - 0.07, tm + 0.07, 'frame')
        put(Bb - 0.04, Bb, ys, yh, tm - 0.07, tm + 0.07, 'frame')
        for pa, pb, lane in o['panels']:
            c = tm + (0.035 if lane else -0.035)
            f = 0.045
            put(pa, pa + f, ys + 0.025, yh - 0.06, c - 0.025, c + 0.025, 'frame')
            put(pb - f, pb, ys + 0.025, yh - 0.06, c - 0.025, c + 0.025, 'frame')
            put(pa, pb, ys + 0.025, ys + 0.09, c - 0.025, c + 0.025, 'frame')
            put(pa, pb, yh - 0.12, yh - 0.06, c - 0.025, c + 0.025, 'frame')
            put(pa + f, pb - f, ys + 0.09, yh - 0.12, c - 0.012, c + 0.012, 'glass', lvl + '_glass')


def rail(bk, x1, x2, z1, z2, h, height=1.05):
    LAYOUT['rails'].append({'bk': bk, 'r': [x1, x2, z1, z2], 'h': h})
    box(bk + '_glass', x1, x2, z1, z2, h, h + height - 0.04, 'glass')
    box(bk, x1 - 0.005, x2 + 0.005, z1 - 0.015, z2 + 0.015, h + height - 0.04, h + height, 'black')
    box(bk, x1 - 0.005, x2 + 0.005, z1 - 0.02, z2 + 0.02, h, h + 0.05, 'black')


def floor(lvl, x1, x2, z1, z2, mat, h=None):
    h = (BY if lvl == 'B' else GY) if h is None else h
    box(lvl + '_floor', x1, x2, z1, z2, h - 0.02, h, mat)


def ceiling(lvl, x1, x2, z1, z2):
    h = (BY if lvl == 'B' else GY) + NET
    box(lvl + '_ceil', x1, x2, z1, z2, h, h + 0.02, 'gypsum')


def door(a, b, hinge, swing, head=2.1, kind='door', floor_mat=None):
    d = {'a': a, 'b': b, 'head': head, 'kind': kind, 'hinge': hinge, 'swing': swing}
    if floor_mat:
        d['floor'] = floor_mat
    return d


def win(a, b, sill, head, inside='n', kind='win'):
    return {'a': a, 'b': b, 'sill': sill, 'head': head, 'kind': kind, 'inside': inside}


# ================================================================== קומת כניסה (151 מ"ר)
G = 'G'
FAC = {'n': 'facade'}
# יחידת ההורים. לפי התוכנית: 565 הוא האורך מהקיר הצפוני ועד קיר המדרגות, כולל רצועת הארונות (150).
# הקיר הצפוני של החדר נמצא בקו הקורה של החצר האנגלית. אין קיר בין החדר לרצועת הארונות.
wall(G, 2.31, 6.26, 1.35, 1.60, faces={'n': 'facade'})                                # צפון חדר ההורים
wall(G, 2.31, 2.56, 1.60, 3.22, faces={'w': 'facade'})                                # מערב חדר ההורים
wall(G, -0.25, 2.56, 3.22, 3.47, faces={'n': 'facade', 's': 'p_bathwall'})            # צפון חדר הרחצה
wall(G, 2.46, 2.56, 3.47, 5.75, faces={'w': 'p_bathwall'})                            # רחצה | שינה
wall(G, 6.01, 6.26, 1.60, 6.61, ops=[win(1.95, 3.05, 0.45, 2.60)], faces={'e': 'facade'})  # מזרח חדר ההורים: חלון לחצר האנגלית, ומדרום לו קיר הממ"ד
wall(G, -0.25, 0.00, 3.22, 9.45, faces={'w': 'facade', 'e': 'p_bathwall'})            # מערב: רחצה, מעבר, מדרגות (נעצר בכיס הלובי)
wall(G, 0.00, 2.46, 5.65, 5.75, ops=[door(1.00, 1.80, 'a', -1, floor_mat='p_bath')], faces={'n': 'p_bathwall'})   # ציר במערב, ליד המקלחון
wall(G, 4.62, 6.01, 6.51, 6.61, ops=[door(5.10, 5.90, 'b', -1, floor_mat='p_bedroom')])   # דלת יחידת ההורים: בקו הקיר הדרומי של הממ"ד, נפתחת פנימה
wall(G, 4.62, 4.72, 6.61, 7.25)
wall(G, 0.00, 4.72, 7.25, 7.35)                                                       # מעבר | מדרגות + שירותים
# שירותי אורחים: הכניסה מהפודסט העליון של המדרגות (קיר מערבי), ציר בדרום
wall(G, 3.22, 3.32, 7.35, 9.45, ops=[door(8.45, 9.25, 'b', 1, floor_mat='p_bath')], faces={'e': 'p_bathwall'})
wall(G, 4.62, 4.72, 7.35, 9.45, faces={'w': 'p_bathwall'})
wall(G, 3.22, 4.72, 9.35, 9.45, faces={'n': 'p_bathwall'})
# כיס הלובי ודלת הכניסה (125/210: כנף ראשית וכנף צד)
wall(G, -0.25, 1.38, 9.35, 9.45, faces={'s': 'facade'})
wall(G, 1.28, 1.38, 9.45, 11.13, ops=[door(9.67, 10.92, 'a', 1, head=2.4, kind='entry')], faces={'w': 'facade'})
wall(G, -0.25, 1.38, 11.13, 11.38, faces={'n': 'facade'})
wall(G, -0.25, 0.00, 11.38, 16.69, faces={'w': 'facade'})
# ממ"ד (הטור המזרחי נמדד מחדש מהתוכנית: 18 ס"מ דרומה מהגרסה הקודמת)
wall(G, 6.26, 10.71, 3.33, 3.63, faces={'n': 'facade'})
wall(G, 10.50, 10.71, 3.63, 6.38, ops=[win(4.78, 5.78, 1.0, 2.0, kind='mwin')], faces={'e': 'facade'})
wall(G, 6.26, 7.22, 6.38, 6.61, ops=[door(6.30, 7.10, 'a', -1, head=2.0, kind='mamad')])
wall(G, 7.22, 10.71, 6.38, 6.61, faces={'s': 'p_bathwall'})
# חדר רחצה כללי: דלת בקיר המערבי, ציר בדרום
wall(G, 7.17, 7.27, 6.61, 8.95, ops=[door(7.48, 8.28, 'b', 1, floor_mat='p_bath')], faces={'e': 'p_bathwall'})
wall(G, 10.46, 10.71, 6.61, 9.07, ops=[win(6.90, 7.50, 1.5, 2.2)], faces={'e': 'facade', 'w': 'p_bathwall'})
wall(G, 5.87, 7.22, 8.95, 9.07, ops=[door(6.25, 7.05, 'a', 1, floor_mat='p_bedroom')])   # הכנף נפתחת אל הקיר המערבי
wall(G, 7.22, 10.46, 8.95, 9.07, faces={'n': 'p_bathwall'})
# חדר שינה 2
wall(G, 5.87, 6.12, 9.07, 11.87)
wall(G, 10.46, 10.71, 9.07, 11.99, ops=[win(10.40, 11.60, 0.9, 2.4)], faces={'e': 'facade'})
wall(G, 5.87, 10.46, 11.87, 11.99)
# סלון: ויטרינה 5.20 בדרום, ויטרינה פינתית בדרום-מזרח (דרום + מזרח), עמוד RHS בפינה
wall(G, 10.46, 10.71, 11.99, 16.44, faces={'e': 'facade'}, ops=[
    {'a': 13.30, 'b': 16.44, 'head': NET, 'kind': 'vit', 'panels': [[13.30, 14.90, 0], [14.84, 16.44, 1]]}])
wall(G, -0.25, 10.71, 16.44, 16.69, faces={'s': 'facade'}, ops=[
    {'a': 1.38, 'b': 6.58, 'head': NET, 'kind': 'vit', 'panels': [[1.38, 2.70, 1], [3.95, 5.29, 0], [3.97, 5.31, 1], [5.26, 6.58, 0]]},
    {'a': 9.26, 'b': 10.46, 'head': NET, 'kind': 'vit', 'panels': [[9.26, 10.46, 1]]}])
box('G_open', 10.06, 10.21, 16.14, 16.29, GY, NET, 'black')                         # עמוד RHS (פלדה, לא חלק מהקירות שנמדדים)
# מדרגות (U עם מדרגות פנייה): נתיב צפוני z 7.35-8.30, קיר מרכזי 8.30-8.40, נתיב דרומי 8.40-9.35
rail('G_open', 1.38, 2.27, 9.33, 9.37, GY)                                                 # מעקה זכוכית H=105 לכיוון המבואה
rail('G_open', 2.27, 3.22, 8.33, 8.37, GY)                                                 # מעקה בצד הפודסט העליון
rail('G_open', 0.95, 2.27, 8.43, 8.47, GY)                                                 # מעקה מעל הקיר המרכזי

GF = [  # רצפות פורצלן 120x120
    (1.38, 5.87, 9.45, 11.99, 'p_living'), (0.00, 10.46, 11.99, 16.44, 'p_living'), (0.00, 1.38, 11.38, 11.99, 'p_living'),
    (4.72, 7.17, 6.61, 8.95, 'p_living'), (4.72, 5.87, 8.95, 9.45, 'p_living'),
    (0.00, 4.62, 5.75, 7.25, 'p_bedroom'), (4.62, 6.01, 5.75, 6.51, 'p_bedroom'), (2.27, 3.22, 8.40, 9.35, 'p_living'), (1.38, 2.27, 9.35, 9.45, 'p_living'),
    (2.56, 6.01, 1.60, 5.75, 'p_bedroom'), (6.26, 10.50, 3.63, 6.38, 'p_bedroom'), (6.12, 10.46, 9.07, 11.87, 'p_bedroom'),
    (0.00, 2.46, 3.47, 5.65, 'p_bath'), (7.27, 10.46, 6.61, 8.95, 'p_bath'), (3.32, 4.62, 7.35, 9.35, 'p_bath'),
]
for x1, x2, z1, z2, m in GF:
    floor(G, x1, x2, z1, z2, m)
for x1, x2, z1, z2, _ in GF:
    ceiling(G, x1, x2, z1, z2)
ceiling(G, 0.0, 3.22, 7.35, 9.35)
floor(G, -0.25, 1.28, 9.45, 11.13, 'p_outdoor')                      # כיס הלובי (שטח משותף)

# ================================================================== מרתף (99 מ"ר)
B = 'B'
# נקרא מחדש מהתוכנית: חדר המשחקים צפונה מקו הקורה של החצר (מתחת לקיר הצפוני של חדר ההורים),
# מרחב המשפחה בצורת L עם מיני בר בגומחה, קיר דק (10) בין המשפחה לרחצה ולסטודיו, חדר שירות קטן,
# גומחה שנפתחת מהסטודיו, והמחסן נפרד מהדירה (הכניסה אליו מבחוץ).
wall(B, -0.25, 0.00, 3.08, 10.89)
wall(B, -0.25, 3.17, 3.08, 3.28)                                    # צפון החלק המערבי של מרחב המשפחה + קצה גומחת המיני בר
wall(B, 2.31, 2.56, -2.40, 3.08)                                    # מערב חדר המשחקים והמיני בר
wall(B, 2.31, 6.26, -2.40, -2.15)                                   # צפון חדר המשחקים
wall(B, 2.56, 6.01, 1.40, 1.60, ops=[door(5.15, 5.95, 'b', -1)])    # חדר משחקים | משפחה: דלת בקצה המזרחי, נפתחת צפונה
wall(B, 6.01, 6.26, -2.40, -0.65, faces={'e': 'facade'})
wall(B, 6.01, 6.26, -0.65, 3.63, h2=0.0, faces={'e': 'facade'},     # ויטרינות 180/245 לחצר האנגלית: אחת בחדר המשחקים ואחת במרחב המשפחה
     ops=[win(-0.35, 1.25, 0.0, 2.45), win(1.72, 3.27, 0.0, 2.45)])
wall(B, 6.01, 10.90, -0.65, -0.40, h2=0.0, faces={'s': 'facade'})
wall(B, 10.65, 10.90, -0.40, 3.33, h2=0.0, faces={'w': 'facade'})
wall(B, 6.25, 10.71, 3.33, 3.63, h2=0.0, faces={'n': 'facade', 's': 'p_bathwall'},
     ops=[win(6.95, 7.55, 1.40, 2.45, inside='p'), win(9.25, 9.85, 1.80, 2.40, inside='p')])
wall(B, 6.15, 6.25, 3.63, 10.64, faces={'e': 'p_bathwall'},         # קיר דק: דלת רחצה 1, דלת הסטודיו, ופתח מהסטודיו לגומחה
     ops=[door(3.82, 4.57, 'a', 1, floor_mat='p_bath'), door(7.11, 7.91, 'a', 1), {'a': 8.95, 'b': 9.95, 'head': 2.5, 'kind': 'arch'}])
wall(B, 8.26, 8.40, 3.63, 6.43, faces={'w': 'p_bathwall', 'e': 'p_bathwall'})
wall(B, 6.25, 10.46, 6.43, 6.53, ops=[door(9.60, 10.30, 'b', -1, floor_mat='p_bath')], faces={'n': 'p_bathwall'})
wall(B, 10.46, 10.71, 3.63, 10.89, ops=[win(4.90, 5.90, 1.80, 2.40), win(7.30, 9.90, 1.05, 2.60)], faces={'e': 'concrete'})
wall(B, 6.25, 10.71, 10.64, 10.89)
wall(B, 0.00, 3.22, 7.25, 7.35)                                     # משפחה | מדרגות
wall(B, 3.22, 3.32, 8.30, 9.45)
wall(B, 3.32, 6.15, 8.40, 8.50, ops=[door(4.05, 4.75, 'b', 1)])     # חדר השירות: דלת מהמשפחה
wall(B, 4.79, 4.89, 8.50, 9.45)
wall(B, -0.25, 4.89, 9.35, 9.45)
wall(B, 2.61, 2.71, 9.45, 10.64)                                    # מחסן | גומחת הסטודיו
wall(B, -0.25, 6.25, 10.64, 10.89)
# חצר החלון (מתחת לסבכה)
wall(B, 11.76, 12.01, 4.03, 10.89, h2=0.0, faces={'w': 'concrete'})
wall(B, 10.71, 12.01, 4.03, 4.28, h2=0.0, faces={'s': 'concrete'})
wall(B, 10.71, 12.01, 10.64, 10.89, h2=0.0, faces={'n': 'concrete'})
floor(B, 10.71, 11.76, 4.28, 10.64, 'gravel')

BF = [
    (2.56, 6.01, 1.60, 3.28, 'p_basement'), (0.00, 6.15, 3.28, 7.25, 'p_basement'), (3.22, 6.15, 7.25, 8.40, 'p_basement'), (2.56, 6.01, -2.15, 1.40, 'p_basement'),
    (6.25, 8.26, 3.63, 6.43, 'p_bath'), (8.40, 10.46, 3.63, 6.43, 'p_bath'), (6.25, 10.46, 6.53, 10.64, 'p_basement'),
    (3.32, 4.79, 8.50, 9.35, 'p_bath'), (4.89, 6.15, 8.50, 9.45, 'p_basement'), (2.71, 6.15, 9.45, 10.64, 'p_basement'), (0.00, 2.61, 9.45, 10.64, 'p_basement'),
]
for x1, x2, z1, z2, m in BF:
    floor(B, x1, x2, z1, z2, m)
    ceiling(B, x1, x2, z1, z2)
floor(B, 6.26, 10.65, -0.40, 3.33, 'p_outdoor')                     # רצפת החצר האנגלית

# ------------------------------------------------------------------ מדרגות: 22 רומים של 18.6 ס"מ
ST = 'B_stair'
for i in range(1, 6):                                                # מהלך עליון: נתיב דרומי, יורד מערבה
    xa, xb = 2.27 - i * 0.264, 2.27 - (i - 1) * 0.264
    top = GY - i * R
    box(ST, xa, xb, 8.40, 9.35, BY, top - 0.04, 'trim')
    box(ST, xa - 0.02, xb, 8.40, 9.35, top - 0.04, top, 'oak')
pv = (0.95, 8.35)                                                    # מדרגות פנייה סביב ציר בקצה הקיר המרכזי


def rect_ray(ang):
    # כיוון: 0 = דרום (+z), 90 = מערב (-x), 180 = צפון (-z)
    dx, dz = -math.sin(math.radians(ang)), math.cos(math.radians(ang))
    ts = []
    if dx < -1e-9:
        ts.append((0.0 - pv[0]) / dx)
    if dz > 1e-9:
        ts.append((9.35 - pv[1]) / dz)
    if dz < -1e-9:
        ts.append((7.35 - pv[1]) / dz)
    t = min(t for t in ts if t > 0)
    return (pv[0] + dx * t, pv[1] + dz * t)


corners = [(0.95, 9.35, 0.0), (0.0, 9.35, math.degrees(math.atan2(0.95, 1.0))), (0.0, 7.35, 180 - math.degrees(math.atan2(0.95, 1.0))), (0.95, 7.35, 180.0)]
for k in range(1, 8):
    a0, a1 = (k - 1) * 180 / 7, k * 180 / 7
    pts = [pv, rect_ray(a0)]
    for cx, cz, ca in corners:
        if a0 < ca < a1:
            pts.append((cx, cz))
    pts.append(rect_ray(a1))
    top = GY - (5 + k) * R
    # כיוון הפוליגון: נגד כיוון השעון במבט מלמעלה ב-Blender (Y = -z), לכן הופכים
    poly = list(reversed(pts))
    prism(ST, poly, BY, top - 0.04, 'trim', top='trim')
    prism(ST, poly, top - 0.04, top, 'oak')
for j in range(1, 10):                                               # מהלך תחתון: נתיב צפוני, יורד מזרחה
    xa, xb = 0.95 + (j - 1) * 0.252, 0.95 + j * 0.252
    top = GY - (12 + j) * R
    box(ST, xa, xb, 7.35, 8.30, BY, top - 0.04, 'trim')
    box(ST, xa, xb + 0.02, 7.35, 8.30, top - 0.04, top, 'oak')
box(ST, 0.95, 3.22, 8.30, 8.40, BY, GY, 'paint', {'top': 'cut'})    # קיר מרכזי עד רצפת קומת הכניסה
box(ST, 2.27, 3.22, 8.40, 9.35, -SLAB, GY - 0.02, 'concrete')        # פודסט עליון

# ------------------------------------------------------------------ תקרת המרתף (רצפת הכניסה) עם פתחים
SL = 'SLAB'
slab_pieces = [
    (-0.25, 6.26, 1.35, 7.35), (6.26, 10.71, 3.33, 7.35), (-0.25, 0.0, 7.35, 9.45), (3.22, 10.71, 7.35, 11.99),
    (-0.25, 3.22, 9.35, 11.99), (2.27, 3.22, 8.40, 9.35), (-0.25, 10.71, 11.99, 16.69), (10.71, 12.01, 3.33, 4.28),
    (10.71, 12.01, 10.64, 16.69), (11.76, 12.01, 4.28, 10.64),
]  # בלי חלקים חופפים באותו מישור (Cycles מצליל אותם זה על זה)
for x1, x2, z1, z2 in slab_pieces:
    box(SL, x1, x2, z1, z2, -SLAB, GY - 0.021, 'concrete')

# ================================================================== חוץ: דק, דשא, גינון, סבכה, גדר
O = 'OUT'
box(O, -12, 26, -12, 32, BY - 0.35, BY - 0.05, 'concrete')
for x1, x2, z1, z2 in [(-12, 26, -12, -2.40), (-12, 2.31, -2.40, 1.35), (-12, -0.25, 1.35, 32), (2.31, 6.26, -2.40, 1.35), (13.71, 26, -2.40, 32), (-0.25, 13.71, 22.10, 32),
                       (6.26, 13.71, -2.40, -0.65), (10.90, 13.71, -0.65, 1.06)]:
    box(O, x1, x2, z1, z2, -0.4, -0.03, 'p_outdoor')
box(O, 0.97, 10.71, 16.69, 19.69, -0.3, GY + 0.01, 'deck', {'top': 'deck'})          # דק עץ
for x1, x2, z1, z2 in [(-0.25, 13.71, 19.69, 22.10), (10.71, 13.71, 16.69, 19.69), (10.71, 13.71, 10.64, 16.69),
                       (11.76, 13.71, 4.28, 10.64), (10.90, 13.71, 1.06, 3.33), (10.71, 13.71, 3.33, 4.28)]:
    box(O, x1, x2, z1, z2, -0.4, GY + 0.005, 'grass')
for z in [17.0, 17.9, 18.8]:                                                         # אדניות גינון ממערב לדק
    box(O, -0.25, 0.92, z, z + 0.8, -0.3, 0.45, 'concrete', {'top': 'soil'})
    Local('OUT_furn', 0.33, z + 0.4, 0.45).sphere(0.33, 0, 0.25, 0, 'leaf', sy=0.8)
box(O, -0.25, 0.97, 19.60, 19.69, -0.3, 0.05, 'concrete')
for z in range(0, 13):                                                               # אבני מדרך בגינה הצדדית
    box(O, 11.9, 12.6, 11.0 + z * 0.75 - 0.3, 11.0 + z * 0.75 + 0.15, 0, 0.015, 'p_outdoor') if z < 7 else None
# סבכה מעל חצר החלון
for i in range(0, 34):
    x = 10.73 + i * 0.03
    box(O, x, x + 0.008, 4.28, 10.64, -0.03, 0.0, 'black')
for z in [4.28, 5.87, 7.46, 9.05, 10.61]:
    box(O, 10.71, 11.76, z, z + 0.03, -0.03, 0.0, 'black')
# מעקות החצר האנגלית (בגובה הקרקע) וגדר
rail('OUT', 6.26, 10.65, -0.67, -0.63, GY)
rail('OUT', 10.86, 10.90, -0.65, 3.33, GY)
box(O, 6.26, 10.65, 1.40, 1.60, -0.45, 0.0, 'concrete')                               # הקורה שחוצה את החצר האנגלית (בתוכנית)
for x1, x2, z1, z2 in [(-0.27, -0.23, 16.69, 22.10), (-0.25, 13.71, 22.08, 22.12), (13.69, 13.73, 1.06, 22.10), (10.90, 13.71, 1.04, 1.08)]:
    box(O, x1, x2, z1, z2, 0, 1.05, 'black')
for x1, x2, z1, z2 in [(-0.85, -0.27, 16.69, 22.70), (-0.85, 14.31, 22.12, 22.70), (13.73, 14.31, 1.06, 22.70)]:
    box(O, x1, x2, z1, z2, 0, 1.5, 'leaf')
# פרגולה מעל הדק
PG = 'ROOF'
for x in (1.05, 5.80, 10.55):
    box(PG, x - 0.07, x + 0.07, 19.50, 19.64, 0, 3.55, 'black')
box(PG, 0.97, 10.71, 19.50, 19.64, 3.40, 3.62, 'black')
for i in range(45):
    x = 1.0 + i * 0.216
    box(PG, x, x + 0.05, 16.69, 19.64, 3.62, 3.76, 'black')

# ================================================================== ריהוט, מטבח וחדרי רחצה
R90 = math.pi / 2


def bed(bk, x, z, h, rot, w, l):
    f = Local(bk, x, z, h, rot)
    f.box(w + 0.06, 0.28, l, 0, 0.14, 0, 'oak')
    f.box(w, 0.24, l - 0.06, 0, 0.40, 0.02, 'linen')
    f.box(w + 0.04, 0.07, l * 0.62, 0, 0.55, l * 0.18, 'duvet')
    f.box(w * 0.42, 0.12, 0.38, -w * 0.24, 0.58, -l / 2 + 0.3, 'linen')
    f.box(w * 0.42, 0.12, 0.38, w * 0.24, 0.58, -l / 2 + 0.3, 'linen')
    f.box(w + 0.3, 1.15, 0.09, 0, 0.575, -l / 2 - 0.045, 'headboard')


def nightstand(bk, x, z, h, rot):
    f = Local(bk, x, z, h, rot)
    f.box(0.5, 0.45, 0.4, 0, 0.3, 0, 'walnut')
    f.cyl(0.06, 0.08, 0.3, 0.1, 0.67, 0, 'pot', 12)
    f.cyl(0.12, 0.15, 0.2, 0.1, 0.9, 0, 'linen', 16)


def sofa(bk, x, z, h, rot, w, d=0.95, mat='fabric'):
    f = Local(bk, x, z, h, rot)
    f.box(w, 0.36, d, 0, 0.22, 0, mat)
    f.box(w - 0.36, 0.12, d - 0.28, 0, 0.46, 0.1, mat)
    f.box(w, 0.46, 0.22, 0, 0.6, -d / 2 + 0.11, mat)
    f.box(0.18, 0.6, d, -w / 2 + 0.09, 0.32, 0, mat)
    f.box(0.18, 0.6, d, w / 2 - 0.09, 0.32, 0, mat)
    xx = -w / 2 + 0.55
    while xx < w / 2 - 0.3:
        f.box(0.42, 0.38, 0.12, xx, 0.72, -d / 2 + 0.3, 'cushion')
        xx += 0.75


def chaise(bk, x, z, h, rot, w, l, mat='fabric'):
    f = Local(bk, x, z, h, rot)
    f.box(w, 0.36, l, 0, 0.22, 0, mat)
    f.box(w - 0.1, 0.12, l - 0.1, 0, 0.46, 0, mat)


def coffee(bk, x, z, h, rot, w, d, hh=0.38):
    f = Local(bk, x, z, h, rot)
    f.box(w, 0.04, d, 0, hh, 0, 'walnut')
    f.box(w - 0.2, hh - 0.02, d - 0.2, 0, (hh - 0.02) / 2, 0, 'darkstone')
    f.cyl(0.12, 0.08, 0.07, w * 0.2, hh + 0.055, 0, 'ceramic', 20)


def chair(bk, x, z, h, rot, mat='fabric'):
    f = Local(bk, x, z, h, rot)
    f.box(0.46, 0.06, 0.46, 0, 0.46, 0, mat)
    f.box(0.46, 0.45, 0.05, 0, 0.72, -0.21, mat)
    for lx, lz in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)):
        f.box(0.03, 0.44, 0.03, lx, 0.22, lz, 'black')


def dining(bk, x, z, h, rot, w, d, wood='oak'):
    f = Local(bk, x, z, h, rot)
    f.box(w, 0.05, d, 0, 0.735, 0, wood)
    f.box(0.08, 0.71, d - 0.3, -w / 2 + 0.35, 0.355, 0, 'black')
    f.box(0.08, 0.71, d - 0.3, w / 2 - 0.35, 0.355, 0, 'black')
    f.cyl(0.22, 0.12, 0.09, 0, 0.805, 0, 'ceramic', 24)


def wardrobe(bk, x, z, h, rot, w, hh=2.6, d=0.6, mat='lacquer'):
    f = Local(bk, x, z, h, rot)
    f.box(w, hh, d, 0, hh / 2, 0, mat)
    n = max(1, round(w / 0.55))
    for i in range(1, n):
        f.box(0.008, hh - 0.1, 0.01, -w / 2 + i * w / n, hh / 2, d / 2 + 0.002, 'cut')
    for i in range(n):
        f.box(0.02, 0.5, 0.02, -w / 2 + (i + 0.5) * w / n + (-1 if i % 2 else 1) * (w / n / 2 - 0.06), 1.1, d / 2 + 0.015, 'black')


def counter(bk, x, z, h, rot, ln, sink=None, cook=None):
    f = Local(bk, x, z, h, rot)
    f.box(ln, 0.1, 0.55, 0, 0.05, -0.02, 'cut')
    f.box(ln, 0.78, 0.62, 0, 0.49, 0, 'lacquer')
    f.box(ln + 0.01, 0.03, 0.65, 0, 0.895, 0.01, 'quartz')
    if sink is not None:
        f.box(0.7, 0.012, 0.42, sink, 0.906, 0.04, 'black')
        f.cyl(0.015, 0.015, 0.35, sink, 1.08, -0.22, 'chrome', 10)
        f.box(0.02, 0.02, 0.22, sink, 1.25, -0.12, 'chrome')
    if cook is not None:
        f.box(0.8, 0.01, 0.52, cook, 0.915, 0.02, 'screen')


def tall_unit(bk, x, z, h, rot, ln, hh):
    f = Local(bk, x, z, h, rot)
    f.box(ln, hh, 0.62, 0, hh / 2, 0, 'lacquer')
    xx = -ln / 2 + 0.6
    while xx < ln / 2:
        f.box(0.006, hh - 0.1, 0.005, xx, hh / 2, 0.311, 'cut')
        xx += 0.6
    f.box(0.6, 0.6, 0.006, ln / 2 - 0.9, 1.25, 0.312, 'screen')
    f.box(0.6, 0.45, 0.006, ln / 2 - 0.9, 0.75, 0.312, 'screen')


def island(bk, x, z, h, rot, ln, dep):
    f = Local(bk, x, z, h, rot)
    f.box(ln - 0.06, 0.86, dep - 0.25, 0, 0.43, -0.1, 'walnut')
    f.box(ln, 0.04, dep, 0, 0.9, 0, 'quartz')
    f.box(0.04, 0.88, dep, -ln / 2 + 0.02, 0.44, 0, 'quartz')
    f.box(0.04, 0.88, dep, ln / 2 - 0.02, 0.44, 0, 'quartz')


def stool(bk, x, z, h):
    f = Local(bk, x, z, h)
    f.cyl(0.19, 0.19, 0.06, 0, 0.74, 0, 'fabric_dark', 16)
    f.cyl(0.025, 0.025, 0.7, 0, 0.36, 0, 'black', 8)
    f.cyl(0.2, 0.2, 0.02, 0, 0.01, 0, 'black', 16)


def toilet(bk, x, z, h, rot):
    f = Local(bk, x, z, h, rot)
    f.cyl(0.19, 0.16, 0.36, 0, 0.42, 0.04, 'ceramic', 20, sz=1.45)
    f.box(0.36, 0.03, 0.5, 0, 0.615, 0.06, 'ceramic')
    f.box(0.22, 0.14, 0.01, 0, 1.05, -0.22, 'chrome')


def vanity(bk, x, z, h, rot, ln, sinks=2, mirror=True):
    f = Local(bk, x, z, h, rot)
    f.box(ln, 0.42, 0.48, 0, 0.62, 0, 'walnut')
    f.box(ln, 0.03, 0.5, 0, 0.845, 0.01, 'quartz')
    for i in range(sinks):
        sx = -ln / 2 + (i + 0.5) * ln / sinks
        f.cyl(0.2, 0.17, 0.12, sx, 0.92, 0.04, 'ceramic', 24, sz=0.8)
        f.cyl(0.014, 0.014, 0.28, sx, 1.0, -0.19, 'chrome', 8)
    if mirror:
        f.box(ln, 0.95, 0.02, 0, 1.62, -0.235, 'mirror')


def shower(bk, x1, x2, z1, z2, h, glass):
    cx, cz = (x1 + x2) / 2, (z1 + z2) / 2
    box(bk, cx - 0.18, cx + 0.18, cz - 0.18, cz + 0.18, h + NET - 0.02, h + NET - 0.005, 'chrome')
    box(bk, x1 + 0.05, x2 - 0.05, z2 - 0.08, z2 - 0.04, h - 0.005, h + 0.002, 'black')
    for a, b, c, d in glass:
        box(bk + '_glass', a, b, c, d, h, h + 2.1, 'glass')
        box(bk, a, b, c, d, h + 2.08, h + 2.1, 'black')


def plant(bk, x, z, h, size=1.2, mat='leaf'):
    f = Local(bk, x, z, h)
    f.cyl(0.2, 0.16, 0.42, 0, 0.21, 0, 'pot', 16)
    f.sphere(size * 0.32, 0, 0.42 + size * 0.45, 0, mat, sy=1.35)


def tree(bk, x, z, h, ht=4.0, mat='leaf', crown=1.4):
    f = Local(bk, x, z, h)
    f.cyl(0.09, 0.14, ht * 0.55, 0, ht * 0.275, 0, 'trunk', 10)
    for px, py, pz, r in ((0, ht * 0.72, 0, crown), (0.6, ht * 0.62, 0.3, crown * 0.7), (-0.5, ht * 0.66, -0.3, crown * 0.75)):
        f.sphere(r, px, py, pz, mat, n=12)


def shelf(bk, x, z, h, rot, w, hh, d=0.4, mat='oak'):
    f = Local(bk, x, z, h, rot)
    f.box(0.03, hh, d, -w / 2, hh / 2, 0, mat)
    f.box(0.03, hh, d, w / 2, hh / 2, 0, mat)
    yy = 0.05
    k = 0
    while yy < hh:
        f.box(w, 0.025, d, 0, yy, 0, mat)
        if yy < hh - 0.3:
            xx = -w / 2 + 0.1
            while xx < w / 2 - 0.12:
                k += 1
                if k % 3:
                    f.box(0.04, 0.22, d * 0.7, xx, yy + 0.12, 0, ['terracotta', 'sage', 'fabric_dark', 'linen'][k % 4])
                xx += 0.07
        yy += 0.38


def rug(bk, x1, x2, z1, z2, h, mat='rug'):
    box(bk, x1, x2, z1, z2, h, h + 0.012, mat)


def desk(bk, x, z, h, rot, w=1.6, d=0.75):
    f = Local(bk, x, z, h, rot)
    f.box(w, 0.035, d, 0, 0.74, 0, 'oak')
    f.box(0.04, 0.72, d - 0.1, -w / 2 + 0.05, 0.36, 0, 'black')
    f.box(0.04, 0.72, d - 0.1, w / 2 - 0.05, 0.36, 0, 'black')
    f.box(0.6, 0.36, 0.02, 0, 1.0, -d / 2 + 0.15, 'screen')


def office_chair(bk, x, z, h, rot):
    f = Local(bk, x, z, h, rot)
    f.box(0.5, 0.08, 0.48, 0, 0.47, 0, 'fabric_dark')
    f.box(0.48, 0.55, 0.06, 0, 0.82, -0.22, 'fabric_dark')
    f.cyl(0.3, 0.3, 0.03, 0, 0.04, 0, 'black', 16)


def washer(bk, x, z, h, rot):
    f = Local(bk, x, z, h, rot)
    f.box(0.6, 0.85, 0.6, 0, 0.425, 0, 'ceramic')


GFN, BFN, OFN = 'G_furn', 'B_furn', 'OUT_furn'
GFX, BFX = 'G_fixed', 'B_fixed'
# --- מטבח (לפי התוכנית: ארונות גבוהים לאורך 2.87 בצפון, קו עבודה במערב עם כיריים וכיור, אי באמצע)
tall_unit(GFX, 1.435, 11.69, GY, 0, 2.87, NET)
counter(GFX, 0.31, 13.95, GY, R90, 3.3, sink=-0.65, cook=0.6)
box(GFX, 0.0, 0.02, 12.3, 15.6, 0.92, 1.6, 'quartz')
box(GFX, 0.0, 0.55, 13.0, 13.7, 2.2, 2.32, 'black')                          # מנדף מעל הכיריים
island(GFX, 2.30, 14.10, GY, R90, 2.1, 0.9)
for z in (13.4, 14.1, 14.8):
    stool(GFN, 3.05, z, GY)
dining(GFN, 4.55, 14.15, GY, 0, 2.4, 1.0)
for dx in (-0.75, 0, 0.75):
    chair(GFN, 4.55 + dx, 13.45, GY, 0)
    chair(GFN, 4.55 + dx, 14.85, GY, math.pi)
# --- סלון: קיר טלוויזיה בצפון, ספה עם הגב לקיר הדרומי המלא
rug(GFN, 6.8, 9.8, 12.9, 15.7, GY)
sofa(GFN, 7.95, 15.92, GY, math.pi, 2.8)
chaise(GFN, 6.85, 14.85, GY, 0, 0.9, 1.25)
coffee(GFN, 8.1, 14.25, GY, 0, 1.2, 0.7)
sofa(GFN, 9.85, 13.0, GY, -R90, 0.9, 0.85, 'sage')
med = Local(GFN, 8.2, 12.22, GY)
med.box(2.6, 0.42, 0.45, 0, 0.45, 0, 'walnut')
med.box(1.65, 0.94, 0.04, 0, 1.55, -0.2, 'screen')
plant(GFN, 6.35, 15.95, GY, 1.6)
plant(GFN, 5.5, 12.4, GY, 1.1)
# --- מבואה
bench = Local(GFN, 3.97, 9.66, GY)
bench.box(1.2, 0.42, 0.4, 0, 0.21, 0, 'oak')
plant(GFN, 1.8, 11.2, GY, 1.3)
# --- יחידת הורים: חדר 3.45 רוחב, 5.65 מהקיר הצפוני עד קיר המדרגות כולל רצועת הארונות; רחצה 2.46x2.18
bed(GFN, 3.59, 3.35, GY, R90, 1.8, 2.0)                                      # ראש המיטה לקיר המערבי
nightstand(GFN, 2.81, 2.15, GY, R90)
nightstand(GFN, 2.81, 4.55, GY, R90)
rug(GFN, 3.2, 5.6, 2.2, 4.5, GY, 'rug_dark')
sofa(GFN, 5.45, 2.3, GY, -R90, 0.85, 0.85, 'sage')
wardrobe(GFX, 2.76, 6.95, GY, math.pi, 3.72, NET - 0.02, 0.60, 'oak')       # ארונות לאורך קיר המדרגות
wardrobe(GFX, 0.30, 6.20, GY, R90, 0.90, NET - 0.02, 0.60, 'oak')           # ארון בקצה המערבי
# חדר רחצה הורים (לפי התוכנית: אסלה ליד הפיר בצפון-מערב, מקלחון בדרום-מערב, שני כיורים במזרח, דלת עם ציר במערב)
box(GFX, 0.0, 0.25, 3.47, 4.05, GY, NET, 'p_bathwall')                       # פיר ונטה
toilet(GFX, 0.50, 3.80, GY, R90)
shower(GFX, 0.0, 0.93, 4.37, 5.65, GY, [(0.25, 0.93, 4.36, 4.38), (0.92, 0.94, 4.37, 4.80)])
box(GFX, 0.0, 0.12, 4.70, 5.40, 1.10, 1.13, 'quartz')
vanity(GFX, 2.22, 4.45, GY, -R90, 1.70, 2)
for y in [0.85 + 0.12 * i for i in range(7)]:
    box(GFX, 0.95, 1.45, 3.48, 3.52, y, y + 0.02, 'chrome')
# שירותי אורחים: אסלה בצפון, כיור קטן בקיר המזרחי, דלת מהפודסט
toilet(GFX, 3.97, 7.62, GY, 0)
vanity(GFX, 4.38, 8.15, GY, -R90, 0.45, 1, mirror=False)
# ממ"ד: הדלת נפתחת פנימה, לכן הספה בקיר המזרחי
desk(GFN, 7.8, 3.95, GY, 0, 1.5, 0.65)
office_chair(GFN, 7.8, 4.53, GY, math.pi)
sofa(GFN, 9.95, 5.0, GY, -R90, 1.7, 0.9, 'headboard')
shelf(GFN, 9.6, 3.81, GY, 0, 1.0, 2.0, 0.35)
# חדר רחצה כללי (לפי התוכנית: מקלחון 175x82 בצפון-מערב, מכונת כביסה בצפון-מזרח, כיור כפול בדרום, אסלה בדרום-מזרח)
shower(GFX, 7.27, 9.02, 6.61, 7.43, GY, [(7.95, 9.02, 7.42, 7.44), (9.01, 9.03, 6.61, 7.43)])
vanity(GFX, 8.45, 8.71, GY, math.pi, 1.9, 2)
toilet(GFX, 10.0, 8.62, GY, math.pi)
washer(GFX, 10.13, 6.94, GY, -R90)
# חדר שינה 2
bed(GFN, 7.21, 10.63, GY, R90, 1.6, 2.0)
nightstand(GFN, 6.37, 11.63, GY, R90)
wardrobe(GFX, 9.3, 11.57, GY, math.pi, 2.0, 2.6, 0.6)
desk(GFN, 10.16, 9.95, GY, -R90, 1.2, 0.6)
office_chair(GFN, 9.6, 9.95, GY, R90)

# --- מרתף
counter(BFX, 2.87, 2.34, BY, R90, 1.44, sink=0.3)                             # מיני בר בגומחה (לפי התוכנית)
box(BFX, 2.56, 2.91, 1.62, 3.06, BY + 1.5, BY + 1.53, 'oak')
box(BFX, 2.56, 2.91, 1.62, 3.06, BY + 1.9, BY + 1.93, 'oak')
stool(BFN, 3.55, 2.0, BY)
stool(BFN, 3.55, 2.7, BY)
rug(BFN, 0.4, 3.0, 4.1, 6.6, BY, 'rug_dark')
sofa(BFN, 1.7, 4.3, BY, 0, 2.6, 0.95, 'fabric_dark')
coffee(BFN, 1.7, 5.45, BY, 0, 1.1, 0.7)
md2 = Local(BFN, 1.7, 7.02, BY, math.pi)
md2.box(2.2, 0.42, 0.42, 0, 0.45, 0, 'walnut')
md2.box(1.85, 1.05, 0.04, 0, 1.5, -0.19, 'screen')
plant(BFN, 0.4, 3.7, BY, 1.3)
# חדר משחקים
rug(BFN, 3.0, 5.6, -1.8, 0.9, BY, 'rug')
kt = Local(BFN, 4.3, -0.6, BY)
kt.box(0.9, 0.03, 0.6, 0, 0.5, 0, 'oak')
for i, (cx, cz) in enumerate([(3.9, -1.05), (4.7, -1.05), (3.9, -0.15), (4.7, -0.15)]):
    c = Local(BFN, cx, cz, BY, 0 if i < 2 else math.pi)
    c.box(0.32, 0.04, 0.32, 0, 0.3, 0, ['kids1', 'kids2', 'kids3', 'kids2'][i])
    c.box(0.32, 0.3, 0.03, 0, 0.45, -0.15, ['kids1', 'kids2', 'kids3', 'kids2'][i])
shelf(BFN, 2.76, -0.5, BY, R90, 2.4, 1.2, 0.35)
Local(BFN, 5.4, -1.8, BY).sphere(0.4, 0, 0.22, 0, 'kids2', sy=0.55, n=14)
Local(BFN, 3.3, 0.9, BY).sphere(0.4, 0, 0.22, 0, 'kids3', sy=0.55, n=14)
# חדרי רחצה במרתף (לפי התוכנית: רחצה 1 נכנסים ממרחב המשפחה, רחצה 2 מהסטודיו)
shower(BFX, 7.20, 8.26, 5.50, 6.43, BY, [(7.19, 7.21, 5.50, 6.43)])
toilet(BFX, 6.75, 6.15, BY, math.pi)
vanity(BFX, 8.02, 4.3, BY, -R90, 0.8, 1)
shower(BFX, 8.40, 9.60, 3.63, 4.50, BY, [(8.40, 9.20, 4.49, 4.51)])
toilet(BFX, 10.05, 3.91, BY, 0)
vanity(BFX, 8.64, 5.6, BY, R90, 0.8, 1)
# סטודיו
rug(BFN, 7.0, 9.6, 7.6, 9.9, BY)
sofa(BFN, 8.4, 7.0, BY, 0, 2.1, 0.9)
coffee(BFN, 8.4, 8.15, BY, 0, 1.0, 0.6)
desk(BFN, 10.06, 8.6, BY, -R90, 1.8, 0.8)
office_chair(BFN, 9.4, 8.6, BY, R90)
shelf(BFN, 7.8, 10.46, BY, math.pi, 2.4, 2.3, 0.35)
plant(BFN, 6.6, 10.2, BY, 1.4)
wardrobe(BFX, 4.2, 10.34, BY, math.pi, 2.6, 2.6, 0.6)                         # ארון בגומחת הסטודיו
# חדר שירות ומחסן
washer(BFX, 3.65, 9.03, BY, math.pi)
washer(BFX, 4.30, 9.03, BY, math.pi)
shelf(BFN, 1.2, 10.42, BY, math.pi, 2.2, 2.2, 0.45, 'steel')
# חצר אנגלית
pl = Local(BFN, 9.2, 0.5, BY)
pl.box(1.4, 0.55, 1.4, 0, 0.275, 0, 'concrete')
pl.box(1.3, 0.02, 1.3, 0, 0.54, 0, 'soil')
tree(BFN, 9.2, 0.5, BY + 0.55, 3.2, 'olive', 0.9)
bc = Local(BFN, 7.6, -0.15, BY)
bc.box(1.8, 0.45, 0.45, 0, 0.225, 0, 'teak')
for z in (0.0, 1.9, 2.9):
    t = Local(BFN, 10.3, z, BY)
    t.cyl(0.22, 0.18, 0.45, 0, 0.225, 0, 'pot', 12)
    t.cyl(0.0, 0.32, 2.6, 0, 1.7, 0, 'leaf', 8)
# --- דק וגינה
dining(OFN, 3.0, 18.3, GY, 0, 2.2, 1.0, 'teak')
for dx in (-0.7, 0, 0.7):
    chair(OFN, 3.0 + dx, 17.6, GY, 0, 'cushion')
    chair(OFN, 3.0 + dx, 19.0, GY, math.pi, 'cushion')
os_ = Local(OFN, 9.9, 18.2, GY, -R90)
os_.box(2.6, 0.3, 0.9, 0, 0.2, 0, 'teak')
os_.box(2.5, 0.14, 0.75, 0, 0.42, 0.05, 'cushion')
os_.box(2.6, 0.4, 0.14, 0, 0.55, -0.38, 'teak')
coffee(OFN, 8.7, 18.2, GY, R90, 1.1, 0.6)
for x in (4.6, 5.6):
    sb = Local(OFN, x, 21.0, GY, math.pi)
    sb.box(0.7, 0.3, 1.95, 0, 0.18, 0, 'teak')
    sb.box(0.66, 0.08, 1.4, 0, 0.37, 0.25, 'cushion')
tree(OFN, 1.5, 21.0, GY, 4.6, 'leaf', 1.6)
tree(OFN, 12.5, 20.6, GY, 4.2, 'olive', 1.3)
tree(OFN, 12.9, 13.0, GY, 3.6, 'leaf', 1.2)

LAYOUT['floors'] = {'G': GF, 'B': BF}
with open(os.path.join(OUT, 'layout.json'), 'w') as _f:
    json.dump(LAYOUT, _f)

# ------------------------------------------------------------------ פאנלים (שיפולים) בתחתית הקירות: רק איפה שיש קיר בפועל
def wall_at(lvl, x, z, h):
    for L, a, b, c, d, h1, h2 in WALLBOX:
        if L == lvl and a - 1e-3 <= x <= b + 1e-3 and c - 1e-3 <= z <= d + 1e-3 and h1 <= h <= h2:
            return True
    return False


def skirting(lvl, x1, x2, z1, z2):
    fl = BY if lvl == 'B' else GY
    t, hh, st = 0.012, 0.08, 0.05
    for edge in ('n', 's', 'w', 'e'):
        if edge in ('n', 's'):
            zz = z1 if edge == 'n' else z2
            probe = zz - 0.03 if edge == 'n' else zz + 0.03
            n = max(1, int((x2 - x1) / st))
            run = None
            for i in range(n + 1):
                x = x1 + (x2 - x1) * i / n
                ok = wall_at(lvl, x, probe, fl + 0.04) and i < n
                if ok and run is None:
                    run = x
                if (not ok or i == n) and run is not None:
                    xe = x if not ok else x2
                    if xe - run > 0.04:
                        box(lvl + '_fixed', run, xe, zz if edge == 'n' else zz - t, zz + t if edge == 'n' else zz, fl, fl + hh, 'trim')
                    run = None
        else:
            xx = x1 if edge == 'w' else x2
            probe = xx - 0.03 if edge == 'w' else xx + 0.03
            n = max(1, int((z2 - z1) / st))
            run = None
            for i in range(n + 1):
                z = z1 + (z2 - z1) * i / n
                ok = wall_at(lvl, probe, z, fl + 0.04) and i < n
                if ok and run is None:
                    run = z
                if (not ok or i == n) and run is not None:
                    ze = z if not ok else z2
                    if ze - run > 0.04:
                        box(lvl + '_fixed', xx if edge == 'w' else xx - t, xx + t if edge == 'w' else xx, run, ze, fl, fl + hh, 'trim')
                    run = None


for x1, x2, z1, z2, m in GF:
    if m != 'p_bath':
        skirting('G', x1, x2, z1, z2)
for x1, x2, z1, z2, m in BF:
    if m != 'p_bath':
        skirting('B', x1, x2, z1, z2)

# תקרת הבטון מעל קומת הכניסה ושתי קומות מעליה (צל אמיתי על הגינה, ותאורה רק דרך החלונות)
for x1, x2, z1, z2 in [(2.31, 6.26, 1.35, 3.22), (-0.25, 6.26, 3.22, 7.35), (6.26, 10.71, 3.33, 7.35), (-0.25, 10.71, 7.35, 16.69)]:
    box('ROOFSLAB', x1, x2, z1, z2, GROSS, GROSS + SLAB, 'concrete')
    box('UPPER', x1, x2, z1, z2, GROSS + SLAB, GROSS + SLAB + 6.2, 'facade')
for hh in (5.0, 8.1):                                                                # מרפסות הקומות שמעל
    box('UPPER', -0.25, 10.71, 16.69, 18.10, hh - 0.75, hh - 0.6, 'concrete')
    box('UPPER_glass', -0.25, 10.71, 18.08, 18.10, hh - 0.6, hh + 0.45, 'glass')

# ------------------------------------------------------------------ יצירת האובייקטים
OBJ = {}
for name, b in BUCKETS.items():
    me = bpy.data.meshes.new(name)
    me.from_pydata(b['v'], [], b['f'])
    me.update()
    for m in MLIST:
        me.materials.append(MATS[m])
    me.polygons.foreach_set('material_index', b['m'])
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    OBJ[name] = ob
    for p in me.polygons:
        p.use_smooth = False

# ------------------------------------------------------------------ בדיקת מידות: קרניים מול הקירות בלבד
from mathutils import Vector  # noqa: E402

depsgraph = bpy.context.evaluated_depsgraph_get()


def measure(lvl, x1, x2, z1, z2):
    ob = OBJ[lvl + '_walls']
    extra = [OBJ['B_stair']] if lvl == 'B' else []
    h = (BY if lvl == 'B' else GY) + 0.5
    cx, cz = (x1 + x2) / 2, (z1 + z2) / 2

    def nearest(o, d):
        best = None
        for obj in [ob] + extra:
            hit, loc, *_ = obj.ray_cast(Vector(o), Vector(d), distance=40)
            if hit:
                dist = (loc - Vector(o)).length
                best = dist if best is None else min(best, dist)
        return best

    def span(axis):
        side = [math.inf, math.inf]
        for i in range(31):
            t = 0.04 + 0.92 * i / 30
            if axis == 'x':
                o = W(cx, z1 + (z2 - z1) * t, h)
                dirs = [(1, 0, 0), (-1, 0, 0)]
            else:
                o = W(x1 + (x2 - x1) * t, cz, h)
                dirs = [(0, -1, 0), (0, 1, 0)]
            for k, d in enumerate(dirs):
                v = nearest(o, d)
                if v is not None:
                    side[k] = min(side[k], v)
        return round(side[0] + side[1], 3)
    return span('x'), span('z')


CHECKS = [
    ('חדר שינה הורים: רוחב', 'G', (2.56, 6.01, 1.70, 5.50), (3.45, None)),
    ('חדר שינה הורים: 565 עד קיר המדרגות', 'G', (2.70, 4.50, 1.60, 7.25), (None, 5.65)),
    ('חדר רחצה הורים', 'G', (0.00, 2.46, 3.47, 5.65), (2.46, 2.18)),
    ('רצועת הארונות (472 כולל הקיר, 150)', 'G', (0.00, 4.62, 6.70, 7.20), (4.62, None)),
    ('ממ"ד / חדר שינה', 'G', (6.26, 10.50, 3.63, 6.38), (4.24, 2.75)),
    ('חדר רחצה כללי', 'G', (7.27, 10.46, 6.61, 8.95), (3.19, 2.34)),
    ('שירותי אורחים', 'G', (3.32, 4.62, 7.35, 9.35), (1.30, None)),
    ('מסדרון', 'G', (4.72, 7.17, 6.70, 8.90), (2.45, None)),
    ('חדר שינה', 'G', (6.12, 10.46, 9.07, 11.87), (4.34, 2.80)),
    ('מבואת כניסה', 'G', (1.38, 5.87, 9.45, 11.30), (4.49, None)),
    ('מטבח, פינת אוכל וסלון', 'G', (0.00, 10.46, 11.99, 16.44), (10.46, 4.45)),
    ('עומק המטבח (506)', 'G', (0.00, 1.38, 11.38, 16.44), (None, 5.06)),
    ('חדר מדרגות', 'G', (0.00, 3.22, 7.35, 9.35), (None, 2.00)),
    ('חדר משחקים', 'B', (2.56, 6.01, -2.15, 1.40), (3.45, 3.55)),
    ('מרחב משפחה, חלק מערבי (397)', 'B', (0.00, 2.40, 3.28, 7.25), (None, 3.97)),
    ('מרחב משפחה, חלק מזרחי (680)', 'B', (5.00, 5.90, 1.60, 8.40), (None, 6.80)),
    ('סטודיו', 'B', (6.25, 10.46, 6.53, 10.64), (4.21, 4.11)),
    ('חדרי רחצה במרתף (280)', 'B', (6.25, 8.26, 3.63, 6.43), (None, 2.80)),
    ('חדר שירות (193)', 'B', (3.32, 4.79, 8.50, 9.35), (None, None)),
    ('מחסן (261 x 221)', 'B', (0.00, 2.61, 9.45, 10.64), (2.61, None)),
]
report = []
for name, lvl, r, plan in CHECKS:
    mx, mz = measure(lvl, *r)
    report.append({'name': name, 'lvl': lvl, 'plan': plan, 'model': (mx, mz)})
garden = 13.96 * (22.10 - 16.69) + 3.0 * (16.69 - 1.06)
report.append({'name': 'גינה פרטית (מ"ר)', 'lvl': 'O', 'plan': (122.38,), 'model': (round(garden, 2),)})
with open(os.path.join(OUT, 'measure.json'), 'w') as f:
    json.dump(report, f, ensure_ascii=False, indent=1)

# ------------------------------------------------------------------ תאורה, מצלמה, רינדור
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(os.environ.get('SAMPLES', '96'))
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
world = bpy.data.worlds.new('w')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.75, 0.82, 0.92, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 4.0
sun.angle = math.radians(1.5)
sun_ob = bpy.data.objects.new('sun', sun)
scene.collection.objects.link(sun_ob)
# שמש של שעה 13:00 ב-21 ביוני (גבוהה, מדרום-מערב), צל קצר שלא מסתיר את התוכנית
el, az = math.radians(70), math.radians(215)
dvec = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))  # Y = צפון
sun_ob.rotation_euler = dvec.to_track_quat('Z', 'Y').to_euler()

cam = bpy.data.cameras.new('cam')
cam.type = 'ORTHO'
cam.sensor_fit = 'VERTICAL'
cam_ob = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(cam_ob)
scene.camera = cam_ob


def show(names_visible):
    for n, ob in OBJ.items():
        ob.hide_render = not any(n.startswith(p) for p in names_visible)


def render_top(fname, x1, x2, z1, z2, px_per_m=60):
    cx, cz = (x1 + x2) / 2, (z1 + z2) / 2
    span_h = z2 - z1
    cam.ortho_scale = span_h
    cam_ob.location = (cx, -cz, 30)
    cam_ob.rotation_euler = (0, 0, 0)
    scene.render.resolution_x = int((x2 - x1) * px_per_m)
    scene.render.resolution_y = int(span_h * px_per_m)
    scene.render.resolution_percentage = 100
    scene.render.filepath = os.path.join(OUT, fname)
    bpy.ops.render.render(write_still=True)
    return {'file': fname, 'x1': x1, 'x2': x2, 'z1': z1, 'z2': z2, 'ppm': px_per_m}


views = {}
if os.environ.get('RENDER', '1') == '1':
    show(['G_walls', 'G_open', 'G_floor', 'G_furn', 'G_fixed', 'G_glass', 'OUT', 'SLAB', 'B_stair'])
    views['ground'] = render_top('top_ground.png', -1.6, 14.6, -2.2, 22.9, 80)
    show(['B_walls', 'B_open', 'B_floor', 'B_furn', 'B_fixed', 'B_glass', 'B_stair'])
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.30, 0.30, 0.31, 1)
    views['basement'] = render_top('top_basement.png', -1.6, 12.6, -2.2, 12.9, 80)
    # מבט אלכסוני מלמעלה על קומת הכניסה, בלי תקרה
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.75, 0.82, 0.92, 1)
    show(['G_walls', 'G_open', 'G_floor', 'G_furn', 'G_fixed', 'G_glass', 'OUT', 'SLAB', 'B_stair'])
    cam.type = 'PERSP'
    cam.lens = 32
    cam.sensor_fit = 'AUTO'
    target = Vector(W(5.4, 9.6, 0.0))
    cam_ob.location = Vector(W(17.5, 27.5, 21.0))
    cam_ob.rotation_euler = (target - cam_ob.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.resolution_x, scene.render.resolution_y = 1800, 1200
    scene.render.filepath = os.path.join(OUT, 'aerial_ground.png')
    bpy.ops.render.render(write_still=True)
    with open(os.path.join(OUT, 'views.json'), 'w') as f:
        json.dump(views, f)

# שמירת קובץ ה-Blender עם הכול גלוי
for ob in OBJ.values():
    ob.hide_render = False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'apartment_250.blend'))
print('DONE', json.dumps(report, ensure_ascii=False))
