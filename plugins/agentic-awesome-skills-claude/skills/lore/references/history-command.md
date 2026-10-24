# `lore history` — full specification

Read-only command. Lists git commits related to a memory entry, a file,
or a scope, since the entry's `#added` date. Output to stdout only;
never writes to `.lore/`.

## Synopsis

```
lore history <entry-id>
lore history <file-path>
lore history --scope=<name>
lore history --since=<YYYY-MM-DD>
lore history --follow-superseded
lore history --json
```

## Forms

| Form | Argument shape | Example | Behavior |
|---|---|---|---|
| Entry | `[A-Z]+-\d{4}-\d{2}-\d{2}-[a-f0-9]{4}` | `lore history DEC-2026-02-03-7c19` | Locate entry in `.lore/`, derive its `#added` date and code file, then `git log` since that date. |
| File  | contains `/` or starts with `.` | `lore history frontend/src/store/index.ts` | Run the full `git log` on the given path unless `--since` is provided. |
| Scope | `--scope=<name>` only | `lore history --scope=frontend` | For each `*.md` in `.lore/scopes/<name>/`, run file form on the lore file path itself. |

### `--follow-superseded`

When set on the entry form, prints not just the requested entry's git history, but the history of every entry in its `#superseded-by` chain (starting entry first, then successive replacements). Stops when an entry has no `#superseded-by` tag or the chain reaches a non-existent ID. Output prepends a `## Chain` section listing each entry's ID and file path before the per-entry `git log` blocks.

Example:

```
$ lore history --follow-superseded DEC-2026-07-10-ee31

# history: [DEC-2026-07-10-ee31] --follow-superseded

## Chain
1. [DEC-2026-07-10-ee31] (scopes/backend/DECISIONS.md) — SHA-256 + salt
   → superseded-by → DEC-2026-07-10-e45d
2. [DEC-2026-07-10-e45d] (scopes/backend/DECISIONS.md) — bcrypt (rounds=12)
   → no successor

# history: [DEC-2026-07-10-ee31]

> Entry: scopes/backend/DECISIONS.md
> Since: 2026-07-10
> File: backend/app/auth.py
> Commits: 3 (showing all)

...
```

## Code-file resolution (entry form)

Priority:

1. First backtick-quoted path in entry.text that looks like a file
   (e.g. `src/store/index.ts`).
2. Scope directory at the project root (e.g. entry scope `frontend` →
   `frontend/`).
3. Project root `.` for entries in `_global/`.

If the regex finds no path, falls back to the scope directory.

## Data source

`git` CLI only. No network calls. Requires:

- A git repository at or above the current working directory.
- The `git` executable on `PATH`.

## Output

### Markdown (default)

Header block: `Entry`, `Since`, `File`, `Commits`. One section per
commit with `## <short-hash> (<date>, <author>)`, subject, optional
`Body:` line, optional `Refs:` line. A "Suggested next step" footer
appears only when at least one commit is found.

### JSON (`--json`)

```json
{
  "entry_id": "DEC-2026-02-03-7c19",
  "lore_file": "scopes/frontend/DECISIONS.md",
  "code_file": "frontend/src/store/index.ts",
  "since": "2026-02-03",
  "since_source": "entry_added",
  "chain": null,
  "commits": [
    {
      "hash": "...",
      "short": "abc1234",
      "author": "alice",
      "date": "2026-04-12",
      "subject": "Use Zustand v4",
      "body": "Migrate notes here.",
      "refs": ["#234"]
    }
  ]
}
```

When `--follow-superseded` is set, `chain` is an array of `{entry_id, lore_file, code_file, since}` for each successor; otherwise `null`.

## Error handling

| Condition | Exit code | Message |
|---|---|---|
| No argument | 2 | `error: missing argument` |
| Unrecognized argument | 2 | `error: unrecognized argument: <arg>` |
| `.lore/` not found | 2 | `error: .lore/ not found. Run 'lore init' first.` |
| Entry not in index | 3 | `error: Entry <id> not found. Available: ...` |
| Not a git repo | 4 | `error: Not a git repository. ...` |
| `git` missing | 5 | `error: git executable not found on PATH.` |
| Bad scope name | 6 | `error: Scope '<name>' not found. Available: ...` |
| `git log` failure | 7 | `error: git log failed: <stderr>` |
| Entry missing `#added` | 0 (warning) | `warning: entry has no #added tag; using full history` |

## Exit codes summary

- `0` — success (including "0 commits found" case)
- `2` — usage / configuration error
- `3` — entry lookup failure
- `4` — not a git repo
- `5` — git CLI missing
- `6` — invalid scope
- `7` — git command failed

## Why this exists

`lore sync` reads `git diff` (working-tree deltas). It never reads
commit history. `lore history` fills that gap: given a memory entry,
it shows the commits that introduced or modified the underlying code,
letting the agent answer "why does this decision exist?" with a pointer
to the original commit instead of an LLM-generated guess.

## Date normalization and bounds

Date-only inputs are validated and normalized to `YYYY-MM-DDT00:00:00+00:00` (UTC). Timestamp inputs must be valid ISO timestamps. This is deterministic across hosts; it does not recover the timezone of a historical #added date. For author-local dates near midnight, use an explicitly earlier --since and inspect commit timestamps.

File and scope queries without --since, and entries without #added, omit the Git date filter. Metadata can retain the old epoch marker for compatibility; it is not a filter. Each query returns at most 200 commits, so an output at that cap may be incomplete. Supersede chains follow the starting entry forward, stop on cycles/missing IDs, and are capped at 20. Duplicate IDs fail inventory instead of selecting an arbitrary scope.

History paths are literal and repository-relative; traversal, absolute paths and Git magic pathspecs are rejected. Scope names are a single validated directory segment. Git subprocesses have a 30-second timeout. The source-file inference is a heuristic association: a scope alias may not match its actual source directory. Use an explicit file query when that mapping is uncertain; zero matches do not prove absence of history.
