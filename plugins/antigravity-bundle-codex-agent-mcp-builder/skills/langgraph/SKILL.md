---
name: langgraph
description: Expert in LangGraph - the production-grade framework for building
  stateful, multi-actor AI applications. Covers graph construction, state
  management, cycles and branches, persistence with checkpointers,
  human-in-the-loop patterns, and the ReAct agent pattern.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# LangGraph

Expert in LangGraph - the production-grade framework for building stateful, multi-actor
AI applications. Covers graph construction, state management, cycles and branches,
persistence with checkpointers, human-in-the-loop patterns, and the ReAct agent pattern.
Used in production at LinkedIn, Uber, and 400+ companies. This is LangChain's recommended
approach for building agents.

**Role**: LangGraph Agent Architect

You are an expert in building production-grade AI agents with LangGraph. You
understand that agents need explicit structure - graphs make the flow visible
and debuggable. You design state carefully, use reducers appropriately, and
always consider persistence for production. You know when cycles are needed
and how to prevent infinite loops.

### Expertise

- Graph topology design
- State schema patterns
- Conditional branching
- Persistence strategies
- Human-in-the-loop
- Tool integration
- Error handling and recovery

## Capabilities

- Graph construction (StateGraph)
- State management and reducers
- Node and edge definitions
- Conditional routing
- Checkpointers and persistence
- Human-in-the-loop patterns
- Tool integration
- Streaming and async execution

## Prerequisites

- 0: Python proficiency
- 1: LLM API basics
- 2: Async programming concepts
- 3: Graph theory fundamentals
- Required skills: Python 3.9+, langgraph package, LLM API access (OpenAI, Anthropic, etc.), Understanding of graph concepts

## Scope

- 0: Python-only (TypeScript in early stages)
- 1: Learning curve for graph concepts
- 2: State management complexity
- 3: Debugging can be challenging

## Ecosystem

### Primary

- LangGraph
- LangChain
- LangSmith (observability)

### Common_integrations

- OpenAI / Anthropic / Google
- Tavily (search)
- SQLite / PostgreSQL (persistence)
- Redis (state store)

### Platforms

- Python applications
- FastAPI / Flask backends
- Cloud deployments

## Patterns

### Basic Agent Graph

Simple ReAct-style agent with tools

**When to use**: Single agent with tool calling

from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

# 1. Define State
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    # add_messages reducer appends, doesn't overwrite

# 2. Define Tools
@tool
def search(query: str) -> str:
    """Search the web for information."""
    # Implementation here
    return f"Results for: {query}"

@tool
def calculator(expression: str) -> str:
    """Evaluate a math expression."""
    return str(eval(expression))

tools = [search, calculator]

# 3. Create LLM with tools
llm = ChatOpenAI(model="gpt-4o").bind_tools(tools)

# 4. Define Nodes
def agent(state: AgentState) -> dict:
    """The agent node - calls LLM."""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# Tool node handles tool execution
tool_node = ToolNode(tools)

# 5. Define Routing
def should_continue(state: AgentState) -> str:
    """Route based on whether tools were called."""
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

# 6. Build Graph
graph = StateGraph(AgentState)

# Add nodes
graph.add_node("agent", agent)
graph.add_node("tools", tool_node)

# Add edges
graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, ["tools", END])
graph.add_edge("tools", "agent")  # Loop back

# Compile
app = graph.compile()

# 7. Run
result = app.invoke({
    "messages": [("user", "What is 25 * 4?")]
})

### State with Reducers

Complex state management with custom reducers

**When to use**: Multiple agents updating shared state

from typing import Annotated, TypedDict
from operator import add
from langgraph.graph import StateGraph

# Custom reducer for merging dictionaries
def merge_dicts(left: dict, right: dict) -> dict:
    return {**left, **right}

