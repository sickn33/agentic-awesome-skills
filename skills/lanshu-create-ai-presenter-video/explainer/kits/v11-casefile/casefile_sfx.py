#!/usr/bin/env python3
"""Casefile sound bed: push pins, paper slaps, typewriter keys, stamps, marker, string, tape — built from the kit's cue log.

A film's tools/sfx.py does:

    import json, sys; sys.path[:0] = ["lib", "lib/kit"]
    import casefile_sfx as cf
    bed = cf.bed(json.load(open("tools/events.json")), duration=61.4, seed=...)
    bed.place(...)                                    # any film-specific extras (sfxlib one-shots)
    print(bed.write("assets/audio/sfx.wav", lift_after=(56.9, 7)))

The log (window.__kitEvents, read by lib/kit/events.mjs) carries: slap (a card lands), pin (pushed in), type (n keys
over d), hand (handwriting), mark (marker ring / underline / cross), hl (highlighter), stamp, string (pulled pin to pin),
tape (the timeline unrolled), cam (a travel), recap.
Levels sit far under the voice (keys ≈ -41 dB, pins ≈ -34, slaps ≈ -32, stamps ≈ -27). Python with numpy.
Nothing is sampled or downloaded.
"""
from __future__ import annotations

import numpy as np

import sfxlib
from sfxlib import SR, Bed, env, lowpass, swell, thump, tink, whoosh


def _rng():
    return sfxlib.rng


def _band(n: int, lo: float, hi: float) -> np.ndarray:
    x = _rng().standard_normal(n)
    return lowpass(x, hi) - lowpass(x, lo)


def pin_push() -> np.ndarray:
    """A push pin into cork: a bright metal tick, a short woody 'tuk' and a little cork crunch."""
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    tick = np.diff(_rng().standard_normal(n), prepend=0) * env(n, 0.0002, 0.0018) * 0.7
    tuk = np.sin(2 * np.pi * (210 + 30 * _rng().random()) * t) * env(n, 0.0008, 0.016) * 0.55
    crunch = _band(n, 900, 3200) * env(n, 0.002, 0.022) * 0.5
    return tick + tuk + crunch


def paper_slap(w: float = 500) -> np.ndarray:
    """A card slapped onto the board: the paper's flat snap over a soft board thud (bigger cards are lower)."""
    n = int(0.18 * SR)
    big = min(1.0, max(0.0, (w - 300) / 900))
    body = thump(150 - 50 * big, 0.18)[:n] * (0.45 + 0.3 * big)
    snap = _band(n, 900, 5200) * env(n, 0.0005, 0.02 + 0.01 * big) * 0.9
    return body + snap


def key_strike() -> np.ndarray:
    """One typewriter key: the type bar's metal clack, a short ring, the platen's thunk."""
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    r = _rng()
    clack = np.diff(r.standard_normal(n), prepend=0) * env(n, 0.0002, 0.003) * (0.8 + 0.4 * r.random())
    ring = np.sin(2 * np.pi * (2300 + 500 * r.random()) * t) * env(n, 0.0004, 0.009) * 0.22
    thunk = np.sin(2 * np.pi * (115 + 25 * r.random()) * t) * env(n, 0.001, 0.02) * 0.5
    return clack + ring + thunk


def typing(b: Bed, t0: float, dur: float, n: int, gain: float, pan: float) -> None:
    """n keys over dur seconds (slightly uneven, like a person at a typewriter)."""
    r = _rng()
    n = max(1, int(n))
    for k in range(n):
        tk = t0 + (k / n) * max(dur, 0.04) + (r.random() - 0.5) * min(0.02, dur / n * 0.3)
        b.place(key_strike(), tk, gain + (r.random() - 0.5) * 3, pan + (r.random() - 0.5) * 0.15)


def marker(dur: float, n: int = 2) -> np.ndarray:
    """A felt marker writing: a dry squeaky rub, one burst per stroke."""
    dur = max(0.05, dur)
    N = int(dur * SR)
    t = np.arange(N) / SR
    band = _band(N, 1300, 5200)
    strokes = max(2.0, 2.2 * max(1, n))
    am = 0.2 + 0.8 * np.abs(np.sin(np.pi * strokes * t / dur + _rng().random() * np.pi)) ** 1.5
    squeak = 0.1 * np.sin(2 * np.pi * np.cumsum(1500 + 400 * np.sin(2 * np.pi * 3 * t)) / SR)
    return (band * am * 1.4 + squeak * am) * np.minimum(1, t / 0.012) * np.minimum(1, (dur - t) / 0.03)


def marker_line(dur: float) -> np.ndarray:
    """One marker stroke (a ring, an underline, a cross): steady rub that swells with the stroke's speed."""
    dur = max(0.05, dur)
    N = int(dur * SR)
    t = np.arange(N) / SR
    return _band(N, 1100, 4400) * np.sin(np.pi * np.linspace(0, 1, N)) ** 0.6 * np.minimum(1, t / 0.01) * 1.3


def highlighter(dur: float) -> np.ndarray:
    N = int(max(0.05, dur) * SR)
    t = np.arange(N) / SR
    squeak = 0.12 * np.sin(2 * np.pi * np.cumsum(1700 + 300 * t / max(dur, 0.05)) / SR)
    return (_band(N, 500, 2600) * 1.6 + squeak) * np.sin(np.pi * np.linspace(0, 1, N)) ** 0.5


