import pathlib
import sys
import tempfile
import unittest

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import measure_preview as mp  # noqa: E402

LAB_TO_LMS = np.array([
    [1.0, 0.3963377774, 0.2158037573],
    [1.0, -0.1055613458, -0.0638541728],
    [1.0, -0.0894841775, -1.2914855480],
])
LMS_TO_RGB = np.array([
    [4.0767416621, -3.3077115913, 0.2309699292],
    [-1.2684380046, 2.6097574011, -0.3413193965],
    [-0.0041960863, -0.7034186147, 1.7076147010],
])
HUES = (("rose", 18), ("peach", 62), ("mint", 159), ("cyan", 201), ("blue", 248), ("lilac", 304))


def lab_to_srgb(lab):
    linear = np.clip(LMS_TO_RGB @ ((LAB_TO_LMS @ np.asarray(lab, dtype=np.float64)) ** 3), 0.0, 1.0)
    return np.where(linear <= 0.0031308, linear * 12.92, 1.055 * linear ** (1 / 2.4) - 0.055)


def config(base=(0.982, 0.004, 94)):
    return {
        "mode": "opal",
        "base": {"oklch": {"l": base[0], "c": base[1], "h": base[2]}},
        "colors": [
            {"id": cid, "label": cid, "oklch": {"l": 0.93, "c": 0.045, "h": h}, "intensity": 0.5, "peakOpacity": 0.08}
            for cid, h in HUES
        ],
        "field": {},
    }


def base_lab(cfg):
    o = cfg["base"]["oklch"]
    h = np.radians(o["h"])
    return np.array([o["l"], o["c"] * np.cos(h), o["c"] * np.sin(h)])


def flat(lab, size=(64, 64)):
    return np.broadcast_to(lab_to_srgb(lab), (*size, 3)).copy()


class MeasurePreviewTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def measure_codes(self, cfg, codes):
        path = pathlib.Path(self.tmp.name) / "field.png"
        Image.fromarray(np.clip(codes, 0, 255).astype(np.uint8)).save(path)
        return mp.measure(path, cfg)

    def measure(self, cfg, pixels):
        return self.measure_codes(cfg, np.round(pixels * 255))

    def test_flat_base_reads_as_base(self):
        for chroma in (0.0, 0.004):
            with self.subTest(chroma=chroma):
                cfg = config(base=(0.982, chroma, 94))
                m = self.measure(cfg, flat(base_lab(cfg)))
                self.assertEqual(m["chromaticPixelRatio"], 0)
                self.assertEqual(m["grayRatio"], 0)
                self.assertLess(abs(m["lightnessShift"]["mean"]), 0.0025)
                self.assertIsNone(m["luminance"]["configuredCap"])

    def test_visibility_does_not_depend_on_base_chroma(self):
        tint = np.array([0.0, -0.0045, -0.0025])
        ratios = []
        for chroma in (0.0, 0.004, 0.008):
            cfg = config(base=(0.982, chroma, 94))
            ratios.append(self.measure(cfg, flat(base_lab(cfg) + tint))["chromaticPixelRatio"])
        self.assertEqual(ratios, [1.0, 1.0, 1.0])

    def test_hue_follows_deviation_direction(self):
        cfg = config()
        blue = np.radians(248)
        m = self.measure(cfg, flat(base_lab(cfg) + 0.006 * np.array([0.0, np.cos(blue), np.sin(blue)])))
        coverage = {c["id"]: c["measuredCoverage"] for c in m["colors"]}
        self.assertEqual(max(coverage, key=coverage.get), "blue")

    def test_lightness_only_shift_is_gray(self):
        cfg = config(base=(0.982, 0.0, 94))
        m = self.measure(cfg, flat(base_lab(cfg) + np.array([-0.01, 0.0, 0.0])))
        self.assertEqual(m["grayRatio"], 1.0)
        self.assertAlmostEqual(m["lightnessShift"]["mean"], -0.01, delta=0.002)

    def test_tinted_shift_is_not_gray(self):
        cfg = config()
        rose = np.radians(18)
        m = self.measure(cfg, flat(base_lab(cfg) + np.array([-0.006, 0.008 * np.cos(rose), 0.008 * np.sin(rose)])))
        self.assertEqual(m["grayRatio"], 0)
        self.assertEqual(m["chromaticPixelRatio"], 1.0)

    def test_gray_ratio_is_only_defined_for_opal(self):
        cfg = config(base=(0.098, 0.012, 236))
        cfg["mode"] = "obsidian"
        m = self.measure(cfg, flat(base_lab(cfg) + np.array([0.15, 0.0, 0.0])))
        self.assertIsNone(m["grayRatio"])

    def test_block_average_absorbs_dither(self):
        cfg = config()
        rng = np.random.default_rng(7)
        codes = np.round(flat(base_lab(cfg)) * 255) + rng.integers(-1, 2, size=(64, 64, 3))
        m = self.measure_codes(cfg, codes)
        self.assertEqual(m["chromaticPixelRatio"], 0)
        self.assertEqual(m["grayRatio"], 0)


if __name__ == "__main__":
    unittest.main()
