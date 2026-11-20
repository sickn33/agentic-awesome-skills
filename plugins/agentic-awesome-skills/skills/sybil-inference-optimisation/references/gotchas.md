# Engine and hardware gotchas

These were found the hard way. Versions matter; re-check on newer releases.

## General

- **A second engine on the same GPU,** or a stray benchmark still running, silently halves results or crashes both. Lock the GPU (`scripts/queue.sh`).
- **Correlate "device lost" crashes with the kernel log before blaming code.** Arc Pro B70 crashes turned out to be PCIe link drops: AER replay timeouts, then link down, 8 times in 3 days. They also spread to other devices on the same root complex.
- **Forced container stops during a long prefill** caused an Intel xe GPU page fault. Always abort, drain, then stop with a timeout.
- **Very large images can crash vision encoders.** Cap the longest edge.
- **Gateway or proxy timeouts** (often 600 s) cut off long-context tests. Test against the engine directly. Retry only on dropped connections, never on timeouts.
- **Shells and agents:** `pkill -f pattern` can kill the shell that runs it, and `pgrep -f` can wait on itself. Kill by PID.
- **Agent restarts** kill child processes. Detach long jobs (`setsid nohup … & disown`) and make them resumable.

## vLLM

- Prefix caching may be off by default for hybrid (SSM/GDN) models. Enable it and check `cached_tokens`.
- On Intel XPU, only `FULL_DECODE_ONLY` graphs worked. Piecewise capture failed with `UR_RESULT_ERROR_OUT_OF_RESOURCES`, and so did dynamic per-batch draft length, which forces piecewise graphs.
- With MTP, streaming sends several tokens per chunk. Use usage stats for token counts.
- mmap loading can be very slow; use `--safetensors-load-strategy eager`.
- On unified memory, `gpu_memory_utilization` is compared against free host RAM, and values near 0.985 are refused.

## SGLang

- **Speculative-decoding acceptance counters** update only when a request finishes.
- **Hybrid models need `--max-mamba-cache-size`** large enough for N requests plus speculative state. Otherwise concurrency silently stays at 1. A value of 4 was too small for even one request with speculation.
- **The XPU backend (0.5.x) had several bugs, patched in a plugin:**
  - verify was greedy-only at any temperature;
  - a stale GDN wrapper;
  - CUDA-only guards on mamba scatter;
  - missing fp8 descale in extend;
  - an fp8 Q cast in decode.
  - Prefill graphs are not supported by the XPU attention backend.
- **`--num-continuous-decode-steps` had no effect** with speculative decoding on.
- **Shared-expert fusion** is only enabled for some backends.
- **Large prefill-graph captures (2,048 tokens) used 6.3 GB and crashed;** capture up to 256–512.

## llama.cpp / GGML

- Quantized KV (q8_0) can be much slower on models with few KV layers.
- MTP/draft support can fall below the no-draft baseline on hard prompts.
- Check work-group sizes in backend kernels: a work-group of 1 in a SYCL copy kernel cost 7.8×.

## ExLlama / TabbyAPI

- On ROCm, HIP graphs leaked until crash. Disabling them was stable at 115.6 tok/s.
- A busy host CPU costs GPU decode on laptops: 107 → 75 tok/s.

## Hardware

- **Intel Xe (Arc), PyTorch XPU:**
  - `torch.topk` segfaulted on wide inputs (above about 2–8K). Use staged top-k or Gumbel-max with `multinomial`.
  - Split-K partial stores need uncached stores plus a clean fence on Xe3.
  - `UR_RESULT_ERROR_OUT_OF_RESOURCES` means too-large or piecewise graphs.
- **Intel integrated GPUs and other unified-memory devices:** GPU memory is invisible to cgroups; see `methodology.md`. Battery and power profiles move results 8–10%.
- **Apple silicon:** bandwidth-poor chips (base M-series) lose with deep speculation. The GPU wired-memory limit (`iogpu.wired_limit_mb`) caps usable memory.
- **NVIDIA Ampere has no FP8 units;** INT4 (AWQ/GPTQ/EXL) wins when bandwidth-bound.
- **Hybrid GDN/SSM state dtype:** fp16 state produced `!!!` garbage on one SGLang XPU build, while another engine stored it in fp16 without issue. Verify output after changing the state dtype.
