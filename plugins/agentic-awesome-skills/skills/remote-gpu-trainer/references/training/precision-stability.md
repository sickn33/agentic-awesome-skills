# Numerical precision & training stability — make it RUN, then stop it diverging

The mechanics of getting a DL run to compute *finite* numbers fast on a rented card, and of debugging it
when the loss goes NaN or spikes. This layer owns **make-it-run + the mechanics of divergence**; it does
NOT own *is the converged number real* / cuDNN-nondeterminism-as-a-metric-error — that is
**verifying-dl-experiments** (cross-link **REQUIRED** at every "is this a bug or a real effect" fork).

To jump: `grep -in '<keyword>' references/training/precision-stability.md` (e.g. `tf32`, `bf16`, `scaler`,
`nan`, `anomaly`, `z-loss`, `clip`, `warmup`, `qk`, `deterministic`).

## Table of contents

- **Precision choice** — P1 fp32/tf32/fp16/bf16 decision · P2 TF32 default-off footgun · P3 H100/A100/V100 capability
- **AMP mechanics** — P4 autocast scope · P5 GradScaler (fp16 only) · P6 bf16 needs no scaler · P7 grad-clip under scaler
- **NaN / Inf** — P8 where NaNs come from · P9 anomaly detection · P10 fp16 overflow vs underflow · P11 bad-data NaN
- **Loss spikes / divergence** — P12 LR + warmup · P13 grad clipping · P14 skip-the-batch · P15 z-loss · P16 qk-norm · P17 init
- **Gradients** — P18 explosion/vanishing diagnosis
- **Repro** — P19 determinism knobs (cross-link)
- **Pointers** — gotchas_universal.md, multinode.md, spot-resilience.md

---

## Precision choice

### P1 — Which precision: fp32 / TF32 / fp16 / bf16

**Symptom**: unsure which `dtype` to train in; run is either slow (fp32) or NaN-prone (fp16).

**Root cause**: the four modes trade dynamic range against mantissa precision against tensor-core speed.
fp16 has a 5-bit exponent (max ~65504) so it *overflows* and *underflows* easily; bf16 keeps fp32's 8-bit
exponent (same range as fp32) but only 7 mantissa bits, so it never needs loss-scaling but is coarser per
value. TF32 is an fp32-storage mode that runs matmuls at 10 mantissa bits on tensor cores.

**Fix — default ladder (PyTorch 2.x)**:
1. **bf16 autocast** on Ampere+ (A100/H100/4090/...) — the modern default; same range as fp32, no GradScaler, robust. `torch.autocast("cuda", dtype=torch.bfloat16)`.
2. **TF32** for the fp32 matmuls that remain (the non-autocast path) — `torch.set_float32_matmul_precision("high")`. Free ~speedup, negligible convergence impact for most nets (P2).
3. **fp16 autocast + GradScaler** ONLY if stuck on a card with no bf16 tensor cores (V100/T4/2080Ti) — needs the scaler (P5) and is overflow-prone.
4. **Pure fp32** as the diagnostic fallback: if a run NaNs, *first* prove it's finite in fp32 before blaming the model. fp32 isolates "is this a numerics bug or a model bug."

bf16 handles large dot-products / attention logits better than fp16, which saturates and triggers
scaler-step-skipping. URLs: https://docs.pytorch.org/docs/2.12/amp.html ·
https://www.runpod.io/articles/guides/fp16-bf16-fp8-mixed-precision-speed-up-my-model-training

### P2 — TF32 is OFF by default for matmul since PyTorch 1.12 — the "why is my A100 slow" footgun

**Symptom**: an fp32 (or autocast-but-fp32-matmul-heavy) run on an A100/H100 is ~2–4× slower than expected;
nothing is wrong with the code.

