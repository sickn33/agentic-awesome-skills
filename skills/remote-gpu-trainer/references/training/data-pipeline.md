# Data-pipeline correctness — the silent mistrainers in the DataLoader, not the model

`throughput-profiling.md` owns making the dataloader **fast**; this file owns making it **correct** — the
bugs that raise no error and let training "succeed" on the wrong data: augmentations that secretly never
vary, streams that duplicate across workers/GPUs, collate that crashes or mis-pads, and preprocessing that
silently shifts the input distribution. Each entry is **Symptom → Root cause → Fix** with the exact knob.

Boundary: **verifying-dl-experiments** owns the *judgement* "is this leakage / is the metric valid"; this
file owns the *mechanism* (what the DataLoader / Dataset / transform actually did). When a data bug makes
training "run but not learn," cross-check `convergence-debugging.md` — **O1 (overfit one batch)** isolates a
broken loop from broken data.

To jump: `grep -in '<keyword>' references/training/data-pipeline.md` (e.g. `worker`, `worker_init_fn`,
`numpy`, `seed`, `iterabledataset`, `get_worker_info`, `collate`, `pin_memory`, `spawn`, `lambda`, `__len__`,
`drop_last`, `cache`, `bgr`, `totensor`, `normalize`, `set_epoch`, `shuffle`).

## Table of contents

- **DataLoader worker RNG (the augmentation-duplication bug)** — DP1 numpy-RNG-duplicated-across-workers · DP2 IterableDataset-duplicated-workers+ranks · DP3 uneven-shard-DDP-hang
- **Dataset / collate / DataLoader contract** — DP4 ragged-collate · DP5 pin_memory-custom-type · DP6 spawn-breaks-lambdas · DP7 wrong-__len__ · DP8 size-1-batch-kills-BN · DP9 in-RAM-cache-OOM · DP15 /dev/shm-Bus-error
- **Input preprocessing / labels / shuffle** — DP10 norm-stats-space/split+RGB/BGR · DP11 cv2-BGR · DP12 ToTensor-no-÷255 · DP13 Normalize-before-ToTensor · DP14 shuffle/sampler + set_epoch
- **Pointers** — throughput-profiling.md, convergence-debugging.md, distributed-launch.md, verifying-dl-experiments (skill)

---

## DataLoader worker RNG — the augmentation-duplication bug

