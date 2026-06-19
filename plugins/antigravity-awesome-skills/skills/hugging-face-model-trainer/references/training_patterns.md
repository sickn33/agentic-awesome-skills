# Common Training Patterns

This guide provides common training patterns and use cases for TRL on Hugging Face Jobs.

## Multi-GPU Training

Automatic distributed training across multiple GPUs. TRL/Accelerate handles distribution automatically:

```python
hf_jobs("uv", {
    "script": """
# Your training script here (same as single GPU)
# No changes needed - Accelerate detects multiple GPUs
""",
    "flavor": "a10g-largex2",  # 2x A10G GPUs
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

**Tips for multi-GPU:**
- No code changes needed
- Use `per_device_train_batch_size` (per GPU, not total)
- Effective batch size = `per_device_train_batch_size` × `num_gpus` × `gradient_accumulation_steps`
- Monitor GPU utilization to ensure both GPUs are being used

## DPO Training (Preference Learning)

Train with preference data for alignment:

```python
hf_jobs("uv", {
    "script": """
# /// script
# dependencies = ["trl>=0.12.0", "trackio"]
# ///

from datasets import load_dataset
from trl import DPOTrainer, DPOConfig
import trackio

dataset = load_dataset("trl-lib/ultrafeedback_binarized", split="train")

# Create train/eval split
dataset_split = dataset.train_test_split(test_size=0.1, seed=42)

config = DPOConfig(
    output_dir="dpo-model",
    push_to_hub=True,
    hub_model_id="username/dpo-model",
    num_train_epochs=1,
    beta=0.1,  # KL penalty coefficient
    eval_strategy="steps",
    eval_steps=50,
    report_to="trackio",
    run_name="baseline_run", # use a meaningful run name
    # max_length=1024,  # Default - only set if you need different sequence length
)

trainer = DPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",  # Use instruct model as base
    train_dataset=dataset_split["train"],
    eval_dataset=dataset_split["test"],  # IMPORTANT: Provide eval_dataset when eval_strategy is enabled
    args=config,
)

trainer.train()
trainer.push_to_hub()
trackio.finish()
""",
    "flavor": "a10g-large",
    "timeout": "3h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

**For DPO documentation:** Use `hf_doc_fetch("https://huggingface.co/docs/trl/dpo_trainer")`

## GRPO Training (Online RL)

Group Relative Policy Optimization for online reinforcement learning:

```python
hf_jobs("uv", {
    "script": "https://raw.githubusercontent.com/huggingface/trl/main/examples/scripts/grpo.py",
    "script_args": [
        "--model_name_or_path", "Qwen/Qwen2.5-0.5B-Instruct",
        "--dataset_name", "trl-lib/math_shepherd",
        "--output_dir", "grpo-model",
        "--push_to_hub",
        "--hub_model_id", "username/grpo-model"
    ],
    "flavor": "a10g-large",
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

**For GRPO documentation:** Use `hf_doc_fetch("https://huggingface.co/docs/trl/grpo_trainer")`

## Trackio Configuration

**Use sensible defaults for trackio setup.** See `references/trackio_guide.md` for complete documentation including grouping runs for experiments.

### Basic Pattern

```python
import trackio

trackio.init(
    project="my-training",
    run_name="baseline-run",             # Descriptive name user will recognize
    space_id="username/trackio",     # Default space: {username}/trackio
    config={
        # Keep config minimal - hyperparameters and model/dataset info only
        "model": "Qwen/Qwen2.5-0.5B",
        "dataset": "trl-lib/Capybara",
        "learning_rate": 2e-5,
    }
)

# Your training code...

trackio.finish()
```

### Grouping for Experiments (Optional)

When user wants to compare related runs, use the `group` parameter:

```python
# Hyperparameter sweep
trackio.init(project="hyperparam-sweep", run_name="lr-0.001", group="lr_0.001")
trackio.init(project="hyperparam-sweep", run_name="lr-0.01", group="lr_0.01")
```

## Pattern Selection Guide

| Use Case | Pattern | Hardware | Time |
|----------|---------|----------|------|
| SFT training | `scripts/train_sft_example.py` | a10g-large | 2-6 hours |
| Large dataset (>10K) | Multi-GPU | a10g-largex2 | 4-12 hours |
| Preference learning | DPO Training | a10g-large | 2-4 hours |
| Online RL | GRPO Training | a10g-large | 3-6 hours |

## Critical: Evaluation Dataset Requirements

**⚠️ IMPORTANT**: If you set `eval_strategy="steps"` or `eval_strategy="epoch"`, you **MUST** provide an `eval_dataset` to the trainer, or the training will hang.

### ✅ CORRECT - With eval dataset:
```python
dataset_split = dataset.train_test_split(test_size=0.1, seed=42)

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset_split["train"],
    eval_dataset=dataset_split["test"],  # ← MUST provide when eval_strategy is enabled
    args=SFTConfig(eval_strategy="steps", ...),
)
```

### ❌ WRONG - Will hang:
```python
trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    # NO eval_dataset but eval_strategy="steps" ← WILL HANG
    args=SFTConfig(eval_strategy="steps", ...),
)
```

### Option: Disable evaluation if no eval dataset
```python
config = SFTConfig(
    eval_strategy="no",  # ← Explicitly disable evaluation
    # ... other config
)

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    # No eval_dataset needed
    args=config,
)
```

## Best Practices

1. **Use train/eval splits** - Create evaluation split for monitoring progress
2. **Enable Trackio** - Monitor progress in real-time
3. **Add 20-30% buffer to timeout** - Account for loading/saving overhead
4. **Test with TRL official scripts first** - Use maintained examples before custom code
5. **Always provide eval_dataset** - When using eval_strategy, or set to "no"
6. **Use multi-GPU for large models** - 7B+ models benefit significantly

## See Also

- `scripts/train_sft_example.py` - Complete SFT template with Trackio and eval split
- `scripts/train_dpo_example.py` - Complete DPO template
- `scripts/train_grpo_example.py` - Complete GRPO template
- `references/hardware_guide.md` - Detailed hardware specifications
- `references/training_methods.md` - Overview of all TRL training methods
- `references/troubleshooting.md` - Common issues and solutions
