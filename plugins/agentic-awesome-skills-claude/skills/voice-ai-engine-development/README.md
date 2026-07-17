# Voice AI Engine Development Skill

Design and review real-time conversational voice pipelines with async workers, streaming transcription, LLM agents, and TTS synthesis. Included code is illustrative scaffolding, not a production-ready integration.

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
- `complete_voice_engine.py` - Local simulated pipeline scaffold; provider and deployment boundaries are intentionally incomplete
- `gemini_agent_example.py` - Simulated LLM streaming and bounded synthesis-segment scaffold
- `interrupt_system_example.py` - Interrupt handling demonstration

### Templates
- `base_worker_template.py` - Template for creating new workers
- `multi_provider_factory_template.py` - Multi-provider factory pattern

### References
- `common_pitfalls.md` - Common issues and solutions
- `provider_comparison.md` - Evidence worksheet for evaluating transcription, LLM, and TTS providers

## Key Concepts

### The Worker Pipeline Pattern

Every voice AI engine follows this pipeline:

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

1. **Segment LLM Responses** - Buffer to tested sentence or size boundaries; preserve cancellation and avoid both whole-response latency and tiny-fragment audio
2. **Mute Transcriber** - Mute the transcriber when bot speaks to prevent echo/feedback loops
3. **Rate-Limit Audio** - Send audio chunks at real-time speed to enable interrupts
4. **Proper Cleanup** - Always cleanup resources in finally blocks to prevent memory leaks

## Supported Providers

### Transcription
- Deepgram
- AssemblyAI
- Azure Speech
- Google Cloud Speech

### LLM
- OpenAI
- Google Gemini
- Anthropic Claude

### TTS
- ElevenLabs
- Azure TTS
- Google Cloud TTS
- Amazon Polly
- PlayHT

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

The skill outlines test shapes for worker isolation, pipeline integration, and interrupts. They are illustrative snippets, not an executable provider test suite; add project-specific fixtures, credentials, failure cases, and assertions.

## Best Practices

1. ✅ Stream where the selected provider contract supports cancellation and backpressure
2. ✅ Use bounded synthesis segments validated for latency and audio continuity
3. ✅ Mute transcriber during bot speech
4. ✅ Rate-limit audio chunks for interrupts
5. ✅ Maintain conversation history for context
6. ✅ Use proper error handling in worker loops
7. ✅ Cleanup resources in finally blocks
8. ✅ Use LINEAR16 PCM at 16kHz for audio

Provider capabilities, model names, formats, prices, quotas, regions, and retention policies change. Date each comparison and verify current primary documentation. Before real users, add authenticated and origin-checked transport, consent, AI disclosure, privacy/retention controls, tenant limits, abuse prevention, and human escalation.

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
