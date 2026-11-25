# עיצוב ותאורה פוטוריאליסטיים לדירת הגן (סגנון "מודרני בהיר").
# קלט: apartment_250.blend מ-build_apartment.py (RENDER=0) ותיקיית נכסי Poly Haven מ-fetch_polyhaven.py.
# הרצה: python dress_photoreal.py <base.blend> <assets> <out> [preview|final]
import bpy
import bmesh
import math
import os
import sys
import json
import numpy as np
from mathutils import Vector, Matrix

BASE, A, OUT = sys.argv[-4], sys.argv[-3], sys.argv[-2]
MODE = sys.argv[-1]
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=BASE)
scene = bpy.context.scene
GY, BY, NET = 0.0, -4.10, 3.40
R90 = math.pi / 2
DIMS = json.load(open(f'{A}/tex/dims.json'))


def W(x, z, h):
    return Vector((x, -z, h))


# ------------------------------------------------------------------ ניקוי הרהיטים הפשוטים (נשארים קירות, מטבח, ארונות וכלים סניטריים)
for ob in list(bpy.data.objects):
    if ob.name in ('G_furn', 'B_furn', 'OUT_furn', 'G_furn_glass', 'B_furn_glass', 'ROOF'):
        bpy.data.objects.remove(ob, do_unlink=True)

# ------------------------------------------------------------------ חומרים אמיתיים (PBR) מ-Poly Haven
def tex_nodes(nt, tex, size, proj='BOX'):
    n = nt.nodes
    tc = n.new('ShaderNodeTexCoord')
    mp = n.new('ShaderNodeMapping')
    s = 1.0 / size
    mp.inputs['Scale'].default_value = (s, s, s)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
    out = {}
    for key, cs in (('Diffuse', 'sRGB'), ('Rough', 'Non-Color'), ('nor_gl', 'Non-Color')):
        p = f'{A}/tex/{tex}/{key}.jpg'
        if not os.path.exists(p):
            continue
        im = n.new('ShaderNodeTexImage')
        im.image = bpy.data.images.load(p, check_existing=True)
        im.image.colorspace_settings.name = cs
        im.projection = proj
        im.projection_blend = 0.25
        nt.links.new(mp.outputs['Vector'], im.inputs['Vector'])
        out[key] = im
    return tc, out


