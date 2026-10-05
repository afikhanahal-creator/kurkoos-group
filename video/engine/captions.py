"""Hebrew captions as a HyperFrames composition over the video (guide: pill or kinetic).

    python3 captions.py clip.mp4 --words clip.words.json --style pill    --list          # the captions as sentences, for review
    python3 captions.py clip.mp4 --words clip.words.json --style pill    --preview       # 10 s draft render
    python3 captions.py clip.mp4 --words clip.words.json --style kinetic --render        # full render (+ the clean copy)
    options: --accent "#a90b0c" (default: Kurkoos red) --font Rubik (default) --out DIR

Built here, not with the `embedded-captions` route, because that has no Hebrew and neither of these two styles.
Words come from the cut step's remapped words.json when there is one; never re-transcribe a cut file.
Rules (pill): white rounded box (radius 20, about 100 px tall at 1080 wide), black 800 text, centred; 1 to 4 words
(mostly 3), up to 18 characters, 0.3 to 1.2 s (longer splits in two), closes on a comma or period in words 2 to 4,
switches in one frame with no gap and no overlap, 1 to 4 accent words in the whole video.
Rules (kinetic): groups of 1 to 3 words, wrapping up to 3 lines in a fixed band low in the centre; every word enters
when it is spoken with a spring (blur clears, scale overshoots and settles; blur animated separately and never below 0);
the strongest word of each sentence 900 and a little larger; up to 8 accent words with a thin underline growing right to
left; the last word of a group stays at least 0.3 s, and a word starting less than 0.3 s after it joins that group.
Traps handled: no dir="rtl" on <html> (black render); each word in its own span with dir="rtl" (punctuation side); gap
for word spacing inside flex; the font is loaded with Hebrew text before layout; text only between x 140 and 940 of 1080;
every time rounded to a frame, and after the render every frame is checked for a missing caption.
"""
from __future__ import annotations
import argparse, html, json, math, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
HF = os.path.join(VIDEO, "node_modules", ".bin", "hyperframes")
GSAP = os.path.join(VIDEO, "node_modules", "gsap", "dist", "gsap.min.js")
FONTS = os.path.join(VIDEO, "node_modules", "@fontsource", "rubik", "files")
NO_END = {"של", "על", "את", "עם", "כמו", "אל", "כל", "זה", "זו", "גם", "רק", "עוד", "לא", "יותר", "מאוד", "הכי", "בין", "אחרי", "לפני", "בלי", "אם", "כי", "ש", "ה", "ו"}
URGENT = {"עכשיו", "היום", "מיד", "כבר", "אחרון", "אחרונה", "מוגבל", "חינם"}


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", p], capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    n, d = v["r_frame_rate"].split("/")
    return {"w": v["width"], "h": v["height"], "fps": float(n) / float(d), "dur": float(j["format"]["duration"])}


def fr(t, fps):
    return round(round(t * fps) / fps, 4)


def clean(t):
    return re.sub(r"\s+", " ", t).strip()


def accents(words, limit):
    out, seen = [], set()
    for i, w in enumerate(words):
        t = re.sub(r"[^\w֐-׿%]", "", w["text"])
        if not t:
            continue
        latin = re.fullmatch(r"[A-Za-z][A-Za-z0-9\-]+", t)
        if re.search(r"\d", t) or t in URGENT or (latin and t.lower() not in seen):
            out.append(i)
            if latin:
                seen.add(t.lower())
        if len(out) >= limit:
            break
    return set(out)


