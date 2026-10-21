#!/usr/bin/env python3
"""V11 casefile starter — procedural sound bed (pins, paper, typewriter, stamps, string), timed to the picture and the story.

    bash tools/sfx.sh        (node lib/kit/events.mjs . → tools/events.json, then this script → assets/audio/sfx.wav)

The board's log (tools/events.json) carries every card slap, pin push, typed run, handwritten line, marker stroke,
highlighter, stamp, string pulled pin to pin, tape unrolled and camera travel the composition scheduled. On top of it,
from lib/story.js: a folder slid across the desk under each chapter change, a low swell under the closing line, the
recap finale (swell + one tink), and the unvoiced recap lifted. The bed follows the narration's loudness (a voiced
narration ≈ -21 dB RMS → +4 dB); a silent draft uses that default. Nothing is sampled or downloaded; the seed comes from
the story title, so a film's bed is identical run to run.
"""
import json
import re
import sys
import wave
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "lib"), str(ROOT / "lib" / "kit")]

import casefile_sfx as cf  # noqa: E402
import sfxlib  # noqa: E402

story = json.loads(re.search(r"window\.STORY = (.*);\s*$", (ROOT / "lib" / "story.js").read_text(encoding="utf-8"), re.S).group(1))
D = max(float(story["duration"]), float((story.get("recap") or {}).get("end") or 0))  # = tools/stamp.py's length
events = json.loads((ROOT / "tools" / "events.json").read_text())


def narration_rms(path: Path):
    """RMS (dB) of the narration, or None when it is missing / silent (a draft)."""
    if not path.exists():
        return None
    with wave.open(str(path)) as w:
        n, ch, sw = w.getnframes(), w.getnchannels(), w.getsampwidth()
        b = np.frombuffer(w.readframes(n), dtype=np.uint8)
    if sw == 2:
        x = b.view("<i2").astype(float) / 32768
    elif sw == 3:
        b = b.reshape(-1, 3).astype(np.int32)
        x = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        x = np.where(x >= 1 << 23, x - (1 << 24), x) / float(1 << 23)
    elif sw == 4:
        x = b.view("<i4").astype(float) / 2**31
    else:
        return None
    x = x.reshape(-1, ch).mean(1)
    r = float(np.sqrt(np.mean(x**2))) if len(x) else 0.0
    return 20 * np.log10(r) if r > 1e-5 else None


bed = cf.bed(events, duration=D, seed=20261008 + zlib.crc32(story.get("title", "").encode()) % 9973)

# chapter changes: a folder slid across the desk as the camera rides the string to the next station
for k, ch in enumerate(story.get("chapters") or []):
    if k and ch["start"] < D:
        bed.place(cf.slide(0.5), max(0.0, ch["start"] - 0.4), -38, 0.15 if k % 2 else -0.15)

recap = story.get("recap")
rec_on = bool(recap) and recap["start"] < D - 0.6
end = story.get("end")
if end and end["start"] < D:
    # a low swell under the closing line, until the recap folder lands (or the film ends)
    stop = recap["start"] if rec_on else D
    bed.place(sfxlib.swell(max(1.0, stop - end["start"] + 0.4)), end["start"] - 0.3, -39)
lift = None
if rec_on:
    r_end = min(float(recap.get("end") or D), D)
    cf.finale(bed, at=recap["start"], dur=max(1.0, r_end - recap["start"] - 0.1))
    lift = (recap["start"], 6)

rms = narration_rms(ROOT / "assets" / "audio" / "narration.wav")
gain = 4.0 if rms is None else float(np.clip(4.0 + (rms + 21.2), 1.0, 11.0))
print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), gain_db=gain, lift_after=lift),
      f"(bed gain {gain:+.1f} dB, narration {'silent' if rms is None else f'{rms:.1f} dB RMS'})")
