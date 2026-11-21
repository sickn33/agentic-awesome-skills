---
name: embedded-agents-messages-api
description: 'Building, adding or wiring up an agent or an agent chat inside a Next.js app: embed Claude agents on the Messages API, the default way.'
risk: critical
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Embedded agents — Claude API

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Building, adding or wiring up an agent or an agent chat inside a Next.js app: embed Claude agents on the Messages API, the default way.


**Use the Messages API by default for a new product.** The Anthropic SDK's tool runner (`client.beta.messages.toolRunner`) drives the loop inside the app's process. The agent has exactly the wrapper's tools, with nothing built in. Both embedded-agent skills run the same agent directories, which move between them unchanged (playbook § 10). Apply `embedded-agents-agent-sdk` only when the agent needs what only the Claude Code engine has, or when the product already runs it. That SDK starts the engine as a subprocess, provides built-in file and shell tools, and needs a long-lived Node host.

**Read the product's own agent instructions before changing its embedded agents.** Start with its root `AGENTS.md` or `CLAUDE.md`, and tell any subagent spawned for this work to read it too. Its rules on secrets, environment variables, validation, callers, tests and release apply here. Read `reference/playbook.md` before changing the wrapper's contract or explaining it in depth. It holds the full playbook and the measurement behind every choice.

**Keep request, caller, storage and UI ownership in the app.** The agent owns reasoning and tool choice. An agent is a directory, `.claude/agents/<name>/`, with `AGENTS.md` as its whole system prompt. It may also hold `knowledge/`, agent-local skills in `.claude/skills/`, and `.mcp.json`. One wrapper function, `askAgent`, runs any agent. No agent name appears in code.

## 1. First use: install the wrapper

**Search for `askAgent` before installing another wrapper.** If it exists, skip to § 2. If it imports `@anthropic-ai/claude-agent-sdk`, the product uses the other skill; migration is in playbook § 10. Otherwise:

1. **Create only the smallest requested app when none exists.** Use Next.js App Router in TypeScript, which these files target. Add nothing unasked for: no database, sign-in or billing for a local prototype.
2. **Install the missing dependencies.** Run `npm i @anthropic-ai/sdk @modelcontextprotocol/sdk zod server-only` and `npm i -D vitest`. Pin exact versions: the tool runner is marked beta in the TypeScript SDK, so an upgrade is re-tested, not assumed.
3. **Copy the wrapper, route and tests, changing only import paths.**

   | From this skill | To the app |
   |---|---|
   | `templates/agent.ts` | `src/lib/agent.ts` — the wrapper |
   | `templates/agent-mcp.ts` | `src/lib/agent-mcp.ts` — an agent's MCP servers, opened per run |
   | `templates/route.ts` | `src/app/api/agents/route.ts` — `GET` lists agents, `POST` streams one |
   | `templates/agent.test.ts` | `tests/unit/agent.test.ts` — the contract, inside `npm test`, no model call |
   | `templates/agents.live.test.ts` | `tests/live/agents.live.test.ts` — every agent against the real model |

   The tests import `@/lib/agent` and `@/lib/agent-mcp`, so Vitest needs the same `@` alias as `tsconfig.json`. The live test gets its own Vitest config (include `tests/live/**/*.live.test.ts`, `testTimeout: 180_000`, `fileParallelism: false`, and `process.loadEnvFile('.env')` in a `try`) and a script, `agents:live`. It costs money, so it stays out of `npm test` and the gate.
4. **Set each required secret per environment and never commit it.** Set `ANTHROPIC_API_KEY` and every secret referenced by an agent's `.mcp.json`; apply `environments`. On a developer's machine the SDK also reads a profile from `ant auth login`; a deployed product always uses the key.
5. **Keep the contract.** Every choice in `agentRequest()` and `askAgent()` is pinned by the unit test and explained in the playbook (§ 3, § 7). Change one only after re-measuring it.

## 2. Add an agent

