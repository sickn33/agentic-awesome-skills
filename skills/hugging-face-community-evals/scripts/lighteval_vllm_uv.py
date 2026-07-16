# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "lighteval[accelerate,vllm]>=0.6.0",
#     "torch>=2.0.0",
#     "transformers>=4.40.0",
#     "accelerate>=0.30.0",
#     "vllm>=0.4.0",
# ]
# ///

"""
Entry point script for running lighteval evaluations with local GPU backends.

This script runs evaluations using vLLM or accelerate on custom HuggingFace models.
It is separate from inference provider scripts and evaluates models directly on local hardware.

Usage (standalone):
    uv run scripts/lighteval_vllm_uv.py --model "meta-llama/Llama-3.2-1B" --tasks "leaderboard|mmlu|5"

"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from typing import Optional


def setup_environment() -> None:
    """Configure environment variables for HuggingFace authentication."""
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        os.environ.setdefault("HUGGING_FACE_HUB_TOKEN", hf_token)
        os.environ.setdefault("HF_HUB_TOKEN", hf_token)


def run_lighteval_vllm(
    model_id: str,
    tasks: str,
    output_dir: Optional[str] = None,
    max_samples: Optional[int] = None,
    batch_size: int = 1,
    tensor_parallel_size: int = 1,
    gpu_memory_utilization: float = 0.8,
    dtype: str = "auto",
    trust_remote_code: bool = False,
    use_chat_template: bool = False,
    system_prompt: Optional[str] = None,
) -> None:
    """
    Run lighteval with vLLM backend for efficient GPU inference.

    Args:
        model_id: HuggingFace model ID (e.g., "meta-llama/Llama-3.2-1B")
        tasks: Task specification (e.g., "leaderboard|mmlu|5" or "lighteval|hellaswag|0")
        output_dir: Directory for evaluation results
        max_samples: Limit number of samples per task
        batch_size: Batch size for evaluation
        tensor_parallel_size: Number of GPUs for tensor parallelism
        gpu_memory_utilization: GPU memory fraction to use (0.0-1.0)
        dtype: Data type for model weights (auto, float16, bfloat16)
        trust_remote_code: Allow executing remote code from model repo
        use_chat_template: Apply chat template for conversational models
        system_prompt: System prompt for chat models
    """
    setup_environment()

    # Build lighteval vllm command
    cmd = [
        "lighteval",
        "vllm",
        model_id,
        tasks,
        "--batch-size", str(batch_size),
        "--tensor-parallel-size", str(tensor_parallel_size),
        "--gpu-memory-utilization", str(gpu_memory_utilization),
        "--dtype", dtype,
    ]

    if output_dir:
        cmd.extend(["--output-dir", output_dir])

    if max_samples:
        cmd.extend(["--max-samples", str(max_samples)])

    if trust_remote_code:
        cmd.append("--trust-remote-code")

    if use_chat_template:
        cmd.append("--use-chat-template")

    if system_prompt:
        cmd.extend(["--system-prompt", system_prompt])

    print(f"Running: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
        print("Evaluation complete.")
    except subprocess.CalledProcessError as exc:
        print(f"Evaluation failed with exit code {exc.returncode}", file=sys.stderr)
        sys.exit(exc.returncode)


def run_lighteval_accelerate(
    model_id: str,
    tasks: str,
    output_dir: Optional[str] = None,
    max_samples: Optional[int] = None,
    batch_size: int = 1,
    dtype: str = "bfloat16",
    trust_remote_code: bool = False,
    use_chat_template: bool = False,
    system_prompt: Optional[str] = None,
) -> None:
    """
    Run lighteval with accelerate backend for multi-GPU distributed inference.

    Use this backend when vLLM is not available or for models not supported by vLLM.

    Args:
        model_id: HuggingFace model ID
        tasks: Task specification
        output_dir: Directory for evaluation results
        max_samples: Limit number of samples per task
        batch_size: Batch size for evaluation
        dtype: Data type for model weights
        trust_remote_code: Allow executing remote code
        use_chat_template: Apply chat template
        system_prompt: System prompt for chat models
    """
    setup_environment()

    # Build lighteval accelerate command
    cmd = [
        "lighteval",
        "accelerate",
        model_id,
        tasks,
        "--batch-size", str(batch_size),
        "--dtype", dtype,
    ]

    if output_dir:
        cmd.extend(["--output-dir", output_dir])

    if max_samples:
        cmd.extend(["--max-samples", str(max_samples)])

    if trust_remote_code:
        cmd.append("--trust-remote-code")

    if use_chat_template:
        cmd.append("--use-chat-template")

    if system_prompt:
        cmd.extend(["--system-prompt", system_prompt])

    print(f"Running: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
        print("Evaluation complete.")
    except subprocess.CalledProcessError as exc:
        print(f"Evaluation failed with exit code {exc.returncode}", file=sys.stderr)
        sys.exit(exc.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run lighteval evaluations with vLLM or accelerate backend on custom HuggingFace models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run MMLU evaluation with vLLM
  uv run scripts/lighteval_vllm_uv.py --model meta-llama/Llama-3.2-1B --tasks "leaderboard|mmlu|5"

  # Run with accelerate backend instead of vLLM
  uv run scripts/lighteval_vllm_uv.py --model meta-llama/Llama-3.2-1B --tasks "leaderboard|mmlu|5" --backend accelerate

  # Run with chat template for instruction-tuned models
  uv run scripts/lighteval_vllm_uv.py --model meta-llama/Llama-3.2-1B-Instruct --tasks "leaderboard|mmlu|5" --use-chat-template

  # Run with limited samples for testing
  uv run scripts/lighteval_vllm_uv.py --model meta-llama/Llama-3.2-1B --tasks "leaderboard|mmlu|5" --max-samples 10

Task format:
  Tasks use the format: "suite|task|num_fewshot"
  - leaderboard|mmlu|5 (MMLU with 5-shot)
  - lighteval|hellaswag|0 (HellaSwag zero-shot)
  - leaderboard|gsm8k|5 (GSM8K with 5-shot)
  - Multiple tasks: "leaderboard|mmlu|5,leaderboard|gsm8k|5"
        """,
    )

    parser.add_argument(
        "--model",
        required=True,
        help="HuggingFace model ID (e.g., meta-llama/Llama-3.2-1B)",
    )
    parser.add_argument(
        "--tasks",
        required=True,
        help="Task specification (e.g., 'leaderboard|mmlu|5')",
    )
    parser.add_argument(
        "--backend",
        choices=["vllm", "accelerate"],
        default="vllm",
        help="Inference backend to use (default: vllm)",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Directory for evaluation results",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=None,
        help="Limit number of samples per task (useful for testing)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1,
        help="Batch size for evaluation (default: 1)",
    )
    parser.add_argument(
        "--tensor-parallel-size",
        type=int,
        default=1,
        help="Number of GPUs for tensor parallelism (vLLM only, default: 1)",
    )
    parser.add_argument(
        "--gpu-memory-utilization",
        type=float,
        default=0.8,
        help="GPU memory fraction to use (vLLM only, default: 0.8)",
    )
    parser.add_argument(
        "--dtype",
        default="auto",
        choices=["auto", "float16", "bfloat16", "float32"],
        help="Data type for model weights (default: auto)",
    )
    parser.add_argument(
        "--trust-remote-code",
        action="store_true",
        help="Allow executing remote code from model repository",
    )
    parser.add_argument(
        "--use-chat-template",
        action="store_true",
        help="Apply chat template for instruction-tuned/chat models",
    )
    parser.add_argument(
        "--system-prompt",
        default=None,
        help="System prompt for chat models",
    )

    args = parser.parse_args()

    if args.backend == "vllm":
        run_lighteval_vllm(
            model_id=args.model,
            tasks=args.tasks,
            output_dir=args.output_dir,
            max_samples=args.max_samples,
            batch_size=args.batch_size,
            tensor_parallel_size=args.tensor_parallel_size,
            gpu_memory_utilization=args.gpu_memory_utilization,
            dtype=args.dtype,
            trust_remote_code=args.trust_remote_code,
            use_chat_template=args.use_chat_template,
            system_prompt=args.system_prompt,
        )
    else:
        run_lighteval_accelerate(
            model_id=args.model,
            tasks=args.tasks,
            output_dir=args.output_dir,
            max_samples=args.max_samples,
            batch_size=args.batch_size,
            dtype=args.dtype if args.dtype != "auto" else "bfloat16",
            trust_remote_code=args.trust_remote_code,
            use_chat_template=args.use_chat_template,
            system_prompt=args.system_prompt,
        )


if __name__ == "__main__":
    main()
