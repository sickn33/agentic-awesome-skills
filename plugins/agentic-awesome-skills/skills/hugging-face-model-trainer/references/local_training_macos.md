# Local Training on macOS (Apple Silicon)

Run small LoRA fine-tuning jobs locally on Mac for smoke tests and quick iteration before submitting to HF Jobs.

## When to Use Local Mac vs HF Jobs

| Local Mac | HF Jobs / Cloud GPU |
|-----------|-------------------|
| Model ≤3B, text-only | Model 7B+ |
| LoRA/PEFT only | QLoRA 4-bit (CUDA/bitsandbytes) |
| Short context (≤1024) | Long context / full fine-tuning |
| Smoke tests, dataset validation | Production runs, VLMs |

**Typical workflow:** local smoke test → HF Jobs with same config → export/quantize ([gguf_conversion.md](gguf_conversion.md))

## Recommended Defaults

| Setting | Value | Notes |
|---------|-------|-------|
| Model size | 0.5B–1.5B first run | Scale up after verifying |
| Max seq length | 512–1024 | Lower = less memory |
| Batch size | 1 | Scale via gradient accumulation |
| Gradient accumulation | 8–16 | Effective batch = 8–16 |
| LoRA rank (r) | 8–16 | alpha = 2×r |
| Dtype | float32 | fp16 causes NaN on MPS; bf16 only on M1 Pro+ and M2/M3/M4 |

### Memory by hardware

| Unified RAM | Max Model Size |
|-------------|---------------|
| 16 GB | ~0.5B–1.5B |
| 32 GB | ~1.5B–3B |
| 64 GB | ~3B (short context) |

## Setup

```bash
xcode-select --install
python3 -m venv .venv && source .venv/bin/activate
pip install -U "torch>=2.2" "transformers>=4.40" "trl>=0.12" "peft>=0.10" \
    datasets accelerate safetensors huggingface_hub
```

Verify MPS:
```bash
python -c "import torch; print(torch.__version__, '| MPS:', torch.backends.mps.is_available())"
```

Optional — configure Accelerate for local Mac (no distributed, no mixed precision, MPS device):
```bash
accelerate config
```

## Training Script

<details>
<summary><strong>train_lora_sft.py</strong></summary>

```python
import os
from dataclasses import dataclass
from typing import Optional
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, set_seed
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig

set_seed(42)

@dataclass
class Cfg:
    model_id: str = os.environ.get("MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
    dataset_id: str = os.environ.get("DATASET_ID", "HuggingFaceH4/ultrachat_200k")
    dataset_split: str = os.environ.get("DATASET_SPLIT", "train_sft[:500]")
    data_files: Optional[str] = os.environ.get("DATA_FILES", None)
    text_field: str = os.environ.get("TEXT_FIELD", "")
    messages_field: str = os.environ.get("MESSAGES_FIELD", "messages")
    out_dir: str = os.environ.get("OUT_DIR", "outputs/local-lora")
    max_seq_length: int = int(os.environ.get("MAX_SEQ_LENGTH", "512"))
    max_steps: int = int(os.environ.get("MAX_STEPS", "-1"))

cfg = Cfg()
device = "mps" if torch.backends.mps.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained(cfg.model_id, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

model = AutoModelForCausalLM.from_pretrained(cfg.model_id, torch_dtype=torch.float32)
model.to(device)
model.config.use_cache = False

if cfg.data_files:
    ds = load_dataset("json", data_files=cfg.data_files, split="train")
else:
    ds = load_dataset(cfg.dataset_id, split=cfg.dataset_split)

def format_example(ex):
    if cfg.text_field and isinstance(ex.get(cfg.text_field), str):
        ex["text"] = ex[cfg.text_field]
        return ex
    msgs = ex.get(cfg.messages_field)
    if isinstance(msgs, list):
        if hasattr(tokenizer, "apply_chat_template"):
            try:
                ex["text"] = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False)
                return ex
            except Exception:
                pass
        ex["text"] = "\n".join([str(m) for m in msgs])
        return ex
    ex["text"] = str(ex)
    return ex

ds = ds.map(format_example)
ds = ds.remove_columns([c for c in ds.column_names if c != "text"])

lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
                  task_type="CAUSAL_LM", target_modules=["q_proj", "k_proj", "v_proj", "o_proj"])

sft_kwargs = dict(
    output_dir=cfg.out_dir, per_device_train_batch_size=1, gradient_accumulation_steps=8,
    learning_rate=2e-4, logging_steps=10, save_steps=200, save_total_limit=2,
    gradient_checkpointing=True, report_to="none", fp16=False, bf16=False,
    max_seq_length=cfg.max_seq_length, dataset_text_field="text",
)
if cfg.max_steps > 0:
    sft_kwargs["max_steps"] = cfg.max_steps
else:
    sft_kwargs["num_train_epochs"] = 1

trainer = SFTTrainer(model=model, train_dataset=ds, peft_config=lora,
                     args=SFTConfig(**sft_kwargs), processing_class=tokenizer)
trainer.train()
trainer.save_model(cfg.out_dir)
print(f"✅ Saved to: {cfg.out_dir}")
```

