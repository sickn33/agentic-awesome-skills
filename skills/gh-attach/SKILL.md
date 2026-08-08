---
name: gh-attach
description: "Upload and download GitHub user-attachments (screenshots, PDFs, zips, videos) from the terminal; use when asked to attach or embed a file in a PR, issue, or comment, or download an attachment URL."
category: developer-tools
risk: critical
source: community
source_type: community
source_repo: sudosubin/gh-attach
date_added: "2026-08-01"
author: sudosubin
license: MIT
license_source: "https://github.com/sudosubin/gh-attach/blob/main/LICENSE"
tags:
  - github
  - attachments
  - screenshots
  - gh-extension
  - cli
tools:
  - claude-code
  - codex-cli
  - cursor
  - copilot
plugin:
  targets:
    codex: blocked
    claude: blocked
  setup:
    type: manual
    summary: "Installs a reviewed gh-attach release and, for uploads, uses an explicitly approved interactive browser session cookie."
    docs: SKILL.md
---

# Upload and download GitHub user-attachments (gh-attach)

GitHub has **no public API** for user-attachments. The web UI uses an internal
endpoint that mints `github.com/user-attachments` URLs whose visibility follows the
repository they belong to. [`gh-attach`](https://github.com/sudosubin/gh-attach)
(MIT, sudosubin) replicates that drag-and-drop flow as a `gh` CLI extension, so an
agent can upload a local file from the terminal, get a URL back, and later download
an attachment URL to a file.

## Overview

This skill drives `gh-attach` to turn a local file (screenshot, image, PDF, zip,
log, or video) into a hosted GitHub `user-attachments` URL, then embeds that URL
into a pull request, issue, or comment. It also downloads an existing attachment
URL back to a local file. GitHub auto-renders the URL as an image, video, or file
wherever it is pasted, and the URL inherits the repository's visibility, so a
private-repo upload stays private. It works against GitHub Cloud and GitHub
Enterprise Server.

## When to Use This Skill

Use this skill when asked to:

- "Attach a screenshot to the PR" or "add an image to the PR description"
- "Attach this file (PDF, zip, log, video) to the issue or comment"
- "Embed before/after screenshots" in a PR, issue, or README
- "Download this GitHub attachment" from a `user-attachments` URL

## How It Works

### Step 1: Verify prerequisites

```bash
gh auth status                                   # gh installed and authenticated
gh extension install sudosubin/gh-attach --pin v0.4.2 --force
gh extension list | grep -F 'sudosubin/gh-attach' # require the reviewed v0.4.2 release
```

Uploads use a GitHub `user_session` browser cookie, **not** the `gh` token (that
endpoint rejects tokens). By default `gh` must be authenticated so `gh-attach` can
select the matching browser account (Chromium family, Firefox family, or Safari).
If the wrong account is selected, add `--browser <name> --profile <name>`. Obtain
explicit approval before allowing the pinned extension to access that interactive
browser profile. Headless and CI uploads are intentionally unsupported: never export,
store, or pass a raw `user_session` cookie to the extension.

### Step 2: Upload

```bash
# Use an absolute quoted path; -R is optional inside a repo working dir.
URL=$(gh attach "/abs/path/screenshot.png" -R <owner>/<repo>)
```

`gh attach` prints the URL on one line to **stdout**. For GitHub Enterprise Server,
use `-R host/owner/repo`. Capture the output; it is the embeddable reference.

### Step 3: Embed into the PR / issue / comment

```bash
printf '## Screenshots\n\n%s\n' "$URL" \
  | gh pr comment <pr> -R <owner>/<repo> --body-file -
```

Use `gh pr edit`, `gh issue comment`, or `gh issue edit` with `--body-file -` for
other targets. Always pass `--body-file -` (not inline `--body`) so multi-line
bodies and special characters cannot break shell quoting. GitHub auto-renders the
URL, so paste it as-is.

### Step 4: Download

```bash
# Specify the destination explicitly.
gh attach download "$URL" -O "/abs/path/out.png"
```

Downloads of private attachments use the active `gh` token, with browser cookies as
an authorization fallback.

## Examples

- **Attach a screenshot to PR #42:** upload the file, then append the URL under a
  `## Screenshots` heading in the PR body with `gh pr edit ... --body-file -`.
- **Embed before/after screenshots in a README:** upload both files, paste the two
  URLs into the README at the relevant section.
- **Download an attachment for review:** run `gh attach download "$URL" -O out.zip`
  to fetch a `user-attachments` file locally.

## Best Practices

- Resolve globs to absolute paths first, and quote paths that contain spaces or
  Unicode.
- For display sizing, embed an HTML tag instead of the bare URL:
  `<img width="800" src="$URL">`.
- Keep uploads interactive. Do not place a GitHub browser session in CI, an
  environment variable, a secret store consumed by this extension, or an agent log.
- `gh-attach` can upload multiple files concurrently and emit Markdown or JSON
  output with jq-style filtering when you need to script around the result.

## Limitations

- **Interactive session cookie required.** A `user_session` cookie grants full
  account access and is not scoped like a PAT. The supported path is the reviewed,
  pinned extension reading an explicitly approved local browser profile; CI and
  headless cookie injection are out of scope.
- **Write access to the target repo is required** to upload.
- **Private-repo attachments stay private:** the `user-attachments` URL inherits
  repo visibility, so an anonymous fetch on a private repo returns 404 or 403 by
  design.
- GitHub Cloud and GitHub Enterprise Server each decide which file extensions and
  content types they accept.
- The skill embeds the URL itself; `gh attach` only prints it.

## Security & Safety Notes

- The `user_session` cookie is a full-account credential. Never print, export,
  paste, log, or commit it, and never make it available to CI or headless agents.
- Do not install or upgrade `gh-attach` from a moving branch or an unpinned latest
  release. Re-review and update the exact `--pin` only in a repository change.
- Uploaded attachments are auto-rendered by GitHub, so only upload files you intend
  to share with everyone who can view the target repository.
- Confirm the destination `-R <owner>/<repo>` before uploading so an attachment is
  not created against the wrong repository.
