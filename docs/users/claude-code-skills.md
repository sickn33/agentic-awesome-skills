# AAS Core with Claude Code

Connect Claude Code to the local AAS catalog, ask it to inspect your project and choose skills, then review a validated selection before installing anything. You do not need to copy the whole library into your project first.

## Track your progress

- [ ] Steps 1–2: preview and approve the exact configuration; save the runtime integrity.
- [ ] Step 3: search and read a skill through this client.
- [ ] Step 4: review the selected IDs and approve saving the manifest.
- [ ] Step 5: validate the manifest and inspect the plan.
- [ ] Step 6: review the separate installation preview, approve installation, and verify your task result.

If already configured, begin at step 3. If a step fails, keep its error and resume there after resolving it. Keep one release and catalog identity throughout the flow.

## Before you start

- Install Node.js 22 or newer and Claude Code, and confirm they start normally.
- Open a bash or zsh terminal inside the project you want to work on. Keep this terminal open for the commands below.
- The examples pin AAS to the release named in each command. Downloading the CLI and approved runtime requires network access; catalog search and reading then work locally without a cloud service or model API key for AAS.

This user-scoped setup uses `~/.claude.json`, the Claude Code user MCP configuration. If you use a custom configuration location, set `AAS_CONFIG` to the actual user MCP JSON file read by that client. Project-scoped `.mcp.json` and Claude Desktop are different configurations.

