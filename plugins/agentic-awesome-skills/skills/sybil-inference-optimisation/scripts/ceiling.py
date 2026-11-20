#!/usr/bin/env python3
"""Theoretical ceilings for decode / prefill / KV from a small JSON of measured hardware and model sizes.

  python3 ceiling.py model.json

Example model.json (Ornith-1.5-35B-A3B EXL3 4bpw on an Arc B390 iGPU; sizes in GB from the checkpoint):
{
  "bandwidth_gbs": 115, "peak_tflops": 36, "mfu": 0.5,
  "dense_gb": 0.758, "experts_gb": 16.26, "top_k": 8, "n_experts": 256, "lm_head_gb": 0.382,
  "active_params_b": 2.43, "attn_layers": 10, "attn_heads": 16, "head_dim": 256,
  "kv_bytes_per_token": 10240, "draft_layer_gb": 0.03, "draft_head_gb": 0.05,
  "spec": [{"drafts": 0, "accept": 1.0}, {"drafts": 1, "accept": 1.74}, {"drafts": 2, "accept": 2.5}],
  "contexts": [4096, 32768, 131072, 262144], "concurrency": [1, 4]
}
Dense models: set experts_gb to 0. draft_head_gb is the draft LM head as read per draft step (prune it!).
"""
import json, sys


def decode_ceiling(m, drafts, accept, ctx=0, n=1):
    union = 1 - (1 - m["top_k"] / m["n_experts"]) ** ((drafts + 1) * n) if m.get("experts_gb") else 0
    verify = m["dense_gb"] + m["lm_head_gb"] + m.get("experts_gb", 0) * union
    verify += n * m.get("kv_bytes_per_token", 0) * ctx / 1e9 * (drafts + 1 if m.get("kv_per_verify_row") else 1)
    draft = drafts * n * (m.get("draft_layer_gb", 0) + m.get("draft_head_gb", m["lm_head_gb"]))
    return m["bandwidth_gbs"] * accept * n / (verify + draft)  # aggregate tok/s


def prefill_ceiling(m, L):
    linear = 2 * m["active_params_b"] * 1e9
    attn = 4 * m.get("attn_layers", 0) * m.get("attn_heads", 0) * m.get("head_dim", 0) * (L / 2)
    return m["mfu"] * m["peak_tflops"] * 1e12 / (linear + attn + m.get("extra_flops_per_token", 0))


def main(path):
    m = json.load(open(path))
    print(f"bandwidth {m['bandwidth_gbs']} GB/s, peak {m['peak_tflops']} TFLOPS, MFU {m['mfu']}")
    for n in m.get("concurrency", [1]):
        print(f"\nDecode ceiling, concurrency {n} (aggregate tok/s):")
        print("  drafts accept" + "".join(f"{c // 1024:>8}K" for c in m.get("contexts", [0])))
        for s in m.get("spec", [{"drafts": 0, "accept": 1.0}]):
            row = "".join(f"{decode_ceiling(m, s['drafts'], s['accept'], c, n):9.0f}" for c in m.get("contexts", [0]))
            print(f"  {s['drafts']:>6} {s['accept']:>6}{row}")
    print("\nPrefill ceiling (tok/s, practical):")
    for L in m.get("contexts", [4096]):
        print(f"  {L // 1024:>4}K {prefill_ceiling(m, L):8.0f}")
    if m.get("kv_bytes_per_token"):
        print("\nKV: {:.2f} GB per 256K-token stream".format(m["kv_bytes_per_token"] * 262144 / 1e9))


if __name__ == "__main__":
    main(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
