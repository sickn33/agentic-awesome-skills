---
name: azure-ai-agents-persistent-dotnet
description: Azure AI Agents Persistent SDK for .NET. Low-level SDK for creating and managing AI agents with threads, messages, runs, and tools.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.AI.Agents.Persistent (.NET)

Low-level SDK for creating and managing persistent AI agents with threads, messages, runs, and tools.

## Installation

```bash
dotnet add package Azure.AI.Agents.Persistent --prerelease
dotnet add package Azure.Identity
```

**Current Versions**: Stable v1.1.0, Preview v1.2.0-beta.8

## Environment Variables

```bash
PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
MODEL_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_BING_CONNECTION_ID=<bing-connection-resource-id>
AZURE_AI_SEARCH_CONNECTION_ID=<search-connection-resource-id>
```

## Authentication

```csharp
using Azure.AI.Agents.Persistent;
using Azure.Identity;

var projectEndpoint = Environment.GetEnvironmentVariable("PROJECT_ENDPOINT");
PersistentAgentsClient client = new(projectEndpoint, new DefaultAzureCredential());
```

## Client Hierarchy

```
PersistentAgentsClient
├── Administration  → Agent CRUD operations
├── Threads         → Thread management
├── Messages        → Message operations
├── Runs            → Run execution and streaming
├── Files           → File upload/download
└── VectorStores    → Vector store management
```

## Core Workflow

### 1. Create Agent

```csharp
var modelDeploymentName = Environment.GetEnvironmentVariable("MODEL_DEPLOYMENT_NAME");

PersistentAgent agent = await client.Administration.CreateAgentAsync(
    model: modelDeploymentName,
    name: "Math Tutor",
    instructions: "You are a personal math tutor. Write and run code to answer math questions.",
    tools: [new CodeInterpreterToolDefinition()]
);
```

### 2. Create Thread and Message

```csharp
// Create thread
PersistentAgentThread thread = await client.Threads.CreateThreadAsync();

// Create message
await client.Messages.CreateMessageAsync(
    thread.Id,
    MessageRole.User,
    "I need to solve the equation `3x + 11 = 14`. Can you help me?"
);
```

### 3. Run Agent (Polling)

```csharp
// Create run
ThreadRun run = await client.Runs.CreateRunAsync(
    thread.Id,
    agent.Id,
    additionalInstructions: "Please address the user as Jane Doe."
);

// Poll for completion
do
{
    await Task.Delay(TimeSpan.FromMilliseconds(500));
    run = await client.Runs.GetRunAsync(thread.Id, run.Id);
}
while (run.Status == RunStatus.Queued || run.Status == RunStatus.InProgress);

// Retrieve messages
await foreach (PersistentThreadMessage message in client.Messages.GetMessagesAsync(
    threadId: thread.Id, 
    order: ListSortOrder.Ascending))
{
    Console.Write($"{message.Role}: ");
    foreach (MessageContent content in message.ContentItems)
    {
        if (content is MessageTextContent textContent)
            Console.WriteLine(textContent.Text);
    }
}
```

### 4. Streaming Response

```csharp
AsyncCollectionResult<StreamingUpdate> stream = client.Runs.CreateRunStreamingAsync(
    thread.Id, 
    agent.Id
);

await foreach (StreamingUpdate update in stream)
{
    if (update.UpdateKind == StreamingUpdateReason.RunCreated)
    {
        Console.WriteLine("--- Run started! ---");
    }
    else if (update is MessageContentUpdate contentUpdate)
    {
        Console.Write(contentUpdate.Text);
    }
    else if (update.UpdateKind == StreamingUpdateReason.RunCompleted)
    {
        Console.WriteLine("\n--- Run completed! ---");
    }
}
```

### 5. Function Calling

```csharp
// Define function tool
FunctionToolDefinition weatherTool = new(
    name: "getCurrentWeather",
    description: "Gets the current weather at a location.",
    parameters: BinaryData.FromObjectAsJson(new
    {
        Type = "object",
        Properties = new
        {
            Location = new { Type = "string", Description = "City and state, e.g. San Francisco, CA" },
            Unit = new { Type = "string", Enum = new[] { "c", "f" } }
        },
        Required = new[] { "location" }
    }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
);

// Create agent with function
PersistentAgent agent = await client.Administration.CreateAgentAsync(
    model: modelDeploymentName,
    name: "Weather Bot",
    instructions: "You are a weather bot.",
    tools: [weatherTool]
);

// Handle function calls during polling
do
{
    await Task.Delay(500);
    run = await client.Runs.GetRunAsync(thread.Id, run.Id);

    if (run.Status == RunStatus.RequiresAction 
        && run.RequiredAction is SubmitToolOutputsAction submitAction)
    {
        List<ToolOutput> outputs = [];
        foreach (RequiredToolCall toolCall in submitAction.ToolCalls)
        {
            if (toolCall is RequiredFunctionToolCall funcCall)
            {
                // Execute function and get result
                string result = ExecuteFunction(funcCall.Name, funcCall.Arguments);
                outputs.Add(new ToolOutput(toolCall, result));
            }
        }
        run = await client.Runs.SubmitToolOutputsToRunAsync(run, outputs, toolApprovals: null);
    }
}
while (run.Status == RunStatus.Queued || run.Status == RunStatus.InProgress);
```

### 6. File Search with Vector Store

