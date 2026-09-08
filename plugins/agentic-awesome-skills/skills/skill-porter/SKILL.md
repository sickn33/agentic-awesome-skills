---
name: skill-porter
description: "Preview conservative tool-name translations and copy complete local skill bundles for manual adaptation to Google Antigravity."
category: developer-tools
risk: critical
source: community
source_repo: Pranav-Nexus/antigravity-skill-porter
source_type: community
date_added: "2026-09-07"
author: Pranav-Nexus
tags: [antigravity, claude, skills, migration, agent]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Pranav-Nexus/antigravity-skill-porter/blob/7a5b42c0fe1be283ae9f5b5fe70792aa78733af7/LICENSE"
---

# Skill Porter for Google Antigravity

## When to Use

Use when adapting a locally obtained Claude Code, Cursor, Codex, or generic agent
skill bundle for Google Antigravity. The utility preserves support files and
previews limited tool-name substitutions; it does not prove client compatibility.

## Prerequisites

- Python 3.9+; standard library only.
- A reviewed local skill directory containing `SKILL.md`, that file itself, or a
  repository with `skills/<lowercase-hyphenated-id>/SKILL.md` directories.
- Verify the upstream identity, pinned revision, license and complete bundle first.
  Obtain remote material separately through your reviewed download/clone workflow.
- Use stable local directories you control. Do not run against a tree being
  modified by another process or user. Inspect scripts without executing them.

## Workflow

1. From this skill directory, preview the local bundle:

   ```bash
   python3 scripts/port_skill.py --source "/absolute/path/my-skill" --dry-run
   ```

2. Review the diff. Only exact backtick-quoted tool identifiers such as `View`,
   `Edit`, and `Bash` change. Frontmatter and support bytes remain intact. Verify
   each target tool and its argument semantics in your actual client.
3. Copy to a fresh staging destination, then inspect before activating:

   ```bash
   python3 scripts/port_skill.py --source "/absolute/path/my-skill" --dest "/absolute/path/staging"
   ```

   Existing skill destinations are rejected; no global paths are written.
4. When the user requests workspace installation, verify the current project:

   ```bash
   python3 scripts/port_skill.py --source "/absolute/path/my-skill" --workspace --dry-run
   python3 scripts/port_skill.py --source "/absolute/path/my-skill" --workspace
   ```

   This writes only `.agents/skills/<id>` under the current working directory.
   Confirm that discovery path is supported by the intended host first.
5. Review context-file references, tool argument shapes, client configuration,
   dependencies, licensing and multi-agent ordering manually. Validate the adapted
   skill and test actual client invocation before claiming compatibility.

## Examples

For a multi-skill repository, use its local root as the source:

```bash
python3 scripts/port_skill.py --source "/absolute/path/reviewed-repository" --dry-run
python3 scripts/port_skill.py --source "/absolute/path/reviewed-repository" --dest "/absolute/path/fresh-output"
```

A source-only invocation defaults to preview. Remote URLs are rejected; obtain
and inspect a pinned local checkout first. Run bundled tests from this directory:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts/test_port_skill.py -v
```

## Limitations

- Conservative text adaptation only: no AST conversion, semantic optimization,
  automatic parallelization, artifact generation, or compatibility certification.
- Context references and support scripts retain their original bytes and may need
  manual adaptation. Binary support files are copied intact, never interpreted.
- Symbolic links and non-regular files are rejected. Input is bounded to 1,000 files
  and 20 MiB. This is not a sandbox against concurrent hostile filesystem changes;
  use only stable directories you control.
- Disk or filesystem failure may leave a partial new destination. Inspect it and
  choose a fresh output for retries. There is no overwrite or rollback mode.
- No downloads, credentials, network calls, global installation, plugin manifest
  generation/registration or external MCP setup. Verify tool availability in the
  actual host, whose version and capabilities may differ.

## Source and license

Adapted from Pranav-Nexus/antigravity-skill-porter. The upstream MIT notice is
preserved in [LICENSE](LICENSE).
