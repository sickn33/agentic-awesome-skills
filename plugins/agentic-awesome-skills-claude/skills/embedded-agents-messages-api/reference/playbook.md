# Embedded agents on the Claude API — playbook

**Embedded agents** are Claude agents that run as callable components inside the application. The app handles routing, the caller, persistence and the UI; each agent is a directory (`.claude/agents/<name>/`) with its own `AGENTS.md`, knowledge files, skills and MCP config. This variant runs them on the Claude API: the Anthropic SDK's **tool runner** (`client.beta.messages.toolRunner`, `@anthropic-ai/sdk`) calls the model, runs the tools it asks for, and repeats, inside the app's own process.

The boundary is the same as the Agent SDK variant's: **the app owns the request lifecycle, the caller and storage. The agent owns reasoning and tool choice.** What changes is who supplies the tools: here, only the wrapper. There is no engine underneath with tools of its own to switch off.

Built and measured on `2026-10-24` against `@anthropic-ai/sdk` 0.133.0 and `@modelcontextprotocol/sdk` 1.32.1, on Claude Sonnet 5.5 and Haiku 5.5; § 9 lists each measurement. Re-measure after an SDK upgrade — the tool runner is marked beta in the TypeScript SDK.

---

## 1. Which variant

| | This skill (Claude API) | `embedded-agents-agent-sdk` |
|---|---|---|
| Loop | the SDK's tool runner, in the app's process | the Claude Code engine, a subprocess per run |
| Tools | exactly the wrapper's: the caller's, file and skill tools, allowed MCP tools | built-ins (allowlisted to Read/Glob/Grep) + MCP |
| System prompt | `AGENTS.md`, whole | Claude Code's preset with `AGENTS.md` appended |
| Isolation | nothing to switch off — no built-in tool exists | `tools`, `dontAsk`, `strictMcpConfig`, a skills allowlist and a path guard, each turning a default off |
| Cost figure | the wrapper's own arithmetic from a price table | the SDK's `total_cost_usd` |
| Host | any Node process that lives for a run, serverless included | a long-lived Node host: a container or VM, never a serverless function |
| Dependencies | `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk` | `@anthropic-ai/claude-agent-sdk` and its platform binary |

Choose the Agent SDK only when an agent needs what the engine has — a shell, Claude Code's file tools over a working directory, its subagents — or the product already runs it.

---

## 2. Agent directory layout

```
.claude/agents/
└── <agent-name>/
    ├── AGENTS.md                          ← its whole system prompt (the only instruction file)
    ├── .mcp.json                          ← its MCP servers (when needed)
    ├── knowledge/                         ← reference files it answers from (when needed)
    │   └── *.md
    └── .claude/
        └── skills/<skill-name>/SKILL.md   ← its own skill (when needed)
```

The layout is the Agent SDK variant's, on purpose: a directory runs under either wrapper unchanged. The skills stay at `.claude/skills/` for that reason, though nothing here needs the `.claude` name.

**One side effect on the developer's machine** (from the Agent SDK variant, unchanged): Claude Code scans `.claude/agents/` for its own subagent definitions and registers any `.md` file there with `name:` frontmatter, so an agent-local `SKILL.md` shows up as a subagent in the developer's Claude Code session. Harmless to the product; keep `AGENTS.md` and knowledge files free of frontmatter.

---

## 3. The request

`agentRequest()` builds everything a run sends except the conversation, and is exported so the unit test pins it without a model call:

```ts
{
  model: 'claude-sonnet-5-5',
  max_tokens: 16_000,
  output_config: { effort: 'medium' },
  betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',   // models that take it
  system: [
    { type: 'text', text: AGENTS_md + skillList, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: context },                                   // per run, when given
  ],
  cache_control: { type: 'ephemeral' },
  tools: [...callerTools, ...knowledgeTools, ...skillTools, ...mcpTools],
}
```

