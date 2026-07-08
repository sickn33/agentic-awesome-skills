# Launching & debugging multi-GPU / multi-node training — torchrun · Accelerate · DeepSpeed · DDP · FSDP

Pick a launcher, get the rank/world-size env right, choose a parallelism (DDP vs FSDP vs ZeRO),
and — when 8 processes silently freeze — find *which* rank diverged. This layer owns *making the
distributed job RUN, not hang, and not silently mis-shard*; **verifying-dl-experiments** owns *is the
resulting number correct* (a run whose LR silently rescaled with world size, or that resumed from
step 0 after a restart, is its concern). Cross-link it (**REQUIRED**) wherever a launch fix changes
effective batch size, LR, or precision.

Single box, multiple GPUs is DDP/FSDP over NVLink/PCIe and lives here. The **inter-node** transport
(NCCL NIC, fabric-manager, timeout, MTU, elastic restart) is `references/multinode.md` (**REQUIRED**
for any job spanning ≥2 instances) — this file ends where the wire between boxes begins.

To jump: `grep -in '<keyword>' references/training/distributed-launch.md` (e.g. `rdzv`, `local_rank`,
`unused`, `hang`, `desync`, `fsdp`, `zero`, `state_dict`, `port`, `barrier`, `accelerate`).

## Table of contents

- **Launchers & env** — D1 torchrun-env-contract · D2 standalone-vs-rendezvous · D3 LOCAL_RANK-device-bug · D4 port-collision · D5 accelerate-launch · D6 deepspeed-launcher · D7 which-launcher
- **DDP** — D8 find_unused_parameters · D9 uneven-inputs-Join · D10 SyncBN-&-buffers · D11 effective-batch/LR
- **FSDP** — D12 wrapping-policy · D13 sharding-strategy · D14 mixed-precision · D15 state_dict-type
- **DeepSpeed** — D16 ZeRO-stages · D17 config.json-knobs · D18 auto-&-engine.backward
- **The HANGS** (highest-value) — D19 desync-debug-toolkit · D20 one-rank-diverged · D21 rank-conditional-collective · D22 dataloader-length-mismatch · D23 eval/print/save-on-one-rank
- **Pointers** — inter-node NCCL/NIC/timeout → multinode.md · OOM/sharding-to-fit → oom-memory.md · spot-restart → spot-resilience.md

---

## Launchers & env

### D1 — The rank/world-size env contract every launcher must satisfy

**Symptom**: a raw `python train.py` on a 4-GPU box uses **one** GPU; or `init_process_group` hangs
forever because `MASTER_ADDR`/`RANK` were never set.

**Root cause**: `torch.distributed` reads its topology from **environment variables**, not from the GPU
count. A bare `python` sets none of them, so the process group never forms.

