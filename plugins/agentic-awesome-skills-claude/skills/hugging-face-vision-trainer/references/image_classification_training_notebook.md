# Image classification pilot

AAS-reviewed adaptation of the upstream classification notebook. Use the guarded [classification script](../scripts/image_classification_training.py) with [pilot arguments](detailed-guide.md); it is not a ready-to-run notebook or medical screening system.

Confirm the image column and explicit class mapping. ClassLabel metadata can supply names; plain numeric labels must be contiguous zero-based IDs, and string labels are mapped consistently. Missing, mixed, unseen or sparse labels require deliberate preprocessing, not an invented class count. Inspect every split and ensure label mapping is defined by the approved schema/training data without consuming test targets for tuning.

Training uses stochastic augmentation; validation/test use deterministic resize/center crop and the model's normalization. Verify crop/resize policies against the actual model and task, including timm-specific transforms. Augmentation may remove the only diagnostic region or change label meaning. Use the same pinned processor/model, safe weight format and explicit image dimensions.

The local accuracy calculation avoids downloading executable metric modules. Accuracy alone is insufficient for imbalanced or consequential tasks; include class support/confusion and appropriate calibrated metrics under an approved evaluation design. Split related patients/videos/scenes together; random image-level splitting is not automatically valid. Do not tune on the final test split.

Save model, processor, label maps and measured metrics locally. Publishing, telemetry and persistent login are disabled. Verify exact library compatibility and run an authorized small smoke test before scaling; this review did not train a model.

Official reference: [Transformers image classification](https://huggingface.co/docs/transformers/tasks/image_classification).
