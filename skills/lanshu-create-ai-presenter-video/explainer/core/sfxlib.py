#!/usr/bin/env python3
"""Procedural sound library shared by every explainer film (numpy only; nothing sampled or downloaded).

    import sys; sys.path.insert(0, "lib")            # the film's synced copy
    from sfxlib import Bed, click, tick, pop, whoosh ...
    bed = Bed(45.0, seed=20261005)
    bed.place(pop(900), 2.23, -30, pan=-0.2)          # signal, time (s), gain (dB), pan -1..1
    bed.write("assets/audio/sfx.wav", lift_after=(40.3, 9))  # optional: bring an unvoiced tail up

Run with a Python that has numpy, e.g. python3.
Levels: keep the bed well under the narration (gains around -30…-42 dB); the voice is the loudest thing.
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(20261005)
db = lambda x: 10 ** (x / 20)


def seed(n: int) -> None:
    global rng
    rng = np.random.default_rng(n)


def env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


def lowpass(x: np.ndarray, cutoff) -> np.ndarray:
    """One-pole low-pass; cutoff may be a per-sample array (Hz)."""
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc += a[k] * (x[k] - acc)
        y[k] = acc
    return y


# ---------------- one-shots ----------------
def click(bright: float = 1.0) -> np.ndarray:
    """A key / tap: a bright transient over a small wooden body."""
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    hp = np.diff(rng.standard_normal(n), prepend=0) * env(n, 0.0002, 0.0025) * 0.5 * bright
    body = np.sin(2 * np.pi * (170 + 40 * rng.random()) * t) * env(n, 0.0005, 0.012) * 0.35
    return hp + body


def tick(freq: float = 3200) -> np.ndarray:
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env(n, 0.0002, 0.004)


def blip(freq: float, dur: float = 0.22) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * freq * t) + 0.18 * np.sin(2 * np.pi * 2 * freq * t)) * env(n, 0.003, dur / 4)


def pop(freq: float = 900.0) -> np.ndarray:
    """A soft bubble pop for things that appear."""
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.03)


def tink(freq: float) -> np.ndarray:
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    parts = [(1, 1.0, 0.16), (2.76, 0.45, 0.08), (5.4, 0.22, 0.04)]
    return sum(a * np.sin(2 * np.pi * freq * m * t) * env(n, 0.0005, d) for m, a, d in parts)


def thump(f0: float = 70, dur: float = 0.35) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * np.exp(-t * 6) + 38
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, dur / 3.5) + 0.25 * np.diff(rng.standard_normal(n), prepend=0) * env(n, 0.0002, 0.004)


def zap(dur: float = 0.18) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 900 * t + 6 * np.sin(2 * np.pi * 73 * t)) * env(n, 0.001, 0.04)


def chime() -> np.ndarray:
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 880 * t) * env(n, 0.004, 0.45) + 0.6 * np.sin(2 * np.pi * 1318.5 * t) * env(n, 0.004, 0.35)) * 0.7


def bell() -> np.ndarray:
    """A softened class bell: two struck notes, the second lower (ding — dong)."""
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for start, f in [(0.0, 784.0), (0.42, 587.3)]:
        i = int(start * SR)
        tt = t[: n - i]
        out[i:] += sum(a * np.sin(2 * np.pi * f * m * tt) * env(len(tt), 0.002, d) for m, a, d in [(1, 1.0, 0.7), (2.0, 0.35, 0.35), (3.01, 0.18, 0.2), (4.2, 0.1, 0.12)])
    return out * 0.6


# ---------------- textures ----------------
def swipe(dur: float, lo: float = 1200, hi: float = 5000) -> np.ndarray:
    """Marker / pen stroke: band-limited noise with a soft arch."""
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    return (lowpass(noise, hi) - lowpass(noise, lo)) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7 * 1.6


def whoosh(dur: float, peak: float = 0.55) -> np.ndarray:
    """Air past the camera: noise whose low-pass opens toward the middle of the move."""
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    x = lowpass(rng.standard_normal(n), 300 + 5200 * np.exp(-((u - peak) ** 2) / 0.05))
    return x * np.sin(np.pi * u) ** 1.4 * 2.2


def swell(dur: float) -> np.ndarray:
    """Low bed for a reveal: fifths on A with a slow rise and a long tail."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    tone = np.sin(2 * np.pi * 55 * t) + 0.55 * np.sin(2 * np.pi * 82.5 * t) + 0.3 * np.sin(2 * np.pi * 110 * t)
    air = lowpass(rng.standard_normal(n), 900) * 0.8
    return (tone * 0.7 + air) * np.minimum(1, u / 0.35) ** 2 * np.minimum(1, (1 - u) / 0.25)


