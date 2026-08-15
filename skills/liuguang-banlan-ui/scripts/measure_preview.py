#!/usr/bin/env python3
"""Measure a rendered spectral field against its parameter manifest."""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess

import numpy as np
from PIL import Image


def load_config(path: pathlib.Path) -> dict:
    source = (
        "global.window={};require(require('path').resolve(process.argv[1]));"
        "process.stdout.write(JSON.stringify(window.SPECTRAL_THEME));"
    )
    result = subprocess.run(
        ["node", "-e", source, str(path)],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def srgb_to_oklab(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    linear = np.where(
        rgb <= 0.04045,
        rgb / 12.92,
        ((rgb + 0.055) / 1.055) ** 2.4,
    )
    r, g, b = np.moveaxis(linear, -1, 0)
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    lab = np.stack(
        (
            0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
        ),
        axis=-1,
    )
    luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lab, luminance


def circular_distance(a: np.ndarray, b: float) -> np.ndarray:
    delta = np.abs(a - b)
    return np.minimum(delta, 360.0 - delta)


def measure(image_path: pathlib.Path, config: dict) -> dict:
    image = Image.open(image_path).convert("RGB")
    pixels = np.asarray(image, dtype=np.float32) / 255.0
    lab, luminance = srgb_to_oklab(pixels)
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    hue = (np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) + 360.0) % 360.0

    base_chroma = float(config["base"]["oklch"]["c"])
    threshold = base_chroma + (0.003 if config["mode"] == "opal" else 0.004)
    chroma_energy = np.maximum(chroma - threshold, 0.0)
    visible = chroma_energy > 0

    distances = np.stack(
        [circular_distance(hue, float(color["oklch"]["h"])) for color in config["colors"]],
        axis=-1,
    )
    assignments = np.argmin(distances, axis=-1)
    total_pixels = pixels.shape[0] * pixels.shape[1]
    total_energy = float(chroma_energy.sum())
    colors = []
    for index, color in enumerate(config["colors"]):
        assigned = visible & (assignments == index)
        energy = float(chroma_energy[assigned].sum())
        colors.append(
            {
                "id": color["id"],
                "label": color["label"],
                "configuredIntensity": color["intensity"],
                "oklch": color["oklch"],
                "peakOpacity": color["peakOpacity"],
                "measuredCoverage": round(float(assigned.sum()) / total_pixels, 4),
                "effectiveShare": round(energy / total_energy, 4) if total_energy else 0.0,
            }
        )

    return {
        "image": image_path.name,
        "dimensions": {"width": image.width, "height": image.height},
        "method": "nearest configured OKLCH hue over pixels above the base-chroma visibility threshold",
        "visibilityThresholdChroma": round(threshold, 4),
        "chromaticPixelRatio": round(float(visible.mean()), 4),
        "meanOklabChroma": round(float(chroma.mean()), 5),
        "luminance": {
            "mean": round(float(luminance.mean()), 5),
            "p05": round(float(np.percentile(luminance, 5)), 5),
            "p95": round(float(np.percentile(luminance, 95)), 5),
            "max": round(float(luminance.max()), 5),
            "configuredCap": config["field"]["luminanceCap"],
        },
        "colors": colors,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=pathlib.Path)
    parser.add_argument("--config", required=True, type=pathlib.Path)
    args = parser.parse_args()
    config = load_config(args.config.resolve())
    payload = {
        "schemaVersion": "1.0",
        "theme": config["label"],
        "preset": config["preset"],
        "overallColorIntensity": config["overallColorIntensity"],
        "measurement": measure(args.image.resolve(), config),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
