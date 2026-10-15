"""Builds index.html for the Mevo Kedem 5 office tour (Afik HaNahal): one walk-through from the building door to the garden.
python3 gen.py  (reads assets/seg/segs.json written by the shot preparation)
"""
import json, html

SEG = {s['name']: s for s in json.load(open('assets/seg/segs.json'))}
T = 0.4  # transition length

# (shot, transition into it, area index, text block)
PLAN = [
    ('door', None, 0, 'intro'),
    ('lobby', 'zoom', 0, 'building'),
    ('enter', 'whip', 1, 'size'),
    ('open', 'cut', 1, None),
    ('room1', 'whip', 2, 'rooms'),
    ('room2', 'cut', 2, None),
    ('corner', 'zoom', 2, 'parquet'),
    ('hall2', 'cut', 2, None),
    ('wc', 'whip', 3, 'wc'),
    ('kitch', 'cut', 3, None),
    ('wing1', 'whip', 4, 'systems'),
    ('wing2', 'cut', 4, None),
    ('wing3', 'cut', 4, None),
    ('store1', 'flash', 5, 'storage'),
    ('store2', 'cut', 5, None),
    ('garden', 'zoom', 6, 'outside'),
]
AREAS = ['כניסה לבניין', 'הקומה הראשונה', 'חדרים', 'שירותים ומטבחון', 'אגף נוסף', 'חלל נוסף', 'החצר והגינה']

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

