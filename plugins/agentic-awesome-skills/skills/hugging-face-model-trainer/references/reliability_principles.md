# Reliability Principles for Training Jobs

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
- [ ] Verify base model exists before fine-tuning
- [ ] Confirm adapter model exists before GGUF conversion
- [ ] Test script URLs are valid before submitting
- [ ] Validate file paths in repositories
- [ ] Check for recent updates/renames of resources

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
SFTConfig(
    torch_compile=True,  # Can fail on T4, A10G GPUs
    optim="adamw_bnb_8bit",  # Requires specific setup
    fp16=False,  # May cause training instability
    ...
)

# ✅ SAFE: Proven defaults
SFTConfig(
    # torch_compile=True,  # Commented with note: "Enable on H100 for 20% speedup"
    optim="adamw_torch",  # Standard, always works
    fp16=True,  # Stable and fast
    ...
)
```

**For build processes:**

```python
# ❌ UNRELIABLE: Uses make (platform-dependent)
subprocess.run(["make", "-C", "/tmp/llama.cpp", "llama-quantize"], check=True)

# ✅ RELIABLE: Uses CMake (consistent, documented)
subprocess.run([
    "cmake", "-B", "/tmp/llama.cpp/build", "-S", "/tmp/llama.cpp",
    "-DGGML_CUDA=OFF"  # Disable CUDA for faster, more reliable build
], check=True)

subprocess.run([
    "cmake", "--build", "/tmp/llama.cpp/build",
    "--target", "llama-quantize", "-j", "4"
], check=True)
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
#     "peft",
#     "torch",
# ]
# ///

# ✅ COMPLETE: All dependencies explicit
# /// script
# dependencies = [
#     "transformers>=4.36.0",
#     "peft>=0.7.0",
#     "torch>=2.0.0",
#     "accelerate>=0.24.0",
#     "huggingface_hub>=0.20.0",
#     "sentencepiece>=0.1.99",  # Required for tokenizers
#     "protobuf>=3.20.0",        # Required for tokenizers
#     "numpy",
#     "gguf",
# ]
# ///
```

**Complete build processes:**

```python
# ❌ INCOMPLETE: Assumes build tools exist
subprocess.run(["git", "clone", "https://github.com/ggerganov/llama.cpp.git", "/tmp/llama.cpp"])
subprocess.run(["make", "-C", "/tmp/llama.cpp", "llama-quantize"])  # FAILS: no gcc/make

# ✅ COMPLETE: Installs all requirements
subprocess.run(["apt-get", "update", "-qq"], check=True)
subprocess.run(["apt-get", "install", "-y", "-qq", "build-essential", "cmake"], check=True)
subprocess.run(["git", "clone", "https://github.com/ggerganov/llama.cpp.git", "/tmp/llama.cpp"])
# ... then build
```

### Real-World Example

**The `sentencepiece` failure:**
- Original script had it: worked fine
- "Simplified" version removed it: "doesn't look necessary"
- **GGUF conversion failed silently** - tokenizer couldn't convert
- Hard to debug: no obvious error message
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

### How to Apply

**Known-good test inputs:**

```python
# For training
TEST_DATASET = "trl-lib/Capybara"  # Small, well-formatted, widely used
TEST_MODEL = "Qwen/Qwen2.5-0.5B"  # Small, fast, reliable

# For GGUF conversion
TEST_ADAPTER = "evalstate/qwen-capybara-medium"  # Known working model
TEST_BASE = "Qwen/Qwen2.5-0.5B"  # Compatible base
```

**Testing workflow:**

1. Test with known-good inputs first
2. If that works, try production inputs
3. If production fails, you know it's the inputs (not code)
4. Isolate the difference

### Implementation Checklist

- [ ] Maintain list of known-good test models/datasets
- [ ] Test new scripts with test inputs first
- [ ] Document what makes inputs "good"
- [ ] Keep test jobs cheap (small models, short timeouts)
- [ ] Only move to production after test succeeds

**Time cost:** 5-10 minutes for test run  
**Debugging time saved:** Hours

---

## Summary: The Reliability Checklist

Before submitting ANY job:

### Pre-Flight Checks
- [ ] **Verified** all repos/datasets exist (hub_repo_details)
- [ ] **Tested** with known-good inputs if new code
- [ ] **Using** proven hardware/configuration
- [ ] **Included** all dependencies in PEP 723 header
- [ ] **Installed** system requirements (build tools, etc.)
- [ ] **Set** appropriate timeout (not default 30m)
- [ ] **Configured** Hub push with HF_TOKEN
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
- [ ] Secrets include HF_TOKEN
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

## Further Reading

- `troubleshooting.md` - Common issues and fixes
- `training_patterns.md` - Proven training configurations
- `gguf_conversion.md` - Production GGUF workflow
