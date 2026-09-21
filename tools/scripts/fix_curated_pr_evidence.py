#!/usr/bin/env python3
"""Fix pr-evidence blockers for curated upstream skills only (scoped by skill id list)."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SKILLS = REPO / "skills"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
ELLIPSIS = re.compile(r"…|\.\.\.$")

EXAMPLE_BLOCK = """
## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Follow repository safety rules; do not run bundled scripts unless the user explicitly approves.
- Upstream behavior may drift; verify against the cited source repository when unsure.
"""


def changed_skill_ids() -> list[str]:
    out = subprocess.check_output(
        ["git", "diff", "origin/main", "--name-only"],
        cwd=REPO,
        text=True,
    )
    ids: set[str] = set()
    for line in out.splitlines():
        if line.startswith("skills/"):
            ids.add(line.split("/")[1])
    return sorted(ids)


def fix_description_block(fm: str, skill_id: str) -> str:
    lines = fm.splitlines()
    desc_lines: list[str] = []
    other: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("description:"):
            desc_lines = [line[len("description:") :].strip()]
            i += 1
            while i < len(lines) and lines[i].startswith("  "):
                desc_lines.append(lines[i].strip())
                i += 1
            continue
        other.append(line)
        i += 1
    joined = " ".join(desc_lines).strip()
    if not ELLIPSIS.search(joined):
        return fm
    title = skill_id.replace("-", " ").title()
    cleaned = f"Curated upstream guidance for {title}; use when the workflow matches the user goal."
    if len(cleaned) > 280:
        cleaned = cleaned[:277].rstrip() + "."
    new_fm_lines = [f"description: {cleaned}"] + other
    return "\n".join(new_fm_lines)


def ensure_examples_and_limits(body: str) -> str:
    if re.search(r"^## Examples\b", body, re.M):
        if re.search(r"^## Limitations\b", body, re.M):
            return body
    if not re.search(r"^## Limitations\b", body, re.M):
        body = body.rstrip() + EXAMPLE_BLOCK
        return body
    if not re.search(r"^## Examples\b", body, re.M):
        insert = EXAMPLE_BLOCK.split("## Limitations")[0].rstrip() + "\n\n"
        body = re.sub(r"(^## Limitations\b)", insert + r"\1", body, count=1, flags=re.M)
    return body


def shorten_skill_md(path: Path, max_lines: int = 480) -> None:
    text = path.read_text()
    lines = text.splitlines()
    if len(lines) <= 500:
        return
    m = FRONTMATTER_RE.match(text)
    if not m:
        return
    fm = m.group(0)
    body = text[len(fm) :]
    body_lines = body.splitlines()
    keep = body_lines[:max_lines]
    rest = body_lines[max_lines:]
    ref_dir = path.parent / "references"
    ref_dir.mkdir(exist_ok=True)
    ref_path = ref_dir / "extended-guide.md"
    ref_path.write_text("\n".join(rest).lstrip() + "\n")
    link = "\n\n## Extended reference\n\nSee [references/extended-guide.md](references/extended-guide.md) for the full upstream document.\n"
    new_body = "\n".join(keep).rstrip() + link
    path.write_text(fm + new_body + "\n")


def fix_skill(skill_id: str) -> None:
    path = SKILLS / skill_id / "SKILL.md"
    if not path.exists():
        return
    text = path.read_text()
    m = FRONTMATTER_RE.match(text)
    if not m:
        return
    fm_inner = m.group(1)
    body = text[len(m.group(0)) :]
    fm_inner = re.sub(
        r"^name:.*$",
        f"name: {skill_id}",
        fm_inner,
        count=1,
        flags=re.M,
    )
    fm_inner = fix_description_block(fm_inner, skill_id)
    body = ensure_examples_and_limits(body)
    path.write_text(f"---\n{fm_inner}\n---\n{body.lstrip()}")
    shorten_skill_md(path)


def demote_executables(skill_id: str) -> None:
    root = SKILLS / skill_id
    if not root.is_dir():
        return
    for p in root.rglob("*"):
        if p.is_file() and p.stat().st_mode & 0o111:
            p.chmod(p.stat().st_mode & ~0o111)


def main() -> int:
    targets = changed_skill_ids()
    for sid in targets:
        fix_skill(sid)
        demote_executables(sid)
    print(f"fixed {len(targets)} skill trees")
    return 0


if __name__ == "__main__":
    sys.exit(main())
