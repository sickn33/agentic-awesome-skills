# /// script
# dependencies = [
#     "transformers>=5.2.0",
#     "accelerate>=1.1.0",
#     "datasets>=4.0",
#     "torchvision",
#     "monai",
#     "trackio",
#     "huggingface_hub",
# ]
# ///

"""Fine-tune SAM or SAM2 for segmentation using bounding-box or point prompts with the HF Trainer API."""

import json
import logging
import math
import os
import sys
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F
from datasets import load_dataset
from torch.utils.data import Dataset

import monai
import trackio

import transformers
from transformers import (
    HfArgumentParser,
    Trainer,
    TrainingArguments,
)
from transformers.utils import check_min_version

logger = logging.getLogger(__name__)

check_min_version("4.57.0.dev0")


# ---------------------------------------------------------------------------
# Dataset wrapper
# ---------------------------------------------------------------------------

class SAMSegmentationDataset(Dataset):
    """Wraps a HF dataset into the format expected by SAM/SAM2 processors.

    Each sample must contain an image, a binary mask, and a prompt (bbox or
    point).  Prompts are read from a JSON-encoded ``prompt`` column or from
    dedicated ``bbox`` / ``point`` columns.
    """

    def __init__(self, dataset, processor, prompt_type: str,
                 image_col: str, mask_col: str, prompt_col: str | None,
                 bbox_col: str | None, point_col: str | None):
        self.dataset = dataset
        self.processor = processor
        self.prompt_type = prompt_type
        self.image_col = image_col
        self.mask_col = mask_col
        self.prompt_col = prompt_col
        self.bbox_col = bbox_col
        self.point_col = point_col

    def __len__(self):
        return len(self.dataset)

    def _extract_prompt(self, item):
        if self.prompt_col and self.prompt_col in item:
            raw = item[self.prompt_col]
            parsed = json.loads(raw) if isinstance(raw, str) else raw
            if self.prompt_type == "bbox":
                return parsed.get("bbox") or parsed.get("box")
            return parsed.get("point") or parsed.get("points")

        if self.prompt_type == "bbox" and self.bbox_col:
            return item[self.bbox_col]
        if self.prompt_type == "point" and self.point_col:
            return item[self.point_col]
        raise ValueError("Could not extract prompt from sample")

    def __getitem__(self, idx):
        item = self.dataset[idx]
        image = item[self.image_col]
        prompt = self._extract_prompt(item)

        if self.prompt_type == "bbox":
            inputs = self.processor(image, input_boxes=[[prompt]], return_tensors="pt")
        else:
            if isinstance(prompt[0], (int, float)):
                prompt = [prompt]
            inputs = self.processor(image, input_points=[[prompt]], return_tensors="pt")

        mask = np.array(item[self.mask_col])
        if mask.ndim == 3:
            mask = mask[:, :, 0]
        inputs["labels"] = (mask > 0).astype(np.float32)
        inputs["original_image_size"] = torch.tensor(image.size[::-1])
        return inputs


def collate_fn(batch):
    pixel_values = torch.cat([item["pixel_values"] for item in batch], dim=0)
    original_sizes = torch.stack([item["original_sizes"] for item in batch])
    original_image_size = torch.stack([item["original_image_size"] for item in batch])

    has_boxes = "input_boxes" in batch[0]
    has_points = "input_points" in batch[0]

    labels = torch.cat(
        [
            F.interpolate(
                torch.as_tensor(x["labels"]).unsqueeze(0).unsqueeze(0).float(),
                size=(256, 256),
                mode="nearest",
            )
            for x in batch
        ],
        dim=0,
    ).long()

    result = {
        "pixel_values": pixel_values,
        "original_sizes": original_sizes,
        "labels": labels,
        "original_image_size": original_image_size,
        "multimask_output": False,
    }

    if has_boxes:
        result["input_boxes"] = torch.cat([item["input_boxes"] for item in batch], dim=0)
    if has_points:
        result["input_points"] = torch.cat([item["input_points"] for item in batch], dim=0)
        if "input_labels" in batch[0]:
            result["input_labels"] = torch.cat([item["input_labels"] for item in batch], dim=0)

    return result


# ---------------------------------------------------------------------------
# Custom loss (SAM/SAM2 don't compute loss in forward())
# ---------------------------------------------------------------------------

