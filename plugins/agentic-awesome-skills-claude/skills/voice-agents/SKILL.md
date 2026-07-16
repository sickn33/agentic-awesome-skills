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
lowest latency, most natural) and pipeline (STT→LLM→TTS, more control,
easier to debug). Key insight: latency is the constraint. Humans expect
responses in 500ms. Every millisecond matters.

84% of organizations are increasing voice AI budgets in 2025. This is the
year voice agents go mainstream.

## Principles

- Latency is the constraint - target <800ms end-to-end
- Jitter (variance) matters as much as absolute latency
- VAD quality determines conversation flow
- Interruption handling makes or breaks the experience
- Start with focused MVP, iterate based on real conversations
- Combine best-in-class components (Deepgram STT + ElevenLabs TTS)

## Capabilities

- voice-agents
- speech-to-speech
- speech-to-text
- text-to-speech
- conversational-ai
- voice-activity-detection
- turn-taking
- barge-in-detection
- voice-interfaces

## Scope

- phone-system-integration → backend
- audio-processing-dsp → audio-specialist
- music-generation → audio-specialist
- accessibility-compliance → accessibility-specialist

## Tooling

### Speech_to_speech

- OpenAI Realtime API - When: Lowest latency, most natural conversation Note: gpt-4o-realtime-preview, native voice, sub-500ms
- Pipecat - When: Open-source voice orchestration Note: Daily-backed, enterprise-grade, modular

### Speech_to_text

- OpenAI Whisper - When: Highest accuracy, multilingual Note: gpt-4o-transcribe for best results
- Deepgram Nova-3 - When: Production workloads, 54% lower WER Note: 150-184ms TTFT, 90%+ accuracy on noisy audio
- AssemblyAI - When: Real-time streaming, speaker diarization Note: Good accuracy-latency balance

### Text_to_speech

- ElevenLabs - When: Most natural voice, emotional control Note: Flash model 75ms latency, V3 for expression
- OpenAI TTS - When: Integrated with OpenAI stack Note: gpt-4o-mini-tts, 13 voices, streaming
- Deepgram Aura-2 - When: Cost-effective production TTS Note: 40% cheaper than ElevenLabs, 184ms TTFB

### Frameworks

- Pipecat - When: Open-source voice agent orchestration Note: Silero VAD, SmartTurn, interruption handling
- Vapi - When: Managed voice agent platform Note: No infrastructure management
- Retell AI - When: Low-latency voice agents Note: Best context preservation on interruption

## Patterns

### Speech-to-Speech Architecture

Direct audio-to-audio processing for lowest latency

**When to use**: Maximum naturalness, emotional preservation, real-time conversation

# SPEECH-TO-SPEECH ARCHITECTURE:

"""
[User Audio] → [S2S Model] → [Agent Audio]

Advantages:
- Lowest latency (sub-500ms)
- Preserves emotion, emphasis, accents
- Most natural conversation flow

Disadvantages:
- Less control over responses
- Harder to debug/audit
- Can't easily modify what's said
"""

## OpenAI Realtime API
"""
import { RealtimeClient } from '@openai/realtime-api-beta';

const client = new RealtimeClient({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure for voice conversation
client.updateSession({
  modalities: ['text', 'audio'],
  voice: 'alloy',
  input_audio_format: 'pcm16',
  output_audio_format: 'pcm16',
  instructions: `You are a helpful customer service agent.
    Be concise and friendly. If you don't know something,
    say so rather than making things up.`,
  turn_detection: {
    type: 'server_vad',  // or 'semantic_vad'
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  },
});

// Handle audio streams
client.on('conversation.item.input_audio_transcription', (event) => {
  console.log('User said:', event.transcript);
});

client.on('response.audio.delta', (event) => {
  // Stream audio to speaker
  audioPlayer.write(Buffer.from(event.delta, 'base64'));
});

// Send user audio
client.appendInputAudio(audioBuffer);
"""