```csharp
// Upload file
PersistentAgentFileInfo file = await client.Files.UploadFileAsync(
    filePath: "document.txt",
    purpose: PersistentAgentFilePurpose.Agents
);

// Create vector store
PersistentAgentsVectorStore vectorStore = await client.VectorStores.CreateVectorStoreAsync(
    fileIds: [file.Id],
    name: "my_vector_store"
);

// Create file search resource
FileSearchToolResource fileSearchResource = new();
fileSearchResource.VectorStoreIds.Add(vectorStore.Id);

// Create agent with file search
PersistentAgent agent = await client.Administration.CreateAgentAsync(
    model: modelDeploymentName,
    name: "Document Assistant",
    instructions: "You help users find information in documents.",
    tools: [new FileSearchToolDefinition()],
    toolResources: new ToolResources { FileSearch = fileSearchResource }
);
```

### 7. Bing Grounding

```csharp
var bingConnectionId = Environment.GetEnvironmentVariable("AZURE_BING_CONNECTION_ID");

BingGroundingToolDefinition bingTool = new(
    new BingGroundingSearchToolParameters(
        [new BingGroundingSearchConfiguration(bingConnectionId)]
    )
);

PersistentAgent agent = await client.Administration.CreateAgentAsync(
    model: modelDeploymentName,
    name: "Search Agent",
    instructions: "Use Bing to answer questions about current events.",
    tools: [bingTool]
);
```

### 8. Azure AI Search

```csharp
AzureAISearchToolResource searchResource = new(
    connectionId: searchConnectionId,
    indexName: "my_index",
    topK: 5,
    filter: "category eq 'documentation'",
    queryType: AzureAISearchQueryType.Simple
);

PersistentAgent agent = await client.Administration.CreateAgentAsync(
    model: modelDeploymentName,
    name: "Search Agent",
    instructions: "Search the documentation index to answer questions.",
    tools: [new AzureAISearchToolDefinition()],
    toolResources: new ToolResources { AzureAISearch = searchResource }
);
```

### 9. Cleanup

```csharp
await client.Threads.DeleteThreadAsync(thread.Id);
await client.Administration.DeleteAgentAsync(agent.Id);
await client.VectorStores.DeleteVectorStoreAsync(vectorStore.Id);
await client.Files.DeleteFileAsync(file.Id);
```

## Available Tools

| Tool | Class | Purpose |
|------|-------|---------|
| Code Interpreter | `CodeInterpreterToolDefinition` | Execute Python code, generate visualizations |
| File Search | `FileSearchToolDefinition` | Search uploaded files via vector stores |
| Function Calling | `FunctionToolDefinition` | Call custom functions |
| Bing Grounding | `BingGroundingToolDefinition` | Web search via Bing |
| Azure AI Search | `AzureAISearchToolDefinition` | Search Azure AI Search indexes |
| OpenAPI | `OpenApiToolDefinition` | Call external APIs via OpenAPI spec |
| Azure Functions | `AzureFunctionToolDefinition` | Invoke Azure Functions |
| MCP | `MCPToolDefinition` | Model Context Protocol tools |
| SharePoint | `SharepointToolDefinition` | Access SharePoint content |
| Microsoft Fabric | `MicrosoftFabricToolDefinition` | Access Fabric data |

## Streaming Update Types

| Update Type | Description |
|-------------|-------------|
| `StreamingUpdateReason.RunCreated` | Run started |
| `StreamingUpdateReason.RunInProgress` | Run processing |
| `StreamingUpdateReason.RunCompleted` | Run finished |
| `StreamingUpdateReason.RunFailed` | Run errored |
| `MessageContentUpdate` | Text content chunk |
| `RunStepUpdate` | Step status change |

## Key Types Reference

| Type | Purpose |
|------|---------|
| `PersistentAgentsClient` | Main entry point |
| `PersistentAgent` | Agent with model, instructions, tools |
| `PersistentAgentThread` | Conversation thread |
| `PersistentThreadMessage` | Message in thread |
| `ThreadRun` | Execution of agent against thread |
| `RunStatus` | Queued, InProgress, RequiresAction, Completed, Failed |
| `ToolResources` | Combined tool resources |
| `ToolOutput` | Function call response |

## Best Practices

1. **Always dispose clients** — Use `using` statements or explicit disposal
2. **Poll with appropriate delays** — 500ms recommended between status checks
3. **Clean up resources** — Delete threads and agents when done
4. **Handle all run statuses** — Check for `RequiresAction`, `Failed`, `Cancelled`
5. **Use streaming for real-time UX** — Better user experience than polling
6. **Store IDs not objects** — Reference agents/threads by ID
7. **Use async methods** — All operations should be async

## Error Handling

```csharp
using Azure;

try
{
    var agent = await client.Administration.CreateAgentAsync(...);
}
catch (RequestFailedException ex) when (ex.Status == 404)
{
    Console.WriteLine("Resource not found");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Error: {ex.Status} - {ex.ErrorCode}: {ex.Message}");
}
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.AI.Agents.Persistent` | Low-level agents (this SDK) | `dotnet add package Azure.AI.Agents.Persistent` |
| `Azure.AI.Projects` | High-level project client | `dotnet add package Azure.AI.Projects` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.AI.Agents.Persistent |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.ai.agents.persistent |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/ai/Azure.AI.Agents.Persistent |
| Samples | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/ai/Azure.AI.Agents.Persistent/samples |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
