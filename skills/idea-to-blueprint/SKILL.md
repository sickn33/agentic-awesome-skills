---
name: idea-to-blueprint
description: "Turn a raw product, app, bot or feature idea into one evidence-backed build blueprint (researched stack, epics, Given/When/Then criteria, tests) that coding agents build one epic per session."
category: planning
risk: safe
source: self
source_type: self
source_repo: iniesohidham/idea-to-blueprint
date_added: "2026-09-30"
author: iniesohidham
tags: [prd, specification, product-planning, user-stories, acceptance-criteria, tech-stack, agentic-engineering]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/iniesohidham/idea-to-blueprint/blob/main/LICENSE"
---

# Idea to Blueprint

## Overview

Turn a raw idea into a single markdown document that is complete enough for a coding agent to build the product epic by epic, in fresh sessions, without ever having to guess. The blueprint is not a "PRD" in the loose sense: it is the product's only shared memory between the human, the research, and every future build session.

The skill runs intake questions, web research and competitor benchmarking, then writes one Markdown blueprint: architecture drivers and style, a version-pinned stack with evidence tags, a quality gate, personas, flows, UX copy, edge cases, and epics broken into stories with Given/When/Then acceptance criteria, tests and a Definition of Done. The blueprint embeds a session protocol so Claude Code or Codex builds it one epic per fresh session.

This is the author's own skill, published at [iniesohidham/idea-to-blueprint](https://github.com/iniesohidham/idea-to-blueprint) under the MIT license (see `LICENSE`). The files in `references/`, `assets/` and `scripts/` are unchanged copies of the upstream files; this `SKILL.md` adds the catalog sections (Overview, When to Use, Examples, Limitations, safety notes) around the upstream instructions.

## When to Use This Skill

- Use when someone shares a product, app, bot or feature idea (even 2–3 lines) and wants a PRD, spec, backlog, epics, user stories, roadmap or MVP plan, even without saying "PRD".
- Use when the user wants deep web research, market research or competitor benchmarking before anything is built.
- Use when the user wants an architecture or tech-stack recommendation with justification and pinned versions, or code-quality and review standards for a new product.
- Use when the user asks for "a plan for Claude Code/Codex" that a coding agent can execute one epic at a time.
- Prefer it over lighter PRD skills when research depth, rigor or zero hallucination matters.
- Do not use it to review an existing PRD, to compare two frameworks in isolation, or to write a single piece of UX copy.

## How It Works

Run this skill on the strongest model available at the highest effort/thinking setting the harness offers. If you cannot tell whether that is the case, say so once at the start and continue.

### Why this document has to be different

A build session that starts from a blank context has exactly two sources of truth: the repo and this blueprint. Whatever is missing, vague, or wrong in the blueprint becomes a guess in code. So the whole skill is organized around three habits:

1. **Evidence or silence.** Every claim about the outside world (a library, a version, a competitor, a regulation, a market figure, a service's availability in a country) carries an evidence tag: `[VERIFIED — <source>, <date>]`, `[ASSUMED — <why>]`, or `[UNKNOWN → OQ-nn]` (routed to Open Questions). You never fill a gap with a plausible-sounding guess, because the reader has no way to tell your guess from a fact.
2. **Decide, don't hedge.** "Use X or Y" pushes the decision onto an agent with less context than you have now. Make the call, record the alternatives and why they lost.
3. **Write for zero context.** No "as discussed", no "the usual way". Every ID (persona, flow, screen, copy line, story, criterion) is unique and cross-referenced so a fresh session can resolve everything by search.

Everything below serves those three habits.

### Workflow

| Phase | What happens | Reference to read |
|---|---|---|
| 0. Intake | Parse the idea, do a 2–5 search warm-up, ask ONE batch of questions with defaults, wait | `references/intake-questions.md` |
| 1. Deep research | Understand the domain, benchmark competitors, derive the architecture drivers and shape, choose the stack for agentic engineering, verify the quality tooling, integrations and locale realities, collect UX benchmarks | `references/research-protocol.md`, `references/architecture-decisions.md`, `references/code-quality-and-review.md` |
| 2. Decision brief | Present the interpretation, personas, positioning, architecture drivers and shape, stack, quality gate, epic list and open questions in chat; get a go/correct | (template below) |
| 3. Write the blueprint | Write the document section by section, in chunks, into one `.md` file | `references/blueprint-template.md` plus the topic references it points to |
| 4. Lint & deliver | Run `scripts/lint_blueprint.py`, fix every error, deliver the file with a short wrap-up | (below) |
| 5. Build sessions | The user runs one epic per fresh Claude Code / Codex session using the protocol embedded in the blueprint | `references/session-protocol.md` |

Do not skip phases 0 and 2. The user explicitly wants to be asked before a long document is produced, and a two-minute checkpoint prevents a hundred pages built on a wrong interpretation. Do not run the phases out of order: research before the intake answers wastes searches on the wrong problem; writing before the brief is approved wastes the document.

Talk to the user in the language they wrote in. Persian in → Persian out for all chat and for the human-facing prose of the document (see Language convention).

### Phase 0 — Intake

Read `references/intake-questions.md` before asking anything. The rules that matter most:

- **Warm up first.** Run 2–5 quick searches on the idea so the questions are concrete ("I see three products in this space — A, B, C — which is closest to what you mean?") instead of generic.
- **One batch, defaults on every question.** Group the questions, put a sensible default next to each, and say that answering "defaults" or skipping any question is fine. Never ask in dribs and drabs.
- **Never ask what is already answered or inferable.** Cues from the message decide: language, currency, city names, local services, ".ir" domains, Jalali dates, "کاربر ایرانی" → the users are probably Iranian, so ask to *confirm* it in one line rather than asking "where are your users?".
- **Ask only what changes the architecture, the personas, or the scope.** A big product needs about 10–15 questions; a single feature needs 3–6.
- Where an elicitation UI tool exists (tappable options), use it for the closed questions; put open questions in prose right after.

When the answers arrive, write every unanswered item as an `[ASSUMED — …]` row in your notes; those rows become the Assumptions section later.

### Phase 1 — Deep research and benchmarking

Read `references/research-protocol.md` and follow its seven tracks **in order**:

- **A. Understand the idea** — domain concepts, vocabulary (this becomes the Glossary), how the problem is solved today, adjacent regulation to flag (never legal advice).
- **B. Benchmark** — 5–10 direct and indirect competitors (global, plus local ones when the market is Iran or another specific country), a feature matrix, best-in-class behaviour per key flow, common user complaints (paraphrased from reviews, never quoted), the gap this product fills, a positioning statement.
- **C. Architecture drivers and shape** (`references/architecture-decisions.md`) — derive ranked, *measurable* quality-attribute drivers from the personas, the scale ceiling, the failure cost of the core loop and the hosting reality; name the explicit non-drivers; score 2–3 candidate architecture styles against them; decide the shape, the module boundaries and the exit triggers that would justify revisiting it. Verify the framework's own recommended structure and whether boundary rules can be enforced mechanically in the candidate languages.
- **D. Stack for agentic engineering** — choose the language, framework, database, testing and tooling using the weighted criteria in the protocol (mainstream + heavily documented, strict static typing, one-command deterministic `check`, fast tests, LTS/stable, few dependencies, hosting fit for the market) **and** the drivers from C. Verify current stable versions, deprecations and licenses, and pin them.
- **E. Quality bar and tooling** (`references/code-quality-and-review.md`) — verify the tools that make the gate real for the chosen stack (formatter, strict lint config, typechecker flags, test runner, coverage, mutation testing if a maintained one exists, SAST and dependency audit, secret scanning, duplication detection, accessibility checks, architecture-rule library), the language's official style guide, the CI capability of the chosen host, the current security baseline for the category, and — only if the document will quote them — the current delivery-metric definitions and the current evidence on AI-authored code quality.
- **F. Integrations and locale realities** — payments, SMS/OTP, email, maps, push, app stores, hosting/CDN. For Iran, availability of foreign services changes with sanctions and filtering; verify today's status for each one you rely on and record the date.
- **G. UX benchmarks** — onboarding, empty states, error handling and accessibility norms from the best products in the space.

C before D matters. Choosing the framework first and then writing drivers that happen to justify it is the most common silent failure in a document like this, and it is undetectable in the finished file unless you ask whether any driver could have changed the answer.

Log every source (URL, title, access date) as you go; the Sources section is built from this log, not reconstructed afterwards. Expect 20–60 searches for a whole product; post a one-line progress note to the user every few searches ("benchmarking local competitors…", "verifying gateway sandbox…") so a long research phase never looks stalled. If web tools are unavailable, stop and tell the user: a blueprint written from memory alone cannot meet the no-hallucination bar, so either they enable web access or the document is delivered with every external fact marked `[UNVERIFIED]` and a warning on the cover.

### Phase 2 — Decision brief (checkpoint)

Before writing the document, post a brief in chat, roughly one screen long, in the user's language:

```
## Decision brief — <product name>
**How I read the idea:** 2–3 sentences. What it is, for whom, and the single outcome it delivers.
**Users are:** <market/country>, <B2C/B2B>, <language(s)>. (confirmed / assumed)
**Personas:** P1 <name> — one line. P2 … (3–5 max, plus anti-personas if useful)
**Benchmark in one paragraph:** who exists, what the best of them do, the gap we take.
**Architecture drivers (top 3):** AD-1 … (target), AD-2 …, AD-3 … — and what we are explicitly NOT optimising for.
**Shape (locked unless you object):** <style> — one line on why it beat <runner-up>, and the trigger that would make us revisit it.
**Stack (locked unless you object):** language · framework · DB · hosting · testing — one line each with the deciding reason and what the runner-up would have bought.
**Quality gate:** `check` = … (expected runtime …); critical e2e paths: …; what we will measure: …
**Design direction:** reference-based (<their reference>) or chosen (<system/style>) — one line.
**Epics in order:** E00 Foundation, E01 …, E02 … (titles only, 6–14 typical)
**Needs your answer before I write:** only genuinely blocking questions, numbered OQ-01…
**Everything else I will assume** as written in the Assumptions table.
Reply "go" to write the full blueprint, or correct any line.
```

If the user pre-authorised ("don't stop to ask, just write"), still post the brief and continue without waiting. Otherwise wait for the reply and fold corrections into the research notes.

### Phase 3 — Write the blueprint

Read `references/blueprint-template.md` and keep it open; it has the full section skeleton, the depth target per section, table formats and the ID schemes. Before writing the relevant sections, read the topic references it points to:

- Personas, flows, screens, design direction → `references/design-minimal.md`
- UX writing and copy tables → `references/ux-writing-guide.md` (its Persian pack when users are Iranian)
- Architecture drivers, style decision, module boundaries, fitness functions, decision records → `references/architecture-decisions.md`
- Quality gate, review checklist, test-quality rules, metrics and anti-metrics → `references/code-quality-and-review.md`
- Edge-case register and per-story edge cases → `references/edge-case-catalog.md`
- Stories, acceptance criteria, tests, DoD → `references/stories-ac-tests.md`
- Session protocol and Epic 0 → `references/session-protocol.md` and the files in `assets/`

Writing mechanics that matter:

- **Write in chunks.** Create the file with the cover and table of contents, then append one major section per write operation. A hundred-page document written in one output gets truncated or rushed; a document written section by section keeps its quality to the end.
- **IDs everywhere.** Personas `P1…`, flows `F-01…`, screens `S-01…`, copy lines `CP-<screen>-<n>`, entities `ENT-…`, epics `E00…`, stories `E03-S02`, criteria `AC-1…` inside a story, open questions `OQ-01…`, edge cases `EC-<cat>-<n>`. The linter and the future build sessions rely on them.
- **Machine-facing text in English, human-facing prose in the user's language** (details in Language convention). Every heading carries an English anchor so the linter and the coding agent can find sections regardless of prose language.
- **Depth beats brevity here.** The user has said a 100-page file is fine. The right length is whatever leaves no story, screen, copy line or edge case unspecified. Cut repetition, not content.
- **Every decision names its losers and its price.** Stack, architecture style, design system, auth model, data model: state the alternatives considered, the deciding reason, and *what the rejected option would have bought you*. A decision with no stated cost was not a decision.
- **Decide the shape before the tools.** Architecture drivers → architecture style → technology. If a driver could not have changed the technology choice, the drivers are decoration.
- **Quality is specified, not assumed.** The gate, the review checklist and the metrics go in the document with concrete commands and thresholds, because the reviewer is often one person reading a diff an agent produced in a minute, and a standard invented at review time is a different standard every time.

### Phase 4 — Lint and deliver

Run the linter and fix everything it reports as an error (warnings are judgement calls — resolve or justify them):

```bash
python3 <this skill's folder>/scripts/lint_blueprint.py <path/to/blueprint.md>
```

It checks required sections, placeholder text (TODO/TBD/…), story ID uniqueness, that every story has Acceptance Criteria / Edge cases / Tests, that every epic has a Definition of Done, that every `[UNKNOWN → OQ-nn]` resolves to an Open Questions entry, that tech-stack rows carry evidence tags, that every persona is used by at least one story, and that a Sources section exists with URLs. It also checks the quality layer: that architecture drivers `AD-n` exist with measurable targets and are referenced by the style decision, that a `check` command and a review checklist are present in the Quality section, that fitness functions are declared, and that no banned productivity metric (lines of code, commits per engineer, coverage as a target) appears.

Then do the human pass the linter cannot: read the Executive summary, one persona, one flow and one epic end-to-end as if you were a fresh session. Anything you had to infer, write down.

Deliver:

- In a chat surface with file tools: save under the outputs directory as `<product>-blueprint.md`, present it with the file-presenting tool.
- In Claude Code / Codex: save to `docs/BLUEPRINT.md` in the repo (or the path the user names) and also create `docs/PROGRESS.md`, `docs/DECISIONS.md` and `AGENTS.md` + `CLAUDE.md` from `assets/`, filled in for this product, so Epic 0 can start immediately.
- Wrap-up message: 5–10 lines. Point at the Assumptions table and the Open Questions, name the two or three things you are least sure about, and tell the user the next step is to open a fresh coding session and paste the Epic 0 session prompt from the document's appendix. Do not re-summarise the document.

### Language convention

- **Chat and human-facing prose** (executive summary, research narrative, persona descriptions, rationale columns, risks): the user's language.
- **Machine-facing text**: English, always — epic titles, story sentences, acceptance criteria, edge cases, test names, task lists, Definition of Done, architecture, data model, API contracts, conventions, session protocol, file names, IDs. This text is pasted into or read by a coding agent; English keeps it unambiguous.
- **Product copy** (UX writing tables, notification/SMS/email templates): the product's language(s), with an English gloss column so the agent understands intent. Iranian users → Persian copy following the Persian pack.
- **Headings**: bilingual when prose is not English, e.g. `## 11. راهنمای UX Writing (UX Writing)` — the English anchor must be present.
- State this convention once in the document's "How to use this document" section so the reader knows why the language switches.

If the user asks for a different split (all English, all Persian), honour it, but keep IDs and code-facing identifiers in English regardless.

### Detecting the market from the message

Look for: the language of the message, currency words (تومان، ریال، IRR), Iranian cities or provinces, Iranian services (Snapp, Digikala, Shaparak, Bale, Eitaa, Rubika, Zarinpal, Kavenegar…), `.ir` domains, Jalali dates, mentions of کد ملی, or explicit "کاربر ایرانی". Any of these → treat "users are in Iran" as the working hypothesis, confirm it in intake, and if confirmed load the Iran-specific parts of the research protocol, the UX writing guide and the edge-case catalog. Apply the same logic for any other specific market the message reveals (build the equivalent localisation pack from research if no prebuilt one exists).

### Design reference handling

If the user provides a reference (Figma, URL, screenshots, brand kit): extract tokens and patterns from it and document them as the design direction, noting where you deviate for usability or RTL. If not: choose a direction yourself — mobile-first, minimal, standard components, a well-documented design system verified via search — and say so in the Decision brief so they can object once. Never leave design "to be decided later"; the build sessions need concrete tokens and component decisions.

### Guardrails that override everything else

- If the idea involves strangers interacting, user-generated media, minors, payments, health or money advice: baseline safety (report/block/rate-limit, consent, audit) ships inside the same epic as the core loop, never as a later "nice to have". Say so in that epic's rationale.
- Legal, tax and regulatory matters are flagged as Open Questions for a professional, never answered.
- Keep moderation and abuse-prevention specs at the level of *what the system does*; never write bypass logic or filter word-lists.
- Never fabricate a source, a version number, a competitor feature or a metric. `[UNKNOWN]` is always an acceptable answer; a confident wrong answer never is.

## Examples

### Example 1: Full product from a two-line idea

```text
I want a Telegram bot that helps freelancers track invoices and nudges late clients.
Do the research, pick the stack, write me the PRD and epics so Codex can build it one epic at a time.
```

The agent runs a short search warm-up, asks one batch of intake questions with defaults, researches and benchmarks, posts the decision brief, waits for "go", then writes the blueprint section by section and lints it.

### Example 2: Internal tool with a smaller scope

```text
An internal tool for our 12-person support team to tag and search customer emails from Gmail,
nothing fancy. Give me the full spec with acceptance criteria and tests.
```

### Example 3: Iranian market (Persian prose, English machine-facing text)

```text
یه اپ می‌خوام که رستوران‌های تهران بتونن منوی QR داشته باشن و مشتری از سر میز سفارش بده و با زرین‌پال پرداخت کنه. برام کامل پلن کن که با Claude Code بسازم.
```

The market cues (Persian, Tehran, Zarinpal) make "users are in Iran" the working hypothesis; the agent confirms it in intake and loads the Iran-specific research, UX writing and edge-case material.

### Example 4: Lint the finished blueprint

Run from this skill's folder, pointing at the blueprint file:

```bash
python3 scripts/lint_blueprint.py docs/BLUEPRINT.md
```

Exit code 0 means no errors (warnings may remain); add `--strict` to fail on warnings as well.

## Best Practices

- ✅ Ask one batch of intake questions with a default next to each, then wait for the answers.
- ✅ Tag every external claim `[VERIFIED — source, date]`, `[ASSUMED — why]` or `[UNKNOWN → OQ-nn]`.
- ✅ Derive the architecture drivers before choosing the stack, and name what each rejected option would have bought.
- ✅ Write the document in chunks, one major section per write, and run the linter before delivering.
- ❌ Don't skip the decision brief checkpoint before writing a long document.
- ❌ Don't fill a research gap with a plausible guess; route it to Open Questions.

## Limitations

- Needs web search to meet its no-hallucination bar. Without web access the blueprint is delivered with every external fact marked `[UNVERIFIED]` and a warning on the cover.
- A whole product typically takes 20–60 searches and a long writing phase, so it is slow and token-heavy compared with a quick PRD.
- Legal, tax and regulatory questions are flagged as Open Questions for a professional, never answered.
- The prebuilt localisation pack covers Iran; other markets get their localisation built from research during the run.
- `scripts/lint_blueprint.py` checks structure and cross-references, not whether the research is correct; the human read-through in Phase 4 is still required.
- The skill plans the build; the code is written later in separate coding sessions that follow the blueprint.

## Security & Safety Notes

- The only command the skill runs is the bundled linter, `python3 scripts/lint_blueprint.py <blueprint.md>`. It uses the Python standard library, reads the one file it is given, prints findings and makes no network calls.
- Web research uses the harness's own search and fetch tools; the skill needs no API keys or credentials. Search queries describe the idea, so ask before searching for details the user marks as confidential.
- It creates Markdown files only: the blueprint, and in Claude Code / Codex also `docs/PROGRESS.md`, `docs/DECISIONS.md`, `AGENTS.md` and `CLAUDE.md`. If any of these already exist, show the proposed changes and merge them with the user's approval instead of overwriting.
- It does not delete files, install packages, push, or deploy.

## Common Pitfalls

- **Problem:** The stack is chosen first and the architecture drivers are written to justify it.
  **Solution:** Run research track C (drivers and shape) before D (stack), and check that at least one driver could have changed the technology choice.
- **Problem:** A hundred-page document written in one output gets truncated or rushed.
  **Solution:** Create the file with the cover and table of contents, then append one major section per write.
- **Problem:** "Use X or Y" leaves the decision to a build session with less context.
  **Solution:** Decide, record the alternatives, and state why they lost.

## Related Skills

- `@spec-driven-development` - Lighter spec-before-code workflow when deep research and benchmarking are not needed.
- `@to-prd` - Turns an existing conversation into a PRD without an interview or research phase.
- `@planning-and-task-breakdown` - Breaks an existing spec into ordered implementation tasks.
- `@brainstorming` - Explore and shape the idea before committing to a blueprint.

## Additional Resources

- [idea-to-blueprint on GitHub](https://github.com/iniesohidham/idea-to-blueprint)
