# /// script
# dependencies = [
#     "transformers>=5.2.0",
#     "accelerate>=1.1.0",
#     "albumentations >= 1.4.16",
#     "timm",
#     "datasets>=4.0",
#     "torchmetrics",
#     "pycocotools",
#     "trackio",
#     "huggingface_hub",
# ]
# ///

"""Finetuning any 🤗 Transformers model supported by AutoModelForObjectDetection for object detection leveraging the Trainer API."""

import logging
import math
import os
import sys
from collections.abc import Mapping
from dataclasses import dataclass, field
from functools import partial
from typing import Any

import albumentations as A
import numpy as np
import torch
from datasets import load_dataset
from torchmetrics.detection.mean_ap import MeanAveragePrecision

import trackio

import transformers
from transformers import (
    AutoConfig,
    AutoImageProcessor,
    AutoModelForObjectDetection,
    HfArgumentParser,
    Trainer,
    TrainingArguments,
)
from transformers.image_processing_utils import BatchFeature
from transformers.image_transforms import center_to_corners_format
from transformers.trainer import EvalPrediction
from transformers.utils import check_min_version
from transformers.utils.versions import require_version


logger = logging.getLogger(__name__)

# Will error if the minimal version of Transformers is not installed. Remove at your own risks.
check_min_version("4.57.0.dev0")

require_version("datasets>=2.0.0", "To fix: pip install -r examples/pytorch/object-detection/requirements.txt")


@dataclass
class ModelOutput:
    logits: torch.Tensor
    pred_boxes: torch.Tensor


def format_image_annotations_as_coco(
    image_id: str, categories: list[int], areas: list[float], bboxes: list[tuple[float]]
) -> dict:
    """Format one set of image annotations to the COCO format

    Args:
        image_id (str): image id. e.g. "0001"
        categories (list[int]): list of categories/class labels corresponding to provided bounding boxes
        areas (list[float]): list of corresponding areas to provided bounding boxes
        bboxes (list[tuple[float]]): list of bounding boxes provided in COCO format
            ([center_x, center_y, width, height] in absolute coordinates)

    Returns:
        dict: {
            "image_id": image id,
            "annotations": list of formatted annotations
        }
    """
    annotations = []
    for category, area, bbox in zip(categories, areas, bboxes):
        formatted_annotation = {
            "image_id": image_id,
            "category_id": category,
            "iscrowd": 0,
            "area": area,
            "bbox": list(bbox),
        }
        annotations.append(formatted_annotation)

    return {
        "image_id": image_id,
        "annotations": annotations,
    }


def detect_bbox_format_from_samples(dataset, image_col="image", objects_col="objects", num_samples=50):
    """
    Detect whether bboxes are xyxy (Pascal VOC) or xywh (COCO) by checking
    bbox coordinates against image dimensions. The correct format interpretation
    should keep bboxes within image bounds.
    """
    exceeds_if_xywh = 0
    exceeds_if_xyxy = 0
    total = 0

    for example in dataset.select(range(min(num_samples, len(dataset)))):
        img_w, img_h = example[image_col].size
        for bbox in example[objects_col]["bbox"]:
            if len(bbox) != 4:
                continue
            a, b, c, d = float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])
            total += 1

            # If 3rd < 1st or 4th < 2nd, can't be xyxy (x_max must exceed x_min)
            if c < a or d < b:
                return "xywh"

            # xywh: right/bottom edge = origin + size; exceeding image → wrong format
            if a + c > img_w * 1.05:
                exceeds_if_xywh += 1
            if b + d > img_h * 1.05:
                exceeds_if_xywh += 1
            # xyxy: right/bottom edge = coordinate itself
            if c > img_w * 1.05:
                exceeds_if_xyxy += 1
            if d > img_h * 1.05:
                exceeds_if_xyxy += 1

    if total == 0:
        return "xywh"

    fmt = "xyxy" if exceeds_if_xywh > exceeds_if_xyxy else "xywh"
    logger.info(
        f"Detected bbox format: {fmt} (checked {total} bboxes from {min(num_samples, len(dataset))} images)"
    )
    return fmt


