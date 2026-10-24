# Artifact persistence and optional Hub upload

AAS-reviewed adaptation: publication is separate from training. A local run saves weights, processor, configuration/label mapping and metrics into a newly created private output directory. Validate that all required inference artifacts can be reloaded in the reviewed environment before considering the run complete.

Ephemeral compute requires an approved durable artifact route before execution: for example an authorized private bucket/volume or reviewed private model repository. Hub push is optional and is disabled in bundled pilots. Do not claim that all runs without public Hub push are wasted or that successful training proves an upload completed.

If the user requests Hub upload, confirm the exact namespace/repository, visibility, write authority, intended files, applicable model/dataset licenses and privacy constraints. Review checkpoints for embedded training examples, credentials and private configuration. Do not infer an Apache license for trained weights from this skill's license. Use a scoped secret in the approved credential mechanism, never a literal token in code or persistent login from a job.

Save the processor and id2label/label2id consistently with the exact model. Verify repository identity, commit and actual file contents/reload; a progress log or constructed URL does not certify persistence. Do not silently create a public repository, overwrite an existing branch, make a repository public or publish checkpoints during training. Retention/deletion and retry plans belong to the authorized storage workflow.

See [Hugging Face Hub upload guidance](https://huggingface.co/docs/huggingface_hub/guides/upload). No upload was performed during this review.
