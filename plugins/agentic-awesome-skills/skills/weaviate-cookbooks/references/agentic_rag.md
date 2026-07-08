# Agentic RAG Cookbook

Build RAG-powered AI agents with Weaviate.

Read first:
- Basic Agent cookbook, important to start from this base. MUST READ: [Basic Agent Cookbook](./basic_agent.md)

Docs to reference if needed:
- Search patterns and basics in Weaviate: https://docs.weaviate.io/weaviate/search/basics
- Filters in Weaviate: https://docs.weaviate.io/weaviate/search/filters
- Hybrid search: https://docs.weaviate.io/weaviate/search/hybrid
- Weaviate Query Agent: https://docs.weaviate.io/agents/query/usage
- Elysia: https://weaviate.github.io/elysia/


## Core Rules

First implement the basic agent from [here](./basic_agent.md). Then modify according to this guide.

- Use a virtual environment via `venv`
- Use `uv` for Python project/dependency management.
- Do not manually author `pyproject.toml` or `uv.lock`; let `uv` generate/update them.
- Use this install set: `uv add weaviate-client python-dotenv dspy`
- Add `weaviate-agents` if using the Query Agent: `uv add "weaviate-client[agents]"`
- Add `elysia-ai` if using Elysia: `uv add elysia-ai`
- Customise this cookbook to the users specification, ask them for details if not given.

Assume the user has data already to be used, do not create data unless asked to.

Instead of following this cookbook, you first must ask the user if they would prefer to use the Weaviate Query Agent or Elysia. If so, skip to the relevant section below.

- Query Agent docs: https://docs.weaviate.io/agents/query/usage
- Elysia docs: https://weaviate.github.io/elysia/

## Env Rules

