#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Estimate training time and cost for TRL jobs.

Usage with uv:
    uv run estimate_cost.py --model <model> --dataset <dataset> --hardware <flavor>
    
Example:
    uv run estimate_cost.py --model Qwen/Qwen2.5-0.5B --dataset trl-lib/Capybara --hardware a10g-large
"""

import argparse

# Hardware costs per hour (approximate)
HARDWARE_COSTS = {
    "t4-small": 0.75,
    "t4-medium": 1.50,
    "l4x1": 2.50,
    "a10g-small": 3.50,
    "a10g-large": 5.00,
    "a10g-largex2": 10.00,
    "a10g-largex4": 20.00,
    "a100-large": 10.00,
}

# Model sizes in billions of parameters
MODEL_SIZES = {
    "0.5B": 0.5,
    "1.5B": 1.5,
    "3B": 3,
    "7B": 7,
    "13B": 13,
}

def estimate_training_time(model_params, dataset_size, epochs, hardware):
    """Estimate training time in hours."""
    # Rough estimates based on empirical observations
    # These are approximations and actual times will vary
    
    base_time_per_1k_examples = 0.1  # hours for 1B model on a10g-large
    
    # Adjust for model size
    time = base_time_per_1k_examples * model_params * (dataset_size / 1000) * epochs
    
    # Adjust for hardware (relative to a10g-large baseline)
    hardware_multipliers = {
        "t4-small": 2.0,
        "t4-medium": 1.5,
        "l4x1": 1.2,
        "a10g-small": 1.3,
        "a10g-large": 1.0,
        "a10g-largex2": 0.6,
        "a10g-largex4": 0.4,
        "a100-large": 0.7,
    }
    
    multiplier = hardware_multipliers.get(hardware, 1.0)
    time *= multiplier
    
    return time

def parse_args():
    parser = argparse.ArgumentParser(description="Estimate training cost for TRL jobs")
    parser.add_argument("--model", required=True, help="Model name or size (e.g., 'Qwen/Qwen2.5-0.5B' or '0.5B')")
    parser.add_argument("--dataset", required=True, help="Dataset name")
    parser.add_argument("--hardware", required=True, choices=HARDWARE_COSTS.keys(), help="Hardware flavor")
    parser.add_argument("--dataset-size", type=int, help="Override dataset size (number of examples)")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    return parser.parse_args()

def extract_model_size(model_name):
    """Extract model size from name or return parsed value."""
    for size_str, size_val in MODEL_SIZES.items():
        if size_str in model_name:
            return size_val
    
    # Try to parse directly
    try:
        if "B" in model_name:
            return float(model_name.replace("B", ""))
    except:
        pass
    
    return 1.0  # Default to 1B if can't determine

def main():
    args = parse_args()
    
    # Extract model parameters
    model_params = extract_model_size(args.model)
    print(f"📊 Model: {args.model} (~{model_params}B parameters)")
    
    # Estimate dataset size (would need to load to get real size)
    if args.dataset_size:
        dataset_size = args.dataset_size
    else:
        # Common dataset sizes (approximations)
        dataset_sizes = {
            "trl-lib/Capybara": 16000,
            "Anthropic/hh-rlhf": 160000,
        }
        dataset_size = dataset_sizes.get(args.dataset, 10000)
    
    print(f"📦 Dataset: {args.dataset} (~{dataset_size} examples)")
    print(f"🔄 Epochs: {args.epochs}")
    print(f"💻 Hardware: {args.hardware}")
    print()
    
    # Estimate training time
    estimated_hours = estimate_training_time(model_params, dataset_size, args.epochs, args.hardware)
    estimated_cost = estimated_hours * HARDWARE_COSTS[args.hardware]
    
    # Recommend timeout with buffer
    recommended_timeout_hours = estimated_hours * 1.3  # 30% buffer
    
    print(f"⏱️  Estimated training time: {estimated_hours:.1f} hours")
    print(f"💰 Estimated cost: ${estimated_cost:.2f}")
    print(f"⏰ Recommended timeout: {recommended_timeout_hours:.1f}h (with 30% buffer)")
    print()
    
    # Warnings and recommendations
    if estimated_hours > 4:
        print("⚠️  Long training time - consider:")
        print("   - Using faster hardware")
        print("   - Reducing epochs")
        print("   - Using a smaller dataset subset for testing")
    
    if model_params >= 7 and args.hardware not in ["a10g-largex2", "a10g-largex4", "a100-large"]:
        print("⚠️  Large model - consider using:")
        print("   - Larger GPU (a100-large)")
        print("   - Multi-GPU setup (a10g-largex2 or a10g-largex4)")
        print("   - LoRA/PEFT for memory efficiency")
    
    print()
    print("📋 Example job configuration:")
    print(f"""
hf_jobs("uv", {{
    "script": "your_training_script.py",
    "flavor": "{args.hardware}",
    "timeout": "{recommended_timeout_hours:.0f}h",
    "secrets": {{"HF_TOKEN": "$HF_TOKEN"}}
}})
""")

if __name__ == "__main__":
    main()