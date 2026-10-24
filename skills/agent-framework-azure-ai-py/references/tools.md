# Hosted Tools Reference

**Compatibility note:** This is preserved legacy-generation reference material, not a verified current SDK recipe. Apply the SDK-generation, authorization, privacy, cost and cleanup gate in the root skill before adapting any snippet.

Detailed patterns for all hosted tools available in the Agent Framework.

## HostedCodeInterpreterTool

Enables agents to execute Python code on the Azure AI service.

### Basic Usage

```python
from agent_framework import HostedCodeInterpreterTool
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="CodingAgent",
        instructions="You can write and execute Python code to solve problems.",
        tools=HostedCodeInterpreterTool(),
    )

    result = await agent.run("Calculate the factorial of 20 using Python")
    print(result.text)
```

### With File Inputs

Select only authorized files/vector stores for the authenticated project/user. Track IDs created in this run and explicitly remove them through the version-matched service API when retention expires; do not delete pre-existing resources on context-manager exit.

```python
from agent_framework import HostedCodeInterpreterTool, HostedFileContent

# Reference a file already uploaded to the service
code_tool = HostedCodeInterpreterTool(
    inputs=[
        HostedFileContent(file_id="file-abc123"),
    ]
)

agent = await provider.create_agent(
    name="DataAnalyst",
    instructions="Analyze the provided data file.",
    tools=code_tool,
)
```

### Common Use Cases

- Data analysis and visualization
- Mathematical calculations
- File processing (CSV, JSON, etc.)
- Code generation and testing

---

## HostedFileSearchTool

Enables agents to search through documents using vector stores.

### Setup with Vector Store

```python
from pathlib import Path
from agent_framework import HostedFileSearchTool, HostedVectorStoreContent
from agent_framework.azure import AzureAIAgentsProvider
from azure.ai.agents.aio import AgentsClient
from azure.identity.aio import AzureCliCredential

async with (
    AzureCliCredential() as credential,
    AgentsClient(endpoint=endpoint, credential=credential) as agents_client,
    AzureAIAgentsProvider(agents_client=agents_client) as provider,
):
    # Upload file to the service
    file = await agents_client.files.upload(
        file_path=Path("data/knowledge_base.txt"),
        purpose="agents"
    )

    # Create vector store from file
    vector_store = await agents_client.vector_stores.create_and_poll(
        file_ids=[file.id],
        name="my_knowledge_store"
    )

    # Create file search tool with vector store
    file_search_tool = HostedFileSearchTool(
        inputs=[HostedVectorStoreContent(vector_store_id=vector_store.id)],
        max_results=10,  # Optional: limit search results
    )

    agent = await provider.create_agent(
        name="ResearchAgent",
        instructions="Search the knowledge base to answer questions accurately.",
        tools=file_search_tool,
    )

    result = await agent.run("What are the key findings in the document?")
    print(result.text)
```

### Multiple Vector Stores

```python
file_search_tool = HostedFileSearchTool(
    inputs=[
        HostedVectorStoreContent(vector_store_id="vs-policy-docs"),
        HostedVectorStoreContent(vector_store_id="vs-technical-specs"),
    ],
    max_results=20,
)
```

### Common Use Cases

- Document Q&A
- Knowledge base retrieval
- Policy/procedure lookup
- Technical documentation search

---

## HostedWebSearchTool

Enables agents to search the web using Bing.

### Basic Bing Grounding

```python
import os
from agent_framework import HostedWebSearchTool
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

# Requires BING_CONNECTION_ID environment variable
os.environ["BING_CONNECTION_ID"] = "your-bing-connection-id"

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="SearchAgent",
        instructions="Search the web for current information to answer questions.",
        tools=HostedWebSearchTool(
            name="Bing Grounding Search",
            description="Search the web for current information",
        ),
    )

    result = await agent.run("What are the latest developments in AI?")
    print(result.text)
```

### Bing Custom Search

For searching a custom index of websites:

```python
import os

# Requires custom search configuration
os.environ["BING_CUSTOM_CONNECTION_ID"] = "your-custom-bing-connection-id"
os.environ["BING_CUSTOM_INSTANCE_NAME"] = "your-custom-instance"

bing_custom_tool = HostedWebSearchTool(
    name="Bing Custom Search",
    description="Search specific websites for relevant information",
)
```

### Common Use Cases

- Current events and news
- Real-time information lookup
- Fact-checking
- Research assistance

---

## HostedImageGenerationTool

Enables agents to generate images (when available on the service).

```python
from agent_framework import HostedImageGenerationTool

agent = await provider.create_agent(
    name="CreativeAgent",
    instructions="You can generate images based on descriptions.",
    tools=HostedImageGenerationTool(),
)
```

---

## Combining Multiple Tools

Agents can use multiple tools simultaneously:

```python
from typing import Annotated
from pydantic import Field
from agent_framework import (
    HostedCodeInterpreterTool,
    HostedFileSearchTool,
    HostedWebSearchTool,
    HostedVectorStoreContent,
)

# Custom function tool
def get_current_date() -> str:
    """Get today's date."""
    from datetime import date
    return date.today().isoformat()

async with (
    AzureCliCredential() as credential,
    AgentsClient(endpoint=endpoint, credential=credential) as agents_client,
    AzureAIAgentsProvider(agents_client=agents_client) as provider,
):
    # Setup vector store first
    vector_store = await agents_client.vector_stores.create_and_poll(
        file_ids=[uploaded_file.id],
        name="docs_store"
    )

    agent = await provider.create_agent(
        name="SuperAgent",
        instructions="""You are a versatile assistant with multiple capabilities:
        - Execute Python code for calculations and data analysis
        - Search internal documents for company information
        - Search the web for current external information
        - Provide current date when needed

        Choose the appropriate tool based on the user's question.""",
        tools=[
            get_current_date,  # Function tool
            HostedCodeInterpreterTool(),
            HostedFileSearchTool(
                inputs=[HostedVectorStoreContent(vector_store_id=vector_store.id)]
            ),
            HostedWebSearchTool(name="Bing"),
        ],
    )
```

---

## Tool Selection Guidelines

| Need | Tool |
|------|------|
| Code execution, math, data analysis | `HostedCodeInterpreterTool` |
| Search uploaded documents | `HostedFileSearchTool` |
| Current web information | `HostedWebSearchTool` |
| Custom business logic | Function tools |
| External API integration | `HostedMCPTool` or `MCPStreamableHTTPTool` |

---

## Error Handling

```python
from agent_framework import AgentResponseUpdate

async for chunk in agent.run_stream("Analyze this data"):
    if isinstance(chunk, AgentResponseUpdate):
        # Check for tool execution errors
        if chunk.tool_calls:
            for tool_call in chunk.tool_calls:
                if hasattr(tool_call, 'error') and tool_call.error:
                    print(f"Tool error: {tool_call.error}")
    if chunk.text:
        print(chunk.text, end="", flush=True)
```
