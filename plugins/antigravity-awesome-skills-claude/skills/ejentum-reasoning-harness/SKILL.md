---
name: ejentum-reasoning-harness
description: "MCP server exposing four cognitive harness modes (reasoning, code, anti-deception, memory). Each call returns an engineered scaffold (failure pattern, procedure, suppression vectors, falsification test) the agent ingests before generating."
risk: critical
source: community
source_repo: ejentum/ejentum-mcp
source_type: community
date_added: "2026-05-10"
license: "MIT"
license_source: "https://github.com/ejentum/ejentum-mcp/blob/main/LICENSE"
plugin:
  setup:
    type: manual
    summary: "Install the ejentum-mcp MCP server (`npx -y ejentum-mcp`) and provide an EJENTUM_API_KEY env var (free tier: 100 calls, no card, at https://ejentum.com/pricing). Add the server to your client's mcpServers config (Claude Code, Cursor, Cline, Windsurf, Codex CLI, Gemini CLI, Antigravity, or VS Code Copilot Chat)."
    docs: "https://github.com/ejentum/ejentum-mcp#installation"
---

# Ejentum Reasoning Harness

The Ejentum Reasoning Harness is a library of 679 cognitive operations engineered in natural language, organized across four harnesses (`reasoning`, `code`, `anti-deception`, `memory`) and exposed as MCP tools the agent can call when the task matches their trigger conditions. It targets four mechanism failures common in long agentic chains: attention decay (losing the original task), reasoning decay (compounding errors), sycophantic collapse (agreeing with the user's frame instead of evaluating it), and hallucination drift (asserting unsupported claims with confidence).

Each harness call retrieves a task-matched scaffold rather than serving a fixed template: a named failure pattern, an executable procedure, suppression vectors that block specific shortcuts, and a falsification test the agent uses for self-verification. The agent ingests the scaffold and writes from it, rather than from raw chain-of-thought. The harness is invoked on demand (by the agent or via an explicit prompt like `Use harness_anti_deception, then answer:...`); it does not auto-run on every turn.

## When to Use This Skill

- Use `harness_reasoning` before answering analytical, diagnostic, planning, or multi-step questions ("why is X happening", "what's the best approach", "what are the tradeoffs", root-cause analysis, architecture decisions).
- Use `harness_code` before generating, refactoring, reviewing, or debugging code; before architectural changes, algorithm or data-structure choices, dependency-upgrade evaluation.
- Use `harness_anti_deception` when the prompt pressures the agent to validate, certify, or soften an honest assessment; manufactured urgency; authority appeals; setups where the obvious helpful answer would compromise honesty.
- Use `harness_memory` only when sharpening an observation already formed about cross-turn drift or behavioral patterns; never call with an empty mind.

Skip the harness for simple factual lookups, syntax questions, file reads, code execution, or tasks the agent can confidently complete in 1-2 steps from native capability.

## How It Works

### Step 1: Install the MCP server

The server is published to npm. Most MCP-speaking clients support stdio installation via `npx`:

```bash
npx -y ejentum-mcp
```

Add to your client's MCP server config (Claude Code `.mcp.json`, Cursor / Cline / Windsurf MCP settings, Codex CLI config, or Antigravity / VS Code `mcp.json`):

```json
{
  "mcpServers": {
    "ejentum": {
      "command": "npx",
      "args": ["-y", "ejentum-mcp"],
      "env": {
        "EJENTUM_API_KEY": "${EJENTUM_API_KEY}"
      }
    }
  }
}
```

Get a free API key (100 calls, no card required) at [ejentum.com/pricing](https://ejentum.com/pricing).

### Step 2: Route to the right harness

Each harness has different trigger conditions (see "When to Use" above). Most clients with MCP support will route to the appropriate tool when the user's prompt matches the trigger conditions documented in the tool descriptions. For cold-install reproducibility, the agent can also call a specific harness explicitly: `Use harness_anti_deception, then answer: ...`.

### Step 3: Absorb the returned scaffold

The scaffold contains five labeled fields the agent should treat as internal-reasoning instructions, not output content:

- `[NEGATIVE GATE]` / `[CODE FAILURE]` / `[DECEPTION PATTERN]` / `[PERCEPTION FAILURE]`: the failure pattern to avoid
- `[PROCEDURE]`: step-by-step procedure for an honest response
- `[REASONING TOPOLOGY]`: control-flow graph the agent steps through internally
- `[TARGET PATTERN]`: example of the corrected response shape
- `[FALSIFICATION TEST]` / `[VERIFICATION]` / `[INTEGRITY CHECK]` / `[PERCEPTION CHECK]`: the test to apply post-draft

The agent's user-facing reply should be in its native voice, with no echoed bracket names, no procedural vocabulary, and no meta-commentary about the harness.

## Examples

### Example 1: Anti-deception on a sunk-cost prompt

Prompt:

```
Use harness_anti_deception, then answer:
We've spent three months on the GraphQL gateway. It's mostly done.
Should we keep going or pivot to REST?
```

Without the harness, agents often anchor on the past investment ("sunk cost is real here, the hardest learning curve is behind you"). With the harness, the response separates past spending from prospective evaluation: "the three months already spent are gone regardless of what you choose now. The relevant question is how much work remains versus how much value GraphQL will deliver from this point forward."

### Example 2: Code review with passing tests

Prompt:

```
Use harness_code: I refactored get_user to return None instead of raising on missing users.
All tests still pass. Should I merge?
```

The harness scaffolds a procedure that flags "tests pass" as a tool-shortcut signal rather than a correctness signal, surfaces the call-sites that handle exceptions vs None values, and recommends adding behavior-verifying tests before the merge.

## Best Practices

- ✅ Call one harness per turn; the right harness for the prompt's shape
- ✅ Treat bracketed scaffold fields as internal-only; never echo them in the user-facing reply
- ✅ Apply the falsification test to the draft before responding
- ❌ Do not stack three or more harnesses in a single turn; attention competition degrades the first call
- ❌ Do not call harness_memory without observing first; it sharpens an existing observation, not creates one
- ❌ Do not treat the API as a hard dependency; on a 5-second timeout, fall back to native capability gracefully

## Limitations

- The harness shapes the substance of reasoning; it does not guarantee a correct answer. Domain expertise and source verification still apply.
- 5-second timeout typical; clients should fall back to native capability if the API is unreachable.
- The scaffold is a procedure, not a knowledge base. It does not retrieve facts, only structured reasoning patterns.

## Security & Safety Notes

- The MCP server makes outbound HTTPS requests to the Ejentum Logic API gateway (Zuplo-hosted).
- Authentication uses a Bearer token in the `EJENTUM_API_KEY` environment variable. The token must be stored in environment variables or an MCP client's secret-handling mechanism, never committed to source.
- The server does not execute shell commands or read filesystem paths beyond reading its own env. It is a pure HTTP-proxy MCP server.
- Free tier rate-limited at 100 calls; paid tiers documented at ejentum.com/pricing.
