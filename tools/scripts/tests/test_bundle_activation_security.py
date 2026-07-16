import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS = REPO_ROOT / "tools" / "scripts"


def load_module(module_path: pathlib.Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


get_bundle_skills = load_module(
    TOOLS_SCRIPTS / "get-bundle-skills.py",
    "get_bundle_skills",
)


class BundleActivationSecurityTests(unittest.TestCase):
    def test_format_skills_for_batch_emits_newline_delimited_safe_ids(self):
        formatted = get_bundle_skills.format_skills_for_batch([
            "safe-skill",
            "nested.skill_2",
            "game-development/game-design",
            "unsafe&calc",
            "another|bad",
        ])

        self.assertEqual(formatted, "safe-skill\nnested.skill_2\ngame-development/game-design\n")

    def test_get_bundle_skills_rejects_unsafe_bundle_entries_from_manifest(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            bundles_path = pathlib.Path(temp_dir) / "editorial-bundles.json"
            bundles_path.write_text(
                json.dumps(
                    {
                        "bundles": [
                            {
                                "id": "essentials",
                                "name": "Essentials",
                                "skills": [
                                    {"id": "safe-skill"},
                                    {"id": "unsafe&calc"},
                                    {"id": "safe_two"},
                                ],
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )

            skills = get_bundle_skills.get_bundle_skills(
                ["Essentials"],
                bundles_path=bundles_path,
            )

            self.assertEqual(skills, ["safe-skill", "safe_two"])

    def test_nested_skill_ids_are_allowed_when_safe(self):
        self.assertTrue(get_bundle_skills.is_safe_skill_id("game-development/game-design"))
        self.assertFalse(get_bundle_skills.is_safe_skill_id("../escape"))
        self.assertFalse(get_bundle_skills.is_safe_skill_id("game-development/../escape"))


if __name__ == "__main__":
    unittest.main()