def shimmer(dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    x = sum(np.sin(2 * np.pi * f * t + k) for k, f in enumerate([1760, 2217, 2637, 3520])) / 4
    return x * np.minimum(1, u / 0.3) * np.minimum(1, (1 - u) / 0.4)


def engine(dur: float, f0: float = 52.0, bright: float = 900.0) -> np.ndarray:
    """A small motor: a low buzz with a little throttle wobble and road noise."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.06 * np.sin(2 * np.pi * 3.1 * t))) / SR
    buzz = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph) + 0.15 * np.sin(5 * ph)
    return (buzz * 0.5 + lowpass(rng.standard_normal(n), bright) * 0.9) * np.minimum(1, t / 0.12) * np.minimum(1, (dur - t) / 0.25)


def chalk(n_strokes: int = 2) -> np.ndarray:
    """One written character in chalk: a couple of short gritty scrapes, sometimes a tiny squeak."""
    dur = 0.07 + 0.05 * rng.random()
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    band = lowpass(noise, 6500) - lowpass(noise, 1400)
    grit = (rng.random(n) < 0.08) * rng.standard_normal(n) * 2.2
    x = (band + grit) * (0.55 + 0.45 * np.abs(np.sin(np.pi * n_strokes * t / dur))) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.6
    if rng.random() < 0.12:
        f = 2500 + 500 * rng.random()
        x = x + 0.25 * np.sin(2 * np.pi * np.cumsum(f + 400 * t / dur) / SR) * env(n, 0.005, dur / 3)
    return x


def chalk_line(dur: float) -> np.ndarray:
    """A long chalk stroke: steady grit with a slow rise and fall in pressure."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    band = lowpass(noise, 5200) - lowpass(noise, 1100)
    grit = (rng.random(n) < 0.05) * rng.standard_normal(n) * 1.8
    return (band + grit) * (0.6 + 0.4 * np.sin(np.pi * t / dur) ** 0.5) * np.minimum(1, t / 0.02) * np.minimum(1, (dur - t) / 0.04)


def felt(dur: float) -> np.ndarray:
    """An eraser: dull broadband rub, pushed back and forth."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = lowpass(rng.standard_normal(n), 2200)
    return x * (0.45 + 0.55 * np.abs(np.sin(2 * np.pi * 3.2 * t))) * np.minimum(1, t / 0.04) * np.minimum(1, (dur - t) / 0.06) * 2.6


class Bed:
    """A stereo bed of a fixed length; place() mixes, write() normalises the peak and saves 48 kHz 16-bit."""

    def __init__(self, dur: float, seed_value: int | None = None):
        if seed_value is not None:
            seed(seed_value)
        self.dur = dur
        self.n = int(SR * dur)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def place(self, sig: np.ndarray, t: float, gain_db: float, pan: float = 0.0) -> None:
        i = int(t * SR)
        if i >= self.n or i + len(sig) <= 0:
            return
        s = sig[: max(0, self.n - i)] * db(gain_db)
        a = (pan + 1) * np.pi / 4
        self.L[i : i + len(s)] += s * np.cos(a)
        self.R[i : i + len(s)] += s * np.sin(a)

    def typing(self, t0: float, count: int, cps: float, gain: float, pan: float = -0.2) -> None:
        for k in range(count):
            self.place(click(0.8 + 0.4 * rng.random()), t0 + k / cps + (rng.random() - 0.5) * 0.006, gain + (rng.random() - 0.5) * 3, pan)

    def write(self, path: str, gain_db: float = 0.0, lift_after: tuple[float, float] | None = None, fade: float = 0.4, peak_db: float = -3.0) -> str:
        mix = np.stack([self.L, self.R], axis=1) * db(gain_db)
        if lift_after:  # once the voice ends, the bed has the room to itself: bring it up
            t0, lift = lift_after
            ramp = 1 + (db(lift) - 1) * np.clip((np.arange(self.n) / SR - t0) / 0.5, 0, 1)
            mix *= ramp[:, None]
        peak = np.max(np.abs(mix)) or 1.0
        if peak > db(peak_db):
            mix *= db(peak_db) / peak
        k = int(fade * SR)
        mix[-k:] *= np.linspace(1, 0, k)[:, None]
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(out), "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())
        return f"{out} peak {20 * np.log10(np.max(np.abs(mix)) + 1e-9):.1f} dBFS"
