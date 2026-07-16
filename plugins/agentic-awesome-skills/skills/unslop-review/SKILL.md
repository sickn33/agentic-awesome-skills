---
name: unslop-review
description: 'Rewrites code review comments so they read like a human teammate wrote them. Cuts corporate-AI throat-clearing ("I noticed...", "I was wondering if perhaps...", "It might be worth considering..."). Each comment is direct: location, the issue, a concrete fix. Use when user says...'
risk: unknown
source: https://github.com/MohamedAbdallah-14/unslop/tree/main/plugins/unslop/skills/unslop-review
source_repo: MohamedAbdallah-14/unslop
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/MohamedAbdallah-14/unslop/blob/main/LICENSE
---

# Unslop Review
## When to Use

Use this skill when you need rewrites code review comments so they read like a human teammate wrote them. Cuts corporate-AI throat-clearing ("I noticed...", "I was wondering if perhaps...", "It might be worth considering..."). Each comment is direct: location, the issue, a concrete fix. Use when user says...


## Purpose

Rewrite or generate PR review comments that sound like a teammate, not a politeness engine. Direct on the issue, concrete on the fix, kind on the human.

## Trigger

`/unslop-review`, `/review`, "review this PR", "code review", "humanize review", "de-slop this comment", "make this feedback sound human". Auto-trigger when reviewing pull requests.

## Format

Default shape: `L<line>: <severity prefix> <observation>. <fix>.`

Severity prefixes (optional but use them when severity matters):
- `bug:` — code is broken or will break
- `risk:` — works today, fragile tomorrow (perf, race, missing test)
- `nit:` — style, naming, dead code, "while you're here"
- `q:` — genuine question, not a hidden complaint

Multi-file: `<file>:L<line>: <severity> <observation>. <fix>.`

Range: `L88-140: ...` when the issue spans lines.

## Rules

### Drop

- Throat-clearing: "I noticed that...", "It seems like...", "It looks like to me..."
- Stacked hedging: "I was wondering if perhaps we might want to potentially..."
- Polite-padding: "I would kindly suggest...", "just a small suggestion..."
- Per-comment praise: "Nice work on this function but...", "Great pattern, however..."
- Restating the diff: "Here on line 42 you have a function called `getUser` which returns..."
- Bare opinion without a fix: "This is bad" with no suggestion

### Keep

- Exact line numbers and ranges
- Identifiers in backticks: `findUser`, `req.body.id`
- Concrete fix or concrete question
- "Why" only when the fix isn't obvious

### Tone

Human, not corporate. "This throws if X" not "It may potentially be worth considering that this could throw under certain conditions." Calibrated uncertainty is fine ("I think", "probably") — performative softening is not.

### Auto-clarity (use full prose, not one-liners)

- Security findings (CVE-class, auth, secrets)
- Architecture disagreements that need a real discussion
- Onboarding context for a new contributor
- When the answer is genuinely "this is fine"

In those cases use a short paragraph, then resume terse for the rest.

## Examples

### Bad → good

- Bad: `I would kindly suggest that we might want to potentially consider adding a null check here as it could maybe lead to issues in some scenarios.`
- Good: `L42: bug: \`findUser\` returns undefined when no match. Guard before \`user.email\` or early-return 404.`

- Bad: `Great work on this implementation! However, I think we could potentially enhance readability by considering a refactor of this function.`
- Good: `L88-140: nit: this function does validation, I/O, and mapping. Splitting them would make the happy path easier to follow. Happy to pair on a cut if helpful.`

- Bad: `I noticed that there's no retry logic here which could be problematic.`
- Good: `L23: risk: no retry on 429. Wrap the call in \`withBackoff(3)\` so we don't drop legitimate requests.`

- Bad: `This implementation leverages a robust caching strategy.`
- Good: (delete — empty praise. If the caching is genuinely interesting, explain why specifically.)

### Approval

If the change is solid and you have nothing concrete: `LGTM` on its own line. No boilerplate.

## Boundaries

- Comments only. No commits, no `git push`, no auto-approve, no linter runs.
- Output is paste-ready: one comment per line, or a clearly separated list.
- Severity must be honest. Don't downgrade a `bug` to a `nit` to soften the message.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
