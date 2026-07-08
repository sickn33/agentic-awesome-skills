---
name: azure-ai-openai-dotnet
description: Azure OpenAI SDK for .NET. Client library for Azure OpenAI and OpenAI services. Use for chat completions, embeddings, image generation, audio transcription, and assistants.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.AI.OpenAI (.NET)

Client library for Azure OpenAI Service providing access to OpenAI models including GPT-4, GPT-4o, embeddings, DALL-E, and Whisper.

## Installation

```bash
dotnet add package Azure.AI.OpenAI

# For OpenAI (non-Azure) compatibility
dotnet add package OpenAI
```

**Current Version**: 2.1.0 (stable)

## Environment Variables

```bash
AZURE_OPENAI_ENDPOINT=https://<resource-name>.openai.azure.com
AZURE_OPENAI_API_KEY=<api-key>                    # For key-based auth
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini          # Your deployment name
```

## Client Hierarchy

```
AzureOpenAIClient (top-level)
├── GetChatClient(deploymentName)      → ChatClient
├── GetEmbeddingClient(deploymentName) → EmbeddingClient
├── GetImageClient(deploymentName)     → ImageClient
├── GetAudioClient(deploymentName)     → AudioClient
└── GetAssistantClient()               → AssistantClient
```

## Authentication

### API Key Authentication

```csharp
using Azure;
using Azure.AI.OpenAI;

AzureOpenAIClient client = new(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new AzureKeyCredential(Environment.GetEnvironmentVariable("AZURE_OPENAI_API_KEY")!));
```

### Microsoft Entra ID (Recommended for Production)

```csharp
using Azure.Identity;
using Azure.AI.OpenAI;

AzureOpenAIClient client = new(
    new Uri(Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT")!),
    new DefaultAzureCredential());
```

### Using OpenAI SDK Directly with Azure

```csharp
using Azure.Identity;
using OpenAI;
using OpenAI.Chat;
using System.ClientModel.Primitives;

#pragma warning disable OPENAI001

BearerTokenPolicy tokenPolicy = new(
    new DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default");

ChatClient client = new(
    model: "gpt-4o-mini",
    authenticationPolicy: tokenPolicy,
    options: new OpenAIClientOptions()
    {
        Endpoint = new Uri("https://YOUR-RESOURCE.openai.azure.com/openai/v1")
    });
```

## Chat Completions

### Basic Chat

```csharp
using Azure.AI.OpenAI;
using OpenAI.Chat;

AzureOpenAIClient azureClient = new(
    new Uri(endpoint),
    new DefaultAzureCredential());

ChatClient chatClient = azureClient.GetChatClient("gpt-4o-mini");

ChatCompletion completion = chatClient.CompleteChat(
[
    new SystemChatMessage("You are a helpful assistant."),
    new UserChatMessage("What is Azure OpenAI?")
]);

Console.WriteLine(completion.Content[0].Text);
```

### Async Chat

```csharp
ChatCompletion completion = await chatClient.CompleteChatAsync(
[
    new SystemChatMessage("You are a helpful assistant."),
    new UserChatMessage("Explain cloud computing in simple terms.")
]);

Console.WriteLine($"Response: {completion.Content[0].Text}");
Console.WriteLine($"Tokens used: {completion.Usage.TotalTokenCount}");
```

### Streaming Chat

```csharp
await foreach (StreamingChatCompletionUpdate update 
    in chatClient.CompleteChatStreamingAsync(messages))
{
    if (update.ContentUpdate.Count > 0)
    {
        Console.Write(update.ContentUpdate[0].Text);
    }
}
```

### Chat with Options

```csharp
ChatCompletionOptions options = new()
{
    MaxOutputTokenCount = 1000,
    Temperature = 0.7f,
    TopP = 0.95f,
    FrequencyPenalty = 0,
    PresencePenalty = 0
};

ChatCompletion completion = await chatClient.CompleteChatAsync(messages, options);
```

### Multi-turn Conversation

