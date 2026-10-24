#!/usr/bin/env python3
"""audio_post.py — the post layer of an audio-first film: things AI music generators can't do precisely.
Works on WAV (convert first: ffmpeg -i track.mp3 -ar 48000 track.wav). Stereo or mono in, stereo out.

  sfx   KIND out.wav [--note A4] [--dur 0.6]   synthesize a tuned material sound
        KIND: bubble · punch · metal · rip · click · riser · impact · sparkle
  lay   base.wav out.wav T:file.wav[:gain_db] ...   place sounds at exact seconds (e.g. on analysed beats)
  phone in.wav out.wav --from 8 --to 11.5      "before" section through an old-phone speaker (glow-up reveal)
  gate  in.wav out.wav --from 5.3 --to 8 --fps 24   chop a section "on twos" so audio stutters with the picture
  loop  in.wav out.wav [--xfade 0.3]           make the file loop seamlessly (tail crossfaded into the head)
  morse TEXT out.wav --bpm 120 [--note E6]     brand name as a Morse rhythm on the 16th grid (hidden signature)
  stego in.wav image.png out.wav --at 22 --dur 2 [--lo 13000 --hi 19000]
        paint an image into the spectrogram (visible in any spectrum viewer, near-inaudible)
"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
def read(p):
    sr, x = wavfile.read(p); x = x.astype(np.float64)
    if x.dtype.kind != 'f' or np.abs(x).max() > 1.5: x /= 32768.0
    if x.ndim == 1: x = np.stack([x, x], 1)
    if sr != SR:  # simple resample
        n = int(len(x) * SR / sr); idx = np.linspace(0, len(x) - 1, n); x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
    return x
def write(p, x):
    if x.ndim == 1: x = np.stack([x, x], 1)
    peak = np.abs(x).max()
    if peak > 0.99: x = x * 0.99 / peak
    wavfile.write(p, SR, (x * 32767).astype(np.int16)); print('wrote', p, f'{len(x)/SR:.2f}s')
def opt(args, k, d=None, f=float):
    return f(args[args.index('--' + k) + 1]) if '--' + k in args else d
def hz(note):  # 'A4', 'C#5', 'Eb3'
    n = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}[note[0].upper()]; i = 1
    if note[i:i+1] in '#b': n += 1 if note[i] == '#' else -1; i += 1
    return 440 * 2 ** ((n + 12 * (int(note[i:]) - 4)) / 12)
def env(n, a=0.002, d=0.3):
    t = np.arange(n) / SR; return np.minimum(1, t / a) * np.exp(-t / d)
def bp(x, lo, hi, order=4):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x, axis=0)

def sfx(kind, f0, dur):
    n = int(dur * SR); t = np.arange(n) / SR; rng = np.random.default_rng(7); noise = rng.standard_normal(n)
    if kind == 'bubble':   # SOPHIE-style: decaying sine whose pitch rises
        f = f0 * (1 + 1.5 * t / dur); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, dur / 4)
    if kind == 'punch':    # pitched thud + paper-tear transient
        f = f0 * 0.5 * (1 + 3 * np.exp(-t * 40)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .12) + .3 * bp(noise, 2000, 8000) * env(n, .0005, .015)
    if kind == 'metal':    # inharmonic partials, slight L/R drift handled in lay()
        return sum(np.sin(2 * np.pi * f0 * r * t) * env(n, .0005, dur / (1 + i)) / (1 + i) for i, r in enumerate([1, 2.76, 5.4, 8.93, 13.3]))
    if kind == 'rip':      # tape / sticker rip: band-passed noise sweeping up
        out = np.zeros(n); seg = 512
        for k in range(0, n - seg, seg): out[k:k+seg] = bp(noise[k:k+seg], 400 + 6000 * k / n, 900 + 9000 * k / n, 2)
        return out * (0.4 + 0.6 * rng.random(n) ** 3) * np.minimum(1, (n - np.arange(n)) / (SR * .02))
    if kind == 'click':    # shutter-like double click
        c = bp(noise, 1500, 9000) * env(n, .0002, .006); return c + np.roll(c, int(.045 * SR)) * .7
    if kind == 'riser':    # flash-recharge whine
        f = f0 * (1 + 3 * (t / dur) ** 2); return np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / dur) ** 1.5 * .6
    if kind == 'impact':   # sub drop + noise burst
        f = f0 / 4 * (1 + 2 * np.exp(-t * 12)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .5) + .5 * bp(noise, 80, 5000) * env(n, .001, .08)
    if kind == 'sparkle':  # glassy random high blips
        out = np.zeros(n)
        for k in rng.integers(0, n - 2000, 18): b = int(1200); tt = np.arange(b) / SR; out[k:k+b] += np.sin(2 * np.pi * f0 * 2 ** rng.integers(1, 4) * tt) * env(b, .0005, .02) * .4
        return out * np.linspace(1, .2, n)
    sys.exit('unknown sfx kind ' + kind)

def main(a):
    cmd = a[0]
    if cmd == 'sfx':
        write(a[2], sfx(a[1], hz(opt(a, 'note', 'A4', str)), opt(a, 'dur', .6)) * .8)
    elif cmd == 'lay':
        x = read(a[1])
        for spec in a[3:]:
            p = spec.split(':'); t0 = float(p[0]); g = 10 ** (float(p[2]) / 20) if len(p) > 2 else 1; s = read(p[1]) * g
            i = int(t0 * SR); end = min(len(x), i + len(s)); x[i:end] += s[:end - i]
        write(a[2], x)
    elif cmd == 'phone':
        x = read(a[1]); i, j = int(opt(a, 'from') * SR), int(opt(a, 'to') * SR); y = bp(x[i:j], 500, 3200)
        y = np.tanh(y * 3) / 3 * (np.abs(x[i:j]).max() / (np.abs(y).max() + 1e-9)); x[i:j] = y; write(a[2], x)
    elif cmd == 'gate':
        # each picture frame lasts 1/fps; "on twos" = every 2 frames the first frame's audio is held (repeated)
        x = read(a[1]); i, j = int(opt(a, 'from') * SR), int(opt(a, 'to') * SR); step = int(SR / opt(a, 'fps', 24))
        fade = np.minimum(1, np.minimum(np.arange(step), step - np.arange(step)) / 64)[:, None]
        for k in range(i, j - 2 * step, 2 * step):
            grain = x[k:k + step].copy() * fade; x[k:k + step] = grain; x[k + step:k + 2 * step] = grain
        write(a[2], x)
    elif cmd == 'loop':
        x = read(a[1]); n = int(opt(a, 'xfade', .3) * SR); fade = np.linspace(0, 1, n)[:, None]
        head = x[:n] * fade + x[-n:] * (1 - fade); y = np.concatenate([head, x[n:-n]]); write(a[2], y)
    elif cmd == 'morse':
        code = {'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--',
                'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..'}
        u = 60 / opt(a, 'bpm', 120) / 4; f = hz(opt(a, 'note', 'E6', str)); out = []; t = np.arange(int(3 * u * SR)) / SR
        for ch in a[1].upper():
            for s in code.get(ch, ''):
                k = 1 if s == '.' else 3; tone = np.sin(2 * np.pi * f * t[:int(k * u * SR)]) * np.minimum(1, np.minimum(t[:int(k * u * SR)], (k * u - t[:int(k * u * SR)])) / .004)
                out += [tone * .5, np.zeros(int(u * SR))]
            out.append(np.zeros(int(2 * u * SR)))
        write(a[2], np.concatenate(out))
    elif cmd == 'stego':
        from PIL import Image
        x = read(a[1]); img = np.asarray(Image.open(a[2]).convert('L'), float)[::-1] / 255  # row 0 = lowest freq
        t0, dur, lo, hi = opt(a, 'at'), opt(a, 'dur', 2), opt(a, 'lo', 13000), opt(a, 'hi', 19000)
        rows = min(img.shape[0], 96); img = np.asarray(Image.fromarray((img[::-1] * 255).astype(np.uint8)).resize((200, rows)), float)[::-1] / 255
        n = int(dur * SR); t = np.arange(n) / SR; col = np.minimum(img.shape[1] - 1, (t / dur * img.shape[1]).astype(int)); sig = np.zeros(n)
        for r, f in enumerate(np.linspace(lo, hi, rows)): sig += np.sin(2 * np.pi * f * t + r) * img[r, col]
        sig *= 0.02 / (np.abs(sig).max() + 1e-9) * 10 ** (opt(a, 'gain', 0) / 20); i = int(t0 * SR); x[i:i + n] += sig[:len(x) - i, None]; write(a[3], x)
    else:
        sys.exit(__doc__)

if __name__ == '__main__':
    main(sys.argv[1:]) if len(sys.argv) > 1 else print(__doc__)
