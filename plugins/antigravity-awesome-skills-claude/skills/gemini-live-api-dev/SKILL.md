---
name: gemini-live-api-dev
description: Use this skill when building real-time, bidirectional streaming applications with the Gemini Live API. Covers WebSocket-based audio/video/text streaming, voice activity detection (VAD), native audio features, function calling, session management, ephemeral tokens for client-side auth,...
risk: unknown
source: https://github.com/google-gemini/gemini-skills/tree/main/skills/gemini-live-api-dev
source_repo: google-gemini/gemini-skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/google-gemini/gemini-skills/blob/main/LICENSE
---

# Gemini Live API Development Skill
## When to Use

Use this skill when building real-time, bidirectional streaming applications with the Gemini Live API. Covers WebSocket-based audio/video/text streaming, voice activity detection (VAD), native audio features, function calling, session management, ephemeral tokens for client-side auth,...


## Overview

The Live API enables **low-latency, real-time voice and video interactions** with Gemini over WebSockets. It processes continuous streams of audio, video, or text to deliver immediate, human-like spoken responses.

Key capabilities:
- **Bidirectional audio streaming** — real-time mic-to-speaker conversations
- **Video streaming** — send camera/screen frames alongside audio
- **Text input/output** — send and receive text within a live session
- **Audio transcriptions** — get text transcripts of both input and output audio
- **Voice Activity Detection (VAD)** — automatic interruption handling
- **Native audio** — thinking (with configurable `thinkingLevel`)
- **Function calling** — synchronous tool use
- **Google Search grounding** — ground responses in real-time search results
- **Session management** — context compression, session resumption, GoAway signals
- **Ephemeral tokens** — secure client-side authentication

