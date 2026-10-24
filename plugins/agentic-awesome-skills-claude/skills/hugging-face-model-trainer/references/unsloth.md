# Unsloth text training

Unsloth optimizations depend on architecture, hardware, kernels, precision and
version. Marketing speed/VRAM percentages are workload-specific, not universal
guarantees. Confirm support for the exact model and pin reviewed dependencies.

`scripts/unsloth_sft_example.py` is a bounded text-only LoRA teaching example.
It requires explicit model/data revisions, sample/step limits, a new local output
directory, architecture-specific target modules and the exact instruction/response
markers from the reviewed chat template. It uses streaming to bound loaded rows,
then validates text messages. It does not implement vision training, generalized
streaming training, automatic architecture detection, telemetry or Hub publication.

Install a compatible reviewed Unsloth/TRL environment first; importing Unsloth
before TRL is intentional. Check `processing_class`, SFTConfig `max_length` and
model loader arguments against those pinned versions. The helper's response masking
must be inspected on tokenized examples: matching marker strings alone does not
prove correct assistant labels. No GPU execution was performed during review.

Save adapters/tokenizer locally, evaluate held-out quality, then separately choose
whether to merge or publish. Adapter loading may reset optimizer state; exact
continuation requires full checkpoints. See
https://unsloth.ai/docs/basics/continued-pretraining and [GGUF](gguf_conversion.md).
A low training/evaluation loss ratio alone is not evidence of generalization.
