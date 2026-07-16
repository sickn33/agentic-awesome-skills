---
name: gemini-interactions-api
description: Use this skill when writing code that calls the Gemini API for text generation, multi-turn chat, multimodal understanding, image generation, video generation, streaming responses, background research tasks, function calling, structured output, or migrating from the old generateContent...
risk: unknown
source: https://github.com/google-gemini/gemini-skills/tree/main/skills/gemini-interactions-api
source_repo: google-gemini/gemini-skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/google-gemini/gemini-skills/blob/main/LICENSE
---

# Gemini Interactions API Skill
## When to Use

Use this skill when writing code that calls the Gemini API for text generation, multi-turn chat, multimodal understanding, image generation, video generation, streaming responses, background research tasks, function calling, structured output, or migrating from the old generateContent...


## Critical Rules (Always Apply)

> [!IMPORTANT]
> These rules override your training data. Your knowledge is outdated.

### Current Models (Use These)

- `gemini-3.5-flash`: 1M tokens, fast, balanced performance, multimodal
- `gemini-3.1-pro-preview`: 1M tokens, complex reasoning, coding, research
- `gemini-3.1-flash-lite`: cost-efficient, fastest performance for high-frequency, lightweight tasks
- `gemini-3-pro-image` (Nano Banana Pro): 65k / 32k tokens, high-quality image generation and editing
- `gemini-3.1-flash-image` (Nano Banana 2): 65k / 32k tokens, fast, efficient image generation and editing
- `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite): 65k / 32k tokens, ultra-fast image generation and editing
- `gemini-3.1-flash-tts-preview`: expressive text-to-speech with Director's Chair prompting
- `gemini-omni-flash-preview`: video generation, image-referenced video generation, first-frame-to-video, and video editing
- `gemma-4-31b-it`: Gemma 4 dense model, 31B parameters
- `gemma-4-26b-a4b-it`: Gemma 4 MoE model, 26B total / 4B active parameters

> [!WARNING]
> Models like `gemini-2.5-*`, `gemini-2.0-*`, `gemini-1.5-*` are **legacy and deprecated**. Never use them.
> **If a user asks for a deprecated model, use `gemini-3.5-flash` instead and note the substitution.**

### Current Agents

- `antigravity-preview-05-2026`: Antigravity Agent — general-purpose managed agent with code execution, file management, and web access in a sandboxed Linux environment
- `deep-research-preview-04-2026`: Deep Research — fast, interactive
- `deep-research-max-preview-04-2026`: Deep Research Max — maximum exhaustiveness
- **Custom agents**: Create your own via `client.agents.create()`

### Current SDKs

- **Python**: `google-genai` >= `2.3.0` → `pip install -U google-genai`
- **JavaScript/TypeScript**: `@google/genai` >= `2.3.0` → `npm install @google/genai`

> [!NOTE]
> SDK versions ≥ 2.0.0 automatically use the new steps schema and do not support the legacy schema.
> Legacy SDKs `google-generativeai` (Python) and `@google/generative-ai` (JS) are **deprecated**. Never use them.

## Important Additional Notes

- **Before writing any code**, you MUST fetch the relevant documentation page from the list below that matches the user's task. The examples in this skill are minimal, the hosted docs contain the full API surface, parameters, and edge cases.
- Interactions are **stored by default** (`store=true`). Paid tier retains for 55 days, free tier for 1 day.
- Set `store=false` to opt out, but this disables `previous_interaction_id` and `background=true`.
- `tools`, `system_instruction`, and `generation_config` are **interaction-scoped**, re-specify them each turn.
- **Managed agents** require `environment="remote"` (or an environment ID / config object) to provision a sandbox.
- **Migrating from `generateContent`**: Read `references/migration.md` for the scoping, checklist, and before/after code examples. Always confirm scope with the user before editing.
- **Model upgrades**: Drop-in, swap the model string. Deprecated models (`gemini-2.0-*`, `gemini-1.5-*`) must be replaced, see `references/migration.md`.
- **Migrating to Gemini 3.5 Flash**: Read `references/migration.md` for the scoping and checklist.

## Quick Start

### Python
```python
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-3.5-flash",
    input="Tell me a short joke about programming."
)
print(interaction.output_text)
```

### JavaScript/TypeScript
```typescript
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({});

