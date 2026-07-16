#!/usr/bin/env python3

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from generate_index import infer_category, normalize_category


def assert_equal(actual, expected, label):
    assert actual == expected, f"{label}: expected={expected!r} actual={actual!r}"


def run_tests():
    category = normalize_category("Cloud DevOps")
    assert_equal(category, "cloud-devops", "normalize category")

    skill_info = {
        "id": "secure-api-gateway",
        "category": "uncategorized",
        "name": "secure-api-gateway",
        "description": "Harden OAuth and JWT authentication flows for APIs.",
    }
    metadata = {"category": "security"}
    category, confidence, reason = infer_category(skill_info, metadata, "")
    assert_equal(category, "security", "frontmatter category")
    assert_equal(confidence, 1.0, "frontmatter confidence")
    assert reason.startswith("frontmatter:"), reason

    skill_info = {
        "id": "kubernetes-rollout-checker",
        "category": "uncategorized",
        "name": "kubernetes-rollout-checker",
        "description": "Validate container rollouts and deployment health.",
    }
    metadata = {}
    category, confidence, reason = infer_category(skill_info, metadata, "")
    assert_equal(category, "cloud-devops", "keyword category")
    assert confidence >= 0.5, confidence
    assert reason.startswith("keyword-match:"), reason

    skill_info = {
        "id": "vendorx-hyperflux",
        "category": "uncategorized",
        "name": "vendorx-hyperflux",
        "description": "Internal helper without known taxonomy keywords.",
    }
    metadata = {}
    category, confidence, reason = infer_category(skill_info, metadata, "")
    assert_equal(category, "hyperflux", "dynamic category")
    assert confidence > 0.0, confidence
    assert reason.startswith("derived-from-id-token:"), reason

    print("ok")


if __name__ == "__main__":
    run_tests()
