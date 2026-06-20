---
name: hugging-face-evaluation
description: Add and manage evaluation results in Hugging Face model cards. Supports extracting eval tables from README content, importing scores from Artificial Analysis API, and running custom model evaluations with vLLM/lighteval. Works with the model-index metadata format.
risk: unknown
source: community
---

# Overview
This skill provides tools to add structured evaluation results to Hugging Face model cards. It supports multiple methods for adding evaluation data:
- Extracting existing evaluation tables from README content
- Importing benchmark scores from Artificial Analysis
- Running custom model evaluations with vLLM or accelerate backends (lighteval/inspect-ai)

## When to Use
- You need to add structured evaluation results to a Hugging Face model card.
- You want to import benchmark data or run custom evaluations with vLLM, lighteval, or inspect-ai.
- You are preparing leaderboard-compatible `model-index` metadata for a model release.

## Integration with HF Ecosystem
- **Model Cards**: Updates model-index metadata for leaderboard integration
- **Artificial Analysis**: Direct API integration for benchmark imports
- **Papers with Code**: Compatible with their model-index specification
- **Jobs**: Run evaluations directly on Hugging Face Jobs with `uv` integration
- **vLLM**: Efficient GPU inference for custom model evaluation
- **lighteval**: HuggingFace's evaluation library with vLLM/accelerate backends
- **inspect-ai**: UK AI Safety Institute's evaluation framework

# Version
1.3.0

# Dependencies

## Core Dependencies
- huggingface_hub>=0.26.0
- markdown-it-py>=3.0.0
- python-dotenv>=1.2.1
- pyyaml>=6.0.3
- requests>=2.32.5
- re (built-in)

## Inference Provider Evaluation
- inspect-ai>=0.3.0
- inspect-evals
- openai

## vLLM Custom Model Evaluation (GPU required)
- lighteval[accelerate,vllm]>=0.6.0
- vllm>=0.4.0
- torch>=2.0.0
- transformers>=4.40.0
- accelerate>=0.30.0

Note: vLLM dependencies are installed automatically via PEP 723 script headers when using `uv run`.

# IMPORTANT: Using This Skill

## ⚠️ CRITICAL: Check for Existing PRs Before Creating New Ones

**Before creating ANY pull request with `--create-pr`, you MUST check for existing open PRs:**

```bash
uv run scripts/evaluation_manager.py get-prs --repo-id "username/model-name"
```

**If open PRs exist:**
1. **DO NOT create a new PR** - this creates duplicate work for maintainers
2. **Warn the user** that open PRs already exist
3. **Show the user** the existing PR URLs so they can review them
4. Only proceed if the user explicitly confirms they want to create another PR

This prevents spamming model repositories with duplicate evaluation PRs.

---

> **All paths are relative to the directory containing this SKILL.md
file.**
> Before running any script, first `cd` to that directory or use the full
path.

**Use `--help` for the latest workflow guidance.** Works with plain Python or `uv run`:
```bash
uv run scripts/evaluation_manager.py --help
uv run scripts/evaluation_manager.py inspect-tables --help
uv run scripts/evaluation_manager.py extract-readme --help
```
Key workflow (matches CLI help):

1) `get-prs` → check for existing open PRs first
2) `inspect-tables` → find table numbers/columns  
3) `extract-readme --table N` → prints YAML by default  
4) add `--apply` (push) or `--create-pr` to write changes

# Core Capabilities

## 1. Inspect and Extract Evaluation Tables from README
- **Inspect Tables**: Use `inspect-tables` to see all tables in a README with structure, columns, and sample rows
- **Parse Markdown Tables**: Accurate parsing using markdown-it-py (ignores code blocks and examples)
- **Table Selection**: Use `--table N` to extract from a specific table (required when multiple tables exist)
- **Format Detection**: Recognize common formats (benchmarks as rows, columns, or comparison tables with multiple models)
- **Column Matching**: Automatically identify model columns/rows; prefer `--model-column-index` (index from inspect output). Use `--model-name-override` only with exact column header text.
- **YAML Generation**: Convert selected table to model-index YAML format
- **Task Typing**: `--task-type` sets the `task.type` field in model-index output (e.g., `text-generation`, `summarization`)

## 2. Import from Artificial Analysis
- **API Integration**: Fetch benchmark scores directly from Artificial Analysis
- **Automatic Formatting**: Convert API responses to model-index format
- **Metadata Preservation**: Maintain source attribution and URLs
- **PR Creation**: Automatically create pull requests with evaluation updates

