"""The voices of the two 30 s reels, cut from the same continuous read as the 54 s reel (voice/full.wav and voice/align.json,
both written by tts.py), so all three reels speak in one voice. Nothing here is re-recorded except what REEL names as a take:
    voice/take11.wav  line 11 ("ראיתה" spelled רָאִיטָה, see tts.py)
    voice/take-b0.wav the new hook of reel B, "המפקח שלכם צריך להבין בנייה. לא רק לבדוק אותה." (same voice, Charon)
A piece keeps parts of a line: keep=[(from, to), ...] in seconds of full.wav (None = the line's own start or end); the cuts
sit inside pauses (measured with silencedetect, checked by transcribing every piece back).
    python3 video/studio/pikuach/voice30.py   ->  voice/a.wav, voice/a-timings.js, voice/b.wav, voice/b-timings.js"""
import array, json, os, re, subprocess
H = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(H, 'voice')
FULL = os.path.join(V, 'full.wav'); AL = {x['i']: x for x in json.load(open(os.path.join(V, 'align.json')))}
COVER = 0.5
REEL = {
  'a': {'tempo': 1.22, 'gap': .24, 'lines': [
    {'parts': [{'src': 1}], 'cap': 'בונים ~בית ~פרטי?|הטעויות היקרות ~נעלמות ~מהעין|תוך ימים.'},
    {'parts': [{'src': 2, 'keep': [(None, 6.12), (7.95, None)]}], 'cap': '~ברזל שלא לפי התוכנית,|~איטום שכוסה בלי בדיקת הצפה.'},
    {'parts': [{'src': 3}], 'cap': 'כל אחת ~זולה לתיקון כשהיא גלויה,|~ויקרה ~מאוד אחרי שנסגרה בבטון.'},
    {'parts': [{'src': 4}], 'cap': 'בלי מפקח ~מטעמכם,|האינטרס של ~הקבלן|הוא שקובע בשטח.'},
    {'parts': [{'src': 5}], 'cap': '~שכינתא, זרוע הפיקוח של קבוצת קורקוס,|היא ~העיניים ~המקצועיות שלכם באתר.'},
    {'parts': [{'src': 6}], 'cap': 'בדיקות בשלבים ~הקריטיים, כמו ~יציקות ~ואיטום.'},
    {'parts': [{'src': 7, 'keep': [(None, 28.88)]}, {'src': 8, 'keep': [(None, 32.1)]}], 'cap': 'בדיקת ~חשבונות הקבלן ~לפני ~תשלום,|ועד ~פרוטוקול ~מסירה.'},
    {'parts': [{'src': 13}], 'cap': 'בונים בית? ~דברו ~איתנו,|עוד ~לפני ~החתימה עם הקבלן.'},
    {'parts': [{'src': 14, 'keep': [(55.62, None)]}], 'cap': ''},
  ]},
  'b': {'tempo': 1.14, 'gap': .25, 'lines': [
    {'parts': [{'take': 'take-b0.wav'}], 'cap': 'המפקח שלכם צריך ~להבין ~בנייה.|לא רק ~לבדוק אותה.'},
    {'parts': [{'src': 9}], 'cap': 'מאחורי שכינתא עומדת קבוצה שלמה,|בראשות ~שלומי ~קורקוס, מנכ"ל ומייסד.'},
    {'parts': [{'src': 10}], 'cap': '~4 ~חטיבות, תחת קורת גג ~אחת.'},
    {'parts': [{'take': 'take11.wav', 'like': 11}], 'cap': '~קורקוס ~יזמות, ~ראיתה לביצוע,|~שכינתא לפיקוח, ~ואפיק ~הנחל לתיווך.'},
    {'parts': [{'src': 12}], 'cap': 'ככה מובילים גם ~פרויקטים ~מורכבים,|~מקרקע ~ועד ~מסירת ~מפתח.'},
    {'parts': [{'src': 13}], 'cap': 'בונים בית? ~דברו ~איתנו,|עוד ~לפני ~החתימה עם הקבלן.'},
    {'parts': [{'src': 14}], 'cap': ''},
  ]},
}
run = lambda *a: subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *a])
def dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
def rms(p):
    x = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-af', 'silenceremove=stop_periods=-1:stop_threshold=-38dB', '-f', 'f32le', '-ac', '1', '-'], capture_output=True).stdout
    v = array.array('f', x); return (sum(q * q for q in v) / max(1, len(v))) ** .5
