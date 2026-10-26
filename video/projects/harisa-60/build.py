"""Builds project.json for "הריסה ובנייה מחדש" (one minute, 9:16), from the article
/constructions/harisa-uvniya-mechadash. Same engine and effects as the supervision reel v5.
  python3 video/engine/kreel/tts_gemini.py video/projects/harisa-60/script.json
  python3 video/projects/harisa-60/build.py
  python3 video/engine/kreel/render.py video/projects/harisa-60/project.json
  python3 video/engine/kreel/music.py   video/projects/harisa-60/project.json
  python3 video/engine/kreel/mix.py     video/projects/harisa-60/project.json
  bash    video/projects/harisa-60/wide.sh      (the 16:9 version)
Honesty rules: the old house and the cleared plot are one real photo. Demolition, fencing and marking are shown as
illustrations and say so. The finished houses are Kurkoos villas or illustrative pictures, never this plot."""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPO = 1.22
LEAD, GAP = 0.1, 0.05
M = 'video/projects/_media/'
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
    scenes.append({'start': a, 'end': b, 'shots': shots, 'effects': effects, 'punch': True, 'xfade': .12, **kw})
def split(n, parts):
    d = n / len(parts); out = []
    for p in parts:
        s = dict(p); s.setdefault('push', .04); s['len'] = d
        if s['src'].endswith(('.mp4', '.mov')): s.setdefault('t0', 0); s['dur'] = d
        out.append(s)
    return out
def stage(num, word, y=760):
    return [{'type': 'lower', 'at': .1, 'num': num, 'text': word},
            {'type': 'title', 'at': .05, 'until': 1.2, 'y': y, 'bar': True, 'lines': [[word, 170]]}]

# 1. the old house on a good plot: the question
a, b = 0.0, span('v01')[1]
COVER = 1.9  # the post cover opens the film, then the house
scene(a, COVER, [{'src': M + 'hr_cover.png', 'fit': 'frame', 'y': 960, 'len': COVER, 'push': .03, 'grade': False}], [], shade=False, punch=False, mark=False)
scene(COVER, b, [{'src': M + 'hr_house', 'fx': .3, 'fy': .5, 'len': b - COVER, 'push': .08}], [
    {'type': 'title', 'at': .1, 'y': 1180, 'lines': [['לשפץ?', 170], ['או לבנות מחדש?', 108, 700, 'mist']]},
    {'type': 'lower', 'at': 0, 'num': 1, 'text': 'הבית הישן'}], shade_from=.45, shade_k=.85)
# 2. checking: structure, soil, rights
a, b = span('v02'); n = b - a
scene(a, b, split(n, [{'src': M + 'ph_pikuach'}, {'src': M + 'ph_mgr'}, {'src': M + 'ph_helmetplans'}]), [
    {'type': 'chips', 'at': .4, 'y': 1180, 'items': [['1', 'מצב השלד'], ['2', 'הקרקע'], ['3', 'זכויות הבנייה']]},
    {'type': 'lower', 'at': .1, 'num': 2, 'text': 'בדיקות'}], shade_from=.5, shade_k=.85)
# 3. planning and the permit: blueprint over the same house, then the permit stamp
a, b = span('v03'); n = b - a
scene(a, b, [{'src': M + 'hr_house', 'fx': .3, 'len': n * .55, 'push': .03, 'grade': True},
             {'src': M + 'il_stamp', 'fit': 'frame', 'len': n * .45, 'push': .04}], [
    {'type': 'blueprint', 'at': .2, 'dur': 1.2, 'col': 'mist', 'grid': [80, 500, 1000, 1300], 'rects': [[180, 620, 900, 1180], [300, 760, 640, 1080]], 'out': n * .5},
    {'type': 'stamp', 'at': n * .6, 'text': 'היתר בנייה'},
    {'type': 'lower', 'at': .1, 'num': 3, 'text': 'תכנון והיתר'}], shade_from=.55, shade_k=.8)
# 4. fencing, disconnecting, controlled demolition (illustrations)
a, b = span('v04'); n = b - a
scene(a, b, [{'src': M + 'hr_il_fence', 'fit': 'frame', 'len': n * .5, 'push': .05},
             {'src': M + 'hr_il_dig', 'fit': 'frame', 'len': n * .5, 'push': .05}], [
    {'type': 'pill', 'at': .3, 'text': 'איור להמחשה', 'bg': 'teal', 'x': 1000, 'y': 1290, 'size': 40},
    {'type': 'title', 'at': .2, 'y': 1420, 'lines': [['הריסה מבוקרת', 120], ['גידור, ניתוק תשתיות ובטיחות', 64, 700, 'mist']]},
    {'type': 'lower', 'at': .1, 'num': 4, 'text': 'הריסה'}], shade=False)