def pbr(name, tex, size=None, tint=None, rough=None, rough_mul=1.0, nstr=0.6, planks=None, tiles=None, spec=0.5, coat=0.0):
    """מחליף חומר קיים בשם name. tint: צובע את הטקסטורה (גוונים אמיתיים מהתמונה, צבע לפי העיצוב).
    planks/tiles: (רוחב, גובה, מרווח, צבע מרווח) - קווי קרשים או אריחים בגודל אמיתי."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    outn = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(bsdf.outputs['BSDF'], outn.inputs['Surface'])
    bsdf.inputs['Specular IOR Level'].default_value = spec
    if coat:
        bsdf.inputs['Coat Weight'].default_value = coat
        bsdf.inputs['Coat Roughness'].default_value = 0.08
    size = size or DIMS[tex][0] / 1000.0
    tc, t = tex_nodes(nt, tex, size)
    col = t['Diffuse'].outputs['Color']
    if tint:
        bw = nt.nodes.new('ShaderNodeRGBToBW')
        nt.links.new(col, bw.inputs['Color'])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['To Min'].default_value = 0.78
        mr.inputs['To Max'].default_value = 1.18
        nt.links.new(bw.outputs['Val'], mr.inputs['Value'])
        mul = nt.nodes.new('ShaderNodeMix')
        mul.data_type = 'RGBA'
        mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1.0
        if name == 'deck':   # שקעי הצבע הנכונים של Mix: צבע אמיתי של עץ. בשאר החומרים נשאר הגוון הניטרלי שכבר אושר בצילומים
            mul.inputs[6].default_value = (*tint, 1)
            nt.links.new(mr.outputs['Result'], mul.inputs[7])
            col = mul.outputs[2]
        else:
            mul.inputs['A'].default_value = (*tint, 1)
            nt.links.new(mr.outputs['Result'], mul.inputs['B'])
            col = mul.outputs['Result']
    grid = planks or tiles
    if grid:
        w, h, gap, gcol = grid
        br = nt.nodes.new('ShaderNodeTexBrick')
        br.offset = 0.5 if planks else 0.0
        br.offset_frequency = 2
        br.inputs['Scale'].default_value = 1.0
        br.inputs['Brick Width'].default_value = w
        br.inputs['Row Height'].default_value = h
        br.inputs['Mortar Size'].default_value = gap
        br.inputs['Mortar Smooth'].default_value = 0.1
        br.inputs['Color1'].default_value = (1, 1, 1, 1)
        br.inputs['Color2'].default_value = (0.86, 0.86, 0.86, 1) if planks else (0.97, 0.97, 0.97, 1)
        br.inputs['Bias'].default_value = 0.0
        nt.links.new(tc.outputs['Object'], br.inputs['Vector'])
        var = nt.nodes.new('ShaderNodeMix')
        var.data_type = 'RGBA'
        var.blend_type = 'MULTIPLY'
        var.inputs['Factor'].default_value = 1.0
        nt.links.new(col, var.inputs['A'])
        nt.links.new(br.outputs['Color'], var.inputs['B'])
        mo = nt.nodes.new('ShaderNodeMix')
        mo.data_type = 'RGBA'
        nt.links.new(br.outputs['Fac'], mo.inputs['Factor'])
        nt.links.new(var.outputs['Result'], mo.inputs['A'])
        mo.inputs['B'].default_value = (*gcol, 1)
        col = mo.outputs['Result']
    nt.links.new(col, bsdf.inputs['Base Color'])
    if rough is not None:
        bsdf.inputs['Roughness'].default_value = rough
    elif 'Rough' in t:
        mr = nt.nodes.new('ShaderNodeMath')
        mr.operation = 'MULTIPLY'
        mr.inputs[1].default_value = rough_mul
        nt.links.new(t['Rough'].outputs['Color'], mr.inputs[0])
        nt.links.new(mr.outputs['Value'], bsdf.inputs['Roughness'])
    if 'nor_gl' in t and nstr > 0:
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = nstr
        nt.links.new(t['nor_gl'].outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def flat(name, color, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    return m


# קירות לבנים חמים (לא כחלחלים): לבן שבור עם מרקם טיח עדין
pbr('paint', 'white_plaster_02', 1.0, tint=(0.80, 0.775, 0.73), rough=0.85, nstr=0.12)
pbr('gypsum', 'white_plaster_02', 1.0, tint=(0.83, 0.81, 0.77), rough=0.9, nstr=0.05)
flat('trim', (0.80, 0.78, 0.74), 0.35)                                          # פאנלים ומשקופים
flat('cut', (0.05, 0.05, 0.05), 0.9)
pbr('facade', 'marble_01', 1.5, rough_mul=1.1, nstr=0.5)                       # חיפוי אבן
pbr('concrete', 'concrete_floor_02', 2.0, tint=(0.52, 0.50, 0.47), nstr=0.4)
# רצפות
pbr('p_living', 'white_plaster_02', 2.4, tint=(0.70, 0.68, 0.64), rough=0.18, nstr=0.05, coat=0.25,
    tiles=(1.2, 1.2, 0.0025, (0.45, 0.43, 0.40)))                               # פורצלן 120x120 בהיר, ברק עדין
pbr('p_bedroom', 'oak_veneer_01', 1.83, rough_mul=0.9, nstr=0.3, planks=(1.80, 0.19, 0.0015, (0.10, 0.07, 0.05)))  # פרקט אלון
pbr('p_basement', 'herringbone_parquet', 3.4, rough_mul=0.9, nstr=0.5)          # פרקט אדרה במרתף
pbr('p_bath', 'granite_tile', 2.3, rough_mul=0.7, nstr=0.5)
pbr('p_bathwall', 'long_white_tiles', 1.27, rough_mul=0.6, nstr=0.6)
pbr('p_outdoor', 'large_grey_tiles', 3.0, nstr=0.6)
pbr('deck', 'wood_floor_deck', 1.8, tint=(0.20, 0.12, 0.07), nstr=0.6)
pbr('gravel', 'concrete_floor_02', 1.0, tint=(0.45, 0.43, 0.40), nstr=1.0)
# עץ, אבן ובד
pbr('oak', 'oak_veneer_01', 1.83, rough_mul=0.8, nstr=0.2)
pbr('walnut', 'walnut_veneer', 1.8, rough_mul=0.8, nstr=0.2)
pbr('teak', 'walnut_veneer', 1.8, tint=(0.55, 0.36, 0.20), nstr=0.2)
pbr('quartz', 'white_plaster_02', 1.2, tint=(0.82, 0.81, 0.79), rough=0.12, nstr=0.0, coat=0.3)
flat('lacquer', (0.78, 0.77, 0.74), 0.28)
pbr('linen', 'rough_linen', 0.27, tint=(0.86, 0.85, 0.82), nstr=0.8)
pbr('duvet', 'rough_linen', 0.27, tint=(0.88, 0.87, 0.84), nstr=0.9)
pbr('pillow', 'rough_linen', 0.27, tint=(0.90, 0.89, 0.87), nstr=0.8)
pbr('throw', 'velour_velvet', 0.28, tint=(0.40, 0.33, 0.24), nstr=0.8)
pbr('headboard', 'velour_velvet', 0.28, tint=(0.52, 0.47, 0.40), nstr=0.7)
pbr('fabric', 'rough_linen', 0.27, tint=(0.66, 0.63, 0.58), nstr=0.8)
pbr('fabric_dark', 'rough_linen', 0.27, tint=(0.16, 0.16, 0.17), nstr=0.8)
pbr('sage', 'velour_velvet', 0.28, tint=(0.33, 0.40, 0.30), nstr=0.7)
pbr('rug', 'quatrefoil_jacquard_fabric', 0.56, tint=(0.66, 0.61, 0.53), nstr=0.8)
pbr('rug_dark', 'fabric_pattern_05', 1.0, tint=(0.36, 0.33, 0.30), nstr=0.8)
pbr('towel', 'rough_linen', 0.12, tint=(0.86, 0.84, 0.80), nstr=1.0)
flat('ceramic', (0.88, 0.87, 0.85), 0.08)
flat('black', (0.025, 0.025, 0.028), 0.3, 0.8)
flat('chrome', (0.8, 0.8, 0.8), 0.08, 1.0)
flat('brass', (0.75, 0.55, 0.28), 0.2, 1.0)
flat('mirror', (0.92, 0.92, 0.92), 0.01, 1.0)
flat('screen', (0.005, 0.005, 0.006), 0.08)
flat('plate', (0.92, 0.91, 0.89), 0.06)


# זכוכית: שקופה עם השתקפות לפי זווית (Fresnel), והצל של השמש עובר דרכה
def glass_mat(name, tint=(0.9, 0.97, 0.97)):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    mix = nt.nodes.new('ShaderNodeMixShader')
    fr = nt.nodes.new('ShaderNodeFresnel')
    fr.inputs['IOR'].default_value = 1.52
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    tr.inputs['Color'].default_value = (*tint, 1)
    gl = nt.nodes.new('ShaderNodeBsdfGlossy')
    gl.inputs['Roughness'].default_value = 0.01
    nt.links.new(fr.outputs['Fac'], mix.inputs['Fac'])
    nt.links.new(tr.outputs['BSDF'], mix.inputs[1])
    nt.links.new(gl.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], o.inputs['Surface'])
    return m


glass_mat('glass', (0.985, 0.995, 0.995))
glass_mat('drinkglass', (0.95, 0.98, 0.98))

# ------------------------------------------------------------------ גאומטריה רכה (כריות, שמיכות, מזרנים)
COL = bpy.data.collections.new('Dressing')
scene.collection.children.link(COL)


def mesh_obj(name, bm, mat):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(bpy.data.materials[mat])
    COL.objects.link(ob)
    return ob


def soft(name, w, h, d, x, z, base, rot=0.0, mat='pillow', bevel=0.35, cast=0.25, sub=2, wrinkle=0.0, tilt=0.0):
    """תיבה רכה ונפוחה: Bevel + Subdivision + Cast לכדור. w=רוחב (x מקומי), h=גובה, d=עומק."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    ob = mesh_obj(name, bm, mat)
    ob.scale = (w, d, h)
    ob.location = W(x, z, base + h / 2)
    ob.rotation_euler = (tilt, 0, rot)
    b = ob.modifiers.new('bevel', 'BEVEL')
    b.width = bevel * 0.5
    b.segments = 3
    b.limit_method = 'NONE'
    s = ob.modifiers.new('sub', 'SUBSURF')
    s.levels = s.render_levels = sub
    c = ob.modifiers.new('cast', 'CAST')
    c.factor = cast
    c.cast_type = 'SPHERE'
    if wrinkle:
        s2 = ob.modifiers.new('sub2', 'SUBSURF')
        s2.levels = s2.render_levels = 1
        t = bpy.data.textures.new(name + '_n', 'CLOUDS')
        t.noise_scale = 0.08
        dsp = ob.modifiers.new('wr', 'DISPLACE')
        dsp.texture = t
        dsp.strength = wrinkle
        dsp.texture_coords = 'GLOBAL'
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def hard(name, w, h, d, x, z, base, rot=0.0, mat='oak', bevel=0.004):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    ob = mesh_obj(name, bm, mat)
    ob.scale = (w, d, h)
    ob.location = W(x, z, base + h / 2)
    ob.rotation_euler = (0, 0, rot)
    if bevel:
        b = ob.modifiers.new('bevel', 'BEVEL')
        b.width = bevel
        b.segments = 2
        b.limit_method = 'NONE'
        b.affect = 'EDGES'
    return ob


