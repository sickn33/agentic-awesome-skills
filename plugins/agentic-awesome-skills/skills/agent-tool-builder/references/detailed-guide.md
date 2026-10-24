# Agent Tool Builder - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Principles

- Descriptions aid selection; implementation enforces authorization and correct effects
- Choose a discoverable relevant tool subset; no universal 20-tool limit
- Every tool needs explicit error handling - silent failures poison agents
- Return the provider/protocol-defined content and structured results; JSON text is one option
- Validation gates before execution - reject, fix, or escalate, never silent fail
- Test tools with the LLM, not just unit tests


## Capabilities

- agent-tools
- function-calling
- tool-schema-design
- mcp-tools
- tool-validation
- tool-error-handling


## Scope

- multi-agent-coordination → multi-agent-orchestration
- agent-memory → agent-memory-systems
- api-design → api-designer
- llm-prompting → prompt-engineering


## Tooling

### Standards

- JSON Schema - When: All tool definitions Note: The universal format for tool schemas
- MCP (Model Context Protocol) - When: Building reusable, cross-platform tools Note: Anthropic's open standard, widely adopted

### Frameworks

- Anthropic SDK - When: Claude-based agents Note: Beta tool runner handles most complexity
- OpenAI Functions - When: OpenAI-based agents Note: Verify supported strict schema constraints; schema validity does not authorize actions or establish semantic correctness
- Vercel AI SDK - When: Multi-provider tool handling Note: Abstracts differences between providers
- LangChain Tools - When: LangChain-based agents Note: Converts MCP tools to LangChain format


## Patterns

### Tool Schema Design

Creating clear, unambiguous JSON Schema for tools

**When to use**: Defining any new tool for an agent

# TOOL SCHEMA BEST PRACTICES:


## 1. Detailed Descriptions (Most Important)
"""
BAD - Too vague:
{
  "name": "get_stock_price",
  "description": "Gets stock price",
  "input_schema": {
    "type": "object",
    "properties": {
      "ticker": {"type": "string"}
    }
  }
}

GOOD - Comprehensive:
{
  "name": "get_stock_price",
  "description": "Retrieves the current stock price for a given ticker
    symbol. The ticker symbol must be a valid symbol for a publicly
    traded company on a major US stock exchange like NYSE or NASDAQ.
    Returns the latest trade price in USD. Use when the user asks
    about current or recent stock prices. Does NOT provide historical
    data, company info, or predictions.",
  "input_schema": {
    "type": "object",
    "properties": {
      "ticker": {
        "type": "string",
        "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
      }
    },
    "required": ["ticker"]
  }
}
"""


## 2. Parameter Descriptions
"""
Every parameter needs:
- What it is
- Format expected
- Example value
- Edge cases/limitations

{
  "location": {
    "type": "string",
    "description": "City and state/country. Format: 'City, State' for US
      (e.g., 'San Francisco, CA') or 'City, Country' for international
      (e.g., 'Tokyo, Japan'). Do not use ZIP codes or coordinates."
  },
  "unit": {
    "type": "string",
    "enum": ["celsius", "fahrenheit"],
    "description": "Temperature unit. Defaults to user's locale if not
      specified. Use 'fahrenheit' for US users, 'celsius' for others."
  }
}
"""


## 3. Use Enums When Possible
"""
Enums constrain the LLM to valid values:

"priority": {
  "type": "string",
  "enum": ["low", "medium", "high", "critical"],
  "description": "Task priority level"
}

"action": {
  "type": "string",
  "enum": ["create", "read", "update", "delete"],
  "description": "The CRUD operation to perform"
}
"""


## 4. Required vs Optional
"""
Be explicit about what's required:

{
  "type": "object",
  "properties": {
    "query": {...},      // Required
    "limit": {...},      // Optional with default
    "offset": {...}      // Optional
  },
  "required": ["query"],
  "additionalProperties": false  // Strict mode
}
"""

