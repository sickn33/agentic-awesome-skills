#!/usr/bin/env python3
"""v4-paper sound palette — paper folds, card flips, slaps, rustles, tapes, ribbons, stamps (numpy only).

Built on the shared lib/sfxlib.py. A film's tools/sfx.py does:

    import sys; sys.path[:0] = ["lib", "lib/kit"]
    from sfxlib import Bed
    import paper_sfx as P
    bed = Bed(45.0, seed_value=20261005)
    bed.place(P.fold(), 2.23, -30)

Every sound here is short and soft: this book is made of paper, not plastic. Each one peaks at 1.0 (0 dBFS), so the
gain you pass to Bed.place IS its peak level: keep them around -26…-40 dB under the voice. One swell (P.page_up) for the
recap page.
"""
from __future__ import annotations

import numpy as np

import sfxlib as S

SR = S.SR


def _t(n: int) -> np.ndarray:
    return np.arange(n) / SR


def _peak1(fn):
    """Every sound in this palette peaks at 1.0, so a gain of -30 dB in Bed.place means a -30 dBFS peak."""
    def wrapped(*a, **k):
        x = fn(*a, **k)
        m = float(np.max(np.abs(x))) or 1.0
        return x / m
    wrapped.__name__, wrapped.__doc__ = fn.__name__, fn.__doc__
    return wrapped


def mix(*parts: np.ndarray) -> np.ndarray:
    """Sum signals of different lengths (each starts at 0)."""
    out = np.zeros(max(len(p) for p in parts))
    for p in parts:
        out[: len(p)] += p
    return out


def _band(n: int, lo: float, hi: float) -> np.ndarray:
    x = S.rng.standard_normal(n)
    return S.lowpass(x, hi) - S.lowpass(x, lo)


@_peak1
def fold(size: float = 1.0) -> np.ndarray:
    """A paper piece folds up off the page: a crisp flex of the card + a soft body thup."""
    dur = 0.14 + 0.08 * size
    n = int(dur * SR)
    t = _t(n)
    flex = _band(n, 900, 5200) * np.minimum(1, t / 0.01) * np.exp(-t / (0.035 + 0.03 * size)) * 1.3
    crack = (S.rng.random(n) < 0.015) * S.rng.standard_normal(n) * 1.6 * np.exp(-t / 0.05)
    f = 150 / (0.6 + 0.4 * size)
    body = np.sin(2 * np.pi * f * t) * S.env(n, 0.003, 0.045) * 0.55 * size
    return flex + crack + body


@_peak1
def flip() -> np.ndarray:
    """A card turns over: a quick air sweep that lands on a light tick."""
    sweep = S.whoosh(0.16, peak=0.6) * 0.45
    out = np.zeros(int(0.22 * SR))
    out[: len(sweep)] += sweep
    tk = S.click(0.7) * 0.8
    i = int(0.15 * SR)
    out[i : i + len(tk)] += tk[: len(out) - i]
    return out


@_peak1
def slap(size: float = 1.0) -> np.ndarray:
    """A piece falls flat onto the page."""
    n = int(0.2 * SR)
    t = _t(n)
    air = _band(n, 300, 2600) * np.exp(-t / 0.03) * 1.2
    return mix(air, S.thump(95 / size, 0.2) * 0.6 * size)


@_peak1
def tap(bright: float = 0.6) -> np.ndarray:
    """A word printed onto a ribbon / a card set down: a soft, dull tap."""
    x = S.click(bright)
    return S.lowpass(x, 3200) * 1.6


@_peak1
def rustle(dur: float, density: float = 38.0) -> np.ndarray:
    """Many small paper pieces in the air: crinkle grains scattered over dur (seeded, deterministic)."""
    n = int(dur * SR)
    out = np.zeros(n)
    k = int(density * dur)
    for _ in range(k):
        i = int(S.rng.random() * max(1, n - 2000))
        g = _band(1600, 1500, 7000) * S.env(1600, 0.0005, 0.006) * (0.4 + 0.6 * S.rng.random())
        out[i : i + 1600] += g
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5


@_peak1
def tape(dur: float) -> np.ndarray:
    """A paper tape pulled out of a slit: a dry slide with a faint ratchet from its ruler marks."""
    n = int(dur * SR)
    t = _t(n)
    slide = S.swipe(dur, 700, 3400) * 0.7
    rat = np.zeros(n)
    step = int(SR / 22)
    for i in range(0, n - 400, step):
        tk = S.tick(2600 + 300 * S.rng.random()) * 0.25
        rat[i : i + len(tk)] += tk[: n - i]
    return (slide + rat) * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05)


@_peak1
def unroll(dur: float = 0.5) -> np.ndarray:
    """A ribbon unrolls from its paper roll: a soft rolling swish."""
    n = int(dur * SR)
    t = _t(n)
    sw = S.swipe(dur, 300, 2400) * 0.8
    roll = np.sin(2 * np.pi * 9 * t) * 0.25 + 0.75
    return sw * roll


@_peak1
def string(dur: float = 0.4) -> np.ndarray:
    """A thread is drawn tight: a thin, quiet zip."""
    return S.swipe(dur, 2400, 7000) * 0.5


@_peak1
def hang() -> np.ndarray:
    """A hung piece catches on its string."""
    return mix(S.click(0.5) * 0.7, S.tink(1180) * 0.18)


@_peak1
def stamp() -> np.ndarray:
    """A rubber stamp comes down."""
    return mix(S.thump(58, 0.42) * 1.0, S.click(1.1) * 0.5)


@_peak1
def page_up(dur: float = 4.5) -> np.ndarray:
    """The last page folds up: a big soft air movement into a warm low swell."""
    n = int(dur * SR)
    out = S.swell(dur) * 0.7
    w = S.whoosh(0.9, peak=0.45) * 1.4
    out[: len(w)] += w[:n]
    return out


@_peak1
def tick_train(count: int, span: float, freq: float = 2200) -> np.ndarray:
    """A small dial ticking `count` times over `span` seconds."""
    n = int((span + 0.05) * SR)
    out = np.zeros(n)
    for k in range(count):
        i = int(k * span / max(1, count - 1) * SR) if count > 1 else 0
        tk = mix(S.tick(freq) * 0.6, S.click(0.4) * 0.3)
        out[i : i + len(tk)] += tk[: n - i]
    return out
