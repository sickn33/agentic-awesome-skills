# Concurrency Safety

Gradio handlers run **in parallel by default on ZeroGPU**. Code that works fine in single-user testing can silently corrupt or leak data in production. Always assume handlers execute concurrently.

## No mutable global state

Per-request or per-user data must not live in module-level mutable variables. Concurrent requests will overwrite each other.

```python
# BAD — concurrent requests overwrite each other
results = {}

def process(text):
    results["output"] = expensive_compute(text)  # race condition
    return results["output"]
```

```python
# GOOD — pure function, no shared mutable state
def process(text):
    return expensive_compute(text)
```

For state that must persist within a single user session, use `gr.State`:

```python
with gr.Blocks() as demo:
    history = gr.State(value=[])

    def add_message(msg, hist):
        hist.append(msg)
        return hist, hist

    btn.click(fn=add_message, inputs=[msg, history], outputs=[chatbot, history])
```

Note that on ZeroGPU, `gr.State` is pickled across the worker boundary on every yield — see "Process Isolation and Pickle" in SKILL.md for the implications.

## No fixed file paths for outputs

Hardcoded output filenames cause concurrent requests to overwrite each other's files. This corrupts outputs and, worse, can leak one user's data to another.

```python
# BAD — concurrent calls clobber the same file
def generate_image(prompt):
    image = pipe(prompt).images[0]
    image.save("output.png")
    return "output.png"
```

```python
# GOOD — unique path per invocation
import tempfile

def generate_image(prompt):
    image = pipe(prompt).images[0]
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        image.save(f.name)
        return f.name
```

The same applies to any intermediate files (audio, video, CSV exports). Always generate a unique path per invocation.

## Read-only globals are safe

Model objects, tokenizers, and configs loaded once at startup and only read during requests are safe and encouraged. This is the standard ZeroGPU pattern: load at module scope, read inside `@spaces.GPU` handlers.

```python
# SAFE — loaded once at module scope, read-only during requests
model = load_model().to("cuda")
tokenizer = load_tokenizer()

@spaces.GPU
def predict(text):
    tokens = tokenizer(text, return_tensors="pt").to("cuda")
    return model.generate(**tokens)
```

The "no mutable global state" rule targets *writes* from handlers, not reads. A handler that only reads from a global is concurrency-safe.
