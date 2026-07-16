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


maintainer_audit = load_module(
    "tools/scripts/maintainer_audit.py",
    "maintainer_audit_test",
)


class MaintainerAuditTests(unittest.TestCase):
    def test_build_audit_summary_reports_clean_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "README.md").write_text(
                """<!-- registry-sync: version=8.4.0; skills=1; stars=26132; updated_at=2026-03-21T00:00:00+00:00 -->
# Test Repo
""",
                encoding="utf-8",
            )
            (root / "package.json").write_text(
                json.dumps(
                    {
                        "name": "agentic-awesome-skills",
                        "version": "8.4.0",
                        "description": "1+ agentic skills for Claude Code, Gemini CLI, Cursor, Antigravity & more. Installer CLI.",
                    }
                ),
                encoding="utf-8",
            )
            (root / "skills_index.json").write_text(json.dumps([{}]), encoding="utf-8")

            summary = maintainer_audit.build_audit_summary(
                root,
                warning_budget_checker=lambda _base_dir: {"actual": 135, "max": 135, "within_budget": True},
                consistency_finder=lambda _base_dir: [],
                git_status_resolver=lambda _base_dir: [],
            )

            self.assertEqual(summary["version"], "8.4.0")
            self.assertEqual(summary["total_skills"], 1)
            self.assertTrue(summary["warning_budget"]["within_budget"])
            self.assertEqual(summary["consistency_issues"], [])
            self.assertTrue(summary["git"]["clean"])

    def test_build_audit_summary_reports_drift(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "README.md").write_text(
                """<!-- registry-sync: version=8.4.0; skills=1; stars=26132; updated_at=2026-03-21T00:00:00+00:00 -->
# Test Repo
""",
                encoding="utf-8",
            )
            (root / "package.json").write_text(
                json.dumps(
                    {
                        "name": "agentic-awesome-skills",
                        "version": "8.4.0",
                        "description": "1+ agentic skills for Claude Code, Gemini CLI, Cursor, Antigravity & more. Installer CLI.",
                    }
                ),
                encoding="utf-8",
            )
            (root / "skills_index.json").write_text(json.dumps([{}]), encoding="utf-8")

            summary = maintainer_audit.build_audit_summary(
                root,
                warning_budget_checker=lambda _base_dir: {"actual": 140, "max": 135, "within_budget": False},
                consistency_finder=lambda _base_dir: ["README drift"],
                git_status_resolver=lambda _base_dir: [" M README.md"],
            )

            self.assertFalse(summary["warning_budget"]["within_budget"])
            self.assertEqual(summary["consistency_issues"], ["README drift"])
            self.assertFalse(summary["git"]["clean"])
            self.assertEqual(summary["git"]["changed_files"], [" M README.md"])


if __name__ == "__main__":
    unittest.main()
