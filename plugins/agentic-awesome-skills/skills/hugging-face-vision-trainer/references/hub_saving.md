# Saving Vision Models to Hugging Face Hub

## Contents
- Why Hub Push is Required
- Required Configuration (TrainingArguments, job config)
- Complete Example
- What Gets Saved
- Important: Save Image Processor
- Checkpoint Saving
- Model Card Configuration
- Saving Label Mappings
- Authentication Methods
- Verification Checklist
- Repository Setup (automatic/manual creation, naming)
- Troubleshooting (401, 403, push failures, inference issues)
- Manual Push After Training
- Example: Full Production Setup
- Inference Example

---

**CRITICAL:** Training environments are ephemeral. ALL results are lost when a job completes unless pushed to the Hub.

## Why Hub Push is Required

When running on Hugging Face Jobs:
- Environment is temporary
- All files deleted on job completion
- No local disk persistence
- Cannot access results after job ends

**Without Hub push, training is completely wasted.**

## Required Configuration

### 1. Training Configuration

In your TrainingArguments:

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="my-object-detector",
    push_to_hub=True,                    # Enable Hub push
    hub_model_id="username/model-name",   # Target repository
)
```

### 2. Job Configuration

When submitting the job:

```python
hf_jobs("uv", {
    "script": training_script_content,  # Pass the Python script content directly as a string
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # Provide authentication
})
```

**The `$HF_TOKEN` syntax references your actual Hugging Face token value.**

## Complete Example

```python
# train_detector.py
# /// script
# dependencies = ["transformers", "torch", "torchvision", "datasets"]
# ///

from transformers import (
    AutoImageProcessor,
    AutoModelForObjectDetection,
    TrainingArguments,
    Trainer
)
from datasets import load_dataset
import os
import torch

# Load dataset
dataset = load_dataset("cppe-5", split="train")

# Load model and processor
model_name = "facebook/detr-resnet-50"
image_processor = AutoImageProcessor.from_pretrained(model_name)
model = AutoModelForObjectDetection.from_pretrained(
    model_name,
    num_labels=5,  # Number of classes
    ignore_mismatched_sizes=True
)

# Configure with Hub push
training_args = TrainingArguments(
    output_dir="my-detector",
    num_train_epochs=10,
    per_device_train_batch_size=8,

    # ✅ CRITICAL: Hub push configuration
    push_to_hub=True,
    hub_model_id="myusername/cppe5-detector",

    # Optional: Push strategy
    hub_strategy="checkpoint",  # Push checkpoints during training
)

# ✅ CRITICAL: Authenticate with Hub BEFORE creating Trainer
from huggingface_hub import login
hf_token = os.environ.get("HF_TOKEN") or os.environ.get("hfjob")
if hf_token:
    login(token=hf_token)
    training_args.hub_token = hf_token
elif training_args.push_to_hub:
    raise ValueError("HF_TOKEN not found! Add secrets={'HF_TOKEN': '$HF_TOKEN'} to job config.")

# Define collate function
def collate_fn(batch):
    pixel_values = [item["pixel_values"] for item in batch]
    labels = [item["labels"] for item in batch]
    encoding = image_processor.pad(pixel_values, return_tensors="pt")
    return {
        "pixel_values": encoding["pixel_values"],
        "labels": labels
    }

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    data_collator=collate_fn,
)

trainer.train()

# ✅ Push final model and processor
trainer.push_to_hub()
image_processor.push_to_hub("myusername/cppe5-detector")

print("✅ Model saved to: https://huggingface.co/myusername/cppe5-detector")
```

**Submit with authentication:**

```python
hf_jobs("uv", {
    "script": training_script_content,  # Pass script content as a string, NOT a filename
    "flavor": "a10g-large",
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Required!
})
```

## What Gets Saved

When `push_to_hub=True`:

1. **Model weights** - Final trained parameters
2. **Image processor** - Associated preprocessing configuration
3. **Configuration** - Model config (config.json) including:
   - Number of labels/classes
   - Architecture details (backbone, num_queries, etc.)
   - Label mappings (id2label, label2id)
4. **Training arguments** - Hyperparameters used
5. **Model card** - Auto-generated documentation
6. **Checkpoints** - If `save_strategy="steps"` enabled

## Important: Save Image Processor

**Object detection models require the image processor to be saved separately:**

```python
# After training completes
trainer.push_to_hub()