def cyl(name, r, h, x, z, base, mat, n=32, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r2 if r2 is not None else r, radius2=r, depth=h)
    ob = mesh_obj(name, bm, mat)
    ob.location = W(x, z, base + h / 2)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def lw(rot, lx, lz):
    """מקומי -> עולם (באותה מוסכמה של הסיור: חזית +z, rot מסובב את +z לכיוון +x)."""
    c, s = math.cos(rot), math.sin(rot)
    return lx * c + lz * s, -lx * s + lz * c


def bed(tag, x, z, base, rot, w, l):
    """מיטה מוצעת: בסיס עץ, מזרן, שמיכת פוך נפוחה, קיפול עליון, 4 כריות ושמיכת קישוט."""
    P = lambda lx, lz: (x + lw(rot, lx, lz)[0], z + lw(rot, lx, lz)[1])
    hard(tag + '_base', w + 0.08, 0.30, l + 0.04, x, z, base, rot, 'oak', 0.01)
    soft(tag + '_mattress', w, 0.24, l - 0.04, *P(0, 0.01), base + 0.28, rot, 'linen', 0.12, 0.02, 2)
    soft(tag + '_duvet', w + 0.10, 0.11, l * 0.70, *P(0, l * 0.16), base + 0.49, rot, 'duvet', 0.5, 0.06, 3, wrinkle=0.012)
    soft(tag + '_fold', w + 0.10, 0.08, 0.26, *P(0, -l * 0.20), base + 0.51, rot, 'duvet', 0.6, 0.08, 3, wrinkle=0.008)
    soft(tag + '_throw', w + 0.16, 0.05, 0.46, *P(0, l * 0.36), base + 0.585, rot, 'throw', 0.5, 0.05, 2, wrinkle=0.006)
    pw = min(0.62, (w - 0.08) / 2)
    for i, lx in enumerate((-w / 4, w / 4)):
        soft(f'{tag}_p{i}', pw, 0.17, 0.44, *P(lx, -l / 2 + 0.30), base + 0.50, rot, 'pillow', 0.9, 0.45, 3, tilt=0.18)
        soft(f'{tag}_q{i}', pw * 0.82, 0.15, 0.36, *P(lx, -l / 2 + 0.50), base + 0.56, rot, 'pillow' if i else 'throw', 0.9, 0.45, 3, tilt=0.35)
    soft(tag + '_head', w + 0.32, 1.20, 0.10, *P(0, -l / 2 - 0.06), base, rot, 'headboard', 0.25, 0.04, 2)


def towel(name, x, z, base, rot, w=0.5, h=0.7):
    soft(name, w, h, 0.045, x, z, base, rot, 'towel', 0.4, 0.05, 2, wrinkle=0.004)


