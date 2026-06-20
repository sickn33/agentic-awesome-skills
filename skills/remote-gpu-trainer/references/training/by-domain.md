# Per-domain training gotchas — make each domain's run start, not lie, and not silently mistrain

The cross-cutting layers (precision, OOM, throughput, checkpoint, distributed) hold everywhere; this file
is the **domain-shaped** residue — the data-format, masking, normalization, schedule, and freezing traps
that only bite LLM / vision / diffusion / RL / VLM training. Each entry is **Symptom → Root cause → Fix**
with the exact knob. This layer owns *making the domain pipeline RUN and debugging its mechanics*;
**verifying-dl-experiments** owns *is the converged number real* (collapse-vs-real-effect, train/val
leakage, metric validity, constant/degenerate output). Cross-link it (**REQUIRED**) at every "loss is fine
but the output/metric is wrong" fork — the headline domain failures (diffusion samples bad at low loss,
mAP=0, reward collapse, VLM ignores the image) are exactly that shape.

To jump: `grep -in '<keyword>' references/training/by-domain.md` (e.g. `padding`, `packing`, `rope`,
`z-loss`, `dpo`, `mAP=0`, `mIoU`, `ignore_index`, `ema`, `vae`, `cfg`, `kl`, `whiten`, `projector`,
`freeze`, `seed`).

## Table of contents

- **LLM** — L1 pad-side · L2 loss-mask-−100 · L3 pad-token-unset · L4 packing-cross-contamination · L5 RoPE-context-extension · L6 grad-explosion+z-loss · L7 eval-perplexity-mask · L8 SFT/DPO/RLHF-data-format · L9 DPO-collapse+KL · L10 gated-token-before-Trainer
- **Vision (cls/det/seg)** — V1 normalization-mismatch · V2 aug-on-eval · V3 mAP=0 · V4 anchor/NMS/conf-thresh · V5 mIoU=0 ignore_index/off-by-one · V6 class-imbalance · V7 BN-tiny-batch
- **Diffusion** — DF1 loss-low-samples-bad (cross-link) · DF2 EMA-weights · DF3 VAE-scaling · DF4 noise-schedule/timestep · DF5 CFG-conditioning-dropout · DF6 sampler-vs-model · DF7 SNR-weighting
- **RL** — R1 reward-collapse · R2 KL-blowup · R3 whitening · R4 replay/obs-normalization · R5 non-stationarity · R6 seed-variance (cross-link)
- **VLM** — X1 stage-freeze · X2 projector-only-stage1 · X3 per-group-LR · X4 image-token-truncation · X5 alignment-collapse (cross-link)
- **Pointers** — precision-stability.md, oom-memory.md, gotchas_universal.md, verifying-dl-experiments (skill)

---

## LLM / transformer

