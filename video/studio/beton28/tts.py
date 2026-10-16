"""Google Cloud Text-to-Speech for the "28 ימים" reel: one MP3 per line of narration.md, then one voice track placed on the timeline.

    GOOGLE_TTS_API_KEY=... python3 video/studio/beton28/tts.py [--voice he-IL-Wavenet-D] [--rate 1.05]
    -> video/studio/beton28/voice/v01.mp3 ... v11.mp3 and voice/voice.wav (52 s, each line at its start time)

The key is read from the environment only (never from a file in the repo). Lines that come out longer than their slot are
re-synthesized faster, up to rate 1.2, so no line runs into the next one.
"""
import argparse, base64, json, os, re, subprocess, sys, urllib.request

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'voice')


def lines():
    rows = []
    for l in open(os.path.join(H, 'narration.md'), encoding='utf8'):
        m = re.match(r'\|\s*(v\d+)\.mp3\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*(.+?)\s*\|\s*$', l)
        if m:
            rows.append((m.group(1), float(m.group(2)), float(m.group(3)), m.group(4)))
    ssml = re.findall(r'<speak>.*?</speak>', open(os.path.join(H, 'narration.md'), encoding='utf8').read())
    return [(n, a, b, ssml[i] if i < len(ssml) else f'<speak>{t}</speak>') for i, (n, a, b, t) in enumerate(rows)]


def synth(key, ssml, voice, rate):
    body = {'input': {'ssml': ssml}, 'voice': {'languageCode': 'he-IL', 'name': voice},
            'audioConfig': {'audioEncoding': 'MP3', 'speakingRate': rate, 'sampleRateHertz': 48000}}
    req = urllib.request.Request('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key,
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return base64.b64decode(json.load(r)['audioContent'])


def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', default='he-IL-Wavenet-D')
    ap.add_argument('--rate', type=float, default=1.05)
    a = ap.parse_args()
    key = os.environ.get('GOOGLE_TTS_API_KEY')
    if not key:
        sys.exit('GOOGLE_TTS_API_KEY is not set in this environment')
    os.makedirs(OUT, exist_ok=True)
    placed = []
    for name, start, end, ssml in lines():
        p, rate = os.path.join(OUT, name + '.mp3'), a.rate
        while True:
            open(p, 'wb').write(synth(key, ssml, a.voice, rate))
            d = dur(p)
            if d <= end - start or rate >= 1.2:
                break
            rate = round(min(1.2, rate * (d / (end - start)) + 0.02), 3)
        print(f'{name} {start:5.1f}s {d:4.2f}s of {end - start:4.2f}s rate {rate}')
        placed.append((p, start))
    inputs, filt = [], []
    for i, (p, s) in enumerate(placed):
        inputs += ['-i', p]
        filt.append(f'[{i}:a]adelay={int(s * 1000)}|{int(s * 1000)}[a{i}]')
    filt.append(''.join(f'[a{i}]' for i in range(len(placed))) + f'amix=inputs={len(placed)}:normalize=0,apad,atrim=0:52[v]')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[v]', '-ar', '48000', os.path.join(OUT, 'voice.wav')])
    print('voice track:', os.path.join(OUT, 'voice.wav'))


if __name__ == '__main__':
    main()