### Use Cases:
- Real-time customer support
- Voice assistants
- Interactive voice response (IVR)
- Live language translation

### Pipeline Architecture

Separate STT → LLM → TTS for maximum control

**When to use**: Need to know/control exactly what's said, debugging, compliance

# PIPELINE ARCHITECTURE:

"""
[Audio] → [STT] → [Text] → [LLM] → [Text] → [TTS] → [Audio]

Advantages:
- Full control at each step
- Can log/audit all text
- Easier to debug
- Mix best-in-class components

Disadvantages:
- Higher latency (700-1200ms typical)
- Loses some emotion/nuance
- More components to manage
"""

## Production Pipeline Example
"""
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
      console.log('User:', userText);

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
      console.log('Agent:', agentText);

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
"""

### Optimization Tips:
- Start TTS while LLM still generating (streaming)
- Pre-compute first response segment during user speech
- Use Flash/turbo models for latency

### Voice Activity Detection Pattern

Detect when user starts/stops speaking

**When to use**: All voice agents need VAD for turn-taking

# VOICE ACTIVITY DETECTION (VAD):

"""
VAD Types:
1. Energy-based: Simple, fast, noise-sensitive
2. Model-based: Silero VAD, more accurate
3. Semantic VAD: Understands meaning, best for conversation
"""

## Silero VAD (Popular Open Source)
"""
import { SileroVAD } from '@pipecat-ai/silero-vad';

const vad = new SileroVAD({
  threshold: 0.5,           // Speech probability threshold
  min_speech_duration: 250, // ms before speech confirmed
  min_silence_duration: 500, // ms of silence = end of turn
});

vad.on('speech_start', () => {
  console.log('User started speaking');
  // Stop any playing TTS (barge-in)
  audioPlayer.stop();
});

vad.on('speech_end', () => {
  console.log('User finished speaking');
  // Trigger response generation
  processTranscript();
});

// Feed audio to VAD
audioStream.on('data', (chunk) => {
  vad.process(chunk);
});
"""

## OpenAI Semantic VAD
"""
// In Realtime API session config
client.updateSession({
  turn_detection: {
    type: 'semantic_vad',  // Uses meaning, not just silence
    // Model waits longer after "ummm..."
    // Responds faster after "Yes, that's correct."
  },
});
"""

## Barge-In Handling
"""
// When user interrupts:
function handleBargeIn() {
  // 1. Stop TTS immediately
  audioPlayer.stop();

  // 2. Cancel pending LLM generation
  llmController.abort();

  // 3. Reset state
  conversationState.checkpoint();

  // 4. Listen to new input
  startListening();
}

// VAD triggers barge-in
vad.on('speech_start', () => {
  if (audioPlayer.isPlaying) {
    handleBargeIn();
  }
});
"""

### Latency Optimization Pattern

Achieving <800ms end-to-end response time

**When to use**: Production voice agents

# LATENCY OPTIMIZATION:

"""
Target Metrics:
- End-to-end: <800ms (ideal: <500ms)
- Time-to-First-Token (TTFT): <300ms
- Barge-in response: <200ms
- Jitter variance: <100ms std dev
"""

## Pipeline Latency Breakdown
"""
Typical breakdown:
- VAD processing: 50-100ms
- STT first result: 150-200ms
- LLM TTFT: 100-300ms
- TTS TTFA: 75-200ms
- Audio buffering: 50-100ms

Total: 425-900ms
"""

## Optimization Strategies

### 1. Streaming Everything
"""
// Stream STT results as they come
stt.on('partial_transcript', (text) => {
  // Start processing before final transcript
  llmPreprocessor.prepare(text);
});

// Stream LLM output to TTS
const llmStream = await openai.chat.completions.create({
  stream: true,
  // ...
});

for await (const chunk of llmStream) {
  tts.appendText(chunk.choices[0].delta.content);
}
"""

### 2. Pre-computation
"""
// While user is speaking, predict and prepare
stt.on('partial_transcript', async (text) => {
  // Pre-fetch relevant context
  const context = await retrieveContext(text);

  // Pre-compute likely first sentence
  const firstSentence = await generateOpener(context);
});
"""

