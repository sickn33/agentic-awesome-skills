---
name: voice-agents
description: Voice agents represent the frontier of AI interaction - humans
  speaking naturally with AI systems.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Voice Agents

Voice agents represent the frontier of AI interaction - humans speaking
naturally with AI systems. The challenge isn't just speech recognition
and synthesis, it's achieving natural conversation flow with sub-800ms
latency while handling interruptions, background noise, and emotional
nuance.

This skill covers two architectures: speech-to-speech (OpenAI Realtime API,
one low-latency architecture option) and pipeline (STT→LLM→TTS, more control,
easier to debug). Key insight: latency is the constraint. Humans expect
responses in 500ms. Every millisecond matters.

No market-adoption statistic or universal latency benchmark is established by this skill.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Legacy Pipeline Sketch (not a production implementation)
```
import { Deepgram } from '@deepgram/sdk';
import { ElevenLabsClient } from 'elevenlabs';
import OpenAI from 'openai';

// Initialize clients
const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
const elevenlabs = new ElevenLabsClient();
const openai = new OpenAI();

async function processVoiceInput(audioStream) {
  // 1. Speech-to-Text (Deepgram Nova-3)
  const transcription = await deepgram.transcription.live({
    model: 'nova-3',
    punctuate: true,
    endpointing: 300,  // ms of silence before end
  });

  transcription.on('transcript', async (data) => {
    if (data.is_final && data.speech_final) {
      const userText = data.channel.alternatives[0].transcript;
      // Do not log raw private transcripts by default.

      // 2. LLM Processing
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise voice assistant.' },
          { role: 'user', content: userText }
        ],
        max_tokens: 150,  // Keep responses short for voice
      });

      const agentText = completion.choices[0].message.content;
      // Log only authorized redacted operational metadata.

      // 3. Text-to-Speech (ElevenLabs)
      const audioStream = await elevenlabs.textToSpeech.stream({
        voice_id: 'voice_id_here',
        text: agentText,
        model_id: 'eleven_flash_v2_5',  // Lowest latency
      });

      // Stream to user
      playAudioStream(audioStream);
    }
  });

  // Pipe audio to transcription
  audioStream.pipe(transcription);
}
```

### Optimization Tips:
- Start TTS while LLM still generating (streaming)
- Pre-compute first response segment during user speech
- Use Flash/turbo models for latency

### Voice Activity Detection Pattern

Detect when user starts/stops speaking

**When to use**: All voice agents need VAD for turn-taking

# VOICE ACTIVITY DETECTION (VAD):

```
VAD Types:
1. Energy-based: Simple, fast, noise-sensitive
2. Model-based: Silero VAD, more accurate
3. Semantic VAD: Understands meaning, best for conversation
```

## When to Use
- User mentions or implies: voice agent
- User mentions or implies: speech to text
- User mentions or implies: text to speech
- User mentions or implies: whisper
- User mentions or implies: elevenlabs
- User mentions or implies: deepgram
- User mentions or implies: realtime api
- User mentions or implies: voice assistant
- User mentions or implies: voice ai
- User mentions or implies: conversational ai
- User mentions or implies: tts
- User mentions or implies: stt
- User mentions or implies: asr

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Version, privacy and implementation boundaries

These mixed-version SDK sketches are conceptual and were not executed. Deepgram constructor/transcription.live, ElevenLabs stream signatures, the beta Realtime client and the named Silero JavaScript package must be checked against the installed official SDKs before use; do not infer missing package/runtime availability. smart_format formats text and is not noise reduction; model keyword/keyterm flags vary. A model-VAD probability threshold cannot be set from raw amplitude without a calibrated mapping. Confidence scores/latency figures are not universally comparable.

Define end-of-user-turn to first audible output and measure p50/p95 on representative devices/networks/languages. STT first partial, LLM first token and TTS first audio times are not simply additive end-to-end guarantees. Do not send partial/stale hypotheses to irreversible tools: serialize turns, deduplicate final transcripts, buffer complete TTS-safe segments, maintain history, and cancel/discard obsolete generation/audio. On barge-in truncate unheard assistant content in server history as well as stopping local playback; a checkpoint alone is insufficient.

Clients need appropriate ephemeral/session credentials, not long-lived API keys. Obtain authorized microphone/recording/voice/recipient scope, minimize audio/transcript retention and external-provider transfers, and avoid voice cloning/impersonation without rights. Bound sockets, retries, queues and costs; clean up listeners/streams on disconnect. Spoken names/numbers and claimed identity are not authentication. Validate tenant/recipient/action and obtain transaction-specific confirmation where needed. Text cleanup must preserve decimal numbers, currency, URLs and code semantics; SSML requires supported engines and escaping. A voice prompt is not a tool-authorization boundary. No call, recording or provider request was made.
