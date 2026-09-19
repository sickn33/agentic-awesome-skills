#!/usr/bin/env python3
"""Optional TypeSafe Jev hints for maintainer skill triage.

Advisory only — never a merge gate. Skips quietly when TYPESAFE_API_KEY is unset.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib import error, request

from _project_paths import find_repo_root

API_URL = "https://api.typesafe.ai/v1/systemone"
DEFAULT_MODEL = "jev-latest"
MAX_STATE_CHARS = 12_000
DEFAULT_MAX_SKILLS = 5
MAX_LISTED_FILES = 40

QUESTIONS: dict[str, Any] = {
    "doc_security_red_flags": {
        "type": "noul",
        "instructions": (
            "The skill documentation or bundled examples likely encourage unsafe practice: "
            "hard-coded secrets, curl pipes to shell, disabling security controls, "
            "credential exfiltration, or irreversible destructive commands without safeguards."
        ),
        "criteria": {
            "true": "Clear unsafe install, credential, or network guidance is present or strongly implied.",
            "false": "No such guidance, or only safe placeholders and explicit warnings.",
        },
    },
    "provenance_or_attribution_gap": {
        "type": "noul",
        "instructions": (
            "Source credit, license, ownership, or provenance is missing, ambiguous, "
            "or inconsistent with claiming third-party work as original."
        ),
        "criteria": {
            "true": "A maintainer should verify attribution, license, or source_repo before merge.",
            "false": "Provenance appears adequate for a community skill catalog entry.",
        },
    },
    "maintainer_priority": {
        "type": "choice",
        "instructions": "How urgently should a maintainer inspect this skill change before merge?",
        "criteria": {
            "routine": "Low risk; standard validate/security/Tessl path is enough.",
            "review_before_merge": "Worth a focused human read of the full skill subtree.",
            "stop_and_inspect": "Likely policy, safety, or provenance blocker until resolved.",
        },
    },
}

PRIORITY_ORDER = {"routine": 0, "review_before_merge": 1, "stop_and_inspect": 2}


def configure_utf8_output() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8")


def load_dotenv_local(repo: Path) -> None:
    dotenv_path = repo / ".env.local"
    if not dotenv_path.is_file():
        return
    for line in dotenv_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def run_git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(repo),
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def skill_md_exists_at_ref(repo: Path, skill_rel: str, ref: str) -> bool:
    try:
        run_git(repo, "cat-file", "-e", f"{ref}:{skill_rel}/SKILL.md")
        return True
    except subprocess.CalledProcessError:
        return False


def resolve_skill_dir_for_path(repo: Path, file_path: str, head: str) -> str | None:
    directory = file_path
    if not directory.endswith("/"):
        directory = str(Path(directory).parent.as_posix())
    parts = directory.split("/")
    while parts:
        candidate = "/".join(parts)
        if skill_md_exists_at_ref(repo, candidate, head) or (
            (repo / candidate / "SKILL.md").is_file()
        ):
            return candidate
        parts.pop()
    return None


def list_changed_skill_dirs(repo: Path, base: str, head: str) -> list[str]:
    output = run_git(
        repo,
        "diff",
        "--name-only",
        "--no-renames",
        "--diff-filter=ACDMR",
        base,
        head,
        "--",
    )
    files = [line.strip() for line in output.splitlines() if line.strip()]
    skill_files = [
        path
        for path in files
        if path.startswith("skills/") or re.match(r"^plugins/.+/skills/", path)
    ]
    dirs: set[str] = set()
    for file_path in skill_files:
        skill_dir = resolve_skill_dir_for_path(repo, file_path, head)
        if skill_dir:
            dirs.add(skill_dir)
    return sorted(dirs)


def collect_skill_files(skill_dir: Path) -> list[str]:
    if not skill_dir.is_dir():
        return []
    paths: list[str] = []
    for path in sorted(skill_dir.rglob("*")):
        if path.is_file() and not path.name.startswith("."):
            paths.append(path.relative_to(skill_dir).as_posix())
        if len(paths) >= MAX_LISTED_FILES:
            break
    return paths


def read_skill_md_at_ref(repo: Path, skill_rel: str, ref: str) -> str | None:
    try:
        return run_git(repo, "show", f"{ref}:{skill_rel}/SKILL.md")
    except subprocess.CalledProcessError:
        return None


def list_skill_files_at_ref(repo: Path, skill_rel: str, ref: str) -> list[str]:
    try:
        output = run_git(
            repo,
            "ls-tree",
            "-r",
            "--name-only",
            ref,
            "--",
            skill_rel,
        )
    except subprocess.CalledProcessError:
        return []
    paths = []
    prefix = f"{skill_rel}/"
    for line in output.splitlines():
        line = line.strip()
        if line.startswith(prefix):
            rel = line[len(prefix) :]
            if rel and not rel.startswith("."):
                paths.append(rel)
        if len(paths) >= MAX_LISTED_FILES:
            break
    return sorted(paths)


def build_state(repo: Path, skill_rel: str, base: str, head: str) -> str:
    body_parts = [f"skill_path: {skill_rel}", f"evaluated_at_ref: {head}"]
    skill_text = read_skill_md_at_ref(repo, skill_rel, head)
    if skill_text is None:
        skill_md = repo / skill_rel / "SKILL.md"
        if skill_md.is_file():
            skill_text = skill_md.read_text(encoding="utf-8", errors="replace")
    if skill_text:
        body_parts.append("--- SKILL.md ---")
        body_parts.append(skill_text)
    listed = list_skill_files_at_ref(repo, skill_rel, head)
    if not listed:
        listed = collect_skill_files(repo / skill_rel)
    if listed:
        body_parts.append("--- bundled_files ---")
        body_parts.append("\n".join(listed))
    try:
        diff_stat = run_git(
            repo,
            "diff",
            "--stat",
            base,
            head,
            "--",
            skill_rel,
        ).strip()
        if diff_stat:
            body_parts.append("--- diff_stat ---")
            body_parts.append(diff_stat)
    except subprocess.CalledProcessError:
        pass
    state = "\n\n".join(body_parts)
    if len(state) > MAX_STATE_CHARS:
        state = state[: MAX_STATE_CHARS - 80] + "\n\n[... truncated for Jev input budget ...]"
    return state


def resolve_api_key() -> str | None:
    for name in ("TYPESAFE_API_KEY", "TYPESAFE_API_TOKEN"):
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return None


def call_jev(api_key: str, state: str, model: str, timeout: float) -> dict[str, Any]:
    payload = json.dumps(
        {
            "state": state,
            "model": model,
            "questions": QUESTIONS,
        }
    ).encode("utf-8")
    req = request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with request.urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8")
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise ValueError("Unexpected Jev response shape")
    return parsed


def format_hint(skill_rel: str, response: dict[str, Any]) -> str:
    answers = response.get("answers") or {}
    security = answers.get("doc_security_red_flags") or {}
    provenance = answers.get("provenance_or_attribution_gap") or {}
    priority = answers.get("maintainer_priority") or {}
    sec_p = security.get("noul")
    prov_p = provenance.get("noul")
    choice = priority.get("choice")
    parts = [f"{skill_rel}:"]
    if choice:
        parts.append(f"priority={choice}")
    if isinstance(sec_p, (int, float)):
        parts.append(f"security_p={sec_p:.2f}")
    if isinstance(prov_p, (int, float)):
        parts.append(f"provenance_p={prov_p:.2f}")
    model = response.get("model")
    if model:
        parts.append(f"model={model}")
    return " ".join(parts)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Optional Jev hints for changed canonical skills (advisory only).",
    )
    parser.add_argument(
        "--repo",
        type=Path,
        help="Repository checkout to read skill files from (defaults to script repo root).",
    )
    parser.add_argument("--base", help="Git base ref or SHA (required with --head unless --skill-dir)")
    parser.add_argument("--head", help="Git head ref or SHA")
    parser.add_argument(
        "--skill-dir",
        action="append",
        default=[],
        help="Evaluate one skill directory (repeatable). Skips git diff discovery.",
    )
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Jev model id (default: {DEFAULT_MODEL})")
    parser.add_argument(
        "--max-skills",
        type=int,
        default=DEFAULT_MAX_SKILLS,
        help=f"Max skill directories per run (default: {DEFAULT_MAX_SKILLS})",
    )
    parser.add_argument("--timeout", type=float, default=30.0, help="HTTP timeout seconds")
    parser.add_argument("--json", action="store_true", help="Print machine-readable output")
    parser.add_argument("--dry-run", action="store_true", help="Show targets without calling Jev")
    return parser.parse_args()


def main() -> int:
    configure_utf8_output()
    args = parse_args()
    repo = (args.repo.resolve() if args.repo else find_repo_root(__file__))
    load_dotenv_local(find_repo_root(__file__))

    skill_dirs: list[str] = list(dict.fromkeys(args.skill_dir))
    if not skill_dirs:
        if not args.base or not args.head:
            print(
                "Usage: maintainer:jev-hints -- --base <ref> --head <ref>\n"
                "       maintainer:jev-hints -- --skill-dir skills/my-skill",
                file=sys.stderr,
            )
            return 2
        skill_dirs = list_changed_skill_dirs(repo, args.base, args.head)

    if not skill_dirs:
        print("No changed canonical skill directories for this range.")
        return 0

    skipped = 0
    if len(skill_dirs) > args.max_skills:
        skipped = len(skill_dirs) - args.max_skills
        skill_dirs = skill_dirs[: args.max_skills]

    api_key = resolve_api_key()
    if args.dry_run:
        print(f"Would evaluate {len(skill_dirs)} skill(s):" if api_key else "Dry run (no TYPESAFE_API_KEY):")
        for skill_rel in skill_dirs:
            print(f"- {skill_rel}")
        if skipped:
            print(f"(Skipping {skipped} additional skill(s); raise --max-skills to include them.)")
        return 0

    if not api_key:
        print(
            "Jev hints skipped: set TYPESAFE_API_KEY (see docs/maintainers/jev-hints.md). "
            "Deterministic checks unchanged.",
        )
        return 0

    base = args.base or "HEAD"
    head = args.head or "HEAD"
    results: list[dict[str, Any]] = []
    total_input = 0
    total_output = 0

    for skill_rel in skill_dirs:
        state = build_state(repo, skill_rel, base, head)
        try:
            response = call_jev(api_key, state, args.model, args.timeout)
        except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            print(f"Jev request failed for {skill_rel}: {exc}", file=sys.stderr)
            return 1
        usage = response.get("usage") or {}
        total_input += int(usage.get("input_tokens") or 0)
        total_output += int(usage.get("output_tokens") or 0)
        row = {
            "skill_dir": skill_rel,
            "answers": response.get("answers"),
            "model": response.get("model"),
            "usage": usage,
        }
        results.append(row)
        if not args.json:
            print(format_hint(skill_rel, response))

    if args.json:
        print(
            json.dumps(
                {
                    "skills": results,
                    "totals": {"input_tokens": total_input, "output_tokens": total_output},
                    "skipped_skill_dirs": skipped,
                },
                indent=2,
            )
        )
    else:
        print(
            f"Jev usage this run: {total_input} input / {total_output} output tokens "
            f"({len(skill_dirs)} skill call(s)). Advisory only — not a merge gate.",
        )
        if skipped:
            print(f"Skipped {skipped} additional changed skill(s); re-run with --max-skills.")

        ranked = []
        for row in results:
            choice = ((row.get("answers") or {}).get("maintainer_priority") or {}).get("choice")
            ranked.append((PRIORITY_ORDER.get(str(choice), 1), row["skill_dir"], choice))
        ranked.sort(reverse=True)
        hot = [item for item in ranked if item[0] >= PRIORITY_ORDER["review_before_merge"]]
        if hot:
            print("Inspect first:")
            for _, skill_rel, choice in hot[:5]:
                print(f"- {skill_rel} ({choice})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