seg_loss = monai.losses.DiceCELoss(sigmoid=True, squared_pred=True, reduction="mean")


def compute_loss(outputs, labels, num_items_in_batch=None):
    predicted_masks = outputs.pred_masks.squeeze(1)
    return seg_loss(predicted_masks, labels.float())


# ---------------------------------------------------------------------------
# CLI arguments
# ---------------------------------------------------------------------------

@dataclass
class DataTrainingArguments:
    dataset_name: str = field(
        default="merve/MicroMat-mini",
        metadata={"help": "Hub dataset ID."},
    )
    dataset_config_name: str | None = field(
        default=None,
        metadata={"help": "Dataset config name."},
    )
    train_val_split: float | None = field(
        default=0.1,
        metadata={"help": "Fraction to split off for validation (used when no validation split exists)."},
    )
    max_train_samples: int | None = field(
        default=None,
        metadata={"help": "Truncate training set (for quick tests)."},
    )
    max_eval_samples: int | None = field(
        default=None,
        metadata={"help": "Truncate evaluation set."},
    )
    image_column_name: str = field(
        default="image",
        metadata={"help": "Column containing PIL images."},
    )
    mask_column_name: str = field(
        default="mask",
        metadata={"help": "Column containing ground-truth binary masks."},
    )
    prompt_column_name: str | None = field(
        default="prompt",
        metadata={"help": "Column with JSON-encoded prompt (bbox/point). Set to '' to disable."},
    )
    bbox_column_name: str | None = field(
        default=None,
        metadata={"help": "Column with bbox prompt ([x0,y0,x1,y1]). Used when prompt_column_name is unset."},
    )
    point_column_name: str | None = field(
        default=None,
        metadata={"help": "Column with point prompt ([x,y] or [[x,y],...]). Used when prompt_column_name is unset."},
    )
    prompt_type: str = field(
        default="bbox",
        metadata={"help": "Prompt type: 'bbox' or 'point'."},
    )


