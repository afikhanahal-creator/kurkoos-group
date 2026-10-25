"""Builds project.json for "מהקרקע ועד המפתח" (v4 of the supervision reel), vertical, cut to the real voiceover lengths.
  python3 video/engine/kreel/tts_gemini.py video/projects/supervision-4-stages-v4/script.json
  python3 video/projects/supervision-4-stages-v4/build.py
  python3 video/engine/kreel/render.py video/projects/supervision-4-stages-v4/project.json --preview
Footage: the five site videos the owner sent (stabilised, cut to clean stretches, video/projects/_media/v4_*.mp4)
and the four photos of the finished villa (v4_ph77..80). No moves added on top of the footage, no transition sounds."""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPO = 1.04
LEAD, GAP = 0.35, 0.45
M = 'video/projects/_media/v4_'
script = json.load(open(os.path.join(HERE, 'script.json'), encoding='utf-8'))
def wav_len(i):
    p = os.path.join(HERE, 'vo', f'{i}.wav')
    if not os.path.exists(p): return None
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
lines, t = [], LEAD
for ln in script['lines']:
    d = wav_len(ln['id']) or len(ln['text']) * .075      # estimate until the line is recorded
    d /= TEMPO; lines.append({'id': ln['id'], 'vo': ln['id'], 'start': round(t, 3), 'end': round(t + d, 3), 'text': ln['text']}); t += d + GAP
L = {l['id']: l for l in lines}
def span(a, b=None, pre=0.0, post=GAP): return round(L[a]['start'] - pre, 3), round(L[b or a]['end'] + post, 3)
def word_at(lid, word, s0):
    """seconds from the scene start to a word in the line, by its share of the characters"""
    ln = L[lid]; txt = ln['text']; i = txt.index(word)
    return round(ln['start'] + (ln['end'] - ln['start']) * i / len(txt) - s0, 2)

scenes = []
def scene(a, b, shots, effects, **kw):
    scenes.append({'start': a, 'end': b, 'shots': shots, 'effects': effects, 'punch': False, 'xfade': .3, **kw})
def stage(num, text): return {'type': 'lower', 'at': .25, 'num': num, 'text': text}

# 1. the hook: the bare plot
a, b = 0.0, span('v01')[1]
scene(a, b, [{'src': M + 'land.mp4', 't0': 0, 'dur': b - a}], [
    {'type': 'title', 'at': .5, 'y': 1180, 'lines': [['מהקרקע', 170], ['ועד המפתח', 112, 700, 'mist']]},
    stage(1, 'קרקע'),
], shade_from=.45, shade_k=.85)
# 2. foundations and piles
a, b = span('v02'); scene(a, b, [{'src': M + 'found.mp4', 't0': 0, 'dur': b - a}], [stage(2, 'יסודות')], shade_from=.55, shade_k=.8)
# 3. concrete walls and formwork, three angles
a, b = span('v03'); n = b - a
# walls3 is cut from the owner's edited reel, which flashes white 1.6 s in: keep it under 1.5 s
scene(a, b, [{'src': M + 'walls1.mp4', 't0': 0, 'len': n * .4, 'dur': n * .4},
             {'src': M + 'walls2.mp4', 't0': .5, 'len': n * .4, 'dur': n * .4},
             {'src': M + 'walls3.mp4', 't0': 0, 'len': n * .2, 'dur': n * .2}], [stage(3, 'שלד')], shade_from=.55, shade_k=.8)
# 4. rebar for the slab before the pour
a, b = span('v04'); scene(a, b, [{'src': M + 'roof.mp4', 't0': 0, 'dur': b - a}], [stage(4, 'תקרה')], shade_from=.55, shade_k=.8)
# 5. "we accompany you": the frame zooms out to a window, the five stages are marked, back in on "המפתח" onto the villa
a, b = span('v05'); n = b - a
z_at = word_at('v05', 'מלווים', a); z_back = word_at('v05', 'המפתח', a) - z_at
scene(a, b, [{'src': M + 'walls4.mp4', 't0': 0, 'len': n * .72, 'dur': n * .72},
             {'src': M + 'ph80.webp', 'len': n * .28}], [
    {'type': 'zoomout', 'at': z_at, 'back': z_back, 'scale': .52, 'title': 'אנחנו מלווים אתכם',
     'steps': ['קרקע ותכנון', 'היתר בנייה', 'שלד ובטון', 'גמר ומערכות', 'מסירת מפתח']},
], shade_from=.55, shade_k=.8)
# 6. the finished villa
a, b = span('v06'); n = b - a
scene(a, b, [{'src': M + 'ph80.webp', 'len': n * .34, 'push': .025},
             {'src': M + 'ph79.webp', 'len': n * .33, 'push': .025},
             {'src': M + 'ph77.webp', 'len': n * .33, 'push': .025}], [stage(5, 'מסירה')], shade_from=.6, shade_k=.75)
# 7. brand line on the pool
a, b = span('v07')
scene(a, b, [{'src': M + 'ph78.webp', 'len': b - a, 'push': .02}], [
    {'type': 'title', 'at': .25, 'y': 1180, 'lines': [['קבוצת קורקוס', 128], ['מקרקע ועד מסירת מפתח', 74, 700, 'paper']]},
], shade_from=.32, shade_k=1.0)
# 8. the next step
a = span('v08')[0]; b = L['v08']['end'] + 2.2
scene(a, b, [{'src': M + 'ph78.webp', 'len': b - a}], [
    {'type': 'endcard', 'at': 0, 'blur': 10, 'tint': 200, 'lines': [
        ['הצעד הבא', 54, 400, 'mist'], ['שיחת ייעוץ עם מהנדס', 96, 700, 'paper'],
        ['055-981-1814', 120, 700, 'paper'], ['kurkoos-group.co.il', 46, 400, 'mist']]},
    {'type': 'pill', 'at': 1.0, 'text': 'השאירו פרטים בקישור', 'bg': 'red', 'x': 815, 'y': 1500, 'size': 56},
], captions=True, shade=False)

pj = {'name': 'מהקרקע ועד המפתח: הליווי של קבוצת קורקוס (גרסה 4)', 'duration': round(b, 2), 'vo_tempo': TEMPO,
      'music': {'bpm': 84, 'style': 'cinematic', 'quiet': True}, 'lines': lines, 'scenes': scenes,
      'caption_style': {'size': 60, 'y': 1700}}
json.dump(pj, open(os.path.join(HERE, 'project.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('duration', pj['duration'], 's,', len(scenes), 'scenes; zoom out at', z_at, 'back after', z_back)
