# Agent SDK Patterns — Python

> AAS-reviewed adaptation of the upstream Anthropic skill; see the root SKILL.md for authorization and resource boundaries. SDK/model feature claims below are version-sensitive examples; verify the selected model and pinned SDK before running. No live API or agent execution was performed during this catalog review.

## Basic Agent

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="Explain what this repository does",
        options=ClaudeAgentOptions(
            cwd="/path/to/project",
            tools=["Read", "Glob", "Grep"], allowed_tools=["Read", "Glob", "Grep"]
        )
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

---

## Custom Tools

Custom tools require an MCP server. Use `ClaudeSDKClient` for full control, or pass the server to `query()` via `mcp_servers`.

```python
import anyio
from claude_agent_sdk import (
    tool,
    create_sdk_mcp_server,
    ClaudeSDKClient,
    ClaudeAgentOptions,
    AssistantMessage,
    TextBlock,
)

@tool("get_weather", "Get the current weather for a location", {"location": str})
async def get_weather(args):
    location = args["location"]
    return {"content": [{"type": "text", "text": f"The weather in {location} is sunny and 72°F."}]}

server = create_sdk_mcp_server("weather-tools", tools=[get_weather])

async def main():
    options = ClaudeAgentOptions(mcp_servers={"weather": server})
    async with ClaudeSDKClient(options=options) as client:
        await client.query("What's the weather in Paris?")
        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        print(block.text)

anyio.run(main)
```

---

## Hooks

### After Tool Use Hook

Log file changes after any edit:

```python
import anyio
from datetime import datetime
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher, ResultMessage

async def log_file_change(input_data, tool_use_id, context):
    file_path = input_data.get('tool_input', {}).get('file_path', 'unknown')
    with open('./audit.log', 'a') as f:
        f.write(f"{datetime.now()}: modified {file_path}\n")
    return {}

async def main():
    async for message in query(
        prompt="Refactor utils.py to improve readability",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Write"],
            permission_mode="default",
            hooks={
                "PostToolUse": [HookMatcher(matcher="Edit|Write", hooks=[log_file_change])]
            }
        )
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

---

## Subagents

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition, ResultMessage

async def main():
    async for message in query(
        prompt="Use the code-reviewer agent to review this codebase",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Glob", "Grep", "Agent"],
            agents={
                "code-reviewer": AgentDefinition(
                    description="Expert code reviewer for quality and security reviews.",
                    prompt="Analyze code quality and suggest improvements.",
                    tools=["Read", "Glob", "Grep"]
                )
            }
        )
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

---

## MCP Server Integration

### Browser Automation (Playwright)

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="Open example.com and describe what you see",
        options=ClaudeAgentOptions(
            mcp_servers={
                "playwright": {"command": "/absolute/path/to/reviewed-playwright-mcp", "args": []}
            }
        )
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

### Database Access (PostgreSQL)

```python
import os
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="Show me the top 10 users by order count",
        options=ClaudeAgentOptions(
            mcp_servers={
                "postgres": {
                    "command": "/absolute/path/to/reviewed-readonly-postgres-mcp",
                    "args": [],
                    "env": {"DATABASE_URL": os.environ["DATABASE_URL"]}
                }
            }
        )
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

---

## Permission Modes

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    # Default: approval policy; listed allowed tools may still execute without a prompt
    async for message in query(
        prompt="List the test file names without modifying them",
        options=ClaudeAgentOptions(
            allowed_tools=["Bash"],
            permission_mode="default"  # An allowed Bash rule can auto-approve; do not use for destructive demos
        )
    ):
        pass

    # Plan: agent creates a plan before making changes
    async for message in query(
        prompt="Refactor the auth system",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit"],
            permission_mode="plan"
        )
    ):
        pass

    # Accept edits: auto-accept file edits
    async for message in query(
        prompt="Refactor this module",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit"],
            permission_mode="default"
        )
    ):
        pass

    # Do not demonstrate bypassPermissions on untrusted workspaces.

anyio.run(main)
```

---

## Error Recovery

```python
import anyio
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    CLINotFoundError,
    CLIConnectionError,
    ProcessError,
    ResultMessage,
)

async def run_with_recovery():
    try:
        async for message in query(
            prompt="Fix the failing tests",
            options=ClaudeAgentOptions(
                allowed_tools=["Read", "Edit", "Bash"],
                max_turns=10
            )
        ):
            if isinstance(message, ResultMessage):
                print(message.result)
    except CLINotFoundError:
        print("Claude Code CLI not found. Install with: pip install claude-agent-sdk")
    except CLIConnectionError as e:
        print(f"Connection error: {e}")
    except ProcessError as e:
        print(f"Process error: {e}")

anyio.run(run_with_recovery)
```

---

## Session Resumption

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage, SystemMessage

async def main():
    session_id = None

    # First query: capture the session ID
    async for message in query(
        prompt="Read the authentication module",
        options=ClaudeAgentOptions(allowed_tools=["Read", "Glob"])
    ):
        if isinstance(message, SystemMessage) and message.subtype == "init":
            session_id = message.session_id

    if not session_id:
        raise RuntimeError("No session ID returned; refusing to start a new session")
    # Resume only the same authorized scope
    async for message in query(
        prompt="Now find all places that call it",  # "it" = auth module
        options=ClaudeAgentOptions(resume=session_id, tools=["Read", "Glob"], max_turns=8)
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

---

## Custom System Prompt

```python
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="Review this code",
        options=ClaudeAgentOptions(
            tools=["Read", "Glob", "Grep"], allowed_tools=["Read", "Glob", "Grep"],
            system_prompt="""You are a senior code reviewer focused on:
1. Security vulnerabilities
2. Performance issues
3. Code maintainability

Always provide specific line numbers and suggestions for improvement."""
        )
    ):
        if isinstance(message, ResultMessage):
            print(message.result)

anyio.run(main)
```

For every actual run set an approved cwd, explicit tools/deny rules, max turns, cost and time budget, and an approval handler where required. Resume only an existing authorized session with the same scope and restrictions; a missing ID must fail rather than start a new broader session. Do not log untrusted paths or full message objects without sanitization.