1. **Create the agent directory and write its complete instructions.** Run `node <skill dir>/scripts/new-agent.mjs <name> [--knowledge] [--mcp]`, then fill in `AGENTS.md`: role, sources, output format, refusals. It is the agent's whole system prompt, with no product preset underneath. A fixed sign-off line is the cheapest live-test proof that the instructions are in force.
2. **Confine knowledge tools to knowledge and load skills as instructions.** Put files in `knowledge/`, and tell the agent in `AGENTS.md` to answer only from them. It gets `list_files`, `search_files` and `read_file`, confined to `knowledge/` (playbook § 5). Name those tools in `AGENTS.md`, not Claude Code's Read/Glob/Grep. Put agent-local skills in `.claude/agents/<name>/.claude/skills/<skill>/SKILL.md`, with `description:` frontmatter. The wrapper lists them in the system prompt; the agent loads one with `load_skill`. A skill is instructions and reference files; nothing in it runs.
3. **Allow only MCP tools the agent's job needs.** Put servers in `.mcp.json`, with secrets as `${VAR}`, never literal. Run `node --env-file=.env <skill dir>/scripts/discover-mcp-tools.mjs <name>` to list each server's tools, then restrict its `allowedTools`. An unlisted tool is never shown to the model. Commit the agent's `.mcp.json`, which holds no secrets. If `git check-ignore` reports it ignored, the repository's `.gitignore` has an unanchored `.mcp.json` rule meant for the root file. Anchor it as `/.mcp.json`.
4. **Discover agents from their directories rather than hardcoding the UI list.** `listAgents()` finds the directory, `GET /api/agents` returns it, and the UI's picker shows it when users choose between agents. Fix a UI that hardcodes that list.
5. **The instruction file is always `AGENTS.md`.** Asked for another name, create `AGENTS.md` and say why: the wrapper loads only `AGENTS.md`, and the same directory must also run under the Agent SDK skill, which loads some other instruction files on its own.
6. **Add a live test for each promise worth pinning.** Examples include citing, refusing and answering only from its files. Put it beside the generic test.

## 3. Tools that act for the caller

**Build caller tools per request after resolving the caller.** For reads or changes to the caller's records, such as invoices or settings, build the app's own tools inside the route. Pass them as `askAgent({ …, tools })`:

```ts
const tools = [
  agentTool({
    name: 'list_invoices',
    description: "List the signed-in subscriber's invoices.",
    input: {},
    run: async () => JSON.stringify(await listInvoices(caller)), // closes over the caller
  }),
];
```

- **Identity is closed over, never a parameter.** No tool takes an email, user, customer or account id: the model cannot ask for anyone else's records because no input can name them. Pin it with a unit test that reads every tool's `input_schema.properties`.
- **Validate tool input and control which failures reach the model.** `run` returns the text the model reads. A refusal or a planned failure throws `ToolError(text)`; the model reads it as an error result. Any other exception reaches the model as a fixed sentence, never its message. Input is validated against the zod shape before `run` sees it.
- **End the run after tools that only attach to a reply.** Put a link or a list the app draws in `askAgent({ …, closingTools: ['share_link'] })`: when a response that already has text calls only such tools, they run and the run ends. Otherwise the model, asked again, may write its reply a second time (playbook § 7).
- **Have code decide risky or one-way actions proposed by tools.** A model may propose but never decide what cannot be taken back (`saas-authorization`): the tool stores a proposal, the app shows a button, the click runs it. Links and buttons travel through the app, not through model text.
- **Put per-run facts in `context`, never user text.** It supplies facts such as the caller's identity to the system prompt after `AGENTS.md`.

## 4. Examples — only when asked

**Copy finished examples only when asked for or described.** The `examples/` agents are: answering only from local product-management knowledge files (`knowledge-agent`), or live-web research through Perplexity with citations (`research-agent`). Copy `examples/<name>/` to `.claude/agents/<name>/` and `examples/<name>.live.test.ts` to `tests/live/`. `research-agent` needs `PERPLEXITY_API_KEY`. Otherwise, never copy them.

