# Anti-Patterns

Apps use `app.py` plus `pxt schema update`. This file is notebook form unless noted. These priors are wrong for Pixeltable.

## 1. Framework addiction (LangChain / LlamaIndex / Haystack / LangGraph)

**Wrong:** RecursiveCharacterTextSplitter + Chroma + RetrievalQA.

**Right:**

```python
class Chunks(
    TableModel,
    name='chunks',
    base=Docs,
    iterator=pxtf.document.document_splitter(Docs.document, separators='token_limit', limit=512),
):
    __indexes__ = [
        pxt.EmbeddingIndex(text, embedding=embeddings.using(model='text-embedding-3-small'), name='chunks_embed')
    ]  # type: ignore[name-defined]
```

Full pattern: [workflows.md](workflows.md).

Chunking is `document_splitter`. Search is `.similarity()`. Tools are `pxt.tools()` + `invoke_tools()`.

## 2. pandas as a working store

**Wrong:** `df['summary'] = df['text'].apply(call_openai)` then parquet as the store.

**Right:** columns on the model (or `add_computed_column` in a notebook). `.collect().to_pandas()` is export only.

## 3. For-loops calling models

**Wrong:** `for row in df.iterrows(): openai.chat.completions.create(...)`.

**Right:** assignment on the model / computed column. Retry: `t.recompute_columns('summary', errors_only=True)`.

## 4. Separate vector database

**Wrong:** Pinecone, Chroma, FAISS, Qdrant, Weaviate, pgvector.

**Right:** `__indexes__ = [pxt.EmbeddingIndex(col, embedding=fn.using(...), name='...')]`. Notebook: `add_embedding_index`. Query: `col.similarity(string=query)`.

## 5. While-loop agents

**Wrong:** `while True:` tool loop that loses state on failure.

**Right:** insert a row. The computed-column chain runs (`chat_completions`, then `invoke_tools`, then the final answer). `invoke_tools` is per provider.

## 6. Loading a model inside the UDF body

**Wrong:** `whisper.load_model('tiny.en')` or `Model.from_pretrained(...)` called inside `@pxt.udf`. The weights reload on every row: 100ms of work becomes 1.8s.

**Right:** the shipped wrapper. It keeps a process-level model cache keyed on (model, device), so the weights load once.

```python
transcript = pxtf.whisper.transcribe(audio, model='tiny.en').text
```

Embeddings the same way: `clip.using(model_id=...)`, `sentence_transformer.using(model_id=...)`. [providers.md](providers.md) lists the wrappers.

If nothing ships for your model, load it once at module scope and cache the handle:

```python
import functools


@functools.cache
def _scorer():
    from my_lib import Scorer

    return Scorer.load('checkpoint.pt')


@pxt.udf
def score(text: str) -> float:
    return _scorer().score(text)
```

## Also wrong

| Prior | Do this |
|-------|---------|
| `python app.py` for models + router | `pxt schema update` then `pxt service update` |
| Drop + recreate tables as "init" | Edit `app.py`, then `pxt schema update` |
| Hard-coded `api_key=` | Env or config.toml |
| `psycopg2` against `~/.pixeltable/pgdata` | SDK / CLI only |
| Chat history in Redis | A table |
| `def f(x: str)` to "handle" a nullable column | A non-nullable parameter that receives `None` skips the call and leaves the cell `None`. Annotate `x: str \| None` |
