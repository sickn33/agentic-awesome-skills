import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from symlink_test_utils import symlink_or_skip


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


cleanup_synthetic_skill_sections = load_module(
    "tools/scripts/cleanup_synthetic_skill_sections.py",
    "cleanup_synthetic_skill_sections",
)
fix_missing_skill_sections = load_module(
    "tools/scripts/fix_missing_skill_sections.py",
    "fix_missing_skill_sections_for_cleanup_tests",
)


class CleanupSyntheticSkillSectionsTests(unittest.TestCase):
    def test_remove_exact_section_preserves_other_content(self):
        content = """---
name: demo
description: Demo description.
---

# Demo

## When to Use
- Use this skill when demo work is needed.

## Examples
```text
Use @demo for this task:
foo
```

## Notes
Keep this section.
"""
        section = """## Examples
```text
Use @demo for this task:
foo
```"""

        updated = cleanup_synthetic_skill_sections.remove_exact_section(content, section)

        self.assertNotIn("## Examples", updated)
        self.assertIn("## Notes", updated)
        self.assertIn("Keep this section.", updated)

    def test_cleanup_skill_file_removes_only_generated_sections_missing_from_head(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            skill_dir = repo_root / "skills" / "demo"
            skill_dir.mkdir(parents=True)
            skill_path = skill_dir / "SKILL.md"

            description = "Build and distribute Expo development clients locally or via TestFlight."
            generated_when = fix_missing_skill_sections.build_when_section("demo", description)
            generated_examples = fix_missing_skill_sections.build_examples_section("demo", description)

            current_content = f"""---
name: demo
description: {description}
---

# Demo

{generated_when}

{generated_examples}

## Notes
Human-written content.
"""
            skill_path.write_text(current_content, encoding="utf-8")

            head_content = f"""---
name: demo
description: {description}
---

# Demo

## Notes
Human-written content.
"""

            with mock.patch.object(
                cleanup_synthetic_skill_sections,
                "get_head_content",
                return_value=head_content,
            ):
                changed, changes = cleanup_synthetic_skill_sections.cleanup_skill_file(repo_root, skill_path)

            updated = skill_path.read_text(encoding="utf-8")
            self.assertTrue(changed)
            self.assertEqual(
                changes,
                ["removed_synthetic_when_to_use", "removed_synthetic_examples"],
            )
            self.assertNotIn(generated_when, updated)
            self.assertNotIn(generated_examples, updated)
            self.assertIn("## Notes", updated)

    def test_cleanup_skill_file_keeps_real_sections_that_already_existed_in_head(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            skill_dir = repo_root / "skills" / "demo"
            skill_dir.mkdir(parents=True)
            skill_path = skill_dir / "SKILL.md"

            description = "Build and distribute Expo development clients locally or via TestFlight."
            generated_when = fix_missing_skill_sections.build_when_section("demo", description)
            generated_examples = fix_missing_skill_sections.build_examples_section("demo", description)

            current_content = f"""---
name: demo
description: {description}
---

# Demo

{generated_when}

{generated_examples}
"""
            skill_path.write_text(current_content, encoding="utf-8")

            with mock.patch.object(
                cleanup_synthetic_skill_sections,
                "get_head_content",
                return_value=current_content,
            ):
                changed, changes = cleanup_synthetic_skill_sections.cleanup_skill_file(repo_root, skill_path)

            updated = skill_path.read_text(encoding="utf-8")
            self.assertFalse(changed)
            self.assertEqual(changes, [])
            self.assertEqual(updated, current_content)

    def test_cleanup_skill_file_skips_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            skill_dir = repo_root / "skills" / "demo"
            outside_dir = repo_root / "outside"
            skill_dir.mkdir(parents=True)
            outside_dir.mkdir()

            target = outside_dir / "SKILL.md"
            original = """---
name: demo
description: Build and distribute Expo development clients locally or via TestFlight.
---

# Demo
"""
            target.write_text(original, encoding="utf-8")
            skill_path = skill_dir / "SKILL.md"
            symlink_or_skip(self, target, skill_path)

            changed, changes = cleanup_synthetic_skill_sections.cleanup_skill_file(repo_root, skill_path)

            self.assertFalse(changed)
            self.assertEqual(changes, [])
            self.assertEqual(target.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
