# Safety and Data Integrity

This document defines path safety, input validation, and data-integrity rules for `user-thoughts`.

## Path Safety

All runtime file operations must stay inside `#ustht/` unless an import command reads project-local markdown files.

Dimension names are used to construct paths, so validate them strictly:

| Rule | Reason |
|---|---|
| Each path segment uses `[a-z0-9-]` only | Prevents shell and path surprises. |
| Each segment starts and ends with `[a-z0-9]` | Avoids hidden or malformed files. |
| `/` is allowed only as a dimension subdirectory separator | Supports `ui/outline`. |
| `..`, backslashes, spaces, and absolute paths are forbidden | Prevents path traversal. |
| Reserved names are forbidden | Avoids collisions with runtime folders. |

Reserved names: `backlog`, `readme-ai`, `export`, `raw`, `ignored`, `define`, `general`.

## Content Safety

Raw entries use this format:

```text
- [HH:MM] original user text | suggested-dim:dimension
```

The suffix is agent-generated metadata. User text may contain markdown and should be preserved as written. Parse the last ` | suggested-dim:` separator only.

`<!-- processed -->` is meaningful only as the first line of a raw file. If the user mentions that string inside a thought, treat it as normal content.

## define.ini Safety

Allowed keys and values:

| Key | Allowed value |
|---|---|
| `SKILL_STATUS` | `on` or `off` |
| `INSTANT_STATUS` | `on` or `off` |
| `LAST_SORTIN` | empty or `yyyy-mm-dd HH:MM` |

Values must not contain newlines or `=`. Write the whole file rather than appending partial fragments.

## Shell Safety

- Do not execute user-provided shell commands.
- Do not use `eval` or dynamic execution.
- Construct file paths only from validated dimensions or fixed template paths.
- During initialization, copy known template files safely instead of recursively shell-copying arbitrary directories.

## Data Integrity

`sortin` is not fully atomic. To reduce partial-write risk:

1. Parse raw entries first.
2. Write dimension files.
3. Mark raw files as processed only after writes succeed.
4. Update `LAST_SORTIN` last.

Processed raw files are retained for traceability. Dimension files should be appended or marked deprecated; do not silently delete user history.

## Sensitive Data

The skill preserves original wording and does not redact secrets or personal data. Users should use ignore commands before sensitive content is captured, and teams should protect `.ustht/` with normal repository and filesystem hygiene.
