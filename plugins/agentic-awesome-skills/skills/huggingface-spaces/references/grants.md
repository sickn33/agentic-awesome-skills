# Community GPU grants

When a non-PRO user has a good use case for ZeroGPU (open research demo, hobbyist project, educational tool, institutional showcase) and doesn't want to subscribe, they can request a free community grant from Hugging Face.

## The flow

1. **Check current eligibility first.** Some free personal accounts can host ZeroGPU directly under current account-standing limits. If ineligible, prepare a CPU-safe skeleton without an unconditional module-scope CUDA move; `@spaces.GPU` is effect-free on CPU hardware and does not emulate CUDA there. A CPU build is not proof of GPU inference readiness.

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

3. **Wait for a decision.** Approval, timing and hardware allocation are discretionary; do not promise acceptance. Submit the public discussion only when the user explicitly authorizes posting.

4. **Once approved**, the Space is moved to ZeroGPU automatically — no code change needed. Verify the actual hardware assignment and run inference checks before claiming readiness.

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

import os
api = HfApi(token=os.environ["HF_TOKEN"])
api.create_discussion(
    repo_id="<ns>/<space>",
    repo_type="space",
    title="Apply for a GPU community grant: Personal project",
    description="<description and justification>",
)
```

The Community Tab must be enabled on the Space (default — keep it on).
