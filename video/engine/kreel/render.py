"""Render a Kurkoos reel from its project file.

  python3 video/engine/kreel/render.py video/projects/<name>/project.json --preview   # preview sheet + key frames, no video
  python3 video/engine/kreel/render.py video/projects/<name>/project.json             # out/video.mp4, captions.srt, timeline.json
  python3 video/engine/kreel/render.py ... --frame 12.4                                # one frame as PNG

project.json (all editable):
  duration, lines: [{start, end, text}]           voiceover script; captions are cut from it
  scenes: [{start, end, shots: [{src, t0, dur, fx, fy, push, zoom, in}], dim, shade, effects: [{type, at, ...}]}]
  shots run one after another inside the scene ("in": "wipe" for a line wipe into the shot, else a hard cut with a punch)
  every effect is in fx.py, parameters documented there.
"""
import os, sys, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from PIL import Image, ImageDraw
import kit, fx
from kit import W, H, FPS, C

def load(path):
    pj = json.load(open(path, encoding='utf-8')); pj['_dir'] = os.path.dirname(os.path.abspath(path))
    os.chdir(pj['_dir'])
    pj['_chunks'] = kit.caption_chunks(pj.get('lines', []))
    return pj

def scene_at(pj, t):
    for i, s in enumerate(pj['scenes']):
        if s['start'] <= t < s['end'] or (i == len(pj['scenes']) - 1 and t >= s['start']): return i, s
    return None, None

def shot_at(sc, ts):
    acc = 0; shots = sc['shots']; durs = [sh.get('len', sh.get('dur', 1.0)) for sh in shots]
    total = sc['end'] - sc['start']; scale = total / max(1e-6, sum(durs))
    for j, (sh, d) in enumerate(zip(shots, durs)):
        d *= scale
        if ts < acc + d or j == len(shots) - 1: return j, sh, ts - acc, d
        acc += d

def frame(pj, fi):
    t = fi / FPS; i, sc = scene_at(pj, t)
    im = scene_frame(pj, sc, t)
    xf = sc.get('xfade', pj.get('xfade', 0))
    if xf and i > 0 and t - sc['start'] < xf:  # crossfade from the previous scene, which keeps running under it
        prev = scene_frame(pj, pj['scenes'][i - 1], t, hold=True)
        im = Image.blend(prev, im, kit.inout((t - sc['start']) / xf))
    if sc.get('captions', True): 
        im = im.convert('RGBA'); kit.draw_caption(im, pj['_chunks'], t, pj.get('caption_style'))
    return im.convert('RGB')

def scene_frame(pj, sc, t, hold=False):
    ts = t - sc['start']
    if hold: ts = min(ts, sc['end'] - sc['start'] - 1 / FPS)
    j, sh, tl, d = shot_at(sc, ts)
    f, n = int(round(tl * FPS)), max(1, int(round(d * FPS)))
    # freeze: hold the shot's frame at the freeze start, desaturated and tinted
    fr = next((e for e in sc.get('effects', []) if e['type'] == 'freeze' and e['at'] <= ts < e['at'] + e.get('dur', .8)), None)
    if fr: f = int(round((fr['at'] - (ts - tl)) * FPS))
    im = kit.shot_frame(sh, f, n)
    if fr:
        g = im.convert('L').convert('RGBA'); im = Image.blend(im, g, .7); kit.tint(im, 'navy', 70)
        d0 = ImageDraw.Draw(im); k = kit.out3((ts - fr['at']) / .12)
        d0.rectangle((24, 24, W - 24, H - 24), outline=C('paper', int(255 * k)), width=6)
    if sh.get('in') == 'wipe' and j > 0 and f < 9:
        ps = sc['shots'][j - 1]; pn = max(1, int(round(ps.get('len', ps.get('dur', 1.0)) * FPS)))
        prev = kit.shot_frame(ps, pn, pn)  # the previous shot at its last frame
        k = kit.inout(f / 9); x = int(W * (1 - k))
        prev.paste(im.crop((x, 0, W, H)), (x, 0)); im = prev
        ImageDraw.Draw(im).rectangle((x - 6, 0, x + 6, H), fill=C('mist'))
    if sc.get('dim'): kit.tint(im, 'navy', int(255 * sc['dim']))
    if sc.get('shade', True): kit.shade(im, bottom=sc.get('shade_from', .5), strength=sc.get('shade_k', .88), top=sc.get('shade_top', 0))
    if sh.get('label'): fx.fx_pill(im, tl, {'text': sh['label'], 'bg': 'teal', 'x': W - 80, 'y': 1500, 'size': 46}, {})
    if sc.get('mark', True) and not any(e['type'] in ('endcard', 'chat') for e in sc.get('effects', [])):
        lg = kit.logo(80); im.alpha_composite(lg, (60, 60))
    im = fx.run(im, ts, sc.get('effects', []), {'scene': sc, 'f': f, 'n': n})
    if sc.get('punch', True) and not fr and sh.get('in') != 'wipe': im = kit.punch(im, f, 3, .045)
    return im.convert('RGB')

def main():
    path = sys.argv[1]; pj = load(path); out = os.path.join(pj['_dir'], 'out'); os.makedirs(out, exist_ok=True)
    total = int(round(pj['duration'] * FPS))
    if '--frame' in sys.argv:
        t = float(sys.argv[sys.argv.index('--frame') + 1]); frame(pj, int(t * FPS)).save(os.path.join(out, f'frame_{t:05.2f}.png')); return
    if '--preview' in sys.argv:
        ts = []
        for s in pj['scenes']:
            d = s['end'] - s['start']; ts += [s['start'] + d * q for q in (.25, .6, .92)]
        ims = [frame(pj, int(t * FPS)).resize((216, 384)) for t in ts]
        cols = 9; rows = (len(ims) + cols - 1) // cols; sheet = Image.new('RGB', (216 * cols, 404 * rows), C('dark'))
        dr = ImageDraw.Draw(sheet)
        for k, (im, t) in enumerate(zip(ims, ts)):
            x, y = (k % cols) * 216, (k // cols) * 404; sheet.paste(im, (x, y + 20)); dr.text((x + 4, y + 3), f'{t:05.2f}s', fill=(255, 220, 80))
        sheet.save(os.path.join(out, 'preview.jpg'), quality=85); print('preview', len(ims), 'frames'); return
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', os.path.join(out, 'video.mp4')]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE); last = None
    for fi in range(total):
        i, _ = scene_at(pj, fi / FPS)
        if i != last: kit.Video.drop(); last = i
        pr.stdin.write(frame(pj, fi).tobytes())
        if fi % 150 == 0: print('frame', fi, '/', total, flush=True)
    pr.stdin.close(); pr.wait(); kit.Video.drop()
    kit.srt(pj['_chunks'], os.path.join(out, 'captions.srt'))
    json.dump({'fps': FPS, 'total': pj['duration'], 'lines': [[l['start'], l['end'], l['text']] for l in pj['lines']],
               'cuts': [s['start'] for s in pj['scenes']], 'hits': pj.get('hits', [])},
              open(os.path.join(out, 'timeline.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('done', total, 'frames')

if __name__ == '__main__':
    main()