# text blocks, timed to their shots (absolute times)
blocks = f'''
      <section id="b-intro" class="clip" data-start="0" data-duration="{at('building') - 0.05}" data-track-index="2">
        <div class="tx">
          <div id="i-chip" class="chip">להשכרה</div>
          <div class="h big"><span class="line"><span id="i-a">משרדים</span></span></div>
          <div class="h mid"><span class="line"><span id="i-b">במבוא קדם 5,</span></span></div>
          <div class="h mid peri"><span class="line"><span id="i-c">הוד השרון</span></span></div>
        </div>
      </section>
      <section id="b-building" class="clip" data-start="{at('building', 0.3)}" data-duration="{round(g['building']['dur'] - 0.35, 3)}" data-track-index="2">
        <div class="tx">
          <div class="h small peri"><span class="line"><span id="bd-a">בבניין</span></span></div>
          <div class="h mid"><span class="line"><span id="bd-b">מעלית ומקלט,</span></span></div>
          <div class="h mid"><span class="line"><span id="bd-c">וחדר כושר.</span></span></div>
        </div>
      </section>
      <section id="b-size" class="clip" data-start="{at('size', 0.25)}" data-duration="{round(g['size']['dur'] + SEG['open']['dur'] - 0.3, 3)}" data-track-index="2">
        <div class="tx">
          <div class="h huge"><span id="sz-n" class="num">520</span><span class="unit"> מ״ר</span></div>
          <div class="h small peri" id="sz-a">בקומה הראשונה</div>
          <div class="h note" id="sz-b">אפשר לחלק ולהשכיר כ־250 מ״ר בלבד</div>
        </div>
      </section>
      <section id="b-rooms" class="clip" data-start="{at('rooms', 0.25)}" data-duration="{round(g['rooms']['dur'] + SEG['room2']['dur'] - 0.3, 3)}" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="rm-a">לפחות</div>
          <div class="h huge"><span id="rm-n" class="num">20</span><span class="unit"> חדרים</span></div>
          <div class="h small" id="rm-b">מחולקים</div>
        </div>
      </section>
      <section id="b-parquet" class="clip" data-start="{at('parquet', 0.3)}" data-duration="{round(g['parquet']['dur'] + SEG['hall2']['dur'] - 0.35, 3)}" data-track-index="2">
        <div class="tx"><div class="pill" id="pq">פרקטים חדשים</div></div>
      </section>
      <section id="b-wc" class="clip" data-start="{at('wc', 0.2)}" data-duration="{round(g['wc']['dur'] + SEG['kitch']['dur'] - 0.25, 3)}" data-track-index="2">
        <div class="tx"><div class="pill" id="wc">שלושה תאי שירותים</div></div>
      </section>
      <section id="b-systems" class="clip" data-start="{at('systems', 0.25)}" data-duration="{round(g['systems']['dur'] + SEG['wing2']['dur'] + SEG['wing3']['dur'] - 0.3, 3)}" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="sy-a">מערכות</div>
          <div class="h mid"><span class="line"><span id="sy-b">תקשורת,</span></span></div>
          <div class="h mid"><span class="line"><span id="sy-c">כיבוי אש ואזעקה.</span></span></div>
        </div>
      </section>
      <section id="b-storage" class="clip" data-start="{at('storage', 0.2)}" data-duration="{round(g['storage']['dur'] + SEG['store2']['dur'] - 0.25, 3)}" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="st-a">חלל נוסף</div>
          <div class="h mid"><span class="line"><span id="st-b">לאחסון</span></span></div>
          <div class="h mid"><span class="line"><span id="st-c">או לייצור.</span></span></div>
        </div>
      </section>
      <section id="b-park" class="clip" data-start="{at('outside', 0.4)}" data-duration="2.9" data-track-index="2">
        <div class="tx">
          <div class="pill" id="pk1">חניה צמודה מקורה</div>
          <div class="pill" id="pk2" style="margin-top:22px">חניון ציבורי מול הבניין</div>
        </div>
      </section>
      <section id="b-roads" class="clip" data-start="{at('outside', 3.4)}" data-duration="2.5" data-track-index="2">
        <div class="tx">
          <div class="h small peri" id="rd-a">גישה מהירה לכבישים</div>
          <div class="roads"><div class="road" id="r1">5</div><div class="road" id="r2" style="font-size:80px">531</div><div class="road" id="r3">6</div></div>
        </div>
      </section>
      <section id="b-terms" class="clip" data-start="{at('outside', 6.0)}" data-duration="{round(g['outside']['dur'] - 6.0, 3)}" data-track-index="2">
        <div class="layer" id="tm-bg" style="background:rgba(9,9,15,.82)"></div>
        <div class="terms">
          <div class="h small green" id="tm-t">תנאי שכירות</div>
          <div class="term" id="t1"><b>ועד בית 1,500 ₪</b><i>לחודש, ל־520 מ״ר</i></div>
          <div class="term" id="t2"><b>אין דמי ניהול</b><i></i></div>
          <div class="term" id="t3"><b>חודשיים גרייס</b><i>לשיפוץ והתאמה</i></div>
          <div class="fine" id="t4">הנכס דורש שיפוץ והתאמה לפני הכניסה, עם גמישות בחלוקת השטח לפי צורכי העסק.</div>
        </div>
      </section>
      <section id="b-end" class="clip" data-start="{END_START}" data-duration="4.2" data-track-index="3">
        <div class="layer" style="background:var(--night)"></div>
        <div style="position:absolute; left:0; right:0; top:330px; display:flex; justify-content:center">
          <div id="e-wrap" style="width:440px; height:421px; overflow:hidden"><img id="e-logo" src="assets/ah.svg" alt="אפיק הנחל" style="width:440px; height:421px" /></div>
        </div>
        <div style="position:absolute; left:0; right:0; top:820px; text-align:center">
          <div class="h" style="font-size:80px" id="e-a">אפיק הנחל</div>
          <div class="peri" style="font-size:50px; font-weight:500; margin-top:10px" id="e-b">ייזום, שיווק ותיווך</div>
        </div>
        <div style="position:absolute; left:0; right:0; top:1080px; text-align:center"><div class="peri" style="font-size:52px; font-weight:500; margin-bottom:26px" id="e-c">לפרטים ולתיאום סיור</div><div class="phone" id="e-phone">055-981-1814</div></div>
        <div style="position:absolute; left:0; right:0; top:1420px; text-align:center; font-size:56px; font-weight:500; direction:ltr" id="e-site">afikhanahal.co.il</div>
      </section>'''

