"""
Example: Complete Voice AI Engine Implementation

This example demonstrates a minimal but complete voice AI engine
with all core components: Transcriber, Agent, Synthesizer, and WebSocket integration.
"""

import asyncio
from typing import Dict, AsyncGenerator
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dataclasses import dataclass
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# ============================================================================
# Data Models
# ============================================================================

@dataclass
class Transcription:
    message: str
    confidence: float
    is_final: bool
    is_interrupt: bool = False


@dataclass
class AgentResponse:
    message: str
    is_interruptible: bool = True


@dataclass
class SynthesisResult:
    chunk_generator: AsyncGenerator[bytes, None]
    get_message_up_to: callable


# ============================================================================
# Base Worker Pattern
# ============================================================================

class BaseWorker:
    """Base class for all workers in the pipeline"""
    
    def __init__(self, input_queue: asyncio.Queue, output_queue: asyncio.Queue):
        self.input_queue = input_queue
        self.output_queue = output_queue
        self.active = False
        self._task = None
    
    def start(self):
        """Start the worker's processing loop"""
        self.active = True
        self._task = asyncio.create_task(self._run_loop())
    
    async def _run_loop(self):
        """Main processing loop - runs forever until terminated"""
        while self.active:
            try:
                item = await self.input_queue.get()
                await self.process(item)
            except Exception as e:
                logger.error(f"Worker error: {e}", exc_info=True)
    
    async def process(self, item):
        """Override this - does the actual work"""
        raise NotImplementedError
    
    def terminate(self):
        """Stop the worker"""
        self.active = False
        if self._task:
            self._task.cancel()


# ============================================================================
# Transcriber Component
# ============================================================================

class DeepgramTranscriber(BaseWorker):
    """Converts audio chunks to text transcriptions using Deepgram"""
    
    def __init__(self, config: Dict):
        super().__init__(asyncio.Queue(), asyncio.Queue())
        self.config = config
        self.is_muted = False
    
    def send_audio(self, chunk: bytes):
        """Client calls this to send audio"""
        if not self.is_muted:
            self.input_queue.put_nowait(chunk)
        else:
            # Send silence instead (prevents echo during bot speech)
            self.input_queue.put_nowait(self.create_silent_chunk(len(chunk)))
    
    def create_silent_chunk(self, size: int) -> bytes:
        """Create a silent audio chunk"""
        return b'\x00' * size
    
    def mute(self):
        """Called when bot starts speaking (prevents echo)"""
        self.is_muted = True
        logger.info("🔇 [TRANSCRIBER] Muted")
    
    def unmute(self):
        """Called when bot stops speaking"""
        self.is_muted = False
        logger.info("🔊 [TRANSCRIBER] Unmuted")
    
    async def process(self, audio_chunk: bytes):
        """Process audio chunk and generate transcription"""
        # In a real implementation, this would call Deepgram API
        # For this example, we'll simulate a transcription
        
        # Simulate API call delay
        await asyncio.sleep(0.1)
        
        # Mock transcription
        transcription = Transcription(
            message="Hello, how can I help you?",
            confidence=0.95,
            is_final=True
        )
        
        logger.info(f"🎤 [TRANSCRIBER] Received: '{transcription.message}'")
        self.output_queue.put_nowait(transcription)


# ============================================================================
# Agent Component
# ============================================================================

class GeminiAgent(BaseWorker):
    """LLM-powered conversational agent using Google Gemini"""
    
    def __init__(self, config: Dict):
        super().__init__(asyncio.Queue(), asyncio.Queue())
        self.config = config
        self.conversation_history = []
    
    async def process(self, transcription: Transcription):
        """Process transcription and generate response"""
        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": transcription.message
        })
        
        logger.info(f"🤖 [AGENT] Generating response for: '{transcription.message}'")
        
        # Generate response (streaming)
        async for response in self.generate_response(transcription.message):
            self.output_queue.put_nowait(response)
    
    async def generate_response(self, user_input: str) -> AsyncGenerator[AgentResponse, None]:
        """Generate streaming response from LLM"""
        # In a real implementation, this would call Gemini API
        # For this example, we'll simulate a streaming response
        
        # Simulate streaming delay
        await asyncio.sleep(0.5)
        
        # IMPORTANT: Buffer entire response before yielding
        # This prevents audio jumping/cutting off
        full_response = f"I understand you said: {user_input}. How can I assist you further?"
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": full_response
        })
        
        logger.info(f"🤖 [AGENT] Generated: '{full_response}'")
        
        # Yield complete response
        yield AgentResponse(
            message=full_response,
            is_interruptible=True
        )


# ============================================================================
# Synthesizer Component
# ============================================================================

class ElevenLabsSynthesizer:
    """Converts text to speech using ElevenLabs"""
    
    def __init__(self, config: Dict):
        self.config = config
    
    async def create_speech(self, message: str, chunk_size: int = 1024) -> SynthesisResult:
        """
        Generate speech audio from text
        
        Returns SynthesisResult with:
        - chunk_generator: AsyncGenerator yielding audio chunks
        - get_message_up_to: Function to get partial text for interrupts
        """
        
        # In a real implementation, this would call ElevenLabs API
        # For this example, we'll simulate audio generation
        
        logger.info(f"🔊 [SYNTHESIZER] Synthesizing {len(message)} characters")
        
        async def chunk_generator():
            # Simulate streaming audio chunks
            num_chunks = len(message) // 10 + 1
            for i in range(num_chunks):
                # Simulate API delay
                await asyncio.sleep(0.1)
                
                # Mock audio chunk (in reality, this would be PCM audio)
                chunk = b'\x00' * chunk_size
                yield chunk
        
        def get_message_up_to(seconds: float) -> str:
            """Calculate partial message based on playback time"""
            # Estimate: ~150 words per minute = ~2.5 words per second
            # Rough estimate: 5 characters per word
            chars_per_second = 12.5
            char_index = int(seconds * chars_per_second)
            return message[:char_index]
        
        return SynthesisResult(
            chunk_generator=chunk_generator(),
            get_message_up_to=get_message_up_to
        )