**Root cause**: `torch.backends.cuda.matmul.allow_tf32` defaulted **True in 1.7–1.11**, then flipped to
**False in 1.12+** (precision-loss complaints from non-DL users). So a fresh PyTorch 2.x box runs fp32
matmuls at full fp32 on the tensor cores' slow path unless TF32 is re-enabled. Convolutions' TF32
(`cudnn.allow_tf32`) is a separate knob, enabled by default.

**Fix**: opt back in once at startup —
```python
torch.set_float32_matmul_precision("high")   # preferred: enables TF32 (or bf16x3) for fp32 matmul
# legacy-equivalent, still works:
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
```
`"high"` = TF32; `"highest"` = true fp32 (default); `"medium"` = even coarser. HF Trainer exposes `--tf32 1`.
Most nets converge identically with TF32 as with fp32. URLs:
https://github.com/pytorch/pytorch/pull/76509 ·
https://docs.pytorch.org/docs/stable/generated/torch.set_float32_matmul_precision.html ·
https://docs.pytorch.org/docs/2.12/notes/numerical_accuracy.html

### P3 — Card capability gates the choice: bf16 needs Ampere+; V100/T4 are fp16-only

**Symptom**: bf16 training is unexpectedly slow (no error), or a config picks bf16 on an old card and falls
to a slow path.

**Root cause**: fast bf16 tensor cores arrived with **Ampere (A100, RTX 30xx)**; Hopper (H100/H200) adds
native **FP8**. **V100/T4/RTX 20xx have fp16 tensor cores but no fast bf16** (runs emulated/slow). A rental
hands whatever card is free, so the right precision is a *per-rental* fact, not a constant.

**Fix**: branch on capability at runtime, never hardcode —
```python
use_bf16 = torch.cuda.is_bf16_supported()    # True on Ampere+
amp_dtype = torch.bfloat16 if use_bf16 else torch.float16
```
On V100/T4 use fp16+GradScaler (P5). FP8 (H100) is opt-in via Transformer Engine / `torchao`, not plain
autocast (out of scope). Record the card next to `nvidia-smi` in Phase 0.
URL: https://www.e2enetworks.com/blog/nvidia-a100-vs-h100-vs-h200-gpu-comparison

---

## AMP mechanics

### P4 — autocast: wrap ONLY forward + loss, never backward, never `.half()` the model

**Symptom**: dtype-mismatch errors, or AMP gives no speedup, or grads look wrong.

**Root cause**: autocast is a context that casts *eligible ops* per-op inside the region; manually
`.half()`-ing the model or wrapping the backward pass fights it.

**Fix**:
```python
for x, y in loader:
    optimizer.zero_grad(set_to_none=True)
    with torch.autocast("cuda", dtype=amp_dtype):   # forward + loss ONLY
        out = model(x); loss = loss_fn(out, y)
    # backward is OUTSIDE autocast:
    loss.backward()                                 # (+ scaler for fp16, P5)
    optimizer.step()
```
Keep the model and optimizer in fp32; do NOT call `model.half()`. Use the new `torch.amp.autocast("cuda",
...)` / `torch.amp.GradScaler("cuda")` API — `torch.cuda.amp.*` is **deprecated** in PyTorch 2.x. autocast
state is thread-local (re-enter it inside each DDP/DataParallel worker thread).
URL: https://docs.pytorch.org/docs/2.12/amp.html

### P5 — GradScaler: required for fp16 to stop gradient *underflow*

**Symptom (no scaler, fp16)**: loss looks fine but the model doesn't learn — small gradients flush to 0 in
fp16's tiny subnormal range.

**Root cause**: fp16's narrow range underflows small gradients to zero. GradScaler multiplies the loss by a
large factor before backward (pushing grads into representable range), then unscales before the step and
**adapts the factor**: on any inf/NaN grad it *skips the optimizer step* and halves the scale (backoff 0.5);
after `growth_interval` (default 2000) clean steps it doubles it (growth 2.0).

