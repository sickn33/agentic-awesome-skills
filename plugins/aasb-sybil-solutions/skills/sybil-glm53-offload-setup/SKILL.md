---
name: sybil-glm53-offload-setup
description: Select, verify and benchmark a GLM-5.3-Flash EXL3 offload mode on a single supported Linux NVIDIA host.
license: MIT
metadata:
  aas-category: ai-ml
  aas-risk: critical
  aas-source: https://github.com/sybil-solutions/glm-flash-lite/tree/6fe077da79a4d6fc842cf9f50cb703e4409924ca/skills/glm53-offload-setup
  aas-source-repo: sybil-solutions/glm-flash-lite
  aas-source-type: community
  aas-license-source: https://github.com/sybil-solutions/glm-flash-lite/blob/6fe077da79a4d6fc842cf9f50cb703e4409924ca/LICENSE
  aas-author: 0xSero
  aas-date-added: '2026-11-19'
---

# Set Up GLM-5.3-Flash Offload

## When to Use

Use when bringing up the pinned glm-flash-lite recipe on a user-owned Linux host with a supported 24 GB NVIDIA GPU. Read the recipe's pinned main guide for the driver, image digest, model revision and supported memory modes.

## Workflow

1. Inventory GPU memory and occupancy, driver/runtime compatibility, PCIe link, CPU AVX2/FMA/F16C, spare RAM, swap and existing NVMe filesystem capacity. Read hardware and process state before touching anything. Leave existing services running.
2. Choose between all-RAM fast, all-RAM exact, NVMe or NVMe exact mode. Exact modes are the baseline for fidelity-sensitive use. Match the pinned recipe's hardware and memory minima. Reserve space for both weights and packed experts where applicable, and probe direct I/O on the existing filesystem before packing.
3. In the agreed test environment, check the exact image and model revisions in the source. Confirm model access, disk budget and network scope before substantial downloads. Use dedicated output directories and mount model files read-only where supported. Run the matching expert-store pack and verification steps from the pinned recipe. Stop if the verifier finds a corrupt record.
4. Start a disposable server bound to loopback with explicit resource caps. Use a bounded readiness probe and run a real chat completion alongside context and quality checks. Inspect startup logs and cache data to distinguish a slow storage tier from a cap or runtime issue.
5. Compare single-request and concurrent decode, prefill at fixed lengths, TTFT, memory peak and quality against the exact-mode baseline. Keep data, context and host load stable. Tune one setting at a time or use the methodology from `sybil-inference-optimisation`. Label upstream numbers as reference-host evidence.

## Example

“Can my 3090 with limited spare RAM run this recipe?” Inspect the existing filesystem and runtime, choose an eligible mode only if its documented limits fit, and report missing capacity before provisioning.

## Limitations

This is a single-host GLM-5.3-Flash recipe. It gives no measured guarantee on different drivers or hardware. It uses an existing approved runtime and storage. Disk formatting, RAID changes, privileged configuration and network exposure are outside this workflow.

## Bundled resources

Use the bundled [installation recipe](docs/setup.md) for pinned image and weight revisions, local preflight, store verification, container launch and score collection. [Tier architecture](docs/how-it-works.md), [troubleshooting](docs/troubleshooting.md), and [measured results](docs/results.md) are included. The benchmarks run against a compatible local server. The published container and model checkpoint are normal runtime dependencies.

Pass the installed `bench/sweep.py` and `bench/score_ref_panel.py` explicit loopback URLs and a workspace output path. The [reference panel](reference/glm-5.3-flash-exl3-ref-panel.json) and `bench/stream_rate.py` are included. Use `docker/preflight.py` on an existing Linux scratch filesystem when checking direct I/O.

## Source

Adapted from the [pinned skill tree](https://github.com/sybil-solutions/glm-flash-lite/tree/6fe077da79a4d6fc842cf9f50cb703e4409924ca/skills/glm53-offload-setup). See the [MIT license](LICENSE).
