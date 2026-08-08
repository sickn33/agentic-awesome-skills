"""
Example: Interrupt System Implementation

This example demonstrates how to implement a robust interrupt system
that allows users to interrupt the bot mid-sentence.
"""

import asyncio
import threading
from typing import Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# InterruptibleEvent Pattern
# ============================================================================

class InterruptibleEvent:
    """
    Wrapper for events that can be interrupted
    
    Every event in the pipeline is wrapped in an InterruptibleEvent,
    allowing the system to stop processing mid-stream.
    """
    
    def __init__(self, payload: Any, is_interruptible: bool = True):
        self.payload = payload
        self.is_interruptible = is_interruptible
        self.interruption_event = threading.Event()  # Initially not set
        self.interrupted = False
    
    def interrupt(self) -> bool:
        """
        Interrupt this event
        
        Returns:
            True if the event was interrupted, False if it was not interruptible
        """
        if not self.is_interruptible:
            return False
        
        if not self.interrupted:
            self.interruption_event.set()  # Signal to stop!
            self.interrupted = True
            logger.info("⚠️ [INTERRUPT] Event interrupted")
            return True
        
        return False
    
    def is_interrupted(self) -> bool:
        """Check if this event has been interrupted"""
        return self.interruption_event.is_set()


# ============================================================================
# Conversation with Interrupt Support
# ============================================================================

class ConversationWithInterrupts:
    """
    Conversation orchestrator with interrupt support
    
    Key Features:
    - Tracks all in-flight interruptible events
    - Broadcasts interrupts to all workers
    - Cancels current tasks
    - Updates conversation history with partial messages
    """
    
    def __init__(self):
        self.is_human_speaking = True
        self.interruptible_events = asyncio.Queue()
        self.agent = None  # Set externally
        self.synthesizer_worker = None  # Set externally
    
    def broadcast_interrupt(self) -> bool:
        """
        Broadcast interrupt to all in-flight events
        
        This is called when the user starts speaking while the bot is speaking.
        
        Returns:
            True if any events were interrupted
        """
        num_interrupts = 0
        
        # Interrupt all queued events
        while True:
            try:
                interruptible_event = self.interruptible_events.get_nowait()
                if interruptible_event.interrupt():
                    num_interrupts += 1
            except asyncio.QueueEmpty:
                break
        
        # Cancel current tasks
        if self.agent:
            self.agent.cancel_current_task()
        
        if self.synthesizer_worker:
            self.synthesizer_worker.cancel_current_task()
        
        logger.info(f"⚠️ [INTERRUPT] Interrupted {num_interrupts} events")
        
        return num_interrupts > 0
    
    def add_interruptible_event(self, event: InterruptibleEvent):
        """Add an event to the interruptible queue"""
        self.interruptible_events.put_nowait(event)


# ============================================================================
# Synthesis Worker with Interrupt Support
# ============================================================================

class SynthesisWorkerWithInterrupts:
    """
    Synthesis worker that supports interrupts
    
    Key Features:
    - Checks for interrupts before sending each audio chunk
    - Calculates partial message when interrupted
    - Updates agent's conversation history with partial message
    """
    
    def __init__(self, agent, output_device):
        self.agent = agent
        self.output_device = output_device
        self.current_task = None
    
    async def send_speech_to_output(
        self,
        message: str,
        synthesis_result,
        stop_event: threading.Event,
        seconds_per_chunk: float = 0.1
    ) -> tuple[str, bool]:
        """
        Send synthesized speech to output with interrupt support
        
        Args:
            message: The full message being synthesized
            synthesis_result: SynthesisResult with chunk_generator and get_message_up_to
            stop_event: Event that signals when to stop (interrupt)
            seconds_per_chunk: Duration of each audio chunk in seconds
        
        Returns:
            Tuple of (message_sent, was_cut_off)
            - message_sent: The actual message sent (partial if interrupted)
            - was_cut_off: True if interrupted, False if completed
        """
        chunk_idx = 0
        
        async for chunk_result in synthesis_result.chunk_generator:
            # CRITICAL: Check for interrupt before sending each chunk
            if stop_event.is_set():
                logger.info(f"🛑 [SYNTHESIZER] Interrupted after {chunk_idx} chunks")
                
                # Calculate what was actually spoken
                seconds_spoken = chunk_idx * seconds_per_chunk
                partial_message = synthesis_result.get_message_up_to(seconds_spoken)
                
                logger.info(f"📝 [SYNTHESIZER] Partial message: '{partial_message}'")
                
                return partial_message, True  # cut_off = True
            
            start_time = asyncio.get_event_loop().time()
            
            # Send chunk to output device
            await self.output_device.consume_nonblocking(chunk_result.chunk)
            
            # CRITICAL: Wait for chunk to play before sending next one
            # This is what makes interrupts work!
            processing_time = asyncio.get_event_loop().time() - start_time
            await asyncio.sleep(max(seconds_per_chunk - processing_time, 0))
            
            chunk_idx += 1
        
        # Completed without interruption
        logger.info(f"✅ [SYNTHESIZER] Completed {chunk_idx} chunks")
        return message, False  # cut_off = False
    
    def cancel_current_task(self):
        """Cancel the current synthesis task"""
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()
            logger.info("🛑 [SYNTHESIZER] Cancelled current task")


