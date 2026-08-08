#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "trl>=0.12.0",
#     "transformers>=4.36.0",
#     "accelerate>=0.24.0",
#     "trackio",
# ]
# ///

"""
Production-ready GRPO training example for online RL.

GRPO (Group Relative Policy Optimization) is an online RL method that
optimizes relative to group performance. Best for tasks with automatic
reward signals like code execution or math verification.

Usage with hf_jobs MCP tool:
    hf_jobs("uv", {
        "script": '''<paste this entire file>''',
        "flavor": "a10g-large",
        "timeout": "4h",
        "secrets": {"HF_TOKEN": "$HF_TOKEN"},
    })

Or submit the script content directly inline without saving to a file.

Note: For most GRPO use cases, the TRL maintained script is recommended:
    https://raw.githubusercontent.com/huggingface/trl/main/examples/scripts/grpo.py
"""

import trackio
from datasets import load_dataset
from trl import GRPOTrainer, GRPOConfig


# Load dataset (GRPO uses prompt-only format)
dataset = load_dataset("trl-lib/math_shepherd", split="train")
print(f"✅ Dataset loaded: {len(dataset)} prompts")

# Training configuration
config = GRPOConfig(
    # CRITICAL: Hub settings
    output_dir="qwen-grpo-math",
    push_to_hub=True,
    hub_model_id="username/qwen-grpo-math",
    hub_strategy="every_save",

    # Training parameters
    num_train_epochs=1,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=1e-6,

    # Logging & checkpointing
    logging_steps=10,
    save_strategy="steps",
    save_steps=100,
    save_total_limit=2,

    # Optimization
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",

    # Monitoring
    report_to="trackio",  # Integrate with Trackio
    project="meaningful_project_name", # project name for the training name (trackio)
    run_name="baseline-run", #Descriptive name for this training run

)

# Initialize and train
# Note: GRPO requires an instruct-tuned model as the base
trainer = GRPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",
    train_dataset=dataset,
    args=config,
)

print("🚀 Starting GRPO training...")
trainer.train()

print("💾 Pushing to Hub...")
trainer.push_to_hub()


print("✅ Complete! Model at: https://huggingface.co/username/qwen-grpo-math")
print("📊 View metrics at: https://huggingface.co/spaces/username/trackio")