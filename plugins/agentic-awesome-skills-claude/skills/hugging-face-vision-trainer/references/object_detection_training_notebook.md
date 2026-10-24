# Object detection pilot

AAS-reviewed adaptation of the upstream detection notebook. Use [the guarded detector script](../scripts/object_detection_training.py) and [pilot guide](detailed-guide.md). Earlier copied tutorial metrics are not reproduced evidence for this catalog.

## Annotation contract

Declare `--bbox_format xywh` for COCO pixel boxes `[x_min,y_min,width,height]` or `xyxy` for pixel corners `[x_min,y_min,x_max,y_max]`. COCO is not center-x/center-y format. Normalized coordinates need an explicitly reviewed conversion first; the script never guesses. Four finite nonboolean numbers, positive area and bounds within the actual decoded image are required. Category/box lengths must match. Reject and investigate malformed annotations rather than silently clipping or deleting them.

Empty boxes with empty categories are valid negative images and remain in the dataset. Require a deliberate, consistent zero-based category mapping; sparse integer labels must be remapped explicitly. Class names do not by themselves establish label semantics. Audit transformed images and boxes together after augmentation; recompute area from the resulting boxes. Do not reuse pre-augmentation areas for a filtered/transformed object list.

## Training/evaluation

Use the same pinned model/config/processor and verify target-size ordering `(height,width)`. Preserve the image column for preprocessing and disable evaluation batch concatenation when each image has a different number of objects. Inspect the pinned model's output structure rather than assuming any architecture's tuple indices are interchangeable.

COCO-style mAP/mAR computation must align each prediction to its original target and image size, including empty targets and single-class shapes. Report class support, thresholds, area strata and exact evaluation split. Do not tune on a test set or promise a particular mAP from fixed epochs, image count or GPU. A tiny held-out sample cannot establish generalization or safety for driving/medical/security uses.

For inference, use approved local input images with bounded dimensions/bytes; do not fetch an unbounded arbitrary URL or execute dataset-provided content. Save model, processor and label maps locally and reload them under the tested environment. Hub publication and telemetry require separate authorization and are disabled in bundled pilots.

Official reference: [Transformers object detection](https://huggingface.co/docs/transformers/tasks/object_detection).
