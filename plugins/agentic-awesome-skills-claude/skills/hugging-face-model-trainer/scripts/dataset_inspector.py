#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Advisory column inspection using the public Datasets Server API.
It sends the requested dataset/config/split to that service. This is not full
format validation and does not authorize training. Samples are hidden by default.
"""

import argparse
import sys
import json
import urllib.request
import urllib.parse
from typing import List, Dict, Any


def parse_args():
    parser = argparse.ArgumentParser(description="Inspect dataset format for TRL training")
    parser.add_argument("--dataset", type=str, required=True, help="Dataset name")
    parser.add_argument("--split", type=str, default="train", help="Dataset split (default: train)")
    parser.add_argument("--config", type=str, default="default", help="Dataset config name (default: default)")
    parser.add_argument("--preview", type=int, default=150, help="Max chars per field preview")
    parser.add_argument("--samples", type=int, default=5, help="Number of samples to fetch (default: 5)")
    parser.add_argument("--json-output", action="store_true", help="Output as JSON")
    parser.add_argument("--show-samples", action="store_true", help="Explicitly print potentially sensitive samples")
    args = parser.parse_args()
    if not 1 <= args.samples <= 100 or not 0 <= args.preview <= 1000:
        parser.error("samples must be 1..100 and preview 0..1000")
    return args


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api_request(url: str) -> Dict:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.netloc != "datasets-server.huggingface.co":
        raise ValueError("unexpected dataset service")
    try:
        with urllib.request.build_opener(NoRedirect()).open(url, timeout=10) as response:
            raw = response.read(2 * 1024 * 1024 + 1)
            if len(raw) > 2 * 1024 * 1024:
                raise ValueError("dataset response exceeds 2 MiB")
            value = json.loads(raw)
            if not isinstance(value, dict):
                raise ValueError("unexpected dataset response schema")
            return value
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise ValueError("dataset service HTTP failure: " + str(exc.code)) from None
    except urllib.error.URLError:
        raise ValueError("dataset service connection failed") from None


def get_splits(dataset: str) -> Dict:
    return api_request("https://datasets-server.huggingface.co/splits?" +
                       urllib.parse.urlencode({"dataset": dataset}))


def get_rows(dataset: str, config: str, split: str, offset: int = 0, length: int = 5) -> Dict:
    return api_request("https://datasets-server.huggingface.co/rows?" +
                       urllib.parse.urlencode(dict(dataset=dataset, config=config,
                                                   split=split, offset=offset, length=length)))


def find_columns(columns: List[str], patterns: List[str]) -> List[str]:
    """Find columns matching patterns"""
    return [c for c in columns if any(p in c.lower() for p in patterns)]


def check_sft_compatibility(columns: List[str]) -> Dict[str, Any]:
    """Check SFT compatibility"""
    has_messages = "messages" in columns
    has_text = "text" in columns
    has_prompt_completion = "prompt" in columns and "completion" in columns
    
    ready = has_messages or has_text or has_prompt_completion
    
    possible_prompt = find_columns(columns, ["prompt", "instruction", "question", "input"])
    possible_response = find_columns(columns, ["response", "completion", "output", "answer"])
    
    return {
        "ready": ready,
        "reason": "messages" if has_messages else "text" if has_text else "prompt+completion" if has_prompt_completion else None,
        "possible_prompt": possible_prompt[0] if possible_prompt else None,
        "possible_response": possible_response[0] if possible_response else None,
        "has_context": "context" in columns,
    }


def check_dpo_compatibility(columns: List[str]) -> Dict[str, Any]:
    """Check DPO compatibility"""
    has_standard = "prompt" in columns and "chosen" in columns and "rejected" in columns
    
    possible_prompt = find_columns(columns, ["prompt", "instruction", "question", "input"])
    possible_chosen = find_columns(columns, ["chosen", "preferred", "winner"])
    possible_rejected = find_columns(columns, ["rejected", "dispreferred", "loser"])
    
    can_map = bool(possible_prompt and possible_chosen and possible_rejected)
    
    return {
        "ready": has_standard,
        "can_map": can_map,
        "prompt_col": possible_prompt[0] if possible_prompt else None,
        "chosen_col": possible_chosen[0] if possible_chosen else None,
        "rejected_col": possible_rejected[0] if possible_rejected else None,
    }


def check_grpo_compatibility(columns: List[str]) -> Dict[str, Any]:
    """Check GRPO compatibility"""
    has_prompt = "prompt" in columns
    has_no_responses = "chosen" not in columns and "rejected" not in columns
    
    possible_prompt = find_columns(columns, ["prompt", "instruction", "question", "input"])
    
    return {
        "ready": has_prompt and has_no_responses,
        "can_map": bool(possible_prompt) and has_no_responses,
        "prompt_col": possible_prompt[0] if possible_prompt else None,
    }


def check_kto_compatibility(columns: List[str]) -> Dict[str, Any]:
    """Check KTO compatibility"""
    return {"ready": "prompt" in columns and "completion" in columns and "label" in columns}


def generate_mapping_code(method: str, info: Dict[str, Any]) -> str:
    """Generate inert mapping text; untrusted column names are Python literals."""
    if info.get("ready"):
        return None
    if method == "SFT":
        prompt, response = info.get("possible_prompt"), info.get("possible_response")
        if not prompt:
            return None
        expression = "example[" + repr(prompt) + "]"
        if response:
            expression += " + '\\n\\n' + example[" + repr(response) + "]"
        mapping = "{'text': " + expression + "}"
    elif method == "DPO" and info.get("can_map"):
        mapping = "{" + ", ".join(repr(key) + ": example[" + repr(info[key + "_col"]) + "]"
                                 for key in ("prompt", "chosen", "rejected")) + "}"
    elif method == "GRPO" and info.get("can_map"):
        mapping = "{'prompt': example[" + repr(info["prompt_col"]) + "]}"
    else:
        return None
    return ("# Review value types, chat template and reward requirements before use.\n"
            "def format_example(example):\n    return " + mapping +
            "\n\ndataset = dataset.map(format_example, remove_columns=dataset.column_names)")


def format_value_preview(value: Any, max_chars: int) -> str:
    """Format value for preview"""
    if value is None:
        return "None"
    elif isinstance(value, str):
        return value[:max_chars] + ("..." if len(value) > max_chars else "")
    elif isinstance(value, list):
        if len(value) > 0 and isinstance(value[0], dict):
            return f"[{len(value)} items] Keys: {list(value[0].keys())}"
        preview = str(value)
        return preview[:max_chars] + ("..." if len(preview) > max_chars else "")
    else:
        preview = str(value)
        return preview[:max_chars] + ("..." if len(preview) > max_chars else "")


def main():
    args = parse_args()
    
    print("Fetching advisory column information...", file=sys.stderr)
    
    try:
        # Get splits info
        splits_data = get_splits(args.dataset)
        if not splits_data or "splits" not in splits_data:
            print(f"ERROR: Could not fetch splits for dataset '{args.dataset}'")
            print(f"       Dataset may not exist or is not accessible via Datasets Server API")
            sys.exit(1)
        
        # Find the right config
        available_configs = set()
        split_found = False
        config_to_use = args.config
        
        for split_info in splits_data["splits"]:
            available_configs.add(split_info["config"])
            if split_info["config"] == args.config and split_info["split"] == args.split:
                split_found = True
        
        if not split_found:
            raise ValueError("requested config/split not found; specify an available pair explicitly")

        # Get rows
        rows_data = get_rows(args.dataset, config_to_use, args.split, offset=0, length=args.samples)
        
        if not rows_data or "rows" not in rows_data:
            print(f"ERROR: Could not fetch rows for dataset '{args.dataset}'")
            print(f"       Split '{args.split}' may not exist")
            print(f"       Available configs: {', '.join(sorted(available_configs))}")
            sys.exit(1)
        
        rows = rows_data["rows"]
        if not rows:
            print(f"ERROR: No rows found in split '{args.split}'")
            sys.exit(1)
        
        # Extract column info from first row
        first_row = rows[0]["row"]
        columns = list(first_row.keys())
        features = rows_data.get("features", [])
        
        # Get total count if available
        total_examples = "Unknown"
        for split_info in splits_data["splits"]:
            if split_info["config"] == config_to_use and split_info["split"] == args.split:
                total_examples = f"{split_info.get('num_examples', 'Unknown'):,}" if isinstance(split_info.get('num_examples'), int) else "Unknown"
                break
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
    
    # Run compatibility checks
    sft_info = check_sft_compatibility(columns)
    dpo_info = check_dpo_compatibility(columns)
    grpo_info = check_grpo_compatibility(columns)
    kto_info = check_kto_compatibility(columns)
    
    for info in (sft_info, dpo_info, grpo_info, kto_info):
        info["validated"] = False
        info["scope"] = "column-name candidates only; validate actual values and full training subset"

    # Determine recommended methods
    recommended = []
    if sft_info["ready"]:
        recommended.append("SFT")
    elif sft_info["possible_prompt"]:
        recommended.append("SFT (needs mapping)")
    
    if dpo_info["ready"]:
        recommended.append("DPO")
    elif dpo_info["can_map"]:
        recommended.append("DPO (needs mapping)")
    
    if grpo_info["ready"]:
        recommended.append("GRPO")
    elif grpo_info["can_map"]:
        recommended.append("GRPO (needs mapping)")
    
    if kto_info["ready"]:
        recommended.append("KTO")
    
    # JSON output mode
    if args.json_output:
        result = {
            "dataset": args.dataset,
            "config": config_to_use,
            "split": args.split,
            "total_examples": total_examples,
            "columns": columns,
            "features": [{"name": f["name"], "type": f["type"]} for f in features] if features else [],
            "compatibility": {
                "SFT": sft_info,
                "DPO": dpo_info,
                "GRPO": grpo_info,
                "KTO": kto_info,
            },
            "recommended_methods": recommended,
        }
        print(json.dumps(result, indent=2))
        sys.exit(0)
    
    # Human-readable output optimized for LLM parsing
    print("=" * 80)
    print(f"DATASET INSPECTION RESULTS")
    print("=" * 80)
    
    print(f"\nDataset: {args.dataset}")
    print(f"Config: {config_to_use}")
    print(f"Split: {args.split}")
    print(f"Total examples: {total_examples}")
    print(f"Samples fetched: {len(rows)}")
    
    print(f"\n{'COLUMNS':-<80}")
    if features:
        for feature in features:
            print(f"  {feature['name']}: {feature['type']}")
    else:
        for col in columns:
            print(f"  {col}: (type info not available)")
    
    print(f"\n{'EXAMPLE DATA':-<80}")
    if args.show_samples:
        for col in columns:
            print(json.dumps(col) + ": " + json.dumps(format_value_preview(first_row.get(col), args.preview)))
    else:
        print("Samples hidden; use --show-samples only for approved non-sensitive data.")

    print(f"\n{'TRAINING METHOD COMPATIBILITY':-<80}")
    
    # SFT
    print(f"\n[SFT] {'COLUMN CANDIDATE' if sft_info['ready'] else '✗ NEEDS MAPPING'}")
    if sft_info["ready"]:
        print(f"  Reason: Dataset has '{sft_info['reason']}' field")
        print(f"  Action: Validate actual row values and model compatibility before using SFTTrainer")
    elif sft_info["possible_prompt"]:
        print(f"  Detected: prompt='{sft_info['possible_prompt']}' response='{sft_info['possible_response']}'")
        print(f"  Action: Apply mapping code (see below)")
    else:
        print(f"  Status: Cannot determine mapping - manual inspection needed")
    
    # DPO
    print(f"\n[DPO] {'COLUMN CANDIDATE' if dpo_info['ready'] else '✗ NEEDS MAPPING' if dpo_info['can_map'] else '✗ INCOMPATIBLE'}")
    if dpo_info["ready"]:
        print(f"  Reason: Dataset has 'prompt', 'chosen', 'rejected' fields")
        print(f"  Action: Validate actual row values and model compatibility before using DPOTrainer")
    elif dpo_info["can_map"]:
        print(f"  Detected: prompt='{dpo_info['prompt_col']}' chosen='{dpo_info['chosen_col']}' rejected='{dpo_info['rejected_col']}'")
        print(f"  Action: Apply mapping code (see below)")
    else:
        print(f"  Status: Missing required fields (prompt + chosen + rejected)")
    
    # GRPO
    print(f"\n[GRPO] {'COLUMN CANDIDATE' if grpo_info['ready'] else '✗ NEEDS MAPPING' if grpo_info['can_map'] else '✗ INCOMPATIBLE'}")
    if grpo_info["ready"]:
        print(f"  Reason: Dataset has 'prompt' field")
        print(f"  Action: Validate actual row values and model compatibility before using GRPOTrainer")
    elif grpo_info["can_map"]:
        print(f"  Detected: prompt='{grpo_info['prompt_col']}'")
        print(f"  Action: Apply mapping code (see below)")
    else:
        print(f"  Status: Missing prompt field")
    
    # KTO
    print(f"\n[KTO] {'COLUMN CANDIDATE' if kto_info['ready'] else '✗ INCOMPATIBLE'}")
    if kto_info["ready"]:
        print(f"  Reason: Dataset has 'prompt', 'completion', 'label' fields")
        print(f"  Action: Validate actual row values and model compatibility before using KTOTrainer")
    else:
        print(f"  Status: Missing required fields (prompt + completion + label)")
    
    # Mapping code
    print(f"\n{'MAPPING CODE (if needed)':-<80}")
    
    mapping_needed = False
    
    sft_mapping = generate_mapping_code("SFT", sft_info)
    if sft_mapping:
        print(f"\n# For SFT Training:")
        print(sft_mapping)
        mapping_needed = True
    
    dpo_mapping = generate_mapping_code("DPO", dpo_info)
    if dpo_mapping:
        print(f"\n# For DPO Training:")
        print(dpo_mapping)
        mapping_needed = True
    
    grpo_mapping = generate_mapping_code("GRPO", grpo_info)
    if grpo_mapping:
        print(f"\n# For GRPO Training:")
        print(grpo_mapping)
        mapping_needed = True
    
    if not mapping_needed:
        print("\nColumn names match; this does not certify training readiness.")
    
    print(f"\n{'SUMMARY':-<80}")
    print(f"Recommended training methods: {', '.join(recommended) if recommended else 'None (dataset needs formatting)'}")
    print(f"\nNote: Used Datasets Server API (sample metadata/rows only; network request, not full dataset validation)")
    
    print("\n" + "=" * 80)
    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)