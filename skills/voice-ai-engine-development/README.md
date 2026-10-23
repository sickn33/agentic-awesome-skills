# Voice AI Engine Development Skill

> These examples are mock implementations and illustrative integration sketches, not production adapters. Full-response buffering is optional and raises first-audio latency; ordered sentence streaming is valid. Muting the sole microphone/transcriber prevents barge-in: use echo cancellation and an independent speech detector for duplex interruption. Pacing must derive from actual sample rate, channels and bytes per sample, account for generator wait and client buffer acknowledgements, and flush stale playback on interruption. Estimated text offsets are not proof of words heard. Keep provider input/output formats compatible rather than universally forcing 16kHz PCM.


Build prototype real-time conversational AI voice engines with async worker pipelines, streaming transcription, LLM agents, and TTS synthesis.

## Overview

This skill provides comprehensive guidance for building voice AI engines that enable natural, bidirectional conversations between users and AI agents. It covers the complete architecture from audio input to audio output, including:

- **Async Worker Pipeline Pattern** - Concurrent processing with queue-based communication
- **Streaming Transcription** - Real-time speech-to-text conversion
- **LLM-Powered Agents** - Conversational AI with context awareness
- **Text-to-Speech Synthesis** - Natural voice generation
- **Interrupt Handling** - Users can interrupt the bot mid-sentence
- **Multi-Provider Support** - Swap between different service providers easily

## Quick Start

```python
# Use the skill in your AI assistant
@voice-ai-engine-development I need to build a voice assistant that can handle real-time conversations with interrupts
```

## What's Included

### Main Skill File
- `SKILL.md` - Comprehensive guide to voice AI engine development

### Examples
- `complete_voice_engine.py` - Offline mock pipeline; external adapters and real audio client are not implemented
- `gemini_agent_example.py` - LLM agent with proper response buffering
- `interrupt_system_example.py` - Interrupt handling demonstration

### Templates
- `base_worker_template.py` - Template for creating new workers
- `multi_provider_factory_template.py` - Multi-provider factory pattern

### References
- `common_pitfalls.md` - Common issues and solutions
- `provider_comparison.md` - Comparison of transcription, LLM, and TTS providers

## Key Concepts

### The Worker Pipeline Pattern

A common decomposed voice pipeline is:

```
Audio In → Transcriber → Agent → Synthesizer → Audio Out
           (Worker 1)   (Worker 2)  (Worker 3)
```

Each worker:
- Runs independently via asyncio
- Communicates through asyncio.Queue objects
- Can be stopped mid-stream for interrupts
- Handles errors gracefully

### Critical Implementation Details

1. **Buffer LLM Responses** - Serialize ordered TTS output; full-response buffering trades latency for simplicity, while sentence streaming needs coordinated playback
2. **Echo handling** - Use echo cancellation/VAD for duplex speech; muting the sole input prevents voice interruption
3. **Rate-Limit Audio** - Send audio chunks at real-time speed to enable interrupts
4. **Proper Cleanup** - Always cleanup resources in finally blocks to prevent memory leaks

## Supported Providers

### Transcription
- Deepgram (adapter required; benchmark on target audio)
- AssemblyAI (adapter required; benchmark on target audio)
- Azure Speech (enterprise-grade)
- Google Cloud Speech (multi-language)

### LLM
- OpenAI (choose a currently available model and evaluate task quality)
- Google Gemini (cost-effective)
- Anthropic Claude (safety-focused)

### TTS
- ElevenLabs (most natural voices)
- Azure TTS (enterprise-grade)
- Google Cloud TTS (cost-effective)
- Amazon Polly (AWS integration)
- Play.ht (voice cloning)

## Common Use Cases

- Customer service voice bots
- Voice assistants
- Phone automation systems
- Voice-enabled applications
- Interactive voice response (IVR) systems
- Voice-based tutoring systems

## Architecture Highlights

### Async Worker Pattern
```python
class BaseWorker:
    async def _run_loop(self):
        while self.active:
            item = await self.input_queue.get()
            await self.process(item)
```

### Interrupt System
```python
# User interrupts bot mid-sentence
if stop_event.is_set():
    partial_message = get_message_up_to(seconds_spoken)
    return partial_message, True  # cut_off = True
```

### Multi-Provider Factory
```python
factory = VoiceComponentFactory()
transcriber = factory.create_transcriber(config)  # Deepgram, AssemblyAI, etc.
agent = factory.create_agent(config)              # OpenAI, Gemini, etc.
synthesizer = factory.create_synthesizer(config)  # ElevenLabs, Azure, etc.
```

## Testing

The skill includes examples for:
- Unit testing workers in isolation
- Integration testing the full pipeline
- Testing interrupt functionality
- Testing with different providers

## Best Practices

1. ✅ Always stream at every stage (transcription, LLM, synthesis)
2. ✅ Serialize synthesis; choose full-response or ordered sentence buffering
3. ✅ Use echo cancellation/VAD for duplex interruption
4. ✅ Rate-limit audio chunks for interrupts
5. ✅ Maintain conversation history for context
6. ✅ Use proper error handling in worker loops
7. ✅ Cleanup resources in finally blocks
8. ✅ Negotiate compatible codec, channel count and sample rate

## Common Pitfalls

See `references/common_pitfalls.md` for detailed solutions to:
- Audio jumping/cutting off
- Echo/feedback loops
- Interrupts not working
- Memory leaks
- Lost conversation context
- High latency
- Poor audio quality

## Contributing

This skill is part of the Agentic Awesome Skills repository. Contributions are welcome!

## Related Skills

- `@websocket-patterns` - WebSocket implementation
- `@async-python` - Asyncio patterns
- `@streaming-apis` - Streaming API integration
- `@audio-processing` - Audio format conversion

## License

MIT License - See repository LICENSE file

## Resources

- [Vocode Documentation](https://docs.vocode.dev/)
- [Deepgram API](https://developers.deepgram.com/)
- [OpenAI API](https://platform.openai.com/docs/)
- [ElevenLabs API](https://elevenlabs.io/docs/)

---

**Built with ❤️ for the Antigravity community**