def frame_photo(name, img, x, z, base, rot, w, h, mat_frame='black', mat_pass=(0.92, 0.91, 0.88)):
    """תמונה אמיתית במסגרת עם פספרטו. rot: הכיוון שהתמונה פונה אליו (0 = דרום)."""
    hard(name + '_fr', w, h, 0.03, x, z, base, rot, mat_frame, 0.003)
    P = lambda lx, lz: (x + lw(rot, lx, lz)[0], z + lw(rot, lx, lz)[1])
    m = bpy.data.materials.new(name + '_pass')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*mat_pass, 1)
    hard(name + '_ps', w - 0.04, h - 0.04, 0.03, *P(0, 0.003), base + 0.02, rot, m.name, 0)
    pm = bpy.data.materials.new(name + '_img')
    pm.use_nodes = True
    nt = pm.node_tree
    ti = nt.nodes.new('ShaderNodeTexImage')
    ti.image = bpy.data.images.load(img, check_existing=True)
    nt.links.new(ti.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.35
    iw, ih = w - 0.16, h - 0.16
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for lp in f.loops:
            lp[uv].uv = (lp.vert.co.x + 0.5, lp.vert.co.y + 0.5)
    ob = mesh_obj(name + '_im', bm, pm.name)
    ob.scale = (iw, ih, 1)
    lx, lz = P(0, 0.019)
    ob.location = W(lx, lz, base + h / 2)
    ob.rotation_euler = (R90, 0, rot)


# הכנת הדפסים: חיתוך אמצע הפנורמה (בלי עיוות) ליחס 3:2 או 2:3
from PIL import Image  # noqa: E402
PH = {}
for fn in sorted(os.listdir(f'{A}/photos')):
    if fn.startswith('print_'):
        continue
    im = Image.open(f'{A}/photos/{fn}').convert('RGB')
    W_, H_ = im.size
    land = im.crop((int(W_ * 0.30), int(H_ * 0.28), int(W_ * 0.30) + int(H_ * 0.66), int(H_ * 0.28) + int(H_ * 0.44)))
    port = im.crop((int(W_ * 0.42), int(H_ * 0.22), int(W_ * 0.42) + int(H_ * 0.34), int(H_ * 0.22) + int(H_ * 0.51)))
    k = fn.split('.')[0]
    land.save(f'{A}/photos/print_{k}_l.jpg', quality=92)
    port.save(f'{A}/photos/print_{k}_p.jpg', quality=92)
    PH[k] = (f'{A}/photos/print_{k}_l.jpg', f'{A}/photos/print_{k}_p.jpg')

# ------------------------------------------------------------------ רהיטים מ-Poly Haven (מופעים של אוסף, חסכוני בזיכרון)
CACHE = {}


def model(name):
    if name in CACHE:
        return CACHE[name]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'{A}/models/{name}/{name}.gltf')
    objs = [o for o in bpy.data.objects if o not in before]
    col = bpy.data.collections.new('M_' + name)
    for o in objs:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        col.objects.link(o)
    bpy.context.view_layer.update()
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            v = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, v))
            mx = Vector(map(max, mx, v))
    col.instance_offset = ((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)
    CACHE[name] = (col, mx - mn)
    return CACHE[name]


def put(name, x, z, base, rot=0.0, width=None, height=None, scale=1.0, yaw_fix=0.0):
    """מציב מודל: מרכז הבסיס ב-(x,z), על הרצפה. width/height: קנה מידה לפי רוחב או גובה אמיתיים."""
    col, size = model(name)
    s = scale
    if width:
        s = width / max(size.x, 1e-6)
    if height:
        s = height / max(size.z, 1e-6)
    e = bpy.data.objects.new(f'{name}_inst', None)
    e.instance_type = 'COLLECTION'
    e.instance_collection = col
    e.location = W(x, z, base)
    e.rotation_euler = (0, 0, rot + yaw_fix)
    e.scale = (s, s, s)
    COL.objects.link(e)
    return e


GF = 'G'
# ================================================================== קומת כניסה
# --- סלון: ספה עם הגב לקיר הדרומי המלא, כורסאות, שולחן קפה, שטיח, טלוויזיה, צמחים ותמונה
hard('rug_living', 3.1, 0.012, 2.4, 8.0, 14.35, GY, 0, 'rug', 0.002)
put('sofa_03', 7.95, 15.92, GY, math.pi, width=2.6)
put('throw_pillows_01', 7.95, 15.70, GY + 0.42, math.pi, width=1.9)
put('modern_arm_chair_01', 9.75, 13.25, GY, -R90 - 0.35, width=0.80)
put('modern_arm_chair_01', 6.45, 13.35, GY, R90 + 0.35, width=0.80)
put('coffee_table_round_01', 8.0, 14.25, GY, 0, width=1.0)
put('decorative_book_set_01' if os.path.exists(f'{A}/models/decorative_book_set_01') else 'book_encyclopedia_set_01', 8.15, 14.2, GY + 0.42, 0.3, width=0.28)
put('ceramic_vase_02', 7.85, 14.3, GY + 0.42, 0, height=0.22)
hard('media', 2.6, 0.42, 0.45, 8.2, 12.22, GY + 0.20, 0, 'walnut', 0.006)
hard('tv_living', 1.45, 0.83, 0.035, 8.2, 12.02, GY + 1.0, 0, 'screen', 0.004)          # מסך שטוח על הקיר
put('ceramic_vase_01', 7.05, 12.2, GY + 0.62, 0, height=0.32)
put('decorative_book_set_01' if os.path.exists(f'{A}/models/decorative_book_set_01') else 'book_encyclopedia_set_01', 9.3, 12.2, GY + 0.62, 0, width=0.4)
put('pachira_aquatica_01', 6.30, 15.95, GY, 0, height=1.75)
put('potted_plant_02', 10.05, 12.45, GY, 0, height=1.3)
put('side_table_01', 9.55, 15.75, GY, 0, height=0.5)
frame_photo('art_living', PH['venice_sunset'][0], 7.95, 16.42, GY + 1.45, math.pi, 1.5, 1.0)
# --- פינת אוכל: שולחן אלון ערוך ל-6, כיסאות אמיתיים, גוף תאורה תלוי
hard('dining_top', 2.4, 0.045, 1.0, 4.55, 14.15, GY + 0.715, 0, 'oak', 0.004)
for dx in (-0.85, 0.85):
    hard(f'dining_leg{dx}', 0.08, 0.715, 0.75, 4.55 + dx, 14.15, GY, 0, 'black', 0.002)
for i, dx in enumerate((-0.75, 0, 0.75)):
    put('dining_chair_02', 4.55 + dx, 13.42, GY, 0, height=0.82)
    put('dining_chair_02', 4.55 + dx, 14.88, GY, math.pi, height=0.82)
    for side, zz in ((0, 13.85), (1, 14.45)):
        hard(f'mat{i}{side}', 0.42, 0.004, 0.32, 4.55 + dx, zz, GY + 0.76, 0, 'linen', 0)
        cyl(f'plate{i}{side}', 0.135, 0.018, 4.55 + dx, zz, GY + 0.764, 'plate', 40, r2=0.11)
        cyl(f'plt2{i}{side}', 0.10, 0.015, 4.55 + dx, zz, GY + 0.782, 'plate', 40, r2=0.08)
        gx = 4.55 + dx + 0.16
        gz = zz + (-0.17 if side == 0 else 0.17)
        cyl(f'glass{i}{side}', 0.035, 0.13, gx, gz, GY + 0.76, 'drinkglass', 24, r2=0.03)
        hard(f'fork{i}{side}', 0.015, 0.003, 0.19, 4.55 + dx - 0.17, zz, GY + 0.764, 0, 'chrome', 0)
        hard(f'knife{i}{side}', 0.015, 0.003, 0.20, 4.55 + dx + 0.17, zz, GY + 0.764, 0, 'chrome', 0)
hard('runner', 0.36, 0.003, 1.9, 4.55, 14.15, GY + 0.76, R90, 'throw', 0)
put('ceramic_vase_03', 4.55, 14.15, GY + 0.765, 0, height=0.28)
for dx in (-0.6, 0.6):
    put('modern_ceiling_lamp_01', 4.55 + dx, 14.15, NET - 0.75, 0, height=0.75)
# --- מטבח: כיסאות בר, קערת פירות, קרש חיתוך, קנקן, בקבוקי יין, סט תה
for zz in (13.4, 14.1, 14.8):
    put('bar_chair_round_01', 3.05, zz, GY, -R90, height=0.95)
put('wooden_bowl_01', 2.30, 13.75, GY + 0.92, 0, width=0.32)
for i, (dx, dz) in enumerate(((-0.06, -0.04), (0.05, 0.02), (0.0, 0.07))):
    put('food_apple_01', 2.30 + dx, 13.75 + dz, GY + 0.95, i, height=0.075)
put('lemon', 2.36, 13.70, GY + 0.95, 0, height=0.06)
put('wooden_cutting_board', 0.30, 13.95, GY + 0.92, R90, width=0.45)
put('jug_01', 0.25, 14.25, GY + 0.92, 0, height=0.24)
put('wine_bottles_01', 0.25, 12.55, GY + 0.92, 0, height=0.33)
put('tea_set_01', 2.30, 14.6, GY + 0.92, 0.4, width=0.45)
put('calathea_orbifolia_01', 0.30, 15.35, GY + 0.92, 0, height=0.45)
# --- מבואה
hard('bench', 1.2, 0.42, 0.40, 3.97, 9.66, GY, 0, 'oak', 0.006)
soft('bench_cush', 1.1, 0.06, 0.36, 3.97, 9.66, GY + 0.42, 0, 'fabric', 0.5, 0.05)
frame_photo('art_foyer', PH['misty_pines'][0], 3.97, 9.47, GY + 1.25, 0, 1.0, 0.7)
put('potted_plant_04', 1.72, 11.15, GY, 0, height=1.4)
put('wicker_basket_01', 5.35, 9.72, GY, 0, height=0.35)
# --- יחידת הורים (החדר 3.45 רוחב; המיטה עם הראש לקיר המערבי, חלון לחצר האנגלית במזרח)
bed('mbed', 3.67, 3.35, GY, R90, 1.8, 2.0)
for zz in (2.08, 4.62):
    put('ClassicNightstand_01', 2.84, zz, GY, R90, height=0.55)
    cyl(f'lampb{zz}', 0.06, 0.30, 2.84, zz, GY + 0.55, 'ceramic', 32, r2=0.08)
    cyl(f'lamps{zz}', 0.13, 0.20, 2.84, zz, GY + 0.85, 'linen', 32, r2=0.16)
hard('rug_master', 2.4, 0.012, 3.0, 4.3, 3.35, GY, 0, 'rug_dark', 0.002)
put('Ottoman_01', 5.0, 3.35, GY, R90, width=0.9)
put('mid_century_lounge_chair', 5.3, 2.2, GY, -R90 + 0.5, width=0.8)
put('potted_plant_01', 5.65, 5.2, GY, 0, height=1.2)
frame_photo('art_master', PH['kloofendal_48d_partly_cloudy'][0], 2.575, 3.35, GY + 1.35, R90, 1.4, 0.95)
frame_photo('art_master2', PH['misty_pines'][0], 4.0, 1.615, GY + 1.4, 0, 0.9, 0.65)
put('standing_picture_frame_01', 2.84, 4.6, GY + 0.56, R90, height=0.2)
# רצועת הארונות: שטיח רץ
hard('rug_dress', 3.4, 0.01, 0.7, 2.4, 6.15, GY, 0, 'rug', 0.002)
# חדר רחצה הורים
towel('tw1', 1.20, 3.535, GY + 0.95, 0, 0.5, 0.6)
put('ceramic_vase_04' if os.path.exists(f'{A}/models/ceramic_vase_04') else 'ceramic_vase_01', 2.25, 3.75, GY + 0.87, 0, height=0.18)
# ממ"ד כחדר עבודה (הדלת נפתחת פנימה: הספה בקיר המזרחי)
hard('mamad_desk', 1.5, 0.035, 0.65, 7.8, 3.96, GY + 0.72, 0, 'oak', 0.004)
for dx in (-0.7, 0.7):
    hard(f'mdl{dx}', 0.04, 0.72, 0.55, 7.8 + dx, 3.96, GY, 0, 'black', 0.002)
put('GreenChair_01', 7.8, 4.58, GY, math.pi, height=0.85)
put('desk_lamp_arm_01', 8.35, 3.83, GY + 0.755, 0.6, height=0.45)
put('book_encyclopedia_set_01', 7.4, 3.80, GY + 0.755, 0, width=0.35)
soft('mamad_sofa', 1.7, 0.42, 0.9, 9.98, 5.0, GY, -R90, 'fabric', 0.3, 0.04)
soft('mamad_back', 1.7, 0.45, 0.2, 10.36, 5.0, GY + 0.35, -R90, 'fabric', 0.4, 0.05)
put('throw_pillows_01', 9.95, 5.0, GY + 0.42, -R90, width=1.2)
put('potted_plant_02', 6.62, 3.98, GY, 0, height=1.1)
frame_photo('art_mamad', PH['golden_bay'][0], 6.275, 4.6, GY + 1.35, R90, 1.2, 0.8)
# חדר רחצה כללי
towel('tw2', 9.62, 8.925, GY + 1.05, math.pi, 0.5, 0.7)
put('calathea_orbifolia_01', 7.75, 8.75, GY + 0.87, 0, height=0.35)
# חדר שינה 2
bed('bed2', 7.21, 10.63, GY, R90, 1.6, 2.0)
put('ClassicNightstand_01', 6.40, 11.61, GY, R90, height=0.55)
hard('desk2', 1.2, 0.035, 0.6, 10.16, 9.93, GY + 0.72, -R90, 'oak', 0.004)
put('GreenChair_01', 9.55, 9.93, GY, R90, height=0.85)
frame_photo('art_bed2', PH['lake_pier'][1], 6.135, 10.63, GY + 1.35, R90, 0.7, 1.0)
hard('rug_bed2', 1.8, 0.012, 2.6, 8.3, 10.53, GY, 0, 'rug', 0.002)
# שירותי אורחים
put('ceramic_vase_01', 4.4, 8.15, GY + 0.87, 0, height=0.16)

# ================================================================== מרתף
# מרחב משפחה: ספה לקיר המערבי מול טלוויזיה, פינת קריאה ליד הוויטרינה לחצר האנגלית, מיני בר בגומחה
hard('rug_family', 3.0, 0.012, 2.6, 2.7, 5.75, BY, 0, 'rug', 0.002)
put('sofa_02', 0.95, 5.75, BY, R90, width=2.4)
put('coffee_table_round_01', 2.55, 5.75, BY, 0, width=0.9)
hard('media_b', 2.2, 0.42, 0.42, 5.92, 5.75, BY + 0.2, -R90, 'walnut', 0.006)
hard('tv_family', 1.60, 0.92, 0.035, 6.12, 5.75, BY + 1.0, -R90, 'screen', 0.004)
put('potted_plant_01', 0.45, 6.85, BY, 0, height=1.3)
put('mid_century_lounge_chair', 4.35, 2.3, BY, -R90 + 0.6, width=0.8)
put('side_table_tall_01', 4.9, 2.95, BY, 0, height=0.6)
for zz in (2.0, 2.7):
    put('bar_chair_round_01', 3.55, zz, BY, R90, height=0.95)
put('wine_bottles_01', 2.75, 2.92, BY + 0.92, 0, height=0.33)
frame_photo('art_family', PH['spaichingen_hill'][0], 0.015, 5.75, BY + 1.3, R90, 1.6, 1.05)
# חדר משחקים
hard('rug_play', 2.6, 0.012, 2.6, 4.3, -0.5, BY, 0, 'rug', 0.002)
hard('kids_table', 0.9, 0.03, 0.6, 4.3, -0.6, BY + 0.5, 0, 'oak', 0.004)
for i, (cx, cz, m) in enumerate(((3.9, -1.1, 'sage'), (4.7, -1.1, 'throw'), (3.9, -0.1, 'headboard'), (4.7, -0.1, 'sage'))):
    hard(f'kc{i}', 0.32, 0.30, 0.32, cx, cz, BY, 0, 'oak', 0.004)
    soft(f'kcs{i}', 0.32, 0.05, 0.32, cx, cz, BY + 0.30, 0, m, 0.5, 0.05)
soft('beanbag1', 0.75, 0.45, 0.75, 5.4, -1.7, BY, 0, 'sage', 1.0, 0.8, 3, wrinkle=0.01)
soft('beanbag2', 0.75, 0.45, 0.75, 3.15, 0.85, BY, 0, 'throw', 1.0, 0.8, 3, wrinkle=0.01)
put('wicker_basket_01', 2.85, -1.85, BY, 0, height=0.38)
put('Ottoman_01', 4.5, 0.95, BY, 0, width=0.6)
frame_photo('art_play', PH['cape_hill'][0], 2.575, -0.4, BY + 1.3, R90, 1.2, 0.8)
# סטודיו
hard('studio_desk', 1.8, 0.035, 0.8, 10.06, 8.58, BY + 0.72, -R90, 'oak', 0.004)
for dz in (-0.8, 0.8):
    hard(f'sdl{dz}', 0.7, 0.72, 0.04, 10.06, 8.58 + dz, BY, 0, 'black', 0.002)
put('GreenChair_01', 9.4, 8.58, BY, R90, height=0.85)
put('desk_lamp_arm_01', 10.25, 7.88, BY + 0.755, 0, height=0.45)
soft('studio_sofa', 2.0, 0.42, 0.9, 8.3, 7.02, BY, 0, 'fabric', 0.3, 0.04)
soft('studio_back', 2.0, 0.45, 0.2, 8.3, 6.66, BY + 0.35, 0, 'fabric', 0.4, 0.05)
put('throw_pillows_01', 8.3, 7.0, BY + 0.42, 0, width=1.3)
put('coffee_table_round_01', 8.3, 8.2, BY, 0, width=0.8)
put('pachira_aquatica_01', 6.65, 10.25, BY, 0, height=1.6)
hard('studio_shelf', 2.4, 2.2, 0.35, 8.2, 10.46, BY, math.pi, 'oak', 0.004)
for i, xx in enumerate((7.4, 8.2, 9.0)):
    for j, hh in enumerate((0.5, 1.1, 1.7)):
        if (i + j) % 2 == 0:
            put('book_encyclopedia_set_01', xx, 10.40, BY + hh, math.pi, width=0.45)
        else:
            put('ceramic_vase_02', xx, 10.40, BY + hh, 0, height=0.22)
hard('rug_studio', 2.6, 0.012, 2.0, 8.3, 8.1, BY, 0, 'rug_dark', 0.002)
frame_photo('art_studio', PH['rosendal_plains_2'][0], 8.3, 6.545, BY + 1.45, 0, 1.6, 1.0)
# חדרי רחצה במרתף
towel('tw3', 6.6, 3.655, BY + 1.0, 0)
towel('tw4', 8.95, 6.405, BY + 1.0, math.pi)

# ================================================================== חוץ: דק, גינה, עצים מעבר לגדר
put('outdoor_table_chair_set_01', 3.2, 18.25, GY, 0, width=2.2)
soft('lounge_base', 2.6, 0.30, 0.9, 9.9, 18.2, GY, -R90, 'teak', 0.05, 0.0, 1)
soft('lounge_seat', 2.5, 0.14, 0.78, 9.85, 18.2, GY + 0.30, -R90, 'cushion' if 'cushion' in bpy.data.materials else 'linen', 0.5, 0.06)
soft('lounge_back', 2.5, 0.40, 0.18, 10.25, 18.2, GY + 0.40, -R90, 'linen', 0.5, 0.08)
put('throw_pillows_01', 9.95, 18.2, GY + 0.45, -R90, width=1.6)
put('coffee_table_round_01', 8.75, 18.2, GY, 0, width=0.8)
for i, x in enumerate((4.6, 5.6)):
    soft(f'sunbed{i}', 0.7, 0.30, 1.95, x, 21.0, GY, 0, 'teak', 0.05, 0, 1)
    soft(f'sunbedc{i}', 0.66, 0.08, 1.85, x, 21.0, GY + 0.30, 0, 'linen', 0.5, 0.05)
for x, z, nm, hgt in ((0.6, 21.6, 'island_tree_01', 4.5), (12.6, 20.6, 'jacaranda_tree', 5.5), (12.9, 13.0, 'island_tree_01', 4.0),
                      (-3.0, 14.0, 'jacaranda_tree', 7.0), (16.5, 8.0, 'island_tree_01', 6.0), (6.0, 26.0, 'jacaranda_tree', 7.5),
                      (17.0, 22.0, 'island_tree_01', 6.5), (-2.5, 24.0, 'island_tree_01', 6.0)):
    put(nm, x, z, GY, x * 0.7, height=hgt)
for i, (x, z) in enumerate(((0.3, 22.8), (3.0, 22.9), (8.0, 22.9), (11.0, 22.8), (14.3, 16.0), (14.3, 6.0), (14.3, 11.0))):
    put(('shrub_01', 'shrub_02', 'shrub_04')[i % 3], x, z, GY, i, height=1.6)
put('planter_box_01', 10.3, 16.95, GY, 0, width=0.9)
put('potted_plant_02', 0.3, 16.95, GY, 0, height=1.0)
# חצר אנגלית
put('island_tree_01', 9.2, 0.5, BY + 0.55, 0, height=3.2)
put('shrub_02', 10.2, -0.05, BY, 0, height=1.2)
put('shrub_01', 10.2, 2.7, BY, 0, height=1.3)

# ------------------------------------------------------------------ אור: שמש של אחר הצהריים + שמיים ונוף עיר אמיתי (HDRI)
world = bpy.data.worlds.get('w') or bpy.data.worlds.new('w')
scene.world = world
world.use_nodes = True
nt = world.node_tree
nt.nodes.clear()
tc = nt.nodes.new('ShaderNodeTexCoord')
mp = nt.nodes.new('ShaderNodeMapping')
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(f'{A}/hdri/sunset_jhbcentral.hdr')
bg = nt.nodes.new('ShaderNodeBackground')
bg.inputs['Strength'].default_value = 1.6
outw = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
nt.links.new(env.outputs['Color'], bg.inputs['Color'])
nt.links.new(bg.outputs['Background'], outw.inputs['Surface'])
# כיוון השמש בתמונה: הפיקסל הבהיר ביותר
img = env.image
px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32)
img.pixels.foreach_get(px)
lum = px.reshape(img.size[1], img.size[0], 4)[..., :3].sum(axis=2)
vy, ux = np.unravel_index(np.argmax(lum), lum.shape)
u, v = ux / img.size[0], vy / img.size[1]
theta_sun = (0.5 - u) * 2 * math.pi                       # Blender: u=0.5 הוא +X
# שמש אחר הצהריים: 23 בנובמבר 15:15 בישראל, גובה ~20°, אזימוט ~232° (דרום-מערב). צפון = +Y
AZ, EL = math.radians(232), math.radians(20)
theta_want = math.atan2(math.cos(AZ), math.sin(AZ))
mp.inputs['Rotation'].default_value = (0, 0, theta_sun - theta_want)
sun = bpy.data.lights.new('sun_pm', 'SUN')
sun.energy = 4.5
sun.angle = math.radians(1.2)                              # צללים רכים
sun.color = (1.0, 0.80, 0.60)
so = bpy.data.objects.new('sun_pm', sun)
scene.collection.objects.link(so)
d = Vector((math.sin(AZ) * math.cos(EL), math.cos(AZ) * math.cos(EL), math.sin(EL)))
so.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()

