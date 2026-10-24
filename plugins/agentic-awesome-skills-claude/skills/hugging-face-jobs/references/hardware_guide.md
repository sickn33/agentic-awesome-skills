# Hardware selection for Jobs

_Modified in the local catalog review: removed stale Spaces hardware/pricing tables and unsupported performance guarantees._

Use [Jobs pricing and hardware](https://huggingface.co/docs/hub/jobs-pricing) or `hf jobs hardware` immediately before estimating a job. The output is a dated quote, not a permanent catalog constant. Confirm account credits, current flavor availability, quota and the job namespace.

## Size the workload

Estimate base weights (parameter count × bytes per weight), activation/KV cache, temporary tensors, optimizer/gradient states when training, CPU RAM, disk, model/data downloads and output storage. For example, a 70B BF16 model needs roughly 140GB for weights alone; a single 80GB A100 does not fit it without a compatible sharding/quantization/offload strategy. LoRA training still needs the base weights. These are planning bounds, not fit guarantees.

A CPU workload may still need high RAM or disk. A GPU name is not a speed ranking across all tasks. Measure a small authorized representative sample before extrapolating. Multi-GPU memory is not automatically pooled: configure supported tensor/data/pipeline parallelism and verify worker count, synchronization and communication overhead. Expect neither automatic distribution nor linear speedup. TPU support must be confirmed in the current Jobs catalog rather than copied from Spaces examples.

## Cost and limits

Use the current quoted rate and billed duration rules, including startup, retries, exposed-port or other applicable charges. Bound runtime, concurrent jobs and maximum attempts. Each scheduled occurrence/rerun contributes to the budget. Preserve the agreed hardware; do not buy an upgrade or create extra jobs in response to OOM without authority. Reducing batch/context can reduce activations but does not remove base-weight memory.

A timeout is an execution guard, not an exact all-in spending guarantee. Monitor completion/cancellation and verify persisted checkpoints. A positive credit balance currently enables Jobs access; subscription credits can contribute but a paid subscription is not universally required.
