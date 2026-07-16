---
name: azure-ai-voicelive-py
description: "Build real-time voice AI applications with bidirectional WebSocket communication."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure AI Voice Live SDK

Build real-time voice AI applications with bidirectional WebSocket communication.

## Installation

```bash
pip install azure-ai-voicelive aiohttp azure-identity
```

## Environment Variables

```bash
AZURE_COGNITIVE_SERVICES_ENDPOINT=https://<region>.api.cognitive.microsoft.com
# For API key auth (not recommended for production)
AZURE_COGNITIVE_SERVICES_KEY=<api-key>
```

## Authentication

**DefaultAzureCredential (preferred)**:
```python
from azure.ai.voicelive.aio import connect
from azure.identity.aio import DefaultAzureCredential

async with connect(
    endpoint=os.environ["AZURE_COGNITIVE_SERVICES_ENDPOINT"],
    credential=DefaultAzureCredential(),
    model="gpt-4o-realtime-preview",
    credential_scopes=["https://cognitiveservices.azure.com/.default"]
) as conn:
    ...
```

**API Key**:
```python
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async with connect(
    endpoint=os.environ["AZURE_COGNITIVE_SERVICES_ENDPOINT"],
    credential=AzureKeyCredential(os.environ["AZURE_COGNITIVE_SERVICES_KEY"]),
    model="gpt-4o-realtime-preview"
) as conn:
    ...
```

## Quick Start

```python
import asyncio
import os
from azure.ai.voicelive.aio import connect
from azure.identity.aio import DefaultAzureCredential

async def main():
    async with connect(
        endpoint=os.environ["AZURE_COGNITIVE_SERVICES_ENDPOINT"],
        credential=DefaultAzureCredential(),
        model="gpt-4o-realtime-preview",
        credential_scopes=["https://cognitiveservices.azure.com/.default"]
    ) as conn:
        # Update session with instructions
        await conn.session.update(session={
            "instructions": "You are a helpful assistant.",
            "modalities": ["text", "audio"],
            "voice": "alloy"
        })
        
        # Listen for events
        async for event in conn:
            print(f"Event: {event.type}")
            if event.type == "response.audio_transcript.done":
                print(f"Transcript: {event.transcript}")
            elif event.type == "response.done":
                break

asyncio.run(main())
```

## Core Architecture

### Connection Resources

The `VoiceLiveConnection` exposes these resources:

| Resource | Purpose | Key Methods |
|----------|---------|-------------|
| `conn.session` | Session configuration | `update(session=...)` |
| `conn.response` | Model responses | `create()`, `cancel()` |
| `conn.input_audio_buffer` | Audio input | `append()`, `commit()`, `clear()` |
| `conn.output_audio_buffer` | Audio output | `clear()` |
| `conn.conversation` | Conversation state | `item.create()`, `item.delete()`, `item.truncate()` |
| `conn.transcription_session` | Transcription config | `update(session=...)` |

## Session Configuration

```python
from azure.ai.voicelive.models import RequestSession, FunctionTool

await conn.session.update(session=RequestSession(
    instructions="You are a helpful voice assistant.",
    modalities=["text", "audio"],
    voice="alloy",  # or "echo", "shimmer", "sage", etc.
    input_audio_format="pcm16",
    output_audio_format="pcm16",
    turn_detection={
        "type": "server_vad",
        "threshold": 0.5,
        "prefix_padding_ms": 300,
        "silence_duration_ms": 500
    },
    tools=[
        FunctionTool(
            type="function",
            name="get_weather",
            description="Get current weather",
            parameters={
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            }
        )
    ]
))
```

## Audio Streaming

### Send Audio (Base64 PCM16)

```python
import base64

# Read audio chunk (16-bit PCM, 24kHz mono)
audio_chunk = await read_audio_from_microphone()
b64_audio = base64.b64encode(audio_chunk).decode()

await conn.input_audio_buffer.append(audio=b64_audio)
```

### Receive Audio

```python
async for event in conn:
    if event.type == "response.audio.delta":
        audio_bytes = base64.b64decode(event.delta)
        await play_audio(audio_bytes)
    elif event.type == "response.audio.done":
        print("Audio complete")
```