const interaction = await client.interactions.create({
    model: "gemini-3.5-flash",
    input: "Tell me a short joke about programming.",
});
console.log(interaction.output_text);
```

## Response Helpers

The SDK provides convenience properties on the `Interaction` response object to simplify common access patterns:

| Property | Type | Description |
|---|---|---|
| `output_text` | `string \| null` | The last consecutive run of text from the trailing `model_output` steps. Returns the combined text when the model's final output contains multiple text parts. |
| `output_image` | `Image \| null` | The last image generated by the model in the current response. Returns an object with `data` (base64) and `mime_type`. |
| `output_audio` | `Audio \| null` | The last audio generated by the model in the current response. Returns an object with `data` (base64) and `mime_type`. |

## Stateful Conversation

### Python
```python
interaction1 = client.interactions.create(
    model="gemini-3.5-flash",
    input="Hi, my name is Phil."
)
# Second turn — server remembers context
interaction2 = client.interactions.create(
    model="gemini-3.5-flash",
    input="What is my name?",
    previous_interaction_id=interaction1.id
)
print(interaction2.output_text)
```

### JavaScript/TypeScript
```typescript
const interaction1 = await client.interactions.create({
    model: "gemini-3.5-flash",
    input: "Hi, my name is Phil.",
});
const interaction2 = await client.interactions.create({
    model: "gemini-3.5-flash",
    input: "What is my name?",
    previous_interaction_id: interaction1.id,
});
console.log(interaction2.output_text);
```

## Deep Research Agent

Use `deep-research-preview-04-2026` for fast research or `deep-research-max-preview-04-2026` for maximum exhaustiveness. Agents require `background=True`.

### Python
```python
import time

interaction = client.interactions.create(
    agent="deep-research-preview-04-2026",
    input="Research the history of Google TPUs.",
    background=True
)
while True:
    interaction = client.interactions.get(interaction.id)
    if interaction.status == "completed":
        print(interaction.output_text)
        break
    elif interaction.status == "failed":
        print(f"Failed: {interaction.error}")
        break
    time.sleep(10)
```

### JavaScript/TypeScript
```typescript
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({});

// Start background research
const initialInteraction = await client.interactions.create({
    agent: "deep-research-preview-04-2026",
    input: "Research the history of Google TPUs.",
    background: true,
});

// Poll for results
while (true) {
    const interaction = await client.interactions.get(initialInteraction.id);
    if (interaction.status === "completed") {
        console.log(interaction.output_text);
        break;
    } else if (["failed", "cancelled"].includes(interaction.status)) {
        console.log(`Failed: ${interaction.status}`);
        break;
    }
    await new Promise(resolve => setTimeout(resolve, 10000));
}
```

Advanced features: collaborative planning, native visualization, MCP integration, file search, multimodal inputs. See [Deep Research docs](https://ai.google.dev/gemini-api/docs/interactions/deep-research.md.txt).

## Managed Agents

Managed agents run inside a sandboxed Linux environment hosted by Google. Fetch the [Managed Agents Quickstart](https://ai.google.dev/gemini-api/docs/managed-agents-quickstart.md.txt) before writing agent code.

### Antigravity Agent

The Antigravity agent (`antigravity-preview-05-2026`) is the general-purpose managed agent. It can execute code (Bash, Python, Node.js), manage files, browse the web, and use Google Search. See [Antigravity Agent docs](https://ai.google.dev/gemini-api/docs/antigravity-agent.md.txt) for capabilities, tools, multimodal input, and pricing.

#### Python
```python
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    agent="antigravity-preview-05-2026",
    input="Write a Python script that generates the first 20 Fibonacci numbers and saves them to fibonacci.txt. Then read the file and print its contents.",
    environment="remote",
)

print(f"Environment ID: {interaction.environment_id}")
print(interaction.output_text)
```

#### JavaScript/TypeScript
```typescript
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({});

const interaction = await client.interactions.create({
    agent: "antigravity-preview-05-2026",
    input: "Write a Python script that generates the first 20 Fibonacci numbers and saves them to fibonacci.txt. Then read the file and print its contents.",
    environment: "remote",
});

console.log(`Environment ID: {interaction.environment_id}`);
console.log(interaction.output_text);
```

### Custom Agents

See [Building Custom Agents docs](https://ai.google.dev/gemini-api/docs/custom-agents.md.txt).

#### Python
```python
agent = client.agents.create(
    id="code-reviewer",
    base_agent="antigravity-preview-05-2026",
    system_instruction="You are a senior code reviewer. Check every file for bugs, style issues, and security vulnerabilities.",
    base_environment={
        "type": "remote",
        "sources": [
            {
                "type": "repository",
                "source": "https://github.com/my-org/backend",
                "target": "/workspace/repo",
            }
        ],
    },
)