def sanitize_dataset(dataset, bbox_format="xywh", image_col="image", objects_col="objects"):
    """
    Validate bboxes, convert xyxy→xywh if needed, clip to image bounds, and remove
    entries with non-finite values, non-positive dimensions, or degenerate area (<1 px).
    Drops images with no remaining valid bboxes.
    """
    convert_xyxy = bbox_format == "xyxy"

    def _validate(example):
        img_w, img_h = example[image_col].size
        objects = example[objects_col]
        bboxes = objects["bbox"]
        n = len(bboxes)

        valid_indices = []
        converted_bboxes = []

        for i, bbox in enumerate(bboxes):
            if len(bbox) != 4:
                continue
            vals = [float(v) for v in bbox]
            if not all(math.isfinite(v) for v in vals):
                continue

            if convert_xyxy:
                x_min, y_min, x_max, y_max = vals
                w, h = x_max - x_min, y_max - y_min
            else:
                x_min, y_min, w, h = vals

            if w <= 0 or h <= 0:
                continue

            x_min, y_min = max(0.0, x_min), max(0.0, y_min)
            if x_min >= img_w or y_min >= img_h:
                continue
            w = min(w, img_w - x_min)
            h = min(h, img_h - y_min)

            if w * h < 1.0:
                continue

            valid_indices.append(i)
            converted_bboxes.append([x_min, y_min, w, h])

        # Rebuild objects dict, filtering all list-valued fields by valid_indices
        new_objects = {}
        for key, value in objects.items():
            if key == "bbox":
                new_objects["bbox"] = converted_bboxes
            elif isinstance(value, list) and len(value) == n:
                new_objects[key] = [value[j] for j in valid_indices]
            else:
                new_objects[key] = value

        if "area" not in new_objects or len(new_objects.get("area", [])) != len(converted_bboxes):
            new_objects["area"] = [b[2] * b[3] for b in converted_bboxes]

        example[objects_col] = new_objects
        return example

    before = len(dataset)
    dataset = dataset.map(_validate)
    dataset = dataset.filter(lambda ex: len(ex[objects_col]["bbox"]) > 0)
    after = len(dataset)
    if before != after:
        logger.warning(f"Dropped {before - after}/{before} images with no valid bboxes after sanitization")
    logger.info(f"Bbox sanitization complete: {after} images with valid bboxes remain")
    return dataset


def convert_bbox_yolo_to_pascal(boxes: torch.Tensor, image_size: tuple[int, int]) -> torch.Tensor:
    """
    Convert bounding boxes from YOLO format (x_center, y_center, width, height) in range [0, 1]
    to Pascal VOC format (x_min, y_min, x_max, y_max) in absolute coordinates.

    Args:
        boxes (torch.Tensor): Bounding boxes in YOLO format
        image_size (tuple[int, int]): Image size in format (height, width)

    Returns:
        torch.Tensor: Bounding boxes in Pascal VOC format (x_min, y_min, x_max, y_max)
    """
    # convert center to corners format
    boxes = center_to_corners_format(boxes)


    if isinstance(image_size, torch.Tensor):
        image_size = image_size.tolist()
    elif isinstance(image_size, np.ndarray):
        image_size = image_size.tolist()
    height, width = image_size
    boxes = boxes * torch.tensor([[width, height, width, height]])

    return boxes


