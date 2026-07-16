# Hugging Face Jobs Execution

Run training on Hugging Face's managed GPUs without provisioning any local infrastructure. The same training script runs locally and on Jobs — this reference covers only the Jobs-specific concerns.

## Prerequisites

- Hugging Face account with a **Pro, Team, or Enterprise** plan. Jobs are paid.
- `HF_TOKEN` with **write** permission. Log in once locally with `hf auth login` (the modern command from the `hf` CLI; the older `huggingface-cli login` still works but is deprecated).
- Access to the `hf_jobs()` MCP tool, or the `hf` CLI. If installing the CLI from the hosted script, download it to a temporary file, inspect it, and then run it locally.

## The three submission paths

### 1. Inline script via MCP (recommended in Claude Code)

Pass the full training script as `script`. Dependencies come from the PEP 723 header.

```python
hf_jobs("uv", {
    "script": """
# /// script
# requires-python = ">=3.10"
# dependencies = ["sentence-transformers[train]>=5.0", "trackio"]
# ///

# <full training script content>
""",
    "flavor": "a10g-large",
    "timeout": "3h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
})
```

### 2. Script-from-URL via MCP

Upload the script to the Hub (as a model or dataset repo file) or a Gist, then reference by URL:

```python
hf_jobs("uv", {
    "script": "https://huggingface.co/USERNAME/scripts/resolve/main/train_bi_encoder.py",
    "flavor": "a10g-large",
    "timeout": "3h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"},
})
```

Local file paths (`./train.py`, `/path/to/train.py`) **do not work** — Jobs run in isolated containers without access to your filesystem.

### 3. CLI

```bash
hf jobs uv run \
    --flavor a10g-large \
    --timeout 3h \
    --secrets HF_TOKEN \
    "https://huggingface.co/USERNAME/scripts/resolve/main/train.py"
```

Syntax gotchas:
- Command order is `hf jobs uv run`, **not** `hf jobs run uv`.
- Flags (`--flavor`, `--timeout`, `--secrets`) go **before** the script URL.
- `--secrets` (plural), not `--secret`.

## Required script modifications for Jobs

Add these to your `TrainingArguments`:

```python
args = SentenceTransformerTrainingArguments(
    ...,
    push_to_hub=True,
    hub_model_id="your-username/my-model",
    hub_strategy="every_save",        # push each checkpoint; timeout-safe
    save_strategy="steps",
    save_steps=0.1,                   # 10 saves/pushes per epoch; scales with dataset size
)
```

Why each matters:

| Argument | Why |
|---|---|
| `push_to_hub=True` | The Jobs container is destroyed after the job finishes. Without Hub push, all weights are lost. |
| `hub_model_id` | Required to identify the destination repo. |
| `hub_strategy="every_save"` | Default, but worth being deliberate about on Jobs: each checkpoint is pushed as it's written, so a timeout leaves all completed checkpoints on the Hub. `"end"` only pushes once `trainer.train()` returns, so a timeout loses everything. |
| `save_strategy="steps"` + `save_steps=0.1` | Checkpoints must actually be saved for `hub_strategy="every_save"` to push them. Fractional `0.1` = save every 10% of training, auto-scales with dataset size. |

## Secrets

Secrets are environment variables injected into the Jobs container. They never appear in logs and are not part of the script.

| Secret | Required when |
|---|---|
| `HF_TOKEN` | Always, for Hub push. Also covers Trackio auth. |
| `WANDB_API_KEY` | Using `report_to="wandb"`. |
| `MLFLOW_TRACKING_URI`, `MLFLOW_TRACKING_TOKEN` | Using MLflow with a remote server. |

The `$HF_TOKEN` syntax in the job config references the value from your local environment at submission time — the literal string `$HF_TOKEN` is replaced with your token's value. Never hardcode tokens in the script itself.

Trackio (the default tracker in this skill) uses `HF_TOKEN` for auth, so no extra secrets are needed. Only switch to the W&B / MLflow rows above if you're using those trackers.

## Timeout

Default is **30 minutes**, which is too short for almost any real training. Set explicitly:

```python
"timeout": "2h"       # 2 hours
"timeout": "90m"      # 90 minutes
"timeout": "1.5h"     # 90 minutes
"timeout": 7200       # seconds, as integer
```

Rule: **estimated training time × 1.3**. The extra buffer covers model loading, dataset caching, checkpoint saving, and Hub push.

On timeout, the container is killed immediately. Only data on the Hub (`hub_strategy="every_save"` saves you here) or in persistent volumes survives.

## Dataset caching

Hugging Face datasets are cached at `~/.cache/huggingface/datasets` by default — **inside the container**, which is destroyed after the job. Each Jobs run re-downloads the dataset.

For large datasets (>5 GB), this matters. Options:

- **Persistent `/data` volume** (Jobs feature, check current documentation): set `HF_DATASETS_CACHE=/data/datasets` so caches persist across jobs.
- **Pre-cache locally, push to Hub**: if the dataset is on Hub already, nothing to do. If it's local-only, `dataset.push_to_hub(...)` once so subsequent jobs load from Hub.

## Monitoring a running job

```bash
hf jobs ps [--all]                        # running (or all) jobs
hf jobs inspect <job-id>                  # full config + status
hf jobs logs <job-id> [--follow|--tail N] # tail or stream
hf jobs cancel <job-id>
hf jobs hardware                          # list flavors + hourly rates
```

`hf jobs logs <id> --follow` under `Bash run_in_background` pairs nicely with a `Monitor` watching for the `VERDICT:` line emitted by your training script's verdict block.

MCP equivalents (signatures may vary by server version — check the actual
tool listing): `hf_jobs("ps")`, `hf_jobs("logs", {"job_id": ...})`,
`hf_jobs("cancel", {"job_id": ...})`.

For recurring runs, `hf jobs scheduled uv run "<cron>" <script> ...`
schedules; `hf jobs scheduled ps/suspend/delete` manages.

## Common failures

### "Model not found on Hub" after a successful-looking run

The run succeeded but `push_to_hub` was not enabled. The container is gone; the weights are gone.

Fix: always set `push_to_hub=True` + `hub_model_id=...` + `secrets={"HF_TOKEN": "$HF_TOKEN"}`.

### Tracker not connecting

- **Trackio:** `HF_TOKEN` missing or lacks write permission. Add `"secrets": {"HF_TOKEN": "$HF_TOKEN"}` and make sure the token has write access.
- **W&B:** `WANDB_API_KEY` missing. Add `"secrets": {"HF_TOKEN": "$HF_TOKEN", "WANDB_API_KEY": "$WANDB_API_KEY"}`.

### OOM on first step

Flavor too small. Move up one tier (see `hardware_guide.md`).

### Training starts but eval hangs forever

`eval_strategy="steps"` with no `eval_dataset`. Always provide an eval dataset, or set `eval_strategy="no"`.

### Dataset download times out

Large dataset or slow cold-cache. Increase `timeout` or pre-cache to a persistent volume.

### `CachedMultipleNegativesRankingLoss` + `gradient_checkpointing=True` crash

The cached losses are incompatible with gradient checkpointing. Disable `gradient_checkpointing`.

After submission, the MCP returns a job ID. Monitor with `hf_jobs("logs", {"job_id": ...})` when you want an update — don't poll in a tight loop. End-to-end submission templates live in `scripts/train_sentence_transformer_example.py` / `scripts/train_cross_encoder_example.py` / `scripts/train_sparse_encoder_example.py`; wrap the script contents in the inline pattern from §1 above.
