"""Transparent animation over the video: each card enters when its word is said (guide: overlay prompt).

    python3 overlay.py --words clip.words.json --card "פרומפט:spark" --card "סקילים:layers" --size 1080x1920 --side left --snap
    python3 overlay.py --words clip.words.json --card ... --render            # clip.mov (ProRes 4444 with alpha) + checks + brand MP4

--card "<word as spoken>[=<label on the card>]:<icon>"; icons are single-line: spark, layers, chat, code, home, key,
check, chart, tool, camera, play, clock. Words said in the same breath (triggers less than 1.6 s apart) build one scene
that accumulates instead of separate clips.
Rules: no background at all (html and body transparent); surfaces 85-90% opaque, text and icons fully opaque; every
element springs in and then holds still (no float, no pulse); Hebrew in Rubik with near-zero letter spacing; generous
margins; in vertical video no element above y 300 (the networks' interface covers the top); the face and caption areas
are kept clear (--side picks the free side, --avoid "x,y,w,h" adds a box to keep clear).
Checks: ffprobe pix_fmt starts with yuva; one frame over solid green 0x1E7A46 keeps the green; white measures about 255;
a brand-colour MP4 for editors that cannot read alpha (a darker brand tone when the cards are in the brand colour).
Never: gradient-filled text (renders fully transparent), a vignette over the elements, dir="rtl" on <html>.
"""
from __future__ import annotations
import argparse, html, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.dirname(HERE)
HF = os.path.join(VIDEO, "node_modules", ".bin", "hyperframes")
GSAP = os.path.join(VIDEO, "node_modules", "gsap", "dist", "gsap.min.js")
FONTS = os.path.join(VIDEO, "node_modules", "@fontsource", "rubik", "files")
ICONS = {
    "spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    "layers": '<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 13 10 5 10-5"/>',
    "chat": '<path d="M4 5h16v11H9l-5 4V5Z"/>',
    "code": '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    "home": '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    "key": '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
    "check": '<path d="m4 12 5 5L20 6"/>',
    "chart": '<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
    "tool": '<path d="M14 6a4 4 0 0 0 5 5L10 20l-3-3 9-9"/>',
    "camera": '<path d="M3 8h4l2-3h6l2 3h4v11H3V8Z"/><circle cx="12" cy="13" r="3.5"/>',
    "play": '<path d="M7 5v14l12-7L7 5Z"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
}


def norm(s):
    return re.sub(r"[^\w֐-׿]", "", s)


def hexrgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def darker(h, k=0.45):
    r, g, b = hexrgb(h); return "#%02x%02x%02x" % (int(r * k), int(g * k), int(b * k))


def triggers(words, cards, fps):
    out = []
    for c in cards:
        hit = next((w for w in words if norm(w["text"]) == norm(c["word"]) or norm(w["text"]).endswith(norm(c["word"]))), None)
        if hit is None:
            raise SystemExit(f'המילה "{c["word"]}" לא נמצאה בתמלול. כתבו אותה כמו שנאמרה.')
        out.append({**c, "t": round(round(hit["start"] * fps) / fps, 4)})
    out.sort(key=lambda c: c["t"])
    scenes, cur = [], []
    for c in out:   # the same breath: one scene that accumulates
        if cur and c["t"] - cur[-1]["t"] > 1.6:
            scenes.append(cur); cur = []
        cur.append(c)
    if cur:
        scenes.append(cur)
    return scenes


def faces_css():
    css = []
    for wt in (700, 800):
        for sub in ("hebrew", "latin"):
            f = f"rubik-{sub}-{wt}-normal.woff2"
            if os.path.exists(os.path.join(FONTS, f)):
                css.append(f"@font-face{{font-family:'Rubik';font-weight:{wt};font-display:block;src:url(assets/fonts/{f}) format('woff2')}}")
    return "\n".join(css)


def build(out, scenes, W, H, dur, brand, side, avoid):
    os.makedirs(os.path.join(out, "assets", "fonts"), exist_ok=True)
    for f in os.listdir(FONTS):
        if re.match(r"rubik-(hebrew|latin)-(700|800)-normal\.woff2", f):
            shutil.copy(os.path.join(FONTS, f), os.path.join(out, "assets", "fonts", f))
    shutil.copy(GSAP, os.path.join(out, "gsap.min.js"))
    k = W / 1080.0
    vertical = H > W
    top = max(300 * (H / 1920.0), H * 0.16) if vertical else H * 0.12
    card_w, card_h, gap, margin = 360 * k, 120 * k, 26 * k, 70 * k
    x = margin if side == "left" else W - margin - card_w
    if avoid:
        ax, ay, aw, ah = avoid
        if x < ax + aw and x + card_w > ax:      # move to the other side when the box is in the way
            x = W - margin - card_w if side == "left" else margin
    items, tw = [], []
    n = 0
    for si, sc in enumerate(scenes):
        end = scenes[si + 1][0]["t"] if si + 1 < len(scenes) else dur
        for ci, c in enumerate(sc):
            y = top + ci * (card_h + gap)
            anchor, edge = ("left", x) if x < W / 2 else ("right", W - x - card_w)
            icon = ICONS.get(c["icon"], ICONS["spark"])
            items.append(f'''<div class="card clip" id="c{n}" data-start="{c["t"]}" data-duration="{round(end - c["t"], 4)}" data-track-index="{1 + ci}" style="{anchor}:{edge}px;top:{y}px;height:{card_h}px">
<div class="in" id="in{n}"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icon}</svg><span dir="rtl">{html.escape(c["label"])}</span></div></div>''')
            tw.append(f"tl.fromTo('#in{n}',{{opacity:0,scale:0.82,y:{24 * k}}},{{opacity:1,scale:1,y:0,duration:0.55,ease:'back.out(1.8)'}},{c['t']});")
            n += 1
    r, g, b = hexrgb(brand)
    doc = f"""<!doctype html>
<html lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width={W}, height={H}">
<script src="gsap.min.js"></script>
<style>{faces_css()}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:transparent}}
#root{{position:relative;width:{W}px;height:{H}px;background:transparent}}
.card{{position:absolute;width:max-content}}
.in{{height:100%;display:flex;flex-direction:row-reverse;align-items:center;justify-content:flex-start;gap:{22 * k}px;padding:0 {30 * k}px;
 background:rgba({r},{g},{b},0.88);border-radius:{26 * k}px;color:#ffffff;font:800 {50 * k}px/1 'Rubik',sans-serif;letter-spacing:0;transform-origin:50% 60%}}
.ic{{width:{54 * k}px;height:{54 * k}px;flex:0 0 auto}}
</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{dur}" data-width="{W}" data-height="{H}">
{chr(10).join(items)}
</div>
<script>
document.fonts.load("800 100px Rubik","אבג").then(function(){{const tl=gsap.timeline({{paused:true}});{''.join(tw)}window.__timelines['main']=tl;}});
</script>
</body></html>"""
    open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(doc)
    return out


