#!/usr/bin/env python3
"""Analyze an Xcode Instruments .trace file and emit JSON + markdown.

Primary modes:
  (default)           Full four-lane analysis + cross-lane correlations.
  --list-logs         Dump os_log entries (optionally filtered) as JSON so an
                      agent can locate a focus window by log content.
  --list-signposts    Dump os_signpost intervals + point events as JSON.

Windowing:
  --window START_MS:END_MS restricts every lane to that slice of the trace.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from instruments_parser import (
    causes,
    correlate,
    events,
    hangs,
    hitches,
    summary,
    swiftui,
    time_profiler,
    xctrace,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Analyze an Instruments .trace file.",
    )
    parser.add_argument("--trace", required=True, type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        help="Base path; writes <output>.json and <output>.md",
    )
    parser.add_argument("--top", type=int, default=10, help="Top-N per lane")
    parser.add_argument(
        "--top-hitches",
        type=int,
        default=5,
        help="Correlate only the N worst hitches (avoid flooding output).",
    )
    parser.add_argument(
        "--window",
        type=str,
        default=None,
        help="Restrict analysis to a time slice, e.g. --window 10400:11700 (ms).",
    )
    parser.add_argument(
        "--run",
        type=int,
        default=None,
        help="Which run to analyze (1-based). Required for traces with >1 run.",
    )
    parser.add_argument(
        "--list-runs", action="store_true",
        help="Emit per-run metadata as JSON (use this to discover available runs).",
    )

    # Mode flags (mutually exclusive with full analysis)
    mode_group = parser.add_argument_group("Discovery modes")
    mode_group.add_argument(
        "--list-logs", action="store_true",
        help="Emit os_log entries as JSON (use filter flags below).",
    )
    mode_group.add_argument(
        "--list-signposts", action="store_true",
        help="Emit os_signpost intervals + events as JSON.",
    )
    mode_group.add_argument("--log-subsystem", type=str, default=None)
    mode_group.add_argument("--log-category", type=str, default=None)
    mode_group.add_argument(
        "--log-type", type=str, default=None,
        help="e.g. Fault, Error, Default, Info, Debug",
    )
    mode_group.add_argument(
        "--log-message-contains", type=str, default=None,
        help="Case-insensitive substring match on the message / format string.",
    )
    mode_group.add_argument(
        "--log-limit", type=int, default=None,
        help="Cap number of log entries returned (applied after all filters).",
    )
    mode_group.add_argument(
        "--signpost-name-contains", type=str, default=None,
        help="Case-insensitive substring match on signpost name.",
    )
    mode_group.add_argument("--signpost-subsystem", type=str, default=None)
    mode_group.add_argument("--signpost-category", type=str, default=None)
    mode_group.add_argument(
        "--fanin-for", type=str, default=None,
        help="Emit incoming cause-graph sources for destinations whose fmt "
             "contains this substring. Case-insensitive.",
    )

    fmt_group = parser.add_mutually_exclusive_group()
    fmt_group.add_argument("--json-only", action="store_true")
    fmt_group.add_argument("--markdown-only", action="store_true")

    args = parser.parse_args(argv)

    # The discovery modes aren't in a mutually_exclusive_group because they
    # live alongside their sub-filters in the same argparse group; enforce the
    # constraint by hand so an agent gets a clear error instead of silent
    # precedence.
    active_modes = sum([
        args.list_runs,
        args.list_logs,
        args.list_signposts,
        bool(args.fanin_for),
    ])
    if active_modes > 1:
        parser.error(
            "--list-runs, --list-logs, --list-signposts, and --fanin-for are "
            "mutually exclusive; pick one per invocation."
        )

    trace = args.trace
    if not trace.exists():
        print(f"error: trace not found: {trace}", file=sys.stderr)
        return 2

    info = xctrace.toc(trace)
    window_ns = _parse_window(args.window)

    if args.list_runs:
        sys.stdout.write(json.dumps({
            "xctrace_version": info.xctrace_version,
            "runs": [
                {
                    "number": r.number,
                    "template": r.template_name,
                    "duration_s": r.duration_s,
                    "start_date": r.start_date,
                    "end_date": r.end_date,
                    "schemas": sorted(r.schemas),
                }
                for r in info.runs
            ],
        }, indent=2))
        sys.stdout.write("\n")
        return 0

    run_info = _resolve_run(info, args.run)
    if run_info is None:
        return 2
    run_number = run_info.number

    if args.list_logs:
        out = events.list_logs(
            trace, run_info.schemas,
            subsystem=args.log_subsystem,
            category=args.log_category,
            message_contains=args.log_message_contains,
            message_type=args.log_type,
            limit=args.log_limit,
            window_ns=window_ns,
            run=run_number,
        )
        sys.stdout.write(json.dumps({"logs": out, "count": len(out)}, indent=2))
        sys.stdout.write("\n")
        return 0

    if args.list_signposts:
        sp = events.list_signposts(
            trace, run_info.schemas,
            name_contains=args.signpost_name_contains,
            subsystem=args.signpost_subsystem,
            category=args.signpost_category,
            window_ns=window_ns,
            run=run_number,
        )
        sys.stdout.write(json.dumps(sp, indent=2))
        sys.stdout.write("\n")
        return 0

    if args.fanin_for:
        fanin = causes.fanin_for(
            trace, run_info.schemas,
            destination_contains=args.fanin_for,
            top_k=args.top,
            window=window_ns,
            run=run_number,
        )
        sys.stdout.write(json.dumps(fanin, indent=2))
        sys.stdout.write("\n")
        return 0

    # Full five-lane analysis
    schemas = run_info.schemas
    lanes_out = {
        "time-profiler":  time_profiler.analyze(trace, schemas, top_n=args.top, window=window_ns, run=run_number),
        "hangs":          hangs.analyze(trace, schemas, top_n=args.top, window=window_ns, run=run_number),
        "hitches":        hitches.analyze(trace, schemas, top_n=args.top, window=window_ns, run=run_number),
        "swiftui":        swiftui.analyze(trace, schemas, top_n=args.top, window=window_ns, run=run_number),
        "swiftui-causes": causes.analyze(trace, schemas, top_n=args.top, window=window_ns, run=run_number),
    }
    correlations = correlate.build(
        lanes_out, top_hitches=args.top_hitches, top_symbols=5
    )
    public_lanes = [_strip_internal(l) for l in lanes_out.values()]

    result: dict = {
        "trace": str(trace),
        "xctrace_version": info.xctrace_version,
        "run": run_number,
        "runs_available": [r.number for r in info.runs],
        "template": run_info.template_name,
        "duration_s": run_info.duration_s,
        "start_date": run_info.start_date,
        "end_date": run_info.end_date,
        "schemas_available": sorted(run_info.schemas),
        "lanes": public_lanes,
        "correlations": correlations,
    }
    if window_ns is not None:
        result["window_ms"] = {
            "start": window_ns[0] / 1_000_000,
            "end": window_ns[1] / 1_000_000,
        }

    md = summary.render(result)

    if args.output:
        json_path = args.output.with_suffix(".json")
        md_path = args.output.with_suffix(".md")
        json_path.write_text(json.dumps(result, indent=2))
        md_path.write_text(md)
        print(f"wrote {json_path}")
        print(f"wrote {md_path}")
        return 0

    if args.markdown_only:
        sys.stdout.write(md)
    elif args.json_only:
        sys.stdout.write(json.dumps(result, indent=2))
        sys.stdout.write("\n")
    else:
        sys.stdout.write(json.dumps(result, indent=2))
        sys.stdout.write("\n---\n")
        sys.stdout.write(md)
    return 0


def _resolve_run(info, requested: int | None):
    """Pick a run from the trace.

    If `requested` is given, return that run or None on miss (with a friendly
    error). If unset and the trace has exactly one run, default to it. If
    unset and there are multiple runs, error out so the agent picks
    explicitly — silently picking run 1 lost data for the user.
    """
    if not info.runs:
        print("error: trace has no runs", file=sys.stderr)
        return None
    if requested is not None:
        try:
            return info.get_run(requested)
        except KeyError as e:
            print(f"error: {e}", file=sys.stderr)
            return None
    if len(info.runs) == 1:
        return info.runs[0]
    available = ", ".join(str(r.number) for r in info.runs)
    print(
        f"error: trace has {len(info.runs)} runs ({available}); pass --run N. "
        f"Use --list-runs to see per-run metadata.",
        file=sys.stderr,
    )
    return None


def _parse_window(spec: str | None) -> tuple[int, int] | None:
    if not spec:
        return None
    if ":" not in spec:
        raise SystemExit(f"--window expects START_MS:END_MS, got {spec!r}")
    start_s, end_s = spec.split(":", 1)
    try:
        start_ms = float(start_s)
        end_ms = float(end_s)
    except ValueError as e:
        raise SystemExit(f"--window: {e}")
    if end_ms < start_ms:
        raise SystemExit("--window: end_ms must be >= start_ms")
    return (int(start_ms * 1_000_000), int(end_ms * 1_000_000))


def _strip_internal(lane: dict) -> dict:
    return {k: v for k, v in lane.items() if not k.startswith("_")}


if __name__ == "__main__":
    sys.exit(main())
