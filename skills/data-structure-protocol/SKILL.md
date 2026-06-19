---
name: data-structure-protocol
description: "Give agents persistent structural memory of a codebase — navigate dependencies, track public APIs, and understand why connections exist without re-reading the whole repo."
risk: safe
source: "https://github.com/k-kolomeitsev/data-structure-protocol"
date_added: "2026-02-27"
---

# Data Structure Protocol (DSP)

LLM coding agents lose context between tasks. On large codebases they spend most of their tokens on "orientation" — figuring out where things live, what depends on what, and what is safe to change. DSP solves this by externalizing the project's structural map into a persistent, queryable graph stored in a `.dsp/` directory next to the code.

DSP is NOT documentation for humans and NOT an AST dump. It captures three things: **meaning** (why an entity exists), **boundaries** (what it imports and exposes), and **reasons** (why each connection exists). This is enough for an agent to navigate, refactor, and generate code without loading the entire source tree into the context window.

## When to Use
Use this skill when:
- The project has a `.dsp/` directory (DSP is already set up)
- The user asks to set up DSP, bootstrap, or map a project's structure
- Creating, modifying, or deleting code files in a DSP-tracked project (to keep the graph updated)
- Navigating project structure, understanding dependencies, or finding specific modules
- The user mentions DSP, dsp-cli, `.dsp`, or structure mapping
- Performing impact analysis before a refactor or dependency replacement

## Core Concepts

### Code = graph

DSP models the codebase as a directed graph. Nodes are **entities**, edges are **imports** and **shared/exports**.

Two entity kinds exist:
- **Object**: any "thing" that isn't a function (module/file/class/config/resource/external dependency)
- **Function**: an exported function/method/handler/pipeline

### Identity by UID, not by file path

Every entity gets a stable UID: `obj-<8hex>` for objects, `func-<8hex>` for functions. File paths are attributes that can change; UIDs survive renames, moves, and reformatting.

For entities inside a file, the UID is anchored with a comment marker in source code:

```js
// @dsp func-7f3a9c12
export function calculateTotal(items) { ... }
```

```python
# @dsp obj-e5f6g7h8
class UserService:
```

### Every connection has a "why"

When an import is recorded, DSP stores a short reason explaining *why* that dependency exists. This lives in the `exports/` reverse index of the imported entity. A dependency graph without reasons tells you *what imports what*; reasons tell you **what is safe to change and who will break**.

### Storage format

Each entity gets a small directory under `.dsp/`:

```
.dsp/
├── TOC                        # ordered list of all entity UIDs from root
├── obj-a1b2c3d4/
│   ├── description            # source path, kind, purpose (1-3 sentences)
│   ├── imports                # UIDs this entity depends on (one per line)
│   ├── shared                 # UIDs of public API / exported entities
│   └── exports/               # reverse index: who imports this and why
│       ├── <importer_uid>     # file content = "why" text
│       └── <shared_uid>/
│           ├── description    # what is exported
│           └── <importer_uid> # why this specific export is imported
└── func-7f3a9c12/
    ├── description
    ├── imports
    └── exports/
```

Everything is plain text. Diffable. Reviewable. No database needed.

### Full import coverage

Every file or artifact that is imported anywhere must be represented in `.dsp` as an Object — code, images, styles, configs, JSON, wasm, everything. External dependencies (npm packages, stdlib, etc.) are recorded as `kind: external` but their internals are never analyzed.

## How It Works

### Initial Setup

The skill relies on a standalone Python CLI script `dsp-cli.py`. If it is missing from the project, download it:

```bash
curl -O https://raw.githubusercontent.com/k-kolomeitsev/data-structure-protocol/main/skills/data-structure-protocol/scripts/dsp-cli.py
```

Requires **Python 3.10+**. All commands use `python dsp-cli.py --root <project-root> <command>`.

### Bootstrap (initial mapping)

If `.dsp/` is empty, traverse the project from root entrypoint(s) via DFS on imports:

1. Identify root entrypoints (`package.json` main, framework entry, `main.py`, etc.)
2. Document the root file: `create-object`, `create-function` for each export, `create-shared`, `add-import` for all dependencies
3. Take the first non-external import, document it fully, descend into its imports
4. Backtrack when no unvisited local imports remain; continue until all reachable files are documented
5. External dependencies: `create-object --kind external`, add to TOC, but never descend into `node_modules`/`site-packages`/etc.

### Workflow Rules

