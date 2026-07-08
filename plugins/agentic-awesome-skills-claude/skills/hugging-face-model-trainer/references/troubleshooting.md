# Troubleshooting TRL Training Jobs

Common issues and solutions when training with TRL on Hugging Face Jobs.

## Training Hangs at "Starting training..." Step

**Problem:** Job starts but hangs at the training step - never progresses, never times out, just sits there.

**Root Cause:** Using `eval_strategy="steps"` or `eval_strategy="epoch"` without providing an `eval_dataset` to the trainer.

**Solution:**

**Option A: Provide eval_dataset (recommended)**
```python
# Create train/eval split
dataset_split = dataset.train_test_split(test_size=0.1, seed=42)

trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset_split["train"],
    eval_dataset=dataset_split["test"],  # ← MUST provide when eval_strategy is enabled
    args=SFTConfig(
        eval_strategy="steps",
        eval_steps=50,
        ...
    ),
)
```

**Option B: Disable evaluation**
```python
trainer = SFTTrainer(
    model="Qwen/Qwen2.5-0.5B",
    train_dataset=dataset,
    # No eval_dataset
    args=SFTConfig(
        eval_strategy="no",  # ← Explicitly disable
        ...
    ),
)
```

**Prevention:**
- Always create train/eval split for better monitoring
- Use `dataset.train_test_split(test_size=0.1, seed=42)`
- Check example scripts: `scripts/train_sft_example.py` includes proper eval setup

## Job Times Out

**Problem:** Job terminates before training completes, all progress lost.

**Solutions:**
- Increase timeout parameter (e.g., `"timeout": "4h"`)
- Reduce `num_train_epochs` or use smaller dataset slice
- Use smaller model or enable LoRA/PEFT to speed up training
- Add 20-30% buffer to estimated time for loading/saving overhead

**Prevention:**
- Always start with a quick demo run to estimate timing
- Use `scripts/estimate_cost.py` to get time estimates
- Monitor first runs closely via Trackio or logs

## Model Not Saved to Hub

**Problem:** Training completes but model doesn't appear on Hub - all work lost.

