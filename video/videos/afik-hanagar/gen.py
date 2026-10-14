"""Builds index.html for the Hanagar 24 office reel (Afik HaNahal): fast cuts, photo cards over the footage, silent.
python3 gen.py  (reads assets/seg/segs.json written by prep.py)
"""
import json, html

SEG = {s['name']: s for s in json.load(open('assets/seg/segs.json'))}
T = 0.4  # transition length

PLAN = [
    ('work', None, 0, 'intro'),
    ('shelf', 'zoom', 0, 'size'),
    ('open', 'whip', 0, 'open'),
    ('meet', 'flash', 1, 'rooms'),
    ('room', 'cut', 1, None),
    ('table', 'whip', 2, 'desks'),
    ('kitchen', 'zoom', 3, 'kitchen'),
    ('window', 'whip', 4, 'windows'),
    ('view', 'cut', 4, 'air'),
    ('lounge', 'flash', 5, 'fit'),
    ('glass', 'zoom', 6, 'place'),
]
AREAS = ['החלל', 'חדרים', 'עמדות עבודה', 'מטבח', 'אור ואוויר', 'למי זה מתאים', 'המיקום']

t = 0.0
clips = []
for i, (name, tr, area, block) in enumerate(PLAN):
    d = SEG[name]['dur']
    clips.append(dict(i=i, name=name, tr=tr, area=area, block=block, start=round(t, 3), dur=d, pad=SEG[name]['pad']))
    t += d
END_START = round(t, 3)
TOTAL = round(t + 4.2, 3)

vids, texts, js = [], [], []
for c in clips:
    keep = c['dur'] + (T if c['i'] < len(clips) - 1 else 0.0)  # stays under the next shot while it arrives
    vids.append(f'''      <div id="w{c['i']}" class="layer vw"><video id="v{c['i']}" class="clip vid" src="assets/seg/{c['name']}.mp4" muted playsinline data-start="{c['start']}" data-duration="{round(keep, 3)}" data-media-start="{c['pad']}" data-track-index="0"></video></div>''')
    s = c['start']
    js.append(f'tl.fromTo("#w{c["i"]}", {{ scale: 1.06 }}, {{ scale: 1.0, duration: {round(keep, 3)}, ease: "none", immediateRender: false }}, {s});')
    if c['tr'] == 'whip':
        js.append(f'whip({c["i"] - 1}, {c["i"]}, {s});')
    elif c['tr'] == 'zoom':
        js.append(f'zoomThrough({c["i"] - 1}, {c["i"]}, {s});')
    elif c['tr'] == 'flash':
        js.append(f'flash({s});')
    if c['i'] == 0 or clips[c['i'] - 1]['area'] != c['area']:
        js.append(f'area({c["area"]}, {s});')

g = {c['block']: c for c in clips if c['block']}
def at(block, off=0.0): return round(g[block]['start'] + off, 3)
def span(block, n=1, cut=0.3): i = g[block]['i']; return round(sum(clips[j]['dur'] for j in range(i, i + n)) - cut, 3)

