# Binary SAM/SAM2 segmentation pilot

AAS-reviewed adaptation of the upstream SAM notebook. Use [the guarded segmentation script](../scripts/sam_segmentation_training.py) with the [pilot guide](detailed-guide.md). This example thresholds binary masks; it does not train continuous alpha matting, despite earlier matting terminology.

Require an image, a two-dimensional aligned binary mask and an explicit bbox or foreground-point prompt. Validate finite coordinates in the image's pixel frame, positive bbox geometry and the chosen prompt type. Do not silently take one channel of an RGB mask or discard alpha levels. The example supports binary mask values 0/1/255; multiclass/soft masks need a separate reviewed formulation. Multiple point counts must be compatible within the batch or deliberately padded by a reviewed collator.

Use the pinned processor's `segmentation_maps` path so label resize/padding follows image preprocessing. Do not stretch every raw mask directly to 256x256 while preserving aspect ratio/padding only for the input image. Fail if the chosen processor does not return labels or model logits do not match the processed labels. The collator sends only actual model inputs plus labels and multimask_output; metadata like original_image_size must not leak into model.forward as unsupported kwargs.

The Dice/CE loss expects a verified binary-logit/channel shape. Check gradients, loss scale and accumulation behavior with the installed Transformers/Monai versions; a syntax test cannot validate training. Frozen encoder settings reduce trainable parameters but do not guarantee VRAM fit or convergence. Use a documented held-out/group split and suitable IoU/Dice evaluation, not just decreasing training loss or a before/after picture.

Save the processor as well as safe weights. No publication, external tracking, cloud job or real model training was performed in this catalog review.

Official reference: [SAM2 processor/model documentation](https://huggingface.co/docs/transformers/model_doc/sam2).
