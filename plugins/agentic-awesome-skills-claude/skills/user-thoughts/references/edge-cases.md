# Edge Cases

Use these examples to keep behavior predictable.

## No Runtime Directory

User: `/ustht status`

Agent: `.ustht/ was not found. Run /ustht init first.`

## Skill Disabled

If `SKILL_STATUS=off`, write commands should not modify files. Read commands such as `status`, `raw`, and `mdbase show` may still run.

## Instant Mode Disabled

When `INSTANT_STATUS=off`, do not capture natural-language thoughts automatically. Explicit commands still run.

## Command Plus Thought

User: `Make buttons use 8px radius, and /ustht status`

Agent: run the command and record the UI preference if instant capture is enabled. Do not record the command text itself.

## Message Suffix Ignore

User: `This color experiment is temporary /ustht ignore`

Agent: do not write it to raw. Record it in `ignored/` as a suffix-ignored entry if ignore tracking is available.

## Ignore Interval

User: `/ustht ignore start`

Agent: enter ignore mode for the current context.

User: `Try three throwaway layouts.`

Agent: do not record the thought.

User: `/ustht ignore end`

Agent: exit ignore mode.

## Last Entry Ignore

User: `/ustht ignore --last`

Agent: remove the last unprocessed raw entry and append it to `ignored/`. If no entry exists, say so without failing.

## Processed Marker Mentioned by User

User: `Maybe we should use <!-- processed --> as a completion marker in docs.`

Agent: preserve that text as ordinary user content. `sortin` checks only the first line of raw files.

## Illegal Dimension Names

Reject dimensions containing spaces, `..`, backslashes, absolute paths, or unsafe characters.

Examples:

- Reject `../../../etc/passwd`.
- Reject `my file`.
- Accept `ui/details`.
- Accept `dev-stack`.

## Chained Commands

User: `/ustht skill on && instant on && status`

Agent: run commands left to right and report a compact summary.

## Import With No Relevant Content

If `/ustht import README.md` finds no project decisions, report that no entries were extracted and do not write empty dimension sections.

## Multi-Agent Writes

No file locks are provided. If multiple agents are active, coordinate before `sortin` or `resort` to avoid conflicting writes.

## Sensitive Content

If the user says a thought contains secrets or personal data, prefer ignore behavior and remind them that `.ustht/` is not automatically redacted.
