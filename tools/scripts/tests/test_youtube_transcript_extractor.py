#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import importlib.util
import io
import sys
import types
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "skills" / "youtube-summarizer" / "scripts" / "extract-transcript.py"


class TranscriptsDisabled(Exception):
    pass


class NoTranscriptFound(Exception):
    pass


def load_extractor(api_class):
    fake_package = types.ModuleType("youtube_transcript_api")
    fake_package.YouTubeTranscriptApi = api_class
    fake_package.TranscriptsDisabled = TranscriptsDisabled
    fake_package.NoTranscriptFound = NoTranscriptFound

    previous = sys.modules.get("youtube_transcript_api")
    sys.modules["youtube_transcript_api"] = fake_package
    try:
        module_name = f"youtube_transcript_extractor_test_{id(api_class)}"
        spec = importlib.util.spec_from_file_location(module_name, SCRIPT)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("youtube_transcript_api", None)
        else:
            sys.modules["youtube_transcript_api"] = previous


class LegacyApi:
    calls = []

    @staticmethod
    def get_transcript(video_id, languages):
        LegacyApi.calls.append((video_id, languages))
        return [{"text": "legacy"}, {"text": "api"}]

    @staticmethod
    def list_transcripts(video_id):
        LegacyApi.calls.append(("list", video_id))
        return []


class ModernTranscript:
    def to_raw_data(self):
        return [{"text": "modern"}, {"text": "api"}]


class ModernApi:
    calls = []

    def fetch(self, video_id, languages):
        ModernApi.calls.append(("fetch", video_id, languages))
        return ModernTranscript()

    def list(self, video_id):
        ModernApi.calls.append(("list", video_id))
        return []


class YouTubeTranscriptExtractorTests(unittest.TestCase):
    def setUp(self):
        LegacyApi.calls.clear()
        ModernApi.calls.clear()

    def test_parses_bare_ids_and_common_youtube_urls(self):
        extractor = load_extractor(LegacyApi)
        video_id = "dQw4w9WgXcQ"
        values = [
            video_id,
            f"https://www.youtube.com/watch?v={video_id}&t=3",
            f"https://youtu.be/{video_id}",
            f"https://www.youtube.com/shorts/{video_id}",
            f"https://www.youtube.com/embed/{video_id}",
            f"https://www.youtube.com/live/{video_id}",
        ]
        self.assertEqual([extractor.parse_video_id(value) for value in values], [video_id] * len(values))

    def test_rejects_a_url_without_a_video_id(self):
        extractor = load_extractor(LegacyApi)
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr), self.assertRaises(SystemExit) as raised:
            extractor.parse_video_id("https://www.youtube.com/feed/subscriptions")
        self.assertEqual(raised.exception.code, 1)
        self.assertIn("Could not find a video ID", stderr.getvalue())

    def test_legacy_api_uses_class_method_with_language_fallback(self):
        extractor = load_extractor(LegacyApi)
        self.assertTrue(extractor._IS_LEGACY_API)
        self.assertEqual(extractor.extract_transcript("video", "it"), "legacy api")
        self.assertEqual(LegacyApi.calls, [("video", ["it", "en"])])

    def test_modern_api_uses_instance_fetch_and_raw_data(self):
        extractor = load_extractor(ModernApi)
        self.assertFalse(extractor._IS_LEGACY_API)
        self.assertEqual(extractor.extract_transcript("video", "en"), "modern api")
        self.assertEqual(ModernApi.calls, [("fetch", "video", ["en"])])


if __name__ == "__main__":
    unittest.main()
