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


fix_missing_skill_metadata = load_module(
    "tools/scripts/fix_missing_skill_metadata.py",
    "fix_missing_skill_metadata",
)


class FixMissingSkillMetadataTests(unittest.TestCase):
    def test_infer_source_prefers_skills_add_repo(self):
        body = """# Demo

> `npx skills add ksgisang/awt-skill --skill awt -g`

See also https://github.com/ksgisang/AI-Watch-Tester
"""
        self.assertEqual(
            fix_missing_skill_metadata.infer_source("awt-e2e-testing", body),
            "https://github.com/ksgisang/awt-skill",
        )

    def test_infer_source_uses_single_url_from_source_section(self):
        body = """# Product Manager Skills

## Source

GitHub: https://github.com/Digidai/product-manager-skills
"""
        self.assertEqual(
            fix_missing_skill_metadata.infer_source("product-manager", body),
            "https://github.com/Digidai/product-manager-skills",
        )

    def test_infer_source_falls_back_to_community(self):
        body = """# Demo

No explicit provenance here.
"""
        self.assertEqual(
            fix_missing_skill_metadata.infer_source("demo", body),
            "community",
        )

    def test_infer_risk_marks_offensive_when_disclaimer_present(self):
        body = """# Demo

AUTHORIZED USE ONLY
"""
        self.assertEqual(fix_missing_skill_metadata.infer_risk(body), "offensive")

    def test_update_skill_file_adds_missing_metadata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: product-manager
description: "Senior PM agent."
version: "1.0.0"
author: "Digidai"
---

# Product Manager Skills

## Source

GitHub: https://github.com/Digidai/product-manager-skills
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_metadata.update_skill_file(skill_path)
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertEqual(changes, ["added_risk", "added_source"])
            self.assertIn("risk: unknown", updated)
            self.assertIn('source: "https://github.com/Digidai/product-manager-skills"', updated)
            self.assertIn('author: "Digidai"', updated)

    def test_update_skill_file_keeps_nested_metadata_valid(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: gmail-automation
description: "Gmail integration."
license: Apache-2.0
metadata:
  author: sanjay3290
  version: "1.0"
---

# Gmail
""",
                encoding="utf-8",
            )

            changed, changes = fix_missing_skill_metadata.update_skill_file(skill_path)
            updated = skill_path.read_text(encoding="utf-8")

            self.assertTrue(changed)
            self.assertEqual(changes, ["added_risk", "added_source"])
            self.assertIn("risk: unknown\nsource: community\nlicense: Apache-2.0\nmetadata:", updated)
            self.assertIn('  author: sanjay3290', updated)

    def test_repair_malformed_injected_metadata_moves_fields_above_metadata_block(self):
        content = """---
name: gmail-automation
description: "Gmail integration."
metadata:
risk: unknown
source: community
  author: sanjay3290
---
"""
        repaired = fix_missing_skill_metadata.repair_malformed_injected_metadata(content)
        self.assertIn("risk: unknown\nsource: community\nmetadata:\n  author: sanjay3290", repaired)

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
description: "External file."
---

# Outside
"""
            target.write_text(original, encoding="utf-8")
            skill_path = skill_dir / "SKILL.md"
            symlink_or_skip(self, target, skill_path)

            changed, changes = fix_missing_skill_metadata.update_skill_file(skill_path)

            self.assertFalse(changed)
            self.assertEqual(changes, [])
            self.assertEqual(target.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
