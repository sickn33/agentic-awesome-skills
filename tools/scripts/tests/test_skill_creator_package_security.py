import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_TESTS_DIR = REPO_ROOT / "tools" / "scripts" / "tests"
SKILL_CREATOR_SCRIPTS = REPO_ROOT / "skills" / "skill-creator" / "scripts"
for path in (TOOLS_TESTS_DIR, SKILL_CREATOR_SCRIPTS):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from symlink_test_utils import symlink_or_skip


def load_package_skill():
    module_path = SKILL_CREATOR_SCRIPTS / "package_skill.py"
    spec = importlib.util.spec_from_file_location("skill_creator_package_skill", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class SkillCreatorPackageSecurityTests(unittest.TestCase):
    def test_should_include_rejects_symlinks(self):
        module = load_package_skill()

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            skill_dir = temp_path / "skill"
            outside = temp_path / "outside.txt"
            skill_dir.mkdir()
            outside.write_text("secret", encoding="utf-8")
            symlink = skill_dir / "leak.txt"
            symlink_or_skip(self, outside, symlink)

            self.assertFalse(module.should_include(symlink, skill_dir))


if __name__ == "__main__":
    unittest.main()
