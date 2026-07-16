---
name: voice-ai-engine-development
description: "Build real-time conversational AI voice engines using async worker pipelines, streaming transcription, LLM agents, and TTS synthesis with interrupt handling and multi-provider support"
risk: unknown
source: community
date_added: "2026-02-27"
---

# Voice AI Engine Development

## Overview

This skill guides you through building production-ready voice AI engines with real-time conversation capabilities. Voice AI engines enable natural, bidirectional conversations between users and AI agents through streaming audio processing, speech-to-text transcription, LLM-powered responses, and text-to-speech synthesis.

The core architecture uses an async queue-based worker pipeline where each component runs independently and communicates via `asyncio.Queue` objects, enabling concurrent processing, interrupt handling, and real-time streaming at every stage.

## When to Use This Skill

Use this skill when:
- Building real-time voice conversation systems
- Implementing voice assistants or chatbots
- Creating voice-enabled customer service agents
- Developing voice AI applications with interrupt capabilities
- Integrating multiple transcription, LLM, or TTS providers
- Working with streaming audio processing pipelines
- The user mentions Vocode, voice engines, or conversational AI

## Core Architecture Principles

### The Worker Pipeline Pattern

Every voice AI engine follows this pipeline:

```
Audio In → Transcriber → Agent → Synthesizer → Audio Out
           (Worker 1)   (Worker 2)  (Worker 3)
```

**Key Benefits:**
- **Decoupling**: Workers only know about their input/output queues
- **Concurrency**: All workers run simultaneously via asyncio
- **Backpressure**: Queues automatically handle rate differences
- **Interruptibility**: Everything can be stopped mid-stream

### Base Worker Pattern

Every worker follows this pattern:

```python
class BaseWorker:
    def __init__(self, input_queue, output_queue):
        self.input_queue = input_queue   # asyncio.Queue to consume from
        self.output_queue = output_queue # asyncio.Queue to produce to
        self.active = False
    
    def start(self):
        """Start the worker's processing loop"""
        self.active = True
        asyncio.create_task(self._run_loop())
    
    async def _run_loop(self):
        """Main processing loop - runs forever until terminated"""
        while self.active:
            item = await self.input_queue.get()  # Block until item arrives
            await self.process(item)              # Process the item
    
    async def process(self, item):
        """Override this - does the actual work"""
        raise NotImplementedError
    
    def terminate(self):
        """Stop the worker"""
        self.active = False
```

## Component Implementation Guide

### 1. Transcriber (Audio → Text)

**Purpose**: Converts incoming audio chunks to text transcriptions

**Interface Requirements**:
```python
class BaseTranscriber:
    def __init__(self, transcriber_config):
        self.input_queue = asyncio.Queue()   # Audio chunks (bytes)
        self.output_queue = asyncio.Queue()  # Transcriptions
        self.is_muted = False
    
    def send_audio(self, chunk: bytes):
        """Client calls this to send audio"""
        if not self.is_muted:
            self.input_queue.put_nowait(chunk)
        else:
            # Send silence instead (prevents echo during bot speech)
            self.input_queue.put_nowait(self.create_silent_chunk(len(chunk)))
    
    def mute(self):
        """Called when bot starts speaking (prevents echo)"""
        self.is_muted = True
    
    def unmute(self):
        """Called when bot stops speaking"""
        self.is_muted = False
```

**Output Format**:
```python
class Transcription:
    message: str          # "Hello, how are you?"
    confidence: float     # 0.95
    is_final: bool        # True = complete sentence, False = partial
    is_interrupt: bool    # Set by TranscriptionsWorker
```

**Supported Providers**:
- **Deepgram** - Fast, accurate, streaming
- **AssemblyAI** - High accuracy, good for accents
- **Azure Speech** - Enterprise-grade
- **Google Cloud Speech** - Multi-language support

**Critical Implementation Details**:
- Use WebSocket for bidirectional streaming
- Run sender and receiver tasks concurrently with `asyncio.gather()`
- Mute transcriber when bot speaks to prevent echo/feedback loops
- Handle both final and partial transcriptions

### 2. Agent (Text → Response)

**Purpose**: Processes user input and generates conversational responses

