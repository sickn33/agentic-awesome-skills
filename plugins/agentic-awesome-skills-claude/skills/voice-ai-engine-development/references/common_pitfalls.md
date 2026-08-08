# Common Pitfalls and Solutions

This document covers common issues encountered when building voice AI engines and their solutions.

## 1. Audio Jumping/Cutting Off

### Problem
The bot's audio jumps or cuts off mid-response, creating a jarring user experience.

### Symptoms
- Audio plays in fragments
- Sentences are incomplete
- Multiple audio streams overlap
- Unnatural pauses or gaps

### Root Cause
Sending text to the synthesizer in small chunks (sentence-by-sentence or word-by-word) causes multiple TTS API calls. Each call generates a separate audio stream, resulting in:
- Multiple audio files being played sequentially
- Timing issues between chunks
- Potential overlapping audio
- Inconsistent voice characteristics between chunks

### Solution
Buffer the entire LLM response before sending it to the synthesizer:

**❌ Bad: Yields sentence-by-sentence**
```python
async def generate_response(self, prompt):
    async for sentence in llm_stream:
        # This creates multiple TTS calls!
        yield GeneratedResponse(message=BaseMessage(text=sentence))
```

**✅ Good: Buffer entire response**
```python
async def generate_response(self, prompt):
    # Buffer the entire response
    full_response = ""
    async for chunk in llm_stream:
        full_response += chunk
    
    # Yield once with complete response
    yield GeneratedResponse(message=BaseMessage(text=full_response))
```

### Why This Works
- Single TTS call for the entire response
- Consistent voice characteristics
- Proper timing and pacing
- No gaps or overlaps

---

## 2. Echo/Feedback Loop

### Problem
The bot hears itself speaking and responds to its own audio, creating an infinite loop.

### Symptoms
- Bot responds to its own speech
- Conversation becomes nonsensical
- Transcriptions include bot's own words
- System becomes unresponsive

### Root Cause
The transcriber continues to process audio while the bot is speaking. If the bot's audio is being played through speakers and captured by the microphone, the transcriber will transcribe the bot's own speech.

### Solution
Mute the transcriber when the bot starts speaking:

```python
# Before sending audio to output
self.transcriber.mute()

# Send audio...
await self.send_speech_to_output(synthesis_result)

# After audio playback complete
self.transcriber.unmute()
```

### Implementation in Transcriber
```python
class BaseTranscriber:
    def __init__(self):
        self.is_muted = False
    
    def send_audio(self, chunk: bytes):
        """Client calls this to send audio"""
        if not self.is_muted:
            self.input_queue.put_nowait(chunk)
        else:
            # Send silence instead (prevents echo)
            self.input_queue.put_nowait(self.create_silent_chunk(len(chunk)))
    
    def mute(self):
        """Called when bot starts speaking"""
        self.is_muted = True
    
    def unmute(self):
        """Called when bot stops speaking"""
        self.is_muted = False
    
    def create_silent_chunk(self, size: int) -> bytes:
        """Create a silent audio chunk"""
        return b'\x00' * size
```

### Why This Works
- Transcriber receives silence while bot speaks
- No transcription of bot's own speech
- Prevents feedback loop
- Maintains audio stream continuity

---

## 3. Interrupts Not Working

### Problem
Users cannot interrupt the bot mid-sentence. The bot continues speaking even when the user starts talking.

### Symptoms
- Bot speaks over user
- User must wait for bot to finish
- Unnatural conversation flow
- Poor user experience

### Root Cause
All audio chunks are sent to the client immediately, buffering the entire message on the client side. By the time an interrupt is detected, all audio has already been sent and is queued for playback.

### Solution
Rate-limit audio chunks to match real-time playback:

**❌ Bad: Send all chunks immediately**
```python
async for chunk in synthesis_result.chunk_generator:
    # Sends all chunks as fast as possible
    output_device.consume_nonblocking(chunk)
```

**✅ Good: Rate-limit chunks**
```python
async for chunk in synthesis_result.chunk_generator:
    # Check for interrupt
    if stop_event.is_set():
        # Calculate partial message
        partial_message = synthesis_result.get_message_up_to(
            chunk_idx * seconds_per_chunk
        )
        return partial_message, True  # cut_off = True
    
    start_time = time.time()
    
    # Send chunk
    output_device.consume_nonblocking(chunk)
    
    # CRITICAL: Wait for chunk duration before sending next
    processing_time = time.time() - start_time
    await asyncio.sleep(max(seconds_per_chunk - processing_time, 0))
    
    chunk_idx += 1
```

### Why This Works
- Only one chunk is buffered on client at a time
- Interrupts can stop mid-sentence
- Natural conversation flow
- Real-time playback maintained

### Calculating `seconds_per_chunk`
```python
# For LINEAR16 PCM audio at 16kHz
sample_rate = 16000  # Hz
chunk_size = 1024    # bytes
bytes_per_sample = 2  # 16-bit = 2 bytes

samples_per_chunk = chunk_size / bytes_per_sample
seconds_per_chunk = samples_per_chunk / sample_rate
# = 1024 / 2 / 16000 = 0.032 seconds
```

---

## 4. Memory Leaks from Unclosed Streams

### Problem
Memory usage grows over time, eventually causing the application to crash.

### Symptoms
- Increasing memory usage
- Slow performance over time
- WebSocket connections not closing
- Resource exhaustion

### Root Cause
WebSocket connections, API streams, or async tasks are not properly closed when conversations end or errors occur.

### Solution
Always use context managers and cleanup:

**❌ Bad: No cleanup**
```python
async def handle_conversation(websocket):
    conversation = create_conversation()
    await conversation.start()
    
    async for message in websocket.iter_bytes():
        conversation.receive_audio(message)
    # No cleanup! Resources leak
```

**✅ Good: Proper cleanup**
```python
async def handle_conversation(websocket):
    conversation = None
    try:
        conversation = create_conversation()
        await conversation.start()
        
        async for message in websocket.iter_bytes():
            conversation.receive_audio(message)
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        # Always cleanup
        if conversation:
            await conversation.terminate()
```

### Proper Termination
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
    
    # Cancel tasks
    for task in self.tasks:
        if not task.done():
            task.cancel()
```

---

## 5. Conversation History Not Updating

### Problem
The agent doesn't remember previous messages or context is lost.

### Symptoms
- Agent repeats itself
- No context from previous messages
- Each response is independent
- Poor conversation quality

### Root Cause
Conversation history is not being maintained or updated correctly.

### Solution
Maintain conversation history in the agent:

```python
class Agent:
    def __init__(self):
        self.conversation_history = []
    
    async def generate_response(self, user_input):
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_input
        })
        
        # Generate response with full history
        response = await self.llm.generate(self.conversation_history)
        
        # Add bot response to history
        self.conversation_history.append({
            "role": "assistant",
            "content": response
        })
        
        return response
```

### Handling Interrupts
When the bot is interrupted, update history with partial message:

```python
def update_last_bot_message_on_cut_off(self, partial_message):
    """Update history when bot is interrupted"""
    if self.conversation_history and \
       self.conversation_history[-1]["role"] == "assistant":
        # Update with what was actually spoken
        self.conversation_history[-1]["content"] = partial_message
```

---

## 6. WebSocket Connection Drops

### Problem
WebSocket connections drop unexpectedly, interrupting conversations.

### Symptoms
- Frequent disconnections
- Connection timeouts
- "Connection closed" errors
- Unstable conversations

### Root Cause
- No heartbeat/ping mechanism
- Idle timeout
- Network issues
- Server overload

### Solution
Implement heartbeat and reconnection:

```python
@app.websocket("/conversation")
async def conversation_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Start heartbeat
    async def heartbeat():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
                await asyncio.sleep(30)  # Ping every 30 seconds
            except:
                break
    
    heartbeat_task = asyncio.create_task(heartbeat())
    
    try:
        async for message in websocket.iter_bytes():
            # Process message
            pass
    finally:
        heartbeat_task.cancel()
```

---

## 7. High Latency / Slow Responses

### Problem
Long delays between user speech and bot response.

### Symptoms
- Noticeable lag
- Poor user experience
- Conversation feels unnatural
- Users repeat themselves

### Root Causes & Solutions

**1. Not using streaming**
```python
# ❌ Bad: Wait for entire response
response = await llm.complete(prompt)

# ✅ Good: Stream response
async for chunk in llm.complete(prompt, stream=True):
    yield chunk
```

**2. Sequential processing**
```python
# ❌ Bad: Sequential
transcription = await transcriber.transcribe(audio)
response = await agent.generate(transcription)
audio = await synthesizer.synthesize(response)

# ✅ Good: Concurrent with queues
# All workers run simultaneously
```

**3. Large chunk sizes**
```python
# ❌ Bad: Large chunks (high latency)
chunk_size = 8192  # 0.25 seconds

# ✅ Good: Small chunks (low latency)
chunk_size = 1024  # 0.032 seconds
```

---

## 8. Audio Quality Issues

### Problem
Poor audio quality, distortion, or artifacts.

### Symptoms
- Robotic voice
- Crackling or popping
- Distorted audio
- Inconsistent volume

### Root Causes & Solutions

**1. Wrong audio format**
```python
# ✅ Use LINEAR16 PCM at 16kHz
audio_encoding = AudioEncoding.LINEAR16
sample_rate = 16000
```

**2. Incorrect format conversion**
```python
# ✅ Proper MP3 to PCM conversion
from pydub import AudioSegment
import io

def mp3_to_pcm(mp3_bytes):
    audio = AudioSegment.from_mp3(io.BytesIO(mp3_bytes))
    audio = audio.set_frame_rate(16000)
    audio = audio.set_channels(1)
    audio = audio.set_sample_width(2)  # 16-bit
    return audio.raw_data
```

**3. Buffer underruns**
```python
# ✅ Ensure consistent chunk timing
await asyncio.sleep(max(seconds_per_chunk - processing_time, 0))
```

---

## Summary

| Problem | Root Cause | Solution |
|---------|-----------|----------|
| Audio jumping | Multiple TTS calls | Buffer entire response |
| Echo/feedback | Transcriber active during bot speech | Mute transcriber |
| Interrupts not working | All chunks sent immediately | Rate-limit chunks |
| Memory leaks | Unclosed streams | Proper cleanup |
| Lost context | History not maintained | Update conversation history |
| Connection drops | No heartbeat | Implement ping/pong |
| High latency | Sequential processing | Use streaming + queues |
| Poor audio quality | Wrong format/conversion | Use LINEAR16 PCM 16kHz |

---

## Best Practices

1. **Always buffer LLM responses** before sending to synthesizer
2. **Always mute transcriber** when bot is speaking
3. **Always rate-limit audio chunks** to enable interrupts
4. **Always cleanup resources** in finally blocks
5. **Always maintain conversation history** for context
6. **Always use streaming** for low latency
7. **Always use LINEAR16 PCM** at 16kHz for audio
8. **Always implement error handling** in worker loops
