#!/usr/bin/env python3
"""One-shot maintainer triage: repo health, open PR checks, optional Jev hints, merge dry-runs.

Advisory orchestration only — does not merge or satisfy skill review.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from _project_paths import find_repo_root
from maintainer_audit import build_audit_summary
from ci_pr_evidence import fetch_ci_evidence_summary
from jev_maintainer_hints import (
    configure_utf8_output,
    gh_available,
    load_dotenv_local,
    resolve_api_key,
    urgency_score,
)

REQUIRED_CI_CHECKS = (
    "pr-policy",
    "pr-evidence",
    "source-validation",
    "artifact-preview",
)
SKILL_REVIEW_ALIASES = (
    "review",
    "manual-review-required",
    "Skill Review / review",
    "Skill Review / manual-review-required",
)


def run_git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(repo),
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def run_gh(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["gh", *args],
        cwd=str(repo),
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def ms_since(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


def main_alignment(repo: Path) -> dict[str, Any]:
    try:
        local_main = run_git(repo, "rev-parse", "main")
        remote_main = run_git(repo, "rev-parse", "origin/main")
    except subprocess.CalledProcessError as exc:
        return {"aligned": False, "error": exc.stderr or str(exc)}
    return {
        "aligned": local_main == remote_main,
        "local_main": local_main,
        "origin_main": remote_main,
    }


def list_open_prs_with_checks(repo: Path, limit: int) -> list[dict[str, Any]]:
    output = run_gh(
        repo,
        "pr",
        "list",
        "--state",
        "open",
        "--limit",
        str(limit),
        "--json",
        "number,title,headRefOid,isDraft,mergeable,statusCheckRollup",
    )
    parsed = json.loads(output)
    if not isinstance(parsed, list):
        raise ValueError("Unexpected gh pr list output")
    return parsed


def normalize_check_name(name: str) -> str:
    return (name or "").strip().lower()


def rollup_entry_matches(entry: dict[str, Any], aliases: tuple[str, ...]) -> bool:
    name = normalize_check_name(str(entry.get("name") or ""))
    workflow = normalize_check_name(str(entry.get("workflowName") or ""))
    for alias in aliases:
        alias_norm = normalize_check_name(alias)
        if alias_norm in name or alias_norm in workflow or name.endswith(alias_norm):
            return True
    return False


def find_rollup_status(
    rollup: list[dict[str, Any]],
    aliases: tuple[str, ...],
) -> str | None:
    """Return conclusion/state summary: success, pending, failed, missing."""
    matches = [entry for entry in rollup if rollup_entry_matches(entry, aliases)]
    if not matches:
        return "missing"
    for entry in matches:
        status = normalize_check_name(str(entry.get("status") or ""))
        conclusion = normalize_check_name(str(entry.get("conclusion") or ""))
        if status == "completed" and conclusion in ("success", "neutral"):
            return "success"
    for entry in matches:
        status = normalize_check_name(str(entry.get("status") or ""))
        if status in ("", "queued", "in_progress", "pending", "waiting"):
            return "pending"
    return "failed"


def summarize_pr_checks(pr: dict[str, Any]) -> dict[str, Any]:
    rollup = pr.get("statusCheckRollup") or []
    if not isinstance(rollup, list):
        rollup = []
    checks: dict[str, str] = {}
    for label in REQUIRED_CI_CHECKS:
        checks[label] = find_rollup_status(rollup, (label,)) or "missing"
    skill_status = find_rollup_status(rollup, SKILL_REVIEW_ALIASES)
    ci_ready = all(checks[name] == "success" for name in REQUIRED_CI_CHECKS)
    skill_required = skill_status != "missing"
    skill_ready = skill_status in ("success", "missing")
    merge_ready_hint = (
        ci_ready
        and skill_ready
        and not pr.get("isDraft")
        and pr.get("mergeable") != "CONFLICTING"
    )
    return {
        "checks": checks,
        "skill_review": skill_status,
        "ci_ready": ci_ready,
        "merge_ready_hint": merge_ready_hint,
    }


def run_npm_script(repo: Path, script: str, extra_args: list[str]) -> tuple[int, str, str]:
    result = subprocess.run(
        ["npm", "run", script, "--", *extra_args],
        cwd=str(repo),
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout, result.stderr


def parse_jev_batch_json(stdout: str) -> dict[str, Any] | None:
    start = stdout.find("{")
    if start < 0:
        return None
    try:
        return json.loads(stdout[start:])
    except json.JSONDecodeError:
        return None


def jev_urgency_by_pr(jev: dict[str, Any] | None) -> dict[int, float]:
    scores: dict[int, float] = {}
    if not jev:
        return scores
    for row in jev.get("skills") or []:
        pr_n = row.get("pr_number")
        if pr_n is None:
            continue
        scores[int(pr_n)] = max(
            scores.get(int(pr_n), 0.0),
            float(row.get("urgency_score") or urgency_score(row.get("answers"))),
        )
    return scores


def merge_dry_run_by_pr(merge_dry_runs: list[dict[str, Any]]) -> dict[int, int]:
    return {int(row["pr_number"]): int(row["exit_code"]) for row in merge_dry_runs}


def build_next_actions(
    pull_requests: list[dict[str, Any]],
    jev: dict[str, Any] | None,
    merge_dry_runs: list[dict[str, Any]],
    ci_evidence: dict[int, dict[str, Any]],
) -> list[dict[str, Any]]:
    jev_scores = jev_urgency_by_pr(jev)
    dry_codes = merge_dry_run_by_pr(merge_dry_runs)
    actions: list[dict[str, Any]] = []

    for pr in pull_requests:
        number = pr.get("number")
        if number is None:
            continue
        n = int(number)
        summary = pr.get("summary") or {}
        head = str(pr.get("headRefOid") or "")
        checks = summary.get("checks") or {}
        skill_review = summary.get("skill_review")
        evidence = ci_evidence.get(n) or {}
        changed = (evidence.get("changed_skills") or {}) if evidence.get("available") else {}

        action = "review_queue"
        detail_parts: list[str] = []

        if pr.get("mergeable") == "CONFLICTING":
            action = "resolve_conflicts"
            detail_parts.append("mergeable=CONFLICTING")
        elif changed.get("blocking"):
            action = "fix_evidence_blockers"
            reasons = changed.get("reasons") or []
            if reasons:
                detail_parts.append(reasons[0])
        elif any(checks.get(name) in ("pending", "failed", "missing") for name in REQUIRED_CI_CHECKS):
            action = "wait_ci"
            failing = [k for k in REQUIRED_CI_CHECKS if checks.get(k) != "success"]
            detail_parts.append(",".join(failing))
        elif skill_review == "pending":
            action = "wait_skill_review"
        elif skill_review == "failed":
            action = "repair_skill_review"
        elif jev_scores.get(n, 0) >= 20.0:
            action = "inspect_first"
            detail_parts.append(f"jev_urgency={jev_scores[n]:.1f}")
        elif summary.get("merge_ready_hint"):
            if n in dry_codes:
                if dry_codes[n] == 0:
                    action = "merge_dry_run_ok"
                    detail_parts.append(f"--reviewed-head {head[:7]}…" if head else "")
                else:
                    action = "merge_dry_run_blocked"
            elif skill_review == "success":
                action = "merge_candidate"
                detail_parts.append("attest if manual-review-required")
            else:
                action = "merge_candidate"
        elif changed.get("changed_skill_count", 0) > 0:
            action = "inspect_skill_subtree"
            detail_parts.append(f"skills={changed.get('changed_skill_count')}")

        actions.append(
            {
                "pr": n,
                "action": action,
                "head_sha": head,
                "detail": "; ".join(part for part in detail_parts if part),
            },
        )

    priority = {
        "resolve_conflicts": 0,
        "fix_evidence_blockers": 1,
        "merge_dry_run_blocked": 2,
        "wait_ci": 3,
        "wait_skill_review": 4,
        "repair_skill_review": 5,
        "inspect_first": 6,
        "inspect_skill_subtree": 7,
        "review_queue": 8,
        "merge_candidate": 9,
        "merge_dry_run_ok": 10,
    }
    actions.sort(key=lambda row: (priority.get(row["action"], 50), row["pr"]))
    return actions


def select_prs_for_ci_evidence(
    pull_requests: list[dict[str, Any]],
    jev: dict[str, Any] | None,
    limit: int,
) -> list[dict[str, Any]]:
    if limit <= 0:
        return []
    jev_scores = jev_urgency_by_pr(jev)

    def rank(pr: dict[str, Any]) -> tuple[int, float, int]:
        summary = pr.get("summary") or {}
        hot = 0 if jev_scores.get(int(pr["number"]), 0) >= 15 else 1
        ci = 0 if summary.get("ci_ready") else 1
        return (hot, -jev_scores.get(int(pr["number"]), 0), ci)

    ordered = sorted(
        [pr for pr in pull_requests if pr.get("number") is not None and pr.get("headRefOid")],
        key=rank,
    )
    return ordered[:limit]


def run_merge_batch_dry_run(repo: Path, pr_number: int) -> dict[str, Any]:
    code, stdout, stderr = run_npm_script(
        repo,
        "merge:batch",
        ["--prs", str(pr_number), "--dry-run"],
    )
    return {
        "pr_number": pr_number,
        "exit_code": code,
        "stdout_tail": "\n".join(stdout.splitlines()[-12:]),
        "stderr_tail": "\n".join(stderr.splitlines()[-8:]) if stderr else "",
    }


def print_human_report(payload: dict[str, Any]) -> None:
    alignment = payload["main_alignment"]
    if alignment.get("aligned"):
        print(f"main == origin/main ({alignment['local_main'][:7]})")
    else:
        print("WARNING: local main diverges from origin/main — refresh before merging.")

    audit = payload["audit"]
    wb = audit["warning_budget"]
    print(
        f"Audit: warning budget {wb['actual']}/{wb['max']}, "
        f"consistency {len(audit['consistency_issues'])} issue(s), "
        f"git {'clean' if audit['git']['clean'] else 'dirty'}",
    )

    print(f"\nOpen PRs scanned: {len(payload['pull_requests'])}")
    ready = [pr for pr in payload["pull_requests"] if pr["summary"]["merge_ready_hint"]]
    if ready:
        print("CI-ready (hint only):")
        for pr in ready[:10]:
            print(f"  #{pr['number']} {pr['title'][:72]}")

    jev = payload.get("jev")
    if jev and jev.get("skills"):
        print("\nJev inspect first (advisory):")
        ranked = sorted(
            jev["skills"],
            key=lambda row: float(row.get("urgency_score") or 0),
            reverse=True,
        )
        for row in ranked[:8]:
            pr_n = row.get("pr_number")
            prefix = f"#{pr_n} " if pr_n else ""
            priority = ((row.get("answers") or {}).get("maintainer_priority") or {}).get("choice")
            print(f"  {prefix}{row['skill_dir']} ({priority})")

    dry = payload.get("merge_dry_runs") or []
    if dry:
        print("\nmerge:batch --dry-run:")
        for row in dry:
            status = "ok" if row["exit_code"] == 0 else f"exit {row['exit_code']}"
            print(f"  #{row['pr_number']}: {status}")

    evidence = payload.get("ci_evidence") or {}
    if evidence:
        print("\nCI pr-evidence (advisory):")
        for pr_n, row in sorted(evidence.items(), key=lambda item: int(item[0])):
            if not row.get("available"):
                print(f"  #{pr_n}: {row.get('error', 'unavailable')}")
                continue
            cs = row.get("changed_skills") or {}
            block = "blocking" if cs.get("blocking") else "ok"
            print(f"  #{pr_n}: {block}, {cs.get('changed_skill_count', 0)} skill change(s)")

    next_actions = payload.get("next_actions") or []
    if next_actions:
        print("\nNext actions (hints only):")
        for row in next_actions[:12]:
            detail = f" — {row['detail']}" if row.get("detail") else ""
            print(f"  #{row['pr']} {row['action']}{detail}")

    timings = payload["timings_ms"]
    total = sum(timings.values())
    print(f"\nSweep timings (ms): {timings} — total ~{total}ms")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maintainer sweep: PR queue + optional Jev + dry-run hints.")
    parser.add_argument("--max-prs", type=int, default=20, help="Open PRs to scan (default 20)")
    parser.add_argument("--max-skills", type=int, default=5, help="Jev skill calls (default 5)")
    parser.add_argument("--max-merge-dry-run", type=int, default=3, help="merge:batch dry-runs for CI-ready PRs")
    parser.add_argument("--skip-fetch", action="store_true", help="Do not git fetch origin")
    parser.add_argument("--skip-jev", action="store_true", help="Skip maintainer:jev-batch")
    parser.add_argument("--skip-merge-dry-run", action="store_true", help="Skip merge:batch --dry-run")
    parser.add_argument("--skip-ci-evidence", action="store_true", help="Skip downloading CI pr-evidence artifacts")
    parser.add_argument(
        "--max-ci-evidence",
        type=int,
        default=8,
        help="Max PRs to download pr-evidence artifacts for (default 8)",
    )
    parser.add_argument("--json", action="store_true", help="Machine-readable output")
    parser.add_argument(
        "--benchmark",
        action="store_true",
        help="Compare sweep vs sequential gh-only baseline (prints timing table)",
    )
    return parser.parse_args()


def build_sweep_payload(repo: Path, args: argparse.Namespace) -> dict[str, Any]:
    timings: dict[str, int] = {}
    payload: dict[str, Any] = {"timings_ms": timings}

    t0 = time.perf_counter()
    if not args.skip_fetch:
        subprocess.run(
            ["git", "fetch", "origin"],
            cwd=str(repo),
            check=False,
            capture_output=True,
        )
    timings["fetch"] = ms_since(t0)

    t0 = time.perf_counter()
    payload["main_alignment"] = main_alignment(repo)
    timings["main_alignment"] = ms_since(t0)

    t0 = time.perf_counter()
    payload["audit"] = build_audit_summary(repo)
    timings["audit"] = ms_since(t0)

    if not gh_available(repo):
        raise RuntimeError("Authenticated `gh` is required for maintainer:sweep")

    t0 = time.perf_counter()
    pr_rows = list_open_prs_with_checks(repo, args.max_prs)
    enriched = []
    for pr in pr_rows:
        summary = summarize_pr_checks(pr)
        enriched.append(
            {
                "number": pr.get("number"),
                "title": pr.get("title"),
                "headRefOid": pr.get("headRefOid"),
                "isDraft": pr.get("isDraft"),
                "mergeable": pr.get("mergeable"),
                "summary": summary,
            },
        )
    payload["pull_requests"] = enriched
    timings["pr_scan"] = ms_since(t0)

    payload["jev"] = None
    if not args.skip_jev and resolve_api_key():
        t0 = time.perf_counter()
        code, stdout, stderr = run_npm_script(
            repo,
            "maintainer:jev-batch",
            [
                "--max-skills",
                str(args.max_skills),
                "--max-prs",
                str(args.max_prs),
                "--json",
            ],
        )
        timings["jev_batch"] = ms_since(t0)
        jev_data = parse_jev_batch_json(stdout) if code == 0 else None
        payload["jev"] = jev_data or {"error": stderr or stdout, "exit_code": code}
    elif not args.skip_jev:
        payload["jev"] = {"skipped": "TYPESAFE_API_KEY unset"}

    payload["ci_evidence"] = {}
    if not args.skip_ci_evidence and args.max_ci_evidence > 0:
        t0 = time.perf_counter()
        for pr in select_prs_for_ci_evidence(enriched, payload.get("jev"), args.max_ci_evidence):
            n = int(pr["number"])
            head = str(pr["headRefOid"])
            payload["ci_evidence"][n] = fetch_ci_evidence_summary(repo, n, head)
        timings["ci_evidence"] = ms_since(t0)

    payload["merge_dry_runs"] = []
    if not args.skip_merge_dry_run and args.max_merge_dry_run > 0:
        t0 = time.perf_counter()
        candidates = [
            pr["number"]
            for pr in enriched
            if pr["summary"]["merge_ready_hint"] and pr.get("number") is not None
        ][: args.max_merge_dry_run]
        for pr_number in candidates:
            payload["merge_dry_runs"].append(run_merge_batch_dry_run(repo, int(pr_number)))
        timings["merge_dry_run"] = ms_since(t0)

    payload["next_actions"] = build_next_actions(
        enriched,
        payload.get("jev"),
        payload.get("merge_dry_runs") or [],
        payload.get("ci_evidence") or {},
    )

    return payload


def run_baseline_sequential(repo: Path, max_prs: int) -> dict[str, int]:
    """Naive maintainer path: fetch, audit subprocess, per-PR gh view (no Jev, no merge dry-run)."""
    timings: dict[str, int] = {}
    t0 = time.perf_counter()
    subprocess.run(["git", "fetch", "origin"], cwd=str(repo), check=False, capture_output=True)
    timings["fetch"] = ms_since(t0)

    t0 = time.perf_counter()
    build_audit_summary(repo)
    timings["audit"] = ms_since(t0)

    t0 = time.perf_counter()
    prs = list_open_prs_with_checks(repo, max_prs)
    timings["pr_list"] = ms_since(t0)

    t0 = time.perf_counter()
    for pr in prs:
        number = pr.get("number")
        if number is None:
            continue
        subprocess.run(
            ["gh", "pr", "view", str(number), "--json", "statusCheckRollup,files"],
            cwd=str(repo),
            capture_output=True,
            text=True,
        )
        summarize_pr_checks(pr)
    timings["per_pr_view"] = ms_since(t0)

    return timings


def main() -> int:
    configure_utf8_output()
    args = parse_args()
    repo = find_repo_root(__file__)
    load_dotenv_local(repo)

    if args.benchmark:
        baseline = run_baseline_sequential(repo, args.max_prs)
        sweep_args = argparse.Namespace(**{**vars(args), "benchmark": False})
        sweep = build_sweep_payload(repo, sweep_args)
        sweep_times = sweep["timings_ms"]
        base_total = sum(baseline.values())
        sweep_total = sum(sweep_times.values())
        report = {
            "baseline_ms": baseline,
            "sweep_ms": sweep_times,
            "baseline_total_ms": base_total,
            "sweep_total_ms": sweep_total,
            "delta_ms": base_total - sweep_total,
        }
        print(json.dumps(report, indent=2))
        if base_total > 0:
            pct = round(100 * (base_total - sweep_total) / base_total, 1)
            if pct >= 0:
                verdict = f"{pct}% faster"
            else:
                verdict = f"{abs(pct)}% slower (expected when Jev or merge dry-runs run)"
            print(
                f"\nSweep vs baseline: {verdict} ({base_total}ms -> {sweep_total}ms)",
                file=sys.stderr,
            )
        return 0

    try:
        payload = build_sweep_payload(repo, args)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except subprocess.CalledProcessError as exc:
        print(exc.stderr or str(exc), file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print_human_report(payload)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
