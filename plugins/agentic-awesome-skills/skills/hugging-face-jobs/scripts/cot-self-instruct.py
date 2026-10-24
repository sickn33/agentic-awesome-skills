# Modified in the local catalog review: credential, bounded execution and data-quality corrections.
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "datasets",
#     "transformers",
#     "vllm>=0.6.5",
#     "huggingface-hub[hf_transfer]",
#     "torch",
#     "numpy",
#     "tqdm",
#     "scikit-learn",
# ]
# ///
"""
Generate synthetic candidate data requiring independent quality verification using Chain-of-Thought Self-Instruct methodology.

This script implements the CoT-Self-Instruct approach from the paper "CoT-Self-Instruct: 
Building high-quality synthetic prompts for reasoning and non-reasoning tasks" (2025).

It supports two modes:
1. Reasoning tasks: Generates both questions and answers with Chain-of-Thought
2. Instruction tasks: Generates diverse prompts for general instruction following

Example usage:
    # Reasoning tasks with Answer-Consistency filtering
    uv run cot-self-instruct.py \\
        --seed-dataset davanstrien/s1k-reasoning \\
        --output-dataset username/synthetic-math \\
        --task-type reasoning \\
        --num-samples 5000 \\
        --filter-method answer-consistency

    # Instruction tasks with RIP filtering
    uv run cot-self-instruct.py \\
        --seed-dataset wildchat-filtered \\
        --output-dataset username/synthetic-prompts \\
        --task-type instruction \\
        --filter-method rip \\
        --reward-model Nexusflow/Athene-RM-8B

    # HF Jobs execution
    hf jobs uv run --flavor l4x4 \\
        --image vllm/vllm-openai \\
        -s HF_TOKEN \\
        https://huggingface.co/datasets/uv-scripts/synthetic-data/raw/<reviewed-full-commit-sha>/cot-self-instruct.py \\
        [args...]
"""

import argparse
import json
import math
import logging
import os
import random
import re
import sys
from collections import Counter
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import torch
from datasets import Dataset, load_dataset
from huggingface_hub import DatasetCard, HfApi, get_token
from sklearn.cluster import KMeans
from tqdm.auto import tqdm
from transformers import AutoTokenizer
from vllm import LLM, SamplingParams

# Enable HF Transfer for faster downloads
os.environ["HF_XET_HIGH_PERFORMANCE"] = "1"

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Prompt templates from the paper
REASONING_PROMPT_TEMPLATE = """You are a reasoning question generator assistant. Your goal is to create a novel, and challenging reasoning question. You are provided the following seed questions:
Seed Question 1: {seed1}
Seed Question 2: {seed2}
Your task is to:
1. Write a brand-new, self-contained reasoning question that meets the following requirements:
(a) The question draws inspiration from the seed question without copying it verbatim, remaining novel and of comparable difficulty.
(b) The question's final answer should be a single, unambiguous scalar value (e.g., an integer, reduced fraction, exact radical), or another answer type that can be verified in one step (e.g., 'yes/no,' a choice from A to D).
2. Then reason step by step, solve the new question and format your output as follows:
[New Question Begin]{{your_generated_question}}[New Question End]
[Final Answer to New Question Begin]\\boxed{{your_final_answer}}[Final Answer to New Question End]"""

INSTRUCTION_PROMPT_TEMPLATE = """You are a prompt generator assistant. Your goal is to create diverse and creative synthetic prompts.
Please follow the steps below to create synthetic prompts.
Step 1: Carefully read #Prompt 1# and #Prompt 2#. Identify and list all the common elements between these two prompts. If no common elements are found, list the main elements from each prompt.
Step 2: Develop a comprehensive plan based on the #Common Elements List# or #Main Elements List# from Step 1. This plan will guide the generation of new synthetic prompts that are similar to the original prompts.
Step 3: Execute the plan step by step and provide one #Synthetic Prompt#.
Please reply strictly in the following format:
- Step 1 #Common Elements List# or #Main Elements List#:
- Step 2 #Plan#:
- Step 3 #Synthetic Prompt#:
#Prompt 1#:
{prompt1}
#Prompt 2#:
{prompt2}"""


