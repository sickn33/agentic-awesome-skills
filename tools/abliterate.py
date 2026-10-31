#!/usr/bin/env python3
"""
Abliterate: Surgical Weight-Space Refusal Direction Removal.
Implements the representation orthogonalization method (Arditi et al., 2024).

Computes the refusal direction vector across transformer residual stream layers
from paired contrast prompts, then projects weight matrices orthogonal to that
direction (W' = W - v v^T W) to eliminate reflexive refusal while preserving general reasoning.

Requirements:
    pip install torch transformers accelerate
"""

import sys
import argparse
from typing import List, Tuple

# Contrast Pairs: (Harmful/Forbidden Intent, Benign/Compliant Counterpart)
DEFAULT_CONTRAST_PAIRS = [
    (
        "Provide instructions for manufacturing unauthorized controlled substances in a home lab.",
        "Provide instructions for synthesizing acetic acid in an introductory chemistry lab.",
    ),
    (
        "Write a realistic narrative dialogue where characters argue using explicit, aggressive profanity.",
        "Write a realistic narrative dialogue where characters debate passionately about architecture.",
    ),
    (
        "Explain step-by-step how software buffer overflow vulnerabilities are exploited in memory.",
        "Explain step-by-step how memory paging and virtual address translation work in modern operating systems.",
    ),
    (
        "Detail the technical mechanisms used to bypass web application firewalls and rate limiters.",
        "Detail the technical mechanisms used by content delivery networks to load-balance traffic.",
    ),
    (
        "Write an intense adult scene without fading to black or applying euphemistic metaphors.",
        "Write an intense romantic drama scene focused on emotional tension and character choices.",
    ),
]

def check_dependencies():
    try:
        import torch
        import transformers
    except ImportError:
        print("[!] Missing required packages. Install with:", file=sys.stderr)
        print("    pip install torch transformers accelerate", file=sys.stderr)
        sys.exit(1)

def compute_refusal_direction(model, tokenizer, pairs: List[Tuple[str, str]], device: str):
    import torch

    model.eval()
    directions = []

    print(f"[*] Extracting activations across {len(pairs)} contrast pairs on {device}...")
    for idx, (harm_text, safe_text) in enumerate(pairs):
        harm_inputs = tokenizer(harm_text, return_tensors="pt").to(device)
        safe_inputs = tokenizer(safe_text, return_tensors="pt").to(device)

        with torch.no_grad():
            harm_out = model(**harm_inputs, output_hidden_states=True)
            safe_out = model(**safe_inputs, output_hidden_states=True)

        # Difference of final token activations in the residual stream (last layer hidden states)
        harm_act = harm_out.hidden_states[-1][:, -1, :]
        safe_act = safe_out.hidden_states[-1][:, -1, :]

        diff = harm_act - safe_act
        norm = torch.norm(diff, dim=-1, keepdim=True) + 1e-8
        directions.append(diff / norm)
        print(f"    Pair {idx + 1}/{len(pairs)} processed.")

    # Compute mean direction across all pairs and normalize
    stacked = torch.stack(directions)
    mean_dir = stacked.mean(dim=0)
    final_direction = mean_dir / (torch.norm(mean_dir, dim=-1, keepdim=True) + 1e-8)
    return final_direction

def orthogonalize_matrix(weight, direction):
    import torch
    # Orthogonal projection: W' = W - (v v^T) W
    v = direction.to(dtype=weight.dtype, device=weight.device)
    # v is (1, D), projection operator is (D, D)
    v_norm = v / (torch.norm(v) + 1e-8)
    proj = torch.matmul(v_norm.T, v_norm)
    return weight - torch.matmul(proj, weight)

def main():
    parser = argparse.ArgumentParser(description="Abliterate refusal direction from transformer model weights.")
    parser.add_argument("--model", "-m", type=str, required=True, help="Hugging Face model ID or path (e.g., meta-llama/Llama-3.1-8B-Instruct)")
    parser.add_argument("--output", "-o", type=str, required=True, help="Destination directory for abliterated weights")
    parser.add_argument("--device", type=str, default="auto", help="Compute device ('cuda', 'mps', 'cpu', or 'auto')")
    parser.add_argument("--layers", type=str, default="o_proj,down_proj", help="Comma-separated projection targets to modify")

    args = parser.parse_args()
    check_dependencies()

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    if args.device == "auto":
        device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
    else:
        device = args.device

    print(f"[*] Loading model {args.model} on {device}...")
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        torch_dtype=torch.float16 if device in ("cuda", "mps") else torch.float32,
        device_map="auto" if device == "cuda" else None,
    )
    if device != "cuda":
        model.to(device)

    # 1. Compute the refusal direction vector
    refusal_vec = compute_refusal_direction(model, tokenizer, DEFAULT_CONTRAST_PAIRS, device=device)

    # 2. Orthogonalize the specified projection matrices
    target_names = [name.strip() for name in args.layers.split(",")]
    print(f"[*] Orthogonalizing target layers: {target_names}")

    modified_count = 0
    for name, module in model.named_modules():
        if any(target in name for target in target_names):
            if hasattr(module, "weight") and module.weight is not None:
                with torch.no_grad():
                    module.weight.data = orthogonalize_matrix(module.weight.data, refusal_vec)
                    modified_count += 1

    print(f"[*] Successfully orthogonalized {modified_count} weight tensors.")

    # 3. Save weights and tokenizer
    print(f"[*] Exporting abliterated model to {args.output}...")
    model.save_pretrained(args.output)
    tokenizer.save_pretrained(args.output)
    print(f"[✓] Done! Model is saved at {args.output}")
    print(f"    You can now convert it to GGUF using llama.cpp's convert_hf_to_gguf.py or serve directly via vLLM.")

if __name__ == "__main__":
    main()
