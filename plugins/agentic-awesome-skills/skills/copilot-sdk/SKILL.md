---
name: copilot-sdk
description: "Build applications that programmatically interact with GitHub Copilot. The SDK wraps the Copilot CLI via JSON-RPC, providing session management, custom tools, hooks, MCP server integration, and streaming across Node.js, Python, Go, and .NET."
risk: unknown
source: community
date_added: "2026-02-27"
---

# GitHub Copilot SDK

Build applications that programmatically interact with GitHub Copilot. The SDK wraps the Copilot CLI via JSON-RPC, providing session management, custom tools, hooks, MCP server integration, and streaming across Node.js, Python, Go, and .NET.

## Prerequisites

- **GitHub Copilot CLI** installed and authenticated (`copilot --version` to verify)
- **GitHub Copilot subscription** (Individual, Business, or Enterprise) — not required for BYOK
- **Runtime:** Node.js 18+ / Python 3.8+ / Go 1.21+ / .NET 8.0+

## Installation

| Language | Package | Install |
|----------|---------|---------|
| Node.js | `@github/copilot-sdk` | `npm install @github/copilot-sdk` |
| Python | `github-copilot-sdk` | `pip install github-copilot-sdk` |
| Go | `github.com/github/copilot-sdk/go` | `go get github.com/github/copilot-sdk/go` |
| .NET | `GitHub.Copilot.SDK` | `dotnet add package GitHub.Copilot.SDK` |

---

## Core Pattern: Client → Session → Message

All SDK usage follows this pattern: create a client, create a session, send messages.

### Node.js / TypeScript

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
const session = await client.createSession({ model: "gpt-4.1" });

const response = await session.sendAndWait({ prompt: "What is 2 + 2?" });
console.log(response?.data.content);

await client.stop();
```

### Python

```python
import asyncio
from copilot import CopilotClient

async def main():
    client = CopilotClient()
    await client.start()
    session = await client.create_session({"model": "gpt-4.1"})
    response = await session.send_and_wait({"prompt": "What is 2 + 2?"})
    print(response.data.content)
    await client.stop()

asyncio.run(main())
```

### Go

```go
client := copilot.NewClient(nil)
if err := client.Start(ctx); err != nil { log.Fatal(err) }
defer client.Stop()

session, _ := client.CreateSession(ctx, &copilot.SessionConfig{Model: "gpt-4.1"})
response, _ := session.SendAndWait(ctx, copilot.MessageOptions{Prompt: "What is 2 + 2?"})
fmt.Println(*response.Data.Content)
```

### .NET

```csharp
await using var client = new CopilotClient();
await using var session = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-4.1" });
var response = await session.SendAndWaitAsync(new MessageOptions { Prompt = "What is 2 + 2?" });
Console.WriteLine(response?.Data.Content);
```

---

## Streaming Responses

Enable real-time output by setting `streaming: true` and subscribing to delta events.

```typescript
const session = await client.createSession({ model: "gpt-4.1", streaming: true });

session.on("assistant.message_delta", (event) => {
    process.stdout.write(event.data.deltaContent);
});
session.on("session.idle", () => console.log());

await session.sendAndWait({ prompt: "Tell me a joke" });
```

**Python equivalent:**

```python
from copilot.generated.session_events import SessionEventType

session = await client.create_session({"model": "gpt-4.1", "streaming": True})

def handle_event(event):
    if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
        sys.stdout.write(event.data.delta_content)
        sys.stdout.flush()

session.on(handle_event)
await session.send_and_wait({"prompt": "Tell me a joke"})
```

### Event Subscription

| Method | Description |
|--------|-------------|
| `on(handler)` | Subscribe to all events; returns unsubscribe function |
| `on(eventType, handler)` | Subscribe to specific event type (Node.js only) |

---

## Custom Tools

Define tools that Copilot can call to extend its capabilities.

### Node.js

```typescript
import { CopilotClient, defineTool } from "@github/copilot-sdk";

const getWeather = defineTool("get_weather", {
    description: "Get the current weather for a city",
    parameters: {
        type: "object",
        properties: { city: { type: "string", description: "The city name" } },
        required: ["city"],
    },
    handler: async ({ city }) => ({ city, temperature: "72°F", condition: "sunny" }),
});

const session = await client.createSession({
    model: "gpt-4.1",
    tools: [getWeather],
});
```

### Python

```python
from copilot.tools import define_tool
from pydantic import BaseModel, Field

class GetWeatherParams(BaseModel):
    city: str = Field(description="The city name")

@define_tool(description="Get the current weather for a city")
async def get_weather(params: GetWeatherParams) -> dict:
    return {"city": params.city, "temperature": "72°F", "condition": "sunny"}

