"""Word-level Hebrew transcription with several engines; writes <clip>.words.json.

    python3 transcribe.py clip.mp4 --engine auto            # ivrit.ai local if the model is reachable, else a cloud key, else none
    python3 transcribe.py clip.mp4 --engine local           # ivrit-ai/whisper-large-v3-turbo-ct2 via faster-whisper (needs huggingface.co)
    python3 transcribe.py clip.mp4 --engine deepgram        # DEEPGRAM_API_KEY  (Nova-3, Hebrew, word timestamps)
    python3 transcribe.py clip.mp4 --engine groq            # GROQ_API_KEY      (whisper-large-v3, word timestamps)
    python3 transcribe.py clip.mp4 --engine openai          # OPENAI_API_KEY    (whisper-1, word timestamps)
    python3 transcribe.py clip.mp4 --words other.words.json # import a transcript made elsewhere (the member's Mac with the studio skill)

Output: {"words":[{"text","start","end","prob"}], "duration", "engine", "model", "status"}
status is "ok", "no_audio", or "unavailable:<reason>" (never a fake transcript).
Keys are read from the environment or from video/api-keys.txt (KEY=value lines), never printed.
"""
from __future__ import annotations
import argparse
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from media import extract_wav, load_wav, probe  # noqa: E402

IVRIT = "ivrit-ai/whisper-large-v3-turbo-ct2"
IVRIT_REV = "72ad623a37947395efcc3933132353790e5a12f5"


def api_key(name: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    for p in (os.path.join(os.path.dirname(HERE), "api-keys.txt"), os.path.expanduser("~/VideoStudio/api-keys.txt")):
        if os.path.exists(p):
            for line in open(p, encoding="utf-8"):
                if line.strip().startswith(name + "="):
                    return line.strip().split("=", 1)[1].strip().strip('"')
    return None


def local(wav_path: str, prompt: str | None) -> dict:
    from faster_whisper import WhisperModel
    model = WhisperModel(IVRIT, device="cpu", compute_type="int8", revision=IVRIT_REV)
    audio, sr = load_wav(wav_path)
    segs, info = model.transcribe(audio, language="he", word_timestamps=True, initial_prompt=prompt, vad_filter=False, beam_size=5)
    words = []
    for s in segs:
        for w in (s.words or []):
            words.append({"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "prob": round(w.probability, 3)})
    return {"words": words, "engine": "local", "model": IVRIT}


def deepgram(wav_path: str) -> dict:
    import urllib.request
    key = api_key("DEEPGRAM_API_KEY")
    data = open(wav_path, "rb").read()
    req = urllib.request.Request("https://api.deepgram.com/v1/listen?model=nova-3&language=he&smart_format=false&punctuate=true",
                                 data=data, headers={"Authorization": "Token " + key, "Content-Type": "audio/wav"})
    r = json.load(urllib.request.urlopen(req, timeout=600))
    ws = r["results"]["channels"][0]["alternatives"][0].get("words", [])
    return {"words": [{"text": w["word"], "start": w["start"], "end": w["end"], "prob": w.get("confidence", 1)} for w in ws],
            "engine": "deepgram", "model": "nova-3"}


def openai_like(wav_path: str, base: str, key: str, model: str, engine: str) -> dict:
    import urllib.request
    import uuid
    boundary = uuid.uuid4().hex
    body = b""
    for k, v in (("model", model), ("language", "he"), ("response_format", "verbose_json"), ("timestamp_granularities[]", "word")):
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode()
    body += open(wav_path, "rb").read() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(base, data=body, headers={"Authorization": "Bearer " + key, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    r = json.load(urllib.request.urlopen(req, timeout=600))
    ws = r.get("words", [])
    return {"words": [{"text": w["word"], "start": w["start"], "end": w["end"], "prob": 1} for w in ws], "engine": engine, "model": model}


def transcribe(clip: str, engine: str = "auto", prompt: str | None = None, words_file: str | None = None) -> dict:
    info = probe(clip)
    out = {"words": [], "duration": info["duration"], "engine": None, "model": None, "status": "ok"}
    if words_file:
        d = json.load(open(words_file, encoding="utf-8"))
        out.update({"words": d.get("words", d if isinstance(d, list) else []), "engine": d.get("engine", "import"), "model": d.get("model")})
        return out
    if not info["has_audio"]:
        out["status"] = "no_audio"
        return out
    tmp = tempfile.mkdtemp()
    wav = extract_wav(clip, os.path.join(tmp, "a.wav"))
    order = [engine] if engine != "auto" else ["local", "deepgram", "groq", "openai"]
    errors = []
    for e in order:
        try:
            if e == "local":
                r = local(wav, prompt)
            elif e == "deepgram":
                if not api_key("DEEPGRAM_API_KEY"):
                    raise RuntimeError("no DEEPGRAM_API_KEY")
                r = deepgram(wav)
            elif e == "groq":
                k = api_key("GROQ_API_KEY")
                if not k:
                    raise RuntimeError("no GROQ_API_KEY")
                r = openai_like(wav, "https://api.groq.com/openai/v1/audio/transcriptions", k, "whisper-large-v3", "groq")
            elif e == "openai":
                k = api_key("OPENAI_API_KEY")
                if not k:
                    raise RuntimeError("no OPENAI_API_KEY")
                r = openai_like(wav, "https://api.openai.com/v1/audio/transcriptions", k, "whisper-1", "openai")
            else:
                raise RuntimeError("unknown engine " + e)
            out.update(r)
            return out
        except Exception as ex:  # keep going down the list, report at the end
            errors.append(f"{e}: {str(ex)[:120]}")
    out["status"] = "unavailable: " + " | ".join(errors)
    return out


def words_table(words: list[dict]) -> str:
    lines = ["| # | מילה | התחלה | סוף |", "|---|---|---|---|"]
    for i, w in enumerate(words, 1):
        lines.append(f"| {i} | {w['text']} | {w['start']:.2f} | {w['end']:.2f} |")
    return "\n".join(lines)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("clip")
    ap.add_argument("--engine", default="auto")
    ap.add_argument("--prompt")
    ap.add_argument("--words")
    ap.add_argument("-o", "--out")
    a = ap.parse_args()
    r = transcribe(a.clip, a.engine, a.prompt, a.words)
    out = a.out or os.path.splitext(a.clip)[0] + ".words.json"
    json.dump(r, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"status": r["status"], "engine": r["engine"], "words": len(r["words"]), "out": out}, ensure_ascii=False))
    if r["words"]:
        print(words_table(r["words"]))