@dataclass
class ModelArguments:
    model_name_or_path: str = field(
        default="facebook/sam2.1-hiera-small",
        metadata={"help": "Pretrained SAM/SAM2 model identifier."},
    )
    cache_dir: str | None = field(default=None, metadata={"help": "Cache directory."})
    model_revision: str = field(default="main", metadata={"help": "Model revision."})
    token: str | None = field(default=None, metadata={"help": "Auth token."})
    trust_remote_code: bool = field(default=False, metadata={"help": "Trust remote code."})
    freeze_vision_encoder: bool = field(
        default=True,
        metadata={"help": "Freeze vision encoder weights."},
    )
    freeze_prompt_encoder: bool = field(
        default=True,
        metadata={"help": "Freeze prompt encoder weights."},
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = HfArgumentParser((ModelArguments, DataTrainingArguments, TrainingArguments))
    parser.set_defaults(per_device_train_batch_size=4, num_train_epochs=30)
    if len(sys.argv) == 2 and sys.argv[1].endswith(".json"):
        model_args, data_args, training_args = parser.parse_json_file(
            json_file=os.path.abspath(sys.argv[1])
        )
    else:
        model_args, data_args, training_args = parser.parse_args_into_dataclasses()

    from huggingface_hub import login
    hf_token = os.environ.get("HF_TOKEN") or os.environ.get("hfjob")
    if hf_token:
        login(token=hf_token)
        training_args.hub_token = hf_token
        logger.info("Logged in to Hugging Face Hub")
    elif training_args.push_to_hub:
        logger.warning("HF_TOKEN not found in environment. Hub push will likely fail.")

    trackio.init(project=training_args.output_dir, name=training_args.run_name)

    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%m/%d/%Y %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    if training_args.should_log:
        transformers.utils.logging.set_verbosity_info()

    log_level = training_args.get_process_log_level()
    logger.setLevel(log_level)
    transformers.utils.logging.set_verbosity(log_level)
    transformers.utils.logging.enable_default_handler()
    transformers.utils.logging.enable_explicit_format()

    logger.info(f"Training/evaluation parameters {training_args}")

    # ---- Load dataset ----
    dataset = load_dataset(
        data_args.dataset_name,
        data_args.dataset_config_name,
        cache_dir=model_args.cache_dir,
        trust_remote_code=model_args.trust_remote_code,
    )

    if "train" not in dataset:
        if len(dataset.keys()) == 1:
            only_split = list(dataset.keys())[0]
            dataset[only_split] = dataset[only_split].shuffle(seed=training_args.seed)
            dataset = dataset[only_split].train_test_split(test_size=data_args.train_val_split or 0.1)
            dataset = {"train": dataset["train"], "validation": dataset["test"]}
        else:
            raise ValueError(f"No 'train' split found. Available: {list(dataset.keys())}")
    elif "validation" not in dataset and "test" not in dataset:
        dataset["train"] = dataset["train"].shuffle(seed=training_args.seed)
        split = dataset["train"].train_test_split(
            test_size=data_args.train_val_split or 0.1, seed=training_args.seed
        )
        dataset["train"] = split["train"]
        dataset["validation"] = split["test"]

    if data_args.max_train_samples is not None:
        n = min(data_args.max_train_samples, len(dataset["train"]))
        dataset["train"] = dataset["train"].select(range(n))
        logger.info(f"Truncated training set to {n} samples")
    eval_key = "validation" if "validation" in dataset else "test"
    if data_args.max_eval_samples is not None and eval_key in dataset:
        n = min(data_args.max_eval_samples, len(dataset[eval_key]))
        dataset[eval_key] = dataset[eval_key].select(range(n))
        logger.info(f"Truncated eval set to {n} samples")

    # ---- Detect model family (SAM vs SAM2) and load processor/model ----
    model_id = model_args.model_name_or_path.lower()
    is_sam2 = "sam2" in model_id

    if is_sam2:
        from transformers import Sam2Processor, Sam2Model
        processor = Sam2Processor.from_pretrained(model_args.model_name_or_path)
        model = Sam2Model.from_pretrained(model_args.model_name_or_path)
    else:
        from transformers import SamProcessor, SamModel
        processor = SamProcessor.from_pretrained(model_args.model_name_or_path)
        model = SamModel.from_pretrained(model_args.model_name_or_path)

    if model_args.freeze_vision_encoder:
        for name, param in model.named_parameters():
            if name.startswith("vision_encoder"):
                param.requires_grad_(False)
    if model_args.freeze_prompt_encoder:
        for name, param in model.named_parameters():
            if name.startswith("prompt_encoder"):
                param.requires_grad_(False)

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    logger.info(f"Trainable params: {trainable:,} / {total:,} ({100 * trainable / total:.1f}%)")

    # ---- Build datasets ----
    prompt_col = data_args.prompt_column_name if data_args.prompt_column_name else None
    ds_kwargs = dict(
        processor=processor,
        prompt_type=data_args.prompt_type,
        image_col=data_args.image_column_name,
        mask_col=data_args.mask_column_name,
        prompt_col=prompt_col,
        bbox_col=data_args.bbox_column_name,
        point_col=data_args.point_column_name,
    )

    train_dataset = SAMSegmentationDataset(dataset=dataset["train"], **ds_kwargs)
    eval_dataset = None
    if eval_key in dataset:
        eval_dataset = SAMSegmentationDataset(dataset=dataset[eval_key], **ds_kwargs)

    # ---- Train ----
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset if training_args.do_train else None,
        eval_dataset=eval_dataset if training_args.do_eval else None,
        data_collator=collate_fn,
        compute_loss_func=compute_loss,
    )

    if training_args.do_train:
        train_result = trainer.train(resume_from_checkpoint=training_args.resume_from_checkpoint)
        trainer.save_model()
        trainer.log_metrics("train", train_result.metrics)
        trainer.save_metrics("train", train_result.metrics)
        trainer.save_state()

    if training_args.do_eval and eval_dataset is not None:
        metrics = trainer.evaluate()
        trainer.log_metrics("eval", metrics)
        trainer.save_metrics("eval", metrics)

    trackio.finish()

    kwargs = {
        "finetuned_from": model_args.model_name_or_path,
        "dataset": data_args.dataset_name,
        "tags": ["image-segmentation", "vision", "sam"],
    }
    if training_args.push_to_hub:
        trainer.push_to_hub(**kwargs)
    else:
        trainer.create_model_card(**kwargs)


if __name__ == "__main__":
    main()
