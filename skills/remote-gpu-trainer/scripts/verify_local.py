#!/usr/bin/env python
"""Verify integrity of downloaded ckpt directories.

For each <name>/ in the target dir, check:
  - best.pth exists
  - best.pth loads cleanly via torch.load
  - best.pth contains a weights key ('model_state_dict' / 'model' / 'state_dict')
  - best_metrics.json exists and is valid JSON
  - reports best epoch + main metric per ablation

Usage:
    python verify_local.py <path_to_final_ckpts_dir> [--expect N] [--list-metrics]

Exit code:
    0 = all OK
    1 = at least one error, an empty input dir, or a dir count != --expect
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ckpt_dir", help="Directory containing ablation subdirs (each with best.pth + best_metrics.json)")
    ap.add_argument("--list-metrics", action="store_true", help="Print per-ablation epoch + main metric")
    ap.add_argument("--expect", type=int, default=None,
                    help="Assert exactly N ablation subdirs are present -- guards a teardown gate against a partial/empty pull")
    args = ap.parse_args()

    root = Path(args.ckpt_dir)
    if not root.exists():
        print(f"ERROR: {root} does not exist")
        return 1
    if not root.is_dir():
        print(f"ERROR: {root} is not a directory")
        return 1

    # Structural checks BEFORE importing torch: an empty (or short) input must fail
    # LOUDLY here -- never silently print "OK: 0/0" and return success, which would let
    # a Phase-5 teardown gate destroy the rented disk having verified nothing
    # (principle #3: trust the artifact, not a success line; the teardown Iron Law).
    dirs = sorted([d for d in root.iterdir() if d.is_dir()])
    if not dirs:
        print(f"ERROR: no ablation subdirectories found in {root} -- refusing to report success on an empty input")
        return 1
    if args.expect is not None and len(dirs) != args.expect:
        print(f"ERROR: expected {args.expect} ablation dirs but found {len(dirs)} in {root} -- partial/incomplete pull")
        return 1

    try:
        import torch
    except ImportError:
        print("ERROR: torch not installed in this environment")
        return 1

    print(f"Found {len(dirs)} ablation dirs in {root}")
    print()

    ok = 0
    errors: list[tuple[str, str]] = []
    metrics_rows: list[tuple[str, int, str]] = []
    total_size_bytes = 0

    for d in dirs:
        name = d.name
        pth = d / "best.pth"
        metrics_path = d / "best_metrics.json"

        if not pth.exists():
            errors.append((name, "missing best.pth"))
            continue
        if not metrics_path.exists():
            errors.append((name, "missing best_metrics.json"))
            continue

        # Load safe-by-default: weights_only=True refuses to execute pickle, so a poisoned or
        # compromised remote checkpoint cannot run code on the operator's machine. Fall back to
        # weights_only=False ONLY if that fails (a legit checkpoint may pickle a non-tensor object —
        # e.g. an argparse Namespace under 'args') and warn, since the fallback executes pickle and is
        # only safe for checkpoints YOU produced. Pass --allow-pickle is not needed; the warning is the gate.
        try:
            ckpt = torch.load(pth, map_location="cpu", weights_only=True)
        except Exception:
            try:
                print(
                    f"  [warn] {name}: weights_only=True load failed; retrying weights_only=False "
                    "(executes pickle — only safe for checkpoints you produced yourself)"
                )
                ckpt = torch.load(pth, map_location="cpu", weights_only=False)
            except Exception as e:
                errors.append((name, f"torch.load failed: {str(e)[:100]}"))
                continue

        if not isinstance(ckpt, dict) or not any(k in ckpt for k in ("model_state_dict", "model", "state_dict")):
            errors.append((name, "no model/model_state_dict/state_dict key in checkpoint"))
            continue

        try:
            with open(metrics_path) as f:
                m = json.load(f)
        except Exception as e:
            errors.append((name, f"best_metrics.json invalid: {str(e)[:80]}"))
            continue

        epoch = m.get("epoch", "?")
        if epoch is None:  # {"epoch": null} → .get returns None (not the default); guard the :3 format. `or` would wrongly eat epoch 0.
            epoch = "?"
        # Pick main metric (PSNR for recon, mAP50 for det, dice for seg, fall back to loss)
        main_metric_key = next(
            (k for k in ["psnr", "mAP50", "dice"] if k in m),
            "loss",
        )
        main_metric_val = m.get(main_metric_key, "?")
        metrics_rows.append((name, epoch, f"{main_metric_key}={main_metric_val}"))

        total_size_bytes += pth.stat().st_size
        ok += 1

    print(f"OK: {ok}/{len(dirs)}")
    print(f"Errors: {len(errors)}")
    for name, err in errors[:20]:
        print(f"  - {name}: {err}")
    print(f"Total best.pth size: {total_size_bytes / 1e9:.1f} GB")

    if args.list_metrics:
        print()
        print("=== Per-ablation metrics ===")
        for name, epoch, metric in metrics_rows:
            print(f"  {name:40s} epoch={epoch:3} {metric}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
