"""
Example: Gemini Agent Implementation with Streaming

This example shows how to implement a Gemini-powered agent
that properly buffers responses to prevent audio jumping.
"""

import asyncio
from typing import AsyncGenerator, List, Dict
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class Message:
    role: str  # "user" or "assistant"
    content: str


@dataclass
class GeneratedResponse:
    message: str
    is_interruptible: bool = True


class GeminiAgent:
    """
    LLM-powered conversational agent using Google Gemini
    
    Key Features:
    - Maintains conversation history
    - Streams responses from Gemini API
    - Buffers entire response before yielding (prevents audio jumping)
    - Handles interrupts gracefully
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.conversation_history: List[Message] = []
        self.system_prompt = config.get("prompt", "You are a helpful AI assistant.")
        self.current_task = None
    
    async def generate_response(
        self,
        user_input: str,
        is_interrupt: bool = False
    ) -> AsyncGenerator[GeneratedResponse, None]:
        """
        Generate streaming response from Gemini
        
        IMPORTANT: This buffers the entire LLM response before yielding
        to prevent audio jumping/cutting off.
        
        Args:
            user_input: The user's message
            is_interrupt: Whether this is an interrupt
            
        Yields:
            GeneratedResponse with complete buffered message
        """
        
        # Add user message to history
        self.conversation_history.append(
            Message(role="user", content=user_input)
        )
        
        logger.info(f"🤖 [AGENT] Generating response for: '{user_input}'")
        
        # Build conversation context for Gemini
        contents = self._build_gemini_contents()
        
        # Stream response from Gemini and buffer it
        full_response = ""
        
        try:
            # In a real implementation, this would call Gemini API
            # async for chunk in self._create_gemini_stream(contents):
            #     if isinstance(chunk, str):
            #         full_response += chunk
            
            # For this example, simulate streaming
            async for chunk in self._simulate_gemini_stream(user_input):
                full_response += chunk
                
                # Log progress (optional)
                if len(full_response) % 50 == 0:
                    logger.debug(f"🤖 [AGENT] Buffered {len(full_response)} chars...")
        
        except Exception as e:
            logger.error(f"❌ [AGENT] Error generating response: {e}")
            full_response = "I apologize, but I encountered an error. Could you please try again?"
        
        # CRITICAL: Only yield after buffering the ENTIRE response
        # This prevents multiple TTS calls that cause audio jumping
        if full_response.strip():
            # Add to conversation history
            self.conversation_history.append(
                Message(role="assistant", content=full_response)
            )
            
            logger.info(f"✅ [AGENT] Generated complete response ({len(full_response)} chars)")
            
            yield GeneratedResponse(
                message=full_response.strip(),
                is_interruptible=True
            )
    
    def _build_gemini_contents(self) -> List[Dict]:
        """
        Build conversation contents for Gemini API
        
        Format:
        [
            {"role": "user", "parts": [{"text": "System: ..."}]},
            {"role": "model", "parts": [{"text": "Understood."}]},
            {"role": "user", "parts": [{"text": "Hello"}]},
            {"role": "model", "parts": [{"text": "Hi there!"}]},
            ...
        ]
        """
        contents = []
        
        # Add system prompt as first user message
        if self.system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System Instruction: {self.system_prompt}"}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood."}]
            })
        
        # Add conversation history
        for message in self.conversation_history:
            role = "user" if message.role == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": message.content}]
            })
        
        return contents
    
    async def _simulate_gemini_stream(self, user_input: str) -> AsyncGenerator[str, None]:
        """
        Simulate Gemini streaming response
        
        In a real implementation, this would be:
        
        async def _create_gemini_stream(self, contents):
            response = await genai.GenerativeModel('gemini-pro').generate_content_async(
                contents,
                stream=True
            )
            async for chunk in response:
                if chunk.text:
                    yield chunk.text
        """
        # Simulate response
        response = f"I understand you said: {user_input}. How can I assist you further?"
        
        # Simulate streaming by yielding chunks
        chunk_size = 10
        for i in range(0, len(response), chunk_size):
            chunk = response[i:i + chunk_size]
            await asyncio.sleep(0.05)  # Simulate network delay
            yield chunk
    
    def update_last_bot_message_on_cut_off(self, partial_message: str):
        """
        Update conversation history when bot is interrupted
        
        This ensures the conversation history reflects what was actually spoken,
        not what was planned to be spoken.
        
        Args:
            partial_message: The partial message that was actually spoken
        """
        if self.conversation_history and self.conversation_history[-1].role == "assistant":
            # Update the last bot message with the partial message
            self.conversation_history[-1].content = partial_message
            logger.info(f"📝 [AGENT] Updated history with partial message: '{partial_message}'")
    
    def cancel_current_task(self):
        """Cancel the current generation task (for interrupts)"""
        if self.current_task and not self.current_task.done():
            self.current_task.cancel()
            logger.info("🛑 [AGENT] Cancelled current generation task")
    
    def get_conversation_history(self) -> List[Message]:
        """Get the full conversation history"""
        return self.conversation_history.copy()
    
    def clear_conversation_history(self):
        """Clear the conversation history"""
        self.conversation_history.clear()
        logger.info("🗑️ [AGENT] Cleared conversation history")


# ============================================================================
# Example Usage
# ============================================================================

async def example_usage():
    """Example of how to use the GeminiAgent"""
    
    # Configure agent
    config = {
        "prompt": "You are a helpful AI assistant specializing in voice conversations.",
        "llmProvider": "gemini"
    }
    
    # Create agent
    agent = GeminiAgent(config)
    
    # Simulate conversation
    user_messages = [
        "Hello, how are you?",
        "What's the weather like today?",
        "Thank you!"
    ]
    
    for user_message in user_messages:
        print(f"\n👤 User: {user_message}")
        
        # Generate response
        async for response in agent.generate_response(user_message):
            print(f"🤖 Bot: {response.message}")
    
    # Print conversation history
    print("\n📜 Conversation History:")
    for i, message in enumerate(agent.get_conversation_history(), 1):
        print(f"{i}. {message.role}: {message.content}")


if __name__ == "__main__":
    asyncio.run(example_usage())
