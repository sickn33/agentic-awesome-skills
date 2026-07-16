# Using timm models with Hugging Face Trainer

Transformers has first-class support for timm models via the `TimmWrapper` classes. You can load any timm model and use it directly with the `Trainer` API for image classification. Here's how it works:

## Loading a timm model

The `TimmWrapperForImageClassification` class (in `transformers/src/transformers/models/timm_wrapper/modeling_timm_wrapper.py`) wraps timm models so they're fully compatible with the Trainer API. You can load them via the `Auto` classes:

```python
from transformers import AutoModelForImageClassification, AutoImageProcessor, Trainer, TrainingArguments

# Load a timm model for image classification
checkpoint = "timm/resnet50.a1_in1k"
image_processor = AutoImageProcessor.from_pretrained(checkpoint)
model = AutoModelForImageClassification.from_pretrained(
    checkpoint,
    num_labels=10,  # set to your number of classes
    ignore_mismatched_sizes=True,  # needed when changing num_labels from pretrained
)
```

## Key details

1. **Image processor**: The `TimmWrapperImageProcessor` automatically resolves the correct transforms from timm's config. It exposes both `val_transforms` and `train_transforms` (with augmentations), as noted in the code:

```64:65:transformers/src/transformers/models/timm_wrapper/image_processing_timm_wrapper.py
        # useful for training, see examples/pytorch/image-classification/run_image_classification.py
        self.train_transforms = timm.data.create_transform(**self.data_config, is_training=True)
```

2. **Loss computation is built-in**: `TimmWrapperForImageClassification.forward()` accepts a `labels` argument and computes cross-entropy loss automatically, which is exactly what Trainer expects:

```374:376:transformers/src/transformers/models/timm_wrapper/modeling_timm_wrapper.py
        loss = None
        if labels is not None:
            loss = self.loss_function(labels, logits, self.config)
```

3. **Returns `ImageClassifierOutput`**: The output format is the standard transformers output, so Trainer handles it seamlessly.

## Full training example

```python
from transformers import AutoModelForImageClassification, AutoImageProcessor, Trainer, TrainingArguments
from datasets import load_dataset

# Load dataset
dataset = load_dataset("food101", split="train[:5000]")
dataset = dataset.train_test_split(test_size=0.2)

# Load timm model + processor
checkpoint = "timm/resnet50.a1_in1k"
image_processor = AutoImageProcessor.from_pretrained(checkpoint)
model = AutoModelForImageClassification.from_pretrained(
    checkpoint,
    num_labels=101,
    ignore_mismatched_sizes=True,
)

# Preprocessing
def transform(batch):
    batch["pixel_values"] = [image_processor(img)["pixel_values"][0] for img in batch["image"]]
    batch["labels"] = batch["label"]
    return batch

dataset["train"].set_transform(transform)
dataset["test"].set_transform(transform)

# Train
training_args = TrainingArguments(
    output_dir="./timm-finetuned",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    eval_strategy="epoch",
    save_strategy="epoch",
    logging_steps=50,
    remove_unused_columns=False,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
)

trainer.train()
```

Any timm checkpoint on the Hub (prefixed with `timm/`) works out of the box (ResNet, EfficientNet, ViT, ConvNeXt, etc). The wrapper handles all the translation between timm's interface and what Trainer expects.