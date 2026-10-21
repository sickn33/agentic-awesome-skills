# Pixeltable Core API Reference

Apps use `app.py` plus `pxt schema update`. This file is notebook form (`pxt.create_table()`) unless noted. CLI: [cli.md](cli.md). Routes: [workflows.md](workflows.md).

Types are non-nullable by default. Optional is `T | None`. Do not use `pxt.Required`.

## Contents

- [Tables](#tables)
- [Querying](#querying)
- [Computed columns](#computed-columns)
- [Views](#views)
- [Indexes](#indexes)
- [UDFs](#udfs)
- [UDAs](#udas)
- [Built-in functions](#built-in-functions)
- [Import and export](#import-and-export)
- [Serving](#serving)
- [Tools](#tools)

## Tables

App:

```python
class Docs(TableModel, name='docs'):
    title: pxt.String
    body: pxt.String | None
    title_upper = pxtf.string.upper(title)
    uuid = pxt.Column(value=pxtf.uuid.uuid7(), primary_key=True)
    # astype(pxt.String) fails on UUID; use uuid.to_string()
```

Notebook:

```python
from typing import TypedDict

import pixeltable as pxt
from pixeltable.functions.uuid import uuid7


class Record(TypedDict):
    name: str
    score: float


t = pxt.create_table('dir.docs', {
    'title': pxt.String,
    'body': pxt.String | None,
    'image': pxt.Image,
    'video': pxt.Video,
    'audio': pxt.Audio,
    'doc': pxt.Document,
    'tags': pxt.Json[list[str]],
    'records': pxt.Json[list[Record]],
    'uuid': uuid7(),
}, primary_key=['uuid'], if_exists='ignore')
```

`pxt.Json[...]` takes a TypedDict for keyed objects (`NotRequired[...]` marks an optional key). `dict[str, str]` declares no keys, so Pixeltable treats it as untyped Json.

Types: `String`, `Int`, `Float`, `Bool`, `Image`, `Video`, `Audio`, `Document`, `Json`, `Timestamp`, `Date`, `UUID`, `Binary`, `Array[(3, 4), pxt.Float]`.

`pxt.Column(...)` carries what an annotation cannot: `stored=False` (computed on read, never materialized), `media_validation='on_read'` (defer validation to first read; default `'on_write'`), and `destination=` (object store for computed media -- `s3`/`gs`/`az`/`r2`/`b2`/`tigris`/`http`/a local path/`pxtfs`).

```python
thumbnail = pxt.Column(value=cover.rotate(90), stored=False)
scan = pxt.Column(type=pxt.Image, media_validation='on_read', comment='validated lazily')
```

From a file: `pxt.create_table('dir.data', source='data.csv', if_exists='ignore')`.

Insert: `t.insert([{...}])`. `return_rows=True` returns computed columns on the status object. `source=` also takes a path or URL (`source_format='csv'|'excel'|'parquet'|'json'`, `schema_overrides=`), a DataFrame, a list of dicts or Pydantic models, another table or query, or a HF dataset.

**Do not let one bad row abort a batch.** `insert(..., on_error='ignore')` and `add_computed_column(..., on_error='ignore')` keep the row, leave the failed cell `None`, and record the reason in `t.<col>.errortype` / `t.<col>.errormsg` (stored computed or media columns only). `t.<col>.fileurl` / `.localpath` locate a media cell.

```python
t.update({'score': 1.0}, where=t.category == 'important')
t.delete(where=t.is_active == False)
t.recompute_columns('summary', errors_only=True)
```

Changing a computed column's logic:

- **App, same type.** Edit the expression in `app.py`. `pxt schema diff` shows a safe `~` alter, and `pxt schema update` applies it with no flag, but it **does not recompute** existing rows: it prints the `pxt recompute my_app/docs summary` command to run, which also recomputes dependent columns (`--no-cascade` to skip them). New rows use the new expression. A running service answers 409 until `pxt service update ... -f` restarts it.
- **App, new type.** A changed type, including `T` to `T | None`, a stored/computed swap, or a new `stored=`, is `UNSUPPORTED`. `--allow-destructive` does **not** help, and one unsupported table makes the whole `pxt schema update` apply nothing. **Rename** the column: the old name is a destructive drop and the new one an additive add, so it lands in one pass with `--allow-destructive -f`. Renaming a stored column drops its data. `Table.rename_column()` preserves an existing column and its expression; `pxt.move()` moves a table or directory.
- **Notebook.** `t.alter_computed_column(summary=new_expr)` keeps the type and, by default, recomputes the column and its dependents (`recompute=False` leaves the old values until `recompute_columns()`). A new type raises. `add_computed_column(..., if_exists='replace')` also works, but only on a column with no dependents.
- `if_exists='ignore'` never fixes logic -- it skips the call.

## Querying

```python
t.select(t.title, doubled=t.n * 2).where(t.n > 10).order_by(t.n, asc=False).limit(10).collect()
t.where(t.title.like('%pattern%')).count()
t.sample(n=100, seed=42).collect()
df = t.select(t.title).collect().to_pandas()  # export only
```

One `.where()` per query. Compose extra predicates with `&` / `|` (`t.where((t.n > 10) & t.active)`); do not chain `.where()`.

Aggregates run in queries, not computed columns:

```python
t.select(t.amount.sum()).collect()
t.group_by(t.region).select(t.region, total=t.amount.sum()).collect()
```

`@pxt.query` compiles at decoration time: do not `.collect()` or `get_table()` a table that does not exist yet inside one.

Local handle: `pxt.get_table('my_app.docs')`. Cloud: `pxt.get_table('pxt://org:db/docs')`. The dotted local name is Python only. The same table on the CLI is `my_app/docs`. Or bind the models themselves: `import app; app.TableModel.bind_all('my_app')`, after which `app.Docs.insert(...)`, `app.Docs.count()` and `app.Docs.select(...).collect()` work.

## Computed columns

Notebook: `t.add_computed_column(...)`. App: assignment on the model.

```python
from pixeltable.functions.openai import chat_completions

t.add_computed_column(
    summary=chat_completions(
        messages=[{'role': 'user', 'content': t.body}],
        model='gpt-4o-mini',
    ).choices[0].message.content,
    if_exists='ignore',
)
```

Extract the field (`.text`, `.choices[0].message.content`). The field is Json holding a string: `.astype(pxt.String)` it before concatenating or embedding. A Json dict or list does not cast (`Expected string, got dict` at insert); serialize it with `pxtf.json.dumps(...)`.

## Views

A view is either a **filter** over a base or an **iterator** that expands each base row into many. Rows follow the base; you never insert into a view.

### Filtered views

`base=` takes a query over another model, not just the model:

```python
class Titled(TableModel, name='titled', base=Docs.where(Docs.title != '')):
    headline = Docs.title_upper + '!'      # may reference the base's computed columns
```

Notebook: `pxt.create_view('dir.titled', t.where(t.title != ''), if_exists='ignore')`. Add `is_snapshot=True` to freeze it.

### Iterator views

Iterator output columns are reserved. Do not redeclare them. `string_splitter` / `document_splitter(..., separators='sentence')` need spaCy. `token_limit` needs `tiktoken`.

```python
from pixeltable.functions.document import document_splitter
from pixeltable.functions.video import frame_iterator
from pixeltable.functions.string import string_splitter
from pixeltable.functions.audio import audio_splitter
from pixeltable.functions.json import list_iterator

chunks = pxt.create_view(
    'dir.chunks', t,
    iterator=document_splitter(t.doc, separators='token_limit', limit=300),
    if_exists='ignore',
)
# Image elements only with separators='page' on PDFs
pages = pxt.create_view(
    'dir.pages', t,
    iterator=document_splitter(t.doc, separators='page', elements=['text', 'image']),
    if_exists='ignore',
)

# Output columns: pos, frame, frame_attrs  (timestamp is frame_attrs.time)
# Not frame_idx / pos_msec / pos_frame (legacy_frame_iterator only)
frames = pxt.create_view('dir.frames', t, iterator=frame_iterator(t.video, fps=1.0), if_exists='ignore')
frames.select(frames.pos, frames.frame, time=frames.frame_attrs.time).collect()

# text
sentences = pxt.create_view(
    'dir.sentences', t, iterator=string_splitter(text=t.body, separators='sentence'), if_exists='ignore',
)

audio = pxt.create_view(
    'dir.audio', t, iterator=audio_splitter(audio=t.audio, duration=30.0), if_exists='ignore',
)

tags = pxt.create_view('dir.tags', t, iterator=list_iterator(tag=t.tags), if_exists='ignore')
records = pxt.create_view('dir.records', t, iterator=list_iterator(t.records), if_exists='ignore')
```

`list_iterator` requires typed Json. Use keyword arguments for typed scalar lists, such as `tag=t.tags`; the keyword becomes the output column. The single positional form needs a list of TypedDicts (`pxt.Json[list[Record]]` above), and each key becomes a column (`name`, `score`). Untyped `pxt.Json` and `list[dict[str, str]]` are rejected, because they declare no keys to turn into columns.

App: `base=` plus `iterator=` on the model. See [workflows.md](workflows.md).

An unbound model class builds queries (`.where()`, `.select()`, `.order_by()`, `.group_by()`, `.limit()`, `.sample()`, `.join()`) -- that is what makes `base=Docs.where(...)` work. Anything that touches rows (`.collect()`, `.insert()`, `.count()`, `.update()`) needs the table to exist: use `pxt.get_table()`, or let a bound router reach it.

Every iterator view also gets `pos`. The nine that ship:

| Iterator | Module | Output columns |
|----------|--------|----------------|
| `document_splitter` | `functions.document` | subset of `text, image, title, heading, sourceline, page, bounding_box` per `elements=` / `metadata=` |
| `frame_iterator` | `functions.video` | `frame` (unstored), `frame_attrs` (`.time`, `.index`, `.key_frame`, ...) |
| `video_splitter` | `functions.video` | `segment_start`, `segment_start_pts`, `segment_end`, `segment_end_pts`, `video_segment` |
| `audio_splitter` | `functions.audio` | `segment_start`, `segment_end`, `audio_segment` |
| `string_splitter` | `functions.string` | `text` |
| `list_iterator` | `functions.json` | keys of `elements=`, or the kwarg names |
| `tile_iterator` | `functions.image` | `tile` (unstored), `tile_coord`, `tile_box` |

`legacy_frame_iterator` (`frame_idx` / `pos_msec` / `pos_frame`) and `sam3_for_video_segmentation` also exist; prefer `frame_iterator`.

## Indexes

App: `__indexes__ = [pxt.EmbeddingIndex(col, embedding=fn, name='...'), pxt.BtreeIndex(col)]`. Do not call `add_embedding_index()` in `app.py`. Use `.using(...)` when provider or model arguments must be bound. A custom embedding UDF must return a fixed-length, one-dimensional `pxt.Array[(N,), pxt.Float]`; Json or an array with an unknown length is not a valid embedding index function.

`embedding=` is tried against every modality and registers each one whose signature it matches, so a bidirectional function covers them all at once. That is why a CLIP index on an **image** column answers `similarity(string=...)`:

```python
clip_embed = pxtf.huggingface.clip.using(model_id='openai/clip-vit-base-patch32')
__indexes__ = [pxt.EmbeddingIndex(frame, embedding=clip_embed, name='frames_clip')]
# frame is an Image column, yet this resolves:
Frames.frame.similarity(string='a red bicycle')
```

Do not pass only `image_embed=` if you will query with `similarity(string=...)`.

Reach for the per-modality parameters -- `string_embed=`, `image_embed=`, `audio_embed=`, `video_embed=`, `document_embed=` -- when you want a *different* function per modality, or when you want a hard error: a per-modality argument that does not resolve raises, while `embedding=` quietly skips the modalities it cannot serve. Also `metric=` (`'cosine'` default), `precision=` (`'fp16'` default, `'fp32'` available). **The DSL names an index `name=`; `add_embedding_index()` names it `idx_name=`.**

```python
from pixeltable.functions.openai import embeddings
from pixeltable.functions.huggingface import sentence_transformer

embed_fn = embeddings.using(model='text-embedding-3-small')
# or: sentence_transformer.using(model_id='sentence-transformers/all-MiniLM-L6-v2')

class Docs(TableModel, name='docs'):
    body: pxt.String
    __indexes__ = [pxt.EmbeddingIndex(body, embedding=embed_fn, name='body_idx')]

t.add_embedding_index('body', embedding=embed_fn, if_exists='ignore')

sim = t.body.similarity(string=query)
t.where(sim > 0.3).order_by(sim, asc=False).limit(10).select(t.body, score=sim).collect()
```

`similarity()` takes exactly one of `string=`, `image=`, `audio=`, `video=`, `document=`, `vector=` (a raw array of the index's dimensionality). A positional argument is deprecated. When a column carries more than one embedding index, `idx='name'` picks one.

CLIP: `clip.using(model_id='openai/clip-vit-base-patch32')` then `similarity(string=...)` or `similarity(image=...)`. Metrics: `cosine` (default), `ip`, `l2`.

## UDFs

A UDF is recorded as a module path from the project root (`app.excerpt`). Type hints are required.

```python
@pxt.udf
def excerpt(text: str, n: int = 12) -> str:
    return text if len(text) <= n else f'{text[:n]}...'
```

### A non-nullable parameter that receives `None` skips the call

The cell is set to `None`, nothing raises, and `errormsg` stays empty. This is by design, and it applies to the shipped UDFs as much as to yours. Annotate `T | None` when the argument can be null, and handle `None` in the body:

```python
@pxt.udf
def label(severity: str | None) -> str:
    return severity or 'unknown'
```

Binding a nullable argument to a non-nullable parameter also widens the column's declared type, so `excerpt(Docs.body)` over `body: pxt.String | None` is a `String | None` column.

Load models at module scope, never in the UDF body: [anti-patterns.md](anti-patterns.md).

```python
from pixeltable.func import Batch

@pxt.udf(batch_size=32)
def batch_process(texts: Batch[str]) -> Batch[list[float]]:
    return model.encode(texts).tolist()

lookup_fn = pxt.retrieval_udf(t, name='lookup_items', description='Look up items by name',
    parameters=['name'], limit=5)
```

## UDAs

`@pxt.uda` is many rows to one value. Use in `select()` / `group_by()`, not `add_computed_column`. Subclass `pxt.Aggregator`: `__init__`, `update`, `value`. `__init__` args must be constants.

```python
@pxt.uda
class avg_int(pxt.Aggregator):
    def __init__(self):
        self.sum = 0
        self.count = 0

    def update(self, val: int) -> None:
        if val is not None:
            self.sum += val
            self.count += 1

    def value(self) -> float:
        return self.sum / self.count if self.count > 0 else 0.0

t.select(avg_int(t.value)).collect()
t.group_by(t.category).select(t.category, avg_val=avg_int(t.value)).collect()
```

Built-ins: `make_video`, `concat_videos_agg` (`pixeltable.functions.video`), `make_list` (`json`), `stitch_tiles` (`image`), `mean_ap` (`vision`). Scalar `concat_videos` takes a **list** of videos.

`requires_order_by` UDAs take the ordering expression as their **first positional argument**; passing `order_by=` raises. Built-ins include:

```python
t.select(pxtf.video.make_video(t.pos, t.frame, fps=30))          # t.pos orders; order_by= raises
t.group_by(base).select(pxtf.image.stitch_tiles(t.pos, t.tile, t.tile_box, width, height))
t.select(pxtf.video.concat_videos_agg(t.pos, t.video))
```

## Built-in functions

Before writing a UDF, check whether the operation already ships. `pixeltable.functions` (`pxtf`) covers strings, json, math, dates, arrays, images, audio, documents, and video (`video.editing`, `video.filters`, `video.scene_detect`), plus `vision` and `net`. Import the module and read its docs rather than guessing a name.

The one path worth spelling out, because nothing else documents it -- video to transcript:

```python
class Clips(TableModel, name='clips'):
    video: pxt.Video
    audio = pxtf.video.extract_audio(video, format='mp3')
    transcript = pxtf.openai.transcriptions(audio=audio, model='whisper-1').text
```

`extract_audio` returns `pxt.Audio | None`, and `transcriptions` takes a non-nullable `audio`. A silent video therefore leaves `transcript` as `None` with no `errormsg`. See the skip rule under [UDFs](#udfs).

## Import and export

Do not hand-roll a reader or writer -- check `pxt.io.import_*` / `export_*` first (csv, json, parquet, excel, pandas, SQL, Iceberg, LanceDB, HuggingFace).

## Serving

`from pixeltable.serving import FastAPIRouter`. Start from `pxt service example --out app.py`. `add_update_route` requires the target's primary key and matches rows by it: the request body carries the key even though `inputs` does not list it. `add_delete_route` uses the primary key by default and can instead take a nonempty `match_columns=` list.

Routes: `add_insert_route` (stores the row), `add_compute_route` (same request shape, computes without storing), `add_update_route`, `add_delete_route`, `add_query_route` (wraps a `@pxt.query`).

```python
ingest.add_update_route(Docs, path='/update', inputs=[Docs.title], outputs=[Docs.title])
```

Call `pxt.get_table()` inside custom FastAPI handlers. Do not `python app.py` if the file only declares models and routers. After a schema change, run `pxt service update` again. Worked example, upload and media URLs, and `background=True` job polling: [workflows.md](workflows.md).

## Tools

An agent is a table. Insert a message and the chain runs: the model picks tools, `invoke_tools` runs them, and a second call answers. Each step is a column you can inspect.

```python
@pxt.udf
def get_weather(city: str) -> str:
    """Current weather for a city."""  # the docstring is the tool description the model reads
    return f'{city}: 22C, sunny'


tools = pxt.tools(get_weather)  # also @pxt.query functions, retrieval_udf(), mcp_udfs(); pxt.tool() renames


class Assistant(TableModel, name='assistant'):
    message: pxt.String
    response = pxtf.openai.chat_completions(
        messages=[{'role': 'user', 'content': message}], model='gpt-4o-mini', tools=tools
    )
    tool_output = pxtf.openai.invoke_tools(tools, response)  # {'get_weather': ['Paris: 22C, sunny']}
    answer = pxtf.openai.chat_completions(
        messages=[{'role': 'user', 'content': message + '\nTool results: ' + pxtf.json.dumps(tool_output)}],
        model='gpt-4o-mini',
    ).choices[0].message.content
```

`invoke_tools` belongs to the provider that made the call: `openai`, `anthropic`, `gemini`, `bedrock`, and `groq` each ship one. It returns a dict with one key per registered tool: a list of results when the model called it, `None` when it did not. That dict is Json, so it goes into the next prompt through `pxtf.json.dumps()`. When the model calls a tool, `message.content` is null: extract it with `.astype(pxt.String | None)`.

On Pixeltable 0.7.11 a `tools=` column never reaches schema agreement (PXT-1429, open): the stored tool schema comes back with its keys reordered, so `pxt schema diff` always reports a safe alter, and each `pxt schema update` bumps the table version without changing a value. Serving requires agreement, so `pxt service update` refuses every service in that app file (exit 1), and `router.bind()` raises `SCHEMA_MISMATCH`. Insert and read from Python (`import app; app.TableModel.bind_all('my_app')`) instead. Do not run the `pxt recompute` the update suggests: it calls the model again on every row and leaves the diff pending.

MCP: `pxt.mcp_udfs(url)` returns one UDF per remote tool over streamable HTTP; tools returning images or audio are not supported. Keys: env or [Configuration](https://docs.pixeltable.com/platform/configuration), not `api_key=` in calls.
