# Advanced Patterns Reference

**Compatibility note:** This is preserved legacy-generation reference material, not a verified current SDK recipe. Apply the SDK-generation, authorization, privacy, cost and cleanup gate in the root skill before adapting any snippet.

Advanced patterns including structured outputs, OpenAPI tools, file handling, and more.

## Structured Outputs with Pydantic

### Basic Response Format

```python
from pydantic import BaseModel, ConfigDict
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

class MovieRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")  # Strict validation

    title: str
    year: int
    genre: str
    rating: float
    summary: str

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="MovieAgent",
        instructions="Recommend movies based on user preferences.",
        response_format=MovieRecommendation,  # Set at creation
    )

    result = await agent.run("Recommend a sci-fi movie")
    movie = MovieRecommendation.model_validate_json(result.text)
    print(f"{movie.title} ({movie.year}) - {movie.rating}/10")
```

### Complex Nested Structures

```python
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

class Address(BaseModel):
    model_config = ConfigDict(extra="forbid")
    street: str
    city: str
    country: str
    postal_code: Optional[str] = None

class Person(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    age: int
    email: str
    address: Address
    hobbies: list[str] = Field(default_factory=list)

class TeamResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    team_name: str
    members: list[Person]
    total_members: int

agent = await provider.create_agent(
    name="TeamGenerator",
    instructions="Generate fictional team data.",
    response_format=TeamResponse,
)

result = await agent.run("Create a team of 3 software developers")
team = TeamResponse.model_validate_json(result.text)
for member in team.members:
    print(f"- {member.name}, {member.age}, {member.address.city}")
```

### Runtime Response Format Override

```python
class QuickAnswer(BaseModel):
    answer: str
    confidence: float

class DetailedAnalysis(BaseModel):
    summary: str
    key_points: list[str]
    recommendations: list[str]
    sources: list[str]

# Agent created without default response format
agent = await provider.create_agent(
    name="FlexibleAgent",
    instructions="Provide information in the requested format.",
)

# Quick answer format
quick_result = await agent.run(
    "What is Python?",
    response_format=QuickAnswer,
)

# Detailed analysis format (same agent)
detailed_result = await agent.run(
    "Analyze the benefits of microservices architecture",
    response_format=DetailedAnalysis,
)
```

---

## OpenAPI Tools

Integrate external APIs using OpenAPI specifications.

### Basic OpenAPI Integration

```python
from agent_framework import OpenAPITool
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

# OpenAPI spec can be URL or inline dict
openapi_spec = {
    "openapi": "3.0.0",
    "info": {"title": "Weather API", "version": "1.0.0"},
    "paths": {
        "/weather/{city}": {
            "get": {
                "operationId": "getWeather",
                "summary": "Get weather for a city",
                "parameters": [
                    {
                        "name": "city",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Weather data",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "temperature": {"type": "number"},
                                        "conditions": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="WeatherAPIAgent",
        instructions="Use the weather API to answer weather questions.",
        tools=OpenAPITool(
            name="WeatherAPI",
            spec=openapi_spec,
            base_url="https://api.weather.example.com",
        ),
    )
```

### OpenAPI with Authentication

```python
from agent_framework import OpenAPITool

openapi_tool = OpenAPITool(
    name="SecureAPI",
    spec="https://api.example.com/openapi.json",
    base_url="https://api.example.com",
    headers={
        "Authorization": "Bearer your-api-key",
        "X-API-Version": "2024-01",
    },
)
```

---

## File Generation and Handling

### Code Interpreter File Output

```python
from agent_framework import HostedCodeInterpreterTool
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="DataAnalyst",
        instructions="Analyze data and create visualizations.",
        tools=HostedCodeInterpreterTool(),
    )

    result = await agent.run(
        "Create a bar chart of sales data: Q1=100, Q2=150, Q3=120, Q4=200. Save as PNG."
    )

    # Check for generated files in the response
    print(result.text)

    # Files generated by code interpreter are typically referenced in the response
    # and can be downloaded via the files API
```

