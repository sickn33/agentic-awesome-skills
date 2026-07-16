# Hardware Selection Guide

Choosing the right hardware (flavor) is critical for cost-effective workloads.

> **Reference:** [HF Jobs Hardware Documentation](https://huggingface.co/docs/hub/en/spaces-config-reference) (updated 07/2025)

## Available Hardware

### CPU Flavors
| Flavor | Description | Use Case |
|--------|-------------|----------|
| `cpu-basic` | Basic CPU instance | Testing, lightweight scripts |
| `cpu-upgrade` | Enhanced CPU instance | Data processing, parallel workloads |

**Use cases:** Data processing, testing scripts, lightweight workloads
**Not recommended for:** Model training, GPU-accelerated workloads

### GPU Flavors

| Flavor | GPU | VRAM | Use Case |
|--------|-----|------|----------|
| `t4-small` | NVIDIA T4 | 16GB | <1B models, demos, quick tests |
| `t4-medium` | NVIDIA T4 | 16GB | 1-3B models, development |
| `l4x1` | NVIDIA L4 | 24GB | 3-7B models, efficient workloads |
| `l4x4` | 4x NVIDIA L4 | 96GB | Multi-GPU, parallel workloads |
| `a10g-small` | NVIDIA A10G | 24GB | 3-7B models, production |
| `a10g-large` | NVIDIA A10G | 24GB | 7-13B models, batch inference |
| `a10g-largex2` | 2x NVIDIA A10G | 48GB | Multi-GPU, large models |
| `a10g-largex4` | 4x NVIDIA A10G | 96GB | Multi-GPU, very large models |
| `a100-large` | NVIDIA A100 | 40GB | 13B+ models, fastest GPU option |

### TPU Flavors

| Flavor | Configuration | Use Case |
|--------|---------------|----------|
| `v5e-1x1` | TPU v5e (1x1) | Small TPU workloads |
| `v5e-2x2` | TPU v5e (2x2) | Medium TPU workloads |
| `v5e-2x4` | TPU v5e (2x4) | Large TPU workloads |

**TPU Use Cases:**
- JAX/Flax model training
- Large-scale inference
- TPU-optimized workloads

## Selection Guidelines

### By Workload Type

**Data Processing**
- **Recommended:** `cpu-upgrade` or `l4x1`
- **Use case:** Transform, filter, analyze datasets
- **Batch size:** Depends on data size
- **Time:** Varies by dataset size

**Batch Inference**
- **Recommended:** `a10g-large` or `a100-large`
- **Use case:** Run inference on thousands of samples
- **Batch size:** 8-32 depending on model
- **Time:** Depends on number of samples

**Experiments & Benchmarks**
- **Recommended:** `a10g-small` or `a10g-large`
- **Use case:** Reproducible ML experiments
- **Batch size:** Varies
- **Time:** Depends on experiment complexity

**Model Training** (see `model-trainer` skill for details)
- **Recommended:** See model-trainer skill
- **Use case:** Fine-tuning models
- **Batch size:** Depends on model size
- **Time:** Hours to days

**Synthetic Data Generation**
- **Recommended:** `a10g-large` or `a100-large`
- **Use case:** Generate datasets using LLMs
- **Batch size:** Depends on generation method
- **Time:** Hours for large datasets

### By Budget

**Minimal Budget (<$5 total)**
- Use `cpu-basic` or `t4-small`
- Process small datasets
- Quick tests and demos

**Small Budget ($5-20)**
- Use `t4-medium` or `a10g-small`
- Process medium datasets
- Run experiments

**Medium Budget ($20-50)**
- Use `a10g-small` or `a10g-large`
- Process large datasets
- Production workloads

**Large Budget ($50-200)**
- Use `a10g-large` or `a100-large`
- Large-scale processing
- Multiple experiments

### By Model Size (for inference/processing)

**Tiny Models (<1B parameters)**
- **Recommended:** `t4-small`
- **Example:** Qwen2.5-0.5B, TinyLlama
- **Batch size:** 8-16

**Small Models (1-3B parameters)**
- **Recommended:** `t4-medium` or `a10g-small`
- **Example:** Qwen2.5-1.5B, Phi-2
- **Batch size:** 4-8

**Medium Models (3-7B parameters)**
- **Recommended:** `a10g-small` or `a10g-large`
- **Example:** Qwen2.5-7B, Mistral-7B
- **Batch size:** 2-4

**Large Models (7-13B parameters)**
- **Recommended:** `a10g-large` or `a100-large`
- **Example:** Llama-3-8B
- **Batch size:** 1-2

**Very Large Models (13B+ parameters)**
- **Recommended:** `a100-large`
- **Example:** Llama-3-13B, Llama-3-70B
- **Batch size:** 1

## Memory Considerations

### Estimating Memory Requirements

**For inference:**
```
Memory (GB) ≈ (Model params in billions) × 2-4
```

**For training:**
```
Memory (GB) ≈ (Model params in billions) × 20 (full) or × 4 (LoRA)
```

**Examples:**
- Qwen2.5-0.5B inference: ~1-2GB ✅ fits t4-small
- Qwen2.5-7B inference: ~14-28GB ✅ fits a10g-large
- Qwen2.5-7B training: ~140GB ❌ not feasible without LoRA

### Memory Optimization

If hitting memory limits:

1. **Reduce batch size**
   ```python
   batch_size = 1
   ```

2. **Process in chunks**
   ```python
   for chunk in chunks:
       process(chunk)
   ```

3. **Use smaller models**
   - Use quantized models
   - Use LoRA adapters

4. **Upgrade hardware**
   - cpu → t4 → a10g → a100

## Cost Estimation

### Formula

```
Total Cost = (Hours of runtime) × (Cost per hour)
```

### Example Calculations

**Data processing:**
- Hardware: cpu-upgrade ($0.50/hour)
- Time: 1 hour
- Cost: $0.50

**Batch inference:**
- Hardware: a10g-large ($5/hour)
- Time: 2 hours
- Cost: $10.00

**Experiments:**
- Hardware: a10g-small ($3.50/hour)
- Time: 4 hours
- Cost: $14.00

### Cost Optimization Tips

1. **Start small:** Test on cpu-basic or t4-small
2. **Monitor runtime:** Set appropriate timeouts
3. **Optimize code:** Reduce unnecessary compute
4. **Choose right hardware:** Don't over-provision
5. **Use checkpoints:** Resume if job fails
6. **Monitor costs:** Check running jobs regularly

## Multi-GPU Workloads

Multi-GPU flavors automatically distribute workloads:

**Multi-GPU flavors:**
- `l4x4` - 4x L4 GPUs (96GB total VRAM)
- `a10g-largex2` - 2x A10G GPUs (48GB total VRAM)
- `a10g-largex4` - 4x A10G GPUs (96GB total VRAM)

**When to use:**
- Large models (>13B parameters)
- Need faster processing (linear speedup)
- Large datasets (>100K samples)
- Parallel workloads
- Tensor parallelism for inference

**MCP Tool Example:**
```python
hf_jobs("uv", {
    "script": "process.py",
    "flavor": "a10g-largex2",  # 2 GPUs
    "timeout": "4h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

**CLI Equivalent:**
```bash
hf jobs uv run process.py --flavor a10g-largex2 --timeout 4h
```

## Choosing Between Options

### CPU vs GPU

**Choose CPU when:**
- No GPU acceleration needed
- Data processing only
- Budget constrained
- Simple workloads

**Choose GPU when:**
- Model inference/training
- GPU-accelerated libraries
- Need faster processing
- Large models

### a10g vs a100

**Choose a10g when:**
- Model <13B parameters
- Budget conscious
- Processing time not critical

**Choose a100 when:**
- Model 13B+ parameters
- Need fastest processing
- Memory requirements high
- Budget allows

### Single vs Multi-GPU

**Choose single GPU when:**
- Model <7B parameters
- Budget constrained
- Simpler debugging

**Choose multi-GPU when:**
- Model >13B parameters
- Need faster processing
- Large batch sizes required
- Cost-effective for large jobs

## Quick Reference

### All Available Flavors

```python
# Official flavor list (updated 07/2025)
FLAVORS = {
    # CPU
    "cpu-basic",      # Testing, lightweight
    "cpu-upgrade",    # Data processing
    
    # GPU - Single
    "t4-small",       # 16GB - <1B models
    "t4-medium",      # 16GB - 1-3B models
    "l4x1",           # 24GB - 3-7B models
    "a10g-small",     # 24GB - 3-7B production
    "a10g-large",     # 24GB - 7-13B models
    "a100-large",     # 40GB - 13B+ models
    
    # GPU - Multi
    "l4x4",           # 4x L4 (96GB total)
    "a10g-largex2",   # 2x A10G (48GB total)
    "a10g-largex4",   # 4x A10G (96GB total)
    
    # TPU
    "v5e-1x1",        # TPU v5e 1x1
    "v5e-2x2",        # TPU v5e 2x2
    "v5e-2x4",        # TPU v5e 2x4
}
```

### Workload → Hardware Mapping

```python
HARDWARE_MAP = {
    "data_processing": "cpu-upgrade",
    "batch_inference_small": "t4-small",
    "batch_inference_medium": "a10g-large",
    "batch_inference_large": "a100-large",
    "experiments": "a10g-small",
    "tpu_workloads": "v5e-1x1",
    "training": "see model-trainer skill"
}
```

### CLI Examples

```bash
# CPU job
hf jobs run python:3.12 python script.py

# GPU job
hf jobs run --flavor a10g-large pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel python script.py

# TPU job
hf jobs run --flavor v5e-1x1 your-tpu-image python script.py

# UV script with GPU
hf jobs uv run --flavor a10g-small my_script.py
```

