import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


detect_drift = load_module("tools/scripts/detect_drift.py", "detect_drift")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SKILL_CONTENT = """\
---
name: {name}
description: Test skill for drift detection.
risk: safe
source: community
date_added: 2026-01-01
---

## When to Use
- Use this in drift detection tests.

## Limitations
- Test fixture only.
"""


def _write_skill(skills_dir: Path, name: str, content: str | None = None) -> Path:
    skill_dir = skills_dir / name
    skill_dir.mkdir(parents=True, exist_ok=True)
    body = content if content is not None else _SKILL_CONTENT.format(name=name)
    (skill_dir / "SKILL.md").write_text(body, encoding="utf-8")
    return skill_dir


# ---------------------------------------------------------------------------
# Hash computation
# ---------------------------------------------------------------------------

class HashComputationTests(unittest.TestCase):
    def test_same_content_produces_same_hash(self):
        content = "Hello, world!"
        h1 = detect_drift.compute_hash(content)
        h2 = detect_drift.compute_hash(content)
        self.assertEqual(h1, h2)

    def test_different_content_produces_different_hash(self):
        h1 = detect_drift.compute_hash("Content A")
        h2 = detect_drift.compute_hash("Content B")
        self.assertNotEqual(h1, h2)

    def test_hash_is_16_hex_chars(self):
        h = detect_drift.compute_hash("any content")
        self.assertEqual(len(h), 16)
        self.assertTrue(all(c in "0123456789abcdef" for c in h))

    def test_normalization_ignores_date_added(self):
        content_a = "---\nname: x\ndate_added: 2026-01-01\n---\n\nBody text."
        content_b = "---\nname: x\ndate_added: 2026-06-15\n---\n\nBody text."
        h_a = detect_drift.compute_hash(content_a)
        h_b = detect_drift.compute_hash(content_b)
        self.assertEqual(h_a, h_b, "date_added change should not affect hash")

    def test_normalization_ignores_author(self):
        content_a = "---\nauthor: alice\n---\n\nBody."
        content_b = "---\nauthor: bob\n---\n\nBody."
        h_a = detect_drift.compute_hash(content_a)
        h_b = detect_drift.compute_hash(content_b)
        self.assertEqual(h_a, h_b, "author change should not affect hash")

    def test_body_author_line_affects_hash(self):
        content_a = "---\nname: skill\n---\n\n## Notes\nauthor: alice"
        content_b = "---\nname: skill\n---\n\n## Notes\nauthor: bob"
        h_a = detect_drift.compute_hash(content_a)
        h_b = detect_drift.compute_hash(content_b)
        self.assertNotEqual(h_a, h_b, "body author lines are meaningful content")

    def test_body_date_added_line_affects_hash(self):
        content_a = "---\nname: skill\n---\n\n## Notes\ndate_added: 2026-01-01"
        content_b = "---\nname: skill\n---\n\n## Notes\ndate_added: 2026-06-15"
        h_a = detect_drift.compute_hash(content_a)
        h_b = detect_drift.compute_hash(content_b)
        self.assertNotEqual(h_a, h_b, "body date_added lines are meaningful content")

    def test_meaningful_content_change_changes_hash(self):
        content_a = "---\nname: skill\n---\n\nOriginal body."
        content_b = "---\nname: skill\n---\n\nCompletely different body content."
        h_a = detect_drift.compute_hash(content_a)
        h_b = detect_drift.compute_hash(content_b)
        self.assertNotEqual(h_a, h_b)

    def test_compute_skill_hash_returns_tuple(self):
        with tempfile.TemporaryDirectory() as tmp:
            skill_dir = _write_skill(Path(tmp), "test-skill")
            result = detect_drift.compute_skill_hash(skill_dir)
            self.assertIsNotNone(result)
            hash_, length = result
            self.assertIsInstance(hash_, str)
            self.assertIsInstance(length, int)
            self.assertGreater(length, 0)

    def test_compute_skill_hash_returns_none_for_missing_skill_md(self):
        with tempfile.TemporaryDirectory() as tmp:
            empty_dir = Path(tmp) / "no-skill"
            empty_dir.mkdir()
            result = detect_drift.compute_skill_hash(empty_dir)
            self.assertIsNone(result)


# ---------------------------------------------------------------------------
# Baseline I/O
# ---------------------------------------------------------------------------