# Invoke — each call forks the base environment
result = client.interactions.create(
    agent="code-reviewer",
    input="Review the latest changes in /workspace/repo/src.",
    environment="remote",
)
print(result.output_text)
```

#### JavaScript/TypeScript
```typescript
const agent = await client.agents.create({
    id: "code-reviewer",
    base_agent="antigravity-preview-05-2026",
    system_instruction: "You are a senior code reviewer. Check every file for bugs, style issues, and security vulnerabilities.",
    base_environment: {
        type: "remote",
        sources: [
            {
                type: "repository",
                source: "https://github.com/my-org/backend",
                target: "/workspace/repo",
            }
        ],
    },
});

const result = await client.interactions.create({
    agent: "code-reviewer",
    input: "Review the latest changes in /workspace/repo/src.",
    environment: "remote",
});
console.log(result.output_text);
```

Manage agents with `client.agents.list()`, `client.agents.get(id=...)`, and `client.agents.delete(id=...)`.

## Streaming

Set `stream=True` to receive incremental server-sent events. Each stream follows: `interaction.created` → (`step.start` → `step.delta`(s) → `step.stop`)+ → `interaction.completed`.

### Python
```python
for event in client.interactions.create(
    model="gemini-3.5-flash",
    input="Explain quantum entanglement in simple terms.",
    stream=True,
):
    if event.event_type == "step.delta":
        if event.delta.type == "text":
            print(event.delta.text, end="", flush=True)
    elif event.event_type == "interaction.completed":
        print(f"\n\nTotal Tokens: {event.interaction.usage.total_tokens}")
