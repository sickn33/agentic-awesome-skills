# Audit report template

`audit` writes its output to `.lore/audit/audit-YYYY-MM-DD.md`. This file is read-only with respect to `.lore/*.md` (see main `SKILL.md` Conflict resolution — audit never mutates and never ALERTs).

## Template

```markdown
# Memory Audit Report

> Date: 2026-07-09
> Total entries audited: <N>
> Findings: <X> CONFLICT, <Y> STALE, <Z> UNVERIFIED

## Global (`_global/`)

### CONFLICT
- [DEC-2026-01-20-b1e8] claims "all packages TypeScript strict mode"
  Evidence: `packages/legacy/tsconfig.json` has `"strict": false`
  Note: entry `DEC-2026-01-20-b1e8` carries `#superseded-by:DEC-2026-03-15-c5e1`; if the chain is intact, treat the conflict as a chain-resolution case (see `references/entry-format.md#superseded-by-chain`).

### STALE
- [ARCH-2026-01-15-d7a3] references `nx.json`
  Evidence: file no longer exists at repo root

### UNVERIFIED
- [DEC-2026-02-03-7c19] last verified 2025-09-12 (>90 days)

## Scope: frontend

### CONFLICT
- ...

### STALE
- ...

### UNVERIFIED
- ...

## Summary

Recommended action: run `lore sync` to address these findings.
Audit itself does not modify any entry.
```

## Severity definitions

| Severity | Meaning |
|---|---|
| `CONFLICT` | Code/config directly contradicts the entry content (e.g. memory says `react@18`, `package.json` says `16`). If the entry is in a `#superseded-by` chain, check whether the chain resolves the conflict before reporting. |
| `STALE` | Entry references a resource (file, API, version) that no longer exists |
| `UNVERIFIED` | Entry's reference date — `#verified` if present, else `#added` — is >90 days; needs re-confirmation |
| `BROKEN_CHAIN` | Entry carries `#superseded-by:<id>` but `<id>` is not present in `.lore/` |

## Broken chains

If `audit` finds an entry tagged `#superseded-by:<id>` but `<id>` does not exist anywhere in `.lore/`, surface as a `BROKEN_CHAIN` finding under the scope containing the orphan. Example:

```markdown
## Scope: backend

### BROKEN_CHAIN
- [DEC-2026-07-10-ee31] carries `#superseded-by:DEC-2026-07-10-e45d`
  Evidence: target ID `DEC-2026-07-10-e45d` not found in any `.lore/*.md`. The replacement entry was never written (or was deleted, which lore does not normally do).
  Recommended action: write the replacement entry, or remove the `#superseded-by:` tag.
```

This severity is distinct from `CONFLICT` because the entries don't disagree — one is just orphaned.

## Required rules

- The audit report **never** modifies any `.lore/*.md` file.
- The audit report **never** emits ALERT blocks (ALERT noise is contained to `sync` and `query`).
- Audit is a pure read-and-report operation. To act on findings, the user runs `sync`.

## Evidence format

Each finding includes a one-line `Evidence:` reference pointing to the file path and (when possible) line number that triggered the finding. The agent must verify the evidence exists before writing the report.
