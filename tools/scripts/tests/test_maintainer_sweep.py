"""Unit tests for maintainer sweep (no network)."""
from __future__ import annotations

import unittest

ROOT = __import__("pathlib").Path(__file__).resolve().parents[3]
sys_path = str(ROOT / "tools" / "scripts")
if sys_path not in __import__("sys").path:
    __import__("sys").path.insert(0, sys_path)

import maintainer_sweep as sweep  # noqa: E402
from ci_pr_evidence import summarize_changed_skills  # noqa: E402


class MaintainerSweepTest(unittest.TestCase):
    def test_ci_ready_when_all_required_success(self):
        pr = {
            "isDraft": False,
            "mergeable": "MERGEABLE",
            "statusCheckRollup": [
                {"name": "pr-policy", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "pr-evidence", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "source-validation", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "artifact-preview", "status": "COMPLETED", "conclusion": "SUCCESS"},
            ],
        }
        summary = sweep.summarize_pr_checks(pr)
        self.assertTrue(summary["ci_ready"])
        self.assertTrue(summary["merge_ready_hint"])

    def test_ci_not_ready_when_pending(self):
        pr = {
            "isDraft": False,
            "mergeable": "MERGEABLE",
            "statusCheckRollup": [
                {"name": "pr-policy", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "source-validation", "status": "IN_PROGRESS", "conclusion": ""},
            ],
        }
        summary = sweep.summarize_pr_checks(pr)
        self.assertFalse(summary["ci_ready"])

    def test_skill_review_manual_counts_as_ready_hint(self):
        pr = {
            "isDraft": False,
            "mergeable": "MERGEABLE",
            "statusCheckRollup": [
                {"name": "pr-policy", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "pr-evidence", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "source-validation", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "artifact-preview", "status": "COMPLETED", "conclusion": "SUCCESS"},
                {"name": "Skill Review / manual-review-required", "status": "COMPLETED", "conclusion": "SUCCESS"},
            ],
        }
        summary = sweep.summarize_pr_checks(pr)
        self.assertEqual(summary["skill_review"], "success")
        self.assertTrue(summary["merge_ready_hint"])


    def test_summarize_changed_skills_blocking(self):
        summary = summarize_changed_skills(
            {
                "head_oid": "abc",
                "blocking": True,
                "reasons": ["skill-a:audit_high_regression:x:+1"],
                "changes": [{"new_skill_id": "skill-a", "blocking": True}],
            },
        )
        self.assertTrue(summary["blocking"])
        self.assertEqual(summary["changed_skill_count"], 1)

    def test_build_next_actions_conflict(self):
        prs = [
            {
                "number": 9,
                "headRefOid": "a" * 40,
                "mergeable": "CONFLICTING",
                "summary": {"checks": {}, "skill_review": "missing", "merge_ready_hint": False},
            },
        ]
        actions = sweep.build_next_actions(prs, None, [], {})
        self.assertEqual(actions[0]["action"], "resolve_conflicts")

    def test_build_next_actions_evidence_blocking(self):
        prs = [
            {
                "number": 10,
                "headRefOid": "b" * 40,
                "mergeable": "MERGEABLE",
                "summary": {
                    "checks": {name: "success" for name in sweep.REQUIRED_CI_CHECKS},
                    "skill_review": "success",
                    "merge_ready_hint": True,
                },
            },
        ]
        evidence = {
            10: {
                "available": True,
                "changed_skills": {"blocking": True, "reasons": ["blocker"], "changed_skill_count": 1},
            },
        }
        actions = sweep.build_next_actions(prs, None, [], evidence)
        self.assertEqual(actions[0]["action"], "fix_evidence_blockers")


if __name__ == "__main__":
    unittest.main()
