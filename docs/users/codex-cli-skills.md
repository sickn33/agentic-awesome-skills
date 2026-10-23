# AAS Core with Codex

Connect Codex to the local AAS catalog, ask it to inspect your project and choose skills, then review a validated selection before installing anything. You do not need to copy the whole library into your project first.

## Track your progress

- [ ] Steps 1–2: preview and approve the exact configuration; save the runtime integrity.
- [ ] Step 3: search and read a skill through this client.
- [ ] Step 4: review the selected IDs and approve saving the manifest.
- [ ] Step 5: validate the manifest and inspect the plan.
- [ ] Step 6: review the separate installation preview, approve installation, and verify your task result.

If already configured, begin at step 3. If a step fails, keep its error and resume there after resolving it. Keep one release and catalog identity throughout the flow.

## Before you start

- Install Node.js 22 or newer and Codex, and confirm they start normally.
- Open a bash or zsh terminal inside the project you want to work on. Keep this terminal open for the commands below.
- The examples pin AAS to the release named in each command. Downloading the CLI and approved runtime requires network access; catalog search and reading then work locally without a cloud service or model API key for AAS.

The default Codex configuration is `~/.codex/config.toml`. If you use a custom `CODEX_HOME`, set `AAS_CONFIG` to that directory's absolute `config.toml` path instead.