cards = ''.join(f'<div class="card" id="cd{n}" style="left:{70 + n * 190}px; top:{380 + (n % 2) * 70}px"><img src="assets/photos/p{n}.jpg" alt="" /></div>' for n in range(4))
blocks = f'''
      <section id="b-intro" class="clip" data-start="0" data-duration="{at('size') - 0.05}" data-track-index="2">
        <div class="tx">
          <div id="i-chip" class="chip">מתפנה בהוד השרון</div>
          <div class="h peri" style="font-size:112px; margin-top:26px; white-space:nowrap"><span class="line"><span id="i-a">משרד שהוא</span></span></div>
          <div class="h" style="font-size:150px; white-space:nowrap"><span class="line"><span id="i-b">פשוט הצגה.</span></span></div>
        </div>
      </section>
      <section id="b-size" class="clip" data-start="{at('size', 0.25)}" data-duration="{span('size')}" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="sz-a">המשרד משתרע על פני</div>
          <div class="h huge"><span id="sz-n" class="num">165</span><span class="unit"> מ״ר</span></div>
        </div>
      </section>
      <section id="b-open" class="clip" data-start="{at('open', 0.25)}" data-duration="{span('open')}" data-track-index="2">
        <div class="tx">
          <div class="h mid"><span class="line"><span id="op-a">אופן ספייס</span></span></div>
          <div class="h mid peri"><span class="line"><span id="op-b">מרווח.</span></span></div>
        </div>
      </section>
      <section id="b-rooms" class="clip" data-start="{at('rooms', 0.2)}" data-duration="{span('rooms', 2)}" data-track-index="2" data-layout-allow-overlap>
        {cards}
        <div class="tx">
          <div class="h huge"><span id="rm-n" class="num">4</span><span class="unit"> חדרים</span></div>
          <div class="h small peri" id="rm-b">סגורים</div>
        </div>
      </section>
      <section id="b-desks" class="clip" data-start="{at('desks', 0.25)}" data-duration="{span('desks')}" data-track-index="2">
        <div class="tx"><div class="pill" id="dk">עמדות עבודה<br>מותאמות לצוות</div></div>
      </section>
      <section id="b-kitchen" class="clip" data-start="{at('kitchen', 0.3)}" data-duration="{span('kitchen', 1, 0.35)}" data-track-index="2">
        <div class="tx"><div class="pill" id="kt">מטבח מאובזר</div></div>
      </section>
      <section id="b-windows" class="clip" data-start="{at('windows', 0.25)}" data-duration="{span('windows')}" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="wn-a">חלונות גדולים</div>
          <div class="h mid"><span class="line"><span id="wn-b">שנפתחים</span></span></div>
          <div class="h mid"><span class="line"><span id="wn-c">לחלוטין.</span></span></div>
        </div>
      </section>
      <section id="b-air" class="clip" data-start="{at('air', 0.15)}" data-duration="{span('air', 1, 0.2)}" data-track-index="2">
        <div class="tx">
          <div class="h mid"><span class="line"><span id="ar-a">המון אוויר צלול</span></span></div>
          <div class="h mid green"><span class="line"><span id="ar-b">ואור טבעי.</span></span></div>
        </div>
      </section>
      <section id="b-fit" class="clip" data-start="{at('fit', 0.2)}" data-duration="{span('fit', 1, 0.25)}" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="ft-a">מתאים בול ל:</div>
          <div class="tag" id="ft1">חברות הייטק</div>
          <div class="tag" id="ft2">סטארטאפים</div>
          <div class="tag" id="ft3" style="font-size:50px; white-space:nowrap">עסקים שרוצים סביבת עבודה מעולה</div>
        </div>
      </section>
      <section id="b-place" class="clip" data-start="{at('place', 0.25)}" data-duration="{span('place', 1, 0.3)}" data-track-index="2">
        <div class="tx">
          <div class="h mid"><span class="line"><span id="pl-a">רחוב הנגר 24,</span></span></div>
          <div class="h small peri" id="pl-b">הוד השרון</div>
          <div class="pill sm" id="pl1">מעל הסטופ מרקט</div>
          <div class="pill sm" id="pl2">במרחק נגיעה מהפארק האקולוגי</div>
        </div>
      </section>
      <section id="b-end" class="clip" data-start="{END_START}" data-duration="4.2" data-track-index="3">
        <div class="layer" style="background:var(--night)"></div>
        <div style="position:absolute; left:0; right:0; top:300px; display:flex; justify-content:center">
          <div id="e-wrap" style="width:400px; height:383px; overflow:hidden"><img id="e-logo" src="assets/ah.svg" alt="אפיק הנחל" style="width:400px; height:383px" /></div>
        </div>
        <div style="position:absolute; left:0; right:0; top:760px; text-align:center">
          <div class="h" style="font-size:80px" id="e-a">אפיק הנחל</div>
          <div class="peri" style="font-size:50px; font-weight:500; margin-top:10px" id="e-b">ייזום, שיווק ותיווך</div>
        </div>
        <div style="position:absolute; left:0; right:0; top:1020px; text-align:center"><div style="font-size:58px; font-weight:700; margin-bottom:10px" id="e-c">מוזמנים לדבר איתנו</div><div class="peri" style="font-size:48px; font-weight:500; margin-bottom:30px" id="e-d">לפרטים ולתיאום סיור במקום</div><div class="phone" id="e-phone">055-981-1814</div></div>
        <div style="position:absolute; left:0; right:0; top:1440px; text-align:center; font-size:56px; font-weight:500; direction:ltr" id="e-site">afikhanahal.co.il</div>
      </section>'''