# ============================================================================
# Output Device
# ============================================================================

class WebsocketOutputDevice:
    """Sends audio chunks to client via WebSocket"""
    
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
    
    async def consume_nonblocking(self, chunk: bytes):
        """Send audio chunk to client"""
        await self.websocket.send_bytes(chunk)


# ============================================================================
# Conversation Orchestrator
# ============================================================================

class StreamingConversation:
    """Orchestrates the entire voice conversation pipeline"""
    
    def __init__(
        self,
        output_device: WebsocketOutputDevice,
        transcriber: DeepgramTranscriber,
        agent: GeminiAgent,
        synthesizer: ElevenLabsSynthesizer
    ):
        self.output_device = output_device
        self.transcriber = transcriber
        self.agent = agent
        self.synthesizer = synthesizer
        self.is_human_speaking = True
        self.interrupt_event = asyncio.Event()
    
    async def start(self):
        """Start all workers"""
        logger.info("🚀 [CONVERSATION] Starting...")
        
        # Start workers
        self.transcriber.start()
        self.agent.start()
        
        # Start processing pipelines
        asyncio.create_task(self._process_transcriptions())
        asyncio.create_task(self._process_agent_responses())
    
    async def _process_transcriptions(self):
        """Process transcriptions from transcriber"""
        while True:
            transcription = await self.transcriber.output_queue.get()
            
            # Check if this is an interrupt
            if not self.is_human_speaking:
                logger.info("⚠️ [INTERRUPT] User interrupted bot")
                self.interrupt_event.set()
                transcription.is_interrupt = True
            
            self.is_human_speaking = True
            
            # Send to agent
            await self.agent.input_queue.put(transcription)
    
    async def _process_agent_responses(self):
        """Process responses from agent and synthesize"""
        while True:
            response = await self.agent.output_queue.get()
            
            self.is_human_speaking = False
            
            # Mute transcriber to prevent echo
            self.transcriber.mute()
            
            # Synthesize and play
            synthesis_result = await self.synthesizer.create_speech(response.message)
            await self._send_speech_to_output(synthesis_result, seconds_per_chunk=0.1)
            
            # Unmute transcriber
            self.transcriber.unmute()
            
            self.is_human_speaking = True
    
    async def _send_speech_to_output(self, synthesis_result: SynthesisResult, seconds_per_chunk: float):
        """
        Send synthesized audio to output with rate limiting
        
        CRITICAL: Rate limiting enables interrupts to work
        """
        chunk_idx = 0
        
        async for chunk in synthesis_result.chunk_generator:
            # Check for interrupt
            if self.interrupt_event.is_set():
                logger.info(f"🛑 [INTERRUPT] Stopped after {chunk_idx} chunks")
                
                # Calculate what was actually spoken
                seconds_spoken = chunk_idx * seconds_per_chunk
                partial_message = synthesis_result.get_message_up_to(seconds_spoken)
                logger.info(f"📝 [INTERRUPT] Partial message: '{partial_message}'")
                
                # Clear interrupt event
                self.interrupt_event.clear()
                return
            
            start_time = asyncio.get_event_loop().time()
            
            # Send chunk to output device
            await self.output_device.consume_nonblocking(chunk)
            
            # CRITICAL: Wait for chunk to play before sending next one
            # This is what makes interrupts work!
            processing_time = asyncio.get_event_loop().time() - start_time
            await asyncio.sleep(max(seconds_per_chunk - processing_time, 0))
            
            chunk_idx += 1
    
    def receive_audio(self, audio_chunk: bytes):
        """Receive audio from client"""
        self.transcriber.send_audio(audio_chunk)
    
    async def terminate(self):
        """Gracefully shut down all workers"""
        logger.info("🛑 [CONVERSATION] Terminating...")
        
        self.transcriber.terminate()
        self.agent.terminate()
        
        # Wait for queues to drain
        await asyncio.sleep(0.5)


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/conversation")
async def conversation_endpoint(websocket: WebSocket):
    """WebSocket endpoint for voice conversations"""
    await websocket.accept()
    logger.info("✅ [WEBSOCKET] Client connected")
    
    # Configuration
    config = {
        "transcriberProvider": "deepgram",
        "llmProvider": "gemini",
        "voiceProvider": "elevenlabs",
        "prompt": "You are a helpful AI assistant.",
    }
    
    # Create components
    transcriber = DeepgramTranscriber(config)
    agent = GeminiAgent(config)
    synthesizer = ElevenLabsSynthesizer(config)
    output_device = WebsocketOutputDevice(websocket)
    
    # Create conversation
    conversation = StreamingConversation(
        output_device=output_device,
        transcriber=transcriber,
        agent=agent,
        synthesizer=synthesizer
    )
    
    # Start conversation
    await conversation.start()
    
    try:
        # Process incoming audio
        async for message in websocket.iter_bytes():
            conversation.receive_audio(message)
    except WebSocketDisconnect:
        logger.info("❌ [WEBSOCKET] Client disconnected")
    except Exception as e:
        logger.error(f"❌ [WEBSOCKET] Error: {e}", exc_info=True)
    finally:
        await conversation.terminate()


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Voice AI Engine...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
