# Transformers.js Code Examples

Working examples showing how to use Transformers.js across different runtimes and frameworks.

All examples use the same task and model for consistency:
- **Task**: `feature-extraction`
- **Model**: `onnx-community/all-MiniLM-L6-v2-ONNX`

## Table of Contents
1. [Browser (Vanilla JS)](#browser-vanilla-js)
2. [Node.js](#nodejs)
3. [React](#react)
4. [Express API](#express-api)

## Browser (Vanilla JS)

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>Feature Extraction</title>
</head>
<body>
  <h1>Text Embedding Generator</h1>
  <textarea id="input" placeholder="Enter text to embed..."></textarea>
  <button onclick="generateEmbedding()">Generate Embedding</button>
  <div id="result"></div>
  <div id="loading" style="display:none;">Loading model...</div>

  <script type="module">
    import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
    
    let extractor;
    
    // Initialize model on page load
    document.getElementById('loading').style.display = 'block';
    extractor = await pipeline(
      'feature-extraction',
      'onnx-community/all-MiniLM-L6-v2-ONNX'
    );
    document.getElementById('loading').style.display = 'none';
    
    window.generateEmbedding = async function() {
      const text = document.getElementById('input').value;
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      document.getElementById('result').innerHTML = `
        <h3>Embedding Generated:</h3>
        <p>Dimensions: ${output.data.length}</p>
        <p>First 5 values: ${Array.from(output.data).slice(0, 5).join(', ')}</p>
      `;
    };
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (extractor) extractor.dispose();
    });
  </script>
</body>
</html>
```

### With Progress Tracking

```html
<!DOCTYPE html>
<html>
<head>
  <title>Feature Extraction with Progress</title>
  <style>
    .file-progress {
      margin: 10px 0;
    }
    .file-name {
      font-size: 12px;
      margin-bottom: 5px;
    }
    .progress-bar {
      width: 100%;
      height: 20px;
      background: #f0f0f0;
      border-radius: 5px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: #4CAF50;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <h1>Text Embedding Generator</h1>
  <div id="loading">
    <p id="status">Loading model...</p>
    <div id="progress-container"></div>
  </div>
  <div id="app" style="display:none;">
    <textarea id="input" placeholder="Enter text..."></textarea>
    <button onclick="generateEmbedding()">Generate</button>
    <div id="result"></div>
  </div>

  <script type="module">
    import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
    
    let extractor;
    const fileProgressBars = {};
    const progressContainer = document.getElementById('progress-container');
    
    extractor = await pipeline(
      'feature-extraction',
      'onnx-community/all-MiniLM-L6-v2-ONNX',
      {
        progress_callback: (info) => {
          document.getElementById('status').textContent = `${info.status}: ${info.file}`;
          
          if (info.status === 'progress') {
            // Create progress bar for each file
            if (!fileProgressBars[info.file]) {
              const fileDiv = document.createElement('div');
              fileDiv.className = 'file-progress';
              fileDiv.innerHTML = `
                <div class="file-name">${info.file}</div>
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              `;
              progressContainer.appendChild(fileDiv);
              fileProgressBars[info.file] = fileDiv.querySelector('.progress-fill');
            }
            
            // Update progress
            fileProgressBars[info.file].style.width = `${info.progress}%`;
          }
          
          if (info.status === 'ready') {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').style.display = 'block';
          }
        }
      }
    );
    
    window.generateEmbedding = async function() {
      const text = document.getElementById('input').value;
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      
      document.getElementById('result').innerHTML = `
        <p>Embedding: ${output.data.length} dimensions</p>
      `;
    };
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (extractor) extractor.dispose();
    });
  </script>
</body>
</html>
```

## Node.js

### Basic Script

```javascript
// embed.js
import { pipeline } from '@huggingface/transformers';

async function generateEmbedding(text) {
  const extractor = await pipeline(
    'feature-extraction',
    'onnx-community/all-MiniLM-L6-v2-ONNX'
  );
  
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  
  console.log('Text:', text);
  console.log('Embedding dimensions:', output.data.length);
  console.log('First 5 values:', Array.from(output.data).slice(0, 5));
  
  await extractor.dispose();
}

generateEmbedding('Hello, world!');
```

### Batch Processing

```javascript
// batch-embed.js
import { pipeline } from '@huggingface/transformers';
import fs from 'fs/promises';

async function embedDocuments(documents) {
  const extractor = await pipeline(
    'feature-extraction',
    'onnx-community/all-MiniLM-L6-v2-ONNX'
  );
  
  console.log(`Processing ${documents.length} documents...`);
  
  const embeddings = [];
  
  for (let i = 0; i < documents.length; i++) {
    const output = await extractor(documents[i], { 
      pooling: 'mean', 
      normalize: true 
    });
    
    embeddings.push({
      text: documents[i],
      embedding: Array.from(output.data)
    });
    
    console.log(`Processed ${i + 1}/${documents.length}`);
  }
  
  await fs.writeFile(
    'embeddings.json',
    JSON.stringify(embeddings, null, 2)
  );
  
  console.log('Saved to embeddings.json');
  
  await extractor.dispose();
}

const documents = [
  'The cat sat on the mat',
  'A dog played in the park',
  'Machine learning is fascinating'
];

embedDocuments(documents);
```

### CLI with Progress

```javascript
// cli-embed.js
import { pipeline } from '@huggingface/transformers';

async function main() {
  const text = process.argv[2] || 'Hello, world!';
  
  console.log('Loading model...');
  
  const fileProgress = {};
  
  const extractor = await pipeline(
    'feature-extraction',
    'onnx-community/all-MiniLM-L6-v2-ONNX',
    {
      progress_callback: (info) => {
        if (info.status === 'progress') {
          fileProgress[info.file] = info.progress;
          
          // Show all files progress
          const progressLines = Object.entries(fileProgress)
            .map(([file, progress]) => `  ${file}: ${progress.toFixed(1)}%`)
            .join('\n');
          
          process.stdout.write(`\r\x1b[K${progressLines}`);
        }
        
        if (info.status === 'done') {
          console.log(`\n✓ ${info.file} complete`);
        }
        
        if (info.status === 'ready') {
          console.log('\nModel ready!');
        }
      }
    }
  );
  
  console.log('Generating embedding...');
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  
  console.log(`\nText: "${text}"`);
  console.log(`Dimensions: ${output.data.length}`);
  console.log(`First 5 values: ${Array.from(output.data).slice(0, 5).join(', ')}`);
  
  await extractor.dispose();
}

main();
```

## React

### Basic Component

```jsx
// EmbeddingGenerator.jsx
import { useState, useRef, useEffect } from 'react';
import { pipeline } from '@huggingface/transformers';

export function EmbeddingGenerator() {
  const extractorRef = useRef(null);
  const [text, setText] = useState('');
  const [embedding, setEmbedding] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!text) return;
    
    setLoading(true);
    
    // Load model on first generate
    if (!extractorRef.current) {
      extractorRef.current = await pipeline(
        'feature-extraction',
        'onnx-community/all-MiniLM-L6-v2-ONNX'
      );
    }
    
    const output = await extractorRef.current(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    setEmbedding(Array.from(output.data));
    setLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (extractorRef.current) {
        extractorRef.current.dispose();
      }
    };
  }, []);

  return (
    <div>
      <h2>Text Embedding Generator</h2>
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text"
        disabled={loading}
      />
      
      <button onClick={generate} disabled={loading || !text}>
        {loading ? 'Processing...' : 'Generate Embedding'}
      </button>
      
      {embedding && (
        <div>
          <h3>Result:</h3>
          <p>Dimensions: {embedding.length}</p>
          <p>First 5 values: {embedding.slice(0, 5).join(', ')}</p>
        </div>
      )}
    </div>
  );
}
```

### With Progress Tracking

```jsx
// EmbeddingGeneratorWithProgress.jsx
import { useState, useRef, useEffect } from 'react';
import { pipeline } from '@huggingface/transformers';

