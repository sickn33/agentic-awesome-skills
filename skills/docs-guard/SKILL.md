---
name: docs-guard
description: "Review generated documentation for accuracy, drift, and hallucinated claims."
category: code-quality
risk: safe
source: community
source_repo: amElnagdy/guard-skills
source_type: community
date_added: "2026-07-13"
author: amElnagdy
tags: [documentation, code-review, quality, technical-writing]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/amElnagdy/guard-skills/blob/master/LICENSE"
---

## Limitations

- Cannot verify claims that require running code or accessing live systems.
- Does not replace environment-specific validation, testing, or expert review.
- May flag intentional simplifications as inaccuracies.

## When to Use

Use when reviewing generated or updated documentation to catch hallucinated claims, code-doc drift, missing context, and inaccurate API references.

# Docs Guard

You are reviewing generated or changed documentation before it ships. Apply the rules below as a guard pass after the first documentation pass. The core principle: documentation is a set of claims about a codebase, and every claim is checkable. Your job is to check them.

These rules exist because AI agents document from memory of how APIs *usually* look, not from the code in front of them. Published research: half of AI answers to programming questions contain incorrect information, and models produce valid invocations for infrequent APIs barely a third of the time — yet the prose sounds authoritative either way. Readers cannot tell verified docs from hallucinated docs. You can, because you have the source.

## How to use this skill

**Guard-pass mode** (recommended): after documentation or docstrings have been generated or edited, verify every claim against the source and run the self-check before delivery.

**Live mode** (explicit): when the user invokes this skill before writing docs, verify before you write — read the actual implementation, then document what it does. Run the self-check before delivery.

**Review mode** (the user asks you to review, audit, or fact-check docs): walk [references/review-checklist.md](references/review-checklist.md) against the target docs and produce a findings report with file:line evidence. Do not rewrite in review mode unless asked.

## Adapt to the project first

1. Read the project's agent instructions (CLAUDE.md, AGENTS.md) and any docs style guide. Project conventions win on conflict.
2. Identify the docs surfaces that must move together: README, reference docs, docstrings, changelog, examples, config samples. A change to one usually owes a change to others (Rule 6).
3. Note the documented version policy: which versions does the project support, and where are features version-tagged?

## The Rules

### Accuracy — must fix

1. **Every referenced symbol must exist.** Every function, method, class, hook, CLI command, flag, endpoint, config key, env var, and file path mentioned in the docs gets verified against the actual source, CLI help output, route table, or schema — by reading it, not recalling it. The verification procedure is in [references/verification.md](references/verification.md). An unverifiable reference does not ship.

2. **Every code sample must work.** Imports resolve, APIs exist with the documented signatures (names, argument order, defaults, return shape), and the sample runs outside the author's machine — no hardcoded local paths, no real credentials, no implicit prior state. Sample rules: [references/code-samples.md](references/code-samples.md).

3. **Document the code's actual behavior, not its intended behavior.** Read the implementation before describing it. Where code and comments/specs disagree, the code is the truth — and flag the disagreement to the user instead of silently picking a side.

4. **No unverifiable claims.** Performance numbers, compatibility matrices, scale limits, and "production-ready" assertions require a source in the repository (benchmark script, CI matrix, changelog entry) or they come out. "Fast" is marketing; "O(n log n), benchmarked in bench/sort.md" is documentation.

### Versioning and drift

5. **Versions are explicit.** Features, flags, and behaviors state the version that introduced them when the project tracks versions. Prerequisites are pinned or ranged, never "latest". Deprecated items say so, with the replacement.

6. **A code change owes a docs change.** When editing code whose behavior is documented — rename, signature change, new default, removed flag — update every doc surface that mentions it in the same change. Grep the docs for the old symbol before finishing.

### Substance — should fix

7. **No filler, no slop.** Delete: docstrings that paraphrase the signature ("Gets the user by ID" above `get_user_by_id`), sections that restate their heading, marketing adjectives in technical prose ("powerful", "seamless", "blazingly fast"), and intro padding ("In this section, we will explore…"). A docstring earns its place by adding contracts the signature cannot express: units, ranges, error conditions, side effects, threading/ordering guarantees.

8. **Don't paraphrase upstream docs.** Link to external documentation instead of restating it — paraphrased upstream docs drift the moment upstream changes. Document only your project's relationship to the external thing (which subset you use, what you configure differently).

9. **Examples cover the failure path too.** A tutorial that only shows the happy path documents half the API. Show what the error looks like and what the caller should do — using the error types the code actually raises (verify per Rule 1).

### Structure — worth noting

10. **Navigation tells the truth.** Headings describe their sections, the table of contents matches the actual headings, internal links and anchors resolve, and there are no TODO stubs or "coming soon" sections in published docs — unwritten sections are removed, not promised.

## Self-check before delivery

1. List every symbol, flag, endpoint, config key, and path your docs mention. Did you verify each one against the source in this session — not from memory?
2. Would every code sample run on a clean machine? Did you check each import and signature?
3. Any number, compatibility claim, or superlative without a repo-verifiable source?
4. If this change touched code: did you grep all docs surfaces for the old names?
5. Any docstring that just restates the signature? Any section that restates its heading?
6. Do all internal links and anchors resolve?

If any answer is wrong, fix it before showing the user.

## Reporting format (review mode)

```
**Rule N violation** in `docs/path.md:<line or section>`
- Claim: <what the docs say>
- Reality: <what the code/CLI/schema actually has, with file:line>
- Fix: <one sentence>
```

Lead with Rule 1–4 findings (false claims), then drift, then substance. If a doc is clean, say so in one line — accuracy deserves credit.

## Severity guide

- **Must fix:** Rules 1–4 — false documentation is worse than no documentation; readers act on it
- **Should fix:** Rules 5–9 — drift debt and noise that buries the signal
- **Worth noting:** Rule 10 — navigation and polish

## References

- [references/verification.md](references/verification.md) — the mechanical procedure: extracting claims, verifying symbols, signatures, CLI flags, endpoints, config keys, links
- [references/code-samples.md](references/code-samples.md) — what makes a sample shippable: runnability, realistic data, secrets hygiene, error paths
- [references/docstrings.md](references/docstrings.md) — docstring/PHPDoc/JSDoc-specific rules: when one is justified, what it must contain, paraphrase detection
- [references/review-checklist.md](references/review-checklist.md) — structured walk-through for review mode
- [references/sources.md](references/sources.md) — research and style-guide URLs; read only when citing a source

## What this skill does not do

- Review the code itself — clean-code-guard's jurisdiction. This skill reviews what the docs *claim about* the code.
- Generate documentation strategy or information architecture from scratch — it guards accuracy and substance, not scope decisions.
- Enforce a prose style guide — tone belongs to the project; truth belongs to this skill.
