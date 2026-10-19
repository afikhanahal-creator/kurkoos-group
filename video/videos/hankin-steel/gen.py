"""Builds index.html: the Hankin 41 steel works reel for Kurkoos, in the style of the Szold reel. Hard cuts on the beat,
a zoom punch on every cut, a flash on every text slam, words slamming in on the grid, Almoni, Kurkoos palette.
Finale: the Hankin 41 render on a white card, then the Hankin 41 logo on a clean white card. python3 gen.py"""
from plan import schedule, B
shots, END, END2, TOTAL = schedule()
blk = {s['block']: s for s in shots if s['block']}
nxt = lambda name: next((s['start'] for s in shots[shots.index(blk[name]) + 1:] if s['block']), END)

# on-screen text: only the owner's words and the fixed brand line
TEXT = {  # block: (lines, size classes, plate colour for the last line)
    'title': (['חנקין 41', 'הוד השרון'], ['big', 'small'], 'mist'),
    'steel': (['המשך עבודות ברזל', 'לקראת עבודות יציקה.'], ['mid', 'xs'], 'red'),
    'floor': (['רצפה', 'קומה 2.'], ['big', 'small'], 'red'),
    'line': (['מקרקע', 'ועד מסירת מפתח.'], ['big', 'small'], 'red'),
}
vids, secs, js = [], [], []
for i, s in enumerate(shots):
    keep = s['dur'] + (0.05 if i < len(shots) - 1 else 0)
    vids.append(f'      <div id="w{i}" class="layer"><video id="v{i}" class="clip vid" src="assets/seg/{s["name"]}.mp4" muted playsinline data-start="{s["start"]}" data-duration="{round(keep, 4)}" data-track-index="0"></video></div>')
    js.append(f'punch({i}, {s["start"]}, {round(s["dur"], 4)});')
for name, (lines, sizes, plate) in TEXT.items():
    t0 = blk[name]['start']; t1 = nxt(name)
    words = []
    for li, line in enumerate(lines):
        pc = 'navy' if li == 0 else plate
        words.append(f'<div class="ln {sizes[li]}"><span class="pl {pc}" id="{name}{li}">{line}</span></div>')
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
    <title>קבוצת קורקוס · חנקין 41, עבודות ברזל</title>
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
      .tx {{ position: absolute; right: 70px; left: 70px; bottom: 380px; text-align: right; }}
      .ln {{ display: block; margin-top: 14px; }}
      .pl {{ display: inline-block; font-weight: 700; line-height: 1; padding: 14px 30px 22px; border-radius: 10px; white-space: nowrap; }}
      .big .pl {{ font-size: 150px; }} .mid .pl {{ font-size: 92px; }} .small .pl {{ font-size: 92px; }} .xs .pl {{ font-size: 78px; }}
      .navy {{ background: var(--navy); color: var(--paper); }} .red {{ background: var(--red); color: var(--paper); }} .mist {{ background: var(--mist); color: var(--navy); }}
      #logo {{ position: absolute; top: 70px; left: 60px; width: 140px; z-index: 30; }}
      #bar {{ position: absolute; right: 0; top: 0; width: 14px; height: 1920px; background: var(--red); z-index: 30; transform-origin: 50% 0; }}
      #flash {{ position: absolute; inset: 0; background: var(--paper); opacity: 0; z-index: 40; }}
      #render, #end {{ z-index: 50; background: #fff; color: var(--navy); }}
      #r-frame {{ position: absolute; left: 0; right: 0; top: 560px; height: 608px; overflow: hidden; }}
      #r-img {{ width: 1080px; height: 608px; object-fit: cover; display: block; transform-origin: 50% 60%; }}
      #r-bar {{ position: absolute; left: 0; top: 560px; width: 1080px; height: 16px; background: var(--red); transform-origin: 100% 50%; z-index: 2; }}
      #r-a {{ position: absolute; left: 0; right: 0; top: 330px; text-align: center; font-size: 150px; font-weight: 700; line-height: 1; }}
      #r-b {{ position: absolute; left: 0; right: 0; top: 1230px; text-align: center; font-size: 64px; color: var(--teal); }}
      #e-wrap {{ position: absolute; left: 110px; top: 690px; width: 860px; height: 390px; overflow: hidden; }}
      #e-logo {{ width: 860px; display: block; }}
      #e-b {{ position: absolute; left: 0; right: 0; top: 1240px; text-align: center; font-size: 50px; color: var(--navy); }}
      #e-site {{ position: absolute; left: 0; right: 0; top: 1330px; text-align: center; font-size: 46px; color: var(--teal); direction: ltr; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="{TOTAL}">
{chr(10).join(vids)}
      <div class="shade"></div>
      <img id="logo" src="assets/logo.png" alt="קבוצת קורקוס" />
      <div id="bar"></div>
{chr(10).join(secs)}
      <section id="render" class="clip" data-start="{END}" data-duration="{round(END2 - END, 4)}" data-track-index="3">
        <div id="r-a">חנקין 41</div>
        <div id="r-bar"></div>
        <div id="r-frame"><img id="r-img" src="assets/render.jpg" alt="הדמיה: חנקין 41" /></div>
        <div id="r-b">הוד השרון</div>
      </section>
      <section id="end" class="clip" data-start="{END2}" data-duration="{round(TOTAL - END2, 4)}" data-track-index="3">
        <div id="e-wrap"><img id="e-logo" src="assets/hankin-logo.png" alt="חנקין 41" /></div>
        <div id="e-b">קבוצת קורקוס · מקרקע ועד מסירת מפתח</div>
        <div id="e-site">kurkoos-group.co.il</div>
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
      // render card: the picture wipes up under the red bar and pushes in slowly, the title slams
      tl.fromTo("#r-frame", {{ clipPath: "inset(0 0 100% 0)" }}, {{ clipPath: "inset(0 0 0% 0)", duration: 0.5, ease: "power3.inOut" }}, {END});
      tl.fromTo("#r-bar", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.4, ease: "expo.out" }}, {END});
      tl.fromTo("#r-img", {{ scale: 1.0 }}, {{ scale: 1.09, duration: {round(END2 - END, 4)}, ease: "none" }}, {END});
      tl.fromTo("#r-a", {{ opacity: 0, scale: 1.6, rotation: -4 }}, {{ opacity: 1, scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2)" }}, {round(END + 0.1, 4)});
      tl.fromTo("#r-b", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {round(END + B, 4)});
      tl.to(["#r-a", "#r-b"], {{ opacity: 0, duration: 0.14, ease: "power3.in", immediateRender: false }}, {round(END2 - 0.14, 4)});
      tl.to("#r-frame", {{ clipPath: "inset(0 0 100% 0)", duration: 0.2, ease: "power3.in", immediateRender: false }}, {round(END2 - 0.2, 4)});
      // logo card: the logo draws in from the right, the brand line and the site settle under it
      tl.fromTo("#e-wrap", {{ clipPath: "inset(0 0 0 100%)" }}, {{ clipPath: "inset(0 0 0 0%)", duration: 0.8, ease: "power3.inOut" }}, {round(END2 + 0.05, 4)});
      tl.fromTo("#e-b", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {round(END2 + 0.9, 4)});
      tl.fromTo("#e-site", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {round(END2 + 1.15, 4)});
      tl.fromTo("#logo", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.2, immediateRender: false }}, {END});
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
'''
open('index.html', 'w', encoding='utf8').write(page)
print('cuts end', END, 'render card to', END2, 'total', TOTAL)
