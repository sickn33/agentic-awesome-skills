#!/usr/bin/env python3
"""Music analysis for cutting MG to a track.
usage: python3 analyze_music.py mono.wav OUTDIR
Input: mono wav (make it with: ffmpeg -i track.mp3 -ac 1 -ar 22050 mono.wav)
Prints: tempo candidates, beat-grid offset, onsets (all / low / high), RMS per 0.5 s, spectral centroid per second.
Writes: OUTDIR/spec.png (spectrogram + envelope + beat grid; bar lines brighter) and OUTDIR/analysis.json."""
import sys, json, wave, numpy as np
from scipy.signal import stft, find_peaks
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

path, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '.')
w = wave.open(path); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
dur = len(x) / sr; hop = 256
f, t, Z = stft(x, sr, nperseg=1024, noverlap=1024 - hop); M = np.abs(Z); fps = sr / hop

def flux(lo, hi):
    m = np.log1p(100 * M[(f >= lo) & (f < hi)]); d = np.diff(m, axis=1); d[d < 0] = 0; o = d.sum(0); return o / (o.max() + 1e-9)

on, low, high = flux(30, 8000), flux(30, 150), flux(5000, 11000)
o = on - on.mean(); ac = np.correlate(o, o, 'full')[len(o) - 1:]; lags = np.arange(len(ac)) / fps
bpm_all = 60 / lags[1:]; mask = (bpm_all > 70) & (bpm_all < 180)
cands = [round(float(b), 1) for _, b in sorted(zip(ac[1:][mask], bpm_all[mask]), reverse=True)[:6]]
bpm = cands[0]; beat = 60 / bpm
pk = lambda s, h, dist: [round(float(p / fps), 3) for p in find_peaks(s, height=h, distance=int(fps * dist))[0]]
onsets, lows, highs = pk(on, .3, .1), pk(low, .25, .18), pk(high, .3, .1)
# beat-grid offset: phase that best aligns strong onsets to a 16th grid
sixteenth = beat / 4; phases = np.linspace(0, sixteenth, 50, endpoint=False)
err = [np.mean([min((ot - ph) % sixteenth, sixteenth - (ot - ph) % sixteenth) for ot in onsets]) for ph in phases]
grid0 = float(phases[int(np.argmin(err))])
rms = np.sqrt(np.convolve(x ** 2, np.ones(int(sr * .25)) / int(sr * .25), 'same'))
rms_half = [round(float(rms[min(len(rms) - 1, int(i * sr))]), 3) for i in np.arange(0, dur, .5)]
cent = (f[:, None] * M).sum(0) / (M.sum(0) + 1e-9); cent_s = [int(cent[int(i * fps):int((i + 1) * fps)].mean()) for i in range(int(dur))]
res = dict(duration=round(dur, 3), bpm_candidates=cands, bpm=bpm, grid0=round(grid0, 3), onsets=onsets, low_hits=lows, high_hits=highs, rms_per_half_s=rms_half, centroid_per_s=cent_s)
print(json.dumps(res, indent=1)); json.dump(res, open(f'{out}/analysis.json', 'w'), indent=1)

f2, t2, Z2 = stft(x, sr, nperseg=2048, noverlap=2048 - 256); S = 20 * np.log10(np.abs(Z2) + 1e-6)
fig, ax = plt.subplots(2, 1, figsize=(max(14, dur * 1.1), 8), sharex=True, gridspec_kw={'height_ratios': [3, 1]})
ax[0].pcolormesh(t2, f2, S, vmin=-80, vmax=-10, shading='auto', cmap='magma'); ax[0].set_yscale('symlog', linthresh=200); ax[0].set_ylim(30, 11000)
env = np.sqrt(np.convolve(x ** 2, np.ones(1000) / 1000, 'same')); ax[1].plot(np.arange(len(x)) / sr, env, lw=.6)
k = 0
for b in np.arange(grid0, dur, beat):
    bar = k % 4 == 0; k += 1
    for a in ax: a.axvline(b, color='w' if bar else 'c', lw=1.2 if bar else .5, alpha=.6)
ax[1].set_xticks(np.arange(0, dur + .5, .5)); plt.tight_layout(); plt.savefig(f'{out}/spec.png', dpi=80)
print('wrote', f'{out}/spec.png')
