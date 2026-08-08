#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[3]
INGEST_PATH = ROOT / "skills" / "ingest-youtube" / "ingest.py"


spec = importlib.util.spec_from_file_location("ingest_youtube", INGEST_PATH)
ingest_youtube = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(ingest_youtube)


class IngestYoutubeSecurityTests(unittest.TestCase):
    def test_validate_youtube_url_accepts_single_video_and_canonicalizes(self) -> None:
        url = ingest_youtube.validate_youtube_url("https://youtu.be/jNQXAC9IVRw?feature=shared")
        self.assertEqual(url, "https://www.youtube.com/watch?v=jNQXAC9IVRw")

    def test_validate_youtube_url_rejects_non_youtube_and_option_like_input(self) -> None:
        for value in [
            "https://example.com/watch?v=jNQXAC9IVRw",
            "file:///tmp/video",
            "--config-location=/tmp/yt-dlp.conf",
            "https://www.youtube.com/playlist?list=PL123",
            "https://www.youtube.com/watch?v=short",
            "https://www.youtube.com/watch?v=jNQXAC9IVRw\n--proxy=x",
        ]:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    ingest_youtube.validate_youtube_url(value)

    def test_ytdlp_invocations_ignore_config_and_terminate_options(self) -> None:
        calls: list[list[str]] = []

        def fake_run(args: list[str], **kwargs):
            calls.append(args)
            return type("Completed", (), {"returncode": 0, "stdout": json.dumps({"id": "jNQXAC9IVRw"}), "stderr": ""})()

        with patch.object(ingest_youtube.subprocess, "run", side_effect=fake_run):
            ingest_youtube.fetch_metadata("https://www.youtube.com/watch?v=jNQXAC9IVRw", "yt-dlp")
            ingest_youtube.list_subs("https://www.youtube.com/watch?v=jNQXAC9IVRw", "yt-dlp")

        for args in calls:
            self.assertIn("--ignore-config", args)
            self.assertIn("--", args)
            self.assertLess(args.index("--"), len(args) - 1)

    def test_markdown_outputs_neutralize_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            target = ingest_youtube.write_seed_stub(
                Path(temp_dir),
                "2026-05-21",
                "channel",
                "jNQXAC9IVRw",
                ["decision"],
                "https://www.youtube.com/watch?v=jNQXAC9IVRw",
                '<img src=x onerror=alert(1)> [click](javascript:alert(1))',
            )
            content = target.read_text(encoding="utf-8")

        self.assertNotIn("<img", content)
        self.assertIn("&lt;img", content)
        self.assertIn("\\[click\\]", content)


if __name__ == "__main__":
    unittest.main()
