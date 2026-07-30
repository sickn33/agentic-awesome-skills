import importlib.util
import os
import stat
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def load_module(name, relative_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Secur0RemediationTests(unittest.TestCase):
    def test_context_snapshots_reject_traversal_and_links(self):
        module = load_module("context_snapshot_security", "skills/context-guardian/scripts/context_snapshot.py")
        with tempfile.TemporaryDirectory() as temporary:
            module.DATA_DIR = Path(temporary)
            valid = module.DATA_DIR / "snapshot-20260730-120000.md"
            valid.write_text("safe", encoding="utf-8")
            self.assertEqual(module.read_snapshot(valid.name)["content"], "safe")
            self.assertIn("error", module.read_snapshot("../../outside.md"))
            link = module.DATA_DIR / "snapshot-20260730-120001.md"
            try:
                link.symlink_to(valid)
            except OSError:
                return
            self.assertNotIn(link.name, [entry["file"] for entry in module.list_snapshots()])

    def test_scaffold_names_are_single_portable_components(self):
        creator = load_module("skill_creator_security", "skills/skill-creator/scripts/init_skill.py")
        for bad in ("../escape", "/tmp/escape", "two/parts", ".", "UPPER"):
            with self.assertRaises(ValueError):
                creator.validate_skill_name(bad)
        self.assertEqual(creator.validate_skill_name("safe-skill-2"), "safe-skill-2")

        frontend = load_module("frontend_scaffolder_security", "skills/senior-frontend/scripts/frontend_scaffolder.py")
        with tempfile.TemporaryDirectory() as temporary:
            result = frontend.scaffold_project("../escape", Path(temporary), dry_run=True)
            self.assertIn("error", result)

    def test_spreadsheet_cells_are_neutralized(self):
        exporter = load_module("junta_export_security", "skills/junta-leiloeiros/scripts/export.py")
        for value in ("=1+1", "+SUM(1,1)", "\t@A1", " -2+3"):
            self.assertTrue(exporter.spreadsheet_safe_cell(value).startswith("'"))
        self.assertEqual(exporter.spreadsheet_safe_cell("ordinary"), "ordinary")
        self.assertEqual(exporter.spreadsheet_safe_cell(42), 42)

    def test_private_notebooklm_and_instagram_state_modes(self):
        with tempfile.TemporaryDirectory() as temporary:
            notebook_state = Path(temporary) / "notebooklm"
            instagram_state = Path(temporary) / "instagram"
            old_notebook = os.environ.get("AAS_NOTEBOOKLM_DATA_DIR")
            old_instagram = os.environ.get("AAS_INSTAGRAM_DATA_DIR")
            os.environ["AAS_NOTEBOOKLM_DATA_DIR"] = str(notebook_state)
            os.environ["AAS_INSTAGRAM_DATA_DIR"] = str(instagram_state)
            try:
                notebook = load_module("notebooklm_private_state", "skills/notebooklm/scripts/config.py")
                notebook.ensure_private_state()
                instagram = load_module("instagram_private_state", "skills/instagram/scripts/config.py")
                self.assertEqual(stat.S_IMODE(notebook.DATA_DIR.stat().st_mode), 0o700)
                self.assertEqual(stat.S_IMODE(instagram.DATA_DIR.stat().st_mode), 0o700)
            finally:
                if old_notebook is None:
                    os.environ.pop("AAS_NOTEBOOKLM_DATA_DIR", None)
                else:
                    os.environ["AAS_NOTEBOOKLM_DATA_DIR"] = old_notebook
                if old_instagram is None:
                    os.environ.pop("AAS_INSTAGRAM_DATA_DIR", None)
                else:
                    os.environ["AAS_INSTAGRAM_DATA_DIR"] = old_instagram


if __name__ == "__main__":
    unittest.main()