def pill_groups(words, fps):
    """1-4 words (mostly 3), <=18 chars, 0.3-1.2 s, close on punctuation at words 2-4, never end on a binding word."""
    gs, cur = [], []
    def chars(g):
        return len(" ".join(words[i]["text"] for i in g))
    def binding(i):
        return clean(words[i]["text"]).strip(",.") in NO_END
    for i, w in enumerate(words):
        if cur and (chars(cur + [i]) > 18 or len(cur) >= 4 or w["end"] - words[cur[0]]["start"] > 1.2):
            if len(cur) > 1 and binding(cur[-1]):      # a binding word moves on with the word it belongs to
                gs.append(cur[:-1]); cur = [cur[-1]]
            else:
                gs.append(cur); cur = []
        cur.append(i)
        t = w["text"].strip()
        nxt = words[i + 1] if i + 1 < len(words) else None
        if re.search(r"[.?!:]$", t):                    # a sentence end always closes the caption
            gs.append(cur); cur = []
        elif t.endswith(",") and len(cur) >= 2:          # a comma closes it from the second word on
            gs.append(cur); cur = []
        elif len(cur) == 3 and nxt and not binding(i):
            four_ok = re.search(r"[,.?!:]$", nxt["text"].strip()) and chars(cur + [i + 1]) <= 18 and nxt["end"] - words[cur[0]]["start"] <= 1.2
            if not four_ok:
                gs.append(cur); cur = []
    if cur:
        gs.append(cur)
    # times: start at the first word, end where the next caption starts (no gap, no overlap)
    caps = []
    for k, g in enumerate(gs):
        s = fr(words[g[0]]["start"], fps)
        e = fr(words[gs[k + 1][0]]["start"], fps) if k + 1 < len(gs) else fr(words[g[-1]]["end"] + 0.3, fps)
        caps.append({"words": g, "start": s, "end": max(e, s + 1 / fps)})
    # a caption stretched past 1.2 s by a pause is split in two
    out = []
    for c in caps:
        if c["end"] - c["start"] > 1.2 and len(c["words"]) > 1:
            g = c["words"]; h = len(g) // 2 or 1
            mid = fr(words[g[h]]["start"], fps)
            out.append({"words": g[:h], "start": c["start"], "end": mid}); out.append({"words": g[h:], "start": mid, "end": c["end"]})
        else:
            out.append(c)
    for k in range(len(out) - 1):
        out[k]["end"] = out[k + 1]["start"]
    return out


def kinetic_groups(words, fps):
    gs, cur = [], []
    for i, w in enumerate(words):
        if cur:
            last = words[cur[-1]]
            joins = w["start"] - last["start"] < 0.3
            if len(cur) >= 3 and not joins or (re.search(r"[.?!:]$", last["text"]) and not joins):
                gs.append(cur); cur = []
        cur.append(i)
    if cur:
        gs.append(cur)
    out = []
    for k, g in enumerate(gs):
        s = fr(words[g[0]]["start"], fps)
        hold = max(words[g[-1]]["start"] + 0.3, words[g[-1]]["end"])
        e = fr(min(hold, words[gs[k + 1][0]]["start"]) if k + 1 < len(gs) else hold + 0.2, fps)
        out.append({"words": g, "start": s, "end": max(e, s + 1 / fps)})
    for k in range(len(out) - 1):  # no overlap between groups
        out[k]["end"] = min(out[k]["end"], out[k + 1]["start"])
    return out


def strongest(words, groups):
    """The strongest word of each sentence: an accent if there is one, else the longest content word."""
    strong, sent = set(), []
    for i, w in enumerate(words):
        sent.append(i)
        if re.search(r"[.?!:]$", w["text"]) or i == len(words) - 1:
            cand = [j for j in sent if clean(words[j]["text"]).strip(",.") not in NO_END]
            if cand:
                strong.add(max(cand, key=lambda j: len(words[j]["text"])))
            sent = []
    return strong


