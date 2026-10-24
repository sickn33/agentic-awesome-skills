#!/usr/bin/env python3
"""Bounded GRPO teaching example. Install reviewed compatible dependencies separately.

No training, downloads, tracking or uploads occur on import. This example saves
locally; publication and cloud submission are separate user-approved operations.
GPU execution has not been certified by the source-review tests.
"""
import argparse
import os
from pathlib import Path
import re


def arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-training", action="store_true")
    parser.add_argument("--model", required=True)
    parser.add_argument("--model-revision", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--dataset-revision", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--max-samples", type=int, default=100)
    parser.add_argument("--max-steps", type=int, default=20)
    args = parser.parse_args(argv)
    if not args.allow_training:
        parser.error("training/download authorization is required")
    for revision in (args.model_revision, args.dataset_revision):
        if not re.fullmatch(r"[0-9a-f]{40}", revision):
            parser.error("use immutable 40-character repository revisions")
    if not 2 <= args.max_samples <= 10000 or not 1 <= args.max_steps <= 1000:
        parser.error("max-samples must be 2..10000 and max-steps 1..1000")
    output = Path(os.path.abspath(args.output_dir))
    for parent in output.parents:
        if parent.is_symlink():
            parser.error("output parent must not be a symbolic link")
    if not output.parent.is_dir():
        parser.error("output parent must already exist")
    # Exclusive creation prevents overwriting a previous run or checkpoints.
    output.mkdir(mode=0o700, exist_ok=False)
    args.output_dir = str(output)
    return args


def validate_rows(rows):
    """Validate and project only the fields consumed by this teaching method."""
    if len(rows) < 2:
        raise ValueError("at least two examples are required")
    result = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("each example must be an object")
        fields = ("prompt", "answer")
        if not all(isinstance(row.get(key), str) and row[key].strip() for key in fields):
            raise ValueError("this toy GRPO example requires string prompt and exact-match answer")
        result.append({key: row[key] for key in fields})
    return result


def exact_match_reward(completions, answer, **kwargs):
    """Toy reward only: string equality is not mathematical or semantic correctness."""
    if len(completions) != len(answer):
        raise ValueError("reward inputs have different lengths")
    rewards = []
    for completion, expected in zip(completions, answer):
        if isinstance(completion, list):
            completion = completion[-1].get("content") if completion else None
        if not isinstance(completion, str) or not isinstance(expected, str):
            raise ValueError("reward requires text completions and answers")
        rewards.append(float(completion.strip() == expected.strip()))
    return rewards


def main(argv=None):
    args = arguments(argv)
    # Imports are deliberately below authorization and local input validation.
    from datasets import Dataset, load_dataset
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import GRPOTrainer, GRPOConfig
    stream = load_dataset(args.dataset, revision=args.dataset_revision,
                          split="train", streaming=True)
    rows = validate_rows(list(stream.take(args.max_samples)))
    dataset = Dataset.from_list(rows)
    tokenizer = AutoTokenizer.from_pretrained(args.model, revision=args.model_revision,
                                              trust_remote_code=False)
    if tokenizer.pad_token is None:
        if tokenizer.eos_token is None:
            raise ValueError("a model-specific pad token configuration is required")
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.model, revision=args.model_revision, trust_remote_code=False,
        use_safetensors=True)
    config = GRPOConfig(output_dir=args.output_dir, max_steps=args.max_steps,
                    per_device_train_batch_size=2, gradient_accumulation_steps=1,
                    report_to=[], push_to_hub=False, save_steps=10,
                    save_total_limit=2, logging_steps=5, num_generations=2)
    trainer = GRPOTrainer(model=model, args=config, train_dataset=dataset,
                      processing_class=tokenizer, reward_funcs=exact_match_reward)
    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print("Training finished; inspect local checkpoints and held-out evaluation before use.")


if __name__ == "__main__":
    main()
