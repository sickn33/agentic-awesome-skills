import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
INSTALLER_DIR = REPO_ROOT / "skills" / "skill-installer" / "scripts"
if str(INSTALLER_DIR) not in sys.path:
    sys.path.insert(0, str(INSTALLER_DIR))


def load_installer():
    module_path = INSTALLER_DIR / "install_skill.py"
    spec = importlib.util.spec_from_file_location("skill_installer_install_skill", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


install_skill = load_installer()


class CopyTreeContentsTests(unittest.TestCase):
    def test_prunes_ignored_directory_descendants(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "source"
            target = root / "target"
            source.mkdir()
            (source / "SKILL.md").write_text("ok", encoding="utf-8")
            (source / ".git").mkdir()
            (source / ".git" / "config").write_text("secret", encoding="utf-8")
            (source / "node_modules").mkdir()
            (source / "node_modules" / "dep.js").write_text("dep", encoding="utf-8")

            def ignore(_directory, contents):
                return {item for item in contents if item in {".git", "node_modules"}}

            install_skill.copy_tree_contents(source, target, ignore=ignore)

            self.assertTrue((target / "SKILL.md").is_file())
            self.assertFalse((target / ".git").exists())
            self.assertFalse((target / "node_modules").exists())


if __name__ == "__main__":
    unittest.main()