# ------------------------------------------------------------------ תאורה פנימית (כמו בצילום נדל"ן: האורות דולקים)
ROOM_LIGHTS = [  # x1, x2, z1, z2, רמה
    (0.0, 10.46, 11.99, 16.44, 'G'), (1.38, 5.87, 9.45, 11.99, 'G'), (4.72, 7.17, 6.61, 8.95, 'G'), (2.56, 6.01, 1.60, 5.75, 'G'),
    (0.0, 2.46, 3.47, 5.65, 'G'), (0.0, 4.62, 5.75, 7.25, 'G'), (6.26, 10.50, 3.63, 6.38, 'G'), (7.27, 10.46, 6.61, 8.95, 'G'),
    (6.12, 10.46, 9.07, 11.87, 'G'), (3.32, 4.62, 7.35, 9.35, 'G'), (0.0, 6.15, 3.28, 7.25, 'B'), (2.56, 6.01, 1.60, 3.28, 'B'),
    (2.56, 6.01, -2.15, 1.40, 'B'), (6.25, 10.46, 6.53, 10.64, 'B'), (6.25, 8.26, 3.63, 6.43, 'B'), (8.40, 10.46, 3.63, 6.43, 'B'),
    (3.22, 6.15, 7.25, 8.40, 'B'), (2.71, 6.15, 9.45, 10.64, 'B'), (3.32, 4.79, 8.50, 9.35, 'B'),
]
for i, (x1, x2, z1, z2, lvl) in enumerate(ROOM_LIGHTS):
    area = (x2 - x1) * (z2 - z1)
    li = bpy.data.lights.new(f'room{i}', 'AREA')
    li.shape = 'RECTANGLE'
    li.size, li.size_y = (x2 - x1) * 0.6, (z2 - z1) * 0.6
    li.energy = 14 * area
    li.color = (1.0, 0.86, 0.72)                     # 3000K חם
    lo = bpy.data.objects.new(f'room{i}', li)
    lo.location = W((x1 + x2) / 2, (z1 + z2) / 2, (BY if lvl == 'B' else GY) + NET - 0.03)
    scene.collection.objects.link(lo)
