# Community GPU grants

When a non-PRO user has a good use case for ZeroGPU (open research demo, hobbyist project, educational tool, institutional showcase) and doesn't want to subscribe, they can request a free community grant from Hugging Face.

## The flow

1. **Build the Space.** Create it as `--flavor cpu-basic` (the user is not PRO, so creating with `--flavor zero-a10g` will fail at `create_repo`). Code the app for ZeroGPU anyway — `import spaces`, `@spaces.GPU`, module-scope `.to("cuda")`. The Space will technically run on CPU until the grant is approved, but it'll be ready to switch over instantly.

   In this mode you **can't iterate-with-real-inference** before the grant — the CPU Space won't actually run heavy compute. Get the app to BUILD cleanly and `RUNNING` (even if the runtime would OOM on real input), then submit.

2. **Submit a Community Tab discussion** on the Space. Title:

   ```
   Apply for a GPU community grant: <Personal|Company|Academic> project
   ```

   Pick the closest fit. Body:

   ```
   Description of the app: one paragraph on what it does + who it's for.
   Justification: one paragraph on why this should run on ZeroGPU
   (open-source, research, educational, etc.).
   ```

   If the user didn't give you a justification, a reasonable default is "Non-PRO wants to build a public ZeroGPU app — happy to provide more context if helpful."

3. **Wait.** Open and publicly-facing applications by researchers, tinkerers, and institutions are typically approved. Approval can take days.

4. **Once approved**, the Space is moved to ZeroGPU automatically — no code change needed. The user comes back and you can iterate / refine with real GPU access.

## When to suggest this

- User is not on PRO but their use case is a clear fit for ZeroGPU (a public ML demo, not a private tool).
- The model fits in `large` (≤ 48 GB VRAM at the chosen precision).

## When NOT to suggest this

- Private / commercial / closed-source projects — push the user toward PRO instead.
- The model genuinely needs dedicated paid hardware (huge LLM, vLLM/JAX/ONNX as main model with heavy init) — `canPay=True` users can use paid flavors directly.
- The user is already PRO — they have ZeroGPU access; no grant needed.

## Posting the request programmatically

```python
from huggingface_hub import HfApi

api = HfApi(token="hf_...")
api.create_discussion(
    repo_id="<ns>/<space>",
    repo_type="space",
    title="Apply for a GPU community grant: Personal project",
    description="<description and justification>",
)
```

The Community Tab must be enabled on the Space (default — keep it on).
