---
name: code-documentation-doc-generate
description: "Compatibility alias of documentation-generation-doc-generate. Generate scoped documentation from verified source while preserving existing callers of this ID."
risk: safe
source: community
date_added: "2026-02-27"
---

## Compatibility and maintenance

Compatibility alias of `documentation-generation-doc-generate`; use that ID for new references when no existing contract requires this one. The full instructions and support files remain local so existing installations
continue to work offline. This is one shared procedure, not an additional capability.
Preserve the callable ID when an existing manifest or client configuration uses it.
Modified in AAS on 2026-09-05; original metadata and license notices are retained.

# Automated Documentation Generation

Produce the documentation requested for a named audience and source revision. Use implementation, configuration and tests as evidence; distinguish observed behavior from proposed changes.

## Use this skill when

- Generating API, architecture, or user documentation from code
- Building documentation pipelines or automation
- Standardizing docs across a repository

## Do not use this skill when

- The project has no codebase or source of truth
- You only need ad-hoc explanations
- You cannot access code or requirements

## Context
The user needs automated documentation generation that extracts information from code, creates clear explanations, and maintains consistency across documentation types. Document the checked revision and the existing verification command; a generated document does not stay synchronized automatically.

## Requirements
$ARGUMENTS

## Instructions

- Identify the requested artifact, target audience and current source revision. Do not generate every artifact in the playbook by default.
- Extract information from code, configs, and comments.
- Generate docs with consistent terminology and structure.
- Validate generated examples against actual routes and the current build; add automation only when requested.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Worked example and prerequisites

For an endpoint changed to return a cursor, inspect its implementation and test
fixtures, update the response example and pagination explanation, then run the existing
schema/doc build and the documented read-only call against a test fixture. Record
which commands actually ran. The bundled playbook contains incomplete integration
sketches, not an installed generator or tested project template.

## Example acceptance criteria

For that cursor-pagination update, the deliverable is the affected endpoint page and response example, not a new documentation platform. Confirm the cursor field name, final-page value, invalid-cursor response and authentication requirement against implementation or fixtures. Keep missing evidence in a short gaps list. Report schema/build/link checks as run, failed or unrun with a reason; an illustrative response is not a successful API call.

## Safety

- Avoid exposing secrets, internal URLs, or sensitive data in docs.

## Output Format

- Documentation plan and artifacts to generate
- File paths and tooling configuration
- Assumptions, gaps, and follow-up tasks

## Resources

- `resources/implementation-playbook.md` for detailed examples and templates.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
