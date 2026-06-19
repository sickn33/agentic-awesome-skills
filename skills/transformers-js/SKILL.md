---
source: "https://github.com/huggingface/skills/tree/main/skills/transformers-js"
name: transformers-js
description: Run Hugging Face models in JavaScript or TypeScript with Transformers.js in Node.js or the browser.
license: Apache-2.0
risk: unknown
metadata:
  author: huggingface
  version: "3.8.1"
  category: machine-learning
  repository: https://github.com/huggingface/transformers.js
compatibility: Requires Node.js 18+ or modern browser with ES modules support. WebGPU support requires compatible browser/environment. Internet access needed for downloading models from Hugging Face Hub (optional if using local models).
---

# Transformers.js - Machine Learning for JavaScript

Transformers.js enables running state-of-the-art machine learning models directly in JavaScript, both in browsers and Node.js environments, with no server required.

## When to Use This Skill

Use this skill when you need to:
- Run ML models for text analysis, generation, or translation in JavaScript
- Perform image classification, object detection, or segmentation
- Implement speech recognition or audio processing
- Build multimodal AI applications (text-to-image, image-to-text, etc.)
- Run models client-side in the browser without a backend

## Installation

### NPM Installation
```bash
npm install @huggingface/transformers
```

### Browser Usage (CDN)
```javascript
<script type="module">
  import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';
</script>
```

## Core Concepts

### 1. Pipeline API
The pipeline API is the easiest way to use models. It groups together preprocessing, model inference, and postprocessing:

```javascript
import { pipeline } from '@huggingface/transformers';

// Create a pipeline for a specific task
const pipe = await pipeline('sentiment-analysis');

// Use the pipeline
const result = await pipe('I love transformers!');
// Output: [{ label: 'POSITIVE', score: 0.999817686 }]

// IMPORTANT: Always dispose when done to free memory
await classifier.dispose();
```

**⚠️ Memory Management:** All pipelines must be disposed with `pipe.dispose()` when finished to prevent memory leaks. See examples in [Code Examples](./references/EXAMPLES.md) for cleanup patterns across different environments.

### 2. Model Selection
You can specify a custom model as the second argument:

```javascript
const pipe = await pipeline(
  'sentiment-analysis',
  'Xenova/bert-base-multilingual-uncased-sentiment'
);
```

**Finding Models:**

Browse available Transformers.js models on Hugging Face Hub:
- **All models**: https://huggingface.co/models?library=transformers.js&sort=trending
- **By task**: Add `pipeline_tag` parameter
  - Text generation: https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js&sort=trending
  - Image classification: https://huggingface.co/models?pipeline_tag=image-classification&library=transformers.js&sort=trending
  - Speech recognition: https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=transformers.js&sort=trending

**Tip:** Filter by task type, sort by trending/downloads, and check model cards for performance metrics and usage examples.

### 3. Device Selection
Choose where to run the model:

```javascript
// Run on CPU (default for WASM)
const pipe = await pipeline('sentiment-analysis', 'model-id');

// Run on GPU (WebGPU - experimental)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  device: 'webgpu',
});
```

### 4. Quantization Options
Control model precision vs. performance:

```javascript
// Use quantized model (faster, smaller)
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'q4',  // Options: 'fp32', 'fp16', 'q8', 'q4'
});
```

## Supported Tasks

**Note:** All examples below show basic usage.

### Natural Language Processing

#### Text Classification
```javascript
const classifier = await pipeline('text-classification');
const result = await classifier('This movie was amazing!');
```

#### Named Entity Recognition (NER)
```javascript
const ner = await pipeline('token-classification');
const entities = await ner('My name is John and I live in New York.');
```

#### Question Answering
```javascript
const qa = await pipeline('question-answering');
const answer = await qa({
  question: 'What is the capital of France?',
  context: 'Paris is the capital and largest city of France.'
});
```

#### Text Generation
```javascript
const generator = await pipeline('text-generation', 'onnx-community/gemma-3-270m-it-ONNX');
const text = await generator('Once upon a time', {
  max_new_tokens: 100,
  temperature: 0.7
});
```

