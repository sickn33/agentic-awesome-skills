# Advanced RAG Cookbook

Build advanced RAG functionality with Weaviate.

Read first:
- Basic RAG cookbook, important to start from this base. MUST READ: [Basic RAG Cookbook](./basic_rag.md)

Docs to reference if needed:
- Search patterns and basics in Weaviate: https://docs.weaviate.io/weaviate/search/basics
- Filters in Weaviate: https://docs.weaviate.io/weaviate/search/filters
- Vector search: https://docs.weaviate.io/weaviate/search/similarity
- Keyword search: https://docs.weaviate.io/weaviate/search/bm25
- Hybrid search: https://docs.weaviate.io/weaviate/search/hybrid
- Image search: https://docs.weaviate.io/weaviate/search/image


## Core Rules

First implement the basic strategy from [here](./basic_rag.md). Then modify according to this guide.

- Use a virtual environment via `venv`
- Use `uv` for Python project/dependency management.
- Do not manually author `pyproject.toml` or `uv.lock`; let `uv` generate/update them.
- Use this install set: `uv add weaviate-client python-dotenv dspy weaviate-agents`
- Customise this cookbook to the users specification, ask them for details if not given. 

Assume the user has data already to be used, do not create data unless asked to.

Instead of following this cookbook, you first must ask the user if they would prefer to use the Weaviate Query Agent. If so, all steps in this guide can be implemented with the query agent which does advanced RAG out of the box.

Query agent docs: https://docs.weaviate.io/agents/query/usage

## Env Rules

Mandatory:
- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`

External provider keys:
- Fill only keys actually used by the target Weaviate collection setup.

## Advanced RAG overview

* Query re-writer: *Change user input text into a query text using an LLM*
* Query decomposition: *Change query into multiple sub-queries each re-written with an LLM*
* Filtering: *Use an LLM to define filters on the collection*
* Re-ranking: *Score the final results by a more advanced model*
* Prompt engineering: *Add chain of thought, Tree of thoughts, ReAct*

## Query Re-writer

```python
class QueryRewriter(dspy.Signature):
    """
    Rewrite the user's query into a more relevant search term that is a more relevant search term for searching a database.
    """
    input_query: str = dspy.InputField(description="The original user query")
    rewritten_query: str = dspy.OutputField(
        description=(
            "A single search term that is more relevant to the user's query. "
            "Include only relevant information, it does not need to be a full sentence or question "
        )
    )
```

Modify the `query_transformation` function:

```python
def query_transformation(query: str) -> list[str]:
    lm = dspy.LM(subtask_model_name)
    answer = dspy.Predict(QueryRewriter)
    pred = answer(input_query=query, lm=lm)
    return [pred.rewritten_query]
```

## Query Decomposition

```python
class QueryRewriter(dspy.Signature):
    """
    Rewrite the user's query into a more relevant search terms that are more relevant search term for searching a database.
    """
    input_query: str = dspy.InputField(description="The original user query")
    rewritten_queries: list[str] = dspy.OutputField(
        description=(
            "A list of search terms that are more relevant to the user's query. "
            "Each entry should include only relevant information, it does not need to be a full sentence or question "
            "Split independent searches into different entries "
            "Each entry should be relevant independently that capture a different required search aspect "
            "Do not repeat similar search terms, each one should have a unique meaning "
            "Be sparse, do not duplicate search terms "
        )
    )

def query_transformation(query: str) -> list[str]:
    lm = dspy.LM(subtask_model_name)
    answer = dspy.Predict(QueryRewriter)
    pred = answer(input_query=query, lm=lm)
    return pred.rewritten_queries
```

## LLM-created Filters

Filters can be specified by the user (for specific use-cases, perhaps), or you can get an LLM to write the filters also. Writing filters requires knowledge of the collection schema. This can be retrieved by advanced methods or a simple version can be used.

Simple version:

1. First create structured responses to format filters

```python
from pydantic import BaseModel, Field
from typing import Literal, Any

class SearchFilter(BaseModel):
    field: str = Field(description="The field to be filtered on.")
    operator: Literal["=", "!=", ">", "<"] = Field(description="The operator to be used in conjunction with the value. These are strict operators.")
    value: Any = Field(description="The value to be used in conjunction with the operator.")

class Search(BaseModel):
    filters: list[SearchFilter] = Field(description="The filters to be used in the vector database. This is an AND operation.")