# ============================================================================
# Transcription Worker with Interrupt Detection
# ============================================================================

class TranscriptionWorkerWithInterrupts:
    """
    Transcription worker that detects interrupts
    
    Key Features:
    - Detects when user speaks while bot is speaking
    - Marks transcription as interrupt
    - Triggers broadcast_interrupt()
    """
    
    def __init__(self, conversation):
        self.conversation = conversation
    
    async def process(self, transcription):
        """
        Process transcription and detect interrupts
        
        If the user starts speaking while the bot is speaking,
        this is an interrupt.
        """
        
        # Check if this is an interrupt
        if not self.conversation.is_human_speaking:
            logger.info("⚠️ [TRANSCRIPTION] User interrupted bot!")
            
            # Broadcast interrupt to all in-flight events
            interrupted = self.conversation.broadcast_interrupt()
            transcription.is_interrupt = interrupted
        
        # Update speaking state
        self.conversation.is_human_speaking = True
        
        # Continue processing transcription...
        logger.info(f"🎤 [TRANSCRIPTION] Received: '{transcription.message}'")


# ============================================================================
# Example Usage
# ============================================================================

@dataclass
class MockTranscription:
    message: str
    is_interrupt: bool = False


@dataclass
class MockSynthesisResult:
    async def chunk_generator(self):
        """Generate mock audio chunks"""
        for i in range(10):
            await asyncio.sleep(0.1)
            yield type('obj', (object,), {'chunk': b'\x00' * 1024})()
    
    def get_message_up_to(self, seconds: float) -> str:
        """Get partial message up to specified seconds"""
        full_message = "I think the weather will be nice today and tomorrow and the day after."
        chars_per_second = len(full_message) / 1.0  # Assume 1 second total
        char_index = int(seconds * chars_per_second)
        return full_message[:char_index]


async def example_interrupt_scenario():
    """
    Example scenario: User interrupts bot mid-sentence
    """
    
    print("🎬 Scenario: User interrupts bot mid-sentence\n")
    
    # Create conversation
    conversation = ConversationWithInterrupts()
    
    # Create mock components
    class MockAgent:
        def cancel_current_task(self):
            print("🛑 [AGENT] Task cancelled")
        
        def update_last_bot_message_on_cut_off(self, partial_message):
            print(f"📝 [AGENT] Updated history: '{partial_message}'")
    
    class MockOutputDevice:
        async def consume_nonblocking(self, chunk):
            pass
    
    agent = MockAgent()
    output_device = MockOutputDevice()
    conversation.agent = agent
    
    # Create synthesis worker
    synthesis_worker = SynthesisWorkerWithInterrupts(agent, output_device)
    conversation.synthesizer_worker = synthesis_worker
    
    # Create interruptible event
    stop_event = threading.Event()
    interruptible_event = InterruptibleEvent(
        payload="Bot is speaking...",
        is_interruptible=True
    )
    conversation.add_interruptible_event(interruptible_event)
    
    # Start bot speaking
    print("🤖 Bot starts speaking: 'I think the weather will be nice today and tomorrow and the day after.'\n")
    conversation.is_human_speaking = False
    
    # Simulate synthesis in background
    synthesis_result = MockSynthesisResult()
    synthesis_task = asyncio.create_task(
        synthesis_worker.send_speech_to_output(
            message="I think the weather will be nice today and tomorrow and the day after.",
            synthesis_result=synthesis_result,
            stop_event=stop_event,
            seconds_per_chunk=0.1
        )
    )
    
    # Wait a bit, then interrupt
    await asyncio.sleep(0.3)
    
    print("👤 User interrupts: 'Stop!'\n")
    
    # Trigger interrupt
    conversation.broadcast_interrupt()
    stop_event.set()
    
    # Wait for synthesis to finish
    message_sent, was_cut_off = await synthesis_task
    
    print(f"\n✅ Result:")
    print(f"   - Message sent: '{message_sent}'")
    print(f"   - Was cut off: {was_cut_off}")
    
    # Update agent history
    if was_cut_off:
        agent.update_last_bot_message_on_cut_off(message_sent)


if __name__ == "__main__":
    asyncio.run(example_interrupt_scenario())
