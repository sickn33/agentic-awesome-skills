#!/usr/bin/env python3
"""3x3 grid of nine rendered films of one story, in sync, under one voice track; shorter films hold their last frame.

    python3 tools/grid.py <masters-dir> <name> <narration.wav> [still-t]
      reads <masters-dir>/<name>-<style>-master.mp4 for the nine styles (tools/render.sh writes that naming)
      writes <masters-dir>/<name>-nine-grid.mp4 and a still .png (default at 45 % of the longest film)
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from still_grid import NAMES, label_font  # noqa: E402


def duration(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True, check=True).stdout)


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    out, name, narration = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])
    films = [(label, out / f"{name}-{key}-master.mp4") for key, label in NAMES]
    missing = [str(p) for _, p in films if not p.exists()]
    if missing:
        raise SystemExit("missing:\n" + "\n".join(missing))
    durs = [duration(p) for _, p in films]
    total = max(durs)
    still = float(sys.argv[4]) if len(sys.argv) > 4 else round(total * 0.45, 1)
    dest = out / f"{name}-nine-grid.mp4"
    font, ascii_only = label_font(22)
    with tempfile.TemporaryDirectory() as tmp:
        inputs, filters = [], []
        for _, p in films:
            inputs += ["-i", str(p)]
        for i, (label, _) in enumerate(films):
            text = label.split(" ")[0] if ascii_only else label
            img = Image.new("RGBA", (640, 42), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle((8, 6, 8 + d.textlength(text, font=font) + 24, 38), radius=10, fill=(0, 0, 0, 165))
            d.text((20, 9), text, fill=(255, 255, 255, 255), font=font)
            img.save(Path(tmp) / f"l{i}.png")
            inputs += ["-i", str(Path(tmp) / f"l{i}.png")]
        for i, d in enumerate(durs):
            pad = f",tpad=stop_mode=clone:stop_duration={total - d + 0.1:.3f}" if total - d > 0.01 else ""
            filters.append(f"[{i}:v]fps=30,scale=640:360,setsar=1{pad}[s{i}];[s{i}][{9 + i}:v]overlay=0:0[v{i}]")
        layout = "|".join(f"{c}_{r}" for r in ("0", "h0", "h0+h1") for c in ("0", "w0", "w0+w1"))
        filters.append("".join(f"[v{i}]" for i in range(9)) + f"xstack=inputs=9:layout={layout}[out]")
        inputs += ["-i", str(narration)]
        filters.append(f"[18:a]aresample=48000,apad=whole_dur={total:.3f}[a]")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters), "-map", "[out]",
                        "-map", "[a]", "-t", f"{total:.3f}", "-c:v", "libx264", "-crf", "20", "-preset", "medium",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(dest)], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(still), "-i", str(dest), "-frames:v", "1",
                    str(dest.with_suffix(".png"))], check=True)
    print(dest, dest.with_suffix(".png"))


if __name__ == "__main__":
    main()