def check_gpu_availability() -> int:
    """Check if CUDA is available and return the number of GPUs."""
    if not torch.cuda.is_available():
        logger.error("CUDA is not available. This script requires a GPU.")
        logger.error(
            "Please run on a machine with NVIDIA GPU or use HF Jobs with GPU flavor."
        )
        sys.exit(1)

    num_gpus = torch.cuda.device_count()
    for i in range(num_gpus):
        gpu_name = torch.cuda.get_device_name(i)
        gpu_memory = torch.cuda.get_device_properties(i).total_memory / 1024**3
        logger.info(f"GPU {i}: {gpu_name} with {gpu_memory:.1f} GB memory")

    return num_gpus


def parse_thinking_output(text: str) -> str:
    """Remove thinking tokens from model output."""
    # Remove <think>...</think> blocks
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    if "<think>" in text: return ""
    return text.strip()


def boxed_answer(text: str) -> Optional[str]:
    marker = "\\boxed{"
    start = text.find(marker)
    if start < 0: return None
    start += len(marker)
    depth = 1
    for index in range(start, len(text)):
        if text[index] == "{": depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0: return text[start:index].strip()
    return None


def extract_reasoning_output(text: str) -> Tuple[Optional[str], Optional[str]]:
    text = parse_thinking_output(text)
    question = re.search(r"\[New Question Begin\](.*?)\[New Question End\]", text, re.S)
    answer = re.search(r"\[Final Answer to New Question Begin\](.*?)\[Final Answer to New Question End\]", text, re.S)
    if not question: return None, None
    if not answer: return question[1].strip(), None
    raw = answer[1].strip()
    return question[1].strip(), boxed_answer(raw) if "\\boxed{" in raw else raw


