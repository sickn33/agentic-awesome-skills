---
name: azure-ai-projects-dotnet
description: Azure AI Projects SDK for .NET. High-level client for Azure AI Foundry projects including agents, connections, datasets, deployments, evaluations, and indexes.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.AI.Projects (.NET)

High-level SDK for Azure AI Foundry project operations including agents, connections, datasets, deployments, evaluations, and indexes.

## Installation

```bash
dotnet add package Azure.AI.Projects
dotnet add package Azure.Identity

# Optional: For versioned agents with OpenAI extensions
dotnet add package Azure.AI.Projects.OpenAI --prerelease

# Optional: For low-level agent operations
dotnet add package Azure.AI.Agents.Persistent --prerelease
```

**Current Versions**: GA v1.1.0, Preview v1.2.0-beta.5

## Environment Variables

```bash
PROJECT_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>
MODEL_DEPLOYMENT_NAME=gpt-4o-mini
CONNECTION_NAME=<your-connection-name>
AI_SEARCH_CONNECTION_NAME=<ai-search-connection>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.AI.Projects;

var endpoint = Environment.GetEnvironmentVariable("PROJECT_ENDPOINT");
AIProjectClient projectClient = new AIProjectClient(
    new Uri(endpoint), 
    new DefaultAzureCredential());
```

## Client Hierarchy

```
AIProjectClient
├── Agents          → AIProjectAgentsOperations (versioned agents)
├── Connections     → ConnectionsClient
├── Datasets        → DatasetsClient
├── Deployments     → DeploymentsClient
├── Evaluations     → EvaluationsClient
├── Evaluators      → EvaluatorsClient
├── Indexes         → IndexesClient
├── Telemetry       → AIProjectTelemetry
├── OpenAI          → ProjectOpenAIClient (preview)
└── GetPersistentAgentsClient() → PersistentAgentsClient
```

## Core Workflows

### 1. Get Persistent Agents Client

```csharp
// Get low-level agents client from project client
PersistentAgentsClient agentsClient = projectClient.GetPersistentAgentsClient();

// Create agent
PersistentAgent agent = await agentsClient.Administration.CreateAgentAsync(
    model: "gpt-4o-mini",
    name: "Math Tutor",
    instructions: "You are a personal math tutor.");

// Create thread and run
PersistentAgentThread thread = await agentsClient.Threads.CreateThreadAsync();
await agentsClient.Messages.CreateMessageAsync(thread.Id, MessageRole.User, "Solve 3x + 11 = 14");
ThreadRun run = await agentsClient.Runs.CreateRunAsync(thread.Id, agent.Id);

// Poll for completion
do
{
    await Task.Delay(500);
    run = await agentsClient.Runs.GetRunAsync(thread.Id, run.Id);
}
while (run.Status == RunStatus.Queued || run.Status == RunStatus.InProgress);

// Get messages
await foreach (var msg in agentsClient.Messages.GetMessagesAsync(thread.Id))
{
    foreach (var content in msg.ContentItems)
    {
        if (content is MessageTextContent textContent)
            Console.WriteLine(textContent.Text);
    }
}

// Cleanup
await agentsClient.Threads.DeleteThreadAsync(thread.Id);
await agentsClient.Administration.DeleteAgentAsync(agent.Id);
```

### 2. Versioned Agents with Tools (Preview)

```csharp
using Azure.AI.Projects.OpenAI;

// Create agent with web search tool
PromptAgentDefinition agentDefinition = new(model: "gpt-4o-mini")
{
    Instructions = "You are a helpful assistant that can search the web",
    Tools = {
        ResponseTool.CreateWebSearchTool(
            userLocation: WebSearchToolLocation.CreateApproximateLocation(
                country: "US",
                city: "Seattle",
                region: "Washington"
            )
        ),
    }
};

AgentVersion agentVersion = await projectClient.Agents.CreateAgentVersionAsync(
    agentName: "myAgent",
    options: new(agentDefinition));

// Get response client
ProjectResponsesClient responseClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(agentVersion.Name);

// Create response
ResponseResult response = responseClient.CreateResponse("What's the weather in Seattle?");
Console.WriteLine(response.GetOutputText());

// Cleanup
projectClient.Agents.DeleteAgentVersion(agentName: agentVersion.Name, agentVersion: agentVersion.Version);
```

### 3. Connections

```csharp
// List all connections
foreach (AIProjectConnection connection in projectClient.Connections.GetConnections())
{
    Console.WriteLine($"{connection.Name}: {connection.ConnectionType}");
}

// Get specific connection
AIProjectConnection conn = projectClient.Connections.GetConnection(
    connectionName, 
    includeCredentials: true);

// Get default connection
AIProjectConnection defaultConn = projectClient.Connections.GetDefaultConnection(
    includeCredentials: false);
```

### 4. Deployments

```csharp
// List all deployments
foreach (AIProjectDeployment deployment in projectClient.Deployments.GetDeployments())
{
    Console.WriteLine($"{deployment.Name}: {deployment.ModelName}");
}

// Filter by publisher
foreach (var deployment in projectClient.Deployments.GetDeployments(modelPublisher: "Microsoft"))
{
    Console.WriteLine(deployment.Name);
}

// Get specific deployment
ModelDeployment details = (ModelDeployment)projectClient.Deployments.GetDeployment("gpt-4o-mini");
```

### 5. Datasets

