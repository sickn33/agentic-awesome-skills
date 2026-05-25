#!/usr/bin/env python3
"""Generate a user story Markdown snippet from CLI inputs.

No network access. Prints to stdout.
"""

import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a user story with Gherkin-style acceptance criteria.",
    )
    parser.add_argument("--summary", help="Short summary/title for the story.")
    parser.add_argument("--persona", help='Persona or role for "As a".')
    parser.add_argument("--action", help='Action for "I want to".')
    parser.add_argument("--outcome", help='Outcome for "so that".')
    parser.add_argument("--scenario", help="Scenario description.")
    parser.add_argument("--given", action="append", default=[], help="Given precondition (repeatable).")
    parser.add_argument("--when", dest="when", help="When trigger.")
    parser.add_argument("--then", dest="then", help="Then outcome.")
    return parser.parse_args()


def normalize(value: str, placeholder: str) -> str:
    if value and value.strip():
        return value.strip()
    return placeholder


def main() -> int:
    args = parse_args()

    summary = normalize(args.summary, "[Brief, memorable title focused on value]")
    persona = normalize(args.persona, "[persona or role]")
    action = normalize(args.action, "[action user takes to get to outcome]")
    outcome = normalize(args.outcome, "[desired outcome]")
    scenario = normalize(args.scenario, "[Brief, human-readable scenario describing value]")
    whens = normalize(args.when, "[Event that triggers the action]")
    thens = normalize(args.then, "[Expected outcome]")

    givens = args.given or ["[Initial context or precondition]"]

    print("### User Story [ID]:\n")
    print(f"- **Summary:** {summary}\n")
    print("#### Use Case:")
    print(f"- **As a** {persona}")
    print(f"- **I want to** {action}")
    print(f"- **so that** {outcome}\n")
    print("#### Acceptance Criteria:\n")
    print(f"- **Scenario:** {scenario}")

    for index, given in enumerate(givens):
        label = "Given" if index == 0 else "and Given"
        print(f"- **{label}:** {given}")

    print(f"- **When:** {whens}")
    print(f"- **Then:** {thens}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
