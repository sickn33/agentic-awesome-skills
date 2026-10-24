---
name: attack-tree-construction
description: "Build comprehensive attack trees to visualize threat paths. Use when mapping attack scenarios, identifying defense gaps, or communicating security risks to stakeholders."
risk: offensive
source: community
date_added: "2026-02-27"
---

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, defensive validation, or controlled educational environments.

# Attack Tree Construction

Systematic attack path visualization and analysis.

## Use this skill when

- Visualizing complex attack scenarios
- Identifying defense gaps and priorities
- Communicating risks to stakeholders
- Planning defensive investments or test scopes

## Do not use this skill when

- You lack authorization or a defined scope to model the system
- The task is a general risk review without attack-path modeling
- The request is unrelated to security assessment or design

## Instructions

- Confirm scope, assets, and the attacker goal for the root node.
- Decompose into sub-goals with AND/OR structure.
- Annotate leaves with cost, skill, time, and detectability.
- Map mitigations per branch and prioritize high-impact paths.
- If detailed templates are required, open `resources/implementation-playbook.md`.

## Safety

- Share attack trees only with authorized stakeholders.
- Avoid including sensitive exploit details unless required.

## Resources

- `resources/implementation-playbook.md` for detailed patterns, templates, and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Model validity and metric limits

Validate a finite acyclic tree with unique IDs, nonempty AND/OR nodes and no children on leaves before recursion/export. The builder does not supply full validation, cycle detection or an enumeration cap; path products can grow exponentially. “Easiest” now uses the same max-difficulty convention as node aggregation, and detection uses a stated worst-step ordinal index, not a probability. The cost enum is an ordinal score; summing it does not produce dollars. Shared prerequisites, correlated detection, parallel time and resource reuse require a richer model.

Coverage means the fraction of enumerated modeled paths intersecting a supplied blocked-leaf set. A mitigation label is not evidence it fully blocks a leaf or that paths have equal likelihood; do not call the percentage real security coverage. Escape user-supplied diagram labels in the target grammar before rendering; the exporter sketches still assume reviewed safe labels. CVE references need actual affected-version/configuration evidence. No exploit, renderer or attack-tree implementation was executed during review.
