---
name: azure-ai-voicelive-dotnet
description: Azure AI Voice Live SDK for .NET. Build real-time voice AI applications with bidirectional WebSocket communication.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.AI.VoiceLive (.NET)

Real-time voice AI SDK for building bidirectional voice assistants with Azure AI.

## Installation

```bash
dotnet add package Azure.AI.VoiceLive
dotnet add package Azure.Identity
dotnet add package NAudio                    # For audio capture/playback
```

**Current Versions**: Stable v1.0.0, Preview v1.1.0-beta.1

## Environment Variables

```bash
AZURE_VOICELIVE_ENDPOINT=https://<resource>.services.ai.azure.com/
AZURE_VOICELIVE_MODEL=gpt-4o-realtime-preview
AZURE_VOICELIVE_VOICE=en-US-AvaNeural
# Optional: API key if not using Entra ID
AZURE_VOICELIVE_API_KEY=<your-api-key>
```

## Authentication

### Microsoft Entra ID (Recommended)

```csharp
using Azure.Identity;
using Azure.AI.VoiceLive;

Uri endpoint = new Uri("https://your-resource.cognitiveservices.azure.com");
DefaultAzureCredential credential = new DefaultAzureCredential();
VoiceLiveClient client = new VoiceLiveClient(endpoint, credential);
```

**Required Role**: `Cognitive Services User` (assign in Azure Portal → Access control)

### API Key

```csharp
Uri endpoint = new Uri("https://your-resource.cognitiveservices.azure.com");
AzureKeyCredential credential = new AzureKeyCredential("your-api-key");
VoiceLiveClient client = new VoiceLiveClient(endpoint, credential);
```

## Client Hierarchy

```
VoiceLiveClient
└── VoiceLiveSession (WebSocket connection)
    ├── ConfigureSessionAsync()
    ├── GetUpdatesAsync() → SessionUpdate events
    ├── AddItemAsync() → UserMessageItem, FunctionCallOutputItem
    ├── SendAudioAsync()
    └── StartResponseAsync()
```

## Core Workflow

### 1. Start Session and Configure

```csharp
using Azure.Identity;
using Azure.AI.VoiceLive;

var endpoint = new Uri(Environment.GetEnvironmentVariable("AZURE_VOICELIVE_ENDPOINT"));
var client = new VoiceLiveClient(endpoint, new DefaultAzureCredential());

var model = "gpt-4o-mini-realtime-preview";

// Start session
using VoiceLiveSession session = await client.StartSessionAsync(model);

// Configure session
VoiceLiveSessionOptions sessionOptions = new()
{
    Model = model,
    Instructions = "You are a helpful AI assistant. Respond naturally.",
    Voice = new AzureStandardVoice("en-US-AvaNeural"),
    TurnDetection = new AzureSemanticVadTurnDetection()
    {
        Threshold = 0.5f,
        PrefixPadding = TimeSpan.FromMilliseconds(300),
        SilenceDuration = TimeSpan.FromMilliseconds(500)
    },
    InputAudioFormat = InputAudioFormat.Pcm16,
    OutputAudioFormat = OutputAudioFormat.Pcm16
};

// Set modalities (both text and audio for voice assistants)
sessionOptions.Modalities.Clear();
sessionOptions.Modalities.Add(InteractionModality.Text);
sessionOptions.Modalities.Add(InteractionModality.Audio);

await session.ConfigureSessionAsync(sessionOptions);
```

### 2. Process Events

```csharp
await foreach (SessionUpdate serverEvent in session.GetUpdatesAsync())
{
    switch (serverEvent)
    {
        case SessionUpdateResponseAudioDelta audioDelta:
            byte[] audioData = audioDelta.Delta.ToArray();
            // Play audio via NAudio or other audio library
            break;
            
        case SessionUpdateResponseTextDelta textDelta:
            Console.Write(textDelta.Delta);
            break;
            
        case SessionUpdateResponseFunctionCallArgumentsDone functionCall:
            // Handle function call (see Function Calling section)
            break;
            
        case SessionUpdateError error:
            Console.WriteLine($"Error: {error.Error.Message}");
            break;
            
        case SessionUpdateResponseDone:
            Console.WriteLine("\n--- Response complete ---");
            break;
    }
}
```

