# Logging Metrics with Trackio

**Trackio** is a lightweight, free experiment tracking library from Hugging Face. It provides a wandb-compatible API for logging metrics with local-first design.

- **GitHub**: [gradio-app/trackio](https://github.com/gradio-app/trackio)
- **Docs**: [huggingface.co/docs/trackio](https://huggingface.co/docs/trackio/index)

## Installation

```bash
pip install trackio
# or
uv pip install trackio
```

## Core API

### Basic Usage

```python
import trackio

# Initialize a run
trackio.init(
    project="my-project",
    config={"learning_rate": 0.001, "epochs": 10}
)

# Log metrics during training
for epoch in range(10):
    loss = train_epoch()
    trackio.log({"loss": loss, "epoch": epoch})

# Finalize the run
trackio.finish()
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `trackio.init(...)` | Start a new tracking run |
| `trackio.log(dict)` | Log metrics (called repeatedly during training) |
| `trackio.finish()` | Finalize run and ensure all metrics are saved |
| `trackio.show()` | Launch the local dashboard |
| `trackio.sync(...)` | Sync local project to HF Space |

## trackio.init() Parameters

```python
trackio.init(
    project="my-project",           # Project name (groups runs together)
    name="run-name",                # Optional: name for this specific run
    config={...},                   # Hyperparameters and config to log
    space_id="username/trackio",    # Optional: sync to HF Space for remote dashboard
    group="experiment-group",       # Optional: group related runs
)
```

## Local vs Remote Dashboard

### Local (Default)

By default, trackio stores metrics in a local SQLite database and runs the dashboard locally:

```python
trackio.init(project="my-project")
# ... training ...
trackio.finish()

# Launch local dashboard
trackio.show()
```

Or from terminal:
```bash
trackio show --project my-project
```

### Remote (HF Space)

Pass `space_id` to sync metrics to a Hugging Face Space for persistent, shareable dashboards:

```python
trackio.init(
    project="my-project",
    space_id="username/trackio"  # Auto-creates Space if it doesn't exist
)
```

⚠️ **For remote training** (cloud GPUs, HF Jobs, etc.): Always use `space_id` since local storage is lost when the instance terminates.

### Sync Local to Remote

Sync existing local projects to a Space:

```python
trackio.sync(project="my-project", space_id="username/my-experiments")
```

## wandb Compatibility

Trackio is API-compatible with wandb. Drop-in replacement:

```python
import trackio as wandb

wandb.init(project="my-project")
wandb.log({"loss": 0.5})
wandb.finish()
```

## TRL Integration

When using TRL trainers, set `report_to="trackio"` for automatic metric logging:

```python
from trl import SFTConfig, SFTTrainer
import trackio

trackio.init(
    project="sft-training",
    space_id="username/trackio",
    config={"model": "Qwen/Qwen2.5-0.5B", "dataset": "trl-lib/Capybara"}
)

config = SFTConfig(
    output_dir="./output",
    report_to="trackio",  # Automatic metric logging
    # ... other config
)

trainer = SFTTrainer(model=model, args=config, ...)
trainer.train()
trackio.finish()
```

## What Gets Logged

With TRL/Transformers integration, trackio automatically captures:
- Training loss
- Learning rate
- Eval metrics
- Training throughput

For manual logging, log any numeric metrics:

```python
trackio.log({
    "train_loss": 0.5,
    "train_accuracy": 0.85,
    "val_loss": 0.4,
    "val_accuracy": 0.88,
    "epoch": 1
})
```

## Grouping Runs

Use `group` to organize related experiments in the dashboard sidebar:

```python
# Group by experiment type
trackio.init(project="my-project", name="baseline-v1", group="baseline")
trackio.init(project="my-project", name="augmented-v1", group="augmented")

# Group by hyperparameter
trackio.init(project="hyperparam-sweep", name="lr-0.001", group="lr_0.001")
trackio.init(project="hyperparam-sweep", name="lr-0.01", group="lr_0.01")
```

## Configuration Best Practices

Keep config minimal — only log what's useful for comparing runs:

```python
trackio.init(
    project="qwen-sft-capybara",
    name="baseline-lr2e5",
    config={
        "model": "Qwen/Qwen2.5-0.5B",
        "dataset": "trl-lib/Capybara",
        "learning_rate": 2e-5,
        "num_epochs": 3,
        "batch_size": 8,
    }
)
```

## Embedding Dashboards

Embed Space dashboards in websites with query parameters:

```html
<iframe 
  src="https://username-trackio.hf.space/?project=my-project&metrics=train_loss,val_loss&sidebar=hidden" 
  style="width:1600px; height:500px; border:0;">
</iframe>
```

Query parameters:
- `project`: Filter to specific project
- `metrics`: Comma-separated metric names to show
- `sidebar`: `hidden` or `collapsed`
- `smoothing`: 0-20 (smoothing slider value)
- `xmin`, `xmax`: X-axis limits