# ✅ Also push the image processor
image_processor.push_to_hub(
    repo_id="username/model-name",
    commit_message="Upload image processor"
)
```

**Why this matters:**
- Models need specific image preprocessing (resizing, normalization)
- Image processor contains critical configuration
- Without it, model cannot be used for inference

## Checkpoint Saving

Save intermediate checkpoints during training:

```python
TrainingArguments(
    output_dir="my-detector",
    push_to_hub=True,
    hub_model_id="username/my-detector",

    # Checkpoint configuration
    save_strategy="steps",
    save_steps=500,              # Save every 500 steps
    save_total_limit=3,          # Keep only last 3 checkpoints
    hub_strategy="checkpoint",   # Push checkpoints to Hub
)
```

**Benefits:**
- Resume training if job fails
- Compare checkpoint performance
- Use intermediate models
- Track training progress

**Checkpoints are pushed to:** `username/my-detector` (same repo)

## Model Card Configuration

Add metadata for better discoverability:

```python
# At the end of training script
model.push_to_hub(
    "username/my-detector",
    commit_message="Upload trained object detection model",
    tags=["object-detection", "vision", "cppe-5"],
    model_card_kwargs={
        "license": "apache-2.0",
        "dataset": "cppe-5",
        "metrics": ["map", "recall", "precision"],
        "pipeline_tag": "object-detection",
    }
)
```

## Saving Label Mappings

**Critical for object detection:** Save class labels with the model:

```python
# Define your label mappings
id2label = {0: "Coverall", 1: "Face_Shield", 2: "Gloves", 3: "Goggles", 4: "Mask"}
label2id = {v: k for k, v in id2label.items()}

# Update model config before training
model.config.id2label = id2label
model.config.label2id = label2id

# Now train and push
trainer.train()
trainer.push_to_hub()
```

**Without label mappings:**
- Model outputs will be numeric IDs only
- No human-readable class names
- Difficult to interpret results

## Authentication Methods

For a complete guide on token types, `$HF_TOKEN` automatic replacement, `secrets` vs `env` differences, and security best practices, see the `hugging-face-jobs` skill → *Token Usage Guide*.

**Recommended:** Always pass tokens via `secrets` (encrypted server-side):

```python
"secrets": {"HF_TOKEN": "$HF_TOKEN"}  # ✅ Automatic replacement with your logged-in token
```

## Verification Checklist

Before submitting any training job, verify:

- [ ] `push_to_hub=True` in TrainingArguments
- [ ] `hub_model_id` is specified (format: `username/model-name`)
- [ ] Image processor will be saved separately
- [ ] Label mappings (id2label, label2id) are configured
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
    repo_id="username/detector-name",
    repo_type="model",
    private=False,  # or True for private repo
)
```

### Repository Naming

**Valid names:**
- `username/detr-cppe5`
- `username/yolos-object-detector`
- `organization/custom-detector`

**Invalid names:**
- `detector-name` (missing username)
- `username/detector name` (spaces not allowed)
- `username/DETECTOR` (uppercase discouraged)

**Recommended naming:**
- Include model architecture: `detr-`, `yolos-`, `deta-`
- Include dataset: `-cppe5`, `-coco`, `-voc`
- Be descriptive: `detr-resnet50-cppe5` > `model1`

## Troubleshooting

### Error: 401 Unauthorized

**Cause:** HF_TOKEN not provided, invalid, or not authenticated before Trainer init