### 3. Use Low-Latency Models
"""
// STT: Deepgram Nova-3 (150ms TTFT)
// LLM: gpt-4o-mini (fastest GPT-4 class)
// TTS: ElevenLabs Flash (75ms) or Deepgram Aura-2 (184ms)
"""

### 4. Edge Deployment
"""
// Run inference closer to user
// - Cloud regions near user
// - Edge computing for VAD/STT
// - WebSocket over HTTP for lower overhead
"""

### Conversation Design Pattern

Designing natural voice conversations

**When to use**: Building voice UX

# CONVERSATION DESIGN:

## Voice-First Principles
"""
Voice is different from text:
- No undo button - say it right the first time
- Linear - user can't scroll back
- Ephemeral - easy to miss information
- Emotional - tone matters as much as words
"""

## Response Design
"""
# Keep responses short (10-20 seconds max)
# Front-load the answer
# Use signposting for lists

Bad: "I found several options. The first is... second is..."
Good: "I found 3 options. Want me to go through them?"

# Confirm understanding
Bad: "I'll transfer $500 to John."
Good: "So that's $500 to John Smith. Should I proceed?"
"""

## Prompting for Voice
"""
system_prompt = '''
You are a voice assistant. Follow these rules:

1. Be concise - keep responses under 30 words
2. Use natural speech - contractions, casual language
3. Never use formatting (bullets, numbers in lists)
4. Spell out numbers and abbreviations
5. End with a question to keep conversation flowing
6. If unclear, ask for clarification
7. Never say "I'm an AI" unless asked

Good: "Got it. I'll set that reminder for three pm. Anything else?"
Bad: "I have set a reminder for 3:00 PM. Is there anything else I can assist you with today?"
'''
"""

## Error Recovery
"""
// Handle recognition errors gracefully
const errorResponses = {
  no_speech: "I didn't catch that. Could you say it again?",
  unclear: "Sorry, I'm not sure I understood. You said [repeat]. Is that right?",
  timeout: "Still there? I'm here when you're ready.",
};

// Always offer human fallback for complex issues
if (confidenceScore < 0.6) {
  response = "I want to make sure I get this right. Would you like to speak with a human agent?";
}
"""

## Sharp Edges

### Response Latency Exceeds 800ms

Severity: CRITICAL

Situation: Building a voice agent pipeline

Symptoms:
Conversations feel awkward. Users repeat themselves. "Are you
there?" questions. Users hang up or give up. Low satisfaction
scores despite correct answers.

Why this breaks:
In human conversation, responses typically arrive within 500ms.
Anything over 800ms feels like the agent is slow or confused.
Users lose confidence and patience. Every component adds latency:
VAD (100ms) + STT (200ms) + LLM (300ms) + TTS (200ms) = 800ms.

Recommended fix:

# Measure and budget latency for each component:

### Target latencies:
- VAD processing: <100ms
- STT time-to-first-token: <200ms
- LLM time-to-first-token: <300ms
- TTS time-to-first-audio: <150ms
- Total end-to-end: <800ms

### Optimization strategies:

1. Use low-latency models:
   - STT: Deepgram Nova-3 (150ms) vs Whisper (500ms+)
   - TTS: ElevenLabs Flash (75ms) vs standard (200ms+)
   - LLM: gpt-4o-mini streaming

2. Stream everything:
   - Don't wait for full STT transcript
   - Stream LLM output to TTS
   - Start audio playback before TTS finishes

3. Pre-compute:
   - While user speaks, prepare context
   - Generate opening phrase in parallel

4. Edge deployment:
   - Run VAD/STT at edge
   - Use nearest cloud region

### Measure continuously:
Log timestamps at each stage, track P50/P95 latency

### Response Time Variance Disrupts Rhythm

Severity: HIGH

Situation: Voice agent with inconsistent response times

