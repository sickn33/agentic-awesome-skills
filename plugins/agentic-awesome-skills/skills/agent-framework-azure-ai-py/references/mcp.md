# MCP Integration Reference

**Compatibility note:** This is preserved legacy-generation reference material, not a verified current SDK recipe. Apply the SDK-generation, authorization, privacy, cost and cleanup gate in the root skill before adapting any snippet.

Model Context Protocol (MCP) integration patterns for Azure AI agents.

## Overview

The Agent Framework supports two MCP tool types:

| Tool | Management | Use Case |
|------|------------|----------|
| `HostedMCPTool` | Service-managed | MCP servers the Azure AI service connects to |
| `MCPStreamableHTTPTool` | Client-managed | MCP servers your code connects to |

---

## HostedMCPTool (Service-Managed)

The Azure AI service manages the MCP connection lifecycle.

### Basic Usage

```python
from agent_framework import HostedMCPTool
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="DocsAgent",
        instructions="Answer questions using Microsoft documentation.",
        tools=HostedMCPTool(
            name="Microsoft Learn MCP",
            url="https://learn.microsoft.com/api/mcp",
            approval_mode="always_require",  # Handle approval before executing a tool
        ),
    )

    result = await agent.run("How do I use Azure Functions?")
    print(result.text)
```

### With Allowed Tools Filter

Restrict which MCP tools the agent can use:

```python
mcp_tool = HostedMCPTool(
    name="Microsoft Learn MCP",
    url="https://learn.microsoft.com/api/mcp",
    approval_mode="never_require",
    allowed_tools=["microsoft_docs_search", "microsoft_docs_read"],  # Only these tools
)
```

Only use automatic approval for reviewed read-only tools within the approved scope. Approval modes/field names are SDK-generation-specific; fail closed when no approval handler exists. Keep tokens scoped to the exact reviewed HTTPS origin; do not forward them across redirects.

### With Authentication Headers

```python
mcp_tool = HostedMCPTool(
    name="Private MCP Server",
    url="https://my-mcp-server.example.com/mcp",
    approval_mode="never_require",
    headers={
        "Authorization": "Bearer your-api-key",
        "X-Custom-Header": "custom-value",
    },
)
```

### Approval Modes

Control when tool execution requires user approval:

```python
# Never require approval (automatic execution)
mcp_tool = HostedMCPTool(
    name="Safe MCP",
    url="https://safe-mcp.example.com/mcp",
    approval_mode="never_require",
)

# Always require approval
mcp_tool = HostedMCPTool(
    name="Sensitive MCP",
    url="https://sensitive-mcp.example.com/mcp",
    approval_mode="always_require",
)

# Per-tool approval configuration
mcp_tool = HostedMCPTool(
    name="Mixed MCP",
    url="https://mcp.example.com/mcp",
    approval_mode={
        "always_require_approval": ["delete_resource", "modify_config"],
        "never_require_approval": ["search", "read"],
    },
)
```

---

## MCPStreamableHTTPTool (Client-Managed)

You manage the MCP connection lifecycle in your code.

### Basic Usage

```python
from agent_framework import MCPStreamableHTTPTool
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

async with (
    AzureCliCredential() as credential,
    MCPStreamableHTTPTool(
        name="Microsoft Learn MCP",
        url="https://learn.microsoft.com/api/mcp",
    ) as mcp_tool,  # MUST use context manager
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="DocsAgent",
        instructions="Answer questions using the documentation.",
        tools=mcp_tool,
    )

    result = await agent.run("What is Azure AI Foundry?")
    print(result.text)
```

### With Custom HTTP Client

For authentication or custom headers:

```python
from httpx import AsyncClient
from agent_framework import MCPStreamableHTTPTool

# Close the custom client with `async with AsyncClient(...) as http_client:`
# around the tool lifecycle unless the pinned tool explicitly owns it.
# Create HTTP client with authentication
http_client = AsyncClient(
    headers={
        "Authorization": f"Bearer {github_pat}",
        "User-Agent": "MyApp/1.0",
    },
    timeout=30.0,
)

async with (
    MCPStreamableHTTPTool(
        name="GitHub MCP",
        url="https://api.githubcopilot.com/mcp/readonly",
        http_client=http_client,
    ) as github_mcp,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="GitHubAgent",
        instructions="Help with GitHub operations.",
        tools=github_mcp,
    )
```

### Multiple MCP Tools

```python
async with (
    AzureCliCredential() as credential,
    MCPStreamableHTTPTool(
        name="Docs MCP",
        url="https://learn.microsoft.com/api/mcp",
    ) as docs_mcp,
    MCPStreamableHTTPTool(
        name="GitHub MCP",
        url="https://api.githubcopilot.com/mcp/readonly",
        http_client=authenticated_client,
    ) as github_mcp,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="MultiMCPAgent",
        instructions="You can search docs and interact with GitHub.",
        tools=[docs_mcp, github_mcp],
    )
```

---

## HostedMCPTool vs MCPStreamableHTTPTool

| Aspect | HostedMCPTool | MCPStreamableHTTPTool |
|--------|---------------|----------------------|
| Connection managed by | Azure AI Service | Your code |
| Context manager required | No | Yes |
| Best for | Public MCP servers | Authenticated/private servers |
| Connection lifecycle | Automatic | Manual (via context manager) |
| Headers | Via `headers` param | Via custom `http_client` |

### When to Use Which

**Use HostedMCPTool when:**
- MCP server is publicly accessible
- Azure AI service can reach the MCP endpoint
- You want simpler code (no context manager)
- Approval workflows are needed

**Use MCPStreamableHTTPTool when:**
- MCP server requires authentication
- MCP server is private/internal
- You need custom HTTP client configuration
- You want explicit connection control

---

## Combining MCP with Other Tools

```python
from typing import Annotated
from pydantic import Field
from agent_framework import (
    HostedCodeInterpreterTool,
    MCPStreamableHTTPTool,
)

def get_user_id() -> str:
    """Get the current user's ID."""
    raise NotImplementedError("Read verified caller identity from the application session; never fabricate it")

async with (
    AzureCliCredential() as credential,
    MCPStreamableHTTPTool(
        name="Company API MCP",
        url="https://internal-api.company.com/mcp",
    ) as company_mcp,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="EnterpriseAgent",
        instructions="""You are an enterprise assistant that can:
        - Execute Python code for analysis
        - Access company internal APIs via MCP
        - Get user information

        Always verify user identity before accessing sensitive data.""",
        tools=[
            get_user_id,
            HostedCodeInterpreterTool(),
            company_mcp,
        ],
    )
```

---

## Error Handling for MCP

```python
try:
    async with MCPStreamableHTTPTool(
        name="MCP Server",
        url="https://mcp.example.com",
    ) as mcp_tool:
        # MCP connection established
        agent = await provider.create_agent(
            name="Agent",
            instructions="...",
            tools=mcp_tool,
        )
        result = await agent.run("Query using MCP")

except ConnectionError as e:
    print(f"Failed to connect to MCP server: {e}")
except TimeoutError as e:
    print(f"MCP connection timed out: {e}")
```

---

## Knowledge Base MCP Integration

For Azure AI Search knowledge bases exposed via MCP:

```python
# Knowledge base MCP endpoint format
kb_mcp_endpoint = f"{search_endpoint}/knowledgebases/{kb_name}/mcp?api-version=2025-11-01-preview"

mcp_tool = HostedMCPTool(
    name="Knowledge Base",
    url=kb_mcp_endpoint,
    approval_mode="never_require",
    allowed_tools=["knowledge_base_retrieve"],
)

agent = await provider.create_agent(
    name="KBAgent",
    instructions="""Answer questions using the knowledge base.
    Always cite sources using the format: 【source†title】""",
    tools=mcp_tool,
)
```
