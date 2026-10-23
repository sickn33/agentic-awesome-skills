# Thread Management Reference

**Compatibility note:** This is preserved legacy-generation reference material, not a verified current SDK recipe. Apply the SDK-generation, authorization, privacy, cost and cleanup gate in the root skill before adapting any snippet.

Patterns for managing conversation state and multi-turn interactions.

## Overview

`AgentThread` links agent execution to server-side conversation state, enabling:
- Multi-turn conversations with context
- Conversation persistence and resumption
- Thread-based message history

---

## Creating and Using Threads

### Basic Multi-Turn Conversation

```python
from agent_framework.azure import AzureAIAgentsProvider
from azure.identity.aio import AzureCliCredential

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="ChatAgent",
        instructions="You are a helpful assistant.",
    )

    # Create a new thread for the conversation
    thread = agent.get_new_thread()

    # First turn
    result1 = await agent.run("My name is Alice", thread=thread)
    print(f"Agent: {result1.text}")

    # Second turn - agent remembers the name
    result2 = await agent.run("What's my name?", thread=thread)
    print(f"Agent: {result2.text}")

    # Third turn - context continues
    result3 = await agent.run("Tell me a joke about my name", thread=thread)
    print(f"Agent: {result3.text}")
```

### Accessing Thread Information

```python
thread = agent.get_new_thread()

# Run a conversation
await agent.run("Hello!", thread=thread)

# Access the conversation ID for persistence
print(f"Conversation ID: {thread.conversation_id}")

# Thread also tracks service-side thread ID (for Azure AI agents)
print(f"Service Thread ID: {thread.service_thread_id}")
```

---

## Conversation Persistence

Bind agent/thread IDs to the authenticated tenant and user in server-side storage; possession of a client-supplied ID is not authorization. Serialize turns per conversation, use private storage and a defined expiry/deletion policy. Loading a different user's JSON must fail authorization before contacting the service.

### Saving Thread ID

```python
import json

async def save_conversation(thread, filepath: str):
    """Save thread ID for later resumption."""
    data = {
        "conversation_id": thread.conversation_id,
        "service_thread_id": thread.service_thread_id,
    }
    with open(filepath, "x") as f:  # fresh private application-controlled path
        json.dump(data, f)

# Usage
thread = agent.get_new_thread()
await agent.run("Start a conversation", thread=thread)
await save_conversation(thread, "conversation.json")
```

### Resuming Conversations

For Azure AI agents with persistent server-side threads, you can resume conversations:

```python
import json
from agent_framework import AgentThread

async def load_and_resume(provider, agent_id: str, filepath: str):
    """Resume a previous conversation."""
    with open(filepath) as f:
        data = json.load(f)

    # Get the existing agent
    agent = await provider.get_agent(agent_id=agent_id)

    # Create thread with existing service thread ID
    thread = AgentThread(service_thread_id=data["service_thread_id"])

    # Continue the conversation
    result = await agent.run("Continue our conversation", thread=thread)
    return result
```

---

## Thread with Streaming

Threads work the same way with streaming responses:

```python
thread = agent.get_new_thread()

# First turn - streaming
print("Agent: ", end="", flush=True)
async for chunk in agent.run_stream("Tell me about Python", thread=thread):
    if chunk.text:
        print(chunk.text, end="", flush=True)
print()

# Second turn - non-streaming (context maintained)
result = await agent.run("What was that language again?", thread=thread)
print(f"Agent: {result.text}")

# Third turn - streaming again
print("Agent: ", end="", flush=True)
async for chunk in agent.run_stream("Give me a code example", thread=thread):
    if chunk.text:
        print(chunk.text, end="", flush=True)
print()
```

---

## Thread with Tools

Tools work seamlessly within threaded conversations:

```python
from typing import Annotated
from pydantic import Field

def search_database(
    query: Annotated[str, Field(description="Search query")]
) -> str:
    """Search the database for information."""
    return f"Results for '{query}': Item A, Item B, Item C"

def get_item_details(
    item_name: Annotated[str, Field(description="Name of the item")]
) -> str:
    """Get details for a specific item."""
    return f"Details for {item_name}: Price $99, In Stock: Yes"

async with (
    AzureCliCredential() as credential,
    AzureAIAgentsProvider(credential=credential) as provider,
):
    agent = await provider.create_agent(
        name="ShoppingAgent",
        instructions="Help users find and learn about products.",
        tools=[search_database, get_item_details],
    )

    thread = agent.get_new_thread()

    # Turn 1: Search
    result1 = await agent.run("Search for laptops", thread=thread)
    print(f"Agent: {result1.text}")

    # Turn 2: Follow-up (context aware)
    result2 = await agent.run("Tell me more about Item A", thread=thread)
    print(f"Agent: {result2.text}")

    # Turn 3: Another follow-up
    result3 = await agent.run("Is it available?", thread=thread)
    print(f"Agent: {result3.text}")
```

---

## Multiple Parallel Conversations

Handle multiple users/conversations simultaneously:

```python
async def handle_user_session(provider, user_id: str, messages: list[str]):
    """Handle a single user's conversation."""
    agent = await provider.create_agent(
        name=f"Agent-{user_id}",
        instructions="You are a helpful assistant.",
    )

    # Each user gets their own thread
    thread = agent.get_new_thread()

    for message in messages:
        result = await agent.run(message, thread=thread)
        print("User turn processed")
        print("Agent turn completed")

# Handle multiple users concurrently
import asyncio

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentsProvider(credential=credential) as provider,
    ):
        await asyncio.gather(
            handle_user_session(provider, "user1", ["Hello", "What's 2+2?"]),
            handle_user_session(provider, "user2", ["Hi there", "Tell me a joke"]),
            handle_user_session(provider, "user3", ["Good morning", "Weather today?"]),
        )
```

---

## Thread Best Practices

### Do's

```python
# ✅ Create a new thread for each logical conversation
thread = agent.get_new_thread()

# ✅ Pass the same thread to maintain context
await agent.run("Message 1", thread=thread)
await agent.run("Message 2", thread=thread)

# ✅ Save thread IDs for conversations that need resumption
conversation_id = thread.conversation_id
```

### Don'ts

```python
# ❌ Don't create a new thread for each message (loses context)
for msg in messages:
    thread = agent.get_new_thread()  # Wrong!
    await agent.run(msg, thread=thread)

# ❌ Don't share threads between different agents
agent1_thread = agent1.get_new_thread()
await agent2.run("Hello", thread=agent1_thread)  # May cause issues

# ❌ Don't forget to pass the thread (single-turn only)
await agent.run("Message 1")  # No thread - no context saved
await agent.run("Message 2")  # Can't reference previous message
```

---

## Thread Lifecycle

```
1. agent.get_new_thread()
   └── Creates new AgentThread object
   └── Server-side thread created on first run

2. agent.run(..., thread=thread)
   └── Message added to thread
   └── Agent response added to thread
   └── Context accumulated

3. (Optional) Save thread.conversation_id
   └── For later resumption

4. (Optional) Resume with AgentThread(service_thread_id=...)
   └── Continues existing conversation
```

---

## Stateless vs Stateful Patterns

### Stateless (No Thread)

Each call is independent:

```python
# Good for one-shot queries
result = await agent.run("What is 2+2?")
```

### Stateful (With Thread)

Context persists across calls:

```python
# Good for conversations
thread = agent.get_new_thread()
result1 = await agent.run("My favorite color is blue", thread=thread)
result2 = await agent.run("What's my favorite color?", thread=thread)  # Knows it's blue
```
