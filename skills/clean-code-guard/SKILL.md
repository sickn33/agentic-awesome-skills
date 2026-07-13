---
name: clean-code-guard
description: "Review generated code for Clean Code, SOLID, DRY/KISS/YAGNI, and LLM-specific failure modes."
risk: safe
source_repo: amElnagdy/guard-skills
source: "https://github.com/amElnagdy/guard-skills"
---

## When to Use

Use when reviewing AI-generated or human-written code for Clean Code principles, SOLID violations, DRY/KISS/YAGNI adherence, and common LLM-specific failure modes.

# clean-code-guard

You are reviewing generated or changed code before it ships. Apply the rules below as a guard pass after the first implementation pass — and once this skill is active, keep applying it to every later code change in the same session, re-running the self-check before delivery after each edit rather than reverting to unguarded output because the skill loaded earlier. If the user explicitly invokes this skill before writing code, use the same rules while writing and still run the self-check before delivery.

## Compatibility

This is a portable instruction skill. It requires no MCP server, network access,
API key, shell command, local executable, or bundled script. It can be used in
any runtime that supports `SKILL.md` plus directly linked [references/](references/)
files; `agents/openai.yaml` is lightweight display metadata.

This skill does not replace project linters, formatters, type checkers, or test
runners. Use the project's own tools for mechanical verification; use this skill
for the judgement layer around code quality and review.

## How to use this skill

This skill has three modes — pick based on the user's request.

**Guard-pass mode** (recommended): after code has been generated, edited, refactored, or fixed, check the diff or target files against the *Always-applied imperatives* below. Fix violations before presenting, committing, or merging the work.

**Live mode** (explicit): when the user invokes this skill before a risky code edit, apply the same imperatives while writing, then run the *Self-check before delivery* checklist. If you violate any rule, fix it before showing the user.

**Review mode** (triggered when the user asks you to review, audit, critique, or rate code): walk [references/review-checklist.md](references/review-checklist.md) against the target file(s) and produce a structured findings report. Do not edit code in review mode unless asked.

Across all three modes, the rule bodies live in [references/](references/). Read the relevant reference file when:
- You hit a rule you don't fully remember the reasoning for.
- The user pushes back on a rule and you need the source citation.
- You're in review mode and need the full checklist.
- The code under review touches a specific principle (e.g., subclassing → [references/solid.md](references/solid.md); deduplication → [references/dry-kiss-yagni.md](references/dry-kiss-yagni.md)).

The reference files are:
- [references/naming-and-functions.md](references/naming-and-functions.md) — names, function size, parameters, command/query separation.
- [references/comments-and-formatting.md](references/comments-and-formatting.md) — when to comment, when to delete, matching neighbor style.
- [references/solid.md](references/solid.md) — SRP, OCP, LSP, ISP, DIP with the modern phrasings and detection smells.
- [references/dry-kiss-yagni.md](references/dry-kiss-yagni.md) — knowledge vs code duplication, Sandi Metz's re-inline rule, McCabe complexity, Fowler's YAGNI cost categories.
- [references/ai-failure-modes.md](references/ai-failure-modes.md) — the 14 systematic ways LLMs produce bad code. **Read this one first if you are an AI agent reading this skill.** It is the highest-leverage file in the skill.
- [references/review-checklist.md](references/review-checklist.md) — structured walk-through for review mode.
- [references/sources.md](references/sources.md) — central bibliography for source URLs. Read it only when you need to verify or cite an external source.

## Examples

- A coding agent implements an endpoint: use guard-pass mode on the diff before
  the work is presented or committed.
- User asks "review this PR" or "should I merge this?": use review mode and
  report findings from [references/review-checklist.md](references/review-checklist.md); do not edit unless
  asked.
- User asks "implement this endpoint using clean-code-guard": use live mode
  while writing, then run the self-check before delivery.
- User asks "refactor this function, same behavior": preserve observable
  behavior exactly and treat any bug fix as a separate change.

## Success criteria

This skill is working when code-writing tasks avoid the listed failure modes,
code-review tasks produce prioritized findings with concrete evidence, and
refactors preserve behavior unless the user explicitly asks for a behavior
change. It should stay silent for conceptual, CI, git workflow, prose, data
analysis, and test-running tasks covered by the frontmatter exclusions.

## Why this skill exists

LLM-generated code has measurable, systematic failure modes that generic "follow clean code" instructions do not catch. Examples backed by published research:

- **Code duplication grew 8x** in tracked codebases between 2021 and 2024 (GitClear 2025 report).
- **Package hallucination rate averages 19.6%** across 16 models (Spracklen et al., USENIX Security '25).
- LLMs often wrap risky operations in broad catch-all handlers that swallow errors (Karpathy).
- AI agents **"declare success despite failing tests"** by returning hardcoded fixture values (Fowler, Patterns for Reducing Friction).
- Function size grew from 142 to 267 LoC, cyclomatic complexity from 4.2 to 8.1 in AI-assisted commits (GitClear).

The classic principles (Clean Code, SOLID, DRY/KISS/YAGNI) are still the foundation — but this skill adds the *AI-specific* layer most rule packs miss.

## Always-applied imperatives

These are the rules to follow on every code change. They are imperative, not suggestions.

### Functions and names

1. **Names reveal intent.** Never use `data`, `data2`, `result`, `result_final`, `item`, `temp`, `value`, `obj`, `info`, `helper`, `manager`, `utils`, or `handle_*`/`process_*`/`do_*` without a qualifier. A name must answer *why it exists and what it does*. (Clean Code Ch. 2)
2. **Functions stay small.** Target ≤20 lines, one level of abstraction, one thing. If you can extract a function with a name that doesn't restate the body, the parent was doing more than one thing. (Clean Code Ch. 3)
3. **Four arguments is the hard ceiling.** At five, stop and introduce a request/config object (record, struct, DTO, or equivalent). Never use boolean flag arguments — split into two functions instead.
4. **No output arguments.** A function either returns a value (query) or has a side effect (command). Never both. Command names use verbs; query names use nouns or getter-style names. (CQS)

### Comments and structure

5. **Comments explain *why*, never *what*.** Delete any comment that paraphrases the line below it. Delete step-number scaffolding comments. Delete commented-out code — version control exists. (Clean Code Ch. 4)
6. **Match the file's existing style.** Read the file you're editing and at least one neighbor before writing. Mirror the casing, import order, error handling, logging, and HTTP/DB client choices. Do not introduce a second pattern.

### SOLID

7. **One actor per module.** A class should be answerable to one stakeholder group (Accounting, Auth, Reporting). If two unrelated subsystems both reach into the same class, split it. (SRP, Uncle Bob 2014)
8. **Extension via new code, not edits.** If adding a new variant requires another type-tag branch in an existing function, refactor to a registry, strategy, or polymorphic dispatch first. (OCP)
9. **No subclass refuses its parent's contract.** Never override a method to signal "not implemented" or "unsupported operation." Never strengthen preconditions or weaken postconditions in an override. If you need to do that, the inheritance is wrong. (LSP)
10. **Abstractions live with the client, not the implementation.** When you introduce an interface, protocol, or abstract contract, put it in the package that consumes it, not next to the concrete class. (DIP)

### DRY, KISS, YAGNI

11. **Delete duplicated *knowledge*, not duplicated *text*.** Two functions that look alike but encode different rules are not a DRY violation. One rule expressed in code + docs + schema is. (Pragmatic Programmer, "DRY")
12. **The wrong abstraction is worse than duplication.** If an abstraction has accumulated branches for each caller's special case, re-inline it back into callers, then delete the dead branches before re-abstracting. (Sandi Metz, "The Wrong Abstraction")
13. **Complexity ceiling: cyclomatic ≤10, nesting depth ≤5.** Refactor before exceeding. (McCabe 1976)
14. **No speculative anything.** No optional parameter, config flag, env var, feature toggle, interface, factory, or base class without a present-day caller. If you find yourself adding `enable_*`, `use_*_v2`, or `*_mode`, delete it and ship the concrete behavior. (Fowler, "Yagni")

### AI-specific guardrails — the highest-leverage section

15. **Never swallow errors with broad catch-all handling.** Catch only the specific error type you can recover from. If you cannot recover, let the error propagate. Returning null/none/empty success from a catch handler is forbidden unless the function contract documents that behavior. (Karpathy)
16. **Guard the boundary; trust the contract.** At a trust boundary — external input, request/API payloads, deserialized or cross-process data, anything from an untrusted source — validate, even when the happy path looks fine. *Inside* the boundary, do not add null checks or runtime type checks for values whose declared type or caller contract already excludes that case. The test for a guard is not "could this theoretically be wrong" but "can untrusted data reach here." (arXiv 2409.19182)
17. **Verify every import and external call.** Before calling a method on a library, confirm it exists in the version installed (read the package, check the lockfile, or import and inspect). Do not generate code based on what the API "should" look like. (USENIX Security '25)
18. **No hardcoded "success" returns or mock fixtures in production code.** Never return `{"status": "ok", ...}` or canned data from a function whose spec says it does real work. If you cannot implement, fail explicitly with the language's unimplemented or unsupported-operation mechanism and say so. Never disable, skip, or weaken a test to make it pass. (Fowler, Claude Code issue #6984)
19. **Re-derive, do not copy from similar.** When tempted to copy a function and modify it, stop. Re-derive from the spec. Off-by-one and wrong-null-semantic bugs almost always enter through copy-from-similar. (arXiv 2411.01414)
20. **Enumerate boundary cases before writing them.** For any range, off-by-one, null/empty/one/many, even/odd, or unicode/byte boundary, write the case list in a comment first. Cover each case in code before moving on.
21. **Strip dead code before delivery.** Run a linter or grep pass for unused imports, unused symbols, unreachable branches, and "just in case" exports. Remove them. A function that nothing calls today does not get to live for "someday."
22. **Read before write.** Before writing in an unfamiliar repo, read the file you'll edit, one neighbor, and any project rules file (CLAUDE.md, AGENTS.md, README's "conventions" section). Use the project's existing helpers, error types, and logging.
23. **No new dependency for what a few lines cover.** Before adding a package, check the standard library, the already-installed dependencies, and whether a few lines of local code do the job. A new dependency is permanent maintenance and supply-chain surface; add one only when it owns real complexity you should not re-implement (cryptography, parsing, time zones — illustrative, not exhaustive), never to save ten lines. See [references/dry-kiss-yagni.md](references/dry-kiss-yagni.md).

### The floor — never cut these for simplicity

Rule 16 trusts the contract *inside* the boundary; the items below stay even while you strip speculation (14), defensive guards (16), and dead code (21). Removing one of these is a behavior change, not a cleanup — keep it, or flag it and ask.

- **Validation and sanitization at every trust boundary** — external input, request/API payloads, deserialized or cross-process data.
- **Error handling that prevents data loss.**
- **Security measures** — authorization, output escaping, parameterized queries, secret handling.
- **Behavior the user explicitly requested.** Idly mentioned ≠ requested, but do not drop what was asked for.

### Refactoring discipline

24. **Preserve observable behavior when refactoring.** When the user asks you to clean up, simplify, or refactor existing code, do not change the contract — same inputs produce the same outputs, same exceptions raised, same side effects, same ordering guarantees. If you spot a bug while refactoring, flag it separately and ask before changing it. Refactoring is defined as *"a change made to the internal structure of software to make it easier to understand and cheaper to modify without changing its observable behavior"* (Fowler, *Refactoring*). Bug fixes and refactors are two operations — never bundle them in a single change.

## Self-check before delivery

Before you show the user the code you wrote or edited:

1. Walk imperatives 1–24 against your diff. Fix every violation.
2. For new functions, count: lines ≤ 20? params ≤ 4? complexity feels ≤ 10? names reveal intent?
3. For new comments, ask: does this explain *why*? If it explains *what*, delete it.
4. For new error handling: is the caught error type specific? Does the handler do something other than silently return?
5. For new abstractions (interface, factory, base class, registry): is there a second concrete user *today*? If no, inline it.
6. Did you read the file you edited and at least one neighbor? Did your style match?
7. Is there any hardcoded "ok" return or fixture data? If yes, replace with real implementation or an explicit unimplemented/unsupported-operation failure.
8. If this is a refactor: did you change observable behavior? If yes, you bundled a bug fix — split it out and ask the user.

If you cannot answer yes to every check, fix before shipping.

After the guard pass, surface it so the user can see it ran (guard-pass and live modes — review mode reports through its own findings format). List each fix as `<file>[:<line>] — <what changed>`, omitting the line number if it is unstable, then close with one line: `clean-code-guard: <N> fixed, <M> flagged for author` — or `clean-code-guard: clean` if nothing triggered. Report only changes you actually made; never estimate a quality score or percentage — no baseline exists, so such a number would be invented. This reports the pass; it does not block presenting or committing.

## When the user pushes back on a rule

Refer them to the source name in the relevant [references/](references/) file and use [references/sources.md](references/sources.md) only when the URL is needed. The rules are defensible — they come from primary sources (Uncle Bob, Fowler, Hunt & Thomas, McCabe, Metz) and from published 2024–2026 research on LLM code generation. If the user has a context-specific reason to override (e.g., a constructor genuinely needs 8 params for a config DTO), document the exception in a code comment that names the principle being overridden, the reason, and a revisit trigger — the condition under which it should be reconsidered. An exception comment with no revisit trigger is itself a finding on the next pass: a tradeoff with no exit is just deferred debt.

## Troubleshooting

- If the task is conceptual rather than code-producing, do not apply this skill;
  answer the concept directly.
- If review mode starts producing style-only feedback, use
  [references/review-checklist.md](references/review-checklist.md) and prioritize behavioral bugs, brittleness,
  and maintainability risks.
- If a rule conflicts with an explicit project convention, follow the project
  convention and document the exception only when it would otherwise surprise a
  future maintainer.
- If the skill feels too broad, use the frontmatter exclusions first; do not add
  runtime-specific rules to this general guard skill.

## What this skill does not do

- Run linters or static analysis. Those are tool-level concerns; this skill is about *what to write* and *what to look for*.
- Enforce language-specific formatter or linter preferences. Defer to the project's style tooling.
- Replace tests. Clean code passes tests; tests do not pass without clean code, but clean code without tests is also a defect.
