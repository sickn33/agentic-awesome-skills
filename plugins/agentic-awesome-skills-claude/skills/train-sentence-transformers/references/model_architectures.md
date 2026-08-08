# Model Architectures (SentenceTransformer)

The `SentenceTransformer` class is a `torch.nn.Sequential` of modules. The common shape is `Transformer` + `Pooling` (+ optional `Normalize` / `Dense`), but four distinct architecture families are supported and the right choice depends on the task.

## The four architecture families

| Family | Backbone | Pooling | Use case |
|---|---|---|---|
| **Encoder (bidirectional)** | BERT, RoBERTa, DeBERTa, MPNet, ModernBERT, XLM-R | `mean` (default) or `cls` | Short/medium text, general default |
| **Decoder (causal LLM)** | Qwen, Llama, Mistral, Gemma | `lasttoken` | Long context, instruction-tunable, larger quality ceiling |
| **Static embeddings** | `StaticEmbedding` module | N/A | CPU-only, <10MB, extremely fast |
| **Multimodal / Router** | VLM backbones or composed encoders | depends | Text + image / audio / video |

Below, each family with concrete setup.

## Encoder models (the default)

The historical default and still usually the right choice for text embeddings.

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("microsoft/mpnet-base")
# Auto-constructs: Transformer(feature-extraction) -> Pooling(mean).
```

When `SentenceTransformer("<checkpoint>")` is called with a raw HF encoder, it auto-wraps the transformer and adds `Pooling(..., pooling_mode="mean")`.

To customize pooling or add modules:

```python
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.modules import Normalize, Pooling, Transformer

transformer = Transformer("answerdotai/ModernBERT-base")
pooling = Pooling(transformer.get_embedding_dimension(), pooling_mode="cls")    # or "mean", "lasttoken", ...
model = SentenceTransformer(modules=[transformer, pooling, Normalize()])
```

**Pooling modes**:
- `mean` (default) — average of token embeddings, masked to the attention mask. Strongest default.
- `cls` — embedding of the `[CLS]` token. Works if the base was CLS-pretrained.
- `max` — element-wise max across tokens. Rare.
- `mean_sqrt_len_tokens` — mean scaled by √seq_len. Empirically helps on some tasks.
- `weightedmean` — token-position-weighted mean. Useful for decoder bases as a non-last-token alternative.
- `lasttoken` — embedding of the last token. Required for causal-LM bases (see decoder section below).

Don't switch pooling mid-training. Pick once.

## Decoder / causal LLM models

Strong at long context, instruction following, multilingual. Memory-hungry — typically LoRA-trained rather than full fine-tuned.

**Two setup paths depending on whether the model was already adapted for embeddings:**

```python
# Path A: already-adapted embedding checkpoint (ships with the right modules):
from sentence_transformers import SentenceTransformer
model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")   # just works

# Path B: raw decoder LLM, build the pipeline manually:
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.modules import Normalize, Pooling, Transformer

transformer = Transformer(
    "Qwen/Qwen2.5-0.5B",
    transformer_task="text-generation",         # critical: causal attention, no bidirectional
    processor_kwargs={"padding_side": "left"},  # last-token pooling wants left-padding
)
pooling = Pooling(transformer.get_embedding_dimension(), pooling_mode="lasttoken")
model = SentenceTransformer(modules=[transformer, pooling, Normalize()])
```

Skipping `transformer_task="text-generation"` or `pooling_mode="lasttoken"` on a raw decoder gives embeddings that look plausible until you benchmark.

**Why last-token pooling:** causal attention means only the last token has seen the full sequence. Mean-pooling a causal model averages embeddings that only saw prefixes — the result doesn't represent the whole input.

For training decoder bases:
- Learning rate: typically `1e-4` or higher (not `2e-5` like encoders).
- LoRA is almost always the right choice for >1B-param bases; see `../scripts/train_sentence_transformer_with_lora_example.py` (its docstring covers when to use, hyperparams, QLoRA for 7B+, and adapter sharing).

## Static embeddings

`StaticEmbedding` skips the transformer entirely — each token maps to a pre-computed vector via a lookup table. No attention, no contextualization.

**When to use:**
- CPU inference, no GPU, browser / edge / on-device deployment.
- Need <10MB model size.
- Latency budget <1ms per embedding.
- Have >1M training pairs (contextualization is replaced by per-token optimization; this takes data).

**When NOT to use:**
- Task needs contextual understanding (polysemy, syntax, long-range dependencies).
- You have <100k training pairs — the model won't learn enough.

**Setup:**

```python
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.modules import StaticEmbedding
from tokenizers import Tokenizer