</details>

### Run

```bash
python train_lora_sft.py
```

**Env overrides:**

```bash
MODEL_ID="Qwen/Qwen2.5-1.5B-Instruct" python train_lora_sft.py   # different model
MAX_STEPS=50 python train_lora_sft.py                              # quick 50-step test
DATA_FILES="my_data.jsonl" python train_lora_sft.py                # local JSONL file
PYTORCH_ENABLE_MPS_FALLBACK=1 python train_lora_sft.py             # MPS op fallback to CPU
PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0 python train_lora_sft.py      # disable MPS memory limit (use with caution)
```

**Local JSONL format** — chat messages or plain text:
```jsonl
{"messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi!"}]}
```
```jsonl
{"text": "User: Hello\nAssistant: Hi!"}
```
For plain text: `DATA_FILES="file.jsonl" TEXT_FIELD="text" MESSAGES_FIELD="" python train_lora_sft.py`

### Verify Success

- Loss decreases over steps
- `outputs/local-lora/` contains `adapter_config.json` + `*.safetensors`

## Quick Evaluation

<details>
<summary><strong>eval_generate.py</strong></summary>

```python
import os, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

BASE = os.environ.get("MODEL_ID", "Qwen/Qwen2.5-0.5B-Instruct")
ADAPTER = os.environ.get("ADAPTER_DIR", "outputs/local-lora")
device = "mps" if torch.backends.mps.is_available() else "cpu"

tokenizer = AutoTokenizer.from_pretrained(BASE, use_fast=True)
model = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float32)
model.to(device)
model = PeftModel.from_pretrained(model, ADAPTER)

prompt = os.environ.get("PROMPT", "Explain gradient accumulation in 3 bullet points.")
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=120, do_sample=True, temperature=0.7, top_p=0.9)
print(tokenizer.decode(out[0], skip_special_tokens=True))
```

</details>

## Troubleshooting (macOS-Specific)

For general training issues, see [troubleshooting.md](troubleshooting.md).

| Problem | Fix |
|---------|-----|
| MPS unsupported op / crash | `PYTORCH_ENABLE_MPS_FALLBACK=1` |
| OOM / system instability | Reduce `MAX_SEQ_LENGTH`, use smaller model, set `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` (caution) |
| fp16 NaN / loss explosion | Keep `fp16=False` (default), lower learning rate |
| LoRA "module not found" | Print `model.named_modules()` to find correct target names |
| TRL TypeError on args | Check TRL version; script uses `SFTConfig` + `processing_class` (TRL ≥0.12) |
| Intel Mac | No MPS — use HF Jobs instead |

**Common LoRA target modules by architecture:**

| Architecture | target_modules |
|-------------|---------------|
| Llama/Qwen/Mistral | `q_proj`, `k_proj`, `v_proj`, `o_proj` |
| GPT-2/GPT-J | `c_attn`, `c_proj` |
| BLOOM | `query_key_value`, `dense` |

## MLX Alternative

[MLX](https://github.com/ml-explore/mlx) offers tighter Apple Silicon integration but has a smaller ecosystem and less mature training APIs. For this skill's workflow (local validation → HF Jobs), PyTorch + MPS is recommended for consistency. See [mlx-lm](https://github.com/ml-explore/mlx-lm) for MLX-based fine-tuning.

## See Also

- [troubleshooting.md](troubleshooting.md) — General TRL troubleshooting
- [hardware_guide.md](hardware_guide.md) — GPU selection for HF Jobs
- [gguf_conversion.md](gguf_conversion.md) — Export for on-device inference
- [training_methods.md](training_methods.md) — SFT, DPO, GRPO overview