Symptoms:
Conversations feel unpredictable. User doesn't know when to speak.
Sometimes agent responds immediately, sometimes after long pause.
Users talk over agent. Agent talks over users.

Why this breaks:
Jitter (variance in response time) disrupts conversational rhythm
more than absolute latency. Consistent 800ms feels better than
alternating 400ms and 1200ms. Users can't adapt to unpredictable
timing.

Recommended fix:

# Target jitter metrics:
- Standard deviation: <100ms
- P95-P50 gap: <200ms

### Reduce jitter sources:

1. Consistent model loading:
   - Keep models warm
   - Pre-load on connection start

2. Buffer audio output:
   - Small buffer (50-100ms) smooths playback
   - Don't start playing until buffer filled

3. Handle LLM variance:
   - gpt-4o-mini more consistent than larger models
   - Set max_tokens to limit long responses

4. Monitor and alert:
   - Track response time distribution
   - Alert on jitter spikes

### Implementation:
const MIN_RESPONSE_TIME = 400;  // ms

async function respondWithConsistentTiming(text) {
  const startTime = Date.now();
  const audio = await generateSpeech(text);

  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME) {
    await delay(MIN_RESPONSE_TIME - elapsed);
  }

  playAudio(audio);
}

### Using Silence Duration for Turn Detection

Severity: HIGH

Situation: Detecting when user finishes speaking

Symptoms:
Agent interrupts user mid-thought. Or waits too long after user
finishes. "Let me think..." triggers premature response. Short
answers have awkward pause before response.

Why this breaks:
Simple silence detection (e.g., "end turn after 500ms silence")
doesn't understand conversation. Humans pause mid-sentence.
"Yes." needs fast response, "Well, let me think about that..."
needs patience. Fixed timeout fits neither.

Recommended fix:

# Use semantic VAD:

### OpenAI Semantic VAD:
client.updateSession({
  turn_detection: {
    type: 'semantic_vad',
    // Waits longer after "umm..."
    // Responds faster after "Yes, that's correct."
  },
});

### Pipecat SmartTurn:
const pipeline = new Pipeline({
  vad: new SileroVAD(),
  turnDetection: new SmartTurn(),
});

// SmartTurn considers:
// - Speech content (complete sentence?)
// - Prosody (falling intonation?)
// - Context (question asked?)

### Fallback: Adaptive silence threshold:
function calculateSilenceThreshold(transcript) {
  const endsWithComplete = transcript.match(/[.!?]$/);
  const hasFillers = transcript.match(/um|uh|like|well/i);

  if (endsWithComplete && !hasFillers) {
    return 300;  // Fast response
  } else if (hasFillers) {
    return 1500;  // Wait for continuation
  }
  return 700;  // Default
}

### Agent Doesn't Stop When User Interrupts

Severity: HIGH

Situation: User tries to interrupt agent mid-sentence

Symptoms:
Agent talks over user. User has to wait for agent to finish.
Frustrating experience. Users give up and abandon call.
"STOP! STOP!" doesn't work.

Why this breaks:
Without barge-in handling, the TTS plays to completion regardless
of user input. This violates basic conversational norms - in human
conversation, we stop when interrupted.

Recommended fix:

# Implement barge-in detection:

### Basic barge-in:
vad.on('speech_start', () => {
  if (ttsPlayer.isPlaying) {
    // 1. Stop audio immediately
    ttsPlayer.stop();

    // 2. Cancel pending TTS generation
    ttsController.abort();

    // 3. Checkpoint conversation state
    conversationState.save();

    // 4. Listen to new input
    startTranscription();
  }
});

### Advanced: Distinguish interruption types:
vad.on('speech_start', async () => {
  if (!ttsPlayer.isPlaying) return;

  // Wait 200ms to get first words
  await delay(200);
  const firstWords = getTranscriptSoFar();

  if (isBackchannel(firstWords)) {
    // "uh-huh", "yeah" - don't interrupt
    return;
  }

  if (isClarification(firstWords)) {
    // "What?", "Sorry?" - repeat last sentence
    repeatLastSentence();
  } else {
    // Real interruption - stop and listen
    handleFullInterruption();
  }
});

