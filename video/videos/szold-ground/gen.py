"""Builds index.html: the Henrietta Szold ground works reel for Kurkoos. Hard cuts on the beat, a zoom punch on every cut,
a flash on every text slam, words slamming in on the grid, Almoni, Kurkoos palette. python3 gen.py"""
import json
from plan import schedule, B
shots, END, TOTAL = schedule()
blk = {s['block']: s for s in shots if s['block']}
nxt = lambda name: next(s['start'] for s in shots[shots.index(blk[name]) + 1:] if s['block']) if any(s['block'] for s in shots[shots.index(blk[name]) + 1:]) else END

TEXT = {  # block: (lines, plate colour for the last line)
    'title': (['הנרייטה סאלד', 'הוד השרון'], 'mist'),
    'ground': (['מכינים', 'את הקרקע.'], 'red'),
    'piles': (['קידוח', 'כלונסאות.'], 'red'),
    'steel': (['כלובי ברזל', 'יורדים לקרקע.'], 'red'),
    'units': (['ארבע יחידות דו משפחתיות', 'לשמונה משפחות.'], 'red'),
    'line': (['מקרקע', 'ועד מסירת מפתח.'], 'red'),
}
vids, secs, js = [], [], []
for i, s in enumerate(shots):
    keep = s['dur'] + (0.05 if i < len(shots) - 1 else 0)
    vids.append(f'      <div id="w{i}" class="layer"><video id="v{i}" class="clip vid" src="assets/seg/{s["name"]}.mp4" muted playsinline data-start="{s["start"]}" data-duration="{round(keep, 4)}" data-track-index="0"></video></div>')
    js.append(f'punch({i}, {s["start"]}, {round(s["dur"], 4)});')
for name, (lines, plate) in TEXT.items():
    t0 = blk[name]['start']; t1 = nxt(name)
    words = []
    for li, line in enumerate(lines):
        cls = 'big' if li == 0 else 'small'
        if name == 'units': cls = 'mid' if li == 0 else 'small'
        pc = 'navy' if li == 0 else plate
        words.append(f'<div class="ln {cls}"><span class="pl {pc}" id="{name}{li}">{line}</span></div>')
    secs.append(f'''      <section id="b-{name}" class="clip" data-start="{t0}" data-duration="{round(t1 - t0, 4)}" data-track-index="2">
        <div class="tx">{''.join(words)}</div>
      </section>''')
    js.append(f'slam("#{name}0", {t0 + (0.08 if name != "title" else 0.15)});')
    js.append(f'slam("#{name}1", {round(t0 + B, 4)});')
    if name != 'title': js.append(f'flash({t0});')
    js.append(f'tl.to(["#{name}0", "#{name}1"], {{ opacity: 0, x: 140, duration: 0.14, ease: "power3.in", immediateRender: false }}, {round(t1 - 0.14, 4)});')

