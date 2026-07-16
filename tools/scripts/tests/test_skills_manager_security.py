import sys
import tempfile
import unittest
from pathlib import Path


TOOLS_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))

import skills_manager


class SkillsManagerSecurityTests(unittest.TestCase):
    def test_rejects_path_traversal_skill_names(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skills_manager.SKILLS_DIR = root / "skills"
            skills_manager.DISABLED_DIR = skills_manager.SKILLS_DIR / ".disabled"
            skills_manager.SKILLS_DIR.mkdir(parents=True)
            skills_manager.DISABLED_DIR.mkdir(parents=True)

            outside = root / "outside"
            outside.mkdir()
            escaped = skills_manager.DISABLED_DIR.parent / "escaped-skill"
            escaped.mkdir()

            self.assertFalse(skills_manager.enable_skill("../escaped-skill"))
            self.assertTrue(escaped.exists())


if __name__ == "__main__":
    unittest.main()