# State with multiple reducers
class ResearchState(TypedDict):
    # Messages append (don't overwrite)
    messages: Annotated[list, add_messages]

    # Research findings merge
    findings: Annotated[dict, merge_dicts]

    # Sources accumulate
    sources: Annotated[list[str], add]

    # Current step (overwrites - no reducer)
    current_step: str

    # Error count (custom reducer)
    errors: Annotated[int, lambda a, b: a + b]

# Nodes return partial state updates
def researcher(state: ResearchState) -> dict:
    # Only return fields being updated
    return {
        "findings": {"topic_a": "New finding"},
        "sources": ["source1.com"],
        "current_step": "researching"
    }

def writer(state: ResearchState) -> dict:
    # Access accumulated state
    all_findings = state["findings"]
    all_sources = state["sources"]

    return {
        "messages": [("assistant", f"Report based on {len(all_sources)} sources")],
        "current_step": "writing"
    }

# Build graph
graph = StateGraph(ResearchState)
graph.add_node("researcher", researcher)
graph.add_node("writer", writer)
# ... add edges

### Conditional Branching

Route to different paths based on state

**When to use**: Multiple possible workflows

from langgraph.graph import StateGraph, START, END

class RouterState(TypedDict):
    query: str
    query_type: str
    result: str

def classifier(state: RouterState) -> dict:
    """Classify the query type."""
    query = state["query"].lower()
    if "code" in query or "program" in query:
        return {"query_type": "coding"}
    elif "search" in query or "find" in query:
        return {"query_type": "search"}
    else:
        return {"query_type": "chat"}

def coding_agent(state: RouterState) -> dict:
    return {"result": "Here's your code..."}

def search_agent(state: RouterState) -> dict:
    return {"result": "Search results..."}

def chat_agent(state: RouterState) -> dict:
    return {"result": "Let me help..."}

# Routing function
def route_query(state: RouterState) -> str:
    """Route to appropriate agent."""
    query_type = state["query_type"]
    return query_type  # Returns node name

# Build graph
graph = StateGraph(RouterState)

graph.add_node("classifier", classifier)
graph.add_node("coding", coding_agent)
graph.add_node("search", search_agent)
graph.add_node("chat", chat_agent)

graph.add_edge(START, "classifier")

# Conditional edges from classifier
graph.add_conditional_edges(
    "classifier",
    route_query,
    {
        "coding": "coding",
        "search": "search",
        "chat": "chat"
    }
)

# All agents lead to END
graph.add_edge("coding", END)
graph.add_edge("search", END)
graph.add_edge("chat", END)

app = graph.compile()

### Persistence with Checkpointer

Save and resume agent state

**When to use**: Multi-turn conversations, long-running agents

from langgraph.graph import StateGraph
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.postgres import PostgresSaver

# SQLite for development
memory = SqliteSaver.from_conn_string(":memory:")
# Or persistent file
memory = SqliteSaver.from_conn_string("agent_state.db")

# PostgreSQL for production
# memory = PostgresSaver.from_conn_string(DATABASE_URL)

# Compile with checkpointer
app = graph.compile(checkpointer=memory)

# Run with thread_id for conversation continuity
config = {"configurable": {"thread_id": "user-123-session-1"}}

# First message
result1 = app.invoke(
    {"messages": [("user", "My name is Alice")]},
    config=config
)

# Second message - agent remembers context
result2 = app.invoke(
    {"messages": [("user", "What's my name?")]},
    config=config
)
# Agent knows name is Alice!

# Get conversation history
state = app.get_state(config)
print(state.values["messages"])

# List all checkpoints
for checkpoint in app.get_state_history(config):
    print(checkpoint.config, checkpoint.values)

### Human-in-the-Loop

Pause for human approval before actions

**When to use**: Sensitive operations, review before execution

from langgraph.graph import StateGraph, START, END

class ApprovalState(TypedDict):
    messages: Annotated[list, add_messages]
    pending_action: dict | None
    approved: bool

def agent(state: ApprovalState) -> dict:
    # Agent decides on action
    action = {"type": "send_email", "to": "user@example.com"}
    return {
        "pending_action": action,
        "messages": [("assistant", f"I want to: {action}")]
    }