page = f'''<!doctype html>
<html lang="he">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>קבוצת קורקוס · הנרייטה סאלד, עבודות קרקע</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face {{ font-family: "Almoni"; src: url("assets/fonts/Almoni-400.ttf"); font-weight: 400; }}
      @font-face {{ font-family: "Almoni"; src: url("assets/fonts/Almoni-700.ttf"); font-weight: 700; }}
      :root {{ --navy: #07293a; --teal: #105572; --mist: #8fb6c8; --paper: #f7f8fa; --red: #a90b0c; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--navy); }}
      #root {{ direction: rtl; position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--navy); font-family: "Almoni", sans-serif; color: var(--paper); }}
      .clip, .layer {{ position: absolute; inset: 0; overflow: hidden; }}
      .vid {{ object-fit: cover; width: 100%; height: 100%; }}
      .shade {{ position: absolute; inset: 0; pointer-events: none; z-index: 20; background: linear-gradient(180deg, rgba(7,41,58,.55) 0%, rgba(7,41,58,0) 16%, rgba(7,41,58,0) 55%, rgba(7,41,58,.7) 82%, rgba(7,41,58,.9) 100%); }}
      section[id^="b-"] {{ z-index: 25; }}
      .tx {{ position: absolute; right: 80px; left: 80px; bottom: 380px; text-align: right; }}
      .ln {{ display: block; margin-top: 14px; }}
      .pl {{ display: inline-block; font-weight: 700; line-height: 1; padding: 14px 30px 22px; border-radius: 10px; white-space: nowrap; }}
      .big .pl {{ font-size: 150px; }} .mid .pl {{ font-size: 84px; }} .small .pl {{ font-size: 92px; }}
      .navy {{ background: var(--navy); color: var(--paper); }} .red {{ background: var(--red); color: var(--paper); }} .mist {{ background: var(--mist); color: var(--navy); }}
      #logo {{ position: absolute; top: 70px; left: 60px; width: 140px; z-index: 30; }}
      #bar {{ position: absolute; right: 0; top: 0; width: 14px; height: 1920px; background: var(--red); z-index: 30; transform-origin: 50% 0; }}
      #flash {{ position: absolute; inset: 0; background: var(--paper); opacity: 0; z-index: 40; }}
      #end {{ z-index: 50; }}
      .phone {{ display: inline-block; background: var(--red); color: var(--paper); font-weight: 700; font-size: 96px; padding: 18px 60px 28px; border-radius: 90px; direction: ltr; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="{TOTAL}">
{chr(10).join(vids)}
      <div class="shade"></div>
      <img id="logo" src="assets/logo.png" alt="קבוצת קורקוס" />
      <div id="bar"></div>
{chr(10).join(secs)}
      <section id="end" class="clip" data-start="{END}" data-duration="{round(TOTAL - END, 4)}" data-track-index="3">
        <div class="layer" style="background:var(--navy)"></div>
        <div style="position:absolute; left:0; right:0; top:420px; display:flex; justify-content:center"><div id="e-wrap" style="width:400px; height:375px; overflow:hidden"><img id="e-logo" src="assets/logo.png" alt="" style="width:400px" /></div></div>
        <div style="position:absolute; left:0; right:0; top:880px; text-align:center">
          <div style="font-size:110px; font-weight:700" id="e-a">קבוצת קורקוס</div>
          <div style="font-size:58px; color:var(--mist); margin-top:14px" id="e-b">מקרקע ועד מסירת מפתח</div>
        </div>
        <div style="position:absolute; left:0; right:0; top:1150px; text-align:center"><div class="phone" id="e-phone">055-981-1814</div></div>
        <div style="position:absolute; left:0; right:0; top:1360px; text-align:center; font-size:52px; color:var(--mist); direction:ltr" id="e-site">kurkoos-group.co.il</div>
      </section>
      <audio id="music" src="assets/music.wav" data-start="0" data-duration="{TOTAL}" data-track-index="5"></audio>
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true, defaults: {{ ease: "power3.out" }} }});
      // every cut lands with a short push in that settles, so the footage hits the beat
      function punch(i, t, d) {{
        tl.fromTo("#w" + i, {{ scale: 1.14 }}, {{ scale: 1.0, duration: 0.28, ease: "expo.out", immediateRender: false }}, t);
        tl.to("#w" + i, {{ scale: 1.04, duration: Math.max(0.1, d - 0.28), ease: "none" }}, t + 0.28);
      }}
      // a word block slams in: big, tilted, then locks
      const slam = (sel, t) => tl.fromTo(sel, {{ opacity: 0, scale: 1.7, rotation: -5, x: -40 }}, {{ opacity: 1, scale: 1, rotation: 0, x: 0, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }}, t);
      const flash = t => tl.fromTo("#flash", {{ opacity: 0.85 }}, {{ opacity: 0, duration: 0.2, ease: "power2.out", immediateRender: false }}, t);
      tl.set("#flash", {{ opacity: 0 }}, 0);
      // the red edge bar pulses on the downbeats
      for (let k = 0; k * {B} < {END}; k++) if (k % 4 === 0 && k * {B} >= {shots[1]['start']}) tl.fromTo("#bar", {{ scaleY: 0 }}, {{ scaleY: 1, duration: {round(B * 2, 4)}, ease: "expo.out", immediateRender: false }}, k * {B});
      tl.set("#bar", {{ scaleY: 0 }}, 0);
      {chr(10).join("      " + x for x in js)}
      tl.fromTo("#e-wrap", {{ clipPath: "inset(100% 0 0 0)" }}, {{ clipPath: "inset(0% 0 0 0)", duration: 0.7, ease: "power3.inOut" }}, {END + 0.05});
      tl.fromTo("#e-a", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {END + 0.5});
      tl.fromTo("#e-b", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {END + 0.75});
      tl.fromTo("#e-phone", {{ scale: 0, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.8)" }}, {END + 1.0});
      tl.fromTo("#e-site", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {END + 1.3});
      tl.fromTo("#logo", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.2, immediateRender: false }}, {END});
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
'''
open('index.html', 'w', encoding='utf8').write(page)
print('total', TOTAL)
