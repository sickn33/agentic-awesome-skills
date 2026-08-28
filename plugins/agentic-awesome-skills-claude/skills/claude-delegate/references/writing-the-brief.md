# Writing the brief

A brief carries the task-specific context from the orchestrator to the separate Claude Code session.
The implementer has **no orchestrator chat history or other shared context**. It receives the brief on
stdin, can inspect the target working tree, and loads Claude Code's usual local context as described
below. A resumed session also retains its own Claude conversation.

If a fact is not in the brief, discoverable in that tree, or present in the loaded Claude context, do
not assume the implementer knows it.

## Know what Claude loads

The relay deliberately does not use `--bare`, so Claude Code discovers the project's `CLAUDE.md`,
normal local Claude settings, and session state in its usual way. The relay overrides a small,
inspectable subset for the child: MCP servers are not discovered, skills and commands are disabled,
and the built-in tool surface is restricted. Local hooks still load; account for any repository
effects they are configured to perform.

Claude Code does **not** generically auto-load `AGENTS.md`. Before writing the brief:

1. Read the applicable `AGENTS.md` files yourself.
2. Copy every load-bearing rule into the brief: scope boundaries, forbidden patterns, required
   commands, generated-file policy, and commit policy.
3. Name the real gates rather than telling Claude to "run the tests."

The implementer can read an `AGENTS.md` when the brief points to it, but that is explicit task context,
not automatic Claude Code behavior.

## A compact structure

Use a bounded, block-structured brief:

```xml
<task>
State the concrete job, current behavior, desired behavior, and where it lives. Name what must remain
untouched. Include any facts from the orchestrator conversation that the implementer cannot discover
from the tree.
</task>

<repo_constraints>
Copy the applicable load-bearing constraints from AGENTS.md and other project instructions here.
Claude also loads CLAUDE.md, but restate rules whose violation would invalidate the work.
</repo_constraints>

<verification_loop>
Run these exact project gates, fix failures caused by the change, and report the final outcomes:
  <actual test command>
  <actual lint/format command>
  <actual build/typecheck command>
Confirm the working tree contains only intended changes.
</verification_loop>

<action_safety>
Keep changes within the task. Do not perform unrelated cleanup. Do not run git add, git commit, or git
push. Do not invoke another Claude session or delegation skill. Leave all work uncommitted for the
orchestrator to review and land.
</action_safety>

<structured_output_contract>
End with:
  1. What changed and why
  2. Files touched
  3. Gate outcomes, including useful counts
  4. Deviations, open questions, and decisions the orchestrator should review
</structured_output_contract>
```

Remove empty blocks rather than adding ceremony. Add focused blocks when needed:

- **Debugging:** `<completeness_contract>` to require a full root-cause fix, and
  `<missing_context_gating>` to prohibit guesses about missing repository facts.
- **Read-only diagnosis:** `<grounding_rules>` to require file/line or command evidence and clearly
  label inference. Dispatch with `--read-only`.
- **Migration or removal:** an explicit repository-wide search and round-trip requirement.

## Discover the real gates

Read the repository's `CLAUDE.md`, `AGENTS.md`, `Makefile`, package scripts, and language tooling before
dispatch. Copy exact commands into `<verification_loop>`. Include required setup and the narrowest
useful test slice, but do not replace a required full gate with a guessed shortcut.

`acceptEdits` alone does not approve ordinary gate commands in non-interactive mode. On supported
platforms the normal relay profile auto-approves commands that stay inside Claude's shell sandbox and
requests failure when that sandbox is unavailable. A gate that needs network access, host services,
or writes outside the working tree may fail under that profile; state the need in the brief and decide
whether a different isolated environment is appropriate instead of silently weakening the boundary.
Merged local or managed settings can affect the effective sandbox. Native Windows pre-approves
PowerShell without that sandbox; see [dispatch-and-poll.md](dispatch-and-poll.md).

## One task per brief

One brief → one separate Claude session → one reviewed commit keeps scope and rollback clear. Split a
mixed request such as "fix the bug, redesign the API, update unrelated docs, and propose a roadmap"
into separate dispatches.

Use a resumed session only for rework on the same task. Start unrelated queue items in fresh sessions.

## Premises freeze at dispatch

There is no steering channel while the relay is running. Audit ownership, scope, branch, constraints,
and expected behavior before dispatch. If a premise changes during the run, stop it and inspect the
working tree before sending a corrected brief. Do not discard partial edits before reviewing them.

## Delta briefs for resumed sessions

`--resume-last` maps to Claude's `--continue`; `--session <id>` maps to `--resume <id>`. Both retain the
conversation, so send only what changed:

```xml
<review_delta>
The implementation behavior is correct. Replace the test's mocked database session with the existing
migrated fixture, remove the unused import, run the same gates, and leave the tree uncommitted.
</review_delta>
```

The relay re-passes the selected permission profile on resume. A resumed run receives the same review
as a fresh run.

## Brief delivery

The relay reads `--brief <file>` or stdin, saves the exact text as `brief.txt`, and sends it to
`claude -p` through stdin — never as an argv value. It therefore stays out of the process list and
needs no shell quoting. Claude Code caps piped stdin at 10 MB; the relay rejects a larger brief before
dispatch. Put large context in workspace files and reference those paths instead.

## Worked example

```xml
<task>
In services/billing/, refund retries can create a second refund because the idempotency key is checked
after submission. Check for an existing refund before creating one. Touch only refund handling and
its behavior-level tests. Leave charge creation, routes, and data models unchanged.
</task>

<repo_constraints>
Follow the repository's Python style and test conventions copied from AGENTS.md. Do not add ticket
identifiers to source comments. Do not add dependencies.
</repo_constraints>

<verification_loop>
Run and make green:
  pytest tests/billing/ -q
  ruff check services/billing/ tests/billing/
Confirm git status contains only the intended refund implementation and tests.
</verification_loop>

<action_safety>
No unrelated refactors. Do not git add, commit, or push; leave the work uncommitted.
</action_safety>

<structured_output_contract>
Report the root cause and fix, files touched, pytest and ruff outcomes with counts, and anything left
open or needing a decision.
</structured_output_contract>
```

Dispatch with [dispatch-and-poll.md](dispatch-and-poll.md), then review and land with
[review-and-land.md](review-and-land.md).