text_js = f'''
      tl.fromTo("#i-chip", {{ scale: 0, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.35, ease: BACK }}, 0.12);
      rise("#i-a", 0.3, 0.45); rise("#i-b", 0.55, 0.45);
      tl.to(["#i-a", "#i-b", "#i-chip"], {{ yPercent: -110, opacity: 0, duration: 0.25, ease: "power3.in", stagger: 0.03 }}, {at('size') - 0.3});
      tl.fromTo("#sz-a", {{ opacity: 0, x: 120 }}, {{ opacity: 1, x: 0, duration: 0.35 }}, {at('size', 0.25)});
      count("#sz-n", 165, {at('size', 0.3)}, 1.0);
      tl.fromTo("#sz-n", {{ opacity: 0, y: 50 }}, {{ opacity: 1, y: 0, duration: 0.35, ease: E4 }}, {at('size', 0.3)});
      rise("#op-a", {at('open', 0.3)}, 0.4); rise("#op-b", {at('open', 0.45)}, 0.4);
      [0, 1, 2, 3].forEach(n => {{
        tl.fromTo("#cd" + n, {{ opacity: 0, y: 260, rotation: (n - 1.5) * 22, scale: 0.6 }}, {{ opacity: 1, y: 0, rotation: (n - 1.5) * 5, scale: 1, duration: 0.5, ease: BACK }}, {at('rooms', 0.35)} + n * 0.14);
        tl.to("#cd" + n, {{ y: -40, duration: 1.4, ease: "none" }}, {at('rooms', 0.85)} + n * 0.14);
        tl.to("#cd" + n, {{ opacity: 0, x: -700, rotation: -25, duration: 0.35, ease: "power3.in" }}, {at('rooms') + span('rooms', 2) - 0.25} + n * 0.04);
      }});
      tl.fromTo("#rm-n", {{ opacity: 0, scale: 1.6 }}, {{ opacity: 1, scale: 1, duration: 0.4, ease: E4 }}, {at('rooms', 0.3)});
      tl.fromTo("#rm-b", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, {at('rooms', 0.6)});
      pill("#dk", {at('desks', 0.3)}); pill("#kt", {at('kitchen', 0.35)});
      tl.fromTo("#wn-a", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, {at('windows', 0.25)});
      rise("#wn-b", {at('windows', 0.4)}, 0.4); rise("#wn-c", {at('windows', 0.55)}, 0.4);
      rise("#ar-a", {at('air', 0.2)}, 0.4); rise("#ar-b", {at('air', 0.38)}, 0.4);
      tl.fromTo("#ft-a", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, {at('fit', 0.2)});
      ["#ft1", "#ft2", "#ft3"].forEach((x, i) => tl.fromTo(x, {{ opacity: 0, scale: 0.4, x: 120 }}, {{ opacity: 1, scale: 1, x: 0, duration: 0.35, ease: BACK }}, {at('fit', 0.35)} + i * 0.22));
      rise("#pl-a", {at('place', 0.3)}, 0.45);
      tl.fromTo("#pl-b", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, {at('place', 0.5)});
      pill("#pl1", {at('place', 0.8)}); pill("#pl2", {at('place', 1.15)});
      tl.fromTo("#e-wrap", {{ clipPath: "inset(0 100% 0 0)" }}, {{ clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power3.inOut" }}, {END_START + 0.1});
      tl.fromTo("#e-logo", {{ scale: 1.15 }}, {{ scale: 1, duration: 1.3, ease: "power2.out" }}, {END_START + 0.1});
      tl.fromTo("#e-a", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {END_START + 0.6});
      tl.fromTo("#e-b", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {END_START + 0.8});
      tl.fromTo("#e-c", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {END_START + 1.1});
      tl.fromTo("#e-d", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {END_START + 1.3});
      tl.fromTo("#e-phone", {{ scale: 0, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.5, ease: BACK }}, {END_START + 1.5});
      tl.fromTo("#e-site", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.4 }}, {END_START + 1.9});
      tl.fromTo("#map", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.3, immediateRender: false }}, {END_START});
'''

steps = ''.join(f'<div class="st" id="m{i}"><i></i><span>{html.escape(a)}</span></div>' for i, a in enumerate(AREAS))

