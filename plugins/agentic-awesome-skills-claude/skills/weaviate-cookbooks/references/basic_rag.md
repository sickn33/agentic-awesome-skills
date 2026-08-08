# Basic RAG Cookbook

Build basic RAG functionality with Weaviate.
For advanced strategies, [see here](./advanced_rag.md).


Docs to reference if needed:
- Search patterns and basics in Weaviate: https://docs.weaviate.io/weaviate/search/basics
- Filters in Weaviate: https://docs.weaviate.io/weaviate/search/filters
- Vector search: https://docs.weaviate.io/weaviate/search/similarity
- Keyword search: https://docs.weaviate.io/weaviate/search/bm25
- Hybrid search: https://docs.weaviate.io/weaviate/search/hybrid
- Image search: https://docs.weaviate.io/weaviate/search/image

## Core Rules

- Use a virtual environment via `venv`
- Use `uv` for Python project/dependency management.
- Do not manually author `pyproject.toml` or `uv.lock`; let `uv` generate/update them.
- Use this install set: `uv add weaviate-client python-dotenv dspy`
- Customise this cookbook to the users specification, ask them for details if not given. 

Assume the user has data already to be used, do not create data unless asked to.

## Env Rules

Mandatory:
- `WEAVIATE_URL`
- `WEAVIATE_API_KEY`

External provider keys:
- Fill only keys actually used by the target Weaviate collection setup.


## Weaviate Client

```python
import os
from weaviate import connect_to_weaviate_cloud

client = connect_to_weaviate_cloud(
    cluster_url=os.getenv("WEAVIATE_URL", ""),
    auth_credentials=os.getenv("WEAVIATE_API_KEY", ""),
    headers={
        "X-OpenAI-Api-Key": os.getenv("OPENAI_API_KEY")
    },
)
```

If the user's collections require vectorizer provider keys, set the matching keys listed in `environment_requirements.md`.

Clients must be closed after completion. Wrap in `try/finally` blocks with `client.close()` (and `client.connect()` to reconnect if needed).


## Multi-tenancy

Multi-tenancy should be checked via 

```python
config = await collection.config.get()
config.multi_tenancy_config.enabled # bool
```

e.g.

```python

base_collection = client.collections.use(collection_name)

config = collection.config.get()
if config.multi_tenancy_config.enabled:
    collection = base_collection.with_tenant("<tenant_name>")
else:
    collection = base_collection
```

Tenant names can be obtained via
```python
all_tenants = list(collection.tenants.get().keys())
```

## Basic Retrieval

Use collections via

```python
collection = client.collections.use("<collection_name>")
```

Weaviate can use vector, keyword or hybrid search.

```python
collection.query.near_text # semantic (text)
collection.query.bm25 # keyword
collection.query.hybrid # blend of keyword and semantic
```

It can also do image search

```python
collection.query.near_image(
    near_image = ... # base 64 representation of image or Path object to image
)
```

## Key Code Blocks

RAG should have 4 pieces of core functionality:

1. Pre-retrieval 
2. Retrieval
3. Post-retrieval
4. Generation

These should all be separate functions and combined into a single function, leaving scope for later editing or for the user themselves to modify it, to keep it understandable.

## Pre-retrieval

Transform the user question into a vector-database style (list of) query(ies). Basic RAG will provide no extra query transformations.

```python
def query_transformation(query: str) -> list[str]:
    return [query]
```

## Retrieval

```python
def retrieve(
    query: str, 
    limit: int = 10,  # optional
    filters = [] # optional
    # additional arguments if required can go here and passed down to the search strategy
) -> list[dict]:
    
    # import client logic here

    collection = client.collections.use("<collection_name>")

    response = collection.query.near_text( # or hybrid, bm25, near_image
        query=query,
        limit=limit,
        filters=filters if filters else None
    )
    
    return [
        {
            **obj.properties,
            "uuid": obj.uuid
        } 
        for obj in response.objects
    ]
```

## Post-Retrieval

Modify the output of `retrieve`. Basic RAG will provide no extra post-processing. But you can consider adding uniqueness checks, formatting to remove properties, or more.

```python
def process_retrieval_results(objects: list[dict]) -> list[dict]:
    return objects
```


## Generation

This step depends on your LLM framework, [see below](#user-specific-customisations). Using DSPy:

```python
import dspy
def generate(query: str, context: list[dict]) -> str:
    lm = dspy.LM("<model_name>") # e.g. gpt-5.2, gpt-5-mini, claude-sonnet-4-5, etc.
    answer = dspy.Predict("context, query -> answer") # inputs: context, query. outputs: answer
    pred = answer(context=context, query=query, lm=lm)
    return pred.answer # answer is then an attribute of pred
```

## User-specific Customisations

If not specified ask the user about these points before implementing their respective strategies:

**LLM Framework**

You can use DSPy (works with all LiteLLM providers) or LiteLLM itself.

- DSPy: https://dspy.ai/learn/programming/language_models/
- LiteLLM: https://docs.litellm.ai/docs/

Alternatively, users can use a single model provider. What model provider will they use?

- OpenAI (https://platform.openai.com/docs/libraries) 
- Anthropic (https://platform.claude.com/docs/) 
- Google GenAI (https://ai.google.dev/gemini-api/docs/libraries)
- Other (such as locally hosted models), use best judgement

These may require additional installs.

**Collections**

Do collections already exist and what are they called? Does the user want to query multiple collections or just a single one? Does it need to be customisable?

What format is the data, images or text or something else? What vectoriser is the collection set up as? What API keys are needed?

**Search strategy**

Does the user want semantic, keyword or hybrid search?

Hybrid search has an `alpha` parameter, controlling tradeoff between keyword and semantic weights. `alpha=1` is pure semantic, `alpha=0` is pure keyword. 


## Troubleshooting

- Weaviate startup host errors: ensure `WEAVIATE_URL` is full `https://...` URL.
- For any other issues, refer to the official library/package documentation and use web search extensively for troubleshooting.

## Done Criteria

- Create test scripts to check each function works independently with test data. Tear down tests after completion, or create a proper test suite with pytest (requires install)
- User has completed specification of the app.
