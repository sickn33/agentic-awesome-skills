# ModelRegistry Reference

In Transformers.js v4, `ModelRegistry` provides a preflight API for model assets. You can inspect required files, estimate total download size, check cache state, and clear cached artifacts before calling `pipeline()`.

This is useful for production UX where you want to:
- show accurate download estimates before loading,
- support offline-first flows,
- avoid surprise bandwidth usage,
- and keep cache management explicit.

## Table of Contents

1. [Overview](#overview)
2. [Core APIs](#core-apis)
3. [Recommended Workflow](#recommended-workflow)
4. [Examples](#examples)
5. [Best Practices](#best-practices)

## Overview

```javascript
import { ModelRegistry } from '@huggingface/transformers';
```

`ModelRegistry` works with the same task/model/options you pass to `pipeline()`.

Typical tuple:

```javascript
const task = 'feature-extraction';
const modelId = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const modelOptions = { dtype: 'fp32' };
```

## Core APIs

### `get_pipeline_files(task, modelId, modelOptions)`

Returns all files needed to initialize that pipeline configuration.

```javascript
const files = await ModelRegistry.get_pipeline_files(task, modelId, modelOptions);
// Example: ['config.json', 'onnx/model.onnx', 'tokenizer.json', ...]
```

Use this to build preflight checks and download manifests.

### `get_file_metadata(modelId, file)`

Returns metadata for a single file (including size when available).

```javascript
const metadata = await ModelRegistry.get_file_metadata(modelId, 'onnx/model.onnx');
console.log(metadata);
```

Use this to compute total transfer size and identify large artifacts.

### `is_pipeline_cached(task, modelId, modelOptions)`

Checks whether required files are already available in cache.

```javascript
const cached = await ModelRegistry.is_pipeline_cached(task, modelId, modelOptions);
console.log(cached ? 'Ready offline' : 'Needs download');
```

Use this to gate offline mode and skip unnecessary preload steps.

### `clear_pipeline_cache(task, modelId, modelOptions)`

Clears cached assets for a specific pipeline tuple.

```javascript
await ModelRegistry.clear_pipeline_cache(task, modelId, modelOptions);
```

Use this for cache invalidation, testing, or space reclamation.

### `get_available_dtypes(modelId)`

Returns precision/quantization formats available for the model.

```javascript
const dtypes = await ModelRegistry.get_available_dtypes(modelId);
// Example: ['fp32', 'fp16', 'q4', 'q4f16']
```

Use this to choose the best runtime profile (quality vs. speed vs. memory).

## Recommended Workflow

For robust loading UX:

1. Resolve the exact task/model/options tuple.
2. Call `get_pipeline_files(...)`.
3. Fetch metadata per file and compute total size.
4. Call `is_pipeline_cached(...)`.
5. If not cached, show user-facing size/progress expectations.
6. Load via `pipeline(...)` and use `progress_total` in `progress_callback`.

```javascript
import { ModelRegistry, pipeline } from '@huggingface/transformers';

const task = 'feature-extraction';
const modelId = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const modelOptions = { dtype: 'q8' };

const files = await ModelRegistry.get_pipeline_files(task, modelId, modelOptions);

const metadata = await Promise.all(
  files.map((file) => ModelRegistry.get_file_metadata(modelId, file))
);

const totalBytes = metadata.reduce((sum, item) => sum + (item?.size ?? 0), 0);
const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

const cached = await ModelRegistry.is_pipeline_cached(task, modelId, modelOptions);
console.log({ fileCount: files.length, totalMB, cached });

const pipe = await pipeline(task, modelId, {
  ...modelOptions,
  progress_callback: (info) => {
    if (info.status === 'progress_total') {
      console.log(`Loading: ${info.progress.toFixed(1)}%`);
    }
  },
});

await pipe.dispose();
```

## Examples

### Example 1: Offer dtype choice dynamically

```javascript
import { ModelRegistry, pipeline } from '@huggingface/transformers';

const task = 'text-generation';
const modelId = 'onnx-community/Qwen2.5-0.5B-Instruct';

const dtypes = await ModelRegistry.get_available_dtypes(modelId);
const preferred = dtypes.includes('q4') ? 'q4' : dtypes[0] ?? 'fp32';

const generator = await pipeline(task, modelId, { dtype: preferred });
// ... inference
await generator.dispose();
```

### Example 2: Only clear one pipeline cache entry

```javascript
import { ModelRegistry } from '@huggingface/transformers';

await ModelRegistry.clear_pipeline_cache(
  'feature-extraction',
  'onnx-community/all-MiniLM-L6-v2-ONNX',
  { dtype: 'fp32' }
);
```

This avoids wiping unrelated model caches.

### Example 3: Offline gate

```javascript
import { ModelRegistry, env, pipeline } from '@huggingface/transformers';

const task = 'feature-extraction';
const modelId = 'onnx-community/all-MiniLM-L6-v2-ONNX';
const modelOptions = { dtype: 'q8' };

const cached = await ModelRegistry.is_pipeline_cached(task, modelId, modelOptions);

if (!cached) {
  throw new Error('Model not cached yet. Connect once to download assets.');
}

env.allowRemoteModels = false;
const pipe = await pipeline(task, modelId, { ...modelOptions, local_files_only: true });
```

## Best Practices

1. Use `ModelRegistry` before `pipeline()` when you need predictable download UX.
2. Cache decisions should be per task/model/options tuple (dtype and revision matter).
3. Use `progress_total` for user-facing progress bars; keep per-file progress optional.
4. Prefer selective invalidation with `clear_pipeline_cache(...)` over broad cache deletion.
5. In offline mode, combine `is_pipeline_cached(...)` with `local_files_only: true` and `env.allowRemoteModels = false`.

## Related Documentation

- [Pipeline Options](./PIPELINE_OPTIONS.md) - `pipeline()` options and progress callback
- [Configuration Reference](./CONFIGURATION.md) - `env` settings for local/remote loading
- [Caching Reference](./CACHE.md) - Browser, filesystem, and custom cache behavior
- [Main Skill Guide](../SKILL.md) - Practical usage patterns
