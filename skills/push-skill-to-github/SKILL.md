---
name: push-skill-to-github
description: "Commit and push skill changes to the configured skills repository after review and validation."
category: development
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [skills, git, publishing]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Push Skills to GitHub

## When to Use

- Use when skill changes are ready to commit and push to the configured skills repo.
- Use when the user asks to save or publish skill updates after validation.

## Procedure

1. Discover the actual repository from the user-selected skill path with Git. Read its current instructions, status, branch and remote. The upstream author's private ~/.agents layout and public mirror are not defaults for other users.
2. Confirm publication is requested and identify the destination remote and topic branch. Preserve unrelated edits and follow the repository's protected PR and validation process.
3. Review complete changed skill trees, provenance and bundled files. Run the required checks and record their exact revision and result.
4. Stage only the explicit reviewed paths, inspect the staged diff for secrets and unrelated changes, and create a focused commit.
5. Push only the authorized topic branch. Verify the returned remote commit identity; no fixed sleep or expected main-to-main message establishes success. Do not force-push or bypass protection.
6. Use a terminal already available to the host. If a temporary cmux pane is explicitly useful, create and close only that task-owned pane; do not depend on cmux for Git operations.

## Example

**User request:**

> Validate the changed skills, review the diff, commit them with a focused message, and push the topic branch.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
