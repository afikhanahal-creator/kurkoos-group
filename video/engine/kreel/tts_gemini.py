"""Voiceover with Gemini TTS, the same voice as the earlier Kurkoos reels (Charon), one file per line.
    python3 video/engine/kreel/tts_gemini.py video/projects/<name>/script.json [--fresh]
script.json: {"lines": [{"id": "v01", "text": "..."}], "voice": "Charon", "model": "gemini-3.8-flash-tts"}
Writes vo/<id>.wav (48 kHz mono, silence trimmed) and vo/durations.json. Lines already made are kept unless --fresh.
The key comes from the environment's network secret for generativelanguage.googleapis.com (or GEMINI_API_KEY)."""
import base64, json, os, re, subprocess, sys, time, urllib.request, urllib.error, hashlib
path = sys.argv[1]; DIR = os.path.dirname(os.path.abspath(path)); VO = os.path.join(DIR, 'vo'); os.makedirs(VO, exist_ok=True)
sc = json.load(open(path, encoding='utf-8'))
# spellings with nikud for words the voice reads wrong (from video/studio/pikuach/tts.py and new ones)
FIX = [('מקרקע', 'מִקַּרְקַע'), ('שכינתא', 'שְׁכִינְתָּא'), ('ראיתה', 'רָאִיתָה'), ('מטעם', 'מִטַּעַם'), ('ממ"ד', 'מָמָ"ד'),
       ('יוצקים', 'יוֹצְקִים'), ('הטפסנות', 'הַטַּפְסָנוּת'), ('מתקשה', 'מִתְקַשֶּׁה'), ('פרט אחר פרט', 'פְּרָט אַחַר פְּרָט')] + [tuple(x) for x in sc.get('fix', [])]
def fix(t):
    for a, b in FIX: t = t.replace(a, b)
    return t
def dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
def tts(text, model, voice):
    body = {'contents': [{'parts': [{'text': text}]}], 'generationConfig': {'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}}}
    key = os.environ.get('GEMINI_API_KEY', '')
    rq = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(),
                                headers={'Content-Type': 'application/json', **({'x-goog-api-key': key} if key else {})})
    for i in range(int(os.environ.get('TTS_TRIES', 8))):
        try: return base64.b64decode(json.load(urllib.request.urlopen(rq, timeout=300))['candidates'][0]['content']['parts'][0]['inlineData']['data'])
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 503) or i == int(os.environ.get('TTS_TRIES', 8)) - 1: raise
            print('retry', e.code, flush=True); time.sleep(int(os.environ.get('TTS_WAIT', 30)))
def strip_noise_tail(pcm, sr=24000):
    """The TTS answer ends with a burst of white noise (about 0.1 s, as loud as the speech) after the voice has gone
    quiet. It was the hiss heard on every cut. Drop every trailing 10 ms frame that is noise (flat spectrum) or silence,
    then fade the last 30 ms so the line never ends on a click."""
    import numpy as np
    x = np.frombuffer(pcm[:len(pcm) // 2 * 2], dtype='<i2').astype(np.float32) / 32768
    n = int(sr * .01); fr = [float(np.sqrt((x[i:i + n] ** 2).mean())) for i in range(0, len(x) // n * n, n)]
    # the burst: the trailing run of loud frames, right after at least 100 ms of near silence
    j = len(fr)
    while j > 0 and (fr[j - 1] > .02 or j > len(fr) - 4): j -= 1
    end = len(fr) * n
    if j < len(fr) and j >= 10 and max(fr[j - 10:j]) < .01:
        end = j * n
        while end > n * 20 and fr[end // n - 1] < .003: end -= n
    x = x[:min(len(x), end + int(sr * .12))].copy()
    f = min(len(x), int(sr * .03)); x[-f:] *= np.linspace(1, 0, f)
    return (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
model = sc.get('model', 'gemini-3.8-flash-tts'); voice = sc.get('voice', 'Charon'); style = sc.get('style', '')
out = {}
for ln in sc['lines']:
    wav = os.path.join(VO, f"{ln['id']}.wav"); tag = os.path.join(VO, f"{ln['id']}.txt")
    # a line can use another model of the same voice (model_by_line), for example when one model is rate limited
    model = sc.get('model_by_line', {}).get(ln['id'], sc.get('model', 'gemini-3.8-flash-tts'))
    text = fix(ln['text']); h = hashlib.sha1((model + voice + style + text).encode()).hexdigest()
    if '--fresh' in sys.argv or not os.path.exists(wav) or not os.path.exists(tag) or open(tag).read() != h:
        pcm = strip_noise_tail(tts((style + ' ' if style else '') + text, model, voice))
        raw = wav + '.pcm'; open(raw, 'wb').write(pcm)
        # trim leading and trailing silence, keep 40 ms before and 120 ms after the speech
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw, '-af',
                               'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.12,areverse',
                               '-ar', '48000', wav])
        os.remove(raw); open(tag, 'w').write(h); print('voice', ln['id'], round(dur(wav), 2), flush=True)
    out[ln['id']] = round(dur(wav), 3)
json.dump(out, open(os.path.join(VO, 'durations.json'), 'w'), indent=1)
print('total', round(sum(out.values()), 2), 's of speech in', len(out), 'lines')
