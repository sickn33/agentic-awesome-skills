import pathlib
import shutil
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import validate_manifest as vm  # noqa: E402

HUES = {"rose": 18, "peach": 62, "mint": 159, "cyan": 201, "blue": 248, "lilac": 304}
INTERLEAVED = ["rose", "cyan", "lilac", "peach", "mint", "blue"]


def manifest(mode="opal", order=None, cap=None):
    field = {"scale": 1, "octaves": 4, "warpStrength": 0.3, "motionSpeed": 0.01, "staticTime": 1, "ditherStrength": 1}
    if cap is not None:
        field["luminanceCap"] = cap
    return {
        "schemaVersion": "1.1",
        "mode": mode,
        "label": "test",
        "preset": "test",
        "seed": 1,
        "overallColorIntensity": 0.5,
        "base": {"oklch": {"l": 0.98, "c": 0.004, "h": 94}},
        "colors": [
            {
                "id": cid,
                "label": cid,
                "oklch": {"l": 0.93, "c": 0.04, "h": HUES[cid]},
                "srgbFallback": "#ffffff",
                "intensity": 0.5,
                "peakOpacity": 0.08,
                "fieldScale": 1,
                "phase": [0, 0],
            }
            for cid in (order or list(HUES))
        ],
        "field": field,
        "output": {"colorSpace": "srgb", "reducedMotion": "frozen-calibrated-frame"},
    }


class ValidateManifestTest(unittest.TestCase):
    def test_hue_ordered_palette_passes_without_warnings(self):
        self.assertEqual(vm.validate(manifest()), [])
        self.assertEqual(vm.collect_warnings(manifest()), [])

    def test_interleaved_palette_warns(self):
        notes = vm.collect_warnings(manifest(order=INTERLEAVED))
        self.assertEqual(len(notes), 1)
        self.assertIn("hue order", notes[0])

    def test_luminance_cap_is_required_only_for_obsidian(self):
        self.assertEqual(vm.validate(manifest(mode="opal")), [])
        errors = vm.validate(manifest(mode="obsidian"))
        self.assertTrue(
            any(msg.startswith("field.luminanceCap must be in (0, 1]") for msg in errors),
            errors,
        )
        self.assertEqual(vm.validate(manifest(mode="obsidian", cap=0.165)), [])

    @unittest.skipUnless(shutil.which("node"), "node is needed to load the starter manifests")
    def test_starter_manifests(self):
        for mode in ("opal", "obsidian"):
            with self.subTest(mode=mode):
                config = vm.load_manifest(ROOT / "assets" / "starter" / mode / "theme-config.js")
                self.assertEqual(vm.validate(config), [])
                self.assertEqual(vm.collect_warnings(config), [])


if __name__ == "__main__":
    unittest.main()