**For streaming and chat:** See **[Text Generation Guide](./references/TEXT_GENERATION.md)** for:
- Streaming token-by-token output with `TextStreamer`
- Chat/conversation format with system/user/assistant roles
- Generation parameters (temperature, top_k, top_p)
- Browser and Node.js examples
- React components and API endpoints

#### Translation
```javascript
const translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M');
const output = await translator('Hello, how are you?', {
  src_lang: 'eng_Latn',
  tgt_lang: 'fra_Latn'
});
```

#### Summarization
```javascript
const summarizer = await pipeline('summarization');
const summary = await summarizer(longText, {
  max_length: 100,
  min_length: 30
});
```

#### Zero-Shot Classification
```javascript
const classifier = await pipeline('zero-shot-classification');
const result = await classifier('This is a story about sports.', ['politics', 'sports', 'technology']);
```

### Computer Vision

#### Image Classification
```javascript
const classifier = await pipeline('image-classification');
const result = await classifier('https://example.com/image.jpg');
// Or with local file
const result = await classifier(imageUrl);
```

#### Object Detection
```javascript
const detector = await pipeline('object-detection');
const objects = await detector('https://example.com/image.jpg');
// Returns: [{ label: 'person', score: 0.95, box: { xmin, ymin, xmax, ymax } }, ...]
```

#### Image Segmentation
```javascript
const segmenter = await pipeline('image-segmentation');
const segments = await segmenter('https://example.com/image.jpg');
```

#### Depth Estimation
```javascript
const depthEstimator = await pipeline('depth-estimation');
const depth = await depthEstimator('https://example.com/image.jpg');
```

#### Zero-Shot Image Classification
```javascript
const classifier = await pipeline('zero-shot-image-classification');
const result = await classifier('image.jpg', ['cat', 'dog', 'bird']);
```

### Audio Processing

#### Automatic Speech Recognition
```javascript
const transcriber = await pipeline('automatic-speech-recognition');
const result = await transcriber('audio.wav');
// Returns: { text: 'transcribed text here' }
```

#### Audio Classification
```javascript
const classifier = await pipeline('audio-classification');
const result = await classifier('audio.wav');
```

#### Text-to-Speech
```javascript
const synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts');
const audio = await synthesizer('Hello, this is a test.', {
  speaker_embeddings: speakerEmbeddings
});
```

### Multimodal

#### Image-to-Text (Image Captioning)
```javascript
const captioner = await pipeline('image-to-text');
const caption = await captioner('image.jpg');
```

#### Document Question Answering
```javascript
const docQA = await pipeline('document-question-answering');
const answer = await docQA('document-image.jpg', 'What is the total amount?');
```

#### Zero-Shot Object Detection
```javascript
const detector = await pipeline('zero-shot-object-detection');
const objects = await detector('image.jpg', ['person', 'car', 'tree']);
```

### Feature Extraction (Embeddings)

```javascript
const extractor = await pipeline('feature-extraction');
const embeddings = await extractor('This is a sentence to embed.');
// Returns: tensor of shape [1, sequence_length, hidden_size]

// For sentence embeddings (mean pooling)
const extractor = await pipeline('feature-extraction', 'onnx-community/all-MiniLM-L6-v2-ONNX');
const embeddings = await extractor('Text to embed', { pooling: 'mean', normalize: true });
```

## Finding and Choosing Models

### Browsing the Hugging Face Hub

Discover compatible Transformers.js models on Hugging Face Hub:

**Base URL (all models):**
```
https://huggingface.co/models?library=transformers.js&sort=trending
```

**Filter by task** using the `pipeline_tag` parameter:

| Task | URL |
|------|-----|
| **Text Generation** | https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js&sort=trending |
| **Text Classification** | https://huggingface.co/models?pipeline_tag=text-classification&library=transformers.js&sort=trending |
| **Translation** | https://huggingface.co/models?pipeline_tag=translation&library=transformers.js&sort=trending |
| **Summarization** | https://huggingface.co/models?pipeline_tag=summarization&library=transformers.js&sort=trending |
| **Question Answering** | https://huggingface.co/models?pipeline_tag=question-answering&library=transformers.js&sort=trending |
| **Image Classification** | https://huggingface.co/models?pipeline_tag=image-classification&library=transformers.js&sort=trending |
| **Object Detection** | https://huggingface.co/models?pipeline_tag=object-detection&library=transformers.js&sort=trending |
| **Image Segmentation** | https://huggingface.co/models?pipeline_tag=image-segmentation&library=transformers.js&sort=trending |
| **Speech Recognition** | https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=transformers.js&sort=trending |
| **Audio Classification** | https://huggingface.co/models?pipeline_tag=audio-classification&library=transformers.js&sort=trending |
| **Image-to-Text** | https://huggingface.co/models?pipeline_tag=image-to-text&library=transformers.js&sort=trending |
| **Feature Extraction** | https://huggingface.co/models?pipeline_tag=feature-extraction&library=transformers.js&sort=trending |
| **Zero-Shot Classification** | https://huggingface.co/models?pipeline_tag=zero-shot-classification&library=transformers.js&sort=trending |

**Sort options:**
- `&sort=trending` - Most popular recently
- `&sort=downloads` - Most downloaded overall
- `&sort=likes` - Most liked by community
- `&sort=modified` - Recently updated

### Choosing the Right Model

Consider these factors when selecting a model:

**1. Model Size**
- **Small (< 100MB)**: Fast, suitable for browsers, limited accuracy
- **Medium (100MB - 500MB)**: Balanced performance, good for most use cases
- **Large (> 500MB)**: High accuracy, slower, better for Node.js or powerful devices

**2. Quantization**
Models are often available in different quantization levels:
- `fp32` - Full precision (largest, most accurate)
- `fp16` - Half precision (smaller, still accurate)
- `q8` - 8-bit quantized (much smaller, slight accuracy loss)
- `q4` - 4-bit quantized (smallest, noticeable accuracy loss)

**3. Task Compatibility**
Check the model card for:
- Supported tasks (some models support multiple tasks)
- Input/output formats
- Language support (multilingual vs. English-only)
- License restrictions

**4. Performance Metrics**
Model cards typically show:
- Accuracy scores
- Benchmark results
- Inference speed
- Memory requirements

### Example: Finding a Text Generation Model

```javascript
// 1. Visit: https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js&sort=trending

// 2. Browse and select a model (e.g., onnx-community/gemma-3-270m-it-ONNX)

// 3. Check model card for:
//    - Model size: ~270M parameters
//    - Quantization: q4 available
//    - Language: English
//    - Use case: Instruction-following chat

// 4. Use the model:
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline(
  'text-generation',
  'onnx-community/gemma-3-270m-it-ONNX',
  { dtype: 'q4' } // Use quantized version for faster inference
);

const output = await generator('Explain quantum computing in simple terms.', {
  max_new_tokens: 100
});

await generator.dispose();
```

### Tips for Model Selection

1. **Start Small**: Test with a smaller model first, then upgrade if needed
2. **Check ONNX Support**: Ensure the model has ONNX files (look for `onnx` folder in model repo)
3. **Read Model Cards**: Model cards contain usage examples, limitations, and benchmarks
4. **Test Locally**: Benchmark inference speed and memory usage in your environment
5. **Community Models**: Look for models by `Xenova` (Transformers.js maintainer) or `onnx-community`
6. **Version Pin**: Use specific git commits in production for stability:
   ```javascript
   const pipe = await pipeline('task', 'model-id', { revision: 'abc123' });
   ```

## Advanced Configuration

### Environment Configuration (`env`)

The `env` object provides comprehensive control over Transformers.js execution, caching, and model loading.

**Quick Overview:**

```javascript
import { env } from '@huggingface/transformers';

// View version
console.log(env.version); // e.g., '3.8.1'

// Common settings
env.allowRemoteModels = true;  // Load from Hugging Face Hub
env.allowLocalModels = false;  // Load from file system
env.localModelPath = '/models/'; // Local model directory
env.useFSCache = true;         // Cache models on disk (Node.js)
env.useBrowserCache = true;    // Cache models in browser
env.cacheDir = './.cache';     // Cache directory location
```

**Configuration Patterns:**

