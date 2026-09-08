# Agent-owned CLI workflow audit — 2026-09-06

The agent exclusively analyzes the project and chooses exact skill IDs. MCP stays local, offline and read-only. This change removes mechanical handoff steps, without adding selection policy or promoting experimental Core apply/recovery.

- `stack install-preview` validates the manifest and pinned local catalog, verifies every selected ID, and prepares a quoted direct-installer dry run. It also returns executable/argument fields for callers that avoid a shell. Destination is explicitly the skill directory. It never reads project source or invokes npm. The installer has its own preview and ownership model; it does not consume Core plans. Published release availability is not established by local catalog identity.
- `stack plan` may omit runtime integrity when exactly one fully verified runtime exists for the manifest version in the explicit cache. Lookup is offline and bounded to 64 entries, rejects multiple verified identities, and verifies the complete asset closure. Explicit integrity remains supported; the runtime catalog must still match the manifest.
- Common failures include bounded next-step guidance without copying native exceptions or private paths into results.

Regression coverage includes real shell argument parsing without executing npm, exact-ID preservation, empty and unknown selections, PowerShell quoting and rejected metacharacters, untouched destinations, missing/tampered/ambiguous runtime caches, lookup limits, and production CLI auto-resolution. The installed-candidate runner exercises the new handoff and automatic resolution in addition to the existing CLI/MCP checks.

Native Codex/Claude interaction, actual installation through the emitted command, Windows runtime execution and experimental transaction certification are outside this evidence. No release, deployment or real host configuration change is performed.

Observed validation: 178 Core tests passed; references, documentation consistency, docs security, catalog integrity and zero-warning budget passed. The [installed-candidate receipt](agent-owned-cli-workflow-2026-09-06-receipt.json) records a local source candidate on macOS arm64 / Node 24.19.0, including the handoff and automatic runtime resolution. Package metadata remains 16.8.0; this is not the published 16.8.0 tarball.