def augment_and_transform_batch(
    examples: Mapping[str, Any],
    transform: A.Compose,
    image_processor: AutoImageProcessor,
    return_pixel_mask: bool = False,
) -> BatchFeature:
    """Apply augmentations and format annotations in COCO format for object detection task"""

    images = []
    annotations = []
    image_ids = examples["image_id"] if "image_id" in examples else range(len(examples["image"]))
    for image_id, image, objects in zip(image_ids, examples["image"], examples["objects"]):
        image = np.array(image.convert("RGB"))

        # Filter invalid bboxes before augmentation (safety net after sanitize_dataset)
        bboxes = objects["bbox"]
        categories = objects["category"]
        areas = objects["area"]
        valid = [
            (b, c, a)
            for b, c, a in zip(bboxes, categories, areas)
            if len(b) == 4 and b[2] > 0 and b[3] > 0 and b[0] >= 0 and b[1] >= 0
        ]
        if valid:
            bboxes, categories, areas = zip(*valid)
        else:
            bboxes, categories, areas = [], [], []

        # apply augmentations
        output = transform(image=image, bboxes=list(bboxes), category=list(categories))
        images.append(output["image"])

        # format annotations in COCO format (recompute areas from post-augmentation bboxes)
        post_areas = [b[2] * b[3] for b in output["bboxes"]] if output["bboxes"] else []
        formatted_annotations = format_image_annotations_as_coco(
            image_id, output["category"], post_areas, output["bboxes"]
        )
        annotations.append(formatted_annotations)

    # Apply the image processor transformations: resizing, rescaling, normalization
    result = image_processor(images=images, annotations=annotations, return_tensors="pt")

    if not return_pixel_mask:
        result.pop("pixel_mask", None)

    return result


def collate_fn(batch: list[BatchFeature]) -> Mapping[str, torch.Tensor | list[Any]]:
    data = {}
    data["pixel_values"] = torch.stack([x["pixel_values"] for x in batch])
    data["labels"] = [x["labels"] for x in batch]
    if "pixel_mask" in batch[0]:
        data["pixel_mask"] = torch.stack([x["pixel_mask"] for x in batch])
    return data


@torch.no_grad()
def compute_metrics(
    evaluation_results: EvalPrediction,
    image_processor: AutoImageProcessor,
    threshold: float = 0.0,
    id2label: Mapping[int, str] | None = None,
) -> Mapping[str, float]:
    """
    Compute mean average mAP, mAR and their variants for the object detection task.

    Args:
        evaluation_results (EvalPrediction): Predictions and targets from evaluation.
        threshold (float, optional): Threshold to filter predicted boxes by confidence. Defaults to 0.0.
        id2label (Optional[dict], optional): Mapping from class id to class name. Defaults to None.

    Returns:
        Mapping[str, float]: Metrics in a form of dictionary {<metric_name>: <metric_value>}
    """

    predictions, targets = evaluation_results.predictions, evaluation_results.label_ids

    # For metric computation we need to provide:
    #  - targets in a form of list of dictionaries with keys "boxes", "labels"
    #  - predictions in a form of list of dictionaries with keys "boxes", "scores", "labels"

    image_sizes = []
    post_processed_targets = []
    post_processed_predictions = []

    # Collect targets in the required format for metric computation
    for batch in targets:
        # collect image sizes, we will need them for predictions post processing
        batch_image_sizes = torch.tensor([x["orig_size"] for x in batch])
        image_sizes.append(batch_image_sizes)
        # collect targets in the required format for metric computation
        # boxes were converted to YOLO format needed for model training
        # here we will convert them to Pascal VOC format (x_min, y_min, x_max, y_max)
        for image_target in batch:
            boxes = torch.tensor(image_target["boxes"])
            boxes = convert_bbox_yolo_to_pascal(boxes, image_target["orig_size"])
            labels = torch.tensor(image_target["class_labels"])
            post_processed_targets.append({"boxes": boxes, "labels": labels})

    # Collect predictions in the required format for metric computation,
    # model produce boxes in YOLO format, then image_processor convert them to Pascal VOC format
    for batch, target_sizes in zip(predictions, image_sizes):
        batch_logits, batch_boxes = batch[1], batch[2]
        output = ModelOutput(logits=torch.tensor(batch_logits), pred_boxes=torch.tensor(batch_boxes))
        post_processed_output = image_processor.post_process_object_detection(
            output, threshold=threshold, target_sizes=target_sizes
        )
        post_processed_predictions.extend(post_processed_output)

    # Compute metrics
    metric = MeanAveragePrecision(box_format="xyxy", class_metrics=True)
    metric.update(post_processed_predictions, post_processed_targets)
    metrics = metric.compute()

    # Replace list of per class metrics with separate metric for each class
    classes = metrics.pop("classes")
    map_per_class = metrics.pop("map_per_class")
    mar_100_per_class = metrics.pop("mar_100_per_class")
    # Single-class datasets return 0-d scalar tensors; make them iterable
    if classes.dim() == 0:
        classes = classes.unsqueeze(0)
        map_per_class = map_per_class.unsqueeze(0)
        mar_100_per_class = mar_100_per_class.unsqueeze(0)
    for class_id, class_map, class_mar in zip(classes, map_per_class, mar_100_per_class):
        class_name = id2label[class_id.item()] if id2label is not None else class_id.item()
        metrics[f"map_{class_name}"] = class_map
        metrics[f"mar_100_{class_name}"] = class_mar

    metrics = {k: round(v.item(), 4) for k, v in metrics.items()}

    return metrics


