---
name: hugging-face-trackio
description: "Track and visualize ML training experiments with Trackio. Use when logging metrics during training (Python API), firing alerts for training diagnostics, or retrieving/analyzing logged metrics (CLI)."
risk: critical
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-trackio
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Trackio - Experiment Tracking for ML Training

Trackio is an experiment tracking library for logging and visualizing ML training metrics. It syncs to Hugging Face Spaces for real-time monitoring dashboards.

## Three Interfaces

| Task | Interface | Reference |
|------|-----------|-----------|
| **Logging metrics** during training | Python API | [references/logging_metrics.md](references/logging_metrics.md) |
| **Firing alerts** for training diagnostics | Python API | [references/alerts.md](references/alerts.md) |
| **Retrieving metrics & alerts** after/during training | CLI | [references/retrieving_metrics.md](references/retrieving_metrics.md) |

## When to Use Each

### Python API → Logging

Use `import trackio` in your training scripts to log metrics:

- Initialize tracking with `trackio.init()`
- Log metrics with `trackio.log()` or use TRL's `report_to="trackio"`
- Finalize with `trackio.finish()`

**Key concept**: Use local persistent storage by default. An authorized space_id can deploy or update a remote Space and transfer experiment data; verify destination visibility and storage persistence first.

→ See [references/logging_metrics.md](references/logging_metrics.md) for setup, TRL integration, and configuration options.

### Python API → Alerts

Insert `trackio.alert()` calls in training code to flag important events — like inserting print statements for debugging, but structured and queryable:

- `trackio.alert(title="...", level=trackio.AlertLevel.WARN)` — fire an alert
- Three severity levels: `INFO`, `WARN`, `ERROR`
- Alerts are printed to terminal, stored in the database, shown in the dashboard, and optionally sent to webhooks (Slack/Discord)

**Key concept for LLM agents**: Alerts are the primary mechanism for autonomous experiment iteration. An agent should insert alerts into training code for diagnostic conditions (loss spikes, NaN gradients, low accuracy, training stalls). Since alerts are printed to the terminal, an agent that is watching the training script's output will see them automatically. For background or detached runs, the agent can poll via CLI instead.

→ See [references/alerts.md](references/alerts.md) for the full alerts API, webhook setup, and autonomous agent workflows.

### CLI → Retrieving

Use the `trackio` command to query logged metrics and alerts:

- `trackio list projects/runs/metrics` — discover what's available
- `trackio get project/run/metric` — retrieve summaries and values
- `trackio list alerts --project <name> --json` — retrieve alerts
- `trackio show` — launch the dashboard
- `trackio sync` — sync to HF Space

**Key concept**: Add `--json` for programmatic output suitable for automation and LLM agents.

→ See [references/retrieving_metrics.md](references/retrieving_metrics.md) for all commands, workflows, and JSON output formats.

## Minimal Logging Setup

```python
import trackio

trackio.init(project="my-project")  # local by default
trackio.log({"loss": 0.1, "accuracy": 0.9})
trackio.log({"loss": 0.09, "accuracy": 0.91})
trackio.finish()
```

### Minimal Retrieval

```bash
trackio list projects --json
trackio get metric --project my-project --run my-run --metric loss --json
```

## Autonomous ML Experiment Workflow

When running experiments autonomously as an LLM agent, the recommended workflow is:

1. **Set up training with alerts** — insert `trackio.alert()` calls for diagnostic conditions
2. **Launch training** — run the script in the background
3. **Poll for alerts** — use `trackio list alerts --project <name> --json --since <timestamp>` to check for new alerts
4. **Read metrics** — use `trackio get metric ...` to inspect specific values
5. **Iterate within an authorized run/time/cost budget** — preserve checkpoints, inspect alerts, and decide whether a controlled change and new run are justified

```python
import trackio

trackio.init(project="my-project", config={"lr": 1e-4})

for step in range(num_steps):
    loss = train_step()
    trackio.log({"loss": loss, "step": step})

    if step > 100 and loss > 5.0:
        trackio.alert(
            title="Loss divergence",
            text=f"Loss {loss:.4f} still high after {step} steps",
            level=trackio.AlertLevel.ERROR,
        )
    if step > 0 and abs(loss) < 1e-8:
        trackio.alert(
            title="Vanishing loss",
            text="Loss near zero — inspect objective, data leakage and gradient metrics before diagnosing",
            level=trackio.AlertLevel.WARN,
        )

trackio.finish()
```

Then poll from a separate terminal/process:

```bash
trackio list alerts --project my-project --json --since "2025-01-01T00:00:00"
```

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.

### Privacy and execution boundaries

Check installed-version APIs and CLI --help before use. Training helpers and model/data variables in examples are application-supplied. Metrics/configs can contain sensitive data: do not log tokens, private samples or identifiers. Space creation/sync and webhook messages are external writes; require destination authorization, inspect inherited TRACKIO_* settings, and verify visibility on existing Spaces. Private flags do not make an already-public Space private. Missing alerts do not establish healthy training. Thresholds are task-specific; neither high nor near-zero loss alone diagnoses gradients. No training, installation or service interaction is included.