### Response time target:
- Barge-in response: <200ms
- User should feel heard immediately

### Generating Text-Length Responses for Voice

Severity: MEDIUM

Situation: Prompting LLM for voice agent responses

Symptoms:
Agent rambles. Users lose track of information. "Can you repeat
that?" requests. Users interrupt to ask for shorter version.
Low comprehension of conveyed information.

Why this breaks:
Text can be scanned and re-read. Voice is linear and ephemeral.
A 3-paragraph response that works in chat is overwhelming in voice.
Users can only hold ~7 items in working memory.

Recommended fix:

# Constrain response length in prompts:

system_prompt = '''
You are a voice assistant. Keep responses UNDER 30 WORDS.
For complex information, break into chunks and confirm
understanding between each.

Instead of: "Here are the three options. First, you could...
Second... Third..."

Say: "I found 3 options. Want me to go through them?"

Never list more than 3 items without pausing for confirmation.
'''

### Enforce at generation:
const response = await openai.chat.completions.create({
  max_tokens: 100,  // Hard limit
  // ...
});

### Chunking pattern:
if (information.length > 3) {
  response = `I have ${information.length} items. Let's go through them one at a time. First: ${information[0]}. Ready for the next?`;
}

### Progressive disclosure:
"I found your account. Want the balance, recent transactions, or something else?"
// Don't dump all info at once

### Using Bullets/Numbers/Markdown in Voice

Severity: MEDIUM

Situation: Formatting LLM output for voice

Symptoms:
"First bullet point: item one" read aloud. Numbers read as "one
two three" instead of "one, two, three." Markdown artifacts in
speech. Robotic, unnatural delivery.

Why this breaks:
TTS models read what they're given. Text formatting intended for
visual display sounds robotic when read aloud. Users can't "see"
structure in audio.

Recommended fix:

# Prompt for spoken format:

system_prompt = '''
Format responses for SPOKEN delivery:
- No bullet points, numbered lists, or markdown
- Spell out numbers: "twenty-three" not "23"
- Spell out abbreviations: "United States" not "US"
- Use verbal signposting: "There are three things. First..."
- Never use asterisks, dashes, or special characters
'''

