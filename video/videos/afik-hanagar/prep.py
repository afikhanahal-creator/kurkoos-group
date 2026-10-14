"""Cuts, stabilizes and upscales the Hanagar 24 shots to 1080x1920, writes assets/seg/segs.json, and pulls the photo stills."""
import json, subprocess, os
SRC = '/tmp/claude-0/-home-user-kurkoos-group/b616de33-7a66-539b-90c4-315bd9ec44de/scratchpad/nagar'
SHOTS = [  # name, source, start, end
    ('work', 'long', 8.0, 10.0), ('table', 'c1', 0.2, 2.6), ('open', 'long', 42.8, 44.6),
    ('meet', 'c2', 0.1, 2.5), ('room', 'long', 17.0, 18.6), ('shelf', 'c4', 0.1, 2.5),
    ('kitchen', 'c3', 0.1, 2.5), ('window', 'long', 26.0, 27.8), ('view', 'long', 23.6, 25.2),
    ('lounge', 'long', 40.6, 42.2), ('glass', 'long', 10.0, 12.6),
]
DUR = {'long': 45.5, 'c1': 3.1, 'c2': 2.93, 'c3': 2.63, 'c4': 2.67}
out = []
for name, src, a, b in SHOTS:
    pa = min(0.4, a); pb = min(0.4, DUR[src] - b - 0.02)
    s, e = a - pa, b + pb
    f = f'{SRC}/{src}.mp4'; trf = f'/tmp/{name}.trf'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s), '-to', str(e), '-i', f, '-vf', f'vidstabdetect=shakiness=6:result={trf}', '-f', 'null', '-'], check=True)
    vf = (f'vidstabtransform=input={trf}:smoothing=12:maxshift=20:optzoom=0:zoom=6:crop=keep,'
          'scale=1080:1920:flags=lanczos,unsharp=5:5:0.7,eq=contrast=1.04:saturation=1.06')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s), '-to', str(e), '-i', f, '-vf', vf, '-an', '-r', '30',
                    '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', f'assets/seg/{name}.mp4'], check=True)
    out.append(dict(name=name, pad=round(pa, 3), dur=round(b - a, 3)))
json.dump(out, open('assets/seg/segs.json', 'w'), indent=1)
# photo stills for the cards: the four closed rooms and spaces
for n, (src, t) in enumerate([('long', 24.4), ('c2', 1.2), ('long', 17.6), ('c4', 1.3)]):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', f'{SRC}/{src}.mp4', '-frames:v', '1', '-vf', 'scale=720:-1:flags=lanczos,unsharp=5:5:0.6', '-q:v', '3', f'assets/photos/p{n}.jpg'], check=True)
print(out)