class SearchCreation(dspy.Signature):
    """
    Create filters and search parameters for a search query in a database.
    """
    query: str = dspy.InputField()
    schema: list[dict] = dspy.InputField(desc="Schema of the collection to be searched.")
    data_sample: list[dict] = dspy.InputField(desc="A sample of the data in the collection to be searched.")
    search: Search = dspy.OutputField(
        desc=(
            "Your filters and search parameters, this should be a valid JSON object. "
            "This should be constructed so that it matches the goal of the user prompt."
        )
    )
```
This requires `schema` and `data_sample` as an input field to the LLM call `SearchCreation`.

2. Helper function to turn structured response into weaviate filter

```python
def _format_filters(search_filters: list[SearchFilter]):
    filters = []
    for search_filter in search_filters:
        base_filter = Filter.by_property(search_filter.field)
        if search_filter.operator == "=":
            filter = base_filter.equal(search_filter.value)
        elif search_filter.operator == "!=":
            filter = base_filter.not_equal(search_filter.value)
        elif search_filter.operator == ">":
            filter = base_filter.greater_than(search_filter.value)
        elif search_filter.operator == "<":
            filter = base_filter.less_than(search_filter.value)
        filters.append(filter)
    return Filter.all_of(filters) if filters else None
```

3. Combine

```python
def create_filters(query: str):
    
    # import client here

    collection = client.collections.use("<collection_name>")

    # Get collection schema (for field names etc.). can replace this with more advanced configuration (like aggregating for unique groups)
    config = collection.config.get()
    schema = [{"name": p.name, "type": p.data_type[:]} for p in config.properties]

    # Get a sample of the data in the collection to be searched
    data_sample = collection.query.fetch_objects(limit=5)

    # Create search parameters
    search_parameters = dspy.ChainOfThought(SearchCreation)
    search_parameters_output = search_parameters(query=query, schema=schema, data_sample=data_sample, lm=dspy.LM(subtask_model_name))
    
    return _format_filters(search_parameters_output.search.filters)
```

These filters can be passed into the `collection.query.near_text` (or equivalent search function).

## Re-ranking

Do not modify the user's collection unless requested to do so. Re-ranking requires configuring the collection with a re-ranker, for example:

```python
collection = client.collections.use("<collection_name>")
collection.config.update(
    reranker_config=Reconfigure.Reranker.cohere()  
)
```
(this would require a Cohere API key).

Modify the `retrieve` function

```python
from weaviate.classes.query import Rerank

def retrieve(query: str, limit: int | None = None, filters = []) -> list[dict]:

    # ...existing code
    
    response = collection.query.hybrid(
        query=query,
        limit=limit,
        rerank=Rerank(
            prop="content", # what field to re-rank on
            query=query # what the search term for the re-ranker should be (same as original in this case)
        ),
        filters=filters if filters else None
    )
    
    # ...existing code
```

## Prompt Engineering

This step depends on the LLM framework used. You can manually ask the LLM to include reasoning before giving its final answer, adding a reasoning sub-field to be completed before giving the final answer in structured response, or specify in DSPy to use chain-of-thought.

```python
class Generator(dspy.Signature):
    """
    Answer the question based on the context.
    Do not include any information from external sources, only use the information provided in the context.
    If you cannot answer the question based on the information provided, say "I don't know".
    """
    context: str | list[dict] =  dspy.InputField(desc="The context to answer the question.")
    query: str = dspy.InputField(desc="The question to answer.")
    answer: str = dspy.OutputField(desc="The single answer to the question with no additional communication")
```

Modify the `generate` function:

```python
def generate(query: str, context: list[dict]) -> str:
    lm = dspy.LM(generation_model_name)
    answer = dspy.Predict(Generator)
    pred = answer(context=context, query=query, lm=lm)
    return pred.answer
```

Consider other prompt engineering techniques like ReAct (if necessary but likely overkill), few-shot learning (requires advanced specification), or otherwise.

## Query Agent

Skip this guide altogether and use the Weaviate Query Agent.

```python
from weaviate.agents.query import QueryAgent

# import client here

qa = QueryAgent(
    client=client, collections=["Example_Communications_Raw"]
)
response = qa.search("<user query here>") # just search with no text response
response = qa.ask("<user query here>") # search with text response accessible via response.final_answer
```

## Customisation Points

**LLM framework**

This guide used DSPy. Follow the guidelines in [here](./basic_rag.md), but most likely you will need an LLM framework involving structured responses.

## Troubleshooting

- Weaviate startup host errors: ensure `WEAVIATE_URL` is full `https://...` URL.
- For any other issues, refer to the official library/package documentation and use web search extensively for troubleshooting.

## Done Criteria

- Create test scripts to check each function works independently with test data. Tear down tests after completion, or create a proper test suite with pytest (requires install)
- User has completed specification of the app.
