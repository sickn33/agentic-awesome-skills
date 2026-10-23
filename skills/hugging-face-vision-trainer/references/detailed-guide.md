# Bounded pilot guide

AAS adapted the upstream Hugging Face skill after individual review; retain upstream attribution and license. The current scripts train locally only. No job submission, publication or account change happens from reading this guide.

## Before execution

Approve the input rights, exact repository revisions, dataset config/split and annotation meaning, dependency lock, hardware/time/disk/memory budget and new output directory. Install reviewed dependencies separately. Every training file imports the sibling `vision_safety.py`: do not upload a single file to an ephemeral job and claim it is self-contained.

Use these required CLI arguments for all three task scripts:

- `--allow-training`: explicit execution opt-in; validated before training dependency imports.
- `--model_name_or_path` and `--model_revision`: reviewed model repository and full 40-character commit.
- `--dataset_name` and `--dataset_revision`: reviewed dataset repository and full 40-character commit.
- `--output_dir`: a new path under an existing approved non-symlink parent.
- `--max_steps`: 1..1000; `--max_train_samples` and `--max_eval_samples`: 2..10000 each.
- `--do_train`; add evaluation only with an explicit valid split policy.
- Detection additionally requires `--bbox_format xywh` or `--bbox_format xyxy` in absolute pixels; no auto-detection.

The guard's help lists core arguments; task-specific TrainingArguments/DataTrainingArguments are documented in the scripts. JSON configuration, resume, output overwrite, inline token arguments, remote code and Hub push are intentionally unavailable in this pilot. Reporting integrations are disabled regardless of the local Trainer default. Do not pretend a publication flag succeeds.

Dataset loading streams a bounded number of rows per train/validation/test split before materializing them. This bounds row count, not byte count, decode time or network cost; inspect images/metadata and use external resource limits. Pillow's decompression-bomb checks are enabled, but do not constitute a data sandbox. A dedicated train split is required; never rename held-out test data to train automatically. Small pilot subsets and random splits are not a complete population evaluation.

## Public metadata preview

```bash
python3 scripts/dataset_inspector.py --dataset approved-owner/approved-data --config approved-config --split train --json-output
```

This sends only the requested dataset/config/split to the public HF Datasets Server. No rows are fetched by default; `--samples 1` through `20` opts into bounded row metadata. It emits no raw row contents or executable mapping code. Viewer data may not correspond to a pinned revision; use the actual approved snapshot for training validation.

## Cost and remote jobs

The cost helper uses an explicitly supplied measured-duration estimate and current hourly rate; it does not guess model size, dataset size, cloud prices or hardware fit. Include preprocessing, evaluation, download, storage, persistence and billing units in the budget. A timeout is a stop limit, not a promise of completion.

For an explicitly authorized HF Job, use the [current Jobs guide](https://huggingface.co/docs/huggingface_hub/guides/jobs) and [configuration documentation](https://huggingface.co/docs/hub/jobs-configuration). Verify account permissions, current hardware/rates, a full reviewed package including the local helper, dependency lock, external timeout and durable artifact destination. Pass only needed scoped credentials through the actual tool's secret mechanism, never logs or guessed MCP placeholder expansion. Save the returned job ID and URL, then verify actual status and persistence. Do not use nonexistent `get_job`/`get_job_logs` methods from older examples; inspect the installed SDK's supported API. Cloud adaptation requires separate integration testing; this catalog did not submit a job.