These shell examples are for macOS and Linux. On native Windows, use PowerShell syntax, absolute Windows paths and the same preview/approval steps; see [Windows setup](aas-core.md#native-windows-and-codex). Do not paste bash variable assignments into PowerShell.

## 1. Preview the MCP configuration

Set the paths and preview the proposed change. This creates the configuration parent directory if needed; the preview itself does not write the host configuration or install the managed runtime.

<!-- aas-agent-setup:claude:preview -->
```bash
AAS_CONFIG="$HOME/.claude.json"
AAS_CACHE="$HOME/.cache/aas"
AAS_BACKUP="$HOME/.aas-mcp-backups"
mkdir -p "$(dirname "$AAS_CONFIG")"

npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas mcp configure \
  --host claude --scope user --version 19.15.0 \
  --config "$AAS_CONFIG" --cache-root "$AAS_CACHE" \
  --backup-dir "$AAS_BACKUP"
```
<!-- /aas-agent-setup -->

Look for `status: "approvalRequired"`, `approvalDigest`, the exact runtime version and the proposed managed `aas` section. Check that the configuration and cache paths are the ones you intended. The backup directory protects an existing configuration when you approve its replacement. If preview returns an error, resolve it before continuing.

## 2. Approve the change you inspected

Replace the placeholder with the preview's actual `approvalDigest`, then run the same command with approval. Keep every other argument unchanged. If the preview becomes stale, preview again and review the new digest.

<!-- aas-agent-setup:claude:approve -->
```bash
AAS_APPROVAL="PASTE_THE_PREVIEW_APPROVAL_DIGEST"
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas mcp configure \
  --host claude --scope user --version 19.15.0 \
  --config "$AAS_CONFIG" --cache-root "$AAS_CACHE" \
  --backup-dir "$AAS_BACKUP" \
  --approve "$AAS_APPROVAL"
```
<!-- /aas-agent-setup -->

Expect `status: "configured"` or `"alreadyConfigured"`. Retain the returned `runtime.integrity` for the plan command below. AAS installs or verifies a content-addressed runtime and edits its managed MCP section; it preserves unrelated host settings and keeps a backup when replacing an existing file.

## 3. Verify the connection in Claude Code

Run `claude mcp get aas` in your terminal, then open a fresh Claude Code session and run `/mcp`.

Confirm that `aas` connects and exposes `search_skills`, `get_skill`, `compose_stack` and `inspect_stack`. The terminal command shows configuration; a successful tool call in the client proves the connection. If `aas` is missing, check which configuration path the client uses and restart it. If it cannot connect, inspect its reported error rather than adding a second server entry.

Send this short connection check:

```text
Use the local AAS MCP to search for systematic-debugging, then read that skill
with get_skill including its full content. Report its exact ID and catalog
version. Do not install anything or change project files.
```

You should receive actual tool results and the skill content. A directory existing on disk is not enough.

## 4. Get your first project selection

Give Claude Code your task and constraints, then paste this request:

```text
Work autonomously. Inspect this project and identify its primary capability
areas. Evaluate architecture/runtime, languages/frameworks, domain behavior,
data/storage, integrations, testing/quality, security/privacy, user experience
and accessibility, deployment/operations, and maintenance; mark dimensions that
are not applicable. Search the complete AAS catalog for each applicable area,
paginate or refine the searches, and read and compare plausible candidates.
Choose non-redundant skill IDs that cover the applicable capabilities and report
catalog gaps. Do not optimize for the smallest stack. Use compose_stack with
these exact IDs, a project profile, and target claude:project to return a schema 2
manifest. Use inspect_stack and show me the result and selection rationale.
Do not install skills or write files yet.
```

Success means the agent has read real skills, returned `aas-stack.json` and obtained a valid inspection result. The agent chooses; Core checks IDs, structure and catalog identity. Validity does not establish semantic fit or safety to apply.

Review the exact IDs and requirements. Once you approve saving the selection, ask the agent to write the returned manifest unchanged to `aas-stack.json` in this project. MCP returns it in memory; the client saves it. Do not use a manifest from another release or substitute a sample manifest for the actual tool result.

## 5. Validate and preview the project plan

In the same terminal, replace the integrity placeholder with `runtime.integrity` from step 2. `AAS_PROJECT` must be the absolute path to the existing project directory containing your reviewed manifest.

<!-- aas-agent-setup:claude:plan -->
```bash
AAS_PROJECT="$PWD"
AAS_INTEGRITY="PASTE_RUNTIME_INTEGRITY_FROM_CONFIGURATION"

npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas stack validate --manifest "$AAS_PROJECT/aas-stack.json"

npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas stack plan \
  --manifest "$AAS_PROJECT/aas-stack.json" \
  --target claude:project --target-root "$AAS_PROJECT" \
  --cache-root "$AAS_CACHE" --runtime-integrity "$AAS_INTEGRITY" \
  --out "$AAS_PROJECT/aas-plan.json"
```
<!-- /aas-agent-setup -->

Run validation first and stop if it fails. Expect `valid`, then `planned`. Review `aas-plan.json`, or import it together with the manifest into [Workbench](https://aaskills.tech/workbench/). Planning writes only the requested plan artifact and leaves target skills unchanged. Core apply and recovery remain experimental.

## 6. Use the reviewed skills

Prepare the separate direct-installer dry run from the exact selected IDs:

<!-- aas-agent-setup:claude:install -->
```bash
npm exec --yes --ignore-scripts --package=agentic-awesome-skills@19.15.0 -- aas stack install-preview \
  --manifest "$AAS_PROJECT/aas-stack.json" --cache-root "$AAS_CACHE" \
  --destination "$AAS_PROJECT/.claude/skills"
```
<!-- /aas-agent-setup -->

This command returns an installation command; it does not execute it. Run the returned command with `--dry-run`, review the destination, release and selected IDs, then remove only `--dry-run` if you approve installation. The destination is this project's `.claude/skills` directory. Keep the generated destination or choose the actual skill directory your client reads. The direct installer distributes complete skill bundles; it does not apply the Core plan.

Reopen the client if needed and ask it to use a selected skill on your original task. Check the resulting test, review or artifact. That is your first useful use, beyond merely producing a valid manifest.

The [Core reference](aas-core.md) explains evidence exports, advanced configuration and trust boundaries. The direct library and plugin options below remain available when you already know which content you want.

## Direct install and plugins

These are alternative delivery paths for users who already know which skill payload they want.

### Option A: installer CLI

```bash
npx agentic-awesome-skills --claude
```

### Option B: Claude Code plugin marketplace

```text
/plugin marketplace add sickn33/agentic-awesome-skills
/plugin install agentic-awesome-skills
```

The Claude marketplace plugin is a plugin-safe filtered distribution of the repo. Skills that still require portability hardening or explicit setup metadata remain available in the repository, but are excluded from the plugin until they are ready.

You can also install a focused bundle plugin instead of the root plugin when you want a narrower starter surface. See [plugins.md](plugins.md) and [bundles.md](bundles.md).

### Verify the install

```bash
test -d .claude/skills || test -d ~/.claude/skills
```

## Best starter skills for Claude Code

- [`brainstorming`](../../skills/brainstorming/): plan features and specs before writing code.
- [`lint-and-validate`](../../skills/lint-and-validate/): run fast quality checks before you commit.
- [`create-pr`](../../skills/create-pr/): package your work into a clean pull request.
- [`systematic-debugging`](../../skills/systematic-debugging/): investigate failures with a repeatable process.
- [`security-auditor`](../../skills/security-auditor/): review APIs, auth, and sensitive flows with a security lens.

## Example Claude Code prompts

With AAS Core configured:

```text
Inspect this security-review project, search and read the complete AAS catalog, and choose the exact skill IDs you judge most useful. Use compose_stack with a project profile, show me the schema 2 aas-stack.json, inspect it, and preview the plan without applying it.
```

After installing or activating a chosen skill, direct invocation still works:

```text
Use @brainstorming to design a new billing workflow for my SaaS.
```

```text
Use @lint-and-validate on src/routes/api.ts and fix the issues you find.
```

```text
Use @create-pr to turn these changes into a clean PR summary and checklist.
```

## What to do next

- Start with [`aas-core.md`](aas-core.md) for setup, trust boundaries, and the stack lifecycle.
- Start with [`bundles.md`](bundles.md) if you want a role-based shortlist.
- Use [`workflows.md`](workflows.md) if you want step-by-step execution playbooks.
- Compare options in [`best-claude-code-skills-github.md`](best-claude-code-skills-github.md) if you are still evaluating repositories.
- Go back to the main landing page in [`README.md`](../../README.md) when you want the full installation matrix.
