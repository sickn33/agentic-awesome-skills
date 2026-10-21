#!/usr/bin/env python3
"""v12-sitcom sound palette — procedural (numpy only), on top of lib/sfxlib.py. Synced into a film as lib/kit/sitcom_sfx.py.

    import sys; sys.path[:0] = ["lib", "lib/kit"]
    import sitcom_sfx as SS
    bed.place(SS.ding(), t, -30)

Every sound peaks at 1.0, so the gain you pass to Bed.place is its peak level (keep the bed ≈ 10–15 dB under the voice).
  ding()            a soft counter / register bell (chapter changes, "the answer")
  door_bell()       two small bells (someone enters)
  step(soft)        one footstep: a padded heel thud + a scuff;  steps(n, cps) a little walk
  shuffle(dur)      feet shuffling on a wood floor (a queue stepping up)
  truck(dur)        the camera dolly rolling to the next set: a low rumble with a soft whoosh
  boing(f0, dur)    a spring for hops;  bloop()  a sweat drop;  pop2()  a bubble pop (rounder than sfxlib.pop)
  scribble(dur)     a pen / pencil writing;  flip()  a page turning;  stamp()  a rubber stamp
  printer(dur)      a receipt printer rattling out a slip
  curtain(dur)      heavy stage curtains sliding;  applause(dur)  a small, light studio audience clapping
  norm(x)           scale any sfxlib signal to peak 1.0 (sfxlib textures are not normalised)
"""
from __future__ import annotations

import numpy as np

import sfxlib as S
from sfxlib import SR, env, lowpass


def norm(x: np.ndarray) -> np.ndarray:
    """Scale any signal to peak 1.0 (use it on sfxlib textures — whoosh, swell, chalk_line, felt … — so gains read as peaks)."""
    m = float(np.max(np.abs(x))) or 1.0
    return x / m


_norm = norm


def ding(f: float = 1318.5) -> np.ndarray:
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * m * t) * env(n, 0.001, d) for m, a, d in [(1, 1.0, 0.55), (2.01, 0.32, 0.22), (3.0, 0.12, 0.12), (0.5, 0.18, 0.4)])
    return _norm(x)


def door_bell() -> np.ndarray:
    n = int(1.2 * SR)
    out = np.zeros(n)
    for k, (dt, f) in enumerate([(0.0, 2093.0), (0.07, 2637.0), (0.16, 2349.3), (0.26, 2793.8)]):
        i = int(dt * SR)
        tt = np.arange(n - i) / SR
        out[i:] += (0.9 - 0.15 * k) * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.7 * tt)) * env(n - i, 0.001, 0.18)
    return _norm(out)


def step(soft: float = 1.0) -> np.ndarray:
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (85 + 25 * S.rng.random()) * t) * env(n, 0.002, 0.03)
    scuff = lowpass(S.rng.standard_normal(n), 1800) * env(n, 0.004, 0.035) * 0.8 * soft
    return _norm(thud + scuff)


def steps(count: int = 4, cps: float = 3.2) -> np.ndarray:
    n = int((count / cps + 0.2) * SR)
    out = np.zeros(n)
    for k in range(count):
        s = step(0.8 + 0.4 * S.rng.random()) * (0.75 + 0.25 * (k % 2))
        i = max(0, int((k / cps + 0.01 + (S.rng.random() - 0.5) * 0.02) * SR))
        m = min(len(s), n - i)
        out[i:i + m] += s[:m]
    return _norm(out)


def shuffle(dur: float = 0.6) -> np.ndarray:
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    x = lowpass(S.rng.standard_normal(n), 1400) - lowpass(S.rng.standard_normal(n), 250)
    pulses = 0.5 + 0.5 * np.abs(np.sin(np.pi * 5.0 * u * dur))
    return _norm(x * pulses * np.sin(np.pi * u) ** 0.8)


def truck(dur: float = 1.1) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    rumble = lowpass(S.rng.standard_normal(n), 160) * 2.5 + 0.3 * np.sin(2 * np.pi * 48 * t)
    air = S.whoosh(dur, 0.55) * 0.35
    return _norm((rumble * np.sin(np.pi * u) ** 1.2 + air[:n]))


def boing(f0: float = 280.0, dur: float = 0.26) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.8 * np.sin(np.pi * t / dur))
    return _norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, dur / 3))


def bloop() -> np.ndarray:
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    f = 1500 * np.exp(-t * 14) + 500
    return _norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.05))


def pop2(freq: float = 700.0) -> np.ndarray:
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.9 * np.exp(-t * 55))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.035)
    air = lowpass(S.rng.standard_normal(n), 3000) * env(n, 0.0005, 0.006) * 0.3
    return _norm(body + air)


def scribble(dur: float = 0.6) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = S.rng.standard_normal(n)
    band = lowpass(noise, 5200) - lowpass(noise, 1600)
    strokes = 0.35 + 0.65 * np.abs(np.sin(2 * np.pi * (6.5 + 2 * S.rng.random()) * t)) ** 1.5
    return _norm(band * strokes * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.05))


def flip() -> np.ndarray:
    n = int(0.32 * SR)
    u = np.linspace(0, 1, n)
    x = lowpass(S.rng.standard_normal(n), 900 + 5000 * np.sin(np.pi * u) ** 2)
    return _norm(x * np.sin(np.pi * u) ** 1.6)


def stamp() -> np.ndarray:
    a = S.thump(95, 0.26)
    b = S.click(1.6)
    out = np.zeros(max(len(a), len(b)))
    out[: len(a)] += a
    out[: len(b)] += 0.8 * b
    return _norm(out)


def printer(dur: float = 0.9) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.25 + lowpass(S.rng.standard_normal(n), 2500) * 0.6
    ticks = (np.sin(2 * np.pi * 18 * t) > 0.92).astype(float) * 1.4
    return _norm((buzz + ticks * S.rng.standard_normal(n) * 0.5) * np.minimum(1, t / 0.03) * np.minimum(1, (dur - t) / 0.05))


def curtain(dur: float = 0.6) -> np.ndarray:
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    x = lowpass(S.rng.standard_normal(n), 500 + 2400 * np.sin(np.pi * u) ** 2) + 0.5 * lowpass(S.rng.standard_normal(n), 140)
    return _norm(x * np.sin(np.pi * u) ** 0.9)


def applause(dur: float = 2.6, rate: float = 38.0) -> np.ndarray:
    n = int(dur * SR)
    out = np.zeros(n)
    count = int(dur * rate)
    for _ in range(count):
        t0 = S.rng.random() * dur
        m = int(0.03 * SR)
        clap = (lowpass(S.rng.standard_normal(m), 3200 + 2000 * S.rng.random()) - lowpass(S.rng.standard_normal(m), 600)) * env(m, 0.0005, 0.008)
        i = int(t0 * SR)
        out[i:i + m] += clap[: max(0, n - i)] * (0.6 + 0.4 * S.rng.random())
    u = np.linspace(0, 1, n)
    return _norm(out * np.minimum(1, u / 0.12) * np.minimum(1, (1 - u) / 0.45))