### Post-processing:
function prepareForSpeech(text) {
  return text
    // Remove markdown
    .replace(/[*_#`]/g, '')
    // Convert numbers
    .replace(/\d+/g, numToWords)
    // Expand abbreviations
    .replace(/\betc\b/gi, 'et cetera')
    .replace(/\be\.g\./gi, 'for example')
    // Add pauses
    .replace(/\. /g, '... ')
    .replace(/, /g, '... ');
}

### SSML for precise control:
<speak>
  The total is <say-as interpret-as="currency">$49.99</say-as>.
  <break time="500ms"/>
  Want to proceed?
</speak>

### VAD/STT Fails in Noisy Environments

Severity: MEDIUM

Situation: Users in cars, cafes, outdoors

Symptoms:
"I didn't catch that" frequently. Background noise triggers
false starts. Fan/AC causes continuous listening. Car engine
noise confuses STT.

Why this breaks:
Default VAD thresholds work for quiet environments. Real-world
usage includes background noise that triggers false positives
or masks speech, causing false negatives.

Recommended fix:

# Implement noise handling:

### 1. Noise reduction in STT:
const transcription = await deepgram.transcription.live({
  model: 'nova-3',
  noise_reduction: true,
  // or
  smart_format: true,
});

### 2. Adaptive VAD threshold:
// Measure ambient noise level
const ambientLevel = measureAmbientNoise(5000);  // 5 sec sample

vad.setThreshold(ambientLevel * 1.5);  // Above ambient

### 3. Confidence filtering:
stt.on('transcript', (data) => {
  if (data.confidence < 0.7) {
    // Low confidence - probably noise
    askForRepeat();
    return;
  }
  processTranscript(data.transcript);
});

### 4. Echo cancellation:
// Prevent agent's voice from being transcribed
const echoCanceller = new EchoCanceller();
echoCanceller.reference(ttsOutput);
const cleanedAudio = echoCanceller.process(userAudio);

### STT Produces Incorrect or Hallucinated Text

Severity: MEDIUM

Situation: Processing unclear or accented speech

Symptoms:
Agent responds to something user didn't say. Names consistently
wrong. Technical terms misheard. "I said X, not Y" frustration.

Why this breaks:
STT models can hallucinate, especially on proper nouns, technical
terms, or accented speech. These errors propagate through the
pipeline and produce nonsensical responses.

Recommended fix:

# Mitigate STT errors:

### 1. Use keywords/biasing:
const transcription = await deepgram.transcription.live({
  keywords: ['Acme Corp', 'ProductName', 'John Smith'],
  keyword_boost: 'high',
});

### 2. Confirmation for critical info:
if (containsNameOrNumber(transcript)) {
  response = `I heard "${name}". Is that correct?`;
}

### 3. Confidence-based fallback:
if (confidence < 0.8) {
  response = `I think you said "${transcript}". Did I get that right?`;
}

### 4. Multiple hypothesis handling:
// Some STT APIs return n-best list
const alternatives = transcription.alternatives;
if (alternatives[0].confidence - alternatives[1].confidence < 0.1) {
  // Ambiguous - ask for clarification
}

### 5. Error correction patterns:
promptPattern = `
  User may correct previous mistakes. If they say "no, I said X"
  or "not Y, Z", update your understanding accordingly.
`;

## Validation Checks

### Missing Latency Measurement

Severity: ERROR

Voice agents must track latency at each stage

Message: Voice pipeline without latency tracking. Add timestamps at each stage to measure performance.

### Using Batch STT Instead of Streaming

Severity: WARNING

Streaming STT reduces latency significantly

Message: Using batch transcription. Consider streaming for lower latency in voice agents.

### TTS Without Streaming Output

Severity: WARNING

Streaming TTS reduces time to first audio

Message: TTS without streaming. Stream audio to reduce time to first audio.

### Hardcoded VAD Silence Threshold

Severity: WARNING

Fixed silence thresholds don't adapt to conversation

Message: Fixed silence threshold. Consider semantic VAD or adaptive thresholds for better turn-taking.

### Missing Barge-In Handling

Severity: WARNING

Voice agents should stop when user interrupts

Message: VAD without barge-in handling. Stop TTS when user starts speaking.

### Voice Prompt Without Length Constraints

Severity: WARNING

Voice prompts should constrain response length

Message: Voice prompt without length constraints. Add 'Keep responses under 30 words' to system prompt.

### Markdown Formatting Sent to TTS

Severity: WARNING

Markdown will be read literally by TTS

Message: Check for markdown in TTS input. Strip formatting before sending to TTS.

### STT Without Error Handling

Severity: WARNING

STT can fail or return low confidence

Message: STT without error handling. Check confidence scores and handle failures.

### WebSocket Without Reconnection

Severity: WARNING

Realtime APIs need reconnection handling

Message: Realtime connection without reconnection logic. Handle disconnects gracefully.

### Missing Noise Handling

Severity: INFO

Real-world audio includes background noise

Message: Consider adding noise handling for real-world audio quality.

## Collaboration

### Delegation Triggers

- user needs phone/telephony integration -> backend (Twilio, Vonage, SIP integration)
- user needs LLM optimization -> llm-architect (Model selection, prompting, fine-tuning)
- user needs tools for voice agent -> agent-tool-builder (Tool design for voice context)
- user needs multi-agent voice system -> multi-agent-orchestration (Voice agents working together)
- user needs accessibility compliance -> accessibility-specialist (Voice interface accessibility)

## Related Skills

Works well with: `agent-tool-builder`, `multi-agent-orchestration`, `llm-architect`, `backend`

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