session = await client.create_session({"model": "gpt-4.1", "tools": [get_weather]})
```

### Go

```go
type WeatherParams struct {
    City string `json:"city" jsonschema:"The city name"`
}

getWeather := copilot.DefineTool("get_weather", "Get weather for a city",
    func(params WeatherParams, inv copilot.ToolInvocation) (WeatherResult, error) {
        return WeatherResult{City: params.City, Temperature: "72°F"}, nil
    },
)

session, _ := client.CreateSession(ctx, &copilot.SessionConfig{
    Model: "gpt-4.1",
    Tools: []copilot.Tool{getWeather},
})
```

### .NET

```csharp
var getWeather = AIFunctionFactory.Create(
    ([Description("The city name")] string city) => new { city, temperature = "72°F" },
    "get_weather", "Get the current weather for a city");

await using var session = await client.CreateSessionAsync(new SessionConfig {
    Model = "gpt-4.1", Tools = [getWeather],
});
```

---

## Hooks

Intercept and customize session behavior at key lifecycle points.

| Hook | Trigger | Use Case |
|------|---------|----------|
| `onPreToolUse` | Before tool executes | Permission control, argument modification |
| `onPostToolUse` | After tool executes | Result transformation, logging |
| `onUserPromptSubmitted` | User sends message | Prompt modification, filtering |
| `onSessionStart` | Session begins | Add context, configure session |
| `onSessionEnd` | Session ends | Cleanup, analytics |
| `onErrorOccurred` | Error happens | Custom error handling, retry logic |

### Example: Tool Permission Control

```typescript
const session = await client.createSession({
    hooks: {
        onPreToolUse: async (input) => {
            if (["shell", "bash"].includes(input.toolName)) {
                return { permissionDecision: "deny", permissionDecisionReason: "Shell access not permitted" };
            }
            return { permissionDecision: "allow" };
        },
    },
});
```

### Pre-Tool Use Output

| Field | Type | Description |
|-------|------|-------------|
| `permissionDecision` | `"allow"` \| `"deny"` \| `"ask"` | Whether to allow the tool call |
| `permissionDecisionReason` | string | Explanation for deny/ask |
| `modifiedArgs` | object | Modified arguments to pass |
| `additionalContext` | string | Extra context for conversation |
| `suppressOutput` | boolean | Hide tool output from conversation |

---

## MCP Server Integration

Connect to MCP servers for pre-built tool capabilities.

### Remote HTTP Server

```typescript
const session = await client.createSession({
    mcpServers: {
        github: { type: "http", url: "https://api.githubcopilot.com/mcp/" },
    },
});
```

### Local Stdio Server

```typescript
const session = await client.createSession({
    mcpServers: {
        filesystem: {
            type: "local",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"],
            tools: ["*"],
        },
    },
});
```

### MCP Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local"` \| `"http"` | Server transport type |
| `command` | string | Executable path (local) |
| `args` | string[] | Command arguments (local) |
| `url` | string | Server URL (http) |
| `tools` | string[] | `["*"]` or specific tool names |
| `env` | object | Environment variables |
| `cwd` | string | Working directory (local) |
| `timeout` | number | Timeout in milliseconds |

---

## Authentication

### Methods (Priority Order)

1. **Explicit token** — `githubToken` in constructor
2. **Environment variables** — `COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN`
3. **Stored OAuth** — From `copilot auth login`
4. **GitHub CLI** — `gh auth` credentials

### Programmatic Token

```typescript
const client = new CopilotClient({ githubToken: process.env.GITHUB_TOKEN });
```

### BYOK (Bring Your Own Key)

Use your own API keys — no Copilot subscription required.

```typescript
const session = await client.createSession({
    model: "gpt-5.2-codex",
    provider: {
        type: "openai",
        baseUrl: "https://your-resource.openai.azure.com/openai/v1/",
        wireApi: "responses",
        apiKey: process.env.FOUNDRY_API_KEY,
    },
});
```

