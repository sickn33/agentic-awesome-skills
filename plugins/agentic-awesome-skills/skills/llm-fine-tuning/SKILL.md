---
name: llm-fine-tuning
description: Set up infrastructure for fine-tuning LLMs with QLoRA, LoRA, and full
  fine-tuning using Hugging Face TRL, Axolotl, and distributed training with DeepSpeed
  or FSDP.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# LLM Fine-Tuning Infrastructure

Train and fine-tune open-source LLMs efficiently — from LoRA on a single GPU to distributed full fine-tuning across multi-node clusters.

## When to Use This Skill

Use this skill when:
- Fine-tuning an LLM on domain-specific data (legal, medical, code, support)
- Running QLoRA to fine-tune 70B models on consumer GPUs
- Setting up distributed training with DeepSpeed or FSDP
- Exporting fine-tuned adapters for production serving
- Implementing RLHF, DPO, or instruction tuning pipelines

## Prerequisites

- NVIDIA GPU(s) with 24GB+ VRAM (RTX 4090 / A100 / H100)
- CUDA 12.1+ and `nvidia-smi` working
- Python 3.10+ with `pip`
- Hugging Face account and `HF_TOKEN` for gated models
- 500GB+ disk for model weights and training data

## Quick Start: QLoRA Fine-Tuning

```bash
pip install transformers datasets trl peft bitsandbytes accelerate

python - <<'EOF'
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer, SFTConfig
import torch

model_id = "meta-llama/Llama-3.1-8B-Instruct"

# 4-bit quantization (QLoRA)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    model_id, quantization_config=bnb_config, device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_id)

# LoRA configuration
peft_config = LoraConfig(
    r=16,                    # rank
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

dataset = load_dataset("your-org/your-dataset", split="train")

trainer = SFTTrainer(
    model=model,
    args=SFTConfig(
        output_dir="./output",
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        bf16=True,
        logging_steps=10,
        save_strategy="epoch",
        report_to="wandb",
    ),
    train_dataset=dataset,
    peft_config=peft_config,
    processing_class=tokenizer,
)
trainer.train()
trainer.save_model("./fine-tuned-model")
EOF
```

## Axolotl (Production Fine-Tuning Framework)

```yaml
# config.yaml — Axolotl QLoRA config for Llama 3.1
base_model: meta-llama/Llama-3.1-8B-Instruct
model_type: LlamaForCausalLM
tokenizer_type: PreTrainedTokenizerFast

load_in_4bit: true
adapter: qlora
lora_r: 32
lora_alpha: 64
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

datasets:
  - path: your-org/your-dataset
    type: alpaca              # or sharegpt, chat_template, etc.

dataset_prepared_path: ./prepared-data
val_set_size: 0.05
output_dir: ./output

sequence_len: 4096
sample_packing: true         # pack multiple short samples for efficiency

micro_batch_size: 2
gradient_accumulation_steps: 8
num_epochs: 3
learning_rate: 2e-4
optimizer: adamw_bnb_8bit
lr_scheduler: cosine
warmup_ratio: 0.05

bf16: true
flash_attention: true

logging_steps: 10
eval_steps: 100
save_steps: 200
wandb_project: my-fine-tune
```

```bash
# Run with Axolotl
pip install axolotl[flash-attn,deepspeed]
accelerate launch -m axolotl.cli.train config.yaml
```

## Distributed Training with DeepSpeed

```json
// deepspeed_zero3.json — ZeRO Stage 3 (split optimizer + gradients + params)
{
  "zero_optimization": {
    "stage": 3,
    "offload_optimizer": {"device": "cpu", "pin_memory": true},
    "offload_param": {"device": "cpu", "pin_memory": true},
    "overlap_comm": true,
    "contiguous_gradients": true,
    "sub_group_size": 1e9,
    "reduce_bucket_size": "auto",
    "stage3_prefetch_bucket_size": "auto",
    "stage3_param_persistence_threshold": "auto",
    "stage3_max_live_parameters": 1e9,
    "stage3_max_reuse_distance": 1e9,
    "gather_16bit_weights_on_model_save": true
  },
  "bf16": {"enabled": true},
  "gradient_clipping": 1.0,
  "train_batch_size": "auto",
  "train_micro_batch_size_per_gpu": "auto"
}
```

