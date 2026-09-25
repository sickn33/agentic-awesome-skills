"""Unit tests for optional Jev maintainer hints (no network)."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]
sys_path = str(ROOT / "tools" / "scripts")
if sys_path not in __import__("sys").path:
    __import__("sys").path.insert(0, sys_path)

import jev_maintainer_hints as hints  # noqa: E402


class JevMaintainerHintsTest(unittest.TestCase):
    def test_build_state_truncates_large_skill(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            skill_dir = repo / "skills" / "demo-skill"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text("x" * 20_000, encoding="utf-8")
            state = hints.build_state(repo, "skills/demo-skill", "base", "head")
            self.assertLessEqual(len(state), hints.MAX_STATE_CHARS)
            self.assertIn("truncated", state)

    def test_build_state_includes_exact_skill_and_readme_diff(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            subprocess.run(["git", "config", "user.name", "Jev Test"], cwd=repo, check=True)
            subprocess.run(
                ["git", "config", "user.email", "jev-test@example.invalid"], cwd=repo, check=True
            )
            skill_dir = repo / "skills" / "demo"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                "---\nname: demo\n---\nInitial text\n", encoding="utf-8"
            )
            (repo / "README.md").write_text("## Official Sources\n", encoding="utf-8")
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "base"], cwd=repo, check=True)
            base = subprocess.run(
                ["git", "rev-parse", "HEAD"], cwd=repo, check=True, capture_output=True, text=True
            ).stdout.strip()
            (skill_dir / "SKILL.md").write_text(
                "---\nname: demo\nsource_repo: owner/demo\n---\nChanged behavior\n",
                encoding="utf-8",
            )
            (repo / "README.md").write_text(
                "## Official Sources\n- [owner/demo](https://github.com/owner/demo)\n", encoding="utf-8"
            )
            subprocess.run(["git", "add", "."], cwd=repo, check=True)
            subprocess.run(["git", "commit", "-qm", "change"], cwd=repo, check=True)
            head = subprocess.run(
                ["git", "rev-parse", "HEAD"], cwd=repo, check=True, capture_output=True, text=True
            ).stdout.strip()

            state = hints.build_state(repo, "skills/demo", base, head)

            self.assertIn("untrusted data", state)
            self.assertIn("Changed behavior", state)
            self.assertIn("owner/demo", state)
            self.assertIn("README source-credit diff", state)

    def test_questions_require_evidence_not_generic_priority(self):
        self.assertIn("specific evidence", hints.QUESTIONS["maintainer_priority"]["instructions"])
        self.assertIn("missing context alone", hints.QUESTIONS["triage_bucket"]["instructions"])
        self.assertIn("Newness or file count alone is not enough", hints.QUESTIONS["deep_semantic_review"]["instructions"])

    def test_resolve_api_key_prefers_typesafe_env(self):
        with mock.patch.dict(os.environ, {"TYPESAFE_API_KEY": "ts_test"}, clear=True):
            self.assertEqual(hints.resolve_api_key(), "ts_test")

    def test_main_skips_without_key(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            (repo / "skills" / "demo").mkdir(parents=True)
            (repo / "skills" / "demo" / "SKILL.md").write_text("# Demo\n", encoding="utf-8")
            with mock.patch.object(hints, "find_repo_root", return_value=repo):
                with mock.patch.object(
                    hints,
                    "list_changed_skill_dirs",
                    return_value=["skills/demo"],
                ):
                    with mock.patch.dict(os.environ, {}, clear=True):
                        with mock.patch("sys.argv", ["jev", "--base", "a", "--head", "b"]):
                            self.assertEqual(hints.main(), 0)

    def test_urgency_score_ranks_evidenced_blocker_highest(self):
        low = hints.urgency_score(
            {"maintainer_priority": {"choice": "routine"}, "triage_bucket": {"choice": "no_evidenced_blocker"}},
        )
        high = hints.urgency_score(
            {
                "maintainer_priority": {"choice": "block_pending_evidence"},
                "triage_bucket": {"choice": "evidenced_policy_blocker"},
                "doc_security_red_flags": {"noul": 0.9},
            },
        )
        self.assertGreater(high, low)

    def test_call_jev_parses_response(self):
        payload = {
            "model": "jev-1.13.0",
            "answers": {
                "maintainer_priority": {"type": "choice", "choice": "routine"},
            },
            "usage": {"input_tokens": 100, "output_tokens": 10},
        }

        def fake_urlopen(req, timeout=0):
            self.assertIn(b"maintainer_priority", req.data)
            response = mock.Mock()
            response.read.return_value = json.dumps(payload).encode("utf-8")
            response.__enter__ = mock.Mock(return_value=response)
            response.__exit__ = mock.Mock(return_value=False)
            return response

        with mock.patch("jev_maintainer_hints.request.urlopen", fake_urlopen):
            result = hints.call_jev("token", "state", "jev-latest", 5.0)
        self.assertEqual(result["model"], "jev-1.13.0")


if __name__ == "__main__":
    unittest.main()