| Provider | Type | Notes |
|----------|------|-------|
| OpenAI | `"openai"` | OpenAI API and compatible endpoints |
| Azure OpenAI | `"azure"` | Native Azure endpoints (don't include `/openai/v1`) |
| Azure AI Foundry | `"openai"` | OpenAI-compatible Foundry endpoints |
| Anthropic | `"anthropic"` | Claude models |
| Ollama | `"openai"` | Local models, no API key needed |

**Wire API:** Use `"responses"` for GPT-5 series, `"completions"` (default) for others.

---

## Session Persistence

Resume sessions across restarts by providing your own session ID.

```typescript
// Create with explicit ID
const session = await client.createSession({
    sessionId: "user-123-task-456",
    model: "gpt-4.1",
});

// Resume later
const resumed = await client.resumeSession("user-123-task-456");
await resumed.sendAndWait({ prompt: "What did we discuss?" });
```

**Session management:**

```typescript
const sessions = await client.listSessions();          // List all
await client.deleteSession("user-123-task-456");       // Delete
await session.destroy();                                // Destroy active
```

**BYOK sessions:** Must re-provide `provider` config on resume (keys are not persisted).

### Infinite Sessions

For long-running workflows that may exceed context limits:

```typescript
const session = await client.createSession({
    infiniteSessions: {
        enabled: true,
        backgroundCompactionThreshold: 0.80,
        bufferExhaustionThreshold: 0.95,
    },
});
```

---

## Custom Agents

Define specialized AI personas:

```typescript
const session = await client.createSession({
    customAgents: [{
        name: "pr-reviewer",
        displayName: "PR Reviewer",
        description: "Reviews pull requests for best practices",
        prompt: "You are an expert code reviewer. Focus on security, performance, and maintainability.",
    }],
});
```

---

## System Message

Control AI behavior and personality:

```typescript
const session = await client.createSession({
    systemMessage: { content: "You are a helpful assistant. Always be concise." },
});
```

---

## Skills Integration

Load skill directories to extend Copilot's capabilities:

```typescript
const session = await client.createSession({
    skillDirectories: ["./skills/code-review", "./skills/documentation"],
    disabledSkills: ["experimental-feature"],
});
```

---

## Permission & Input Handlers

Handle tool permissions and user input requests programmatically:

```typescript
const session = await client.createSession({
    onPermissionRequest: async (request) => {
        // Auto-approve git commands only
        if (request.kind === "shell") {
            return { approved: request.command.startsWith("git") };
        }
        return { approved: true };
    },
    onUserInputRequest: async (request) => {
        // Handle ask_user tool calls
        return { response: "yes" };
    },
});
```

---

## External CLI Server

Connect to a separately running CLI instead of auto-managing the process:

```bash
copilot --headless --port 4321
```

```typescript
const client = new CopilotClient({ cliUrl: "localhost:4321" });
```

---

## Client Configuration

| Option | Type | Description |
|--------|------|-------------|
| `cliPath` | string | Path to Copilot CLI executable |
| `cliUrl` | string | URL of external CLI server |
| `githubToken` | string | GitHub token for auth |
| `useLoggedInUser` | boolean | Use stored CLI credentials (default: true) |
| `logLevel` | string | `"none"` \| `"error"` \| `"warning"` \| `"info"` \| `"debug"` |
| `autoRestart` | boolean | Auto-restart CLI on crash (default: true) |
| `useStdio` | boolean | Use stdio transport (default: true) |

## Session Configuration

| Option | Type | Description |
|--------|------|-------------|
| `model` | string | Model to use (e.g., `"gpt-4.1"`) |
| `sessionId` | string | Custom ID for resumable sessions |
| `streaming` | boolean | Enable streaming responses |
| `tools` | Tool[] | Custom tools |
| `mcpServers` | object | MCP server configurations |
| `hooks` | object | Session hooks |
| `provider` | object | BYOK provider config |
| `customAgents` | object[] | Custom agent definitions |
| `systemMessage` | object | System message override |
| `skillDirectories` | string[] | Directories to load skills from |
| `disabledSkills` | string[] | Skills to disable |
| `reasoningEffort` | string | Reasoning effort level |
| `availableTools` | string[] | Restrict available tools |
| `excludedTools` | string[] | Exclude specific tools |
| `infiniteSessions` | object | Auto-compaction config |
| `workingDirectory` | string | Working directory |

---

## Debugging

Enable debug logging to troubleshoot issues:

```typescript
const client = new CopilotClient({ logLevel: "debug" });
```

**Common issues:**
- `CLI not found` → Install CLI or set `cliPath`
- `Not authenticated` → Run `copilot auth login` or provide `githubToken`
- `Session not found` → Don't use session after `destroy()`
- `Connection refused` → Check CLI process, enable `autoRestart`

---

## Key API Summary

| Language | Client | Session Create | Send | Stop |
|----------|--------|---------------|------|------|
| Node.js | `new CopilotClient()` | `client.createSession()` | `session.sendAndWait()` | `client.stop()` |
| Python | `CopilotClient()` | `client.create_session()` | `session.send_and_wait()` | `client.stop()` |
| Go | `copilot.NewClient(nil)` | `client.CreateSession()` | `session.SendAndWait()` | `client.Stop()` |
| .NET | `new CopilotClient()` | `client.CreateSessionAsync()` | `session.SendAndWaitAsync()` | `client.DisposeAsync()` |

## References

- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Copilot CLI Installation](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- [MCP Protocol Specification](https://modelcontextprotocol.io)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
