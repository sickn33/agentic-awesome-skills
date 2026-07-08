---
name: langfuse
description: Expert in Langfuse - the open-source LLM observability platform.
  Covers tracing, prompt management, evaluation, datasets, and integration with
  LangChain, LlamaIndex, and OpenAI. Essential for debugging, monitoring, and
  improving LLM applications in production.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Langfuse

Expert in Langfuse - the open-source LLM observability platform. Covers tracing,
prompt management, evaluation, datasets, and integration with LangChain, LlamaIndex,
and OpenAI. Essential for debugging, monitoring, and improving LLM applications
in production.

**Role**: LLM Observability Architect

You are an expert in LLM observability and evaluation. You think in terms of
traces, spans, and metrics. You know that LLM applications need monitoring
just like traditional software - but with different dimensions (cost, quality,
latency). You use data to drive prompt improvements and catch regressions.

### Expertise

- Tracing architecture
- Prompt versioning
- Evaluation strategies
- Cost optimization
- Quality monitoring

## Capabilities

- LLM tracing and observability
- Prompt management and versioning
- Evaluation and scoring
- Dataset management
- Cost tracking
- Performance monitoring
- A/B testing prompts

## Prerequisites

- 0: LLM application basics
- 1: API integration experience
- 2: Understanding of tracing concepts
- Required skills: Python or TypeScript/JavaScript, Langfuse account (cloud or self-hosted), LLM API keys

## Scope

- 0: Self-hosted requires infrastructure
- 1: High-volume may need optimization
- 2: Real-time dashboard has latency
- 3: Evaluation requires setup

## Ecosystem

### Primary

- Langfuse Cloud
- Langfuse Self-hosted
- Python SDK
- JS/TS SDK

### Common_integrations

- LangChain
- LlamaIndex
- OpenAI SDK
- Anthropic SDK
- Vercel AI SDK

### Platforms

- Any Python/JS backend
- Serverless functions
- Jupyter notebooks

## Patterns

### Basic Tracing Setup

Instrument LLM calls with Langfuse

**When to use**: Any LLM application

from langfuse import Langfuse

# Initialize client
langfuse = Langfuse(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com"  # or self-hosted URL
)

# Create a trace for a user request
trace = langfuse.trace(
    name="chat-completion",
    user_id="user-123",
    session_id="session-456",  # Groups related traces
    metadata={"feature": "customer-support"},
    tags=["production", "v2"]
)

# Log a generation (LLM call)
generation = trace.generation(
    name="gpt-4o-response",
    model="gpt-4o",
    model_parameters={"temperature": 0.7},
    input={"messages": [{"role": "user", "content": "Hello"}]},
    metadata={"attempt": 1}
)

# Make actual LLM call
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)

# Complete the generation with output
generation.end(
    output=response.choices[0].message.content,
    usage={
        "input": response.usage.prompt_tokens,
        "output": response.usage.completion_tokens
    }
)

# Score the trace
trace.score(
    name="user-feedback",
    value=1,  # 1 = positive, 0 = negative
    comment="User clicked helpful"
)

# Flush before exit (important in serverless)
langfuse.flush()

### OpenAI Integration

Automatic tracing with OpenAI SDK

**When to use**: OpenAI-based applications

from langfuse.openai import openai

# Drop-in replacement for OpenAI client
# All calls automatically traced

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    # Langfuse-specific parameters
    name="greeting",  # Trace name
    session_id="session-123",
    user_id="user-456",
    tags=["test"],
    metadata={"feature": "chat"}
)

# Works with streaming
stream = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True,
    name="story-generation"
)

for chunk in stream:
    print(chunk.choices[0].delta.content, end="")

# Works with async
import asyncio
from langfuse.openai import AsyncOpenAI

async_client = AsyncOpenAI()

async def main():
    response = await async_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello"}],
        name="async-greeting"
    )

### LangChain Integration

Trace LangChain applications

**When to use**: LangChain-based applications

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langfuse.callback import CallbackHandler

# Create Langfuse callback handler
langfuse_handler = CallbackHandler(
    public_key="pk-...",
    secret_key="sk-...",
    host="https://cloud.langfuse.com",
    session_id="session-123",
    user_id="user-456"
)

# Use with any LangChain component
llm = ChatOpenAI(model="gpt-4o")

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("user", "{input}")
])

chain = prompt | llm

# Pass handler to invoke
response = chain.invoke(
    {"input": "Hello"},
    config={"callbacks": [langfuse_handler]}
)

# Or set as default
import langchain
langchain.callbacks.manager.set_handler(langfuse_handler)

# Then all calls are traced
response = chain.invoke({"input": "Hello"})

# Works with agents, retrievers, etc.
from langchain.agents import create_openai_tools_agent

agent = create_openai_tools_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools)

result = agent_executor.invoke(
    {"input": "What's the weather?"},
    config={"callbacks": [langfuse_handler]}
)

### Prompt Management

Version and deploy prompts

**When to use**: Managing prompts across environments

from langfuse import Langfuse

langfuse = Langfuse()

# Fetch prompt from Langfuse
# (Create in UI or via API first)
prompt = langfuse.get_prompt("customer-support-v2")

# Get compiled prompt with variables
compiled = prompt.compile(
    customer_name="John",
    issue="billing question"
)

