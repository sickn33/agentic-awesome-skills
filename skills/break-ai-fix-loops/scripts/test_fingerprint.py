#!/usr/bin/env python3
"""Regression tests for fingerprint.py."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("fingerprint.py")
SPEC = importlib.util.spec_from_file_location("fix_loop_fingerprint", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def record() -> dict[str, object]:
    return {
        "schema_version": 1,
        "command": "python -m pytest tests/test_regression.py",
        "input_digest": "sha256:0123456789abcdef",
        "exit_code": 1,
        "failure_class": "assertion-mismatch",
        "stable_excerpt": "expected enabled\nobserved disabled",
        "real_path_state": "settings remain disabled after reload",
    }


class FingerprintTests(unittest.TestCase):
    def test_key_order_and_transport_newlines_do_not_change_fingerprint(self) -> None:
        first = record()
        second = dict(reversed(list(first.items())))
        second["stable_excerpt"] = "expected enabled\r\nobserved disabled"
        self.assertEqual(MODULE.fingerprint(first), MODULE.fingerprint(second))

    def test_meaningful_boundary_blank_lines_change_fingerprint(self) -> None:
        first = record()
        second = record()
        second["stable_excerpt"] = "\nexpected enabled\nobserved disabled\n"
        self.assertNotEqual(MODULE.fingerprint(first), MODULE.fingerprint(second))

    def test_meaningful_trailing_whitespace_changes_fingerprint(self) -> None:
        first = record()
        second = record()
        second["stable_excerpt"] = "expected enabled  \nobserved disabled"
        self.assertNotEqual(MODULE.fingerprint(first), MODULE.fingerprint(second))

    def test_observable_state_change_changes_fingerprint(self) -> None:
        first = record()
        second = record()
        second["real_path_state"] = "settings are enabled after reload"
        self.assertNotEqual(MODULE.fingerprint(first), MODULE.fingerprint(second))

    def test_unknown_field_fails_closed(self) -> None:
        value = record()
        value["patch_hash"] = "must-be-recorded-outside-the-symptom-fingerprint"
        with self.assertRaisesRegex(MODULE.RecordError, "unknown field"):
            MODULE.fingerprint(value)

    def test_missing_field_fails_closed(self) -> None:
        value = record()
        del value["input_digest"]
        with self.assertRaisesRegex(MODULE.RecordError, "missing field"):
            MODULE.fingerprint(value)

    def test_boolean_schema_version_fails_closed(self) -> None:
        value = record()
        value["schema_version"] = True
        with self.assertRaisesRegex(MODULE.RecordError, "schema_version must be 1"):
            MODULE.fingerprint(value)

    def test_cli_rejects_duplicate_fields_with_exit_two(self) -> None:
        duplicate_record = (
            '{"schema_version":1,"command":"pytest","input_digest":"sha256:abc",'
            '"exit_code":1,"failure_class":"assertion-mismatch",'
            '"stable_excerpt":"first","stable_excerpt":"second",'
            '"real_path_state":"disabled"}'
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "duplicate.json")
            path.write_text(duplicate_record, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 2)
        self.assertIn("duplicate field: stable_excerpt", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_cli_rejects_invalid_utf8_with_exit_two(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "invalid-utf8.json")
            path.write_bytes(b"\xff")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 2)
        self.assertIn("invalid start byte", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_cli_rejects_invalid_record_with_exit_two(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "invalid.json")
            path.write_text(json.dumps({"schema_version": 1}), encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                check=False,
                capture_output=True,
                text=True,
            )
        self.assertEqual(result.returncode, 2)
        self.assertIn("missing field", result.stderr)


if __name__ == "__main__":
    unittest.main()
