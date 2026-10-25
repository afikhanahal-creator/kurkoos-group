"""Builds project.json for "מהקרקע ועד המפתח" v5: the v4 story, faster and on the beat.
  python3 video/engine/kreel/tts_gemini.py video/projects/supervision-4-stages-v5/script.json
  python3 video/projects/supervision-4-stages-v5/build.py
  python3 video/engine/kreel/render.py video/projects/supervision-4-stages-v5/project.json
  python3 video/engine/kreel/music.py   video/projects/supervision-4-stages-v5/project.json
  python3 video/engine/kreel/mix.py     video/projects/supervision-4-stages-v5/project.json
A new shot every 1.2 to 1.4 s with a short punch on each cut, a large stage word at the start of each stage, the
walking footage slightly sped up, short crossfades. Music at 116 bpm with tonal drums, held steady under the voice
(no swell in the pauses), no transition sounds."""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPO = 1.12
LEAD, GAP = 0.15, 0.12
M = 'video/projects/_media/v4_'
script = json.load(open(os.path.join(HERE, 'script.json'), encoding='utf-8'))
def wav_len(i):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(HERE, 'vo', f'{i}.wav')]).decode())
lines, t = [], LEAD
for ln in script['lines']:
    d = wav_len(ln['id']) / TEMPO; lines.append({'id': ln['id'], 'vo': ln['id'], 'start': round(t, 3), 'end': round(t + d, 3), 'text': ln['text']}); t += d + GAP
L = {l['id']: l for l in lines}
def span(a, post=GAP): return round(L[a]['start'], 3), round(L[a]['end'] + post, 3)
def word_at(lid, word, s0):
    ln = L[lid]; txt = ln['text']; i = txt.index(word)
    return round(ln['start'] + (ln['end'] - ln['start']) * i / len(txt) - s0, 2)

scenes = []
def scene(a, b, shots, effects, **kw):
    scenes.append({'start': a, 'end': b, 'shots': shots, 'effects': effects, 'punch': True, 'xfade': .18, **kw})
def cuts(n, parts):
    """parts: [(src, t0, speed)] -> shots of equal length that fill n seconds"""
    d = n / len(parts)
    return [{'src': M + s, 't0': t0, 'len': d, 'dur': d, 'speed': sp, 'push': .03} for s, t0, sp in parts]
def stage(num, word):
    return [{'type': 'lower', 'at': .1, 'num': num, 'text': word},
            {'type': 'title', 'at': .05, 'until': 1.15, 'y': 760, 'bar': True, 'lines': [[word, 190]]}]

# 1. the hook: the plot
a, b = 0.0, span('v01')[1]
scene(a, b, cuts(b - a, [('land.mp4', 0, 1.25), ('land.mp4', 3.2, 1.25)]), [
    {'type': 'title', 'at': .25, 'y': 1150, 'lines': [['מהקרקע', 170], ['ועד המפתח', 112, 700, 'mist']]},
    {'type': 'lower', 'at': .1, 'num': 1, 'text': 'קרקע'},
], shade_from=.42, shade_k=.85)
# 2. foundations
a, b = span('v02')
scene(a, b, cuts(b - a, [('found.mp4', 0, 1.3), ('found.mp4', 3.6, 1.3), ('worker.mp4', 0, 1.0), ('found.mp4', 7.4, 1.3)]), stage(2, 'יסודות'), shade_from=.55, shade_k=.8)
# 3. walls: five angles from the walk and one from Hankin
a, b = span('v03')
scene(a, b, cuts(b - a, [('w1full.mp4', 3.5, 1.35), ('w1full.mp4', 16.5, 1.35), ('w1full.mp4', 25.5, 1.35),
                         ('w1full.mp4', 32.5, 1.35), ('walls3.mp4', 0, 1.0), ('w1full.mp4', 43.5, 1.35)]), stage(3, 'שלד'), shade_from=.55, shade_k=.8)
# 4. slab rebar
a, b = span('v04')
scene(a, b, cuts(b - a, [('roof.mp4', 0, 1.25), ('roof.mp4', 2.6, 1.25), ('roof.mp4', 5.2, 1.25), ('roof.mp4', 7.6, 1.2)]), stage(4, 'תקרה'), shade_from=.55, shade_k=.8)
# 5. zoom out to the window, the five stages, back in on "המפתח" onto the villa
a, b = span('v05'); n = b - a
z_at = word_at('v05', 'מלווים', a); z_back = word_at('v05', 'המפתח', a) - z_at
scene(a, b, [{'src': M + 'w1full.mp4', 't0': 55, 'len': n * .74, 'dur': n * .74, 'push': .02},
             {'src': M + 'ph80.webp', 'len': n * .26, 'push': .03}], [
    {'type': 'zoomout', 'at': z_at, 'back': z_back, 'scale': .52, 'title': 'אנחנו מלווים אתכם',
     'steps': ['קרקע ותכנון', 'היתר בנייה', 'שלד ובטון', 'גמר ומערכות', 'מסירת מפתח']},
], shade_from=.55, shade_k=.8, punch=False)
# 6. the villa, on the beat
a, b = span('v06')
scene(a, b, [{'src': M + 'ph79.webp', 'len': 1, 'push': .04}, {'src': M + 'ph77.webp', 'len': 1, 'push': .04}, {'src': M + 'ph80.webp', 'len': 1, 'push': .04, 'fx': .3}],
      [{'type': 'lower', 'at': .1, 'num': 5, 'text': 'מסירה'}], shade_from=.6, shade_k=.75)
# 7. brand line on the pool
a, b = span('v07')
scene(a, b, [{'src': M + 'ph78.webp', 'len': b - a, 'push': .03}], [
    {'type': 'title', 'at': .2, 'y': 1180, 'lines': [['קבוצת קורקוס', 128], ['מקרקע ועד מסירת מפתח', 74, 700, 'paper']]},
], shade_from=.32, shade_k=1.0)
# 8. the next step
a = span('v08')[0]; b = L['v08']['end'] + 1.8
scene(a, b, [{'src': M + 'ph78.webp', 'len': b - a, 'push': 0}], [
    {'type': 'endcard', 'at': 0, 'blur': 10, 'tint': 200, 'lines': [
        ['הצעד הבא', 54, 400, 'mist'], ['שיחת ייעוץ עם נציג', 100, 700, 'paper'],
        ['055-981-1814', 120, 700, 'paper'], ['kurkoos-group.co.il', 46, 400, 'mist']]},
    {'type': 'pill', 'at': .8, 'text': 'השאירו פרטים בקישור', 'bg': 'red', 'x': 815, 'y': 1500, 'size': 56},
], shade=False, punch=False)

pj = {'name': 'מהקרקע ועד המפתח: הליווי של קבוצת קורקוס (גרסה 5, קצבית)', 'duration': round(b, 2), 'vo_tempo': TEMPO,
      'music': {'bpm': 116, 'style': 'cinematic', 'quiet': True, 'drums': True, 'drums_from': 0.0},
      'mix': {'duck': 'steady'}, 'lines': lines, 'scenes': scenes, 'caption_style': {'size': 60, 'y': 1700}}
json.dump(pj, open(os.path.join(HERE, 'project.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('duration', pj['duration'], 's,', len(scenes), 'scenes; zoom out at', z_at, 'back after', z_back)