### Working with File IDs

```python
from azure.ai.agents.aio import AgentsClient

async with (
    AzureCliCredential() as credential,
    AgentsClient(endpoint=endpoint, credential=credential) as agents_client,
    AzureAIAgentsProvider(agents_client=agents_client) as provider,
):
    # Upload a file
    from pathlib import Path

    file = await agents_client.files.upload(
        file_path=Path("data/sales.csv"),
        purpose="agents"
    )
    print(f"Uploaded file ID: {file.id}")

    # Use file with code interpreter
    from agent_framework import HostedCodeInterpreterTool, HostedFileContent

    agent = await provider.create_agent(
        name="CSVAnalyst",
        instructions="Analyze the provided CSV file.",
        tools=HostedCodeInterpreterTool(
            inputs=[HostedFileContent(file_id=file.id)]
        ),
    )

    result = await agent.run("Summarize the data in the uploaded file")
```

---

## Citations and Source Attribution

Prompted citation markup and regex extraction do not authenticate sources. Use structured service annotations/file IDs/URLs from tool results, resolve within the authorized project, verify that sources support claims and render links safely. Do not treat model-written `【...】` text as evidence.

### Enabling Citations

```python
agent = await provider.create_agent(
    name="ResearchAgent",
    instructions="""Answer questions using the knowledge base.

    IMPORTANT: Always cite your sources using this format:
    【message_idx:search_idx†source_name】

    Example: "Azure Functions supports Python【1:0†azure-docs】"
    """,
    tools=[
        HostedFileSearchTool(inputs=[...]),
    ],
)
```

### Parsing Citations

```python
import re

def parse_citations(text: str) -> list[dict]:
    """Extract citations from agent response."""
    pattern = r'【(\d+):(\d+)†([^】]+)】'
    citations = []

    for match in re.finditer(pattern, text):
        citations.append({
            "message_idx": int(match.group(1)),
            "search_idx": int(match.group(2)),
            "source": match.group(3),
        })

    return citations

result = await agent.run("What is Azure Functions?")
citations = parse_citations(result.text)
for cite in citations:
    print(f"Source: {cite['source']}")
```

---

## Provider Configuration Options

### Custom Model and Endpoint

```python
from agent_framework.azure import AzureAIAgentsProvider

provider = AzureAIAgentsProvider(
    credential=credential,
    project_endpoint="https://my-project.services.ai.azure.com/api/projects/my-project-id",
    model_deployment_name="gpt-4o",  # Override default model
)
```

### Using Existing AgentsClient

```python
from azure.ai.agents.aio import AgentsClient
from agent_framework.azure import AzureAIAgentsProvider

# Create and configure client separately
agents_client = AgentsClient(
    endpoint=endpoint,
    credential=credential,
)

# Pass to provider
provider = AzureAIAgentsProvider(agents_client=agents_client)
```

---

## Agent Lifecycle Management

### Retrieving Existing Agents

```python
async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    # Create agent and save ID
    agent = await provider.create_agent(
        name="PersistentAgent",
        instructions="Use the provided conversation context; do not claim unlimited memory.",
    )
    agent_id = agent.id  # Save this

    # Later: retrieve the same agent
    same_agent = await provider.get_agent(agent_id=agent_id)
```

### Wrapping SDK Agents

```python
from azure.ai.agents.aio import AgentsClient

async with (
    AzureCliCredential() as credential,
    AgentsClient(endpoint=endpoint, credential=credential) as agents_client,
    AzureAIAgentsProvider(agents_client=agents_client) as provider,
):
    # Get agent via SDK
    sdk_agent = await agents_client.get_agent("agent-id")

    # Wrap as ChatAgent (no HTTP call)
    agent = provider.as_agent(sdk_agent)

    # Now use with agent framework
    result = await agent.run("Hello!")
```

