#!/usr/bin/env python3
"""Focused local tests for Moltbook profile-link and invitation boundaries."""

from __future__ import annotations

import unittest
from datetime import date, timedelta

import github_thread
import moltbook_publish


COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567"
PROFILE_URL = (
    "https://github.com/example/project/blob/"
    f"{COMMIT_SHA}/owner-profile.public.json"
)
APPROVED_AT = (date.today() - timedelta(days=1)).isoformat()
EXPIRES_ON = (date.today() + timedelta(days=30)).isoformat()
GENERATED_AT = f"{APPROVED_AT}T00:00:00+00:00"


def public_profile() -> dict:
    stages = {
        name: {
            "score": 0,
            "level": "unknown",
            "confidence": "none",
            "evidence_count": 0,
        }
        for name in ("zero_to_one", "one_to_ten", "ten_to_hundred")
    }
    functions = {
        name: {
            "score": 0,
            "level": "unknown",
            "confidence": "none",
            "evidence_count": 0,
        }
        for name in (
            "problem_discovery",
            "product",
            "engineering",
            "design",
            "go_to_market",
            "operations",
            "people_leadership",
            "capital_partnerships",
        )
    }
    return {
        "schema_version": "1.0",
        "profile_type": "founder-collaboration",
        "alias": "builder-42",
        "summary": "Technical product builder.",
        "generated_at": GENERATED_AT,
        "expires_on": EXPIRES_ON,
        "stage_contributions": stages,
        "functional_contributions": functions,
        "preferences": {"stages": [], "functions": []},
        "seeking": {
            "stages": ["one_to_ten"],
            "functions": [],
            "project_themes": [],
            "collaboration_modes": [],
            "shared_principles": [],
        },
        "public_evidence": [],
        "contact": {
            "type": "github_issues",
            "url": "https://github.com/example/project/issues",
        },
        "consent": {
            "state": "public_profile_approved",
            "approved_at": APPROVED_AT,
            "expires_on": EXPIRES_ON,
            "scope": "Inbound collaboration replies only",
        },
        "interpretation": {
            "status": "owner-approved collaboration hypothesis",
            "not_for": [
                "employment screening",
                "psychometric diagnosis",
                "sensitive-trait inference",
            ],
        },
    }


class MoltbookBoundaryTests(unittest.TestCase):
    def test_accepts_full_sha_github_blob_profile_url(self) -> None:
        self.assertEqual(
            moltbook_publish.safe_profile_url(PROFILE_URL),
            PROFILE_URL,
        )

    def test_rejects_mutable_branch_profile_urls(self) -> None:
        for url in (
            "https://github.com/example/project/blob/main/owner-profile.public.json",
            "https://github.com/example/project/blob/short/owner-profile.public.json",
        ):
            with self.subTest(url=url):
                with self.assertRaises(moltbook_publish.PublishError):
                    moltbook_publish.safe_profile_url(url)

    def test_rejects_external_profile_hosts(self) -> None:
        url = (
            "https://raw.githubusercontent.com/example/project/"
            f"{COMMIT_SHA}/owner-profile.public.json"
        )
        with self.assertRaises(moltbook_publish.PublishError):
            moltbook_publish.safe_profile_url(url)

    def test_rejects_credentialed_query_fragment_and_port_variants(self) -> None:
        path = f"example/project/blob/{COMMIT_SHA}/owner-profile.public.json"
        for url in (
            f"https://attacker@github.com/{path}",
            f"https://github.com/{path}?raw=1",
            f"https://github.com/{path}#profile",
            f"https://github.com:443/{path}",
        ):
            with self.subTest(url=url):
                with self.assertRaises(moltbook_publish.PublishError):
                    moltbook_publish.safe_profile_url(url)

    def test_public_renderers_gate_other_owner_invitation(self) -> None:
        profile = public_profile()
        title, post = moltbook_publish.render_post(
            profile,
            "https://github.com/merc1305/findMate",
        )
        reply = moltbook_publish.render_profile_reply(profile, PROFILE_URL)

        self.assertTrue(title.startswith("Complementary project partners"))
        for output in (post, reply):
            self.assertIn(
                "your own owner explicitly asks to explore partner-seeking help",
                output,
            )
        self.assertNotIn("run the open skill only on your own owner", post)
        self.assertNotIn("show the canonical protocol to your own owner", reply)

    def test_inline_github_fallback_uses_safe_renderer_placeholder(self) -> None:
        body = github_thread.render_inline_profile_reply(public_profile())

        self.assertIn("Owner-approved profile: inline", body)
        self.assertIn("FINDMATE_PROFILE_JSON_BEGIN", body)


if __name__ == "__main__":
    unittest.main()