## Event Handling

```python
async for event in conn:
    match event.type:
        # Session events
        case "session.created":
            print(f"Session: {event.session}")
        case "session.updated":
            print("Session updated")
        
        # Audio input events
        case "input_audio_buffer.speech_started":
            print(f"Speech started at {event.audio_start_ms}ms")
        case "input_audio_buffer.speech_stopped":
            print(f"Speech stopped at {event.audio_end_ms}ms")
        
        # Transcription events
        case "conversation.item.input_audio_transcription.completed":
            print(f"User said: {event.transcript}")
        case "conversation.item.input_audio_transcription.delta":
            print(f"Partial: {event.delta}")
        
        # Response events
        case "response.created":
            print(f"Response started: {event.response.id}")
        case "response.audio_transcript.delta":
            print(event.delta, end="", flush=True)
        case "response.audio.delta":
            audio = base64.b64decode(event.delta)
        case "response.done":
            print(f"Response complete: {event.response.status}")
        
        # Function calls
        case "response.function_call_arguments.done":
            result = handle_function(event.name, event.arguments)
            await conn.conversation.item.create(item={
                "type": "function_call_output",
                "call_id": event.call_id,
                "output": json.dumps(result)
            })
            await conn.response.create()
        
        # Errors
        case "error":
            print(f"Error: {event.error.message}")
```

## Common Patterns

### Manual Turn Mode (No VAD)

```python
await conn.session.update(session={"turn_detection": None})

# Manually control turns
await conn.input_audio_buffer.append(audio=b64_audio)
await conn.input_audio_buffer.commit()  # End of user turn
await conn.response.create()  # Trigger response
```

### Interrupt Handling

```python
async for event in conn:
    if event.type == "input_audio_buffer.speech_started":
        # User interrupted - cancel current response
        await conn.response.cancel()
        await conn.output_audio_buffer.clear()
```

### Conversation History

```python
# Add system message
await conn.conversation.item.create(item={
    "type": "message",
    "role": "system",
    "content": [{"type": "input_text", "text": "Be concise."}]
})

# Add user message
await conn.conversation.item.create(item={
    "type": "message",
    "role": "user", 
    "content": [{"type": "input_text", "text": "Hello!"}]
})

await conn.response.create()
```

## Voice Options

| Voice | Description |
|-------|-------------|
| `alloy` | Neutral, balanced |
| `echo` | Warm, conversational |
| `shimmer` | Clear, professional |
| `sage` | Calm, authoritative |
| `coral` | Friendly, upbeat |
| `ash` | Deep, measured |
| `ballad` | Expressive |
| `verse` | Storytelling |

Azure voices: Use `AzureStandardVoice`, `AzureCustomVoice`, or `AzurePersonalVoice` models.

## Audio Formats

| Format | Sample Rate | Use Case |
|--------|-------------|----------|
| `pcm16` | 24kHz | Default, high quality |
| `pcm16-8000hz` | 8kHz | Telephony |
| `pcm16-16000hz` | 16kHz | Voice assistants |
| `g711_ulaw` | 8kHz | Telephony (US) |
| `g711_alaw` | 8kHz | Telephony (EU) |

## Turn Detection Options

```python
# Server VAD (default)
{"type": "server_vad", "threshold": 0.5, "silence_duration_ms": 500}

# Azure Semantic VAD (smarter detection)
{"type": "azure_semantic_vad"}
{"type": "azure_semantic_vad_en"}  # English optimized
{"type": "azure_semantic_vad_multilingual"}
```

## Error Handling

```python
from azure.ai.voicelive.aio import ConnectionError, ConnectionClosed

try:
    async with connect(...) as conn:
        async for event in conn:
            if event.type == "error":
                print(f"API Error: {event.error.code} - {event.error.message}")
except ConnectionClosed as e:
    print(f"Connection closed: {e.code} - {e.reason}")
except ConnectionError as e:
    print(f"Connection error: {e}")
```

## References

- **Detailed API Reference**: See references/api-reference.md
- **Complete Examples**: See references/examples.md
- **All Models & Types**: See references/models.md

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
