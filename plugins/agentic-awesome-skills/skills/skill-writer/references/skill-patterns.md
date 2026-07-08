# Skill Patterns

## Minimal workflow skill

Use for narrow repeatable work.

Structure:

1. Purpose and trigger.
2. Inputs to collect.
3. Ordered steps.
4. Output contract.
5. Validation.
6. Limitations.

## Navigation skill with references

Use when the skill covers several modes, tools, or depth levels.

Structure:

1. Short SKILL.md with a routing table.
2. One reference per mode or domain.
3. Examples in `references/examples/`.
4. Scripts only for deterministic repeated actions.

## Integration skill

Use for CLIs, APIs, SDKs, or platforms.

Include:

- Installation or environment assumptions.
- Authentication and permission boundaries.
- Safe command patterns.
- Common failure signatures.
- Verification commands.

## Review or audit skill

Use for code, security, docs, or quality reviews.

Include:

- Scope definition.
- Evidence collection.
- Severity or priority scale.
- Finding format.
- False-positive handling.
- Verification and residual risk.
