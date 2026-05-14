import contextlib
import importlib.util
import io
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
    spec.loader.exec_module(module)
    return module


validate_skills = load_module("tools/scripts/validate_skills.py", "validate_skills_strict_test")


class ValidateSkillsStrictTests(unittest.TestCase):
    def _write_skill(self, skills_dir: Path, name: str, frontmatter_lines: list[str], body: str | None = None) -> None:
        skill_dir = skills_dir / name
        skill_dir.mkdir(parents=True)
        skill_body = body or "# Demo\n\n## When to Use\n\nUse this skill for test requests.\n"
        (skill_dir / "SKILL.md").write_text(
            "\n".join(["---", *frontmatter_lines, "---", "", skill_body]),
            encoding="utf-8",
        )

    def test_missing_date_added_is_advisory_not_strict_failure(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = Path(temp_dir) / "skills"
            self._write_skill(
                skills_dir,
                "demo",
                [
                    "name: demo",
                    "description: ok",
                    "risk: safe",
                    "source: community",
                ],
            )

            results = validate_skills.collect_validation_results(str(skills_dir), strict_mode=True)

            self.assertEqual(results["errors"], [])
            self.assertEqual(results["warnings"], [])
            self.assertEqual(len(results["advisories"]), 1)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertTrue(validate_skills.validate_skills(str(skills_dir), strict_mode=True))

    def test_invalid_date_added_stays_error(self):
        invalid_values = ["soon", "20260426"]
        for invalid_value in invalid_values:
            with self.subTest(invalid_value=invalid_value):
                with tempfile.TemporaryDirectory() as temp_dir:
                    skills_dir = Path(temp_dir) / "skills"
                    self._write_skill(
                        skills_dir,
                        "demo",
                        [
                            "name: demo",
                            "description: ok",
                            "risk: safe",
                            "source: community",
                            f"date_added: {invalid_value}",
                        ],
                    )

                    results = validate_skills.collect_validation_results(str(skills_dir), strict_mode=True)

                    self.assertTrue(any("Invalid 'date_added' format" in error for error in results["errors"]))

    def test_missing_quality_metadata_still_fails_strict(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = Path(temp_dir) / "skills"
            self._write_skill(
                skills_dir,
                "demo",
                [
                    "name: demo",
                    "description: ok",
                    "date_added: 2026-04-26",
                ],
                body="# Demo\n",
            )

            results = validate_skills.collect_validation_results(str(skills_dir), strict_mode=True)

            self.assertTrue(any("Missing 'risk' label" in error for error in results["errors"]))
            self.assertTrue(any("Missing 'source' attribution" in error for error in results["errors"]))
            self.assertTrue(any("Missing '## When to Use' section" in error for error in results["errors"]))


if __name__ == "__main__":
    unittest.main()
