# Reliability Principles for Training Jobs

## Contents
- Principle 1: Always Verify Before Use
- Principle 2: Prioritize Reliability Over Performance
- Principle 3: Create Atomic, Self-Contained Scripts
- Principle 4: Provide Clear Error Context
- Principle 5: Test the Happy Path on Known-Good Inputs
- Summary: The Reliability Checklist (pre-flight, script quality, job config)
- When Principles Conflict

---

These principles are derived from real production failures and successful fixes. Following them prevents common failure modes and ensures reliable job execution.

## Principle 1: Always Verify Before Use

**Rule:** Never assume repos, datasets, or resources exist. Verify with tools first.

### What It Prevents

- **Non-existent datasets** - Jobs fail immediately when dataset doesn't exist
- **Typos in names** - Simple mistakes like "argilla-dpo-mix-7k" vs "ultrafeedback_binarized"
- **Incorrect paths** - Old or moved repos, renamed files
- **Missing dependencies** - Undocumented requirements

### How to Apply

**Before submitting ANY job:**

```python
# Verify dataset exists
dataset_search({"query": "dataset-name", "author": "author-name", "limit": 5})
hub_repo_details(["author/dataset-name"], repo_type="dataset")

# Verify model exists
hub_repo_details(["org/model-name"], repo_type="model")

# Check script/file paths (for URL-based scripts)
# Verify before using: https://github.com/user/repo/blob/main/script.py
```

**Examples that would have caught errors:**

```python
# ❌ WRONG: Assumed dataset exists
hf_jobs("uv", {
    "script": """...""",
    "env": {"DATASET": "trl-lib/argilla-dpo-mix-7k"}  # Doesn't exist!
})

# ✅ CORRECT: Verify first
dataset_search({"query": "argilla dpo", "author": "trl-lib"})
# Would show: "trl-lib/ultrafeedback_binarized" is the correct name

hub_repo_details(["trl-lib/ultrafeedback_binarized"], repo_type="dataset")
# Confirms it exists before using
```

### Implementation Checklist

- [ ] Check dataset exists before training
- [ ] Test script URLs are valid before submitting
- [ ] Check for recent updates/renames of resources
- [ ] Check for dataset format

**Time cost:** 5-10 seconds  
**Time saved:** Hours of failed job time + debugging

---

## Principle 2: Prioritize Reliability Over Performance

**Rule:** Default to what is most likely to succeed, not what is theoretically fastest.

### What It Prevents

- **Hardware incompatibilities** - Features that fail on certain GPUs
- **Unstable optimizations** - Speed-ups that cause crashes
- **Complex configurations** - More failure points
- **Build system issues** - Unreliable compilation methods

### How to Apply

**Choose reliability:**

```python
# ❌ RISKY: Aggressive optimization that may fail
TrainingArguments(
    torch_compile=True,  # Can fail on T4, A10G GPUs
    optim="adamw_bnb_8bit",  # Requires specific setup
    dataloader_num_workers=8,  # May cause OOM on small instances
    ...
)

# ✅ SAFE: Proven defaults
TrainingArguments(
    # torch_compile=True,  # Commented with note: "Enable on H100 for 20% speedup"
    optim="adamw_torch",  # Standard, always works
    fp16=True,  # Stable and fast on T4/A10G
    dataloader_num_workers=4,  # Conservative, reliable
    ...
)
```

### Real-World Example

**The `torch.compile` failure:**
- Added for "20% speedup" on H100
- **Failed fatally on T4-medium** with cryptic error
- Misdiagnosed as dataset issue (cost hours)
- **Fix:** Disable by default, add as optional comment

**Result:** Reliability > 20% performance gain

### Implementation Checklist

- [ ] Use proven, standard configurations by default
- [ ] Comment out performance optimizations with hardware notes
- [ ] Use stable build systems (CMake > make)
- [ ] Test on target hardware before production
- [ ] Document known incompatibilities
- [ ] Provide "safe" and "fast" variants when needed

**Performance loss:** 10-20% in best case  
**Reliability gain:** 95%+ success rate vs 60-70%

---

## Principle 3: Create Atomic, Self-Contained Scripts

**Rule:** Scripts should work as complete, independent units. Don't remove parts to "simplify."

### What It Prevents

- **Missing dependencies** - Removed "unnecessary" packages that are actually required
- **Incomplete processes** - Skipped steps that seem redundant
- **Environment assumptions** - Scripts that need pre-setup
- **Partial failures** - Some parts work, others fail silently

### How to Apply

**Complete dependency specifications:**