**Solutions:**
1. Verify `secrets={"HF_TOKEN": "$HF_TOKEN"}` in job config
2. Verify script calls `login(token=hf_token)` AND sets `training_args.hub_token = hf_token` BEFORE creating the `Trainer`
3. Check you're logged in locally: `hf auth whoami`
4. Re-login: `hf auth login`

**Root cause:** The `Trainer` calls `create_repo(token=self.args.hub_token)` during `__init__()` when `push_to_hub=True`. Relying on implicit env-var token resolution is unreliable in Jobs. Calling `login()` saves the token globally, and setting `training_args.hub_token` ensures the Trainer passes it explicitly to all Hub API calls.

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

### Issue: Model loads but inference fails

**Possible causes:**
1. Image processor not saved—verify it's pushed separately
2. Label mappings missing—check config.json has id2label
3. Wrong image size—verify image processor matches training config

### Issue: Model saved but not visible

**Possible causes:**
1. Repository is private—check https://huggingface.co/username
2. Wrong namespace—verify `hub_model_id` matches login
3. Push still in progress—wait a few minutes

## Manual Push After Training

If training completes but push fails, push manually:

```python
from transformers import AutoModelForObjectDetection, AutoImageProcessor

# Load from local checkpoint
model = AutoModelForObjectDetection.from_pretrained("./output_dir")
image_processor = AutoImageProcessor.from_pretrained("./output_dir")

# Push to Hub
model.push_to_hub("username/model-name", token="hf_abc123...")
image_processor.push_to_hub("username/model-name", token="hf_abc123...")
```

**Note:** Only possible if job hasn't completed (files still exist).

## Best Practices

1. **Always enable `push_to_hub=True`**
2. **Save image processor separately** - critical for inference
3. **Configure label mappings** before training
4. **Use checkpoint saving** for long training runs
5. **Verify Hub push** in logs before job completes
6. **Set appropriate `save_total_limit`** to avoid excessive checkpoints
7. **Use descriptive repo names** (e.g., `detr-cppe5` not `detector1`)
8. **Add model card** with:
   - Training dataset
   - Evaluation metrics (mAP, IoU)
   - Example usage code
   - Limitations
9. **Tag models appropriately**:
   - `object-detection`
   - Architecture: `detr`, `yolos`, `deta`
   - Dataset: `coco`, `voc`, `cppe-5`

## Monitoring Push Progress

Check logs for push progress:

```python
hf_jobs("logs", {"job_id": "your-job-id"})
```

**Look for:**
```
Pushing model to username/detector-name...
Upload file pytorch_model.bin: 100%
✅ Model pushed successfully
Pushing image processor...
✅ Image processor pushed successfully
```

## Example: Full Production Setup