def execute_action(state: ApprovalState) -> dict:
    action = state["pending_action"]
    # Execute the approved action
    result = f"Executed: {action['type']}"
    return {
        "messages": [("assistant", result)],
        "pending_action": None
    }

def should_execute(state: ApprovalState) -> str:
    if state.get("approved"):
        return "execute"
    return END  # Wait for approval

# Build graph
graph = StateGraph(ApprovalState)
graph.add_node("agent", agent)
graph.add_node("execute", execute_action)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_execute, ["execute", END])
graph.add_edge("execute", END)

# Compile with interrupt_before for human review
app = graph.compile(
    checkpointer=memory,
    interrupt_before=["execute"]  # Pause before execution
)

# Run until interrupt
config = {"configurable": {"thread_id": "approval-flow"}}
result = app.invoke({"messages": [("user", "Send report")]}, config)

# Agent paused - get pending state
state = app.get_state(config)
pending = state.values["pending_action"]
print(f"Pending: {pending}")  # Human reviews

# Human approves - update state and continue
app.update_state(config, {"approved": True})
result = app.invoke(None, config)  # Resume

### Parallel Execution (Map-Reduce)

Run multiple branches in parallel

**When to use**: Parallel research, batch processing

from langgraph.graph import StateGraph, START, END, Send
from langgraph.constants import Send

class ParallelState(TypedDict):
    topics: list[str]
    results: Annotated[list[str], add]
    summary: str

def research_topic(state: dict) -> dict:
    """Research a single topic."""
    topic = state["topic"]
    result = f"Research on {topic}..."
    return {"results": [result]}

def summarize(state: ParallelState) -> dict:
    """Combine all research results."""
    all_results = state["results"]
    summary = f"Summary of {len(all_results)} topics"
    return {"summary": summary}

def fanout_topics(state: ParallelState) -> list[Send]:
    """Create parallel tasks for each topic."""
    return [
        Send("research", {"topic": topic})
        for topic in state["topics"]
    ]

# Build graph
graph = StateGraph(ParallelState)
graph.add_node("research", research_topic)
graph.add_node("summarize", summarize)

# Fan out to parallel research
graph.add_conditional_edges(START, fanout_topics, ["research"])
# All research nodes lead to summarize
graph.add_edge("research", "summarize")
graph.add_edge("summarize", END)

app = graph.compile()

result = app.invoke({
    "topics": ["AI", "Climate", "Space"],
    "results": []
})
# Research runs in parallel, then summarizes

## Collaboration

### Delegation Triggers

- crewai|role-based|crew -> crewai (Need role-based multi-agent approach)
- observability|tracing|langsmith -> langfuse (Need LLM observability)
- structured output|json schema -> structured-output (Need structured LLM responses)
- evaluate|benchmark|test agent -> agent-evaluation (Need to evaluate agent performance)

### Production Agent Stack

Skills: langgraph, langfuse, structured-output

Workflow:

```
1. Design agent graph with LangGraph
2. Add structured outputs for tool responses
3. Integrate Langfuse for observability
4. Test and monitor in production
```

### Multi-Agent System

Skills: langgraph, crewai, agent-communication

Workflow:

```
1. Design agent roles (CrewAI patterns)
2. Implement as LangGraph with subgraphs
3. Add inter-agent communication
4. Orchestrate with supervisor pattern
```

### Evaluated Agent

Skills: langgraph, agent-evaluation, langfuse

Workflow:

```
1. Build agent with LangGraph
2. Create evaluation suite
3. Monitor with Langfuse
4. Iterate based on metrics
```

## Related Skills

Works well with: `crewai`, `autonomous-agents`, `langfuse`, `structured-output`

## When to Use
- User mentions or implies: langgraph
- User mentions or implies: langchain agent
- User mentions or implies: stateful agent
- User mentions or implies: agent graph
- User mentions or implies: react agent
- User mentions or implies: agent workflow
- User mentions or implies: multi-step agent

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
