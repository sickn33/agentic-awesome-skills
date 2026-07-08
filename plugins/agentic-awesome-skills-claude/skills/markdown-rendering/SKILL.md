---
name: markdown-rendering
description: "Open Markdown reliably in cmux panes and recover from blank rendered surfaces."
category: productivity
risk: safe
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [markdown, cmux, rendering]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Markdown Rendering in cmux

## When to Use

- Use when opening Markdown in cmux shows a blank pane or wrong layout.
- Use when you need to display a Markdown file in a stable cmux right pane.

## The Problem

`cmux markdown open` defaults to **spawning a brand-new pane** every time, even with `--direction right`. The common "fix" — moving the new markdown surface into the existing right pane with `move-surface` — **bugs out: the moved viewer renders BLANK.** The surface keeps `type=markdown` and looks healthy, but shows nothing.

So you get stuck: either a stray extra pane, or a blank viewer after moving it.

## The Rule

You have exactly two reliable options. **Never `move-surface` a markdown viewer** — that is the path that bugs.

### Option A — Open it right on the first try

If there is no usable right pane yet, just let cmux create one and leave it where it lands:

```bash
cmux markdown open /abs/path/file.md --direction right --focus false
```

Do NOT then move it. If it spawned where you want it, you're done.

### Option B — Close existing right pane(s), then open fresh

If there are other right panes in the way (and they're unused or irrelevant), **close them first**, then open the markdown fresh as a new right pane:

```bash
# 1. find panes in THIS workspace
cmux list-panes --workspace "$CMUX_WORKSPACE_ID"

# 2. close the unused/irrelevant right pane(s) by closing their surfaces
cmux list-pane-surfaces --pane pane:NN
cmux close-surface --surface surface:XX     # repeat per surface in that pane

# 3. THEN open the markdown fresh — it creates its own clean right pane
cmux markdown open /abs/path/file.md --direction right --focus false
```

## Hard Rules

- **Never `move-surface` a markdown viewer.** It renders blank afterward. This is the core bug this skill exists for.
- Open it correctly the first time (Option A), OR close the conflicting right pane(s) and open a fresh right pane from scratch (Option B).
- Only close panes that are unused or irrelevant — never close a pane the user is working in.
- Always anchor to `$CMUX_WORKSPACE_ID`; never assume the visually focused workspace.
- Pass `--focus false` so you don't steal the user's focus.
- You can't screenshot/read a markdown surface to verify it. If unsure it rendered, ask the user.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