for i, (x, z) in enumerate(((2.84, 2.08), (2.84, 4.62), (6.40, 11.61))):   # מנורות לילה דולקות
    li = bpy.data.lights.new(f'lamp{i}', 'POINT')
    li.energy = 18
    li.shadow_soft_size = 0.08
    li.color = (1.0, 0.78, 0.55)
    lo = bpy.data.objects.new(f'lamp{i}', li)
    lo.location = W(x, z, GY + 0.95)
    scene.collection.objects.link(lo)

# ------------------------------------------------------------------ מצלמות: צלם נדל"ן (גובה עיניים 1.45, מצלמה ישרה, עדשה רחבה 17 מ"מ)
CAMS = [
    ('living', 'סלון', 'G', (3.3, 12.35), (9.8, 16.0)),
    ('kitchen', 'מטבח ופינת אוכל', 'G', (6.3, 12.5), (0.4, 14.2)),
    ('foyer', 'מבואת כניסה', 'G', (5.3, 9.75), (2.0, 16.4)),
    ('master', 'חדר שינה הורים', 'G', (5.7, 5.5), (2.7, 2.0)),
    ('mbath', 'חדר רחצה הורים', 'G', (1.75, 5.5), (1.3, 3.47)),
    ('dress', 'חדר ארונות', 'G', (5.6, 6.2), (0.2, 6.35)),
    ('mamad', 'ממ"ד / חדר עבודה', 'G', (6.6, 6.2), (10.3, 3.8)),
    ('bath', 'חדר רחצה', 'G', (10.2, 7.75), (7.3, 7.95)),
    ('bed2', 'חדר שינה', 'G', (9.30, 9.30), (6.2, 11.45)),
    ('garden', 'דק וגינה', 'G', (10.0, 22.0), (3.5, 16.2)),
    ('family', 'מרחב משפחה', 'B', (5.8, 7.0), (0.3, 4.2)),
    ('bar', 'פינת קריאה ומיני בר', 'B', (3.3, 4.6), (4.6, 1.6)),
    ('play', 'חדר משחקים', 'B', (2.85, 1.15), (6.0, -1.7)),
    ('studio', 'סטודיו', 'B', (6.6, 9.75), (10.3, 6.7)),
    ('bbath', 'חדר רחצה במרתף', 'B', (9.9, 6.2), (9.2, 3.63)),
]
for key, _, lvl, (cx, cz), (tx, tz) in CAMS:
    cam = bpy.data.cameras.new('cam_' + key)
    cam.lens = 22 if key == 'garden' else 17   # בחוץ פחות רחב, בלי עיוות של הרהיטים בקצה
    cam.sensor_width = 36
    cam.clip_start = 0.05
    co = bpy.data.objects.new('cam_' + key, cam)
    scene.collection.objects.link(co)
    fl = BY if lvl == 'B' else GY
    co.location = W(cx, cz, fl + (1.6 if key == 'garden' else 1.45))
    dx, dy = tx - cx, -(tz - cz)
    co.rotation_euler = (R90, 0, math.atan2(-dx, dy))  # ישר לגמרי: בלי הטיה ובלי גלגול

