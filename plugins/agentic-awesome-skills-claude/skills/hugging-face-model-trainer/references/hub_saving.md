# Saving Training Results to Hugging Face Hub

**⚠️ CRITICAL:** Training environments are ephemeral. ALL results are lost when a job completes unless pushed to the Hub.

## Why Hub Push is Required

When running on Hugging Face Jobs:
- Environment is temporary
- All files deleted on job completion
- No local disk persistence
- Cannot access results after job ends

**Without Hub push, training is completely wasted.**

## Required Configuration

### 1. Training Configuration

In your SFTConfig or trainer config:

```python
SFTConfig(
    push_to_hub=True,                    # Enable Hub push
    hub_model_id="username/model-name",   # Target repository
)
```

### 2. Job Configuration

When submitting the job:

```python
hf_jobs("uv", {
    "script": "train.py",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # Provide authentication
})
```

**The `$HF_TOKEN` placeholder is automatically replaced with your Hugging Face token.**

## Complete Example

```python
# train.py
# /// script
# dependencies = ["trl"]
# ///

from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

dataset = load_dataset("trl-lib/Capybara", split="train")

# Configure with Hub push
config = SFTConfig(
    output_dir="my-model",
    num_train_epochs=3,
    
    # ✅ CRITICAL: Hub push configuration
    push_to_hub=True,
    hub_model_id="myusername/my-trained-model",
    
    # Optional: Push strategy
    push_to_hub_model_id="myusername/my-trained-model",
    push_to_hub_organization=None,
    push_to_hub_token=None,  # Uses environment token
)

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    args=config,
)

trainer.train()

# ✅ Push final model
trainer.push_to_hub()

print("✅ Model saved to: https://huggingface.co/myusername/my-trained-model")
```

**Submit with authentication:**

```python
hf_jobs("uv", {
    "script": "train.py",
    "flavor": "a10g-large",
    "timeout": "2h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Required!
})
```

## What Gets Saved

When `push_to_hub=True`:

1. **Model weights** - Final trained parameters
2. **Tokenizer** - Associated tokenizer
3. **Configuration** - Model config (config.json)
4. **Training arguments** - Hyperparameters used
5. **Model card** - Auto-generated documentation
6. **Checkpoints** - If `save_strategy="steps"` enabled

## Checkpoint Saving

Save intermediate checkpoints during training:

```python
SFTConfig(
    output_dir="my-model",
    push_to_hub=True,
    hub_model_id="username/my-model",
    
    # Checkpoint configuration
    save_strategy="steps",
    save_steps=100,              # Save every 100 steps
    save_total_limit=3,          # Keep only last 3 checkpoints
)
```

**Benefits:**
- Resume training if job fails
- Compare checkpoint performance
- Use intermediate models

**Checkpoints are pushed to:** `username/my-model` (same repo)

## Authentication Methods

### Method 1: Automatic Token (Recommended)

```python
"secrets": {"HF_TOKEN": "$HF_TOKEN"}
```

Uses your logged-in Hugging Face token automatically.

### Method 2: Explicit Token

```python
"secrets": {"HF_TOKEN": "hf_abc123..."}
```

Provide token explicitly (not recommended for security).

### Method 3: Environment Variable

```python
"env": {"HF_TOKEN": "hf_abc123..."}
```

Pass as regular environment variable (less secure than secrets).

**Always prefer Method 1** for security and convenience.

## Verification Checklist

Before submitting any training job, verify:

- [ ] `push_to_hub=True` in training config
- [ ] `hub_model_id` is specified (format: `username/model-name`)
- [ ] `secrets={"HF_TOKEN": "$HF_TOKEN"}` in job config
- [ ] Repository name doesn't conflict with existing repos
- [ ] You have write access to the target namespace

## Repository Setup

### Automatic Creation

If repository doesn't exist, it's created automatically when first pushing.

### Manual Creation

Create repository before training:

```python
from huggingface_hub import HfApi

api = HfApi()
api.create_repo(
    repo_id="username/model-name",
    repo_type="model",
    private=False,  # or True for private repo
)
```

### Repository Naming

**Valid names:**
- `username/my-model`
- `username/model-name`
- `organization/model-name`

