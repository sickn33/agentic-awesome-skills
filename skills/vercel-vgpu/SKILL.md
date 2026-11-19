---
name: "vercel-vgpu"
description: "Build and profile WGSL shaders and WebGPU passes using the installed vgpu package and version-matched documentation."
category: "development"
risk: "critical"
source: "https://github.com/vercel-labs/vgpu/tree/61779b7d15cc40a0058e4ade0457b8dbf717319e/skills/vgpu"
source_repo: "vercel-labs/vgpu"
source_type: "community"
license: "MIT"
license_source: "https://github.com/vercel-labs/vgpu/blob/61779b7d15cc40a0058e4ade0457b8dbf717319e/LICENSE"
author: "Vercel, Inc."
date_added: "2026-11-19"
---

# Build and Profile vgpu WebGPU Apps

## When to Use

Use for the vgpu TypeScript library and its WebGPU rendering or compute paths. Use the documentation shipped for the version in the project's lockfile. The Sybil-hosted snapshot came from the 0.3.1 generation of the library.

## Workflow

1. Identify the runtime and scene needs. Choose browser canvas surface, Node offscreen rendering, or the mock adapter for deterministic contract tests. Use the core device and buffer layer for low-level ownership, the main vgpu API for frames and shader reflection, and scene helpers only when geometry or cameras need them.
2. Define the WGSL inputs, explicit target formats and pass order. Keep resource ownership and lifetime visible. Preserve stable bind groups and pipeline identities for unchanged inputs. For multi-pass rendering, declare where depth and intermediate textures live.
3. Verify one minimal render or compute pass, then test resizing or downstream pass composition. Mock tests validate the contract. Observe actual pixels and validation errors on a real WebGPU adapter for rendering acceptance.
4. Measure CPU encoding, pipeline warm-up, bind-group churn, texture memory and GPU time separately. Compare equivalent workloads and output. Recheck shader semantics and pixel evidence after optimization.

## Example

“A shader demo stutters on the first frame.” Measure pipeline warm-up separately from steady-state frame time and confirm pixel output on the project adapter.

## Limitations

Use installed package docs or the official documentation. API paths vary by release. Keep testing local and get authorization before adding dependencies or external GPU infrastructure.

## Bundled resources

The complete vgpu 0.3.1 [reference index](reference-index.md) and docs are included. For that API version, start with [getting started](references/guides/getting-started.docs.md), then pick the [performance model](references/guides/performance-model.docs.md), [browser testing](references/guides/browser-testing.docs.md), or [shader workflow](references/guides/shader-workflow.docs.md) as needed. For a different vgpu version, use its installed package types as the authority for version-specific calls. Examples in the references show optional CLI and MCP setup. Use version-matched tools already available to the project and get explicit approval for any connector or global configuration changes.

## Source

Adapted from the [pinned skill tree](https://github.com/vercel-labs/vgpu/tree/61779b7d15cc40a0058e4ade0457b8dbf717319e/skills/vgpu). See the [MIT license](LICENSE).

See the [Sybil-hosted generated snapshot](https://github.com/sybil-solutions/local-studio-site/tree/2d1d6a9752477aafa39588dc1ec0f9e5b97e2e77/.agents/skills/vgpu).