```csharp
List<ChatMessage> messages = new()
{
    new SystemChatMessage("You are a helpful assistant."),
    new UserChatMessage("Hi, can you help me?"),
    new AssistantChatMessage("Of course! What do you need help with?"),
    new UserChatMessage("What's the capital of France?")
};

ChatCompletion completion = await chatClient.CompleteChatAsync(messages);
messages.Add(new AssistantChatMessage(completion.Content[0].Text));
```

## Structured Outputs (JSON Schema)

```csharp
using System.Text.Json;

ChatCompletionOptions options = new()
{
    ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
        jsonSchemaFormatName: "math_reasoning",
        jsonSchema: BinaryData.FromBytes("""
            {
                "type": "object",
                "properties": {
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "explanation": { "type": "string" },
                                "output": { "type": "string" }
                            },
                            "required": ["explanation", "output"],
                            "additionalProperties": false
                        }
                    },
                    "final_answer": { "type": "string" }
                },
                "required": ["steps", "final_answer"],
                "additionalProperties": false
            }
            """u8.ToArray()),
        jsonSchemaIsStrict: true)
};

ChatCompletion completion = await chatClient.CompleteChatAsync(
    [new UserChatMessage("How can I solve 8x + 7 = -23?")],
    options);

using JsonDocument json = JsonDocument.Parse(completion.Content[0].Text);
Console.WriteLine($"Answer: {json.RootElement.GetProperty("final_answer")}");
```

## Reasoning Models (o1, o4-mini)

```csharp
ChatCompletionOptions options = new()
{
    ReasoningEffortLevel = ChatReasoningEffortLevel.Low,
    MaxOutputTokenCount = 100000
};

ChatCompletion completion = await chatClient.CompleteChatAsync(
[
    new DeveloperChatMessage("You are a helpful assistant"),
    new UserChatMessage("Explain the theory of relativity")
], options);
```

## Azure AI Search Integration (RAG)

```csharp
using Azure.AI.OpenAI.Chat;

#pragma warning disable AOAI001

ChatCompletionOptions options = new();
options.AddDataSource(new AzureSearchChatDataSource()
{
    Endpoint = new Uri(searchEndpoint),
    IndexName = searchIndex,
    Authentication = DataSourceAuthentication.FromApiKey(searchKey)
});

ChatCompletion completion = await chatClient.CompleteChatAsync(
    [new UserChatMessage("What health plans are available?")],
    options);

ChatMessageContext context = completion.GetMessageContext();
if (context?.Intent is not null)
{
    Console.WriteLine($"Intent: {context.Intent}");
}
foreach (ChatCitation citation in context?.Citations ?? [])
{
    Console.WriteLine($"Citation: {citation.Content}");
}
```

## Embeddings

```csharp
using OpenAI.Embeddings;

EmbeddingClient embeddingClient = azureClient.GetEmbeddingClient("text-embedding-ada-002");

OpenAIEmbedding embedding = await embeddingClient.GenerateEmbeddingAsync("Hello, world!");
ReadOnlyMemory<float> vector = embedding.ToFloats();

Console.WriteLine($"Embedding dimensions: {vector.Length}");
```

### Batch Embeddings

```csharp
List<string> inputs = new()
{
    "First document text",
    "Second document text",
    "Third document text"
};

OpenAIEmbeddingCollection embeddings = await embeddingClient.GenerateEmbeddingsAsync(inputs);

foreach (OpenAIEmbedding emb in embeddings)
{
    Console.WriteLine($"Index {emb.Index}: {emb.ToFloats().Length} dimensions");
}
```

## Image Generation (DALL-E)

```csharp
using OpenAI.Images;

ImageClient imageClient = azureClient.GetImageClient("dall-e-3");

GeneratedImage image = await imageClient.GenerateImageAsync(
    "A futuristic city skyline at sunset",
    new ImageGenerationOptions
    {
        Size = GeneratedImageSize.W1024xH1024,
        Quality = GeneratedImageQuality.High,
        Style = GeneratedImageStyle.Vivid
    });

Console.WriteLine($"Image URL: {image.ImageUri}");
```

## Audio (Whisper)

### Transcription

