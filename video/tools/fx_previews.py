"""Short preview clips of every signature effect, rendered by the engine itself on a test clip (one effect per plan,
no overlaps), for the effects gallery in the content engine.

    python3 video/tools/fx_previews.py --clip clip.mp4 --words clip.words.json --mask mask.npz --out out_dir
"""
import argparse, json, os, shutil, subprocess, sys
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "engine"))
import reel  # noqa: E402

DEMOS = {
    "opening": ({"word": "קורקוס", "title": "קבוצת קורקוס", "tag_after": "עם עריכה", "cta": "עקבו לעוד"}, -1.3, 1.9),
    "title3d": ({"word": "בונים", "text": "בונים בית"}, -0.3, 1.9),
    "shatter": ({"word": "וילות"}, -0.4, 1.4),
    "popout": ({"word": "השרון"}, -0.3, 1.6),
    "flip": ({"word": "אנחנו", "n": 3}, -0.3, 1.5),
    "worlds": ({"word": "אנחנו", "n": 2, "words": ["בונים", "וילות"]}, -0.9, 2.6),
    "freeze": ({"word": "כל"}, -0.4, 1.4),
    "giant": ({"word": "נבנה"}, -0.3, 2.1),
    "pixel": ({"word": "השרון"}, -0.3, 2.0),
    "zoom": ({"word": "כל", "words": ["נבנה"]}, 0.0, 2.6),
    "cube": ({"word": "שלום", "words": ["קבוצת", "בונים", "בהוד", "השרון"], "cards": [{"kind": "ad", "text": "פרסומת"}, {"kind": "stop", "text": "ריל שעוצר"}, {"kind": "invite", "text": "הזמנה לאירוע"}, {"kind": "deck", "text": "מצגת"}]}, 0.0, 6.0),
    "money": ({"word": "בונים", "strike_word": "וילות", "stamps": ["יקר", "איטי"], "amount": 5000, "final_tag": "בחינם"}, -0.2, 3.6),
    "comment": ({"word": "אנחנו", "n": 2, "code": "מדריך", "notif": "שלחתי לך את הקישור"}, -0.2, 3.0),
    "hologram": ({"word": "כל", "until_word": "ירוקה", "tags_word": "נבנה", "tags": ["תכנון", "ביצוע", "מסירה"]}, -0.2, 2.6),
    "goal": ({"word": "קורקוס", "from": 1200, "to": 10000}, -0.2, 2.4),
    "gold": ({"word": "השרון", "text": "מאושר"}, -0.2, 1.8),
    "follow": ({"word": "בונים"}, -0.2, 2.2),
    "rewind": ({}, -0.6, 1.3),
}


def frames(args):
    proj, i0, i1, path = args
    r = reel.Renderer(proj)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{reel.W}x{reel.H}", "-r", str(reel.FPS), "-i", "-",
                          "-vf", "scale=360:640:flags=area", "-c:v", "libx264", "-profile:v", "main", "-crf", "27", "-preset", "slow", "-pix_fmt", "yuv420p", "-an", path], stdin=subprocess.PIPE)
    for i in range(i0, i1):
        p.stdin.write(r.frame(i / reel.FPS).tobytes())
    p.stdin.close()
    p.wait()
    return path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--clip", required=True)
    ap.add_argument("--words", required=True)
    ap.add_argument("--mask", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    jobs = []
    for kind, (params, pre, post) in DEMOS.items():
        if a.only and kind not in a.only.split(","):
            continue
        proj = os.path.join(a.out, "proj_" + kind)
        os.makedirs(proj, exist_ok=True)
        shutil.copy(a.mask, os.path.join(proj, "mask.npz"))
        shutil.copy(a.words, os.path.join(proj, "words.json"))
        req = [dict(kind=kind, **params)]
        reel.edit(a.clip, proj, "clean", None, None, [], "auto", a.words, True, "none", [], None, None, req, None, 0.12, plan_only=True)
        plan = json.load(open(os.path.join(proj, "plan.json"), encoding="utf-8"))
        it = plan["signature"][0]
        at = it.get("at", plan.get("duration_main", plan["duration"]))
        t0, t1 = max(0.0, at + pre), min(plan["duration"], at + post)
        jobs.append((proj, int(t0 * reel.FPS), int(t1 * reel.FPS), os.path.join(a.out, f"{kind}.mp4")))
    with Pool(4) as pool:
        for p in pool.imap_unordered(frames, jobs):
            print(p, round(os.path.getsize(p) / 1e3), "KB", flush=True)
