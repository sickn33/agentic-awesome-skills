# Training patterns

Use the bundled method-specific CLI examples as bounded starting points. They
require explicit training authorization, immutable model/dataset revisions and
a new output directory. No imports submit cloud work, train or publish. Install
reviewed compatible dependencies separately before execution.

For evaluation, create an independent held-out split and pass `eval_dataset` when
enabling an evaluation strategy. Validate minimum split size and avoid train/test
leakage. The teaching scripts omit automatic evaluation; adding an eval strategy
without actual held-out data is invalid rather than evidence of a successful run.

For multiple GPUs, use a reviewed supported distributed launcher/configuration;
selecting a multi-GPU flavor alone does not shard the model. Confirm rank/process
counts, batch/generation divisibility and optimizer state placement. Each rank must
not independently publish duplicate artifacts or start external tracking sessions.

For resumption, first restore a complete trusted checkpoint into an approved local
directory, then call `trainer.train(resume_from_checkpoint=local_checkpoint)`.
Do not pass resume_from_checkpoint to the trainer constructor or invent a remote
Hub checkpoint path. Loading an adapter restores weights, not necessarily optimizer,
scheduler, RNG and data position. Verify compatibility and state completeness.
