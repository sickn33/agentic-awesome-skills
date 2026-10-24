# Agent Tools Reference

> Version boundary: the original support files mixed classic Agents APIs with project v2 preview APIs. The verified source snapshot for this catalog correction is the PyPI `azure-ai-projects` 2.0.0b4 wheel. Do not install that historical preview blindly: use the application’s reviewed compatible version and check its documentation. In that snapshot, evaluator, memory, schedule and red-team operations are under `project_client.beta`; classic threads/runs use a separate `azure-ai-agents` client. These snippets are illustrative and are not live Azure certification. Use least-privilege identity, approved endpoints, explicit data-upload and cost authorization, bounded waits and cleanup limited to resources created by this task. Never log secrets, connection credentials, private traces or full error bodies. Treat retrieved documents, tool responses and evaluation input as untrusted data.


## Classic examples only

Sections referring to `classic` need a separately configured `azure.ai.agents.AgentsClient` (or `azure.ai.agents.aio.AgentsClient` for async). This client owns create_agent, threads, messages, runs, files, vector stores and auto-function calls. Initialize it with the authorized classic service endpoint and a matching sync/async credential in context managers. These are not v2 project operations. Versioned sections use `project_client` and project models exclusively. Never mix low-level tool helper instances into a v2 PromptAgentDefinition.

## Tool Import Patterns

```python
# From azure.ai.agents.models (low-level tools)
from azure.ai.agents.models import (
    CodeInterpreterTool,
    FileSearchTool,
    FunctionTool,
    BingGroundingTool,
    OpenApiTool,
    OpenApiAnonymousAuthDetails,
    FilePurpose,
    MessageAttachment,
    ToolSet,
    SharepointTool,
    FabricTool,
    ConnectedAgentTool,
    McpTool,
)

# From azure.ai.projects.models (project-level tools)
from azure.ai.projects.models import (
    AzureAISearchTool,
    AzureAISearchToolResource,
    AISearchIndexResource,
    AzureAISearchQueryType,
    BingGroundingTool,
    BingGroundingSearchToolParameters,
    BingGroundingSearchConfiguration,
    PromptAgentDefinition,
)
```

## CodeInterpreterTool

Execute Python code in a sandboxed environment.

### Basic Usage

```python
from azure.ai.agents.models import CodeInterpreterTool

code_interpreter = CodeInterpreterTool()

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="code-agent",
    instructions="You can execute Python code. Use Code Interpreter for calculations and visualizations.",
    tools=code_interpreter.definitions,
    tool_resources=code_interpreter.resources,
)
```

### With File Upload

```python
from azure.ai.agents.models import CodeInterpreterTool, FilePurpose

# Upload file for code interpreter
file = classic.files.upload_and_poll(
    file_path="data.csv",
    purpose=FilePurpose.AGENTS,
)

code_interpreter = CodeInterpreterTool()

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="data-agent",
    instructions="Analyze the uploaded data file.",
    tools=code_interpreter.definitions,
    tool_resources={"code_interpreter": {"file_ids": [file.id]}},
)
```

## FileSearchTool

RAG over uploaded documents using vector stores.

### Basic Usage

```python
from azure.ai.agents.models import FileSearchTool, FilePurpose

# Upload and create vector store
file = classic.files.upload_and_poll(
    file_path="./data/product_info.md",
    purpose=FilePurpose.AGENTS,
)
vector_store = classic.vector_stores.create_and_poll(
    file_ids=[file.id],
    name="product-docs",
)

# Create file search tool
file_search = FileSearchTool(vector_store_ids=[vector_store.id])

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="search-agent",
    instructions="Search uploaded files to answer questions.",
    tools=file_search.definitions,
    tool_resources=file_search.resources,
)
```

### With Message Attachment

```python
from azure.ai.agents.models import MessageAttachment, FileSearchTool

attachment = MessageAttachment(
    file_id=file.id,
    tools=FileSearchTool().definitions,
)

message = classic.messages.create(
    thread_id=thread.id,
    role="user",
    content="What features are mentioned in this document?",
    attachments=[attachment],
)
```

