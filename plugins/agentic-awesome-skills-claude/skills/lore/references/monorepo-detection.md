# Monorepo detection rules

`init` needs to identify whether the project is a monorepo and how to split scopes. This file lists the detection rules per tool.

## Detection order

Check markers in this order; the first match determines scope layout:

1. pnpm workspaces
2. Yarn workspaces
3. npm workspaces
4. Lerna
5. Nx
6. Rush
7. Cargo workspaces
8. Go workspaces
9. Bazel

No monorepo marker → fall back to `_global/` only (single-scope project).

## Per-tool rules

### pnpm workspaces
- Marker: `pnpm-workspace.yaml` at repo root
- Read: `packages:` field, e.g. `packages: [frontend, backend, shared/*]`
- One scope per listed package directory

### Yarn workspaces (classic / berry)
- Marker: `package.json` top-level `workspaces` field
- Example: `"workspaces": ["packages/*"]`
- One scope per glob-resolved directory

### npm workspaces
- Same as Yarn (npm 7+ uses the same `package.json#workspaces` field)

### Lerna
- Marker: `lerna.json`
- Read: `packages` field (array of paths)
- One scope per path

### Nx
- Marker: `nx.json` or `workspace.json`
- Nx typically delegates package discovery to npm/yarn workspaces — read both
- One scope per resolved package

### Rush
- Marker: `rush.json`
- Read: `projects` array (each entry has a `packageName` and directory)

### Cargo workspaces
- Marker: `Cargo.toml` top-level `[workspace]` table
- Read: `members` array
- One scope per member crate

### Go workspaces
- Marker: `go.work`
- Read: `use` directives (one per module)
- One scope per module

### Bazel
- Marker: `MODULE.bazel` or `WORKSPACE`
- Bazel repos are deeply nested; precise extraction is fragile. Fallback: collapse to one scope per top-level directory and let the user override.

## Scope naming

- Default: directory name (`frontend/` → scope `frontend`)
- If multiple directories belong to one logical scope (e.g. `packages/web` and `packages/mobile` are both "frontend"), agent should ask the user whether to merge
- Nested monorepos (`packages/web/components/`) are **not** supported as nested scopes. Flatten to `web`.

## When detection fails

If detection succeeds but the resulting scopes don't match the user's mental model, agent should:

1. Show the proposed scope list
2. Let the user rename / merge / split scopes
3. Proceed with the corrected list

This is part of the init confirmation step (see main `SKILL.md` init step 2).