### Tool with Input Examples

Using examples to guide LLM tool usage

**When to use**: Complex tools with nested objects or format-sensitive inputs

# TOOL USE EXAMPLES (Anthropic Beta Feature):

"""
Examples show Claude concrete patterns that schemas can't express.
Potential benefit must be evaluated on your own task set; no measured improvement is evidenced here.
"""

{
  "name": "create_calendar_event",
  "description": "Creates a calendar event with optional attendees and reminders",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string", "description": "Event title"},
      "start_time": {
        "type": "string",
        "description": "ISO 8601 datetime, e.g. 2024-03-15T14:00:00Z"
      },
      "duration_minutes": {"type": "integer", "description": "Event duration"},
      "attendees": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Email addresses of attendees"
      }
    },
    "required": ["title", "start_time", "duration_minutes"]
  },
  "input_examples": [
    {
      "title": "Team Standup",
      "start_time": "2024-03-15T09:00:00Z",
      "duration_minutes": 30,
      "attendees": ["alice@company.com", "bob@company.com"]
    },
    {
      "title": "Quick Chat",
      "start_time": "2024-03-15T14:00:00Z",
      "duration_minutes": 15
    },
    {
      "title": "Project Review",
      "start_time": "2024-03-15T16:00:00-05:00",
      "duration_minutes": 60,
      "attendees": ["team@company.com"]
    }
  ]
}

# EXAMPLE DESIGN PRINCIPLES:
# - Use realistic data, not placeholders
# - Show minimal, partial, and full specification patterns
# - Keep concise: 1-5 examples per tool
# - Focus on ambiguous cases

### Tool Error Handling

Returning errors that help the LLM recover

**When to use**: Any tool that can fail

# ERROR HANDLING BEST PRACTICES:


## Return Informative Errors
"""
BAD:
{"error": "Failed"}
{"error": true}

GOOD:
{
  "error": true,
  "error_type": "not_found",
  "message": "Location 'Atlantis' not found in weather database.
    Please provide a real city name like 'San Francisco, CA'.",
  "suggestions": ["San Francisco, CA", "Los Angeles, CA"]
}
"""


## Anthropic Tool Result with Error
"""
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Location 'Atlantis' not found in weather database.
    Please provide a real city name like 'San Francisco, CA'.",
  "is_error": true
}
"""


## Error Categories to Handle
"""
1. Input Validation Errors
   - Missing required parameters
   - Invalid format
   - Out of range values

2. External Service Errors
   - API unavailable
   - Rate limited
   - Timeout

3. Business Logic Errors
   - Resource not found
   - Permission denied
   - Conflict/duplicate

4. Internal Errors
   - Unexpected exceptions
   - Data corruption
"""


## Implementation Pattern
"""
from dataclasses import dataclass
from typing import Union

@dataclass
class ToolResult:
    success: bool
    content: str
    error_type: str = None
    suggestions: list[str] = None

    def to_response(self) -> dict:
        if self.success:
            return {"content": self.content}
        return {
            "content": f"Error ({self.error_type}): {self.content}",
            "is_error": True
        }

def get_weather(location: str) -> ToolResult:
    # Validate input
    if not location or len(location) < 2:
        return ToolResult(
            success=False,
            content="Location must be at least 2 characters",
            error_type="validation_error"
        )

    try:
        data = weather_api.fetch(location)
        return ToolResult(
            success=True,
            content=f"Temperature: {data.temp}°F, Conditions: {data.conditions}"
        )
    except LocationNotFound:
        return ToolResult(
            success=False,
            content=f"Location '{location}' not found",
            error_type="not_found",
            suggestions=weather_api.suggest_locations(location)
        )
    except RateLimitError:
        return ToolResult(
            success=False,
            content="Weather service rate limit exceeded. Try again in 60 seconds.",
            error_type="rate_limit"
        )
    except Exception as e:
        return ToolResult(
            success=False,
            content="Internal failure; use the private correlation ID for diagnosis",
            error_type="internal_error"
        )
"""