@dataclass
class DataTrainingArguments:
    """
    Arguments pertaining to what data we are going to input our model for training and eval.
    Using `HfArgumentParser` we can turn this class into argparse arguments to be able to specify
    them on the command line.
    """

    dataset_name: str = field(
        default="cppe-5",
        metadata={
            "help": "Name of a dataset from the hub (could be your own, possibly private dataset hosted on the hub)."
        },
    )
    dataset_config_name: str | None = field(
        default=None, metadata={"help": "The configuration name of the dataset to use (via the datasets library)."}
    )
    train_val_split: float | None = field(
        default=0.15, metadata={"help": "Percent to split off of train for validation."}
    )
    image_square_size: int | None = field(
        default=600,
        metadata={"help": "Image longest size will be resized to this value, then image will be padded to square."},
    )
    max_train_samples: int | None = field(
        default=None,
        metadata={
            "help": (
                "For debugging purposes or quicker training, truncate the number of training examples to this "
                "value if set."
            )
        },
    )
    max_eval_samples: int | None = field(
        default=None,
        metadata={
            "help": (
                "For debugging purposes or quicker training, truncate the number of evaluation examples to this "
                "value if set."
            )
        },
    )
    use_fast: bool | None = field(
        default=True,
        metadata={"help": "Use a fast torchvision-base image processor if it is supported for a given model."},
    )


@dataclass
class ModelArguments:
    """
    Arguments pertaining to which model/config/tokenizer we are going to fine-tune from.
    """

    model_name_or_path: str = field(
        default="facebook/detr-resnet-50",
        metadata={"help": "Path to pretrained model or model identifier from huggingface.co/models"},
    )
    config_name: str | None = field(
        default=None, metadata={"help": "Pretrained config name or path if not the same as model_name"}
    )
    cache_dir: str | None = field(
        default=None, metadata={"help": "Where do you want to store the pretrained models downloaded from s3"}
    )
    model_revision: str = field(
        default="main",
        metadata={"help": "The specific model version to use (can be a branch name, tag name or commit id)."},
    )
    image_processor_name: str = field(default=None, metadata={"help": "Name or path of preprocessor config."})
    ignore_mismatched_sizes: bool = field(
        default=True,
        metadata={
            "help": "Whether or not to raise an error if some of the weights from the checkpoint do not have the same size as the weights of the model (if for instance, you are instantiating a model with 10 labels from a checkpoint with 3 labels)."
        },
    )
    token: str = field(
        default=None,
        metadata={
            "help": (
                "The token to use as HTTP bearer authorization for remote files. If not specified, will use the token "
                "generated when running `hf auth login` (stored in `~/.huggingface`)."
            )
        },
    )
    trust_remote_code: bool = field(
        default=False,
        metadata={
            "help": (
                "Whether to trust the execution of code from datasets/models defined on the Hub."
                " This option should only be set to `True` for repositories you trust and in which you have read the"
                " code, as it will execute code present on the Hub on your local machine."
            )
        },
    )