## 3. Model-Index Management
- **YAML Generation**: Create properly formatted model-index entries
- **Merge Support**: Add evaluations to existing model cards without overwriting
- **Validation**: Ensure compliance with Papers with Code specification
- **Batch Operations**: Process multiple models efficiently

## 4. Run Evaluations on HF Jobs (Inference Providers)
- **Inspect-AI Integration**: Run standard evaluations using the `inspect-ai` library
- **UV Integration**: Seamlessly run Python scripts with ephemeral dependencies on HF infrastructure
- **Zero-Config**: No Dockerfiles or Space management required
- **Hardware Selection**: Configure CPU or GPU hardware for the evaluation job
- **Secure Execution**: Handles API tokens safely via secrets passed through the CLI

## 5. Run Custom Model Evaluations with vLLM (NEW)

⚠️ **Important:** This approach is only possible on devices with `uv` installed and sufficient GPU memory.
**Benefits:** No need to use `hf_jobs()` MCP tool, can run scripts directly in terminal
**When to use:** User working in local device directly  when GPU is available

### Before running the script

- check the script path
- check uv is installed
- check gpu is available with `nvidia-smi`

### Running the script

```bash
uv run scripts/train_sft_example.py
```
### Features

- **vLLM Backend**: High-performance GPU inference (5-10x faster than standard HF methods)
- **lighteval Framework**: HuggingFace's evaluation library with Open LLM Leaderboard tasks
- **inspect-ai Framework**: UK AI Safety Institute's evaluation library
- **Standalone or Jobs**: Run locally or submit to HF Jobs infrastructure

# Usage Instructions

The skill includes Python scripts in `scripts/` to perform operations.

### Prerequisites
- Preferred: use `uv run` (PEP 723 header auto-installs deps)
- Or install manually: `pip install huggingface-hub markdown-it-py python-dotenv pyyaml requests`
- Set `HF_TOKEN` environment variable with Write-access token
- For Artificial Analysis: Set `AA_API_KEY` environment variable
- `.env` is loaded automatically if `python-dotenv` is installed

### Method 1: Extract from README (CLI workflow)

Recommended flow (matches `--help`):
```bash
# 1) Inspect tables to get table numbers and column hints
uv run scripts/evaluation_manager.py inspect-tables --repo-id "username/model"

# 2) Extract a specific table (prints YAML by default)
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model" \
  --table 1 \
  [--model-column-index <column index shown by inspect-tables>] \
  [--model-name-override "<column header/model name>"]  # use exact header text if you can't use the index

# 3) Apply changes (push or PR)
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model" \
  --table 1 \
  --apply       # push directly
# or
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model" \
  --table 1 \
  --create-pr   # open a PR
```

Validation checklist:
- YAML is printed by default; compare against the README table before applying.
- Prefer `--model-column-index`; if using `--model-name-override`, the column header text must be exact.
- For transposed tables (models as rows), ensure only one row is extracted.

### Method 2: Import from Artificial Analysis

Fetch benchmark scores from Artificial Analysis API and add them to a model card.

**Basic Usage:**
```bash
AA_API_KEY="your-api-key" uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "username/model-name"
```

**With Environment File:**
```bash
# Create .env file
echo "AA_API_KEY=your-api-key" >> .env
echo "HF_TOKEN=your-hf-token" >> .env

# Run import
uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "username/model-name"
```

**Create Pull Request:**
```bash
uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "username/model-name" \
  --create-pr
```

### Method 3: Run Evaluation Job

Submit an evaluation job on Hugging Face infrastructure using the `hf jobs uv run` CLI.

**Direct CLI Usage:**
```bash
HF_TOKEN=$HF_TOKEN \
hf jobs uv run hf-evaluation/scripts/inspect_eval_uv.py \
  --flavor cpu-basic \
  --secret HF_TOKEN=$HF_TOKEN \
  -- --model "meta-llama/Llama-2-7b-hf" \
     --task "mmlu"
```

**GPU Example (A10G):**
```bash
HF_TOKEN=$HF_TOKEN \
hf jobs uv run hf-evaluation/scripts/inspect_eval_uv.py \
  --flavor a10g-small \
  --secret HF_TOKEN=$HF_TOKEN \
  -- --model "meta-llama/Llama-2-7b-hf" \
     --task "gsm8k"
```

**Python Helper (optional):**
```bash
uv run scripts/run_eval_job.py \
  --model "meta-llama/Llama-2-7b-hf" \
  --task "mmlu" \
  --hardware "t4-small"
```

