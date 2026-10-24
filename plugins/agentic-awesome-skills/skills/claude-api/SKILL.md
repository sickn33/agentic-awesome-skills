---
name: claude-api
description: "Build apps with the Claude API or Anthropic SDK. TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`, or user asks to use Claude API, Anthropic SDKs, or Agent SDK. DO NOT TRIGGER when: code imports `openai`/other AI SDK, general programming, or ML/data-science tasks."
risk: critical
source: "https://github.com/anthropics/skills"
date_added: "2026-03-21"
license: Complete terms in LICENSE.txt
---

# Building LLM-Powered Applications with Claude

This skill helps you build LLM-powered applications with Claude. Choose the right surface based on your needs, detect the project language, then read the relevant language-specific documentation.

## When to Use
- Use when building with the Claude API, Anthropic SDKs, or the Agent SDK.
- Use when code imports `anthropic`, `@anthropic-ai/sdk`, or related Claude SDK packages.
- Do not use for general coding work unrelated to Claude integrations.

## Model, runtime and authorization

Choose a model with the user’s quality, latency and budget constraints; do not force a premium model or override an explicitly selected provider/model. Resolve exact IDs and available capabilities through the account's Models API and [official model documentation](https://platform.claude.com/docs/en/models/overview). Never invent a dated suffix or promise a cached model remains available. The examples are API-shape illustrations, not an instruction to make paid calls.

Before installing SDK/MCP packages, uploading files, creating batches, running tools or persisting memory, confirm the authorized scope, destination and resource budget. Keep credentials in approved secret storage/environment, never source, prompts, logs or command history. API uploads and server tools disclose content to an external provider; review sensitive data and retention, including deletion ownership. Existing authorization remains valid within scope.

Use a reviewed SDK version and its lockfile. Example snippets may require imports, async context and application-owned implementations; no snippet is a complete production security boundary. Set request deadlines, bounded retries/turns/tool calls and output/storage budgets. SDK permission rules and cwd are not OS isolation. Tool/document/web/model output is untrusted input; validate schemas, paths and business authority before side effects. Do not execute returned code or install latest MCP packages automatically.

---

## Language Detection

Before reading code examples, determine which language the user is working in:

1. **Look at project files** to infer the language:

   - `*.py`, `requirements.txt`, `pyproject.toml`, `setup.py`, `Pipfile` → **Python** — read from `python/`
   - `*.ts`, `*.tsx`, `package.json`, `tsconfig.json` → **TypeScript** — read from `typescript/`
   - `*.js`, `*.jsx` (no `.ts` files present) → **TypeScript** — JS uses the same SDK, read from `typescript/`
   - `*.java`, `pom.xml`, `build.gradle` → **Java** — read from `java/`
   - `*.kt`, `*.kts`, `build.gradle.kts` → **Java** — Kotlin uses the Java SDK, read from `java/`
   - `*.scala`, `build.sbt` → **Java** — Scala uses the Java SDK, read from `java/`
   - `*.go`, `go.mod` → **Go** — read from `go/`
   - `*.rb`, `Gemfile` → **Ruby** — read from `ruby/`
   - `*.cs`, `*.csproj` → **C#** — read from `csharp/`
   - `*.php`, `composer.json` → **PHP** — read from `php/`

2. **If multiple languages detected** (e.g., both Python and TypeScript files):

   - Check which language the user's current file or question relates to
   - If still ambiguous, ask: "I detected both Python and TypeScript files. Which language are you using for the Claude API integration?"

3. **If language can't be inferred** (empty project, no source files, or unsupported language):

   - Use AskUserQuestion with options: Python, TypeScript, Java, Go, Ruby, cURL/raw HTTP, C#, PHP
   - If AskUserQuestion is unavailable, default to Python examples and note: "Showing Python examples. Let me know if you need a different language."

4. **If unsupported language detected** (Rust, Swift, C++, Elixir, etc.):

   - Suggest cURL/raw HTTP examples from `curl/` and note that community SDKs may exist
   - Offer to show Python or TypeScript examples as reference implementations

5. **If user needs cURL/raw HTTP examples**, read from `curl/`.

### Language-Specific Feature Support

