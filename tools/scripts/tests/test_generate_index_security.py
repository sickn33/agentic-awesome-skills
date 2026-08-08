import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "tools" / "scripts"))

from symlink_test_utils import symlink_or_skip


def load_module(module_path: str, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, REPO_ROOT / module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


generate_index = load_module("tools/scripts/generate_index.py", "generate_index")


class GenerateIndexSecurityTests(unittest.TestCase):
    def test_parse_frontmatter_rejects_non_mapping_yaml(self):
        metadata = generate_index.parse_frontmatter("---\njust-a-string\n---\nbody\n")
        self.assertEqual(metadata, {})

    def test_generate_index_skips_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            safe_skill_dir = skills_dir / "safe-skill"
            linked_skill_dir = skills_dir / "linked-skill"
            outside_dir = pathlib.Path(temp_dir) / "outside"
            output_file = pathlib.Path(temp_dir) / "skills_index.json"

            safe_skill_dir.mkdir(parents=True)
            linked_skill_dir.mkdir(parents=True)
            outside_dir.mkdir()

            (safe_skill_dir / "SKILL.md").write_text("---\nname: Safe Skill\n---\nbody\n", encoding="utf-8")
            target = outside_dir / "secret.txt"
            target.write_text("outside data", encoding="utf-8")
            symlink_or_skip(self, target, linked_skill_dir / "SKILL.md")

            skills = generate_index.generate_index(str(skills_dir), str(output_file))

            self.assertEqual([skill["id"] for skill in skills], ["safe-skill"])
            self.assertIn("plugin", skills[0])
            self.assertEqual(skills[0]["plugin"]["targets"]["codex"], "supported")
            written = json.loads(output_file.read_text(encoding="utf-8"))
            self.assertEqual([skill["id"] for skill in written], ["safe-skill"])


if __name__ == "__main__":
    unittest.main()
