---
name: hosted-agents-v2-py
description: "Build hosted agents using Azure AI Projects SDK with ImageBasedHostedAgentDefinition. Use when creating container-based agents in Azure AI Foundry."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure AI Hosted Agents (Python)

Build container-based hosted agents using `ImageBasedHostedAgentDefinition` from the Azure AI Projects SDK.

## Installation

```bash
pip install azure-ai-projects>=2.0.0b3 azure-identity
```

**Minimum SDK Version:** `2.0.0b3` or later required for hosted agent support.

## Environment Variables

```bash
AZURE_AI_PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
```

## Prerequisites

Before creating hosted agents:

1. **Container Image** - Build and push to Azure Container Registry (ACR)
2. **ACR Pull Permissions** - Grant your project's managed identity `AcrPull` role on the ACR
3. **Capability Host** - Account-level capability host with `enablePublicHostingEnvironment=true`
4. **SDK Version** - Ensure `azure-ai-projects>=2.0.0b3`

## Authentication

Always use `DefaultAzureCredential`:

```python
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

credential = DefaultAzureCredential()
client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    credential=credential
)
```

## Core Workflow

### 1. Imports

```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import (
    ImageBasedHostedAgentDefinition,
    ProtocolVersionRecord,
    AgentProtocol,
)
```

### 2. Create Hosted Agent

```python
client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential()
)

agent = client.agents.create_version(
    agent_name="my-hosted-agent",
    definition=ImageBasedHostedAgentDefinition(
        container_protocol_versions=[
            ProtocolVersionRecord(protocol=AgentProtocol.RESPONSES, version="v1")
        ],
        cpu="1",
        memory="2Gi",
        image="myregistry.azurecr.io/my-agent:latest",
        tools=[{"type": "code_interpreter"}],
        environment_variables={
            "AZURE_AI_PROJECT_ENDPOINT": os.environ["AZURE_AI_PROJECT_ENDPOINT"],
            "MODEL_NAME": "gpt-4o-mini"
        }
    )
)

print(f"Created agent: {agent.name} (version: {agent.version})")
```

### 3. List Agent Versions

```python
versions = client.agents.list_versions(agent_name="my-hosted-agent")
for version in versions:
    print(f"Version: {version.version}, State: {version.state}")
```

### 4. Delete Agent Version

```python
client.agents.delete_version(
    agent_name="my-hosted-agent",
    version=agent.version
)
```

## ImageBasedHostedAgentDefinition Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `container_protocol_versions` | `list[ProtocolVersionRecord]` | Yes | Protocol versions the agent supports |
| `image` | `str` | Yes | Full container image path (registry/image:tag) |
| `cpu` | `str` | No | CPU allocation (e.g., "1", "2") |
| `memory` | `str` | No | Memory allocation (e.g., "2Gi", "4Gi") |
| `tools` | `list[dict]` | No | Tools available to the agent |
| `environment_variables` | `dict[str, str]` | No | Environment variables for the container |

## Protocol Versions

The `container_protocol_versions` parameter specifies which protocols your agent supports:

```python
from azure.ai.projects.models import ProtocolVersionRecord, AgentProtocol

# RESPONSES protocol - standard agent responses
container_protocol_versions=[
    ProtocolVersionRecord(protocol=AgentProtocol.RESPONSES, version="v1")
]
```

**Available Protocols:**
| Protocol | Description |
|----------|-------------|
| `AgentProtocol.RESPONSES` | Standard response protocol for agent interactions |

## Resource Allocation

Specify CPU and memory for your container:

```python
definition=ImageBasedHostedAgentDefinition(
    container_protocol_versions=[...],
    image="myregistry.azurecr.io/my-agent:latest",
    cpu="2",      # 2 CPU cores
    memory="4Gi"  # 4 GiB memory
)
```

**Resource Limits:**
| Resource | Min | Max | Default |
|----------|-----|-----|---------|
| CPU | 0.5 | 4 | 1 |
| Memory | 1Gi | 8Gi | 2Gi |

## Tools Configuration

Add tools to your hosted agent:

### Code Interpreter

```python
tools=[{"type": "code_interpreter"}]
```

### MCP Tools

