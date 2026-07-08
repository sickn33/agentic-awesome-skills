---
name: brain-to-docs
description: "Interview the user to turn project vision and decisions into README and ADR documentation."
category: productivity
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [documentation, adr, planning]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# brain-to-docs

## When to Use

- Use when the user wants to extract project vision, decisions, or preferences into durable docs.
- Use when README and ADRs should be built through a back-and-forth interview.

The whole purpose: extract as much of the user's taste, judgment, knowledge, vision,
preferences, and decisions as possible into text — saved as clear, concise
markdown docs for the project. README holds the vision; `docs/adr/` holds the
decisions.

## The loop

1. **Check docs first, every time.** Read `docs/adr/` (and `README.md`) before
   doing anything — other agents and people add/edit ADRs constantly.
2. **Ask 5 different questions** in plain text (never a questions UI) — default 5
   unless the user asks for a different number. Make them high-variety: a wide,
   creative spectrum of unique angles, not all the same type (e.g. not all "tech
   stack" or all "product" or all "monetization"). Exception: if the user asks for a
   specific focus area, follow it. The user answers whichever they find most useful.
3. **Update docs after EVERY answer** — no exceptions. You decide whether it
   updates `README.md` or becomes a new ADR — whatever makes sense.
4. Repeat until the user says "we're done" (or similar).

## Rules

- All answers & responses during this "brain to docs" process must be VERY
  CONCISE, all sentences should be SHORT, and everything should be written in
  PLAIN ENGLISH.
- ADRs: short, numbered `NNNN-slug.md`, Status + Context + Decision + Consequences.
- README: vision only. Decisions go in ADRs.
- Don't challenge the user's thinking unless they ask, or they're making a severe mistake.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
