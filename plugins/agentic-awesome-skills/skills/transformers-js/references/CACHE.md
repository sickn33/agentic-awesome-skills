# Caching Reference

Complete guide to caching strategies for Transformers.js models across different environments.

## Table of Contents

1. [Overview](#overview)
2. [Browser Caching](#browser-caching)
3. [Node.js Caching](#nodejs-caching)
4. [Custom Cache Implementation](#custom-cache-implementation)
5. [Cache Configuration](#cache-configuration)

## Overview

Transformers.js models can be large (from a few MB to several GB), so caching is critical for performance. The caching strategy differs based on the environment:

- **Browser**: Uses the Cache API (browser cache storage)
- **Node.js**: Uses filesystem cache in `~/.cache/huggingface/`
- **Custom**: Implement your own cache (database, cloud storage, etc.)

### Default Behavior

```javascript
import { pipeline } from '@huggingface/transformers';

// First load: downloads model
const pipe = await pipeline('sentiment-analysis');

// Subsequent loads: uses cached model
const pipe2 = await pipeline('sentiment-analysis'); // Fast!
```

Caching is **automatic** and enabled by default. Models are cached after the first download.

## Browser Caching

### Using the Cache API

In browser environments, Transformers.js uses the [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) to store models:

```javascript
import { env, pipeline } from '@huggingface/transformers';

// Browser cache is enabled by default
console.log(env.useBrowserCache); // true

// Load model (cached automatically)
const classifier = await pipeline('sentiment-analysis');
```

**How it works:**

1. Model files are downloaded from Hugging Face Hub
2. Files are stored in the browser's Cache Storage
3. Subsequent loads retrieve from cache (no network request)
4. Cache persists across page reloads and browser sessions

### Cache Location

Browser caches are stored in:
- **Chrome/Edge**: `Cache Storage` in DevTools → Application tab → Cache storage
- **Firefox**: `about:cache` → Storage
- **Safari**: Web Inspector → Storage tab

### Disable Browser Cache

```javascript
import { env } from '@huggingface/transformers';

// Disable browser caching (not recommended)
env.useBrowserCache = false;

// Models will be re-downloaded on every page load
```

**Use case:** Testing, development, or debugging cache issues.

### Browser Storage Limits

Browsers impose storage quotas:

- **Chrome**: ~60% of available disk space (but can evict data)
- **Firefox**: ~50% of available disk space
- **Safari**: ~1GB per origin (prompt for more)

**Tip:** Monitor storage usage with the [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API):

```javascript
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  const percentUsed = (estimate.usage / estimate.quota) * 100;
  console.log(`Storage: ${percentUsed.toFixed(2)}% used`);
  console.log(`Available: ${((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(2)} MB`);
}
```

## Node.js Caching

### Filesystem Cache

In Node.js, models are cached to the filesystem:

```javascript
import { env, pipeline } from '@huggingface/transformers';

// Default cache directory (Node.js)
console.log(env.cacheDir); // './.cache' (relative to current directory)

// Filesystem cache is enabled by default
console.log(env.useFSCache); // true

// Load model (cached to disk)
const classifier = await pipeline('sentiment-analysis');
```

### Default Cache Location

**Default behavior:**
- Cache directory: `./.cache` (relative to where Node.js process runs)
- Full default path: `~/.cache/huggingface/` when using Hugging Face tools

**Note:** The statement "Models are cached automatically in `~/.cache/huggingface/`" from performance tips is specific to Hugging Face's Python tooling convention. In Transformers.js for Node.js, the default is `./.cache` unless configured otherwise.

### Custom Cache Directory

```javascript
import { env, pipeline } from '@huggingface/transformers';

// Set custom cache directory
env.cacheDir = '/var/cache/transformers';

// Or use environment variable (Node.js convention)
env.cacheDir = process.env.HF_HOME || '~/.cache/huggingface';

// Now load model
const classifier = await pipeline('sentiment-analysis');
// Cached to: /var/cache/transformers/models--Xenova--distilbert-base-uncased-finetuned-sst-2-english/
```

**Pattern:** `models--{organization}--{model-name}/`

### Disable Filesystem Cache

```javascript
import { env } from '@huggingface/transformers';

// Disable filesystem caching (not recommended)
env.useFSCache = false;

// Models will be re-downloaded on every load
```

**Use case:** Testing, CI/CD environments, or containers with ephemeral storage.

## Custom Cache Implementation

Implement your own cache for specialized storage backends.

### Custom Cache Interface

```typescript
interface CacheInterface {
  /**
   * Check if a URL is cached
   */
  match(url: string): Promise<Response | undefined>;
  
  /**
   * Store a URL and its response
   */
  put(url: string, response: Response): Promise<void>;
}
```

### Example: Cloud Storage Cache (S3)

```javascript
import { env, pipeline } from '@huggingface/transformers';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

class S3Cache {
  constructor(bucket, region = 'us-east-1') {
    this.bucket = bucket;
    this.s3 = new S3Client({ region });
  }

  async match(url) {
    const key = this.urlToKey(url);
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      const response = await this.s3.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      
      return new Response(body, {
        status: 200,
        headers: JSON.parse(response.Metadata.headers || '{}')
      });
    } catch (error) {
      if (error.name === 'NoSuchKey') return undefined;
      throw error;
    }
  }

  async put(url, response) {
    const key = this.urlToKey(url);
    const clonedResponse = response.clone();
    const body = Buffer.from(await clonedResponse.arrayBuffer());
    const headers = JSON.stringify(Object.fromEntries(response.headers.entries()));

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      Metadata: { headers }
    });
    
    await this.s3.send(command);
  }

  urlToKey(url) {
    // Convert URL to S3 key (remove protocol, replace slashes)
    return url.replace(/^https?:\/\//, '').replace(/\//g, '_');
  }
}

// Configure S3 cache
env.useCustomCache = true;
env.customCache = new S3Cache('my-transformers-cache', 'us-east-1');
env.useFSCache = false;

// Use S3 cache
const classifier = await pipeline('sentiment-analysis');
```

## Cache Configuration

### Environment Variables

Use environment variables to configure caching:

```javascript
import { env } from '@huggingface/transformers';

// Configure cache directory from environment
env.cacheDir = process.env.TRANSFORMERS_CACHE || './.cache';

// Disable caching in CI/CD
if (process.env.CI === 'true') {
  env.useFSCache = false;
  env.useBrowserCache = false;
}

// Production: use pre-cached models
if (process.env.NODE_ENV === 'production') {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = process.env.MODEL_PATH || '/app/models';
}
```

### Configuration Patterns

#### Development: Enable All Caching

```javascript
import { env } from '@huggingface/transformers';

env.allowRemoteModels = true;
env.useFSCache = true;         // Node.js
env.useBrowserCache = true;    // Browser
env.cacheDir = './.cache';
```

#### Production: Local Models Only

```javascript
import { env } from '@huggingface/transformers';

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/app/models';
env.useFSCache = true;
```

#### Testing: Disable Caching

```javascript
import { env } from '@huggingface/transformers';

env.useFSCache = false;
env.useBrowserCache = false;
env.allowRemoteModels = true; // Download every time
```

#### Hybrid: Cache + Remote Fallback

```javascript
import { env } from '@huggingface/transformers';

// Try local cache first, fall back to remote
env.allowRemoteModels = true;
env.allowLocalModels = true;
env.useFSCache = true;
env.localModelPath = './models';
```

---

## Summary

Transformers.js provides flexible caching options:

- **Browser**: Cache API (automatic, persistent)
- **Node.js**: Filesystem cache (default `./.cache`, configurable)
- **Custom**: Implement your own (database, cloud storage, etc.)

**Key takeaways:**

1. Caching is enabled by default and automatic
2. Configure cache **before** loading models
3. Browser uses Cache API, Node.js uses filesystem
4. Custom caches enable advanced storage backends
5. Monitor cache size and implement cleanup strategies
6. Pre-download models for production deployments

For more configuration options, see:
- [Configuration Reference](./CONFIGURATION.md)
- [Pipeline Options](./PIPELINE_OPTIONS.md)
