# LWC Basic Memory

## Use when

Use this document on first LWC use, when choosing scope, or when deciding among
context, search, page, source, Work, and View commands.

## Skip when

Skip it after the current working root and required command family are already
known. Do not reload it as a session tax.

## Minimum workflow

1. Bootstrap once, then invoke the globally installed `lwc` command directly.
   The returned absolute `lwc_path` is diagnostic evidence, not a routine shell
   variable.
2. Recall bounded context with `context --limit 25` and one task-specific
   `search --limit 20`.
3. Open 1-5 matching pages with `page show`. Inspect immutable evidence with
   `source show` only for claims actually used.
4. Choose the smallest command family:

   | Need | Command family |
   | --- | --- |
   | Recent project state | `context` |
   | Find compiled knowledge | `search`, then `page show` |
   | Exact source evidence | `search --type source`, `source show` |
   | Add/update durable knowledge | `page put`, source lifecycle, changeset |
   | Background migration/projection/maintenance | `work` |
   | Read-only browser inspection | `view` |

Project scope stores project facts. Global scope stores stable cross-project
knowledge. `--scope all` merges supported reads; it is not a write target.

Search is page-first. Use `--granularity sentence` or `passage` only when a
document result is too coarse. Use `span get`/`span expand` for exact context and
treat `stale_span` as a revision boundary rather than fuzzy-remapping it.

## Consent boundaries

A missing project Wiki requires consent on automatic Skill activation. Explicit
`$using-lwc` invocation authorizes initialization inside the already-authorized
active project root. View remains foreground, loopback-only, and read-only.

## Completion evidence

- Bootstrap reports one in-scope project with no scope conflict.
- Recall stayed bounded and opened only relevant pages/sources.
- Every mutation used one exact scope and returned a structured receipt or Work.
- The primary task completed without broad memory loading.
