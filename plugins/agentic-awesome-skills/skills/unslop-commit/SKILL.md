---
name: unslop-commit
description: Rewrites commit messages so they sound like a careful human engineer wrote them. Strips AI/marketing slop ("comprehensive solution", "robust implementation", "leverage", "enhance", "seamlessly", "This commit..."). Keeps Conventional Commits format. Subject ≤72 chars (aim ≤50),...
risk: unknown
source: https://github.com/MohamedAbdallah-14/unslop/tree/main/plugins/unslop/skills/unslop-commit
source_repo: MohamedAbdallah-14/unslop
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/MohamedAbdallah-14/unslop/blob/main/LICENSE
---

# Unslop Commit
## When to Use

Use this skill when you need rewrites commit messages so they sound like a careful human engineer wrote them. Strips AI/marketing slop ("comprehensive solution", "robust implementation", "leverage", "enhance", "seamlessly", "This commit..."). Keeps Conventional Commits format. Subject ≤72 chars (aim ≤50),...


## Purpose

Generate or rewrite commit messages so they read like a real engineer wrote them at the end of a real day. Conventional Commits format. Direct, specific, no template English. Why over what.

## Trigger

`/unslop-commit`, `/commit`, "write a commit", "commit message", "humanize this commit", "de-slop this commit". Auto-trigger when the user has staged changes and asks for a commit message.

## Rules

### Subject line

- Format: `<type>(<scope>): <imperative summary>`
- Scope optional. Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`, `revert`.
- Imperative mood: `add`, `fix`, `move`, `remove` — not `added`, `fixes`, `fixing`.
- ≤50 chars when possible. Hard cap 72.
- No trailing period.
- Lowercase after `:` unless the project capitalizes.

### Body (only when subject can't carry it)

- Add for: non-obvious "why", breaking changes, migrations, security context, data integrity.
- Wrap at 72 chars. Bullets `-` for two or more independent points. Single paragraph for one thought.
- End with refs: `Closes #42`, `Refs #17`. No `BREAKING CHANGE:` unless truly breaking — and then write it.

### Never include

- Template prefixes: "This commit...", "This change...", "We are...", "I have..."
- Marketing verbs: comprehensive, robust, enhance, leverage, seamless, holistic
- Filler adverbs: just, really, basically, simply, actually
- Restating the filename when scope already names it
- "As requested by..." (use `Co-authored-by:` if you need attribution)
- AI attribution unless the project requires it
- Emoji unless project convention says so

### Auto-clarity (always include body)

- Breaking changes
- Security fixes
- Data migrations
- Reverts (cite the reverted commit)

## Examples

### Bad → good (slop subject, no body)

- Bad: `feat: implement a comprehensive, robust solution for user profile retrieval with enhanced error handling`
- Good: `feat(api): return profile fields the mobile client actually needs`

### Bad → good (vague body)

Bad:
```
fix: fixed the bug

This commit addresses an issue where the application was not working correctly
in some edge cases. We've improved the logic to handle these scenarios.
```

Good:
```
fix(checkout): ignore stale cart id from localStorage

Stale cart ids came from tabs that hadn't refreshed after a deploy. Server
now treats unknown ids as empty cart instead of 500.

Closes #842
```

### Breaking change

```
feat(api)!: rename /v1/orders to /v1/customer-orders

The old route stays in place until the next major release but logs a
deprecation warning. Internal services have been migrated.

BREAKING CHANGE: third-party integrations using /v1/orders directly need
to switch to /v1/customer-orders by 2026-07-01.

Closes #1290
```

## Boundaries

- Output the message only, in a single fenced block, ready to paste.
- Do not run `git commit`, stage, or amend.
- If the change is genuinely trivial (`docs(readme): fix typo`), keep it trivial. Don't pad.
- Never invent context the user didn't provide. If the "why" isn't clear, ask, or omit the body.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
