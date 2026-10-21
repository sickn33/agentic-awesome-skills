# FastAPIRouter

`from pixeltable.serving import FastAPIRouter`. One application file declares `TableModel` classes and routers. Start from `pxt service example --out app.py`. Apply tables with `pxt schema update`. Start HTTP with `pxt service update`.

```python
# app.py
import pixeltable as pxt
import pixeltable.functions as pxtf
from pixeltable.serving import FastAPIRouter

TableModel = pxt.model_base()
embed_fn = pxtf.openai.embeddings.using(model='text-embedding-3-small')


class Docs(TableModel, name='docs'):
    document: pxt.Document
    timestamp: pxt.Timestamp
    uuid = pxt.Column(value=pxtf.uuid.uuid7(), primary_key=True)


class Chunks(
    TableModel,
    name='chunks',
    base=Docs,
    iterator=pxtf.document.document_splitter(
        Docs.document, separators='page, token_limit', limit=300, metadata='title,heading,page'
    ),
):
    __indexes__ = [pxt.EmbeddingIndex(text, embedding=embed_fn, name='chunks_embed')]  # type: ignore[name-defined]


ingest = FastAPIRouter(name='ingest', prefix='/api', tags=['data'])
ingest.add_insert_route(
    Docs, path='/upload', uploadfile_inputs=[Docs.document], inputs=[Docs.timestamp],
    outputs=[Docs.document], background=True,
)
ingest.add_delete_route(Docs, path='/delete')

@pxt.query
def list_docs():
    return Docs.select(Docs.document, Docs.timestamp).order_by(Docs.timestamp, asc=False)

@pxt.query
def search_docs(query_text: str):
    sim = Chunks.text.similarity(string=query_text)
    return Chunks.where(sim > 0.3).order_by(sim, asc=False).select(
        text=Chunks.text, page=Chunks.page, score=sim).limit(20)

ingest.add_query_route(path='/list', query=list_docs, method='get')
ingest.add_query_route(path='/search', query=search_docs, method='post')
```

`token_limit` needs a separately reviewed tiktoken installation, and the index calls OpenAI, so `OPENAI_API_KEY` must reach the daemon ([cli.md](cli.md#daemon)). `'sentence'` separators would add spaCy; a `sentence_transformer` index would add torch. `page` numbers PDF pages from 0 and is `None` for other formats.

```bash
pxt init
pxt schema update app.py my_app
pxt service update app.py my_app -f
URL=$(pxt service list my_app --json | jq -r '.[] | select(.name == "ingest") | .endpoint')
curl -X POST "$URL/api/upload" -F document=@paper.pdf -F timestamp=2026-09-28T08:00:00
curl -X POST "$URL/api/search" -H 'content-type: application/json' -d '{"query_text": "results"}'
```

After apply: `t = pxt.get_table('my_app.docs')`. That dotted name is the Python handle. CLI commands for the same table use `my_app/docs`.

Already have FastAPI: after schema update, bind the catalog, then include the router. Call `pxt.get_table()` inside custom handlers, which must be `def`, not `async def`: an async handler that calls Pixeltable blocks the event loop. A provider function has no public imperative call from a handler; use the provider's own SDK there.

```python
ingest.bind('my_app')
app.include_router(ingest)
```

The other way round also works: define the `fastapi.FastAPI` object in `app.py` and `include_router()` every router the file declares. `pxt service update` then serves that one application, named after the module, with the models bound at `TARGET` before it starts. Without a `FastAPI` object, each router is its own service on its own port.

- `add_insert_route`: POST from model columns. `uploadfile_inputs` for files. Persists the row. A file column is `uploadfile_inputs` or `inputs`, not both.
- `add_compute_route`: same request shape as insert, but `Table.compute()`: no row stored
- `add_update_route`: POST matches the row by primary key, so the request body carries the key (`id`) even though `inputs` does not list it. No `match_columns`
- `add_query_route`: wraps `@pxt.query`. Default `{ "rows": [...] }`. `one_row=True` returns the object (0 rows is a 404, more than one is a 409). `return_fileresponse=True` returns the one media column as a file (implies one-row)
- `add_delete_route`: POST delete by primary key, or by a nonempty `match_columns=` list
- `@ingest.insert_route(...)`, `update_route`, `compute_route`: decorator forms taking the same table, `path`, `inputs` and `outputs`. The function takes each `outputs` column as a keyword-only, annotated parameter (media arrive as URL strings) and returns a `pydantic.BaseModel`, which becomes the response body. Reshape a response this way rather than in a hand-written endpoint.
- `export_sql=SqlExport(db_connect=..., table=...)` (`from pixeltable.serving import SqlExport`) on insert, update, and compute routes writes each response row to an existing SQL table after Pixeltable commits.
- Indexes on the model (`__indexes__`)

Media columns in JSON are URLs under `{prefix}/_pxt/media/...` (this file: `/api/_pxt/media/...`). Use that URL in a browser or `<img>` / `<video>`. Do not base64 the bytes. `return_fileresponse=True` streams the file instead of a URL.

`background=True` returns `{ "id", "job_url" }`. Poll `job_url` (`{prefix}/_pxt/jobs/{id}`). Status is `pending` | `done` | `error`, not `succeeded`; `done` carries `result`, `error` carries `error` and `error_detail`. Mutually exclusive with `return_fileresponse`.

A computed column that raises during an insert or update route fails the request and stores nothing. The error body's `detail` is `{"error_code", "message", "retryable"}`, and a failed job's `error_detail` has the same shape; retry only when `retryable` is true. After a schema change, routes answer 409 until `pxt service update ... -f` restarts the service.

Frontend types: `curl -fsS "$URL/openapi.json" -o openapi.json`, then `openapi-typescript openapi.json -o src/pixeltable.d.ts`. Each column in a route's `outputs` becomes a typed field, and the job-polling route is in the schema. Regenerate after changing routes. A hosted service needs its Cloud key in an `X-api-key` header, so call it from your app server, never from browser code.

No HTTP: apply, then insert from Python. [Self-hosting](https://docs.pixeltable.com/howto/deployment/overview).

[cli.md](cli.md) | [core-api.md](core-api.md#serving)