### 3. Send User Message

```csharp
await session.AddItemAsync(new UserMessageItem("Hello, can you help me?"));
await session.StartResponseAsync();
```

### 4. Function Calling

```csharp
// Define function
var weatherFunction = new VoiceLiveFunctionDefinition("get_current_weather")
{
    Description = "Get the current weather for a given location",
    Parameters = BinaryData.FromString("""
        {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state or country"
                }
            },
            "required": ["location"]
        }
        """)
};

// Add to session options
sessionOptions.Tools.Add(weatherFunction);

// Handle function call in event loop
if (serverEvent is SessionUpdateResponseFunctionCallArgumentsDone functionCall)
{
    if (functionCall.Name == "get_current_weather")
    {
        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(functionCall.Arguments);
        string location = parameters?["location"] ?? "";
        
        // Call external service
        string weatherInfo = $"The weather in {location} is sunny, 75°F.";
        
        // Send response
        await session.AddItemAsync(new FunctionCallOutputItem(functionCall.CallId, weatherInfo));
        await session.StartResponseAsync();
    }
}
```

## Voice Options

| Voice Type | Class | Example |
|------------|-------|---------|
| Azure Standard | `AzureStandardVoice` | `"en-US-AvaNeural"` |
| Azure HD | `AzureStandardVoice` | `"en-US-Ava:DragonHDLatestNeural"` |
| Azure Custom | `AzureCustomVoice` | Custom voice with endpoint ID |

## Supported Models

| Model | Description |
|-------|-------------|
| `gpt-4o-realtime-preview` | GPT-4o with real-time audio |
| `gpt-4o-mini-realtime-preview` | Lightweight, fast interactions |
| `phi4-mm-realtime` | Cost-effective multimodal |

## Key Types Reference

| Type | Purpose |
|------|---------|
| `VoiceLiveClient` | Main client for creating sessions |
| `VoiceLiveSession` | Active WebSocket session |
| `VoiceLiveSessionOptions` | Session configuration |
| `AzureStandardVoice` | Standard Azure voice provider |
| `AzureSemanticVadTurnDetection` | Voice activity detection |
| `VoiceLiveFunctionDefinition` | Function tool definition |
| `UserMessageItem` | User text message |
| `FunctionCallOutputItem` | Function call response |
| `SessionUpdateResponseAudioDelta` | Audio chunk event |
| `SessionUpdateResponseTextDelta` | Text chunk event |

## Best Practices

1. **Always set both modalities** — Include `Text` and `Audio` for voice assistants
2. **Use `AzureSemanticVadTurnDetection`** — Provides natural conversation flow
3. **Configure appropriate silence duration** — 500ms typical to avoid premature cutoffs
4. **Use `using` statement** — Ensures proper session disposal
5. **Handle all event types** — Check for errors, audio, text, and function calls
6. **Use DefaultAzureCredential** — Never hardcode API keys

## Error Handling

```csharp
if (serverEvent is SessionUpdateError error)
{
    if (error.Error.Message.Contains("Cancellation failed: no active response"))
    {
        // Benign error, can ignore
    }
    else
    {
        Console.WriteLine($"Error: {error.Error.Message}");
    }
}
```

## Audio Configuration

- **Input Format**: `InputAudioFormat.Pcm16` (16-bit PCM)
- **Output Format**: `OutputAudioFormat.Pcm16`
- **Sample Rate**: 24kHz recommended
- **Channels**: Mono

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.AI.VoiceLive` | Real-time voice (this SDK) | `dotnet add package Azure.AI.VoiceLive` |
| `Microsoft.CognitiveServices.Speech` | Speech-to-text, text-to-speech | `dotnet add package Microsoft.CognitiveServices.Speech` |
| `NAudio` | Audio capture/playback | `dotnet add package NAudio` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.AI.VoiceLive |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.ai.voicelive |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/ai/Azure.AI.VoiceLive |
| Quickstart | https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-quickstart |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
