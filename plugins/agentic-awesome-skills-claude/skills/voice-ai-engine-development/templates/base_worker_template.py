"""
Template: Base Worker Implementation

Use this template as a starting point for creating new workers
in your voice AI pipeline.
"""

import asyncio
from typing import Any
import logging

logger = logging.getLogger(__name__)


class BaseWorker:
    """
    Base class for all workers in the voice AI pipeline
    
    Workers follow the producer-consumer pattern:
    - Consume items from input_queue
    - Process items
    - Produce results to output_queue
    
    All workers run concurrently via asyncio.
    """
    
    def __init__(self, input_queue: asyncio.Queue, output_queue: asyncio.Queue):
        """
        Initialize the worker
        
        Args:
            input_queue: Queue to consume items from
            output_queue: Queue to produce results to
        """
        self.input_queue = input_queue
        self.output_queue = output_queue
        self.active = False
        self._task = None
    
    def start(self):
        """Start the worker's processing loop"""
        self.active = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"✅ [{self.__class__.__name__}] Started")
    
    async def _run_loop(self):
        """
        Main processing loop - runs forever until terminated
        
        This loop:
        1. Waits for items from input_queue
        2. Processes each item
        3. Handles errors gracefully
        """
        while self.active:
            try:
                # Block until item arrives
                item = await self.input_queue.get()
                
                # Process the item
                await self.process(item)
                
            except asyncio.CancelledError:
                # Task was cancelled (normal during shutdown)
                logger.info(f"🛑 [{self.__class__.__name__}] Task cancelled")
                break
                
            except Exception as e:
                # Log error but don't crash the worker
                logger.error(
                    f"❌ [{self.__class__.__name__}] Error processing item: {e}",
                    exc_info=True
                )
                # Continue processing next item
    
    async def process(self, item: Any):
        """
        Process a single item
        
        Override this method in your worker implementation.
        
        Args:
            item: The item to process
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} must implement process()"
        )
    
    def terminate(self):
        """
        Stop the worker gracefully
        
        This sets active=False and cancels the processing task.
        """
        self.active = False
        
        if self._task and not self._task.done():
            self._task.cancel()
        
        logger.info(f"🛑 [{self.__class__.__name__}] Terminated")
    
    async def wait_for_completion(self):
        """Wait for the worker task to complete"""
        if self._task:
            try:
                await self._task
            except asyncio.CancelledError:
                pass


# ============================================================================
# Example: Custom Worker Implementation
# ============================================================================

class ExampleWorker(BaseWorker):
    """
    Example worker that demonstrates how to extend BaseWorker
    
    This worker receives strings, converts them to uppercase,
    and sends them to the output queue.
    """
    
    def __init__(self, input_queue: asyncio.Queue, output_queue: asyncio.Queue):
        super().__init__(input_queue, output_queue)
        # Add any custom initialization here
        self.processed_count = 0
    
    async def process(self, item: str):
        """
        Process a single item
        
        Args:
            item: String to convert to uppercase
        """
        # Simulate some processing time
        await asyncio.sleep(0.1)
        
        # Process the item
        result = item.upper()
        
        # Send to output queue
        self.output_queue.put_nowait(result)
        
        # Update counter
        self.processed_count += 1
        
        logger.info(
            f"✅ [{self.__class__.__name__}] "
            f"Processed '{item}' -> '{result}' "
            f"(total: {self.processed_count})"
        )


# ============================================================================
# Example Usage
# ============================================================================

async def example_usage():
    """Example of how to use the worker"""
    
    # Create queues
    input_queue = asyncio.Queue()
    output_queue = asyncio.Queue()
    
    # Create worker
    worker = ExampleWorker(input_queue, output_queue)
    
    # Start worker
    worker.start()
    
    # Send items to process
    items = ["hello", "world", "voice", "ai"]
    for item in items:
        input_queue.put_nowait(item)
    
    # Wait for processing
    await asyncio.sleep(0.5)
    
    # Get results
    results = []
    while not output_queue.empty():
        results.append(await output_queue.get())
    
    print(f"\n✅ Results: {results}")
    
    # Terminate worker
    worker.terminate()
    await worker.wait_for_completion()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(example_usage())
