# timm and Transformers compatibility

AAS-reviewed adaptation. A `timm/` repository prefix does not prove that every checkpoint/version works with AutoModelForImageClassification, AutoImageProcessor or the installed Trainer. Review the checkpoint's config, architecture, license and exact compatible Transformers/timm versions, then run a bounded authorized smoke test.

Use the same pinned model and processor. Inspect native timm data configuration and training versus validation transforms; generic ImageNet normalization and center crops are not universally correct. The bundled classification script uses a torchvision fallback and needs task/model-specific verification before production. Do not reuse stochastic train augmentation for validation or rely on default collation while retaining uncollatable PIL images.

Verify output head size, zero-based class mapping, input tensor shape, loss and deterministic evaluation. If a specific wrapper exposes native transforms, use them through the reviewed implementation rather than an unverified source-line excerpt. Save the actual processor/config alongside weights and check local reload; no Hub push or global credential login is required for a local pilot.

See [Transformers timm wrapper](https://huggingface.co/docs/transformers/model_doc/timm_wrapper). Compatibility and GPU behavior were not live-tested in this review.