```bash
# Launch 4-GPU DeepSpeed training
deepspeed --num_gpus=4 train.py \
  --deepspeed deepspeed_zero3.json \
  --model_name meta-llama/Llama-3.1-70B-Instruct \
  --output_dir ./output
```

## DPO / RLHF Alignment

```python
from trl import DPOTrainer, DPOConfig
from datasets import load_dataset

# Dataset format: {"prompt": ..., "chosen": ..., "rejected": ...}
dataset = load_dataset("your-org/preference-data")

trainer = DPOTrainer(
    model=model,
    ref_model=None,           # None = implicit reference with peft
    args=DPOConfig(
        output_dir="./dpo-output",
        beta=0.1,             # KL divergence weight
        num_train_epochs=1,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=16,
        learning_rate=5e-7,
        bf16=True,
    ),
    train_dataset=dataset["train"],
    peft_config=peft_config,
    processing_class=tokenizer,
)
trainer.train()
```

## Merging LoRA Adapters for Deployment

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM

# Load base model in full precision
base_model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.1-8B-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="cpu",
)

# Load and merge LoRA adapter
model = PeftModel.from_pretrained(base_model, "./fine-tuned-model")
merged_model = model.merge_and_unload()

# Save merged model (ready for vLLM serving)
merged_model.save_pretrained("./merged-model", safe_serialization=True)
tokenizer.save_pretrained("./merged-model")

# Push to Hugging Face Hub
merged_model.push_to_hub("your-org/your-fine-tuned-model")
```

## Kubernetes Training Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: llm-fine-tune
spec:
  template:
    spec:
      restartPolicy: OnFailure
      nodeSelector:
        nvidia.com/gpu.product: A100-SXM4-80GB
      containers:
      - name: trainer
        image: nvcr.io/nvidia/pytorch:24.05-py3
        command: ["accelerate", "launch", "-m", "axolotl.cli.train", "/config/config.yaml"]
        resources:
          limits:
            nvidia.com/gpu: "4"
            memory: "320Gi"
          requests:
            nvidia.com/gpu: "4"
        volumeMounts:
        - name: config
          mountPath: /config
        - name: model-cache
          mountPath: /root/.cache/huggingface
        - name: output
          mountPath: /output
        env:
        - name: HUGGING_FACE_HUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-token
              key: token
        - name: WANDB_API_KEY
          valueFrom:
            secretKeyRef:
              name: wandb-token
              key: key
      volumes:
      - name: config
        configMap:
          name: axolotl-config
      - name: model-cache
        persistentVolumeClaim:
          claimName: model-cache-pvc
      - name: output
        persistentVolumeClaim:
          claimName: training-output-pvc
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `CUDA out of memory` | Batch too large | Reduce `micro_batch_size`; increase `gradient_accumulation_steps` |
| Training loss NaN | Learning rate too high | Lower LR to `1e-4` or `5e-5`; add warmup |
| Slow training | No Flash Attention | Install `flash-attn`; enable `flash_attention: true` |
| Poor fine-tune quality | Bad data formatting | Validate dataset format; check `sample_packing` compatibility |
| Adapter merge errors | Mixed quantization | Merge in bf16 on CPU, not in 4-bit |

## Best Practices

- Use Flash Attention 2 — it's 2–4× faster and uses less memory.
- Monitor training loss/eval loss via W&B or MLflow; overfit = more dropout or less data.
- Validate with a held-out eval set (5–10%); MMLU or custom evals for quality gates.
- Start with LoRA r=16 before increasing — higher rank = more parameters, diminishing returns.
- Use `sample_packing` in Axolotl to maximize GPU utilization on short sequences.

## Related Skills

- vllm-server (`vllm-server`) - Serve fine-tuned models
- gpu-server-management (`gpu-server-management`) - GPU setup
- llm-inference-scaling (`llm-inference-scaling`) - Deploy at scale
- ai-pipeline-orchestration (`ai-pipeline-orchestration`) - Training pipelines

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