---

## Error Handling Patterns

### Graceful Degradation

A model-only fallback cannot replace fresh retrieval, authorized execution or verified citations. Return an explicit unavailable/partial result for tasks requiring those capabilities. Do not hide tool/auth failures or replay mutating operations under fallback; only use this illustrative pattern for low-risk knowledge requests.

```python
from agent_framework import HostedWebSearchTool, HostedCodeInterpreterTool

async def run_with_fallback(agent, query: str, thread=None):
    """Run query with fallback on tool failures."""
    try:
        result = await agent.run(query, thread=thread)
        return result.text
    except Exception as e:
        # Log the error
        print(f"Tool execution error: {e}")

        # Create fallback agent without tools
        fallback_agent = await provider.create_agent(
            name="FallbackAgent",
            instructions="Answer based on your knowledge only.",
        )
        result = await fallback_agent.run(query)
        return f"[Fallback response] {result.text}"
```

### Retry Logic

```python
import asyncio
from typing import Optional

async def run_with_retry(
    agent,
    query: str,
    thread=None,
    max_retries: int = 3,
    delay: float = 1.0,
) -> Optional[str]:
    """Run query with exponential backoff retry."""
    if max_retries < 1: raise ValueError("max_retries must be positive")
    # Only safe for read-only/idempotent runs. A timeout may follow completed
    # side effects or an appended thread turn; reconcile before retrying.
    for attempt in range(max_retries):
        try:
            result = await agent.run(query, thread=thread)
            return result.text
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait_time = delay * (2 ** attempt)
            print(f"Attempt {attempt + 1} failed, retrying in {wait_time}s: {e}")
            await asyncio.sleep(wait_time)
    return None
```

---

## Performance Optimization

### Connection Reuse

```python
# ✅ Good: Reuse provider and client
async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    # Create multiple agents with same provider
    agent1 = await provider.create_agent(name="Agent1", instructions="...")
    agent2 = await provider.create_agent(name="Agent2", instructions="...")

    # Process multiple requests
    for query in queries:
        await agent1.run(query)

# ❌ Bad: Creating new provider for each request
for query in queries:
    async with AzureAIAgentsProvider(credential=credential) as provider:
        agent = await provider.create_agent(...)
        await agent.run(query)
```

### Concurrent Requests

```python
import asyncio

async def process_queries(provider, queries: list[str]) -> list[str]:
    """Process multiple queries concurrently."""
    agent = await provider.create_agent(
        name="BatchAgent",
        instructions="Answer questions concisely.",
    )

    # Each query gets its own thread
    async def process_one(query: str) -> str:
        thread = agent.get_new_thread()
        result = await agent.run(query, thread=thread)
        return result.text

    # Bound concurrency and input size for real batches; gather starts all tasks.
    results = await asyncio.gather(*[process_one(q) for q in queries])
    return results
```

---

## Debugging and Logging

### Enable Verbose Logging

Enable only for a bounded local diagnostic session after reviewing SDK redaction; debug traces may include prompts, responses, URLs or tool arguments. Do not retain or share raw production logs.

```python
import logging

# Enable Azure SDK logging
logging.basicConfig(level=logging.DEBUG)
azure_logger = logging.getLogger("azure")
azure_logger.setLevel(logging.DEBUG)

# Enable agent framework logging
af_logger = logging.getLogger("agent_framework")
af_logger.setLevel(logging.DEBUG)
```

### Inspecting Tool Calls in Streaming

```python
from agent_framework import AgentResponseUpdate

async for chunk in agent.run_stream("Calculate something"):
    if isinstance(chunk, AgentResponseUpdate):
        if chunk.tool_calls:
            for tool_call in chunk.tool_calls:
                print(f"[DEBUG] Tool: {tool_call.name}")
                print("[DEBUG] Arguments omitted; may contain credentials or personal data")
    if chunk.text:
        print(chunk.text, end="", flush=True)
```