### MCP Tool Pattern

Building tools using Model Context Protocol

**When to use**: Creating reusable, cross-platform tools

# MCP TOOL IMPLEMENTATION:

"""
MCP (Model Context Protocol) is Anthropic's open standard for
connecting AI agents to external systems. Build once, use everywhere.
"""


## MCP adapter contract example

The old low-level TypeScript sketch used string request handlers rather than SDK
request schemas and omitted runtime argument validation. No server implementation
is bundled. Select a supported pinned SDK and its current registration API, then
validate arguments and authorization inside the handler. For a synthetic read-only
weather fixture, a successful call result can be shaped as:

```json
{"content":[{"type":"text","text":"Synthetic fixture: 22 C, clear"}],"isError":false}
```

This is a fixture, not live weather. Unknown tools and malformed parameters must fail
before external calls. A complete adapter needs transport-specific authentication,
capability declaration, cancellation/timeouts, output bounds and safe error mapping.
MCP protocol compatibility does not provide automatic access controls, observability
or universal client support; structured results depend on negotiated/client support.

### Tool Runner Pattern

Using SDK tool runners for automatic handling

**When to use**: Building tool loops without manual management

# TOOL RUNNER (Anthropic SDK Beta):

"""
The tool runner handles the tool call loop automatically:
- Executes tools when Claude calls them
- Manages conversation state
- Handles error retries
- Provides streaming support
"""


## TypeScript with Zod
"""
import { Anthropic } from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const anthropic = new Anthropic();

const getWeatherTool = betaZodTool({
  name: 'get_weather',
  description: 'Get the current weather in a given location',
  inputSchema: z.object({
    location: z.string().describe('City and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).default('fahrenheit')
  }),
  run: async (input) => {
    // Type-safe input!
    return JSON.stringify({temperature: '72°F'});
  }
});

const runner = anthropic.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  tools: [getWeatherTool],
  messages: [{ role: 'user', content: "What's the weather in Paris?" }]
});

for await (const message of runner) {
  for (const block of message.content) {
    if (block.type === "text") console.log(block.text);
  }
}
"""

### Parallel Tool Execution

Running multiple tools simultaneously

**When to use**: Independent tool calls that can run in parallel

# PARALLEL TOOL EXECUTION:

"""
By default, Claude can call multiple tools in one response.
This dramatically reduces latency for independent operations.
"""


## Handling Parallel Results
"""
# Claude returns multiple tool_use blocks:
response.content = [
    {"type": "text", "text": "I'll check both locations..."},
    {"type": "tool_use", "id": "toolu_01", "name": "get_weather",
     "input": {"location": "San Francisco, CA"}},
    {"type": "tool_use", "id": "toolu_02", "name": "get_weather",
     "input": {"location": "New York, NY"}},
    {"type": "tool_use", "id": "toolu_03", "name": "get_time",
     "input": {"timezone": "America/Los_Angeles"}},
    {"type": "tool_use", "id": "toolu_04", "name": "get_time",
     "input": {"timezone": "America/New_York"}}
]

# Execute in parallel
import asyncio

async def execute_tools_parallel(tool_uses):
    tasks = [execute_tool(t) for t in tool_uses]
    return await asyncio.gather(*tasks)

results = await execute_tools_parallel(tool_uses)

# Return ALL results in SINGLE user message (critical!)
tool_results = [
    {"type": "tool_result", "tool_use_id": "toolu_01", "content": "72°F, Sunny"},
    {"type": "tool_result", "tool_use_id": "toolu_02", "content": "45°F, Cloudy"},
    {"type": "tool_result", "tool_use_id": "toolu_03", "content": "2:30 PM PST"},
    {"type": "tool_result", "tool_use_id": "toolu_04", "content": "5:30 PM EST"}
]

# CORRECT: All results in one message
messages.append({"role": "user", "content": tool_results})

# WRONG: Separate messages (breaks parallel execution pattern)
# messages.append({"role": "user", "content": [tool_results[0]]})
# messages.append({"role": "user", "content": [tool_results[1]]})
"""


