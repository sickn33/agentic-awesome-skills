#!/usr/bin/env bash
# Sequential diagnostic, not bisection. Runs project code in the caller's cwd.
# Use an isolated checkout and a test runner accepting: npm test -- <file>.
set -euo pipefail
if [ "$#" -ne 2 ]; then
  echo 'Usage: find-polluter.sh <absent-relative-path> <relative-test-glob>' >&2
  exit 2
fi
python3 - "$1" "$2" <<'PY'
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time


def main():
    root = Path.cwd().resolve()
    checked = Path(sys.argv[1])
    pattern = sys.argv[2]
    if checked.is_absolute() or '..' in checked.parts or checked == Path('.'):
        raise ValueError("Check path must be a nonempty relative child")
    if Path(pattern).is_absolute() or '..' in Path(pattern).parts:
        raise ValueError("Test glob must stay inside the checkout")
    target = root / checked
    if any(parent.is_symlink() for parent in target.parents if parent != root.parent):
        raise ValueError("Linked check-path ancestors are unsupported")
    if os.path.lexists(target):
        raise ValueError("Checked path already exists; no tests run")
    excluded = {'node_modules', '.git', 'dist', 'build', '__pycache__'}
    files = []
    for candidate in root.glob(pattern):
        relative = candidate.relative_to(root)
        if any(part in excluded for part in relative.parts) or not candidate.is_file():
            continue
        if any(part.is_symlink() for part in [candidate, *candidate.parents] if part != root.parent):
            raise ValueError("Linked test paths are unsupported")
        files.append(relative.as_posix())
        if len(files) > 1000:
            raise ValueError("Too many test files; narrow the glob")
    files = sorted(set(files))
    if not files:
        raise ValueError("No matching test files; no clean result can be inferred")
    print(f"Inspecting {len(files)} tests; per-test limit 60s, total run budget 300s.", flush=True)
    deadline = time.monotonic() + 300
    failures = 0
    for filename in files:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ValueError("Run budget exhausted; incomplete inspection")
        if os.path.lexists(target):
            raise ValueError("Checked path appeared between tests; attribution is uncertain")
        print(f"Running {json.dumps(filename)}", flush=True)
        process = subprocess.Popen(['npm', 'test', '--', filename], cwd=root,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                   start_new_session=True)
        try:
            status = process.wait(timeout=min(60, remaining))
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            raise ValueError("Test timed out; incomplete inspection")
        if os.path.lexists(target):
            print(f"Observed pollution after {json.dumps(filename)} (test exit {status}).")
            return 1
        if status != 0:
            failures += 1
            print(f"Test failed with exit {status}; no pollution observed for this invocation.")
    if failures:
        print(f"No pollution observed, but {failures} tests failed; result is incomplete.")
        return 2
    print("No pollution observed in the selected successful test invocations.")
    return 0


try:
    sys.exit(main())
except (OSError, ValueError) as error:
    print(f"Polluter inspection stopped: {error}", file=sys.stderr)
    sys.exit(2)
PY
