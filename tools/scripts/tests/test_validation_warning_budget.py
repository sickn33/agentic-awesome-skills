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


warning_budget = load_module(
    "tools/scripts/check_validation_warning_budget.py",
    "check_validation_warning_budget_test",
)


class ValidationWarningBudgetTests(unittest.TestCase):
    def test_warning_budget_passes_when_actual_matches_budget(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "tools" / "config").mkdir(parents=True)
            (root / "skills" / "example-skill").mkdir(parents=True)
            (root / "tools" / "config" / "validation-budget.json").write_text(
                json.dumps({"maxWarnings": 1}),
                encoding="utf-8",
            )
            (root / "skills" / "example-skill" / "SKILL.md").write_text(
                """---
name: example-skill
description: Example skill
risk: safe
source: community
---

# Example Skill
""",
                encoding="utf-8",
            )

            summary = warning_budget.check_warning_budget(root)

            self.assertEqual(summary["actual"], 1)
            self.assertEqual(summary["max"], 1)
            self.assertTrue(summary["within_budget"])

    def test_warning_budget_fails_when_actual_exceeds_budget(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "tools" / "config").mkdir(parents=True)
            (root / "skills" / "example-skill").mkdir(parents=True)
            (root / "tools" / "config" / "validation-budget.json").write_text(
                json.dumps({"maxWarnings": 0}),
                encoding="utf-8",
            )
            (root / "skills" / "example-skill" / "SKILL.md").write_text(
                """---
name: example-skill
description: Example skill
risk: safe
source: community
---

# Example Skill
""",
                encoding="utf-8",
            )

            summary = warning_budget.check_warning_budget(root)

            self.assertEqual(summary["actual"], 1)
            self.assertEqual(summary["max"], 0)
            self.assertFalse(summary["within_budget"])

    def test_warning_budget_ignores_missing_date_added_advisories(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "tools" / "config").mkdir(parents=True)
            (root / "skills" / "example-skill").mkdir(parents=True)
            (root / "tools" / "config" / "validation-budget.json").write_text(
                json.dumps({"maxWarnings": 0}),
                encoding="utf-8",
            )
            (root / "skills" / "example-skill" / "SKILL.md").write_text(
                """---
name: example-skill
description: Example skill
risk: safe
source: community
---

# Example Skill

## When to Use
- Testing warning-budget behavior.
""",
                encoding="utf-8",
            )

            summary = warning_budget.check_warning_budget(root)

            self.assertEqual(summary["actual"], 0)
            self.assertEqual(summary["max"], 0)
            self.assertTrue(summary["within_budget"])


if __name__ == "__main__":
    unittest.main()
