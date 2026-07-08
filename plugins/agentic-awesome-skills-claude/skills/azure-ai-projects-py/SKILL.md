---
name: azure-ai-projects-py
description: "Build AI applications on Microsoft Foundry using the azure-ai-projects SDK."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure AI Projects Python SDK (Foundry SDK)

Build AI applications on Microsoft Foundry using the `azure-ai-projects` SDK.

## Installation

```bash
pip install azure-ai-projects azure-identity
```

## Environment Variables

```bash
AZURE_AI_PROJECT_ENDPOINT="https://<resource>.services.ai.azure.com/api/projects/<project>"
AZURE_AI_MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
```

## Authentication

```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

credential = DefaultAzureCredential()
client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    credential=credential,
)
```

## Client Operations Overview

| Operation | Access | Purpose |
|-----------|--------|---------|
| `client.agents` | `.agents.*` | Agent CRUD, versions, threads, runs |
| `client.connections` | `.connections.*` | List/get project connections |
| `client.deployments` | `.deployments.*` | List model deployments |
| `client.datasets` | `.datasets.*` | Dataset management |
| `client.indexes` | `.indexes.*` | Index management |
| `client.evaluations` | `.evaluations.*` | Run evaluations |
| `client.red_teams` | `.red_teams.*` | Red team operations |

## Two Client Approaches

### 1. AIProjectClient (Native Foundry)

```python
from azure.ai.projects import AIProjectClient

client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential(),
)

# Use Foundry-native operations
agent = client.agents.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="my-agent",
    instructions="You are helpful.",
)
```

### 2. OpenAI-Compatible Client

```python
# Get OpenAI-compatible client from project
openai_client = client.get_openai_client()

# Use standard OpenAI API
response = openai_client.chat.completions.create(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    messages=[{"role": "user", "content": "Hello!"}],
)
```

## Agent Operations

### Create Agent (Basic)

```python
agent = client.agents.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="my-agent",
    instructions="You are a helpful assistant.",
)
```

### Create Agent with Tools

```python
from azure.ai.agents import CodeInterpreterTool, FileSearchTool

agent = client.agents.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="tool-agent",
    instructions="You can execute code and search files.",
    tools=[CodeInterpreterTool(), FileSearchTool()],
)
```

### Versioned Agents with PromptAgentDefinition

```python
from azure.ai.projects.models import PromptAgentDefinition

# Create a versioned agent
agent_version = client.agents.create_version(
    agent_name="customer-support-agent",
    definition=PromptAgentDefinition(
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        instructions="You are a customer support specialist.",
        tools=[],  # Add tools as needed
    ),
    version_label="v1.0",
)
```

See references/agents.md for detailed agent patterns.

## Tools Overview

| Tool | Class | Use Case |
|------|-------|----------|
| Code Interpreter | `CodeInterpreterTool` | Execute Python, generate files |
| File Search | `FileSearchTool` | RAG over uploaded documents |
| Bing Grounding | `BingGroundingTool` | Web search (requires connection) |
| Azure AI Search | `AzureAISearchTool` | Search your indexes |
| Function Calling | `FunctionTool` | Call your Python functions |
| OpenAPI | `OpenApiTool` | Call REST APIs |
| MCP | `McpTool` | Model Context Protocol servers |
| Memory Search | `MemorySearchTool` | Search agent memory stores |
| SharePoint | `SharepointGroundingTool` | Search SharePoint content |

See references/tools.md for all tool patterns.

## Thread and Message Flow

```python
# 1. Create thread
thread = client.agents.threads.create()

# 2. Add message
client.agents.messages.create(
    thread_id=thread.id,
    role="user",
    content="What's the weather like?",
)

# 3. Create and process run
run = client.agents.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id,
)

# 4. Get response
if run.status == "completed":
    messages = client.agents.messages.list(thread_id=thread.id)
    for msg in messages:
        if msg.role == "assistant":
            print(msg.content[0].text.value)
```

## Connections

```python
# List all connections
connections = client.connections.list()
for conn in connections:
    print(f"{conn.name}: {conn.connection_type}")

# Get specific connection
connection = client.connections.get(connection_name="my-search-connection")
```

See references/connections.md for connection patterns.

## Deployments

```python
# List available model deployments
deployments = client.deployments.list()
for deployment in deployments:
    print(f"{deployment.name}: {deployment.model}")
```

See references/deployments.md for deployment patterns.

## Datasets and Indexes

```python
# List datasets
datasets = client.datasets.list()

# List indexes
indexes = client.indexes.list()
```

See references/datasets-indexes.md for data operations.

## Evaluation

```python
# Using OpenAI client for evals
openai_client = client.get_openai_client()

# Create evaluation with built-in evaluators
eval_run = openai_client.evals.runs.create(
    eval_id="my-eval",
    name="quality-check",
    data_source={
        "type": "custom",
        "item_references": [{"item_id": "test-1"}],
    },
    testing_criteria=[
        {"type": "fluency"},
        {"type": "task_adherence"},
    ],
)
```

See references/evaluation.md for evaluation patterns.

## Async Client

```python
from azure.ai.projects.aio import AIProjectClient

async with AIProjectClient(
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential(),
) as client:
    agent = await client.agents.create_agent(...)
    # ... async operations
```

See references/async-patterns.md for async patterns.

## Memory Stores

```python
# Create memory store for agent
memory_store = client.agents.create_memory_store(
    name="conversation-memory",
)

# Attach to agent for persistent memory
agent = client.agents.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="memory-agent",
    tools=[MemorySearchTool()],
    tool_resources={"memory": {"store_ids": [memory_store.id]}},
)
```

## Best Practices

1. **Use context managers** for async client: `async with AIProjectClient(...) as client:`
2. **Clean up agents** when done: `client.agents.delete_agent(agent.id)`
3. **Use `create_and_process`** for simple runs, **streaming** for real-time UX
4. **Use versioned agents** for production deployments
5. **Prefer connections** for external service integration (AI Search, Bing, etc.)

## SDK Comparison

| Feature | `azure-ai-projects` | `azure-ai-agents` |
|---------|---------------------|-------------------|
| Level | High-level (Foundry) | Low-level (Agents) |
| Client | `AIProjectClient` | `AgentsClient` |
| Versioning | `create_version()` | Not available |
| Connections | Yes | No |
| Deployments | Yes | No |
| Datasets/Indexes | Yes | No |
| Evaluation | Via OpenAI client | No |
| When to use | Full Foundry integration | Standalone agent apps |

## Reference Files

- references/agents.md: Agent operations with PromptAgentDefinition
- references/tools.md: All agent tools with examples
- references/evaluation.md: Evaluation operations overview
- references/built-in-evaluators.md: Complete built-in evaluator reference
- references/custom-evaluators.md: Code and prompt-based evaluator patterns
- references/connections.md: Connection operations
- references/deployments.md: Deployment enumeration
- references/datasets-indexes.md: Dataset and index operations
- references/async-patterns.md: Async client usage
- references/api-reference.md: Complete API reference for all 373 SDK exports (v2.0.0b4)
- scripts/run_batch_evaluation.py: CLI tool for batch evaluations

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
