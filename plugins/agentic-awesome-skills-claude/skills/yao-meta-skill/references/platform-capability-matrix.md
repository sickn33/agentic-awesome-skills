# Platform Capability Matrix

> Catalog scope: this is upstream design guidance. Referenced scripts, commands,
> reports, fixtures and security policies are not bundled here. They describe
> proposed/manual output contracts or a separately reviewed upstream toolchain,
> not verified capabilities of this installation. Do not execute missing or
> unreviewed code, or claim unrun gates passed. Current user scope and host policy
> take precedence; metadata alone grants no runtime permission.


This matrix describes the current packaging targets and their support level.

| Target | Metadata Adapter | Compiler Contract | Native Behavior Contract | Output Contract | Snapshot Test | Portability Semantics | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `openai` | Yes | Yes | Yes | Yes | Yes | activation, execution, trust, permissions, degradation, native behavior | Generates `targets/openai/agents/openai.yaml` |
| `claude` | Yes | Yes | Yes | Yes | Yes | activation, execution, trust, permissions, degradation, native behavior | Generates `targets/claude/README.md` plus adapter metadata |
| `generic` | Yes | Yes | Yes | Yes | Yes | activation, execution, trust, permissions, degradation, native behavior | Uses neutral adapter metadata only |
| `agent-skills-compatible` | Neutral source | Yes | Yes | Source-compatible | Yes | activation, execution, trust, permissions, degradation, native behavior | Keeps canonical `SKILL.md` plus `agents/interface.yaml` source shape |
| `vscode` | Yes | Yes | Yes | Yes | Yes | activation, execution, trust, permissions, degradation, native behavior, install scope | Generates `targets/vscode/README.md` plus adapter metadata for VS Code / Copilot Agent Skills review |

## Current Support Model

- `openai`: strongest metadata adapter support with an explicit compiler contract.
- `claude`: lightweight compatibility adapter with an explicit compiler contract and fallback notes.
- `generic`: lowest-friction export for neutral Agent Skills consumers.
- `agent-skills-compatible`: canonical source shape with compiler evidence for review and distribution.
- `vscode`: VS Code / Copilot Agent Skills adapter that preserves the neutral source package and documents user/project scope plus workspace-trust review notes.
- runtime permission probes currently report metadata fallback for generated targets; no target is claimed as native-enforced until a client or installer integration can actually enforce the permission model.

## Portable Semantics

Each target now preserves:

- activation mode and optional path filters
- execution context and shell choice
- trust tier and remote inline-execution policy
- permission contract for network, file-write, subprocess, and interactive script surfaces
- target-native behavior contract for native surface, activation policy, resource strategy, script strategy, permission enforcement, install scope, review artifacts, and fallback behavior
- degradation strategy for unsupported client behavior
- generated-file mapping and adapter mode from `reports/compiled_targets.json`

## Explicit Non-Goals

This project does not yet implement:

- client SDK integration
- provider-specific execution logic
- provider-native installer actions or account-level activation changes
- native runtime permission enforcement

## Degradation Rule

If a target cannot support a source feature directly:

1. preserve the neutral source package
2. emit a minimal adapter
3. document the fallback in the target output

## Evidence status of this catalog copy

The table records upstream design claims, not tested support here. Only neutral
guidance/metadata is bundled. No compiler, adapters, snapshots, permission probes
or installer were executed in this review. Mark client compatibility unverified
until tested on the exact generated package and target client version.
