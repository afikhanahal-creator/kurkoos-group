"""Final mix of a Kurkoos reel: video + music + voiceover, normalised to -14 LUFS.
python3 video/engine/kreel/mix.py video/projects/<name>/project.json [--tts]

Voiceover, line by line (the lines in project.json):
  - recorded:  vo/01.wav (or .mp3/.m4a) ... one file per line, in the project folder.
  - generated: --tts with OPENAI_API_KEY in the environment (the same provider as server/tts.js on the site,
               model TTS_MODEL or gpt-4o-mini-tts, voice TTS_VOICE or 'onyx'). No key is stored in code.
Each line starts at its slot; a line longer than its slot is sped up to fit (at most 12%), otherwise it is reported.
Music is ducked under the voice. Output: out/<project folder>.mp4 (with voice) or out/<folder>_music.mp4 (without).
"""
import os, sys, json, glob, subprocess, urllib.request
path = sys.argv[1]; DIR = os.path.dirname(os.path.abspath(path)); OUT = os.path.join(DIR, 'out'); VO = os.path.join(DIR, 'vo')
pj = json.load(open(path, encoding='utf-8')); name = os.path.basename(DIR)
def dur(p): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout or 0)

if '--tts' in sys.argv:
    key = os.environ.get('OPENAI_API_KEY')
    if not key: sys.exit('--tts needs OPENAI_API_KEY in the environment')
    os.makedirs(VO, exist_ok=True)
    for i, ln in enumerate(pj['lines'], 1):
        p = os.path.join(VO, f'{i:02d}.mp3')
        if os.path.exists(p): continue
        body = json.dumps({'model': os.environ.get('TTS_MODEL', 'gpt-4o-mini-tts'), 'voice': os.environ.get('TTS_VOICE', 'onyx'), 'input': ln['text'],
                           'response_format': 'mp3', 'instructions': 'Speak natural Israeli Hebrew, authoritative and trustworthy, at a brisk, confident pace.'}).encode()
        rq = urllib.request.Request('https://api.openai.com/v1/audio/speech', data=body, headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
        open(p, 'wb').write(urllib.request.urlopen(rq, timeout=60).read()); print('tts', i)

vo = []
for i, ln in enumerate(pj['lines'], 1):
    hits = [h for h in glob.glob(os.path.join(VO, f"{ln.get('vo', f'{i:02d}')}.*")) if h.endswith(('.wav', '.mp3', '.m4a'))]
    if not hits: continue
    d = dur(hits[0]); slot = ln['end'] - ln['start']; base = pj.get('vo_tempo', 1.0)
    sp = max(base, min(1.12, d / slot)) if d / base > slot else base
    if d / sp > slot + .05: print(f'line {i}: {d:.2f}s in a {slot:.2f}s slot, record it shorter: {ln["text"]}')
    vo.append((hits[0], ln['start'], sp))
inputs = ['-i', os.path.join(OUT, 'video.mp4'), '-i', os.path.join(OUT, 'music.wav')]
for p, a, sp in vo: inputs += ['-i', p]
if vo:
    # a short fade on both edges of every line: a cut that starts mid-waveform clicks
    parts = [f'[{k + 2}:a]aresample=48000,aformat=channel_layouts=stereo,atempo={sp:.3f},highpass=f=80,afade=t=in:d=0.012,areverse,afade=t=in:d=0.04,areverse,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,adelay={int(a * 1000)}|{int(a * 1000)}[v{k}]' for k, (p, a, sp) in enumerate(vo)]
    if pj.get('mix', {}).get('duck') == 'steady':  # music held at one level under the voice: no swell in the pauses
        parts += [''.join(f'[v{k}]' for k in range(len(vo))) + f'amix=inputs={len(vo)}:normalize=0,apad[vout]', '[1:a]volume=0.34[duck]']
    else:
        parts += [''.join(f'[v{k}]' for k in range(len(vo))) + f'amix=inputs={len(vo)}:normalize=0,apad,asplit=2[vsc][vout]',
                  '[1:a]volume=0.8[mus]', '[mus][vsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck]']
    parts += ['[duck][vout]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=9[a]']
    fc = ';'.join(parts)
else:
    fc = '[1:a]loudnorm=I=-14:TP=-1.5:LRA=9[a]'
dst = os.path.join(OUT, f'{name}.mp4' if vo else f'{name}_music.mp4')
subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                '-ar', '48000', '-shortest', '-movflags', '+faststart', dst], check=True)
print(os.path.basename(dst), 'voice lines:', len(vo), 'of', len(pj['lines']))
