"""Pack the editing engine for the cloud editor routine (it has no repo access): engine code, fonts, logos, studio
sounds, and the skills it follows. The routine unpacks it and runs `python3 video/engine/signature.py sfx` to make the
signature sounds locally (they are synthesized, so they are not shipped).

    python3 video/tools/make_bundle.py out/video_engine_bundle.json
"""
import base64, json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INCLUDE = ["video/engine", "video/fonts", "video/assets", "video/sfx", "video/README.md",
           ".claude/skills/video-studio", ".claude/skills/kurkoos-video-pro", ".claude/skills/style-maker"]
SKIP_DIRS = {"__pycache__", "models", "sig", "node_modules"}
SKIP_EXT = {".cjs", ".tflite", ".pyc"}


def files():
    for inc in INCLUDE:
        p = os.path.join(ROOT, inc)
        if os.path.isfile(p):
            yield inc
            continue
        for d, ds, fs in os.walk(p):
            ds[:] = [x for x in ds if x not in SKIP_DIRS]
            for f in fs:
                if os.path.splitext(f)[1] in SKIP_EXT:
                    continue
                yield os.path.relpath(os.path.join(d, f), ROOT)


if __name__ == "__main__":
    out = sys.argv[1]
    b = {"name": "kurkoos video engine", "created": time.strftime("%Y-%m-%dT%H:%M:%S"),
         "how": "unpack each files[path] = base64 bytes; then pip install the engine's requirements and run python3 video/engine/signature.py sfx",
         "files": {f: base64.b64encode(open(os.path.join(ROOT, f), "rb").read()).decode() for f in sorted(files())}}
    json.dump(b, open(out, "w"))
    print(len(b["files"]), "files", round(os.path.getsize(out) / 1e6, 2), "MB")
