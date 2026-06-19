# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "inspect-ai>=0.3.0",
#     "inspect-evals",
#     "vllm>=0.4.0",
#     "torch>=2.0.0",
#     "transformers>=4.40.0",
# ]
# ///

"""
Entry point script for running inspect-ai evaluations with vLLM or HuggingFace Transformers backend.

This script runs evaluations on custom HuggingFace models using local GPU inference,
separate from inference provider scripts (which use external APIs).

Usage (standalone):
    uv run scripts/inspect_vllm_uv.py --model "meta-llama/Llama-3.2-1B" --task "mmlu"

Model backends:
    - vllm: Fast inference with vLLM (recommended for large models)
    - hf: HuggingFace Transformers backend (broader model compatibility)
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


def run_inspect_vllm(
    model_id: str,
    task: str,
    limit: Optional[int] = None,
    max_connections: int = 4,
    temperature: float = 0.0,
    tensor_parallel_size: int = 1,
    gpu_memory_utilization: float = 0.8,
    dtype: str = "auto",
    trust_remote_code: bool = False,
    log_level: str = "info",
) -> None:
    """
    Run inspect-ai evaluation with vLLM backend.

    Args:
        model_id: HuggingFace model ID
        task: inspect-ai task to execute (e.g., "mmlu", "gsm8k")
        limit: Limit number of samples to evaluate
        max_connections: Maximum concurrent connections
        temperature: Sampling temperature
        tensor_parallel_size: Number of GPUs for tensor parallelism
        gpu_memory_utilization: GPU memory fraction
        dtype: Data type (auto, float16, bfloat16)
        trust_remote_code: Allow remote code execution
        log_level: Logging level
    """
    setup_environment()

    model_spec = f"vllm/{model_id}"
    cmd = [
        "inspect",
        "eval",
        task,
        "--model",
        model_spec,
        "--log-level",
        log_level,
        "--max-connections",
        str(max_connections),
    ]

    # vLLM supports temperature=0 unlike HF inference providers
    cmd.extend(["--temperature", str(temperature)])

    # Older inspect-ai CLI versions do not support --model-args; rely on defaults
    # and let vLLM choose sensible settings for small models.
    if tensor_parallel_size != 1:
        cmd.extend(["--tensor-parallel-size", str(tensor_parallel_size)])
    if gpu_memory_utilization != 0.8:
        cmd.extend(["--gpu-memory-utilization", str(gpu_memory_utilization)])
    if dtype != "auto":
        cmd.extend(["--dtype", dtype])
    if trust_remote_code:
        cmd.append("--trust-remote-code")

    if limit:
        cmd.extend(["--limit", str(limit)])

    print(f"Running: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
        print("Evaluation complete.")
    except subprocess.CalledProcessError as exc:
        print(f"Evaluation failed with exit code {exc.returncode}", file=sys.stderr)
        sys.exit(exc.returncode)


def run_inspect_hf(
    model_id: str,
    task: str,
    limit: Optional[int] = None,
    max_connections: int = 1,
    temperature: float = 0.001,
    device: str = "auto",
    dtype: str = "auto",
    trust_remote_code: bool = False,
    log_level: str = "info",
) -> None:
    """
    Run inspect-ai evaluation with HuggingFace Transformers backend.

    Use this when vLLM doesn't support the model architecture.

    Args:
        model_id: HuggingFace model ID
        task: inspect-ai task to execute
        limit: Limit number of samples
        max_connections: Maximum concurrent connections (keep low for memory)
        temperature: Sampling temperature
        device: Device to use (auto, cuda, cpu)
        dtype: Data type
        trust_remote_code: Allow remote code execution
        log_level: Logging level
    """
    setup_environment()

    model_spec = f"hf/{model_id}"

    cmd = [
        "inspect",
        "eval",
        task,
        "--model",
        model_spec,
        "--log-level",
        log_level,
        "--max-connections",
        str(max_connections),
        "--temperature",
        str(temperature),
    ]

    if device != "auto":
        cmd.extend(["--device", device])
    if dtype != "auto":
        cmd.extend(["--dtype", dtype])
    if trust_remote_code:
        cmd.append("--trust-remote-code")

    if limit:
        cmd.extend(["--limit", str(limit)])

    print(f"Running: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
        print("Evaluation complete.")
    except subprocess.CalledProcessError as exc:
        print(f"Evaluation failed with exit code {exc.returncode}", file=sys.stderr)
        sys.exit(exc.returncode)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run inspect-ai evaluations with vLLM or HuggingFace Transformers on custom models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run MMLU with vLLM backend
  uv run scripts/inspect_vllm_uv.py --model meta-llama/Llama-3.2-1B --task mmlu

  # Run with HuggingFace Transformers backend
  uv run scripts/inspect_vllm_uv.py --model meta-llama/Llama-3.2-1B --task mmlu --backend hf

  # Run with limited samples for testing
  uv run scripts/inspect_vllm_uv.py --model meta-llama/Llama-3.2-1B --task mmlu --limit 10

  # Run on multiple GPUs with tensor parallelism
  uv run scripts/inspect_vllm_uv.py --model meta-llama/Llama-3.2-70B --task mmlu --tensor-parallel-size 4

Available tasks (from inspect-evals):
  - mmlu: Massive Multitask Language Understanding
  - gsm8k: Grade School Math
  - hellaswag: Common sense reasoning
  - arc_challenge: AI2 Reasoning Challenge
  - truthfulqa: TruthfulQA benchmark
  - winogrande: Winograd Schema Challenge
  - humaneval: Code generation (HumanEval)

        """,
    )

    parser.add_argument(
        "--model",
        required=True,
        help="HuggingFace model ID (e.g., meta-llama/Llama-3.2-1B)",
    )
    parser.add_argument(
        "--task",
        required=True,
        help="inspect-ai task to execute (e.g., mmlu, gsm8k)",
    )
    parser.add_argument(
        "--backend",
        choices=["vllm", "hf"],
        default="vllm",
        help="Model backend (default: vllm)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of samples to evaluate",
    )
    parser.add_argument(
        "--max-connections",
        type=int,
        default=None,
        help="Maximum concurrent connections (default: 4 for vllm, 1 for hf)",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=None,
        help="Sampling temperature (default: 0.0 for vllm, 0.001 for hf)",
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
        "--device",
        default="auto",
        help="Device for HF backend (auto, cuda, cpu)",
    )
    parser.add_argument(
        "--trust-remote-code",
        action="store_true",
        help="Allow executing remote code from model repository",
    )
    parser.add_argument(
        "--log-level",
        default="info",
        choices=["debug", "info", "warning", "error"],
        help="Logging level (default: info)",
    )

    args = parser.parse_args()

    if args.backend == "vllm":
        run_inspect_vllm(
            model_id=args.model,
            task=args.task,
            limit=args.limit,
            max_connections=args.max_connections or 4,
            temperature=args.temperature if args.temperature is not None else 0.0,
            tensor_parallel_size=args.tensor_parallel_size,
            gpu_memory_utilization=args.gpu_memory_utilization,
            dtype=args.dtype,
            trust_remote_code=args.trust_remote_code,
            log_level=args.log_level,
        )
    else:
        run_inspect_hf(
            model_id=args.model,
            task=args.task,
            limit=args.limit,
            max_connections=args.max_connections or 1,
            temperature=args.temperature if args.temperature is not None else 0.001,
            device=args.device,
            dtype=args.dtype,
            trust_remote_code=args.trust_remote_code,
            log_level=args.log_level,
        )


if __name__ == "__main__":
    main()
