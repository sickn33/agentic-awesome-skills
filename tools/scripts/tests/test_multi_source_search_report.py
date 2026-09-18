#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "skills" / "multi-source-search" / "scripts" / "validate_report.py"


def report():
    return {
        "question": "Does the result replicate independently?",
        "searched_at": "2026-08-20",
        "providers": ["web_search", "academic_search"],
        "unavailable_providers": [],
        "sources": [
            {"id": "s1", "url": "https://example.org/a", "publisher": "A", "source_type": "primary"},
            {"id": "s2", "url": "https://example.net/b", "publisher": "B", "source_type": "secondary"},
            {"id": "s3", "url": "https://example.com/c", "publisher": "C", "source_type": "primary"},
        ],
        "claims": [{
            "id": "c1",
            "text": "Three independent sources report the result.",
            "kind": "sourced",
            "confidence": "high",
            "source_ids": ["s1", "s2", "s3"],
            "supporting_source_ids": ["s1", "s2", "s3"],
            "contradicting_source_ids": [],
            "independent_source_count": 3,
            "conflict": False,
        }],
        "gaps": ["Raw benchmark data is not public."],
    }


class MultiSourceReportTests(unittest.TestCase):
    def run_report(self, payload):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "report.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                text=True,
                capture_output=True,
                check=False,
            )

    def test_accepts_a_consistent_report(self):
        result = self.run_report(report())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "VALID: 3 source(s), 1 claim(s), 2 provider(s)")

    def test_rejects_inflated_confidence(self):
        payload = report()
        payload["claims"][0]["independent_source_count"] = 2
        result = self.run_report(payload)
        self.assertEqual(result.returncode, 1)
        self.assertIn("requires at least 3 independent sources", result.stderr)

    def test_rejects_unknown_and_unused_sources(self):
        payload = copy.deepcopy(report())
        payload["claims"][0]["source_ids"][2] = "missing"
        payload["claims"][0]["supporting_source_ids"][2] = "missing"
        result = self.run_report(payload)
        self.assertIn("unknown source id: missing", result.stderr)
        self.assertIn("source is not referenced by any claim: s3", result.stderr)

    def test_rejects_duplicate_urls(self):
        payload = copy.deepcopy(report())
        payload["sources"][2]["url"] = payload["sources"][0]["url"]
        result = self.run_report(payload)
        self.assertIn("duplicate source URL", result.stderr)

    def test_rejects_urls_that_only_differ_by_fragment_host_case_or_default_port(self):
        payload = copy.deepcopy(report())
        payload["sources"][0]["url"] = "https://EXAMPLE.org:443/a#first"
        payload["sources"][2]["url"] = "https://example.org/a#second"
        result = self.run_report(payload)
        self.assertIn("duplicate source URL after normalization", result.stderr)

    def test_rejects_raw_whitespace_and_control_characters_before_url_parsing(self):
        for character in ("\n", "\r", "\t", "\x00", "\x1f", "\x7f", " "):
            with self.subTest(character=repr(character)):
                payload = copy.deepcopy(report())
                payload["sources"][0]["url"] = f"https://example.org{character}.evil.test/a"
                result = self.run_report(payload)
                self.assertEqual(result.returncode, 1)
                self.assertIn("must be an HTTP(S) URL", result.stderr)

    def test_rejects_high_confidence_conflict(self):
        payload = report()
        payload["claims"][0]["conflict"] = True
        payload["claims"][0]["supporting_source_ids"] = ["s1", "s2"]
        payload["claims"][0]["contradicting_source_ids"] = ["s3"]
        result = self.run_report(payload)
        self.assertIn("cannot be high confidence", result.stderr)

    def test_rejects_conflict_without_a_contradicting_source(self):
        payload = report()
        payload["claims"][0]["conflict"] = True
        result = self.run_report(payload)
        self.assertIn("conflict true requires a contradicting source", result.stderr)

    def test_rejects_ambiguous_or_overlapping_evidence_stance(self):
        payload = report()
        payload["claims"][0]["supporting_source_ids"] = ["s1", "s2"]
        payload["claims"][0]["contradicting_source_ids"] = ["s2"]
        result = self.run_report(payload)
        self.assertIn("cannot classify the same source", result.stderr)
        self.assertIn("must equal the union", result.stderr)

    def test_rejects_non_date_search_metadata(self):
        payload = report()
        payload["searched_at"] = "today"
        result = self.run_report(payload)
        self.assertIn("searched_at must be an ISO 8601 calendar date", result.stderr)


if __name__ == "__main__":
    unittest.main()