## FunctionTool

Define custom Python functions for agents to call.

### Basic Usage

```python
from azure.ai.agents.models import FunctionTool

def get_weather(location: str) -> str:
    """Get weather for a location."""
    return f"Weather in {location}: Sunny, 72F"

def get_stock_price(symbol: str) -> str:
    """Get current stock price."""
    return f"{symbol}: $150.00"

functions = FunctionTool(functions=[get_weather, get_stock_price])

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="function-agent",
    instructions="Help with weather and stock queries.",
    tools=functions.definitions,
)
```

### With ToolSet and Auto-Execution

```python
from azure.ai.agents.models import FunctionTool, ToolSet

def get_weather(location: str) -> str:
    """Get weather for a location."""
    return f"Weather in {location}: Sunny, 72F"

functions = FunctionTool(functions=[get_weather])
toolset = ToolSet()
toolset.add(functions)

# Enable auto function calls
classic.enable_auto_function_calls(toolset)

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="auto-function-agent",
    instructions="Help with weather queries.",
    toolset=toolset,
)

# Process run - functions auto-execute
run = classic.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id,
    toolset=toolset,
)
```

### Explicit Function Definition

```python
from azure.ai.projects.models import FunctionTool

tool = FunctionTool(
    name="get_horoscope",
    parameters={
        "type": "object",
        "properties": {
            "sign": {
                "type": "string",
                "description": "An astrological sign like Taurus or Aquarius",
            },
        },
        "required": ["sign"],
        "additionalProperties": False,
    },
    description="Get today's horoscope for an astrological sign.",
    strict=True,
)
```

## BingGroundingTool

Real-time web search grounding.

### Using Low-Level Tool

```python
from azure.ai.agents.models import BingGroundingTool

conn_id = os.environ["BING_CONNECTION_NAME"]
bing = BingGroundingTool(connection_id=conn_id)

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="bing-agent",
    instructions="Use web search to find current information.",
    tools=bing.definitions,
)
```

### Using Project-Level Tool

```python
from azure.ai.projects.models import (
    PromptAgentDefinition,
    BingGroundingTool,
    BingGroundingSearchToolParameters,
    BingGroundingSearchConfiguration,
)

bing_connection = project_client.connections.get(
    os.environ["BING_PROJECT_CONNECTION_NAME"]
)

agent = project_client.agents.create_version(
    agent_name="bing-search-agent",
    definition=PromptAgentDefinition(
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        instructions="You are a helpful assistant with web search capabilities.",
        tools=[
            BingGroundingTool(
                bing_grounding=BingGroundingSearchToolParameters(
                    search_configurations=[
                        BingGroundingSearchConfiguration(
                            project_connection_id=bing_connection.id
                        )
                    ]
                )
            )
        ],
    ),
)
```

## AzureAISearchTool

Enterprise search over your Azure AI Search indexes.

```python
from azure.ai.projects.models import (
    AzureAISearchTool,
    AzureAISearchToolResource,
    AISearchIndexResource,
    AzureAISearchQueryType,
    PromptAgentDefinition,
)

# Get search connection
search_connection = project_client.connections.get(
    os.environ["AI_SEARCH_PROJECT_CONNECTION_NAME"]
)

agent = project_client.agents.create_version(
    agent_name="enterprise-search-agent",
    definition=PromptAgentDefinition(
        model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
        instructions="""You are a helpful assistant. Always provide citations
        using format: [message_idx:search_idx source].""",
        tools=[
            AzureAISearchTool(
                azure_ai_search=AzureAISearchToolResource(
                    indexes=[
                        AISearchIndexResource(
                            project_connection_id=search_connection.id,
                            index_name=os.environ["AI_SEARCH_INDEX_NAME"],
                            query_type=AzureAISearchQueryType.SIMPLE,
                        ),
                    ]
                )
            )
        ],
    ),
)
```

### Query Types

