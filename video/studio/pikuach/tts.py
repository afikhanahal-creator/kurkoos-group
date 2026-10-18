"""One continuous Gemini read of the whole narration (one voice, one request), cut at the pauses into v01..vNN,
then voice/timings.js with the start and end of every line, which index.html reads to time its scenes.
    python3 video/studio/pikuach/tts.py [model]
The key comes from the environment's network secret for generativelanguage.googleapis.com (or GEMINI_API_KEY)."""
import base64, json, os, re, subprocess, sys, urllib.request, urllib.error, time
H = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(H, 'voice'); sys.path.insert(0, H)
from lines import LINES
# line -> the second where the pause after it ends, on full.wav (only when the alignment picked a wrong pause)
BREAK_FIX = {13: 54.455}
# line -> (file, spelling): a separate take of one line in the same voice, used instead of its cut from full.wav.
# Line 11: in the continuous read "ראיתה" came out as "RA-it"; this take, spelled רָאִיטָה, transcribes back as "ra-ee-TA".
# lines left out of the reel to keep it about 45 s (still read in full.wav, so the alignment keeps every line)
SKIP = {6}
TAKES = {11: ('voice/take11.wav', 'קורקוס יזמות, רָאִיטָה לְבִיצּוּעַ, שְׁכִינְתָּא לְפִיקּוּחַ, ואפיק הנחל לתיווך.')}
def dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
FIX = [('מקרקע', 'מִקַּרְקַע'), ('שכינתא', 'שְׁכִינְתָּא'), ('ראיתה', 'רָאִיתָה'), ('מנכ"ל', 'מַנְכָּ"ל'), ('שנשכח', 'שֶׁנִּשְׁכַּח'),
       ('שכוסה', 'שֶׁכֻּסָּה'), ('שנסגרה', 'שֶׁנִּסְגְּרָה'), ('קורת גג', 'קוֹרַת גַּג'), ('מטעמכם', 'מִטַּעַמְכֶם'), ('ובראשות', 'וּבְרָאשׁוּת')]
def fix(t):
    for a, b in FIX: t = t.replace(a, b)
    return t
def take(src, seg, tempo):
    # trim the take to its speech (40 ms before, 80 ms after), same tempo, level matched to the cut it replaces (active speech RMS)
    o = subprocess.run(['ffmpeg', '-i', src, '-af', 'silencedetect=n=-38dB:d=0.05', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(v) for v in re.findall(r'silence_start: ([\d.]+)', o)]; en = [float(v) for v in re.findall(r'silence_end: ([\d.]+)', o)]
    D = dur(src); a = en[0] if st and st[0] < 0.05 else 0.0; b = st[-1] if len(st) > len(en) else D
    def rms(p):
        x = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-af', 'silenceremove=stop_periods=-1:stop_threshold=-38dB', '-f', 'f32le', '-ac', '1', '-'], capture_output=True).stdout
        import array; v = array.array('f', x); return (sum(q * q for q in v) / max(1, len(v))) ** .5
    tmp = seg + '.take.wav'
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', str(max(0, a - 0.04)), '-to', str(min(D, b + 0.08)), '-i', src, '-af', f'atempo={tempo}', '-ar', '48000', '-ac', '1', tmp])
    g = rms(seg) / max(1e-6, rms(tmp))
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={g:.4f},afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', seg]); os.remove(tmp)
    print('take', os.path.basename(src), 'gain', round(g, 2))
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
    # Gemini does not pause much longer between lines than at a comma, so the line breaks are found by alignment:
    # every pause is a candidate, and the chosen N-1 pauses make each line's length closest to its share of the text
    # (letters), with a bonus for longer pauses. BREAK_FIX moves a break onto the pause that ends at a given second
    # (checked by transcribing every cut line; see README).
    o = subprocess.run(['ffmpeg', '-i', full, '-af', 'silencedetect=n=-38dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', o)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', o)]
    lead = en[0] if st and st[0] < 0.05 and en[0] < 1 else 0.0
    gaps = [(s, e) for s, e in zip(st, en) if s > lead + 0.3 and e < T - 0.1]
    N, G = len(LINES), len(gaps)
    w = [len(re.sub(r'[^\w]', '', s)) + 3 for s, _ in LINES]
    rate = (T - lead - sum(e - s for s, e in gaps) * 0.5) / sum(w)
    cost = lambda a, b, i: ((b - a - w[i] * rate) / (w[i] * rate)) ** 2
    INF = 1e18; dp = [[INF] * G for _ in range(N)]; bk = [[None] * G for _ in range(N)]
    for j in range(G): dp[0][j] = cost(lead, gaps[j][0], 0) - .8 * (gaps[j][1] - gaps[j][0])
    for i in range(1, N - 1):
        for j in range(G):
            for q in range(j):
                c = dp[i - 1][q] + cost(gaps[q][1], gaps[j][0], i) - .8 * (gaps[j][1] - gaps[j][0])
                if c < dp[i][j]: dp[i][j], bk[i][j] = c, q
    ch = [min(range(G), key=lambda j: dp[N - 2][j] + cost(gaps[j][1], T, N - 1))]
    for i in range(N - 2, 0, -1): ch.append(bk[i][ch[-1]])
    ch = ch[::-1]
    for line, at in BREAK_FIX.items():
        ch[line - 1] = min(range(G), key=lambda j: abs(gaps[j][1] - at))
    starts = [lead] + [gaps[j][1] for j in ch]
    ends = [gaps[j][0] for j in ch] + [T]
    tm = [{'i': i + 1, 'a': round(a, 3), 'b': round(b, 3)} for i, (a, b) in enumerate(zip(starts, ends))]
    for x, (s, c) in zip(tm, LINES): print(x['i'], x['a'], x['b'], round(x['b'] - x['a'], 2), s[:40])
    # the reel's voice track: every line whole, the pauses between lines cut to GAP, the voice TEMPO faster (pitch kept)
    COVER = 0.5   # the cover frame opens the reel; the voice starts right after it (index.html and music.py read it from timings.js)
    LEAD, GAP, TEMPO = COVER + 0.12, 0.18, 1.27
    parts, t, out = [], LEAD, []
    for x in tm:
        if x['i'] in SKIP: continue
        seg = os.path.join(OUT, 'v%02d.wav' % x['i'])
        subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-ss', str(max(0, x['a'] - 0.04)), '-to', str(min(T, x['b'] + 0.08)), '-i', full, '-af', f'atempo={TEMPO}', '-ar', '48000', '-ac', '1', seg])
        if x['i'] in TAKES: take(os.path.join(H, TAKES[x['i']][0]), seg, TEMPO)
        d = dur(seg); out.append({'i': x['i'], 'a': round(t, 3), 'b': round(t + d, 3), 'cap': LINES[x['i'] - 1][1]}); parts.append((seg, t)); t += d + GAP
    total = round(t - GAP + 0.1, 3)
    ins, flt = [], []
    for i, (p, at) in enumerate(parts):
        ins += ['-i', p]; flt.append(f'[{i}:a]adelay={int(at*1000)}|{int(at*1000)}[a{i}]')
    flt.append(''.join(f'[a{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{total}[v]')
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(flt), '-map', '[v]', '-ar', '48000', os.path.join(OUT, 'voice.wav')])
    print('voice track', total, 's')
    open(os.path.join(OUT, 'timings.js'), 'w', encoding='utf8').write('window.VT=' + json.dumps({'voice': total, 'cover': COVER, 'lines': out}, ensure_ascii=False) + ';\n')
main()