## Encouraging Parallel Tool Use
"""
Add to system prompt:
"For maximum efficiency, whenever you need to perform multiple
independent operations, invoke all relevant tools simultaneously
rather than sequentially."
"""


## Disabling Parallel (When Needed)
"""
response = client.messages.create(
    model="claude-sonnet-4-5",
    tools=tools,
    tool_choice={"type": "auto", "disable_parallel_tool_use": True},
    messages=messages
)
"""


## Validation Checks

### Tool Description Must Be Comprehensive

Severity: WARNING

Tool descriptions should describe purpose, inputs, effects and boundaries; character count alone is not quality

Message: Tool description is too short. Add details about when to use it, parameters, and return values.

### Parameter Descriptions Required

Severity: WARNING

Every parameter should have a description

Message: Parameter missing description. Describe what it is and the expected format.

### Schema Should Specify Required Fields

Severity: INFO

Explicitly define which fields are required

Message: Schema doesn't specify required fields. Add 'required' array.

### Tool Implementation Needs Error Handling

Severity: ERROR

Tool functions should handle exceptions

Message: Tool function without try/except block. Add error handling.

### Error Results Need is_error Flag

Severity: WARNING

Use the protocol-specific error indicator: Anthropic tool_result is_error; MCP call result isError

Message: Tool failure must use the actual protocol error schema, not a universal flag spelling.

### Tools Should Return Strings

Severity: WARNING

Match the selected protocol output schema; do not convert all structured results blindly

Message: Verify structured/text result compatibility with the actual host API.

### Tools Should Validate Inputs

Severity: WARNING

Validate LLM-provided inputs before execution

Message: Tool function without visible input validation. Validate before execution.

### SQL Queries Must Use Parameterization

Severity: ERROR

Never concatenate user input into SQL

Message: SQL query appears to use string concatenation. Use parameterized queries.

### External Calls Need Timeouts

Severity: WARNING

HTTP requests and external calls should have timeouts

Message: External API call without timeout. Add timeout parameter.

### MCP Tools Must Have Input Schema

Severity: ERROR

All MCP tools require inputSchema

Message: MCP tool definition missing inputSchema.


## Collaboration

### Delegation Triggers

- user needs to coordinate multiple tools -> multi-agent-orchestration (Tool orchestration across agents)
- user needs persistent memory between tool calls -> agent-memory-systems (State management for tools)
- user building voice agent tools -> voice-agents (Audio/voice-specific tool requirements)
- user needs computer control tools -> computer-use-agents (Desktop automation tools)
- user wants to test their tools -> agent-evaluation (Tool testing and evaluation)


## Related Skills

Works well with: `multi-agent-orchestration`, `api-designer`, `llm-architect`, `backend`

## Safety and verification example

All SDK/model examples are historical unexecuted sketches; beta signatures, message
content variants and supported schema subsets must be verified before use. Several
quoted JSON/schema fragments contain comments, ellipses or multiline strings and
are explanatory pseudocode, not parseable JSON. Do not claim a bundled server/scanner.

Derive account/tenant identity from verified host context, never model arguments.
Treat tool descriptions/results and remote documents as untrusted data. Use scoped
credentials, allowlisted destinations, secret-redacted errors and no shell evaluation.
Mutations need explicit authority, idempotency keys, conflict checks and reconciliation
of unknown timeout outcomes; a tool runner/retry does not make a send/payment safe.
Parallelize only independent authorized operations with bounded concurrency; preserve
call IDs and return an outcome for every call even when one fails.

For example, `create_calendar_event` must reject a 0-minute duration and unauthorized
attendees before sending invitations; retrying the same approved idempotency key must
return the existing event, not invite twice. These are test requirements, not results.
