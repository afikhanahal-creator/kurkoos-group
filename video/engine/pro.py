"""Run the professional edit steps a video asked for, in the recommended order (kurkoos-video-pro skill).

    python3 pro.py clip.mp4 --words clip.words.json --steps cut,reframe,grade,captions,loudness [--captions pill|kinetic]
                   [--accent "#a90b0c"] [--grade mid] [--brand "#105572"] [--review]
--review (the default from the video room) stops after each step's plan or preview and writes review.json, so nothing
is rendered before the creator approves; without it every step renders and the next step takes the previous output.
Steps needing MediaPipe (reframe, grade) run with video/.mpvenv/bin/python when it exists.
"""
from __future__ import annotations
import argparse, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VENV = os.environ.get("KURKOOS_MP_PYTHON") or os.path.join(os.path.dirname(HERE), ".mpvenv", "bin", "python")
ORDER = ["cut", "reframe", "grade", "captions", "loudness"]


def py(mp=False):
    return VENV if mp and os.path.exists(VENV) else sys.executable


def call(args, mp=False):
    r = subprocess.run([py(mp), *args], capture_output=True, text=True)
    out = r.stdout.strip()
    try:
        js = json.loads(out[out.index("{"):]) if "{" in out else {"text": out}
    except Exception:
        js = {"text": out[-3000:]}
    if r.returncode:
        js["error"] = r.stderr[-1500:]
    return js


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--words"); ap.add_argument("--steps", default="cut,captions,loudness")
    ap.add_argument("--captions", default="pill"); ap.add_argument("--accent", default="#a90b0c")
    ap.add_argument("--grade", default="mid"); ap.add_argument("--brand", default="#105572"); ap.add_argument("--review", action="store_true")
    a = ap.parse_args()
    steps = [s for s in ORDER if s in a.steps.split(",")]
    cur, words, log = os.path.abspath(a.video), a.words, []
    E = lambda f: os.path.join(HERE, f)
    for s in steps:
        if log and log[-1].get("error"):
            break                                   # a failed step stops the run: nothing is rendered on top of it
        if s == "cut":
            if not words:
                log.append({"step": s, "skipped": "אין קובץ מילים. החיתוך לפי משמעות צריך תמלול אמיתי."}); continue
            plan = call([E("cut.py"), cur, "--words", words, "--plan"])
            pp = os.path.splitext(cur)[0] + ".cutplan.json"
            if a.review:
                log.append({"step": s, "plan": pp, "table": plan.get("text", "")}); break
            res = call([E("cut.py"), cur, "--apply", pp, "--words", words]); log.append({"step": s, **res})
            cur, words = res.get("output", cur), res.get("words", words)
        elif s == "reframe":
            res = call([E("reframe.py"), cur] + ([] if a.review else ["--render"]), mp=True); log.append({"step": s, **res})
            if a.review or res.get("stop"):
                break
            cur = res.get("output", cur)
        elif s == "grade":
            res = call([E("grade.py"), cur, "--brand", a.brand] + ([] if a.review else ["--strength", a.grade]), mp=True); log.append({"step": s, **res})
            if a.review:
                break
            cur = (res.get("render") or {}).get("output", cur)
        elif s == "captions":
            if not words:
                log.append({"step": s, "skipped": "אין קובץ מילים לכתוביות."}); continue
            res = call([E("captions.py"), cur, "--words", words, "--style", a.captions, "--accent", a.accent] + (["--preview"] if a.review else ["--render"]))
            log.append({"step": s, **res})
            if a.review:
                break
            cur = res.get("output", cur)
        elif s == "loudness":
            res = call([E("loudness.py"), cur] + (["--measure"] if a.review else [])); log.append({"step": s, **res})
            if not a.review:
                cur = res.get("output", cur)
    rep = {"input": os.path.abspath(a.video), "steps": steps, "review": a.review, "final": cur, "log": log}
    json.dump(rep, open(os.path.splitext(os.path.abspath(a.video))[0] + ".pro.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"final": cur, "done": [x["step"] for x in log if not x.get("error")], "failed": [{"step": x["step"], "error": x["error"][-300:]} for x in log if x.get("error")], "stopped_for_review": a.review}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