- **Before changing code**: Find affected entities via `search`, `find-by-source`, or `read-toc`. Read their `description` and `imports` to understand context.
- **When creating a file/module**: Call `create-object`. For each exported function — `create-function` (with `--owner`). Register exports via `create-shared`.
- **When adding an import**: Call `add-import` with a brief `why`. For external deps — first `create-object --kind external` if the entity doesn't exist.
- **When removing import/export/file**: Call `remove-import`, `remove-shared`, `remove-entity`. Cascade cleanup is automatic.
- **When renaming/moving a file**: Call `move-entity`. UID does not change.
- **Don't touch DSP** if only internal implementation changed without affecting purpose or dependencies.

### Key Commands

| Category | Commands |
|----------|----------|
| **Create** | `init`, `create-object`, `create-function`, `create-shared`, `add-import` |
| **Update** | `update-description`, `update-import-why`, `move-entity` |
| **Delete** | `remove-import`, `remove-shared`, `remove-entity` |
| **Navigate** | `get-entity`, `get-children --depth N`, `get-parents --depth N`, `get-path`, `get-recipients`, `read-toc` |
| **Search** | `search <query>`, `find-by-source <path>` |
| **Diagnostics** | `detect-cycles`, `get-orphans`, `get-stats` |

### When to Update DSP

| Code Change | DSP Action |
|---|---|
| New file/module | `create-object` + `create-function` + `create-shared` + `add-import` |
| New import added | `add-import` (+ `create-object --kind external` if new dep) |
| Import removed | `remove-import` |
| Export added | `create-shared` (+ `create-function` if new) |
| Export removed | `remove-shared` |
| File renamed/moved | `move-entity` |
| File deleted | `remove-entity` |
| Purpose changed | `update-description` |
| Internal-only change | **No DSP update needed** |

## Examples

### Example 1: Setting up DSP and documenting a module

```bash
python dsp-cli.py --root . init

python dsp-cli.py --root . create-object "src/app.ts" "Main application entrypoint"
# Output: obj-a1b2c3d4

python dsp-cli.py --root . create-function "src/app.ts#start" "Starts the HTTP server" --owner obj-a1b2c3d4
# Output: func-7f3a9c12

python dsp-cli.py --root . create-shared obj-a1b2c3d4 func-7f3a9c12

python dsp-cli.py --root . add-import obj-a1b2c3d4 obj-deadbeef "HTTP routing"
```

### Example 2: Navigating the graph before making changes

```bash
python dsp-cli.py --root . search "authentication"
python dsp-cli.py --root . get-entity obj-a1b2c3d4
python dsp-cli.py --root . get-children obj-a1b2c3d4 --depth 2
python dsp-cli.py --root . get-recipients obj-a1b2c3d4
python dsp-cli.py --root . get-path obj-a1b2c3d4 func-7f3a9c12
```

### Example 3: Impact analysis before replacing a library

```bash
python dsp-cli.py --root . find-by-source "lodash"
# Output: obj-11223344

python dsp-cli.py --root . get-recipients obj-11223344
# Shows every module that imports lodash and WHY — lets you systematically replace it
```

## Best Practices

- ✅ **Do:** Update DSP immediately when creating new files, adding imports, or changing public APIs
- ✅ **Do:** Always add a meaningful `why` reason when recording an import — this is where most of DSP's value lives
- ✅ **Do:** Use `kind: external` for third-party libraries without analyzing their internals
- ✅ **Do:** Keep descriptions minimal (1-3 sentences about purpose, not implementation)
- ✅ **Do:** Treat `.dsp/` diffs like code diffs — review them, keep them accurate
- ❌ **Don't:** Touch `.dsp/` for internal-only changes that don't affect purpose or dependencies
- ❌ **Don't:** Change an entity's UID on rename/move (use `move-entity` instead)
- ❌ **Don't:** Create UIDs for every local variable or helper — only file-level Objects and public/shared entities

## Integration

This skill connects naturally to:
- **context-compression** — DSP reduces the need for compression by providing targeted retrieval instead of loading everything
- **context-optimization** — DSP is a structural optimization: agents pull minimal "context bundles" instead of raw source
- **architecture** — DSP captures architectural boundaries (imports/exports) that feed system design decisions

## References

- **Full architecture specification**: [ARCHITECTURE.md](https://github.com/k-kolomeitsev/data-structure-protocol/blob/main/ARCHITECTURE.md)
- **CLI source + reference docs**: [skills/data-structure-protocol](https://github.com/k-kolomeitsev/data-structure-protocol/tree/main/skills/data-structure-protocol)
- **Introduction article**: [article.md](https://github.com/k-kolomeitsev/data-structure-protocol/blob/main/article.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
