# Levers, by area, with measured evidence

Each lever is tagged:

- **[G]**: general.
- **[S: stack]**: seen on one stack; check whether it applies to yours.

The numbers come from real hill-climbs (see the README's results). Use them as priors, not promises.

## Startup and TTFT

- **[G] Persist every JIT, compile and autotune cache across restarts:** the SYCL/NEO/Triton/Inductor caches, the DeepGEMM cache and `~/.cache`.
  - Arc B390 / SGLang: 113 s → 43 s.
  - 4× RTX PRO 6000 / vLLM: about 22 min → 7 min on later starts.
- **[S: vLLM] mmap weight loading ran at about 60 MB/s on some filesystems:** 26 min for 27 GB. `--safetensors-load-strategy eager` brought it down to seconds.
- **[G] Use one compile worker** (`TORCHINDUCTOR_COMPILE_THREADS=1`) on memory-tight machines. Compile workers held about 6 GiB of transient memory.
- **[G] TTFT for short prompts is mostly scheduling and one forward pass.** Look at tokenizer, chat-template and sampler overheads before kernels.

## Decode

- **[G] Decode graphs (CUDA/XPU graph capture) are the first lever.**
  - Arc Pro B70: 14.4 → 28.4 tok/s.
  - SGLang XPU: 16 → 32 tok/s.
  - vLLM INT4: 11 → 27 tok/s.
- **[G] Speculative decoding, measured per step.**
  - **Prune the draft LM head's vocabulary** to the most-used blocks. The target still verifies against the full vocabulary, so output is unchanged.
    - B70 / vLLM: c1 37.9 → 48.2 (+27%), with 512 of 1,940 blocks (98.6% coverage).
    - B390 / SGLang: +14%, with 256 blocks.
  - **The best draft length depends on concurrency and context:**
    - B70: k=4 won at c1, k=3 at c4, k=2 at c16 (+11%, because more streams fit).
    - B390 at 128K: 1 draft ran 29.6 tok/s vs 15.5 for 3 drafts, although 3 drafts won at short context.
    - Sweep the draft length per workload.
  - **Some MTP heads are weak beyond depth 1.** Ornith-1.5 accepted ~14% at depth 2, so its best was one draft. Measure acceptance per depth.
  - **On bandwidth-poor devices or hard prompts, speculation can lose:**
    - Apple M4: 6.35 → 3.25 tok/s with 3 MTP drafts.
    - llama.cpp MTP on hard prompts: 36.7 vs 45.4 without it.
  - **Verify must use decode-style attention.** Sending k-query verifies to the prefill kernel made step time grow 3.5 ms per 1K tokens of context (47 → 104 ms at 16K). Running each verify row as a decode query: SGLang B70 c1 went 75.7 (vLLM) → 82.6 tok/s.
  - **Keep sampling on the GPU.** A CPU sampler added about 3 ms per step: +10% c1 on B390 when moved to the GPU.
- **[G] Use fewer bytes per weight when bandwidth-bound.** Pick a quant format the hardware decodes natively. On an RTX 3090, AWQ-INT4 beat FP8 because Ampere has no FP8 units.
- **[G] Kernel thread counts and split-K tuned for one card are wrong for another.**
  - B70: 4096 → 1024 threads took code c1 from 48.5 to 56.9.
  - B390: 256 threads was a small win over defaults copied from a larger card.
- **[G] Under graphs, fusing small kernels rarely helps.** Three separate fusion attempts on B390 (fused GEMV, shared-expert fusion, fold attention) were correct and gave 0% gain. The time is inside the big kernels.
- **[G] KV cache dtype is a trade.**
  - FP8 KV halves memory, but halved attention throughput on one flash-attention kernel (39 vs 69–74 TFLOPS). Dequantizing blocks to fp16 with an LSE merge recovered it: 128K prefill 760 → 1,059 tok/s.
  - On a model with KV in only 16 of 64 layers, q8_0 KV went from 45.4 to 27.0 tok/s on llama.cpp.

## Concurrency and memory

- **[G] For hybrid SSM/GDN/Mamba models, state slots and page size cap concurrency, not KV tokens.**
  - SGLang refused to schedule more than 1 request until `--max-mamba-cache-size` was raised.
  - Keeping vLLM's exact 1,600-token block instead of rounding to 2,048 raised c16 from 10 to 14 streams, +17% aggregate.
- **[G] Size the KV pool to N × context deliberately, and prove it with a concurrent full-length soak.** B390: 264K → 1.05M tokens (4 × 256K); the soak found 4/4 needles at a 36.8 GiB peak.
- **[G] Enable prefix caching explicitly** and confirm `cached_tokens` > 0. Some engines disable it silently for hybrid models.
  - 66K-token turn-2 TTFT: 36 s → 0.45 s.
  - 32K-token turn-2 TTFT: 29 s → 0.95 s.
- **[G] Memory outside the framework allocator causes OOMs.** Examples: a library scratchpad, a new primitive per shape, allocator fragmentation. Route scratchpads through the allocator, pad shapes to a few buckets, and use `expandable_segments:True`.
- **[G] Leave headroom.** Over-allocating device memory on Arc livelocked the machine; keep ≥1.5 GB free. vLLM on unified memory checks `gpu_memory_utilization` against free *host* RAM.

## Prefill

- **[G] Chunk size trades prefill throughput against decode stalls for other users.**
  - B70: 8,192 → 2,048 cut the worst stall from 7.1 s to 1.95 s for −4% decode; 4,096 was the compromise.
  - B390: 1,024 → 4,096 combined with INT8 GEMMs was +50% at 32K.
- **[G] Swap in a faster attention library before writing one.**
  - oneDNN fused SDPA: +7–18% over FA2 at 4K–254K.
  - A hand-written flash attention reached only 48 vs 61 TFLOPS.
- **[G] Int8/fp8 prefill GEMMs, a labelled lossy trade.** In a Hadamard-rotated domain, per-row scales suffice. All linears ran 1.89× faster with NLL +0.17% and top-1 agreement 97.2%; decode stayed bit-exact. Prefill is often compute bound, so this pays.
- **[G] Grouped MoE GEMMs: avoid padding cliffs and reuse decoded weights.**
  - Intermediate block sizes for M = 17–48 rows: −5%.
  - A 64-row M-block, which halves weight decode per row: +7% end-to-end prefill on B390, bit-exact.
  - An NT=2 tile fix: +22% at c16 on B70.
- **[G] Profile by stage first.** In one 32K prefill, GEMMs were 40% and already at the int8 ceiling, so further GEMM work was pointless.

## Kernel work (after config levers plateau)

- Write a bit-exact or tight-tolerance test against the old kernel at every row count M you serve.
  - A "−4%" kernel once produced wrong outputs that a two-path test missed.
  - A 4-level lossless check: weights bit-identical → each layer vs fp64 → graph vs eager → model KL.
- Read the ISA. On B70, stride-3 register regions turned into per-element moves; making them planar took the LM head from 4.05 to 1.72 ms.
- Check memory-model fences on new GPU generations. Split-K partial stores on Xe3 needed L1-uncached stores plus a cache-clean fence. Without them, results were silently wrong at some M.
- Measured and rejected on Intel Xe (try with care elsewhere):
  - fused single-kernel linear (serialized tail);
  - software pipelining or prefetch (register spills, M=16 39 → 86 ms);
  - lookup-table codebooks (4× slower than ALU decode);
  - LSC prefetch (noise);
  - async scheduling (0%).
