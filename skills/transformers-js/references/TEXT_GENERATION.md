# Text Generation Guide

Guide to generating text with Transformers.js, including streaming and chat format.

## Table of Contents

1. [Basic Generation](#basic-generation)
2. [Streaming](#streaming)
3. [Chat Format](#chat-format)
4. [Generation Parameters](#generation-parameters)
5. [Model Selection](#model-selection)
6. [Best Practices](#best-practices)

## Basic Generation

```javascript
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline(
  'text-generation',
  'onnx-community/Qwen2.5-0.5B-Instruct',
  { dtype: 'q4' }
);

const result = await generator('Once upon a time', {
  max_new_tokens: 100,
  temperature: 0.7,
});

console.log(result[0].generated_text);

// Clean up when done
await generator.dispose();
```

## Streaming

Stream tokens as they're generated for better UX. Once you understand streaming, you can combine it with other features like chat format.

### Node.js

```javascript
import { pipeline, TextStreamer } from '@huggingface/transformers';

const generator = await pipeline(
  'text-generation',
  'onnx-community/Qwen2.5-0.5B-Instruct',
  { dtype: 'q4' }
);

const streamer = new TextStreamer(generator.tokenizer, {
  skip_prompt: true,
  skip_special_tokens: true,
  callback_function: (token) => {
    process.stdout.write(token);
  },
});

await generator('Tell me a story', {
  max_new_tokens: 200,
  temperature: 0.7,
  streamer,
});
```

### Browser

```html
<!DOCTYPE html>
<html>
<body>
  <textarea id="prompt" placeholder="Enter prompt..."></textarea>
  <button onclick="generate()">Generate</button>
  <div id="output"></div>

  <script type="module">
    import { pipeline, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
    
    const generator = await pipeline(
      'text-generation',
      'onnx-community/Qwen2.5-0.5B-Instruct',
      { dtype: 'q4' }
    );
    
    window.generate = async function() {
      const prompt = document.getElementById('prompt').value;
      const outputDiv = document.getElementById('output');
      outputDiv.textContent = '';
      
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token) => {
          outputDiv.textContent += token;
        },
      });
      
      await generator(prompt, {
        max_new_tokens: 200,
        temperature: 0.7,
        streamer,
      });
    };
  </script>
</body>
</html>
```

### React

```jsx
import { useState, useRef, useEffect } from 'react';
import { pipeline, TextStreamer } from '@huggingface/transformers';

function StreamingGenerator() {
  const generatorRef = useRef(null);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (prompt) => {
    if (!prompt) return;
    
    setLoading(true);
    setOutput('');
    
    // Load model on first generate
    if (!generatorRef.current) {
      generatorRef.current = await pipeline(
        'text-generation',
        'onnx-community/Qwen2.5-0.5B-Instruct',
        { dtype: 'q4' }
      );
    }
    
    const streamer = new TextStreamer(generatorRef.current.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token) => {
        setOutput((prev) => prev + token);
      },
    });

    await generatorRef.current(prompt, {
      max_new_tokens: 200,
      temperature: 0.7,
      streamer,
    });
    
    setLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generatorRef.current) {
        generatorRef.current.dispose();
      }
    };
  }, []);

  return (
    <div>
      <button onClick={() => handleGenerate('Tell me a story')} disabled={loading}>
        {loading ? 'Generating...' : 'Generate'}
      </button>
      <div>{output}</div>
    </div>
  );
}
```

## Chat Format

Use structured messages for conversations. Works with both basic generation and streaming (just add `streamer` parameter).

### Single Turn

```javascript
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline(
  'text-generation',
  'onnx-community/Qwen2.5-0.5B-Instruct',
  { dtype: 'q4' }
);

const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'How do I create an async function?' }
];

const result = await generator(messages, {
  max_new_tokens: 256,
  temperature: 0.7,
});

console.log(result[0].generated_text);
```

### Multi-turn Conversation

```javascript
const conversation = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is JavaScript?' },
  { role: 'assistant', content: 'JavaScript is a programming language...' },
  { role: 'user', content: 'Can you show an example?' }
];

const result = await generator(conversation, {
  max_new_tokens: 200,
  temperature: 0.7,
});

// To add streaming, just pass a streamer:
// streamer: new TextStreamer(generator.tokenizer, {...})
```

## Generation Parameters

### Common Parameters

```javascript
await generator(prompt, {
  // Token limits
  max_new_tokens: 512,        // Maximum tokens to generate
  min_new_tokens: 0,          // Minimum tokens to generate
  
  // Sampling
  temperature: 0.7,           // Randomness (0.0-2.0)
  top_k: 50,                  // Consider top K tokens
  top_p: 0.95,                // Nucleus sampling
  do_sample: true,            // Use random sampling (false = always pick most likely token)
  
  // Repetition control
  repetition_penalty: 1.0,    // Penalty for repeating (1.0 = no penalty)
  no_repeat_ngram_size: 0,    // Prevent repeating n-grams
  
  // Streaming
  streamer: streamer,         // TextStreamer instance
});
```

### Parameter Effects

**Temperature:**
- Low (0.1-0.5): More focused and deterministic
- Medium (0.6-0.9): Balanced creativity and coherence
- High (1.0-2.0): More creative and random

```javascript
// Focused output
await generator(prompt, { temperature: 0.3, max_new_tokens: 100 });

// Creative output
await generator(prompt, { temperature: 1.2, max_new_tokens: 100 });
```

**Sampling Methods:**

```javascript
// Greedy (deterministic)
await generator(prompt, { 
  do_sample: false,
  max_new_tokens: 100 
});

// Top-k sampling
await generator(prompt, { 
  top_k: 50,
  temperature: 0.7,
  max_new_tokens: 100 
});

// Top-p (nucleus) sampling
await generator(prompt, { 
  top_p: 0.95,
  temperature: 0.7,
  max_new_tokens: 100 
});
```

## Model Selection

Browse available text generation models on Hugging Face Hub:

**https://huggingface.co/models?pipeline_tag=text-generation&library=transformers.js&sort=trending**

### Selection Tips

- **Small models (< 1B params)**: Fast, browser-friendly, use `dtype: 'q4'`
- **Medium models (1-3B params)**: Balanced quality/speed, use `dtype: 'q4'` or `fp16`
- **Large models (> 3B params)**: High quality, slower, best for Node.js with `dtype: 'fp16'`

Check model cards for:
- Parameter count and model size
- Supported languages
- Benchmark scores
- License restrictions

## Best Practices

1. **Model Size**: Use quantized models (`q4`) for browsers, larger models (`fp16`) for servers
2. **Streaming**: Use streaming for better UX - shows progress and feels responsive
3. **Token Limits**: Set `max_new_tokens` to prevent runaway generation
4. **Temperature**: Tune based on use case (creative: 0.8-1.2, factual: 0.3-0.7)
5. **Memory**: Always call `dispose()` when done
6. **Caching**: Load model once, reuse for multiple requests

## Related Documentation

- [Pipeline Options](./PIPELINE_OPTIONS.md) - Configure pipeline loading
- [Configuration Reference](./CONFIGURATION.md) - Environment settings
- [Code Examples](./EXAMPLES.md) - More examples for different runtimes
- [Main Skill Guide](../SKILL.md) - Getting started guide