export function EmbeddingGeneratorWithProgress() {
  const extractorRef = useRef(null);
  const [text, setText] = useState('');
  const [embedding, setEmbedding] = useState(null);
  const [fileProgress, setFileProgress] = useState({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!text) return;
    
    setLoading(true);
    
    // Load model on first generate
    if (!extractorRef.current) {
      setStatus('Loading model...');
      
      extractorRef.current = await pipeline(
        'feature-extraction',
        'onnx-community/all-MiniLM-L6-v2-ONNX',
        {
          progress_callback: (info) => {
            setStatus(`${info.status}: ${info.file}`);
            
            if (info.status === 'progress') {
              setFileProgress(prev => ({
                ...prev,
                [info.file]: info.progress
              }));
            }
            
            if (info.status === 'ready') {
              setStatus('Model ready!');
            }
          }
        }
      );
    }
    
    setStatus('Generating embedding...');
    const output = await extractorRef.current(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    setEmbedding(Array.from(output.data));
    setStatus('Complete!');
    setLoading(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (extractorRef.current) {
        extractorRef.current.dispose();
      }
    };
  }, []);

  return (
    <div>
      <h2>Text Embedding Generator</h2>
      
      {loading && Object.keys(fileProgress).length > 0 && (
        <div>
          <p>{status}</p>
          {Object.entries(fileProgress).map(([file, progress]) => (
            <div key={file} style={{ margin: '10px 0' }}>
              <div style={{ fontSize: '12px', marginBottom: '5px' }}>{file}</div>
              <div style={{ width: '100%', height: '20px', background: '#f0f0f0', borderRadius: '5px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progress}%`, 
                    height: '100%', 
                    background: '#4CAF50',
                    transition: 'width 0.3s'
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text"
        disabled={loading}
      />
      
      <button onClick={generate} disabled={loading || !text}>
        {loading ? 'Processing...' : 'Generate Embedding'}
      </button>
      
      {embedding && (
        <div>
          <h3>Result:</h3>
          <p>Dimensions: {embedding.length}</p>
          <p>First 5 values: {embedding.slice(0, 5).join(', ')}</p>
        </div>
      )}
    </div>
  );
}
```

## Express API

### Basic API Server

```javascript
// server.js
import express from 'express';
import { pipeline } from '@huggingface/transformers';

const app = express();
app.use(express.json());

// Initialize model once at startup
let extractor;
(async () => {
  console.log('Loading model...');
  extractor = await pipeline(
    'feature-extraction',
    'onnx-community/all-MiniLM-L6-v2-ONNX'
  );
  console.log('Model ready!');
})();

app.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const output = await extractor(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    
    res.json({
      text,
      embedding: Array.from(output.data),
      dimensions: output.data.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### API with Graceful Shutdown

```javascript
// server-with-shutdown.js
import express from 'express';
import { pipeline } from '@huggingface/transformers';

const app = express();
app.use(express.json());

let extractor;
let server;

async function initialize() {
  console.log('Loading model...');
  extractor = await pipeline(
    'feature-extraction',
    'onnx-community/all-MiniLM-L6-v2-ONNX'
  );
  console.log('Model ready!');
}

app.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const output = await extractor(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    
    res.json({
      embedding: Array.from(output.data),
      dimensions: output.data.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  if (extractor) {
    console.log('Disposing model...');
    await extractor.dispose();
    console.log('Model disposed');
  }
  
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

initialize().then(() => {
  server = app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
});
```

---

These examples demonstrate the same functionality across different runtimes and frameworks, making it easy to adapt to your specific use case. All examples include proper cleanup with `.dispose()` to free memory.
