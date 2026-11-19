# Sybil Solutions skill import

The inventory covered the default-branch Git trees of all 34 public repositories listed by [Sybil Solutions](https://github.com/sybil-solutions). Four repositories contained 18 skill definitions. The profile also linked to the separate Omarchy repository under `0xSero`. Its default-branch tree contained no skill definitions.

| Count | Origin | AAS IDs |
| --- | --- | --- |
| 1 | [Inference Optimisation](https://github.com/sybil-solutions/inference-optimisation-skill/tree/fda968e7fc1996aa23c67139c755fe541c9d4be0/skills) | `sybil-inference-optimisation` |
| 1 | [GLM Flash Lite](https://github.com/sybil-solutions/glm-flash-lite/tree/6fe077da79a4d6fc842cf9f50cb703e4409924ca/skills) | `sybil-glm53-offload-setup` |
| 3 | [T3 Code workflows in Local Studio](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.agents/skills) | `sybil-local-studio-*` |
| 12 | [Effect workspace workflows vendored by Local Studio](https://github.com/sybil-solutions/local-studio/tree/f65c8af78582f741b62546c93d7c66439f0cd5b1/.repos/effect-smol/.agents/skills) | `effect-smol-*` |
| 1 | [Vercel vgpu snapshot carried by Local Studio Site](https://github.com/sybil-solutions/local-studio-site/tree/2d1d6a9752477aafa39588dc1ec0f9e5b97e2e77/.agents/skills/vgpu) | `vercel-vgpu` |

Each guide retains the applicable MIT notice and identifies the original copyright holder. The content of the vgpu snapshot matched the [original skill](https://github.com/vercel-labs/vgpu/tree/61779b7d15cc40a0058e4ade0457b8dbf717319e/skills/vgpu) outside its generated version, timestamp and revision metadata. The vgpu guide cites Vercel's original and uses its license.

The imports carry workflow Markdown with examples and prerequisites. Use project tools for inference, native UI testing and Effect validation. The original trees provide their own scripts, generated references, application fixtures and templates. The AAS guides keep expensive jobs and consequential changes within the user's authorized scope. The GLM guide assumes existing filesystems and a loopback test endpoint. Contribution triage defaults to assessment unless live moderation is expressly authorized.
