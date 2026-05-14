import sys
import tempfile
import unittest
from pathlib import Path


TOOLS_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))

import sync_microsoft_skills as sms


class SyncMicrosoftSkillsSecurityTests(unittest.TestCase):
    def test_sanitize_flat_name_rejects_path_traversal(self):
        sanitized = sms.sanitize_flat_name("../../.ssh", "fallback-name")
        self.assertEqual(sanitized, "fallback-name")

    def test_find_skills_ignores_symlinks_outside_clone(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            skills_dir.mkdir()

            safe_skill = root / ".github" / "skills" / "safe-skill"
            safe_skill.mkdir(parents=True)
            (safe_skill / "SKILL.md").write_text("---\nname: safe-skill\n---\n", encoding="utf-8")
            (skills_dir / "safe-skill").symlink_to(safe_skill, target_is_directory=True)

            outside = Path(tempfile.mkdtemp())
            try:
                (outside / "SKILL.md").write_text("---\nname: leaked\n---\n", encoding="utf-8")
                (skills_dir / "escape").symlink_to(outside, target_is_directory=True)

                entries = sms.find_skills_in_directory(root)
                relative_paths = {str(entry["relative_path"]) for entry in entries}

                self.assertEqual(relative_paths, {"safe-skill"})
            finally:
                for child in outside.iterdir():
                    child.unlink()
                outside.rmdir()

    def test_find_skills_ignores_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_dir = root / "skills"
            skills_dir.mkdir()

            safe_skill = skills_dir / "safe-skill"
            safe_skill.mkdir()
            (safe_skill / "SKILL.md").write_text("---\nname: safe-skill\n---\n", encoding="utf-8")

            linked_skill = skills_dir / "linked-skill"
            linked_skill.mkdir()

            outside = Path(tempfile.mkdtemp())
            try:
                target = outside / "SKILL.md"
                target.write_text("---\nname: escaped\n---\n", encoding="utf-8")
                (linked_skill / "SKILL.md").symlink_to(target)

                entries = sms.find_skills_in_directory(root)
                relative_paths = {str(entry["relative_path"]) for entry in entries}

                self.assertEqual(relative_paths, {"safe-skill"})
            finally:
                target.unlink()
                outside.rmdir()

    def test_find_github_skills_ignores_symlinked_directories(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            github_skills = root / ".github" / "skills"
            github_skills.mkdir(parents=True)

            safe_skill = github_skills / "safe-skill"
            safe_skill.mkdir()
            (safe_skill / "SKILL.md").write_text("---\nname: safe-skill\n---\n", encoding="utf-8")

            outside = Path(tempfile.mkdtemp())
            try:
                escaped = outside / "escaped-skill"
                escaped.mkdir()
                (escaped / "SKILL.md").write_text("---\nname: escaped\n---\n", encoding="utf-8")
                (github_skills / "escape").symlink_to(escaped, target_is_directory=True)

                entries = sms.find_github_skills(root, set())
                relative_paths = {str(entry["relative_path"]) for entry in entries}

                self.assertEqual(relative_paths, {".github/skills/safe-skill"})
            finally:
                for child in escaped.iterdir():
                    child.unlink()
                escaped.rmdir()
                outside.rmdir()

    def test_find_github_skills_ignores_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            github_skills = root / ".github" / "skills"
            github_skills.mkdir(parents=True)

            safe_skill = github_skills / "safe-skill"
            safe_skill.mkdir()
            (safe_skill / "SKILL.md").write_text("---\nname: safe-skill\n---\n", encoding="utf-8")

            linked_skill = github_skills / "linked-skill"
            linked_skill.mkdir()

            outside = Path(tempfile.mkdtemp())
            try:
                target = outside / "SKILL.md"
                target.write_text("---\nname: escaped\n---\n", encoding="utf-8")
                (linked_skill / "SKILL.md").symlink_to(target)

                entries = sms.find_github_skills(root, set())
                relative_paths = {str(entry["relative_path"]) for entry in entries}

                self.assertEqual(relative_paths, {".github/skills/safe-skill"})
            finally:
                target.unlink()
                outside.rmdir()

    def test_find_plugin_skills_ignores_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            github_plugins = root / ".github" / "plugins"
            github_plugins.mkdir(parents=True)

            safe_plugin = github_plugins / "safe-plugin"
            safe_plugin.mkdir()
            (safe_plugin / "SKILL.md").write_text("---\nname: safe-plugin\n---\n", encoding="utf-8")

            linked_plugin = github_plugins / "linked-plugin"
            linked_plugin.mkdir()

            outside = Path(tempfile.mkdtemp())
            try:
                target = outside / "SKILL.md"
                target.write_text("---\nname: escaped\n---\n", encoding="utf-8")
                (linked_plugin / "SKILL.md").symlink_to(target)

                entries = sms.find_plugin_skills(root, set())
                relative_paths = {str(entry["relative_path"]) for entry in entries}

                self.assertEqual(relative_paths, {"plugins/safe-plugin"})
            finally:
                target.unlink()
                outside.rmdir()

    def test_copy_license_ignores_symlinked_license(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "source"
            docs = root / "docs"
            source.mkdir()

            outside = root / "outside-license.txt"
            outside.write_text("secret license payload", encoding="utf-8")
            (source / "LICENSE").symlink_to(outside)

            previous_docs_dir = sms.DOCS_DIR
            sms.DOCS_DIR = docs
            try:
                sms.copy_license(source)
            finally:
                sms.DOCS_DIR = previous_docs_dir

            self.assertFalse((docs / "LICENSE-MICROSOFT").exists())

    def test_copy_license_copies_regular_license(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = root / "source"
            docs = root / "docs"
            source.mkdir()
            (source / "LICENSE").write_text("regular license", encoding="utf-8")

            previous_docs_dir = sms.DOCS_DIR
            sms.DOCS_DIR = docs
            try:
                sms.copy_license(source)
            finally:
                sms.DOCS_DIR = previous_docs_dir

            self.assertEqual((docs / "LICENSE-MICROSOFT").read_text(encoding="utf-8"), "regular license")


if __name__ == "__main__":
    unittest.main()
