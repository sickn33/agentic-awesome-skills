#!/usr/bin/env python3
"""Convert a reviewed pinned LoRA adapter using a reviewed local llama.cpp build.

Install compatible, reviewed dependencies separately. This script neither clones
nor builds tools and does not publish artifacts. CPU merging can require several
times the model size in RAM. Intermediate files remain available after failure.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

TRUST_REMOTE_CODE = False


def revision(value):
    if not re.fullmatch(r"[0-9a-f]{40}", value):
        raise argparse.ArgumentTypeError("use an immutable 40-character Git revision")
    return value


def repo_id(value):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,95}/[A-Za-z0-9][A-Za-z0-9_.-]{0,95}", value) or ".." in value:
        raise argparse.ArgumentTypeError("use namespace/repository, not a local path or URL")
    return value


def regular(path):
    path = Path(os.path.abspath(path))
    if path.is_symlink() or not path.is_file():
        raise ValueError("expected a reviewed regular local file")
    for parent in path.parents:
        if parent.is_symlink():
            raise ValueError("symbolic-link tool/output parents are not supported")
    return path


def command(args, timeout):
    # Never forward a credential environment to the converter/build tools.
    env = {key: value for key, value in os.environ.items()
           if key in {"PATH", "SYSTEMROOT", "LANG", "LC_ALL"}}
    result = subprocess.run(args, env=env, stdin=subprocess.DEVNULL,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            timeout=timeout, check=False, shell=False)
    if result.returncode:
        raise RuntimeError("reviewed conversion tool failed; intermediates were retained")


def digest(path):
    with path.open("rb") as handle:
        if handle.read(4) != b"GGUF":
            raise ValueError("conversion did not produce a GGUF header")
        handle.seek(0)
        result = hashlib.file_digest(handle, "sha256").hexdigest() if hasattr(hashlib, "file_digest") else None
        if result is None:
            checksum = hashlib.sha256()
            while chunk := handle.read(1024 * 1024):
                checksum.update(chunk)
            result = checksum.hexdigest()
    return {"name": path.name, "bytes": path.stat().st_size, "sha256": result}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-convert", action="store_true")
    parser.add_argument("--base-model", required=True, type=repo_id)
    parser.add_argument("--base-revision", required=True, type=revision)
    parser.add_argument("--adapter-model", required=True, type=repo_id)
    parser.add_argument("--adapter-revision", required=True, type=revision)
    parser.add_argument("--llama-cpp-dir", required=True)
    parser.add_argument("--llama-cpp-revision", required=True, type=revision)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--timeout-seconds", type=int, default=1800)
    args = parser.parse_args(argv)
    if not args.allow_convert:
        parser.error("model download and local conversion authorization required")
    if not 1 <= args.timeout_seconds <= 86400:
        parser.error("timeout-seconds must be 1..86400 per subprocess")
    llama = Path(os.path.abspath(args.llama_cpp_dir))
    converter = regular(llama / "convert_hf_to_gguf.py")
    quantizer = regular(llama / "build/bin/llama-quantize")
    # A commit match is identity evidence only. The caller must review the tree,
    # its cleanliness, build inputs and resulting binary before authorizing use.
    head = subprocess.run(["git", "-C", str(llama), "rev-parse", "HEAD"],
                          check=True, capture_output=True, text=True, timeout=10).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(llama), "status", "--porcelain", "--untracked-files=no"],
                           check=True, capture_output=True, text=True, timeout=10).stdout
    if head != args.llama_cpp_revision or dirty:
        parser.error("llama.cpp must match the reviewed revision with no tracked modifications")
    out = Path(os.path.abspath(args.output_dir))
    for parent in out.parents:
        if parent.is_symlink():
            parser.error("output parents may not be symlinks")
    if not out.parent.is_dir():
        parser.error("output parent must already exist")
    out.mkdir(mode=0o700, exist_ok=False)
    merged_dir = out / "merged-model"
    merged_dir.mkdir(mode=0o700)
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel
    base = AutoModelForCausalLM.from_pretrained(
        args.base_model, revision=args.base_revision, torch_dtype=torch.float32,
        device_map="cpu", trust_remote_code=TRUST_REMOTE_CODE, use_safetensors=True)
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, revision=args.base_revision,
                                              trust_remote_code=TRUST_REMOTE_CODE)
    model = PeftModel.from_pretrained(base, args.adapter_model,
                                      revision=args.adapter_revision, use_safetensors=True)
    merged = model.merge_and_unload()
    merged.save_pretrained(merged_dir, safe_serialization=True)
    tokenizer.save_pretrained(merged_dir)
    f16 = out / "model-f16.gguf"
    quantized = out / "model-Q4_K_M.gguf"
    command([sys.executable, str(converter), str(merged_dir), "--outfile", str(f16),
             "--outtype", "f16"], args.timeout_seconds)
    regular(f16)
    digest(f16)
    command([str(quantizer), str(f16), str(quantized), "Q4_K_M"], args.timeout_seconds)
    regular(quantized)
    provenance = {"base_model": args.base_model, "base_revision": args.base_revision,
                  "adapter_model": args.adapter_model, "adapter_revision": args.adapter_revision,
                  "llama_cpp_revision": head, "artifacts": [digest(f16), digest(quantized)],
                  "limitations": "No quality, compatibility or license grant is implied. No upload performed."}
    with (out / "conversion-provenance.json").open("x", encoding="utf-8") as handle:
        json.dump(provenance, handle, indent=2)
    print("Conversion finished; inspect retained artifacts and evaluate before deployment.")


if __name__ == "__main__":
    main()