**Fix — canonical fp16 loop**:
```python
scaler = torch.amp.GradScaler("cuda")
for x, y in loader:
    optimizer.zero_grad(set_to_none=True)
    with torch.autocast("cuda", dtype=torch.float16):
        loss = loss_fn(model(x), y)
    scaler.scale(loss).backward()
    scaler.step(optimizer)     # internally unscales; SKIPS step if inf/NaN found
    scaler.update()            # adapts the scale factor
```
Early-training "skipped step" warnings as the scaler calibrates are **normal**; *persistent* skips every
step = a real overflow (go to P10). URLs:
https://github.com/pytorch/pytorch/blob/main/docs/source/notes/amp_examples.rst ·
https://docs.pytorch.org/docs/2.12/amp.html

### P6 — bf16 needs NO GradScaler (adding one is pointless, not harmful)

**Symptom**: a copied fp16 recipe carries a GradScaler into a bf16 run — wasted overhead, not a crash or a wrong result.

**Root cause**: bf16 has fp32's exponent range, so gradients don't underflow → loss-scaling is unnecessary
and the scaler's skip/backoff machinery is dead weight (scale-then-unscale cancels, and it never finds an
overflow to skip).

**Fix**: for bf16, drop the scaler entirely — plain `loss.backward(); optimizer.step()`. Only fp16 (and the
V100/T4 path) uses GradScaler.
URL: https://docs.pytorch.org/docs/2.12/amp.html

### P7 — Gradient clipping under GradScaler: `unscale_` FIRST or you clip scaled grads

**Symptom**: `clip_grad_norm_` under fp16 AMP has no effect, or clips at the wrong magnitude.

**Root cause**: inside the scaler the grads are still multiplied by the (large) scale factor, so clipping to
`max_norm=1.0` is really clipping to `1.0 × scale` — effectively never.

**Fix**: `scaler.unscale_(optimizer)` once, THEN clip, THEN `scaler.step`:
```python
scaler.scale(loss).backward()
scaler.unscale_(optimizer)                                  # grads now in true scale
torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
scaler.step(optimizer); scaler.update()
```
`unscale_` is idempotent-per-step (call it once). For bf16, just `clip_grad_norm_` directly — no unscale.
URL: https://github.com/pytorch/pytorch/blob/main/docs/source/notes/amp_examples.rst

---

## NaN / Inf

### P8 — Where NaNs come from: the four arithmetic origins

**Symptom**: loss prints `nan` (or `inf`) after N steps; everything was fine before.

