---
name: azure-ai-agents-persistent-java
description: Azure AI Agents Persistent SDK for Java. Low-level SDK for creating and managing AI agents with threads, messages, runs, and tools.
risk: critical
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
    <version>1.0.0-beta.2</version>
</dependency>
```

## Environment Variables

```bash
export PROJECT_ENDPOINT="https://<resource>.services.ai.azure.com/api/projects/<project>"
export MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
```

## Authentication

```java
import com.azure.ai.agents.persistent.PersistentAgentsClient;
import com.azure.ai.agents.persistent.PersistentAgentsClientBuilder;
import com.azure.ai.agents.persistent.*;
import com.azure.ai.agents.persistent.models.*;
import com.azure.core.http.rest.PagedIterable;
import com.azure.identity.DefaultAzureCredentialBuilder;

String endpoint = System.getenv("PROJECT_ENDPOINT");
PersistentAgentsClient client = new PersistentAgentsClientBuilder()
    .endpoint(endpoint)
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
String modelDeploymentName = System.getenv("MODEL_DEPLOYMENT_NAME");
PersistentAgentsAdministrationClient administration = client.getPersistentAgentsAdministrationClient();
ThreadsClient threads = client.getThreadsClient();
MessagesClient messageClient = client.getMessagesClient();
RunsClient runs = client.getRunsClient();
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
PersistentAgent agent = administration.createAgent(
    new CreateAgentOptions(modelDeploymentName)
        .setName("Math Tutor")
        .setInstructions("You are a personal math tutor.")
);
```

### 2. Create Thread

```java
PersistentAgentThread thread = threads.createThread();
```

### 3. Add Message

```java
messageClient.createMessage(
    thread.getId(),
    MessageRole.USER,
    "I need help with equations."
);
```

### 4. Run Agent

```java
ThreadRun run = runs.createRun(new CreateRunOptions(thread.getId(), agent.getId()));

// Bound polling; a terminal non-success state is not a completed answer.
long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(60);
while (run.getStatus() == RunStatus.QUEUED || run.getStatus() == RunStatus.IN_PROGRESS) {
    if (System.nanoTime() > deadline) {
        throw new IllegalStateException("Run polling timed out; inspect/cancel the owned run separately");
    }
    Thread.sleep(500);
    run = runs.getRun(thread.getId(), run.getId());
}
```

Check the resulting status before reading a final response: `requires_action` needs an authorized tool-output handler; `failed`, `cancelled`, `expired` or other non-success states must be reported explicitly. A polling timeout does not cancel the cloud run.

### 5. Get Response

```java
PagedIterable<ThreadMessage> messages = messageClient.listMessages(thread.getId());
for (ThreadMessage message : messages) {
    System.out.println("Message role: " + message.getRole()); // Do not log retained prompt/response payloads.
}
```

### 6. Cleanup

```java
threads.deleteThread(thread.getId());
administration.deleteAgent(agent.getId());
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
    PersistentAgent exampleAgent = administration.createAgent(
        new CreateAgentOptions(modelDeploymentName).setName("Example").setInstructions("Answer briefly"));
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
Use when implementing or maintaining Java persistent-agent threads, messages, runs and administration with the preview SDK. The reviewed example uses beta.2 subclients, not direct CRUD methods on PersistentAgentsClient.

## Limitations
- Operations create billable cloud resources, send prompts and retain thread data. Use an authorized project/model and explicit budgets; delete only resources created for the current run, preserve IDs on failure, and redact message/credential logs.
- Snippets are sequential fragments inside application code, not a standalone compiled program. API shape was checked against [Microsoft’s beta.2 sample](https://github.com/Azure/azure-sdk-for-java/blob/azure-ai-agents-persistent_1.0.0-beta.2/sdk/ai/azure-ai-agents-persistent/src/samples/java/com/azure/ai/agents/persistent/AgentBasicSample.java) and preview reference; no cloud run was performed. Add compatible azure-identity and required dependencies using the project’s reviewed Azure BOM.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
