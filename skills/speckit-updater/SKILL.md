---
name: speckit-updater
description: Safely check and refresh a GitHub Spec Kit project while preserving project-specific changes.
risk: unknown
source: community
---

# Spec Kit Safe Update

Use the official Spec Kit CLI to inspect and refresh an existing project. This skill does not include its own updater scripts, manifests, or backup implementation.

## When to Use

- Check whether the installed Spec Kit CLI is current.
- Refresh Spec Kit-managed project files after reviewing local changes.
- Initialize Spec Kit in a project that does not yet use it.

## Workflow

1. Confirm the target project and inspect its Git status. Do not overwrite unrelated or uncommitted work.
2. Check the installed CLI and available update guidance:

   ```bash
   specify self check
   ```

3. If the CLI needs updating, use the installation method reported by Spec Kit or its current installation documentation.
4. For an existing Spec Kit project, first record or commit intentional customizations and explain that the refresh may replace managed files. Obtain approval before running:

   ```bash
   specify init --here --force
   ```

5. For a new project, obtain approval before running `specify init --here` and answering its interactive prompts.
6. Inspect the resulting Git diff. Restore project-specific customizations where needed, run the project's checks, and report exactly which files changed.

## Safety Boundaries

- Never treat `--force` as permission to discard uncommitted work.
- Do not claim that a backup, rollback, conflict resolver, or customization merge exists unless the installed Spec Kit version actually provides it.
- Do not execute an update or initialization until the user approves the proposed target and expected file changes.

## Limitations

- Commands and generated files can vary by Spec Kit version; use `specify --help` and current official documentation when local output differs.
- This skill does not replace project-specific validation or review of the resulting diff.
