#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

SAFE_SKILL_ID_PATTERN = re.compile(
    r"^(?!.*(?:^|/)\.{1,2}(?:/|$))[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$"
)


def is_safe_skill_id(skill_id):
    return bool(SAFE_SKILL_ID_PATTERN.fullmatch(skill_id or ""))


def filter_safe_skill_ids(skill_ids):
    return [skill_id for skill_id in skill_ids if is_safe_skill_id(skill_id)]


def format_skills_for_batch(skill_ids):
    safe_skill_ids = filter_safe_skill_ids(skill_ids)
    if not safe_skill_ids:
        return ""
    # Use newline separator for robustness (avoiding Windows command line length limits)
    return "\n".join(safe_skill_ids) + "\n"


def _manifest_bundles_path():
    return Path(__file__).parent.parent.parent / "data" / "editorial-bundles.json"


def _normalize_bundle_query(query):
    normalized = re.sub(r"[^a-z0-9]+", "-", (query or "").lower()).strip("-")
    return re.sub(r"-{2,}", "-", normalized)


def _read_editorial_manifest(manifest_path):
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    bundles = payload.get("bundles", [])
    return bundles if isinstance(bundles, list) else []


def _read_legacy_markdown_bundles(markdown_path):
    content = markdown_path.read_text(encoding="utf-8")
    sections = re.split(r"\n### ", content)
    bundles = []
    for section in sections:
        header_line = section.split("\n")[0].strip()
        if not header_line:
            continue
        name_match = re.search(r'"([^"]+)"', header_line)
        bundle_name = name_match.group(1) if name_match else header_line
        skills = re.findall(r"- \[`([^`]+)`\]", section)
        bundles.append(
            {
                "id": _normalize_bundle_query(bundle_name),
                "name": bundle_name,
                "skills": [{"id": skill_id} for skill_id in skills],
            }
        )
    return bundles


def _load_bundles_data(bundles_path=None):
    if bundles_path is None:
        bundles_path = _manifest_bundles_path()
    else:
        bundles_path = Path(bundles_path)

    if not bundles_path.exists():
        print(f"Error: {bundles_path} not found", file=sys.stderr)
        return []

    if bundles_path.suffix.lower() == ".json":
        return _read_editorial_manifest(bundles_path)

    return _read_legacy_markdown_bundles(bundles_path)


def get_bundle_skills(bundle_queries, bundles_path=None):
    selected_skills = set()
    bundles = _load_bundles_data(bundles_path)

    for query in bundle_queries:
        raw_query = query.lower().strip('"\'')
        query_slug = _normalize_bundle_query(raw_query)
        found = False
        for bundle in bundles:
            bundle_name = str(bundle.get("name", "")).lower()
            bundle_id = str(bundle.get("id", ""))
            if raw_query in bundle_name or query_slug == bundle_id:
                found = True
                skills = []
                for skill in bundle.get("skills", []):
                    if isinstance(skill, str):
                        skills.append(skill)
                    elif isinstance(skill, dict) and "id" in skill:
                        skills.append(skill["id"])
                selected_skills.update(filter_safe_skill_ids(skills))

        if not found:
            # If query not found in any header, check if it's a skill name itself
            # (Just in case the user passed a skill name instead of a bundle)
            if is_safe_skill_id(raw_query):
                selected_skills.add(raw_query)

    return sorted(list(selected_skills))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Default to Essentials if no query
        queries = ["essentials"]
    else:
        queries = sys.argv[1:]
    
    skills = get_bundle_skills(queries)
    if skills:
        sys.stdout.write(format_skills_for_batch(skills))
