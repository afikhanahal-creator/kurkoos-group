"""Narration for the "28 ימים" reel: one audio file per line of narration.md, then one voice track placed on the timeline.

    GEMINI_API_KEY=...     python3 video/studio/beton28/tts.py --engine gemini [--voice Charon]      (free, Google AI Studio key)
    GOOGLE_TTS_API_KEY=... python3 video/studio/beton28/tts.py --engine google [--voice he-IL-Wavenet-D] [--rate 1.05]
    -> video/studio/beton28/voice/v01.wav ... v11.wav and voice/voice.wav (52 s, each line at its start time)

Gemini has no speaking rate setting: a line longer than its slot is sped up with ffmpeg atempo (at most 1.15).
Hebrew is not on Gemini's official TTS language list, so listen to v01 first; if the Hebrew is off, use --engine google.

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


def synth_gemini(key, ssml, voice):
    text = re.sub(r'<break[^>]*/>', ' ', re.sub(r'</?speak>', '', ssml)).strip()
    prompt = 'קרא בעברית תקנית וברורה, בקול גברי רגוע ובטוח, כמו מנהל פרויקטים מנוסה שמסביר ללקוח, בקצב מעט מהיר: ' + text
    body = {'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', **({'x-goog-api-key': key} if key else {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        part = json.load(r)['candidates'][0]['content']['parts'][0]['inlineData']
    return base64.b64decode(part['data'])  # PCM s16le, 24 kHz, mono


def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--engine', choices=['gemini', 'google'], default='gemini')
    ap.add_argument('--voice', default=None)
    ap.add_argument('--rate', type=float, default=1.05)
    a = ap.parse_args()
    env = 'GEMINI_API_KEY' if a.engine == 'gemini' else 'GOOGLE_TTS_API_KEY'
    # the key may live in the environment's network secrets instead: the proxy then adds the x-goog-api-key header itself
    key = os.environ.get(env, '')
    if not key and a.engine == 'google':
        sys.exit(env + ' is not set in this environment')
    if not key:
        print('no ' + env + ' variable: relying on the network secret for generativelanguage.googleapis.com')
    voice = a.voice or ('Charon' if a.engine == 'gemini' else 'he-IL-Wavenet-D')
    os.makedirs(OUT, exist_ok=True)
    placed = []
    for name, start, end, ssml in lines():
        p, slot = os.path.join(OUT, name + '.wav'), end - start
        if a.engine == 'gemini':
            raw = os.path.join(OUT, name + '.pcm')
            open(raw, 'wb').write(synth_gemini(key, ssml, voice))
            subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw,
                                   '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_threshold=-45dB:stop_duration=0.25', '-ar', '48000', p])
            os.remove(raw)
            d, rate = dur(p), 1.0
            if d > slot:
                rate = min(1.15, d / slot)
                tmp = p + '.tmp.wav'
                subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', p, '-af', f'atempo={rate:.3f}', tmp])
                os.replace(tmp, p)
                d = dur(p)
        else:
            mp3, rate = os.path.join(OUT, name + '.mp3'), a.rate
            while True:
                open(mp3, 'wb').write(synth(key, ssml, voice, rate))
                d = dur(mp3)
                if d <= slot or rate >= 1.2:
                    break
                rate = round(min(1.2, rate * (d / slot) + 0.02), 3)
            subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ar', '48000', p])
        print(f'{name} {start:5.1f}s {d:4.2f}s of {slot:4.2f}s rate {rate:.2f}' + ('  LONGER THAN ITS SLOT' if d > slot + .05 else ''))
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
