"""Real Kurkoos site photos and footage for the 30 s reels, cut to the panels they fill (kept at or near 1:1 so they stay sharp).
Everything here comes from public/ in the repo; nothing is generated. Writes video/studio/pikuach/media/ (not committed: make it again with this).
    python3 video/studio/pikuach/media.py
Sources: public/execution-gallery/2.jpg and 6.jpg, public/divisions/execution-bg.jpg, public/divisions/kurkoos-showcase.mp4,
public/divisions/humash-22-24-sketch.webp, public/afik-hanahal-logo.webp. 4.jpg and 5.jpg (selfies of a person) are not used."""
import os, subprocess
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(H, '..', '..', '..')); PUB = os.path.join(ROOT, 'public')
M = os.path.join(H, 'media'); os.makedirs(M, exist_ok=True)
def crop(src, box, size, out, q=92):
    im = Image.open(os.path.join(PUB, src)).convert('RGB').crop(box).resize(size, Image.LANCZOS); im.save(os.path.join(M, out), quality=q); return out
# full panels 960x1080 (source 800x900, x1.2)
crop('execution-gallery/6.jpg', (150, 0, 950, 900), (960, 1080), 'p6.jpg')        # column cages in the formwork
crop('execution-gallery/2.jpg', (100, 0, 900, 900), (960, 1080), 'p2.jpg')        # cast column with starter bars, waterproofing at the base
crop('divisions/execution-bg.jpg', (380, 0, 1180, 900), (960, 1080), 'pbg.jpg')   # wall formwork, rebar above it, the pump hose at the right
# cost cards 420x740
crop('execution-gallery/6.jpg', (150, 195, 550, 900), (420, 740), 'c6.jpg')       # open rebar: still visible
crop('execution-gallery/2.jpg', (140, 60, 590, 853), (420, 740), 'c2.jpg')        # concrete: closed
# division tiles 360x250 and route thumbnails 170x170
crop('execution-gallery/2.jpg', (520, 160, 1440, 800), (360, 250), 't-build.jpg')
crop('divisions/humash-22-24-sketch.webp', (180, 20, 1220, 742), (360, 250), 't-plan.jpg')
crop('divisions/humash-22-24-sketch.webp', (420, 60, 980, 620), (170, 170), 'r1.jpg')
crop('execution-gallery/6.jpg', (180, 300, 780, 900), (170, 170), 'r2.jpg')
crop('execution-gallery/2.jpg', (700, 150, 1350, 800), (170, 170), 'r3.jpg')
afik = Image.open(os.path.join(PUB, 'afik-hanahal-logo.webp')).convert('RGBA'); afik.crop(afik.getbbox()).save(os.path.join(M, 'afik.png'))
# footage: frames at 30 fps, drawn on a canvas by the page (seek safe: every frame is decoded before the render starts)
def frames(name, t0, t1, crop_, size):
    d = os.path.join(M, name); os.makedirs(d, exist_ok=True)
    for f in os.listdir(d): os.remove(os.path.join(d, f))
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', str(t0), '-to', str(t1), '-i', os.path.join(PUB, 'divisions', 'kurkoos-showcase.mp4'),
                           '-vf', f'fps=30,crop={crop_},scale={size}:flags=lanczos', '-q:v', '3', os.path.join(d, '%03d.jpg')])
    return len(os.listdir(d))
print('split', frames('f-split', 5.0, 9.4, '336:720:472:0', '420:900'))      # the contractor builds: under the formwork, block walls
print('hook', frames('f-hook', 0.0, 4.8, '960:720:160:0', '960:720'))        # reel B hook, 1:1
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', '11.6', '-i', os.path.join(PUB, 'divisions', 'kurkoos-showcase.mp4'), '-frames:v', '1',
                       '-vf', 'crop=600:600:340:60,scale=170:170:flags=lanczos', '-q:v', '2', os.path.join(M, 'r4.jpg')])
print('ok')