| Field | Why it's there |
|---|---|
| `model` | Pinned per product, and changed only after the live tests pass on the new one (§ 9). A model missing from `PRICES` is refused before any call: its cost, and so its budget, would be unknown. |
| `max_tokens: 16_000` | Room for adaptive thinking plus the answer. Requests are non-streaming, and the SDK refuses a non-streaming request whose `max_tokens` implies more than ten minutes; 16K is well under it. |
| `effort: 'medium'` | Stated, not left to each model's default (`medium` on Opus 5.5 and Haiku 5.5, `high` on Sonnet 5.5). Tune per agent on the live tests: lower is cheaper and terser, higher reads more before answering. |
| thinking | Left to the model: adaptive on every current model, and it can't be turned off on Opus 5.5. Thinking text comes back empty by default; the wrapper reads only `text` blocks. |
| no sampling, no prefill | Nothing else shapes the output. On Haiku 5.5, `budget_tokens`, a non-default `temperature` or `top_p`, and an assistant prefill each return 400, and `thinking: {type: 'disabled'}` is accepted only at effort `high` or below (`2026-10-22`, a monitoring product moving one call from Haiku 4.5). Anthropic's migration guides for Haiku 5.5 and Sonnet 5.5 (read `2026-10-25`) say the same of the budget, sampling and prefill. Steer from `AGENTS.md`, and get a fixed shape from structured outputs or a tool. Haiku 5.5 also counts the same text as about 30% more tokens than Haiku 4.5, so a token budget carried over from the older model runs short. |
| `fallbacks: 'default'` | On Opus 5.5 and Sonnet 5.5, a classifier's false-positive refusal is re-run on a fallback model inside the same call instead of ending the run. Haiku 5.5 has no server-side fallback, so it is not sent there. A response served by a model missing from `PRICES` is priced at the most expensive rates on the price list. |
| `system[0]` | `AGENTS.md` is the **whole** system prompt — there is no product preset beneath it, so it carries the role, the rules and the refusals itself. The agent's skills are listed after it. The breakpoint caches the tools and this block together, identical for every caller. |
| `system[1]` | The caller's `context` (who they are), after the breakpoint, so it never splits the cache. Never user text. |
| top-level `cache_control` | Caches the conversation so far: each request in a run reads the previous one from cache. |
| `tools` | **The whole tool boundary** (§ 4). Duplicate names are refused. |

**History** is sent as the conversation it was: `conversation()` drops empty turns and any assistant turn before the first user turn (the API requires the conversation to open with the user), then appends the prompt. The Agent SDK variant flattened it into a "Previous conversation" preamble; turns are what the model is trained on.

**One model call, not an agent.** A feature that asks the model once and acts on a structured answer (pick a brand colour from candidates code found, propose checks for an endpoint) needs no wrapper and no tool loop. It keeps the rules of this skill that fit one call: the model pinned; a live run, outside the gate, before the model, the prompt or the schema changes, with its time and tokens recorded; a per-actor cost ceiling; and code that checks every answer before anyone sees it. Caching is the rule that does not carry over. A run here reads its own cache on every request after the first, but calls minutes apart pay the 1.25x write for a five-minute entry nobody reads: leave it off (`2026-10-22`, a monitoring product: about 1,200 tokens in and $0.00016 a call on Haiku 5.5, where a cache hit would have saved under a hundredth of a cent).

---

## 4. The tool boundary

There is nothing to switch off: the model can call only what is in `tools`, and the runner answers any other name with an error result. The boundary is therefore what `agentRequest()` adds:

- **The caller's tools** (`opts.tools`), built per request so they close over the caller. Identity is never a parameter (SKILL.md § 3).
- **Knowledge tools** — only when `knowledge/` exists (§ 5).
- **Skill tools** — only when the agent has skills (§ 5).
- **MCP tools** — only those a server's `allowedTools` lists (§ 6).

Every tool is wrapped the same way (`guarded`):

- Input is validated against its schema before `run` (zod for `agentTool`; an MCP server validates its own). A bad input never reaches `run`; the model reads why and can retry.
- `run` returns the text the model reads. A `ToolError` is a planned failure the model reads as an error result.
- **Any other exception reaches the model as a fixed sentence (`TOOL_FAILED`).** Left alone, the runner sends `Error: <message>` — measured — and a database or vendor message can carry a host name, a query or a credential, which the model might repeat to the user.

---

## 5. Knowledge files and skills

**Knowledge** gets three read-only tools:

| Tool | Does |
|---|---|
| `list_files` | every regular file under `knowledge/`, hidden files and symlinks left out |
| `search_files` | lines containing any of the query's words, case-insensitive, best first, at most 40 |
| `read_file` | one file in full (up to 256 KB), by its path |

Every path is resolved through `realpathSync` and compared with the resolved `knowledge/` before anything is read, so `..`, an absolute path and a symlink that points out all fail; any path segment starting with `.env` fails before that. Each file read is recorded in `metadata.filesRead`, relative to the agent, because that list reaches the browser.

A small, stable `knowledge/` could instead be pasted into the cached system prompt — one fewer round trip per answer. The tools are the default because they scale, and because `filesRead` then says what an answer drew on.

**Skills** are progressive disclosure, done by the wrapper: each skill's `description` (frontmatter) is listed under `## Skills` in the cached system prompt; `load_skill(name)` returns its `SKILL.md` and names its other files; `read_skill_file(name, path)` reads one, confined to that skill's directory like knowledge files. A skill here is instructions and reference files — nothing in it runs. A skill that needs to run code would need Anthropic's code-execution container (`container.skills` with the code execution tool), which runs it in Anthropic's sandbox, not the app's; this wrapper does not do that.

---

## 6. MCP servers

`.mcp.json` keeps the Agent SDK variant's shape, so a directory moves unchanged:

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

`agent-mcp.ts` opens each server with the official MCP client — `stdio` (a child process) or `http` (Streamable HTTP, `url` and `headers`) — lists its tools, keeps only those `allowedTools` names, and hands them to the runner through the SDK's `mcpTools()` helper. The model never talks to a server; the runner calls it through this client.

- **Secrets stay in the app.** `${VAR}` is expanded from the app's environment, and a missing variable fails by name before any server starts (the Agent SDK variant replaced it with an empty string). A stdio server starts with the MCP SDK's short allowlist of variables (`PATH`, `HOME`, `APPDATA`, …) plus its own `env` — measured: the test server's `printEnv` showed `PATH` and no `ANTHROPIC_API_KEY`. That replaces the Agent SDK variant's `agentEnv` stripping.
- **A server's own error output is discarded at runtime** (it can carry what the server was asked; the app's logs stay ids, never bodies) and shown by `discover-mcp-tools.mjs`, where it is the clue to a server that won't start.
- **Lifetime: one run.** Servers open before the run and close in a `finally`, however it ends. A stdio server started through `npx` costs a cold start every run (measured below: ~4 s of a 7.5 s run). An agent that answers often should get a pooled connection instead — not built here.
- **Remote servers** can also be called by the API itself (`mcp_servers` plus an `mcp_toolset` tool, beta `mcp-client-2025-11-20`). That needs a public URL and sends the server's token to Anthropic with every request; the client here keeps both in the app.

---

## 7. The run

```ts
for await (const ev of askAgent({ agent: 'knowledge-agent', prompt, history })) {
  if (ev.type === 'text') /* one model response's text */;
  if (ev.type === 'done') /* ev.metadata: cost, duration_ms, tokens, filesRead */;
  if (ev.type === 'error') /* ev.subtype: error_max_turns | error_max_budget_usd | refusal | max_tokens | … */;
}
```

