# Pixeltable AI Provider Reference

Every provider is a module under `pixeltable.functions.`. Call it in a computed column; never in a `for` loop. In an app, embeddings go on `__indexes__`; in a notebook, `add_embedding_index()`. Embedding and index functions are bound with `.using(...)`.

Keys come from the environment or [config](https://docs.pixeltable.com/platform/configuration), never `api_key=` in the call.

## Quick reference

| Provider | Module | Functions | Extract |
|----------|--------|-----------|---------|
| OpenAI | `openai` | `chat_completions`, `responses`, `embeddings`, `speech`, `transcriptions`, `translations`, `image_generations`, `image_edits`, `image_variations`, `moderations`, `invoke_tools` | chat: `.choices[0].message.content`; Responses: `.output_text` |
| Anthropic | `anthropic` | `messages`, `invoke_tools` | `.content[0].text` |
| Gemini | `gemini` | `generate_content`, `embed_content`, `generate_images`, `generate_videos`, `generate_speech`, `transcribe`, `invoke_tools` | content: Json; generation/transcription returns typed Image, Video, Audio, or String |
| Bedrock | `bedrock` | `converse`, `invoke_model`, `embed`, `invoke_tools` | `.output.message.content[0].text` |
| Groq | `groq` | `chat_completions`, `invoke_tools` | `.choices[0].message.content` |
| Together | `together` | `chat_completions`, `completions`, `embeddings`, `image_generations` | `.choices[0].message.content` |
| Mistral | `mistralai` | `chat_completions`, `fim_completions`, `embeddings` | `.choices[0].message.content` |
| Nebius | `nebius` | `chat_completions`, `embeddings` | `.choices[0].message.content` |
| Fireworks | `fireworks` | `chat_completions` | `.choices[0].message.content` |
| DeepSeek | `deepseek` | `chat_completions` | `.choices[0].message.content` |
| OpenRouter | `openrouter` | `chat_completions` | `.choices[0].message.content` |
| Fabric | `fabric` | `chat_completions`, `embeddings` | `.choices[0].message.content` |
| Ollama (local) | `ollama` | `chat`, `generate`, `embed` | chat: `.message.content`; generate: `.response` |
| llama.cpp (local) | `llama_cpp` | `create_chat_completion` | `.choices[0].message.content` |
| vLLM (local) | `vllm` | `chat_completions`, `generate` | `.choices[0].message.content` |
| Hugging Face | `huggingface` | `sentence_transformer`, `clip`, `cross_encoder`, `detr_for_object_detection`, `sam3_for_segmentation`, `image_captioning`, `summarization`, `text_to_image`, ~15 more | index fn, or Json |
| Whisper (local) | `whisper` | `transcribe` | `.text` |
| WhisperX (local) | `whisperx` | `transcribe` | Json with `segments` |
| Voyage AI | `voyageai` | `embeddings`, `rerank`, `multimodal_embed` | index fn / Json |
| Jina AI | `jina` | `embeddings`, `rerank` | index fn / Json |
| Twelve Labs | `twelvelabs` | `embed` | video index fn |
| BFL FLUX | `bfl` | `generate`, `edit`, `fill`, `expand` | `pxt.Image` |
| RunwayML | `runwayml` | `text_to_image`, `text_to_video`, `image_to_video`, `video_to_video` | image: `response['output'][0].astype(pxt.Image)`; video: `response['output'].astype(pxt.Video)` |
| fal.ai | `fal` | `run` | Json |
| Replicate | `replicate` | `run` | Json |
| YOLOX | `yolox` | `yolox`, `yolo_to_coco` | Json detections |

## Retries and proxies

OpenAI, Anthropic, and Gemini report rate limits and retry up to 10 times. Providers on a fixed request-rate pool retry up to 3 times, paced by `rate_limit` in their config section (600 requests a minute when unset): Groq, Together, Mistral, Nebius, Fireworks, DeepSeek, OpenRouter, Fabric, fal.ai, Replicate, BFL, Jina, Voyage AI, Twelve Labs, and RunwayML. HTTP 429, 503, 408, and 504, connection errors, and timeouts are retried, with a backoff that honors `Retry-After`. Bedrock does not retry. The local model integrations do not retry: Ollama, llama.cpp, vLLM, Hugging Face, Whisper, WhisperX, and YOLOX. A cell that still fails holds the error: `pxt errors PATH` lists it, and `pxt recompute PATH COLUMN --errors-only -f` runs it again. Do not add a retry loop, `tenacity`, or a second client around a call that already retries. Recompute a failed Bedrock or local-model cell; those calls are not repeated for you.

To send OpenAI-compatible calls through a proxy such as LiteLLM, set `OPENAI_BASE_URL` (or `base_url` under `[openai]` in `config.toml`); on Cloud, `pxt secret set pxt://org OPENAI_BASE_URL=https://<proxy>/v1`, then restart. Only the OpenAI client reads a base URL from Pixeltable's config.

Not model providers, but in the same namespace: `net.presigned_url` turns a blob-storage URI into a time-limited HTTP URL for serving media, and `vision` carries `eval_detections`, the `mean_ap` UDA, `bboxes_draw` / `overlay_segmentation` and the `bboxes_*` conversion family.

## Shapes

```python
from pixeltable.functions.openai import chat_completions, embeddings
from pixeltable.functions.huggingface import sentence_transformer

summary = chat_completions(messages=[{'role': 'user', 'content': body}], model='gpt-4o-mini') \
    .choices[0].message.content

embed_fn = embeddings.using(model='text-embedding-3-small')
# or local: sentence_transformer.using(model_id='sentence-transformers/all-MiniLM-L6-v2')
```

- **Model argument.** `model=` on most. `model_id=` on `bedrock` and `huggingface`, `model_name=` on `twelvelabs`, `repo_id=` + `repo_filename=` (or `model_path=`) on `llama_cpp`, `app=` on `fal`, `ref=` on `replicate`.
- **Other request parameters** go in one dict, never as top-level keywords: `model_kwargs={...}` on OpenAI, Anthropic, Groq, Together, Mistral, Nebius, Fireworks, DeepSeek, OpenRouter, Fabric, llama.cpp, and RunwayML (`temperature`, `response_format`, OpenAI's `max_tokens`). Gemini takes `config=`, Bedrock `converse` takes `inference_config=`, Ollama takes `options=`, vLLM takes `sampling_params=`. An unknown top-level keyword fails signature binding.
- **Anthropic `messages` requires `max_tokens=`** as a top-level argument: `messages(messages=[...], model=..., max_tokens=1024)`.
- **Images** go in an OpenAI message as `{'type': 'image_url', 'image_url': t.image}`: the image column itself, not the HTTP API's `{'url': ...}` wrapper. Pixeltable serializes it. `openai.vision` is deprecated.
- **Output.** OpenAI-compatible chat completions return `.choices[0].message.content`; OpenAI `responses` exposes simple text as `.output_text`; Anthropic returns `.content[0].text`.
- **Tools** are per provider: pair `pxt.tools(...)` with that module's own `invoke_tools`. The full chain is in [core-api.md](core-api.md#tools).

Rerankers (`voyageai.rerank`, `jina.rerank`, `huggingface.cross_encoder`) score query/document pairs; run one over the rows `.similarity()` returned rather than reaching for a framework.

**Model ids go stale.** The ids here are examples, not recommendations -- check the provider's current list. Pixeltable's own docstrings lag further behind than this file does.
