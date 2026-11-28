---
name: tabretake
description: "Turn web app demos into repeatable README GIFs and 9:16 vertical videos from editable JSON steps or screen recordings."
category: development
risk: critical
source: self
source_type: self
date_added: "2026-11-28"
author: gnawbit
tags: [demo-video, readme-gif, playwright, screen-recording]
---

# TabRetake

## Overview

TabRetake creates a repeatable product walkthrough from a web app URL, or renders an existing screen recording with supplied timestamps. The flow is stored as editable JSON steps ("story"), so the same demo can be re-recorded after UI changes instead of being captured again by hand. Outputs are local MP4, GIF and PNG posters in landscape (16:9) and optional portrait (9:16), rendered locally with Playwright + FFmpeg with zero cloud upload. Dark/light theme presets are supported.

Distinction from related tools: one-off screen recorders produce a clip that goes stale with the next UI change; browser test tools produce assertions, not presentation media. TabRetake produces presentation media from a reusable, editable script of the flow. Canonical project: https://github.com/gnawbit/tabretake.

## When to Use

- The user asks for a launch video, product walkthrough, or a signup / onboarding demo of a web app.
- The user wants a README GIF, or a 9:16 vertical short video of an app flow.
- The UI changed and an existing demo must be regenerated from its saved story.
- The user has an existing screen recording and wants it rendered with captions, branding and posters.
- Not for browser test assertions, text-to-video generation, or general audio/video editing. For captcha, anti-bot, iframe-only or canvas-only flows, use a user-provided recording with marks instead of live capture (see Limitations).

## Prerequisites

- Node.js 20.9+ on Windows, macOS or Linux.
- The TabRetake CLI, installed at use time (no scripts are vendored with this skill): `npm install --global @gnawbit/tabretake@0.5.2`, or an existing `tabretake` on PATH, or a source checkout invoked as `node /absolute/path/to/tabretake/bin/tabretake.mjs`.
- A browser for live recording: local Chrome/Edge (`--browser auto` fallback), or pinned Chromium installed via `tabretake setup [--proxy <url>] [--json]`. If the download times out in restricted networks, use `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright`. Rendering an existing recording or saved timeline does not need a browser.
- Access to the target app; for flows that log in or change data, a test account and non-sensitive demo data.
- A CJK system font if captions are in Chinese.
- Network access is needed only to install the CLI/Chromium and to reach the target app. Recording and rendering run locally; nothing is uploaded.

## How It Works

Note: `tabretake preview --config story.json --headless --json` checks steps before recording. It executes real app changes; reset demo data before a retake. It preserves recordings and writes only explicitly requested screenshots. After `waitFor`, use a `focus` step with a selector, caption and pause to frame a result instead of the last clicked control. Inspect the rendered clip for framing.

### 1. Locate and check the CLI

Use an installed `tabretake` CLI when available. If missing, install it as described in Prerequisites.

```bash
tabretake --version
tabretake capabilities --json
tabretake doctor --json
```

Query `capabilities --json` before choosing flags. `doctor --json` reports required errors and optional font warnings; it checks browser presence without launching one. Rendering an existing recording or saved timeline does not need a browser: if `chromium` is the only failed required check, continue to `validate` and `render`. Fix other required errors first.

### 2. Choose the input