**Interface Requirements**:
```python
class BaseAgent:
    def __init__(self, agent_config):
        self.input_queue = asyncio.Queue()   # TranscriptionAgentInput
        self.output_queue = asyncio.Queue()  # AgentResponse
        self.transcript = None               # Conversation history
    
    async def generate_response(self, human_input, is_interrupt, conversation_id):
        """Override this - returns AsyncGenerator of responses"""
        raise NotImplementedError
```

**Why Streaming Responses?**
- **Lower latency**: Start speaking as soon as first sentence is ready
- **Better interrupts**: Can stop mid-response
- **Sentence-by-sentence**: More natural conversation flow

**Supported Providers**:
- **OpenAI** (GPT-4, GPT-3.5) - High quality, fast
- **Google Gemini** - Multimodal, cost-effective
- **Anthropic Claude** - Long context, nuanced responses

**Critical Implementation Details**:
- Maintain conversation history in `Transcript` object
- Stream responses using `AsyncGenerator`
- **IMPORTANT**: Buffer entire LLM response before yielding to synthesizer (prevents audio jumping)
- Handle interrupts by canceling current generation task
- Update conversation history with partial messages on interrupt

### 3. Synthesizer (Text → Audio)

**Purpose**: Converts agent text responses to speech audio

**Interface Requirements**:
```python
class BaseSynthesizer:
    async def create_speech(self, message: BaseMessage, chunk_size: int) -> SynthesisResult:
        """
        Returns a SynthesisResult containing:
        - chunk_generator: AsyncGenerator that yields audio chunks
        - get_message_up_to: Function to get partial text (for interrupts)
        """
        raise NotImplementedError
```

**SynthesisResult Structure**:
```python
class SynthesisResult:
    chunk_generator: AsyncGenerator[ChunkResult, None]
    get_message_up_to: Callable[[float], str]  # seconds → partial text
    
    class ChunkResult:
        chunk: bytes          # Raw PCM audio
        is_last_chunk: bool
```

**Supported Providers**:
- **ElevenLabs** - Most natural voices, streaming
- **Azure TTS** - Enterprise-grade, many languages
- **Google Cloud TTS** - Cost-effective, good quality
- **Amazon Polly** - AWS integration
- **Play.ht** - Voice cloning

**Critical Implementation Details**:
- Stream audio chunks as they're generated
- Convert audio to LINEAR16 PCM format (16kHz sample rate)
- Implement `get_message_up_to()` for interrupt handling
- Handle audio format conversion (MP3 → PCM)

### 4. Output Device (Audio → Client)

**Purpose**: Sends synthesized audio back to the client

**CRITICAL: Rate Limiting for Interrupts**

```python
async def send_speech_to_output(self, message, synthesis_result,
                                stop_event, seconds_per_chunk):
    chunk_idx = 0
    async for chunk_result in synthesis_result.chunk_generator:
        # Check for interrupt
        if stop_event.is_set():
            logger.debug(f"Interrupted after {chunk_idx} chunks")
            message_sent = synthesis_result.get_message_up_to(
                chunk_idx * seconds_per_chunk
            )
            return message_sent, True  # cut_off = True
        
        start_time = time.time()
        
        # Send chunk to output device
        self.output_device.consume_nonblocking(chunk_result.chunk)
        
        # CRITICAL: Wait for chunk to play before sending next one
        # This is what makes interrupts work!
        speech_length = seconds_per_chunk
        processing_time = time.time() - start_time
        await asyncio.sleep(max(speech_length - processing_time, 0))
        
        chunk_idx += 1
    
    return message, False  # cut_off = False
```

**Why Rate Limiting?**
Without rate limiting, all audio chunks would be sent immediately, which would:
- Buffer entire message on client side
- Make interrupts impossible (all audio already sent)
- Cause timing issues

By sending one chunk every N seconds:
- Real-time playback is maintained
- Interrupts can stop mid-sentence
- Natural conversation flow is preserved

## The Interrupt System

The interrupt system is critical for natural conversations.

### How Interrupts Work

**Scenario**: Bot is saying "I think the weather will be nice today and tomorrow and—" when user interrupts with "Stop".

**Step 1: User starts speaking**
```python
# TranscriptionsWorker detects new transcription while bot speaking
async def process(self, transcription):
    if not self.conversation.is_human_speaking:  # Bot was speaking!
        # Broadcast interrupt to all in-flight events
        interrupted = self.conversation.broadcast_interrupt()
        transcription.is_interrupt = interrupted
```

