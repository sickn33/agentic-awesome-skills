#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path


SCENARIO_TIMEOUT_SECONDS = 300


SCENARIOS = {
    "GR-001": ["python3", "scripts/contract_fail_closed_test.py"],
    "GR-002": ["python3", "scripts/workbuddy_acceptance.py", "--run-dir", "{work}/offline"],
    "GR-003": ["node", "modules/llm-answer-reference-compare/tests/browser_replay_dom_test.mjs"],
    "GR-004": ["node", "modules/llm-answer-reference-compare/tests/browser_session_test.mjs"],
    "GR-005": ["python3", "tests/public_interaction_test.py"],
    "GR-006": ["python3", "tests/multi_platform_test.py"],
    "GR-007": ["python3", "tests/trusted_search_product_test.py"],
    "GR-008": ["node", "modules/llm-answer-reference-compare/tests/doubao_reference_test.mjs"],
    "GR-009": ["python3", "tests/unified_smoke_test.py"],
    "GR-010": ["python3", "scripts/reference_regression_test.py"],
    "GR-011": ["python3", "tests/product_truth_semantics_test.py"],
    "GR-012": ["python3", "tests/release_governance_test.py"],
    "GR-013": ["node", "modules/llm-answer-reference-compare/tests/artifact_path_test.mjs"],
    "GR-014": ["node", "modules/llm-answer-reference-compare/tests/deep_research_test.mjs"],
    "GR-015": ["python3", "modules/fact-check-x-knowledge-compare/tests/smoke_test.py"],
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def timeout_output(value: str | bytes | None) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return value or ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--case-id", required=True)
    parser.add_argument("--skill-root", required=True)
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--command-override")
    args = parser.parse_args()
    root = Path(args.skill_root).resolve()
    work = Path(args.work_dir).resolve()
    work.mkdir(parents=True, exist_ok=True)
    if args.case_id not in SCENARIOS:
        raise SystemExit(f"unknown golden case: {args.case_id}")
    command_template = [args.command_override] if args.command_override else SCENARIOS[args.case_id]
    command = [item.replace("{work}", str(work)) for item in command_template]
    assertion_path = work / f"{args.case_id}.assertions.json"
    environment = dict(os.environ)
    environment["FACT_CHECK_X_ASSERTIONS_OUTPUT"] = str(assertion_path)
    try:
        process = subprocess.run(
            command,
            cwd=root,
            text=True,
            capture_output=True,
            check=False,
            timeout=SCENARIO_TIMEOUT_SECONDS,
            env=environment,
        )
    except subprocess.TimeoutExpired as exc:
        process = subprocess.CompletedProcess(
            command,
            124,
            timeout_output(exc.stdout),
            (
                timeout_output(exc.stderr)
                + f"\nscenario timed out after {SCENARIO_TIMEOUT_SECONDS} seconds\n"
            ),
        )
    stdout_path = work / f"{args.case_id}.stdout.log"
    stderr_path = work / f"{args.case_id}.stderr.log"
    stdout_path.write_text(process.stdout, encoding="utf-8")
    stderr_path.write_text(process.stderr, encoding="utf-8")
    assertions = {}
    if assertion_path.exists():
        assertions = json.loads(assertion_path.read_text(encoding="utf-8"))
    elif process.returncode == 0 and args.case_id in {"GR-002", "GR-007"}:
        try:
            acceptance = json.loads(process.stdout)
        except json.JSONDecodeError:
            acceptance = {}
        checks = acceptance.get("checks") or {}
        actual = []
        if checks.get("noTrustedSearchRequest") and checks.get("dknowExempt") and checks.get("dknowDirectAccurate"):
            actual.extend(["anchor.exempt_zero_search", "anchor.direct_accurate"])
        if checks.get("anchorSemanticEquivalencePolicy"):
            actual.append("authority.anchor_semantic_equivalence_supported")
        if checks.get("atomicMaterialAdditionPolicy"):
            actual.append("comparison.material_additions_split")
        if checks.get("trustedSearchConfigurationPrompt") and checks.get("trustedSearchHardGate"):
            actual.extend(["secret.missing_key_blocked", "secret.no_chat_secret"])
        expected_by_case = {
            "GR-002": {
                "anchor.exempt_zero_search",
                "anchor.direct_accurate",
                "authority.anchor_semantic_equivalence_supported",
                "comparison.material_additions_split",
            },
            "GR-007": {
                "secret.missing_key_blocked",
                "secret.no_chat_secret",
                "authority.no_evidence_needs_review",
            },
        }
        actual = [item for item in actual if item in expected_by_case[args.case_id]]
        assertions = {"schemaVersion": "fact-check-x/test-assertions@1", "actualAssertionIds": actual}
        assertion_path.write_text(json.dumps(assertions, ensure_ascii=False), encoding="utf-8")
    assertion_ids = assertions.get("actualAssertionIds") or []
    passed = (
        process.returncode == 0
        and assertions.get("schemaVersion") == "fact-check-x/test-assertions@1"
        and bool(assertion_ids)
    )
    result = {
        "schemaVersion": "fact-check-x/golden-case-result@1",
        "caseId": args.case_id,
        "status": "passed" if passed else "failed",
        "actualAssertionIds": assertion_ids if passed else [],
        "command": command,
        "returncode": process.returncode,
        "evidence": [
            {"path": str(stdout_path), "sha256": sha(stdout_path)},
            {"path": str(stderr_path), "sha256": sha(stderr_path)},
            *([{"path": str(assertion_path), "sha256": sha(assertion_path)}] if assertion_path.exists() else []),
        ],
    }
    Path(args.output).resolve().write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
