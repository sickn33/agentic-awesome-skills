import importlib.util
import tempfile
import sys
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


audit_skills = load_module("tools/scripts/audit_skills.py", "audit_skills")
generate_skills_report = load_module(
    "tools/scripts/generate_skills_report.py",
    "generate_skills_report",
)


class AuditSkillsTests(unittest.TestCase):
    def test_dangling_link_check_rejects_snapshot_escape_even_when_host_target_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            snapshot = root / "snapshot"
            skill_root = snapshot / "skills" / "example"
            skill_root.mkdir(parents=True)
            (root / "host-target.md").write_text("host file\n", encoding="utf-8")

            broken = audit_skills.find_dangling_links(
                (
                    "[escape](../../../host-target.md)\n"
                    "[angle escape](<../../../host-target.md>)\n"
                    "[absolute](/etc/passwd)\n"
                    "[angle absolute](</etc/passwd>)\n"
                ),
                skill_root,
                snapshot,
            )

            self.assertEqual(
                broken,
                [
                    "../../../host-target.md",
                    "<../../../host-target.md>",
                    "/etc/passwd",
                    "</etc/passwd>",
                ],
            )

    def test_repo_has_no_missing_limitations_warnings(self):
        report = audit_skills.audit_skills(REPO_ROOT / "skills")
        missing_limitations = [
            skill["id"]
            for skill in report["skills"]
            if any(finding["code"] == "missing_limitations" for finding in skill["findings"])
        ]

        self.assertEqual(missing_limitations, [], f"Skills still missing limitations sections: {missing_limitations[:10]}")

    def test_audit_marks_complete_skill_as_ok(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            skill_dir = skills_dir / "good-skill"
            skill_dir.mkdir(parents=True)

            (skill_dir / "SKILL.md").write_text(
                """---
name: good-skill
description: Useful and complete skill description
risk: safe
source: self
date_added: 2026-03-20
---

# Good Skill

## When to Use
- Use when the user needs a solid example.

## Examples
```bash
echo "hello"
```

## Limitations
- Demo only.
""",
                encoding="utf-8",
            )

            report = audit_skills.audit_skills(skills_dir)

            self.assertEqual(report["summary"]["skills_scanned"], 1)
            self.assertEqual(report["summary"]["skills_ok"], 1)
            self.assertEqual(report["summary"]["warnings"], 0)
            self.assertEqual(report["summary"]["errors"], 0)
            self.assertEqual(report["skills"][0]["status"], "ok")

    def test_audit_flags_truncated_description_and_missing_sections(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            skill_dir = skills_dir / "truncated-skill"
            skill_dir.mkdir(parents=True)

            (skill_dir / "SKILL.md").write_text(
                """---
name: truncated-skill
description: This description was cut off...
risk: safe
source: self
---

# Truncated Skill

## When to Use
- Use when reproducing issue 365.
""",
                encoding="utf-8",
            )

            report = audit_skills.audit_skills(skills_dir)
            finding_codes = {finding["code"] for finding in report["skills"][0]["findings"]}

            self.assertEqual(report["skills"][0]["status"], "warning")
            self.assertIn("description_truncated", finding_codes)
            self.assertIn("missing_examples", finding_codes)
            self.assertIn("missing_limitations", finding_codes)

    def test_generate_skills_report_includes_declared_risk_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            skill_dir = skills_dir / "api-skill"
            skill_dir.mkdir(parents=True)
            output_file = root / "skills-report.json"

            (skill_dir / "SKILL.md").write_text(
                """---
name: api-skill
description: Risk unknown example
risk: unknown
source: self
---

# API Skill

## When to Use
- Use when you need to read API docs and inspect endpoints.
""",
                encoding="utf-8",
            )

            report = generate_skills_report.generate_skills_report(
                output_file=output_file,
                sort_by="name",
                project_root=root,
            )

            self.assertIsNotNone(report)
            self.assertEqual(report["skills"][0]["risk"], "unknown")
            self.assertNotIn("suggested_risk", report["skills"][0])
            saved_report = output_file.read_text(encoding="utf-8")
            self.assertNotIn('"suggested_risk":', saved_report)

    def test_audit_flags_blocking_errors(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            skill_dir = skills_dir / "offensive-skill"
            skill_dir.mkdir(parents=True)
            (skill_dir / "missing.md").write_text("# missing\n", encoding="utf-8")

            (skill_dir / "SKILL.md").write_text(
                """---
name: offensive-skill
description: Offensive example skill
risk: offensive
source: self
---

# Offensive Skill

## When to Use
- Use only in authorized environments.

## Examples
```bash
cat missing.md
```

See [details](missing-reference.md).

## Limitations
- Example only.
""",
                encoding="utf-8",
            )

            report = audit_skills.audit_skills(skills_dir)
            finding_codes = {finding["code"] for finding in report["skills"][0]["findings"]}

            self.assertEqual(report["skills"][0]["status"], "error")
            self.assertIn("dangling_link", finding_codes)
            self.assertIn("missing_authorized_use_only", finding_codes)

    def test_audit_preserves_declared_risk_without_lexical_inference(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            safe_skill = skills_dir / "analysis-skill"
            mismatch_skill = skills_dir / "review-skill"
            safe_skill.mkdir(parents=True)
            mismatch_skill.mkdir(parents=True)

            (safe_skill / "SKILL.md").write_text(
                """---
name: analysis-skill
description: Analyze and validate repository content
risk: unknown
source: self
date_added: 2026-03-20
---

# Analysis Skill

## When to Use
- Use when you need to analyze or validate content.

## Examples
- Inspect the repository content and validate findings.

## Limitations
- Read-only.
""",
                encoding="utf-8",
            )

            (mismatch_skill / "SKILL.md").write_text(
                """---
name: review-skill
description: Review prompt injection scenarios
risk: safe
source: self
date_added: 2026-03-20
---

# Review Skill

## When to Use
- Use when you need to test prompt injection defenses.

## Examples
```bash
echo "prompt injection"
```

## Limitations
- Demo only.
""",
                encoding="utf-8",
            )

            report = audit_skills.audit_skills(skills_dir)
            by_id = {skill["id"]: skill for skill in report["skills"]}
            self.assertEqual(by_id["analysis-skill"]["status"], "ok")
            self.assertEqual(by_id["analysis-skill"]["risk"], "unknown")
            self.assertEqual(by_id["review-skill"]["status"], "ok")
            self.assertEqual(by_id["review-skill"]["risk"], "safe")
            self.assertNotIn("suggested_risk", by_id["analysis-skill"])
            self.assertNotIn("suggested_risk", by_id["review-skill"])

    def test_strict_budget_allows_baseline_and_blocks_regressions(self):
        summary = {
            "errors": 0,
            "warnings": 3,
            "skills_with_warnings_only": 2,
            "top_finding_codes": [
                {"code": "missing_examples", "count": 2},
                {"code": "skill_too_long", "count": 1},
            ],
        }
        budget = {
            "maxWarnings": 3,
            "maxWarningOnlySkills": 2,
            "maxTopFindingCodes": {
                "missing_examples": 2,
                "skill_too_long": 1,
            },
        }

        self.assertEqual(audit_skills.evaluate_strict_budget(summary, budget), [])

        regressed_summary = {
            **summary,
            "warnings": 4,
            "top_finding_codes": [
                {"code": "missing_examples", "count": 3},
                {"code": "skill_too_long", "count": 1},
            ],
        }

        issues = audit_skills.evaluate_strict_budget(regressed_summary, budget)

        self.assertIn("warnings exceed budget: 4/3", issues)
        self.assertIn("missing_examples findings exceed budget: 3/2", issues)


if __name__ == "__main__":
    unittest.main()