**Step 2: broadcast_interrupt() stops everything**
```python
def broadcast_interrupt(self):
    num_interrupts = 0
    # Interrupt all queued events
    while True:
        try:
            interruptible_event = self.interruptible_events.get_nowait()
            if interruptible_event.interrupt():  # Sets interruption_event
                num_interrupts += 1
        except queue.Empty:
            break
    
    # Cancel current tasks
    self.agent.cancel_current_task()              # Stop generating text
    self.agent_responses_worker.cancel_current_task()  # Stop synthesizing
    return num_interrupts > 0
```

**Step 3: SynthesisResultsWorker detects interrupt**
```python
async def send_speech_to_output(self, synthesis_result, stop_event, ...):
    async for chunk_result in synthesis_result.chunk_generator:
        # Check stop_event (this is the interruption_event)
        if stop_event.is_set():
            logger.debug("Interrupted! Stopping speech.")
            # Calculate what was actually spoken
            seconds_spoken = chunk_idx * seconds_per_chunk
            partial_message = synthesis_result.get_message_up_to(seconds_spoken)
            # e.g., "I think the weather will be nice today"
            return partial_message, True  # cut_off = True
```

**Step 4: Agent updates history**
```python
if cut_off:
    # Update conversation history with partial message
    self.agent.update_last_bot_message_on_cut_off(message_sent)
    # History now shows:
    # Bot: "I think the weather will be nice today" (incomplete)
```

### InterruptibleEvent Pattern

Every event in the pipeline is wrapped in an `InterruptibleEvent`:

```python
class InterruptibleEvent:
    def __init__(self, payload, is_interruptible=True):
        self.payload = payload
        self.is_interruptible = is_interruptible
        self.interruption_event = threading.Event()  # Initially not set
        self.interrupted = False
    
    def interrupt(self) -> bool:
        """Interrupt this event"""
        if not self.is_interruptible:
            return False
        if not self.interrupted:
            self.interruption_event.set()  # Signal to stop!
            self.interrupted = True
            return True
        return False
    
    def is_interrupted(self) -> bool:
        return self.interruption_event.is_set()
```

## Multi-Provider Factory Pattern

Support multiple providers with a factory pattern:

```python
class VoiceHandler:
    """Multi-provider factory for voice components"""
    
    def create_transcriber(self, agent_config: Dict):
        """Create transcriber based on transcriberProvider"""
        provider = agent_config.get("transcriberProvider", "deepgram")
        
        if provider == "deepgram":
            return self._create_deepgram_transcriber(agent_config)
        elif provider == "assemblyai":
            return self._create_assemblyai_transcriber(agent_config)
        elif provider == "azure":
            return self._create_azure_transcriber(agent_config)
        elif provider == "google":
            return self._create_google_transcriber(agent_config)
        else:
            raise ValueError(f"Unknown transcriber provider: {provider}")
    
    def create_agent(self, agent_config: Dict):
        """Create LLM agent based on llmProvider"""
        provider = agent_config.get("llmProvider", "openai")
        
        if provider == "openai":
            return self._create_openai_agent(agent_config)
        elif provider == "gemini":
            return self._create_gemini_agent(agent_config)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")
    
    def create_synthesizer(self, agent_config: Dict):
        """Create voice synthesizer based on voiceProvider"""
        provider = agent_config.get("voiceProvider", "elevenlabs")
        
        if provider == "elevenlabs":
            return self._create_elevenlabs_synthesizer(agent_config)
        elif provider == "azure":
            return self._create_azure_synthesizer(agent_config)
        elif provider == "google":
            return self._create_google_synthesizer(agent_config)
        elif provider == "polly":
            return self._create_polly_synthesizer(agent_config)
        elif provider == "playht":
            return self._create_playht_synthesizer(agent_config)
        else:
            raise ValueError(f"Unknown voice provider: {provider}")
```

## WebSocket Integration

Voice AI engines typically use WebSocket for bidirectional audio streaming:

```python
@app.websocket("/conversation")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Create voice components
    voice_handler = VoiceHandler()
    transcriber = voice_handler.create_transcriber(agent_config)
    agent = voice_handler.create_agent(agent_config)
    synthesizer = voice_handler.create_synthesizer(agent_config)
    
    # Create output device
    output_device = WebsocketOutputDevice(
        ws=websocket,
        sampling_rate=16000,
        audio_encoding=AudioEncoding.LINEAR16
    )
    
    # Create conversation orchestrator
    conversation = StreamingConversation(
        output_device=output_device,
        transcriber=transcriber,
        agent=agent,
        synthesizer=synthesizer
    )
    
    # Start all workers
    await conversation.start()
    
    try:
        # Receive audio from client
        async for message in websocket.iter_bytes():
            conversation.receive_audio(message)
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    finally:
        await conversation.terminate()
```

## Common Pitfalls and Solutions

### 1. Audio Jumping/Cutting Off

**Problem**: Bot's audio jumps or cuts off mid-response.

**Cause**: Sending text to synthesizer in small chunks causes multiple TTS calls.

**Solution**: Buffer the entire LLM response before sending to synthesizer:

```python
# ❌ Bad: Yields sentence-by-sentence
async for sentence in llm_stream:
    yield GeneratedResponse(message=BaseMessage(text=sentence))

# ✅ Good: Buffer entire response
full_response = ""
async for chunk in llm_stream:
    full_response += chunk
yield GeneratedResponse(message=BaseMessage(text=full_response))
```

### 2. Echo/Feedback Loop

**Problem**: Bot hears itself speaking and responds to its own audio.

**Cause**: Transcriber not muted during bot speech.

**Solution**: Mute transcriber when bot starts speaking:

```python
# Before sending audio to output
self.transcriber.mute()
# After audio playback complete
self.transcriber.unmute()
```

### 3. Interrupts Not Working

**Problem**: User can't interrupt bot mid-sentence.

**Cause**: All audio chunks sent at once instead of rate-limited.

**Solution**: Rate-limit audio chunks to match real-time playback:

```python
async for chunk in synthesis_result.chunk_generator:
    start_time = time.time()
    
    # Send chunk
    output_device.consume_nonblocking(chunk)
    
    # Wait for chunk duration before sending next
    processing_time = time.time() - start_time
    await asyncio.sleep(max(seconds_per_chunk - processing_time, 0))
```

### 4. Memory Leaks from Unclosed Streams

**Problem**: Memory usage grows over time.

**Cause**: WebSocket connections or API streams not properly closed.

**Solution**: Always use context managers and cleanup:

```python
try:
    async with websockets.connect(url) as ws:
        # Use websocket
        pass
finally:
    # Cleanup
    await conversation.terminate()
    await transcriber.terminate()
```

## Production Considerations

### 1. Error Handling

```python
async def _run_loop(self):
    while self.active:
        try:
            item = await self.input_queue.get()
            await self.process(item)
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)
            # Don't crash the worker, continue processing
```

### 2. Graceful Shutdown

```python
async def terminate(self):
    """Gracefully shut down all workers"""
    self.active = False
    
    # Stop all workers
    self.transcriber.terminate()
    self.agent.terminate()
    self.synthesizer.terminate()
    
    # Wait for queues to drain
    await asyncio.sleep(0.5)
    
    # Close connections
    if self.websocket:
        await self.websocket.close()
```

### 3. Monitoring and Logging

```python
# Log key events
logger.info(f"🎤 [TRANSCRIBER] Received: '{transcription.message}'")
logger.info(f"🤖 [AGENT] Generating response...")
logger.info(f"🔊 [SYNTHESIZER] Synthesizing {len(text)} characters")
logger.info(f"⚠️ [INTERRUPT] User interrupted bot")

# Track metrics
metrics.increment("transcriptions.count")
metrics.timing("agent.response_time", duration)
metrics.gauge("active_conversations", count)
```

### 4. Rate Limiting and Quotas

```python
# Implement rate limiting for API calls
from aiolimiter import AsyncLimiter

rate_limiter = AsyncLimiter(max_rate=10, time_period=1)  # 10 calls/second

async def call_api(self, data):
    async with rate_limiter:
        return await self.client.post(data)
```

## Key Design Patterns

### 1. Producer-Consumer with Queues

```python
# Producer
async def producer(queue):
    while True:
        item = await generate_item()
        queue.put_nowait(item)

# Consumer
async def consumer(queue):
    while True:
        item = await queue.get()
        await process_item(item)
```

