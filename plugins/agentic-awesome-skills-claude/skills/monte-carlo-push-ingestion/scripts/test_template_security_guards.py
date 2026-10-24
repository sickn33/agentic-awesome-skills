#!/usr/bin/env python3
"""Offline regression tests for private manifests and explicit push guards."""

from __future__ import annotations

import importlib.util
import os
import json
import stat
from unittest.mock import patch
from pathlib import Path
from tempfile import TemporaryDirectory


TEMPLATE_DIRS = [
    "bigquery",
    "bigquery-iceberg",
    "databricks",
    "hive",
    "redshift",
    "snowflake",
]


def load_safe_paths(template_dir: Path):
    module_path = template_dir / "_safe_paths.py"
    spec = importlib.util.spec_from_file_location(f"{template_dir.name}_safe_paths", module_path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Could not load {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def assert_raises(fn, exc_type: type[BaseException]) -> None:
    try:
        fn()
    except exc_type:
        return
    raise AssertionError(f"Expected {exc_type.__name__}")


def test_template_dir(template_dir: Path) -> None:
    safe_paths = load_safe_paths(template_dir)
    with TemporaryDirectory() as tmp:
        previous_cwd = Path.cwd()
        try:
            os.chdir(tmp)
            out_path = safe_paths.safe_output_json_path("out/manifest.json")
            assert out_path == Path(tmp, "out", "manifest.json").resolve()
            assert out_path.parent.is_dir()

            out_path.write_text("{}", encoding="utf-8")
            assert safe_paths.safe_input_json_path("out/manifest.json") == out_path

            assert_raises(lambda: safe_paths.write_json_file(str(out_path), {"replace": True}), FileExistsError)
            assert out_path.read_text() == "{}"
            safe_paths.write_json_file("private.json", {"rows": 0})
            assert stat.S_IMODE(Path("private.json").stat().st_mode) == 0o600
            assert safe_paths.read_json_file("private.json")["rows"] == 0
            Path("link.json").symlink_to("private.json")
            assert_raises(lambda: safe_paths.read_json_file("link.json"), ValueError)
            assert_raises(lambda: safe_paths.safe_output_json_path("link.json"), ValueError)
            Path("array.json").write_text("[]")
            assert_raises(lambda: safe_paths.read_json_file("array.json"), ValueError)
            with patch.object(safe_paths, "MAX_MANIFEST_BYTES", 8):
                assert_raises(lambda: safe_paths.write_json_file("large.json", {"payload": "large"}), ValueError)
            with patch.dict(os.environ, {}, clear=True):
                assert_raises(lambda: safe_paths.validate_push({}, "approved", 1), ValueError)
            with patch.dict(os.environ, {"MCD_APPROVED_RESOURCE_UUID": "approved", "MCD_PUSH_RECEIPT": "journal.json"}):
                for count in (0, -1, 501, True):
                    assert_raises(lambda: safe_paths.validate_push({}, "approved", count), ValueError)
                assert_raises(lambda: safe_paths.validate_push({}, "different", 1), ValueError)
                assert_raises(lambda: safe_paths.validate_push({"lineage_candidates": True}, "approved", 1), ValueError)
                assert_raises(lambda: safe_paths.validate_push({"requires_verified_completion": True}, "approved", 1), ValueError)
                safe_paths.validate_push({}, "approved", 1)
                assert json.loads(Path("journal.json").read_text())["batches"] == []
                assert stat.S_IMODE(Path("journal.json").stat().st_mode) == 0o600
                assert_raises(lambda: safe_paths.validate_push({}, "approved", 1), FileExistsError)

            Path("logs").mkdir()
            assert safe_paths.safe_existing_directory("logs") == Path(tmp, "logs").resolve()

            assert_raises(lambda: safe_paths.safe_output_json_path("../escape.json"), ValueError)
            assert_raises(lambda: safe_paths.safe_output_json_path("manifest.txt"), ValueError)
            assert_raises(lambda: safe_paths.safe_input_json_path("missing.json"), FileNotFoundError)
        finally:
            os.chdir(previous_cwd)


def main() -> None:
    root = Path(__file__).resolve().parent / "templates"
    for name in TEMPLATE_DIRS:
        test_template_dir(root / name)
        print(f"PASS {name}")


if __name__ == "__main__":
    main()