# ------------------------------------------------------------------ רינדור
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 8
scene.cycles.diffuse_bounces = 4
scene.cycles.glossy_bounces = 3
scene.cycles.transparent_max_bounces = 12
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 1.0
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 1.1
for ob in bpy.data.objects:          # תקרות וגג גלויים בצילומי פנים; כנפי דלתות פנים מוסתרות (כמו דלת פתוחה עד הסוף)
    ob.hide_render = ob.name.endswith('_leaf')

if MODE == 'preview':
    scene.cycles.samples = 24
    scene.render.resolution_x, scene.render.resolution_y = 480, 320
else:
    scene.cycles.samples = int(os.environ.get('SAMPLES', '160'))
    scene.cycles.adaptive_threshold = 0.02
    scene.render.resolution_x, scene.render.resolution_y = 1800, 1200
scene.render.resolution_percentage = 100
only = os.environ.get('ONLY')
for key, *_ in CAMS:
    if only and key not in only.split(','):
        continue
    scene.camera = bpy.data.objects['cam_' + key]
    scene.view_settings.exposure = 0.4 if key == 'garden' else 0.9
    scene.render.filepath = os.path.join(OUT, f'{MODE}_{key}.png')
    bpy.ops.render.render(write_still=True)
json.dump([(k, n) for k, n, *_ in CAMS], open(os.path.join(OUT, 'cams.json'), 'w'), ensure_ascii=False)