```python
tools=[
    {"type": "code_interpreter"},
    {
        "type": "mcp",
        "server_label": "my-mcp-server",
        "server_url": "https://my-mcp-server.example.com"
    }
]
```

### Multiple Tools

```python
tools=[
    {"type": "code_interpreter"},
    {"type": "file_search"},
    {
        "type": "mcp",
        "server_label": "custom-tool",
        "server_url": "https://custom-tool.example.com"
    }
]
```

### Environment Variables

Pass configuration to your container:

```python
environment_variables={
    "AZURE_AI_PROJECT_ENDPOINT": os.environ["AZURE_AI_PROJECT_ENDPOINT"],
    "MODEL_NAME": "gpt-4o-mini",
    "LOG_LEVEL": "INFO",
    "CUSTOM_CONFIG": "value"
}
```

**Best Practice:** Never hardcode secrets. Use environment variables or Azure Key Vault.

## Complete Example

```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import (
    ImageBasedHostedAgentDefinition,
    ProtocolVersionRecord,
    AgentProtocol,
)

def create_hosted_agent():
    """Create a hosted agent with custom container image."""
    
    client = AIProjectClient(
        endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
        credential=DefaultAzureCredential()
    )
    
    agent = client.agents.create_version(
        agent_name="data-processor-agent",
        definition=ImageBasedHostedAgentDefinition(
            container_protocol_versions=[
                ProtocolVersionRecord(
                    protocol=AgentProtocol.RESPONSES,
                    version="v1"
                )
            ],
            image="myregistry.azurecr.io/data-processor:v1.0",
            cpu="2",
            memory="4Gi",
            tools=[
                {"type": "code_interpreter"},
                {"type": "file_search"}
            ],
            environment_variables={
                "AZURE_AI_PROJECT_ENDPOINT": os.environ["AZURE_AI_PROJECT_ENDPOINT"],
                "MODEL_NAME": "gpt-4o-mini",
                "MAX_RETRIES": "3"
            }
        )
    )
    
    print(f"Created hosted agent: {agent.name}")
    print(f"Version: {agent.version}")
    print(f"State: {agent.state}")
    
    return agent

if __name__ == "__main__":
    create_hosted_agent()
```

## Async Pattern

```python
import os
from azure.identity.aio import DefaultAzureCredential
from azure.ai.projects.aio import AIProjectClient
from azure.ai.projects.models import (
    ImageBasedHostedAgentDefinition,
    ProtocolVersionRecord,
    AgentProtocol,
)

async def create_hosted_agent_async():
    """Create a hosted agent asynchronously."""
    
    async with DefaultAzureCredential() as credential:
        async with AIProjectClient(
            endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
            credential=credential
        ) as client:
            agent = await client.agents.create_version(
                agent_name="async-agent",
                definition=ImageBasedHostedAgentDefinition(
                    container_protocol_versions=[
                        ProtocolVersionRecord(
                            protocol=AgentProtocol.RESPONSES,
                            version="v1"
                        )
                    ],
                    image="myregistry.azurecr.io/async-agent:latest",
                    cpu="1",
                    memory="2Gi"
                )
            )
            return agent
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ImagePullBackOff` | ACR pull permission denied | Grant `AcrPull` role to project's managed identity |
| `InvalidContainerImage` | Image not found | Verify image path and tag exist in ACR |
| `CapabilityHostNotFound` | No capability host configured | Create account-level capability host |
| `ProtocolVersionNotSupported` | Invalid protocol version | Use `AgentProtocol.RESPONSES` with version `"v1"` |

## Best Practices

1. **Version Your Images** - Use specific tags, not `latest` in production
2. **Minimal Resources** - Start with minimum CPU/memory, scale up as needed
3. **Environment Variables** - Use for all configuration, never hardcode
4. **Error Handling** - Wrap agent creation in try/except blocks
5. **Cleanup** - Delete unused agent versions to free resources

## Reference Links

- [Azure AI Projects SDK](https://pypi.org/project/azure-ai-projects/)
- [Hosted Agents Documentation](https://learn.microsoft.com/azure/ai-services/agents/how-to/hosted-agents)
- [Azure Container Registry](https://learn.microsoft.com/azure/container-registry/)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