def rubber_stamp(size: float = 64) -> np.ndarray:
    """A rubber stamp brought down hard: a low knock in the desk, the rubber's slap, a tiny wooden rattle."""
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    big = min(1.0, max(0.0, (size - 30) / 90))
    knock = thump(85 - 20 * big, 0.32)[:n] * (0.85 + 0.3 * big)
    slap = _band(n, 600, 3800) * env(n, 0.0004, 0.014) * 1.0
    rattle = np.zeros(n)
    i = int(0.035 * SR)
    rattle[i:] = (_band(n - i, 1500, 5000) * env(n - i, 0.0003, 0.006) * 0.35)
    return knock + slap + rattle + np.sin(2 * np.pi * 52 * t) * env(n, 0.002, 0.08) * 0.3 * big


def string_pull(dur: float) -> np.ndarray:
    """Red string pulled taut from pin to pin: a thin high zip that rises, then a soft 'tk' as it is wound on."""
    dur = max(0.12, dur)
    N = int(dur * SR)
    u = np.linspace(0, 1, N)
    x = lowpass(_rng().standard_normal(N), 2500 + 4500 * u) - lowpass(_rng().standard_normal(N), 1600)
    zip_ = x * np.sin(np.pi * u) ** 1.2 * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 26 * u * dur))) * 0.9
    end = np.zeros(N)
    k = int(N * 0.92)
    tk = pin_push()[: N - k] * 0.4
    end[k : k + len(tk)] = tk
    return zip_ + end


def tape_unroll(dur: float) -> np.ndarray:
    """Masking tape pulled off the roll: a dry crackle."""
    dur = max(0.15, dur)
    N = int(dur * SR)
    r = _rng()
    crackle = (r.random(N) < 0.06) * r.standard_normal(N) * 1.6
    base = _band(N, 1800, 6500) * 0.35
    return (lowpass(crackle, 7000) + base) * np.sin(np.pi * np.linspace(0, 1, N)) ** 0.4


def slide(dur: float = 0.4) -> np.ndarray:
    """A folder slid across the desk (chapter change)."""
    N = int(dur * SR)
    return _band(N, 350, 2800) * np.sin(np.pi * np.linspace(0, 1, N)) ** 1.5 * 1.3


GAINS = {"type": -41, "pin": -34, "slap": -32, "hand": -42, "mark": -41, "hl": -41, "stamp": -27, "string": -42,
         "tape": -40, "cam": -47, "slide": -37}


def bed(events: list[dict], duration: float, seed: int = 20261008, gains: dict | None = None) -> Bed:
    """Mix every cue of the kit's log into a Bed of `duration` seconds."""
    G = dict(GAINS, **(gains or {}))
    b = Bed(duration, seed)
    r = _rng()
    last_hand = -1.0
    last_pin = -1.0
    for e in sorted(events, key=lambda e: e["t"]):
        k, t, d = e["kind"], float(e["t"]), float(e.get("d", 0))
        if t >= duration or t < 0:
            continue
        pan = (r.random() - 0.5) * 0.5
        jit = (r.random() - 0.5) * 2.0
        if k == "type":
            n = int(e.get("n", 4))
            g = G["type"] + (3 if e.get("big") else 0)
            # very long runs (a fast typed block) thin out to a busy rhythm instead of a buzz
            if d > 0 and n / max(d, 0.05) > 26:
                n = int(26 * max(d, 0.05))
            typing(b, t, d, n, g + jit * 0.5, pan)
        elif k == "pin":
            if t - last_pin < 0.04:
                continue
            last_pin = t
            b.place(pin_push(), t, G["pin"] + jit, pan)
        elif k == "slap":
            b.place(paper_slap(float(e.get("w", 500))), t - 0.01, G["slap"] + jit, pan)
        elif k == "hand":
            if t < last_hand - 0.02:
                continue
            last_hand = t + d
            b.place(marker(d, int(e.get("n", 2))), t, G["hand"] + jit, pan)
        elif k == "mark":
            if d < 0.03:
                continue
            b.place(marker_line(d), t, G["mark"] + jit, pan)
        elif k == "hl":
            b.place(highlighter(d), t, G["hl"] + jit, pan)
        elif k == "stamp":
            size = float(e.get("size", 64))
            b.place(rubber_stamp(size), t - 0.005, G["stamp"] + (size - 64) / 24 + jit * 0.5, pan * 0.5)
        elif k == "string":
            if d < 0.08:
                continue
            b.place(string_pull(d), t, G["string"] + jit, pan)
        elif k == "tape":
            b.place(tape_unroll(max(0.25, d)), t, G["tape"] + jit, pan)
        elif k == "cam":
            if d >= 0.6:
                b.place(whoosh(d + 0.15, 0.5), t, G["cam"], (r.random() - 0.5) * 0.6)
        elif k == "slide":
            b.place(slide(max(0.2, d)), t, G["slide"], pan)
    return b


def finale(b: Bed, at: float, dur: float, gain: float = -33.0) -> None:
    """The recap: a low swell under the folder and one soft bell-like tink when the case is closed."""
    b.place(swell(dur), at - 0.2, gain)
    b.place(tink(880.0) * 0.55, at + dur * 0.7, gain - 3, 0.15)