```csharp
// Upload single file
FileDataset fileDataset = projectClient.Datasets.UploadFile(
    name: "my-dataset",
    version: "1.0",
    filePath: "data/training.txt",
    connectionName: connectionName);

// Upload folder
FolderDataset folderDataset = projectClient.Datasets.UploadFolder(
    name: "my-dataset",
    version: "2.0",
    folderPath: "data/training",
    connectionName: connectionName,
    filePattern: new Regex(".*\\.txt"));

// Get dataset
AIProjectDataset dataset = projectClient.Datasets.GetDataset("my-dataset", "1.0");

// Delete dataset
projectClient.Datasets.Delete("my-dataset", "1.0");
```

### 6. Indexes

```csharp
// Create Azure AI Search index
AzureAISearchIndex searchIndex = new(aiSearchConnectionName, aiSearchIndexName)
{
    Description = "Sample Index"
};

searchIndex = (AzureAISearchIndex)projectClient.Indexes.CreateOrUpdate(
    name: "my-index",
    version: "1.0",
    index: searchIndex);

// List indexes
foreach (AIProjectIndex index in projectClient.Indexes.GetIndexes())
{
    Console.WriteLine(index.Name);
}

// Delete index
projectClient.Indexes.Delete(name: "my-index", version: "1.0");
```

### 7. Evaluations

```csharp
// Create evaluation configuration
var evaluatorConfig = new EvaluatorConfiguration(id: EvaluatorIDs.Relevance);
evaluatorConfig.InitParams.Add("deployment_name", BinaryData.FromObjectAsJson("gpt-4o"));

// Create evaluation
Evaluation evaluation = new Evaluation(
    data: new InputDataset("<dataset_id>"),
    evaluators: new Dictionary<string, EvaluatorConfiguration> 
    { 
        { "relevance", evaluatorConfig } 
    }
)
{
    DisplayName = "Sample Evaluation"
};

// Run evaluation
Evaluation result = projectClient.Evaluations.Create(evaluation: evaluation);

// Get evaluation
Evaluation getResult = projectClient.Evaluations.Get(result.Name);

// List evaluations
foreach (var eval in projectClient.Evaluations.GetAll())
{
    Console.WriteLine($"{eval.DisplayName}: {eval.Status}");
}
```

### 8. Get Azure OpenAI Chat Client

```csharp
using Azure.AI.OpenAI;
using OpenAI.Chat;

ClientConnection connection = projectClient.GetConnection(typeof(AzureOpenAIClient).FullName!);

if (!connection.TryGetLocatorAsUri(out Uri uri) || uri is null)
    throw new InvalidOperationException("Invalid URI.");

uri = new Uri($"https://{uri.Host}");

AzureOpenAIClient azureOpenAIClient = new AzureOpenAIClient(uri, new DefaultAzureCredential());
ChatClient chatClient = azureOpenAIClient.GetChatClient("gpt-4o-mini");

ChatCompletion result = chatClient.CompleteChat("List all rainbow colors");
Console.WriteLine(result.Content[0].Text);
```

## Available Agent Tools

| Tool | Class | Purpose |
|------|-------|---------|
| Code Interpreter | `CodeInterpreterToolDefinition` | Execute Python code |
| File Search | `FileSearchToolDefinition` | Search uploaded files |
| Function Calling | `FunctionToolDefinition` | Call custom functions |
| Bing Grounding | `BingGroundingToolDefinition` | Web search via Bing |
| Azure AI Search | `AzureAISearchToolDefinition` | Search Azure AI indexes |
| OpenAPI | `OpenApiToolDefinition` | Call external APIs |
| Azure Functions | `AzureFunctionToolDefinition` | Invoke Azure Functions |
| MCP | `MCPToolDefinition` | Model Context Protocol tools |

## Key Types Reference

| Type | Purpose |
|------|---------|
| `AIProjectClient` | Main entry point |
| `PersistentAgentsClient` | Low-level agent operations |
| `PromptAgentDefinition` | Versioned agent definition |
| `AgentVersion` | Versioned agent instance |
| `AIProjectConnection` | Connection to Azure resource |
| `AIProjectDeployment` | Model deployment info |
| `AIProjectDataset` | Dataset metadata |
| `AIProjectIndex` | Search index metadata |
| `Evaluation` | Evaluation configuration and results |

## Best Practices

1. **Use `DefaultAzureCredential`** for production authentication
2. **Use async methods** (`*Async`) for all I/O operations
3. **Poll with appropriate delays** (500ms recommended) when waiting for runs
4. **Clean up resources** — delete threads, agents, and files when done
5. **Use versioned agents** (via `Azure.AI.Projects.OpenAI`) for production scenarios
6. **Store connection IDs** rather than names for tool configurations
7. **Use `includeCredentials: true`** only when credentials are needed
8. **Handle pagination** — use `AsyncPageable<T>` for listing operations

## Error Handling

```csharp
using Azure;

try
{
    var result = await projectClient.Evaluations.CreateAsync(evaluation);
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Error: {ex.Status} - {ex.ErrorCode}: {ex.Message}");
}
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.AI.Projects` | High-level project client (this SDK) | `dotnet add package Azure.AI.Projects` |
| `Azure.AI.Agents.Persistent` | Low-level agent operations | `dotnet add package Azure.AI.Agents.Persistent` |
| `Azure.AI.Projects.OpenAI` | Versioned agents with OpenAI | `dotnet add package Azure.AI.Projects.OpenAI` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.AI.Projects |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.ai.projects |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/ai/Azure.AI.Projects |
| Samples | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/ai/Azure.AI.Projects/samples |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
