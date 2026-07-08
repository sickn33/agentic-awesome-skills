---
name: azure-ai-agents-persistent-java
description: Azure AI Agents Persistent SDK for Java. Low-level SDK for creating and managing AI agents with threads, messages, runs, and tools.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure AI Agents Persistent SDK for Java

Low-level SDK for creating and managing persistent AI agents with threads, messages, runs, and tools.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-ai-agents-persistent</artifactId>
    <version>1.0.0-beta.1</version>
</dependency>
```

## Environment Variables

```bash
PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
MODEL_DEPLOYMENT_NAME=gpt-4o-mini
```

## Authentication

```java
import com.azure.ai.agents.persistent.PersistentAgentsClient;
import com.azure.ai.agents.persistent.PersistentAgentsClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;

String endpoint = System.getenv("PROJECT_ENDPOINT");
PersistentAgentsClient client = new PersistentAgentsClientBuilder()
    .endpoint(endpoint)
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

## Key Concepts

The Azure AI Agents Persistent SDK provides a low-level API for managing persistent agents that can be reused across sessions.

### Client Hierarchy

| Client | Purpose |
|--------|---------|
| `PersistentAgentsClient` | Sync client for agent operations |
| `PersistentAgentsAsyncClient` | Async client for agent operations |

## Core Workflow

### 1. Create Agent

```java
// Create agent with tools
PersistentAgent agent = client.createAgent(
    modelDeploymentName,
    "Math Tutor",
    "You are a personal math tutor."
);
```

### 2. Create Thread

```java
PersistentAgentThread thread = client.createThread();
```

### 3. Add Message

```java
client.createMessage(
    thread.getId(),
    MessageRole.USER,
    "I need help with equations."
);
```

### 4. Run Agent

```java
ThreadRun run = client.createRun(thread.getId(), agent.getId());

// Poll for completion
while (run.getStatus() == RunStatus.QUEUED || run.getStatus() == RunStatus.IN_PROGRESS) {
    Thread.sleep(500);
    run = client.getRun(thread.getId(), run.getId());
}
```

### 5. Get Response

```java
PagedIterable<PersistentThreadMessage> messages = client.listMessages(thread.getId());
for (PersistentThreadMessage message : messages) {
    System.out.println(message.getRole() + ": " + message.getContent());
}
```

### 6. Cleanup

```java
client.deleteThread(thread.getId());
client.deleteAgent(agent.getId());
```

## Best Practices

1. **Use DefaultAzureCredential** for production authentication
2. **Poll with appropriate delays** — 500ms recommended between status checks
3. **Clean up resources** — Delete threads and agents when done
4. **Handle all run statuses** — Check for RequiresAction, Failed, Cancelled
5. **Use async client** for better throughput in high-concurrency scenarios

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;

try {
    PersistentAgent agent = client.createAgent(modelName, name, instructions);
} catch (HttpResponseException e) {
    System.err.println("Error: " + e.getResponse().getStatusCode() + " - " + e.getMessage());
}
```

## Reference Links

| Resource | URL |
|----------|-----|
| Maven Package | https://central.sonatype.com/artifact/com.azure/azure-ai-agents-persistent |
| GitHub Source | https://github.com/Azure/azure-sdk-for-java/tree/main/sdk/ai/azure-ai-agents-persistent |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
