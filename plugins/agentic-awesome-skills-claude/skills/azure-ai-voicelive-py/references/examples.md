# Azure AI Voice Live SDK - Examples

## Table of Contents
- [Basic Voice Assistant](#basic-voice-assistant)
- [Function Calling](#function-calling)
- [Manual Turn Control](#manual-turn-control)
- [Audio File Processing](#audio-file-processing)
- [Interrupt Handling](#interrupt-handling)
- [Multi-modal (Text + Audio)](#multi-modal-text--audio)
- [Azure Voice Integration](#azure-voice-integration)
- [Avatar Integration](#avatar-integration)
- [Transcription Only](#transcription-only)

---

## Basic Voice Assistant

Illustrative assistant with Server VAD; microphone/playback functions and task cleanup must be implemented.

```python
import asyncio
import base64
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def voice_assistant():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        # Configure session
        await conn.session.update(session={
            "instructions": "You are a helpful voice assistant. Be concise.",
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "silence_duration_ms": 500
            },
            "input_audio_transcription": {
                "model": "whisper-1"
            }
        })

        # Start microphone input (pseudo-code)
        mic_task = asyncio.create_task(stream_microphone(conn))

        # Process events
        async for event in conn:
            match event.type:
                case "session.created":
                    print("Session ready")

                case "input_audio_buffer.speech_started":
                    print("🎤 Listening...")

                case "conversation.item.input_audio_transcription.completed":
                    print(f"You: {event.transcript}")

                case "response.audio.delta":
                    audio = base64.b64decode(event.delta)
                    await play_audio(audio)

                case "response.audio_transcript.done":
                    print(f"Assistant: {event.transcript}")

                case "error":
                    print(f"Error: {event.error.message}")
                    break

async def stream_microphone(conn):
    """Stream microphone audio to the connection."""
    async for chunk in read_microphone():  # Your audio capture
        b64 = base64.b64encode(chunk).decode()
        await conn.input_audio_buffer.append(audio=b64)

asyncio.run(voice_assistant())
```

---

## Function Calling

Voice assistant with tool use.

```python
import asyncio
import json
import base64
from azure.ai.voicelive.aio import connect
from azure.ai.voicelive.models import FunctionTool
from azure.core.credentials import AzureKeyCredential

# Define tools
TOOLS = [
    FunctionTool(
        type="function",
        name="get_weather",
        description="Get current weather for a location",
        parameters={
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City and state, e.g. 'San Francisco, CA'"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "default": "fahrenheit"
                }
            },
            "required": ["location"]
        }
    ),
    FunctionTool(
        type="function",
        name="set_reminder",
        description="Set a reminder for the user",
        parameters={
            "type": "object",
            "properties": {
                "message": {"type": "string"},
                "time": {"type": "string", "description": "ISO 8601 datetime"}
            },
            "required": ["message", "time"]
        }
    )
]

def handle_function_call(name: str, arguments: str) -> dict:
    """Execute function and return result."""
    args = json.loads(arguments)

    if name == "get_weather":
        # Mock weather API
        return {
            "location": args["location"],
            "temperature": 72,
            "unit": args.get("unit", "fahrenheit"),
            "conditions": "sunny"
        }
    elif name == "set_reminder":
        # Mock reminder service
        return {"status": "mock_only", "created": False, "message": "No reminder was scheduled"}
    else:
        return {"error": f"Unknown function: {name}"}

async def function_calling_assistant():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        await conn.session.update(session={
            "instructions": "You can check weather and set reminders.",
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "tools": TOOLS,
            "tool_choice": "auto"
        })

        async for event in conn:
            match event.type:
                case "response.function_call_arguments.done":
                    # Execute the function
                    result = handle_function_call(event.name, event.arguments)

                    # Send result back
                    await conn.conversation.item.create(item={
                        "type": "function_call_output",
                        "call_id": event.call_id,
                        "output": json.dumps(result)
                    })

                    # Continue the conversation
                    await conn.response.create()

                case "response.audio.delta":
                    audio = base64.b64decode(event.delta)
                    await play_audio(audio)

                case "response.done":
                    if event.response.status == "completed":
                        print("Response complete")

asyncio.run(function_calling_assistant())
```

---

## Manual Turn Control

Push-to-talk style without VAD.

```python
import asyncio
import base64
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def push_to_talk():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        # Disable VAD for manual control
        await conn.session.update(session={
            "instructions": "You are a helpful assistant.",
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "turn_detection": None  # Disable VAD
        })

        # Simulate push-to-talk
        while True:
            await asyncio.to_thread(input, "Press Enter to start recording...")

            # Record audio (simulate with chunks)
            chunks = await record_audio_until_release()

            # Send all audio
            for chunk in chunks:
                b64 = base64.b64encode(chunk).decode()
                await conn.input_audio_buffer.append(audio=b64)

            # Commit and request response
            await conn.input_audio_buffer.commit()
            await conn.response.create()

            # Wait for response
            async for event in conn:
                if event.type == "response.audio.delta":
                    audio = base64.b64decode(event.delta)
                    await play_audio(audio)
                elif event.type == "response.done":
                    break

asyncio.run(push_to_talk())
```

---

## Audio File Processing

Only raw PCM matching the negotiated format is valid here; WAV/MP3 containers must be decoded/resampled first. Stream bounded chunks and cap output/session duration; this in-memory example is for small test files. Input transcription events may arrive after response.done, so correlate/wait for the relevant completion separately.

Process an audio file and get a response.

```python
import asyncio
import base64
from pathlib import Path
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def process_audio_file(audio_path: str):
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        await conn.session.update(session={
            "instructions": "Respond to the audio message.",
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "turn_detection": None,
            "input_audio_transcription": {"model": "whisper-1"}
        })

        # Read and send audio file
        audio_data = Path(audio_path).read_bytes()

        # Send in chunks (24kHz * 2 bytes * 0.1s = 4800 bytes)
        chunk_size = 4800
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i + chunk_size]
            b64 = base64.b64encode(chunk).decode()
            await conn.input_audio_buffer.append(audio=b64)

        # Commit and request response
        await conn.input_audio_buffer.commit()
        await conn.response.create()

        # Collect response
        response_audio = bytearray()
        response_text = ""
        user_transcript = ""

        async for event in conn:
            match event.type:
                case "conversation.item.input_audio_transcription.completed":
                    user_transcript = event.transcript
                case "response.audio.delta":
                    response_audio.extend(base64.b64decode(event.delta))
                case "response.audio_transcript.done":
                    response_text = event.transcript
                case "response.done":
                    break

        return {
            "user_said": user_transcript,
            "assistant_said": response_text,
            "audio": bytes(response_audio)
        }

result = asyncio.run(process_audio_file("input.pcm"))
print(f"User: {result['user_said']}")
print(f"Assistant: {result['assistant_said']}")
with Path("output.pcm").open("xb") as output:
    output.write(result["audio"])
```

---

## Interrupt Handling

Handle user interruptions gracefully.

```python
import asyncio
import base64
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def interruptible_assistant():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        await conn.session.update(session={
            "instructions": "You are a helpful assistant.",
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "silence_duration_ms": 500
            }
        })

        is_responding = False

        async for event in conn:
            match event.type:
                case "response.created":
                    is_responding = True

                case "response.done":
                    is_responding = False

                case "input_audio_buffer.speech_started":
                    if is_responding:
                        # User interrupted - stop current response
                        print("🛑 Interrupt detected!")
                        await conn.response.cancel()
                        await conn.output_audio_buffer.clear()

                case "response.audio.delta":
                    if is_responding:
                        audio = base64.b64decode(event.delta)
                        await play_audio(audio)

asyncio.run(interruptible_assistant())
```

---

## Multi-modal (Text + Audio)

Send text context, receive audio response.

```python
import asyncio
import base64
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def multimodal_assistant():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        await conn.session.update(session={
            "instructions": "You are a helpful assistant.",
            "modalities": ["text", "audio"],
            "voice": "alloy",
            "turn_detection": None
        })

        # Add context via text
        await conn.conversation.item.create(item={
            "type": "message",
            "role": "system",
            "content": [{"type": "input_text", "text": "The user's name is Alice."}]
        })

        # Add user message as text
        await conn.conversation.item.create(item={
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": "What's my name?"}]
        })

        # Request audio response
        await conn.response.create()

        async for event in conn:
            if event.type == "response.audio.delta":
                audio = base64.b64decode(event.delta)
                await play_audio(audio)
            elif event.type == "response.done":
                break

asyncio.run(multimodal_assistant())
```

---

## Azure Voice Integration

Use Azure Text-to-Speech voices.

```python
import asyncio
from azure.ai.voicelive.aio import connect
from azure.ai.voicelive.models import AzureStandardVoice, AzureCustomVoice
from azure.core.credentials import AzureKeyCredential

async def azure_voice_assistant():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        # Use Azure standard voice
        await conn.session.update(session={
            "instructions": "You are a helpful assistant.",
            "modalities": ["text", "audio"],
            "voice": AzureStandardVoice(
                type="azure-standard",
                name="en-US-JennyNeural"
            )
        })

        # Or use custom voice
        # await conn.session.update(session={
        #     "voice": AzureCustomVoice(
        #         type="azure-custom",
        #         endpoint_id="your-custom-voice-endpoint",
        #         name="YourCustomVoice"
        #     )
        # })

        async for event in conn:
            # ... handle events
            pass

asyncio.run(azure_voice_assistant())
```

---

## Avatar Integration

This is incomplete signaling pseudocode: implement the actual WebRTC offer/answer/ICE flow and current model configuration before expecting video. Never log ICE credentials.

Connect to Azure Avatar for visual output.

```python
import asyncio
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def avatar_assistant():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        await conn.session.update(session={
            "instructions": "You are a helpful assistant.",
            "modalities": ["text", "audio", "avatar"],
            "voice": "alloy",
            "avatar": {
                "type": "video-avatar",
                "character": "lisa",
                "output_protocol": "webrtc"
            }
        })

        # Connect avatar
        await conn.send({
            "type": "session.avatar.connect"
        })

        async for event in conn:
            match event.type:
                case "session.avatar.connecting":
                    ice_servers = event.ice_servers
                    # Use ice_servers for WebRTC connection
                    print(f"Avatar connecting with {len(ice_servers)} ICE servers")

                case "response.audio.delta":
                    # Audio is streamed via WebRTC, not this event
                    pass

asyncio.run(avatar_assistant())
```

---

## Transcription Only

Text-only modalities suppress audio output, not necessarily automatic model responses. Configure a supported transcription session or verified create_response=False mode; the sketch below alone does not guarantee transcription-only billing/behavior.

Speech-to-text without AI response.

```python
import asyncio
import base64
from azure.ai.voicelive.aio import connect
from azure.core.credentials import AzureKeyCredential

async def transcription_only():
    async with connect(
        endpoint="https://eastus.api.cognitive.microsoft.com",
        credential=AzureKeyCredential("YOUR_KEY"),
        model="gpt-4o-realtime-preview"
    ) as conn:
        await conn.session.update(session={
            "modalities": ["text"],  # No audio output
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "silence_duration_ms": 1000
            },
            "input_audio_transcription": {
                "model": "whisper-1"
            }
        })

        # Stream microphone
        mic_task = asyncio.create_task(stream_microphone(conn))

        transcripts = []

        async for event in conn:
            match event.type:
                case "conversation.item.input_audio_transcription.delta":
                    print(event.delta, end="", flush=True)

                case "conversation.item.input_audio_transcription.completed":
                    print()  # Newline
                    transcripts.append(event.transcript)

        return transcripts

asyncio.run(transcription_only())
```