def font_faces(dst):
    os.makedirs(os.path.join(dst, "assets", "fonts"), exist_ok=True)
    css = []
    for wt in (400, 800, 900):
        for sub, rng in (("hebrew", "U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F"), ("latin", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD")):
            f = f"rubik-{sub}-{wt}-normal.woff2"
            src = os.path.join(FONTS, f)
            if os.path.exists(src):
                shutil.copy(src, os.path.join(dst, "assets", "fonts", f))
                css.append(f"@font-face{{font-family:'Rubik';font-style:normal;font-weight:{wt};font-display:block;src:url(assets/fonts/{f}) format('woff2');unicode-range:{rng}}}")
    return "\n".join(css)


def build(video, words, style, accent, font, out, preview=False):
    info = probe(video); W, H, fps, dur = info["w"], info["h"], info["fps"], info["dur"]
    os.makedirs(out, exist_ok=True)
    shutil.copy(video, os.path.join(out, "source.mp4"))
    shutil.copy(GSAP, os.path.join(out, "gsap.min.js"))
    faces = font_faces(out) if font == "Rubik" else ""
    k = W / 1080.0  # sizes are specified at 1080 wide
    left, right = 140 * k, 940 * k
    acc = accents(words, 4 if style == "pill" else 8)
    D = 10 if preview else round(dur, 3)
    if style == "pill":
        caps = pill_groups(words, fps)
        items = []
        for n, c in enumerate(caps):
            if c["start"] >= D:
                break
            spans = "".join(f'<span dir="rtl" class="w{" a" if i in acc else ""}">{html.escape(words[i]["text"])}</span>' for i in c["words"])
            items.append(f'<div class="cap clip" id="c{n}" data-start="{c["start"]}" data-duration="{round(c["end"] - c["start"], 4)}" data-track-index="1"><div class="pill">{spans}</div></div>')
        css = f""".cap{{position:absolute;left:{left}px;width:{right - left}px;top:0;height:{H}px;display:flex;align-items:center;justify-content:center}}
.pill{{display:flex;flex-direction:row-reverse;gap:{0.28 * 64 * k}px;align-items:center;justify-content:center;background:#fff;color:#000;border-radius:{20 * k}px;height:{100 * k}px;padding:0 {34 * k}px;font:800 {64 * k}px/1 '{font}',sans-serif;white-space:nowrap;max-width:{right - left}px}}
.w.a{{color:{accent}}}"""
        script = "const tl=gsap.timeline({paused:true});window.__timelines['main']=tl;"
        groups_out = caps
    else:
        groups = kinetic_groups(words, fps)
        strong = strongest(words, groups)
        band_top = H * 0.60 if H > W else H * 0.66
        items, tw = [], []
        for n, g in enumerate(groups):
            if g["start"] >= D:
                break
            spans = []
            for i in g["words"]:
                cls = "w" + (" s" if i in strong else "") + (" a" if i in acc else "")
                u = '<i class="u"></i>' if i in acc else ""
                spans.append(f'<span dir="rtl" class="{cls}" id="w{i}"><b>{html.escape(words[i]["text"])}</b>{u}</span>')
                t = fr(words[i]["start"], fps)
                tw.append(f"tl.fromTo('#w{i}',{{scale:1.18,opacity:0}},{{scale:1,opacity:1,duration:0.42,ease:'back.out(2.2)'}},{t});")
                tw.append(f"tl.fromTo('#w{i}',{{'--b':10}},{{'--b':0,duration:0.22,ease:'power2.out',onUpdate:function(){{var e=document.getElementById('w{i}');var b=Math.max(0,parseFloat(getComputedStyle(e).getPropertyValue('--b'))||0);e.style.filter='blur('+b+'px)'}}}},{t});")
                if i in acc:
                    tw.append(f"tl.fromTo('#w{i} .u',{{scaleX:0}},{{scaleX:1,duration:0.35,ease:'power2.out'}},{t + 0.12});")
            items.append(f'<div class="grp clip" id="g{n}" data-start="{g["start"]}" data-duration="{round(g["end"] - g["start"], 4)}" data-track-index="1"><div class="lines">{"".join(spans)}</div></div>')
        css = f""".grp{{position:absolute;left:{left}px;width:{right - left}px;top:{band_top}px;height:{H * 0.22}px;display:flex;align-items:flex-start;justify-content:center}}
.lines{{display:flex;flex-wrap:wrap;flex-direction:row-reverse;justify-content:center;align-content:flex-start;gap:{10 * k}px {22 * k}px;max-width:{right - left}px;max-height:{3 * 96 * k}px}}
.w{{position:relative;display:inline-block;font:800 {72 * k}px/1.2 '{font}',sans-serif;color:#fff;text-shadow:0 {3 * k}px {14 * k}px rgba(0,0,0,.55);transform-origin:50% 60%}}
.w.s{{font-weight:900;font-size:{84 * k}px}}
.w.a{{color:{accent}}}
.w .u{{position:absolute;right:0;left:0;bottom:-{4 * k}px;height:{5 * k}px;background:{accent};transform-origin:100% 50%;transform:scaleX(0)}}"""
        script = "const tl=gsap.timeline({paused:true});" + "".join(tw) + "window.__timelines['main']=tl;"
        groups_out = groups
    doc = f"""<!doctype html>
<html lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width={W}, height={H}">
<script src="gsap.min.js"></script>
<style>{faces}
*{{margin:0;padding:0;box-sizing:border-box}}html,body{{width:{W}px;height:{H}px;overflow:hidden;background:#000}}
#root{{position:relative;width:{W}px;height:{H}px}}
#a-roll{{position:absolute;inset:0;width:{W}px;height:{H}px;object-fit:cover}}
{css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="{W}" data-height="{H}">
<video id="a-roll" class="clip" src="source.mp4" data-has-audio="true" data-start="0" data-duration="{D}" data-track-index="0" data-volume="1"></video>
{chr(10).join(items)}
</div>
<script>
document.fonts.load("800 100px {font}","אבג").then(function(){{return document.fonts.load("900 100px {font}","אבג")}}).then(function(){{ {script} }});
</script>
</body></html>"""
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(doc)
    json.dump({"style": style, "accent": accent, "font": font, "fps": fps, "size": [W, H], "groups": [{**g, "text": " ".join(words[i]["text"] for i in g["words"])} for g in groups_out], "accent_words": sorted(acc)},
              open(os.path.join(out, "captions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return out, groups_out, acc


def render(out, dst, draft):
    env = dict(os.environ)
    r = subprocess.run([HF, "render", "--quality", "draft" if draft else "standard", "-o", dst], cwd=out, capture_output=True, text=True, env=env)
    if r.returncode:
        raise SystemExit((r.stdout + r.stderr)[-2500:])
    return dst


def frame_check(mp4, groups, fps, style, W, H):
    """Every frame inside a caption's time must show it: a white pill (pill) or bright text (kinetic) in the band."""
    if style == "pill":
        crop = f"crop={int(W * 0.5)}:{int(H * 0.06)}:{int(W * 0.25)}:{int(H * 0.47)}"
    else:
        top = H * (0.60 if H > W else 0.66)
        crop = f"crop={int(W * 0.74)}:{int(H * 0.2)}:{int(W * 0.13)}:{int(top)}"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-v", "info", "-i", mp4, "-vf", f"{crop},signalstats,metadata=print:key=lavfi.signalstats.YMAX", "-f", "null", "-"], capture_output=True, text=True)
    ymax = [float(x) for x in re.findall(r"YMAX=([\d.]+)", r.stderr)]
    if not ymax:
        return {"checked": 0}
    s0, e0 = groups[0]["start"], groups[-1]["end"]
    bad = [n for n, y in enumerate(ymax) if s0 + 1 / fps <= n / fps < e0 - 1 / fps and y < 200]
    return {"checked": len(ymax), "frames_without_caption": len(bad), "first": [round(b / fps, 3) for b in bad[:6]]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--words", required=True)
    ap.add_argument("--style", choices=["pill", "kinetic"], default="pill")
    ap.add_argument("--accent", default="#a90b0c"); ap.add_argument("--font", default="Rubik")
    ap.add_argument("--out"); ap.add_argument("--list", action="store_true")
    ap.add_argument("--preview", action="store_true"); ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    words = json.load(open(a.words, encoding="utf-8"))["words"]
    base = os.path.abspath(os.path.splitext(a.video)[0])
    out = a.out or f"{base}.captions-{a.style}"
    proj, groups, acc = build(a.video, words, a.style, a.accent, a.font, out, preview=a.preview)
    if a.list or not (a.preview or a.render):
        for g in groups:
            t = " ".join(("*" + words[i]["text"] + "*") if i in acc else words[i]["text"] for i in g["words"])
            print(f"{g['start']:7.2f} – {g['end']:7.2f}  {t}")
        print(f"\nproject: {proj} · {len(groups)} captions · accent words marked *like this*")
        return
    info = probe(a.video)
    dst = f"{base}.{a.style}{'.preview' if a.preview else ''}.mp4"
    render(proj, dst, a.preview)
    res = {"output": dst, "check": frame_check(dst, [g for g in groups if g["start"] < (10 if a.preview else 1e9)], info["fps"], a.style, info["w"], info["h"])}
    if a.render:
        clean_copy = f"{base}.clean.mp4"
        shutil.copy(a.video, clean_copy)
        res["clean"] = clean_copy
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