## 5. The chat UI

**Build the chat UI for this product and its agent flow.** There is no template. It must do the following:

- **Fill the picker from `GET /api/agents` when users choose agents.** A product may run one front agent and show no picker; the route still checks the name against `listAgents()`.
- **Send the conversation to the route and read server-sent events.** `POST { agent, prompt, history }` to `/api/agents` and read: `{ text }` chunks (one per model response), then `{ done, agent, metadata }` or `{ error, agent }`. The parser is in playbook § 7.
- **Store the agent on every message; identify replies with several agents.** When there is more than one agent, show it on each reply. History is the conversation so far, kept in client state unless the product asks to persist it.
- **Render agent output as plain text or sanitized markdown.** Never render raw HTML: it is untrusted text, like anything a user typed. Show an `error` event instead of spinning forever.

## 6. Explaining routing and the tool boundary

**Validate the requested agent before routing it to the wrapper.**

1. UI
2. `POST /api/agents { agent }`
3. the route validates the body and requires the name to be in `listAgents()`
4. `askAgent`
5. `agentRequest()` accepts only a plain directory name and reads `.claude/agents/<agent>/`
6. the tool runner sends the request, runs the tools the model asks for, and repeats
7. events stream back.

**Pin every layer of the tool boundary with a test.** See playbook § 4:
1. **The tool list is the boundary.** The model can call only what `agentRequest()` put in `tools`: the caller's own tools, the file and skill tools when the directory has knowledge or skills, and the MCP tools its `.mcp.json` allows. Nothing is built in: no shell, no web, no file system beyond these.
2. **Resolve every file path, including symlinks, before permitting access.** File tools refuse anything outside `knowledge/` or the skill's own directory, and any `.env` file.
3. **Keep unlisted MCP tools and app secrets outside the boundary.** A server's unlisted tools never reach the model; a stdio server starts with a safe environment allowlist plus its own `env`, never the app's secrets.
4. **Refuse bad input and hide exception messages from the model.** A tool's exception reaches the model as a fixed sentence; bad input is refused by its schema before it runs.
5. **Check turn and budget caps between responses before running tools.** `maxTurns` (10 by default) and `maxBudgetUsd` cap a run: the tools of the response that crosses one never run.

## 7. Before it leaves localhost

- **Choose a Node host whose time limit covers the slowest run.** No subprocess: any host that runs a Node process for the length of a run can host it — a long-lived server, or a serverless function whose time limit covers the slowest run (playbook § 8). A stdio MCP server is a child process per run, which rules out edge runtimes, and an agent's files must be in the deployment's trace.
- **History is a client claim.** `templates/route.ts` accepts `history` from the client, `assistant` turns included, and the wrapper sends it as the conversation — so a client can forge earlier turns, the agent's own included. That is acceptable for a read-only agent, which can only be talked into saying something to the person forging it. Before any tool acts on the caller's behalf, keep the transcript on the server and stop reading it from the request.
- **Resolve the caller and cap cost before opening the route.** Before anyone but the developer can reach the route, resolve the caller there (who they are, which workspace, which permission: `saas-authorization`) and set a per-actor limit and a `maxBudgetUsd`.
- **Run live tests before releasing any agent, prompt or model change.** Run `npm run agents:live` before any release that adds or changes an agent, its prompt or its model, record the run in the product's test-coverage map (which test proves what, and when it last passed), and describe each agent in its automation doc: what it may read, the exact tools it may call, and what the app enforces around it (`shipping-artifacts`). A feature that calls the model once, not as an agent, keeps the same live run and cost ceiling (playbook § 3).

## How you can tell it worked

The agent answers in the deployed app using only the tools its role allows, and the live agent suite passes against the real model.

## Running the scripts

**Run these scripts from the app's repository root.** `<skill dir>` is this skill's installation location: a plugin, `~/.claude/skills/`, or the repository's own `.claude/skills/`. The scripts write into the current directory.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/embedded-agents-messages-api).
