---
name: design-how-token-mapping
description: Produce a read-only mapping from hardcoded styling to semantic design tokens with exact, near, ambiguous and missing matches.
license: MIT
metadata:
  aas-category: design
  aas-risk: safe
  aas-source: https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/token-mapping
  aas-source-repo: arla6ka/design.how
  aas-source-type: community
  aas-license-source: https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE
  aas-author: Arlan Marat
  aas-date-added: '2026-11-19'
---

# Map Styling to Tokens

## When to Use

Use for a page, file or diff that needs a design-token audit. For applying changes, use `design-how-build-design-system`.

## Workflow

1. Locate the token definitions actually used by the project and resolve aliases and theme overrides. Note property, state, context, units and frequency for each literal. Inspect computed styles when declarations alone cannot explain the rendered value.
2. Match by semantic role first, then compare resolved values. Prefer exact matches that hold in all applicable themes. Treat equal colors with incompatible roles as ambiguous. For near matches, report the measured difference and units, using a consistent perceptual color metric where available.
3. Classify each row as exact, near, ambiguous, no token, or intentional exception. Show source location, raw value, candidate token and trade-off. Flag text/surface combinations whose contrast could change. For no token, suggest a role name without modifying the registry.

## Example

On a danger alert, `#ad2139` matches both `--badge-brand` and `--text-danger` in light mode. Check dark mode and prefer the danger role for alert text, recording the rejected candidate.

## Limitations

This is a report. Do not edit files or create tokens. A missing theme or unresolved computed style lowers confidence and must appear in the result.

## Bundled resources

Apply the bundled [mapping rules](references/mapping-rules.md). Use the glossary in the installed `design-how-build-design-system` sibling when available.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/token-mapping) by Arlan Marat. See [MIT license](LICENSE).
