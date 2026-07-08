# Trackio Alerts

Alerts let you flag important training events directly from code. They are the primary mechanism for LLM agents to diagnose runs and iterate autonomously on ML experiments.

Alerts are printed to the terminal, stored in the database, displayed in the dashboard, and optionally sent to webhooks (Slack/Discord).

## Core API

### trackio.alert()

```python
trackio.alert(
    title="Loss divergence",                    # Short title (required)
    text="Loss 5.2 still high after 200 steps", # Detailed description (optional)
    level=trackio.AlertLevel.WARN,               # INFO, WARN, or ERROR (default: WARN)
    webhook_url="https://hooks.slack.com/...",   # Per-alert webhook override (optional)
)
```

### Alert Levels

| Level | Usage |
|-------|-------|
| `trackio.AlertLevel.INFO` | Informational milestones (checkpoints saved, eval completed) |
| `trackio.AlertLevel.WARN` | Potential issues (loss plateau, low accuracy, high gradient norm) |
| `trackio.AlertLevel.ERROR` | Critical failures (NaN loss, divergence, OOM) |

### Webhook Support

Set a global webhook URL via `trackio.init()` or the `TRACKIO_WEBHOOK_URL` environment variable. Alerts are auto-formatted for Slack and Discord URLs.

```python
trackio.init(
    project="my-project",
    webhook_url="https://hooks.slack.com/services/...",
    webhook_min_level=trackio.AlertLevel.WARN,  # Only send WARN+ to webhook
)
```

Per-alert override:

```python
trackio.alert(
    title="Critical failure",
    level=trackio.AlertLevel.ERROR,
    webhook_url="https://hooks.slack.com/services/...",  # Overrides global URL
)
```

Environment variables:
- `TRACKIO_WEBHOOK_URL` — global webhook URL
- `TRACKIO_WEBHOOK_MIN_LEVEL` — minimum level for webhook delivery (`info`, `warn`, `error`)

## Retrieving Alerts (CLI)

```bash
# List all alerts for a project
trackio list alerts --project my-project --json

# Filter by run or level
trackio list alerts --project my-project --run my-run --level error --json

# Poll for new alerts since a timestamp (efficient for agents)
trackio list alerts --project my-project --json --since "2025-06-01T12:00:00"
```

### JSON Output Structure

```json
{
  "project": "my-project",
  "run": null,
  "level": null,
  "since": "2025-06-01T12:00:00",
  "alerts": [
    {
      "run": "run-name",
      "title": "Loss divergence",
      "text": "Loss 5.2 still high after 200 steps",
      "level": "warn",
      "step": 200,
      "timestamp": "2025-06-01T12:05:30"
    }
  ]
}
```

## Autonomous Agent Workflow

The recommended pattern for an LLM agent running ML experiments:

### 1. Insert Alerts Into Training Code

Add diagnostic `trackio.alert()` calls for conditions the agent should react to:

```python
import trackio

trackio.init(project="hyperparam-sweep", config={"lr": lr, "batch_size": bs})

for step in range(num_steps):
    loss = train_step()
    trackio.log({"loss": loss, "step": step})

    if step > 200 and loss > 5.0:
        trackio.alert(
            title="Loss divergence",
            text=f"Loss {loss:.4f} still above 5.0 after {step} steps — learning rate may be too high",
            level=trackio.AlertLevel.ERROR,
        )

    if step > 500 and loss_delta < 0.001:
        trackio.alert(
            title="Training stall",
            text=f"Loss barely changed over last 100 steps (delta={loss_delta:.6f})",
            level=trackio.AlertLevel.WARN,
        )

    if math.isnan(loss):
        trackio.alert(
            title="NaN loss",
            text="Loss became NaN — training is broken",
            level=trackio.AlertLevel.ERROR,
        )
        break

trackio.finish()
```

### 2. Monitor Alerts

Alerts are automatically printed to the terminal when fired. If the agent is watching the training script's output (e.g. running in the foreground or tailing logs), it will see alerts immediately — no polling needed.

For background or detached runs, poll for alerts via CLI:

```bash
# Poll for alerts (run periodically)
trackio list alerts --project hyperparam-sweep --json --since "2025-06-01T00:00:00"
```

### 3. Inspect Metrics Around the Alert

When an alert fires, use `trackio get snapshot` to see all metrics at that point:

```bash
# Alert fired at step 200 — get all metrics in a ±5 step window
trackio get snapshot --project hyperparam-sweep --run run-1 --around 200 --window 5 --json

# Or inspect a single metric around the alert's timestamp
trackio get metric --project hyperparam-sweep --run run-1 --metric loss --around 200 --window 10 --json
```

### 4. React and Iterate

Based on alerts:
- **ERROR alerts** → stop the run, adjust hyperparameters, relaunch
- **WARN alerts** → inspect metrics with `trackio get snapshot ...`, decide whether to intervene
- **INFO alerts** → note progress, continue monitoring

### 5. Compare Across Runs

```bash
# Check metrics from previous runs
trackio get run --project hyperparam-sweep --run run-1 --json
trackio get metric --project hyperparam-sweep --run run-1 --metric loss --json

# Launch new run with adjusted config
python train.py --lr 5e-5
```

## Using Alerts with Transformers / TRL

When using `report_to="trackio"`, you don't control the training loop directly. Use a `TrainerCallback` to fire alerts:

```python
from transformers import TrainerCallback

class AlertCallback(TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):
        if "trackio" not in args.report_to:
            return
        if logs and "loss" in logs:
            if logs["loss"] > 5.0 and state.global_step > 100:
                trackio.alert(
                    title="High loss",
                    text=f"Loss {logs['loss']:.4f} at step {state.global_step}",
                    level=trackio.AlertLevel.ERROR,
                )

trainer = SFTTrainer(
    model=model,
    args=SFTConfig(output_dir="./out", report_to="trackio"),
    callbacks=[AlertCallback()],
    ...
)
```