| Step | Behaviour |
|---|---|
| Events | One `text` event per model response that has text (the runner's non-streaming mode: each iteration is one complete response). Then `done`, or `error` with the reason. The subtypes `error_max_turns` and `error_max_budget_usd` keep the Agent SDK's names, so a caller written for either wrapper reads both. |
| Ceilings | Checked after each response. When a response asks for tools and the run has used `maxTurns` responses, or its cost has reached `maxBudgetUsd`, the wrapper leaves the loop: the runner runs a response's tools only when asked for the next one, so they never run (measured). A response that crosses a ceiling but answers is kept as the answer. The runner's own `max_iterations` is not used: measured, it runs the last response's tools and then stops, so they run for nothing. |
| Cost | `costOf(model, usage)` per response, priced by the model that served it: input, output, cache writes (1.25x input) and cache reads (0.1x on Sonnet and Haiku, 0.05x on Opus 5.5); Haiku 5.5's second rate above 100K prompt tokens. Thinking is billed as output and included in `output_tokens`. |
| Tokens | Every token read (cached or not) and written. Larger than the Agent SDK's figure, which left the cache out. |
| Closing tools | `closingTools` names the tools that only attach something to the reply: a link, a list the app draws. When a response that has text calls nothing but those, the wrapper runs them (`runner.generateToolResponse()`) and ends the run with `done`, with no further request. Without it the model is asked again after the call, and Haiku 5.5 then wrote its whole reply a second time in 3 of 27 conversations — and in 5 of 18 when `AGENTS.md`, or the tool's result, told it not to (measured, § 9). A closing tool called before any text, or beside another tool, does not end the run. The ceilings don't apply to a closing call, because no request follows it. Use it whenever the reader sees every response's text and a tool exists only to attach something. |
| Ends | `end_turn` → `done`; `refusal`, `max_tokens` and anything else → `error` with the stop reason. A request that still fails after the SDK's two retries throws, and the caller reports it. |
| Leaving early | A caller that stops reading (a closed browser tab) ends the generator at its next event; the MCP servers close in its `finally`. A request already in flight finishes first. |

**Wire format** (`templates/route.ts`): server-sent events, `data: <json>\n\n` — `{ text }`, then `{ done, agent, metadata }` or `{ error, agent }`. A client parser:

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

**Token streaming** is one option away: the runner takes `stream: true`, each iteration is then a stream whose `text_delta` events can be forwarded as they arrive (`await stream.finalMessage()` gives the response for the ceilings). This skill's wrapper stays per-response so its events match the Agent SDK variant's; a caller that joins chunks expecting whole responses would need to change.

---

## 8. Hosting

- **No subprocess, no engine binary.** The wrapper is a library inside the app's own process: any host that keeps a Node process alive for the length of a run can host it. That includes a serverless function, if its time limit covers the slowest run — several model calls plus tool calls. Netlify's synchronous and streaming functions stop at 60 seconds (docs.netlify.com, Functions API reference, checked 2026-10-24; an older Netlify page says 10 seconds for streaming). Measure the slowest case on the live tests before relying on a limit.
- **Never the edge runtime:** the file tools read the disk, and a stdio MCP server is a child process.
- **Include the agents in the deployment.** With Next.js standalone output, `outputFileTracingIncludes: { '/api/agents': ['./.claude/agents/**/*'] }` in `next.config` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`), or the directories are missing at runtime.
- **Authentication:** `ANTHROPIC_API_KEY`. A developer's `ant auth login` profile also works locally; never for a product other people use.
- **Concurrency:** each run is a handful of HTTPS requests from the app's process, not a process of its own; the limit is the API's rate limits and the host's request concurrency.

---

## 9. Tests and measurements

| File | Runs | What it pins |
|---|---|---|
| `templates/agent.test.ts` → `tests/unit/` | inside `npm test`, no model call | directory resolution and name validation; the request (system prompt, caching, model, effort, fallbacks per model, tools, duplicate names, the price list); history as turns; the file and skill tools and their confinement; `.mcp.json` parsing and secret expansion; and the run itself — the SDK's real tool runner against a scripted `fetch`: tools run, events, cost, closing tools end the run only when the response has text and calls nothing else, both ceilings stop before tools run, refusal and cut-off are errors, `ToolError` and the fixed sentence, retries exhausted throws. |
| `templates/agents.live.test.ts` → `tests/live/` | `npm run agents:live`, outside the gate | for every agent: each MCP server starts and still offers every allowed tool; the model is shown only its own tools; it answers with a positive cost. |
| `examples/*.live.test.ts` | with the examples | knowledge-agent signs off, answers the OKR target from `knowledge/okrs.md` with a citation, and refuses a topic its files do not cover; research-agent signs off and cites a source. |

**Mutation-checked** (2026-10-24): removing the turn ceiling, the exception guard, the `realpath` resolution, the `.env` rule, the hidden-file filter, the closing branch, its text condition, `every` (as `some`), or the call that runs the closing tools each turns at least one unit test red.

**Measured on 2026-10-24:**

| What | Result |
|---|---|
| Parallel tool calls | two `tool_use` blocks in one response; the runner ran both before the next request |
| Prompt caching (Haiku 5.5) | tools + system (~2.4K tokens) written on the first request, read on every later one |
| Leaving the loop after a `tool_use` response | the tools never ran |
| `max_iterations: 1` | the tool ran, then the loop stopped: wasted |
| A thrown `Error` in `run` | sent to the model as `Error: <message>` — hence the guard |
| History as turns | the model answered a question about the earlier turn correctly |
| `fallbacks: 'default'` with the beta, through the tool runner on Sonnet 5.5 | accepted |
| knowledge-agent, Sonnet 5.5 | answered from `okrs.md`, cited it, signed off: 3.0 s, $0.0035 |
| knowledge-agent, Haiku 5.5 | answered from the file: 2.9 s, $0.0002 |
| A skill whose sign-off exists only in `SKILL.md` | followed; `filesRead` showed the skill loaded: 3.3 s, $0.0026 |
| MCP (`@modelcontextprotocol/server-everything`, stdio via `npx`) | only the two allowed tools exposed; the model called `echo` and reported it: 7.5 s, of which ~4 s starting the server |
| A tool that only attaches a link, called after the model wrote its reply (Haiku 5.5, a support agent, 18 conversations) | asked again, the model wrote the reply a second time in 2 of 9 conversations, then 1 of 18, and added a line about the link in 3 more. An `AGENTS.md` line saying every response's text is shown and never to repeat it: 5 of 18. The tool's result saying the same: 5 of 18. With `closingTools`: 0 of 18, every link still attached, and one request fewer per turn |

**A product moved from the Agent SDK variant** (2026-10-24, a support product: a lead agent consulting two specialist agents through tools, every agent on Haiku 5.5, nine fixed conversations through the real harness with Stripe faked). Every expected tool path taken, the same refusals and the same Confirm proposal.

| | Agent SDK | Claude API tool runner |
|---|---|---|
| Nine conversations | 192.8 s, $0.1151 | 69.5 s and 68.7 s, $0.0091 and $0.0086 (two passes) |
| Per conversation | ≈21 s, ≈$0.013 | ≈7.7 s, ≈$0.001 |
| Slowest conversation | 27.6 s | 10.6 s |

Most of the cost difference is the engine's own system prompt and tool definitions, which every Agent SDK request carried. The specialists' two consultations now run in parallel when the lead agent asks for both in one response, which the time reflects.

---

## 10. Moving an agent from the Agent SDK variant

The directory moves unchanged; the wrapper and its callers change.

| Agent SDK variant | Here |
|---|---|
| `query()` with `agentOptions()` | `client.beta.messages.toolRunner()` with `agentRequest()` |
| `systemPrompt` preset + `append: AGENTS.md` | `AGENTS.md` is the whole system prompt — re-read it for anything the preset supplied (tone, refusals) and confirm on the live tests. Without the preset, Haiku 5.5 wrote text before a tool call and repeated it after: give the tools that only attach something to the reply as `closingTools` (§ 7) |
| `tools: ['Read','Glob','Grep']` | `list_files`, `search_files`, `read_file` over `knowledge/` — rename them in `AGENTS.md` |
| `skills` allowlist + Skill tool | the skill list in the system prompt + `load_skill` / `read_skill_file` |
| in-process server: `createSdkMcpServer` + `tool()`, granted as `mcp__<server>__<tool>` | `agentTool({ name, description, input, run })` in `tools`; the zod shape is the same; return the text instead of `{ content: [{ type: 'text', text }] }`; throw `ToolError` instead of returning `isError` |
| `.mcp.json` passed inline under `strictMcpConfig` | `agent-mcp.ts` opens it per run; same file, same `allowedTools` |
| `permissionMode: 'dontAsk'`, PreToolUse path guard | not needed: no tool exists that isn't in the list, and the file tools confine themselves |
| `env: agentEnv()` (secrets stripped) | not needed: no subprocess; a stdio MCP server gets the MCP SDK's safe allowlist |
| `maxTurns`, `maxBudgetUsd` | the same options, checked by the wrapper between responses |
| `total_cost_usd` | `costOf()` from `PRICES` — add the model's rates when you pin it |
| history as a "Previous conversation" preamble | history as turns |
| `serverExternalPackages: ['@anthropic-ai/claude-agent-sdk']` | remove it |
| a long-lived host for the subprocess | any Node host whose limit covers a run (§ 8) |