```python
# ❌ INCOMPLETE: "Simplified" by removing dependencies
# /// script
# dependencies = [
#     "transformers",
#     "torch",
#     "datasets",
# ]
# ///

# ✅ COMPLETE: All dependencies explicit
# /// script
# dependencies = [
#     "transformers>=5.2.0",
#     "accelerate>=1.1.0",
#     "albumentations>=1.4.16",  # Required for augmentation + bbox handling
#     "timm",                     # Required for vision backbones
#     "datasets>=4.0",
#     "torchmetrics",             # Required for mAP/mAR computation
#     "pycocotools",              # Required for COCO evaluation
#     "trackio",                  # Required for metrics monitoring
#     "huggingface_hub",
# ]
# ///
```

### Real-World Example

**The `albumentations` failure:**
- Original script had it: augmentations and bbox clipping worked fine
- "Simplified" version removed it: "not strictly needed for training"
- **Training crashed on bbox augmentation** — no fallback for COCO-format bbox handling
- Hard to debug: error appeared in data loading, not in augmentation setup
- **Fix:** Restore all original dependencies

**Result:** Don't remove dependencies without thorough testing

### Implementation Checklist

- [ ] All dependencies in PEP 723 header with version pins
- [ ] All system packages installed by script
- [ ] No assumptions about pre-existing environment
- [ ] No "optional" steps that are actually required
- [ ] Test scripts in clean environment
- [ ] Document why each dependency is needed

**Complexity:** Slightly longer scripts  
**Reliability:** Scripts "just work" every time

---

## Principle 4: Provide Clear Error Context

**Rule:** When things fail, make it obvious what went wrong and how to fix it.

### How to Apply

**Wrap subprocess calls:**

```python
# ❌ UNCLEAR: Silent failure
subprocess.run([...], check=True, capture_output=True)

# ✅ CLEAR: Shows what failed
try:
    result = subprocess.run(
        [...],
        check=True,
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print("Warnings:", result.stderr)
except subprocess.CalledProcessError as e:
    print(f"❌ Command failed!")
    print("STDOUT:", e.stdout)
    print("STDERR:", e.stderr)
    raise
```

**Validate inputs:**

```python
# ❌ UNCLEAR: Fails later with cryptic error
model = load_model(MODEL_NAME)

# ✅ CLEAR: Fails fast with clear message
if not MODEL_NAME:
    raise ValueError("MODEL_NAME environment variable not set!")

print(f"Loading model: {MODEL_NAME}")
try:
    model = load_model(MODEL_NAME)
    print(f"✅ Model loaded successfully")
except Exception as e:
    print(f"❌ Failed to load model: {MODEL_NAME}")
    print(f"Error: {e}")
    print("Hint: Check that model exists on Hub")
    raise
```

### Implementation Checklist

- [ ] Wrap external calls with try/except
- [ ] Print stdout/stderr on failure
- [ ] Validate environment variables early
- [ ] Add progress indicators (✅, ❌, 🔄)
- [ ] Include hints for common failures
- [ ] Log configuration at start

---

## Principle 5: Test the Happy Path on Known-Good Inputs

**Rule:** Before using new code in production, test with inputs you know work.

## Summary: The Reliability Checklist

Before submitting ANY job:

### Pre-Flight Checks
- [ ] **Verified** all repos/datasets exist (hub_repo_details)
- [ ] **Tested** with known-good inputs if new code
- [ ] **Using** proven hardware/configuration
- [ ] **Included** all dependencies in PEP 723 header
- [ ] **Installed** system requirements (build tools, etc.)
- [ ] **Set** appropriate timeout (not default 30m)
- [ ] **Configured** Hub push with HF_TOKEN (login() + hub_token)
- [ ] **Added** clear error handling

### Script Quality
- [ ] Self-contained (no external setup needed)
- [ ] Complete dependencies listed
- [ ] Build tools installed by script
- [ ] Progress indicators included
- [ ] Error messages are clear
- [ ] Configuration logged at start

### Job Configuration
- [ ] Timeout > expected runtime + 30% buffer
- [ ] Hardware appropriate for model size
- [ ] Secrets include HF_TOKEN (see SKILL.md directive #2 for syntax)
- [ ] Script calls `login(token=hf_token)` and sets `training_args.hub_token = hf_token` BEFORE `Trainer()` init
- [ ] Environment variables set correctly
- [ ] Cost estimated and acceptable

**Following these principles transforms job success rate from ~60-70% to ~95%+**

---

## When Principles Conflict

Sometimes reliability and performance conflict. Here's how to choose:

| Scenario | Choose | Rationale |
|----------|--------|-----------|
| Demo/test | Reliability | Fast failure is worse than slow success |
| Production (first run) | Reliability | Prove it works before optimizing |
| Production (proven) | Performance | Safe to optimize after validation |
| Time-critical | Reliability | Failures cause more delay than slow runs |
| Cost-critical | Balanced | Test with small model, then optimize |

**General rule:** Reliability first, optimize second.

---
