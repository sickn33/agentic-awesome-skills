#!/usr/bin/env python3
"""Plan presenter generation segments that fit a provider duration cap.

Cuts fall inside real pauses of the locked narration, so no segment starts or
ends mid-word. Timings are ASR sentence or word spans normalized to a JSON list
of {"start": seconds, "end": seconds, "text": "..."} objects.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Any


EPSILON = 1e-6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timings", required=True, help="ASR spans as a JSON list")
    duration = parser.add_mutually_exclusive_group(required=True)
    duration.add_argument("--audio", help="Locked narration file (probed for duration)")
    duration.add_argument("--audio-duration", type=float, help="Narration seconds")
    parser.add_argument(
        "--cap",
        type=float,
        required=True,
        help="Longest segment the provider accepts; use the smallest of its video and reference-audio limits",
    )
    parser.add_argument("--min-gap", type=float, default=0.25, help="Shortest pause to cut in")
    parser.add_argument("--min-segment", type=float, default=2.0, help="Shortest segment to plan")
    parser.add_argument(
        "--whole-seconds",
        action="store_true",
        help="Provider requests and bills whole seconds; prefer integer cuts inside pauses",
    )
    parser.add_argument("--output", help="Also write the plan to this JSON file")
    return parser.parse_args()


def probe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def load_spans(path: Path) -> list[tuple[float, float]]:
    data: Any = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        for key in ("sentences", "segments", "words"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
    if not isinstance(data, list) or not data:
        raise ValueError("timings must be a non-empty JSON list of {start, end} spans")
    spans = []
    for item in data:
        try:
            start, end = float(item["start"]), float(item["end"])
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"timing entry needs numeric start and end: {item!r}")
        if end < start:
            raise ValueError(f"timing entry ends before it starts: {item!r}")
        spans.append((start, end))
    return sorted(spans)


def candidate_cuts(
    spans: list[tuple[float, float]], min_gap: float, whole_seconds: bool
) -> list[dict[str, Any]]:
    cuts = []
    speech_end = spans[0][1]
    for start, end in spans[1:]:
        # Overlapping word spans never form a pause.
        if start - speech_end >= min_gap:
            middle = (speech_end + start) / 2
            cut = round(middle, 3)
            if whole_seconds:
                integers = range(math.ceil(speech_end), math.floor(start) + 1)
                if integers:
                    cut = float(min(integers, key=lambda value: abs(value - middle)))
            cuts.append({"cut": cut, "pause": [speech_end, start]})
        speech_end = max(speech_end, end)
    return cuts


def plan(
    spans: list[tuple[float, float]],
    total: float,
    cap: float,
    min_gap: float,
    min_segment: float,
    whole_seconds: bool,
) -> dict[str, Any]:
    if spans[-1][1] > total + 0.25:
        raise ValueError(
            f"timings end at {spans[-1][1]:.3f}s but the narration lasts {total:.3f}s; "
            "use timings from the locked audio"
        )
    limit = math.floor(cap + EPSILON) if whole_seconds else cap
    if limit < min_segment:
        raise ValueError("--cap must be at least --min-segment")

    cuts = candidate_cuts(spans, min_gap, whole_seconds)
    boundaries = [0.0]
    pauses: list[list[float] | None] = []
    while total - boundaries[-1] > limit + EPSILON:
        start = boundaries[-1]
        window = [
            cut
            for cut in cuts
            if start + min_segment <= cut["cut"] <= start + limit + EPSILON
            and total - cut["cut"] >= min_segment
        ]
        if not window:
            raise ValueError(
                f"no pause of at least {min_gap}s between {start:.3f}s and "
                f"{start + limit:.3f}s; supply word-level timings, lower --min-gap, "
                "or rewrite the sentence"
            )
        # The latest usable pause keeps segments long, so the edit has fewer seams.
        chosen = window[-1]
        boundaries.append(chosen["cut"])
        pauses.append(chosen["pause"])
    boundaries.append(total)
    pauses.append(None)

    segments = []
    for index, (start, end) in enumerate(zip(boundaries, boundaries[1:]), start=1):
        duration = round(end - start, 3)
        requested = math.ceil(duration - EPSILON) if whole_seconds else duration
        segments.append(
            {
                "index": index,
                "audio_start_s": round(start, 3),
                "audio_end_s": round(end, 3),
                "requested_seconds": requested,
                "authored_start_s": round(start, 3),
                "authored_duration_s": duration,
                "source_start_s": 0.0,
                "ends_in_pause_s": pauses[index - 1],
            }
        )

    return {
        "audio_duration_s": round(total, 3),
        "cap_s": cap,
        "min_gap_s": min_gap,
        "whole_seconds": whole_seconds,
        "segments": segments,
        "seams_s": [round(value, 3) for value in boundaries[1:-1]],
        "total_requested_seconds": round(
            sum(segment["requested_seconds"] for segment in segments), 3
        ),
    }


def main() -> int:
    args = parse_args()
    if args.cap <= 0 or args.min_gap < 0 or args.min_segment <= 0:
        raise ValueError("--cap and --min-segment must be positive; --min-gap cannot be negative")
    spans = load_spans(Path(args.timings).expanduser())
    total = (
        probe_duration(Path(args.audio).expanduser())
        if args.audio
        else float(args.audio_duration)
    )
    if total <= 0:
        raise ValueError("narration duration must be positive")

    result = plan(spans, total, args.cap, args.min_gap, args.min_segment, args.whole_seconds)
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = Path(args.output).expanduser()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
