#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[3]
SCRIPT_DIR = ROOT / "skills" / "liuguang-banlan-ui" / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from manifest_parser import MAX_MANIFEST_BYTES, ManifestSyntaxError, load_manifest  # noqa: E402


class LiuguangManifestSecurityTests(unittest.TestCase):
    def test_bundled_manifests_parse_without_javascript_execution(self):
        starter = ROOT / "skills" / "liuguang-banlan-ui" / "assets" / "starter"
        self.assertEqual(load_manifest(starter / "opal" / "theme-config.js")["mode"], "opal")
        self.assertEqual(
            load_manifest(starter / "obsidian" / "theme-config.js")["mode"],
            "obsidian",
        )

    def test_trailing_code_is_rejected_without_running_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            sentinel = root / "must-not-exist"
            manifest = root / "theme-config.js"
            manifest.write_text(
                "window.SPECTRAL_THEME = {mode: \"opal\"};\n"
                f"require(\"fs\").writeFileSync({str(sentinel)!r}, \"owned\");\n",
                encoding="utf-8",
            )
            with self.assertRaises(ManifestSyntaxError):
                load_manifest(manifest)
            self.assertFalse(sentinel.exists())

    def test_expressions_and_duplicate_keys_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = pathlib.Path(directory) / "theme-config.js"
            for source in (
                "window.SPECTRAL_THEME = {seed: (() => 1)()};",
                "window.SPECTRAL_THEME = {mode: \"opal\", mode: \"obsidian\"};",
            ):
                manifest.write_text(source, encoding="utf-8")
                with self.assertRaises(ManifestSyntaxError):
                    load_manifest(manifest)

    def test_oversized_manifest_is_rejected_before_parsing(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = pathlib.Path(directory) / "theme-config.js"
            manifest.write_bytes(b" " * (MAX_MANIFEST_BYTES + 1))
            with self.assertRaisesRegex(ManifestSyntaxError, "size limit"):
                load_manifest(manifest)

    def test_pathologically_long_integer_has_a_bounded_parser_error(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = pathlib.Path(directory) / "theme-config.js"
            manifest.write_text(
                "window.SPECTRAL_THEME = {seed: " + ("9" * 5000) + "};",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ManifestSyntaxError, "numeric literal"):
                load_manifest(manifest)

    def test_validator_accepts_both_bundled_manifests(self):
        validator = SCRIPT_DIR / "validate_manifest.py"
        starter = ROOT / "skills" / "liuguang-banlan-ui" / "assets" / "starter"
        for mode in ("opal", "obsidian"):
            result = subprocess.run(
                [sys.executable, str(validator), str(starter / mode / "theme-config.js")],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_both_helpers_share_the_static_loader(self):
        for name in ("validate_manifest.py", "measure_preview.py"):
            source = (SCRIPT_DIR / name).read_text(encoding="utf-8")
            self.assertIn("from manifest_parser import", source)
            self.assertNotIn("subprocess", source)
            self.assertNotIn("require(require", source)


if __name__ == "__main__":
    unittest.main()
