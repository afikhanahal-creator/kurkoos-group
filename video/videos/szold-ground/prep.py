"""Cuts each shot from the iPhone clips (rotation applied), 1080x1920, brand grade: teal in the shadows, earth kept warm."""
import subprocess, json
from plan import schedule, SRC
shots, end, total = schedule()
GRADE = ('scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,'
         'eq=contrast=1.09:saturation=1.07:brightness=-0.01,'
         'colorbalance=rs=-0.05:gs=0.0:bs=0.07:rm=-0.01:bm=0.02:rh=0.02:bh=-0.03,'
         'vignette=PI/5,unsharp=5:5:0.4')
for s in shots:
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(s['ss']), '-i', f"{SRC}/{s['src']}.mov", '-t', str(s['dur'] + 0.3),
                    '-vf', GRADE, '-an', '-r', '30', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                    f"assets/seg/{s['name']}.mp4"], check=True)
json.dump(shots, open('assets/seg/shots.json', 'w'), indent=1)
print(len(shots), 'shots, cuts end at', end, 'total', total)