```python
# production_detector.py
# /// script
# dependencies = [
#     "transformers>=4.30.0",
#     "torch>=2.0.0",
#     "torchvision>=0.15.0",
#     "datasets>=2.12.0",
#     "evaluate>=0.4.0"
# ]
# ///

from transformers import (
    AutoImageProcessor,
    AutoModelForObjectDetection,
    TrainingArguments,
    Trainer
)
from datasets import load_dataset
import os
import torch

# Configuration
MODEL_NAME = "facebook/detr-resnet-50"
DATASET_NAME = "cppe-5"
HUB_MODEL_ID = "myusername/detr-cppe5-detector"
NUM_CLASSES = 5

# Class labels
id2label = {0: "Coverall", 1: "Face_Shield", 2: "Gloves", 3: "Goggles", 4: "Mask"}
label2id = {v: k for k, v in id2label.items()}

print(f"🔧 Loading dataset: {DATASET_NAME}")
dataset = load_dataset(DATASET_NAME, split="train")
print(f"✅ Dataset loaded: {len(dataset)} examples")

print(f"🔧 Loading model: {MODEL_NAME}")
image_processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = AutoModelForObjectDetection.from_pretrained(
    MODEL_NAME,
    num_labels=NUM_CLASSES,
    id2label=id2label,
    label2id=label2id,
    ignore_mismatched_sizes=True
)
print("✅ Model loaded")

# Configure with comprehensive Hub settings
training_args = TrainingArguments(
    output_dir="detr-cppe5",

    # Hub configuration
    push_to_hub=True,
    hub_model_id=HUB_MODEL_ID,
    hub_strategy="checkpoint",  # Push checkpoints

    # Checkpoint configuration
    save_strategy="steps",
    save_steps=500,
    save_total_limit=3,

    # Training settings
    num_train_epochs=10,
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    learning_rate=1e-4,
    warmup_steps=500,

    # Evaluation
    eval_strategy="steps",
    eval_steps=500,

    # Logging
    logging_steps=50,
    logging_first_step=True,

    # Performance
    fp16=True,  # Mixed precision training
    dataloader_num_workers=4,
)

# ✅ CRITICAL: Authenticate with Hub BEFORE creating Trainer
# login() saves the token globally so ALL hub operations can find it.
from huggingface_hub import login
hf_token = os.environ.get("HF_TOKEN") or os.environ.get("hfjob")
if hf_token:
    login(token=hf_token)
    training_args.hub_token = hf_token
elif training_args.push_to_hub:
    raise ValueError("HF_TOKEN not found! Add secrets={'HF_TOKEN': '$HF_TOKEN'} to job config.")

# Data collator
def collate_fn(batch):
    pixel_values = [item["pixel_values"] for item in batch]
    labels = [item["labels"] for item in batch]
    encoding = image_processor.pad(pixel_values, return_tensors="pt")
    return {
        "pixel_values": encoding["pixel_values"],
        "labels": labels
    }

# Create trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    data_collator=collate_fn,
)

print("🚀 Starting training...")
trainer.train()

print("💾 Pushing final model to Hub...")
trainer.push_to_hub(
    commit_message="Upload trained DETR model on CPPE-5",
    tags=["object-detection", "detr", "cppe-5", "vision"],
)

print("💾 Pushing image processor to Hub...")
image_processor.push_to_hub(
    repo_id=HUB_MODEL_ID,
    commit_message="Upload image processor"
)

print("✅ Training complete!")
print(f"Model available at: https://huggingface.co/{HUB_MODEL_ID}")
print(f"\nTo use your model:")
print(f"```python")
print(f"from transformers import AutoImageProcessor, AutoModelForObjectDetection")
print(f"")
print(f"processor = AutoImageProcessor.from_pretrained('{HUB_MODEL_ID}')")
print(f"model = AutoModelForObjectDetection.from_pretrained('{HUB_MODEL_ID}')")
print(f"```")
```

**Submit:**

```python
hf_jobs("uv", {
    "script": training_script_content,  # Pass script content as a string, NOT a filename
    "flavor": "a10g-large",
    "timeout": "8h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

## Inference Example

After training, use your model:

```python
from transformers import AutoImageProcessor, AutoModelForObjectDetection
from PIL import Image
import torch

# Load model from Hub
processor = AutoImageProcessor.from_pretrained("username/detr-cppe5-detector")
model = AutoModelForObjectDetection.from_pretrained("username/detr-cppe5-detector")

# Load and process image
image = Image.open("test_image.jpg")
inputs = processor(images=image, return_tensors="pt")

# Run inference
with torch.no_grad():
    outputs = model(**inputs)

# Post-process results
target_sizes = torch.tensor([image.size[::-1]])
results = processor.post_process_object_detection(
    outputs,
    threshold=0.5,
    target_sizes=target_sizes
)[0]

# Print detections
for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
    box = [round(i, 2) for i in box.tolist()]
    print(
        f"Detected {model.config.id2label[label.item()]} with confidence "
        f"{round(score.item(), 3)} at location {box}"
    )
```

## Key Takeaway

**Without `push_to_hub=True` and `secrets={"HF_TOKEN": "$HF_TOKEN"}`, all training results are permanently lost.**

**For object detection, also remember to:**
1. Save the image processor separately
2. Configure label mappings (id2label, label2id)
3. Include appropriate model card metadata

Always verify all three are configured before submitting any training job.
