# Environment Configuration Reference

Complete guide to configuring Transformers.js behavior using the `env` object.

## Table of Contents

1. [Overview](#overview)
2. [Remote Model Configuration](#remote-model-configuration)
3. [Local Model Configuration](#local-model-configuration)
4. [Cache Configuration](#cache-configuration)
5. [WASM Configuration](#wasm-configuration)
6. [Common Configuration Patterns](#common-configuration-patterns)
7. [Environment Best Practices](#environment-best-practices)

## Overview

The `env` object provides comprehensive control over Transformers.js execution, caching, and model loading:

```javascript
import { env } from '@huggingface/transformers';

// View current version
console.log(env.version); // e.g., '3.8.1'
```

### Available Properties

```typescript
interface TransformersEnvironment {
  // Version info
  version: string;
  
  // Backend configuration
  backends: {
    onnx: Partial<ONNXEnv>;
  };
  
  // Remote model settings
  allowRemoteModels: boolean;
  remoteHost: string;
  remotePathTemplate: string;
  
  // Local model settings
  allowLocalModels: boolean;
  localModelPath: string;
  useFS: boolean;
  
  // Cache settings
  useBrowserCache: boolean;
  useFSCache: boolean;
  cacheDir: string | null;
  useCustomCache: boolean;
  customCache: CacheInterface | null;
  useWasmCache: boolean;
  cacheKey: string;
}
```

## Remote Model Configuration

Control how models are loaded from remote sources (default: Hugging Face Hub).

### Disable Remote Loading

```javascript
import { env } from '@huggingface/transformers';

// Force local-only mode (no network requests)
env.allowRemoteModels = false;
```

**Use case:** Offline applications, security requirements, or air-gapped environments.

### Custom Model Host

```javascript
import { env } from '@huggingface/transformers';

// Use your own CDN or model server
env.remoteHost = 'https://cdn.example.com/models';

// Customize the URL pattern
// Default: '{model}/resolve/{revision}/{file}'
env.remotePathTemplate = 'custom/{model}/{file}';
```

**Use case:** Self-hosting models, using a CDN for faster downloads, or corporate proxies.

### Example: Private Model Server

```javascript
import { env, pipeline } from '@huggingface/transformers';

// Configure custom model host
env.remoteHost = 'https://models.mycompany.com';
env.remotePathTemplate = '{model}/{file}';

// Models will be loaded from:
// https://models.mycompany.com/my-model/model.onnx
const pipe = await pipeline('sentiment-analysis', 'my-model');
```

## Local Model Configuration

Control loading models from the local file system.

### Enable Local Models

```javascript
import { env } from '@huggingface/transformers';

// Enable local file system loading
env.allowLocalModels = true;

// Set the base path for local models
env.localModelPath = '/path/to/models/';
```

**Default values:**
- Browser: `allowLocalModels = false`, `localModelPath = '/models/'`
- Node.js: `allowLocalModels = true`, `localModelPath = '/models/'`

### File System Control

```javascript
import { env } from '@huggingface/transformers';

// Disable file system usage entirely (Node.js only)
env.useFS = false;
```

### Example: Local Model Directory Structure

```
/app/models/
├── onnx-community/
│   ├── Supertonic-TTS-ONNX/
│   │   ├── config.json
│   │   ├── tokenizer.json
│   │   ├── model.onnx
│   │   └── ...
│   └── yolo26l-pose-ONNX/
│       ├── config.json
│       ├── preprocessor_config.json
│       ├── model.onnx
│       └── ...
```

```javascript
env.allowLocalModels = true;
env.localModelPath = '/app/models/';
env.allowRemoteModels = false; // Offline mode

const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
```

## Cache Configuration

Transformers.js supports multiple caching strategies to improve performance and reduce network usage.

### Quick Configuration

```javascript
import { env } from '@huggingface/transformers';

// Browser cache (Cache API)
env.useBrowserCache = true; // default: true
env.cacheKey = 'my-app-transformers-cache'; // default: 'transformers-cache'

// Node.js filesystem cache
env.useFSCache = true; // default: true
env.cacheDir = './custom-cache-dir'; // default: './.cache'

// Custom cache implementation
env.useCustomCache = true;
env.customCache = new CustomCache(); // Implement Cache API interface

// WASM binary caching
env.useWasmCache = true; // default: true
```

### Disable Caching

```javascript
import { env } from '@huggingface/transformers';

// Disable all caching (re-download on every load)
env.useFSCache = false;
env.useBrowserCache = false;
env.useWasmCache = false;
env.cacheDir = null;
```

For comprehensive caching documentation including:
- Browser Cache API details and storage limits
- Node.js filesystem cache structure and management
- Custom cache implementations (Redis, database, S3)
- Cache clearing and monitoring strategies
- Best practices and troubleshooting

See **[Caching Reference](./CACHE.md)**

## WASM Configuration

Configure ONNX Runtime Web Assembly backend settings.

### Basic WASM Settings

```javascript
import { env } from '@huggingface/transformers';

// Set custom WASM paths
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

// Configure number of threads (Node.js only)
env.backends.onnx.wasm.numThreads = 4;

// Enable/disable SIMD (single instruction, multiple data)
env.backends.onnx.wasm.simd = true;
```

### Proxy Configuration

```javascript
import { env } from '@huggingface/transformers';

// Configure proxy for WASM downloads
env.backends.onnx.wasm.proxy = true;
```

### Self-Hosted WASM Files

```javascript
import { env } from '@huggingface/transformers';

// Host WASM files on your own server
env.backends.onnx.wasm.wasmPaths = '/static/wasm/';
```

**Required files:**
- `ort-wasm.wasm` - Main WASM binary
- `ort-wasm-simd.wasm` - SIMD-enabled WASM binary
- `ort-wasm-threaded.wasm` - Multi-threaded WASM binary
- `ort-wasm-simd-threaded.wasm` - SIMD + multi-threaded WASM binary

## Common Configuration Patterns

### Development Setup

```javascript
import { env } from '@huggingface/transformers';

// Fast iteration with caching
env.allowRemoteModels = true;
env.useBrowserCache = true; // Browser
env.useFSCache = true;      // Node.js
env.cacheDir = './.cache';
```

### Production (Local Models)

```javascript
import { env } from '@huggingface/transformers';

// Secure, offline-capable setup
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/app/models/';
env.useFSCache = false; // Models already local
```

### Offline-First Application

```javascript
import { env } from '@huggingface/transformers';

// Try local first, fall back to remote
env.allowLocalModels = true;
env.localModelPath = './models/';
env.allowRemoteModels = true;
env.useFSCache = true;
env.cacheDir = './cache';
```

### Custom CDN

```javascript
import { env } from '@huggingface/transformers';

// Use your own model hosting
env.remoteHost = 'https://cdn.example.com/ml-models';
env.remotePathTemplate = '{model}/{file}';
env.useBrowserCache = true;
```

### Memory-Constrained Environment

```javascript
import { env } from '@huggingface/transformers';

// Minimize disk/memory usage
env.useFSCache = false;
env.useBrowserCache = false;
env.useWasmCache = false;
env.cacheDir = null;
```

### Testing/CI Environment

```javascript
import { env } from '@huggingface/transformers';

// Predictable, isolated testing
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = './test-fixtures/models/';
env.useFSCache = false;
```



## Environment Best Practices

### 1. Configure Early

Set `env` properties before loading any models:

```javascript
import { env, pipeline } from '@huggingface/transformers';

// ✓ Good: Configure before loading
env.allowRemoteModels = false;
env.localModelPath = '/app/models/';
const pipe = await pipeline('sentiment-analysis');

// ✗ Bad: Configuring after loading may not take effect
const pipe = await pipeline('sentiment-analysis');
env.allowRemoteModels = false; // Too late!
```

### 2. Use Environment Variables

```javascript
import { env } from '@huggingface/transformers';

// Configure based on environment
env.allowRemoteModels = process.env.NODE_ENV === 'development';
env.cacheDir = process.env.MODEL_CACHE_DIR || './.cache';
env.localModelPath = process.env.LOCAL_MODELS_PATH || '/app/models/';
```

### 3. Handle Errors Gracefully

```javascript
import { pipeline, env } from '@huggingface/transformers';

try {
  env.allowRemoteModels = false;
  const pipe = await pipeline('sentiment-analysis', 'my-model');
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Model not found locally. Enable remote models or download the model.');
  }
  throw error;
}
```

### 4. Log Configuration

```javascript
import { env } from '@huggingface/transformers';

console.log('Transformers.js Configuration:', {
  version: env.version,
  allowRemoteModels: env.allowRemoteModels,
  allowLocalModels: env.allowLocalModels,
  localModelPath: env.localModelPath,
  cacheDir: env.cacheDir,
  useFSCache: env.useFSCache,
  useBrowserCache: env.useBrowserCache
});
```

## Related Documentation

- **[Caching Reference](./CACHE.md)** - Comprehensive caching guide (browser, Node.js, custom implementations)
- [Pipeline Options](./PIPELINE_OPTIONS.md) - Configure pipeline loading with `progress_callback`, `device`, `dtype`, etc.
- [Model Architectures](./MODEL_ARCHITECTURES.md) - Supported models and architectures
- [Examples](./EXAMPLES.md) - Code examples for different runtimes
- [Main Skill Guide](../SKILL.md) - Getting started and common usage
