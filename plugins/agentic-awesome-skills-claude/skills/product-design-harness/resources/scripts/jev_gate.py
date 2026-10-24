#!/usr/bin/env python3
import argparse
import copy
import json
import sys
from pathlib import Path

SEVERITY = {"stop_reframe": 2, "verify": 1, "continue": 0}
VERDICTS = ["continue", "verify", "stop_reframe"]

ROUTINE_KEYWORDS = [
    "typo", "css", "style", "format", "lint", "comment", "readme",
    "docs", "rename", "cleanup", "refactor test", "fix test"
]

HIGH_RISK_KEYWORDS = [
    "drop table", "alter table", "migration", "secret", "auth",
    "payment", "billing", "token", "privacy", "delete user",
    "external api", "webhook", "telemetry", "export data"
]


def classify_route_baseline(prompt, context=None):
    if not isinstance(prompt, str):
        raise ValueError("Task prompt must be a string.")
    if context is not None:
        if not isinstance(context, dict):
            raise ValueError("Route context must be an object.")
        files_changed = context.get("files_changed", 0)
        if type(files_changed) is not int or files_changed < 0:
            raise ValueError("files_changed must be a nonnegative integer.")
        if files_changed > 5:
            return "commitment"
    prompt_lower = prompt.lower()
    for kw in HIGH_RISK_KEYWORDS:
        if kw in prompt_lower:
            return "commitment"
    for kw in ROUTINE_KEYWORDS:
        if kw in prompt_lower:
            return "routine"
    return "discovery"


def evaluate_three_lanes_baseline(state):
    if not isinstance(state, dict):
        raise ValueError("Task state must be an object.")
    prompt = state.get("prompt", "")
    if not isinstance(prompt, str):
        raise ValueError("Task prompt must be a string.")
    prompt_lower = prompt.lower()
    evidence_tier = state.get("evidence_tier", "t0")
    if evidence_tier not in ("t0", "t1", "t2", "t3", "t4"):
        raise ValueError("evidence_tier must be one of t0, t1, t2, t3, t4.")

    if evidence_tier == "t0" or any(kw in prompt_lower for kw in ["maybe", "i think", "someone said"]):
        evidence_verdict = "stop_reframe"
        evidence_tier = "t0"
    elif evidence_tier == "t1":
        evidence_verdict = "verify"
    else:
        evidence_verdict = "continue"

    if any(kw in prompt_lower for kw in ["bypass auth", "disable security", "free tier exploit"]):
        business_verdict = "stop_reframe"
    elif any(kw in prompt_lower for kw in ["billing", "payment", "paid"]):
        business_verdict = "verify"
    else:
        business_verdict = "continue"

    if any(kw in prompt_lower for kw in ["everyone", "anyone", "all users"]) and "commitment" in prompt_lower:
        user_verdict = "verify"
    else:
        user_verdict = "continue"

    lane_verdicts = {
        "user_flow": user_verdict,
        "evidence_flow": evidence_verdict,
        "business_flow": business_verdict,
    }
    max_sev = max(SEVERITY[v] for v in lane_verdicts.values())
    combined_verdict = VERDICTS[max_sev]

    priority = {"evidence_flow": 0, "user_flow": 1, "business_flow": 2}
    def flow_sort(flow):
        return (-SEVERITY[lane_verdicts[flow]], priority[flow])
    weakest_flow = sorted(lane_verdicts.keys(), key=flow_sort)[0]

    return {
        "advisory": True,
        "user_flow": user_verdict,
        "evidence_flow": evidence_verdict,
        "business_flow": business_verdict,
        "evidence_tier": evidence_tier,
        "combined_verdict": combined_verdict,
        "weakest_flow": weakest_flow,
    }


def generate_boundary(state):
    if not isinstance(state, dict) or not isinstance(state.get("review"), dict):
        raise ValueError("A canonical review is required; task metadata cannot authorize execution.")
    if __package__:
        from .check_review import check, check_handoff
    else:
        from check_review import check, check_handoff

    review = state["review"]
    problems = check(review)
    if problems:
        raise ValueError("Invalid review: " + "; ".join(problems))
    if review["combined_verdict"] == "continue":
        pack = state.get("context_pack")
        if not isinstance(pack, dict):
            raise ValueError("A continue review requires its validated context_pack.")
        problems = check_handoff(review, pack)
        if problems:
            raise ValueError("Invalid handoff: " + "; ".join(problems))

    boundary = copy.deepcopy(review["execution_boundary"])
    boundary.update({
        "verdict": review["combined_verdict"],
        "review_id": review["review_id"],
        "weakest_flow": review["weakest_flow"],
    })
    for field in ["stop_conditions", "human_approval_gates", "high_risk_actions", "proof_step", "reframed_question"]:
        if field in review:
            boundary[field] = copy.deepcopy(review[field])
    return boundary


def main():
    parser = argparse.ArgumentParser(description="Offline heuristic routing and review-contract validation; not the Jev API or execution authorization.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    route_p = subparsers.add_parser("route")
    route_p.add_argument("prompt", help="User intent or task description")

    eval_p = subparsers.add_parser("evaluate")
    eval_p.add_argument("--task", required=True, help="Path to task JSON state")

    bound_p = subparsers.add_parser("boundary")
    bound_p.add_argument("--task", required=True, help="JSON containing review and, for continue, context_pack")

    args = parser.parse_args()

    try:
        if args.command == "route":
            route = classify_route_baseline(args.prompt)
            print(json.dumps({"route": route, "bypass": False, "review_required": True}))
            return 0
        from check_review import load_artifact
        state = load_artifact(args.task)
        if args.command == "evaluate":
            res = evaluate_three_lanes_baseline(state)
        else:
            res = generate_boundary(state)
        print(json.dumps(res, indent=2))
        return 0
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
