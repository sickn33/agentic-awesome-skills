#!/usr/bin/env python3
"""Bounded text-only Unsloth example; no telemetry or Hub publication.

Install a mutually compatible reviewed Unsloth/TRL/Transformers environment
separately. This source review does not certify GPU training or performance.
Use the separate GGUF workflow for merging/conversion after evaluating adapters.
"""
import argparse
from pathlib import Path
import os
import re


def arguments(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-training", action="store_true")
    parser.add_argument("--model", required=True)
    parser.add_argument("--model-revision", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--dataset-revision", required=True)
    parser.add_argument("--save-local", required=True)
    parser.add_argument("--max-steps", type=int, default=20)
    parser.add_argument("--num-samples", type=int, default=100)
    parser.add_argument("--max-seq-length", type=int, default=512)
    parser.add_argument("--instruction-part", required=True,
                        help="Exact user marker from the reviewed model's chat template")
    parser.add_argument("--response-part", required=True,
                        help="Exact assistant marker from that same template")
    parser.add_argument("--target-modules", nargs="+", required=True,
                        help="Reviewed LoRA module names for this exact architecture")
    args = parser.parse_args(argv)
    if not args.allow_training:
        parser.error("training and download authorization required")
    if not all(re.fullmatch(r"[0-9a-f]{40}", value) for value in
               [args.model_revision, args.dataset_revision]):
        parser.error("immutable repository revisions required")
    if not 1 <= args.max_steps <= 1000 or not 2 <= args.num_samples <= 10000:
        parser.error("max-steps must be 1..1000; num-samples must be 2..10000")
    if not 32 <= args.max_seq_length <= 8192:
        parser.error("max-seq-length must be 32..8192; profile actual memory first")
    if not args.instruction_part or not args.response_part or args.instruction_part == args.response_part:
        parser.error("distinct nonempty reviewed chat markers required")
    out = Path(os.path.abspath(args.save_local))
    if any(parent.is_symlink() for parent in out.parents) or not out.parent.is_dir():
        parser.error("existing regular output parent required")
    out.mkdir(mode=0o700, exist_ok=False)
    args.save_local = str(out)
    return args


def validate_messages(row):
    messages = row.get("messages") if isinstance(row, dict) else None
    if not isinstance(messages, list) or not messages:
        raise ValueError("each row needs nonempty messages")
    result = []
    for message in messages:
        if not isinstance(message, dict) or message.get("role") not in {"system", "user", "assistant"}:
            raise ValueError("this text example supports only system/user/assistant messages")
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ValueError("message content must be nonempty text")
        result.append({"role": message["role"], "content": content})
    if not any(m["role"] == "assistant" for m in result):
        raise ValueError("at least one assistant response is required")
    return result


def main(argv=None):
    args = arguments(argv)
    # Unsloth must be imported before transformers/TRL in supported environments.
    from unsloth import FastLanguageModel
    from unsloth.chat_templates import train_on_responses_only
    from datasets import Dataset, load_dataset
    from trl import SFTConfig, SFTTrainer
    stream = load_dataset(args.dataset, revision=args.dataset_revision,
                          split="train", streaming=True)
    messages = [validate_messages(row) for row in stream.take(args.num_samples)]
    if len(messages) < 2:
        raise ValueError("at least two validated rows required")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model, revision=args.model_revision,
        max_seq_length=args.max_seq_length, dtype=None, load_in_4bit=True,
        trust_remote_code=False)
    model = FastLanguageModel.get_peft_model(
        model, r=16, lora_alpha=32, target_modules=args.target_modules,
        lora_dropout=0, bias="none", use_gradient_checkpointing="unsloth")
    texts = [tokenizer.apply_chat_template(row, tokenize=False,
                                          add_generation_prompt=False) for row in messages]
    for text in texts:
        if args.instruction_part not in text or args.response_part not in text:
            raise ValueError("specified markers do not match formatted training examples")
    # Do not strip BOS blindly: the reviewed template owns special-token policy.
    dataset = Dataset.from_dict({"text": texts})
    trainer = SFTTrainer(model=model, processing_class=tokenizer, train_dataset=dataset,
                         args=SFTConfig(output_dir=args.save_local,
                                        dataset_text_field="text", max_length=args.max_seq_length,
                                        max_steps=args.max_steps, per_device_train_batch_size=1,
                                        gradient_accumulation_steps=1, report_to=[],
                                        push_to_hub=False, save_steps=10, save_total_limit=2))
    trainer = train_on_responses_only(trainer, instruction_part=args.instruction_part,
                                      response_part=args.response_part)
    trainer.train()
    model.save_pretrained(args.save_local, safe_serialization=True)
    tokenizer.save_pretrained(args.save_local)
    print("Local adapter saved; validate held-out quality and masked labels before deployment.")


if __name__ == "__main__":
    main()
