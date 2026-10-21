#!/usr/bin/env python3
"""V3 notebook · KV cache — procedural sound bed (pen, paper, eraser, page turn), timed to the picture.

    node lib/kit/events.mjs .                       -> tools/events.json (the kit's cue log, read from the composition)
    python3 tools/sfx.py -> assets/audio/sfx.wav (48 kHz stereo, 45 s)

Nothing is sampled or downloaded; a fixed seed keeps the file identical run to run. The narration ends at 39.7 s;
the recap (40.3–45 s) is unvoiced, so the bed is lifted there.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "lib"), str(ROOT / "lib" / "kit")]

import notebook_sfx as nb  # noqa: E402

events = json.loads((ROOT / "tools" / "events.json").read_text())
bed = nb.bed(events, duration=45.0, seed=20261006)
nb.finale(bed, at=40.3, dur=4.6)
# the KV narration is quieter (≈ -21 dB RMS): the bed sits ≈ 23 dB under it while the voice runs
print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), gain_db=5, lift_after=(40.3, 7)))
