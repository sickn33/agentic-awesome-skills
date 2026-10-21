#!/usr/bin/env python3
"""Offline regressions for pause markers and pronunciation requests."""

import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "explainer" / "tools"))
import story
from docs import readable


class StoryTimingTests(unittest.TestCase):
    def test_pause_markers_keep_engine_word_times(self):
        raw = "一<#0.45#>二<#0.45#>三"
        words = [
            {"word_begin": raw.index(unit), "word_end": raw.index(unit) + 1,
             "time_begin": at}
            for unit, at in zip("一二三", (125, 1375, 2625))
        ]
        actual = story.words_from_engine(raw, [{"timestamped_words": words}], 7)
        self.assertEqual(actual, [["一", 7.125], ["二", 8.375], ["三", 9.625]])
        self.assertEqual(story.shown(raw), "一二三")
        self.assertIn("停顿 0.45 秒", readable(raw))

    def test_segment_relative_offsets_after_a_pause(self):
        raw = "一<#0.5#>二<#0.5#>三"
        subs = [
            {"text_begin": raw.index(unit), "timestamped_words": [
                {"word_begin": 0, "word_end": 1, "time_begin": at}
            ]}
            for unit, at in zip("一二三", (0, 1100, 2200))
        ]
        self.assertEqual(story.words_from_engine(raw, subs, 2),
                         [["一", 2.0], ["二", 3.1], ["三", 4.2]])

    def test_plain_narration_keeps_timing_and_weight(self):
        raw = "只算新的。"
        words = [{"word_begin": i, "word_end": i + 1, "time_begin": i * 200}
                 for i in range(len(raw) - 1)]
        self.assertEqual(story.words_from_engine(raw, [{"timestamped_words": words}], 1),
                         [["只", 1.0], ["算", 1.2], ["新", 1.4], ["的", 1.6], ["。", 1.6]])
        self.assertEqual(story.line_weight(raw), sum(story.weight(u) for u in story.UNIT.findall(raw)))
        self.assertGreaterEqual(story.line_weight("一<#0.5#>二"),
                                story.line_weight("一二") + 0.5)

    def test_pronunciation_request_and_cached_files(self):
        for pronounce in ((), ("重算/(chong2)(suan4)",)):
            with self.subTest(pronounce=pronounce), tempfile.TemporaryDirectory() as tmp:
                api_result = {"base_resp": {"status_code": 0}, "data": {
                    "audio": "00ff", "subtitle_file": "https://example.invalid/subtitles"
                }}
                subs = [{"timestamped_words": []}]
                responses = [io.BytesIO(json.dumps(api_result).encode()),
                             io.BytesIO(json.dumps(subs).encode())]
                with patch.dict(story.os.environ, {"MINIMAX_API_KEY": "offline-test-key"}), \
                     patch.object(story.urllib.request, "urlopen", side_effect=responses) as urlopen:
                    mp3, timestamps = str(Path(tmp) / "line.mp3"), str(Path(tmp) / "line.json")
                    story.tts("重算", "test-voice", 1.05, mp3, timestamps, pronounce)
                payload = json.loads(urlopen.call_args_list[0].args[0].data)
                if pronounce:
                    self.assertEqual(payload["pronunciation_dict"], {"tone": list(pronounce)})
                else:
                    self.assertNotIn("pronunciation_dict", payload)
                self.assertEqual(Path(mp3).read_bytes(), b"\x00\xff")
                self.assertEqual(json.loads(Path(timestamps).read_text()), subs)
                self.assertFalse(list(Path(tmp).glob("*.part")))


if __name__ == "__main__":
    unittest.main()