# ------------------------------------------------------------------ מבט מלמעלה בלי תקרה (פוטוריאליסטי), שתי הקומות
if MODE == 'final' and os.environ.get('TOP', '1') == '1':
    so.rotation_euler = Vector((math.sin(math.radians(200)) * math.cos(math.radians(65)), math.cos(math.radians(200)) * math.cos(math.radians(65)),
                               math.sin(math.radians(65)))).to_track_quat('Z', 'Y').to_euler()
    for li in bpy.data.lights:
        if li.type in ('AREA', 'POINT'):
            li.energy *= 0.4
    topcam = bpy.data.cameras.new('top')
    topcam.type = 'ORTHO'
    topcam.sensor_fit = 'VERTICAL'
    tco = bpy.data.objects.new('top', topcam)
    scene.collection.objects.link(tco)
    scene.camera = tco
    scene.view_settings.exposure = 0.3
    scene.cycles.samples = 64
    views = {}
    HIDE_ALWAYS = ('G_ceil', 'B_ceil', 'ROOFSLAB', 'UPPER', 'UPPER_glass')
    for lvl, (x1, x2, z1, z2) in (('ground', (-1.6, 14.6, -2.2, 22.9)), ('basement', (-1.6, 12.6, -3.2, 11.8))):
        for ob in bpy.data.objects:
            hide = ob.name in HIDE_ALWAYS or ob.name.startswith('room')
            if lvl == 'basement':
                hide = hide or ob.name.startswith(('G_', 'OUT', 'SLAB', 'ROOF')) or (ob.parent is None and ob.type in ('MESH', 'EMPTY') and ob.name not in ('B_walls',) and not ob.name.startswith('B_') and ob.location.z > -2.0)
            ob.hide_render = hide
        ppm = 80
        topcam.ortho_scale = z2 - z1
        tco.location = (( x1 + x2) / 2, -(z1 + z2) / 2, 30)
        tco.rotation_euler = (0, 0, 0)
        scene.render.resolution_x, scene.render.resolution_y = int((x2 - x1) * ppm), int((z2 - z1) * ppm)
        fn = f'top_{lvl}.png'
        scene.render.filepath = os.path.join(OUT, fn)
        bpy.ops.render.render(write_still=True)
        views[lvl] = {'file': fn, 'x1': x1, 'x2': x2, 'z1': z1, 'z2': z2, 'ppm': ppm}
    json.dump(views, open(os.path.join(OUT, 'views.json'), 'w'))
    for ob in bpy.data.objects:
        ob.hide_render = False
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'apartment_250_photoreal.blend'))
print('DONE')