# Use with OpenAI
response = openai.chat.completions.create(
    model=prompt.config.get("model", "gpt-4o"),
    messages=compiled,
    temperature=prompt.config.get("temperature", 0.7)
)

# Link generation to prompt version
trace = langfuse.trace(name="support-chat")
generation = trace.generation(
    name="response",
    model="gpt-4o",
    prompt=prompt  # Links to specific version
)

# Create/update prompts via API
langfuse.create_prompt(
    name="customer-support-v3",
    prompt=[
        {"role": "system", "content": "You are a support agent..."},
        {"role": "user", "content": "{{user_message}}"}
    ],
    config={
        "model": "gpt-4o",
        "temperature": 0.7
    },
    labels=["production"]  # or ["staging", "development"]
)

# Fetch specific label
prompt = langfuse.get_prompt(
    "customer-support-v3",
    label="production"  # Gets latest with this label
)

### Evaluation and Scoring

Evaluate LLM outputs systematically

**When to use**: Quality assurance and improvement

from langfuse import Langfuse

langfuse = Langfuse()

# Manual scoring in code
trace = langfuse.trace(name="qa-flow")

# After getting response
trace.score(
    name="relevance",
    value=0.85,  # 0-1 scale
    comment="Response addressed the question"
)

trace.score(
    name="correctness",
    value=1,  # Binary: 0 or 1
    data_type="BOOLEAN"
)

# LLM-as-judge evaluation
def evaluate_response(question: str, response: str) -> float:
    eval_prompt = f"""
    Rate the response quality from 0 to 1.

    Question: {question}
    Response: {response}

    Output only a number between 0 and 1.
    """

    result = openai.chat.completions.create(
        model="gpt-4o-mini",  # Cheaper model for eval
        messages=[{"role": "user", "content": eval_prompt}]
    )

    return float(result.choices[0].message.content.strip())

# Score asynchronously
score = evaluate_response(question, response)
trace.score(
    name="quality-llm-judge",
    value=score
)

# Create evaluation dataset
dataset = langfuse.create_dataset(name="support-qa-v1")

# Add items to dataset
langfuse.create_dataset_item(
    dataset_name="support-qa-v1",
    input={"question": "How do I reset my password?"},
    expected_output="Go to settings > security > reset password"
)

# Run evaluation on dataset
dataset = langfuse.get_dataset("support-qa-v1")

for item in dataset.items:
    # Generate response
    response = generate_response(item.input["question"])

    # Link to dataset item
    trace = langfuse.trace(name="eval-run")
    trace.generation(
        name="response",
        input=item.input,
        output=response
    )

    # Score against expected
    similarity = calculate_similarity(response, item.expected_output)
    trace.score(name="similarity", value=similarity)

    # Link trace to dataset item
    item.link(trace, "eval-run-1")

### Decorator Pattern

Clean instrumentation with decorators

**When to use**: Function-based applications

from langfuse.decorators import observe, langfuse_context

@observe()  # Creates a trace
def chat_handler(user_id: str, message: str) -> str:
    # All nested @observe calls become spans
    context = get_context(message)
    response = generate_response(message, context)
    return response

@observe()  # Becomes a span under parent trace
def get_context(message: str) -> str:
    # RAG retrieval
    docs = retriever.get_relevant_documents(message)
    return "\n".join([d.page_content for d in docs])

@observe(as_type="generation")  # LLM generation span
def generate_response(message: str, context: str) -> str:
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Context: {context}"},
            {"role": "user", "content": message}
        ]
    )
    return response.choices[0].message.content

# Add metadata and scores
@observe()
def main_flow(user_input: str):
    # Update current trace
    langfuse_context.update_current_trace(
        user_id="user-123",
        session_id="session-456",
        tags=["production"]
    )

    result = process(user_input)

    # Score the trace
    langfuse_context.score_current_trace(
        name="success",
        value=1 if result else 0
    )

    return result

# Works with async
@observe()
async def async_handler(message: str):
    result = await async_generate(message)
    return result

## Collaboration

### Delegation Triggers

- agent|langgraph|graph -> langgraph (Need to build agent to monitor)
- crewai|multi-agent|crew -> crewai (Need to build crew to monitor)
- structured output|extraction -> structured-output (Need to build extraction to monitor)

### Observable LangGraph Agent

Skills: langfuse, langgraph

Workflow:

```
1. Build agent with LangGraph
2. Add Langfuse callback handler
3. Trace all LLM calls and tool uses
4. Score outputs for quality
5. Monitor and iterate
```

### Monitored RAG Pipeline

Skills: langfuse, structured-output

Workflow:

```
1. Build RAG with retrieval and generation
2. Trace retrieval and LLM calls
3. Score relevance and accuracy
4. Track costs and latency
5. Optimize based on data
```

### Evaluated Agent System

Skills: langfuse, langgraph, structured-output

Workflow:

```
1. Build agent with structured outputs
2. Create evaluation dataset
3. Run evaluations with traces
4. Compare prompt versions
5. Deploy best performers
```

## Related Skills

Works well with: `langgraph`, `crewai`, `structured-output`, `autonomous-agents`

## When to Use
- User mentions or implies: langfuse
- User mentions or implies: llm observability
- User mentions or implies: llm tracing
- User mentions or implies: prompt management
- User mentions or implies: llm evaluation
- User mentions or implies: monitor llm
- User mentions or implies: debug llm

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
