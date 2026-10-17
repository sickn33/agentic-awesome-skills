# Account, host and privacy prerequisites

The offline demonstration uses synthetic records and does not require signup, a LinkedIn account, credentials or a network connection. The Python helper uses only the standard library and requires Python 3.10 or newer.

A real audit requires:

- An [OutreachGenie account](https://app.outreachgenie.ai) with access to the intended workspace, one saved flow and the selected saved prospect lists.
- A host that can connect to the hosted MCP endpoint `https://api.outreachgenie.ai/mcp`, read the selected tools, store a private local snapshot and run Python.
- Authorization to read those records. Prefer an OAuth connection limited to `crm.read` when the host supports it. The read tools used by this skill do not require campaign activation or write scopes. Existing workspace API keys may be broader; a written skill is not a server-side permission boundary.

Use the current [developer documentation](https://www.outreachgenie.ai/developers) and [MCP connection documentation](https://app.outreachgenie.ai/docs/mcp/claude) for connection setup. Let the host perform OAuth login and consent. Do not paste tokens or passwords into chat, source files, fixtures, reports or command arguments. This package does not configure credentials or register an OAuth client.

The helper itself makes no HTTP requests. During connected collection, the MCP server and the chosen AI host/model provider process the returned records; host retention and processing terms still apply. Do not describe the whole workflow as browser-only, offline, or zero third-party processing. Keep snapshots outside git and shared/synced folders unless the user deliberately chose a suitable location. Inputs contain saved personal data even though report outputs omit raw values and message text. IDs, field names and flow structure can still be sensitive.

## Compatibility evidence

The package uses the Agent Skills directory format (`SKILL.md`, `scripts/`, `references/`). This distribution omits the upstream optional Codex UI metadata; it is not needed to run the helper. Local synthetic execution is testable without an MCP host. Format compatibility is not a claim that every host executes the skill or authenticates successfully.

The offline helper and fictional fixture have been validated locally.

On October 16, 2026, Codex CLI 0.160.0 on Linux with Python 3.11.8 completed an explicit `$outreachgenie-list-audit` invocation in an isolated workspace using the included fictional fixture. The host read the installed instructions, ran the local helper with an absolute Python interpreter path and explained the generated report. No OutreachGenie account or MCP connection was used.

This verifies one explicit fixture workflow only. Real account connections, hosted OAuth, real-workspace capture, automatic skill selection, Claude Code and ChatGPT/Claude web execution remain unverified. A web chat host without a local interpreter cannot use the helper as written; it should report the missing capability, not imitate the checks or claim a tested result.

The audit is read-only and does not need the OutreachGenie Chrome companion to be running. It does not discover current LinkedIn profile data, verify current connections, or exercise delivery. If the user has no saved data, explain that the demo is available; do not silently import or enrich prospects to make the audit run.
