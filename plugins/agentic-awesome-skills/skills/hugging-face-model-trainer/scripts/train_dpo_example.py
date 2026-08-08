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
Production-ready DPO training example for preference learning.

DPO (Direct Preference Optimization) trains models on preference pairs
(chosen vs rejected responses) without requiring a reward model.

Usage with hf_jobs MCP tool:
    hf_jobs("uv", {
        "script": '''<paste this entire file>''',
        "flavor": "a10g-large",
        "timeout": "3h",
        "secrets": {"HF_TOKEN": "$HF_TOKEN"},
    })

Or submit the script content directly inline without saving to a file.
"""

import trackio
from datasets import load_dataset
from trl import DPOTrainer, DPOConfig


# Load preference dataset
print("📦 Loading dataset...")
dataset = load_dataset("trl-lib/ultrafeedback_binarized", split="train")
print(f"✅ Dataset loaded: {len(dataset)} preference pairs")

# Create train/eval split
print("🔀 Creating train/eval split...")
dataset_split = dataset.train_test_split(test_size=0.1, seed=42)
train_dataset = dataset_split["train"]
eval_dataset = dataset_split["test"]
print(f"   Train: {len(train_dataset)} pairs")
print(f"   Eval: {len(eval_dataset)} pairs")

# Training configuration
config = DPOConfig(
    # CRITICAL: Hub settings
    output_dir="qwen-dpo-aligned",
    push_to_hub=True,
    hub_model_id="username/qwen-dpo-aligned",
    hub_strategy="every_save",

    # DPO-specific parameters
    beta=0.1,  # KL penalty coefficient (higher = stay closer to reference)

    # Training parameters
    num_train_epochs=1,  # DPO typically needs fewer epochs than SFT
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=5e-7,  # DPO uses much lower LR than SFT
    # max_length=1024,  # Default - only set if you need different sequence length

    # Logging & checkpointing
    logging_steps=10,
    save_strategy="steps",
    save_steps=100,
    save_total_limit=2,

    # Evaluation - IMPORTANT: Only enable if eval_dataset provided
    eval_strategy="steps",
    eval_steps=100,

    # Optimization
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",

    # Monitoring
    report_to="trackio",  # Integrate with Trackio
    project="meaningful_project_name", # project name for the training name (trackio)
    run_name="baseline-run", #Descriptive name for this training run

)

# Initialize and train
# Note: DPO requires an instruct-tuned model as the base
print("🎯 Initializing trainer...")
trainer = DPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",  # Use instruct model, not base model
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,  # CRITICAL: Must provide eval_dataset when eval_strategy is enabled
    args=config,
)

print("🚀 Starting DPO training...")
trainer.train()

print("💾 Pushing to Hub...")
trainer.push_to_hub()

# Finish Trackio tracking
trackio.finish()

print("✅ Complete! Model at: https://huggingface.co/username/qwen-dpo-aligned")
print("📊 View metrics at: https://huggingface.co/spaces/username/trackio")