**Check:**
- [ ] `push_to_hub=True` in training config
- [ ] `hub_model_id` specified with username (e.g., `"username/model-name"`)
- [ ] `secrets={"HF_TOKEN": "$HF_TOKEN"}` in job submission
- [ ] User has write access to target repo
- [ ] Token has write permissions (check at https://huggingface.co/settings/tokens)
- [ ] Training script calls `trainer.push_to_hub()` at the end

**See:** `references/hub_saving.md` for detailed Hub authentication troubleshooting

## Out of Memory (OOM)

**Problem:** Job fails with CUDA out of memory error.

**Solutions (in order of preference):**
1. **Reduce batch size:** Lower `per_device_train_batch_size` (try 4 → 2 → 1)
2. **Increase gradient accumulation:** Raise `gradient_accumulation_steps` to maintain effective batch size
3. **Disable evaluation:** Remove `eval_dataset` and `eval_strategy` (saves ~40% memory, good for demos)
4. **Enable LoRA/PEFT:** Use `peft_config=LoraConfig(r=8, lora_alpha=16)` to train adapters only (smaller rank = less memory)
5. **Use larger GPU:** Switch from `t4-small` → `l4x1` → `a10g-large` → `a100-large`
6. **Enable gradient checkpointing:** Set `gradient_checkpointing=True` in config (slower but saves memory)
7. **Use smaller model:** Try a smaller variant (e.g., 0.5B instead of 3B)

**Memory guidelines:**
- T4 (16GB): <1B models with LoRA
- A10G (24GB): 1-3B models with LoRA, <1B full fine-tune
- A100 (40GB/80GB): 7B+ models with LoRA, 3B full fine-tune

## Parameter Naming Issues

**Problem:** `TypeError: SFTConfig.__init__() got an unexpected keyword argument 'max_seq_length'`

**Cause:** TRL config classes use `max_length`, not `max_seq_length`.

**Solution:**
```python
# ✅ CORRECT - TRL uses max_length
SFTConfig(max_length=512)
DPOConfig(max_length=512)

# ❌ WRONG - This will fail
SFTConfig(max_seq_length=512)
```

**Note:** Most TRL configs don't require explicit max_length - the default (1024) works well. Only set if you need a specific value.

## Dataset Format Error

**Problem:** Training fails with dataset format errors or missing fields.

**Solutions:**
1. **Check format documentation:**
   ```python
   hf_doc_fetch("https://huggingface.co/docs/trl/dataset_formats")
   ```

2. **Validate dataset before training:**
   ```bash
   uv run https://huggingface.co/datasets/mcp-tools/skills/raw/main/dataset_inspector.py \
     --dataset <dataset-name> --split train
   ```
   Or via hf_jobs:
   ```python
   hf_jobs("uv", {
       "script": "https://huggingface.co/datasets/mcp-tools/skills/raw/main/dataset_inspector.py",
       "script_args": ["--dataset", "dataset-name", "--split", "train"]
   })
   ```

3. **Verify field names:**
   - **SFT:** Needs "messages" field (conversational), OR "text" field, OR "prompt"/"completion"
   - **DPO:** Needs "chosen" and "rejected" fields
   - **GRPO:** Needs prompt-only format

4. **Check dataset split:**
   - Ensure split exists (e.g., `split="train"`)
   - Preview dataset: `load_dataset("name", split="train[:5]")`

## Import/Module Errors

**Problem:** Job fails with "ModuleNotFoundError" or import errors.

**Solutions:**
1. **Add PEP 723 header with dependencies:**
   ```python
   # /// script
   # dependencies = [
   #     "trl>=0.12.0",
   #     "peft>=0.7.0",
   #     "transformers>=4.36.0",
   # ]
   # ///
   ```

2. **Verify exact format:**
   - Must have `# ///` delimiters (with space after `#`)
   - Dependencies must be valid PyPI package names
   - Check spelling and version constraints

3. **Test locally first:**
   ```bash
   uv run train.py  # Tests if dependencies are correct
   ```

## Authentication Errors

**Problem:** Job fails with authentication or permission errors when pushing to Hub.

**Solutions:**
1. **Verify authentication:**
   ```python
   mcp__huggingface__hf_whoami()  # Check who's authenticated
   ```

2. **Check token permissions:**
   - Go to https://huggingface.co/settings/tokens
   - Ensure token has "write" permission
   - Token must not be "read-only"

3. **Verify token in job:**
   ```python
   "secrets": {"HF_TOKEN": "$HF_TOKEN"}  # Must be in job config
   ```

4. **Check repo permissions:**
   - User must have write access to target repo
   - If org repo, user must be member with write access
   - Repo must exist or user must have permission to create

## Job Stuck or Not Starting

**Problem:** Job shows "pending" or "starting" for extended period.

**Solutions:**
- Check Jobs dashboard for status: https://huggingface.co/jobs
- Verify hardware availability (some GPU types may have queues)
- Try different hardware flavor if one is heavily utilized
- Check for account billing issues (Jobs requires paid plan)

**Typical startup times:**
- CPU jobs: 10-30 seconds
- GPU jobs: 30-90 seconds
- If >3 minutes: likely queued or stuck

## Training Loss Not Decreasing

**Problem:** Training runs but loss stays flat or doesn't improve.

**Solutions:**
1. **Check learning rate:** May be too low (try 2e-5 to 5e-5) or too high (try 1e-6)
2. **Verify dataset quality:** Inspect examples to ensure they're reasonable
3. **Check model size:** Very small models may not have capacity for task
4. **Increase training steps:** May need more epochs or larger dataset
5. **Verify dataset format:** Wrong format may cause degraded training

## Logs Not Appearing

**Problem:** Cannot see training logs or progress.

**Solutions:**
1. **Wait 30-60 seconds:** Initial logs can be delayed
2. **Check logs via MCP tool:**
   ```python
   hf_jobs("logs", {"job_id": "your-job-id"})
   ```
3. **Use Trackio for real-time monitoring:** See `references/trackio_guide.md`
4. **Verify job is actually running:**
   ```python
   hf_jobs("inspect", {"job_id": "your-job-id"})
   ```

## Checkpoint/Resume Issues

**Problem:** Cannot resume from checkpoint or checkpoint not saved.

**Solutions:**
1. **Enable checkpoint saving:**
   ```python
   SFTConfig(
       save_strategy="steps",
       save_steps=100,
       hub_strategy="every_save",  # Push each checkpoint
   )
   ```

2. **Verify checkpoints pushed to Hub:** Check model repo for checkpoint folders

3. **Resume from checkpoint:**
   ```python
   trainer = SFTTrainer(
       model="username/model-name",  # Can be checkpoint path
       resume_from_checkpoint="username/model-name/checkpoint-1000",
   )
   ```

## Getting Help

If issues persist:

1. **Check TRL documentation:**
   ```python
   hf_doc_search("your issue", product="trl")
   ```

2. **Check Jobs documentation:**
   ```python
   hf_doc_fetch("https://huggingface.co/docs/huggingface_hub/guides/jobs")
   ```

3. **Review related guides:**
   - `references/hub_saving.md` - Hub authentication issues
   - `references/hardware_guide.md` - Hardware selection and specs
   - `references/training_patterns.md` - Eval dataset requirements
   - SKILL.md "Working with Scripts" section - Script format and URL issues

4. **Ask in HF forums:** https://discuss.huggingface.co/