### Method 4: Run Custom Model Evaluation with vLLM

Evaluate custom HuggingFace models directly on GPU using vLLM or accelerate backends. These scripts are **separate from inference provider scripts** and run models locally on the job's hardware.

#### When to Use vLLM Evaluation (vs Inference Providers)

| Feature | vLLM Scripts | Inference Provider Scripts |
|---------|-------------|---------------------------|
| Model access | Any HF model | Models with API endpoints |
| Hardware | Your GPU (or HF Jobs GPU) | Provider's infrastructure |
| Cost | HF Jobs compute cost | API usage fees |
| Speed | vLLM optimized | Depends on provider |
| Offline | Yes (after download) | No |

#### Option A: lighteval with vLLM Backend

lighteval is HuggingFace's evaluation library, supporting Open LLM Leaderboard tasks.

**Standalone (local GPU):**
```bash
# Run MMLU 5-shot with vLLM
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --tasks "leaderboard|mmlu|5"

# Run multiple tasks
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --tasks "leaderboard|mmlu|5,leaderboard|gsm8k|5"

# Use accelerate backend instead of vLLM
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --tasks "leaderboard|mmlu|5" \
  --backend accelerate

# Chat/instruction-tuned models
uv run scripts/lighteval_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B-Instruct \
  --tasks "leaderboard|mmlu|5" \
  --use-chat-template
```

**Via HF Jobs:**
```bash
hf jobs uv run scripts/lighteval_vllm_uv.py \
  --flavor a10g-small \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model meta-llama/Llama-3.2-1B \
     --tasks "leaderboard|mmlu|5"
```

**lighteval Task Format:**
Tasks use the format `suite|task|num_fewshot`:
- `leaderboard|mmlu|5` - MMLU with 5-shot
- `leaderboard|gsm8k|5` - GSM8K with 5-shot
- `lighteval|hellaswag|0` - HellaSwag zero-shot
- `leaderboard|arc_challenge|25` - ARC-Challenge with 25-shot

**Finding Available Tasks:**
The complete list of available lighteval tasks can be found at:
https://github.com/huggingface/lighteval/blob/main/examples/tasks/all_tasks.txt

This file contains all supported tasks in the format `suite|task|num_fewshot|0` (the trailing `0` is a version flag and can be ignored). Common suites include:
- `leaderboard` - Open LLM Leaderboard tasks (MMLU, GSM8K, ARC, HellaSwag, etc.)
- `lighteval` - Additional lighteval tasks
- `bigbench` - BigBench tasks
- `original` - Original benchmark tasks

To use a task from the list, extract the `suite|task|num_fewshot` portion (without the trailing `0`) and pass it to the `--tasks` parameter. For example:
- From file: `leaderboard|mmlu|0` → Use: `leaderboard|mmlu|0` (or change to `5` for 5-shot)
- From file: `bigbench|abstract_narrative_understanding|0` → Use: `bigbench|abstract_narrative_understanding|0`
- From file: `lighteval|wmt14:hi-en|0` → Use: `lighteval|wmt14:hi-en|0`

Multiple tasks can be specified as comma-separated values: `--tasks "leaderboard|mmlu|5,leaderboard|gsm8k|5"`

#### Option B: inspect-ai with vLLM Backend

inspect-ai is the UK AI Safety Institute's evaluation framework.

**Standalone (local GPU):**
```bash
# Run MMLU with vLLM
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --task mmlu

# Use HuggingFace Transformers backend
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-1B \
  --task mmlu \
  --backend hf

# Multi-GPU with tensor parallelism
uv run scripts/inspect_vllm_uv.py \
  --model meta-llama/Llama-3.2-70B \
  --task mmlu \
  --tensor-parallel-size 4
```

**Via HF Jobs:**
```bash
hf jobs uv run scripts/inspect_vllm_uv.py \
  --flavor a10g-small \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model meta-llama/Llama-3.2-1B \
     --task mmlu
```

**Available inspect-ai Tasks:**
- `mmlu` - Massive Multitask Language Understanding
- `gsm8k` - Grade School Math
- `hellaswag` - Common sense reasoning
- `arc_challenge` - AI2 Reasoning Challenge
- `truthfulqa` - TruthfulQA benchmark
- `winogrande` - Winograd Schema Challenge
- `humaneval` - Code generation

#### Option C: Python Helper Script

The helper script auto-selects hardware and simplifies job submission:

```bash
# Auto-detect hardware based on model size
uv run scripts/run_vllm_eval_job.py \
  --model meta-llama/Llama-3.2-1B \
  --task "leaderboard|mmlu|5" \
  --framework lighteval

# Explicit hardware selection
uv run scripts/run_vllm_eval_job.py \
  --model meta-llama/Llama-3.2-70B \
  --task mmlu \
  --framework inspect \
  --hardware a100-large \
  --tensor-parallel-size 4

# Use HF Transformers backend
uv run scripts/run_vllm_eval_job.py \
  --model microsoft/phi-2 \
  --task mmlu \
  --framework inspect \
  --backend hf
```

**Hardware Recommendations:**
| Model Size | Recommended Hardware |
|------------|---------------------|
| < 3B params | `t4-small` |
| 3B - 13B | `a10g-small` |
| 13B - 34B | `a10g-large` |
| 34B+ | `a100-large` |

### Commands Reference

**Top-level help and version:**
```bash
uv run scripts/evaluation_manager.py --help
uv run scripts/evaluation_manager.py --version
```

**Inspect Tables (start here):**
```bash
uv run scripts/evaluation_manager.py inspect-tables --repo-id "username/model-name"
```

**Extract from README:**
```bash
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "username/model-name" \
  --table N \
  [--model-column-index N] \
  [--model-name-override "Exact Column Header or Model Name"] \
  [--task-type "text-generation"] \
  [--dataset-name "Custom Benchmarks"] \
  [--apply | --create-pr]
```

**Import from Artificial Analysis:**
```bash
AA_API_KEY=... uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "creator-name" \
  --model-name "model-slug" \
  --repo-id "username/model-name" \
  [--create-pr]
```

**View / Validate:**
```bash
uv run scripts/evaluation_manager.py show --repo-id "username/model-name"
uv run scripts/evaluation_manager.py validate --repo-id "username/model-name"
```

**Check Open PRs (ALWAYS run before --create-pr):**
```bash
uv run scripts/evaluation_manager.py get-prs --repo-id "username/model-name"
```
Lists all open pull requests for the model repository. Shows PR number, title, author, date, and URL.

**Run Evaluation Job (Inference Providers):**
```bash
hf jobs uv run scripts/inspect_eval_uv.py \
  --flavor "cpu-basic|t4-small|..." \
  --secret HF_TOKEN=$HF_TOKEN \
  -- --model "model-id" \
     --task "task-name"
```

or use the Python helper:

```bash
uv run scripts/run_eval_job.py \
  --model "model-id" \
  --task "task-name" \
  --hardware "cpu-basic|t4-small|..."
```

**Run vLLM Evaluation (Custom Models):**
```bash
# lighteval with vLLM
hf jobs uv run scripts/lighteval_vllm_uv.py \
  --flavor "a10g-small" \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model "model-id" \
     --tasks "leaderboard|mmlu|5"

# inspect-ai with vLLM
hf jobs uv run scripts/inspect_vllm_uv.py \
  --flavor "a10g-small" \
  --secrets HF_TOKEN=$HF_TOKEN \
  -- --model "model-id" \
     --task "mmlu"

# Helper script (auto hardware selection)
uv run scripts/run_vllm_eval_job.py \
  --model "model-id" \
  --task "leaderboard|mmlu|5" \
  --framework lighteval
```

### Model-Index Format

The generated model-index follows this structure:

```yaml
model-index:
  - name: Model Name
    results:
      - task:
          type: text-generation
        dataset:
          name: Benchmark Dataset
          type: benchmark_type
        metrics:
          - name: MMLU
            type: mmlu
            value: 85.2
          - name: HumanEval
            type: humaneval
            value: 72.5
        source:
          name: Source Name
          url: https://source-url.com
```

WARNING: Do not use markdown formatting in the model name. Use the exact name from the table. Only use urls in the source.url field.

### Error Handling
- **Table Not Found**: Script will report if no evaluation tables are detected
- **Invalid Format**: Clear error messages for malformed tables
- **API Errors**: Retry logic for transient Artificial Analysis API failures
- **Token Issues**: Validation before attempting updates
- **Merge Conflicts**: Preserves existing model-index entries when adding new ones
- **Space Creation**: Handles naming conflicts and hardware request failures gracefully

### Best Practices