```csharp
using OpenAI.Audio;

AudioClient audioClient = azureClient.GetAudioClient("whisper");

AudioTranscription transcription = await audioClient.TranscribeAudioAsync(
    "audio.mp3",
    new AudioTranscriptionOptions
    {
        ResponseFormat = AudioTranscriptionFormat.Verbose,
        Language = "en"
    });

Console.WriteLine(transcription.Text);
```

### Text-to-Speech

```csharp
BinaryData speech = await audioClient.GenerateSpeechAsync(
    "Hello, welcome to Azure OpenAI!",
    GeneratedSpeechVoice.Alloy,
    new SpeechGenerationOptions
    {
        SpeedRatio = 1.0f,
        ResponseFormat = GeneratedSpeechFormat.Mp3
    });

await File.WriteAllBytesAsync("output.mp3", speech.ToArray());
```

## Function Calling (Tools)

```csharp
ChatTool getCurrentWeatherTool = ChatTool.CreateFunctionTool(
    functionName: "get_current_weather",
    functionDescription: "Get the current weather in a given location",
    functionParameters: BinaryData.FromString("""
        {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. San Francisco, CA"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"]
                }
            },
            "required": ["location"]
        }
        """));

ChatCompletionOptions options = new()
{
    Tools = { getCurrentWeatherTool }
};

ChatCompletion completion = await chatClient.CompleteChatAsync(
    [new UserChatMessage("What's the weather in Seattle?")],
    options);

if (completion.FinishReason == ChatFinishReason.ToolCalls)
{
    foreach (ChatToolCall toolCall in completion.ToolCalls)
    {
        Console.WriteLine($"Function: {toolCall.FunctionName}");
        Console.WriteLine($"Arguments: {toolCall.FunctionArguments}");
    }
}
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `AzureOpenAIClient` | Top-level client for Azure OpenAI |
| `ChatClient` | Chat completions |
| `EmbeddingClient` | Text embeddings |
| `ImageClient` | Image generation (DALL-E) |
| `AudioClient` | Audio transcription/TTS |
| `ChatCompletion` | Chat response |
| `ChatCompletionOptions` | Request configuration |
| `StreamingChatCompletionUpdate` | Streaming response chunk |
| `ChatMessage` | Base message type |
| `SystemChatMessage` | System prompt |
| `UserChatMessage` | User input |
| `AssistantChatMessage` | Assistant response |
| `DeveloperChatMessage` | Developer message (reasoning models) |
| `ChatTool` | Function/tool definition |
| `ChatToolCall` | Tool invocation request |

## Best Practices

1. **Use Entra ID in production** — Avoid API keys; use `DefaultAzureCredential`
2. **Reuse client instances** — Create once, share across requests
3. **Handle rate limits** — Implement exponential backoff for 429 errors
4. **Stream for long responses** — Use `CompleteChatStreamingAsync` for better UX
5. **Set appropriate timeouts** — Long completions may need extended timeouts
6. **Use structured outputs** — JSON schema ensures consistent response format
7. **Monitor token usage** — Track `completion.Usage` for cost management
8. **Validate tool calls** — Always validate function arguments before execution

## Error Handling

```csharp
using Azure;

try
{
    ChatCompletion completion = await chatClient.CompleteChatAsync(messages);
}
catch (RequestFailedException ex) when (ex.Status == 429)
{
    Console.WriteLine("Rate limited. Retry after delay.");
    await Task.Delay(TimeSpan.FromSeconds(10));
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    Console.WriteLine($"Bad request: {ex.Message}");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Azure OpenAI error: {ex.Status} - {ex.Message}");
}
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.AI.OpenAI` | Azure OpenAI client (this SDK) | `dotnet add package Azure.AI.OpenAI` |
| `OpenAI` | OpenAI compatibility | `dotnet add package OpenAI` |
| `Azure.Identity` | Authentication | `dotnet add package Azure.Identity` |
| `Azure.Search.Documents` | AI Search for RAG | `dotnet add package Azure.Search.Documents` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.AI.OpenAI |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.ai.openai |
| Migration Guide (1.0→2.0) | https://learn.microsoft.com/azure/ai-services/openai/how-to/dotnet-migration |
| Quickstart | https://learn.microsoft.com/azure/ai-services/openai/quickstart |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/openai/Azure.AI.OpenAI |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
