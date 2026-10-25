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
    for i in range(8):
        try: return base64.b64decode(json.load(urllib.request.urlopen(rq, timeout=300))['candidates'][0]['content']['parts'][0]['inlineData']['data'])
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 503) or i == 7: raise
            print('retry', e.code, flush=True); time.sleep(30)
model = sc.get('model', 'gemini-3.8-flash-tts'); voice = sc.get('voice', 'Charon'); style = sc.get('style', '')
out = {}
for ln in sc['lines']:
    wav = os.path.join(VO, f"{ln['id']}.wav"); tag = os.path.join(VO, f"{ln['id']}.txt")
    text = fix(ln['text']); h = hashlib.sha1((model + voice + style + text).encode()).hexdigest()
    if '--fresh' in sys.argv or not os.path.exists(wav) or not os.path.exists(tag) or open(tag).read() != h:
        pcm = tts((style + ' ' if style else '') + text, model, voice)
        raw = wav + '.pcm'; open(raw, 'wb').write(pcm)
        # trim leading and trailing silence, keep 40 ms before and 120 ms after the speech
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', raw, '-af',
                               'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.12,areverse',
                               '-ar', '48000', wav])
        os.remove(raw); open(tag, 'w').write(h); print('voice', ln['id'], round(dur(wav), 2), flush=True)
    out[ln['id']] = round(dur(wav), 3)
json.dump(out, open(os.path.join(VO, 'durations.json'), 'w'), indent=1)
print('total', round(sum(out.values()), 2), 's of speech in', len(out), 'lines')
