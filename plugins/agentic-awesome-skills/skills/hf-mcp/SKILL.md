---
name: hf-mcp
description: Use Hugging Face Hub via MCP server tools. Search models, datasets, Spaces, papers. Get repo details, fetch documentation, run compute jobs, and use Gradio Spaces as AI tools. Available when connected to the HF MCP server.
risk: unknown
source: https://github.com/huggingface/skills/tree/main/hf-mcp/skills/hf-mcp
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Hugging Face MCP Server
## When to Use

Use this skill when you need use Hugging Face Hub via MCP server tools. Search models, datasets, Spaces, papers. Get repo details, fetch documentation, run compute jobs, and use Gradio Spaces as AI tools. Available when connected to the HF MCP server.


Connect AI assistants to the Hugging Face Hub. Setup: https://huggingface.co/settings/mcp

## Use Cases & Examples

### Find the Best Model for a Task

```
User: "Find the best model for code generation"

1. model_search(task="text-generation", query="code", sort="trendingScore", limit=10)
2. hub_repo_details(repo_ids=["top-result-id"], include_readme=true)
```

### Compare Models from Different Providers

```
User: "Compare Llama vs Qwen for text generation"

1. model_search(author="meta-llama", task="text-generation", sort="downloads", limit=5)
2. model_search(author="Qwen", task="text-generation", sort="downloads", limit=5)
3. hub_repo_details(repo_ids=["meta-llama/Llama-3.2-1B", "Qwen/Qwen3-8B"], include_readme=true)
```

### Find Training Datasets

```
User: "Find datasets for sentiment analysis in English"

1. dataset_search(query="sentiment", tags=["language:en", "task_categories:text-classification"], sort="downloads")
2. hub_repo_details(repo_ids=["top-dataset-id"], repo_type="dataset", include_readme=true)
```

### Discover AI Tools (MCP Spaces)

```
User: "Find a tool that can remove image backgrounds"

1. space_search(query="background removal", mcp=true)
2. dynamic_space(operation="view_parameters", space_name="result-space-id")
3. dynamic_space(operation="invoke", space_name="result-space-id", parameters="{...}")
```

### Generate Images

```
User: "Create an image of a robot reading a book"

1. dynamic_space(operation="discover")  # See available tasks
2. gr1_flux1_schnell_infer(prompt="a robot sitting in a library reading a book, warm lighting, detailed")
```

### Research a Topic

```
User: "What are the latest papers on RLHF?"

1. paper_search(query="reinforcement learning from human feedback", results_limit=10)
2. hub_repo_details(repo_ids=["paper-linked-model"], include_readme=true)  # If paper links to models
```

### Learn How to Use a Library

```
User: "How do I fine-tune with LoRA using PEFT?"

1. hf_doc_search(query="LoRA fine-tuning", product="peft")
2. hf_doc_fetch(doc_url="https://huggingface.co/docs/peft/...")
```

### Run a Quick GPU Job

```
User: "Run this Python script on a GPU"

hf_jobs(operation="uv", args={
  "script": "# /// script\n# dependencies = [\"torch\"]\n# ///\nimport torch\nprint(torch.cuda.is_available())",
  "flavor": "t4-small"
})
```

### Train a Model on Cloud GPU

```
User: "Run my training script on an A10G"

hf_jobs(operation="run", args={
  "image": "pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime",
  "command": ["/bin/sh", "-lc", "pip install transformers trl && python train.py"],
  "flavor": "a10g-small",
  "secrets": {"HF_TOKEN": "$HF_TOKEN"}
})
```

### Check Job Status

```
User: "What's happening with my training job?"

1. hf_jobs(operation="ps")
2. hf_jobs(operation="logs", args={"job_id": "job-xxxxx"})
```

### Explore What's Trending

```
User: "What models are trending right now?"

model_search(sort="trendingScore", limit=20)
```

### Get Model Card Details

```
User: "Tell me about Mistral-7B"

hub_repo_details(repo_ids=["mistralai/Mistral-7B-v0.1"], include_readme=true)
```

### Find Quantized Models

```
User: "Find GGUF versions of Llama 3"

model_search(query="Llama 3 GGUF", sort="downloads", limit=10)
```

### Use a Gradio Space as a Tool

```
User: "Transcribe this audio file"

1. space_search(query="speech to text transcription", mcp=true)
2. dynamic_space(operation="view_parameters", space_name="openai/whisper")
3. dynamic_space(operation="invoke", space_name="openai/whisper", parameters="{\"audio\": \"...\"}")
```

### Schedule Recurring Jobs

```
User: "Run this data sync every day at midnight"

hf_jobs(operation="scheduled uv", args={
  "script": "...",
  "cron": "0 0 * * *",
  "flavor": "cpu-basic"
})
```

## Tool Selection Guide

| Goal | Tool |
|------|------|
| Find models | `model_search` |
| Find datasets | `dataset_search` |
| Find Spaces/apps | `space_search` |
| Find papers | `paper_search` |
| Get repo README/details | `hub_repo_details` |
| Learn library usage | `hf_doc_search` → `hf_doc_fetch` |
| Run code on GPU/CPU | `hf_jobs` |
| Use Gradio apps as tools | `dynamic_space` |
| Generate images | `gr1_flux1_schnell_infer` or `dynamic_space` |
| Check auth | `hf_whoami` |

## Tips

- Use `sort="trendingScore"` to find what's popular now
- Use `sort="downloads"` to find battle-tested options
- Set `mcp=true` in `space_search` to find Spaces usable as tools
- Use `include_readme=true` in `hub_repo_details` for full model/dataset documentation
- For jobs accessing private repos, always include `secrets: {"HF_TOKEN": "$HF_TOKEN"}`
- Use `dynamic_space(operation="discover")` to see all available Space-based tasks

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
