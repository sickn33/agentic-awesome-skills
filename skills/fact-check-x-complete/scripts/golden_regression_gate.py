#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path


CASE_PROCESS_TIMEOUT_SECONDS = 360
TIMEOUT_ATTEMPTS = 2


def timeout_output(value: str | bytes | None) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value or ""


def main() -> int:
    parser = argparse.ArgumentParser(description="执行全部历史黄金回归；任一缺失或失败即阻断发布。")
    parser.add_argument("--skill-root", default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument("--output", required=True)
    parser.add_argument("--feedback-ledger", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--require-lifecycle-closed", action="store_true")
    args = parser.parse_args()
    root = Path(args.skill_root).expanduser().resolve()
    catalog = json.loads((root / "references/golden-regressions.json").read_text(encoding="utf-8"))
    cases = catalog.get("cases")
    if not isinstance(cases, list) or not cases:
        raise SystemExit("golden catalog cases must be non-empty")
    ledger_path = Path(args.feedback_ledger).expanduser().resolve()
    if not ledger_path.exists() or not ledger_path.read_text(encoding="utf-8").strip():
        raise SystemExit("feedback ledger must be non-empty")
    results = []
    evidence_root = Path(args.evidence_dir).expanduser().resolve()
    evidence_root.mkdir(parents=True, exist_ok=True)
    manifest_path = root / "package-manifest.json"
    candidate_identity = hashlib.sha256(
        manifest_path.read_bytes() if manifest_path.exists() else str(root).encode()
    ).hexdigest()[:16]
    runs_root = evidence_root / "golden-runs"
    runs_root.mkdir(parents=True, exist_ok=True)
    invocation_root = Path(
        tempfile.mkdtemp(prefix=f"{candidate_identity}-", dir=runs_root)
    )
    for case in cases:
        attempts = []
        for attempt in range(1, TIMEOUT_ATTEMPTS + 1):
            case_output = evidence_root / f"{case['id']}.json"
            command = [
                "python3", "scripts/run_golden_case.py",
                "--case-id", case["id"],
                "--skill-root", str(root),
                "--work-dir", str(invocation_root / case["id"] / f"attempt-{attempt}"),
                "--output", str(case_output),
            ]
            try:
                process = subprocess.run(
                    command,
                    cwd=root,
                    text=True,
                    capture_output=True,
                    check=False,
                    timeout=CASE_PROCESS_TIMEOUT_SECONDS,
                )
            except subprocess.TimeoutExpired as exc:
                process = subprocess.CompletedProcess(
                    command,
                    124,
                    timeout_output(exc.stdout),
                    timeout_output(exc.stderr) or "case process timeout",
                )
            structured = json.loads(case_output.read_text(encoding="utf-8")) if case_output.exists() else {}
            expected_assertion_ids = set(case.get("assertionIds") or [])
            actual_assertion_ids = set(structured.get("actualAssertionIds") or [])
            evidence_valid = bool(structured.get("evidence"))
            for item in structured.get("evidence") or []:
                path = Path(item.get("path") or "")
                evidence_valid = evidence_valid and path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == item.get("sha256")
            structured_valid = (
                structured.get("schemaVersion") == "fact-check-x/golden-case-result@1"
                and structured.get("caseId") == case["id"]
                and structured.get("status") == "passed"
                and expected_assertion_ids == actual_assertion_ids
                and evidence_valid
            )
            passed = process.returncode == 0 and structured_valid
            attempts.append({
                "attempt": attempt,
                "command": command,
                "passed": passed,
                "processReturncode": process.returncode,
                "scenarioReturncode": structured.get("returncode"),
                "structuredResultSha256": hashlib.sha256(case_output.read_bytes()).hexdigest() if case_output.exists() else "",
                "stdoutSha256": hashlib.sha256(process.stdout.encode()).hexdigest(),
                "stderrSha256": hashlib.sha256(process.stderr.encode()).hexdigest(),
            })
            timed_out = process.returncode == 124 or structured.get("returncode") == 124
            if passed or not timed_out:
                break
        results.append({
            "id": case.get("id"),
            "feedbackIds": case.get("feedbackIds"),
            "expected": case.get("expected"),
            "command": command,
            "passed": passed,
            "expectedAssertionIds": sorted(expected_assertion_ids),
            "actualAssertionIds": sorted(actual_assertion_ids),
            "structuredResultSha256": hashlib.sha256(case_output.read_bytes()).hexdigest() if case_output.exists() else "",
            "stdoutSha256": hashlib.sha256(process.stdout.encode()).hexdigest(),
            "stderrSha256": hashlib.sha256(process.stderr.encode()).hexdigest(),
            "evidence": structured.get("evidence") or [],
            "attempts": attempts,
        })
    required_ids = {case["id"] for case in cases if case.get("status") == "required"}
    executed_ids = {item["id"] for item in results}
    failures = [item["id"] for item in results if not item["passed"]]
    case_ids = [case.get("id") for case in cases]
    if len(case_ids) != len(set(case_ids)):
        failures.append("duplicate_case_ids")
    if not required_ids.issubset(executed_ids):
        failures.append("required_case_coverage_mismatch")
    ledger_feedback_ids = set()
    feedback_state: dict[str, dict] = {}
    for line in ledger_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        feedback_id = item.get("feedback_id") or item.get("feedbackId")
        if feedback_id:
            ledger_feedback_ids.add(feedback_id)
            previous = feedback_state.get(feedback_id, {})
            feedback_state[feedback_id] = {**previous, **item}
    coverage = catalog.get("feedbackCoverage") or {}
    passed_case_ids = {item["id"] for item in results if item["passed"]}
    covered_feedback_ids = {
        feedback_id for feedback_id, mapping in coverage.items()
        if mapping.get("class") in {"knownRegression", "productSemantics", "processControl", "exploratoryUnknown", "retired"}
        and mapping.get("caseIds")
        and set(mapping.get("caseIds") or []).issubset(passed_case_ids)
    }
    case_feedback = {
        case["id"]: set(case.get("feedbackIds") or [])
        for case in cases
    }
    mapping_case_feedback: dict[str, set[str]] = {case_id: set() for case_id in case_feedback}
    for feedback_id, mapping in coverage.items():
        for case_id in mapping.get("caseIds") or []:
            mapping_case_feedback.setdefault(case_id, set()).add(feedback_id)
    bidirectional_mismatch = sorted(
        case_id for case_id in case_feedback
        if case_feedback[case_id] != mapping_case_feedback.get(case_id, set())
    )
    uncovered = sorted(ledger_feedback_ids - covered_feedback_ids)
    extraneous = sorted(set(coverage) - ledger_feedback_ids)
    if uncovered:
        failures.append("feedback_coverage_incomplete")
    if extraneous:
        failures.append("feedback_coverage_contains_unknown_ids")
    if bidirectional_mismatch:
        failures.append("feedback_mapping_not_bidirectional")
    blocking_lifecycle = sorted(
        feedback_id
        for feedback_id, state in feedback_state.items()
        if state.get("priority") in {"P0", "P1"}
        and (
            state.get("stage") not in {"closed", "ready_for_release", "release_ready"}
            or state.get("fix_status")
            not in {"completed", "ready_for_release", "not_applicable"}
            or state.get("regression_status")
            not in {"passed", "not_applicable"}
        )
    )
    if args.require_lifecycle_closed and blocking_lifecycle:
        failures.append("high_priority_feedback_lifecycle_open")
    summary = {
        "schemaVersion": "fact-check-x/golden-gate@1",
        "status": "passed" if not failures else "failed",
        "requiredCount": len(required_ids),
        "executedCount": len(results),
        "failures": failures,
        "ledgerFeedbackCount": len(ledger_feedback_ids),
        "coveredFeedbackCount": len(ledger_feedback_ids & covered_feedback_ids),
        "feedbackCoveragePercent": 100 if not ledger_feedback_ids else round(100 * len(ledger_feedback_ids & covered_feedback_ids) / len(ledger_feedback_ids), 2),
        "uncoveredFeedbackIds": uncovered,
        "extraneousFeedbackIds": extraneous,
        "bidirectionalMismatchCaseIds": bidirectional_mismatch,
        "highPriorityFeedbackLifecycleOpen": blocking_lifecycle,
        "lifecycleClosureRequired": args.require_lifecycle_closed,
        "candidateIdentity": candidate_identity,
        "invocationEvidenceRoot": str(invocation_root),
        "results": results,
    }
    Path(args.output).resolve().write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
