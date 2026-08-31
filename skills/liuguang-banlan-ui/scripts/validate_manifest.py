#!/usr/bin/env python3
"""Validate a theme-config.js manifest without depending on a JS parser package."""

from __future__ import annotations

import argparse
import json
import math
import pathlib
import re
import sys

from manifest_parser import ManifestSyntaxError, load_manifest


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def is_finite_number(value: object) -> bool:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        return False
    try:
        return math.isfinite(value)
    except (OverflowError, TypeError):
        return False


def check_finite(value: object, message: str, errors: list[str]) -> None:
    require(is_finite_number(value), message, errors)


def check_range(
    value: object,
    lower: float,
    upper: float,
    message: str,
    errors: list[str],
    *,
    lower_inclusive: bool = True,
    upper_inclusive: bool = True,
) -> None:
    if not is_finite_number(value):
        errors.append(f"{message}; must be a finite number")
        return
    lower_ok = value >= lower if lower_inclusive else value > lower
    upper_ok = value <= upper if upper_inclusive else value < upper
    require(lower_ok and upper_ok, message, errors)


def validate(config: dict) -> list[str]:
    if not isinstance(config, dict):
        return ["manifest must be an object"]
    errors: list[str] = []
    required = ("schemaVersion", "mode", "label", "preset", "seed", "overallColorIntensity", "base", "colors", "field", "output")
    for key in required:
        require(key in config, f"missing top-level field: {key}", errors)
    if errors:
        return errors

    require(config["mode"] in ("opal", "obsidian"), "mode must be opal or obsidian", errors)
    check_finite(config["seed"], "seed must be a finite number", errors)
    check_range(config["overallColorIntensity"], 0, 1, "overallColorIntensity must be in [0, 1]", errors)

    base_container = config["base"]
    if not isinstance(base_container, dict):
        errors.append("base must be an object")
        base = {}
    else:
        base = base_container.get("oklch", {})
    if not isinstance(base, dict):
        errors.append("base.oklch must be an object")
        base = {}
    check_range(base.get("l"), 0, 1, "base OKLCH lightness must be in [0, 1]", errors)
    check_range(base.get("c"), 0, 0.4, "base OKLCH chroma must be in [0, 0.4]", errors)
    check_range(base.get("h"), 0, 360, "base OKLCH hue must be in [0, 360)", errors, upper_inclusive=False)

    colors = config["colors"]
    if not isinstance(colors, list):
        errors.append("colors must be an array of objects")
        colors = []
    require(3 <= len(colors) <= 12, "colors must contain 3 to 12 entries", errors)
    ids: set[str] = set()
    for index, color in enumerate(colors):
        prefix = f"colors[{index}]"
        if not isinstance(color, dict):
            errors.append(f"{prefix} must be an object")
            continue
        for key in ("id", "label", "oklch", "srgbFallback", "intensity", "peakOpacity", "fieldScale", "phase"):
            require(key in color, f"{prefix} missing {key}", errors)
        if "id" in color:
            require(isinstance(color["id"], str), f"{prefix}.id must be a string", errors)
            if isinstance(color["id"], str):
                require(color["id"] not in ids, f"duplicate color id: {color['id']}", errors)
                ids.add(color["id"])
        oklch = color.get("oklch", {})
        if not isinstance(oklch, dict):
            errors.append(f"{prefix}.oklch must be an object")
            oklch = {}
        check_range(oklch.get("l"), 0, 1, f"{prefix}.oklch.l must be in [0, 1]", errors)
        check_range(oklch.get("c"), 0, 0.4, f"{prefix}.oklch.c must be in [0, 0.4]", errors)
        check_range(oklch.get("h"), 0, 360, f"{prefix}.oklch.h must be in [0, 360)", errors, upper_inclusive=False)
        fallback = color.get("srgbFallback")
        require(
            isinstance(fallback, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", fallback) is not None,
            f"{prefix}.srgbFallback must be a six-digit hex color",
            errors,
        )
        check_range(color.get("intensity"), 0, 1, f"{prefix}.intensity must be in [0, 1]", errors)
        check_range(color.get("peakOpacity"), 0, 1, f"{prefix}.peakOpacity must be in [0, 1]", errors)
        check_range(
            color.get("fieldScale"),
            0,
            float("inf"),
            f"{prefix}.fieldScale must be positive",
            errors,
            lower_inclusive=False,
        )
        phase = color.get("phase", [])
        require(isinstance(phase, list) and len(phase) == 2, f"{prefix}.phase must contain two values", errors)
        if isinstance(phase, list) and len(phase) == 2:
            require(all(is_finite_number(value) for value in phase), f"{prefix}.phase must contain finite numbers", errors)

    field = config["field"]
    if not isinstance(field, dict):
        errors.append("field must be an object")
        field = {}
    for key in ("scale", "octaves", "warpStrength", "motionSpeed", "staticTime", "ditherStrength", "luminanceCap"):
        require(key in field, f"field missing {key}", errors)
    check_range(field.get("scale"), 0, float("inf"), "field.scale must be positive", errors, lower_inclusive=False)
    octaves = field.get("octaves")
    require(
        isinstance(octaves, int) and not isinstance(octaves, bool) and 1 <= octaves <= 5,
        "field.octaves must be an integer in [1, 5]",
        errors,
    )
    check_range(field.get("warpStrength"), 0, 1, "field.warpStrength must be in [0, 1]", errors)
    check_range(field.get("motionSpeed"), 0, float("inf"), "field.motionSpeed must be finite and nonnegative", errors)
    check_finite(field.get("staticTime"), "field.staticTime must be a finite number", errors)
    check_range(field.get("ditherStrength"), 0, 1, "field.ditherStrength must be in [0, 1]", errors)
    check_range(field.get("luminanceCap"), 0, 1, "field.luminanceCap must be in (0, 1]", errors, lower_inclusive=False)
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("config", type=pathlib.Path)
    args = parser.parse_args()
    try:
        config = load_manifest(args.config.resolve())
    except (ManifestSyntaxError, OSError) as error:
        print(
            json.dumps(
                {"status": "invalid", "errors": [str(error)]},
                ensure_ascii=False,
                indent=2,
            )
        )
        raise SystemExit(1) from error
    errors = validate(config)
    if errors:
        print(json.dumps({"status": "invalid", "errors": errors}, ensure_ascii=False, indent=2))
        sys.exit(1)
    print(json.dumps({"status": "valid", "mode": config["mode"], "preset": config["preset"], "colors": len(config["colors"])}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