### L1 — Padding side: right for causal-LM SFT, **left** for generation/DPO
**Symptom**: a fine-tuned causal LM produces garbage, or DPO/batched-generation logprobs disagree with single-example decoding.
**Root cause**: causal-LM **training** wants **right-padding** (pad lands after content, attention mask zeroes it). Batched **generation/DPO** want **left-padding** — with right-padding the "last real token" position differs per row, so a shared decode step reads pad. TRL's `DPOTrainer` requires `processing_class` padding side `"left"`.
**Fix**: `tokenizer.padding_side="right"` for SFT collation; `"left"` for generation/eval/DPO — set it per phase, not globally. ([HF causal-LM](https://huggingface.co/docs/transformers/tasks/language_modeling), [TRL DPO](https://huggingface.co/docs/trl/dpo_trainer))

### L2 — Loss over prompt + pad tokens dilutes the signal → mask with −100
**Symptom**: SFT "trains" but parrots the prompt / barely follows instructions; loss plausible but flat.
**Root cause**: HF LM loss is `CrossEntropyLoss(ignore_index=-100)` — only `-100` positions are skipped. Leaving the prompt-prefix labels and pad labels as real ids averages the loss over "predict the prompt / predict pad."
**Fix**: set labels to `-100` at **both** the prompt prefix (train only on the completion) and all padding positions. TRL `SFTTrainer` `completion_only_loss` / `DataCollatorForCompletionOnlyLM` does the prefix masking — verify it fired (decode one masked label row). Whether the gradient hits the right tokens is a smoke-target → cross-link **verifying-dl-experiments** (**REQUIRED**). ([gpt2 thread](https://huggingface.co/gpt2/discussions/34))

### L3 — `pad_token` unset → pad error or silent pad-with-token-0
**Symptom**: `ValueError: Asking to pad but the tokenizer does not have a padding token`, or it pads with id 0 (a real token, often `<unk>`/`!`).
**Root cause**: many base LMs (GPT-2, Llama, Mistral) ship no `pad_token`.
**Fix**: `tokenizer.pad_token = tokenizer.eos_token` and `model.config.pad_token_id = tokenizer.pad_token_id`. With right-padding + attention mask, reusing EOS as PAD is safe. If a *new* token is added, `model.resize_token_embeddings(len(tokenizer))` or its id indexes out of range.

### L4 — Sequence packing leaks attention across documents → contaminated training
**Symptom**: throughput jumps after enabling packing, but quality drops vs unpacked; the model "completes" one doc with content from a packed neighbor.
**Root cause**: naive packing concatenates examples into one `max_len` sequence; a vanilla causal mask lets a token in doc 2 attend back into doc 1 — cross-sequence contamination.
**Fix**: **document masking** — emit `position_ids` that reset per sub-sequence + an attention impl that honors boundaries. TRL/HF `DataCollatorWithFlattening` packs into one stream, returns `position_ids`, and sets each example's first label to `-100`; FlashAttention-2 varlen restricts attention within-document. Requires `attn_implementation="flash_attention_2"` — packing without it silently contaminates. ([HF blog](https://huggingface.co/blog/packing-with-FA2), [transformers #31629](https://github.com/huggingface/transformers/pull/31629), [IBM](https://research.ibm.com/blog/hugging-face-training-flash-attention))

### L5 — Fine-tuning past pretrain context without RoPE scaling → garbage past N tokens
**Symptom**: a 4k-context model is incoherent past ~4k at inference even when trained on longer sequences; or long-context finetune won't converge.
**Root cause**: RoPE frequencies are calibrated to the pretrain context; longer positions extrapolate into unseen rotation angles. Linear interp degrades past ~4×; YaRN holds to 16–32×.
**Fix**: set `rope_scaling={"type":"linear"|"dynamic"|"yarn","factor":<target/orig>}` in config and finetune **with scaling active** (`"yarn"` for big jumps, `"linear"` only ≤4×). Train-time vs inference-time `rope_scaling` mismatch is a silent regression. ([RoPE deep dive](https://amaarora.github.io/posts/2025-09-21-rope-context-extension.html), [HF guide](https://medium.com/@leannetan/extending-context-length-with-hugging-faces-transformers-6b04db05b39a))

### L6 — Loss spikes / logit drift in long LM training → z-loss + the precision-layer knobs
**Symptom**: pretraining/long-SFT loss is stable then spikes; in bf16/fp16 it can NaN; logits grow unboundedly over training.
**Root cause**: the softmax normalizer `log Z` drifts from 0 as logits grow → low-precision overflow + gradient instability.
**Fix**: add **z-loss** `1e-4 · log²(Z)` (the PaLM/Gopher coefficient) to pull `log Z` toward 0. The general divergence ladder (warmup, grad-clip, skip-the-batch, qk-norm, bf16-over-fp16) is **references/training/precision-stability.md** P12–P18 (z-loss is P15) — not restated here; this entry is the LM-specific *why z-loss exists*. ([PaLM](https://arxiv.org/abs/2204.02311), [small-scale proxies](https://arxiv.org/abs/2309.14322))

### L7 — Eval perplexity wrong from a wrong mask/stride, not the model
**Symptom**: reported PPL implausible, or differs from a published number on the same checkpoint+data.
**Root cause**: PPL = `exp(mean NLL over scored tokens)`. Including pad/prompt tokens, or a sliding window that double-counts overlap context as scored tokens, corrupts the denominator.
**Fix**: score only non-`-100` positions; for long docs use the HF strided window where overlap tokens are `-100` (context, not scored). Whether the number is comparable across runs is metric-validity → cross-link **verifying-dl-experiments** (**REQUIRED**). ([HF perplexity](https://huggingface.co/docs/transformers/perplexity))

### L8 — SFT / DPO / RLHF expect different dataset schemas; the wrong one trains on nothing
**Symptom**: TRL trainer runs but learns nothing, or errors on a missing column; preference data in an SFT trainer (or vice versa) silently mistrains.
**Root cause**: **SFT** = prompt+completion (train on completion); **DPO/preference** = `{prompt, chosen, rejected}` or conversational messages; **RLHF/PPO** = prompts only + a separate reward model. Conversational data needs the chat template applied.
**Fix**: match trainer to schema; for conversational data confirm the chat template fired (decode one example — look for role tags). Prefer the **explicit-prompt** form `{prompt, chosen, rejected}` over implicit. Recommended order SFT → DPO (DPO from a non-SFT base often underperforms). ([TRL DPO](https://huggingface.co/docs/trl/dpo_trainer))

### L9 — DPO reward margin won't grow / chosen logps crash → beta + ref-model + collapse
**Symptom**: `rewards/margins` ~0 or `rewards/accuracies` ~0.5; or `logps/chosen` and `logps/rejected` both plunge (suppresses everything).
**Root cause**: `beta` controls deviation from the frozen reference — too **small** → policy drifts (implicit KL blows up, degenerate text); too **large** → signal too weak to move the margin. DPO widens the gap mostly by **suppressing the rejected** likelihood, so both logps falling *with a growing margin* is normal; both falling *with a flat margin* is collapse. A lost/absent `ref_model` (some PEFT paths) removes the anchor.
**Fix**: start `beta=0.1`, raise to 0.3–0.5 if text degrades, lower if the margin won't move. Use `learning_rate≈1e-6` (TRL DPO default; `≈1e-5` for LoRA) — too high is the classic collapse. Health signal: `rewards/margins` ↑, `rewards/accuracies` → ~0.7+. With `ref_model=None` TRL uses the initial policy as the frozen reference — concrete check: a frozen reference must yield **identical** logps for a fixed batch across steps; re-score one batch early and late, and if they drift the anchor is being trained (the trap when `ref_model=None` lacks a real frozen copy). Bug-vs-real-effect on the collapse → cross-link **verifying-dl-experiments** (**REQUIRED**). ([TRL DPO](https://huggingface.co/docs/trl/dpo_trainer))

### L10 — Gated/private model 401s mid-Trainer → authenticate BEFORE construction
**Symptom**: `401`/`GatedRepoError` when the Trainer loads a Llama/Gemma/Mistral base despite granted access; or `push_to_hub` can't write.
**Root cause**: the token must be visible to the process **before** the gated `from_pretrained` / Trainer-internal load; setting it after is too late.
**Fix**: push the token first (env/stdin, **never inline the literal**): set `HF_TOKEN`, or `huggingface_hub.login(token=os.environ["HF_TOKEN"])` at the top before any `from_pretrained`. `push_to_hub` needs a **write**-scope token + `hub_model_id` in `TrainingArguments`. Verify `huggingface-cli whoami` before launch — on a metered box a 401 wastes a full reload. Secrets transport → `references/ssh_transport.md` (U34); offline-without-key → gotchas_universal.md U35. ([HF gated](https://huggingface.co/docs/hub/en/models-gated))

---

## Vision (classification / detection / segmentation)

### V1 — Normalization mismatch train↔eval → near-zero accuracy on a "trained" model
**Symptom**: training loss falls but val/test is near-chance; or a fine-tuned backbone is far worse than its pretrained eval.
**Root cause**: pretrain `(mean,std)` (ImageNet `mean=[.485,.456,.406] std=[.229,.224,.225]`) differs between train/eval paths, or one normalizes to `[0,1]` and the other `[0,255]`; or RGB vs BGR (OpenCV loads BGR). A reported CenterNet case got post-norm mean `-115`, std `8` from wrong channel stats.
**Fix**: use the **exact** pretrain normalization, identically in train and eval; match channel order. Print one input tensor's per-channel mean/std — should be ~`N(0,1)`. Remaining gap = real-effect vs this bug → cross-link **verifying-dl-experiments** (**REQUIRED**; input-normalization is a named check). ([why-normalize](https://inside-machinelearning.com/en/why-and-how-to-normalize-data-object-detection-on-image-in-pytorch-part-1/), [tf/models #10778](https://github.com/tensorflow/models/issues/10778))

### V2 — Train-time augmentation applied at eval → unstable/depressed metrics
**Symptom**: eval numbers flicker run-to-run or sit below the training-curve val.
**Root cause**: the random transform pipeline (`RandomResizedCrop`, flip, jitter) is reused for the eval loader, so each pass sees different inputs; or `model.eval()` never called so Dropout/BN stay in train mode.
**Fix**: separate `train_transform` (random) from `eval_transform` (deterministic resize+center-crop+normalize); call `model.eval()` + `torch.no_grad()`. A flickering eval metric is usually this, not the model.

### V3 — Detection mAP=0 despite a falling loss → box-format / label-id / scale mismatch
**Symptom**: detection loss decreases normally but mAP is exactly 0 (or ~0) at every eval.
**Root cause**: a format mismatch the loss tolerates but eval doesn't — (1) box format `cxcywh`/`xywh` vs evaluator's `xyxy`, or normalized `[0,1]` vs absolute pixels; (2) class id off-by-one (0-indexed model vs 1-indexed COCO, 0=background); (3) boxes in resized space matched against original-res GT; (4) eval score threshold so high everything is filtered.
**Fix**: assert the eval pipeline's box format + class indexing, convert explicitly (`torchvision.ops.box_convert`), and visualize 2–3 predicted boxes before trusting the metric. mAP=0 with healthy loss is almost never the model — it's eval glue; the all-zero-metric pattern → cross-link **verifying-dl-experiments** (**REQUIRED**). ([tf/models #10778](https://github.com/tensorflow/models/issues/10778), [bbox formats](https://www.learnml.io/posts/a-guide-to-bounding-box-formats/))

### V4 — Detections vanish after NMS / anchor mismatch → no boxes survive
**Symptom**: raw head outputs look reasonable but final detections are empty or absurdly few.
**Root cause**: NMS IoU too aggressive, score threshold too high, or anchor sizes/ratios don't cover the dataset's object scales (regression targets unreachable).
**Fix**: log pre-NMS vs post-NMS counts; loosen `score_thresh` (~0.05 for eval recall), NMS IoU ~0.5–0.6; for anchor heads run k-means auto-anchor (YOLO `autoanchor`) on GT boxes. Pairs with V3.

### V5 — Segmentation mIoU=0 or NaN → `ignore_index` / label off-by-one
**Symptom**: seg loss trains but mIoU is 0 (or a class NaN); or loss is NaN from step 1.
**Root cause**: label/class-index inconsistency — a void value (commonly `255`) not excluded → treated as a class id ≥ `num_classes` (out-of-range / pollutes IoU); or off-by-one (0=background but labels start at 1, or a `reduce_labels` 0→255 shift applied inconsistently between loss and metric).
**Fix**: set the **same** `ignore_index` in **both** loss and metric — `CrossEntropyLoss(ignore_index=255)` and mIoU mask `(label != 255)`; confirm `label.max() < num_classes` after any shift; apply reduction identically. mIoU=0 with falling loss = all-zero-metric pattern → cross-link **verifying-dl-experiments** (**REQUIRED**). ([torchmetrics #2747](https://github.com/Lightning-AI/torchmetrics/issues/2747), [HF ignore_index](https://discuss.huggingface.co/t/understanding-ignore-index-and-reduce-labels/64587))

### V6 — Severe class imbalance → model predicts only the majority class
**Symptom**: high pixel/sample accuracy but rare classes never predicted; minority recall ~0.
**Root cause**: unweighted cross-entropy is dominated by the majority class; "always predict majority" is the easy degenerate solution.
**Fix**: weight the loss (`CrossEntropyLoss(weight=...)` inverse-frequency) or focal loss (detection); class-balanced sampler. Report **per-class / macro** metrics, never just overall — a high aggregate hiding a collapsed minority is degenerate output → cross-link **verifying-dl-experiments** (**REQUIRED**).

### V7 — Tiny per-GPU batch → BatchNorm stats garbage → unstable/poor training
**Symptom**: detection/seg at batch 1–2 per GPU is unstable or underperforms a larger-batch run.
**Root cause**: BN estimates mean/var over the batch; at batch 1–2 those are noisy and running stats drift.
**Fix**: **SyncBatchNorm** across GPUs (`torch.nn.SyncBatchNorm.convert_sync_batchnorm`) under DDP, or **GroupNorm**, or freeze pretrained BN (`FrozenBatchNorm2d`, as detection backbones do). DDP mechanics → `references/training/distributed-launch.md`.

---

## Diffusion / generative

### DF1 — Loss is low but samples are bad → the canonical "loss ≠ quality"
**Symptom**: the noise-prediction MSE converges nicely but samples are blurry, mode-collapsed, or wrong.
**Root cause**: diffusion loss (predict noise at a random timestep) is **weakly correlated with sample quality** — good average noise-prediction still compounds errors over the sampling trajectory. Real culprits are downstream: missing EMA (DF2), wrong VAE scaling (DF3), train/sample schedule mismatch (DF4/DF6), no/over CFG (DF5).
**Fix**: the textbook **is-the-number-real** fork → cross-link **verifying-dl-experiments** (**REQUIRED**; it owns loss-low-output-bad). Mechanically walk DF2→DF6; the single most common miss is evaluating **raw** weights instead of **EMA** (DF2). ([stability techniques](https://apxml.com/courses/advanced-diffusion-architectures/chapter-4-advanced-diffusion-training/training-stability-techniques))

### DF2 — Sampling from raw (non-EMA) weights → worse than the "same" model
**Symptom**: samples from the just-saved checkpoint look worse than expected; quality jumps with an EMA checkpoint.
**Root cause**: diffusion quality depends heavily on EMA — a running average (`decay≈0.999`, ~1000-update window) that denoises the noisy SGD trajectory. Raw weights are the noisy point estimate.
**Fix**: maintain EMA during training and **sample/evaluate from EMA weights** (`diffusers` `EMAModel`); save both (EMA for inference, raw for resume); verify the eval path actually loaded EMA. Resolves a large share of "DF1" reports. ([EMA](https://medium.com/@thibaut.chauffier/training-diffusion-models-from-scratch-21d7a1f18e9e))

### DF3 — VAE latent scaling wrong → latents off-unit-variance → diffusion can't learn
**Symptom**: latent-diffusion (SD-style) training is unstable / produces noise or blank output; or a swapped-in custom VAE degrades everything.
**Root cause**: the model assumes ~unit-variance latents; the VAE output is multiplied by a calibrated `scaling_factor` (SD v1 = `0.18215`). A wrong/missing factor (or a custom VAE with different stats) leaves latents off-scale.
**Fix**: scale by the VAE's `config.scaling_factor` on encode, divide on decode. For a **custom** VAE, **measure** empirical latent std on a sample and set factor `1/std` — don't inherit `0.18215`. Print latent mean/std before training (~0/~1). ([sd-vae](https://huggingface.co/stabilityai/sd-vae-ft-mse))

### DF4 — Noise schedule / timestep / prediction_type mismatch train↔inference
**Symptom**: structured artifacts, wrong contrast/brightness, or failure at low step counts.
**Root cause**: betas/alphas schedule (linear/cosine/scaled-linear), `num_train_timesteps`, or `prediction_type` differs between training and the inference scheduler; e.g. trained on `epsilon`, sampled as `v`/`x0`.
**Fix**: keep the **same** `beta_schedule`, `num_train_timesteps`, `prediction_type` in both — in `diffusers` build the inference scheduler from the training `scheduler.config`. Mismatched `prediction_type` is a silent quality killer.

### DF5 — Conditioning never dropped during training → CFG is a no-op / model ignores prompt
**Symptom**: changing `guidance_scale` at inference barely changes output, or the model ignores conditioning.
**Root cause**: CFG needs a learned **unconditional** path, trained by randomly replacing the condition with a null embedding for a fraction `p_drop` of examples. No dropout ⇒ no usable unconditional estimate ⇒ CFG no-op.
**Fix**: during training drop the condition `p_drop≈0.1` (replace with null embedding). At inference use `guidance_scale` ~5–15 for T2I (higher = more prompt adherence, lower diversity). Model-ignores-input is a verifying-dl-experiments concern (**REQUIRED**); the training-side root cause is the missing dropout. ([CFG theory](https://apxml.com/courses/advanced-diffusion-architectures/chapter-4-advanced-diffusion-training/classifier-free-guidance-theory))

### DF6 — Sampler ≠ model: a sampler config that doesn't match the trained objective
**Symptom**: switching samplers wildly changes quality; one sampler gives noise.
**Root cause**: samplers assume a `prediction_type` + schedule (DF4); ancestral/SDE vs deterministic ODE interact differently with the trained noise level, and step count below the sampler's stable range degrades.
**Fix**: validate the checkpoint with the **reference** sampler/step-count from its recipe first, then explore; confirm `prediction_type` matches; for few-step use DPM-Solver++ not plain DDPM. "New sampler → bad samples" is a config mismatch, not a model regression.

### DF7 — Uniform-timestep loss weighting → blurry samples → Min-SNR weighting
**Symptom**: samples are systematically blurry / low-detail despite long training.
**Root cause**: uniform loss weight over-weights high-noise (easy) steps relative to low-noise steps that carry fine detail; the gradient is dominated by the easy regime.
**Fix**: apply **Min-SNR-γ** weighting (γ≈5) so low-noise steps get their share; `diffusers` scripts expose `--snr_gamma`. Compounds with DF2/DF3 — fix these details together, not in isolation. ([Min-SNR](https://arxiv.org/abs/2303.09556))

---

## RL

### R1 — Reward collapses / output degenerates mid-training
**Symptom**: average reward suddenly drops, responses get short/repetitive or refuse, length collapses.
**Root cause**: reward hacking / over-optimization — the policy exploits the reward model's blind spots and drifts far, often after the ratio gets clipped much more and approximate KL spikes.
**Fix**: strengthen the KL penalty (raise the KL coefficient), lower LR (`≈1e-6` for LLM PPO), reduce PPO update epochs/batch, add a length penalty if length is gamed. Watch reward **and** KL together — a reward jump with a KL spike is hacking, not progress. Bug-vs-real-effect on the collapse → cross-link **verifying-dl-experiments** (**REQUIRED**; it owns collapse/degenerate-output). ([PPO instability](https://apxml.com/courses/rlhf-reinforcement-learning-human-feedback/chapter-4-rl-ppo-fine-tuning/troubleshooting-ppo-instability), [N-details RLHF](https://huggingface.co/blog/the_n_implementation_details_of_rlhf_with_ppo))

### R2 — KL to the reference blows up → policy runs away
**Symptom**: KL grows without bound; generations go incoherent; "diverges" though loss isn't NaN.
**Root cause**: the KL penalty is too weak (or adaptive-KL target too loose); aggressive updates push the policy far, and a huge KL term can dominate the objective so the model optimizes the penalty instead.
**Fix**: use an **adaptive KL controller** with a target (e.g. 6), or a fixed coefficient large enough to hold KL bounded; clip the ratio (`cliprange≈0.2`); cap update epochs. Confirm the frozen reference isn't being updated. Same axis DPO's `beta` controls (L9). ([KL penalty role](https://apxml.com/courses/rlhf-reinforcement-learning-human-feedback/chapter-4-rl-ppo-fine-tuning/kl-divergence-penalty-role))

### R3 — Un-normalized rewards/advantages → unstable gradients → whiten
**Symptom**: high-variance, brittle training; small reward-scale changes destabilize everything.
**Root cause**: raw reward/advantage magnitudes vary wildly across batches; PPO gradients are scale-sensitive.
**Fix**: **whiten** advantages per minibatch (subtract mean, divide by std) — the standard PPO trick, more stabilizing than plain reward normalization (double-normalizing reward **and** advantage is often redundant). For classic-control RL, normalize **observations** with a running mean/std (`VecNormalize`) — un-normalized obs is a top cause of failure to learn. ([impl matters](https://openreview.net/pdf?id=rxEmiOEIFL), [whitening redundancy](https://liujch1998.github.io/2023/04/16/ppo-norm.html))

### R4 — Replay buffer / normalization state not checkpointed → resume behaves like cold start
**Symptom**: an off-policy run (DQN/SAC) resumed from checkpoint acts like a cold start; or a normalized env's stats reset on resume and performance tanks.
**Root cause**: the replay buffer and the running obs/reward normalization stats are part of training **state** but are often omitted — restoring only weights loses them.
**Fix**: checkpoint+restore the replay buffer (or accept warmup) **and** the `VecNormalize`/running-stats alongside weights. General checkpoint-everything-stateful (optimizer/scheduler/RNG/step) → `references/training/checkpoint-resume.md`; on spot boxes losing buffer/normstats every preemption silently degrades learning → `references/spot-resilience.md`.

### R5 — Non-stationarity treated as a bug → chasing a moving target
**Symptom**: value/critic loss won't converge to zero; metrics oscillate even when "working."
**Root cause**: RL targets are **non-stationary** — the policy changes the data distribution and bootstrapped targets move. A value loss that never hits zero is expected.
**Fix**: judge by **return/reward trend**, not critic-loss-to-zero; stabilize with a slow target network (DQN/SAC) and GAE. Don't "fix" non-convergent critic loss by shrinking LR to zero — that just stops learning.

### R6 — A single seed's result is not the result → RL variance is huge
**Symptom**: identical hyperparameters + different seeds give non-overlapping curves; an ablation "win" disappears on re-run.
**Root cause**: extreme seed variance from algorithm, policy sampling, and environment stochasticity (comparing 5-run point estimates yields >50% Type-I error).
**Fix**: report aggregate over **≥5 seeds** (more for noisy envs), use **IQM** (interquartile mean) over mean/median, show CIs. A single-seed delta is not a result — squarely **verifying-dl-experiments** territory (bug-vs-real-effect, seed discipline; **REQUIRED**). ([Henderson](https://arxiv.org/pdf/1708.04133), [how-many-seeds](https://arxiv.org/pdf/1806.08295))

---

## Multimodal / VLM

### X1 — Wrong freeze schedule across stages → alignment never forms or the LLM is wrecked
**Symptom**: a LLaVA-style VLM doesn't ground on images (ignores visual tokens), or text quality collapses after multimodal finetune.
**Root cause**: VLM training is **staged**, each stage freezing different towers. Stage 1 (alignment): freeze vision encoder **and** LLM, train **only the projector**. Stage 2 (instruction tuning): unfreeze LLM **and** projector, keep vision encoder frozen. Training the LLM in stage 1 (before the projector aligns) corrupts it; never unfreezing it means it can't use the visual tokens.
**Fix**: set `requires_grad` per tower per stage per the recipe; print trainable-param counts at each stage start to confirm the freeze took. "Ignores its input image" is model-ignores-input → cross-link **verifying-dl-experiments** (**REQUIRED**). ([LLaVA recipe](https://rohitbandaru.github.io/blog/Vision-Language-Models/))

### X2 — Projector trained from scratch with the LLM hot → unstable stage-1
**Symptom**: stage-1 alignment loss is unstable or the projector output is garbage.
**Root cause**: the projector (linear or 2-layer MLP, often concatenating groups of vision tokens into the LLM embedding space) is **randomly initialized**; flowing gradients into the LLM through an un-aligned projector destabilizes both.
**Fix**: stage 1 trains the projector **alone** against a frozen LLM so it learns the LLM's embedding space first; only then (stage 2) unfreeze the LLM. Confirm projector output dim == LLM hidden size (else a silent shape-broadcast bug). ([projector adapter](https://rohitbandaru.github.io/blog/Vision-Language-Models/))

### X3 — One global LR for all towers → vision encoder drifts or LLM underfits
**Symptom**: a shared LR either over-updates the pretrained vision encoder (forgets visual features) or leaves projector/LLM undertrained.
**Root cause**: towers are at different maturities — a pretrained vision encoder needs a tiny LR (or freeze), a fresh projector a larger one, the LLM in between. LLaVA: ~`1e-3` projector in alignment, `2e-5` LLM in stage 2.
**Fix**: **parameter groups** with per-group LRs (`AdamW([{"params":proj.parameters(),"lr":1e-3},{"params":llm.parameters(),"lr":2e-5}])`), or freeze the vision encoder. Log each group's LR to confirm. ([LLaVA LRs](https://rohitbandaru.github.io/blog/Vision-Language-Models/))

### X4 — Sequence truncation drops image tokens → shape error or silent loss of vision
**Symptom**: VLM training errors on image-token-count mismatch, or intermittently ignores images on long examples.
**Root cause**: image placeholders expand into many tokens (hundreds per image); a `max_length` truncation cuts them, breaking the image-token ↔ feature alignment.
**Fix**: set `max_length=None` (or large enough never to truncate image tokens) for VLM trainers, or verify truncation never removes placeholders across the whole dataset. Count image tokens vs expected per example as a smoke check. ([TRL VLM note](https://huggingface.co/docs/trl/dpo_trainer))

### X5 — Modality alignment collapse: the LLM answers from text priors, not the image
**Symptom**: the VLM gives plausible answers that ignore the actual image content (language-prior shortcut).
**Root cause**: weak visual signal (bad projector, frozen-everything, too little alignment data) lets the LLM fall back on its language prior — a degenerate "ignore the input" solution that still lowers loss on text-predictable answers.
**Fix**: the mechanical fixes are X1–X3 (correct freeze/projector/LR so the visual path contributes). Whether it's genuinely grounding vs shortcutting is **verifying-dl-experiments** (model-ignores-input/degenerate-output; **REQUIRED**) — probe with image-perturbation / counterfactual-image tests, which that skill owns.

---

## Pointers — domain-adjacent mechanics catalogued elsewhere

- **Precision / NaN / loss-spike / z-loss / grad-clip** (L6's general ladder) → `references/training/precision-stability.md`.
- **OOM, activation checkpointing, LoRA/QLoRA, FSDP/ZeRO, seq-len memory** → `references/training/oom-memory.md`.
- **Dataloader starvation, GPU-util%, NVMe staging, tar-sharding** → `references/gotchas_universal.md` (U8, U21, U24, U25).
- **DDP/FSDP launch, SyncBatchNorm under DDP, NCCL** → `references/training/distributed-launch.md`, `references/multinode.md`.
- **Checkpoint-everything-stateful + atomic resume** (R4's general form) → `references/training/checkpoint-resume.md`, `references/spot-resilience.md`.
- **"Runs but won't learn": loop wiring, optimizer/LR/weight-decay, loss-function & label form, freezing/BN drift, dataloader correctness** → `references/training/convergence-debugging.md`, `references/training/data-pipeline.md`.
- **Is the metric/model correct** (collapse, leakage, all-zero metrics, model-ignores-input, seed discipline) → **verifying-dl-experiments** (**REQUIRED** — owns every "bug vs real effect" fork above).
