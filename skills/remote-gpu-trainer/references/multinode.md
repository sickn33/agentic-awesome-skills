# Multi-node NCCL & elastic-training gotchas — ADVANCED

**Single-box users skip this entire file.** None of it applies to a single instance — one node, however many GPUs,
runs DDP/FSDP over NVLink/PCIe and never touches the inter-node NCCL transport, fabric-manager, or rendezvous logic
below. This file is **only** for jobs spanning ≥2 rented instances (multi-node DDP, FSDP, pipeline/tensor parallel,
or elastic training). It assumes the checkpoint-to-durable + idempotent-resume spine is already in place
(`references/principles.md` #8; cadence + atomic-write in `references/spot-resilience.md`) — multi-node only changes
*how the process group forms and breaks*, never the resume mechanism.

These are all **[P] platform/topology-specific** gotchas. The universal ones (disk, OOM, CRLF, silent sync, spot
grace) are **not** restated here — see `references/gotchas_universal.md`.

## Table of contents

- **Fabric-manager** — one bad node hangs the WHOLE job at NCCL init (MN1)
- **NIC selection** — NCCL picks docker0/loopback/slow NIC (MN2)
- **Timeout masking** — default 1800 s hides a straggler/dead rank (MN3)
- **MTU mismatch** — jumbo frames silently dropped, small messages fine (MN4)
- **Elastic restart ≠ state restore** — torchrun `--max-restarts` (MN5)
- **Elastic Horovod pause-below-min-np** — pauses then errors (MN6)
- **First-move checklist** — bring up a healthy multi-node group

To jump: `grep -in <keyword> references/multinode.md` (e.g. `grep -in fabric references/multinode.md`).

---

## MN1 — Fabric-manager down on one node hangs the entire job at NCCL init

**Symptom.** Launch a multi-node job; every rank prints up to NCCL init then freezes — no traceback, no progress,
no OOM, just a silent hang at the first collective. Killing and relaunching reproduces the exact same stall. A
single-node run of the identical code works fine.

**Root cause.** On NVSwitch-based nodes (HGX/DGX A100/H100), `nvidia-fabricmanager` must be running and healthy on
**every** node for NVLink/NVSwitch routing to come up. One node with a stopped, crashed, or version-mismatched
fabric-manager cannot establish its NVLink fabric, so its ranks never join the collective — and because NCCL init is
a **global barrier**, all the healthy nodes block waiting for the one that can never arrive. The failure is global;
the cause is local to one box.

**Fix.**
- Check fabric-manager on **every** node before launching, not just the head:
  `systemctl status nvidia-fabricmanager` (or `nvidia-smi -q | grep -i fabric`). It must be `active (running)` and
  its version must match the driver on that node.
- Turn the silent hang into a diagnosable one: launch with `NCCL_DEBUG=INFO` (optionally `NCCL_DEBUG_SUBSYS=INIT,NET`).
  The first node whose log **stops** before the others printed their topology is the culprit.
- On a rental the fix is operational, not a reseat: restart the service (`systemctl restart nvidia-fabricmanager`)
  if permitted, otherwise **stop that instance and re-rent a different box** — a fabric-manager that won't start is
  usually a sick host (overlaps the Xid hardware-failure logic in `references/gotchas_universal.md`).

URL: https://support.crusoecloud.com/hc/en-us/articles/46061806112155-NCCL-Hangs-and-Multi-Node-Training-Stalls-Caused-by-Failed-nvidia-fabricmanager

---

## MN2 — NCCL picks the wrong NIC (docker0 / loopback / a slow interface)

**Symptom.** Multi-node init hangs forever, OR it connects but inter-node bandwidth is 10× too slow (allreduce
dominates the step time; single-node throughput was fine). `NCCL_DEBUG=INFO` shows NCCL binding to `docker0`, `lo`,
or a 1 GbE management NIC instead of the fast data-plane interface.

**Root cause.** NCCL auto-discovers network interfaces and, with no guidance, can select an unroutable bridge
(`docker0`), the loopback, or the slow management NIC — none of which carry traffic between the real nodes. The
job either never connects (unroutable) or runs over the wrong, slow path.

**Fix.** Pin the transport explicitly on **all** nodes (identical env on every rank):
- `export NCCL_SOCKET_IFNAME=<real-iface>` — a prefix filter; e.g. `eth`, `ens`, `bond`. Exclude bad ones with a
  leading `^`: `NCCL_SOCKET_IFNAME=^docker0,lo`.
- On RDMA/InfiniBand fabrics pin the HCA: `export NCCL_IB_HCA=mlx5` (the active adapter prefix).
- **No RDMA (TCP-only rental):** `export NCCL_IB_DISABLE=1` so NCCL stops probing for nonexistent IB and falls back
  to the socket path cleanly instead of stalling on IB discovery.
- Confirm the chosen interface with `NCCL_DEBUG=INFO` — the `NET/Socket` or `NET/IB` line names the bound device;
  verify it is the fast data-plane NIC, not the bridge.

URL: https://github.com/NVIDIA/nccl/issues/1580

---

## MN3 — Default 1800 s NCCL timeout masks a straggler or a dead rank

**Symptom.** A run that was progressing freezes at a collective for exactly **30 minutes**, then dies with a
`Watchdog ... collective ... timed out` / `NCCL timeout` error — or worse, hangs far longer because the watchdog is
off. The real failure (a rank that OOM'd, crashed, or fell behind) happened 30 min earlier and is buried.

**Root cause.** NCCL's default collective timeout is **1800 s**. When one rank dies or stalls, the others sit in the
collective waiting out the full 30-minute window before anything surfaces — so the symptom appears half an hour after
the cause, and a transient straggler can trip a hard abort it should have survived.

**Fix.**
- **Fail fast on a dead rank:** `export NCCL_ASYNC_ERROR_HANDLING=1` (newer PyTorch: `TORCH_NCCL_ASYNC_ERROR_HANDLING=1`)
  so a crashed/unreachable rank tears the group down promptly instead of waiting out the timeout — the surviving ranks
  get an actionable error near the true failure point.
- **Tune the window deliberately, both directions.** Genuinely slow collectives (huge allreduce, slow checkpoint
  barrier) need a **longer** timeout to avoid false aborts: raise it via the process-group init
  (`torch.distributed.init_process_group(..., timeout=timedelta(minutes=60))`). To surface a hung straggler **sooner**,
  lower it. The default rarely fits a real job — set it on purpose.
- Pair with MN1's `NCCL_DEBUG=INFO` so the timeout error names which rank went silent.

URL: https://repost.aws/questions/QURXddiuikQLesRDGz39RhIw/nccl-socket-timeout-when-using-large-dataset-in-multi-node-pretraining

---

## MN4 — Jumbo-frame MTU mismatch silently drops large NCCL frames

**Symptom.** Small collectives work (rendezvous succeeds, tiny tensors allreduce fine), but the job hangs or throws a
transport error the moment a **large** payload is sent — large gradient buckets, the first big allreduce, or a model
broadcast. The break correlates with message **size**, not with which ranks are involved.

**Root cause.** The container's interface is configured for jumbo frames (MTU 9000) but the host veth / bridge it
attaches to is still at 1500 (or vice-versa). Small packets fit under the smaller MTU and pass; oversized frames are
silently dropped at the mismatched hop with no application-level error, so NCCL stalls waiting for data that never
lands. Classic on containerized rentals where the container MTU and the host bridge MTU were set independently.

**Fix.**
- Match MTU end to end: set the **host veth/bridge** to the same MTU as the container interface (9000 ↔ 9000, or drop
  both to 1500). Inspect with `ip link show` on both the container and the host side.
- Quick confirm the path actually carries jumbo frames between nodes:
  `ping -M do -s 8972 <other-node-ip>` (8972 = 9000 − 28 bytes header). If it fails but `-s 1472` succeeds, the large
  frames are being dropped → fix the MTU, do not blame NCCL.
- If the host bridge MTU cannot be changed on the rental, set the container interface **down** to 1500 to match — a
  uniform-but-smaller MTU works; a mismatch does not.

URL: https://github.com/moby/moby/issues/4378

---

## MN5 — torchrun / TorchElastic `--max-restarts` restarts the process group but does NOT restore training state

**Symptom.** A worker dies (preemption, transient fault); torchrun's `--max-restarts=N` dutifully re-runs rendezvous
and relaunches **all** workers — but training resumes from **step 0** (or the wrong epoch), silently throwing away the
progress before the failure. The restart "worked" yet the run is set back hours.

**Root cause.** TorchElastic guarantees only that the **worker group** is reconstituted: it re-runs the c10d
rendezvous, re-derives `world_size`/`rank`, and relaunches every worker process. It does **not** persist or reload
training state — that is entirely the script's responsibility. A `--max-restarts` with no in-script
load-latest-checkpoint just re-runs `main()` from scratch on every restart.

**Fix.**
- The per-epoch (or per-N-step) snapshot is what restores state, exactly per `references/principles.md` #8: write
  full state (model + optimizer + LR scheduler + epoch/step + RNG + dataloader position) **atomically**
  (`tmp`→`fsync`→`os.rename`), and **load-latest unconditionally at the top of every launch** so a torchrun restart
  resumes instead of restarting. Cadence formula + atomic-write detail live in `references/spot-resilience.md`.
- Use the c10d rendezvous backend hosted on a `host:port` (no etcd dependency); set `--max-restarts` to survive the
  expected number of preemptions, not 0.
- **REQUIRED:** treat the restored run as a *resume of the identical config*, never a hand-patched relaunch — a
  silently-restarted or reshuffled run is the exact contamination `verifying-dl-experiments` guards against; confirm
  the resumed step/epoch against the loaded checkpoint before trusting any post-restart metric.

URL: https://docs.pytorch.org/tutorials/beginner/ddp_series_fault_tolerance.html

---

## MN6 — Elastic Horovod pauses below `--min-np`, then errors at `HOROVOD_ELASTIC_TIMEOUT`

**Symptom.** Under elastic Horovod (`horovodrun -np 8 --min-np 4 --max-np 12`), enough workers get preempted to drop
the live count below `--min-np`; the job does **not** fail immediately — it appears to hang (paused, no progress) —
and then, minutes later, dies with a timeout error. Operators waiting for an instant failure miss the pause window.

**Root cause.** Elastic Horovod **pauses** (does not fail) when available workers fall below `--min-np`, waiting for
capacity to return. It only errors once `HOROVOD_ELASTIC_TIMEOUT` (default **600 s**) elapses without recovering to
`--min-np`. So a too-high `--min-np` turns a routine couple-of-preemptions event into a hard failure after a silent
10-minute wait.

**Fix.**
- Set `--min-np` **low enough** that the typical number of concurrent preemptions does not breach it — survivors keep
  training through membership changes instead of pausing.
- Raise `HOROVOD_ELASTIC_TIMEOUT` if the spot tier's capacity routinely returns slower than 600 s, so a temporary
  capacity dip resumes rather than aborts.
- **Pin LR-scaling and data-sharding to `--max-np`, not the live worker count** — otherwise the effective learning
  rate and shard assignment drift on every membership change, quietly corrupting the run (a `verifying-dl-experiments`
  concern: a metric from a run whose LR silently rescaled is not a clean datapoint).

URL: https://horovod.readthedocs.io/en/stable/elastic_include.html

---

## First-move checklist — bring up a healthy multi-node group

Run this order **before** trusting any multi-node throughput number; it isolates MN1–MN4 cheaply (no full job needed):

- [ ] **Every** node: `systemctl status nvidia-fabricmanager` → `active (running)`, version matches driver (MN1).
- [ ] Identical NCCL env exported on **all** ranks: `NCCL_SOCKET_IFNAME`, `NCCL_IB_HCA` (or `NCCL_IB_DISABLE=1`), and
  the chosen `init_process_group` timeout (MN2, MN3).
- [ ] MTU path check between nodes: `ping -M do -s 8972 <other-node-ip>` succeeds, or both ends pinned to 1500 (MN4).
- [ ] First real launch with `NCCL_DEBUG=INFO` + `NCCL_ASYNC_ERROR_HANDLING=1`; confirm each rank's `NET/...` line
  names the fast data-plane NIC, not a bridge (MN2, MN3).
- [ ] In-script load-latest-checkpoint verified to fire on restart **before** relying on `--max-restarts` /
  elastic membership recovery (MN5, MN6; spine in `references/principles.md` #8).
- [ ] Distributed jobs checkpoint **more** often than single-GPU — one preemption wastes N× compute; cadence per
  `references/spot-resilience.md`.

For fanning a *sweep* across nodes (independent cells, not one job over many nodes), that is
`references/parallel_ablation.md` + **REQUIRED** `superpowers:dispatching-parallel-agents`, not this file.
