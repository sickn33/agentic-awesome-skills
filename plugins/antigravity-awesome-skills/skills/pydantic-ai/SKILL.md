---
name: pydantic-ai
description: "Build production-ready AI agents with PydanticAI — type-safe tool use, structured outputs, dependency injection, and multi-model support."
category: ai-agents
risk: safe
source: community
date_added: "2026-03-18"
author: suhaibjanjua
tags: [pydantic-ai, ai-agents, llm, openai, anthropic, gemini, tool-use, structured-output, python]
tools: [claude, cursor, gemini]
---

# PydanticAI — Typed AI Agents in Python

## Overview

PydanticAI is a Python agent framework from the Pydantic team that brings the same type-safety and validation guarantees as Pydantic to LLM-based applications. It supports structured outputs (validated with Pydantic models), dependency injection for testability, streamed responses, multi-turn conversations, and tool use — across OpenAI, Anthropic, Google Gemini, Groq, Mistral, and Ollama. Use this skill when building production AI agents, chatbots, or LLM pipelines where correctness and testability matter.

## When to Use This Skill

- Use when building Python AI agents that call tools and return structured data
- Use when you need validated, typed LLM outputs (not raw strings)
- Use when you want to write unit tests for agent logic without hitting a real LLM
- Use when switching between LLM providers without rewriting agent code
- Use when the user asks about `Agent`, `@agent.tool`, `RunContext`, `ModelRetry`, or `result_type`

## How It Works

### Step 1: Installation

```bash
pip install pydantic-ai

# Install extras for specific providers
pip install 'pydantic-ai[openai]'       # OpenAI / Azure OpenAI
pip install 'pydantic-ai[anthropic]'    # Anthropic Claude
pip install 'pydantic-ai[gemini]'       # Google Gemini
pip install 'pydantic-ai[groq]'         # Groq
pip install 'pydantic-ai[vertexai]'     # Google Vertex AI
```

### Step 2: A Minimal Agent

```python
from pydantic_ai import Agent

# Simple agent — returns a plain string
agent = Agent(
    'anthropic:claude-sonnet-4-6',
    system_prompt='You are a helpful assistant. Be concise.',
)

result = agent.run_sync('What is the capital of Japan?')
print(result.data)  # "Tokyo"
print(result.usage())  # Usage(requests=1, request_tokens=..., response_tokens=...)
```

### Step 3: Structured Output with Pydantic Models

```python
from pydantic import BaseModel
from pydantic_ai import Agent

class MovieReview(BaseModel):
    title: str
    year: int
    rating: float  # 0.0 to 10.0
    summary: str
    recommended: bool

agent = Agent(
    'openai:gpt-4o',
    result_type=MovieReview,
    system_prompt='You are a film critic. Return structured reviews.',
)

result = agent.run_sync('Review Inception (2010)')
review = result.data  # Fully typed MovieReview instance
print(f"{review.title} ({review.year}): {review.rating}/10")
print(f"Recommended: {review.recommended}")
```

### Step 4: Tool Use

Register tools with `@agent.tool` — the LLM can call them during a run:

```python
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel
import httpx

class WeatherReport(BaseModel):
    city: str
    temperature_c: float
    condition: str

weather_agent = Agent(
    'anthropic:claude-sonnet-4-6',
    result_type=WeatherReport,
    system_prompt='Get current weather for the requested city.',
)

@weather_agent.tool
async def get_temperature(ctx: RunContext, city: str) -> dict:
    """Fetch the current temperature for a city from the weather API."""
    async with httpx.AsyncClient() as client:
        r = await client.get(f'https://wttr.in/{city}?format=j1')
        data = r.json()
        return {
            'temp_c': float(data['current_condition'][0]['temp_C']),
            'description': data['current_condition'][0]['weatherDesc'][0]['value'],
        }

import asyncio
result = asyncio.run(weather_agent.run('What is the weather in Tokyo?'))
print(result.data)
```

### Step 5: Dependency Injection

Inject services (database, HTTP clients, config) into agents for testability:

```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel

@dataclass
class Deps:
    db: Database
    user_id: str

class SupportResponse(BaseModel):
    message: str
    escalate: bool

support_agent = Agent(
    'openai:gpt-4o-mini',
    deps_type=Deps,
    result_type=SupportResponse,
    system_prompt='You are a support agent. Use the tools to help customers.',
)

@support_agent.tool
async def get_order_history(ctx: RunContext[Deps]) -> list[dict]:
    """Fetch recent orders for the current user."""
    return await ctx.deps.db.get_orders(ctx.deps.user_id, limit=5)

@support_agent.tool
async def create_refund(ctx: RunContext[Deps], order_id: str, reason: str) -> dict:
    """Initiate a refund for a specific order."""
    return await ctx.deps.db.create_refund(order_id, reason, ctx.deps.user_id)

# Usage
async def handle_support(user_id: str, message: str):
    deps = Deps(db=get_db(), user_id=user_id)
    result = await support_agent.run(message, deps=deps)
    return result.data
```

### Step 6: Testing with TestModel

Write unit tests without real LLM calls:

```python
from pydantic_ai.models.test import TestModel

def test_support_agent_escalates():
    with support_agent.override(model=TestModel()):
        # TestModel returns a minimal valid response matching result_type
        result = support_agent.run_sync(
            'I want to cancel my account',
            deps=Deps(db=FakeDb(), user_id='user-123'),
        )
    # Test the structure, not the LLM's exact words
    assert isinstance(result.data, SupportResponse)
    assert isinstance(result.data.escalate, bool)
```

**FunctionModel** for deterministic test responses:

```python
from pydantic_ai.models.function import FunctionModel, ModelContext

def my_model(messages, info):
    return ModelResponse(parts=[TextPart('Always this response')])

with agent.override(model=FunctionModel(my_model)):
    result = agent.run_sync('anything')
```

### Step 7: Streaming Responses

```python
import asyncio
from pydantic_ai import Agent

agent = Agent('anthropic:claude-sonnet-4-6')

async def stream_response():
    async with agent.run_stream('Write a haiku about Python') as result:
        async for chunk in result.stream_text():
            print(chunk, end='', flush=True)
    print()  # newline
    print(f"Total tokens: {result.usage()}")

asyncio.run(stream_response())
```

### Step 8: Multi-Turn Conversations

```python
from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessagesTypeAdapter

agent = Agent('openai:gpt-4o', system_prompt='You are a helpful assistant.')

# First turn
result1 = agent.run_sync('My name is Alice.')
history = result1.all_messages()

# Second turn — passes conversation history
result2 = agent.run_sync('What is my name?', message_history=history)
print(result2.data)  # "Your name is Alice."
```

## Examples

### Example 1: Code Review Agent

```python
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from typing import Literal

class CodeReview(BaseModel):
    quality: Literal['excellent', 'good', 'needs_work', 'poor']
    issues: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    approved: bool

code_review_agent = Agent(
    'anthropic:claude-sonnet-4-6',
    result_type=CodeReview,
    system_prompt="""
    You are a senior engineer performing code review.
    Evaluate code quality, identify issues, and provide actionable suggestions.
    Set approved=True only for good or excellent quality code with no security issues.
    """,
)

def review_code(diff: str) -> CodeReview:
    result = code_review_agent.run_sync(f"Review this code:\n\n{diff}")
    return result.data
```

### Example 2: Agent with Retry Logic

```python
from pydantic_ai import Agent, ModelRetry
from pydantic import BaseModel, field_validator

class StrictJson(BaseModel):
    value: int

    @field_validator('value')
    def must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('value must be positive')
        return v

agent = Agent('openai:gpt-4o-mini', result_type=StrictJson)

@agent.result_validator
async def validate_result(ctx, result: StrictJson) -> StrictJson:
    if result.value > 1000:
        raise ModelRetry('Value must be under 1000. Try again with a smaller number.')
    return result
```

### Example 3: Multi-Agent Pipeline

```python
from pydantic_ai import Agent
from pydantic import BaseModel

class ResearchSummary(BaseModel):
    key_points: list[str]
    conclusion: str

class BlogPost(BaseModel):
    title: str
    body: str
    meta_description: str

researcher = Agent('openai:gpt-4o', result_type=ResearchSummary)
writer = Agent('anthropic:claude-sonnet-4-6', result_type=BlogPost)

async def research_and_write(topic: str) -> BlogPost:
    # Stage 1: research
    research = await researcher.run(f'Research the topic: {topic}')

    # Stage 2: write based on research
    post = await writer.run(
        f'Write a blog post about: {topic}\n\nResearch:\n' +
        '\n'.join(f'- {p}' for p in research.data.key_points) +
        f'\n\nConclusion: {research.data.conclusion}'
    )
    return post.data
```

## Best Practices

- ✅ Always define `result_type` with a Pydantic model — avoid returning raw strings in production
- ✅ Use `deps_type` with a dataclass for dependency injection — makes agents testable
- ✅ Use `TestModel` in unit tests — never hit a real LLM in CI
- ✅ Add `@agent.result_validator` for business-logic checks beyond Pydantic validation
- ✅ Use `run_stream` for long outputs in user-facing applications to show progressive results
- ❌ Don't put secrets (API keys) in `Agent()` arguments — use environment variables
- ❌ Don't share a single `Agent` instance across async tasks if deps differ — create per-request instances or use `agent.run()` with per-call `deps`
- ❌ Don't catch `ValidationError` broadly — let PydanticAI retry with `ModelRetry` for recoverable LLM output errors

## Security & Safety Notes

- Set API keys via environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) — never hardcode them.
- Validate all tool inputs before passing to external systems — use Pydantic models or manual checks.
- Tools that mutate data (write to DB, send emails, call payment APIs) should require explicit user confirmation before the agent invokes them in production.
- Log `result.all_messages()` for audit trails when agents perform consequential actions.
- Set `retries=` limits on `Agent()` to prevent runaway loops on persistent validation failures.

## Common Pitfalls

- **Problem:** `ValidationError` on every LLM response — structured output never validates
  **Solution:** Simplify `result_type` fields. Use `Optional` and `default` where appropriate. The model may struggle with overly strict schemas.

- **Problem:** Tool is never called by the LLM
  **Solution:** Write a clear, specific docstring for the tool function — PydanticAI sends the docstring as the tool description to the LLM.

- **Problem:** `RunContext` dependency is `None` inside a tool
  **Solution:** Pass `deps=` when calling `agent.run()` or `agent.run_sync()`. Dependencies are not set globally.

- **Problem:** `asyncio.run()` error when calling `agent.run()` inside FastAPI
  **Solution:** Use `await agent.run()` directly in async FastAPI route handlers — don't wrap in `asyncio.run()`.

## Related Skills

- `@langchain-architecture` — Alternative Python AI framework (more flexible, less type-safe)
- `@llm-application-dev-ai-assistant` — General LLM application development patterns
- `@fastapi-templates` — Serving PydanticAI agents via FastAPI endpoints
- `@agent-orchestration-multi-agent-optimize` — Orchestrating multiple PydanticAI agents

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
