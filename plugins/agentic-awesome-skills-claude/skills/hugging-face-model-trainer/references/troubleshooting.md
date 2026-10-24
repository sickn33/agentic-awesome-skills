# Training troubleshooting

## Format or evaluation errors

Inspect actual validated row values, templates and tokenized labels. Familiar
column names are insufficient. The bounded inspector reports candidate columns,
not full compatibility. Supply held-out `eval_dataset` if enabling evaluation;
small datasets need a valid split rather than an empty evaluation set.

## Memory failures

Reduce per-device batch, sequence length or model size; measure a bounded pilot.
Use supported quantization/checkpointing and a real distributed launcher when
needed. Multiple GPU memories do not automatically pool. On MPS, preserve the
memory watermark; disabling it can destabilize macOS. Verify dtype support in
the actual runtime.

## Timeouts or uncertain job state

Inspect the original job ID before retrying. Check approved durable checkpoints;
not every timeout requires starting from scratch. Restore a complete local
checkpoint and call `trainer.train(resume_from_checkpoint=local_checkpoint)`.
A Hub model/adapter export alone is not an exact optimizer-state checkpoint.
Increase duration only within the user's approved budget. The cost helper accepts
measured/projected duration and a verified rate, not a model name runtime estimate.

## Saving/authentication failures

Check the exact approved destination, privacy, scopes, quotas and host secret
binding. Never echo a token or assume `$HF_TOKEN` interpolation. Keep artifacts
until durability is verified; partial upload is failure. Do not create a public
repository, overwrite an existing model or enable telemetry as an automatic fix.

## Reward and model quality failures

GRPO requires a tested reward; exact string matching is only a toy reward. Inspect
reward variance and generation/batch compatibility without executing generated
code. Compare held-out quality and a baseline. No fixed success percentage,
loss ratio or single sample certifies generalization.