```javascript
// Development: Fast iteration with remote models
env.allowRemoteModels = true;
env.useFSCache = true;

// Production: Local models only
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/app/models/';

// Custom CDN
env.remoteHost = 'https://cdn.example.com/models';

// Disable caching (testing)
env.useFSCache = false;
env.useBrowserCache = false;
```

For complete documentation on all configuration options, caching strategies, cache management, pre-downloading models, and more, see:

**→ [Configuration Reference](./references/CONFIGURATION.md)**

### Working with Tensors

```javascript
import { AutoTokenizer, AutoModel } from '@huggingface/transformers';

// Load tokenizer and model separately for more control
const tokenizer = await AutoTokenizer.from_pretrained('bert-base-uncased');
const model = await AutoModel.from_pretrained('bert-base-uncased');

// Tokenize input
const inputs = await tokenizer('Hello world!');

// Run model
const outputs = await model(inputs);
```

### Batch Processing

```javascript
const classifier = await pipeline('sentiment-analysis');

// Process multiple texts
const results = await classifier([
  'I love this!',
  'This is terrible.',
  'It was okay.'
]);
```

## Browser-Specific Considerations

### WebGPU Usage
WebGPU provides GPU acceleration in browsers:

```javascript
const pipe = await pipeline('text-generation', 'onnx-community/gemma-3-270m-it-ONNX', {
  device: 'webgpu',
  dtype: 'fp32'
});
```

**Note**: WebGPU is experimental. Check browser compatibility and file issues if problems occur.

### WASM Performance
Default browser execution uses WASM:

```javascript
// Optimized for browsers with quantization
const pipe = await pipeline('sentiment-analysis', 'model-id', {
  dtype: 'q8'  // or 'q4' for even smaller size
});
```

### Progress Tracking & Loading Indicators

Models can be large (ranging from a few MB to several GB) and consist of multiple files. Track download progress by passing a callback to the `pipeline()` function:

```javascript
import { pipeline } from '@huggingface/transformers';

// Track progress for each file
const fileProgress = {};

function onProgress(info) {
  console.log(`${info.status}: ${info.file}`);
  
  if (info.status === 'progress') {
    fileProgress[info.file] = info.progress;
    console.log(`${info.file}: ${info.progress.toFixed(1)}%`);
  }
  
  if (info.status === 'done') {
    console.log(`✓ ${info.file} complete`);
  }
}

// Pass callback to pipeline
const classifier = await pipeline('sentiment-analysis', null, {
  progress_callback: onProgress
});
```

**Progress Info Properties:**

```typescript
interface ProgressInfo {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  name: string;      // Model id or path
  file: string;      // File being processed
  progress?: number; // Percentage (0-100, only for 'progress' status)
  loaded?: number;   // Bytes downloaded (only for 'progress' status)
  total?: number;    // Total bytes (only for 'progress' status)
}
```

For complete examples including browser UIs, React components, CLI progress bars, and retry logic, see:

**→ [Pipeline Options - Progress Callback](./references/PIPELINE_OPTIONS.md#progress-callback)**

## Error Handling

```javascript
try {
  const pipe = await pipeline('sentiment-analysis', 'model-id');
  const result = await pipe('text to analyze');
} catch (error) {
  if (error.message.includes('fetch')) {
    console.error('Model download failed. Check internet connection.');
  } else if (error.message.includes('ONNX')) {
    console.error('Model execution failed. Check model compatibility.');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Performance Tips

1. **Reuse Pipelines**: Create pipeline once, reuse for multiple inferences
2. **Use Quantization**: Start with `q8` or `q4` for faster inference
3. **Batch Processing**: Process multiple inputs together when possible
4. **Cache Models**: Models are cached automatically (see **[Caching Reference](./references/CACHE.md)** for details on browser Cache API, Node.js filesystem cache, and custom implementations)
5. **WebGPU for Large Models**: Use WebGPU for models that benefit from GPU acceleration
6. **Prune Context**: For text generation, limit `max_new_tokens` to avoid memory issues
7. **Clean Up Resources**: Call `pipe.dispose()` when done to free memory

## Memory Management

**IMPORTANT:** Always call `pipe.dispose()` when finished to prevent memory leaks.

```javascript
const pipe = await pipeline('sentiment-analysis');
const result = await pipe('Great product!');
await pipe.dispose();  // ✓ Free memory (100MB - several GB per model)
```

**When to dispose:**
- Application shutdown or component unmount
- Before loading a different model
- After batch processing in long-running apps

Models consume significant memory and hold GPU/CPU resources. Disposal is critical for browser memory limits and server stability.

For detailed patterns (React cleanup, servers, browser), see **[Code Examples](./references/EXAMPLES.md)**

## Troubleshooting

### Model Not Found
- Verify model exists on Hugging Face Hub
- Check model name spelling
- Ensure model has ONNX files (look for `onnx` folder in model repo)

### Memory Issues
- Use smaller models or quantized versions (`dtype: 'q4'`)
- Reduce batch size
- Limit sequence length with `max_length`

### WebGPU Errors
- Check browser compatibility (Chrome 113+, Edge 113+)
- Try `dtype: 'fp16'` if `fp32` fails
- Fall back to WASM if WebGPU unavailable

## Reference Documentation

### This Skill
- **[Pipeline Options](./references/PIPELINE_OPTIONS.md)** - Configure `pipeline()` with `progress_callback`, `device`, `dtype`, etc.
- **[Configuration Reference](./references/CONFIGURATION.md)** - Global `env` configuration for caching and model loading
- **[Caching Reference](./references/CACHE.md)** - Browser Cache API, Node.js filesystem cache, and custom cache implementations
- **[Text Generation Guide](./references/TEXT_GENERATION.md)** - Streaming, chat format, and generation parameters
- **[Model Architectures](./references/MODEL_ARCHITECTURES.md)** - Supported models and selection tips
- **[Code Examples](./references/EXAMPLES.md)** - Real-world implementations for different runtimes

### Official Transformers.js
- Official docs: https://huggingface.co/docs/transformers.js
- API reference: https://huggingface.co/docs/transformers.js/api/pipelines
- Model hub: https://huggingface.co/models?library=transformers.js
- GitHub: https://github.com/huggingface/transformers.js
- Examples: https://github.com/huggingface/transformers.js/tree/main/examples

## Best Practices

1. **Always Dispose Pipelines**: Call `pipe.dispose()` when done - critical for preventing memory leaks
2. **Start with Pipelines**: Use the pipeline API unless you need fine-grained control
3. **Test Locally First**: Test models with small inputs before deploying
4. **Monitor Model Sizes**: Be aware of model download sizes for web applications
5. **Handle Loading States**: Show progress indicators for better UX
6. **Version Pin**: Pin specific model versions for production stability
7. **Error Boundaries**: Always wrap pipeline calls in try-catch blocks
8. **Progressive Enhancement**: Provide fallbacks for unsupported browsers
9. **Reuse Models**: Load once, use many times - don't recreate pipelines unnecessarily
10. **Graceful Shutdown**: Dispose models on SIGTERM/SIGINT in servers

## Quick Reference: Task IDs

| Task | Task ID |
|------|---------|
| Text classification | `text-classification` or `sentiment-analysis` |
| Token classification | `token-classification` or `ner` |
| Question answering | `question-answering` |
| Fill mask | `fill-mask` |
| Summarization | `summarization` |
| Translation | `translation` |
| Text generation | `text-generation` |
| Text-to-text generation | `text2text-generation` |
| Zero-shot classification | `zero-shot-classification` |
| Image classification | `image-classification` |
| Image segmentation | `image-segmentation` |
| Object detection | `object-detection` |
| Depth estimation | `depth-estimation` |
| Image-to-image | `image-to-image` |
| Zero-shot image classification | `zero-shot-image-classification` |
| Zero-shot object detection | `zero-shot-object-detection` |
| Automatic speech recognition | `automatic-speech-recognition` |
| Audio classification | `audio-classification` |
| Text-to-speech | `text-to-speech` or `text-to-audio` |
| Image-to-text | `image-to-text` |
| Document question answering | `document-question-answering` |
| Feature extraction | `feature-extraction` |
| Sentence similarity | `sentence-similarity` |

---

This skill enables you to integrate state-of-the-art machine learning capabilities directly into JavaScript applications without requiring separate ML servers or Python environments.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
