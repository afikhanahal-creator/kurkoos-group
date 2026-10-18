"""One continuous Gemini read of the whole narration (one voice, one request), cut at the pauses into v01..vNN,
then voice/timings.js with the start and end of every line, which index.html reads to time its scenes.
    python3 video/studio/sirtut/tts.py [model]
The key comes from the environment's network secret for generativelanguage.googleapis.com (or GEMINI_API_KEY)."""
import base64, json, os, re, subprocess, sys, urllib.request, urllib.error, time
H = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(H, 'voice'); sys.path.insert(0, H)
from lines import LINES
def dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
fix = lambda t: t.replace('מקרקע', 'מִקַּרְקַע').replace('קנה המידה', 'קְנֵה הַמִּדָּה').replace('בעין', 'בָּעַיִן').replace('מפלס', 'מִפְלָס').replace('בחתך', 'בַּחֲתָךְ')
def main():
    os.makedirs(OUT, exist_ok=True)
    full = os.path.join(OUT, 'full.wav')
    if not os.path.exists(full) or '--fresh' in sys.argv:
        model = next((a for a in sys.argv[1:] if not a.startswith('--')), 'gemini-3.8-flash-tts')
        txt = '\n\n'.join(fix(s) for s, _ in LINES)
        body = {'contents': [{'parts': [{'text': txt}]}], 'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': 'Charon'}}}}}
        key = os.environ.get('GEMINI_API_KEY', '')
        req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', **({'x-goog-api-key': key} if key else {})})
        for i in range(8):
            try:
                d = json.load(urllib.request.urlopen(req, timeout=300))['candidates'][0]['content']['parts'][0]['inlineData']['data']; break
            except urllib.error.HTTPError as e:
                if e.code not in (429, 500, 503) or i == 7: raise
                print('retry', e.code); time.sleep(40)
        open(os.path.join(OUT, 'full.pcm'), 'wb').write(base64.b64decode(d))
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', os.path.join(OUT, 'full.pcm'), '-ar', '48000', full])
    T = dur(full); print('full', round(T, 2))
    # between lines the voice pauses about a second, at a comma about a third of one: the line breaks are the longest pauses
    o = subprocess.run(['ffmpeg', '-i', full, '-af', 'silencedetect=n=-38dB:d=0.15', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', o)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', o)]
    gaps = [(s, e) for s, e in zip(st, en) if s > 0.2 and e < T - 0.1]
    gaps = sorted(sorted(gaps, key=lambda g: g[1] - g[0], reverse=True)[:len(LINES) - 1])
    print('shortest line break', round(min(e - s for s, e in gaps), 2))
    if len(gaps) != len(LINES) - 1: sys.exit(f'found {len(gaps)} pauses, need {len(LINES)-1}')
    # speech start and end of every line (inside the pauses), on the timeline of full.wav
    lead = re.search(r'silence_end: ([\d.]+)', subprocess.run(['ffmpeg', '-i', full, '-af', 'silencedetect=n=-38dB:d=0.05', '-f', 'null', '-'], capture_output=True, text=True).stderr)
    starts = [float(lead.group(1)) if lead and float(lead.group(1)) < 1 else 0.0] + [e for _, e in gaps]
    ends = [s for s, _ in gaps] + [T]
    tm = [{'i': i + 1, 'a': round(a, 3), 'b': round(b, 3)} for i, (a, b) in enumerate(zip(starts, ends))]
    for x, (s, c) in zip(tm, LINES): print(x['i'], x['a'], x['b'], round(x['b'] - x['a'], 2), s[:40])
    # the reel's voice track: every line whole, the pauses between lines cut to GAP, the voice TEMPO faster (pitch kept)
    LEAD, GAP, TEMPO = 0.5, 0.32, 1.10
    parts, t, out = [], LEAD, []
    for x in tm:
        seg = os.path.join(OUT, 'v%02d.wav' % x['i'])
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', str(max(0, x['a'] - 0.04)), '-to', str(min(T, x['b'] + 0.08)), '-i', full, '-af', f'atempo={TEMPO}', '-ar', '48000', '-ac', '1', seg])
        d = dur(seg); out.append({'i': x['i'], 'a': round(t, 3), 'b': round(t + d, 3), 'cap': LINES[x['i'] - 1][1]}); parts.append((seg, t)); t += d + GAP
    total = round(t - GAP + 0.1, 3)
    ins, flt = [], []
    for i, (p, at) in enumerate(parts):
        ins += ['-i', p]; flt.append(f'[{i}:a]adelay={int(at*1000)}|{int(at*1000)}[a{i}]')
    flt.append(''.join(f'[a{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{total}[v]')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(flt), '-map', '[v]', '-ar', '48000', os.path.join(OUT, 'voice.wav')])
    print('voice track', total, 's')
    open(os.path.join(OUT, 'timings.js'), 'w', encoding='utf8').write('window.VT=' + json.dumps({'voice': total, 'lines': out}, ensure_ascii=False) + ';\n')
main()
