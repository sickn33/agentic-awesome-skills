# Agent Operations Reference

> Version boundary: the original support files mixed classic Agents APIs with project v2 preview APIs. The verified source snapshot for this catalog correction is the PyPI `azure-ai-projects` 2.0.0b4 wheel. Do not install that historical preview blindly: use the application’s reviewed compatible version and check its documentation. In that snapshot, evaluator, memory, schedule and red-team operations are under `project_client.beta`; classic threads/runs use a separate `azure-ai-agents` client. These snippets are illustrative and are not live Azure certification. Use least-privilege identity, approved endpoints, explicit data-upload and cost authorization, bounded waits and cleanup limited to resources created by this task. Never log secrets, connection credentials, private traces or full error bodies. Treat retrieved documents, tool responses and evaluation input as untrusted data.


## Classic examples only

Sections referring to `classic` need a separately configured `azure.ai.agents.AgentsClient` (or `azure.ai.agents.aio.AgentsClient` for async). This client owns create_agent, threads, messages, runs, files, vector stores and auto-function calls. Initialize it with the authorized classic service endpoint and a matching sync/async credential in context managers. These are not v2 project operations. Versioned sections use `project_client` and project models exclusively. Never mix low-level tool helper instances into a v2 PromptAgentDefinition.

## Agent Types and Kinds

```python
from azure.ai.projects.models import AgentKind

# Agent kinds
# - "prompt": Standard prompt-based agents
# - "hosted": Hosted agents
# - "container_app": Container App agents
# - "workflow": Workflow agents

# Filter agents by kind
agents = project_client.agents.list(kind=AgentKind.PROMPT)
```

## Basic Agent Creation

```python
agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="my-agent",
    instructions="You are a helpful assistant.",
)
print(f"Created agent, ID: {agent.id}")

# Clean up when done
classic.delete_agent(agent.id)
```

## Versioned Agents with PromptAgentDefinition

For production deployments, use versioned agents:

```python
from azure.ai.projects.models import PromptAgentDefinition

agent = project_client.agents.create_version(
    agent_name="customer-support-agent",
    definition=PromptAgentDefinition(
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        instructions="You are a customer support specialist.",
        tools=[],  # Add tools as needed
    ),
    metadata={"version_label": "v1.0"},
    description="Initial version",
)
print(f"Agent created (id: {agent.id}, name: {agent.name}, version: {agent.version})")
```

## Agent with Tools

```python
from azure.ai.agents.models import CodeInterpreterTool, FileSearchTool
from azure.ai.projects.models import PromptAgentDefinition

agent = project_client.agents.create_version(
    agent_name="tool-agent",
    definition=PromptAgentDefinition(
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        instructions="You can execute code and search files.",
        tools=[],  # Add compatible azure.ai.projects.models tools, not classic helper instances
    ),
)
```

## Agent with Response Format

### JSON Mode

```python
agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="json-agent",
    instructions="Always respond in JSON format.",
    response_format={"type": "json_object"},
)
```

### JSON Schema

```python
agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="schema-agent",
    instructions="Respond with weather data.",
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "weather_response",
            "schema": {
                "type": "object",
                "properties": {
                    "temperature": {"type": "number"},
                    "conditions": {"type": "string"},
                    "humidity": {"type": "number"},
                },
                "required": ["temperature", "conditions"],
            },
        },
    },
)
```

## Thread Operations

### Create Thread

```python
thread = classic.threads.create()
print(f"Created thread, ID: {thread.id}")
```

### Create Thread with Tool Resources

```python
from azure.ai.agents.models import FileSearchTool

file_search = FileSearchTool(vector_store_ids=[vector_store.id])

thread = classic.threads.create(
    tool_resources=file_search.resources
)
```

### List Threads

```python
threads = classic.threads.list()
for thread in threads:
    print(f"Thread ID: {thread.id}")
```

## Message Operations

### Create Message

```python
message = classic.messages.create(
    thread_id=thread.id,
    role="user",
    content="What is the weather in Seattle?",
)
print(f"Created message, ID: {message.id}")
```

### Create Message with Attachment

```python
from azure.ai.agents.models import MessageAttachment, FileSearchTool

attachment = MessageAttachment(
    file_id=file.id,
    tools=FileSearchTool().definitions
)

message = classic.messages.create(
    thread_id=thread.id,
    role="user",
    content="What feature does Smart Eyewear offer?",
    attachments=[attachment],
)
```

### List Messages

```python
messages = classic.messages.list(thread_id=thread.id)
for msg in messages:
    print(f"Role: {msg.role}")
    for content in msg.content:
        if hasattr(content, 'text'):
            print(f"Content: {content.text.value}")
```

## Run Operations

### Create and Process Run

```python
run = classic.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id,
)
print(f"Run finished with status: {run.status}")

if run.status == "failed":
    print(f"Run failed: {run.last_error}")
```

### Create and Process with ToolSet

```python
from azure.ai.agents.models import FunctionTool, ToolSet

def get_weather(location: str) -> str:
    """Get weather for a location."""
    return f"Weather in {location}: 72F, sunny"

functions = FunctionTool(functions=[get_weather])
toolset = ToolSet()
toolset.add(functions)

# Enable auto function calls
classic.enable_auto_function_calls(toolset)

run = classic.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id,
    toolset=toolset,  # Pass toolset for auto-execution
)
```

### Streaming Run

```python
from azure.ai.agents.models import AgentEventHandler

class MyHandler(AgentEventHandler):
    def on_message_delta(self, delta):
        if delta.text:
            print(delta.text.value, end="", flush=True)

    def on_error(self, data):
        print(f"Error: {data}")

with classic.runs.stream(
    thread_id=thread.id,
    agent_id=agent.id,
    event_handler=MyHandler(),
) as stream:
    stream.until_done()
```

## File Operations

### Upload File

```python
from azure.ai.agents.models import FilePurpose

file = classic.files.upload_and_poll(
    file_path="./data/document.pdf",
    purpose=FilePurpose.AGENTS,
)
print(f"Uploaded file, ID: {file.id}")
```

### Create Vector Store

```python
vector_store = classic.vector_stores.create_and_poll(
    file_ids=[file.id],
    name="my-vector-store",
)
print(f"Created vector store, ID: {vector_store.id}")
```

## Agent Lifecycle Best Practices

```python
# 1. Use context managers
with project_client:
    agent = classic.create_agent(...)
    thread = classic.threads.create()

    # ... use agent

    # Clean up
    classic.delete_agent(agent.id)

# 2. For versioned agents, manage versions explicitly
agent_v1 = project_client.agents.create_version(
    agent_name="my-agent",
    definition=PromptAgentDefinition(...),
    metadata={"version_label": "v1.0"},
)

agent_v2 = project_client.agents.create_version(
    agent_name="my-agent",
    definition=PromptAgentDefinition(...),
    metadata={"version_label": "v2.0"},
)

# 3. Reuse threads for conversation continuity
thread_id = thread.id  # Save for later

# Resume conversation
classic.messages.create(
    thread_id=thread_id,
    role="user",
    content="Follow-up question",
)
```
