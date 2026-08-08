---
name: obsidian-clipper-template-creator
description: Guide for creating templates for the Obsidian Web Clipper. Use when you want to create a new clipping template, understand available variables, or format clipped content.
risk: safe
source: community
date_added: "2026-02-27"
---

# Obsidian Web Clipper Template Creator

This skill helps you create importable JSON templates for the Obsidian Web Clipper.

## When to Use
- You need to create or refine an importable Obsidian Web Clipper template.
- You want to map a site's real DOM, schema data, and selectors into a valid clipping template.
- You need selector verification and template logic guidance before handing the JSON to the user.

## Workflow

1. **Identify User Intent:** specific site (YouTube), specific type (Recipe), or general clipping?
2. **Check Existing Bases:** The user likely has a "Base" schema defined in `Bases/`.
    - **Action:** Read `Bases/*.base` to find a matching category (e.g., `Recipes.base`).
    - **Action:** Use the properties defined in the Base to structure the Clipper template properties.
    - See [references/bases-workflow.md](references/bases-workflow.md) for details.
3. **Fetch & Analyze Reference URL:** Validate variables against a real page.
    - **Action:** Ask the user for a sample URL of the content they want to clip (if not provided).
    - **Action (REQUIRED):** Use **WebFetch** to retrieve page content; if WebFetch is not available, use a browser DOM snapshot. See [references/analysis-workflow.md](references/analysis-workflow.md).
    - **Action:** Analyze the HTML for Schema.org JSON, Meta tags, and CSS selectors.
    - **Action (REQUIRED):** Verify each selector against the fetched content. Do not guess selectors.
    - See [references/analysis-workflow.md](references/analysis-workflow.md) for analysis techniques.
4. **Draft the JSON:** Create a valid JSON object following the schema.
    - See [references/json-schema.md](references/json-schema.md).
5. **Consider template logic:** Use conditionals for optional blocks (e.g. show nutrition only if present), loops for list data, variable assignment to avoid repeating expressions, and fallbacks for missing variables. Use logic only when it improves the template; keep simple templates simple. See [references/logic.md](references/logic.md).
6. **Verify Variables:** Ensure the chosen variables (Preset, Schema, Selector) exist in your analysis.
    - **Action (REQUIRED):** If a selector cannot be verified from the fetched content, state that explicitly and ask for another URL.
    - See [references/variables.md](references/variables.md).

## Selector Verification Rules

- **Always verify selectors** against live page content before responding.
- **Never guess selectors.** If the DOM cannot be accessed or the element is missing, ask for another URL or a screenshot.
- **Prefer stable selectors** (data attributes, semantic roles, unique IDs) over fragile class chains.
- **Document the target element** in your reasoning (e.g., "About sidebar paragraph") to reduce mismatch.

## Output Format

**ALWAYS** output the final result as a JSON code block that the user can copy and import.

The Clipper template editor validates template syntax.
If you use template logic (conditionals, loops, variable assignment), ensure it follows the syntax in [references/logic.md](references/logic.md) and the official [Logic](https://help.obsidian.md/web-clipper/logic) docs so the template passes validation.

```json
{
  "schemaVersion": "0.1.0",
  "name": "My Template",
  ...
}
```

## Resources

- [references/variables.md](references/variables.md) - Available data variables.
- [references/filters.md](references/filters.md) - Formatting filters.
- [references/json-schema.md](references/json-schema.md) - JSON structure documentation.
- [references/logic.md](references/logic.md) - Template logic.
- [references/bases-workflow.md](references/bases-workflow.md) - How to map Bases to Templates.
- [references/analysis-workflow.md](references/analysis-workflow.md) - How to validate page data.

### Official Documentation

- [Variables](https://help.obsidian.md/web-clipper/variables)
- [Filters](https://help.obsidian.md/web-clipper/filters)
- [Logic](https://help.obsidian.md/web-clipper/logic)
- [Templates](https://help.obsidian.md/web-clipper/templates)

## Examples

See [assets/](assets/) for JSON examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