def speech(p):          # first and last moment of speech in a take
    o = subprocess.run(['ffmpeg', '-i', p, '-af', 'silencedetect=n=-38dB:d=0.05', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(v) for v in re.findall(r'silence_start: ([\d.]+)', o)]; en = [float(v) for v in re.findall(r'silence_end: ([\d.]+)', o)]
    D = dur(p); return (en[0] if st and st[0] < .05 else 0.0), (st[-1] if len(st) > len(en) else D)
REF = os.path.join(V, '_ref.wav')
def piece(pc, out, tempo):
    """one piece at the reel's tempo: the kept parts of a line of full.wav (joined with 60 ms of silence and short fades), or a take"""
    if 'take' in pc:
        src = os.path.join(V, pc['take']); a, b = speech(src)
        run('-ss', str(max(0, a - .04)), '-to', str(b + .08), '-i', src, '-af', f'atempo={tempo}', '-ar', '48000', '-ac', '1', out + '.t.wav')
        # level: the line it stands for, or the mean of the read
        ref = AL[pc['like']] if 'like' in pc else None
        if ref: run('-ss', str(ref['a']), '-to', str(ref['b']), '-i', FULL, '-ar', '48000', '-ac', '1', REF)
        else: run('-i', FULL, '-ar', '48000', '-ac', '1', REF)
        g = rms(REF) / max(1e-6, rms(out + '.t.wav'))
        run('-i', out + '.t.wav', '-af', f'volume={g:.4f},afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', out); os.remove(out + '.t.wav'); os.remove(REF); return
    x = AL[pc['src']]; keep = pc.get('keep', [(None, None)]); segs = []
    for k, (a, b) in enumerate(keep):
        a = x['a'] - .04 if a is None else a; b = x['b'] + .08 if b is None else b
        f = f'{out}.{k}.wav'; run('-ss', str(a), '-to', str(b), '-i', FULL, '-af', 'afade=t=in:d=0.015,areverse,afade=t=in:d=0.03,areverse', '-ar', '48000', '-ac', '1', f); segs.append(f)
    if len(segs) == 1: run('-i', segs[0], '-af', f'atempo={tempo}', out)
    else:
        ins = sum([['-i', s] for s in segs], []); n = len(segs)
        flt = ''.join(f'[{i}:a]' + (f'apad=pad_dur=0.06[p{i}];' if i < n - 1 else f'anull[p{i}];') for i in range(n)) + ''.join(f'[p{i}]' for i in range(n)) + f'concat=n={n}:v=0:a=1,atempo={tempo}[o]'
        run(*ins, '-filter_complex', flt, '-map', '[o]', out)
    for s in segs: os.remove(s)
for name, R in REEL.items():
    t, parts, lines = COVER + .15, [], []
    for li, ln in enumerate(R['lines']):
        a = t
        for pi, pc in enumerate(ln['parts']):
            f = os.path.join(V, f'{name}{li + 1:02d}{chr(97 + pi)}.wav'); piece(pc, f, R['tempo'])
            parts.append((f, t)); t += dur(f) + (.2 if pi < len(ln['parts']) - 1 else 0)
        lines.append({'i': li + 1, 'a': round(a, 3), 'b': round(t, 3), 'cap': ln['cap'], 'src': [p.get('src', p.get('take')) for p in ln['parts']]}); t += R['gap']
    total = round(t - R['gap'] + .1, 3)
    ins, flt = [], []
    for i, (p, at) in enumerate(parts): ins += ['-i', p]; flt.append(f'[{i}:a]adelay={int(at * 1000)}|{int(at * 1000)}[a{i}]')
    flt.append(''.join(f'[a{i}]' for i in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{total}[v]')
    run(*ins, '-filter_complex', ';'.join(flt), '-map', '[v]', '-ar', '48000', os.path.join(V, f'{name}.wav'))
    open(os.path.join(V, f'{name}-timings.js'), 'w', encoding='utf8').write('window.VT=' + json.dumps({'voice': total, 'cover': COVER, 'lines': lines}, ensure_ascii=False) + ';\n')
    print(name, total, [(x['i'], x['a'], round(x['b'] - x['a'], 2)) for x in lines])