> [!NOTE]
> The Live API currently **only supports WebSockets**. For WebRTC support or simplified integration, use a [partner integration](#partner-integrations).

## Models

- `gemini-3.1-flash-live-preview` — Optimized for low-latency, real-time dialogue. Native audio output, thinking (via `thinkingLevel`). 128k context window. **This is the recommended model for all Live API use cases.**
- `gemini-3.5-live-translate-preview` — Real-time streaming translation model.

> [!WARNING]
> The following Live API models are **deprecated** and will be shut down. Migrate to `gemini-3.1-flash-live-preview`.
> - `gemini-2.5-flash-native-audio-preview-12-2025` — Migrate to `gemini-3.1-flash-live-preview`.
> - `gemini-live-2.5-flash-preview` — Released June 17, 2025. Shutdown: December 9, 2025.
> - `gemini-2.0-flash-live-001` — Released April 9, 2025. Shutdown: December 9, 2025.

## SDKs

- **Python**: `google-genai` — `pip install google-genai`
- **JavaScript/TypeScript**: `@google/genai` — `npm install @google/genai`

> [!WARNING]
> Legacy SDKs `google-generativeai` (Python) and `@google/generative-ai` (JS) are deprecated. Use the new SDKs above.

## Partner Integrations

To streamline real-time audio/video app development, use a third-party integration supporting the Gemini Live API over **WebRTC** or **WebSockets**:

- [LiveKit](https://docs.livekit.io/agents/models/realtime/plugins/gemini/) — Use the Gemini Live API with LiveKit Agents.
- [Pipecat by Daily](https://docs.pipecat.ai/guides/features/gemini-live) — Create a real-time AI chatbot using Gemini Live and Pipecat.
- [Fishjam by Software Mansion](https://docs.fishjam.io/tutorials/gemini-live-integration) — Create live video and audio streaming applications with Fishjam.
- [Vision Agents by Stream](https://visionagents.ai/integrations/gemini) — Build real-time voice and video AI applications with Vision Agents.
- [Voximplant](https://voximplant.com/products/gemini-client) — Connect inbound and outbound calls to Live API with Voximplant.
- [Firebase AI SDK](https://firebase.google.com/docs/ai-logic/live-api?api=dev) — Get started with the Gemini Live API using Firebase AI Logic.

## Audio Formats

- **Input**: Raw PCM, little-endian, 16-bit, mono. 16kHz native (will resample others). MIME type: `audio/pcm;rate=16000`
- **Output**: Raw PCM, little-endian, 16-bit, mono. 24kHz sample rate.

> [!IMPORTANT]
> Use `send_realtime_input` / `sendRealtimeInput` for all real-time user input (audio, video, **and text**). `send_client_content` / `sendClientContent` is **only** supported for seeding initial context history (requires setting `initial_history_in_client_content` in `history_config`). Do **not** use it to send new user messages during the conversation.

> [!WARNING]
> Do **not** use `media` in `sendRealtimeInput`. Use the specific keys: `audio` for audio data, `video` for images/video frames, and `text` for text input.

---

## Quick Start

### Authentication

#### Python

```python
from google import genai

client = genai.Client(api_key="YOUR_API_KEY")
```

#### JavaScript

```js
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'YOUR_API_KEY' });
```

### Connecting to the Live API

#### Python
```python
from google.genai import types

config = types.LiveConnectConfig(
    response_modalities=[types.Modality.AUDIO],
    system_instruction=types.Content(
        parts=[types.Part(text="You are a helpful assistant.")]
    )
)

async with client.aio.live.connect(model="gemini-3.1-flash-live-preview", config=config) as session:
    pass  # Session is active
```

#### JavaScript
```js
const session = await ai.live.connect({
  model: 'gemini-3.1-flash-live-preview',
  config: {
    responseModalities: ['audio'],
    systemInstruction: { parts: [{ text: 'You are a helpful assistant.' }] }
  },
  callbacks: {
    onopen: () => console.log('Connected'),
    onmessage: (response) => console.log('Message:', response),
    onerror: (error) => console.error('Error:', error),
    onclose: () => console.log('Closed')
  }
});
```

### Sending Text

#### Python
```python
await session.send_realtime_input(text="Hello, how are you?")
```

#### JavaScript
```js
session.sendRealtimeInput({ text: 'Hello, how are you?' });
```

### Sending Audio

#### Python
```python
await session.send_realtime_input(
    audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
)
```

#### JavaScript
```js
session.sendRealtimeInput({
  audio: { data: chunk.toString('base64'), mimeType: 'audio/pcm;rate=16000' }
});
```

### Sending Video

#### Python
```python
# frame: raw JPEG-encoded bytes
await session.send_realtime_input(
    video=types.Blob(data=frame, mime_type="image/jpeg")
)
```

#### JavaScript
```js
session.sendRealtimeInput({
  video: { data: frame.toString('base64'), mimeType: 'image/jpeg' }
});
```

### Receiving Audio and Text

> [!IMPORTANT]
> A single server event can contain **multiple content parts simultaneously** (e.g., audio chunks and transcript). Always process **all** parts in each event to avoid missing content.

#### Python
```python
async for response in session.receive():
    content = response.server_content
    if content:
        # Audio — process ALL parts in each event
        if content.model_turn:
            for part in content.model_turn.parts:
                if part.inline_data:
                    audio_data = part.inline_data.data
        # Transcription
        if content.input_transcription:
            print(f"User: {content.input_transcription.text}")
        if content.output_transcription:
            print(f"Gemini: {content.output_transcription.text}")
        # Interruption
        if content.interrupted is True:
            pass  # Stop playback, clear audio queue
```

#### JavaScript
```js
// Inside the onmessage callback
const content = response.serverContent;
if (content?.modelTurn?.parts) {
  for (const part of content.modelTurn.parts) {
    if (part.inlineData) {
      const audioData = part.inlineData.data; // Base64 encoded
    }
  }
}
if (content?.inputTranscription) console.log('User:', content.inputTranscription.text);
if (content?.outputTranscription) console.log('Gemini:', content.outputTranscription.text);
if (content?.interrupted) { /* Stop playback, clear audio queue */ }
```

---

## Live Translation (Gemini Live Translate)

The Live API supports real-time, low-latency streaming translation of speech (audio) across 70+ languages. For full details on options and capabilities, see the [Live Translate Guide](https://ai.google.dev/gemini-api/docs/live-api/live-translate.md.txt).

### Model
- `gemini-3.5-live-translate-preview` — The recommended translation model for all Live Translate use cases.

### Configuration (`TranslationConfig`)

To enable translation, specify a `TranslationConfig` object inside your live session setup:

- **Python SDK**: Configure the connection using `translation_config` on `LiveConnectConfig`:
  ```python
  config = types.LiveConnectConfig(
      response_modalities=[types.Modality.AUDIO],
      translation_config=types.TranslationConfig(
          target_language_code="es",  # Target language code (e.g. es, fr, pl)
          echo_target_language=True,
      ),
      input_audio_transcription=types.AudioTranscriptionConfig(),
      output_audio_transcription=types.AudioTranscriptionConfig(),
  )
  ```
- **Raw WebSockets**: Place `translationConfig` inside `generationConfig`:
  ```json
  {
    "setup": {
      "model": "models/gemini-3.5-live-translate-preview",
      "generationConfig": {
        "responseModalities": ["AUDIO"],
        "translationConfig": {
          "targetLanguageCode": "es",
          "echoTargetLanguage": true
        }
      }
    }
  }
  ```

---

## Limitations

- **Response modality** — Only `TEXT` **or** `AUDIO` per session, not both. Native audio models only support audio.
- **Audio-only session** — 15 min without compression
- **Audio+video session** — 2 min without compression
- **Connection lifetime** — ~10 min (use session resumption)
- **Context window** — 128k tokens (native audio) / 32k tokens (standard)
- **Async function calling** — Not yet supported; function calling is synchronous only. The model will not start responding until you've sent the tool response.
- **Proactive audio** — Not yet supported in Gemini 3.1 Flash Live. Remove any configuration for this feature.
- **Affective dialogue** — Not yet supported in Gemini 3.1 Flash Live. Remove any configuration for this feature.
- **Code execution** — Not supported
- **URL context** — Not supported

## Migrating from Gemini 2.5 Flash Live

When migrating from `gemini-2.5-flash-native-audio-preview-12-2025` to `gemini-3.1-flash-live-preview`:

1. **Model string** — Update from `gemini-2.5-flash-native-audio-preview-12-2025` to `gemini-3.1-flash-live-preview`.
2. **Thinking configuration** — Use `thinkingLevel` (`minimal`, `low`, `medium`, `high`) instead of `thinkingBudget`. Default is `minimal` for lowest latency.
3. **Server events** — A single event can contain multiple content parts simultaneously (audio + transcript). Process **all** parts in each event.
4. **Client content** — `send_client_content` is only for seeding initial context history (set `initial_history_in_client_content` in `history_config`). Use `send_realtime_input` for text during conversation.
5. **Turn coverage** — Defaults to `TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO` instead of `TURN_INCLUDES_ONLY_ACTIVITY`. If sending constant video frames, consider sending only during audio activity to reduce costs.
6. **Async function calling** — Not yet supported. Function calling is synchronous only.
7. **Proactive audio & affective dialogue** — Not yet supported. Remove any configuration for these features.

## Best Practices

1. **Use headphones** when testing mic audio to prevent echo/self-interruption
2. **Enable context window compression** for sessions longer than 15 minutes
3. **Implement session resumption** to handle connection resets gracefully
4. **Use ephemeral tokens** for client-side deployments — never expose API keys in browsers
5. **Use `send_realtime_input`** for all real-time user input (audio, video, text). Reserve `send_client_content` only for seeding initial context history
6. **Send `audioStreamEnd`** when the mic is paused to flush cached audio
7. **Clear audio playback queues** on interruption signals
8. **Process all parts** in each server event — events can contain multiple content parts

## Documentation Lookup

### When MCP is Installed (Preferred)

If the **`search_docs`** tool (from the Google MCP server) is available, use it as your **only** documentation source:

1. Call `search_docs` with your query
2. Read the returned documentation
3. **Trust MCP results** as source of truth for API details — they are always up-to-date.

> [!IMPORTANT]
> When MCP tools are present, **never** fetch URLs manually. MCP provides up-to-date, indexed documentation that is more accurate and token-efficient than URL fetching.

### When MCP is NOT Installed (Fallback Only)

If no MCP documentation tools are available, fetch from the official docs index:

**llms.txt URL**: `https://ai.google.dev/gemini-api/docs/llms.txt`

This index contains links to all documentation pages in `.md.txt` format. Use web fetch tools to:

1. Fetch `llms.txt` to discover available documentation pages
2. Fetch specific pages (e.g., `https://ai.google.dev/gemini-api/docs/live-session.md.txt`)

### Key Documentation Pages

> [!IMPORTANT]
> Those are not all the documentation pages. Use the `llms.txt` index to discover available documentation pages

- [Live API Overview](https://ai.google.dev/gemini-api/docs/live.md.txt) — getting started, raw WebSocket usage
- [Live Translate](https://ai.google.dev/gemini-api/docs/live-api/live-translate.md.txt) — configuration options and capabilities for translation
- [Live API Capabilities Guide](https://ai.google.dev/gemini-api/docs/live-guide.md.txt) — voice config, transcription config, native audio (thinking), VAD configuration, media resolution
- [Live API Tool Use](https://ai.google.dev/gemini-api/docs/live-tools.md.txt) — function calling (sync and async), Google Search grounding
- [Session Management](https://ai.google.dev/gemini-api/docs/live-session.md.txt) — context window compression, session resumption, GoAway signals
- [Ephemeral Tokens](https://ai.google.dev/gemini-api/docs/ephemeral-tokens.md.txt) — secure client-side authentication for browser/mobile
- [WebSockets API Reference](https://ai.google.dev/api/live.md.txt) — raw WebSocket protocol details

## Supported Languages

The Live API supports 70 languages including: English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Hindi, Arabic, Russian, and many more. Native audio models automatically detect and switch languages.
