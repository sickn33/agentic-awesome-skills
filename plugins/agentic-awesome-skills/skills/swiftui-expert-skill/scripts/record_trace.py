#!/usr/bin/env python3
"""Record an Xcode Instruments .trace file via `xctrace record`.

Three modes:
  (default)          Start a recording. Stops on Ctrl+C, stop-file, or time limit.
  --list-devices     Enumerate connected devices + simulators as JSON.
  --list-templates   Enumerate available Instruments templates as JSON.

Attach vs launch vs all-processes is mutually exclusive and passed straight
through to xctrace. The default template is "SwiftUI" (matches the
SwiftUI template in Xcode 26+ — change with --template).

Manual stop options, most to least automated:
  * Send SIGINT (Ctrl+C) to this script — forwarded to xctrace, which
    finalises the trace before exiting.
  * Pass --stop-file PATH; when that file appears on disk, this script
    sends SIGINT to xctrace. Useful for `Bash run_in_background`
    workflows where there's no interactive terminal.
  * Pass --time-limit 30s / 5m / etc. — xctrace stops itself.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Record an Instruments .trace file.")
    list_mode = parser.add_mutually_exclusive_group()
    list_mode.add_argument("--list-devices", action="store_true",
                           help="List devices and simulators as JSON, then exit.")
    list_mode.add_argument("--list-templates", action="store_true",
                           help="List template names as JSON, then exit.")

    parser.add_argument("--template", default="SwiftUI",
                        help="Template name (default: SwiftUI).")
    parser.add_argument("--device", default=None,
                        help="Device name or UDID. Defaults to the host.")
    parser.add_argument("--output", type=Path, default=None,
                        help="Output .trace path. Defaults to ./<template>-<timestamp>.trace.")
    parser.add_argument("--time-limit", default=None,
                        help="Cap recording duration (e.g. 30s, 5m, 1h). Optional.")
    parser.add_argument("--stop-file", type=Path, default=None,
                        help="When this path appears on disk, stop the recording.")
    parser.add_argument("--env", action="append", default=[],
                        metavar="KEY=VALUE",
                        help="Env var for the launched process. Can repeat. Launch mode only.")
    parser.add_argument("--instrument", action="append", default=[],
                        help="Extra --instrument flag passthrough (can repeat).")
    parser.add_argument("--run-name", default=None)

    target = parser.add_mutually_exclusive_group()
    target.add_argument("--launch", metavar="APP",
                        help="Launch this .app path and record it.")
    target.add_argument("--attach", metavar="PID_OR_NAME",
                        help="Attach to a running process by pid or name.")
    target.add_argument("--all-processes", action="store_true",
                        help="Record every process (system-wide).")

    args = parser.parse_args(argv)

    if args.list_devices:
        _print_devices()
        return 0
    if args.list_templates:
        _print_templates()
        return 0

    if not (args.launch or args.attach or args.all_processes):
        print("error: need one of --launch, --attach, or --all-processes.",
              file=sys.stderr)
        return 2

    if args.env and not args.launch:
        # xctrace silently ignores --env outside launch mode; surfacing this
        # explicitly saves agents a confusing "why didn't my env var apply?".
        print("error: --env only applies to --launch; remove it or switch target mode.",
              file=sys.stderr)
        return 2

    output = args.output or Path.cwd() / _default_trace_name(args.template)
    if output.exists():
        print(f"error: output already exists: {output}", file=sys.stderr)
        return 2

    cmd = _build_xctrace_cmd(args, output)

    # Tell the user (and an agent reading stdout) what's happening + how to stop.
    print("[record] starting xctrace record", flush=True)
    print(f"[record]   template: {args.template}", flush=True)
    print(f"[record]   device:   {args.device or '(host)'}", flush=True)
    print(f"[record]   target:   {_describe_target(args)}", flush=True)
    print(f"[record]   output:   {output}", flush=True)
    stop_hints = ["Ctrl+C"]
    if args.stop_file:
        stop_hints.append(f"`touch {args.stop_file}`")
    if args.time_limit:
        stop_hints.append(f"after {args.time_limit}")
    print(f"[record] stop via: {', '.join(stop_hints)}", flush=True)
    print(f"[record] cmd: {' '.join(_shell_quote(c) for c in cmd)}", flush=True)

    # Start xctrace in its own process group so we can signal cleanly.
    proc = subprocess.Popen(cmd, start_new_session=True)

    try:
        _wait_with_stop(proc, args.stop_file)
    except KeyboardInterrupt:
        _forward_sigint(proc)

    # Give xctrace up to 60s to finalise after SIGINT — large traces take time.
    try:
        rc = proc.wait(timeout=60)
    except subprocess.TimeoutExpired:
        print("[record] xctrace did not exit within 60s after stop; killing.",
              file=sys.stderr)
        proc.kill()
        rc = proc.wait()

    if output.exists():
        print(f"[record] done. trace written: {output}", flush=True)
    else:
        print("[record] done but output file not found — did xctrace error?",
              file=sys.stderr)
        return rc or 1
    return rc


def _build_xctrace_cmd(args, output: Path) -> list[str]:
    cmd = ["xctrace", "record", "--template", args.template, "--output", str(output)]
    if args.device:
        cmd += ["--device", args.device]
    if args.time_limit:
        cmd += ["--time-limit", args.time_limit]
    if args.run_name:
        cmd += ["--run-name", args.run_name]
    for inst in args.instrument:
        cmd += ["--instrument", inst]
    for env in args.env:
        cmd += ["--env", env]
    # Target must come last — --launch consumes the remainder.
    if args.attach:
        cmd += ["--attach", args.attach]
    elif args.all_processes:
        cmd += ["--all-processes"]
    elif args.launch:
        cmd += ["--launch", "--", args.launch]
    return cmd


def _describe_target(args) -> str:
    if args.launch:
        return f"launch {args.launch}"
    if args.attach:
        return f"attach {args.attach}"
    if args.all_processes:
        return "all processes"
    return "(none)"


def _default_trace_name(template: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9]+", "-", template).strip("-").lower() or "trace"
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"{safe}-{ts}.trace"


def _wait_with_stop(proc: subprocess.Popen, stop_file: Path | None) -> None:
    """Poll until xctrace exits or stop_file appears; then send SIGINT."""
    while True:
        rc = proc.poll()
        if rc is not None:
            return
        if stop_file and stop_file.exists():
            print(f"[record] stop-file detected ({stop_file}); stopping xctrace.",
                  flush=True)
            _forward_sigint(proc)
            return
        time.sleep(0.5)


def _forward_sigint(proc: subprocess.Popen) -> None:
    try:
        # Signal the whole group so child instruments tools also get SIGINT.
        os.killpg(os.getpgid(proc.pid), signal.SIGINT)
    except ProcessLookupError:
        pass


def _print_devices() -> None:
    out = subprocess.run(
        ["xctrace", "list", "devices"], capture_output=True, text=True, check=True
    ).stdout
    devices: list[dict] = []
    section = None
    # Device lines end with "(UDID)"; real iOS devices also have "(OS version)"
    # before the UDID. The host (macOS) line has only "(UDID)".
    line_re = re.compile(r"^(.+?)(?:\s+\(([^()]+)\))?\s+\(([0-9A-Fa-f-]{20,})\)\s*$")
    for line in out.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("==") and stripped.endswith("=="):
            section = stripped.strip("= ").strip().lower()
            continue
        m = line_re.match(stripped)
        if not m:
            continue
        name, os_ver, udid = m.group(1).strip(), m.group(2), m.group(3)
        devices.append({
            "kind": section or "unknown",
            "name": name,
            "os": os_ver,
            "udid": udid,
        })
    print(json.dumps({"devices": devices}, indent=2))


def _print_templates() -> None:
    out = subprocess.run(
        ["xctrace", "list", "templates"], capture_output=True, text=True, check=True
    ).stdout
    groups: dict[str, list[str]] = {}
    section = "unknown"
    for line in out.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("==") and stripped.endswith("=="):
            section = stripped.strip("= ").strip().lower()
            groups.setdefault(section, [])
            continue
        groups.setdefault(section, []).append(stripped)
    # Flat convenience list + structured by section.
    flat = [name for items in groups.values() for name in items]
    print(json.dumps({"templates": flat, "by_section": groups}, indent=2))


def _shell_quote(s: str) -> str:
    if re.match(r"^[A-Za-z0-9_./:=@-]+$", s):
        return s
    return "'" + s.replace("'", "'\\''") + "'"


if __name__ == "__main__":
    sys.exit(main())