1. **Check for existing PRs first**: Run `get-prs` before creating any new PR to avoid duplicates
2. **Always start with `inspect-tables`**: See table structure and get the correct extraction command
3. **Use `--help` for guidance**: Run `inspect-tables --help` to see the complete workflow
4. **Preview first**: Default behavior prints YAML; review it before using `--apply` or `--create-pr`
5. **Verify extracted values**: Compare YAML output against the README table manually
6. **Use `--table N` for multi-table READMEs**: Required when multiple evaluation tables exist
7. **Use `--model-name-override` for comparison tables**: Copy the exact column header from `inspect-tables` output
8. **Create PRs for Others**: Use `--create-pr` when updating models you don't own
9. **One model per repo**: Only add the main model's results to model-index
10. **No markdown in YAML names**: The model name field in YAML should be plain text

### Model Name Matching

When extracting evaluation tables with multiple models (either as columns or rows), the script uses **exact normalized token matching**:

- Removes markdown formatting (bold `**`, links `[]()`  )
- Normalizes names (lowercase, replace `-` and `_` with spaces)
- Compares token sets: `"OLMo-3-32B"` → `{"olmo", "3", "32b"}` matches `"**Olmo 3 32B**"` or `"Olmo-3-32B`
- Only extracts if tokens match exactly (handles different word orders and separators)
- Fails if no exact match found (rather than guessing from similar names)

**For column-based tables** (benchmarks as rows, models as columns):
- Finds the column header matching the model name
- Extracts scores from that column only

**For transposed tables** (models as rows, benchmarks as columns):
- Finds the row in the first column matching the model name
- Extracts all benchmark scores from that row only

This ensures only the correct model's scores are extracted, never unrelated models or training checkpoints. 

### Common Patterns

**Update Your Own Model:**
```bash
# Extract from README and push directly
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "your-username/your-model" \
  --task-type "text-generation"
```

**Update Someone Else's Model (Full Workflow):**
```bash
# Step 1: ALWAYS check for existing PRs first
uv run scripts/evaluation_manager.py get-prs \
  --repo-id "other-username/their-model"

# Step 2: If NO open PRs exist, proceed with creating one
uv run scripts/evaluation_manager.py extract-readme \
  --repo-id "other-username/their-model" \
  --create-pr

# If open PRs DO exist:
# - Warn the user about existing PRs
# - Show them the PR URLs
# - Do NOT create a new PR unless user explicitly confirms
```

**Import Fresh Benchmarks:**
```bash
# Step 1: Check for existing PRs
uv run scripts/evaluation_manager.py get-prs \
  --repo-id "anthropic/claude-sonnet-4"

# Step 2: If no PRs, import from Artificial Analysis
AA_API_KEY=... uv run scripts/evaluation_manager.py import-aa \
  --creator-slug "anthropic" \
  --model-name "claude-sonnet-4" \
  --repo-id "anthropic/claude-sonnet-4" \
  --create-pr
```

### Troubleshooting

**Issue**: "No evaluation tables found in README"
- **Solution**: Check if README contains markdown tables with numeric scores

**Issue**: "Could not find model 'X' in transposed table"
- **Solution**: The script will display available models. Use `--model-name-override` with the exact name from the list
- **Example**: `--model-name-override "**Olmo 3-32B**"`

**Issue**: "AA_API_KEY not set"
- **Solution**: Set environment variable or add to .env file

**Issue**: "Token does not have write access"
- **Solution**: Ensure HF_TOKEN has write permissions for the repository

**Issue**: "Model not found in Artificial Analysis"
- **Solution**: Verify creator-slug and model-name match API values

**Issue**: "Payment required for hardware"
- **Solution**: Add a payment method to your Hugging Face account to use non-CPU hardware

**Issue**: "vLLM out of memory" or CUDA OOM
- **Solution**: Use a larger hardware flavor, reduce `--gpu-memory-utilization`, or use `--tensor-parallel-size` for multi-GPU

**Issue**: "Model architecture not supported by vLLM"
- **Solution**: Use `--backend hf` (inspect-ai) or `--backend accelerate` (lighteval) for HuggingFace Transformers

**Issue**: "Trust remote code required"
- **Solution**: Add `--trust-remote-code` flag for models with custom code (e.g., Phi-2, Qwen)

**Issue**: "Chat template not found"
- **Solution**: Only use `--use-chat-template` for instruction-tuned models that include a chat template

### Integration Examples

**Python Script Integration:**
```python
import subprocess
import os

def update_model_evaluations(repo_id, readme_content):
    """Update model card with evaluations from README."""
    result = subprocess.run([
        "python", "scripts/evaluation_manager.py",
        "extract-readme",
        "--repo-id", repo_id,
        "--create-pr"
    ], capture_output=True, text=True)

    if result.returncode == 0:
        print(f"Successfully updated {repo_id}")
    else:
        print(f"Error: {result.stderr}")
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
