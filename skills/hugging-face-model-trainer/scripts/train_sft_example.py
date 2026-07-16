#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "trl>=0.12.0",
#     "peft>=0.7.0",
#     "transformers>=4.36.0",
#     "accelerate>=0.24.0",
#     "trackio",
# ]
# ///

"""
Production-ready SFT training example with all best practices.

This script demonstrates:
- Trackio integration for real-time monitoring
- LoRA/PEFT for efficient training
- Proper Hub saving configuration
- Train/eval split for monitoring
- Checkpoint management
- Optimized training parameters

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
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig


# Load dataset
print("📦 Loading dataset...")
dataset = load_dataset("trl-lib/Capybara", split="train")
print(f"✅ Dataset loaded: {len(dataset)} examples")

# Create train/eval split
print("🔀 Creating train/eval split...")
dataset_split = dataset.train_test_split(test_size=0.1, seed=42)
train_dataset = dataset_split["train"]
eval_dataset = dataset_split["test"]
print(f"   Train: {len(train_dataset)} examples")
print(f"   Eval: {len(eval_dataset)} examples")

# Note: For memory-constrained demos, skip eval by using full dataset as train_dataset
# and removing eval_dataset, eval_strategy, and eval_steps from config below

# Training configuration
config = SFTConfig(
    # CRITICAL: Hub settings
    output_dir="qwen-capybara-sft",
    push_to_hub=True,
    hub_model_id="username/qwen-capybara-sft",
    hub_strategy="every_save",  # Push checkpoints

    # Training parameters
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-5,
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

# LoRA configuration
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "v_proj"],
)

# Initialize and train
print("🎯 Initializing trainer...")
trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,  # CRITICAL: Must provide eval_dataset when eval_strategy is enabled
    args=config,
    peft_config=peft_config,
)

print("🚀 Starting training...")
trainer.train()

print("💾 Pushing to Hub...")
trainer.push_to_hub()

# Finish Trackio tracking
trackio.finish()

print("✅ Complete! Model at: https://huggingface.co/username/qwen-capybara-sft")
print("📊 View metrics at: https://huggingface.co/spaces/username/trackio")