"""Regression for removed restricted office bundles; no licensed code copied into fixtures."""
from pathlib import Path
import unittest

REPO_ROOT = Path(__file__).resolve().parents[3]

class OfficeBundleRemovalTests(unittest.TestCase):
    def test_restricted_implementations_are_not_published(self):
        for ident in ("docx-official", "pptx-official"):
            with self.subTest(skill=ident):
                self.assertFalse((REPO_ROOT / "skills" / ident).exists())

if __name__ == "__main__":
    unittest.main()
