import importlib.util
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


validate_skills = load_module("tools/scripts/validate_skills.py", "validate_skills_source_metadata")


class SkillSourceMetadataTests(unittest.TestCase):
    def _write_skill(self, skills_dir: Path, name: str, frontmatter_lines: list[str]) -> None:
        skill_dir = skills_dir / name
        skill_dir.mkdir(parents=True)
        content = "\n".join(
            [
                "---",
                *frontmatter_lines,
                "---",
                "",
                "# Demo",
                "",
                "## When to Use",
                "- Test scenario",
            ]
        )
        (skill_dir / "SKILL.md").write_text(content, encoding="utf-8")

    def test_valid_source_repo_and_source_type_pass(self):
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
                    "source_repo: openai/skills",
                    "source_type: official",
                ],
            )

            results = validate_skills.collect_validation_results(str(skills_dir))
            self.assertEqual(results["errors"], [])

    def test_invalid_source_repo_fails_validation(self):
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
                    "source_repo: not-a-repo",
                ],
            )

            results = validate_skills.collect_validation_results(str(skills_dir))
            self.assertTrue(any("Invalid 'source_repo' format" in error for error in results["errors"]))

    def test_invalid_source_type_is_rejected(self):
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
                    "source_repo: openai/skills",
                    "source_type: partner",
                ],
            )

            results = validate_skills.collect_validation_results(str(skills_dir))
            self.assertTrue(any("Invalid 'source_type' value" in error for error in results["errors"]))


if __name__ == "__main__":
    unittest.main()
