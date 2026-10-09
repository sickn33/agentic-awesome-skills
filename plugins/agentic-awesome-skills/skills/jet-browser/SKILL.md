---
name: jet-browser
description: "Verify or integrate Jet Browser when a project needs isolated WPE WebKit sessions, native input, screenshots, ordered JSONL automation, or reproducible runtime checks."
category: browser-automation
risk: critical
source: "https://github.com/masakaai/jet-browser"
source_repo: masakaai/jet-browser
source_type: official
date_added: "2026-10-09"
author: masakaai
tags: [browser, wpe-webkit, automation, docker, jsonl, testing]
tools: [claude, codex]
license: Apache-2.0
license_source: "https://github.com/masakaai/jet-browser/blob/v0.6.7/LICENSE"
---

# Jet Browser

## Overview

Use Jet Browser as a replaceable browser-runtime boundary for an agent or deterministic test runner. It runs one isolated WPE WebKit session per container and exposes ordered JSONL commands for navigation, native input, semantic inspection, screenshots, and cleanup.

Keep model selection, reasoning, credentials, and orchestration in the calling project. Jet Browser is a browser runtime, not an agent framework, hosted proxy network, anti-bot service, or bridge to a user's personal Chrome profile.

## When to Use This Skill

- Use when a project needs a self-hosted browser process with an explicit container lifecycle.
- Use when a harness needs framework-neutral, ordered JSONL instead of a bundled agent loop.
- Use when native pointer, keyboard, touch, DOM, and screenshot evidence should share one runtime.
- Use when a repository needs a reproducible offline smoke test or GitHub Actions browser-runtime check.
- Do not use this skill to control an already-running personal Chrome or reuse its logged-in state; use the environment's permission-approved CDP workflow for that.

## Safe Setup and Verification

### 1. Establish the boundary before downloading

Confirm that the user wants a separate Jet Browser container rather than their daily browser. Check for Docker and Node.js 24+, and report a missing requirement instead of claiming the runtime was verified.

For a new checkout or upgrade, identify an immutable release or full commit, inspect the repository's `package.json`, lifecycle scripts, lockfile, Dockerfiles, executable files, symlinks, network access, and credential handling, and summarize what will run. Obtain explicit approval before downloading and again before installing dependencies, building images, or starting containers. A Git commit pin provides reproducibility, not proof of trust.

The v0.6.7 source commit reviewed for this catalog entry is:

```text
882b17ab1b865560f17dbfeeeea0a7b40b95a146
```

Review a newer source tree independently before changing that pin.

### 2. Run the standalone acceptance flow

After the approvals above, install the pinned source's exact lockfile dependencies and run its standalone check:

```bash
npm ci
npm run standalone
```

Treat the command's observed JSON result as the acceptance check. A passing run must start the local page, verify the JavaScript marker, type through the native input path, capture a PNG, keep the smoke browser's outbound network disabled, and shut the container down cleanly.

For source changes, also run:

```bash
npm test
cargo test --all-targets
```

Never report a pass when Docker, Node.js, the image build, browser startup, native input, DOM verification, screenshot capture, or cleanup did not actually complete.

### 3. Integrate the documented contract

Read `docs/demo.md` for the container lifecycle and `docs/agent-tools.md` for model-facing declarations. Prefer the versioned declarations exported by `sdk/tools.mjs`; do not invent tool names, input fields, or response shapes.

Send one JSON command per line and consume one JSON response per line. Preserve ordering, bound inputs and outputs in the calling harness, and close the session in guaranteed cleanup. Keep one container per mutually untrusted session, mount profile or download paths explicitly, and never pass unrelated host credentials into the container.

Use semantic evidence for target selection and screenshots for visual verification when both are available. Treat evaluation, imported profiles, downloads, and outbound network access as privileged capabilities that require the calling application to define its own authorization and policy gates.

## Examples

### Example 1: Verify a pinned source checkout

After inspecting the pinned source and receiving the required approvals:

```bash
git clone --filter=blob:none --no-checkout https://github.com/masakaai/jet-browser.git
git -C jet-browser checkout --detach 882b17ab1b865560f17dbfeeeea0a7b40b95a146
cd jet-browser
npm ci
npm run standalone
```

Report the exact command result and which acceptance assertions ran. Do not translate a partial build or startup log into a successful verification.

### Example 2: Verify Jet Browser in GitHub Actions

Pin the Action to the reviewed full commit rather than a moving branch or tag:

```yaml
permissions:
  contents: read

jobs:
  verify-browser-runtime:
    runs-on: ubuntu-latest
    steps:
      - name: Verify Jet Browser
        uses: masakaai/jet-browser@882b17ab1b865560f17dbfeeeea0a7b40b95a146 # v0.6.7
```

This checks the public `linux/amd64` release image on a GitHub-hosted Linux runner. Review the Action source and repository workflow permissions before use.

## Best Practices

- ✅ Pin source and Action use to a reviewed full commit.
- ✅ Keep one isolated browser session per container and always close it.
- ✅ Preserve ordered JSONL and use the published schemas instead of inferring fields.
- ✅ Keep credentials and network policy in the embedding harness.
- ✅ Report observed checks, failures, and platform limitations exactly.
- ❌ Do not attach Jet Browser to a personal Chrome profile or copy daily-browser credentials into it.
- ❌ Do not promise CDP, Chrome extensions, Chromium-only behavior, stealth, CAPTCHA solving, or public-site success.
- ❌ Do not generalize the published offline benchmark to model accuracy or long-running production reliability.

## Limitations

- Jet Browser uses WPE WebKit, not Chromium. It does not implement Chrome-only extension, enterprise-policy, or CDP contracts.
- The published v0.6.7 image targets `linux/amd64`; ARM hosts need compatible emulation or a source build for the host architecture.
- Docker and Node.js 24+ are required for the documented standalone flow; source development also requires the repository's Rust toolchain.
- The standalone runtime does not include a hosted control plane, proxy network, account system, persistent daily-browser takeover, or model loop.
- The published ready-time and memory figures are medians from a pinned offline fixture. They do not measure public-site success, stealth, CAPTCHA handling, model accuracy, or long-running stability.
- This skill cannot validate a local run when the required runtime is unavailable; report the missing dependency or failed assertion instead.

## Security & Safety Notes

- `npm ci`, Docker builds, and container startup modify local state and may execute repository-controlled code. Inspect the pinned source and obtain approval before each installation or execution boundary.
- The standalone smoke test disables browser outbound networking, but image and dependency acquisition can use the network. State that distinction before running it.
- Use a dedicated container per mutually untrusted session. Mount only required paths, avoid unrelated host credentials, and set explicit resource and network limits.
- Do not import a user's daily browser profile merely to reuse authentication. When a task genuinely requires an existing logged-in Chrome session, route to a permission-approved CDP workflow instead.

## Common Pitfalls

- **Problem:** The task needs an already logged-in personal browser.
  **Solution:** Do not use Jet Browser for that path; use the environment's authorized CDP integration.
- **Problem:** The image fails on an ARM host.
  **Solution:** Use Docker's `linux/amd64` emulation when appropriate or build the pinned source for the host architecture.
- **Problem:** A harness assumes Chromium/CDP fields.
  **Solution:** Use the JSONL protocol and `sdk/tools.mjs` declarations shipped by the pinned Jet source.
- **Problem:** A partial startup is reported as a pass.
  **Solution:** Require the complete native-input, DOM, PNG, offline-network, and cleanup assertions before reporting success.

## Additional Resources

- [Jet Browser source](https://github.com/masakaai/jet-browser)
- [v0.6.7 release](https://github.com/masakaai/jet-browser/releases/tag/v0.6.7)
- [Standalone demo](https://github.com/masakaai/jet-browser/blob/v0.6.7/docs/demo.md)
- [Agent tool catalog](https://github.com/masakaai/jet-browser/blob/v0.6.7/docs/agent-tools.md)
- [Benchmark method](https://github.com/masakaai/jet-browser/blob/v0.6.7/docs/benchmarks.md)
