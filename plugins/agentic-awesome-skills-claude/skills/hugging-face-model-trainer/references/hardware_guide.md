# Hardware selection

Select from the provider's current Jobs flavor inventory and current region/account
availability. Spaces hardware names and prices are not a Jobs quote. Verify GPU
model, per-device VRAM, CPU, RAM, disk and hourly rate for the selected flavor.

Full training needs weights, gradients, optimizer state and activations; inference
weight size is insufficient. LoRA reduces trainable optimizer state; quantization
reduces some weights, but activations/context can still dominate. Profile a bounded
pilot at the actual sequence length and batch size. Model names do not certify
parameter counts or architecture. Use a real model repository and pinned revision.

Multiple GPUs require a compatible distributed launch and sharding configuration;
48 GB across two 24 GB GPUs is not automatically a 48 GB device. Data parallelism
often replicates model state. Do not promise that a given model fits without
measuring the chosen training setup. Increase gradient accumulation, reduce
per-device batch/context or select a smaller model before purchasing more compute.

`scripts/estimate_cost.py` accepts measured/projected duration and a user-supplied
rate. It does not maintain hardware prices, certify memory fit or predict speed.
Include startup, evaluation and saving in the budget. Provider deadlines and
billing must be checked separately; concurrent jobs and retries cost extra.