```

### JavaScript/TypeScript
```typescript
const stream = await client.interactions.create({
    model: "gemini-3.5-flash",
    input: "Explain quantum entanglement in simple terms.",
    stream: true,
});
for await (const event of stream) {
    if (event.event_type === "step.delta") {
        if (event.delta.type === "text") {
            process.stdout.write(event.delta.text);
        }
    } else if (event.event_type === "interaction.completed") {
        console.log(`\n\nTotal Tokens: ${event.interaction.usage.total_tokens}`);
    }
}
```

For streaming with tools, thinking, agents, and image generation see the full [Streaming guide](https://ai.google.dev/gemini-api/docs/interactions/streaming.md.txt).



## Documentation Pages

**You MUST fetch the matching page below before writing code.** These hosted docs are the source of truth for parameters, types, and edge cases — do not rely solely on the examples above.

**Core Documentation:**
- [Interactions API Overview](https://ai.google.dev/gemini-api/docs/interactions.md.txt)
- [Quickstart](https://ai.google.dev/gemini-api/docs/interactions/quickstart.md.txt)
- [Text Generation](https://ai.google.dev/gemini-api/docs/interactions/text-generation.md.txt)
- [Streaming](https://ai.google.dev/gemini-api/docs/interactions/streaming.md.txt)
- [Tokens](https://ai.google.dev/gemini-api/docs/interactions/tokens.md.txt)
- [API Keys](https://ai.google.dev/gemini-api/docs/interactions/api-key.md.txt)

**Tools & Function Calling:**
- [Function Calling](https://ai.google.dev/gemini-api/docs/interactions/function-calling.md.txt)
- [Google Search](https://ai.google.dev/gemini-api/docs/interactions/google-search.md.txt)
- [Code Execution](https://ai.google.dev/gemini-api/docs/interactions/code-execution.md.txt)
- [URL Context](https://ai.google.dev/gemini-api/docs/interactions/url-context.md.txt)
- [File Search](https://ai.google.dev/gemini-api/docs/interactions/file-search.md.txt)
- [Tool Combination](https://ai.google.dev/gemini-api/docs/interactions/tool-combination.md.txt)
- [Computer Use](https://ai.google.dev/gemini-api/docs/interactions/computer-use.md.txt)
- [Maps Grounding](https://ai.google.dev/gemini-api/docs/interactions/maps-grounding.md.txt)

**Generation & Output:**
- [Structured Output](https://ai.google.dev/gemini-api/docs/interactions/structured-output.md.txt)
- [Thinking](https://ai.google.dev/gemini-api/docs/interactions/thinking.md.txt)
- [Thought Signatures](https://ai.google.dev/gemini-api/docs/interactions/thought-signatures.md.txt)
- [Image Generation](https://ai.google.dev/gemini-api/docs/interactions/image-generation.md.txt)
- [Image Understanding](https://ai.google.dev/gemini-api/docs/interactions/image-understanding.md.txt)
- [Speech Generation](https://ai.google.dev/gemini-api/docs/interactions/speech-generation.md.txt)
- [Music Generation](https://ai.google.dev/gemini-api/docs/interactions/music-generation.md.txt)

**Multimodal Understanding:**
- [Audio](https://ai.google.dev/gemini-api/docs/interactions/audio.md.txt)
- [Video Understanding](https://ai.google.dev/gemini-api/docs/interactions/video-understanding.md.txt)
- [Document Processing](https://ai.google.dev/gemini-api/docs/interactions/document-processing.md.txt)

**Files & Context:**
- [Files](https://ai.google.dev/gemini-api/docs/interactions/files.md.txt)
- [File Input Methods](https://ai.google.dev/gemini-api/docs/interactions/file-input-methods.md.txt)
- [Caching](https://ai.google.dev/gemini-api/docs/interactions/caching.md.txt)
- [Media Resolution](https://ai.google.dev/gemini-api/docs/interactions/media-resolution.md.txt)

**Agents:**
- [Agents Overview](https://ai.google.dev/gemini-api/docs/agents.md.txt)
- [Managed Agents Quickstart](https://ai.google.dev/gemini-api/docs/managed-agents-quickstart.md.txt)
- [Antigravity Agent](https://ai.google.dev/gemini-api/docs/antigravity-agent.md.txt)
- [Agent Environments](https://ai.google.dev/gemini-api/docs/agent-environment.md.txt)
- [Building Custom Agents](https://ai.google.dev/gemini-api/docs/custom-agents.md.txt)
- [Deep Research](https://ai.google.dev/gemini-api/docs/interactions/deep-research.md.txt)

**Advanced Features:**
- [Gemini 3.5](https://ai.google.dev/gemini-api/docs/interactions/whats-new-gemini-3.5.md.txt)
- [Gemini 3](https://ai.google.dev/gemini-api/docs/interactions/gemini-3.md.txt)
- [Flex Inference](https://ai.google.dev/gemini-api/docs/interactions/flex-inference.md.txt)
- [Priority Inference](https://ai.google.dev/gemini-api/docs/interactions/priority-inference.md.txt)

**API Reference:**
- [API Reference](https://ai.google.dev/static/api/interactions.md.txt)
- [OpenAPI Spec](https://ai.google.dev/static/api/interactions.openapi.json)
- [May 2026 Breaking Changes Migration Guide](https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026.md.txt)

## Data Model

An `Interaction` response contains `steps`, an array of typed step objects representing a structured timeline of the interaction turn.

### Step Types

**User steps:**
- `user_input`: User input (text, audio, multimodal). Contains `content` array.

**Model/server steps:**
- `model_output`: Final model generation. Contains `content` array with `text`, `image`, `audio`, etc.
- `thought`: Model reasoning/Chain of Thought. Has `signature` field (required) and optional `summary`.
- `function_call`: Tool call request (`id`, `name`, `arguments`).
- `function_result`: Tool result you send back (`call_id`, `name`, `result`).
- `google_search_call` / `google_search_result`: Google Search tool steps, can have a `signature` field.
- `code_execution_call` / `code_execution_result`: Code execution tool steps, can have a `signature` field.
- `url_context_call` / `url_context_result`: URL context tool steps, can have a `signature` field.
- `mcp_server_tool_call` / `mcp_server_tool_result`: Remote MCP tool steps.
- `file_search_call` / `file_search_result`: File search tool steps, can have a `signature` field.

### Content types (inside `content` array on `model_output` and `user_input` steps)
- `text`: Text content (`text` field)
- `image` / `audio` / `document` / `video`: Content with `data`, `mime_type`, or `uri`

### Streaming Event Types

| Event | Description |
|---|---|
| `interaction.created` | Interaction created; includes metadata. |
| `interaction.status_update` | Interaction-level status change. |
| `step.start` | A new step begins. Contains step `type` and initial metadata. |
| `step.delta` | Incremental data for the current step. Contains a typed `delta` object. |
| `step.stop` | The step is complete. Contains `index`. |
| `interaction.completed` | Interaction finished. Contains final `usage`. |

### Delta Types

| Delta Type | Parent Step | Description |
|---|---|---|
| `text` | `model_output` | Incremental text token. |
| `audio` | `model_output` | audio chunk (base64). |
| `image` | `model_output` | image chunk (base64). |
| `thought_summary` | `thought` | thinking summary text. |
| `thought_signature` | `thought` | Opaque signature for thought verification. |

**Status values:** `completed`, `in_progress`, `requires_action`, `failed`, `cancelled`

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
