---
name: agent-framework-azure-ai-py
description: "Build persistent agents on Azure AI Foundry using the Microsoft Agent Framework Python SDK."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Agent Framework Azure Hosted Agents

Build persistent agents on Azure AI Foundry using the Microsoft Agent Framework Python SDK.

## Architecture

```
User Query → AzureAIAgentClient → Azure AI Agent Service (Persistent)
                    ↓
              Agent.run() / Agent.run_stream()
                    ↓
              Tools: Functions | Hosted (Code/Search/Web) | MCP
                    ↓
              AgentThread (conversation persistence)
```

## Installation

```bash
# This integration is still a release candidate. Pin the tested API surface.
pip install "agent-framework-azure-ai==1.0.0rc6" azure-identity
```

These examples target `AzureAIAgentClient` from `agent-framework-azure-ai`
1.0.0rc6. Do not substitute the older `AzureAIAgentsProvider` API. The newer
Microsoft Foundry Responses integration uses `FoundryChatClient` from
`agent-framework-foundry` and has a different client, tool, and session model.

## Environment Variables

```bash
export AZURE_AI_PROJECT_ENDPOINT="https://<project>.services.ai.azure.com/api/projects/<project-id>"
export AZURE_AI_MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
export BING_CONNECTION_ID="your-bing-connection-id"  # For web search
```

## Authentication

```python
from azure.identity.aio import AzureCliCredential, DefaultAzureCredential

# Development
credential = AzureCliCredential()

# Production
credential = DefaultAzureCredential()
```

## Core Workflow

### Basic Agent

```python
import asyncio
from agent_framework_azure_ai import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(credential=credential) as client,
    ):
        agent = client.create_agent(
            name="MyAgent",
            instructions="You are a helpful assistant.",
        )
        
        result = await agent.run("Hello!")
        print(result.text)

asyncio.run(main())
```

### Agent with Function Tools

```python
from typing import Annotated
from pydantic import Field
from agent_framework_azure_ai import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

def get_weather(
    location: Annotated[str, Field(description="City name to get weather for")],
) -> str:
    """Get the current weather for a location."""
    return f"Weather in {location}: 72°F, sunny"

def get_current_time() -> str:
    """Get the current UTC time."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(credential=credential) as client,
    ):
        agent = client.create_agent(
            name="WeatherAgent",
            instructions="You help with weather and time queries.",
            tools=[get_weather, get_current_time],  # Pass functions directly
        )
        
        result = await agent.run("What's the weather in Seattle?")
        print(result.text)
```

### Streaming Responses

```python
async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(credential=credential) as client,
    ):
        agent = client.create_agent(
            name="StreamingAgent",
            instructions="You are a helpful assistant.",
        )
        
        print("Agent: ", end="", flush=True)
        async for chunk in agent.run_stream("Tell me a short story"):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        print()
```

### Conversation Threads

```python
from agent_framework_azure_ai import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(credential=credential) as client,
    ):
        agent = client.create_agent(
            name="ChatAgent",
            instructions="You are a helpful assistant.",
            tools=[get_weather],
        )
        
        # Create thread for conversation persistence
        thread = agent.get_new_thread()
        
        # First turn
        result1 = await agent.run("What's the weather in Seattle?", thread=thread)
        print(f"Agent: {result1.text}")
        
        # Second turn - context is maintained
        result2 = await agent.run("What about Portland?", thread=thread)
        print(f"Agent: {result2.text}")
        
        # Save thread ID for later resumption
        print(f"Conversation ID: {thread.conversation_id}")
```

### Structured Outputs

```python
from pydantic import BaseModel, ConfigDict
from agent_framework_azure_ai import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

class WeatherResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    location: str
    temperature: float
    unit: str
    conditions: str

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(credential=credential) as client,
    ):
        agent = client.create_agent(
            name="StructuredAgent",
            instructions="Provide weather information in structured format.",
            response_format=WeatherResponse,
        )
        
        result = await agent.run("Weather in Seattle?")
        weather = WeatherResponse.model_validate_json(result.text)
        print(f"{weather.location}: {weather.temperature}°{weather.unit}")
```

## Client Methods

| Method | Description |
|--------|-------------|
| `create_agent()` | Create a `ChatAgent` configured with this client |
| `get_response()` | Request a non-streaming chat response directly |
| `get_streaming_response()` | Request a streaming chat response directly |
| `close()` | Close the underlying service client and managed resources |

## Conventions

- Close both the async credential and client, preferably with `async with`.
- Pass functions directly to `tools=` parameter (auto-converted to AIFunction)
- Use `Annotated[type, Field(description=...)]` for function parameters
- Use `get_new_thread()` for multi-turn conversations
- Re-check the pinned integration before adopting hosted tools; tool factories differ
  between `AzureAIAgentClient` and `FoundryChatClient`.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