tokenizer = Tokenizer.from_pretrained("google-bert/bert-base-uncased")
static_embedding = StaticEmbedding(tokenizer, embedding_dim=512)
model = SentenceTransformer(modules=[static_embedding])
```

Train with `MultipleNegativesRankingLoss` on a large contrastive dataset (1M+ pairs).

**Warm starts vs. random init** — with **>1M training samples**, random-init beats `StaticEmbedding.from_model2vec(...)` or `.from_distillation(...)` warm starts. With smaller datasets, warm starts help.

```python
# For smaller datasets (<100k), warm-start:
static_embedding = StaticEmbedding.from_model2vec("minishlab/potion-base-8M")
# or:
static_embedding = StaticEmbedding.from_distillation("sentence-transformers/all-MiniLM-L6-v2", vocabulary=list(tokenizer.get_vocab().keys()))
```

See `../scripts/train_sentence_transformer_static_embedding_example.py` for a runnable end-to-end recipe (random init + MNRL + Matryoshka + bf16 + lr=2e-1) and the [Static Embeddings blog post](https://huggingface.co/blog/static-embeddings) for benchmarks.

## Multimodal via VLM backbone

Modern vision-language models can be loaded directly and produce joint text+image embeddings:

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer(
    "Qwen/Qwen3-VL-Embedding-2B",
    model_kwargs={"attn_implementation": "flash_attention_2"},  # do NOT set torch_dtype here; see training_args.md
    processor_kwargs={"min_pixels": 28 * 28, "max_pixels": 600 * 600},
)

# Check which modalities this model supports:
print(model.modalities)
# ['text', 'image', 'video', 'message']
```

Training data can mix text, PIL images, image paths/URLs, audio, and mixed-modality dicts like `{"image": <PIL>, "text": "describe this"}`. The data collator handles preprocessing via the model's `preprocess` method.

Install multimodal extras: `pip install "sentence-transformers[image]"` (or `[audio]`, `[video]`).

**Precision**: load in fp32 and pass `bf16=True` (or `fp16=True`) to TrainingArguments — autocast handles the inference path. Don't set `torch_dtype="bfloat16"` in `model_kwargs`: it puts Adam state in bf16 and silently degrades quality (see `training_args.md`).

## Multimodal via Router

Instead of one VLM backbone, compose separate encoders per modality:

```python
from sentence_transformers import SentenceTransformer
from sentence_transformers.sentence_transformer.modules import Dense, Pooling, Router, Transformer

# Text encoder
text_encoder = Transformer("sentence-transformers/all-MiniLM-L6-v2")
text_pooling = Pooling(text_encoder.get_embedding_dimension(), pooling_mode="mean")
# Project text to match image encoder's dim
text_projection = Dense(text_encoder.get_embedding_dimension(), 768)

# Image encoder (SigLIP outputs pooled embeddings directly)
image_encoder = Transformer("google/siglip2-base-patch16-224")

router = Router(
    sub_modules={
        "text": [text_encoder, text_pooling, text_projection],
        "image": [image_encoder],
    },
)
model = SentenceTransformer(modules=[router])
```

**Warning**: Router-based models have unaligned embedding spaces at init — you must train to align them. Use a `Dense` projection layer when dimensions differ. Task-based routing (different encoders for queries vs. documents) is also supported via `route_mappings`; see the `Router` docstring.

## Gotchas

- **Decoder base with mean pooling**: silently produces garbage embeddings. Always use `lasttoken`.
- **Router multimodal without training**: the separate encoders' embedding spaces are unaligned at init. Don't expect useful cross-modal similarity until you've trained with a loss that aligns the spaces.
- **StaticEmbedding with fewer than 100k pairs**: the model won't learn enough. Either warm-start via `from_model2vec` / `from_distillation`, or use a regular encoder.
- **Large VLM backbones on consumer GPUs**: combine LoRA + `attn_implementation="flash_attention_2"`. With LoRA only, you can additionally pass `torch_dtype="bfloat16"` — the bf16 base weights are frozen, so the Adam-state precision concern from the precision rule above doesn't apply (the LoRA adapter stays fp32, so its optimizer state stays fp32). Without LoRA, follow the precision rule: keep weights fp32 and rely on `bf16=True` autocast.
