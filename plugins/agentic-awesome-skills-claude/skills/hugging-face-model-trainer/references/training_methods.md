# TRL Training Methods Overview

TRL (Transformer Reinforcement Learning) provides multiple training methods for fine-tuning and aligning language models. This reference provides a brief overview of each method.

## Supervised Fine-Tuning (SFT)

**What it is:** Standard instruction tuning with supervised learning on demonstration data.

**When to use:**
- Initial fine-tuning of base models on task-specific data
- Teaching new capabilities or domains
- Most common starting point for fine-tuning

**Dataset format:** Conversational format with "messages" field, OR text field, OR prompt/completion pairs

**Example:**
```python
from trl import SFTTrainer, SFTConfig

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    args=SFTConfig(
        output_dir="my-model",
        push_to_hub=True,
        hub_model_id="username/my-model",
        eval_strategy="no",  # Disable eval for simple example
        # max_length=1024 is the default - only set if you need different length
    )
)
trainer.train()
```

**Note:** For production training with evaluation monitoring, see `scripts/train_sft_example.py`

**Documentation:** `hf_doc_fetch("https://huggingface.co/docs/trl/sft_trainer")`

## Direct Preference Optimization (DPO)

**What it is:** Alignment method that trains directly on preference pairs (chosen vs rejected responses) without requiring a reward model.

**When to use:**
- Aligning models to human preferences
- Improving response quality after SFT
- Have paired preference data (chosen/rejected responses)

**Dataset format:** Preference pairs with "chosen" and "rejected" fields

**Example:**
```python
from trl import DPOTrainer, DPOConfig

trainer = DPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",  # Use instruct model
    train_dataset=dataset,
    args=DPOConfig(
        output_dir="dpo-model",
        beta=0.1,  # KL penalty coefficient
        eval_strategy="no",  # Disable eval for simple example
        # max_length=1024 is the default - only set if you need different length
    )
)
trainer.train()
```

**Note:** For production training with evaluation monitoring, see `scripts/train_dpo_example.py`

**Documentation:** `hf_doc_fetch("https://huggingface.co/docs/trl/dpo_trainer")`

## Group Relative Policy Optimization (GRPO)

**What it is:** Online RL method that optimizes relative to group performance, useful for tasks with verifiable rewards.

**When to use:**
- Tasks with automatic reward signals (code execution, math verification)
- Online learning scenarios
- When DPO offline data is insufficient

**Dataset format:** Prompt-only format (model generates responses, reward computed online)

**Example:**
```python
# Use TRL maintained script
hf_jobs("uv", {
    "script": "https://raw.githubusercontent.com/huggingface/trl/main/examples/scripts/grpo.py",
    "script_args": [
        "--model_name_or_path", "Qwen/Qwen2.5-0.5B-Instruct",
        "--dataset_name", "trl-lib/math_shepherd",
        "--output_dir", "grpo-model"
    ],
    "flavor": "a10g-large",
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

**Documentation:** `hf_doc_fetch("https://huggingface.co/docs/trl/grpo_trainer")`

## Reward Modeling

**What it is:** Train a reward model to score responses, used as a component in RLHF pipelines.

**When to use:**
- Building RLHF pipeline
- Need automatic quality scoring
- Creating reward signals for PPO training

**Dataset format:** Preference pairs with "chosen" and "rejected" responses

**Documentation:** `hf_doc_fetch("https://huggingface.co/docs/trl/reward_trainer")`

## Method Selection Guide

| Method | Complexity | Data Required | Use Case |
|--------|-----------|---------------|----------|
| **SFT** | Low | Demonstrations | Initial fine-tuning |
| **DPO** | Medium | Paired preferences | Post-SFT alignment |
| **GRPO** | Medium | Prompts + reward fn | Online RL with automatic rewards |
| **Reward** | Medium | Paired preferences | Building RLHF pipeline |

## Recommended Pipeline

**For most use cases:**
1. **Start with SFT** - Fine-tune base model on task data
2. **Follow with DPO** - Align to preferences using paired data
3. **Optional: GGUF conversion** - Deploy for local inference

**For advanced RL scenarios:**
1. **Start with SFT** - Fine-tune base model
2. **Train reward model** - On preference data

## Dataset Format Reference

For complete dataset format specifications, use:
```python
hf_doc_fetch("https://huggingface.co/docs/trl/dataset_formats")
```

Or validate your dataset:
```bash
uv run https://huggingface.co/datasets/mcp-tools/skills/raw/main/dataset_inspector.py \
  --dataset your/dataset --split train
```

## See Also

- `references/training_patterns.md` - Common training patterns and examples
- `scripts/train_sft_example.py` - Complete SFT template
- `scripts/train_dpo_example.py` - Complete DPO template
- [Dataset Inspector](https://huggingface.co/datasets/mcp-tools/skills/raw/main/dataset_inspector.py) - Dataset format validation tool
