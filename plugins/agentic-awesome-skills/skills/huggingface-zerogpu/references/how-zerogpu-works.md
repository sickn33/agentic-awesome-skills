# How ZeroGPU works (mechanism)

Conceptual lifecycle of model weights, processes, and worker reuse on ZeroGPU. Useful when reasoning about cold-starts, why module-scope warmup does not carry over to requests, why returning CUDA tensors hangs the call, or why `gr.State` mutations do not persist across the worker boundary.

For numerical limits (concurrency slots per Space, queue priority by tier, etc.), see [the ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) — those values change over time and are deliberately kept out of this skill.

## Two processes, two lifetimes

A ZeroGPU Space runs as **two separate processes**:

- **Main web process** — long-lived. Imports `app.py`, launches Gradio, stays up for the life of the Space. Holds no VRAM and, after the startup "pack" step, holds no model weights in RAM either.
- **GPU worker processes** — short-lived. Forked per `@spaces.GPU` request (or reused if warm). Run the task and are eventually killed by the ZeroGPU scheduler when another Space needs the GPU slot. Your Space code never kills its own worker.

## Module-scope `.to("cuda")` is captured to disk

When `import spaces` is active, `model.to("cuda")` at module scope is intercepted. The call is rewritten to `to("cpu")`, so the tensor data physically lives in main process RAM at this point. A "fake" CUDA-presenting tensor is registered alongside the original CPU tensor.

At a startup "pack" step, the backend writes those original CPU tensors to disk via direct I/O (`O_DIRECT`), then frees the corresponding RAM. After pack, the main process holds no model weights anywhere — the data lives only on disk.

This is why module-scope `pipe(...)` / `model.generate(...)` / `model(...)` calls do not run on a real GPU: there is no GPU attached to the main process, and after pack there are no weights to compute against either. Such calls either fail or silently fall back to CPU on the fake tensors.

## Worker init: disk → pinned memory → VRAM

When a `@spaces.GPU` call lands, the scheduler routes it to a worker:

1. **Cold worker** — forked from the main process. The patched torch is unpatched, real CUDA is initialized, and weights are read from the disk offload directory into pinned host memory and streamed onto VRAM through a double-buffered pipeline (essentially `pin_memory().cuda(non_blocking=True)` per batch). This is the "cold-start" cost.
2. **Warm worker (reused)** — an alive worker bound to the same GPU slot is reused if the scheduler reports it idle. Init is skipped; weights stay on VRAM from the previous call. Subsequent requests within a burst hit this path.

A warm worker is eventually killed by the scheduler when another Space needs the GPU slot. The next call after that point pays the disk → VRAM cost again. Occasional cold-starts on a low-traffic Space are normal.

## Why module-scope warmup does not help

A common instinct is to call `pipe("warmup")` at module scope to "prepare" the model. This does not work on ZeroGPU:

- At module scope, no real GPU is attached. The fake CUDA tensors do not have data after pack, so `pipe(...)` either fails or silently runs on something other than a real GPU.
- Even if you wrap the warmup in `@spaces.GPU`, the worker that ran the warmup will eventually be killed before the first real user request lands — leaving them with a cold worker anyway.

The right answer is to load eagerly at module scope (`pipe = pipeline(..., device="cuda")`) and accept that the first user request after a quiet period will be a cold worker. Cold-start is fast on ZeroGPU because of the pinned-memory disk pipeline; it is not free, but it is not "minutes of model download" either.

## Why returning CUDA tensors hangs the call

The main process never has a CUDA context — it has no GPU attached and its torch never initialized CUDA. When a worker returns a CUDA tensor, unpickling it in the main process triggers `torch.cuda._lazy_init()`, which would attempt to initialize CUDA in the main process. ZeroGPU blocks this, and the call hangs.

The fix is purely client-side: convert to CPU before returning (`.cpu()`, `.cpu().numpy()`, etc.). See "Process Isolation and Pickle" in SKILL.md.

## Why `gr.State` does not share by reference across the boundary

Worker processes are forked separately and exchange data with the main process via pickle. `gr.State` values cross this boundary on every yield, so mutations inside a `@spaces.GPU` generator are local to the worker until the mutated state is explicitly yielded back. The main process gets a fresh deserialized copy each time — `id()` differs, in-place mutations are invisible across the boundary.

See "Process Isolation and Pickle" in SKILL.md for the practical implications and `references/concurrency.md` for related parallel-handler concerns.
