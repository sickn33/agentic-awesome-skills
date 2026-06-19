#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Estimate training time and cost for vision model training jobs on Hugging Face Jobs.

Usage:
    uv run estimate_cost.py --model ustc-community/dfine-small-coco --dataset cppe-5 --hardware t4-small
    uv run estimate_cost.py --model PekingU/rtdetr_v2_r50vd --dataset-size 5000 --hardware t4-small --epochs 30
    uv run estimate_cost.py --model google/vit-base-patch16-224-in21k --dataset ethz/food101 --hardware t4-small --epochs 3
"""

import argparse

HARDWARE_COSTS = {
    "t4-small": 0.40,
    "t4-medium": 0.60,
    "l4x1": 0.80,
    "l4x4": 3.80,
    "a10g-small": 1.00,
    "a10g-large": 1.50,
    "a10g-largex2": 3.00,
    "a10g-largex4": 5.00,
    "l40sx1": 1.80,
    "l40sx4": 8.30,
    "a100-large": 2.50,
    "a100x4": 10.00,
}

# Vision model sizes in millions of parameters
MODEL_PARAMS_M = {
    # Object detection
    "dfine-small": 10.4,
    "dfine-large": 31.4,
    "dfine-xlarge": 63.5,
    "rtdetr_v2_r18vd": 20.2,
    "rtdetr_v2_r50vd": 43.0,
    "rtdetr_v2_r101vd": 76.0,
    "detr-resnet-50": 41.3,
    "detr-resnet-101": 60.2,
    "yolos-small": 30.7,
    "yolos-tiny": 6.5,
    # Image classification
    "mobilenetv3_small": 2.5,
    "mobilevit_s": 5.6,
    "resnet50": 25.6,
    "vit_base_patch16": 86.6,
    # SAM / SAM2 segmentation
    "sam-vit-base": 93.7,
    "sam-vit-large": 312.3,
    "sam-vit-huge": 641.1,
    "sam2.1-hiera-tiny": 38.9,
    "sam2.1-hiera-small": 46.0,
    "sam2.1-hiera-base-plus": 80.8,
    "sam2.1-hiera-large": 224.4,
}

KNOWN_DATASETS = {
    # Object detection
    "cppe-5": 1000,
    "merve/license-plate": 6180,
    # Image classification
    "ethz/food101": 75750,
    # SAM segmentation
    "merve/MicroMat-mini": 240,
}


def extract_model_params(model_name: str) -> float:
    """Extract model size in millions of parameters from the model name."""
    name_lower = model_name.lower()
    for key, params in MODEL_PARAMS_M.items():
        if key.lower() in name_lower:
            return params
    return 30.0  # reasonable default for vision models


def estimate_training_time(model_params_m: float, dataset_size: int, epochs: int,
                           image_size: int, batch_size: int, hardware: str) -> float:
    """Estimate training time in hours for vision model training."""
    # Steps per epoch
    steps_per_epoch = dataset_size / batch_size
    # empirical calibration values
    base_secs_per_step = 0.8
    model_factor = (model_params_m / 30.0) ** 0.6
    image_factor = (image_size / 640.0) ** 2


    batch_factor = (batch_size / 8.0) ** 0.7

    secs_per_step = base_secs_per_step * model_factor * image_factor * batch_factor

    hardware_multipliers = {
        "t4-small": 2.0,
        "t4-medium": 2.0,
        "l4x1": 1.2,
        "l4x4": 0.5,
        "a10g-small": 1.0,
        "a10g-large": 1.0,
        "a10g-largex2": 0.6,
        "a10g-largex4": 0.4,
        "l40sx1": 0.7,
        "l40sx4": 0.25,
        "a100-large": 0.5,
        "a100x4": 0.2,
    }

    multiplier = hardware_multipliers.get(hardware, 1.0)
    total_steps = steps_per_epoch * epochs
    total_secs = total_steps * secs_per_step * multiplier

    # Add overhead: model loading (~2 min), eval per epoch (~10% of training), Hub push (~3 min)
    eval_overhead = total_secs * 0.10
    fixed_overhead = 5 * 60  # 5 minutes
    total_secs += eval_overhead + fixed_overhead

    return total_secs / 3600


def parse_args():
    parser = argparse.ArgumentParser(description="Estimate training cost for vision model training jobs")
    parser.add_argument("--model", required=True,
                        help="Model name (e.g., 'ustc-community/dfine-small-coco' or 'detr-resnet-50')")
    parser.add_argument("--dataset", default=None, help="Dataset name (for known size lookup)")
    parser.add_argument("--hardware", required=True, choices=HARDWARE_COSTS.keys(), help="Hardware flavor")
    parser.add_argument("--dataset-size", type=int, default=None,
                        help="Number of training images (overrides dataset lookup)")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs (default: 30)")
    parser.add_argument("--image-size", type=int, default=640, help="Image square size in pixels (default: 640)")
    parser.add_argument("--batch-size", type=int, default=8, help="Per-device batch size (default: 8)")
    return parser.parse_args()


def main():
    args = parse_args()

    model_params = extract_model_params(args.model)
    print(f"Model: {args.model} (~{model_params:.1f}M parameters)")

    if args.dataset_size:
        dataset_size = args.dataset_size
    elif args.dataset and args.dataset in KNOWN_DATASETS:
        dataset_size = KNOWN_DATASETS[args.dataset]
    elif args.dataset:
        print(f"Unknown dataset '{args.dataset}', defaulting to 1000 images.")
        print(f"Use --dataset-size to specify the exact count.")
        dataset_size = 1000
    else:
        dataset_size = 1000

    print(f"Dataset: {args.dataset or 'custom'} (~{dataset_size} images)")
    print(f"Epochs: {args.epochs}")
    print(f"Image size: {args.image_size}px")
    print(f"Batch size: {args.batch_size}")
    print(f"Hardware: {args.hardware} (${HARDWARE_COSTS[args.hardware]:.2f}/hr)")
    print()

    estimated_hours = estimate_training_time(
        model_params, dataset_size, args.epochs, args.image_size, args.batch_size, args.hardware
    )
    estimated_cost = estimated_hours * HARDWARE_COSTS[args.hardware]
    recommended_timeout = estimated_hours * 1.3  # 30% buffer

    print(f"Estimated training time: {estimated_hours:.1f} hours")
    print(f"Estimated cost: ${estimated_cost:.2f}")
    print(f"Recommended timeout: {recommended_timeout:.1f}h (with 30% buffer)")
    print()

    if estimated_hours > 6:
        print("Warning: Long training time. Consider:")
        print("   - Reducing epochs or image size")
        print("   - Using --max_train_samples for a test run first")
        print("   - Upgrading hardware")
        print()

    if model_params > 50 and args.hardware in ("t4-small", "t4-medium"):
        print("Warning: Large model on T4. If you hit OOM:")
        print("   - Reduce batch size (try 4, then 2)")
        print("   - Reduce image size (try 480)")
        print("   - Upgrade to l4x1 or a10g-small")
        print()

    timeout_str = f"{recommended_timeout:.0f}h"
    timeout_secs = int(recommended_timeout * 3600)
    print(f"Example job configuration (MCP tool):")
    print(f"""
hf_jobs("uv", {{
    "script": "scripts/object_detection_training.py",
    "script_args": [
        "--model_name_or_path", "{args.model}",
        "--dataset_name", "{args.dataset or 'your-dataset'}",
        "--image_square_size", "{args.image_size}",
        "--num_train_epochs", "{args.epochs}",
        "--per_device_train_batch_size", "{args.batch_size}",
        "--push_to_hub", "--do_train", "--do_eval"
    ],
    "flavor": "{args.hardware}",
    "timeout": "{timeout_str}",
    "secrets": {{"HF_TOKEN": "$HF_TOKEN"}}
}})
""")
    print(f"Example job configuration (Python API):")
    print(f"""
api.run_uv_job(
    script="scripts/object_detection_training.py",
    script_args=[...],
    flavor="{args.hardware}",
    timeout={timeout_secs},
    secrets={{"HF_TOKEN": get_token()}},
)
""")


if __name__ == "__main__":
    main()
