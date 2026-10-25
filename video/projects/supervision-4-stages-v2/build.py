"""Builds project.json for "ארבעת השלבים" v2 from the real length of every voiceover line (vo/durations.json),
so the picture is cut to the voice. Edit the scenes here, then:
  python3 video/engine/kreel/tts_gemini.py video/projects/supervision-4-stages-v2/script.json
  python3 video/projects/supervision-4-stages-v2/build.py
  python3 video/engine/kreel/render.py video/projects/supervision-4-stages-v2/project.json --preview
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
TEMPO = 1.08          # the voice is read 8% faster than Gemini's calm default (still unhurried)
LEAD, GAP = 0.45, 0.5  # silence before the first line, and between lines
M = 'video/projects/_media/'; HK = 'video/videos/hankin-steel/assets/seg/'; SZ = 'video/videos/szold-ground/assets/seg/'
script = json.load(open(os.path.join(HERE, 'script.json'), encoding='utf-8'))
D = json.load(open(os.path.join(HERE, 'vo', 'durations.json')))
lines, t = [], LEAD
for ln in script['lines']:
    d = D[ln['id']] / TEMPO; lines.append({'id': ln['id'], 'vo': ln['id'], 'start': round(t, 3), 'end': round(t + d, 3), 'text': ln['text']}); t += d + GAP
L = {l['id']: l for l in lines}
def span(a, b=None, pre=0.0, post=GAP): return round(L[a]['start'] - pre, 3), round(L[b or a]['end'] + post, 3)
def at(lid, frac, s0): return round(L[lid]['start'] + (L[lid]['end'] - L[lid]['start']) * frac - s0, 2)

scenes = []
def scene(a, b, shots, effects, **kw): scenes.append({'start': a, 'end': b, 'shots': shots, 'effects': effects, **kw}); return a

# 1. hook: the site in the first video, big title
s0, s1 = 0.0, span('v01')[1]
scene(s0, s1, [{'src': M + 'site_piles.mp4', 't0': 0.0, 'dur': s1, 'fit': 'frame', 'y': 700, 'push': .05}], [
    {'type': 'pill', 'at': 0.5, 'text': 'פיקוח בנייה', 'bg': 'red', 'x': W_R if (W_R := 1000) else 1000, 'y': 1090, 'size': 50},
    {'type': 'title', 'at': 0.8, 'y': 1260, 'bar': False, 'lines': [['4 דברים', 160], ['שכל משפחה צריכה לדעת', 82, 700, 'mist']]},
], shade=False, punch=False)
# chapter cards: the card covers the next shot, which already plays under it
def chap(lid, num, text, sub, shot):
    a, b = span(lid, pre=.2)
    scene(a, b, [shot], [{'type': 'chapcard', 'at': 0, 'num': num, 'text': text, 'sub': sub, 'out': b - a - .35}], captions=False, shade=False, punch=False, mark=False, xfade=.35)
def bar(num, text): return {'type': 'lower', 'at': 0.2, 'num': num, 'text': text}

# 2. chapter 1: who the supervisor answers to
chap('v02', 1, 'למי המפקח עונה', 'מטעם בעלי הבית', {'src': M + 'site_piles.mp4', 't0': 8.0, 'dur': 3.5, 'fit': 'frame', 'y': 700})
a, b = span('v03')
mid = (b - a) * .5
scene(a, b, [{'src': M + 'site_piles.mp4', 't0': 9.5, 'len': mid, 'dur': mid + .2, 'fit': 'frame', 'y': 680, 'push': .06},
             {'src': M + 'ph_skeleton', 'len': (b - a) - mid, 'fit': 'frame', 'y': 680, 'push': .08}], [
    bar(1, 'למי המפקח עונה'),
    {'type': 'roles', 'at': at('v03', .02, a), 'until': mid - .1, 'y': 1300, 'w': 300, 'h': 360, 'stagger': .35, 'items': [
        {'label': 'בעלי הבית', 'img': M + 'il_door', 'sub': 'המפקח עובד בשבילם'},
        {'label': 'המפקח', 'img': M + 'il_helmet', 'sub': 'בודק את העבודה'},
        {'label': 'הקבלן', 'img': M + 'il_mixer', 'sub': 'מבצע את העבודה'}]},
    {'type': 'callout', 'at': mid + .3, 'x': 560, 'y': 640, 'lx': 560, 'ly': 1180, 'text': 'בדיקה באתר', 'sub': 'מול התוכניות'},
], shade=False, punch=False, xfade=.35)

# 3. chapter 2: checks before a pour (our Hankin 41 footage, slowed down so it can be read)
chap('v04', 2, 'בדיקות לפני יציקה', 'הרגע הקריטי', {'src': HK + 's04.mp4', 't0': 0, 'dur': 2.4, 'speed': .5})
a, b = span('v05'); n = b - a
scene(a, b, [{'src': HK + 's04.mp4', 't0': 0, 'len': n * .3, 'dur': n * .3, 'speed': .5, 'push': .08},
             {'src': HK + 's06.mp4', 't0': 0, 'len': n * .25, 'dur': n * .25, 'speed': .45, 'push': .08},
             {'src': SZ + 's16.mp4', 't0': 0, 'len': n * .45, 'dur': n * .45, 'speed': .5, 'push': .05}], [
    bar(2, 'בדיקות לפני יציקה'),
    {'type': 'callout', 'at': at('v05', .16, a), 'until': n * .3 - .05, 'x': 520, 'y': 980, 'lx': 560, 'ly': 520, 'text': 'ברזל זיון'},
    {'type': 'callout', 'at': n * .3 + .2, 'until': n * .55 - .05, 'x': 560, 'y': 820, 'lx': 560, 'ly': 1230, 'text': 'טפסנות'},
    {'type': 'blueprint', 'at': n * .55 + .1, 'until': n * .72, 'dur': .7, 'rects': [[150, 560, 930, 1360]], 'paths': [[[150, 960], [930, 960]], [[540, 560], [540, 1360]]]},
    {'type': 'callout', 'at': n * .55 + .3, 'until': n * .72, 'x': 560, 'y': 1180, 'lx': 560, 'ly': 520, 'text': 'מיקום', 'sub': 'לפי התוכניות'},
    {'type': 'freeze', 'at': n * .72, 'dur': n * .28 - .05},
    {'type': 'quote', 'at': n * .72 + .1, 'y': 760, 'size': 84, 'stagger': .6, 'lines': ['אחרי שהבטון מתקשה,', 'כבר מאוחר לתקן.']},
], shade_from=.6, shade_k=.6, punch=False, xfade=.35)

# 4. chapter 3: bills and payments
chap('v06', 3, 'חשבונות ותשלומים', 'לפני שמשלמים', {'src': M + 'site_piles.mp4', 't0': 15.0, 'dur': 3.0, 'fit': 'frame', 'y': 640})
a, b = span('v07'); n = b - a
scene(a, b, [{'src': M + 'site_piles.mp4', 't0': 16.0, 'len': n * .55, 'dur': n * .55, 'fit': 'frame', 'y': 600, 'push': .05},
             {'src': HK + 's10.mp4', 't0': 0, 'len': n * .45, 'dur': n * .45, 'speed': .5, 'push': .06}], [
    bar(3, 'חשבונות ותשלומים'),
    {'type': 'checklist', 'at': at('v07', .05, a), 'y': 1180, 'w': 900, 'title': 'כל חשבון של הקבלן נבדק', 'stagger': n * .3,
     'items': ['מול מה שבוצע בפועל', 'מול ההסכם', 'ורק אז משלמים']},
], shade_from=.55, shade_k=.75, punch=False, xfade=.35)

# 5. chapter 4: handover walk and defects
chap('v08', 4, 'סיור מסירה וליקויים', 'לפני שמקבלים מפתח', {'src': M + 'ph_hm1', 'len': 3, 'push': .05})
a, b = span('v09'); n = b - a
scene(a, b, [{'src': M + 'ph_hm1', 'len': n * .3, 'push': .06, 'fx': .55},
             {'src': M + 'ph_rm5', 'len': n * .35, 'push': .06, 'fx': .45},
             {'src': M + 'ph_sk2', 'len': n * .35, 'push': .05}], [
    bar(4, 'סיור מסירה וליקויים'),
    {'type': 'checks', 'at': n * .3 + .3, 'until': n * .65, 'r': 70, 'stagger': .5, 'points': [[300, 1050, 'גמרים'], [760, 640, 'חלונות'], [820, 1260, 'רצפה']]},
    {'type': 'checklist', 'at': n * .62, 'y': 1150, 'w': 900, 'title': 'סיור מסירה', 'stagger': .55, 'items': ['פרט אחר פרט', 'תיעוד כל ליקוי', 'מעקב עד התיקון']},
], shade_from=.55, shade_k=.8, punch=False, xfade=.35)

# 6. the message: from the skeleton to the finished home (match cut)
a, b = span('v10'); n = b - a
scene(a, b, [{'src': M + 'ph_skeleton', 'len': n * .42, 'fit': 'frame', 'y': 640, 'push': .06},
             {'src': M + 'ph_hm4', 'len': n * .58, 'push': .07, 'fx': .45, 'in': 'wipe'}], [
    {'type': 'quote', 'at': at('v10', .3, a), 'y': 1180, 'size': 76, 'stagger': .9, 'lines': ['שואלים שאלות טובות יותר,', 'ומקבלים בית טוב יותר.']},
], shade_from=.5, shade_k=.85, punch=False, xfade=.35)

# 7. brand: the office portrait, no name on screen
a, b = span('v11')
scene(a, b, [{'src': M + 'ph_owner_office', 'len': b - a, 'fy': .2, 'push': .05}], [
    {'type': 'title', 'at': .3, 'y': 1300, 'lines': [['קבוצת קורקוס', 130], ['מקרקע ועד מסירת מפתח', 76, 400, 'mist']]},
], shade_from=.45, shade_k=.92, punch=False, xfade=.35)

# 8. end card: the carousel, the call to action, phone and site
a = span('v12')[0]; b = L['v12']['end'] + 1.6
scene(a, b, [{'src': M + 'ph_hm3', 'len': b - a, 'push': .04}], [
    {'type': 'endcard', 'at': 0, 'lines': [['פיקוח בנייה | קבוצת קורקוס', 74, 700, 'paper'], ['055-981-1814', 118, 700, 'paper'], ['kurkoos-group.co.il/divisions/supervision', 42, 400, 'mist']]},
    {'type': 'float', 'at': .5, 'src': M + 'post_cover', 'x': 540, 'y': 1330, 'w': 420, 'rot': -3, 'bob': 6},
    {'type': 'pill', 'at': .8, 'text': 'כתבו "מדריך" בתגובות', 'bg': 'red', 'x': 860, 'y': 1650, 'size': 52},
], captions=False, shade=False, punch=False, xfade=.35)

pj = {'name': 'פיקוח בנייה: ארבעת הדברים שכל משפחה צריכה לדעת (גרסה 2)', 'duration': round(b, 2), 'vo_tempo': TEMPO,
      'music': {'bpm': 92, 'style': 'cinematic'}, 'lines': lines, 'scenes': scenes,
      'caption_style': {'size': 60, 'y': 1700}}
json.dump(pj, open(os.path.join(HERE, 'project.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('duration', pj['duration'], 's,', len(scenes), 'scenes,', len(lines), 'lines')
