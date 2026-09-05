---
name: hugging-face-vision-trainer
description: "Train object detection, image classification, and SAM or SAM2 segmentation models locally or on Hugging Face Jobs, with dataset validation and results saved to the Hub."
risk: critical
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-vision-trainer
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Vision Model Training on Hugging Face Jobs

Train object detection, image classification, and SAM/SAM2 segmentation models on managed cloud GPUs. No local GPU setup required—results are automatically saved to the Hugging Face Hub.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use this skill when users want to:
- Fine-tune object detection models (D-FINE, RT-DETR v2, DETR, YOLOS) on cloud GPUs or local
- Fine-tune image classification models (timm: MobileNetV3, MobileViT, ResNet, ViT/DINOv3, or any Transformers classifier) on cloud GPUs or local
- Fine-tune SAM or SAM2 models for segmentation / image matting using bbox or point prompts
- Train bounding-box detectors on custom datasets
- Train image classifiers on custom datasets
- Train segmentation models on custom mask datasets with prompts
- Run vision training jobs on Hugging Face Jobs infrastructure
- Ensure trained vision models are permanently saved to the Hub

## Prerequisites Checklist

Before starting any training job, verify:

### Account & Authentication
- Hugging Face Account with [Pro](https://hf.co/pro), [Team](https://hf.co/enterprise), or [Enterprise](https://hf.co/enterprise) plan (Jobs require paid plan)
- Authenticated login: Check with `hf_whoami()` (tool) or `hf auth whoami` (terminal)
- Token has **write** permissions
- **MUST pass token in job secrets** — see directive #3 below for syntax (MCP tool vs Python API)

### Dataset Requirements — Object Detection
- Dataset must exist on Hub
- Annotations must use the `objects` column with `bbox`, `category` (and optionally `area`) sub-fields
- Bboxes can be in **xywh (COCO)** or **xyxy (Pascal VOC)** format — auto-detected and converted
- Categories can be **integers or strings** — strings are auto-remapped to integer IDs
- `image_id` column is **optional** — generated automatically if missing
- **ALWAYS validate unknown datasets** before GPU training (see Dataset Validation section)

### Dataset Requirements — Image Classification
- Dataset must exist on Hub
- Must have an **`image` column** (PIL images) and a **`label` column** (integer class IDs or strings)
- The label column can be `ClassLabel` type (with names) or plain integers/strings — strings are auto-remapped
- Common column names auto-detected: `label`, `labels`, `class`, `fine_label`
- **ALWAYS validate unknown datasets** before GPU training (see Dataset Validation section)

### Dataset Requirements — SAM/SAM2 Segmentation
- Dataset must exist on Hub
- Must have an **`image` column** (PIL images) and a **`mask` column** (binary ground-truth segmentation mask)
- Must have a **prompt** — either:
  - A **`prompt` column** with JSON containing `{"bbox": [x0,y0,x1,y1]}` or `{"point": [x,y]}`
  - OR a dedicated **`bbox`** column with `[x0,y0,x1,y1]` values
  - OR a dedicated **`point`** column with `[x,y]` or `[[x,y],...]` values
- Bboxes should be in **xyxy** format (absolute pixel coordinates)
- Example dataset: `merve/MicroMat-mini` (image matting with bbox prompts)
- **ALWAYS validate unknown datasets** before GPU training (see Dataset Validation section)

### Critical Settings
- **Timeout must exceed expected training time** — Default 30min is TOO SHORT. See directive #6 for recommended values.
- **Hub push must be enabled** — `push_to_hub=True`, `hub_model_id="username/model-name"`, token in `secrets`

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