def hf(args, cwd):
    r = subprocess.run([HF, *args], cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit((r.stdout + r.stderr)[-2500:])
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--words", required=True); ap.add_argument("--card", action="append", required=True)
    ap.add_argument("--size", default="1080x1920"); ap.add_argument("--brand", default="#07293a")
    ap.add_argument("--side", choices=["left", "right"], default="left"); ap.add_argument("--avoid")
    ap.add_argument("--out"); ap.add_argument("--snap", action="store_true"); ap.add_argument("--render", action="store_true")
    a = ap.parse_args()
    W, H = map(int, a.size.lower().split("x"))
    data = json.load(open(a.words, encoding="utf-8")); words = data["words"]
    dur = round(float(data.get("duration") or (words[-1]["end"] + 0.5)), 3)
    cards = []
    for c in a.card:
        spec, _, icon = c.rpartition(":")
        word, _, label = spec.partition("=")
        cards.append({"word": word.strip(), "label": (label or word).strip(), "icon": icon.strip() or "spark"})
    scenes = triggers(words, cards, 30)
    out = os.path.abspath(a.out or os.path.splitext(a.words)[0].replace(".words", "") + ".overlay")
    build(out, scenes, W, H, dur, a.brand, a.side, tuple(map(float, a.avoid.split(","))) if a.avoid else None)
    rep = {"project": out, "scenes": [[(c["label"], c["t"]) for c in s] for s in scenes], "size": [W, H], "duration": dur}
    green = "0x1E7A46"
    if a.snap or not a.render:
        times = [round(min(dur - 0.05, c["t"] + 0.8), 2) for s in scenes for c in s]
        hf(["snapshot", "--at", ",".join(map(str, times)), "--no-end"], out)
        shots = sorted([os.path.join(out, "snapshots", f) for f in os.listdir(os.path.join(out, "snapshots"))]) if os.path.isdir(os.path.join(out, "snapshots")) else []
        from PIL import Image
        cells = []
        for s in shots:
            im = Image.open(s).convert("RGBA"); bg = Image.new("RGBA", im.size, (30, 122, 70, 255)); bg.alpha_composite(im)
            cells.append(bg.convert("RGB").resize((im.width * 400 // im.height, 400)))
        if cells:
            sheet = Image.new("RGB", (sum(c.width for c in cells) + 10 * len(cells), 400), "white"); xx = 0
            for c in cells:
                sheet.paste(c, (xx, 0)); xx += c.width + 10
            rep["snapshots_over_green"] = out + "/stages-over-green.png"; sheet.save(rep["snapshots_over_green"])
    if a.render:
        mov = out + ".mov"
        hf(["render", "--format", "mov", "--output", mov], out)
        pix = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=pix_fmt,codec_name", "-of", "csv=p=0", mov], capture_output=True, text=True).stdout.strip()
        t = round(min(dur - 0.05, scenes[-1][-1]["t"] + 0.8), 2)
        test = out + ".green-test.png"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c={green}:s={W}x{H}:d={dur}", "-i", mov, "-filter_complex", "[0][1]overlay=shortest=1", "-ss", str(t), "-frames:v", "1", test])
        from PIL import Image
        im = Image.open(test).convert("RGB")
        corner = im.getpixel((W // 2, H - 40))
        whites = [p for p in im.crop((0, 0, W, H)).getdata() if min(p) > 240]
        brand_bg = darker(a.brand) if a.brand.lower() not in ("#ffffff",) else "#07293a"
        mp4 = out + "-brand.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c={brand_bg.replace('#', '0x')}:s={W}x{H}:r=30:d={dur}", "-i", mov, "-filter_complex", "[0][1]overlay=shortest=1,format=yuv420p", "-c:v", "libx264", "-crf", "16", mp4])
        rep.update({"mov": mov, "codec_pix_fmt": pix, "alpha": pix.split(",")[-1].startswith("yuva"), "green_test": test,
                    "green_kept": corner[1] > 100 and corner[0] < 60 and corner[2] < 100, "green_pixel": corner,
                    "white_max": max((max(p) for p in whites), default=0), "brand_mp4": mp4, "brand_mp4_background": brand_bg})
    print(json.dumps(rep, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