### 2. Streaming Generators

Instead of returning complete results:

```python
# ❌ Bad: Wait for entire response
async def generate_response(prompt):
    response = await openai.complete(prompt)  # 5 seconds
    return response

# ✅ Good: Stream chunks as they arrive
async def generate_response(prompt):
    async for chunk in openai.complete(prompt, stream=True):
        yield chunk  # Yield after 0.1s, 0.2s, etc.
```

### 3. Conversation State Management

Maintain conversation history for context:

```python
class Transcript:
    event_logs: List[Message] = []
    
    def add_human_message(self, text):
        self.event_logs.append(Message(sender=Sender.HUMAN, text=text))
    
    def add_bot_message(self, text):
        self.event_logs.append(Message(sender=Sender.BOT, text=text))
    
    def to_openai_messages(self):
        return [
            {"role": "user" if msg.sender == Sender.HUMAN else "assistant",
             "content": msg.text}
            for msg in self.event_logs
        ]
```

## Testing Strategies

### 1. Unit Test Workers in Isolation

```python
async def test_transcriber():
    transcriber = DeepgramTranscriber(config)
    
    # Mock audio input
    audio_chunk = b'\x00\x01\x02...'
    transcriber.send_audio(audio_chunk)
    
    # Check output
    transcription = await transcriber.output_queue.get()
    assert transcription.message == "expected text"
```

### 2. Integration Test Pipeline

```python
async def test_full_pipeline():
    # Create all components
    conversation = create_test_conversation()
    
    # Send test audio
    conversation.receive_audio(test_audio_chunk)
    
    # Wait for response
    response = await wait_for_audio_output(timeout=5)
    
    assert response is not None
```

### 3. Test Interrupts

```python
async def test_interrupt():
    conversation = create_test_conversation()
    
    # Start bot speaking
    await conversation.agent.generate_response("Tell me a long story")
    
    # Interrupt mid-response
    await asyncio.sleep(1)  # Let it speak for 1 second
    conversation.broadcast_interrupt()
    
    # Verify partial message in transcript
    last_message = conversation.transcript.event_logs[-1]
    assert last_message.text != full_expected_message
```

## Implementation Workflow

When implementing a voice AI engine:

1. **Start with Base Workers**: Implement the base worker pattern first
2. **Add Transcriber**: Choose a provider and implement streaming transcription
3. **Add Agent**: Implement LLM integration with streaming responses
4. **Add Synthesizer**: Implement TTS with audio streaming
5. **Connect Pipeline**: Wire all workers together with queues
6. **Add Interrupts**: Implement the interrupt system
7. **Add WebSocket**: Create WebSocket endpoint for client communication
8. **Test Components**: Unit test each worker in isolation
9. **Test Integration**: Test the full pipeline end-to-end
10. **Add Error Handling**: Implement robust error handling and logging
11. **Optimize**: Add rate limiting, monitoring, and performance optimizations

## Related Skills

- `@websocket-patterns` - For WebSocket implementation details
- `@async-python` - For asyncio and async patterns
- `@streaming-apis` - For streaming API integration
- `@audio-processing` - For audio format conversion and processing
- `@systematic-debugging` - For debugging complex async pipelines

## Resources

**Libraries**:
- `asyncio` - Async programming
- `websockets` - WebSocket client/server
- `FastAPI` - WebSocket server framework
- `pydub` - Audio manipulation
- `numpy` - Audio data processing

**API Providers**:
- Transcription: Deepgram, AssemblyAI, Azure Speech, Google Cloud Speech
- LLM: OpenAI, Google Gemini, Anthropic Claude
- TTS: ElevenLabs, Azure TTS, Google Cloud TTS, Amazon Polly, Play.ht

## Summary

Building a voice AI engine requires:
- ✅ Async worker pipeline for concurrent processing
- ✅ Queue-based communication between components
- ✅ Streaming at every stage (transcription, LLM, synthesis)
- ✅ Interrupt system for natural conversations
- ✅ Rate limiting for real-time audio playback
- ✅ Multi-provider support for flexibility
- ✅ Proper error handling and graceful shutdown

**The key insight**: Everything must stream and everything must be interruptible for natural, real-time conversations.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
