# CLI/MCP workflow end-to-end verification — 2026-09-06

Scope: the agent-owned selection → manifest → CLI validation/plan → direct-installer preview → installation workflow. No release, deployment, real host configuration change, experimental Core apply or crash/race certification.

## Real client and published release

The Codex desktop MCP connector discovered and called the already-configured AAS tools. The agent inspected the Node CLI, filesystem/runtime-cache behavior, installer release identity handling and verification pipeline, searched/refined capability queries, compared skill content, chose five explicit IDs and called `compose_stack` and `inspect_stack`. Browser UI and databases were not applicable to this bounded CLI test selection. This was not a full-repository skill suitability audit.

The native MCP served the published 16.8.0 catalog, digest `sha256-a7db321f2062a10cd9637a711bfbada92a2249fe162b05e9d6e197879125b6cf`. The new CLI resolved that catalog through an explicitly populated temporary cache and prepared the command from the native manifest. The emitted POSIX command was executed unchanged for dry run, then without `--dry-run` for the user-authorized temporary installation. npm/Git resolution was real and confirmed release commit `ac3f70dddf90297e21848cc4902f80435cbeea0e`.

The dry run left the target absent. Installation copied exactly `nodejs-best-practices`, `debugging-strategies`, `test-automator`, `security-auditor`, and `ci-cd-and-automation`. All six installed files, including the debugging support document, matched the complete file inventories and SHA-256 digests returned by native MCP. No skill was selected by MCP or CLI. See the [published-flow receipt](workflow-e2e-published-2026-09-06.json).

## Candidate verification and fixed defect

A reproduced mismatch allowed `stack install-preview` to prepare paths such as `invalid?directory`, while the direct installer rejected them with an uncaught stack trace. The CLI now applies the installer's filename restrictions before preparing the command; direct target-resolution failures return a concise error and failure exit code. Regression cases include invalid punctuation, reserved names, trailing dots and absence of a stack trace.

The installed-candidate runner now executes the real packaged installer through the prepared command in a disposable directory. Only npm publication metadata and Git transport are deterministic fixtures; they are explicitly labeled in its receipt. It verifies:

- dry run does not create the target;
- exact selected entries and every payload byte, including support files;
- repeated installation preserves payload bytes and unrelated user files;
- reducing the explicit selection previews removals without mutation, then removes only stale managed skills;
- a moved release identity fails without target changes;
- a symlink target fails without modifying its referent.

The receipt aggregate refuses missing or failed installation evidence, rather than treating command generation alone as proof of installation. Existing packed checks still cover CLI/MCP round trips, catalog/runtime identity, automatic runtime resolution, traversal rejection, immutable planning and disabled experimental operations.

## Evidence limits

Native-client evidence covers the installed published MCP; candidate MCP behavior is exercised through real stdio. The candidate is not a published release, and fixture npm/Git metadata does not prove future registry availability. Actual PowerShell/Windows execution and Claude client interaction were not exercised locally. These observations establish the tested workflow and boundaries, not universal skill quality or certification of experimental Core transactions. At publication, re-run exact-tag/package/client alignment against the version actually released.

The [candidate receipt](workflow-e2e-candidate-2026-09-06.json) records the actual local package run on macOS arm64 / Node 24.19.0, with every installation check passing. Its npm metadata version remains 16.8.0 but its tarball digest identifies the unreleased source candidate. The 179 Core tests, documentation consistency, reference validation, documentation security, catalog integrity and zero-warning checks also passed.
