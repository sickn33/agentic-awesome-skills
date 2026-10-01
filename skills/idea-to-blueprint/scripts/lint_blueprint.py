#!/usr/bin/env python3
"""Lint a generated blueprint (.md) for the structural guarantees the build sessions rely on.

Usage:
    python3 lint_blueprint.py path/to/blueprint.md [--strict]

Exit code 0 = no errors (warnings may remain), 1 = errors found (or warnings with --strict).

What it checks (E = error, W = warning):
  E  required top-level sections present (by English anchor in a `## ` heading)
  E  no placeholder text (TODO, TBD, TBA, FIXME, XXX, lorem, ???, [insert, to be defined/decided)
  E  at least one `## Epic nn — Title` and Epic 00 present
  E  each epic has **Definition of Done**;   W  each epic has **Session handoff checklist**
  E  story headings `### Enn-Snn — Title` are unique and live inside the matching epic
  E  each story has **Acceptance Criteria**, **Edge cases**, **Tests**, at least one `AC-n`, and names a persona `P<n>`
  W  each story has **Story**, **Context**, **Scope**, **Tasks**, **Story DoD**
  E  no "As a user" stories
  E  every `[UNKNOWN → OQ-nn]` has a matching OQ-nn row in the Open Questions section; bare `[UNKNOWN]` without an OQ is an error
  E  every table body row in the Tech Stack section carries [VERIFIED / [ASSUMED / [STATED (or [UNVERIFIED], which also raises W)
  E  every S-nn cited in a [VERIFIED …] tag exists in the Sources section;   W  fewer than 5 URLs in Sources
  E  every defined persona P<n> is used by at least one story
  W  copy IDs (CP-…) referenced in stories are defined in the Copy section
  W  dangling story references (Enn-Snn mentioned but not defined)
  W  `## ` headings with non-ASCII text carry an ASCII anchor in parentheses
  W  vague adjectives inside AC lines (properly, appropriately, fast, quickly, easily, seamless, user-friendly, intuitive)
  W  Session Protocol section mentions an Amendments log;   W  an appendix with session prompts exists
  E  Architecture section defines drivers AD-n and mentions fitness functions;   W  <3 drivers, drivers
     with no number in them, no explicit non-drivers
  E  every AD-n referenced outside the Architecture section is defined inside it
  W  Tech Stack table has a runner-up column (a choice with no stated cost was not a decision)
  E  Quality section names a `check` command and embeds >=10 review-checklist items of the form `[ ] …`
  W  Quality section names critical e2e paths, says something about mutation testing, has M-nn metric
     rows, and lists anti-metrics
  E  no metric row defines an output-per-person metric (lines of code, commits/PRs/diffs per engineer,
     story points as productivity);   W  coverage appearing as a metric without the word "floor"

Add `<!-- lint-ignore -->` at the end of a line to suppress placeholder/adjective findings on that line
(e.g., the rule sentence "No TODO or TBD anywhere" in the How-to-use section).
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field

REQUIRED_SECTIONS_ERROR = [
    "How to use", "Executive summary", "Scope", "Research", "Assumptions", "Personas",
    "Goals", "Architecture", "Tech Stack", "Quality", "Edge Cases", "Delivery Plan",
    "Epics", "Session Protocol", "Risks", "Open Questions", "Glossary", "Sources",
]
REQUIRED_SECTIONS_WARN = ["Flows", "Screens", "Design", "UX Writing", "Copy"]

PLACEHOLDER_RE = re.compile(
    r"\bTODO\b|\bTBD\b|\bTBA\b|\bFIXME\b|\bXXX\b|lorem ipsum|\?\?\?|\[insert|to be defined|to be decided",
    re.IGNORECASE,
)
EPIC_HEADING_RE = re.compile(r"^## Epic (\d{2})\s*[—–-]\s*(.+?)\s*$")
STORY_HEADING_RE = re.compile(r"^### (E(\d{2})-S(\d{2}))\s*[—–-]\s*(.+?)\s*$")
STORY_REF_RE = re.compile(r"\bE\d{2}-S\d{2}\b")
AC_LINE_RE = re.compile(r"^\s*[-*]\s*AC-\d+", re.IGNORECASE)
PERSONA_REF_RE = re.compile(r"(?<![A-Za-z])P(\d+)\b")
UNKNOWN_RE = re.compile(r"\[UNKNOWN([^\]]*)\]")
OQ_IN_UNKNOWN_RE = re.compile(r"OQ-(\d+)")
VERIFIED_SOURCE_RE = re.compile(r"\[VERIFIED[^\]]*?\bS-(\d+)")
SOURCE_ID_RE = re.compile(r"\bS-(\d+)\b")
URL_RE = re.compile(r"https?://\S+")
CP_ID_RE = re.compile(r"\bCP-[A-Za-z0-9]+-\d+\b")
EVIDENCE_TAG_RE = re.compile(r"\[(VERIFIED|ASSUMED|STATED|UNVERIFIED)\b")
UNVERIFIED_RE = re.compile(r"\[UNVERIFIED\]")
VAGUE_RE = re.compile(
    r"\b(properly|appropriately|fast|quickly|easily|seamless(?:ly)?|user-friendly|intuitive(?:ly)?)\b",
    re.IGNORECASE,
)
AS_A_USER_RE = re.compile(r"\bAs an? user\b", re.IGNORECASE)
AD_ID_RE = re.compile(r"\bAD-(\d+)\b")
DIGIT_RE = re.compile(r"\d")
FITNESS_RE = re.compile(r"fitness function", re.IGNORECASE)
CHECK_CMD_RE = re.compile(r"`[^`\n]*\bcheck\b[^`\n]*`")
CHECKLIST_ITEM_RE = re.compile(r"^\s*(?:[-*]\s*)?\[ \]\s+\S")
METRIC_ROW_RE = re.compile(r"\bM-\d+(?:\.\d+)?\b")
BANNED_METRIC_RE = re.compile(
    r"lines of code|\bLOC\b|commits? per (?:engineer|developer|dev|person)"
    r"|(?:pull requests?|PRs?|diffs?) per (?:engineer|developer|dev|person)"
    r"|story points? (?:per|as a measure|completed per)|velocity per",
    re.IGNORECASE,
)
COVERAGE_TARGET_RE = re.compile(r"coverage", re.IGNORECASE)
LINT_IGNORE = "<!-- lint-ignore -->"


@dataclass
class Findings:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def err(self, line: int | None, msg: str) -> None:
        self.errors.append(f"L{line}: {msg}" if line else msg)

    def warn(self, line: int | None, msg: str) -> None:
        self.warnings.append(f"L{line}: {msg}" if line else msg)


@dataclass
class Section:
    title: str
    start: int  # 0-based index of heading line
    end: int    # exclusive


def level2_sections(lines: list[str]) -> list[Section]:
    idx = [i for i, l in enumerate(lines) if l.startswith("## ")]
    sections = []
    for n, i in enumerate(idx):
        end = idx[n + 1] if n + 1 < len(idx) else len(lines)
        sections.append(Section(lines[i][3:].strip(), i, end))
    return sections


def find_section(sections: list[Section], anchor: str) -> Section | None:
    a = anchor.lower()
    for s in sections:
        if EPIC_HEADING_RE.match("## " + s.title):
            continue
        if a in s.title.lower():
            return s
    return None


def block_text(lines: list[str], start: int, end: int) -> str:
    return "\n".join(lines[start:end])


def table_body_rows(lines: list[str], start: int, end: int) -> list[tuple[int, str]]:
    """Return (line_no, row) for table rows that are neither header nor separator."""
    rows = []
    in_table = False
    header_seen = False
    for i in range(start, end):
        l = lines[i].strip()
        if l.startswith("|"):
            if not in_table:
                in_table, header_seen = True, True  # first row of a table is its header
                continue
            if re.match(r"^\|[\s:\-|]+\|$", l):
                continue  # separator
            rows.append((i + 1, l))
        else:
            in_table, header_seen = False, False
    return rows


def main(argv: list[str]) -> int:
    if len(argv) < 2 or argv[1] in {"-h", "--help"}:
        print(__doc__)
        return 0
    path = argv[1]
    strict = "--strict" in argv
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    f_ = Findings()
    sections = level2_sections(lines)

    # 1. Required sections
    for anchor in REQUIRED_SECTIONS_ERROR:
        if not find_section(sections, anchor):
            f_.err(None, f"Missing required section with anchor '{anchor}' in a '## ' heading")
    for anchor in REQUIRED_SECTIONS_WARN:
        if not find_section(sections, anchor):
            f_.warn(None, f"No section with anchor '{anchor}' — fine only if it truly does not apply (say so in the doc)")

    # 2. Placeholders + vague adjectives + "As a user"
    for i, l in enumerate(lines, 1):
        if LINT_IGNORE in l:
            continue
        m = PLACEHOLDER_RE.search(l)
        if m:
            f_.err(i, f"Placeholder text '{m.group(0)}' — decide it or route to an [UNKNOWN → OQ-nn]")
        if AC_LINE_RE.match(l):
            v = VAGUE_RE.search(l)
            if v:
                f_.warn(i, f"Vague word '{v.group(0)}' in an acceptance criterion — replace with a number or observable result")
        if AS_A_USER_RE.search(l):
            f_.err(i, "'As a user' — stories must name a persona ID and name (e.g. 'As **P2 (Owner)**')")

    # 3. Epics and stories
    epics: list[tuple[int, str, Section]] = []  # (epic_no, title, section)
    for s in sections:
        m = EPIC_HEADING_RE.match("## " + s.title)
        if m:
            epics.append((int(m.group(1)), m.group(2), s))
    if not epics:
        f_.err(None, "No epics found — expected headings like '## Epic 00 — Foundation'")
    elif not any(n == 0 for n, _, _ in epics):
        f_.err(None, "Epic 00 (Foundation) is missing")

    story_ids: dict[str, int] = {}
    story_blocks: list[tuple[str, int, int, int]] = []  # (id, epic_no, start, end)
    for epic_no, epic_title, sec in epics:
        text = block_text(lines, sec.start, sec.end)
        if "**Definition of Done**" not in text:
            f_.err(sec.start + 1, f"Epic {epic_no:02d} has no **Definition of Done**")
        if "**Session handoff checklist**" not in text:
            f_.warn(sec.start + 1, f"Epic {epic_no:02d} has no **Session handoff checklist**")
        # stories inside this epic
        heads = [i for i in range(sec.start + 1, sec.end) if lines[i].startswith("### ")]
        if not heads:
            f_.err(sec.start + 1, f"Epic {epic_no:02d} has no stories ('### Enn-Snn — Title')")
        for n, i in enumerate(heads):
            end = heads[n + 1] if n + 1 < len(heads) else sec.end
            m = STORY_HEADING_RE.match(lines[i])
            if not m:
                f_.warn(i + 1, f"Level-3 heading inside Epic {epic_no:02d} is not a story heading: '{lines[i][4:60]}'")
                continue
            sid, e_no = m.group(1), int(m.group(2))
            if sid in story_ids:
                f_.err(i + 1, f"Duplicate story ID {sid} (first at L{story_ids[sid]})")
            story_ids[sid] = i + 1
            if e_no != epic_no:
                f_.err(i + 1, f"Story {sid} is inside Epic {epic_no:02d} but its ID says E{e_no:02d}")
            story_blocks.append((sid, epic_no, i, end))

    all_story_text = ""
    for sid, _, start, end in story_blocks:
        text = block_text(lines, start, end)
        all_story_text += "\n" + text
        for label in ("**Acceptance Criteria**", "**Edge cases**", "**Tests**"):
            if label not in text:
                f_.err(start + 1, f"{sid} is missing {label}")
        for label in ("**Story**", "**Context**", "**Scope**", "**Tasks**", "**Story DoD**"):
            if label not in text:
                f_.warn(start + 1, f"{sid} is missing {label}")
        if not any(AC_LINE_RE.match(l) for l in lines[start:end]):
            f_.err(start + 1, f"{sid} has no 'AC-n' lines")
        if not PERSONA_REF_RE.search(text):
            f_.err(start + 1, f"{sid} does not reference a persona ID (P1, P2, … or P0 for the builder)")

    # dangling story references
    defined = set(story_ids)
    for i, l in enumerate(lines, 1):
        for ref in STORY_REF_RE.findall(l):
            if ref not in defined:
                f_.warn(i, f"Reference to undefined story {ref}")

    # 4. UNKNOWN → OQ
    oq_sec = find_section(sections, "Open Questions")
    oq_text = block_text(lines, oq_sec.start, oq_sec.end) if oq_sec else ""
    for i, l in enumerate(lines, 1):
        for m in UNKNOWN_RE.finditer(l):
            oqs = OQ_IN_UNKNOWN_RE.findall(m.group(1))
            if not oqs:
                f_.err(i, "[UNKNOWN] without an OQ reference — use '[UNKNOWN → OQ-nn]'")
            for q in oqs:
                if oq_sec and not re.search(rf"\bOQ-{q}\b", oq_text):
                    f_.err(i, f"OQ-{q} referenced but not present in the Open Questions section")

    # 5. Tech stack evidence
    ts = find_section(sections, "Tech Stack")
    if ts:
        rows = table_body_rows(lines, ts.start, ts.end)
        if not rows:
            f_.err(ts.start + 1, "Tech Stack section has no table rows")
        for ln, row in rows:
            if not EVIDENCE_TAG_RE.search(row):
                f_.err(ln, "Tech Stack table row without an evidence tag ([VERIFIED …] / [ASSUMED …] / [STATED])")

    # 6. Sources
    src = find_section(sections, "Sources")
    if src:
        src_text = block_text(lines, src.start, src.end)
        defined_sources = set(SOURCE_ID_RE.findall(src_text))
        urls = URL_RE.findall(src_text)
        if len(urls) < 5:
            f_.warn(src.start + 1, f"Only {len(urls)} URL(s) in Sources — deep research normally yields far more")
        for i, l in enumerate(lines, 1):
            if src.start < i - 1 < src.end:
                continue
            for s_id in VERIFIED_SOURCE_RE.findall(l):
                if s_id not in defined_sources:
                    f_.err(i, f"[VERIFIED …] cites S-{s_id}, which is not in the Sources section")

    # 7. Personas used
    per = find_section(sections, "Personas")
    if per:
        per_text = block_text(lines, per.start, per.end)
        defined_personas = sorted({int(x) for x in PERSONA_REF_RE.findall(per_text)})
        if not defined_personas:
            f_.err(per.start + 1, "Personas section defines no persona IDs (P1, P2, …)")
        used = {int(x) for x in PERSONA_REF_RE.findall(all_story_text)}
        for p in defined_personas:
            if p not in used:
                f_.err(per.start + 1, f"Persona P{p} is never referenced by any story — remove it or write its stories")

    # 8. Copy IDs referenced vs defined
    cp = find_section(sections, "Copy")
    if cp:
        cp_defined = set(CP_ID_RE.findall(block_text(lines, cp.start, cp.end)))
        for sid, _, start, end in story_blocks:
            for ref in set(CP_ID_RE.findall(block_text(lines, start, end))):
                if ref not in cp_defined:
                    f_.warn(start + 1, f"{sid} references copy ID {ref} that is not defined in the Copy section")

    # 9. Heading anchors
    for s in sections:
        if any(ord(ch) > 127 and ch.isalpha() for ch in s.title) and not re.search(r"\([A-Za-z][A-Za-z0-9 &/\-]*\)", s.title):
            f_.warn(s.start + 1, f"Heading '{s.title[:40]}' has no ASCII anchor in parentheses")

    # 10. Session protocol / appendix
    sp = find_section(sections, "Session Protocol")
    if sp and "amendment" not in block_text(lines, sp.start, sp.end).lower():
        f_.warn(sp.start + 1, "Session Protocol section does not mention the Amendments log")
    if not find_section(sections, "Session Prompts"):
        f_.warn(None, "No appendix with 'Session Prompts' — the user needs one copy-paste prompt per epic")

    # 11. UNVERIFIED tags (only legitimate when web tools were unavailable)
    unverified = sum(len(UNVERIFIED_RE.findall(l)) for l in lines)
    if unverified:
        f_.warn(None, f"{unverified} [UNVERIFIED] tag(s) — acceptable only with the no-web-access warning on the cover; the first build session must re-verify each")

    # 12. Architecture drivers and the style decision
    arch = find_section(sections, "Architecture")
    ad_defined: set[str] = set()
    if arch:
        arch_text = block_text(lines, arch.start, arch.end)
        # A driver is *defined* where its ID opens the line (optionally after a list marker, bold
        # marker or heading hashes) or opens a table row's first cell. Everywhere else is a reference.
        for i in range(arch.start, min(arch.end, len(lines))):
            l = lines[i]
            head = l.lstrip().lstrip("#*->|").lstrip().lstrip("*_ ")
            m = AD_ID_RE.match(head)
            if m:
                ad_defined.add(m.group(1))
        if not ad_defined:
            f_.err(
                arch.start + 1,
                "Architecture section defines no drivers (AD-1, AD-2, …) — the style decision has "
                "nothing to be scored against, which is how a stack gets chosen first and justified after",
            )
        elif len(ad_defined) < 3:
            f_.warn(arch.start + 1, f"Only {len(ad_defined)} architecture driver(s) — 5–8 ranked drivers is the target")
        # Each driver definition line must carry a measurable target. Strip the AD-n IDs first:
        # the digit in the ID itself does not make the driver measurable.
        for i in range(arch.start, min(arch.end, len(lines))):
            l = lines[i]
            head = l.lstrip().lstrip("#*->|").lstrip().lstrip("*_ ")
            if LINT_IGNORE in l or not AD_ID_RE.match(head):
                continue
            if not DIGIT_RE.search(AD_ID_RE.sub("", l)):
                f_.warn(
                    i + 1,
                    "Architecture driver with no number in it — a driver without a measurable target "
                    "cannot decide anything ('scalable' is not a driver)",
                )
        if not FITNESS_RE.search(arch_text):
            f_.err(
                arch.start + 1,
                "Architecture section never mentions fitness functions — boundaries that are described "
                "but not enforced are gone within a few sessions",
            )
        if "non-driver" not in arch_text.lower() and "not optimis" not in arch_text.lower() and "not optimiz" not in arch_text.lower():
            f_.warn(arch.start + 1, "No explicit non-drivers ('what we are NOT optimising for') in the Architecture section")

    # Every AD-n referenced anywhere must be defined by a driver line in the Architecture section
    if ad_defined:
        for i, l in enumerate(lines, 1):
            head = l.lstrip().lstrip("#*->|").lstrip().lstrip("*_ ")
            if arch and arch.start < i - 1 < arch.end and AD_ID_RE.match(head):
                continue  # this is the definition line itself
            for ad in AD_ID_RE.findall(l):
                if ad not in ad_defined:
                    f_.err(i, f"AD-{ad} is referenced but never defined as a driver in the Architecture section")

    # 13. Tech stack table shape — every row must name what the runner-up would have bought
    if ts:
        header = ""
        for i in range(ts.start, min(ts.end, len(lines))):
            if lines[i].lstrip().startswith("|") and "---" not in lines[i]:
                header = lines[i].lower()
                break
        if header and "runner" not in header:
            f_.warn(
                ts.start + 1,
                "Tech Stack table has no runner-up column — a choice with no stated cost was not a decision",
            )

    # 14. Quality section: the gate, the checklist, the critical paths
    q = find_section(sections, "Quality")
    if q:
        q_lines = lines[q.start : q.end]
        q_text = "\n".join(q_lines)
        q_lower = q_text.lower()
        if not CHECK_CMD_RE.search(q_text):
            f_.err(
                q.start + 1,
                "Quality section names no `check` command in backticks — the build sessions have no "
                "definition of green",
            )
        checklist_items = sum(1 for l in q_lines if CHECKLIST_ITEM_RE.match(l))
        if checklist_items < 10:
            f_.err(
                q.start + 1,
                f"Quality section contains {checklist_items} review-checklist item(s) of the form '[ ] …' — "
                "embed the review checklist verbatim (code-quality-and-review.md §11) or the reviewer "
                "invents a different standard every session",
            )
        if "e2e" not in q_lower and "end-to-end" not in q_lower:
            f_.warn(q.start + 1, "Quality section does not name the critical e2e paths")
        if "mutation" not in q_lower:
            f_.warn(
                q.start + 1,
                "Quality section says nothing about mutation testing — name the tool for this stack, "
                "or state that no maintained one exists",
            )
        if not METRIC_ROW_RE.search(q_text):
            f_.warn(q.start + 1, "Quality section has no metrics table rows (M-nn) — nothing will be measured")
        if "anti-metric" not in q_lower and "will not measure" not in q_lower and "not measure" not in q_lower:
            f_.warn(
                q.start + 1,
                "Quality section lists no anti-metrics — say explicitly what will not be measured and why",
            )

    # 15. Banned productivity metrics inside metric definition rows
    for i, l in enumerate(lines, 1):
        if LINT_IGNORE in l or not METRIC_ROW_RE.search(l):
            continue
        m = BANNED_METRIC_RE.search(l)
        if m:
            f_.err(
                i,
                f"Metric row defines '{m.group(0)}' — output-per-person metrics are gamed the moment they "
                "become targets; measure the system, not the author",
            )
        if COVERAGE_TARGET_RE.search(l) and "floor" not in l.lower():
            f_.warn(
                i,
                "Coverage appears as a metric without the word 'floor' — state it as a regression floor, "
                "never as a target to raise",
            )

    # 16. Report
    print(f"Blueprint lint — {path}")
    print(f"  epics: {len(epics)}   stories: {len(story_ids)}   sections: {len(sections)}")
    if f_.errors:
        print(f"\nERRORS ({len(f_.errors)}):")
        for e in f_.errors:
            print("  ✘ " + e)
    if f_.warnings:
        print(f"\nWARNINGS ({len(f_.warnings)}):")
        for w in f_.warnings:
            print("  ! " + w)
    if not f_.errors and not f_.warnings:
        print("\nPASS — no findings.")
    elif not f_.errors:
        print("\nPASS with warnings — resolve or justify each warning in the document.")
    else:
        print("\nFAIL — fix every error before delivering the blueprint.")
    return 1 if f_.errors or (strict and f_.warnings) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
