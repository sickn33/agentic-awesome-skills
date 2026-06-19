# Pipeline Options Reference

Guide to configuring model loading and inference using the `PretrainedModelOptions` parameter in the `pipeline()` function.

## Table of Contents

1. [Overview](#overview)
2. [Basic Options](#basic-options)
3. [Model Loading Options](#model-loading-options)
4. [Device and Performance Options](#device-and-performance-options)
5. [Common Configuration Patterns](#common-configuration-patterns)

## Overview

The `pipeline()` function accepts three parameters:

```javascript
import { pipeline } from '@huggingface/transformers';

const pipe = await pipeline(
  'task-name',           // 1. Task type (e.g., 'sentiment-analysis')
  'model-id',            // 2. Model identifier (optional, uses default if null)
  options                // 3. PretrainedModelOptions (optional)
);
```

The third parameter, `options`, allows you to configure how the model is loaded and executed.

### Available Options

```typescript
interface PretrainedModelOptions {
  // Progress tracking
  progress_callback?: (info: ProgressInfo) => void;
  
  // Model configuration
  config?: PretrainedConfig;
  
  // Cache and loading
  cache_dir?: string;
  local_files_only?: boolean;
  revision?: string;
  
  // Model-specific settings
  subfolder?: string;
  model_file_name?: string;
  
  // Device and performance
  device?: DeviceType | Record<string, DeviceType>;
  dtype?: DataType | Record<string, DataType>;
  
  // External data format (large models)
  use_external_data_format?: boolean | number | Record<string, boolean | number>;
  
  // ONNX Runtime settings
  session_options?: InferenceSession.SessionOptions;
}
```

## Basic Options

### Progress Callback

Track model download and loading progress. **Note:** Models consist of multiple files (model weights, config, tokenizer, etc.), and each file reports its own progress:

```javascript
const fileProgress = {};

const pipe = await pipeline('sentiment-analysis', null, {
  progress_callback: (info) => {
    if (info.status === 'progress') {
      fileProgress[info.file] = info.progress;
      console.log(`${info.file}: ${info.progress.toFixed(1)}%`);
    }
    
    if (info.status === 'done') {
      console.log(`✓ ${info.file} complete`);
    }
  }
});
```

**Progress Info Types:**

```typescript
type ProgressInfo = {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  name: string;       // Model id or path
  file: string;       // File being processed
  progress?: number;  // Percentage (0-100, only for 'progress' status)
  loaded?: number;    // Bytes downloaded (only for 'progress' status)
  total?: number;     // Total bytes (only for 'progress' status)
};
```

**Example: Browser Loading UI with Multiple Files**

```javascript
const statusDiv = document.getElementById('status');
const progressContainer = document.getElementById('progress-container');
const fileProgressBars = {};

const pipe = await pipeline('image-classification', null, {
  progress_callback: (info) => {
    if (info.status === 'progress') {
      // Create progress bar for each file if not exists
      if (!fileProgressBars[info.file]) {
        const fileDiv = document.createElement('div');
        fileDiv.innerHTML = `
          <div class="file-name">${info.file}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
        `;
        progressContainer.appendChild(fileDiv);
        fileProgressBars[info.file] = fileDiv.querySelector('.progress-fill');
      }
      
      // Update progress bar
      fileProgressBars[info.file].style.width = `${info.progress}%`;
      
      const mb = (info.loaded / 1024 / 1024).toFixed(2);
      const totalMb = (info.total / 1024 / 1024).toFixed(2);
      statusDiv.textContent = `${info.file}: ${mb}/${totalMb} MB`;
    }
    
    if (info.status === 'ready') {
      statusDiv.textContent = 'Model ready!';
    }
  }
});
```

For more progress tracking examples, see the examples in this section above.

### Custom Configuration

Override the model's default configuration:

```javascript
import { pipeline } from '@huggingface/transformers';

const pipe = await pipeline('text-generation', 'model-id', {
  config: {
    max_length: 512,
    temperature: 0.8,
    // ... other config options
  }
});
```

**Use cases:**
- Override default generation parameters
- Adjust model-specific settings
- Test different configurations without modifying model files

## Model Loading Options

### Cache Directory

Specify where to cache downloaded models:

```javascript
// Node.js: Custom cache location
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  cache_dir: './my-custom-cache'
});
```

**Default behavior:**
- If not specified, uses `env.cacheDir` (default: `./.cache`)
- Only applies when `env.useFSCache = true` (Node.js)
- Browser cache uses Cache API (configured via `env.cacheKey`)



### Local Files Only

Prevent any network requests:

```javascript
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  local_files_only: true
});
```

**Use cases:**
- Offline applications
- Air-gapped environments
- Testing with pre-downloaded models
- Production deployments with bundled models

**Important:**
- Model must already be cached or available locally
- Throws error if model not found locally
- Requires `env.allowLocalModels = true`



### Model Revision

Specify a specific model version (git branch, tag, or commit):

```javascript
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  revision: 'v1.0.0'  // Use specific version
});

// Or use a branch
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  revision: 'experimental'
});

// Or use a commit hash
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  revision: 'abc123def456'
});
```

**Default:** `'main'` (latest version)

**Use cases:**
- Pin to stable release for production
- Test experimental features
- Reproduce results with specific model version
- Work with models under development

**Important:**
- Only applies to remote models (Hugging Face Hub)
- Ignored for local file paths
- Each revision is cached separately

### Model Subfolder

Specify the subfolder within the model repository:

```javascript
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  subfolder: 'onnx'  // Default: 'onnx'
});
```

**Default:** `'onnx'`

**Use cases:**
- Custom model repository structure
- Multiple model variants in same repo
- Organizational preferences



### Model File Name

Specify a custom model file name (without `.onnx` extension):

```javascript
const pipe = await pipeline('text-generation', 'model-id', {
  model_file_name: 'decoder_model_merged'
});
// Loads: decoder_model_merged.onnx
```

**Use cases:**
- Models with non-standard file names
- Select specific model variant
- Encoder-decoder models with separate files

**Note:** Currently only valid for encoder-only or decoder-only models.



## Device and Performance Options

### Device Selection

Choose where to run the model:

```javascript
// Run on CPU (WASM - default)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  device: 'wasm'
});

// Run on GPU (WebGPU)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  device: 'webgpu'
});
```

**Common devices:**
- `'wasm'` - WebAssembly (CPU, most compatible)
- `'webgpu'` - WebGPU (GPU, faster in browsers)
- `'cpu'` - CPU
- `'gpu'` - Auto-detect GPU
- `'cuda'` - NVIDIA CUDA (Node.js with GPU)

See the full list in the [devices.js source](https://github.com/huggingface/transformers.js/blob/main/src/utils/devices.js).

**Per-component device selection:**

For models with multiple components (encoder-decoder, vision-encoder-decoder, etc.):

```javascript
const pipe = await pipeline('automatic-speech-recognition', 'model-id', {
  device: {
    encoder: 'webgpu',    // Run encoder on GPU
    decoder: 'wasm'       // Run decoder on CPU
  }
});
```

**WebGPU Requirements:**
- Chrome/Edge 113+
- Enable chrome://flags/#enable-unsafe-webgpu (if needed)
- Adequate GPU memory



### Data Type (Quantization)

Control model precision and size:

```javascript
// Full precision (largest, most accurate)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'fp32'
});

// Half precision (balanced)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'fp16'
});

// 8-bit quantization (smaller, faster)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'q8'
});

// 4-bit quantization (smallest, fastest)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'q4'
});
```

**Common data types:**
- `'fp32'` - 32-bit floating point (full precision)
- `'fp16'` - 16-bit floating point (half precision)
- `'q8'` - 8-bit quantized (good balance)
- `'q4'` - 4-bit quantized (maximum compression)
- `'int8'` - 8-bit integer
- `'uint8'` - 8-bit unsigned integer

See the full list in the [dtypes.js source](https://github.com/huggingface/transformers.js/blob/main/src/utils/dtypes.js).

**Per-component data type:**

```javascript
const pipe = await pipeline('automatic-speech-recognition', 'model-id', {
  dtype: {
    encoder: 'fp32',  // Encoder at full precision
    decoder: 'q8'     // Decoder quantized
  }
});
```

**Trade-offs:**

| Data Type | Model Size | Speed | Accuracy | Use Case |
|-----------|-----------|-------|----------|----------|
| `fp32` | Largest | Slowest | Highest | Research, maximum quality |
| `fp16` | Medium | Medium | High | Production, GPU inference |
| `q8` | Small | Fast | Good | Production, CPU inference |
| `q4` | Smallest | Fastest | Acceptable | Edge devices, real-time apps |



### External Data Format

For models >= 2GB, ONNX uses external data format:

```javascript
// Automatically detect and load external data
const pipe = await pipeline('text-generation', 'large-model-id', {
  use_external_data_format: true
});

// Specify number of external data chunks
const pipe = await pipeline('text-generation', 'large-model-id', {
  use_external_data_format: 5  // Load 5 chunks (model.onnx_data_0 to _4)
});
```

**How it works:**
- Models >= 2GB split weights into separate files
- Main file: `model.onnx` (structure only)
- Data files: `model.onnx_data` or `model.onnx_data_0`, `model.onnx_data_1`, etc.

**Default behavior:**
- `false` - No external data (models < 2GB)
- `true` - Load external data automatically
- `number` - Load this many external data chunks

**Maximum chunks:** 100 (defined by `MAX_EXTERNAL_DATA_CHUNKS`)

**Per-component external data:**

```javascript
const pipe = await pipeline('text-generation', 'large-model-id', {
  use_external_data_format: {
    encoder: true,
    decoder: 3  // Decoder has 3 external data chunks
  }
});
```



### Session Options

Advanced ONNX Runtime configuration:

```javascript
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  session_options: {
    executionProviders: ['webgpu', 'wasm'],
    graphOptimizationLevel: 'all',
    enableCpuMemArena: true,
    enableMemPattern: true,
    executionMode: 'sequential',
    logSeverityLevel: 2,
    logVerbosityLevel: 0
  }
});
```

**Common session options:**

| Option | Description | Default |
|--------|-------------|---------|
| `executionProviders` | Ordered list of execution providers | `['wasm']` |
| `graphOptimizationLevel` | Graph optimization: `'disabled'`, `'basic'`, `'extended'`, `'all'` | `'all'` |
| `enableCpuMemArena` | Enable CPU memory arena for faster memory allocation | `true` |
| `enableMemPattern` | Enable memory pattern optimization | `true` |
| `executionMode` | `'sequential'` or `'parallel'` | `'sequential'` |
| `logSeverityLevel` | 0=Verbose, 1=Info, 2=Warning, 3=Error, 4=Fatal | `2` |
| `freeDimensionOverrides` | Override dynamic dimensions (e.g., `{ batch_size: 1 }`) | - |

**Use cases:**
- Fine-tune performance for specific hardware
- Debug model execution issues
- Override dynamic shapes
- Control memory usage



## Common Configuration Patterns

### Development

Fast iteration with progress tracking:

```javascript
import { pipeline } from '@huggingface/transformers';

const pipe = await pipeline('sentiment-analysis', null, {
  progress_callback: (info) => {
    if (info.status === 'progress') {
      console.log(`${info.file}: ${info.progress.toFixed(1)}%`);
    }
  }
});
```

### Production (GPU)

Use WebGPU with fp16 for better performance:

```javascript
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  device: 'webgpu',
  dtype: 'fp16'
});
```

### Production (CPU)

Use quantization for smaller size and faster CPU inference:

```javascript
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'q8'  // or 'q4' for even smaller
});
```

### Offline/Local

Prevent network requests, use only local models:

```javascript
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = true;
env.localModelPath = './models/';

const pipe = await pipeline('sentiment-analysis', 'model-id', {
  local_files_only: true
});
```

### Per-Component Settings

For encoder-decoder models, configure each component separately:

```javascript
const pipe = await pipeline('automatic-speech-recognition', 'model-id', {
  device: {
    encoder: 'webgpu',
    decoder: 'wasm'
  },
  dtype: {
    encoder: 'fp16',
    decoder: 'q8'
  }
});
```

## Related Documentation

- [Configuration Reference](./CONFIGURATION.md) - Environment configuration with `env` object
- [Text Generation Guide](./TEXT_GENERATION.md) - Text generation options and streaming
- [Model Architectures](./MODEL_ARCHITECTURES.md) - Supported models and selection tips
- [Main Skill Guide](../SKILL.md) - Getting started with Transformers.js

## Best Practices

1. **Progress Callbacks**: Use `progress_callback` for large models to show download progress
2. **Quantization**: Use `q8` or `q4` for CPU inference to reduce size and improve speed
3. **Device Selection**: Use `webgpu` for better performance when available
4. **Offline-First**: Use `local_files_only: true` in production to avoid runtime downloads
5. **Version Pinning**: Use `revision` to pin model versions for reproducible deployments
6. **Memory Management**: Always dispose pipelines with `pipe.dispose()` when done

---

This document covers all available options for the `pipeline()` function. For environment-level configuration (remote hosts, global cache settings, WASM paths), see the [Configuration Reference](./CONFIGURATION.md).
