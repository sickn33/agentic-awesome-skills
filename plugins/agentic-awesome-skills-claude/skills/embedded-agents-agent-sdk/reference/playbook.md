# Embedded agents — architecture playbook

**Embedded agents** are Claude agents that run as callable components inside the application. The app handles routing, the caller, persistence and the UI; each agent runs in its own sandbox (`.claude/agents/<name>/`) with its own `AGENTS.md`, knowledge files, skills and MCP config. One function call — `query()` from `@anthropic-ai/claude-agent-sdk` — is the entire orchestration layer.

The boundary is clean: **the app owns the request lifecycle, the caller and storage. The agent owns reasoning, tool selection and iteration.**

This playbook was built on an earlier project and re-measured on `2026-09-26` against `@anthropic-ai/claude-agent-sdk` 0.3.283 (Claude Code 2.1.281). Where that measurement contradicted the earlier design, the design changed; § 9 lists each change with its proof. Re-measure after an SDK upgrade: the defaults moved once and will again.

---

## 1. Agent directory layout

```
.claude/agents/
└── <agent-name>/                          ← the agent's workspace: the only directory it can read
    ├── AGENTS.md                          ← its instructions and identity rules (the only instruction file)
    ├── .mcp.json                          ← agent-scoped MCP servers (when needed)
    ├── knowledge/                         ← optional: reference files the agent answers from
    │   └── *.md
    └── .claude/
        └── skills/<skill-name>/SKILL.md   ← agent-scoped skill (when needed)
```

Each agent directory is self-contained. To add an agent, create the folder with its `AGENTS.md` and call `askAgent({ agent: '<name>', … })` — or nothing at all, if the UI lists agents from `GET /api/agents`.

