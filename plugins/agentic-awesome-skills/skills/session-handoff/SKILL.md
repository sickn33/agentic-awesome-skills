---
name: session-handoff
description: "Use when context approaches capacity, before /clear or /compact, when switching tasks, or when ending a coding session: produces a structured handoff artifact for the next session."
category: productivity
risk: safe
source: community
source_repo: alapha888/session-handoff-kit
source_type: community
date_added: "2026-10-05"
author: alapha888
tags: [context-management, session-handoff, coding-agents, workflow]
tools: [claude, cursor, codex]
license: "MIT"
license_source: "https://github.com/alapha888/session-handoff-kit/blob/main/LICENSE"
---

# Session Handoff Skill

## Purpose
Large context windows degrade in instruction adherence, reasoning precision, and tool accuracy as token counts accumulate. Long sessions fill with superseded plans, aborted scratchpads, and repetitive error traces. Resetting to a fresh session restores performance, but discarding context blindly introduces state loss, hallucinated progress, and repeated mistakes. 

The `session-handoff` skill standardizes how an agent snapshots active state. It translates ephemeral working memory into an actionable, verifiable bridge document for the next session.

## When to Use This Skill

- Context usage approaches capacity (roughly >60%) and a reset is coming.
- Before running `/clear` or `/compact` in Claude Code, Cursor, or Codex.
- When switching tasks mid-session, or ending a coding session that another session (or agent) will continue.

---

## Workflow: Ending a Session (6 Steps)

Run this sequence when an agent session reaches operational limits or when halting work:

1. **Audit Git and Workspace State**
   Run `git status -s` and `git diff --stat` to establish grounded reality. Never rely on chat memory for what was modified. Identify modified, untracked, and staged files.

2. **Capture Goal State vs. Implemented Reality**
   Define the original objective in one sentence. Document precisely what has been verified as working (with passing test commands or runtime checks) versus what remains partial or unverified.

3. **Record Decisions Made and Discarded Paths**
   List architectural and design choices committed during the session, along with the concrete rationale. Explicitly record negative decisions (approaches tried and discarded) to prevent the next agent from re-attempting failed solutions.

4. **Catalog Files Touched and Relevant Symbols**
   List key file paths, functions, classes, and schema definitions modified or referenced. Include line references where relevant.

5. **Isolate Open Loops with Owners and Checks**
   List all unaddressed edge cases, failing tests, deferred tasks, and environment constraints. Every open loop must specify who resolves it (Human or Agent) and how completion is verified.

6. **Specify the Immediate Next Action**
   Draft a single, atomic, unambiguous instruction for the next agent to execute on turn one. Do not provide a broad list; specify the exact command to run or file to edit first.

---

## Operating Rules

- **Separate Facts from Speculation**: A test that passed is a fact; assuming code works because it compiled is speculation. Label untested assumptions explicitly as `[UNVERIFIED]`.
- **Mandate Owners and Verifications for Open Loops**: Every open loop must state an owner (`Human` or `Agent`) and a deterministic verification criteria (e.g., `pytest tests/auth/test_token.py:test_refresh_rotation passes`).
- **Ban Vague Continuations**: Never write "continue working on auth" or "finish frontend components." State the exact symbol, file, and failure mode.
- **Reference Real Workspace Identifiers**: All references to code must use exact file paths and symbol names. Do not use generalized pseudocode descriptions.

---

## Worked Example: Session Handoff Note

```markdown
# Session Handoff: JWT Rotation Implementation

### Goal & Current State
- **Target Goal**: Implement refresh token rotation and revocation in the FastAPI auth service.
- **Current State**: Refresh token database migration applied and rotation endpoint created. Token generation and database persistence work. Revocation blacklist cache is not yet wired into the dependency validator.
- **Verification**: `pytest tests/test_auth_tokens.py` passes (4/4 tests).

### Decisions Made (With Reasons)
- **Used Redis for Token Revocation List**: Selected Redis over Postgres lookups for revoked JTI tokens to keep latency under 5ms on protected routes.
- **Rejected Stateless Refresh Tokens**: We initially evaluated sliding expiration in JWT claims without persistence, but discarded it because compromised tokens could not be revoked before natural expiry.
- **Token Format**: Chose UUIDv4 for `jti` claim to maintain compatibility with existing session storage schemas.

### Files Changed
- `src/services/auth.py`: Added `rotate_refresh_token(old_token: str)` function and Redis invalidation call.
- `src/models/tokens.py`: Added `RefreshTokenRecord` SQLModel table for tracking token families.
- `alembic/versions/20261005_add_token_families.py`: Migration creating `token_records` table.
- `tests/test_auth_tokens.py`: Added unit tests for token family generation and rotation.

### Open Loops
- [Agent] Wire `verify_token_not_revoked` into `src/api/deps.py` -> Verify by checking `tests/test_auth_deps.py` fails on blacklisted token.
- [Agent] Handle database rollback if Redis is unreachable during rotation -> Verify by mocking Redis connection failure in unit test.
- [Human] Set `REDIS_AUTH_URL` secret in `.env.test` for CI execution.

### Next Action
Open `src/api/deps.py` and import `is_token_blacklisted` from `src.services.auth`. Insert the check into `get_current_user` directly after JWT decode verification.

### Watch-outs
- Do not modify the existing `access_token` expiration time (currently 15 minutes) in `src/core/config.py`.
- Alembic migration `20261005_add_token_families.py` must run before starting the API server locally (`alembic upgrade head`).
```

---

## Anti-Patterns

- **The Chat Transcript Dump**: Pasting raw conversation logs into the handoff note. The next session's context window is immediately polluted with the very conversational noise you intended to escape.
- **The Phantom Pass**: Marking a module "completed" when it has only been written, not executed or tested.
- **The Omitted Dead-End**: Leaving out solutions that failed. The next agent will read the codebase, see the same apparent path, and re-implement the failed approach.
- **The Abstract Next Step**: Ending with "Next: Implement remaining tests." The new agent spends 3-5 unnecessary turns discovering what needs testing.

## Limitations

- This skill produces a written handoff only; it cannot preserve live state such as running processes, uncommitted terminal output, or in-memory debugging context — record anything that matters explicitly in the note.
- Handoff quality is bounded by what the outgoing session records: decisions, dead-ends, or file changes that are not written down cannot be recovered by the next session.
- It does not replace version control or issue tracking; commit work first and reference commits or tickets in the note instead of duplicating them.
