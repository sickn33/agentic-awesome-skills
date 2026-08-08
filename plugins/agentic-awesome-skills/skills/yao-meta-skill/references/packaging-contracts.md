# Packaging Contracts

`cross_packager.py` is not just an export helper. It validates platform contracts and embeds target compiler output from `compile_skill.py`.

## Current Targets

- `openai`
- `claude`
- `generic`

## Contract Shape

Each target contract defines:

- required output fields
- required output files
- field mapping from the neutral source metadata
- compiled contract from Skill IR
- target transform metadata, including generated files and unsupported features
- portable execution metadata
- trust-boundary metadata
- permission contract metadata from the trust report
- target-specific permission representation and reviewer notes
- target-native behavior contract for native surface, activation policy, resource strategy, script strategy, permission enforcement, install scope, review artifacts, and fallback behavior
- degradation strategy metadata

## Failure Handling

When `--expectations` is provided:

- missing required files cause exit code `2`
- missing required fields cause exit code `2`
- validation failures are emitted in the JSON report

After packaging, run `scripts/probe_runtime_permissions.py` against the generated package directory. Packaging creates the permission metadata; the runtime permission probe verifies that each target adapter exposes the contract, target-specific representation, native-enforcement flag, operator note, and residual metadata-fallback risk.

## Source Of Truth

The platform-neutral semantic source is Skill IR when it exists:

- `reports/skill-ir.json`
- `skill-ir/examples/<skill-name>.json`

The structural validation sources remain:

- `SKILL.md`
- `agents/interface.yaml`

Target-specific metadata is generated through `scripts/compile_skill.py` and
then embedded at packaging time. The adapter must carry `compiler`,
`compiled_contract`, `permission_contract`, `target_permission_contract`,
`target_native_contract`, `target_transform`, `ir_source`, `ir_schema_version`,
`job_to_be_done`, `semantic_contract`, and `semantic_parity` so reviewers can
see whether the target preserved the core skill meaning or fell back to
frontmatter-only metadata.

## Portability Model

The packaging layer now preserves four portable semantics from the neutral source:

- activation
- execution
- trust
- permissions
- degradation
- platform-neutral skill meaning from Skill IR
- target-specific native behavior notes for activation, resources, scripts, permission enforcement, install scope, review artifacts, and fallback behavior
- target-specific compile notes for generated files, adapter mode, preserved semantics, and unsupported features

This means portability is not just "can it export a file?" but also "does the exported target preserve the source package's activation and safety assumptions?"
