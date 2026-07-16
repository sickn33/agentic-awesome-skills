import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))

from symlink_test_utils import symlink_or_skip


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


fix_missing_skill_sections = load_module(
    "tools/scripts/fix_missing_skill_sections.py",
    "fix_missing_skill_sections",
)


class FixMissingSkillSectionsTests(unittest.TestCase):
    def test_normalizes_when_heading_variant(self):
        content = """---
name: demo
description: Demo description.
---

# Demo

## When to Activate
Activate this skill when:
- something happens
"""
        updated = fix_missing_skill_sections.normalize_when_heading_variants(content)
        self.assertIn("## When to Use", updated)
        self.assertNotIn("## When to Activate", updated)

    def test_update_skill_file_adds_missing_sections(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: Structured guide for setting up A/B tests with mandatory gates for hypothesis and metrics.
---

# Demo

Intro paragraph.
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_sections.update_skill_file(skill_path, add_missing=True)
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertIn("added_when_to_use", changes)
            self.assertIn("added_examples", changes)
            self.assertIn("added_limitations", changes)
            self.assertIn("## When to Use", updated)
            self.assertIn("## Examples", updated)
            self.assertIn("## Limitations", updated)
            self.assertIn("Use @demo for this task:", updated)

    def test_update_skill_file_only_adds_examples_when_when_section_exists(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: Build and distribute Expo development clients locally or via TestFlight.
---

# Demo

## When to Use
- Use this skill when native Expo changes need a dev client.
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_sections.update_skill_file(skill_path, add_missing=True)
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertNotIn("added_when_to_use", changes)
            self.assertIn("added_examples", changes)
            self.assertIn("added_limitations", changes)
            self.assertEqual(updated.count("## When to Use"), 1)
            self.assertIn("## Examples", updated)
            self.assertIn("## Limitations", updated)

    def test_update_skill_file_defaults_to_normalization_only(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: Demo description.
---

# Demo

## When to Activate
Activate this skill when:
- something happens
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_sections.update_skill_file(skill_path)
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertEqual(changes, ["normalized_when_heading"])
            self.assertIn("## When to Use", updated)
            self.assertNotIn("## Examples", updated)

    def test_update_skill_file_skips_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_dir = root / "skill"
            outside_dir = root / "outside"
            skill_dir.mkdir()
            outside_dir.mkdir()

            target = outside_dir / "SKILL.md"
            original = """---
name: outside
description: Demo description.
---

# Outside
"""
            target.write_text(original, encoding="utf-8")
            skill_path = skill_dir / "SKILL.md"
            symlink_or_skip(self, target, skill_path)

            changed, changes = fix_missing_skill_sections.update_skill_file(skill_path, add_missing=True)

            self.assertFalse(changed)
            self.assertEqual(changes, [])
            self.assertEqual(target.read_text(encoding="utf-8"), original)

    def test_update_skill_file_only_adds_limitations_when_other_sections_exist(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: Demo description.
---

# Demo

## When to Use
- Use this skill when the workflow matches the task.

## Examples
```text
Use @demo to inspect the current setup.
```
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_sections.update_skill_file(skill_path, add_missing=True)
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertEqual(changes, ["added_limitations"])
            self.assertIn("## Limitations", updated)

    def test_update_skill_file_add_limitations_only_does_not_add_other_sections(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: Demo description.
---

# Demo

Intro paragraph.
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_sections.update_skill_file(
                skill_path,
                add_limitations_only=True,
            )
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertEqual(changes, ["added_limitations"])
            self.assertIn("## Limitations", updated)
            self.assertNotIn("## When to Use", updated)
            self.assertNotIn("## Examples", updated)


if __name__ == "__main__":
    unittest.main()
