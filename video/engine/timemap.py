"""Time map between the source clip and the final video.

A map is a list of segments [{"src": s0, "dst": d0, "dur": d, "kind": "keep"|"freeze"}].
  keep:   final time d0..d0+dur plays source s0..s0+dur
  freeze: final time d0..d0+dur shows the single source frame at s0 (hold)
Cuts are never inside a spoken word, every seam is moved to the quietest 10 ms nearby, keeps are
rounded outward to whole frames, and the audio is cut with the very same map (plus a 1 frame ramp).
"""
from __future__ import annotations
import json
import numpy as np


class TimeMap:
    def __init__(self, segments: list[dict], fps: float):
        self.segs = segments
        self.fps = fps

    @property
    def duration(self) -> float:
        return sum(s["dur"] for s in self.segs)

    @staticmethod
    def identity(duration: float, fps: float) -> "TimeMap":
        return TimeMap([{"src": 0.0, "dst": 0.0, "dur": duration, "kind": "keep"}], fps)

    def src_time(self, t: float) -> float:
        """Final time -> source time (the frame to show)."""
        for s in self.segs:
            if s["dst"] <= t < s["dst"] + s["dur"] or s is self.segs[-1]:
                return s["src"] if s["kind"] == "freeze" else s["src"] + min(t - s["dst"], s["dur"] - 1e-6)
        return self.segs[-1]["src"]

    def dst_time(self, src_t: float) -> float | None:
        """Source time -> final time, None when that moment was cut out."""
        for s in self.segs:
            if s["kind"] == "keep" and s["src"] <= src_t < s["src"] + s["dur"]:
                return s["dst"] + (src_t - s["src"])
        return None

    def word_times(self, words: list[dict]) -> list[dict]:
        """Words with final start/end; words that were cut are dropped (never shown out of sync)."""
        out = []
        for w in words:
            a, b = self.dst_time(w["start"]), self.dst_time(max(w["start"], w["end"] - 0.01))
            if a is None and b is None:
                continue
            if a is None:
                a = b
            if b is None:
                b = a + (w["end"] - w["start"])
            out.append({**w, "start": a, "end": max(a + 0.05, b)})
        return out

    def insert_freeze(self, src_t: float, hold: float) -> None:
        """Hold the frame at source time src_t for `hold` seconds (a beat before a reveal)."""
        new = []
        for s in self.segs:
            if s["kind"] == "keep" and s["src"] < src_t < s["src"] + s["dur"]:
                a = src_t - s["src"]
                new.append({"src": s["src"], "dst": s["dst"], "dur": a, "kind": "keep"})
                new.append({"src": src_t, "dst": s["dst"] + a, "dur": hold, "kind": "freeze"})
                new.append({"src": src_t, "dst": s["dst"] + a + hold, "dur": s["dur"] - a, "kind": "keep"})
            else:
                new.append(dict(s))
        self.segs = self._relabel(new)

    @staticmethod
    def _relabel(segs):
        t = 0.0
        for s in segs:
            s["dst"] = t
            t += s["dur"]
        return segs

    def audio_filter(self) -> str:
        """ffmpeg filter that cuts the source audio with this map (freezes become silence of the same length)."""
        parts, labels = [], []
        for i, s in enumerate(self.segs):
            if s["kind"] == "keep":
                fade = 1.0 / self.fps
                parts.append(f"[0:a]atrim=start={s['src']:.4f}:end={s['src'] + s['dur']:.4f},asetpts=PTS-STARTPTS,"
                             f"afade=t=in:st=0:d={fade:.4f},afade=t=out:st={max(0, s['dur'] - fade):.4f}:d={fade:.4f}[a{i}]")
            else:
                parts.append(f"anullsrc=r=48000:cl=mono,atrim=duration={s['dur']:.4f},aformat=sample_rates=48000:channel_layouts=mono[a{i}]")
            labels.append(f"[a{i}]")
        return ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[aout]"

    def to_json(self) -> str:
        return json.dumps({"fps": self.fps, "segments": self.segs}, ensure_ascii=False, indent=1)

    @staticmethod
    def from_json(s: str) -> "TimeMap":
        d = json.loads(s)
        return TimeMap(d["segments"], d["fps"])


def silence_cuts(env_db: np.ndarray, hop: float, duration: float, fps: float, words: list[dict] | None = None,
                 floor_db: float | None = None, min_pause: float = 0.45, keep_pause: float = 0.18,
                 head_tail: float = 0.25) -> TimeMap:
    """Cut long pauses (keeping `keep_pause` of air), head and tail silence. Never inside a word.
    floor_db defaults to 18 dB under the loud part of the clip."""
    if floor_db is None:
        loud = np.percentile(env_db, 90)
        floor_db = loud - 18
    quiet = env_db < floor_db
    runs, i, n = [], 0, len(quiet)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            a, b = i * hop, j * hop
            if b - a >= min_pause:
                runs.append([a, b])
            i = j
        else:
            i += 1
    # never cut a spoken word: shrink runs that overlap words
    for r in runs:
        for w in words or []:
            if w["start"] < r[1] and w["end"] > r[0]:
                if w["start"] <= r[0]:
                    r[0] = max(r[0], w["end"])
                if w["end"] >= r[1]:
                    r[1] = min(r[1], w["start"])
    runs = [r for r in runs if r[1] - r[0] >= min_pause]
    cuts = []
    for a, b in runs:
        if a <= hop * 2:            # head silence: keep a short lead
            cuts.append((0.0, max(0.0, b - head_tail)))
        elif b >= duration - hop * 2:   # tail silence
            cuts.append((min(duration, a + head_tail), duration))
        else:
            cuts.append((a + keep_pause / 2, b - keep_pause / 2))
    cuts = [(a, b) for a, b in cuts if b - a > 0.05]
    # snap each edge to the quietest 10 ms within 80 ms and round keeps outward to whole frames
    def snap(t):
        k = int(round(t / hop))
        lo, hi = max(0, k - 8), min(len(env_db) - 1, k + 8)
        if hi <= lo:
            return t
        return (lo + int(np.argmin(env_db[lo:hi + 1]))) * hop
    segs, pos, dst = [], 0.0, 0.0
    for a, b in cuts:
        a, b = snap(a), snap(b)
        a = np.floor(a * fps) / fps
        b = np.ceil(b * fps) / fps
        if a > pos + 0.05:
            segs.append({"src": pos, "dst": dst, "dur": a - pos, "kind": "keep"})
            dst += a - pos
        pos = max(pos, b)
    if duration - pos > 0.05:
        segs.append({"src": pos, "dst": dst, "dur": duration - pos, "kind": "keep"})
    if not segs:
        return TimeMap.identity(duration, fps)
    return TimeMap(segs, fps)
