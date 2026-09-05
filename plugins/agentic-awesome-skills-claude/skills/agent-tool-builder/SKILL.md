---
name: agent-tool-builder
description: Tools are how AI agents interact with the world. A well-designed
  tool is the difference between an agent that works and one that hallucinates,
  fails silently, or costs 10x more tokens than necessary. This skill covers
  tool design from schema to error handling.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Agent Tool Builder

Tools are how AI agents interact with the world. A well-designed tool is the
difference between an agent that works and one that hallucinates, fails
silently, or costs 10x more tokens than necessary.

This skill covers tool design from schema to error handling. JSON Schema
best practices, description writing that actually helps the LLM, validation,
and the emerging MCP standard that's becoming the lingua franca for AI tools.

Key insight: Tool descriptions are more important than tool implementations.
The LLM never sees your code - it only sees the schema and description.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Python Example
"""
import anthropic
from anthropic import beta_tool

client = anthropic.Anthropic()

@beta_tool
def get_weather(location: str, unit: str = "fahrenheit") -> str:
    '''Get the current weather in a given location.

    Args:
        location: The city and state, e.g. San Francisco, CA
        unit: Temperature unit, either 'celsius' or 'fahrenheit'
    '''
    # Implementation
    return json.dumps({"temperature": "72°F", "conditions": "Sunny"})

@beta_tool
def search_web(query: str) -> str:
    '''Search the web for information.

    Args:
        query: The search query
    '''
    # Implementation
    return json.dumps({"results": [...]})

# Tool runner handles the loop
runner = client.beta.messages.tool_runner(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[get_weather, search_web],
    messages=[
        {"role": "user", "content": "What's the weather in Paris?"}
    ]
)

# Process each message
for message in runner:
    print(message.content[0].text)

# Or just get final result
final = runner.until_done()
"""

## When to Use
- User mentions or implies: agent tool
- User mentions or implies: function calling
- User mentions or implies: tool schema
- User mentions or implies: tool design
- User mentions or implies: mcp server
- User mentions or implies: mcp tool
- User mentions or implies: tool use
- User mentions or implies: build tool for agent
- User mentions or implies: define function
- User mentions or implies: input_schema
- User mentions or implies: tool_use
- User mentions or implies: tool_result

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
