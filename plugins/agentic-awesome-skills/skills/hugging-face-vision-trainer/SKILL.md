---
name: hugging-face-vision-trainer
description: "Train object detection, image classification, and SAM or SAM2 segmentation models locally or on Hugging Face Jobs, with bounded dataset pilots and explicit artifact persistence."
risk: critical
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-vision-trainer
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Vision model training

## When to Use

Use for an authorized image classification, object detection or binary SAM/SAM2 segmentation pilot with Hugging Face/Transformers. This is not clinical validation, autonomous-vehicle certification or continuous alpha-matting training.

## Workflow

1. Confirm task, data rights/consent, sensitive image scope, model/dataset licenses, exact immutable revisions, label/box/mask conventions, held-out evaluation design, output location and compute/storage budget. Preserve existing user authorization; do not require another preference question when it is already settled.
2. Review dependencies and use a pinned compatible environment. PEP723 dependency ranges are declarations, not a reproducible lock or proof that the current libraries work together. Installing packages, downloading data/models or submitting paid Jobs requires authorization.
3. Inspect data before training. The bundled metadata inspector is a bounded public viewer preview, not full validation. It never certifies READY, decodes all images or guesses box format. Even a previously used dataset revision must be checked. Confirm dataset config/split explicitly; sample labels do not enumerate all classes.
4. Start with an approved bounded local pilot using the scripts and their sibling `vision_safety.py`. No automatic remote code, login, Hub publication or experiment telemetry. Model weights require safetensors; unavailable safe weights fail rather than fall back to pickle.
5. Verify image/annotation alignment, class mapping, negative examples and reproducible split design. Group by person/video/source/time where appropriate; random per-image splitting can leak related observations. Keep test data out of training/tuning and disclose when no independent test exists.
6. Evaluate actual loss/metrics and predictions against the held-out design. Record exact model/data/SDK versions, seed, actual samples, steps, hardware, limitations and any failure. A syntax/offline test does not prove GPU execution or convergence. Never invent training results, hardware fit, timing, cost or successful persistence.
7. Save model, processor, label mapping, metrics and provenance to approved durable private storage. For ephemeral Jobs, verify the artifact route before submission; Hub publication is one optional route, not mandatory. Creating a repository or uploading weights/data needs explicit scope, destination, visibility and license review.

## Examples

Read [the pilot guide](references/detailed-guide.md) and the task reference before running. Help works with standard Python without installing the training stack:

```bash
python3 scripts/image_classification_training.py --help
python3 scripts/dataset_inspector.py --help
python3 scripts/estimate_cost.py --help
```

## References

- [Pilot execution](references/detailed-guide.md)
- [Classification](references/image_classification_training_notebook.md)
- [Detection](references/object_detection_training_notebook.md)
- [Binary SAM/SAM2 segmentation](references/finetune_sam2_trainer.md)
- [timm compatibility](references/timm_trainer.md)
- [Artifact persistence](references/hub_saving.md)
- [Reliability and evidence](references/reliability_principles.md)

## Limitations

The scripts are bounded local pilot templates, not production-tested training services. Their guards do not isolate the OS, enforce GPU/RSS/network spending caps, or defend against a malicious concurrent local owner. Use an isolated approved runtime with external time/resource limits and private input/cache paths. Windows ACL behavior and actual GPU/model/SDK compatibility were not validated in this catalog review. Do not use model output for clinical or other safety-critical decisions without the required domain validation.
