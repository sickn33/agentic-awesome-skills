---
name: transformers-js
description: "Use Transformers.js to run state-of-the-art machine learning models directly in JavaScript/TypeScript."
risk: critical
source: https://github.com/huggingface/skills/tree/main/skills/transformers-js
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Transformers.js - Machine Learning for JavaScript

Transformers.js enables running state-of-the-art machine learning models directly in JavaScript across browsers and server-side runtimes (Node.js, Bun, Deno), with no Python server required.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use this skill when you need to:
- Run ML models for text analysis, generation, or translation in JavaScript
- Perform image classification, object detection, or segmentation
- Implement speech recognition or audio processing
- Build multimodal AI applications (text-to-image, image-to-text, etc.)
- Run models client-side in the browser without a backend

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.

### Runtime and model boundaries

The references mix stable APIs with v4/main-only examples (including ModelRegistry and `env.fetch`). Pin a tested library version and check its matching documentation; the unversioned main docs may require a source build. Model repositories need compatible ONNX exports, tokenizer/config files and supported backend operators; an `onnx/` folder alone does not prove compatibility. Respect each model's license and gated-access terms. Keep tokens server-side. Offline operation also requires local runtime/WASM assets; cache presence alone is insufficient.

Examples are illustrative and were not executed against downloaded models in this review. Larger models and lower precision do not guarantee better quality or faster inference. Browser unload handlers cannot guarantee asynchronous disposal; await explicit cleanup while the application is active. React examples require cancellation/unmount handling for pending loads and inference. Server deployments need authentication, input/rate limits, readiness checks and bounded shutdown before exposure.

Modified for catalog review on 2026-10-23; upstream attribution and Apache-2.0 metadata retained.