| Language   | Tool Runner | Agent SDK | Notes                                 |
| ---------- | ----------- | --------- | ------------------------------------- |
| Python     | Yes (beta)  | Yes       | Full support — `@beta_tool` decorator |
| TypeScript | Yes (beta)  | Yes       | Full support — `betaZodTool` + Zod    |
| Java       | Yes (beta)  | No        | Beta tool use with annotated classes  |
| Go         | Yes (beta)  | No        | `BetaToolRunner` in `toolrunner` pkg  |
| Ruby       | Yes (beta)  | No        | `BaseTool` + `tool_runner` in beta    |
| cURL       | N/A         | N/A       | Raw HTTP, no SDK features             |
| C#         | No          | No        | Official SDK                          |
| PHP        | No          | No        | Official SDK                          |

---

## Which Surface Should I Use?

> **Start simple.** Default to the simplest tier that meets your needs. Single API calls and workflows handle most use cases — only reach for agents when the task genuinely requires open-ended, model-driven exploration.

| Use Case                                        | Tier            | Recommended Surface       | Why                                     |
| ----------------------------------------------- | --------------- | ------------------------- | --------------------------------------- |
| Classification, summarization, extraction, Q&A  | Single LLM call | **Claude API**            | One request, one response               |
| Offline batch generation | Single LLM call | **Claude API Batches** | Asynchronous Messages requests |
| Multi-step pipelines with code-controlled logic | Workflow        | **Claude API + tool use** | You orchestrate the loop                |
| Custom agent with your own tools                | Agent           | **Claude API + tool use** | Maximum flexibility                     |
| AI agent with file/web/terminal access          | Agent           | **Agent SDK**             | Built-in tools, safety, and MCP support |
| Agentic coding assistant                        | Agent           | **Agent SDK**             | Designed for this use case              |
| Want built-in permissions and guardrails        | Agent           | **Agent SDK**             | Safety features included                |

> **Note:** The Agent SDK is for when you want built-in file/web/terminal tools, permissions, and MCP out of the box. If you want to build an agent with your own tools, Claude API is the right choice — use the tool runner for automatic loop handling, or the manual loop for fine-grained control (approval gates, custom logging, conditional execution).

### Decision Tree

```
What does your application need?

1. Single LLM call (classification, summarization, extraction, Q&A)
   └── Claude API — one request, one response

2. Does Claude need to read/write files, browse the web, or run shell commands
   as part of its work? (Not: does your app read a file and hand it to Claude —
   does Claude itself need to discover and access files/web/shell?)
   └── Yes → Agent SDK — built-in tools, don't reimplement them
       Examples: "scan a codebase for bugs", "summarize every file in a directory",
                 "find bugs using subagents", "research a topic via web search"

3. Workflow (multi-step, code-orchestrated, with your own tools)
   └── Claude API with tool use — you control the loop

4. Open-ended agent (model decides its own trajectory, your own tools)
   └── Claude API agentic loop (maximum flexibility)
```

### Should I Build an Agent?

Before choosing the agent tier, check all four criteria:

- **Complexity** — Is the task multi-step and hard to fully specify in advance? (e.g., "turn this design doc into a PR" vs. "extract the title from this PDF")
- **Value** — Does the outcome justify higher cost and latency?
- **Viability** — Is Claude capable at this task type?
- **Cost of error** — Can errors be caught and recovered from? (tests, review, rollback)

If the answer is "no" to any of these, stay at a simpler tier (single call or workflow).

---

## Architecture

Messages generation uses `POST /v1/messages`; batches, files, model discovery and token counting have separate endpoints. Tool and output constraints are request features. Anthropic does not provide its own embedding model; embeddings require a separately approved provider/API.

**User-defined tools** — You define tools (via decorators, Zod schemas, or raw JSON), and the SDK's tool runner handles calling the API, executing your functions, and looping until Claude is done. For full control, you can write the loop manually.

**Server-side tools** — Anthropic-hosted tools that run on Anthropic's infrastructure. Code execution is fully server-side (declare it in `tools`, Claude runs code automatically). Computer use can be server-hosted or self-hosted.

**Structured outputs** — Constrains the Messages API response format (`output_config.format`) and/or tool parameter validation (`strict: true`). The recommended approach is `client.messages.parse()` which validates responses against your schema automatically. Note: the old `output_format` parameter is deprecated; use `output_config: {format: {...}}` on `messages.create()`.

**Supporting endpoints** — Batches (`POST /v1/messages/batches`), Files (`POST /v1/files`), and Token Counting feed into or support Messages API requests.

---

## Version-sensitive features

