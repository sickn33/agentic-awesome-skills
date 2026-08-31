---
name: slideops
description: "Turn a repository into a cited HTML slide deck and detect the day it drifts from the code. Citations record file, lines, and hash; a stdlib check reports CURRENT, MOVED, or CHANGED."
category: content
risk: critical
source: community
source_repo: glukicov/slideops
source_type: community
date_added: "2026-08-31"
author: glukicov
tags: [slides, presentations, documentation, docs-as-code, drift-detection, citations, html]
tools: [claude-code, codex-cli, copilot, opencode]
license: "MIT"
license_source: "https://github.com/glukicov/slideops/blob/main/LICENSE"
---

# SlideOps: slides from a repo, that tell you when they go stale

> **Catalog copy, frozen at v1.0.0.** The canonical source is
> [glukicov/slideops](https://github.com/glukicov/slideops), which also carries the deck
> template, the two citation scripts, the reference docs, and the companion
> `slides-to-pdf` skill. Install from there; this page summarizes the workflow.

## Overview

SlideOps has two jobs, and the second one is the point. **Build**: turn a repository into
a single self-contained HTML slide deck whose every claim came from the code, not from a
model's impression of the code. **Keep in sync**: make that deck able to prove, months
later, whether it still matches the repository.

The mechanism joining them is a citation. Every quoted snippet records the file, the line
range, and a hash of those source lines at build time, and the deck records the commit it
was built from. "Are these slides still accurate?" becomes a command instead of a
re-read: a standard-library Python script diffs each citation against the current code
and reports `CURRENT`, `MOVED`, `CHANGED`, or `MISSING`. No model, no network, no tokens,
milliseconds to run.

## When to Use This Skill

- Use when the user asks for slides, a slide deck, or a presentation about a code
  repository, one of its subsystems, a feature, or its recent changes: "make slides",
  "overview deck", "team update slides", "HTML slides for this repo".
- Use when the user asks whether an existing deck still matches the code, or wants one
  rechecked, refreshed, or kept in sync: "is this deck still accurate", "check the
  slides against the code", "these docs are stale".
- Use when the user wants deck freshness wired into CI, a pull request check, or an
  agent hook: "fail the build when the deck stops matching the code".
- Do **not** use for slide decks about anything other than a codebase (a sales deck, a
  lecture); the citation mechanism assumes a git repository as the source of truth.

## How It Works

### Step 1: Install from the canonical repo

In Claude Code, as a plugin (both skills, background updates):

```text
/plugin marketplace add glukicov/slideops
/plugin install slideops@slideops
```

Or for Codex CLI, Copilot CLI, and OpenCode, one installer covers all of them:

```bash
git clone https://github.com/glukicov/slideops && cd slideops
git checkout ba43e89bc7936649be36a1796a62203f704f8c60   # the v1.0.0 release commit
./install.sh
```

The checkout pins the exact commit this catalog copy froze at, which is what a reader
can verify independently. (The canonical repo also blocks retargeting of `v*` tags with
an active tag ruleset, but a SHA does not ask you to trust that.) `install.sh` symlinks
the two skills into `~/.claude/skills` (read by Claude Code and OpenCode) and
`~/.agents/skills` (read by Codex CLI and Copilot CLI).

### Step 2: Build a deck

The skill walks a fixed pipeline: a two-minute repo scan, one compact intake (topic,
audience, length, theme, scope, extras), an outline checkpoint before any HTML is
written, then slide-by-slide construction from a verified template. Every snippet is
cited as it is written. Run the citation script from inside the repository being
presented, via its installed path (an agent resolves `scripts/` against the skill's own
directory automatically; the paths below are for running it yourself after
`install.sh`):

```bash
python3 ~/.agents/skills/slideops/scripts/cite.py app/main.py:40-58 --repo . --snippet   # prints data-src + data-sha256
python3 ~/.agents/skills/slideops/scripts/cite.py --stamp deck.html --repo .             # stamps the build commit
```

`--repo` always points at the repository the deck is about, never at the SlideOps
checkout.

Every slide is then rendered with headless Chrome and visually verified before the deck
is considered done.

### Step 3: Check it later, for free

From inside the repository being presented, same path convention as Step 2:

```bash
python3 ~/.agents/skills/slideops/scripts/check.py docs/slides/ --repo .
```

Real output, from the demo deck that ships with the skill:

```text
Deck: skill-demo.html
Built: commit=179bbdb date=2026-08-28 repo=slideops

  slide   9  THEMING        skills/slideops/assets/template.html:22-45    CURRENT
  slide  14  MERMAID        skills/slideops/references/diagrams.md:55-59  CURRENT

2 current, 0 stale, 2 cited in total.
```

`MOVED` means only line numbers shifted (update two attributes, leave the prose).
`CHANGED` means the quoted code was edited (read the diff, decide whether the slide's
claim survived). `MISSING` means the file is gone (the slide is probably obsolete). The
`--json` flag emits a complete repair brief per stale citation, so an agent can fix
drift without re-reading the repository.

## Examples

### Example 1: New deck

```text
User: make slides about this repo
Agent: [scans repo, proposes 3-4 concrete topics with a "why now" each,
        asks one compact intake, shows an outline, then builds and
        visually verifies a cited HTML deck at docs/slides/]
```

### Example 2: Freshness check in CI

```bash
python3 tools/slideops-check.py docs/slides/ --repo . --exit-zero   # report-only PR annotation
```

The canonical repo's `references/automation.md` has the PR-check workflow, advisory hook
variants, and a delegated-refresh recipe. `check.py` is one dependency-free file, meant
to be vendored into the deck's own repo.

## Best Practices

- ✅ Cite with `cite.py`, never by hand: a hand-computed hash silently reports `CHANGED`
  months later and nobody can tell whether the code moved or the build was sloppy.
- ✅ Repair a drifted deck; do not rebuild it. Fix only the slides whose citations went
  stale, then re-stamp.
- ✅ Automate the check for evergreen decks (onboarding, architecture); leave snapshots
  (sprint updates, conference talks) frozen deliberately.
- ❌ Do not run `check.py` against a PDF export: citations live in the HTML, so the PDF
  reports "No citations found in this deck".
- ❌ Do not block every commit on the check. Report-only on pull requests first; a docs
  gate on the fast path trains people to pass `--no-verify`.

## Limitations

- Needs a headless Chrome or Chromium binary (Playwright cache or system install) for
  the visual verification pass, and Python 3 for the citation scripts.
- Works offline except two opt-ins: Mermaid diagrams (a one-time `npx` download) and
  brand-color extraction from a live style guide.
- The check verifies quoted snippets against the code; it cannot verify prose claims
  that cite nothing.
- Drift detection assumes the deck and the code share a git repository.

## Security & Safety Notes

- Ask before cloning the upstream repository, running `install.sh`, creating skill
  symlinks in the user's home directory, downloading an optional `npx` package, or
  writing deck output. Show the exact pinned commit and destination paths first, and
  preserve any existing skill entries instead of overwriting them silently.
- The citation scripts are standard-library-only Python: no dependencies, no network,
  no tokens.
- The skill declares no `allowed-tools`, deliberately: the host agent's own permission
  model stays in charge, and headless Chrome keeps its sandbox.
- The skill carries an explicit confidentiality rule for deck content: never read or
  quote secrets, keys, `.env` files, production logs, or customer data; redact internal
  hostnames and identifiers; and finish with a redaction scan of the rendered slides,
  because decks are documents that leave the repository.
- File writes are limited to the deck output folder (default `docs/slides/`) plus its
  companion README.

## Common Pitfalls

- **Problem:** `check.py` on an exported PDF reports no citations.
  **Solution:** Run it against the HTML deck; the PDF is a derived artifact from the
  companion `slides-to-pdf` skill.
- **Problem:** A freshly built deck already reports `CHANGED`.
  **Solution:** That is a build defect, not a future problem: a snippet was quoted and
  then edited, or a hash was hand-computed. Re-cite with `cite.py` before shipping.
- **Problem:** Chrome is not found on the verification step.
  **Solution:** The canonical repo's `references/verification.md` has the cross-platform
  discovery recipe (Playwright cache first, then system installs).

## Related Skills

- `slides-to-pdf` (same canonical repo): screenshots every slide at 2x, prints a
  page-per-slide PDF, and verifies the result by rendering the PDF back to images.
- `@2slides-ppt-generator`: API-driven deck generation from text or documents; use it
  when the source material is not a code repository.
