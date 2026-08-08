# Hardware Selection Guide

Choosing the right hardware (flavor) is critical for cost-effective training.

## Available Hardware

### CPU
- `cpu-basic` - Basic CPU, testing only
- `cpu-upgrade` - Enhanced CPU

**Use cases:** Dataset validation, preprocessing, testing scripts
**Not recommended for training:** Too slow for any meaningful training

### GPU Options

| Flavor | GPU | Memory | Use Case | Cost/hour |
|--------|-----|--------|----------|-----------|
| `t4-small` | NVIDIA T4 | 16GB | <1B models, demos | ~$0.50-1 |
| `t4-medium` | NVIDIA T4 | 16GB | 1-3B models, development | ~$1-2 |
| `l4x1` | NVIDIA L4 | 24GB | 3-7B models, efficient training | ~$2-3 |
| `l4x4` | 4x NVIDIA L4 | 96GB | Multi-GPU training | ~$8-12 |
| `a10g-small` | NVIDIA A10G | 24GB | 3-7B models, production | ~$3-4 |
| `a10g-large` | NVIDIA A10G | 24GB | 7-13B models | ~$4-6 |
| `a10g-largex2` | 2x NVIDIA A10G | 48GB | Multi-GPU, large models | ~$8-12 |
| `a10g-largex4` | 4x NVIDIA A10G | 96GB | Multi-GPU, very large models | ~$16-24 |
| `a100-large` | NVIDIA A100 | 40GB | 13B+ models, fast training | ~$8-12 |

### TPU Options

| Flavor | Type | Use Case |
|--------|------|----------|
| `v5e-1x1` | TPU v5e | Small TPU workloads |
| `v5e-2x2` | 4x TPU v5e | Medium TPU workloads |
| `v5e-2x4` | 8x TPU v5e | Large TPU workloads |

**Note:** TPUs require TPU-optimized code. Most TRL training uses GPUs.

## Selection Guidelines

### By Model Size

**Tiny Models (<1B parameters)**
- **Recommended:** `t4-small`
- **Example:** Qwen2.5-0.5B, TinyLlama
- **Batch size:** 4-8
- **Training time:** 1-2 hours for 1K examples

**Small Models (1-3B parameters)**
- **Recommended:** `t4-medium` or `a10g-small`
- **Example:** Qwen2.5-1.5B, Phi-2
- **Batch size:** 2-4
- **Training time:** 2-4 hours for 10K examples

**Medium Models (3-7B parameters)**
- **Recommended:** `a10g-small` or `a10g-large`
- **Example:** Qwen2.5-7B, Mistral-7B
- **Batch size:** 1-2 (or LoRA with 4-8)
- **Training time:** 4-8 hours for 10K examples

**Large Models (7-13B parameters)**
- **Recommended:** `a10g-large` or `a100-large`
- **Example:** Llama-3-8B, Mixtral-8x7B (with LoRA)
- **Batch size:** 1 (full fine-tuning) or 2-4 (LoRA)
- **Training time:** 6-12 hours for 10K examples
- **Note:** Always use LoRA/PEFT

**Very Large Models (13B+ parameters)**
- **Recommended:** `a100-large` with LoRA
- **Example:** Llama-3-13B, Llama-3-70B (LoRA only)
- **Batch size:** 1-2 with LoRA
- **Training time:** 8-24 hours for 10K examples
- **Note:** Full fine-tuning not feasible, use LoRA/PEFT

### By Budget

**Minimal Budget (<$5 total)**
- Use `t4-small`
- Train on subset of data (100-500 examples)
- Limit to 1-2 epochs
- Use small model (<1B)

**Small Budget ($5-20)**
- Use `t4-medium` or `a10g-small`
- Train on 1K-5K examples
- 2-3 epochs
- Model up to 3B parameters

**Medium Budget ($20-50)**
- Use `a10g-small` or `a10g-large`
- Train on 5K-20K examples
- 3-5 epochs
- Model up to 7B parameters

**Large Budget ($50-200)**
- Use `a10g-large` or `a100-large`
- Full dataset training
- Multiple epochs
- Model up to 13B parameters with LoRA

### By Training Type

**Quick Demo/Experiment**
- `t4-small`
- 50-100 examples
- 5-10 steps
- ~10-15 minutes

