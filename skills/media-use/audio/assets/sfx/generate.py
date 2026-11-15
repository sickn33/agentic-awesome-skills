"""AAS original procedural cues (2026-11-01), Apache-2.0; no recorded samples."""
import json
import math
from pathlib import Path
import struct
import subprocess
import tempfile
import wave

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text())
for index, entry in enumerate(manifest.values()):
    name = entry['file']
    duration = float(entry['duration'])
    if Path(name).name != name or not name.endswith('.mp3') or not 0 < duration <= 30:
        raise ValueError('Invalid fixture filename or duration')
    rate = 22050
    count = int(duration * rate)
    with tempfile.TemporaryDirectory(prefix='aas-sfx-') as temp:
        wav = Path(temp) / 'cue.wav'
        samples = bytearray()
        for frame in range(count):
            t = frame / rate
            envelope = min(1, t / 0.01) * math.exp(-5 * t / duration)
            frequency = 160 + index * 37
            value = 0.18 * envelope * (math.sin(2 * math.pi * frequency * t) + 0.25 * math.sin(2 * math.pi * frequency * 2 * t))
            samples.extend(struct.pack('<h', int(32767 * value)))
        with wave.open(str(wav), 'wb') as out:
            out.setparams((1, 2, rate, count, 'NONE', 'not compressed'))
            out.writeframes(samples)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '64k', str(root / name)], check=True)
