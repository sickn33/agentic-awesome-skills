# Model training guide

## Plan and authorize

Identify the actual available Jobs CLI, SDK or connector and inspect its schema.
A general request to fine-tune does not authorize unlimited GPU expenditure,
publication, uploading private data or creation of telemetry Spaces. Confirm the
model and dataset immutable revisions, method, hardware, maximum steps, timeout,
artifact destination and spending estimate. Check current provider eligibility,
quota, supported hardware and prices. Do not submit immediately on the basis of
this document. Save a reviewable local script when useful.

## Prepare

Install reviewed mutually compatible dependencies in an isolated environment.
The bundled examples intentionally have no broad auto-install dependency header.
Read their arguments with `python scripts/train_sft_example.py --help`. They use
explicit authorization, immutable revisions, bounded samples/steps, local output
and disabled publication/tracking. They are teaching examples, not production
certifications. SFT accepts text; DPO accepts string prompt/chosen/rejected; GRPO
accepts prompt/answer and demonstrates only a toy exact-match reward. Adapt chat
formats with the model's reviewed template, not arbitrary string conversion.

Validate actual values and all rows of the bounded training subset. Column-name
inspection is advisory; five preview rows cannot establish full compatibility.
Check licenses and data authorization. Avoid logging sample contents, tokens or
unapproved model outputs. Default to no remote code; custom architectures require
separate review of pinned executable code. Prefer safetensors.

## Pilot and run

Measure a small bounded pilot under the actual precision, optimizer, sequence
length and hardware. Use `python scripts/estimate_cost.py --measured-hours 0.1
--hourly-rate 2` on one line, replacing both illustrative inputs with measured
and current verified values. This performs arithmetic, not runtime prediction.
Multiple GPUs require an explicit supported distributed launcher; their memory
is not automatically a single pool. Set a provider deadline within the approved
budget; there is no universal minimum duration.

Before using ephemeral storage, configure approved durable checkpoint storage.
Hub upload is optional and must use the approved destination and privacy. Use the
host's actual secret-binding protocol: `$HF_TOKEN` is not universally expanded.
Never paste a token into a script or log. Write permission is needed only for an
approved write; public dataset/model downloads generally need no write token.
Do not use an unpinned remote helper URL as executable job input.

Inspect the submitted job ID and status; avoid duplicate submissions after an
uncertain response. A timeout may discard unsaved state, but does not invalidate
already persisted checkpoints. Evaluate a held-out set and compare the baseline;
training loss alone cannot establish generalization or safety. Stop tracking and
check billed resources after the job. Do not auto-publish the model.

## References

- [Methods](training_methods.md), [patterns](training_patterns.md)
- [Hardware](hardware_guide.md), [reliability](reliability_principles.md)
- [Durable saving](hub_saving.md), [optional tracking](trackio_guide.md)
- [GGUF](gguf_conversion.md), [Unsloth](unsloth.md)
- [Local macOS](local_training_macos.md), [troubleshooting](troubleshooting.md)

API examples follow the documented TRL trainer interfaces; resolve the exact
configuration fields against the versions you install. No GPU/cloud run was
performed during this source review. Official references:
https://huggingface.co/docs/trl/sft_trainer and
https://huggingface.co/docs/trl/grpo_trainer .
