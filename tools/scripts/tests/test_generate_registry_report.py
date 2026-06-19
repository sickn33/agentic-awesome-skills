import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


generate_registry_report = load_module(
    "tools/scripts/generate_registry_report.py", "generate_registry_report"
)
score_skills = load_module("tools/scripts/score_skills.py", "score_skills")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SKILL_TEMPLATE = """\
---
name: {name}
description: A test skill for registry report generation.
risk: {risk}
source: community
date_added: 2026-01-01
category: testing
---

# {name}

## When to Use
- Use in registry report tests.

## Examples
```bash
echo "test"
```

## Limitations
- Test fixture only.
"""


def _write_skill(skills_dir: Path, name: str, risk: str = "safe") -> Path:
    skill_dir = skills_dir / name
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        _SKILL_TEMPLATE.format(name=name, risk=risk), encoding="utf-8"
    )
    return skill_dir


def _make_score(
    skill_id: str,
    total: float = 75.0,
    label: str = "good",
    risk: str = "safe",
    flag_severity: str | None = None,
) -> score_skills.SkillScore:
    flags = []
    if flag_severity:
        flags = [{"code": "SEC001", "severity": flag_severity, "message": "test", "line": 1, "matched_text": "x"}]
    return score_skills.SkillScore(
        skill_id=skill_id,
        risk=risk,
        metadata_score=total,
        documentation_score=total,
        security_score=total,
        total_score=total,
        label=label,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# Report building
# ---------------------------------------------------------------------------

class ReportBuildingTests(unittest.TestCase):
    def test_report_has_required_top_level_keys(self):
        scores = [_make_score("skill-a"), _make_score("skill-b")]
        report = generate_registry_report.build_report(scores, "12.7.0")

        for key in ("schema_version", "generated_at", "skills_version", "summary", "skills"):
            self.assertIn(key, report, f"Missing key: {key}")

    def test_report_skills_version_matches_input(self):
        scores = [_make_score("skill-a")]
        report = generate_registry_report.build_report(scores, "99.9.9")
        self.assertEqual(report["skills_version"], "99.9.9")

    def test_report_summary_total_skills_count(self):
        scores = [_make_score(f"skill-{i}") for i in range(10)]
        report = generate_registry_report.build_report(scores, "12.7.0")
        self.assertEqual(report["summary"]["total_skills"], 10)

    def test_report_skills_list_length_matches_scores(self):
        scores = [_make_score(f"s-{i}") for i in range(7)]
        report = generate_registry_report.build_report(scores, "12.7.0")
        self.assertEqual(len(report["skills"]), 7)

    def test_report_skills_sorted_by_total_score_ascending(self):
        scores = [
            _make_score("high", 90.0, "excellent"),
            _make_score("low", 30.0, "critical"),
            _make_score("mid", 60.0, "good"),
        ]
        report = generate_registry_report.build_report(scores, "12.7.0")
        totals = [s["scores"]["total"] for s in report["skills"]]
        self.assertEqual(totals, sorted(totals))

    def test_report_security_flags_counted(self):
        scores = [
            _make_score("err-skill", flag_severity="error"),
            _make_score("warn-skill", flag_severity="warning"),
            _make_score("clean-skill"),
        ]
        report = generate_registry_report.build_report(scores, "12.7.0")
        sec = report["summary"]["security"]
        self.assertEqual(sec["flag_errors"], 1)
        self.assertEqual(sec["flag_warnings"], 1)

    def test_report_risk_breakdown_structure(self):
        scores = [
            _make_score("a", risk="safe"),
            _make_score("b", risk="safe"),
            _make_score("c", risk="critical"),
        ]
        report = generate_registry_report.build_report(scores, "12.7.0")
        risk_list = report["summary"]["risk_breakdown"]
        self.assertIsInstance(risk_list, list)
        risk_map = {item["risk"]: item["count"] for item in risk_list}
        self.assertEqual(risk_map.get("safe", 0), 2)
        self.assertEqual(risk_map.get("critical", 0), 1)

    def test_report_score_distribution_structure(self):
        scores = [
            _make_score("a", 90.0, "excellent"),
            _make_score("b", 70.0, "good"),
            _make_score("c", 50.0, "needs_improvement"),
            _make_score("d", 20.0, "critical"),
        ]
        report = generate_registry_report.build_report(scores, "12.7.0")
        dist_list = report["summary"]["score_distribution"]
        dist_map = {item["label"]: item["count"] for item in dist_list}
        self.assertEqual(dist_map["excellent"], 1)
        self.assertEqual(dist_map["good"], 1)
        self.assertEqual(dist_map["needs_improvement"], 1)
        self.assertEqual(dist_map["critical"], 1)

    def test_report_with_drift_summary_includes_drift_key(self):
        scores = [_make_score("skill-a")]
        drift = {"has_drift": True, "added": ["new-skill"], "removed": [], "drifted": [], "unchanged_count": 1}
        report = generate_registry_report.build_report(scores, "12.7.0", drift_summary=drift)
        self.assertIn("drift", report)
        self.assertTrue(report["drift"]["has_drift"])

    def test_report_without_drift_has_no_drift_key(self):
        scores = [_make_score("skill-a")]
        report = generate_registry_report.build_report(scores, "12.7.0", drift_summary=None)
        self.assertNotIn("drift", report)

    def test_report_schema_version_is_integer(self):
        report = generate_registry_report.build_report([_make_score("x")], "1.0.0")
        self.assertIsInstance(report["schema_version"], int)


# ---------------------------------------------------------------------------
# End-to-end (file system)
# ---------------------------------------------------------------------------

class RegistryReportEndToEndTests(unittest.TestCase):
    def test_generated_report_is_valid_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp) / "skills"
            output_path = Path(tmp) / "report.json"

            for i in range(3):
                _write_skill(skills_dir, f"skill-{i}")

            scores = score_skills.score_all_skills(skills_dir)
            report = generate_registry_report.build_report(scores, "12.7.0")

            output_path.write_text(
                json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
            )

            reloaded = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(reloaded["summary"]["total_skills"], 3)

    def test_report_generated_at_is_iso_format(self):
        from datetime import datetime
        scores = [_make_score("x")]
        report = generate_registry_report.build_report(scores, "1.0.0")
        generated_at = report["generated_at"]
        # Should parse without error
        datetime.fromisoformat(generated_at.replace("Z", "+00:00"))

    def test_empty_skills_directory_produces_valid_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp)
            scores = score_skills.score_all_skills(skills_dir)
            self.assertEqual(scores, [])
            report = generate_registry_report.build_report(scores, "12.7.0")
            self.assertEqual(report["summary"].get("total_skills", 0), 0)

    def test_report_skill_entries_have_scores_key(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp) / "skills"
            _write_skill(skills_dir, "my-skill")
            scores = score_skills.score_all_skills(skills_dir)
            report = generate_registry_report.build_report(scores, "12.7.0")
            for skill_entry in report["skills"]:
                self.assertIn("scores", skill_entry)
                self.assertIn("total", skill_entry["scores"])


if __name__ == "__main__":
    unittest.main()