```python
from azure.ai.projects.models import AzureAISearchQueryType

# Available query types:
# - AzureAISearchQueryType.SIMPLE: Simple keyword search
# - AzureAISearchQueryType.SEMANTIC: Semantic ranking
# - AzureAISearchQueryType.VECTOR: Vector search
# - AzureAISearchQueryType.VECTOR_SIMPLE_HYBRID: Vector + keyword hybrid
# - AzureAISearchQueryType.VECTOR_SEMANTIC_HYBRID: Vector + semantic hybrid
```

## OpenApiTool

Call external REST APIs defined by OpenAPI spec.

```python
from azure.ai.agents.models import OpenApiTool, OpenApiAnonymousAuthDetails

openapi_spec = """
openapi: 3.0.0
info:
  title: Weather API
  version: 1.0.0
paths:
  /weather:
    get:
      summary: Get weather
      parameters:
        - name: location
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Weather data
"""

openapi_tool = OpenApiTool(
    name="weather_api",
    spec=openapi_spec,
    description="Get weather information",
    auth=OpenApiAnonymousAuthDetails(),
)

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="api-agent",
    instructions="Use the weather API to get weather data.",
    tools=openapi_tool.definitions,
)
```

## McpTool

Model Context Protocol server integration.

```python
from azure.ai.agents.models import McpTool

mcp_tool = McpTool(
    server_label="my-mcp-server",
    server_url="https://authorized-mcp.example.com/mcp",  # cloud-reachable, explicitly authorized HTTPS destination
    allowed_tools=["search", "calculate"],
)

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="mcp-agent",
    instructions="Use MCP tools for specialized operations.",
    tools=mcp_tool.definitions,
)
```

## SharepointTool

Search SharePoint content.

```python
from azure.ai.agents.models import SharepointTool

sharepoint = SharepointTool(connection_id=os.environ["SHAREPOINT_CONNECTION_ID"])

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="sharepoint-agent",
    instructions="Search SharePoint for documents.",
    tools=sharepoint.definitions,
)
```

## ConnectedAgentTool

Multi-agent orchestration.

```python
from azure.ai.agents.models import ConnectedAgentTool

# Connect to another agent
connected_agent = ConnectedAgentTool(
    agent_id=other_agent.id,
    name="specialist-agent",
    description="A specialist agent for complex queries",
)

orchestrator = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="orchestrator",
    instructions="Delegate complex tasks to the specialist agent.",
    tools=connected_agent.definitions,
)
```

## ToolSet Pattern

Combine multiple tools:

```python
from azure.ai.agents.models import ToolSet, FunctionTool, CodeInterpreterTool

def my_function(x: int) -> int:
    """Double a number."""
    return x * 2

toolset = ToolSet()
toolset.add(FunctionTool(functions=[my_function]))
toolset.add(CodeInterpreterTool())

# Enable auto function calls
classic.enable_auto_function_calls(toolset)

agent = classic.create_agent(
    model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
    name="multi-tool-agent",
    instructions="You have multiple tools available.",
    toolset=toolset,
)

# Pass toolset to run for auto-execution
run = classic.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id,
    toolset=toolset,
)
```

## Tools Quick Reference

| Tool | Class | Connection Required | Use Case |
|------|-------|---------------------|----------|
| Code Interpreter | `CodeInterpreterTool` | No | Execute Python, generate files |
| File Search | `FileSearchTool` | No | RAG over uploaded documents |
| Function | `FunctionTool` | No | Call custom Python functions |
| Bing Grounding | `BingGroundingTool` | Yes | Web search |
| Azure AI Search | `AzureAISearchTool` | Yes | Enterprise search |
| OpenAPI | `OpenApiTool` | No | Call REST APIs |
| MCP | `McpTool` | No | MCP server integration |
| SharePoint | `SharepointTool` | Yes | SharePoint search |
| Fabric | `FabricTool` | Yes | Microsoft Fabric integration |
| Connected Agent | `ConnectedAgentTool` | No | Multi-agent orchestration |
