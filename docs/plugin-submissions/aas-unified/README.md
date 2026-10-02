# Unified AAS local plugin: distribution preparation

This package combines catalog discovery, local Core, and Workbench. Runtime
operations run on the user's computer. The publisher pays for no shared plugin
runtime, database, inference service, or per-user request processing. Existing
website hosting is independent of plugin use.

## Publisher decisions

The maintainer specified Agentic Awesome Skills (AAS) as the business publisher,
worldwide availability, a completely free product, and fully local operation.
These are declared decisions, not evidence of a verified legal entity or directory
approval. Verification must use the actual entity accepted by the portal.

## Self-contained package

The portable manifest uses extensions["com.openai"]; the package also includes a
Codex compatibility overlay and repo marketplace. Three native workflows guide
discovery, agent-owned composition, and review. A bundled stdio MCP exposes the
existing nine read-only Core tools plus open_workbench. The complete catalog,
supporting files, schemas, dependencies, license notices, offline CLI, and
single-file Workbench are included. Node.js 22 or later must already be installed;
no npm install occurs at runtime.

Catalog assets and supporting file digests are verified during packaging.
Dependencies are compiled into runtime files without shipping node_modules.
State is process-local and disappears when the session closes. The plugin has no
endpoint, cloud credentials, telemetry, database, background service, or hosted
fallback. Static publisher/support/legal links are listing metadata, not runtime
requests. Catalog content remains untrusted; retrieving it does not authorize
executing scripts or downloading declared prerequisites.

Workbench validates host results or explicit local imports in browser memory.
Its resource declares no external connection or resource domains. Embedded mode
disables feedback, catalog downloads, and the npm installer handoff. Clients
without MCP Apps can open the bundled HTML locally. Core inspection, browser
consistency checks, and semantic judgment remain distinct.

The offline CLI supports stack init/create/audit/plan/doctor. Project inspection,
artifact saving, and native skill installation remain authorized client operations.
The plugin neither requires nor configures owner infrastructure.

## Review and publication evidence

apps/aas-plugin/plugin-source.json contains positive and negative review cases.
Local integration tests use an SDK client against a relocated self-contained
package with networking denied. Codex CLI marketplace registration and plugin
installation also passed using an isolated temporary CODEX_HOME, without changing
the maintainer configuration. Native UI rendering, public directory acceptance,
and submission remain unverified.

Complete supported-client installation and UI verification, exact-head source
review, protected canonical synchronization, publisher verification, applicable
local-plugin directory eligibility, policy/link checks, and an accessible demo
before claiming official publication. Do not introduce hosting to meet another
client's requirements: the maintainer's local-only constraint is binding.
Worldwide availability and no commerce must be confirmed by the actual portal.
No application has been submitted.

## Infrastructure cleanup

The experimental Upstash resource, two manually created Vercel previews, and the
automatic PR preview containing the MCP were removed on 2026-10-02. Redis resources and associated Preview environment variables
were confirmed absent. The Function, container, Redis adapter, hosted startup
entrypoint, and deployment instructions were removed. Production and DNS were
never changed. The existing website project is retained; its build previews do
not provide a plugin endpoint.

## Official references

- [Plugin architecture](https://developers.openai.com/plugins/build/plugins)
- [MCP server requirements](https://developers.openai.com/plugins/build/mcp-server)
- [MCP Apps UI](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Submission](https://developers.openai.com/plugins/deploy/submission)
- [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines)
