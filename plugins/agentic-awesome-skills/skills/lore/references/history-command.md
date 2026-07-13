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
lore history --json
```

## Forms

| Form | Argument shape | Example | Behavior |
|---|---|---|---|
| Entry | `[A-Z]+-\d{4}-\d{2}-\d{2}-[a-f0-9]{4}` | `lore history DEC-2026-02-03-7c19` | Locate entry in `.lore/`, derive its `#added` date and code file, then `git log` since that date. |
| File  | contains `/` or starts with `.` | `lore history frontend/src/store/index.ts` | Run `git log --since=1970-01-01` on the given path. |
| Scope | `--scope=<name>` only | `lore history --scope=frontend` | For each `*.md` in `.lore/scopes/<name>/`, run file form on the lore file path itself. |

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