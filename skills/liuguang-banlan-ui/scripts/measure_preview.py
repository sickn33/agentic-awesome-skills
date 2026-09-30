#!/usr/bin/env python3
"""Measure a rendered spectral field against its parameter manifest."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

from manifest_parser import ManifestSyntaxError, load_manifest

try:
    import numpy as np
    from PIL import Image
except ModuleNotFoundError as exc:
    package = {"PIL": "Pillow"}.get(exc.name, exc.name)
    requirements = pathlib.Path(__file__).with_name("requirements.txt")
    print(
        json.dumps(
            {
                "status": "unavailable",
                "reason": f"Optional measurement dependency is missing: {package}",
                "install": f"python -m pip install -r {requirements}",
            },
            ensure_ascii=False,
        ),
        file=sys.stderr,
    )
    raise SystemExit(2)


# A color counts as visible when it deviates this far from the base (OKLab).
TINT_THRESHOLD = {"opal": 0.003, "obsidian": 0.004}
# A block is gray when its lightness moves this far with little hue change.
GRAY_SHIFT = 0.003


def load_config(path: pathlib.Path) -> dict:
    return load_manifest(path)


def srgb_to_linear(rgb: np.ndarray) -> np.ndarray:
    return np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)


def linear_to_oklab(linear: np.ndarray) -> np.ndarray:
    r, g, b = np.moveaxis(linear, -1, 0)
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.stack(
        (
            0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
        ),
        axis=-1,
    )


def oklch_to_ab(color: dict) -> np.ndarray:
    hue = np.radians(float(color["h"]))
    return float(color["c"]) * np.array([np.cos(hue), np.sin(hue)])


def block_average(linear: np.ndarray, block: int) -> np.ndarray:
    block = max(1, min(block, linear.shape[0], linear.shape[1]))
    h = linear.shape[0] // block * block
    w = linear.shape[1] // block * block
    trimmed = linear[:h, :w].reshape(h // block, block, w // block, block, 3)
    return trimmed.mean(axis=(1, 3))


def measure(image_path: pathlib.Path, config: dict, block: int = 8) -> dict:
    with Image.open(image_path) as source:
        image = source.convert("RGB")
    linear = srgb_to_linear(np.asarray(image, dtype=np.float64) / 255.0)
    luminance = 0.2126 * linear[..., 0] + 0.7152 * linear[..., 1] + 0.0722 * linear[..., 2]
    lab = linear_to_oklab(block_average(linear, block))

    base = config["base"]["oklch"]
    base_ab = oklch_to_ab(base)
    shift = lab[..., 0] - float(base["l"])
    delta = lab[..., 1:] - base_ab
    tint = np.hypot(delta[..., 0], delta[..., 1])

    threshold = TINT_THRESHOLD.get(config["mode"], 0.003)
    energy = np.maximum(tint - threshold, 0.0)
    visible = energy > 0
    gray = (np.abs(shift) > GRAY_SHIFT) & (tint < np.abs(shift) / 3)

    directions = np.stack([oklch_to_ab(color["oklch"]) - base_ab for color in config["colors"]])
    angles = np.arctan2(directions[:, 1], directions[:, 0])
    deviation_angle = np.arctan2(delta[..., 1], delta[..., 0])
    distance = np.abs((deviation_angle[..., None] - angles + np.pi) % (2 * np.pi) - np.pi)
    assignments = np.argmin(distance, axis=-1)

    total_blocks = tint.size
    total_energy = float(energy.sum())
    colors = []
    for index, color in enumerate(config["colors"]):
        assigned = visible & (assignments == index)
        colors.append(
            {
                "id": color["id"],
                "label": color["label"],
                "configuredIntensity": color["intensity"],
                "oklch": color["oklch"],
                "peakOpacity": color["peakOpacity"],
                "measuredCoverage": round(float(assigned.sum()) / total_blocks, 4),
                "effectiveShare": round(float(energy[assigned].sum()) / total_energy, 4) if total_energy else 0.0,
            }
        )

    mean_tint = float(tint.mean())
    return {
        "image": image_path.name,
        "dimensions": {"width": image.width, "height": image.height},
        "method": (
            f"OKLab deviation from the configured base over {block}x{block} pixel blocks; "
            "hue is attributed by the direction of the deviation"
        ),
        "blockSize": block,
        "visibilityThresholdTint": threshold,
        "chromaticPixelRatio": round(float(visible.mean()), 4),
        "tint": {
            "mean": round(mean_tint, 5),
            "p50": round(float(np.percentile(tint, 50)), 5),
            "p95": round(float(np.percentile(tint, 95)), 5),
        },
        "lightnessShift": {
            "mean": round(float(shift.mean()), 5),
            "p05": round(float(np.percentile(shift, 5)), 5),
            "p95": round(float(np.percentile(shift, 95)), 5),
        },
        "shiftToTint": round(abs(float(shift.mean())) / mean_tint, 3) if mean_tint else None,
        "grayRatio": round(float(gray.mean()), 4) if config["mode"] == "opal" else None,
        "luminance": {
            "mean": round(float(luminance.mean()), 5),
            "p05": round(float(np.percentile(luminance, 5)), 5),
            "p95": round(float(np.percentile(luminance, 95)), 5),
            "max": round(float(luminance.max()), 5),
            "configuredCap": config["field"].get("luminanceCap"),
        },
        "colors": colors,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=pathlib.Path)
    parser.add_argument("--config", required=True, type=pathlib.Path)
    parser.add_argument("--block", type=int, default=8, help="pixel block size used to average out dither")
    args = parser.parse_args()
    try:
        config = load_config(args.config.resolve())
    except (ManifestSyntaxError, OSError) as error:
        print(json.dumps({"status": "invalid", "errors": [str(error)]}, ensure_ascii=False, indent=2), file=sys.stderr)
        raise SystemExit(1) from error
    payload = {
        "schemaVersion": "1.1",
        "theme": config["label"],
        "preset": config["preset"],
        "overallColorIntensity": config["overallColorIntensity"],
        "measurement": measure(args.image.resolve(), config, args.block),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
