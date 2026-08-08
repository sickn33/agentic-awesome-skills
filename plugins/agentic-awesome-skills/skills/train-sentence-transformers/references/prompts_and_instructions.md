# Prompts and Instructions

Modern embedding models (E5, BGE, GTE, Qwen3-Embedding, Nomic, Instructor, etc.) use **prompts** / **instructions** at encode time — short prefixes like `"query: "`, `"passage: "`, or `"Represent this sentence for retrieval:"` — to signal task intent.

In sentence-transformers, prompts work during both **training** and **inference**, and the library keeps them aligned automatically.

The prompt is literally prepended to the input text before tokenization.

## Model-level prompts

Set prompts on the model so `encode()`, `encode_query()`, `encode_document()` use them automatically:

```python
model = SentenceTransformer("your-base-model")
model.prompts = {
    "query":    "query: ",
    "document": "passage: ",
}
model.default_prompt_name = "document"        # used when none is specified
```

At inference:

```python
q_emb = model.encode_query("What is the capital of France?")
# Internally: encodes "query: What is the capital of France?"

d_emb = model.encode_document(["Paris is the capital of France.", "Berlin is the capital of Germany."])
# Internally: encodes "passage: Paris..." etc.

# Explicit prompt_name:
emb = model.encode(["some text"], prompt_name="query")
```

## Training with prompts

Set prompts on the training args so they're applied automatically to the right columns during training. Four shapes, increasingly specific:

### 1. Single prompt (applied everywhere)

```python
args = SentenceTransformerTrainingArguments(
    ...,
    prompts="Represent this sentence for similarity: ",
)
```

Every input column gets the prefix. Simplest and often sufficient for single-task training.

### 2. Per-column prompts

```python
prompts = {
    "anchor":   "query: ",
    "positive": "passage: ",
    "negative": "passage: ",
}
```

Keys are **column names**. Different prefixes for different roles.

### 3. Per-dataset prompts (multi-dataset)

```python
prompts = {
    "all-nli": "Classify the entailment relationship: ",
    "stsb":    "Score semantic similarity: ",
}
```

Keys are **dataset names** (matching the `train_dataset` dict keys).

### 4. Per-dataset + per-column

```python
prompts = {
    "all-nli": "",                                          # all-nli: no prompt
    "msmarco": {                                            # msmarco: per-column
        "query":    "query: ",
        "positive": "passage: ",
        "negative": "passage: ",
    },
}
```

## Cross-encoder specifics

Cross-encoders restrict prompts to single-value or per-dataset only (no per-column). This is because cross-encoders take text pairs, not separate columns.

```python
args = CrossEncoderTrainingArguments(
    ...,
    prompts="Rank this passage for the query: ",   # single prompt
)
# or
args = CrossEncoderTrainingArguments(
    ...,
    prompts={"msmarco": "...", "gooaq": "..."},    # per-dataset
)
```

## Sparse encoders (SPLADE)

Sparse encoders support prompts with the same four shapes as bi-encoders (added in v5.x). Same `model.prompts = {...}` API.

## Pooling and prompt tokens (bi-encoder)

When using mean/last-token pooling with prompt prefixes, the prompt tokens themselves can either:
- **Be included** in the pooled embedding (default behavior). Simpler, what most models do.
- **Be excluded** — only the actual content tokens are pooled.

To exclude, flip `include_prompt` on the Pooling module — found via `isinstance` rather than a fixed index, since multimodal / Router pipelines don't always put Pooling at position 1:

```python
from sentence_transformers.sentence_transformer.modules import Pooling

for module in model:
    if isinstance(module, Pooling):
        module.include_prompt = False
```

Or use the helper if your model exposes one (e.g. `SparseEncoder.set_pooling_include_prompt(False)`).

**When to exclude**: when the prompt is purely a task signal and you don't want it to dilute the semantic representation. Most E5 / BGE / GTE models leave prompts included.

During training with `prompts=`, the `include_prompt` setting is respected; the trainer also tracks `include_prompt_lengths` internally so pooling skips the prompt tokens correctly when `include_prompt=False`.

## Inference alignment

If you trained with `prompts={"query": "query: ", ...}`, you must:

1. **Save the prompts on the model**: `model.prompts = args.prompts` before `save_pretrained`, OR let the library do this automatically via the model card data.
2. **Use the same prompts at inference**: call `encode_query()` / `encode_document()` and the saved prompts are applied.

If the saved model's `config_sentence_transformers.json` has `prompts` + `default_prompt_name`, anyone who loads it gets the correct prompts for free.

## Instruction tuning (different from prompts)

Some models (Instructor, Qwen3-Embedding) use **instructions** — longer descriptions like `"Represent the biomedical query for retrieving relevant passages:"`. In sentence-transformers these are modeled the same way: just set them as prompts.

The model-card convention is to list available instructions/prompts in a dict:

```python
model.prompts = {
    "msmarco-query":    "Represent the query for MS MARCO retrieval: ",
    "msmarco-doc":      "Represent the passage for MS MARCO retrieval: ",
    "sts":              "Represent the sentence for semantic similarity: ",
    "classification":   "Represent the sentence for topic classification: ",
}
```

Users call `model.encode(["..."], prompt_name="msmarco-query")`.

## Gotchas

- **Training with prompts but forgetting to set them on the model before `save_pretrained`**: the saved model won't know about the prompts. Users will encode *without* the prefix and get bad results. Fix: `model.prompts = args.prompts` before saving, or use `SentenceTransformerModelCardData(...)` with the prompt info.
- **Using `encode_query()` at inference but didn't train with a "query" prompt**: the method will just call regular `encode` (no prefix applied), which is fine. But the documentation implies you use it, and users may be confused.
- **Trailing spaces matter**: `"query: "` vs `"query:"` — the former has a trailing space before the real text. Inspect your training data to know which one your model was trained with.
- **Mixing prompted and non-prompted data in multi-dataset training** is fine as long as your `prompts` dict covers it per-dataset (e.g. `{"dataset_a": "query: ", "dataset_b": ""}`).
- **`include_prompt=False` with small datasets**: the model may under-fit because you've effectively shortened every input. Usually leave as True.