**Invalid names:**
- `model-name` (missing username)
- `username/model name` (spaces not allowed)
- `username/MODEL` (uppercase discouraged)

## Troubleshooting

### Error: 401 Unauthorized

**Cause:** HF_TOKEN not provided or invalid

**Solutions:**
1. Verify `secrets={"HF_TOKEN": "$HF_TOKEN"}` in job config
2. Check you're logged in: `hf auth whoami`
3. Re-login: `hf auth login`

### Error: 403 Forbidden

**Cause:** No write access to repository

**Solutions:**
1. Check repository namespace matches your username
2. Verify you're a member of organization (if using org namespace)
3. Check repository isn't private (if accessing org repo)

### Error: Repository not found

**Cause:** Repository doesn't exist and auto-creation failed

**Solutions:**
1. Manually create repository first
2. Check repository name format
3. Verify namespace exists

### Error: Push failed during training

**Cause:** Network issues or Hub unavailable

**Solutions:**
1. Training continues but final push fails
2. Checkpoints may be saved
3. Re-run push manually after job completes

### Issue: Model saved but not visible

**Possible causes:**
1. Repository is private—check https://huggingface.co/username
2. Wrong namespace—verify `hub_model_id` matches login
3. Push still in progress—wait a few minutes

## Manual Push After Training

If training completes but push fails, push manually:

```python
from transformers import AutoModel, AutoTokenizer

# Load from local checkpoint
model = AutoModel.from_pretrained("./output_dir")
tokenizer = AutoTokenizer.from_pretrained("./output_dir")

# Push to Hub
model.push_to_hub("username/model-name", token="hf_abc123...")
tokenizer.push_to_hub("username/model-name", token="hf_abc123...")
```

**Note:** Only possible if job hasn't completed (files still exist).

## Best Practices

1. **Always enable `push_to_hub=True`**
2. **Use checkpoint saving** for long training runs
3. **Verify Hub push** in logs before job completes
4. **Set appropriate `save_total_limit`** to avoid excessive checkpoints
5. **Use descriptive repo names** (e.g., `qwen-capybara-sft` not `model1`)
6. **Add model card** with training details
7. **Tag models** with relevant tags (e.g., `text-generation`, `fine-tuned`)

## Monitoring Push Progress

Check logs for push progress:

```python
hf_jobs("logs", {"job_id": "your-job-id"})
```

**Look for:**
```
Pushing model to username/model-name...
Upload file pytorch_model.bin: 100%
✅ Model pushed successfully
```

## Example: Full Production Setup

```python
# production_train.py
# /// script
# dependencies = ["trl>=0.12.0", "peft>=0.7.0"]
# ///

from datasets import load_dataset
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig
import os

# Verify token is available
assert "HF_TOKEN" in os.environ, "HF_TOKEN not found in environment!"

# Load dataset
dataset = load_dataset("trl-lib/Capybara", split="train")
print(f"✅ Dataset loaded: {len(dataset)} examples")

# Configure with comprehensive Hub settings
config = SFTConfig(
    output_dir="qwen-capybara-sft",
    
    # Hub configuration
    push_to_hub=True,
    hub_model_id="myusername/qwen-capybara-sft",
    hub_strategy="checkpoint",  # Push checkpoints
    
    # Checkpoint configuration
    save_strategy="steps",
    save_steps=100,
    save_total_limit=3,
    
    # Training settings
    num_train_epochs=3,
    per_device_train_batch_size=4,
    
    # Logging
    logging_steps=10,
    logging_first_step=True,
)

# Train with LoRA
trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    args=config,
    peft_config=LoraConfig(r=16, lora_alpha=32),
)

print("🚀 Starting training...")
trainer.train()

print("💾 Pushing final model to Hub...")
trainer.push_to_hub()

print("✅ Training complete!")
print(f"Model available at: https://huggingface.co/myusername/qwen-capybara-sft")
```

**Submit:**

```python
hf_jobs("uv", {
    "script": "production_train.py",
    "flavor": "a10g-large",
    "timeout": "6h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

## Key Takeaway

**Without `push_to_hub=True` and `secrets={"HF_TOKEN": "$HF_TOKEN"}`, all training results are permanently lost.**

Always verify both are configured before submitting any training job.
