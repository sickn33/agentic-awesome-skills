---
name: gh-image
description: "Upload local images to GitHub and get canonical user-attachments embed URLs; use when asked to attach a screenshot to a PR, issue, or comment, or to embed before/after images in a README."
category: developer-tools
risk: safe
source: community
source_type: community
source_repo: drogers0/gh-image
date_added: "2026-06-25"
author: drogers0
license: MIT
license_source: "https://github.com/drogers0/gh-image/blob/main/LICENSE"
tags:
  - github
  - images
  - screenshots
  - gh-extension
  - cli
tools:
  - claude-code
  - codex-cli
  - cursor
  - gemini-cli
---

# Upload images to GitHub (gh-image)

GitHub has **no public API** for image uploads — the web UI uses an internal
endpoint that mints `user-attachments` URLs scoped to the repo's visibility.
[`gh-image`](https://github.com/drogers0/gh-image) (MIT, © drogers0) replicates
that flow as a `gh` CLI extension, so an agent can upload a local image from the
terminal and get a ready-to-embed Markdown image line back.

## Overview

This skill drives `gh-image` to turn a local image file into a hosted GitHub
`user-attachments` URL, then embeds that URL into a pull request, issue, or
comment. It is the missing "attach a screenshot" capability for terminal agents.

## When to Use This Skill

Use this skill when asked to:

- "Attach a screenshot to the PR" or "add an image to the PR description"
- "Put this image in the issue" / "comment with these screenshots"
- "Show the test results / before-and-after in the PR"
- Embed any local image into GitHub Markdown without leaving the terminal

## How It Works

### Step 1: Verify prerequisites

```bash
gh auth status                                   # gh installed & authenticated
gh extension list | grep -q 'drogers0/gh-image' \
  || gh extension install drogers0/gh-image      # idempotent install
```

`gh-image` does **not** use the `gh` token for the upload (that endpoint rejects
tokens). It needs a GitHub `user_session` cookie, resolved in this order:
`--token <value>` flag → `GH_SESSION_TOKEN` env var (use in CI/headless) → a
logged-in browser's cookie store (default for local use).

### Step 2: Upload

```bash
# Use an absolute path; --repo is optional inside a repo working dir.
gh image "/abs/path/screenshot.png" --repo <owner>/<repo>
```

`gh image` prints Markdown to **stdout**, one line per image:

```
![screenshot.png](https://github.com/user-attachments/assets/<uuid>)
```

Capture that output — it is the embeddable reference.

### Step 3: Embed into the PR / issue / comment

```bash
MD="$(gh image "/abs/path/shot.png" --repo owner/repo)"
BODY="$(gh pr view <pr> --repo owner/repo --json body -q .body)"
printf '%s\n\n## Screenshots\n\n%s\n' "$BODY" "$MD" \
  | gh pr edit <pr> --repo owner/repo --body-file -
```

Use `gh pr comment`, `gh issue edit`, or `gh issue comment` with `--body-file -`
for other targets. Always pass `--body-file -` (not inline `--body`) so multi-line
bodies and special characters can't break shell quoting.

### Step 4: Verify

```bash
gh pr view <pr> --repo owner/repo --json body -q .body   # confirm URL present
```

## Examples

- **Attach a CleanShot screenshot to PR #42:** upload the file, append it under a
  `## Screenshots` heading in the PR body.
- **Embed before/after images in a README:** upload both, paste the two Markdown
  lines into the README at the relevant section.

## Best Practices

- Resolve globs to absolute paths first; quote paths with spaces/Unicode.
- For display sizing, embed an HTML tag instead of bare Markdown:
  `<img width="800" src="https://github.com/user-attachments/assets/<uuid>" />`.
- In CI, set `GH_SESSION_TOKEN` from a dedicated bot account.

## Limitations

- **Session cookie required.** A `user_session` cookie grants full account access
  (not scoped like a PAT) — treat it like a password; use a bot account in CI.
- **Write access to the target repo is required**; orgs that enforce SAML SSO need
  the session authorized at `https://github.com/orgs/<org>/sso` first.
- **Private-repo images stay private:** the `user-attachments` URL inherits repo
  visibility, so an anonymous fetch on a private repo returns 404/403 by design.
- **Windows + Chrome 127+** cannot read cookies (library limitation) — use another
  browser or `GH_SESSION_TOKEN`.
- The skill embeds the Markdown itself; `gh-image` only prints the URL.
