#!/usr/bin/env python3
"""Notebook sound bed: pen scratches, paper taps, sticky slaps, an eraser, page turns — built from the kit's cue log.

A film's tools/sfx.py does:

    import json, sys; sys.path[:0] = ["lib", "lib/kit"]
    import notebook_sfx as nb
    bed = nb.bed(json.load(open("tools/events.json")), duration=45.0, seed=...)
    bed.place(...)                                    # any film-specific extras (sfxlib one-shots)
    print(bed.write("assets/audio/sfx.wav", lift_after=(40.3, 8)))

Levels: everything sits far under the voice (writing ≈ -41 dB, taps ≈ -35, slaps ≈ -31, page turn ≈ -28).
Run with a Python that has numpy (python3).
"""
from __future__ import annotations

import numpy as np

import sfxlib
from sfxlib import SR, Bed, click, env, lowpass, swell, thump, tink, whoosh, felt


def _rng():
    return sfxlib.rng


def pen_write(dur: float, n: int) -> np.ndarray:
    """A fine-liner writing n characters: bright paper scratch, a little burst per stroke, quiet lifts between."""
    dur = max(0.05, dur)
    N = int(dur * SR)
    t = np.arange(N) / SR
    noise = _rng().standard_normal(N)
    band = lowpass(noise, 7200) - lowpass(noise, 2400)
    strokes = max(2.0, 2.4 * max(1, n))
    phase = _rng().random() * np.pi
    am = 0.18 + 0.82 * np.abs(np.sin(np.pi * strokes * t / dur + phase)) ** 1.6
    edge = np.minimum(1, t / 0.012) * np.minimum(1, (dur - t) / 0.03)
    return band * am * edge * 1.4


def pen_line(dur: float) -> np.ndarray:
    """One continuous line: a steady soft scratch that swells with the pen's speed."""
    dur = max(0.05, dur)
    N = int(dur * SR)
    t = np.arange(N) / SR
    noise = _rng().standard_normal(N)
    band = lowpass(noise, 6000) - lowpass(noise, 1800)
    arch = np.sin(np.pi * np.linspace(0, 1, N)) ** 0.6
    return band * arch * np.minimum(1, t / 0.01) * 1.3


def marker(dur: float) -> np.ndarray:
    """Highlighter: a duller, wetter felt-tip squeak."""
    N = int(max(0.05, dur) * SR)
    noise = _rng().standard_normal(N)
    band = lowpass(noise, 2600) - lowpass(noise, 500)
    t = np.arange(N) / SR
    squeak = 0.12 * np.sin(2 * np.pi * np.cumsum(1700 + 300 * t / max(dur, 0.05)) / SR)
    return (band * 1.6 + squeak) * np.sin(np.pi * np.linspace(0, 1, N)) ** 0.5


def tap(bright: float = 0.7) -> np.ndarray:
    return click(bright)


def paper_slap() -> np.ndarray:
    """A sticky note / card pressed onto the page: a soft low thud plus the paper's flat snap."""
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    body = thump(150, 0.16)[:n] * 0.55
    snap = (lowpass(_rng().standard_normal(n), 5000) - lowpass(_rng().standard_normal(n), 900)) * env(n, 0.0005, 0.018) * 0.9
    return body + snap


def page_turn(dur: float = 0.7) -> np.ndarray:
    """A notebook page turned over: air plus a dry paper rustle that peaks as the sheet lands."""
    N = int(dur * SR)
    u = np.linspace(0, 1, N)
    air = whoosh(dur, 0.45)[:N] * 0.6
    noise = _rng().standard_normal(N)
    rustle = (lowpass(noise, 4500) - lowpass(noise, 700)) * (0.3 + 0.7 * np.abs(np.sin(2 * np.pi * 9 * u))) * np.sin(np.pi * u) ** 1.2
    return air + rustle * 1.2


def slide(dur: float = 0.3) -> np.ndarray:
    """A sheet slid across the desk."""
    N = int(dur * SR)
    noise = _rng().standard_normal(N)
    return (lowpass(noise, 3000) - lowpass(noise, 400)) * np.sin(np.pi * np.linspace(0, 1, N)) ** 1.5 * 1.4


def snip() -> np.ndarray:
    """Scissors closing: two tiny bright metal clicks."""
    a = click(1.6)
    out = np.zeros(int(0.06 * SR))
    out[: len(a)] += a
    b = click(1.2) * 0.6
    i = int(0.018 * SR)
    out[i : i + len(b)] += b[: len(out) - i]
    return out


GAINS = {"write": -41, "stroke": -43, "hl": -40, "slap": -31, "tap": -35, "erase": -34, "turn": -27, "cam": -47, "bars": -42, "slide": -36, "snip": -33, "hop": -44}


def bed(events: list[dict], duration: float, seed: int = 20261005, gains: dict | None = None) -> Bed:
    """Mix every cue of the kit's log into a Bed of `duration` seconds."""
    G = dict(GAINS, **(gains or {}))
    b = Bed(duration, seed)
    r = _rng()
    last_write = -1.0
    for e in sorted(events, key=lambda e: e["t"]):
        k, t, d = e["kind"], float(e["t"]), float(e.get("d", 0))
        if t >= duration:
            continue
        pan = (r.random() - 0.5) * 0.5
        jit = (r.random() - 0.5) * 2.0
        if k == "write":
            # overlapping writes (a word written while a box is drawn) share one scratch
            if t < last_write - 0.02:
                continue
            last_write = t + d
            b.place(pen_write(d, int(e.get("n", 2))), t, G["write"] + jit, pan)
        elif k == "stroke":
            if d < 0.025:
                continue
            g_len = min(4.0, max(-3.0, 3.0 * np.log10(max(40, e.get("len", 200)) / 300)))
            b.place(pen_line(d), t, G["stroke"] + g_len + jit, pan)
        elif k == "hl":
            b.place(marker(d), t, G["hl"] + jit, pan)
        elif k == "bars":
            b.place(pen_line(d * 0.9), t, G["bars"] + jit, pan)
        elif k == "slap":
            b.place(paper_slap(), t - 0.01, G["slap"] + jit, pan)
        elif k == "tap":
            b.place(tap(), t, G["tap"] + jit, pan)
        elif k == "erase":
            b.place(felt(d + 0.08), t, G["erase"], 0.1)
        elif k == "turn":
            b.place(page_turn(max(0.5, d + 0.1)), t, G["turn"], 0.25)
        elif k == "cam":
            if d >= 0.6:
                b.place(whoosh(d + 0.15, 0.5), t, G["cam"], (r.random() - 0.5) * 0.6)
        elif k == "slide":
            b.place(slide(max(0.15, d)), t, G["slide"], pan)
        elif k == "snip":
            for j in range(int(e.get("n", 4))):
                b.place(snip(), t + j * d / max(1, int(e.get("n", 4))), G["snip"] + jit, 0.3)
        elif k == "hop":
            n = int(e.get("n", 12))
            for j in range(n):
                b.place(tap(0.45), t + j * d / n + (r.random() - 0.5) * 0.01, G["hop"] + (r.random() - 0.5) * 3, pan)
    return b


def finale(b: Bed, at: float, dur: float, gain: float = -33.0) -> None:
    """The recap: a low swell under the page turn and one soft bell-like tink when the map is complete."""
    b.place(swell(dur), at - 0.2, gain)
    b.place(tink(1046.5) * 0.6, at + dur * 0.62, gain - 2, 0.15)