- **Web app:** confirm the URL and intended flow. Use a test account and non-sensitive demo data.
- **Existing recording:** get the file and moments to highlight, or launch `tabretake mark --video recording.mp4` for interactive timestamp picking. Read [recording input and branding](https://github.com/gnawbit/tabretake/blob/0da1de0992f2597a140c8688a504b486489255fa/references/rendering.md); do not invent marks.
- **Interactive capture:** `tabretake capture --url https://your-app.com --out demo.json --run` lets the user perform the steps in a visible browser and saves a reusable story.
- **Example requested:** `tabretake demo --story readme|onboarding|release --port 0` runs a fictional bundled app (not evidence of external adoption).

Ask only for missing details that affect the result, such as the target flow, theme preset (`midnight`, `daylight`, `paper`, `slate`), or output orientation.

### 3. Record a web flow

1. Inspect controls and create a starter if no story exists:

   ```bash
   tabretake plan --url https://your-app.com --out plan.json --json
   tabretake init --url https://your-app.com --out demo.json --auto --preset midnight --json
   ```

2. Read the plan file from its returned artifact path. Inspect `--auto` steps or replace starter steps with the requested flow. See [story authoring](https://github.com/gnawbit/tabretake/blob/0da1de0992f2597a140c8688a504b486489255fa/references/story.md) for actions, locators, and timing units. `plan` includes `label` (ARIA/HTML labels) and native select `options`; `name` remains the HTML attribute. Use scoped `selector` when labels repeat or overlap. `init` will not overwrite an existing story.

3. Validate, preview, record and render (or use `tabretake run` for one-command execution):

   ```bash
   tabretake validate --config demo.json --json
   tabretake preview --config demo.json --headless --json
   tabretake run --config demo.json --out demo --vertical --scale 2 --json
   # Or run record and render separately:
   tabretake record --config demo.json --out demo --scale 2 --json
   tabretake render --config demo/record.json --vertical --json
   ```

   Omit `--vertical` for landscape only; add `--no-gif` to skip GIFs; pass `--preset daylight|paper|slate|midnight` to switch themes without re-recording; pass `--browser chrome|msedge|chromium|auto` to pick a browser engine; pass `--scale 2` for HiDPI Retina recording when zooming in. Use `--vertical --zoom 1 --vertical-zoom 1.8` to keep landscape overview while enlarging portrait focus targets (`vertical.zoom` saves it in config; `zoom: false` keeps full view). Record narrow viewports (e.g. `390x844`) for mobile flows.

4. Inspect the generated poster and video, then return clickable paths to the actual artifacts. Re-record after flow changes; re-render `record.json` after caption, zoom, or theme preset changes. Output videos have no audio.

### 4. Interpret results and recover

`--json` writes one object to stdout; stderr carries progress. Check the exit code and `ok`, then read `artifacts` for absolute paths, kinds and byte sizes. Only a successful result describes the current run; failed runs may leave partial files. `schemaVersion` identifies the response format, not the CLI release.

- `INVALID_CONFIG`: fix each `error.issues[].path` using the packaged [JSON Schema](https://github.com/gnawbit/tabretake/blob/0da1de0992f2597a140c8688a504b486489255fa/schemas/story.schema.json). The standalone `validate` command returns an `errors` array for schema failures and an `error` object for file or JSON syntax failures. It does not verify selectors, login or media access.
- `TARGET_NOT_FOUND`, `STEP_TIMEOUT`, `STEP_FAILED`: inspect `error.step.path` and its zero-based index. Re-run `plan` with the same login state, update the target or wait condition and retry. Do not repeat an unchanged failing command. `click` waits for an enabled, unobstructed target using step `timeout` (milliseconds; default 20,000).
- `PAGE_UNREACHABLE`: check the URL, local app server and browser network/proxy access. `PAGE_HTTP_ERROR`: inspect `error.status`; fix the route/server or use authorized login state for 401/403. Dependency checks do not prove page access, and an HTTP error page is not a completed demo.
- Missing runtime or fonts: inspect `doctor --json` and its recovery hints.
- Captcha, anti-bot block, iframe-only or canvas-only flow: use a user-provided recording with marks instead of trying to bypass the restriction.

### 5. Protected pages and privacy

Manual login needs an interactive terminal without `--json`. Login navigation errors omit the target URL; HTTP 401/403 pages stay open for sign-in while other HTTP errors stop the command.

```bash
tabretake plan --url https://your-app.com --login
tabretake record --config demo.json --storage-state auth.json --json
```

`auth.json` is created in the login command's working directory and is never implicitly loaded by later commands. Use an absolute state path after changing directories. If it expires, let the user log in again; do not request passwords or 2FA codes in chat. Do not upload or commit login state or private recordings. Stories and recorded timelines retain typed values, so use synthetic data. Record only authorized pages; the workflow does not authorize publishing assets.

## Examples

```text
User request: Record our signup flow and make a README GIF plus a vertical version for a launch post.
Inputs: Target app URL, a test account with demo data, theme preset midnight, orientations 16:9 + 9:16.
Expected result: The agent plans and validates a story, records the flow, and returns local MP4, GIF and PNG poster paths. (Illustrative example, not a measured test.)
```

A runnable starting point is the bundled fictional demo (illustrative only, not evidence of external adoption):

```bash
tabretake demo --story readme --port 0
```

## Limitations

- Output videos have no audio track.
- The standalone `validate` command checks the story config against the schema; it does not verify selectors, login state or media access, so a valid config can still fail at record time.
- Captcha, anti-bot blocks, and iframe-only or canvas-only flows cannot be captured live; use a user-provided recording with marks instead.
- Login state files expire and are never loaded implicitly; an expired state requires the user to log in again.
- Failed runs may leave partial files; only a successful run's result describes the current artifacts.
- Not for browser test assertions, text-to-video generation, or general audio/video editing.

## Safety and side effects

- Everything runs on the user's machine: recording and rendering are local, with zero cloud upload. The only external recipients are the npm registry (CLI/Chromium install) and the target app the user authorized.
- Writes are limited to files the workflow is asked to produce: story JSON, `record.json`, MP4/GIF/PNG outputs in the chosen output directory, and screenshots only when explicitly requested.
- `preview` and `record` execute real UI steps against the target app and can change its data. Use a test account and synthetic/demo data, and reset demo data before a retake.
- Login state (`auth.json`) contains session credentials: never upload it, commit it, or paste its contents into chat; never request passwords or 2FA codes in chat.
- Risk label: `critical` — matching the quality bar's "modifies state" definition and the catalog's existing media skills (`slack-gif-creator`, `macos-screen-recorder` are both labeled `critical`): the workflow executes real UI steps that can change the target app's data and writes local output files. Mitigations are built into the workflow: test accounts and synthetic data, local-only rendering, no destructive commands, no third-party data recipients.

## Sources and related skills

- Canonical project and full documentation: [gnawbit/tabretake](https://github.com/gnawbit/tabretake). This vendored copy is adapted from the upstream `SKILL.md` at commit `0da1de0992f2597a140c8688a504b486489255fa` (CLI version 0.5.2); the upstream MIT License is retained alongside this file as `LICENSE`.
- npm package: [@gnawbit/tabretake](https://www.npmjs.com/package/@gnawbit/tabretake).
- Legacy release notes (v0.4.0 and earlier / `demo-reel`): [compatibility](https://github.com/gnawbit/tabretake/blob/0da1de0992f2597a140c8688a504b486489255fa/docs/compatibility.md).