**Fix**: launch through `torchrun`, which sets the full contract per process
([torchrun docs](https://docs.pytorch.org/docs/2.12/elastic/run.html)):

| Var | Meaning |
|---|---|
| `RANK` | global rank `0..WORLD_SIZE-1` (unique across the whole job) |
| `LOCAL_RANK` | rank **within this node** — bind it to the GPU (`cuda:LOCAL_RANK`), NOT `RANK` (D3) |
| `WORLD_SIZE` | total workers = `nnodes × nproc_per_node` |
| `LOCAL_WORLD_SIZE` | workers on this node |
| `GROUP_RANK` | the node's rank (`0..nnodes-1`) |
| `MASTER_ADDR` / `MASTER_PORT` | FQDN + port of rank-0 hosting the c10d TCP store |

The script reads them (`int(os.environ["LOCAL_RANK"])`), calls
`init_process_group(backend="nccl")` (NCCL for GPU; `gloo` for CPU), and `set_device(LOCAL_RANK)`
before allocating any CUDA tensor.

### D2 — Single-node uses `--standalone`; multi-node needs a shared rendezvous id+endpoint

**Symptom**: copying a single-node `torchrun` line to a second node either hangs at init or both nodes
form two separate 1-node groups.

**Root cause**: single-node and multi-node use **different rendezvous**. `--standalone` self-hosts a
rendezvous on localhost (no coordination); multi-node requires every node to point at the *same*
external rendezvous server with the *same* job id.

**Fix** ([torchrun docs](https://docs.pytorch.org/docs/2.12/elastic/run.html)):
```bash
# single node, 4 GPUs — self-contained, no addr/port to manage
torchrun --standalone --nnodes=1 --nproc-per-node=4 train.py

# multi-node: IDENTICAL command on every node; only env-derived node-rank differs
torchrun --nnodes=2 --nproc-per-node=8 \
         --rdzv-id=$JOB_ID --rdzv-backend=c10d \
         --rdzv-endpoint=$HEAD_IP:29400 train.py
```
`c10d` is the recommended backend (no etcd dependency). `--nnodes=1:4` enables elastic scaling. The
inter-node wire health (NIC pinning, fabric-manager, timeout) is `references/multinode.md`.

### D3 — Every process lands on GPU 0 (the `RANK` vs `LOCAL_RANK` bug)

**Symptom**: on multi-node, all of node-1's processes pile onto `cuda:0` and OOM, while GPUs 1-7 sit
idle; single-node looked fine.

**Root cause**: the script did `torch.cuda.set_device(RANK)`. On a single node `RANK==LOCAL_RANK` so
the bug hides; on node 1 of a 2-node job `RANK` is 8-15 but the node only has GPUs 0-7, so
`set_device` wraps/collides and everything funnels to device 0.

**Fix**: **always index the local device by `LOCAL_RANK`**, never `RANK`:
`torch.cuda.set_device(int(os.environ["LOCAL_RANK"]))`. `RANK` selects the *data shard*; `LOCAL_RANK`
selects the *physical GPU*.

### D4 — `RuntimeError: Address already in use` when launching a second job on one node

**Symptom**: a second `torchrun` (e.g. a parallel ablation cell) on the same box dies immediately with
`errno 98: Address already in use`.

**Root cause**: both jobs default to `MASTER_PORT=29500`; the c10d TCP store can't bind a port the
first job holds ([pytorch#85604](https://github.com/pytorch/pytorch/issues/85604)).

**Fix**: give each co-located job a unique port **and** disjoint GPUs:
```bash
CUDA_VISIBLE_DEVICES=0,1 torchrun --standalone --nproc-per-node=2 --master-port=29500 train.py &
CUDA_VISIBLE_DEVICES=2,3 torchrun --standalone --nproc-per-node=2 --master-port=29600 train.py &
```
Or use `--rdzv-endpoint=localhost:0` to let torchrun pick a free port. Fanning cells across instances
instead of one box → `references/parallel_ablation.md`.

### D5 — HF Accelerate: `accelerate launch` reads a config, not torchrun flags

**Symptom**: `accelerate launch train.py` runs single-GPU despite 4 cards, because no config exists or
`compute_environment` defaulted to one process.

**Root cause**: Accelerate wraps the same env contract (D1) but sources it from
`~/.cache/huggingface/accelerate/default_config.yaml` (written by `accelerate config`) or CLI flags
([launch docs](https://huggingface.co/docs/accelerate/en/basic_tutorials/launch)).

**Fix**: generate a config once, then launch against it — and on a headless rental, write the YAML
directly instead of the interactive `accelerate config`:
```bash
accelerate launch --multi_gpu --num_processes=4 --mixed_precision=bf16 train.py
# or a checked-in YAML (reproducible, diffable):
accelerate launch --config_file configs/acc_fsdp.yaml train.py
```
Switching DDP↔FSDP↔DeepSpeed is *only* a config swap — the training script is unchanged. The same
`--num_machines`/`--machine_rank`/`--main_process_ip` map onto multi-node (D2 territory).

### D6 — DeepSpeed: `deepspeed` launcher vs `accelerate launch`, and the `hostfile`

**Symptom**: `deepspeed train.py` on multi-node can't find the other host, or `--num_gpus` is ignored.

**Root cause**: the `deepspeed` launcher discovers nodes from a `hostfile`
(`worker-1 slots=8`), distinct from torchrun's rendezvous. Under HF it's usually cleaner to let
`accelerate launch` (with a DeepSpeed plugin/config) drive it
([HF DeepSpeed](https://huggingface.co/docs/accelerate/en/usage_guides/deepspeed)).

**Fix**: single-node `deepspeed --num_gpus=8 train.py --deepspeed ds_config.json`; multi-node
`deepspeed --hostfile=hostfile --num_gpus=8 train.py ...`. With HF Trainer/Accelerate, pass the config
via `--config_file` and let it spawn the workers — don't mix both launchers.

### D7 — Which launcher / parallelism — decision in one breath

- **Model fits on one GPU, just want more throughput** → **DDP** (`torchrun`), simplest, fastest. Each rank holds a full replica.
- **Model does NOT fit (params+optim+grads ≈ 18 B/param, see oom-memory.md M1)** → shard it: **FSDP** (PyTorch-native) or **DeepSpeed ZeRO** (richer offload). Sharding-to-fit ladder → `references/training/oom-memory.md` M9.
- **HF ecosystem / Trainer** → **Accelerate** as the launcher; flip a config field to choose DDP/FSDP/ZeRO.
- **Need CPU/NVMe offload of params *and* optimizer separately, or ZeRO-Infinity** → **DeepSpeed** (FSDP1 offload is all-or-nothing; [HF concept guide](https://github.com/huggingface/accelerate/blob/main/docs/source/concept_guides/fsdp_and_deepspeed.md)).

---

## DDP

### D8 — `find_unused_parameters` — the "Expected to have finished reduction" error vs the silent hang

**Symptom**: `RuntimeError: Expected to have finished reduction in the prior iteration before starting
a new one. ... parameters that were not used in producing loss`
([HF discuss](https://discuss.huggingface.co/t/runtimeerror-expected-to-have-finished-reduction-in-the-prior-iteration-before-starting-a-new-one-this-error-indicates-that-your-module-has-parameters-that-were-not-used-in-producing-loss/64760)).

**Root cause**: DDP registers an allreduce hook on every parameter and waits for *all* of them each
step. If a branch (a frozen head, a conditional layer) produces no gradient, its bucket never fires and
the reduction never completes.

**Fix — in priority order**:
1. **Best**: make every output participate in the loss (often the real bug is a dropped/detached head).
2. If a branch is *legitimately* unused some steps, `DDP(model, find_unused_parameters=True)` — but it adds a full graph traversal each step and **can be drastically slower** ([PyTorch forum](https://discuss.pytorch.org/t/process-got-stuck-when-set-find-unused-parameters-true-in-ddp/106078)). Use only if (1) is impossible.
3. If the return value is a dict/list, DDP may not locate the output tensors — flatten or simplify the `forward` return.
> Setting `find_unused_parameters=True` to *paper over* a real bug masks it — confirm the params are intentionally unused, don't silence the diagnostic.

### D9 — Ranks have unequal batch counts → hang at the last step (uneven inputs)

**Symptom**: training completes most of an epoch then **freezes on the final batch**; one rank had fewer
samples and exited the loop while the others wait in allreduce forever
([PyTorch forum](https://discuss.pytorch.org/t/understanding-distributedsampler-and-dataloader-drop-last/206271)).

**Root cause**: DDP assumes every rank runs the **same number of collectives**. `DistributedSampler`
pads (`drop_last=False`) or drops (`drop_last=True`) to equalize, but a custom sampler, a per-rank
filter, or a `IterableDataset` can leave counts uneven — the short rank stops calling allreduce.

**Fix**:
- Use `DistributedSampler` (it equalizes by default) and set the **same** `drop_last` on every rank.
- Truly uneven inputs (variable-length, can't pad): wrap the loop in the **Join** context manager —
  `from torch.distributed.algorithms.join import Join; with Join([model]): for batch in loader: ...`
  — which mirrors the missing ranks' collectives so finished ranks don't deadlock
  ([Join tutorial](https://docs.pytorch.org/tutorials/advanced/generic_join.html)).
- Always call `sampler.set_epoch(epoch)` each epoch, or every epoch sees the identical shuffle (a
  silent correctness bug — **verifying-dl-experiments** **REQUIRED**).

### D10 — BatchNorm stats diverge across ranks; buffers aren't synced

**Symptom**: DDP converges worse than single-GPU at the same effective batch, or eval is unstable —
each rank computed BN statistics on only its local shard.

**Root cause**: DDP all-reduces **gradients**, not **buffers** (BN running mean/var). With small
per-GPU batches each replica's BN stats are noisy and inconsistent.

**Fix**: convert BN to synchronized BN before wrapping:
`model = nn.SyncBatchNorm.convert_sync_batchnorm(model)` then `DDP(model, ...)`. Adds a collective per
BN layer (cost), but BN stats become global. (Whether the metric *needs* SyncBN is a
**verifying-dl-experiments** call.)

### D11 — N GPUs silently N× the effective batch (and the LR is now wrong)

**Symptom**: moving from 1→8 GPUs makes training diverge or plateau; loss curve is shaped differently
even with "the same config."

**Root cause**: DDP keeps per-GPU batch size, so **effective batch = per_gpu_batch × world_size**. The
LR tuned for the 1-GPU batch is now mismatched (commonly under-scaled). This is the single most common
silent multi-GPU regression.

**Fix**: scale LR with effective batch (linear-scaling rule as a baseline, with warmup) and record
`world_size`, per-GPU batch, and effective batch in the run manifest. **This changes the science** —
declare it; comparing a 1-GPU baseline to an 8-GPU run with unscaled LR is not a clean datapoint
(**verifying-dl-experiments** **REQUIRED**).

---

## FSDP (Fully Sharded Data Parallel)

### D12 — FSDP wraps the whole model as one unit → no memory saving (wrapping policy)

**Symptom**: FSDP enabled but VRAM barely drops vs DDP, or it OOMs gathering one giant flat parameter.

**Root cause**: with no `auto_wrap_policy`, FSDP makes the **entire model one FSDP unit** — it must
all-gather all parameters at once, defeating sharding
([FSDP tutorial](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html)).

**Fix**: wrap per transformer block so only one block's params are gathered at a time:
```python
from torch.distributed.fsdp.wrap import transformer_auto_wrap_policy
import functools
policy = functools.partial(transformer_auto_wrap_policy,
                           transformer_layer_cls={LlamaDecoderLayer})
```
Under Accelerate set `fsdp_auto_wrap_policy: TRANSFORMER_BASED_WRAP` +
`fsdp_transformer_layer_cls_to_wrap: LlamaDecoderLayer`
([HF FSDP](https://huggingface.co/docs/accelerate/en/usage_guides/fsdp)). FSDP2 (`fully_shard`) is the
current API; the wrapping principle is identical.

### D13 — Sharding strategy: FULL_SHARD vs SHARD_GRAD_OP vs HYBRID

**Symptom**: FSDP is communication-bound (allgather/reducescatter dominate the step), or still OOMs.

**Root cause**: the strategy trades memory against comms. `FULL_SHARD` (default, == ZeRO-3) shards
params+grads+optimizer — max memory saving, max comms. `SHARD_GRAD_OP` (== ZeRO-2) shards grads+optim
only, keeps params resident — less comms, more memory.

**Fix**: pick by the binding constraint — OOM → `FULL_SHARD`; comms-bound but it fits →
`SHARD_GRAD_OP`. On a **multi-node** job where intra-node NVLink is fast but inter-node is slow,
`HYBRID_SHARD` shards within a node and replicates across nodes (cuts inter-node traffic; pairs with
`references/multinode.md` NIC tuning).

### D14 — FSDP mixed precision: loss diverges or buffers stay fp32

**Symptom**: bf16 FSDP run diverges where bf16 DDP was fine; or BN/positional buffers silently run in
the wrong dtype.

**Root cause**: FSDP mixed precision is **explicit per-tensor-class** via `MixedPrecision(param_dtype,
reduce_dtype, buffer_dtype)` — not a single AMP flag. Setting `param_dtype=bf16` but leaving
`reduce_dtype=fp32` (or vice versa) changes gradient-reduction precision; FSDP keeps fp32 master
weights and casts to bf16 for forward
([pytorch#146114](https://github.com/pytorch/pytorch/issues/146114)).

**Fix**: set all three deliberately — a safe default is `param_dtype=bf16, reduce_dtype=fp32` (keep
reductions in fp32 for stability), and set `buffer_dtype` explicitly so buffers don't drift. Prefer
**bf16 over fp16** for sharded training (no loss-scaler needed). The numerical-correctness check is
**verifying-dl-experiments**; this entry only ensures the dtypes are *set*, not left implicit.

### D15 — Checkpoint OOMs or saves an unloadable shard (state_dict type)

**Symptom**: `FSDP.state_dict()` OOMs the host RAM on rank 0; or every rank wrote a `.pt` and reloading
on a different world size fails.

**Root cause**: FSDP has three state-dict types. `FULL_STATE_DICT` gathers + unflattens the whole model
to **rank-0 CPU** (peaks host RAM, single-writer); `SHARDED_STATE_DICT` writes one shard per rank
(scales, but tied to layout); `LOCAL_STATE_DICT` is raw flat params
([HF FSDP](https://huggingface.co/docs/accelerate/en/usage_guides/fsdp)).

**Fix**:
- Large models / want resumable-at-scale: **`SHARDED_STATE_DICT`** via Distributed Checkpoint (DCP) — each rank saves its shard, reload reshards to any world size.
- Need a single portable file (export/inference): `FULL_STATE_DICT` with `rank0_only=True, offload_to_cpu=True` so only rank 0 materializes it on CPU (avoids the all-ranks OOM). FSDP2 uses `broadcast_from_rank0=True` to load the full dict on rank 0 then shard out.
- Atomic-write + load-latest-on-startup is the resume spine regardless of type → `references/spot-resilience.md` and `references/multinode.md` MN5 (a torchrun restart restores the *group*, never the *state*).

---

## DeepSpeed

### D16 — ZeRO stage selection (1/2/3) and what each shards

**Symptom**: ZeRO enabled but still OOM, or comms overhead with no memory need.

**Root cause**: stages shard progressively more across data-parallel ranks
([DeepSpeed ZeRO](https://www.deepspeed.ai/tutorials/zero/)):
**Stage 1** = optimizer states · **Stage 2** = + gradients · **Stage 3** = + parameters (== FSDP
`FULL_SHARD`).

**Fix**: smallest stage that fits — Stage 2 is the common sweet spot for models that *almost* fit;
Stage 3 for models that don't fit even with grads sharded; add **ZeRO-Offload** (CPU) or
**ZeRO-Infinity** (NVMe) only when Stage 3 alone still OOMs (each offload trades large slowdowns for
capacity → `references/training/oom-memory.md` M10).

### D17 — The `ds_config.json` knobs that actually matter

**Symptom**: config applied but behavior unchanged, or a cryptic key error at init.

**Root cause**: DeepSpeed reads from the JSON, and several Accelerate/Trainer fields are **ignored** once
a `deepspeed_config_file` is supplied
([HF Accelerate DeepSpeed](https://huggingface.co/docs/accelerate/en/usage_guides/deepspeed)).

**Fix** — the load-bearing keys:
```jsonc
{
  "zero_optimization": {
    "stage": 3,
    "offload_optimizer": {"device": "cpu"},      // or "nvme"
    "offload_param":     {"device": "cpu"}
  },
  "bf16": {"enabled": true},                       // prefer over fp16 (no loss-scale tuning)
  "gradient_accumulation_steps": "auto",           // let HF fill from Trainer
  "train_micro_batch_size_per_gpu": "auto",
  "gradient_clipping": "auto"
}
```
When the JSON is present, `gradient_accumulation_steps`, `gradient_clipping`, `zero_stage`,
`offload_*_device`, and `mixed_precision` from the Accelerate config are **overridden by the JSON** —
set them there, not in two places.

### D18 — `"auto"` mismatch and `loss.backward()` vs `engine.backward()`

**Symptom**: optimizer steps far less often than expected (gradient accumulation double-counted), or a
`RuntimeError` about unscaled gradients.

**Root cause**: two traps. (a) Setting `gradient_accumulation_steps` in *both* the Trainer/Accelerate
config *and* the JSON to non-`"auto"` values multiplies them. (b) With DeepSpeed's own AMP, gradient
scaling lives inside the engine — calling bare `loss.backward()` instead of `model_engine.backward(loss)`
skips scaling ([DeepSpeed engine](https://github.com/microsoft/DeepSpeed/blob/master/deepspeed/runtime/engine.py)).

**Fix**: set accumulation in **one** place (use `"auto"` in the JSON and let HF fill it); in a manual
loop call `model_engine.backward(loss); model_engine.step()` — never `loss.backward()` /
`optimizer.step()` directly under DeepSpeed.

---

## The HANGS — debugging a frozen distributed job (highest-value section)

A distributed hang has **no traceback** — every rank sits in a collective waiting for a peer that will
never call it. The job to do is identify *which rank* diverged and *which collective* mismatched.
(Distinct from a **single-process** vanish — for OOM/reboot/SSH-HUP/kill, see `gotchas_universal.md`
U3; for the *inter-node* causes — fabric-manager, wrong NIC, MTU, the 1800 s NCCL timeout that *masks*
the real failure — see `references/multinode.md` MN1-MN4.)

### D19 — The desync-debug toolkit: turn a silent freeze into a named mismatch

**Symptom**: all ranks frozen, GPUs at 100% SM util but 0% memory-util (spin-wait), no output.

**Root cause**: a collective desync — ranks enqueued *different* collectives, or one rank never reached
the collective the others are blocked in.

**Fix — set these and relaunch the hang**:
- `export TORCH_DISTRIBUTED_DEBUG=DETAIL` + `export TORCH_CPP_LOG_LEVEL=INFO` → on mismatch PyTorch prints `Detected mismatch between collectives on ranks`, naming the op + sequence number per rank ([PyTorch forum](https://discuss.pytorch.org/t/torch-distributed-collectives-call-logging/172726)). (DETAIL itself does collectives — use to *diagnose*, remove for production; it can perturb timing.)
- `export NCCL_DEBUG=INFO` (or `WARN`) → the node whose log **stops first** before others print their topology is the culprit.
- `export TORCH_NCCL_ASYNC_ERROR_HANDLING=1` (older PyTorch: `NCCL_ASYNC_ERROR_HANDLING=1`) → a dead rank tears the group down *promptly* instead of every rank waiting out the 1800 s NCCL timeout (`references/multinode.md` MN3).
- **Flight Recorder** (`TORCH_NCCL_TRACE_BUFFER_SIZE=2000`) dumps the last N collectives per rank with stack traces — read it to see which rank's queue is one collective behind.

### D20 — One rank diverged (NaN/OOM) and the survivors hang waiting for it

**Symptom**: training ran for a while, then froze; one rank's last log shows a NaN, an OOM, or a
data/CUDA error, the rest are stuck in allreduce.

**Root cause**: a rank that crashes or `return`s early **stops calling collectives**; the others block.
The crash is the cause, the hang is the symptom — and without async error handling (D19) it surfaces
30 min later as a timeout, far from the cause.

**Fix**: with `TORCH_NCCL_ASYNC_ERROR_HANDLING=1` the group aborts near the true failure. Then fix the
*diverged rank*, not the hang — common roots: one shard hit a bad sample (rank-dependent data), a
per-rank OOM from uneven sequence lengths (longest-batch lands on one rank → `oom-memory.md` M16), or
NaN from LR/precision. Don't lower batch size to "fix" a hang that was actually one rank's data bug.

### D21 — A rank-conditional collective (the `if rank == 0:` deadlock)

**Symptom**: hangs reproducibly at the *same* spot — often validation, logging, or checkpoint save.

**Root cause**: a collective (or a `dist.barrier()`, or an op that *implies* one like `all_gather`,
SyncBN, or a metric `all_reduce`) placed inside a rank-conditional branch. Rank 0 calls it; others
skip it; everyone deadlocks. The classic is "save/log on rank 0 only" where the save path triggers a
collective ([Lightning#19604](https://github.com/Lightning-AI/pytorch-lightning/issues/19604)).

**Fix**: collectives must run on **all ranks unconditionally**. Gate only the *side effect*, not the
collective: compute the metric's `all_reduce` on every rank, then `if rank == 0: log(value)`. A
`barrier()` must be reached by every rank or none. Audit every `if rank/local_rank == 0` block for a
hidden collective.

### D22 — Dataloader length mismatch across ranks (and the `set_epoch` shuffle bug)

**Symptom**: hang at end of epoch (D9's mechanism), OR every epoch trains on the identical data order.

**Root cause**: two related dataloader faults. (a) Unequal `len(loader)` per rank → the short rank
stops calling collectives. (b) Forgetting `sampler.set_epoch(epoch)` → `DistributedSampler` reshuffles
identically every epoch.

**Fix**: identical `batch_size`/`drop_last`/sampler on all ranks; call `set_epoch` each epoch; for
genuinely uneven data use **Join** (D9). The shuffle-staleness is a correctness bug —
**verifying-dl-experiments** **REQUIRED**.

### D23 — `print` / `tqdm` / eval / `torch.save` interleaving looks like a hang (but isn't always)

**Symptom**: garbled interleaved logs from 8 ranks; or an apparent freeze during eval where only rank 0
should be working.

**Root cause**: by default **every rank executes everything** — 8× the prints, 8× eval, 8 ranks racing
to write the same checkpoint file (corrupting it). If the eval/save path contains a collective and is
*also* rank-gated, it's the D21 deadlock; if not, it's just noisy + wasteful + a file race.

**Fix**: gate pure side effects (logging, progress bar, file writes) to `if rank == 0:` — but keep any
collective *outside* the gate (D21). Write checkpoints from rank 0 only, to a temp path, atomic-rename
(`references/spot-resilience.md`), and `dist.barrier()` (on **all** ranks) before others read the file.
A genuine hang vs noisy-but-progressing is told apart by the Flight Recorder / step counter (D19), not
by the log soup.

---

## Pointers — handled elsewhere, do not restate

- **Inter-node wire** (NCCL NIC pinning, `nvidia-fabricmanager`, the 1800 s timeout masking a dead rank, jumbo-frame MTU, torchrun/Horovod elastic restart restoring the *group* not the *state*) → `references/multinode.md` (**REQUIRED** for ≥2 instances).
- **Sharding *to fit a model that OOMs*** (the FSDP/ZeRO ladder in cost order, activation checkpointing, offload, LoRA/QLoRA, reading the OOM trace) → `references/training/oom-memory.md`.
- **Restart-and-resume mechanics** (atomic write, load-latest, cadence, preemption signals) → `references/spot-resilience.md`; the spine is `references/principles.md` #8.
- **Single-process vanish** (OOM vs reboot vs SSH-HUP vs manual kill) → `references/gotchas_universal.md` U3; **cgroup host-RAM OOM from `num_workers`** → U9; **zombie VRAM after a crashed DDP run** → U11.
- **Is the resulting number real** (LR-rescaled run, restarted-from-0 run, shuffle staleness, SyncBN necessity, precision change) → **verifying-dl-experiments** (**REQUIRED** at every "this fix changes the science" note above).