**Root cause** — NaN/Inf is produced by a *finite* set of ops on bad inputs:
- `log(x)` / `log_softmax` with `x ≤ 0` (e.g. `log` of a `sigmoid` output that hit 0).
- `sqrt(x)` / `x ** 0.5` with `x < 0`, or its grad at `x = 0` (`d/dx sqrt = 1/(2√x) → inf`).
- division `a / b` with `b → 0` (un-epsilon'd normalization, variance ≈ 0 in BatchNorm/LayerNorm).
- `exp(x)` overflow → `inf`, then `inf − inf` / `inf / inf → nan`.
- fp16 overflow (P10): a value exceeds 65504 → `inf` → grads → NaN.

**Fix — make the op stable, don't paper over it**:
- Never hand-roll `log(softmax(x))` — use `F.log_softmax` / `F.cross_entropy` (fused, log-sum-exp-stable).
- Add epsilon *inside* the unstable op: `torch.log(x + 1e-8)`, `torch.sqrt(x + 1e-12)`, `a / (b + 1e-8)`.
- Clamp before the danger op: `x.clamp(min=1e-7)` before `log`; clamp logits before a manual softmax.
- Use `eps` in the optimizer/norm (AdamW `eps=1e-8`; raise modestly if `v` is tiny and steps explode).

URLs: https://docs.pytorch.org/docs/stable/generated/torch.log.html ·
https://medium.com/better-ml/loss-spikes-in-training-causes-detection-and-mitigations-ed66e591b1a1

### P9 — Find the exact op: anomaly detection + a cheap forward hook

**Symptom**: loss is NaN but the stack trace points at `loss.backward()`, not the op that caused it.

**Root cause**: by default the NaN surfaces wherever it's *consumed*, not where it was *born*.

**Fix — two tools, cheap → precise**:
- **Forward NaN hook (cheap, leave on)** — register on every module to catch the *first* layer to emit NaN:
  ```python
  for name, m in model.named_modules():
      m.register_forward_hook(lambda mod, i, o, n=name:
          print(f"NaN in {n}") if torch.is_tensor(o) and not torch.isfinite(o).all() else None)
  ```
- **`torch.autograd.set_detect_anomaly(True)` (expensive, debug-only)** — records the forward traceback of
  each backward op and raises at the first backward NaN, pointing at the *forward* line that created it.
  ```python
  with torch.autograd.detect_anomaly():   # or set_detect_anomaly(True, check_nan=True)
      loss.backward()
  ```
  The docs warn it "will slow down your program" (roughly an order of magnitude) — enable to *locate*, then
  turn OFF for the real run, never ship it on. URL: https://docs.pytorch.org/docs/2.12/autograd.html

### P10 — fp16 overflow vs underflow: read the GradScaler signal

**Symptom (fp16)**: loss → inf/NaN; or the scaler skips *every* step and the scale factor collapses toward 0.

**Root cause**: a forward activation exceeds fp16's 65504 max → `inf` → NaN grads → the scaler can't find a
scale that avoids overflow, so it backs off forever. Common in attention logits and large residual sums.
(Distinct from underflow, which the scaler *fixes* by P5.)

**Fix**: switch fp16 → **bf16** (P1) — its fp32 range absorbs the large values; this is the single most
effective fix. If bf16 is unavailable (V100/T4): keep the overflow-prone block (final logits, attention
scores, the loss) in **fp32** via a nested `torch.autocast("cuda", enabled=False)` region, and apply z-loss
(P15) / qk-norm (P16) to stop the logits growing.
URL: https://medium.com/better-ml/loss-spikes-in-training-causes-detection-and-mitigations-ed66e591b1a1

### P11 — NaN from the *data*, not the math

**Symptom**: NaN appears at a specific, reproducible step (always step 4137), not gradually.

**Root cause**: a corrupt sample — NaN/Inf pixel, all-zero target, label outside `[0, C)`, empty sequence,
divide-by-zero in a custom transform. The math is fine; the input is poison.

**Fix**: guard at the data boundary — `assert torch.isfinite(x).all(), f"non-finite input @ step {step}"`
(fail loud, with the index). A reproducible-step NaN ⇒ inspect *that batch* (seed the loader, dump the
index); a *step-varying* NaN ⇒ a numerics/LR problem (P12), not data. Smoke the data first — smoke
*content* is owned by **verifying-dl-experiments** (cross-link **REQUIRED**).
URL: https://arxiv.org/pdf/2311.03938

---

## Loss spikes / divergence

### P12 — Loss spike / divergence: LR too high or warmup too short

**Symptom**: training is stable, then the loss jumps orders of magnitude (spike), sometimes recovering,
sometimes diverging to NaN — most often early, or after a fast LR ramp.

**Root cause**: if the LR ramps too fast or starts too high, early updates land before activation norms and
the optimizer's second moment (`v`) have stabilized, overshooting into sharp loss regions → gradient-norm
blowup → spike. A sustained **grad-norm** rise typically *precedes* the loss spike by several steps.

**Fix — in order of cheapness**:
1. **Lengthen warmup** (linear ramp 0 → peak over e.g. 1–10% of steps); warmup is the single biggest lever on LR-sensitivity of final loss.
2. **Lower peak LR** ~3–10× and re-check.
3. **Log grad-norm every step** as the early-warning signal — spikes are predictable from activation/grad-norm scaling before they hit.
4. Resume from the last good checkpoint *before* the spike (don't train through a diverged region).

URLs: https://arxiv.org/pdf/2309.14322 ·
https://apxml.com/courses/how-to-build-a-large-language-model/chapter-24-identifying-mitigating-training-instabilities/stabilization-techniques-revisited

### P13 — Gradient clipping: the standard guardrail (and what constant clipping means)

**Symptom**: occasional grad-norm spikes; or NaN right after a single bad batch.

**Root cause**: one pathological batch (rare embedding IDs, an outlier sample) produces an outsized global
grad norm that overshoots.

**Fix**: clip global grad norm every step — `torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)`
with `max_norm` ∈ [0.5, 1.0] typical for transformers (under the scaler: P7). **Diagnostic**: if clipping is
active *every* step or needs an absurdly low threshold to stay stable, that's a symptom of a deeper problem
(LR too high P12, bad init P17, architecture), not a fix — chase the cause. Global-norm clipping scales
*all* grads down, so one embedding-heavy batch can throttle everything else that step — consider per-module
clipping if embeddings dominate.
URL: https://medium.com/better-ml/loss-spikes-in-training-causes-detection-and-mitigations-ed66e591b1a1

### P14 — Skip-the-batch: drop the update when this step is non-finite

**Symptom**: a single bad batch every few thousand steps NaNs the whole run; restarting wastes hours.

**Root cause**: the optimizer applies a non-finite grad and permanently corrupts the weights.

**Fix**: gate the optimizer step on finiteness (fp16's GradScaler already does this internally, P5; bf16
needs it explicit):
```python
loss.backward()
gnorm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
if torch.isfinite(gnorm):
    optimizer.step()
else:
    optimizer.zero_grad(set_to_none=True)   # skip this batch, keep weights intact
    skipped += 1
```
Log a `skipped` counter — a *rising* skip rate means a systematic problem (P12/P10), not stray bad data.
Adaptive spike-clipping (ZClip) and momentum-reset on spike (SPAM) automate this for large runs. URLs:
https://arxiv.org/pdf/2504.02507 · https://arxiv.org/pdf/2501.06842

### P15 — z-loss: stop softmax logits from drifting unbounded

**Symptom**: training is slowly destabilizing; the softmax normalizer / output logits grow over time and
eventually overflow (acute in fp16/bf16); the "output logits diverge from log-probs" failure mode.

**Root cause**: nothing pins the absolute scale of pre-softmax logits, so they drift up; large logits cause
numerical instability and (in low precision) overflow → collapse.

**Fix**: add an auxiliary **z-loss** = `1e-4 · (log Z)²` where `Z` is the softmax denominator
(`log Z = logsumexp(logits)`), pulling `log Z → 0`:
```python
logits = model(x)
z = torch.logsumexp(logits, dim=-1)
loss = F.cross_entropy(logits, y) + 1e-4 * (z ** 2).mean()
```
Coefficient **1e-4** is the PaLM/ST-MoE value; too large lets z-loss dominate. Standard in LLM pretraining;
also the recommended fix for MoE router instability. URLs:
https://medium.com/dair-ai/papers-explained-50-palm-480e72fa3fd5 · https://arxiv.org/pdf/2202.08906 ·
https://arxiv.org/pdf/2309.14322

### P16 — qk-norm: kill attention-logit growth at high LR

**Symptom**: a transformer diverges only at higher LR; the instability traces to attention scores (Q·Kᵀ)
growing large before the softmax.

**Root cause**: "growth of logits in attention layers" — one of the two dominant transformer instability
modes (the other is output-logit divergence, P15). Unbounded attention logits saturate the softmax.

**Fix**: apply **QK-LayerNorm** — LayerNorm query and key per-head before the dot-product. Combined with
z-loss (P15) + warmup (P12), it lets small models train to similar loss across *orders of magnitude* of LR,
i.e. removes most LR-sensitivity. URL: https://arxiv.org/pdf/2309.14322

### P17 — Initialization & normalization placement

**Symptom**: divergence in the first few hundred steps regardless of LR; or vanishing signal (P18) in deep
stacks.

**Root cause**: residual streams accumulate variance with depth; default init can make early
activations/grads too large (spike) or too small (vanish). Norm/embedding init scale matters.

**Fix**: scale residual-branch init by `1/√(2·n_layers)` (GPT-2-style); prefer pre-LN over post-LN for deep
transformers; init embeddings at small std (~0.02). When unsure, copy a *known-good* config's init+norm
scheme rather than tuning blind. URL: https://arxiv.org/pdf/2309.14322

---

## Gradients

### P18 — Gradient explosion vs vanishing: diagnose by logging the norm

**Symptom**: loss NaN/diverges (explosion) OR loss plateaus and the model never learns (vanishing).

**Root cause**: per-layer grad norms blow up (explosion: deep nets, high LR, no clip) or decay to ~0
(vanishing: saturating activations, bad init P17, too-deep unnormalized stacks).

**Fix — measure first**:
```python
total = sum(p.grad.detach().norm()**2 for p in model.parameters() if p.grad is not None) ** 0.5
# log `total` every step; also log per-layer norms when hunting the culprit layer
```
- **Explosion** (norm ↑↑): grad clipping (P13), lower LR (P12), longer warmup, bf16 over fp16 (P10).
- **Vanishing** (norm → 0): residual connections, normalization layers, better init (P17), non-saturating
  activations (GELU/SiLU over deep sigmoid/tanh stacks), check the LR isn't *too low*.

A grad-norm trace is the cheapest, highest-signal stability instrument — log it from step 1.
URL: https://apxml.com/courses/how-to-build-a-large-language-model/chapter-24-identifying-mitigating-training-instabilities/stabilization-techniques-revisited

---

## Reproducibility

### P19 — Deterministic / repro knobs — set them, but the *interpretation* is delegated

**Symptom**: same config + seed gives slightly different loss/metrics run-to-run.

**Root cause**: nondeterministic CUDA kernels + `cudnn.benchmark` autotuning pick different algorithms per
run; TF32/AMP add low-order noise on top.

**Fix — the mechanical knobs (set these here)**:
```python
torch.manual_seed(s); np.random.seed(s); random.seed(s)
torch.use_deterministic_algorithms(True)        # may need CUBLAS_WORKSPACE_CONFIG=:4096:8
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False          # benchmark=True trades determinism for speed
```
**Whether a run-to-run delta is "a real effect vs cuDNN nondeterminism," and the full determinism
methodology, is owned by verifying-dl-experiments (cross-link REQUIRED)** — catalogued as **U36** in
`references/gotchas_universal.md`. This layer only ensures the knobs are *set and logged*. Determinism costs
speed — enable for the datapoint that must be clean, not every throwaway run.
URL: https://docs.pytorch.org/docs/stable/notes/randomness.html

---

## Pointers — adjacent layers, do NOT restate here

- **`references/gotchas_universal.md`** — the *infra* failure modes that masquerade as numerics:
  **U6** disk-full crashes `torch.save`, **U9** cgroup-OOM (bare `Killed`, not a NaN), **U28** CUDA/driver/
  torch-build mismatch (`no kernel image` ≠ a precision bug), **U10/U11** VRAM OOM. Rule out infra before
  chasing a "numerics" ghost.
- **`verifying-dl-experiments`** (**REQUIRED** cross-link) — owns *is-the-number-real*: smoke **content**,
  cuDNN-nondeterminism-as-metric-error (U36), collapse/constant-output diagnosis, "bug vs real effect." This
  file makes training *run and stay finite*; that skill judges whether the converged result is *true*.
- **`references/spot-resilience.md`** — checkpoint cadence so a divergence-and-resume (P12) loses minimal work.
- **`references/multinode.md`** — NCCL/precision interactions in DDP (all-reduce dtype, loss-scale sync) for
  multi-node runs; single-box users skip.
