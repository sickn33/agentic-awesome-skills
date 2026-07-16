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


fix_truncated_descriptions = load_module(
    "tools/scripts/fix_truncated_descriptions.py",
    "fix_truncated_descriptions",
)


class FixTruncatedDescriptionsTests(unittest.TestCase):
    def test_pick_candidate_prefers_matching_paragraph(self):
        description = "Master API design principles for resilient services..."
        body = """
# Heading

Master API design principles for resilient services and consistent developer experience.

Another paragraph.
"""
        candidate = fix_truncated_descriptions.pick_candidate(description, body)
        self.assertEqual(
            candidate,
            "Master API design principles for resilient services and consistent developer experience.",
        )

    def test_update_skill_file_rewrites_single_line_description(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: "This description is truncated..."
risk: safe
source: self
---

# Demo

This skill helps you do something useful in a complete way.
""",
                encoding="utf-8",
            )

            changed, new_description = fix_truncated_descriptions.update_skill_file(skill_path)

            self.assertTrue(changed)
            self.assertEqual(
                new_description,
                "This skill helps you do something useful in a complete way.",
            )
            updated = skill_path.read_text(encoding="utf-8")
            self.assertIn(
                'description: "This skill helps you do something useful in a complete way."',
                updated,
            )

    def test_update_skill_file_rewrites_block_scalar_description(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: demo
description: |
  Interact with calendar data and schedule meetings,
  update events, or...
risk: safe
source: self
---

# Demo

Lightweight calendar automation with standalone OAuth authentication and event management commands.
""",
                encoding="utf-8",
            )

            changed, new_description = fix_truncated_descriptions.update_skill_file(skill_path)

            self.assertTrue(changed)
            self.assertEqual(
                new_description,
                "Lightweight calendar automation with standalone OAuth authentication and event management commands.",
            )
            updated = skill_path.read_text(encoding="utf-8")
            self.assertIn(
                'description: "Lightweight calendar automation with standalone OAuth authentication and event management commands."',
                updated,
            )

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
description: "This description is truncated..."
---

# Outside

This paragraph should never be written back through a symlink.
"""
            target.write_text(original, encoding="utf-8")
            skill_path = skill_dir / "SKILL.md"
            symlink_or_skip(self, target, skill_path)

            changed, new_description = fix_truncated_descriptions.update_skill_file(skill_path)

            self.assertFalse(changed)
            self.assertIsNone(new_description)
            self.assertEqual(target.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