### DP1 — Identical "random" augmentations across workers and every epoch → numpy's global RNG inherited via `fork`
**Symptom**: with `num_workers>0`, different workers emit the **same** random augmentation parameters (same crop coords, flips, noise) within a batch, and the exact same random sequence repeats **every epoch**. Augmentation diversity collapses to ~`1/num_workers`; the model generalizes worse for no visible reason — no crash, no warning. (An audit found this in >95% of inspected repos with custom datasets.)
**Root cause**: DataLoader spawns workers via `fork` (Linux default), so each worker inherits an **identical** copy of NumPy's global RNG state from the parent. PyTorch auto-seeds each worker's **torch** RNG (and Python `random`) to `base_seed+worker_id`, but it does **not** touch numpy's global RNG — so `np.random.*` in `__getitem__`/transforms is identical across workers, and because workers are respawned from the unchanged parent state, identical every epoch.
**Fix**: pass a `worker_init_fn` that reseeds numpy from torch's already-per-worker seed: `def wif(_): np.random.seed(torch.initial_seed() % 2**32)`. `torch.initial_seed()` = `base_seed+worker_id` and `base_seed` is redrawn each epoch, giving both cross-worker **and** cross-epoch variety. **Two traps**: (a) seeding from a constant (`np.random.seed(42+worker_id)`) re-breaks epoch variety — every epoch resets to the same start; (b) do **not** call `torch.manual_seed(CONST)` in `worker_init_fn` — it clobbers torch's correct per-worker offset. Cleanest of all: route augmentation RNG through torch (`torch.rand`/`torch.Generator`), which is auto-seeded per worker — then no `worker_init_fn` is needed. With `persistent_workers=True` the init runs once, so vary per epoch from an epoch counter instead. ([tanelp "PyTorch+NumPy, you're making a mistake"](https://tanelp.github.io/posts/a-bug-that-plagues-thousands-of-open-source-ml-projects/), [PyTorch "Randomness in multi-process data loading"](https://docs.pytorch.org/docs/stable/notes/randomness.html))

### DP2 — `IterableDataset` yields every sample N× (per worker) or world_size× (per rank) → not sharded
**Symptom**: an `IterableDataset` with `num_workers=N` yields each sample **N times** (an "epoch" is N× too long, samples repeat within a batch); and under DDP every **rank** streams the **same** data, so `all_reduce` averages identical gradients and the model sees `world_size×` fewer unique samples despite more GPUs. Often misread as a too-large dataset or slow convergence.
**Root cause**: the **same** `IterableDataset` object is replicated onto every worker **and** every rank; unlike map-style datasets there is no `Sampler` handing out disjoint indices (and `DistributedSampler` does **not** apply to `IterableDataset`). Unless `__iter__` partitions the stream itself, all consumers iterate the identical sequence. `get_worker_info()` knows only intra-process workers, not ranks.
**Fix**: shard by **both** dimensions inside `__iter__`. Workers: `wi=torch.utils.data.get_worker_info()`, then keep records where `idx % wi.num_workers == wi.id` (or contiguous ranges). Ranks: fold in `dist.get_rank()`/`get_world_size()` — `global_id = rank*num_workers + worker_id`, `global_world = world_size*num_workers`, keep `idx % global_world == global_id`. With HF `datasets`, `datasets.distributed.split_dataset_by_node(ds, rank, world_size)` assigns disjoint per-rank shards, then `num_workers` handles the inner split. ([PyTorch data — IterableDataset multi-worker](https://docs.pytorch.org/docs/stable/data.html), [HF datasets#5360 — DDP duplication](https://github.com/huggingface/datasets/issues/5360))

### DP3 — Uneven `IterableDataset` shard length under DDP → NCCL hang / silent sample drop
**Symptom**: after correctly sharding an `IterableDataset` by rank, training intermittently **hangs at the last batch** of an epoch (NCCL collective timeout), or some ranks run one extra step.
**Root cause**: streaming shards rarely divide evenly by `world_size*num_workers`; when one rank's iterator exhausts while others still yield, the finished rank skips its `backward`/all-reduce and the rest block forever waiting on the absent collective. Unlike map-style `DistributedSampler` (which pads to a uniform length), `IterableDataset` sharding gives no automatic length equalization.
**Fix**: make every rank run the **same** number of steps — (a) compute a global min steps/epoch and stop all ranks there (drop the ragged tail), (b) pad short shards by cycling samples, or (c) wrap with `model.join()` (the DDP `join` context manager) which shadows collectives for ranks that finish early. Set `drop_last=True` to discard the uneven final micro-batch within a worker. (Map-style `set_epoch` hang is a *different* cause → D22.) ([PyTorch data](https://docs.pytorch.org/docs/stable/data.html), [HF datasets#5360](https://github.com/huggingface/datasets/issues/5360))

---

## Dataset / collate / DataLoader contract

### DP4 — `default_collate` "stack expects each tensor to be equal size" on ragged samples → custom `collate_fn`
**Symptom**: iteration crashes at batch assembly — `RuntimeError: stack expects each tensor to be equal size, but got [..] at entry 0 and [..] at entry 1` — for variable-length sequences, variable bbox counts, or differently-sized images/masks. `batch_size=1` works; the error appears only at `batch_size>1`.
**Root cause**: the default collate batches same-key tensors with `torch.stack(batch, 0)`, which requires identical shape on every non-batched dim. Ragged samples violate it, so the stack throws — the bug is in the collate glue, not the model or dataset.
**Fix**: pass `DataLoader(..., collate_fn=my_collate)`. Sequences: `pad_sequence(seqs, batch_first=True, padding_value=pad_id)` + emit a length/attention mask (then mask the loss → O15, by-domain L2). Detection-style ragged targets: keep them as a Python **list** of per-sample tensors instead of stacking (Faster-RCNN/DETR convention). Variably-sized images: pad to the batch-max H/W (NestedTensor / pad+mask). ([PyTorch data — custom collate_fn](https://docs.pytorch.org/docs/stable/data.html), [forum: variable bbox counts](https://discuss.pytorch.org/t/dataloader-collate-fn-throws-runtimeerror-stack-expects-each-tensor-to-be-equal-size-in-response-to-variable-number-of-bounding-boxes/117952))

### DP5 — `pin_memory=True` silently no-ops on a custom batch type → it must define `.pin_memory()`
**Symptom**: after wrapping batches in a custom class (a `Batch` object, a graph batch, a dataclass) and setting `pin_memory=True`, the async H2D copy (`.to('cuda', non_blocking=True)`) no longer overlaps — throughput regresses to a blocking copy — or pinning appears to do nothing.
**Root cause**: DataLoader's pin step only knows how to pin tensors and the built-in containers it recurses into (`list/tuple/dict`). A user-defined batch type is opaque, so its inner tensors stay pageable; the later `non_blocking=True` copy then silently falls back to **synchronous** (the T6 overlap is lost). PyTorch's contract: *"to enable memory pinning for custom batch or data type(s), define a `pin_memory()` method on your custom type(s)."*
**Fix**: implement `def pin_memory(self): self.x=self.x.pin_memory(); self.y=self.y.pin_memory(); return self` (return `self`) — the pin worker calls it per batch. Then keep `pin_memory=True` and transfer with `.to(device, non_blocking=True)`. ([PyTorch data — Memory Pinning](https://docs.pytorch.org/docs/stable/data.html)) (pinned-memory *perf* mechanics → throughput T6.)

### DP6 — `num_workers>0` under the `spawn` start method (Windows/macOS) breaks lambdas/closures
**Symptom**: on Windows/macOS, `num_workers>0` raises `AttributeError: Can't pickle local object '<locals>.<lambda>'`; OR worse, it proceeds but transforms silently vanish (samples come back un-augmented). The identical code runs fine with `num_workers=0` or on Linux.
**Root cause**: Windows/macOS default to `spawn` — each worker launches a fresh interpreter and reconstructs the dataset/collate/transforms via **pickle**. Lambdas, nested functions, and closures aren't picklable → a hard pickle error, or (pytorch/vision#8066) transforms dropped during serialization. Linux's `fork` copies live memory, masking the bug.
**Fix**: make everything the worker reconstructs a top-level importable callable — replace `collate_fn=lambda b: ...` and lambda transforms with module-level `def`s; bind args with `functools.partial(top_level_fn, ...)` not a closure; for parameterized transforms use a top-level callable class. Keep main-script code under `if __name__ == '__main__':`. Stopgap: `num_workers=0` sidesteps pickling. ([vision#8066 — transforms lost under spawn](https://github.com/pytorch/vision/issues/8066), [PyTorch data — platform-specific](https://docs.pytorch.org/docs/stable/data.html))

### DP7 — Wrong `Dataset.__len__` → out-of-range `__getitem__`: IndexError, or a SILENT modulo wraparound
**Symptom**: either (a) `IndexError`/`KeyError` from `__getitem__` partway through an epoch, or (b) no error but training quietly sees duplicated/skipped samples — when `__getitem__` does `self.items[idx % len(...)]` or indexes a shorter list so over-long indices wrap.
**Root cause**: the map-style contract — `__len__()` must equal the number of valid keys, and the default `RandomSampler` draws indices from `range(len(dataset))`. If `__len__` is computed from a different/stale source than `__getitem__` indexes (counts files but indexes a filtered list, an off-by-one, a cached length), the sampler requests indices the structure can't serve. A defensive `idx % N` turns the loud IndexError into a silent correctness bug.
**Fix**: compute `__len__` and `__getitem__` from the **same** collection (materialize the kept-index list in `__init__`, index through it). Remove any `idx % N`/clamping — let an out-of-range index raise. Sanity once: `assert len(ds)==<expected>`; `ds[len(ds)-1]` works and `ds[len(ds)]` raises. ([pytorch#45040](https://github.com/pytorch/pytorch/issues/45040), [PyTorch data — map-style contract](https://docs.pytorch.org/docs/stable/data.html))

### DP8 — A size-1 final batch crashes BatchNorm → `drop_last=True` on the train loader
**Symptom**: training runs most of an epoch then dies at the **last** batch with `ValueError: Expected more than 1 value per channel when training, got input size torch.Size([1, C, ...])`. Happens when `len(dataset) % batch_size == 1`.
**Root cause**: `nn.BatchNorm*` in training mode computes per-channel mean/var over the batch; with a single sample and trivial spatial size the per-channel count is 1, so variance is undefined and `F.batch_norm` raises (an intentional guard since 0.3). The default `DataLoader(drop_last=False)` keeps that ragged final batch.
**Fix**: `DataLoader(..., drop_last=True)` on the **train** loader discards the incomplete final batch (the standard fix). Alternatives if you can't drop data: swap BatchNorm → `nn.GroupNorm`/`nn.LayerNorm` (no batch-stat dependence), or freeze BN to eval (O18). Keep `drop_last=False` on the **eval** loader (you want every sample) and rely on `model.eval()` there. (Tiny-batch BN *quality* → V7; per-rank batch-count equalization → D9; this is the single-process size-1 crash.) ([pytorch#4534](https://github.com/pytorch/pytorch/issues/4534))

### DP9 — An in-RAM `Dataset` cache grows into host-OOM (and under `fork` workers never even shares)
**Symptom**: RAM climbs steadily across iters/epochs until a bare `Killed` (exit 137, no traceback) — typically from a Dataset that lazy-caches decoded samples (`if idx not in self.cache: self.cache[idx]=load(idx)`). With `num_workers>0` the growth is **per-worker** and the cache gives no speedup.
**Root cause**: two compounding effects — (1) the cache is unbounded: every index ever requested stays resident, so an epoch caches the whole decoded dataset; (2) under Linux `fork`, each worker is copy-on-write, so writing `self.cache[idx]=...` copies the touched Python objects' pages into that worker's **private** memory — invisible to siblings, so the cache both replicates (RAM × ~`num_workers`) AND is useless for cross-worker reuse.
**Fix**: don't accumulate unbounded Python objects in `__getitem__`. Options: (a) precompute to a single `np.memmap` / Arrow / LMDB / `.npy` in `__init__` and read slices (the OS page cache **is** shared across forked workers); (b) bound the cache (`functools.lru_cache(maxsize=...)` or a ring buffer); (c) store it in shared memory (`Tensor.share_memory_()`). Prefer numpy/Arrow buffers over `list`/`dict` to avoid copy-on-write page churn. (Static `num_workers × big tensor` startup multiplier → U9; this is the *grows-during-training* cousin.) ([pytorch#13246 — worker memory replication](https://github.com/pytorch/pytorch/issues/13246), [PyTorch data — multi-process memory caveat](https://docs.pytorch.org/docs/stable/data.html))

---

## Input preprocessing / labels / shuffle

### DP10 — Normalization applied in the wrong space/split, or stats mis-aligned to channel order → accuracy quietly tanks
**Symptom**: the model loads and runs without error, but a pretrained backbone scores far below its reported number, or your own val accuracy is a few points under train for no obvious reason; predictions are systematically biased (reds↔blues confused if channel order is wrong).
**Root cause**: the per-channel mean/std are correct numbers applied in the wrong space or order. (1) Stats must be computed on the **train split only** and reused verbatim at eval (the sklearn contract: `fit_transform` on train, `transform` — never `fit` — on test/whole set). (2) torchvision pretrained weights expect input already scaled to `[0,1]`, in **RGB**, then normalized with ImageNet `mean=[0.485,0.456,0.406]`/`std=[0.229,0.224,0.225]`. That mean vector is **RGB-indexed**, so feeding a BGR tensor (cv2 default, DP11) aligns the R-stat to the B channel.
**Fix**: compute stats once on train and reuse the same constants/transform at eval. For a torchvision pretrained model don't hand-roll it — use `weights.transforms()` (e.g. `ResNet50_Weights.IMAGENET1K_V2.transforms()`), which bundles resize + to-`[0,1]` + RGB + the exact Normalize the weights were trained with. (The leakage *judgement* is owned by verifying-dl-experiments; this is the mechanism.) ([sklearn "Common pitfalls" — fit on train only](https://scikit-learn.org/stable/common_pitfalls.html), [torchvision models — input contract](https://docs.pytorch.org/vision/stable/models.html)) (extends V1.)

### DP11 — `cv2`-loaded image (BGR) fed to an RGB-trained model → channels swapped
**Symptom**: a pipeline mixing `cv2` for I/O and a PIL/torchvision-trained (RGB) model: no exception, but color-sensitive predictions degrade; visualizing the array shows reds appearing blue. Often surfaces only when you switch the loader (PIL→cv2) and accuracy drops with zero logic change.
**Root cause**: `cv2.imread`/`VideoCapture` return **BGR** channel order, whereas `PIL.Image` and essentially every ImageNet-pretrained model assume **RGB**. Indexing channel 0 as "red" now reads blue. Both are valid `HxWx3 uint8` arrays, so nothing errors — the model just sees a consistently color-swapped distribution.
**Fix**: convert immediately after a cv2 load — `img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)` (or `img = img[:, :, ::-1].copy()` — the `.copy()` matters, a negative-stride view breaks `torch.from_numpy`). Or switch I/O to `torchvision.io.read_image`/PIL (RGB). Keep one channel convention end-to-end and assert it at the dataset boundary. ([BGR↔RGB / cvtColor](https://note.nkmk.me/en/python-opencv-bgr-rgb-cvtcolor/), [torchvision models — RGB](https://docs.pytorch.org/vision/stable/models.html))

### DP12 — `transforms.ToTensor` doesn't ÷255 for non-`uint8` input → activations 255× too large
**Symptom**: loss is huge or NaN from step 0, or activations/gradients are enormous, when the input came from a float numpy array, a `.npy`, a 16-bit/HDR image (PIL mode `I`/`F`), or a tensor already in `[0,1]`. The same model works fine on `uint8` PNGs.
**Root cause**: `transforms.ToTensor()` rescales to `[0,1]` (÷255) **only** when the source is a PIL Image in a listed mode **or** a numpy array with `dtype==uint8`. In every other case (float32/64, int32, exotic PIL modes) it converts **without** scaling — so a float numpy array in `0..255` stays `0..255`, and a `uint8` array someone already scaled gets ÷255 a second time (→ `0..0.004`).
**Fix**: don't rely on `ToTensor` for non-uint8 scaling. For float inputs scale explicitly: `t = torch.from_numpy(arr).float() / 255.0` (or the correct max for 16-bit). In the v2 API prefer `transforms.v2.ToImage()` + `transforms.v2.ToDtype(torch.float32, scale=True)`, where `scale=True` makes the rescale explicit and dtype-aware. Sanity: `assert 0.0 <= x.max() <= 1.0` right after. ([ToTensor doc — "tensors are returned without scaling" for other cases](https://docs.pytorch.org/vision/stable/generated/torchvision.transforms.ToTensor.html))

### DP13 — `transforms.Normalize` placed before `ToTensor` in `Compose` → TypeError (it needs a float CHW tensor)
**Symptom**: dataset construction or the first `__getitem__` raises `TypeError: tensor should be a torch tensor. Got <class 'PIL.Image.Image'>` (or `img should be Tensor`).
**Root cause**: `transforms.Normalize` operates on a float tensor shaped `(C,H,W)` and subtracts a length-`C` mean / divides by length-`C` std along dim 0; it cannot consume a PIL Image or HWC array. In a `Compose` the steps run top-to-bottom, so `Normalize` must come **after** `ToTensor` (which produces the float CHW tensor). PIL-domain ops (Resize/Crop/flip) must come **before** `ToTensor`.
**Fix**: order the pipeline — PIL ops → `ToTensor()` → `Normalize(mean, std)`, e.g. `Compose([Resize(256), CenterCrop(224), ToTensor(), Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])`. `mean`/`std` lengths must equal the channel count (3 RGB, 1 grayscale). ([torchvision transforms — Compose order](https://docs.pytorch.org/vision/stable/transforms.html))

### DP14 — DataLoader silently un-shuffles → `shuffle=True`+sampler raises; `DistributedSampler` without `set_epoch` replays one order
**Symptom**: two shuffle failures — (a) `ValueError: sampler option is mutually exclusive with shuffle` the moment you add any sampler; (b) no error, but in DDP every epoch iterates the data in the **identical** order, so the train-loss curve looks oddly periodic / over-memorized and shuffling "does nothing."
**Root cause**: (a) `DataLoader.__init__` enforces mutual exclusion — `shuffle` picks the sampler for you (`True`→`RandomSampler`, `False`→`SequentialSampler`), so passing both is contradictory; `batch_sampler` is likewise exclusive with `batch_size`/`shuffle`/`sampler`/`drop_last`. (b) `DistributedSampler` derives its per-epoch permutation from a generator seeded `self.seed + self.epoch`, and `self.epoch` stays **0** until you call `sampler.set_epoch(epoch)` — so without it every epoch uses `seed+0` → byte-identical ordering.
**Fix**: (a) when you must use a sampler (DistributedSampler, WeightedRandomSampler), set `shuffle=False` and let the sampler own ordering. (b) call `train_sampler.set_epoch(epoch)` at the **start of each epoch** before iterating (Lightning/Accelerate do this for you; raw torchrun is your responsibility). Verify by logging the first few indices of epoch 0 vs 1 — they must differ. (The DDP `set_epoch` **hang** is a different failure → D22.) ([DataLoader source — shuffle/sampler exclusivity](https://github.com/pytorch/pytorch/blob/main/torch/utils/data/dataloader.py), [DistributedSampler.set_epoch](https://docs.pytorch.org/docs/stable/data.html))

### DP15 — `Bus error` / DataLoader worker killed → `/dev/shm` exhausted (the rental-container classic)
**Symptom**: `DataLoader worker (pid N) is killed by signal: Bus error`, or `RuntimeError: unable to write to file </torch_...>` / `received 0 items of ancdata` — on a **rented container** while the identical code runs fine on your workstation. Usually with `num_workers>0`, often mid-epoch.
**Root cause**: PyTorch passes worker tensors through **shared memory** (`/dev/shm`). Docker defaults `/dev/shm` to **64 MB** and many rentals inherit that, so a few workers moving normal batches overrun it and the kernel SIGBUS-kills a worker. This is *shared-memory* exhaustion — NOT host-RAM OOM (a bare `Killed` / exit-137 → `gotchas_universal.md` U9) and NOT a deadlock.
**Fix**: enlarge it at launch — `docker run --shm-size=8g` (or `--ipc=host`); where you can't set that (a fixed rental), switch the IPC strategy `torch.multiprocessing.set_sharing_strategy("file_system")` (fd-passing, slower but uncapped) and/or lower `num_workers`. Tell-tale: `df -h /dev/shm` shows a tiny cap — check it before launch. ([PyTorch multiprocessing shm note](https://docs.pytorch.org/docs/stable/notes/multiprocessing.html), [pytorch#5040](https://github.com/pytorch/pytorch/issues/5040))

---

## Pointers — adjacent mechanics catalogued elsewhere

- **Dataloader SPEED (num_workers / prefetch / pin-overlap / GPU-starvation)** → `references/training/throughput-profiling.md` (T4–T8), `references/gotchas_universal.md` (U8, U24).
- **"Runs but won't learn" loop wiring + loss-function + label-form bugs** → `references/training/convergence-debugging.md` (O1 overfit-one-batch first; O14 CrossEntropyLoss target form).
- **IterableDataset/DDP launch, `set_epoch` hang, SyncBatchNorm, uneven inputs** → `references/training/distributed-launch.md` (D9, D10, D22).
- **Host-RAM OOM from worker fork-copy of a big startup tensor** → `references/gotchas_universal.md` (U9).
- **Is the data leaking / is the metric valid / is the split contaminated** → **verifying-dl-experiments** (**REQUIRED** — owns the judgement; this file owns the mechanism).