Mandatory:
- An LLM provider API key (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`)
- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`

External provider keys:
- Fill only keys actually used by the target Weaviate collection setup.


## Agentic RAG Overview

* Naive RAG tool: *Basic retrieval as a single tool for the RouterAgent*
* Hierarchical RAG: *LLM-created filters and search parameters as a sub-agent tool*
* Vector DB memory: *Store and retrieve facts across sessions using Weaviate*
* Query Agent: *Pre-built agentic RAG service by Weaviate*
* Elysia: *Open source agentic framework with built-in query tool*


## Naive RAG Tool

A simple retrieval tool that the RouterAgent can call. Pass this as a tool to the RouterAgent from the [basic agent cookbook](./basic_agent.md).

```python
from weaviate import connect_to_weaviate_cloud
import os

def retrieve_data(query: str):
    """
    Given a query (free text), return the most relevant documents from the vector database using hybrid search.
    """
    client = connect_to_weaviate_cloud(
        cluster_url=os.getenv("WEAVIATE_URL", ""),
        auth_credentials=os.getenv("WEAVIATE_API_KEY", ""),
    )
    collection = client.collections.use("<collection_name>")
    response = collection.query.hybrid(query=query, limit=5)
    client.close()
    return f"{[obj.properties for obj in response.objects]}"
```

Customise the search type (`hybrid`, `near_text`, `bm25`), `limit`, and return fields based on the use case.


## Hierarchical RAG (LLM-created Filters)

Instead of simple retrieval, use an LLM sub-agent to construct filters and search parameters. This makes the tool itself an agent.

1. Structured response models for filters:

```python
from pydantic import BaseModel, Field
from typing import Literal, Any

class SearchFilter(BaseModel):
    field: str = Field(description="The field to be filtered on.")
    operator: Literal["=", "!=", ">", "<"] = Field(description="The operator to be used in conjunction with the value.")
    value: Any = Field(description="The value to be used in conjunction with the operator.")

class Search(BaseModel):
    query: str = Field(description="The search query to be used in the vector database.")
    filters: list[SearchFilter] = Field(description="The filters to be used in the vector database.")
    limit: int = Field(description="The number of results to return from the vector database.")

class SearchCreation(dspy.Signature):
    """
    Create a search query for a vector database.
    """
    user_prompt: str = dspy.InputField()
    schema: list[dict] = dspy.InputField(desc="Schema of the collection to be searched.")
    search: Search = dspy.OutputField(
        desc=(
            "Your search query and filters, this should be a valid JSON object. "
            "This should be constructed so that it matches the goal of the user prompt."
        )
    )
```

2. Helper function to convert structured filters to Weaviate filters:

```python
from weaviate.classes.query import Filter

def format_filters(search_filters: list[SearchFilter]):
    filters = []
    for search_filter in search_filters:
        base_filter = Filter.by_property(search_filter.field)
        if search_filter.operator == "=":
            filters.append(base_filter.equal(search_filter.value))
        elif search_filter.operator == "!=":
            filters.append(base_filter.not_equal(search_filter.value))
        elif search_filter.operator == ">":
            filters.append(base_filter.greater_than(search_filter.value))
        elif search_filter.operator == "<":
            filters.append(base_filter.less_than(search_filter.value))
    return Filter.all_of(filters) if filters else None
```

3. The hierarchical query tool (replaces the naive retrieval tool):

```python
def query_agent_tool(collection_name: str, user_prompt: str):
    """
    Given a query (free text), return the most relevant documents from the vector database using hybrid search with LLM-generated filters.
    """
    client = connect_to_weaviate_cloud(
        cluster_url=os.getenv("WEAVIATE_URL", ""),
        auth_credentials=os.getenv("WEAVIATE_API_KEY", ""),
    )
    collection = client.collections.use(collection_name)
    config = collection.config.get()
    schema = [{"name": p.name, "type": p.data_type[:]} for p in config.properties]

    query_model = dspy.ChainOfThought(SearchCreation)
    query_output = query_model(
        user_prompt=user_prompt,
        schema=schema,
        lm=dspy.LM("<subtask_model_name>")
    )

    response = collection.query.hybrid(
        query=query_output.search.query,
        filters=format_filters(query_output.search.filters),
        limit=query_output.search.limit
    )
    client.close()
    return f"{[obj.properties for obj in response.objects]}"
```

Schema information is required for the LLM to construct filters. Fetch dynamically via `collection.config.get()` or provide manually if the schema is stable. Consider enriching the schema with sample data or enumerated values for better filter accuracy.


## Vector Database Memory

Store and retrieve facts across sessions using Weaviate. Only add this if cross-session persistence is required.

1. Memory creation signature:

```python
class MemoryCreation(dspy.Signature):
    user_prompt: str = dspy.InputField()
    assistant_response: str = dspy.InputField()
    memory: str = dspy.OutputField(
        description="A single string representing the most pertinent fact from the user/agent interaction."
    )
```

2. Add `memories` as an input to `AgentResponse`:

```python
class AgentResponse(dspy.Signature):

    # Input Fields
    history: dspy.History = dspy.InputField()
    user_prompt: str = dspy.InputField()
    available_tools: str = dspy.InputField()
    memories: list[str] = dspy.InputField(
        desc="A list of memories from previous conversations, you can use these to inform your response."
    )

    # Output Fields
    response: str = dspy.OutputField(
        description="The response to the user's prompt whilst the tool is running. Update the user on the progress of their request (if a tool is picked), or the final response to the user (if no tool is picked)."
    )
    tool: str | None = dspy.OutputField(
        description="The tool that needs to be used. Return None if no tool is needed."
    )
    tool_inputs: Dict[str, Any] | None = dspy.OutputField(
        description=(
            "The inputs for the tool. Return an empty dictionary (still include the field) if no inputs are needed. "
            "The key is the name of the input, the value is the value of the input."
        )
    )
```

3. Add `create_memory` and `retrieve_memories` methods to `RouterAgent`:

```python
from weaviate import connect_to_weaviate_cloud
from weaviate.classes.config import Configure

class RouterAgent:
    def __init__(self, model: str, memory_model: str | None = None, tools: List[Callable] = []):
        self.tools: list[Callable] = tools
        self.model = dspy.LM(model)
        self.memory_model = dspy.LM(memory_model) if memory_model else dspy.LM(model)
        self.agent = dspy.ChainOfThought(AgentResponse)
        self.memory_agent = dspy.Predict(MemoryCreation)
        self.conversation_history = dspy.History(messages=[])
        self.weaviate_client = connect_to_weaviate_cloud(
            cluster_url=os.getenv("WEAVIATE_URL", ""),
            auth_credentials=os.getenv("WEAVIATE_API_KEY", ""),
        )

    # ... existing methods from basic_agent.md (add_conversation_history, get_tools_and_descriptions) ...

    def create_memory(self, user_prompt: str, assistant_response: str, tool_result: str):
        if tool_result:
            assistant_response += "\n" + tool_result

        result = self.memory_agent(
            history=self.conversation_history,
            user_prompt=user_prompt,
            assistant_response=assistant_response,
            lm=self.memory_model,
        )
        if not self.weaviate_client.collections.exists("Agent_Memory"):
            self.weaviate_client.collections.create(
                "Agent_Memory",
                vector_config=Configure.Vectors.text2vec_weaviate()
            )

        collection = self.weaviate_client.collections.use("Agent_Memory")
        collection.data.insert({"user_prompt": user_prompt, "memory": result.memory})
        return result.memory

    def retrieve_memories(self, user_prompt: str):
        if not self.weaviate_client.collections.exists("Agent_Memory"):
            return []
        collection = self.weaviate_client.collections.use("Agent_Memory")
        query = collection.query.near_text(query=user_prompt, limit=5)
        return [memory.properties["memory"] for memory in query.objects]
```

Call `retrieve_memories` at the start of each interaction and pass results to the `memories` field of `AgentResponse`. Call `create_memory` after each interaction.

Consider using a cheaper model for memory creation (e.g. `memory_model="<cheap_model_name>"`).


## Weaviate Query Agent

Skip the custom implementation and use the pre-built Weaviate Query Agent for agentic RAG. Handles collection selection, filter construction, and query optimisation automatically.

```python
from weaviate.agents.query import QueryAgent

# import client here

qa = QueryAgent(
    client=client, collections=["<collection_name>"]
)
response = qa.search("<user query here>")  # retrieval only
response = qa.ask("<user query here>")     # retrieval + text response via response.final_answer
```

The Query Agent is free up to 1000 requests per month. Docs: https://docs.weaviate.io/agents/query/usage


## Elysia

Elysia is an open source agentic framework with built-in query tools, decision trees, error handling, and automatic retry.

Setup:

```python
import elysia
from elysia.tools.text import FakeTextResponse as TextResponseTool

elysia.configure(
    base_model="<model_name>",
    base_provider="<provider>",  # e.g. "anthropic", "openai"
    logging_level="ERROR"
)
```

With custom tools:

```python
tree = elysia.Tree("empty", use_elysia_collections=False)
tree.add_tool(TextResponseTool)

@elysia.tool
async def your_tool(param: str):
    """Tool description."""
    return {"result"}

tree.add_tool(your_tool)
response, _ = tree("user query here")
```

With built-in Weaviate query tool (requires preprocessing):

```python
from elysia import preprocess
preprocess("<collection_name>")

tree = elysia.Tree()
response, _ = tree(
    "user query here",
    collection_names=["<collection_name>"]
)
```

Elysia includes built-in error handling, self-healing, and automatic retry. Also available as a standalone app with a frontend UI: https://github.com/weaviate/elysia


## Customisation Points

**When to use which approach:**

| Use Case | Recommended Approach |
|----------|---------------------|
| Single collection, simple queries | Naive RAG tool |
| Need filters or operators | Hierarchical RAG or Query Agent |
| Multi-step tasks, multiple data sources | Sequential agent with agentic loop |
| Cross-session personalisation | Add Vector Database Memory layer |
| Production deployment with error handling | Use Elysia or Query Agent |

**Do not implement multi-agent architectures for simple retrieval tasks.**

**LLM framework**

This guide used DSPy. Follow the guidelines in [here](./basic_agent.md), but most likely you will need an LLM framework involving structured responses.


## Troubleshooting

- Weaviate startup host errors: ensure `WEAVIATE_URL` is full `https://...` URL.
- DSPy signature warnings about missing fields: these can occur when using followup agents without all fields; ensure optional fields are handled.
- For any other issues, refer to the official library/package documentation and use web search extensively for troubleshooting.

## Done Criteria

- Create test scripts to check each function works independently with test data. Tear down tests after completion, or create a proper test suite with pytest (requires install)
- User has completed specification of the app.
