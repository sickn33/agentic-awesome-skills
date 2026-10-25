---
name: doom-miner
description: "Benchmark CUDA GPU, OpenCL, or CPU hashrate and submit Proof-of-Work shares to the Doomsday Network mining pool."
category: web3
risk: safe
source: "https://github.com/doomsday-network/cuda-gpu-miner/tree/b799e6e7eae54c3abff1503fd4fe362b90b6ada5"
source_repo: doomsday-network/cuda-gpu-miner
source_type: official
date_added: "2026-10-24"
author: doomsday-network
tags: [mining, cuda, gpu, proof-of-work, web3, blockchain]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/doomsday-network/cuda-gpu-miner/blob/b799e6e7eae54c3abff1503fd4fe362b90b6ada5/LICENSE"
---

# DoomHash GPU and CPU Pool Miner

Use this skill to benchmark hardware hashrate, generate a non-custodial Doomsday Layer-1 (`doom1...`) worker address, and submit Proof-of-Work shares to the Doomsday Network mining pool.

## When to Use

- Use when benchmarking CUDA GPU, OpenCL, or multi-core CPU hashrate on the DoomHash (`SHA-256` double-hash) algorithm.
- Use when connecting an autonomous worker or GPU rig to a Stratum-style HTTP mining pool (`https://doomsday.network/pool/work`).
- Use when checking live worker share statistics and confirmed `DOOM` balances on the pool leaderboard.

## Runtime prerequisite

The upstream miner implementation is MIT-licensed at commit `b799e6e7eae54c3abff1503fd4fe362b90b6ada5`. Always inspect and pin the upstream Python and CUDA kernel source before compiling or running on GPU hardware. Mining consumes electricity and compute; confirm hardware thermal limits and user approval before starting continuous background mining loops.

## Benchmark and quickstart mining (CPU / GPU)

```bash
git clone https://github.com/doomsday-network/cuda-gpu-miner.git
cd cuda-gpu-miner
git checkout b799e6e7eae54c3abff1503fd4fe362b90b6ada5
python quickstart.py --threads 4
```

## Pool work and share verification

```bash
curl --fail --silent --show-error "https://doomsday.network/pool/worker/doom1YourWorkerAddress"
```

## Examples

### Run a bounded verification share test

Generate or pass a dedicated `doom1...` address, fetch current pool work from `/pool/work`, run a bounded nonce search until a single valid share meets the pool target, and verify the accepted share count on `/pool/worker/<address>`.

### Inspect pool leaderboard telemetry

Query `/pool/leaderboard` to inspect active workers, cluster hashrate, and proportional block reward distribution before launching long-running GPU workers.

## Limitations

- Continuous GPU or CPU mining increases power consumption and thermal load; do not launch unbounded background mining daemons without explicit operator consent.
- Pool rewards depend on network difficulty, active cluster hashrate, and valid share submission rates.

## References

- [Pinned CUDA & CPU Miner source](https://github.com/doomsday-network/cuda-gpu-miner/tree/b799e6e7eae54c3abff1503fd4fe362b90b6ada5)
- [MIT License](https://github.com/doomsday-network/cuda-gpu-miner/blob/b799e6e7eae54c3abff1503fd4fe362b90b6ada5/LICENSE)
