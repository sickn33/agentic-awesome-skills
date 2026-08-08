import sys
import tempfile
import unittest
from pathlib import Path


TOOLS_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))

from symlink_test_utils import symlink_or_skip

import fix_skills_metadata


class FixSkillsMetadataSecurityTests(unittest.TestCase):
    def test_skips_symlinked_skill_markdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_dir = root / "safe-skill"
            outside_dir = root / "outside"
            skill_dir.mkdir()
            outside_dir.mkdir()

            target = outside_dir / "SKILL.md"
            target.write_text("---\nname: outside\n---\nbody\n", encoding="utf-8")
            symlink_or_skip(self, target, skill_dir / "SKILL.md")

            fix_skills_metadata.fix_skills(root)

            self.assertEqual(
                target.read_text(encoding="utf-8"),
                "---\nname: outside\n---\nbody\n",
            )


if __name__ == "__main__":
    unittest.main()