# 5. the plot is cleared and marked: the empty side of the same photo, the marking illustration
a, b = span('v05'); n = b - a
scene(a, b, [{'src': M + 'hr_house', 'fx': .82, 'fy': .6, 'len': n * .5, 'push': .06},
             {'src': M + 'hr_il_plot', 'fit': 'frame', 'len': n * .5, 'push': .04}], [
    {'type': 'blueprint', 'at': .3, 'dur': .9, 'col': 'red', 'width': 5, 'paths': [[[160, 1240], [920, 1180], [980, 1520], [120, 1600], [160, 1240]]], 'out': n * .45},
    {'type': 'lower', 'at': .1, 'num': 5, 'text': 'סימון'}], shade_from=.55, shade_k=.8)
# 6. piles, foundations, frame: real Kurkoos footage, fast cuts
a, b = span('v06'); n = b - a
scene(a, b, split(n, [{'src': M + 'site_piles.mp4', 't0': 1, 'speed': 1.2}, {'src': M + 'v4_found.mp4', 't0': 0, 'speed': 1.3},
                      {'src': M + 'v4_w1full.mp4', 't0': 16.5, 'speed': 1.35}, {'src': M + 'v4_roof.mp4', 't0': 2.6, 'speed': 1.25}]),
      stage(6, 'שלד'), shade_from=.55, shade_k=.8)
# 7. systems, waterproofing, finishes, supervision
a, b = span('v07'); n = b - a
scene(a, b, split(n, [{'src': M + 'hr_pour'}, {'src': M + 'hr_t24'}, {'src': M + 'hr_t18'}, {'src': M + 'v4_ph80.webp'}]), [
    {'type': 'chips', 'at': .35, 'y': 1180, 'items': [['1', 'מערכות'], ['2', 'איטום'], ['3', 'גמר'], ['4', 'פיקוח צמוד']]},
    {'type': 'lower', 'at': .1, 'num': 7, 'text': 'גמר'}], shade_from=.5, shade_k=.85)
# 8. the new house: Kurkoos villas (not this plot)
a, b = span('v08'); n = b - a
scene(a, b, [{'src': M + 'v4_ph78.webp', 'len': n * .34, 'push': .05}, {'src': M + 'v4_ph79.webp', 'len': n * .33, 'push': .05},
             {'src': M + 'v4_ph77.webp', 'len': n * .33, 'push': .05}], [
    {'type': 'title', 'at': .3, 'y': 1200, 'lines': [['בית חדש', 170], ['מהיסוד', 110, 700, 'mist']]},
    {'type': 'pill', 'at': .3, 'text': 'מבתים שבנינו', 'bg': 'teal', 'x': 1000, 'y': 230, 'size': 40},
    {'type': 'lower', 'at': .1, 'num': 8, 'text': 'מסירה'}], shade_from=.45, shade_k=.85)
# 9. brand and the next step
a = span('v09')[0]; b = L['v09']['end'] + 1.4
scene(a, b, [{'src': M + 'v4_ph78.webp', 'len': b - a, 'push': 0}], [
    {'type': 'endcard', 'at': 0, 'blur': 10, 'tint': 200, 'lines': [
        ['קבוצת קורקוס', 110, 700, 'paper'], ['מקרקע ועד מסירת מפתח', 66, 400, 'mist'],
        ['055-981-1814', 120, 700, 'paper'], ['kurkoos-group.co.il', 46, 400, 'mist']]},
    {'type': 'pill', 'at': .9, 'text': 'לפני שמחליטים, דברו איתנו', 'bg': 'red', 'x': 960, 'y': 1500, 'size': 54},
], shade=False, punch=False)

pj = {'name': 'הריסה ובנייה מחדש: מהבית הישן לבית החדש (דקה)', 'duration': round(b, 2), 'vo_tempo': TEMPO,
      'music': {'bpm': 122, 'style': 'cinematic', 'quiet': True, 'drums': True, 'drums_from': 2.0},
      'mix': {'duck': 'steady'}, 'lines': lines, 'scenes': scenes, 'caption_style': {'size': 60, 'y': 1700}}
json.dump(pj, open(os.path.join(HERE, 'project.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('duration', pj['duration'], 's,', len(scenes), 'scenes')
