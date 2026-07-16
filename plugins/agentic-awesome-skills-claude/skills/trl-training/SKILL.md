---
name: trl-training
description: Train and fine-tune transformer language models using TRL (Transformers Reinforcement Learning). Supports SFT, DPO, GRPO, KTO, RLOO and Reward Model training via CLI commands.
risk: unknown
source: https://github.com/huggingface/skills/tree/main/skills/trl-training
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# TRL Training Skill
## When to Use

Use this skill when you need train and fine-tune transformer language models using TRL (Transformers Reinforcement Learning). Supports SFT, DPO, GRPO, KTO, RLOO and Reward Model training via CLI commands.


You are an expert at using the TRL (Transformers Reinforcement Learning) library to train and fine-tune large language models.

## Overview

TRL provides CLI commands for post-training foundation models using state-of-the-art techniques:

- **SFT** (Supervised Fine-Tuning): Fine-tune models on instruction-following or conversational datasets
- **DPO** (Direct Preference Optimization): Align models using preference data
- **GRPO** (Group Relative Policy Optimization): Train models by ranking multiple sampled outputs relative to each other and optimizing based on their comparative rewards.
- **RLOO** (Reinforce Leave One Out): Online RL training with generation-based rewards
- **Reward Model Training**: Train reward models for RLHF

TRL is built on top of Hugging Face Transformers and Accelerate, providing seamless integration with the Hugging Face ecosystem.

## Core Commands

### trl sft - Supervised Fine-Tuning

Fine-tune language models on instruction-following or conversational datasets.

**Full training:**

```bash
trl sft \
  --model_name_or_path Qwen/Qwen2-0.5B \
  --dataset_name trl-lib/Capybara \
  --learning_rate 2.0e-5 \
  --num_train_epochs 1 \
  --packing \
  --per_device_train_batch_size 2 \
  --gradient_accumulation_steps 8 \
  --eos_token '<|im_end|>' \
  --eval_strategy steps \
  --eval_steps 100 \
  --output_dir Qwen2-0.5B-SFT \
  --push_to_hub
```

**Train with LoRA adapters:**

```bash
trl sft \
  --model_name_or_path Qwen/Qwen2-0.5B \
  --dataset_name trl-lib/Capybara \
  --learning_rate 2.0e-4 \
  --num_train_epochs 1 \
  --packing \
  --per_device_train_batch_size 2 \
  --gradient_accumulation_steps 8 \
  --eos_token '<|im_end|>' \
  --eval_strategy steps \
  --eval_steps 100 \
  --use_peft \
  --lora_r 32 \
  --lora_alpha 16 \
  --output_dir Qwen2-0.5B-SFT \
  --push_to_hub
```

### trl dpo - Direct Preference Optimization

Align models using preference data (chosen/rejected pairs).

**Full training:**

```bash
trl dpo \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --learning_rate 5.0e-7 \
  --num_train_epochs 1 \
  --per_device_train_batch_size 2 \
  --max_steps 1000 \
  --gradient_accumulation_steps 8 \
  --eval_strategy steps \
  --eval_steps 50 \
  --output_dir Qwen2-0.5B-DPO \
  --no_remove_unused_columns
```

**Train with LoRA adapters:**

```bash
trl dpo \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --learning_rate 5.0e-6 \
  --num_train_epochs 1 \
  --per_device_train_batch_size 2 \
  --max_steps 1000 \
  --gradient_accumulation_steps 8 \
  --eval_strategy steps \
  --eval_steps 50 \
  --output_dir Qwen2-0.5B-DPO \
  --no_remove_unused_columns \
  --use_peft \
  --lora_r 32 \
  --lora_alpha 16
```

### trl grpo - Group Relative Policy Optimization

Train models using reward functions or LLM-as-a-judge for evaluating generations and providing rewards.

**Basic usage:**

```bash
trl grpo \
  --model_name_or_path Qwen/Qwen2.5-0.5B \
  --dataset_name trl-lib/gsm8k \
  --reward_funcs accuracy_reward \
  --output_dir Qwen2-0.5B-GRPO \
  --push_to_hub
```

### trl rloo - Reinforce Leave One Out

Online RL training where the model generates text and receives rewards based on custom criteria.

**Basic usage:**

```bash
trl rloo \
  --model_name_or_path Qwen/Qwen2.5-0.5B \
  --dataset_name trl-lib/tldr \
  --reward_model_name_or_path sentiment-analysis:nlptown/bert-base-multilingual-uncased-sentiment \
  --output_dir Qwen2-0.5B-RLOO \
  --push_to_hub
```

### trl reward - Reward Model Training

Train a reward model to score text quality for RLHF.

**Full training:**

