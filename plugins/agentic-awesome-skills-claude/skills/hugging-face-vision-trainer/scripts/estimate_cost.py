#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Offline budget arithmetic using a measured duration and a user-supplied rate.

No remote request, price lookup, feasibility certification or job submission.
Measure a representative pilot with the actual model, method, sequence length,
precision and hardware. Include setup and checkpoint time in the duration.
"""
import argparse
import json
import math


def positive(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise argparse.ArgumentTypeError("must be a positive finite number") from None
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("must be a positive finite number")
    return number


def budget(hours, hourly_rate, buffer_percent=30):
    hours, hourly_rate = positive(hours), positive(hourly_rate)
    buffer_percent = float(buffer_percent)
    if not math.isfinite(buffer_percent) or not 0 <= buffer_percent <= 100:
        raise ValueError("buffer percent must be between 0 and 100")
    planned_hours = hours * (1 + buffer_percent / 100)
    cost = planned_hours * hourly_rate
    if not math.isfinite(planned_hours) or not math.isfinite(cost):
        raise ValueError("budget arithmetic overflow")
    return {"measured_or_projected_hours": hours, "hourly_rate": hourly_rate,
            "buffer_percent": buffer_percent,
            "planned_minutes": max(1, math.ceil(planned_hours * 60)),
            "compute_cost_with_buffer": cost,
            "limitations": "User inputs; excludes storage, transfer, taxes and retries. "
                           "A timeout is not a spending cap and does not cancel other jobs."}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--measured-hours", required=True, type=positive,
                        help="Measured/projected complete job duration including setup")
    parser.add_argument("--hourly-rate", required=True, type=positive,
                        help="Current verified rate in your chosen currency")
    parser.add_argument("--buffer-percent", type=float, default=30)
    args = parser.parse_args(argv)
    try:
        result = budget(args.measured_hours, args.hourly_rate, args.buffer_percent)
    except (ValueError, argparse.ArgumentTypeError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, allow_nan=False, indent=2))


if __name__ == "__main__":
    main()