class BaselineIOTests(unittest.TestCase):
    def test_load_baseline_returns_empty_for_missing_file(self):
        result = detect_drift.load_baseline(Path("/nonexistent/baseline.json"))
        self.assertEqual(result, {})

    def test_main_fails_when_baseline_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "skills").mkdir()
            (root / "package.json").write_text('{"version": "1.0.0"}', encoding="utf-8")
            original_find_repo_root = detect_drift.find_repo_root
            detect_drift.find_repo_root = lambda _path: root
            try:
                self.assertEqual(detect_drift.main([]), 2)
            finally:
                detect_drift.find_repo_root = original_find_repo_root

    def test_save_and_load_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "data" / "baseline.json"
            entries = {
                "skill-a": detect_drift.DriftEntry("skill-a", "abc123def456abcd", 100, "2026-01-01"),
                "skill-b": detect_drift.DriftEntry("skill-b", "xyz789uvw012xyz7", 200, "2026-01-02"),
            }
            detect_drift.save_baseline(path, entries, "12.7.0")

            self.assertTrue(path.exists())
            loaded = detect_drift.load_baseline(path)
            self.assertEqual(set(loaded.keys()), {"skill-a", "skill-b"})
            self.assertEqual(loaded["skill-a"].hash, "abc123def456abcd")
            self.assertEqual(loaded["skill-b"].length, 200)

    def test_saved_baseline_has_schema_version(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "baseline.json"
            detect_drift.save_baseline(path, {}, "12.7.0")
            data = json.loads(path.read_text(encoding="utf-8"))
            self.assertIn("schema_version", data)
            self.assertEqual(data["schema_version"], detect_drift.BASELINE_SCHEMA_VERSION)

    def test_load_handles_corrupt_json_gracefully(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "corrupt.json"
            path.write_text("not valid json at all {{{{", encoding="utf-8")
            result = detect_drift.load_baseline(path)
            self.assertEqual(result, {})


# ---------------------------------------------------------------------------
# Current entries
# ---------------------------------------------------------------------------

class BuildCurrentEntriesTests(unittest.TestCase):
    def test_returns_entry_per_skill(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp)
            for name in ("skill-a", "skill-b", "skill-c"):
                _write_skill(skills_dir, name)
            entries = detect_drift.build_current_entries(skills_dir)
            self.assertEqual(set(entries.keys()), {"skill-a", "skill-b", "skill-c"})

    def test_ignores_directories_without_skill_md(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp)
            _write_skill(skills_dir, "has-skill")
            (skills_dir / "no-skill-md").mkdir()
            entries = detect_drift.build_current_entries(skills_dir)
            self.assertIn("has-skill", entries)
            self.assertNotIn("no-skill-md", entries)

    def test_ignores_hidden_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp)
            _write_skill(skills_dir, "visible-skill")
            hidden = skills_dir / ".hidden"
            hidden.mkdir()
            (hidden / "SKILL.md").write_text("---\nname: hidden\n---\n", encoding="utf-8")
            entries = detect_drift.build_current_entries(skills_dir)
            self.assertNotIn(".hidden", entries)


# ---------------------------------------------------------------------------
# Drift computation
# ---------------------------------------------------------------------------

class DriftComputationTests(unittest.TestCase):
    def _entry(self, skill_id: str, hash_: str = "aaaaaaaaaaaaaaaa") -> detect_drift.DriftEntry:
        return detect_drift.DriftEntry(skill_id, hash_, 100, "2026-01-01")

    def test_no_changes_produces_empty_drift(self):
        baseline = {"skill-a": self._entry("skill-a", "hash1"), "skill-b": self._entry("skill-b", "hash2")}
        current = {"skill-a": self._entry("skill-a", "hash1"), "skill-b": self._entry("skill-b", "hash2")}
        report = detect_drift.compute_drift(baseline, current)
        self.assertFalse(report.has_drift)
        self.assertEqual(len(report.unchanged), 2)

    def test_new_skill_detected_as_added(self):
        baseline = {"skill-a": self._entry("skill-a")}
        current = {"skill-a": self._entry("skill-a"), "skill-b": self._entry("skill-b")}
        report = detect_drift.compute_drift(baseline, current)
        self.assertTrue(report.has_drift)
        self.assertIn("skill-b", report.added)
        self.assertEqual(report.removed, [])
        self.assertEqual(report.drifted, [])

    def test_removed_skill_detected(self):
        baseline = {"skill-a": self._entry("skill-a"), "skill-b": self._entry("skill-b")}
        current = {"skill-a": self._entry("skill-a")}
        report = detect_drift.compute_drift(baseline, current)
        self.assertTrue(report.has_drift)
        self.assertIn("skill-b", report.removed)

    def test_content_change_detected_as_drifted(self):
        baseline = {"skill-a": self._entry("skill-a", "oldhash12345678")}
        current = {"skill-a": self._entry("skill-a", "newhash12345678")}
        report = detect_drift.compute_drift(baseline, current)
        self.assertTrue(report.has_drift)
        self.assertEqual(len(report.drifted), 1)
        skill_id, old, new = report.drifted[0]
        self.assertEqual(skill_id, "skill-a")
        self.assertEqual(old, "oldhash12345678")
        self.assertEqual(new, "newhash12345678")

    def test_drift_report_to_dict(self):
        baseline = {"x": self._entry("x", "hash1")}
        current = {"x": self._entry("x", "hash2"), "y": self._entry("y")}
        report = detect_drift.compute_drift(baseline, current)
        d = report.to_dict()
        self.assertIn("has_drift", d)
        self.assertIn("added", d)
        self.assertIn("removed", d)
        self.assertIn("drifted", d)
        self.assertIn("unchanged_count", d)
        self.assertTrue(d["has_drift"])

    def test_end_to_end_drift_on_real_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp)
            _write_skill(skills_dir, "skill-a")
            _write_skill(skills_dir, "skill-b")

            baseline = detect_drift.build_current_entries(skills_dir)

            # Modify skill-a content
            (skills_dir / "skill-a" / "SKILL.md").write_text(
                _SKILL_CONTENT.format(name="skill-a") + "\n## New Section\nAdded content.\n",
                encoding="utf-8",
            )

            # Add a new skill
            _write_skill(skills_dir, "skill-c")

            current = detect_drift.build_current_entries(skills_dir)
            report = detect_drift.compute_drift(baseline, current)

            self.assertTrue(report.has_drift)
            self.assertIn("skill-c", report.added)
            drifted_ids = [s for s, _, _ in report.drifted]
            self.assertIn("skill-a", drifted_ids)
            self.assertIn("skill-b", report.unchanged)


if __name__ == "__main__":
    unittest.main()