These shell examples are for macOS and Linux. On native Windows, use PowerShell syntax, absolute Windows paths and the same preview/approval steps; see [Windows setup](aas-core.md#native-windows-and-codex). Do not paste bash variable assignments into PowerShell.

## 1. Preview the MCP configuration

Set the paths and preview the proposed change. This creates the configuration parent directory if needed; the preview itself does not write the host configuration or install the managed runtime.

<!-- aas-agent-setup:codex:preview -->
```bash
AAS_CONFIG="$HOME/.codex/config.toml"
AAS_CACHE="$HOME/.cache/aas"
AAS_BACKUP="$HOME/.aas-mcp-backups"
mkdir -p "$(dirname "$AAS_CONFIG")"

npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas mcp configure \
  --host codex --scope user --version 19.15.0 \
  --config "$AAS_CONFIG" --cache-root "$AAS_CACHE" \
  --backup-dir "$AAS_BACKUP"
```
<!-- /aas-agent-setup -->

Look for `status: "approvalRequired"`, `approvalDigest`, the exact runtime version and the proposed managed `aas` section. Check that the configuration and cache paths are the ones you intended. The backup directory protects an existing configuration when you approve its replacement. If preview returns an error, resolve it before continuing.

## 2. Approve the change you inspected

Replace the placeholder with the preview's actual `approvalDigest`, then run the same command with approval. Keep every other argument unchanged. If the preview becomes stale, preview again and review the new digest.

<!-- aas-agent-setup:codex:approve -->
```bash
AAS_APPROVAL="PASTE_THE_PREVIEW_APPROVAL_DIGEST"
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas mcp configure \
  --host codex --scope user --version 19.15.0 \
  --config "$AAS_CONFIG" --cache-root "$AAS_CACHE" \
  --backup-dir "$AAS_BACKUP" \
  --approve "$AAS_APPROVAL"
```
<!-- /aas-agent-setup -->

Expect `status: "configured"` or `"alreadyConfigured"`. Retain the returned `runtime.integrity` for the plan command below. AAS installs or verifies a content-addressed runtime and edits its managed MCP section; it preserves unrelated host settings and keeps a backup when replacing an existing file.

## 3. Verify the connection in Codex

Run `codex mcp get aas` in your terminal, then open a fresh Codex session and run `/mcp`.

Confirm that `aas` connects and exposes `search_skills`, `get_skill`, `compose_stack` and `inspect_stack`. The terminal command shows configuration; a successful tool call in the client proves the connection. If `aas` is missing, check which configuration path the client uses and restart it. If it cannot connect, inspect its reported error rather than adding a second server entry.

Send this short connection check:

```text
Use the local AAS MCP to search for systematic-debugging, then read that skill
with get_skill including its full content. Report its exact ID and catalog
version. Do not install anything or change project files.
```

You should receive actual tool results and the skill content. A directory existing on disk is not enough.

## 4. Get your first project selection

Give Codex your task and constraints, then paste this request:

```text
Work autonomously. Inspect this project and identify its primary capability
areas. Evaluate architecture/runtime, languages/frameworks, domain behavior,
data/storage, integrations, testing/quality, security/privacy, user experience
and accessibility, deployment/operations, and maintenance; mark dimensions that
are not applicable. Search the complete AAS catalog for each applicable area,
paginate or refine the searches, and read and compare plausible candidates.
Choose non-redundant skill IDs that cover the applicable capabilities and report
catalog gaps. Do not optimize for the smallest stack. Use compose_stack with
these exact IDs, a project profile, and target codex:project to return a schema 2
manifest. Use inspect_stack and show me the result and selection rationale.
Do not install skills or write files yet.
```

Success means the agent has read real skills, returned `aas-stack.json` and obtained a valid inspection result. The agent chooses; Core checks IDs, structure and catalog identity. Validity does not establish semantic fit or safety to apply.

Review the exact IDs and requirements. Once you approve saving the selection, ask the agent to write the returned manifest unchanged to `aas-stack.json` in this project. MCP returns it in memory; the client saves it. Do not use a manifest from another release or substitute a sample manifest for the actual tool result.

## 5. Validate and preview the project plan

In the same terminal, replace the integrity placeholder with `runtime.integrity` from step 2. `AAS_PROJECT` must be the absolute path to the existing project directory containing your reviewed manifest.

<!-- aas-agent-setup:codex:plan -->
```bash
AAS_PROJECT="$PWD"
AAS_INTEGRITY="PASTE_RUNTIME_INTEGRITY_FROM_CONFIGURATION"

npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas stack validate --manifest "$AAS_PROJECT/aas-stack.json"

npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas stack plan \
  --manifest "$AAS_PROJECT/aas-stack.json" \
  --target codex:project --target-root "$AAS_PROJECT" \
  --cache-root "$AAS_CACHE" --runtime-integrity "$AAS_INTEGRITY" \
  --out "$AAS_PROJECT/aas-plan.json"
```
<!-- /aas-agent-setup -->

Run validation first and stop if it fails. Expect `valid`, then `planned`. Review `aas-plan.json`, or import it together with the manifest into [Workbench](https://aaskills.tech/workbench/). Planning writes only the requested plan artifact and leaves target skills unchanged. Core apply and recovery remain experimental.

## 6. Use the reviewed skills

Prepare the separate direct-installer dry run from the exact selected IDs:

<!-- aas-agent-setup:codex:install -->
```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas stack install-preview \
  --manifest "$AAS_PROJECT/aas-stack.json" --cache-root "$AAS_CACHE" \
  --destination "$AAS_PROJECT/.agents/skills"
```
<!-- /aas-agent-setup -->

This command returns an installation command; it does not execute it. Run the returned command with `--dry-run`, review the destination, release and selected IDs, then remove only `--dry-run` if you approve installation. The destination is this project's `.agents/skills` directory. Keep the generated destination or choose the actual skill directory your client reads. The direct installer distributes complete skill bundles; it does not apply the Core plan.

Reopen the client if needed and ask it to use a selected skill on your original task. Check the resulting test, review or artifact. That is your first useful use, beyond merely producing a valid manifest.

The [Core reference](aas-core.md) explains evidence exports, advanced configuration and trust boundaries. The direct library and plugin options below remain available when you already know which content you want.

## Direct install and plugins

Use a direct install only when you intentionally want the library copied into Codex's skills path:

```bash
npx agentic-awesome-skills --codex
```

For plugin-style packaging, this repository also ships repo-local metadata in `.agents/plugins/marketplace.json` and `plugins/agentic-awesome-skills/.codex-plugin/plugin.json`.

It also generates bundle-specific Codex plugins so you can install a curated pack such as `Essentials` or `Web Wizard` as a marketplace plugin instead of loading the full library.

Those Codex plugins are plugin-safe filtered distributions. Skills that still depend on host-specific paths or undeclared setup stay in the repository, but are not published into the Codex plugin until they are hardened.

For the canonical explanation of how Core, Codex plugins, and direct installs relate, read [plugins.md](plugins.md).

### Verify the install

```bash
test -d .codex/skills || test -d ~/.codex/skills
```

## Best starter skills for Codex CLI

- [`brainstorming`](../../skills/brainstorming/): clarify requirements before touching code.
- [`concise-planning`](../../skills/concise-planning/): turn ambiguous work into an atomic execution plan.
- [`test-driven-development`](../../skills/test-driven-development/): structure changes around red-green-refactor.
- [`lint-and-validate`](../../skills/lint-and-validate/): keep quality checks close to the implementation loop.
- [`create-pr`](../../skills/create-pr/): wrap up work cleanly once implementation is done.

## Example Codex CLI prompts

With AAS Core configured:

```text
Inspect this parser project, search and read the complete AAS catalog, and choose the exact skill IDs you judge most useful for designing and testing the change. Use compose_stack with a project profile, show me the schema 2 aas-stack.json, inspect it, and preview the plan; do not apply it.
```

After installing or activating a chosen skill, direct invocation still works:

```text
Use @concise-planning to break this feature request into an implementation checklist.
```

```text
Use @test-driven-development to add tests before changing this parser.
```

```text
Use @create-pr once everything is passing and summarize the user-facing changes.
```

## What to do next

- Start with [`aas-core.md`](aas-core.md) for setup, trust boundaries, and the stack lifecycle.
- Read [`ai-agent-skills.md`](ai-agent-skills.md) if you want a framework for choosing between broad and curated skill libraries.
- Read [`plugins.md`](plugins.md) if you want the plugin-specific install story for Codex and Claude Code.
- Use [`workflows.md`](workflows.md) when you want step-by-step execution patterns for common engineering goals.
- Return to [`README.md`](../../README.md) for the full compatibility matrix.
