#!/usr/bin/env python3
"""
Validate cross-references in data/workflows.json and data/bundles.json.
- Every recommendedSkills slug in workflows must exist under skills/ (with SKILL.md).
- Every relatedBundles id in workflows must exist in bundles.json.
- Every skill slug in each bundle's skills list must exist under skills/.
Exits with 1 if any reference is broken.
"""
import json
import os
import re
import sys
from _project_paths import find_repo_root


def collect_skill_ids(skills_dir):
    """Return set of relative paths (skill ids) that have SKILL.md. Matches listSkillIdsRecursive behavior."""
    ids = set()
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        if "SKILL.md" in files:
            rel = os.path.relpath(root, skills_dir).replace(os.sep, "/")
            ids.add(rel)
    return ids


def main():
    base_dir = str(find_repo_root(__file__))
    skills_dir = os.path.join(base_dir, "skills")
    data_dir = os.path.join(base_dir, "data")

    workflows_path = os.path.join(data_dir, "workflows.json")
    bundles_path = os.path.join(data_dir, "bundles.json")

    if not os.path.exists(workflows_path):
        print(f"Missing {workflows_path}")
        sys.exit(1)
    if not os.path.exists(bundles_path):
        print(f"Missing {bundles_path}")
        sys.exit(1)

    skill_ids = collect_skill_ids(skills_dir)
    with open(workflows_path, "r", encoding="utf-8") as f:
        workflows_data = json.load(f)
    with open(bundles_path, "r", encoding="utf-8") as f:
        bundles_data = json.load(f)

    bundle_ids = set(bundles_data.get("bundles", {}).keys())
    errors = []

    # Workflows: recommendedSkills and relatedBundles
    for w in workflows_data.get("workflows", []):
        w_id = w.get("id", "?")
        for step in w.get("steps", []):
            for slug in step.get("recommendedSkills", []):
                if slug not in skill_ids:
                    errors.append(f"workflows.json workflow '{w_id}' recommends missing skill: {slug}")
        for bid in w.get("relatedBundles", []):
            if bid not in bundle_ids:
                errors.append(f"workflows.json workflow '{w_id}' references missing bundle: {bid}")

    # Bundles: every skill in each bundle
    for bid, bundle in bundles_data.get("bundles", {}).items():
        for slug in bundle.get("skills", []):
            if slug not in skill_ids:
                errors.append(f"bundles.json bundle '{bid}' lists missing skill: {slug}")

    # Canonical bundles doc: skill links must point to existing skill dirs
    bundles_md_path = os.path.join(base_dir, "docs", "users", "bundles.md")
    if os.path.exists(bundles_md_path):
        with open(bundles_md_path, "r", encoding="utf-8") as f:
            bundles_md = f.read()
        for m in re.finditer(r"\]\(\.\./\.\./skills/([^)]+)/\)", bundles_md):
            slug = m.group(1).rstrip("/")
            if slug not in skill_ids:
                errors.append(f"docs/users/bundles.md links to missing skill: {slug}")

    if errors:
        for e in errors:
            print(e)
        print(f"\nTotal broken references: {len(errors)}")
        sys.exit(1)

    print("All workflow, bundle, and docs/users/bundles.md references are valid.")
    sys.exit(0)


if __name__ == "__main__":
    main()