**One side effect on the developer's machine.** Claude Code scans `.claude/agents/` recursively for its *own* subagent definitions, and registers any `.md` file there that carries `name:` frontmatter. An agent-local `SKILL.md` therefore shows up as a subagent in the developer's Claude Code session (measured: `local-skill` appeared in the init message's `agents`). `AGENTS.md` and knowledge files carry no frontmatter and are not registered. Harmless to the product; keep instruction and knowledge files free of frontmatter so it stays that way.

---

## 2. The call site

The orchestration layer is one `query()` call. The wrapper (§ 5) builds its options in `agentOptions()`:

```ts
query({
  prompt: question,
  options: {
    cwd: '.claude/agents/<agent-name>',
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code', append: agentsMd },
    skills: ['<skill-name>'],
    strictMcpConfig: true,
    mcpServers: { /* only this agent's */ },
    tools: ['Read', 'Glob', 'Grep'],
    allowedTools: ['Read', 'Glob', 'Grep', 'mcp__<server>__<tool>'],
    permissionMode: 'dontAsk',
    model: 'claude-sonnet-5-5',
    maxTurns: 10,
    hooks: { /* path guard + metadata, § 6 */ },
  },
});
```

| Option | Why it's there |
|---|---|
| `cwd` | The agent's directory. A multi-agent app picks it per request — which is why the wrapper accepts only a plain directory name (§ 5). |
| `settingSources: ['project']` | Discovers the agent-local skills. Measured: with `[]` the agent's own skill is not discovered at all. |
| `systemPrompt` preset + `append` | **Load-bearing.** The SDK does not load `AGENTS.md` by itself (measured: an agent whose only instruction file was `AGENTS.md` answered with no identity and no sign-off). Appended to the `claude_code` preset, it is authoritative: the same agent quoted its instructions and signed off. Without the preset, instructions are treated as soft background and identity rules are routinely ignored (earlier measurement). |
| `skills` | The allowlist of skills the model is shown. Without it, repo-root and bundled skills are listed too (§ 3). |
| `strictMcpConfig: true` | Only the servers passed in `mcpServers` load — nothing from the developer's or the server's user config (§ 3.5). |
| `mcpServers` | This agent's servers, read from its `.mcp.json` by the wrapper. |
| `tools` | **The actual tool boundary.** `allowedTools` only auto-approves; `tools` decides which built-in tools exist. Measured: with `allowedTools: ['Read','Glob','Grep']` alone, the agent ran `Bash` and read an env file through it. |
| `allowedTools` + `permissionMode: 'dontAsk'` | `dontAsk` denies anything not pre-approved, so an MCP tool runs only if its server's `allowedTools` in `.mcp.json` lists it (measured: an unlisted tool was denied, a listed one ran). MCP names need the exact `mcp__<server>__<tool>`. |
| `model` | A current Sonnet by default; Haiku for latency-sensitive routes, Opus for harder reasoning. Per call. |
| `hooks` | The path guard (PreToolUse) and the files-read list (PostToolUse). § 6. |

**Defaults vs. overrides.** `maxTurns` defaults to `10` to stop runaway loops. `maxBudgetUsd` has no default and is passed through: set it where you know the workload. A caller may pass its own `allowedTools`; the built-in names in it become the `tools` set, so an override widens or narrows both together.

---

## 3. Skill scoping — what leaks

The CLI walks up from `cwd` collecting `.claude/` directories, and bundles its own skills besides. Measured in the init message: with `settingSources: ['project']`, the agent's discovered skills include its own, the **repo-root** ones, and the bundled CLI skills (`code-review`, `simplify`, `claude-api`, `loop`, …). The `skills` allowlist is what hides the rest: in the SDK's words, *"unlisted skills are hidden from the model's listing and rejected by the Skill tool, but their files remain on disk and are reachable via Read/Bash."* That last clause is why the path guard (§ 6) and the `tools` boundary matter: without them the allowlist is a listing filter over files the agent can still open.

**Every call passes `skills: [<exact list>]`.** The wrapper discovers the agent's `.claude/skills/*/SKILL.md` and passes their directory names. Never `'all'`.

---

## 3.5. MCP server scoping — the other leak

User-level MCP registrations leak in too, and the leak is fatter: on a developer machine with claude.ai connectors (Gmail, Drive, Slack…), an unconfigured agent inherits dozens of tools.

| Option | Strips inherited MCP servers? |
|---|---|
| (no override) | no |
| `mcpServers: {}` | no — "no *additional* servers", not "none" |
| `allowedTools: [...]` | no — approval only; the tools stay in context |
| `disallowedTools: ['mcp__*']` | no, on the earlier measurement; not re-measured |
| **`strictMcpConfig: true`** | **yes** — only `mcpServers` load (SDK: it ignores *"project `.mcp.json`, user settings, plugins, and on-disk agent frontmatter"*) |

Measured 2026-09-26: with `strictMcpConfig` and the agent's forwarded `.mcp.json`, the init message listed exactly that one server, `connected`, and none of the machine's own connectors.

**A `.mcp.json` in the agent directory does not auto-load under the contract** — `strictMcpConfig` disables every file-based source. The wrapper bridges that: it reads the agent's `.mcp.json` itself and passes the servers inline.

**`${VAR}` expansion.** Secrets never go in `.mcp.json`. The wrapper replaces any `${VAR}` inside it with `process.env.VAR`:

```jsonc
{
  "mcpServers": {
    "perplexity": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "perplexity-mcp"],
      "env": { "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}" },
      "allowedTools": ["search", "reason", "deep_research"]
    }
  }
}
```

`allowedTools` here is ours, not the SDK's: the wrapper strips it, prefixes each name as `mcp__<server>__<tool>` and approves exactly those. Granting a tool is a config edit, not a code edit. `scripts/discover-mcp-tools.mjs <agent>` lists what each server offers (from the init message — no model call); grant only what the agent's job needs.

---

## 4. Instructions — one file, loaded explicitly

An agent has exactly one instruction file, `AGENTS.md`, and the wrapper loads it by appending it to the preset (§ 2). Two measured facts shape this:

- The SDK's `settingSources: ['project']` loads its own legacy instruction-file name from the agent directory, **never `AGENTS.md`**. So the wrapper reads `AGENTS.md` itself, and throws if it is missing.
- Because the SDK does load that other name on its own, an agent directory must hold no instruction file but `AGENTS.md` — otherwise the agent runs with two sets of instructions.

**The repository's own instructions did not leak** into the agent on 2026-09-26: an agent under a repo whose root instruction files stated a passphrase could not name it, in either the old layout or this one. The earlier project did see the upward walk leak and deleted root files at build time to stop it; that is no longer needed on this SDK, and the live test (§ 8) is what will notice if it returns.

---

## 5. The wrapper (`templates/agent.ts` → `src/lib/agent.ts`)

One async generator, `askAgent({ agent, prompt, history, … })`, runs any agent. **No agent names in code** — an agent is a directory.

```ts
for await (const ev of askAgent({ agent: 'knowledge-agent', prompt })) {
  if (ev.type === 'text') /* stream the chunk */;
  if (ev.type === 'done') /* ev.metadata: cost, duration_ms, tokens, filesRead */;
  if (ev.type === 'error') /* ev.subtype: error_max_turns | error_max_budget_usd | error_during_execution */;
}
```

| Step | Behaviour |
|---|---|
| Resolve the agent | Accepts only a plain directory name (`^[a-z0-9][a-z0-9-]*$`) under `.claude/agents/` that holds an `AGENTS.md`. The name arrives in a request body; the earlier wrapper joined it onto a path, so `../..` resolved to the repo root and its instruction file. |
| `listAgents()` | Every such directory, sorted — what the route's `GET` returns and the UI's picker shows. |
| Skills, MCP, `${VAR}` | Discovered from the agent directory (§ 3, § 3.5). |
| Enforce the contract | `agentOptions()` always sets the isolation options; a call site cannot drop them. It is exported so the unit test pins it without a model call. |
| History | `history?: { role, content }[]` becomes a `Previous conversation:` preamble — no database shape baked in. |
| Events | `text` per assistant chunk; then `done` with metadata, or `error` with the result's subtype. After a non-success result the SDK also throws; the wrapper absorbs that, so the caller gets one signal. `filesRead` holds paths relative to the agent, because the list reaches the browser. |

**Adding an agent:** `scripts/new-agent.mjs <name> [--knowledge] [--mcp]`, fill in `AGENTS.md`, add knowledge, skills or `.mcp.json` as needed. No registry, no enum, no wrapper edit, no UI edit.

**Wire format** (`templates/route.ts` → `src/app/api/agents/route.ts`): server-sent events, `data: <json>\n\n` — `{ text }`, then `{ done, agent, metadata }` or `{ error, agent }`. A client parser:

```ts
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buf = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  for (let i; (i = buf.indexOf('\n\n')) !== -1; ) {
    const ev = JSON.parse(buf.slice(0, i).replace(/^data: /, ''));
    buf = buf.slice(i + 2);
    if (ev.text) appendChunk(ev.text);
    if (ev.done) finish(ev.agent, ev.metadata);
    if (ev.error) fail(ev.agent, ev.error);
  }
}
```

`EventSource` is GET-only, so a POST body needs this reader.

**TypeScript.** With SDK 0.3.283 the options type-check without casts and `msg.type` narrows the stream (verified under TypeScript 7 `strict`). Hook callbacks still need `as HookCallback`, and inputs a cast to `PreToolUseHookInput` / `PostToolUseHookInput`. A PreToolUse refusal is `{ decision: 'block', reason }` — measured to work.

---

## 6. Hooks — the path guard and live metadata

- **PreToolUse — confine the agent to its directory.** Every path a tool receives (`file_path`, `path`, Grep's `glob`, Glob's `pattern`) is resolved against the agent directory and blocked if it lands outside it, or names an env file anywhere. The earlier guard blocked only paths containing `..` or `.env`; measured, an absolute path walked straight past it and returned another file's contents.
- **PostToolUse — capture metadata.** Each `Read` path is recorded for the "files read" row under an answer.

Same hook surface as Claude Code: a dev-time permission hook works as a production guardrail.

---

## 7. Hosting

- **Not serverless.** The SDK spawns the Claude Code engine as a subprocess. That exceeds serverless size limits, agent loops run seconds to minutes (past function timeouts), and edge runtimes cannot spawn processes. **An agent cannot run in a serverless function such as a Netlify Function.** A product whose site deploys to one needs a second, long-lived host for its agents (a container or VM, such as Railway), settled before a deploy rather than discovered after one. Local `next dev` needs nothing.
- **Long-lived Node.** A host that keeps a Node process: package the app as a Node server (Next.js `output: 'standalone'`), and include the agents in its trace — `outputFileTracingIncludes: { '/api/agents': ['./.claude/agents/**/*'] }` in `next.config` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`), or the directories are missing at runtime.
- **Cold starts.** The first `query()` spawns the subprocess and loads config: a few seconds before the first token on a cold container.
- **Scale.** One engine per active conversation. The earlier project measured 15–20 concurrent reasoning turns on a $20/month box; beyond that, pool warm sessions instead of spawning one per request.
- **Authentication.** A deployed product uses `ANTHROPIC_API_KEY`. Without it, the SDK falls back to the developer's own local Claude login (measured: every probe here ran that way) — fine on a laptop, never for a product other people use.
- **Observability.** The SDK exports OpenTelemetry: set `OTEL_EXPORTER_OTLP_ENDPOINT` in the server's environment and point it at any OTLP backend. Not through the `env` option unless you spread `process.env` into it — per the SDK's types, `env` *replaces* the subprocess environment rather than merging with it.

---

## 8. Tests

| File | Runs | What it pins |
|---|---|---|
| `templates/agent.test.ts` → `tests/unit/` | inside `npm test`, no model call | the contract of `agentOptions()`: `AGENTS.md` appended, `tools` and `dontAsk`, `strictMcpConfig`, skills and MCP discovery, `${VAR}` expansion, name validation, the path guard and its wiring, history. Mutation-checked: restoring the earlier guard or dropping `dontAsk` turns three of its tests red. |
| `templates/agents.live.test.ts` → `tests/live/` | `npm run agents:live`, outside the gate | for every agent: its MCP servers are exactly its `.mcp.json`'s and connected, only its allowed built-in tools exist, and it answers. |
| `examples/*.live.test.ts` | with the examples | knowledge-agent signs off, answers the OKR target from `knowledge/okrs.md` with a citation, and refuses a topic its files do not cover; research-agent signs off and cites a source. |

Live tests hit the real model and cost cents per run; the research test also spends Perplexity credits.

---

## 9. What changed from the earlier design, and the proof

Measured 2026-09-26, SDK 0.3.283, Claude Code 2.1.281, `claude-sonnet-5`, on a fixture repo with passphrases in each instruction file (never in the prompt) and positive controls beside every refusal.

| Change | Before | After |
|---|---|---|
| Instruction file `AGENTS.md`, appended to the preset | agent with only `AGENTS.md`: no identity, no sign-off | identity and sign-off present |
| `tools` = allowlisted built-ins | `Bash` ran (`echo BOUNDARY-$((6*7))` → `BOUNDARY-42`) | "I don't have a Bash tool" |
| `permissionMode: 'dontAsk'` | — | listed MCP tool ran (`pong`); the same tool unlisted was denied |
| Path guard confines to the agent directory | absolute path outside it: contents returned | blocked; a file inside it still read (control) |
| `.env` via any route | read through `Bash` | blocked |
| Agent-local skill under the tightened boundary | — | still works (control) |
| Name validation | `../..` resolved to the repo root | rejected |
| Error event, no rethrow | `error_max_turns` event, then an exception | one `error` event |
| `filesRead` relative | absolute server paths sent to the browser | paths relative to the agent |
| No build-time deletion of root instruction files | — | repo instructions did not leak on this SDK (§ 4) |
| `perplexity-mcp` tool names | `search`, `reason`, `deep_research` | unchanged — confirmed by `discover-mcp-tools.mjs` |
