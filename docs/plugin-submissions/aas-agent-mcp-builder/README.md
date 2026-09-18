# AAS Agent & MCP Builder submission dossier

This directory is the version-controlled source for the first proposed public AAS listing in the universal ChatGPT and Codex Plugins Directory.

The submission is intentionally **skills-only**. The existing AAS Core MCP remains local, offline, read-only, and separately distributed; it is not presented as a public production endpoint.

## Included evidence

- [`submission.json`](submission.json) contains the listing copy, public URLs, starter prompts, release notes, package paths, and the remaining publisher-owned decisions.
- [`evaluation-cases.json`](evaluation-cases.json) contains six positive and four negative reviewer-reproducible cases.
- [`evaluation-results.json`](evaluation-results.json) records a complete 10/10 Codex CLI pass from ephemeral, read-only conversations against the installed 15.10.0 plugin, including the client warnings that must remain visible during final review.
- The final upload source is [`plugins/agentic-bundle-aas-agent-mcp-builder/`](../../../plugins/agentic-bundle-aas-agent-mcp-builder/), generated from canonical skills and validated with the repository's bundle and plugin gates.
- The production logo source is [`apps/web-app/public/web-app-manifest-512x512.png`](../../../apps/web-app/public/web-app-manifest-512x512.png).

## Publication boundary

Repository automation can prepare and validate the complete draft, but it cannot truthfully select a verified publisher identity, accept OpenAI policy attestations, or choose legal availability on behalf of the account holder. Those fields must be confirmed in the OpenAI Platform before **Submit for Review**.

Submission starts OpenAI review; it does not immediately publish the plugin. After approval, the verified publisher must perform the separate publish action in the portal.
