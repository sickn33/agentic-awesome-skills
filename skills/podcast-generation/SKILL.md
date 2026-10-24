---
name: podcast-generation
description: "Generate real audio narratives from text content using Azure OpenAI's Realtime API."
risk: critical
source: community
date_added: "2026-02-27"
---
## Bundled upstream support

Supporting files are included at skill-relative paths. See [UPSTREAM-NOTICE.md](UPSTREAM-NOTICE.md) for their pinned sources, licenses, hashes, and import changes.

# Podcast Generation with GPT Realtime Mini

Generate real audio narratives from text content using Azure OpenAI's Realtime API.

## Quick Start

1. Configure environment variables for Realtime API
2. Connect via WebSocket to Azure OpenAI Realtime endpoint
3. Send text prompt, collect PCM audio chunks + transcript
4. Convert PCM to WAV format
5. Return base64-encoded audio to frontend for playback

## Environment Configuration

```env
AZURE_OPENAI_AUDIO_API_KEY=your_realtime_api_key
AZURE_OPENAI_AUDIO_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_OPENAI_AUDIO_DEPLOYMENT=gpt-realtime-mini
```

**Note**: Endpoint should NOT include `/openai/v1/` - just the base URL.

## Core Workflow

### Backend Audio Generation

```python
from openai import AsyncOpenAI
import base64

# Convert HTTPS endpoint to WebSocket URL
ws_url = endpoint.rstrip("/").replace("https://", "wss://", 1) + "/openai/v1"

client = AsyncOpenAI(
    websocket_base_url=ws_url,
    api_key=api_key
)

audio_chunks = []
transcript_parts = []

async with client.realtime.connect(model=deployment_name) as conn:
    # Configure for audio-only output
    await conn.session.update(session={
        "type": "realtime",
        "audio": {"output": {"voice": voice_name, "format": {"type": "audio/pcm", "rate": 24000}}},
        "output_modalities": ["audio"],
        "instructions": "You are a narrator. Speak naturally."
    })
    
    # Send text to narrate
    await conn.conversation.item.create(item={
        "type": "message",
        "role": "user",
        "content": [{"type": "input_text", "text": prompt}]
    })
    
    await conn.response.create()
    
    # Collect streaming events
    async for event in conn:
        if event.type == "response.output_audio.delta":
            audio_chunks.append(base64.b64decode(event.delta))
        elif event.type == "response.output_audio_transcript.delta":
            transcript_parts.append(event.delta)
        elif event.type == "error":
            raise RuntimeError("Realtime service error; inspect redacted private diagnostics")
        elif event.type == "response.done":
            if event.response.status != "completed":
                raise RuntimeError("Incomplete audio response")
            break

# Convert PCM to WAV (see scripts/pcm_to_wav.py)
pcm_audio = b''.join(audio_chunks)
wav_audio = pcm_to_wav(pcm_audio, sample_rate=24000)
```

### Frontend Audio Playback

```javascript
// Convert base64 WAV to playable blob
const base64ToBlob = (base64, mimeType) => {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
};

const audioBlob = base64ToBlob(response.audio_data, 'audio/wav');
const audioUrl = URL.createObjectURL(audioBlob);
const player = new Audio(audioUrl);
player.onended = () => URL.revokeObjectURL(audioUrl);
player.onerror = () => URL.revokeObjectURL(audioUrl);
// Invoke from a user gesture and handle autoplay rejection/teardown.
player.play().catch(() => URL.revokeObjectURL(audioUrl));
```

## Historical voice examples (verify deployment support)

| Voice | Character |
|-------|-----------|
| alloy | Neutral |
| echo | Warm |
| fable | Expressive |
| onyx | Deep |
| nova | Friendly |
| shimmer | Clear |

## Realtime API Events

- `response.output_audio.delta` - Base64 audio chunk
- `response.output_audio_transcript.delta` - Transcript text
- `response.done` - Generation complete
- `error` - Handle with `event.error.message`

## Audio Format

- **Input**: Text prompt
- **Output**: PCM audio (24kHz, 16-bit, mono)
- **Storage**: Base64-encoded WAV

## References

- **Full architecture**: See references/architecture.md for complete stack design
- **Code examples**: See references/code-examples.md for integration sketches
- **PCM conversion**: Use scripts/pcm_to_wav.py for audio format conversion

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Generation boundaries

Unexecuted SDK/service sketches: deployment name, available voices, GA versus preview
session/auth format and SDK versions must match the actual Azure resource. The voice
table is not a current Realtime support list. Configure explicit PCM output before
interpreting bytes as 24kHz signed 16-bit mono; reject incomplete/empty output.
The examples omit a mandatory total generation timeout (e.g. 60 seconds), per-event
and accumulated audio/text limits (e.g. 32 MiB), cancel/close paths and spend quotas;
implement them before serving requests. A response.done event alone does not mean
success. Do not store partial output as a complete narrative.

Authorize source objects AND audio generation/list/stream ownership per tenant; IDs
are not access control. The DB methods/models/routes, settings and frontend API are
application adapters, not bundled implementations. Treat source text as data, preserve
source attribution, verify narration accuracy and obtain rights/consent before sending
private text to Azure or publishing synthetic speech. Never impersonate a real person
without permission; disclose generated speech where required. Store keys backend-only
and audio/transcripts privately with retention limits. Model-generated text is not
HTML. Frontend play/pause requires actual pause handling, promise errors, finally
loading reset, URL revocation and teardown; the React sketch omits those controls.

PCM helper usage: `python3 <skill-dir>/scripts/pcm_to_wav.py input.pcm output.wav` refuses overwrites and incomplete frames; it does not detect whether arbitrary bytes really are the declared PCM format.