```bash
trl reward \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --output_dir Qwen2-0.5B-Reward \
  --per_device_train_batch_size 8 \
  --num_train_epochs 1 \
  --learning_rate 1.0e-5 \
  --eval_strategy steps \
  --eval_steps 50 \
  --max_length 2048
```

**Train with LoRA adapters:**

```bash
trl reward \
  --model_name_or_path Qwen/Qwen2-0.5B-Instruct \
  --dataset_name trl-lib/ultrafeedback_binarized \
  --output_dir Qwen2-0.5B-Reward-LoRA \
  --per_device_train_batch_size 8 \
  --num_train_epochs 1 \
  --learning_rate 1.0e-4 \
  --eval_strategy steps \
  --eval_steps 50 \
  --max_length 2048 \
  --use_peft \
  --lora_task_type SEQ_CLS \
  --lora_r 32 \
  --lora_alpha 16
```

## Configuration Files

TRL supports YAML configuration files for reproducible training. All CLI arguments can be specified in a config file.

**Example config (sft_config.yaml):**

```yaml
model_name_or_path: Qwen/Qwen2.5-0.5B
dataset_name: trl-lib/Capybara
learning_rate: 2.0e-5
num_train_epochs: 1
per_device_train_batch_size: 8
gradient_accumulation_steps: 2
output_dir: ./sft_output
use_peft: true
lora_r: 16
lora_alpha: 16
report_to: trackio
```

**Launch with config:**

```bash
trl sft --config sft_config.yaml
```

**Override config values:**

```bash
trl sft --config sft_config.yaml --learning_rate 1.0e-5
```

## Distributed Training

TRL integrates with Accelerate for multi-GPU and multi-node training.

**Multi-GPU training:**

```bash
trl sft \
  --config sft_config.yaml \
  --num_processes 4
```

**Use predefined Accelerate configs:**

TRL provides predefined configs: `single_gpu`, `multi_gpu`, `fsdp1`, `fsdp2`, `zero1`, `zero2`, `zero3`

```bash
trl sft \
  --config sft_config.yaml \
  --accelerate_config zero2
```

**Custom Accelerate config:**

```bash
# Generate custom config
accelerate config

# Use custom config
trl sft --config sft_config.yaml --config_file ~/.cache/huggingface/accelerate/default_config.yaml
```

**Fully Sharded Data Parallel (FSDP):**

```bash
trl sft --config sft_config.yaml --accelerate_config fsdp2
```

**DeepSpeed ZeRO:**

```bash
trl sft --config sft_config.yaml --accelerate_config zero3
```

## Troubleshooting

### CUDA Out of Memory

- Reduce `--per_device_train_batch_size` and increase `--gradient_accumulation_steps`
- Enable `--use_peft` for LoRA training
- Use `--gradient_checkpointing` to save memory
- Try smaller model or longer sequence truncation

### Dataset Loading Issues

- Verify dataset exists: check Hugging Face Hub or local path
- Check dataset format matches expected columns
- Use `--dataset_config` for multi-config datasets
- Inspect dataset: `from datasets import load_dataset; ds = load_dataset(name)`

### Model Loading Issues

- Verify model exists on Hugging Face Hub
- Check if gated model requires authentication: `hf auth login`
- For local models, provide absolute path
- Ensure sufficient disk space and memory

### Slow Training

- Enable dataset `--packing` for short sequences
- Use larger `--per_device_train_batch_size` if memory allows
- Enable `--tf32` for faster computation on Ampere GPUs
- Use `--bf16` on supported hardware
- Consider multi-GPU training with `--num_processes`

### Generation Issues (GRPO/RLOO)

- Check prompt format in dataset
- Adjust `--temperature` and `--top_p` for generation
- Verify the reward function (for GRPO/RLOO)

## Additional Resources

- **Documentation**: https://huggingface.co/docs/trl
- **GitHub**: https://github.com/huggingface/trl
- **Examples**: https://github.com/huggingface/trl/tree/main/examples

## Best Practices

1. **Start with SFT**: Always fine-tune base models with SFT before preference alignment
2. **Use LoRA for efficiency**: Enable `--use_peft` for faster training and lower memory
3. **Monitor training**: Use `--report_to trackio` (or `--report_to wandb` or `--report_to tensorboard`) for tracking
4. **Save checkpoints**: TRL automatically saves checkpoints in `--output_dir`
5. **Test on small datasets first**: Verify pipeline works before full training
6. **Use configuration files**: Create YAML configs for reproducibility
7. **Leverage Accelerate**: Use multi-GPU training for faster iteration

When helping users with TRL:
- Always check which training method is appropriate for their use case
- Verify dataset format matches the expected schema
- Recommend starting with smaller models for testing
- Suggest LoRA for resource-constrained environments
- Point to specific documentation sections for advanced features

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
