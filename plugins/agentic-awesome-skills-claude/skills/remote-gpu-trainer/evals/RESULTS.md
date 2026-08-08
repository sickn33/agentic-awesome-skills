# Agentic navigation results (Tier 2)

Each row: a **fresh agent** was given the skill and one scenario `prompt` from
[`cases.jsonl`](cases.jsonl), told to navigate **from SKILL.md only** (follow the documented
routing, no blind grep), and graded on whether it reached a correct, specific answer covering the
scenario's `must_cover` points within ~2 hops.

**Methodology / honesty caveats** (so a reader can weight this correctly):
- Runs to date were gathered **during development**, on the development model (Claude Opus class),
  as subagent dispatches — not an independent third party, and **not yet** the
  Haiku/Sonnet/Opus sweep Anthropic's best-practices recommend. Treat as *author-run smoke evals*,
  not a neutral benchmark.
- These prove **routing + retrieval** inside the skill, not the truth of platform facts on a live
  box (only AutoDL is battle-tested — see the repo README's "Verification status").
- Single run per scenario; no adversarial/perturbed phrasings yet.

## Results — 2026-06

| Scenario | Verdict | Hops | Navigation path observed |
|---|---|---|---|
| convergence-frozen-resnet | **PASS** | 1 | SKILL.md "When training breaks" → `convergence-debugging.md` O1 (overfit-one-batch) + O2 (params-not-in-optimizer) + O17 (frozen-still-in-optimizer) + O18 (frozen-BN drift) + O6 (Adam vs AdamW) |
| data-worker-rng-dup | **PASS** | 1 | SKILL.md "When training breaks" → `data-pipeline.md` DP1 (numpy fork-RNG dup; worker_init_fn fix) |
| oom-on-step-2 | **PASS** | ≤2 | SKILL.md "When training breaks" → `oom-memory.md` (fit-it ladder + OOM-at-step-2 / Adam lazy state) |
| nccl-one-rank-hang | **PASS** | ≤2 | SKILL.md → `distributed-launch.md` (desync toolkit D19 / one-rank-diverged D20) |
| diffusion-loss-low-samples-bad | **PASS** | ≤2 | SKILL.md → `by-domain.md` diffusion section (DF1 loss≠quality, DF2 EMA weights) |
| nan-loss-spike-bf16 | **PASS** | ≤2 | SKILL.md "When training breaks" → `precision-stability.md` P8/P12/P15 (NaN-origin + warmup spike + z-loss) |
| resume-epoch-reset | **PASS** | 1 | SKILL.md → `checkpoint-resume.md` C1/C12/C14 (save FULL state: epoch/step/scheduler/RNG/scaler) |
| throughput-gpu-starved | **PASS** | ≤2 | SKILL.md → `throughput-profiling.md` T1/T4 (GPU-bound vs data-bound; num_workers/prefetch) |
| runpod-spot-resume-teardown | **PASS** | ≤2 | SKILL.md → `profiles/runpod.md` §4/§5 → `spot-resilience.md` → `checkpoint-resume.md` C3 |
| vastai-teardown-billing | **PASS** | ≤2 | SKILL.md → `profiles/vastai.md` §5 → `lifecycle_checklist.md` Phase 5 |
| autodl-inode-disk-full | **PASS** | ≤2 | SKILL.md → the inode/disk gotcha (principle #5 / `gotchas_universal.md` U7) |
| china-hf-download-stall | **PASS** | ≤2 | SKILL.md → `references/china-network.md` (HF_ENDPOINT=hf-mirror, hf_transfer caution) |
| lambda-stop-vs-terminate | **PASS** | ≤2 | SKILL.md → `profiles/lambda.md` (no stop state; terminate irreversible) |
| autodl-first-contact-15day | **PASS** | 1 | SKILL.md principle #10 → `profiles/autodl.md` Surface block + AD-DANGER (关机 auto-releases after 15 days) |

**Summary: 14/14 scenarios routed correctly** (9 via workflow `w2r1t7mm9`, 5 standalone), each to a
correct + specific answer within ≤2 hops. The Tier-1 structural check (`run_evals.py`) runs all 14
cases and is the regression guard kept green in CI.

## Known gaps (what these results do NOT yet cover)

- No multi-model sweep (Haiku/Sonnet/Opus) — required to claim the best-practices testing bar.
- No adversarial/paraphrased prompts (e.g. the user describes the symptom in non-canonical words).
- No live-platform validation of the facts the agent retrieves (the verification-status caveat).