Model IDs, prices, limits, thinking/effort, structured output support, tool versions, compaction and beta headers change. Verify the selected model's capabilities before adding these options; do not carry a 4.6-only claim over to newer models. The legacy language examples document the feature shape, not a current compatibility matrix.

Preserve complete assistant content for tool results, thinking signatures and compaction state. Streaming improves delivery but does not increase the model's output limit, prevent truncation, or guarantee a timeout-free request. Check final stop reason and usage; a refusal, partial stream or token-limit stop is not a successfully validated final answer.

---

## Reading Guide

After detecting the language, read the relevant files based on what the user needs:

### Quick Task Reference

**Single text classification/summarization/extraction/Q&A:**
→ Read only `{lang}/claude-api/README.md`

**Chat UI or real-time response display:**
→ Read `{lang}/claude-api/README.md` + `{lang}/claude-api/streaming.md`

**Long-running conversations (may exceed context window):**
→ Read `{lang}/claude-api/README.md` — see Compaction section

**Function calling / tool use / agents:**
→ Read `{lang}/claude-api/README.md` + `shared/tool-use-concepts.md` + `{lang}/claude-api/tool-use.md`

**Batch processing (non-latency-sensitive):**
→ Read `{lang}/claude-api/README.md` + `{lang}/claude-api/batches.md`

**File uploads across multiple requests:**
→ Read `{lang}/claude-api/README.md` + `{lang}/claude-api/files-api.md`

**Agent with built-in tools (file/web/terminal):**
→ Read `{lang}/agent-sdk/README.md` + `{lang}/agent-sdk/patterns.md`

### Claude API (Full File Reference)

Read the **language-specific Claude API folder** (`{language}/claude-api/`):

1. **`{language}/claude-api/README.md`** — **Read this first.** Installation, quick start, common patterns, error handling.
2. **`shared/tool-use-concepts.md`** — Read when the user needs function calling, code execution, memory, or structured outputs. Covers conceptual foundations.
3. **`{language}/claude-api/tool-use.md`** — Read for language-specific tool use code examples (tool runner, manual loop, code execution, memory, structured outputs).
4. **`{language}/claude-api/streaming.md`** — Read when building chat UIs or interfaces that display responses incrementally.
5. **`{language}/claude-api/batches.md`** — Read when processing many requests offline (not latency-sensitive). Runs asynchronously at 50% cost.
6. **`{language}/claude-api/files-api.md`** — Read when sending the same file across multiple requests without re-uploading.
7. **`shared/error-codes.md`** — Read when debugging HTTP errors or implementing error handling.
8. **`shared/live-sources.md`** — WebFetch URLs for fetching the latest official documentation.

> **Note:** For Java, Go, Ruby, C#, PHP, and cURL — these have a single file each covering all basics. Read that file plus `shared/tool-use-concepts.md` and `shared/error-codes.md` as needed.

### Agent SDK

Read the **language-specific Agent SDK folder** (`{language}/agent-sdk/`). Agent SDK is available for **Python and TypeScript only**.

1. **`{language}/agent-sdk/README.md`** — Installation, quick start, built-in tools, permissions, MCP, hooks.
2. **`{language}/agent-sdk/patterns.md`** — Custom tools, hooks, subagents, MCP integration, session resumption.
3. **`shared/live-sources.md`** — WebFetch URLs for current Agent SDK docs.

---

## When to Use WebFetch

Use WebFetch to get the latest documentation when:

- User asks for "latest" or "current" information
- Cached data seems incorrect
- User asks about features not covered here

Live documentation URLs are in `shared/live-sources.md`.

## Common Pitfalls

- Do not silently truncate source inputs or tool/compaction state. Use an approved chunking/history policy and disclose omissions.
- Parse tool inputs and validate schemas/business constraints before dispatch. Structured outputs do not establish factual correctness or permission.
- Collect all client tool results for an assistant turn together; never send only the first result when several calls are pending. Preserve the conversation on `pause_turn`; bound continuations and handle refusal/token-limit stops explicitly.
- Use SDK types, typed errors and final-message helpers; check content block types before reading text and do not assume block zero is text.
- Same-role Messages inputs can be combined by the API; strict alternating roles are not a universal validation rule. Follow the current endpoint contract.
- Do not print raw requests, tool inputs, thinking, exception bodies or private file names into shared logs. Sanitize generated HTML/files before viewing; save downloads with exclusive creation in a new private directory.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