page = f'''<!doctype html>
<html lang="he">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>אפיק הנחל · משרד בהנגר 24, הוד השרון</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face {{ font-family: "Rubik"; src: url("assets/fonts/Rubik-400.ttf"); font-weight: 400; }}
      @font-face {{ font-family: "Rubik"; src: url("assets/fonts/Rubik-500.ttf"); font-weight: 500; }}
      @font-face {{ font-family: "Rubik"; src: url("assets/fonts/Rubik-700.ttf"); font-weight: 700; }}
      @font-face {{ font-family: "Rubik"; src: url("assets/fonts/Rubik-800.ttf"); font-weight: 800; }}
      @font-face {{ font-family: "Rubik"; src: url("assets/fonts/Rubik-900.ttf"); font-weight: 900; }}
      :root {{ --night: #09090f; --deep: #0e0e1c; --cream: #e8e4d8; --peri: #8490d8; --green: #82f67f; }}
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--night); }}
      #root {{ direction: rtl; position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--night); font-family: "Rubik", sans-serif; color: var(--cream); }}
      .clip, .layer {{ position: absolute; inset: 0; overflow: hidden; }}
      .vid {{ object-fit: cover; width: 100%; height: 100%; }}
      .shade {{ position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(9,9,15,.75) 0%, rgba(9,9,15,0) 18%, rgba(9,9,15,0) 48%, rgba(9,9,15,.8) 74%, rgba(9,9,15,.96) 100%); z-index: 20; }}
      section[id^="b-"] {{ z-index: 25; }}
      .tx {{ position: absolute; right: 80px; left: 80px; bottom: 210px; text-align: right; }}
      .h {{ font-weight: 800; line-height: 1.04; letter-spacing: -1px; }}
      .big {{ font-size: 190px; margin-top: 26px; }} .mid {{ font-size: 110px; }} .small {{ font-size: 62px; }} .huge {{ font-size: 260px; line-height: 1.2; margin: 6px 0; }}
      .unit {{ font-size: 100px; }} .num {{ display: inline-block; direction: ltr; }}
      .note {{ font-size: 54px; font-weight: 500; margin-top: 18px; }}
      .line {{ display: block; overflow: hidden; padding-bottom: 10px; }} .line > span {{ display: inline-block; }}
      .peri {{ color: var(--peri); }} .green {{ color: var(--green); }}
      .chip {{ display: inline-flex; background: var(--green); color: var(--night); font-weight: 800; font-size: 46px; padding: 10px 30px 14px; border-radius: 40px; }}
      .pill {{ display: inline-block; background: var(--night); color: var(--cream); font-weight: 800; font-size: 72px; padding: 16px 40px 26px; border-radius: 26px; border-right: 12px solid var(--green); }}
      .roads {{ display: flex; gap: 40px; margin-top: 30px; direction: rtl; justify-content: flex-start; }}
      .road {{ width: 210px; height: 210px; border-radius: 32px; background: var(--peri); color: var(--night); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 104px; border: 8px solid var(--cream); }}
      .terms {{ position: absolute; right: 80px; left: 80px; top: 470px; text-align: right; }}
      .term {{ display: flex; justify-content: space-between; align-items: baseline; padding: 30px 0 34px; border-bottom: 2px solid rgba(132,144,216,.35); }}
      .term b {{ font-weight: 800; font-size: 74px; }} .term i {{ font-style: normal; font-weight: 500; font-size: 44px; color: var(--peri); }}
      .fine {{ margin-top: 46px; font-size: 46px; font-weight: 500; line-height: 1.4; }}
      .phone {{ display: inline-block; background: var(--green); color: var(--night); font-weight: 900; font-size: 100px; padding: 16px 60px 26px; border-radius: 90px; direction: ltr; }}
      .logo {{ position: absolute; top: 64px; left: 60px; width: 132px; height: 126px; z-index: 30; }}
      /* the tour map: where we are in the property, all the time */
      #map {{ position: absolute; right: 60px; top: 70px; z-index: 30; text-align: right; }}
      #map .cur {{ display: inline-block; background: var(--night); border: 2px solid rgba(132,144,216,.6); border-radius: 40px; padding: 10px 28px 14px; font-weight: 700; font-size: 44px; color: var(--cream); }}
      #map .dots {{ display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; direction: rtl; }}
      #map .st {{ width: 52px; height: 8px; border-radius: 4px; background: rgba(232,228,216,.3); position: relative; overflow: hidden; }}
      #map .st i {{ position: absolute; inset: 0; background: var(--green); transform-origin: 100% 50%; }}
      #map .st span {{ display: none; }}
      .curlabel {{ position: absolute; right: 0; top: 0; white-space: nowrap; }}
      .card {{ position: absolute; width: 330px; height: 587px; background: var(--cream); padding: 12px; border-radius: 18px; box-shadow: 0 30px 60px rgba(0,0,0,.55); z-index: 26; }}
      .card img {{ width: 100%; height: 100%; object-fit: cover; border-radius: 10px; display: block; }}
      .tag {{ display: table; margin-top: 18px; background: var(--peri); color: var(--night); font-weight: 800; font-size: 60px; padding: 12px 34px 18px; border-radius: 40px; }}
      .pill.sm {{ display: table; font-size: 54px; margin-top: 18px; padding: 12px 32px 20px; }}
      #flash {{ position: absolute; inset: 0; background: #fff; opacity: 0; z-index: 40; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="{TOTAL}">
{chr(10).join(vids)}
      <svg width="0" height="0" style="position:absolute"><filter id="whipblur" x="-20%" y="0" width="140%" height="100%"><feGaussianBlur id="whipdev" stdDeviation="0 0" /></filter></svg>
      <div class="shade"></div>
      <img class="logo" src="assets/ah.svg" alt="אפיק הנחל" />
      <div id="map" data-layout-allow-overlap>
        <div class="cur" style="position:relative; min-width:340px; height:74px" data-layout-allow-overlap>{''.join(f'<span class="curlabel" id="al{i}" style="padding:10px 28px 14px">{html.escape(a)}</span>' for i, a in enumerate(AREAS))}</div>
        <div class="dots">{steps}</div>
      </div>
{blocks}
      <div id="flash"></div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true, defaults: {{ ease: "power3.out" }} }});
      const E4 = "power4.out", BACK = "back.out(1.7)";
      const rise = (sel, at, d = 0.5) => tl.fromTo(sel, {{ yPercent: 110 }}, {{ yPercent: 0, duration: d, ease: E4 }}, at);
      const pill = (sel, at) => tl.fromTo(sel, {{ opacity: 0, x: 200, scale: 0.9 }}, {{ opacity: 1, x: 0, scale: 1, duration: 0.45, ease: E4 }}, at);
      function count(sel, to, at, d) {{ const o = {{ v: 0 }}; const el = document.querySelector(sel); tl.fromTo(o, {{ v: 0 }}, {{ v: to, duration: d, ease: "power2.out", onUpdate: () => {{ el.textContent = Math.round(o.v); }} }}, at); }}
      const blur = {{ b: 0 }}; const dev = document.getElementById("whipdev");
      const setBlur = () => dev.setAttribute("stdDeviation", blur.b + " 0");
      // whip pan: the old shot flies out left with motion blur, the new one arrives from the right
      function whip(a, b, t) {{
        tl.set(["#w" + a, "#w" + b], {{ filter: "url(#whipblur)" }}, t - 0.02);
        tl.fromTo("#w" + a, {{ xPercent: 0 }}, {{ xPercent: -100, duration: {T}, ease: "power3.in", immediateRender: false }}, t);
        tl.fromTo("#w" + b, {{ xPercent: 100 }}, {{ xPercent: 0, duration: {T}, ease: "power3.out", immediateRender: false }}, t + 0.05);
        tl.fromTo(blur, {{ b: 0 }}, {{ b: 55, duration: {T / 2}, ease: "power2.in", onUpdate: setBlur, immediateRender: false }}, t)
          .to(blur, {{ b: 0, duration: {T / 2}, ease: "power2.out", onUpdate: setBlur }}, t + {T / 2});
        tl.set(["#w" + a, "#w" + b], {{ filter: "none" }}, t + {T} + 0.06);
      }}
      // zoom through: the old shot pushes in and fades, the new one settles from slightly small
      function zoomThrough(a, b, t) {{
        tl.fromTo("#w" + a, {{ opacity: 1 }}, {{ scale: 1.45, opacity: 0, duration: {T}, ease: "power2.in", immediateRender: false }}, t);
        tl.fromTo("#w" + b, {{ opacity: 0, scale: 0.82 }}, {{ opacity: 1, scale: 1, duration: {T + 0.15}, ease: "power3.out", immediateRender: false }}, t + 0.08);
      }}
      function flash(t) {{ tl.fromTo("#flash", {{ opacity: 0 }}, {{ opacity: 0.9, duration: 0.06, ease: "none", immediateRender: false }}, t - 0.03).to("#flash", {{ opacity: 0, duration: 0.3 }}, t + 0.05); }}
      // the map: the current area label swaps, its segment fills
      const AREAS_N = {len(AREAS)};
      for (let i = 0; i < AREAS_N; i++) {{ tl.set("#al" + i, {{ opacity: 0 }}, 0); tl.set("#m" + i + " i", {{ scaleX: 0 }}, 0); }}
      function area(i, t) {{
        if (i > 0) tl.to("#al" + (i - 1), {{ opacity: 0, y: -20, duration: 0.2 }}, t);
        tl.fromTo("#al" + i, {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.35, ease: E4, immediateRender: false }}, t + 0.12);
        tl.fromTo("#m" + i + " i", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.5, ease: "expo.out", immediateRender: false }}, t + 0.1);
      }}
      {chr(10).join("      " + x for x in js)}
{text_js}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
'''
open('index.html', 'w', encoding='utf8').write(page)
print('total', TOTAL, 'end at', END_START)