def extract_instruction_output(text: str) -> Optional[str]:
    """Extract synthetic prompt from instruction task output."""
    text = parse_thinking_output(text)
    
    # Look for the synthetic prompt after "Step 3 #Synthetic Prompt#:"
    match = re.search(r'Step 3 #Synthetic Prompt#:\s*(.+)', text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return None


def categorize_prompts(prompts: List[str], num_categories: int = 8) -> Dict[int, List[int]]:
    """Categorize prompts using clustering for instruction tasks."""
    from transformers import AutoModel
    
    logger.info(f"Categorizing {len(prompts)} prompts into {num_categories} categories...")
    
    # Use a small model for embeddings
    tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
    model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
    
    if not prompts: return {}
    model.eval()
    # Get embeddings
    embeddings = []
    for prompt in tqdm(prompts, desc="Computing embeddings"):
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            outputs = model(**inputs)
            embedding = outputs.last_hidden_state.mean(dim=1).numpy()
        embeddings.append(embedding[0])
    
    # Cluster only available, nonempty samples; evaluation disables dropout.
    kmeans = KMeans(n_clusters=min(num_categories, len(prompts)), random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    
    # Group by category
    categories = {}
    for idx, label in enumerate(labels):
        if label not in categories:
            categories[label] = []
        categories[label].append(idx)
    
    return categories


def generate_synthetic_data(
    llm: LLM,
    seed_data: List[Dict],
    task_type: str,
    num_samples: int,
    categories: Optional[Dict[int, List[int]]] = None,
) -> List[Dict]:
    """Generate synthetic data using CoT-Self-Instruct."""
    synthetic_data = []
    
    # Set up progress bar
    pbar = tqdm(total=num_samples, desc="Generating synthetic data")
    
    if not seed_data or num_samples <= 0: raise ValueError("Nonempty seed data and positive sample count required")
    attempts = 0
    seen = set()
    while len(synthetic_data) < num_samples and attempts < num_samples * 3:
        attempts += 1
        # Sample seed data
        if task_type == "reasoning":
            # Random sampling for reasoning tasks
            seeds = random.sample(seed_data, min(2, len(seed_data)))
            prompt = REASONING_PROMPT_TEMPLATE.format(
                seed1=seeds[0].get("question", seeds[0].get("prompt", "")),
                seed2=seeds[1].get("question", seeds[1].get("prompt", "")) if len(seeds) > 1 else seeds[0].get("question", seeds[0].get("prompt", ""))
            )
        else:
            # Category-aware sampling for instruction tasks
            if categories:
                # Pick a random category
                category = random.choice(list(categories.keys()))
                category_indices = categories[category]
                indices = random.sample(category_indices, min(2, len(category_indices)))
                seeds = [seed_data[i] for i in indices]
            else:
                seeds = random.sample(seed_data, min(2, len(seed_data)))
            
            prompt = INSTRUCTION_PROMPT_TEMPLATE.format(
                prompt1=seeds[0].get("prompt", seeds[0].get("question", "")),
                prompt2=seeds[1].get("prompt", seeds[1].get("question", "")) if len(seeds) > 1 else seeds[0].get("prompt", seeds[0].get("question", ""))
            )
        
        # Generate
        sampling_params = SamplingParams(
            temperature=0.7 if task_type == "reasoning" else 0.8,
            top_p=0.95 if task_type == "reasoning" else 0.9,
            max_tokens=2048,
        )
        
        outputs = llm.generate([prompt], sampling_params)
        output_text = outputs[0].outputs[0].text
        
        # Parse output
        if task_type == "reasoning":
            question, answer = extract_reasoning_output(output_text)
            key = (question, answer)
            if question and answer and key not in seen:
                seen.add(key)
                synthetic_data.append({
                    "question": question,
                    "answer": answer,
                    "seed_indices": [seed_data.index(s) for s in seeds],
                })
                pbar.update(1)
        else:
            synthetic_prompt = extract_instruction_output(output_text)
            if synthetic_prompt and synthetic_prompt not in seen:
                seen.add(synthetic_prompt)
                synthetic_data.append({
                    "prompt": synthetic_prompt,
                    "seed_indices": [seed_data.index(s) for s in seeds],
                })
                pbar.update(1)
    
    pbar.close()
    if len(synthetic_data) < num_samples: raise ValueError(f"Generation budget exhausted: {len(synthetic_data)}/{num_samples} usable examples; nothing published")
    return synthetic_data


def answer_consistency_filter(
    llm: LLM,
    synthetic_data: List[Dict],
    k_responses: int = 16,
    threshold: float = 0.5,
) -> List[Dict]:
    """Filter reasoning tasks using Answer-Consistency."""
    logger.info(f"Applying Answer-Consistency filter with K={k_responses}")
    
    filtered_data = []
    
    for item in tqdm(synthetic_data, desc="Answer-Consistency filtering"):
        question = item["question"]
        original_answer = item["answer"]
        
        # Generate K responses
        prompts = [question] * k_responses
        sampling_params = SamplingParams(
            temperature=0.6,
            top_p=0.95,
            max_tokens=1024,
        )
        
        outputs = llm.generate(prompts, sampling_params)
        
        # Extract answers
        answers = []
        for output in outputs:
            text = output.outputs[0].text
            # Try to extract boxed answer
            answer = boxed_answer(parse_thinking_output(text))
            if answer is not None:
                answers.append(answer)
        
        if not answers:
            continue
        
        # Get majority answer
        answer_counts = Counter(answers)
        if answer_counts:
            majority_answer, count = answer_counts.most_common(1)[0]
            
            # Check if majority answer matches original and meets threshold
            if (majority_answer == original_answer and 
                count / k_responses >= threshold):
                item["consistency_score"] = count / k_responses
                filtered_data.append(item)
    
    logger.info(f"Answer-Consistency: kept {len(filtered_data)}/{len(synthetic_data)} examples")
    return filtered_data


def rip_filter(
    llm: LLM,
    synthetic_data: List[Dict],
    reward_model_id: str,
    k_responses: int = 32,
    threshold: float = 0.5,
) -> List[Dict]:
    """Filter using Rejecting Instruction Preferences (RIP)."""
    raise NotImplementedError("RIP reward-model scoring is not implemented; no length proxy or quality claim is used")


def create_dataset_card(
    task_type: str,
    source_dataset: str,
    generation_model: str,
    filter_method: str,
    num_generated: int,
    num_filtered: int,
    generation_time: str,
    additional_info: Dict = None,
) -> str:
    """Create a comprehensive dataset card."""
    filter_info = ""
    if filter_method == "answer-consistency":
        filter_info = """
### Answer-Consistency Filtering

This dataset was filtered using Answer-Consistency:
- Generated K responses for each synthetic question
- Kept only examples where majority answer matched the generated answer
- Measures agreement only; consensus does not establish correctness"""
    elif filter_method == "rip":
        filter_info = """
### RIP (Rejecting Instruction Preferences) Filtering

This dataset was filtered using RIP:
- Generated K responses for each synthetic prompt
- Scored responses using a reward model
- Kept only prompts with high minimum scores"""
    
    return f"""---
tags:
- synthetic-data
- cot-self-instruct
- {task_type}
- uv-script
---

# CoT-Self-Instruct Synthetic Data

This dataset contains synthetic {task_type} data generated using the Chain-of-Thought Self-Instruct methodology.

## Generation Details

- **Source Dataset**: [{source_dataset}](https://huggingface.co/datasets/{source_dataset})
- **Generation Model**: [{generation_model}](https://huggingface.co/{generation_model})
- **Task Type**: {task_type}
- **Filter Method**: {filter_method}
- **Generated Examples**: {num_generated:,}
- **After Filtering**: {num_filtered:,} ({(num_filtered/num_generated)*100:.1f}% acceptance rate)
- **Generation Date**: {generation_time}
{filter_info}

## Methodology

Generated using CoT-Self-Instruct, which:
1. Uses Chain-of-Thought reasoning to analyze seed examples
2. Generates new synthetic examples of similar quality and complexity
3. Applies heuristic filtering; independent correctness checks remain required

Based on the paper: "CoT-Self-Instruct: Building high-quality synthetic prompts for reasoning and non-reasoning tasks" (2025)

## Generation Script

Generated using the CoT-Self-Instruct script from [uv-scripts/synthetic-data](https://huggingface.co/datasets/uv-scripts/synthetic-data).

To reproduce:
```bash
uv run https://huggingface.co/datasets/uv-scripts/synthetic-data/raw/<reviewed-full-commit-sha>/cot-self-instruct.py \\
    --seed-dataset {source_dataset} \\
    --output-dataset <your-dataset> \\
    --task-type {task_type} \\
    --generation-model {generation_model} \\
    --filter-method {filter_method}
```
"""


def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic data using CoT-Self-Instruct",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    
    # Dataset arguments
    parser.add_argument(
        "--seed-dataset",
        type=str,
        required=True,
        help="HuggingFace dataset ID containing seed examples",
    )
    parser.add_argument(
        "--output-dataset",
        type=str,
        required=True,
        help="HuggingFace dataset ID for output",
    )
    
    # Task configuration
    parser.add_argument(
        "--task-type",
        type=str,
        choices=["reasoning", "instruction", "auto"],
        default="auto",
        help="Type of task (reasoning generates Q&A, instruction generates prompts)",
    )
    parser.add_argument(
        "--task-column",
        type=str,
        default=None,
        help="Column name containing tasks (auto-detected if not specified)",
    )
    
    # Model configuration
    parser.add_argument(
        "--generation-model",
        type=str,
        default="Qwen/Qwen3-30B-A3B-Thinking-2507",
        help="Model for synthetic data generation",
    )
    parser.add_argument(
        "--filter-model",
        type=str,
        default=None,
        help="Model for filtering (defaults to generation model)",
    )
    parser.add_argument(
        "--reward-model",
        type=str,
        default="Nexusflow/Athene-RM-8B",
        help="Reward model for RIP filtering",
    )
    
    # Generation parameters
    parser.add_argument(
        "--num-samples",
        type=int,
        default=100,
        help="Number of synthetic examples to generate",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1,
        help="Batch size for generation",
    )
    
    # Filtering parameters
    parser.add_argument(
        "--filter-method",
        type=str,
        choices=["answer-consistency", "rip", "both", "none"],
        default="answer-consistency",
        help="Quality filtering method",
    )
    parser.add_argument(
        "--k-responses",
        type=int,
        default=16,
        help="Number of responses for filtering",
    )
    parser.add_argument(
        "--quality-threshold",
        type=float,
        default=0.5,
        help="Minimum quality threshold for filtering",
    )
    
    # GPU configuration
    parser.add_argument(
        "--tensor-parallel-size",
        type=int,
        default=None,
        help="Number of GPUs for tensor parallelism (auto-detected if not set)",
    )
    parser.add_argument(
        "--gpu-memory-utilization",
        type=float,
        default=0.9,
        help="GPU memory utilization",
    )
    
    # Other arguments
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed",
    )
    
    parser.add_argument("--model-revision")
    parser.add_argument("--dataset-revision")
    parser.add_argument("--filter-model-revision")
    parser.add_argument("--allow-publish", action="store_true", help="Approve creation of the named private output dataset")
    args = parser.parse_args()
    if not args.allow_publish: parser.error("--allow-publish required for the named output dataset")
    if args.filter_method in {"rip", "both"}: parser.error("RIP reward-model filtering is not implemented")
    if args.num_samples <= 0 or args.k_responses <= 0: parser.error("Positive sample and response counts required")
    if not math.isfinite(args.quality_threshold) or not 0 < args.quality_threshold <= 1: parser.error("Quality threshold must be in (0,1]")
    if not 0 < args.gpu_memory_utilization <= 1: parser.error("GPU memory fraction must be in (0,1]")
    if args.batch_size != 1: parser.error("This implementation supports batch-size=1 only")
    if args.seed_dataset == args.output_dataset: parser.error("Output must not overwrite seed dataset")
    
    # Set random seeds
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    
    # Check GPU
    num_gpus = check_gpu_availability()
    tensor_parallel_size = args.tensor_parallel_size or num_gpus
    
    # Authentication
    hf_token = os.environ.get("HF_TOKEN") or get_token()
    if not hf_token: raise ValueError("Hub publication requires an approved environment/login secret")
    if hf_token:
        os.environ["HF_TOKEN"] = hf_token
    
    if tensor_parallel_size <= 0 or tensor_parallel_size > num_gpus: raise ValueError("Invalid tensor parallel size")
    HfApi(token=hf_token).create_repo(args.output_dataset, repo_type="dataset", private=True, exist_ok=False)
    # Load seed dataset
    logger.info(f"Loading seed dataset: {args.seed_dataset}")
    seed_dataset = load_dataset(args.seed_dataset, split="train", revision=args.dataset_revision)
    
    # Auto-detect task type and column if needed
    if args.task_type == "auto":
        columns = seed_dataset.column_names
        if "question" in columns and "answer" in columns:
            args.task_type = "reasoning"
            logger.info("Auto-detected task type: reasoning")
        else:
            args.task_type = "instruction"
            logger.info("Auto-detected task type: instruction")
    
    if not args.task_column:
        if args.task_type == "reasoning":
            args.task_column = "question"
        else:
            # Try to find prompt column
            for col in ["prompt", "instruction", "text", "input"]:
                if col in seed_dataset.column_names:
                    args.task_column = col
                    break
    
    logger.info(f"Using task column: {args.task_column}")
    
    # Convert to list of dicts
    if args.task_column not in seed_dataset.column_names: raise ValueError("Selected task column missing")
    seed_data = seed_dataset.to_list()
    for item in seed_data:
        value = item.get(args.task_column)
        if not isinstance(value, str) or not value.strip(): raise ValueError("Seed task text must be nonempty")
        item["question" if args.task_type == "reasoning" else "prompt"] = value
    if not seed_data: raise ValueError("No seed examples")
    if args.task_type != "reasoning" and args.filter_method == "answer-consistency": raise ValueError("Answer-consistency applies to reasoning; choose filter-method=none for instruction prompts")
    
    # Categorize prompts for instruction tasks
    categories = None
    if args.task_type == "instruction" and len(seed_data) > 100:
        prompts = [item.get(args.task_column, "") for item in seed_data]
        categories = categorize_prompts(prompts)
    
    # Initialize generation model
    logger.info(f"Loading generation model: {args.generation_model}")
    generation_llm = LLM(
        model=args.generation_model,
        revision=args.model_revision,
        tensor_parallel_size=tensor_parallel_size,
        gpu_memory_utilization=args.gpu_memory_utilization,
    )
    
    # Generate synthetic data
    start_time = datetime.now(__import__("datetime").timezone.utc)
    synthetic_data = generate_synthetic_data(
        generation_llm,
        seed_data,
        args.task_type,
        args.num_samples,
        categories,
    )
    
    # Apply filtering
    filter_llm = None
    if args.filter_model and args.filter_model != args.generation_model:
        logger.info(f"Loading filter model: {args.filter_model}")
        # Clean up generation model
        del generation_llm
        torch.cuda.empty_cache()
        
        filter_llm = LLM(
            model=args.filter_model,
            revision=args.filter_model_revision,
            tensor_parallel_size=tensor_parallel_size,
            gpu_memory_utilization=args.gpu_memory_utilization,
        )
    
    if filter_llm is None: filter_llm = generation_llm
    filtered_data = synthetic_data
    if args.filter_method != "none":
        if args.filter_method == "answer-consistency" and args.task_type == "reasoning":
            filtered_data = answer_consistency_filter(
                filter_llm,
                synthetic_data,
                args.k_responses,
                args.quality_threshold,
            )
        elif args.filter_method == "rip":
            filtered_data = rip_filter(
                filter_llm,
                synthetic_data,
                args.reward_model,
                args.k_responses,
                args.quality_threshold,
            )
        elif args.filter_method == "both":
            if args.task_type == "reasoning":
                filtered_data = answer_consistency_filter(
                    filter_llm,
                    synthetic_data,
                    args.k_responses,
                    args.quality_threshold,
                )
            filtered_data = rip_filter(
                filter_llm,
                filtered_data,
                args.reward_model,
                args.k_responses,
                args.quality_threshold,
            )
    
    if not filtered_data: raise ValueError("No examples passed filtering; nothing published")
    # Create HuggingFace dataset
    logger.info(f"Creating dataset with {len(filtered_data)} examples")
    dataset = Dataset.from_list(filtered_data)
    
    # Create dataset card
    generation_time = start_time.strftime("%Y-%m-%d %H:%M:%S UTC")
    dataset_card = create_dataset_card(
        args.task_type,
        args.seed_dataset,
        args.generation_model,
        args.filter_method,
        len(synthetic_data),
        len(filtered_data),
        generation_time,
    )
    
    dataset_card += f"\nSource revision: {args.dataset_revision or 'unrecorded'}\nModel revision: {args.model_revision or 'unrecorded'}\n"

    # Push to hub
    logger.info(f"Pushing dataset to: {args.output_dataset}")
    # Create dataset card
    card = DatasetCard(dataset_card)
    dataset.push_to_hub(args.output_dataset, private=True, token=hf_token)
    # Push card separately
    card.push_to_hub(args.output_dataset, token=hf_token)
    
    logger.info("Done! Dataset available at: https://huggingface.co/datasets/" + args.output_dataset)
    
    # Print example HF Jobs command if running locally
    if len(sys.argv) > 1:
        print("\nTo run on HF Jobs:")
        print(f"""hf jobs uv run --flavor l4x4 \\
    --image vllm/vllm-openai \\
    -s HF_TOKEN \\
    https://huggingface.co/datasets/uv-scripts/synthetic-data/raw/<reviewed-full-commit-sha>/cot-self-instruct.py \\
    --seed-dataset {args.seed_dataset} \\
    --output-dataset {args.output_dataset} \\
    --task-type {args.task_type} \\
    --generation-model {args.generation_model} \\
    --filter-method {args.filter_method} \\
    --num-samples {args.num_samples}""")


if __name__ == "__main__":
    main()