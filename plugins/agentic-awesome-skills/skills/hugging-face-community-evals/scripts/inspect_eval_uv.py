# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "inspect-ai>=0.3.0",
#     "inspect-evals",
#     "openai",
# ]
# ///

"""
Entry point script for running inspect-ai evaluations against Hugging Face inference providers.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional


def _inspect_evals_tasks_root() -> Optional[Path]:
    """Return the installed inspect_evals package path if available."""
    try:
        import inspect_evals

        return Path(inspect_evals.__file__).parent
    except Exception:
        return None


def _normalize_task(task: str) -> str:
    """Allow lighteval-style `suite|task|shots` strings by keeping the task name."""
    if "|" in task:
        parts = task.split("|")
        if len(parts) >= 2 and parts[1]:
            return parts[1]
    return task


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect-ai job runner")
    parser.add_argument("--model", required=True, help="Model ID on Hugging Face Hub")
    parser.add_argument("--task", required=True, help="inspect-ai task to execute")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of samples to evaluate")
    parser.add_argument(
        "--tasks-root",
        default=None,
        help="Optional path to inspect task files. Defaults to the installed inspect_evals package.",
    )
    parser.add_argument(
        "--sandbox",
        default="local",
        help="Sandbox backend to use (default: local for HF jobs without Docker).",
    )
    args = parser.parse_args()

    # Ensure downstream libraries can read the token passed as a secret
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        os.environ.setdefault("HUGGING_FACE_HUB_TOKEN", hf_token)
        os.environ.setdefault("HF_HUB_TOKEN", hf_token)

    task = _normalize_task(args.task)
    tasks_root = Path(args.tasks_root) if args.tasks_root else _inspect_evals_tasks_root()
    if tasks_root and not tasks_root.exists():
        tasks_root = None

    cmd = [
        "inspect",
        "eval",
        task,
        "--model",
        f"hf-inference-providers/{args.model}",
        "--log-level",
        "info",
        # Reduce batch size to avoid OOM errors (default is 32)
        "--max-connections",
        "1",
        # Set a small positive temperature (HF doesn't allow temperature=0)
        "--temperature",
        "0.001",
    ]

    if args.sandbox:
        cmd.extend(["--sandbox", args.sandbox])

    if args.limit:
        cmd.extend(["--limit", str(args.limit)])

    try:
        subprocess.run(cmd, check=True, cwd=tasks_root)
        print("Evaluation complete.")
    except subprocess.CalledProcessError as exc:
        location = f" (cwd={tasks_root})" if tasks_root else ""
        print(f"Evaluation failed with exit code {exc.returncode}{location}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()

