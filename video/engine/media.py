"""ffmpeg and probing helpers. Uses the studio's bundled ffmpeg (imageio-ffmpeg) so nothing depends on the OS."""
from __future__ import annotations
import json
import os
import subprocess
import numpy as np


def ffmpeg_exe() -> str:
    for p in (os.environ.get("FFMPEG"), "/home/user/VideoStudio/tools/ffmpeg/ffmpeg"):
        if p and os.path.exists(p):
            return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def run(args: list[str], quiet: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run([ffmpeg_exe(), "-hide_banner", "-y", *args], capture_output=quiet, text=True, check=True)


def probe(path: str) -> dict:
    """duration, fps, width, height, has_audio, using ffmpeg -i (no ffprobe needed)."""
    r = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", path], capture_output=True, text=True)
    txt = r.stderr
    import re
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", txt)
    dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0
    v = re.search(r"Video:.*?(\d{2,5})x(\d{2,5}).*?([\d.]+) fps", txt)
    w, h, fps = (int(v.group(1)), int(v.group(2)), float(v.group(3))) if v else (0, 0, 30.0)
    rot = re.search(r"rotate\s*:\s*(-?\d+)", txt) or re.search(r"displaymatrix:.*?rotation of (-?[\d.]+)", txt)
    rotation = int(float(rot.group(1))) if rot else 0
    if rotation % 180:
        w, h = h, w
    return {"duration": dur, "fps": fps, "width": w, "height": h, "has_audio": "Audio:" in txt, "rotation": rotation}


def extract_wav(src: str, dst: str, sr: int = 16000) -> str | None:
    """16 kHz mono wav for transcription and silence analysis. None when the clip has no audio."""
    if not probe(src)["has_audio"]:
        return None
    run(["-i", src, "-vn", "-ac", "1", "-ar", str(sr), "-c:a", "pcm_s16le", dst])
    return dst


def load_wav(path: str) -> tuple[np.ndarray, int]:
    import wave
    with wave.open(path) as f:
        sr = f.getframerate()
        data = f.readframes(f.getnframes())
    return np.frombuffer(data, np.int16).astype(np.float32) / 32768.0, sr


def envelope_db(wav: np.ndarray, sr: int, hop: float = 0.01) -> np.ndarray:
    """RMS level in dB every `hop` seconds."""
    n = int(sr * hop)
    k = len(wav) // n
    x = wav[: k * n].reshape(k, n)
    rms = np.sqrt((x ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-9)


def contact_sheet(video: str, out_png: str, fps_sample: float = 6.0, start: float = 0, end: float | None = None,
                  cols: int = 12, thumb_w: int = 180, font_path: str | None = None) -> str:
    """fps_sample frames per second of the video, each labelled with its time. The editor's self check."""
    import cv2
    from PIL import Image, ImageDraw, ImageFont
    cap = cv2.VideoCapture(video)
    vfps = cap.get(cv2.CAP_PROP_FPS) or 30
    total = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    dur = total / vfps
    end = dur if end is None else min(end, dur)
    times = np.arange(start, end, 1.0 / fps_sample)
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1080
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1920
    th = int(thumb_w * H / W)
    rows = int(np.ceil(len(times) / cols))
    sheet = Image.new("RGB", (cols * thumb_w, rows * (th + 18)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    try:
        f = ImageFont.truetype(font_path or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fonts", "Heebo.ttf"), 13)
    except Exception:
        f = ImageFont.load_default()
    for i, t in enumerate(times):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t * vfps)))
        ok, fr = cap.read()
        if not ok:
            break
        im = Image.fromarray(cv2.cvtColor(cv2.resize(fr, (thumb_w, th)), cv2.COLOR_BGR2RGB))
        x, y = (i % cols) * thumb_w, (i // cols) * (th + 18)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + th + 2), f"{t:6.2f}s", font=f, fill=(255, 255, 255))
    cap.release()
    sheet.save(out_png)
    return out_png
