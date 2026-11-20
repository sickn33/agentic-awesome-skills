---
name: sybil-local-studio-test-t3-app
description: Verify a T3 Code web or desktop flow through its Browser panel against isolated checkout state.
license: MIT
metadata:
  aas-category: development
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.agents/skills/test-t3-app
  aas-source-repo: sybil-solutions/local-studio
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/local-studio/blob/f65c8af78582f741b62546c93d7c66439f0cd5b1/LICENSE
  aas-author: T3 Tools Inc.
  aas-date-added: '2026-11-19'
---

# Test T3 Code Web and Desktop

## When to Use

Use when verifying browser pairing or web and desktop UI in a local T3 Code-derived checkout.

## Workflow

1. Reuse the intended checkout's healthy dev server or start it using its documented runner. Use worktree-local ignored state and the startup-reported port. Use a representative synthetic project and thread. Stop the test server before any direct fixture database write.
2. Confirm the built-in Browser panel surface is available, open it if needed, and navigate once using the locally supplied pairing URL. If a credential expires or has been consumed, issue a fresh one with the repository's pairing helper. Keep it out of output and screenshots.
3. Exercise the normal entry point and the changed flow. Record expected and observed app state and preserve the fixture and terminal session while the user iterates. Stop only processes started for this task when teardown is authorized.

## Example

“Verify a newly created thread survives a reload.” Pair the local test instance, create a synthetic thread and confirm it appears after reloading the same panel.

## Limitations

Requires the T3 Browser panel and a compatible checkout. Production user state and external sharing are outside routine verification. Use the mobile skill for device testing.

## Bundled resources

Use the [bundled SQLite fixture guide](references/sqlite-fixtures.md) when inspecting or seeding worktree-local state. The installed `agents/openai.yaml` contains the app-facing metadata. The T3 Code checkout, its Browser panel and its normal dev runner are the target environment.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.agents/skills/test-t3-app). See the [MIT license](LICENSE).

Local Studio carries these workflows from its [T3 Code base](https://github.com/pingdotgg/t3code).
