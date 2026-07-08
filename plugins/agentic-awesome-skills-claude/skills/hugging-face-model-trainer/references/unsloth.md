# Unsloth: Fast Fine-Tuning with Memory Optimization

**Unsloth** is a fine-tuning library that provides ~2x faster training and ~60% less VRAM usage for LLM training. It's particularly useful when working with limited GPU memory or when speed is critical.

- **GitHub**: [unslothai/unsloth](https://github.com/unslothai/unsloth)
- **Docs**: [unsloth.ai/docs](https://unsloth.ai/docs)

## When to Use Unsloth

Use Unsloth if instructed to do so, or one of the following use cases applies:

| Use Case | Recommendation |
|----------|----------------|
| Standard text LLM fine-tuning | TRL is sufficient, but Unsloth is faster |
| Limited GPU memory | **Use Unsloth** - 60% less VRAM |
| Need maximum speed | **Use Unsloth** - 2x faster |
| Large models (>13B) | **Use Unsloth** - memory efficiency critical |

## Supported Models

Unsloth supports many popular models including:
- **Text LLMs**: Llama 3/3.1/3.2/3.3, Qwen 2.5/3, Mistral, Phi-4, Gemma 2/3, LFM2/2.5
- **Vision LLMs**: Qwen3-VL, Gemma 3, Llama 3.2 Vision, Pixtral

Use Unsloth's pre-optimized model variants when available:
```python
# Unsloth-optimized models load faster and use less memory
model_id = "unsloth/LFM2.5-1.2B-Instruct"      # 4-bit quantized
model_id = "unsloth/gemma-3-4b-pt"            # Vision model
model_id = "unsloth/Qwen3-VL-8B-Instruct"     # Vision model
```

## Installation

```python
# /// script
# dependencies = [
#     "unsloth",
#     "trl",
#     "datasets",
#     "trackio",
# ]
# ///
```

## Basic Usage: Text LLM

```python
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

# Load model with Unsloth optimizations
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="LiquidAI/LFM2.5-1.2B-Instruct",
    max_seq_length=4096,
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "out_proj", "in_proj", "w1", "w2", "w3"],
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

# Load dataset
dataset = load_dataset("trl-lib/Capybara", split="train")

# Train with TRL
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        output_dir="./output",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        max_steps=500,
        learning_rate=2e-4,
        report_to="trackio",
    ),
)

trainer.train()
```

## LFM2.5 Specific Settings

For LFM2.5 inference, use these recommended generation parameters:

**Instruct models:**
```python
temperature = 0.1
top_k = 50
top_p = 0.1
repetition_penalty = 1.05
```

**Thinking models:**
```python
temperature = 0.05
top_k = 50
repetition_penalty = 1.05
```

## Vision-Language Models (VLMs)

Unsloth provides specialized support for VLMs with `FastVisionModel`:

```python
from unsloth import FastVisionModel, get_chat_template
from unsloth.trainer import UnslothVisionDataCollator
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

# Load VLM with Unsloth
model, processor = FastVisionModel.from_pretrained(
    "unsloth/gemma-3-4b-pt",  # or "unsloth/Qwen3-VL-8B-Instruct"
    load_in_4bit=True,
    use_gradient_checkpointing="unsloth",
)

# Add LoRA for all modalities
model = FastVisionModel.get_peft_model(
    model,
    finetune_vision_layers=True,      # Train vision encoder
    finetune_language_layers=True,    # Train language model
    finetune_attention_modules=True,  # Train attention
    finetune_mlp_modules=True,        # Train MLPs
    r=16,
    lora_alpha=32,
    target_modules="all-linear",
)

# Apply chat template (required for base models)
processor = get_chat_template(processor, "gemma-3")

# Load VLM dataset (with images and messages)
dataset = load_dataset("your-vlm-dataset", split="train", streaming=True)

# Enable training mode
FastVisionModel.for_training(model)

# Train with VLM-specific collator
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    processing_class=processor.tokenizer,
    data_collator=UnslothVisionDataCollator(model, processor),
    args=SFTConfig(
        output_dir="./vlm-output",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        max_steps=500,
        learning_rate=2e-4,
        # VLM-specific settings
        remove_unused_columns=False,
        dataset_text_field="",
        dataset_kwargs={"skip_prepare_dataset": True},
        report_to="trackio",
    ),
)

trainer.train()
```

## Key Differences from Standard TRL

| Aspect | Standard TRL | Unsloth |
|--------|--------------|---------|
| Model loading | `AutoModelForCausalLM.from_pretrained()` | `FastLanguageModel.from_pretrained()` |
| LoRA setup | `PeftModel` / `LoraConfig` | `FastLanguageModel.get_peft_model()` |
| VLM loading | Limited support | `FastVisionModel.from_pretrained()` |
| VLM collator | Manual | `UnslothVisionDataCollator` |
| Memory usage | Standard | ~60% less |
| Training speed | Standard | ~2x faster |

## VLM Dataset Format

VLM datasets should have:
- `images`: List of PIL images or image paths
- `messages`: Conversation format with image references

```python
{
    "images": [<PIL.Image>, ...],
    "messages": [
        {"role": "user", "content": [
            {"type": "image"},
            {"type": "text", "text": "Describe this image"}
        ]},
        {"role": "assistant", "content": "This image shows..."}
    ]
}
```

## Streaming Datasets

For large VLM datasets, use streaming to avoid disk space issues:

```python
dataset = load_dataset(
    "your-vlm-dataset",
    split="train",
    streaming=True,  # Stream from Hub
)

# Must use max_steps with streaming (no epoch-based training)
SFTConfig(max_steps=500, ...)
```

## Saving Models

### Save LoRA Adapter

```python
model.save_pretrained("./adapter")
processor.save_pretrained("./adapter")

# Push to Hub
model.push_to_hub("username/my-vlm-adapter")
processor.push_to_hub("username/my-vlm-adapter")
```

### Merge and Save Full Model

```python
# Merge LoRA weights into base model
model = model.merge_and_unload()

# Save merged model
model.save_pretrained("./merged")
tokenizer.save_pretrained("./merged")
```

### Convert to GGUF

Unsloth models can be converted to GGUF for llama.cpp/Ollama:

```python
# Save in 16-bit for GGUF conversion
model.save_pretrained_gguf("./gguf", tokenizer, quantization_method="f16")

# Or directly quantize
model.save_pretrained_gguf("./gguf", tokenizer, quantization_method="q4_k_m")
```

## Qwen3-VL Specific Settings

For Qwen3-VL models, use these recommended settings:

**Instruct models:**
```python
temperature = 0.7
top_p = 0.8
presence_penalty = 1.5
```

**Thinking models:**
```python
temperature = 1.0
top_p = 0.95
presence_penalty = 0.0
```

## Hardware Requirements

| Model | Min VRAM (Unsloth 4-bit) | Recommended GPU |
|-------|--------------------------|-----------------|
| 2B-4B | 8GB | T4, L4 |
| 7B-8B | 16GB | A10G, L4x4 |
| 13B | 24GB | A10G-large |
| 30B+ | 48GB+ | A100 |

## Example: Full VLM Training Script

See `scripts/unsloth_sft_example.py` for a complete production-ready example that includes:
- Unsloth VLM setup
- Streaming dataset support
- Trackio monitoring
- Hub push
- CLI arguments

Run locally:
```bash
uv run scripts/unsloth_sft_example.py \
    --dataset trl-lib/Capybara \
    --max-steps 500 \
    --output-repo username/my-model
```

Run on HF Jobs:
```python
hf_jobs("uv", {
    "script": "<script content>",
    "flavor": "a10g-large",
    "timeout": "2h",
    "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

## See Also

- `scripts/unsloth_sft_example.py` - Complete text LLM training example
- [Unsloth Documentation](https://unsloth.ai/docs)
- [LFM2.5 Guide](https://unsloth.ai/docs/models/tutorials/lfm2.5)
- [Qwen3-VL Guide](https://unsloth.ai/docs/models/qwen3-vl-how-to-run-and-fine-tune)
- [Unsloth GitHub](https://github.com/unslothai/unsloth)