text_js = f'''
      // intro
      tl.fromTo("#i-chip", {{ scale: 0, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.4, ease: BACK }}, 0.15);
      rise("#i-a", 0.35, 0.55); rise("#i-b", 0.7); rise("#i-c", 0.9);
      tl.to(["#i-a", "#i-b", "#i-c", "#i-chip"], {{ yPercent: -110, opacity: 0, duration: 0.3, ease: "power3.in", stagger: 0.04 }}, {at('building') - 0.4});
      // building
      rise("#bd-a", {at('building', 0.35)}); rise("#bd-b", {at('building', 0.5)}); rise("#bd-c", {at('building', 0.7)});
      // 520 counts up
      count("#sz-n", 520, {at('size', 0.3)}, 1.2);
      tl.fromTo("#sz-n", {{ opacity: 0, y: 50 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: E4 }}, {at('size', 0.25)});
      tl.fromTo("#sz-a", {{ opacity: 0, x: 120 }}, {{ opacity: 1, x: 0, duration: 0.45 }}, {at('size', 0.7)});
      tl.fromTo("#sz-b", {{ opacity: 0, x: 120 }}, {{ opacity: 1, x: 0, duration: 0.45 }}, {at('size', 1.3)});
      // rooms
      tl.fromTo("#rm-a", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, {at('rooms', 0.3)});
      count("#rm-n", 20, {at('rooms', 0.35)}, 0.8);
      tl.fromTo("#rm-n", {{ opacity: 0, scale: 1.3 }}, {{ opacity: 1, scale: 1, duration: 0.4, ease: E4 }}, {at('rooms', 0.35)});
      tl.fromTo("#rm-b", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, {at('rooms', 0.7)});
      pill("#pq", {at('parquet', 0.4)}); pill("#wc", {at('wc', 0.25)});
      tl.fromTo("#sy-a", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, {at('systems', 0.3)});
      rise("#sy-b", {at('systems', 0.45)}); rise("#sy-c", {at('systems', 0.65)});
      tl.fromTo("#st-a", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, {at('storage', 0.25)});
      rise("#st-b", {at('storage', 0.4)}); rise("#st-c", {at('storage', 0.6)});
      pill("#pk1", {at('outside', 0.5)}); pill("#pk2", {at('outside', 0.8)});
      tl.fromTo("#rd-a", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, {at('outside', 3.45)});
      ["#r1", "#r2", "#r3"].forEach((r, i) => tl.fromTo(r, {{ scale: 0, rotation: -14 }}, {{ scale: 1, rotation: 0, duration: 0.45, ease: BACK }}, {at('outside', 3.6)} + i * 0.2));
      tl.fromTo("#tm-bg", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {at('outside', 6.0)});
      tl.fromTo("#tm-t", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.35 }}, {at('outside', 6.15)});
      ["#t1", "#t2", "#t3"].forEach((x, i) => tl.fromTo(x, {{ opacity: 0, x: 160 }}, {{ opacity: 1, x: 0, duration: 0.4, ease: E4 }}, {at('outside', 6.3)} + i * 0.3));
      tl.fromTo("#t4", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.45 }}, {at('outside', 7.4)});
      // end
      tl.fromTo("#e-wrap", {{ clipPath: "inset(0 100% 0 0)" }}, {{ clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power3.inOut" }}, {END_START + 0.1});
      tl.fromTo("#e-logo", {{ scale: 1.15 }}, {{ scale: 1, duration: 1.4, ease: "power2.out" }}, {END_START + 0.1});
      tl.fromTo("#e-a", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.45 }}, {END_START + 0.7});
      tl.fromTo("#e-b", {{ opacity: 0, y: 40 }}, {{ opacity: 1, y: 0, duration: 0.45 }}, {END_START + 0.9});
      tl.fromTo("#e-c", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, {END_START + 1.3});
      tl.fromTo("#e-phone", {{ scale: 0, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.55, ease: BACK }}, {END_START + 1.4});
      tl.fromTo("#e-site", {{ opacity: 0, y: 20 }}, {{ opacity: 1, y: 0, duration: 0.45 }}, {END_START + 1.8});
      tl.fromTo("#map", {{ opacity: 1 }}, {{ opacity: 0, duration: 0.3, immediateRender: false }}, {END_START});
'''

steps = ''.join(f'<div class="st" id="m{i}"><i></i><span>{html.escape(a)}</span></div>' for i, a in enumerate(AREAS))

page = f'''<!doctype html>
<html lang="he">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>אפיק הנחל · סיור במשרדים להשכרה, מבוא קדם 5</title>
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