**Development/Iteration**
- `t4-medium` or `a10g-small`
- 1K examples
- 1 epoch
- ~30-60 minutes

**Production Training**
- `a10g-large` or `a100-large`
- Full dataset
- 3-5 epochs
- 4-12 hours

**Research/Experimentation**
- `a100-large`
- Multiple runs
- Various hyperparameters
- Budget for 20-50 hours

## Memory Considerations

### Estimating Memory Requirements

**Full fine-tuning:**
```
Memory (GB) ≈ (Model params in billions) × 20
```

**LoRA fine-tuning:**
```
Memory (GB) ≈ (Model params in billions) × 4
```

**Examples:**
- Qwen2.5-0.5B full: ~10GB ✅ fits t4-small
- Qwen2.5-1.5B full: ~30GB ❌ exceeds most GPUs
- Qwen2.5-1.5B LoRA: ~6GB ✅ fits t4-small
- Qwen2.5-7B full: ~140GB ❌ not feasible
- Qwen2.5-7B LoRA: ~28GB ✅ fits a10g-large

### Memory Optimization

If hitting memory limits:

1. **Use LoRA/PEFT**
   ```python
   peft_config=LoraConfig(r=16, lora_alpha=32)
   ```

2. **Reduce batch size**
   ```python
   per_device_train_batch_size=1
   ```

3. **Increase gradient accumulation**
   ```python
   gradient_accumulation_steps=8  # Effective batch size = 1×8
   ```

4. **Enable gradient checkpointing**
   ```python
   gradient_checkpointing=True
   ```

5. **Use mixed precision**
   ```python
   bf16=True  # or fp16=True
   ```

6. **Upgrade to larger GPU**
   - t4 → a10g → a100

## Cost Estimation

### Formula

```
Total Cost = (Hours of training) × (Cost per hour)
```

### Example Calculations

**Quick demo:**
- Hardware: t4-small ($0.75/hour)
- Time: 15 minutes (0.25 hours)
- Cost: $0.19

**Development training:**
- Hardware: a10g-small ($3.50/hour)
- Time: 2 hours
- Cost: $7.00

**Production training:**
- Hardware: a10g-large ($5/hour)
- Time: 6 hours
- Cost: $30.00

**Large model with LoRA:**
- Hardware: a100-large ($10/hour)
- Time: 8 hours
- Cost: $80.00

### Cost Optimization Tips

1. **Start small:** Test on t4-small with subset
2. **Use LoRA:** 4-5x cheaper than full fine-tuning
3. **Optimize hyperparameters:** Fewer epochs if possible
4. **Set appropriate timeout:** Don't waste compute on stalled jobs
5. **Use checkpointing:** Resume if job fails
6. **Monitor costs:** Check running jobs regularly

## Multi-GPU Training

TRL automatically handles multi-GPU training with Accelerate when using multi-GPU flavors.

**Multi-GPU flavors:**
- `l4x4` - 4x L4 GPUs
- `a10g-largex2` - 2x A10G GPUs
- `a10g-largex4` - 4x A10G GPUs

**When to use:**
- Models >13B parameters
- Need faster training (linear speedup)
- Large datasets (>50K examples)

**Example:**
```python
hf_jobs("uv", {
    "script": "train.py",
    "flavor": "a10g-largex2",  # 2 GPUs
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

No code changes needed—TRL/Accelerate handles distribution automatically.

## Choosing Between Options

### a10g vs a100

**Choose a10g when:**
- Model <13B parameters
- Budget conscious
- Training time not critical

**Choose a100 when:**
- Model 13B+ parameters
- Need fastest training
- Memory requirements high
- Budget allows

### Single vs Multi-GPU

**Choose single GPU when:**
- Model <7B parameters
- Budget constrained
- Simpler debugging

**Choose multi-GPU when:**
- Model >13B parameters
- Need faster training
- Large batch sizes required
- Cost-effective for large jobs

## Quick Reference

```python
# Model size → Hardware selection
HARDWARE_MAP = {
    "<1B":     "t4-small",
    "1-3B":    "a10g-small",
    "3-7B":    "a10g-large",
    "7-13B":   "a10g-large (LoRA) or a100-large",
    ">13B":    "a100-large (LoRA required)"
}
```
