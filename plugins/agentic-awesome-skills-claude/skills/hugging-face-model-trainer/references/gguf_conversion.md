# GGUF conversion

Use `scripts/convert_to_gguf.py --help` for the reviewed CLI. It requires explicit
conversion authorization, immutable base/adapter revisions, a reviewed local
llama.cpp checkout and a new durable output directory. Install dependencies and
build the converter separately after reviewing the pinned source and build inputs.
The script does not clone remote tools, run package installation, publish files or
clean up failed intermediate artifacts.

Verify that the adapter actually matches the base model and tokenizer. CPU merging
can require several times the model size in RAM. The script merges safetensors,
converts to F16 GGUF and quantizes to Q4_K_M with the supplied local build. Review
the executable binary as well as its source: matching a Git commit is not binary
provenance. Model-specific llama.cpp support must be confirmed before execution.
Each converter subprocess has a bounded timeout; model download/merge time is
separate and needs an external resource deadline if required.

Inspect GGUF headers, recorded actual sizes and SHA-256 provenance. These checks
establish file identity, not output quality or compatibility with every runtime.
Evaluate held-out outputs in the intended llama.cpp/Ollama/LM Studio version.
Quantization can reduce quality. Keep F16 and merged intermediates until satisfied.

Publication is a separate operation requiring destination, privacy, overwrite and
license review. Base-model, adapter and data rights all matter; do not invent an
Apache license or a training description for a generated model card. A failed
upload must not be called complete. No model conversion was run in source review.