def main():
    parser = HfArgumentParser((ModelArguments, DataTrainingArguments, TrainingArguments))
    if len(sys.argv) == 2 and sys.argv[1].endswith(".json"):

        model_args, data_args, training_args = parser.parse_json_file(json_file=os.path.abspath(sys.argv[1]))
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

    # Initialize Trackio for real-time experiment tracking
    trackio.init(project=training_args.output_dir, name=training_args.run_name)

    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%m/%d/%Y %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    if training_args.should_log:
        # The default of training_args.log_level is passive, so we set log level at info here to have that default.
        transformers.utils.logging.set_verbosity_info()

    log_level = training_args.get_process_log_level()
    logger.setLevel(log_level)
    transformers.utils.logging.set_verbosity(log_level)
    transformers.utils.logging.enable_default_handler()
    transformers.utils.logging.enable_explicit_format()

    # Log on each process the small summary:
    logger.warning(
        f"Process rank: {training_args.local_process_index}, device: {training_args.device}, n_gpu: {training_args.n_gpu}, "
        + f"distributed training: {training_args.parallel_mode.value == 'distributed'}, 16-bits training: {training_args.fp16}"
    )
    logger.info(f"Training/evaluation parameters {training_args}")

    dataset = load_dataset(
        data_args.dataset_name, cache_dir=model_args.cache_dir, trust_remote_code=model_args.trust_remote_code
    )

    bbox_format = detect_bbox_format_from_samples(dataset["train"])
    if bbox_format == "xyxy":
        logger.info("Converting bboxes from xyxy (Pascal VOC) → xywh (COCO) format across all splits")
    for split_name in list(dataset.keys()):
        dataset[split_name] = sanitize_dataset(dataset[split_name], bbox_format=bbox_format)

    for split_name in list(dataset.keys()):
        if "image_id" not in dataset[split_name].column_names:
            dataset[split_name] = dataset[split_name].add_column(
                "image_id", list(range(len(dataset[split_name])))
            )

    dataset["train"] = dataset["train"].shuffle(seed=training_args.seed)

    data_args.train_val_split = None if "validation" in dataset else data_args.train_val_split
    if isinstance(data_args.train_val_split, float) and data_args.train_val_split > 0.0:
        split = dataset["train"].train_test_split(data_args.train_val_split, seed=training_args.seed)
        dataset["train"] = split["train"]
        dataset["validation"] = split["test"]

    categories = None
    try:
        if isinstance(dataset["train"].features["objects"], dict):
            cat_feature = dataset["train"].features["objects"]["category"].feature
        else:
            cat_feature = dataset["train"].features["objects"].feature["category"]

        if hasattr(cat_feature, "names"):
            categories = cat_feature.names
    except (AttributeError, KeyError):
        pass

    if categories is None:
        # Category is a Value type (not ClassLabel) — scan dataset to discover labels
        logger.info("Category feature is not ClassLabel — scanning dataset to discover category labels...")
        unique_cats = set()
        for example in dataset["train"]:
            cats = example["objects"]["category"]
            if isinstance(cats, list):
                unique_cats.update(cats)
            else:
                unique_cats.add(cats)

        if all(isinstance(c, int) for c in unique_cats):
            max_cat = max(unique_cats)
            categories = [f"class_{i}" for i in range(max_cat + 1)]
        elif all(isinstance(c, str) for c in unique_cats):
            categories = sorted(unique_cats)
        else:
            categories = [str(c) for c in sorted(unique_cats, key=str)]
        logger.info(f"Discovered {len(categories)} categories: {categories}")

    id2label = dict(enumerate(categories))
    label2id = {v: k for k, v in id2label.items()}

    # Remap string categories to integer IDs if needed
    sample_cats = dataset["train"][0]["objects"]["category"]
    if sample_cats and isinstance(sample_cats[0], str):
        logger.info(f"Remapping string categories to integer IDs: {label2id}")

        def _remap_categories(example):
            objects = example["objects"]
            objects["category"] = [label2id[c] for c in objects["category"]]
            example["objects"] = objects
            return example

        for split_name in list(dataset.keys()):
            dataset[split_name] = dataset[split_name].map(_remap_categories)
        logger.info("Category remapping complete")

    if data_args.max_train_samples is not None:
        max_train = min(data_args.max_train_samples, len(dataset["train"]))
        dataset["train"] = dataset["train"].select(range(max_train))
        logger.info(f"Truncated training set to {max_train} samples")
    if data_args.max_eval_samples is not None and "validation" in dataset:
        max_eval = min(data_args.max_eval_samples, len(dataset["validation"]))
        dataset["validation"] = dataset["validation"].select(range(max_eval))
        logger.info(f"Truncated validation set to {max_eval} samples")

    common_pretrained_args = {
        "cache_dir": model_args.cache_dir,
        "revision": model_args.model_revision,
        "token": model_args.token,
        "trust_remote_code": model_args.trust_remote_code,
    }
    config = AutoConfig.from_pretrained(
        model_args.config_name or model_args.model_name_or_path,
        label2id=label2id,
        id2label=id2label,
        **common_pretrained_args,
    )
    model = AutoModelForObjectDetection.from_pretrained(
        model_args.model_name_or_path,
        config=config,
        ignore_mismatched_sizes=model_args.ignore_mismatched_sizes,
        **common_pretrained_args,
    )
    image_processor = AutoImageProcessor.from_pretrained(
        model_args.image_processor_name or model_args.model_name_or_path,
        do_resize=True,
        size={"max_height": data_args.image_square_size, "max_width": data_args.image_square_size},
        do_pad=True,
        pad_size={"height": data_args.image_square_size, "width": data_args.image_square_size},
        use_fast=data_args.use_fast,
        **common_pretrained_args,
    )

    max_size = data_args.image_square_size
    train_augment_and_transform = A.Compose(
        [
            A.Compose(
                [
                    A.SmallestMaxSize(max_size=max_size, p=1.0),
                    A.RandomSizedBBoxSafeCrop(height=max_size, width=max_size, p=1.0),
                ],
                p=0.2,
            ),
            A.OneOf(
                [
                    A.Blur(blur_limit=7, p=0.5),
                    A.MotionBlur(blur_limit=7, p=0.5),
                    A.Defocus(radius=(1, 5), alias_blur=(0.1, 0.25), p=0.1),
                ],
                p=0.1,
            ),
            A.Perspective(p=0.1),
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(p=0.5),
            A.HueSaturationValue(p=0.1),
        ],
        bbox_params=A.BboxParams(format="coco", label_fields=["category"], clip=True, min_area=25),
    )
    validation_transform = A.Compose(
        [A.NoOp()],
        bbox_params=A.BboxParams(format="coco", label_fields=["category"], clip=True),
    )

    train_transform_batch = partial(
        augment_and_transform_batch, transform=train_augment_and_transform, image_processor=image_processor
    )
    validation_transform_batch = partial(
        augment_and_transform_batch, transform=validation_transform, image_processor=image_processor
    )

    dataset["train"] = dataset["train"].with_transform(train_transform_batch)
    dataset["validation"] = dataset["validation"].with_transform(validation_transform_batch)
    if "test" in dataset:
        dataset["test"] = dataset["test"].with_transform(validation_transform_batch)


    eval_compute_metrics_fn = partial(
        compute_metrics, image_processor=image_processor, id2label=id2label, threshold=0.0
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"] if training_args.do_train else None,
        eval_dataset=dataset["validation"] if training_args.do_eval else None,
        processing_class=image_processor,
        data_collator=collate_fn,
        compute_metrics=eval_compute_metrics_fn,
    )

    # Training
    if training_args.do_train:
        train_result = trainer.train(resume_from_checkpoint=training_args.resume_from_checkpoint)
        trainer.save_model()
        trainer.log_metrics("train", train_result.metrics)
        trainer.save_metrics("train", train_result.metrics)
        trainer.save_state()

    if training_args.do_eval:
        test_dataset = dataset["test"] if "test" in dataset else dataset["validation"]
        test_prefix = "test" if "test" in dataset else "eval"
        metrics = trainer.evaluate(eval_dataset=test_dataset, metric_key_prefix=test_prefix)
        trainer.log_metrics(test_prefix, metrics)
        trainer.save_metrics(test_prefix, metrics)

    trackio.finish()

    kwargs = {
        "finetuned_from": model_args.model_name_or_path,
        "dataset": data_args.dataset_name,
        "tags": ["object-detection", "vision"],
    }
    if training_args.push_to_hub:
        trainer.push_to_hub(**kwargs)
    else:
        trainer.create_model_card(**kwargs)


if __name__ == "__main__":
    main()