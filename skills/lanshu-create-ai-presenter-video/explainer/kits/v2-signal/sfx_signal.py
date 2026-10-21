"""V2 signal sound palette on top of lib/sfxlib.py — HUD blips, data ticks, decode chatter, glitch hits.

    import sys; sys.path[:0] = ["lib", "lib/kit"]
    from sfxlib import Bed
    import sfx_signal as S
    bed = Bed(45.0, seed_value=2026)
    S.decode(bed, 2.2)            # a label decoding in
    S.glitch(bed, 11.2)           # a chapter seam
    bed.write("assets/audio/sfx.wav", lift_after=(40.3, 8))

Everything is restrained: gains sit around -30 … -46 dB so the voice stays the loudest thing.
Each helper takes the time in seconds and an optional gain offset `g` (dB) and pan.
"""
from __future__ import annotations

import numpy as np

import sfxlib as X


def _r() -> float:
    return float(X.rng.random())


def decode(bed: X.Bed, t: float, n: int = 6, g: float = 0.0, pan: float = 0.0, dur: float = 0.28) -> None:
    """Scramble glyphs resolving: a short run of high, slightly detuned ticks."""
    for k in range(n):
        f = 3600 + 1400 * _r()
        bed.place(X.tick(f), t + dur * k / max(1, n - 1) + (_r() - 0.5) * 0.01, -44 + g + (_r() - 0.5) * 3, pan)


def blip(bed: X.Bed, t: float, f: float = 1320, g: float = 0.0, pan: float = 0.0) -> None:
    """A UI blip: something appears or is selected."""
    bed.place(X.blip(f, 0.16), t, -36 + g, pan)


def pop(bed: X.Bed, t: float, k: int = 0, g: float = 0.0, pan: float = 0.0) -> None:
    """A token / item pops out; k raises the pitch along a sequence."""
    bed.place(X.pop(760 * 2 ** (k / 12)), t, -31 + g, pan)
    bed.place(X.tick(4200), t + 0.004, -44 + g, pan)


def lock(bed: X.Bed, t: float, g: float = 0.0, pan: float = 0.0) -> None:
    """Tracking brackets locking on: two rising blips."""
    bed.place(X.blip(1320, 0.1), t, -38 + g, pan)
    bed.place(X.blip(1760, 0.12), t + 0.06, -38 + g, pan)


def slam(bed: X.Bed, t: float, g: float = 0.0, pan: float = 0.0) -> None:
    """A stamp / badge slams down."""
    bed.place(X.thump(80, 0.32), t, -27 + g, pan)
    bed.place(X.click(1.2), t, -33 + g, pan)


def glitch(bed: X.Bed, t: float, g: float = 0.0) -> None:
    """Chapter seam: a digital zap, a short air burst and a hard click."""
    bed.place(X.zap(0.16), t - 0.03, -36 + g, -0.15)
    bed.place(X.whoosh(0.32, 0.4), t - 0.16, -33 + g, 0.15)
    bed.place(X.click(1.4), t, -34 + g)


def stream(bed: X.Bed, t0: float, t1: float, rate: float = 18, g: float = 0.0, f: float = 2600, pan: float = 0.0) -> None:
    """Data on a wire: a soft regular tick train with a little jitter."""
    k = 0
    while t0 + k / rate < t1:
        bed.place(X.tick(f + 300 * _r()), t0 + k / rate + (_r() - 0.5) * 0.006, -47 + g + (_r() - 0.5) * 2, pan)
        k += 1


def sweep(bed: X.Bed, t: float, dur: float = 0.5, g: float = 0.0, pan: float = 0.0) -> None:
    """A scan beam or camera move."""
    bed.place(X.whoosh(dur, 0.55), t, -38 + g, pan)


def typing(bed: X.Bed, t0: float, count: int, cps: float, g: float = 0.0, pan: float = 0.2) -> None:
    """Terminal typing (lighter than sfxlib's Bed.typing)."""
    bed.typing(t0, count, cps, -42 + g, pan)


def rise(bed: X.Bed, t: float, dur: float, f0: float = 220, f1: float = 880, g: float = 0.0, pan: float = 0.0) -> None:
    """A rising meter tone (a gauge filling up)."""
    n = int(dur * X.SR)
    u = np.arange(n) / n
    f = f0 * (f1 / f0) ** u
    sig = np.sin(2 * np.pi * np.cumsum(f) / X.SR) * np.minimum(1, u / 0.08) * np.minimum(1, (1 - u) / 0.15)
    bed.place(sig * 0.6, t, -42 + g, pan)


def close(bed: X.Bed, t: float, dur: float = 4.6, g: float = 0.0) -> None:
    """The recap: one low swell and a soft high shimmer."""
    bed.place(X.swell(dur), t, -30 + g)
    bed.place(X.shimmer(min(dur, 2.4)), t + 0.2, -44 + g)
