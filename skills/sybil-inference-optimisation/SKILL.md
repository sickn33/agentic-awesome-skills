---
name: "sybil-inference-optimisation"
description: "Benchmark and tune local LLM serving against a measured ceiling with controlled comparisons, resource limits and quality gates."
category: "ai-ml"
risk: "critical"
source: "https://github.com/sybil-solutions/inference-optimisation-skill/tree/fda968e7fc1996aa23c67139c755fe541c9d4be0/skills/inference-optimisation"
source_repo: "sybil-solutions/inference-optimisation-skill"
source_type: "community"
license: "MIT"
license_source: "https://github.com/sybil-solutions/inference-optimisation-skill/blob/fda968e7fc1996aa23c67139c755fe541c9d4be0/LICENSE"
author: "Sybil Solutions contributors"
date_added: "2026-11-19"
---

# Optimise Local LLM Inference

## When to Use

Use when a local vLLM, SGLang, llama.cpp, MLX or comparable server misses a throughput, latency, startup or context target.

## Workflow

1. Record the hardware, driver, engine, model and quantization. Define the permitted memory cap, context size, concurrency, quality trade-offs and stop condition. Use an idle, authorized host and an existing isolated endpoint with synthetic prompts.
2. Establish baselines for decode at concurrency 1 and the intended concurrency, prefill at several lengths, time to first token, cold and warm startup, and peak memory. Count tokens with the target tokenizer and separate cache hits from cold prefills.
3. Estimate decode capacity as measured effective bandwidth divided by bytes read per committed token. Include active expert weights, the output head, KV reads and, for speculation, draft cost and accepted length. Estimate prefill from measured compute throughput divided by per-token compute, including attention at the tested length. These estimates model bottlenecks and depend on cache residency and contention.
4. Select one lever that addresses the largest measured gap. Try persistent startup caches, decode graph capture, a small sweep of speculative draft lengths, KV sizing at target concurrency, or prefill chunk sizes before editing kernels. Record the exact configuration, sampled inputs and reason for each run in a local ledger.
5. Alternate control, candidate, control. Use identical input and run conditions with at least six decode samples per condition. Repeat surprising results. Accept an improvement only if it exceeds both neighboring controls and repeat noise without violating the target's other tolerances. Use the fixture scheduler to cancel bounded runs and drain only servers started for this task.
6. Recheck functional completions, exact long-context retrieval at representative lengths, concurrent soak, and greedy token equivalence for changes described as lossless. Report baseline, candidate, estimated ceiling, medians, configuration and failed gates. Inspect quality with suitable task samples for lossy changes.

## Example

“Increase single-user decode while retaining 32k context.” Compare six fixed greedy samples on each side of a graph-capture change, then re-run context retrieval and memory checks on the winning configuration.

## Limitations

Results depend on the tested model, accelerator and load. Use fixed timeouts and local logs. Starting jobs or changing profiles requires the authorized test environment. Publication, external endpoints and model downloads need separate scope.

## Bundled resources

Resolve `SKILL_DIR` to the directory of this installed skill, independent of the project working directory.

- Calculate throughput and memory estimates locally with `python3 "$SKILL_DIR/scripts/ceiling.py" "$SKILL_DIR/examples/ceiling-ornith-b390.json"`. These values describe the included example.
- Copy [the existing-server fixture](examples/config-existing-server.json) into the experiment directory, set a project-owned loopback URL and the model, then use `python3 "$SKILL_DIR/scripts/bench.py" run config.json`. You can run `bash "$SKILL_DIR/scripts/queue.sh" ctl-a cand ctl-b` on Linux with `flock` from a run directory containing the corresponding configs.
- The [Docker example](examples/config-sglang-docker.json) is a template. Substitute reviewed launch and stop arguments and a disposable unique container before use. The harness executes those arrays. Use explicit `["bash", "/absolute/installed/skill/scripts/mem.sh", "your-container"]` for an authorized memory probe. Do not elevate permissions or touch an unrelated server.
- Use the included [ceilings](references/ceilings.md), [method](references/methodology.md), [levers](references/levers.md), [platform notes](references/gotchas.md), and [qualification](references/publishing.md).

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/inference-optimisation-skill/tree/fda968e7fc1996aa23c67139c755fe541c9d4be0/skills/inference-optimisation). See the [MIT license](LICENSE).
