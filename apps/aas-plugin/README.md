# Unified AAS local plugin

The plugin bundles the complete AAS catalog and supporting files, the read-only
Core MCP, an offline artifact CLI, and Workbench. Three native workflow skills
guide discovery, agent-owned composition, and review. Everything runs on the
user's computer. No HTTP server, listening port, AAS endpoint, Redis, API key,
runtime package download, or hosted fallback is used. Session artifacts and
factual traces exist only in the local MCP process.

## Build and verify

Use Node.js 22 or later. From the repository root:

```sh
npm ci --ignore-scripts
npm run app:install
npm run plugin:install
npm run chain
npm run plugin:build
npm run plugin:test
npm run plugin:package
```

These are maintainer build commands, not runtime requirements. The generated
`.tmp/aas-plugin/local-*/` directory contains a repo marketplace, self-contained
plugin, and `aas-local.zip`. Its stdio configuration starts the bundled runtime
with node; it never runs npm or npx. Dependencies include license notices.
Native workflows occupy skills/; the complete catalog occupies the isolated core/
data root. Packaging verifies catalog assets and every included supporting file's
size and digest, and excludes symlinks. Tests relocate the package outside the
checkout and deny outbound networking. Existing host settings are not modified.

## Workbench and filesystem operations

Workbench consumes host tool results or explicit file/paste imports and validates
artifacts in browser memory. Embedded mode disables catalog fetching, feedback,
and the npm installer handoff. The UI resource declares no network or external
resource domains. Clients without MCP Apps rendering can open the bundled
ui/workbench.html directly. Validation does not certify semantic fit; the coding
agent chooses exact skill IDs.

MCP does not install skills or scan projects. The client inspects only the
user-authorized project and saves artifacts when requested. The bundled
runtime/aas-core.cjs accepts offline stack init/create/audit/plan/doctor commands.
It rejects catalog downloads, host configuration, and automatic installation.
Installing this plugin exposes three native workflows; all catalog entries remain
available locally through MCP.

## Distribution boundary

The portable manifests and Codex compatibility overlay describe a local stdio
package. A ZIP does not prove native installation, UI rendering, public directory
eligibility, publisher verification, submission, or approval. See the
[submission dossier](../../docs/plugin-submissions/aas-unified/README.md).
There is no remote service to deploy for this plugin.
