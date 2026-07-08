#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Dataset Format Inspector for TRL Training (LLM-Optimized Output)

Inspects Hugging Face datasets to determine TRL training compatibility.
Uses Datasets Server API for instant results - no dataset download needed!

ULTRA-EFFICIENT: Uses HF Datasets Server API - completes in <2 seconds.

Usage with HF Jobs:
    hf_jobs("uv", {
        "script": "https://huggingface.co/datasets/evalstate/trl-helpers/raw/main/dataset_inspector.py",
        "script_args": ["--dataset", "your/dataset", "--split", "train"]
    })
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
    return parser.parse_args()


def api_request(url: str) -> Dict:
    """Make API request to Datasets Server"""
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise Exception(f"API request failed: {e.code} {e.reason}")
    except Exception as e:
        raise Exception(f"API request failed: {str(e)}")


def get_splits(dataset: str) -> Dict:
    """Get available splits for dataset"""
    url = f"https://datasets-server.huggingface.co/splits?dataset={urllib.parse.quote(dataset)}"
    return api_request(url)


def get_rows(dataset: str, config: str, split: str, offset: int = 0, length: int = 5) -> Dict:
    """Get rows from dataset"""
    url = f"https://datasets-server.huggingface.co/rows?dataset={urllib.parse.quote(dataset)}&config={config}&split={split}&offset={offset}&length={length}"
    return api_request(url)


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
    """Generate mapping code for a training method"""
    if method == "SFT":
        if info["ready"]:
            return None
        
        prompt_col = info.get("possible_prompt")
        response_col = info.get("possible_response")
        has_context = info.get("has_context", False)
        
        if not prompt_col:
            return None
        
        if has_context and response_col:
            return f"""def format_for_sft(example):
    text = f"Instruction: {{example['{prompt_col}']}}\n\n"
    if example.get('context'):
        text += f"Context: {{example['context']}}\n\n"
    text += f"Response: {{example['{response_col}']}}"
    return {{'text': text}}

dataset = dataset.map(format_for_sft, remove_columns=dataset.column_names)"""
        elif response_col:
            return f"""def format_for_sft(example):
    return {{'text': f"{{example['{prompt_col}']}}\n\n{{example['{response_col}']}}}}

dataset = dataset.map(format_for_sft, remove_columns=dataset.column_names)"""
        else:
            return f"""def format_for_sft(example):
    return {{'text': example['{prompt_col}']}}

dataset = dataset.map(format_for_sft, remove_columns=dataset.column_names)"""
    
    elif method == "DPO":
        if info["ready"] or not info["can_map"]:
            return None
        
        return f"""def format_for_dpo(example):
    return {{
        'prompt': example['{info['prompt_col']}'],
        'chosen': example['{info['chosen_col']}'],
        'rejected': example['{info['rejected_col']}'],
    }}

dataset = dataset.map(format_for_dpo, remove_columns=dataset.column_names)"""
    
    elif method == "GRPO":
        if info["ready"] or not info["can_map"]:
            return None
        
        return f"""def format_for_grpo(example):
    return {{'prompt': example['{info['prompt_col']}']}}

dataset = dataset.map(format_for_grpo, remove_columns=dataset.column_names)"""
    
    return None


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
    
    print(f"Fetching dataset info via Datasets Server API...")
    
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
        
        # If default config not found, try first available
        if not split_found and available_configs:
            config_to_use = list(available_configs)[0]
            print(f"Config '{args.config}' not found, trying '{config_to_use}'...")
        
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
    example = first_row
    for col in columns:
        value = example.get(col)
        display = format_value_preview(value, args.preview)
        print(f"\n{col}:")
        print(f"  {display}")
    
    print(f"\n{'TRAINING METHOD COMPATIBILITY':-<80}")
    
    # SFT
    print(f"\n[SFT] {'✓ READY' if sft_info['ready'] else '✗ NEEDS MAPPING'}")
    if sft_info["ready"]:
        print(f"  Reason: Dataset has '{sft_info['reason']}' field")
        print(f"  Action: Use directly with SFTTrainer")
    elif sft_info["possible_prompt"]:
        print(f"  Detected: prompt='{sft_info['possible_prompt']}' response='{sft_info['possible_response']}'")
        print(f"  Action: Apply mapping code (see below)")
    else:
        print(f"  Status: Cannot determine mapping - manual inspection needed")
    
    # DPO
    print(f"\n[DPO] {'✓ READY' if dpo_info['ready'] else '✗ NEEDS MAPPING' if dpo_info['can_map'] else '✗ INCOMPATIBLE'}")
    if dpo_info["ready"]:
        print(f"  Reason: Dataset has 'prompt', 'chosen', 'rejected' fields")
        print(f"  Action: Use directly with DPOTrainer")
    elif dpo_info["can_map"]:
        print(f"  Detected: prompt='{dpo_info['prompt_col']}' chosen='{dpo_info['chosen_col']}' rejected='{dpo_info['rejected_col']}'")
        print(f"  Action: Apply mapping code (see below)")
    else:
        print(f"  Status: Missing required fields (prompt + chosen + rejected)")
    
    # GRPO
    print(f"\n[GRPO] {'✓ READY' if grpo_info['ready'] else '✗ NEEDS MAPPING' if grpo_info['can_map'] else '✗ INCOMPATIBLE'}")
    if grpo_info["ready"]:
        print(f"  Reason: Dataset has 'prompt' field")
        print(f"  Action: Use directly with GRPOTrainer")
    elif grpo_info["can_map"]:
        print(f"  Detected: prompt='{grpo_info['prompt_col']}'")
        print(f"  Action: Apply mapping code (see below)")
    else:
        print(f"  Status: Missing prompt field")
    
    # KTO
    print(f"\n[KTO] {'✓ READY' if kto_info['ready'] else '✗ INCOMPATIBLE'}")
    if kto_info["ready"]:
        print(f"  Reason: Dataset has 'prompt', 'completion', 'label' fields")
        print(f"  Action: Use directly with KTOTrainer")
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
        print("\nNo mapping needed - dataset is ready for training!")
    
    print(f"\n{'SUMMARY':-<80}")
    print(f"Recommended training methods: {', '.join(recommended) if recommended else 'None (dataset needs formatting)'}")
    print(f"\nNote: Used Datasets Server API (instant, no download required)")
    
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