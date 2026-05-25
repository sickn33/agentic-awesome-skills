#!/usr/bin/env python3
"""Deterministic TAM/SAM/SOM calculator.

No network access. Prints a Markdown summary to stdout.
"""

import argparse
import sys


def parse_share(value: str) -> float:
    raw = value.strip()
    if raw.endswith("%"):
        raw = raw[:-1]
        return float(raw) / 100.0
    return float(raw)


def format_money(value: float, currency: str) -> str:
    rounded = round(value, 2)
    formatted = f"{rounded:,.2f}"
    if formatted.endswith(".00"):
        formatted = formatted[:-3]
    return f"{currency}{formatted}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Calculate TAM/SAM/SOM from population and ARPU or a TAM value.",
    )
    basis = parser.add_mutually_exclusive_group(required=True)
    basis.add_argument("--tam", type=float, help="Total Addressable Market value.")
    basis.add_argument("--population", type=float, help="Total potential customers.")

    parser.add_argument("--arpu", type=float, help="Annual revenue per customer.")
    parser.add_argument("--sam-share", required=True, help="SAM share of TAM (0-1 or 0-100%).")
    parser.add_argument("--som-share", required=True, help="SOM share of SAM (0-1 or 0-100%).")
    parser.add_argument("--currency", default="$", help="Currency symbol prefix (default: $).")

    args = parser.parse_args()
    if args.population is not None and args.arpu is None:
        parser.error("--arpu is required when using --population")
    return args


def validate_share(name: str, value: float) -> None:
    if value <= 0 or value >= 1:
        raise ValueError(f"{name} must be between 0 and 1 (exclusive).")


def main() -> int:
    try:
        args = parse_args()
        sam_share = parse_share(args.sam_share)
        som_share = parse_share(args.som_share)
        validate_share("sam-share", sam_share)
        validate_share("som-share", som_share)

        if args.tam is not None:
            tam = args.tam
            basis = f"TAM input: {format_money(tam, args.currency)}"
        else:
            tam = args.population * args.arpu
            basis = (
                f"Population x ARPU: {args.population:,.0f} x "
                f"{format_money(args.arpu, args.currency)}"
            )

        sam = tam * sam_share
        som = sam * som_share

        print("# Market Size Summary\n")
        print("Inputs:")
        print(f"- {basis}")
        print(f"- SAM share of TAM: {sam_share:.0%}")
        print(f"- SOM share of SAM: {som_share:.0%}\n")
        print("| Metric | Formula | Estimate |")
        print("| --- | --- | --- |")
        print(
            f"| TAM | {basis} | {format_money(tam, args.currency)} |"
        )
        print(
            f"| SAM | TAM x {sam_share:.0%} | {format_money(sam, args.currency)} |"
        )
        print(
            f"| SOM | SAM x {som_share:.0%} | {format_money(som, args.currency)} |"
        )
        return 0
    except (ValueError, argparse.ArgumentError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
