# Obsidian Web Clipper Template Logic

**Official docs:** [Logic - Obsidian Help](https://help.obsidian.md/web-clipper/logic)

As of **Obsidian Web Clipper 1.0.0**, templates support logic in `noteContentFormat` and in property `value` fields: conditionals, loops, variable assignment, and fallbacks. This page describes how each works. For authoritative syntax and delimiters, use the official documentation link above.

---

## When to use logic

- **Conditionals:** Show optional sections only when data exists (e.g. nutrition block only if `{{schema:Recipe:nutrition}}` is present).
- **Variable assignment:** Assign a value once and reuse it in the template to avoid repeating long expressions.
- **Fallbacks:** Provide a default when a variable is empty so the note still looks correct.
- **Loops:** Iterate over arrays (ingredients, steps, tags) to format each item; combine with filters for list/table output.

Keep simple templates simple; add logic only when it improves the result or avoids broken output for missing data.

---

## Conditionals

Conditionals include or exclude blocks based on whether a value exists or meets a condition.

- **Comparison operators:** Compare two values (e.g. equals, not equals, greater than, less than). Exact operators are defined in the official Logic page.
- **Logical operators:** Combine or negate conditions (e.g. and, or, not; or symbol forms like `&&`, `||`, `!`). Use these to build compound conditions.
- **Truthiness:** Values are evaluated in a JavaScript-like way for conditions. Empty strings, empty arrays, and missing variables are typically falsy; non-empty values are truthy. See the official docs for the full rules.
- **Typical use:** Wrap optional sections (e.g. author, nutrition, image) in a conditional so they only render when the variable has a value.

---

## Assign a variable

You can assign a variable once and reuse it in the same template. Use this to avoid repeating long variable or filter chains (e.g. the same schema path or selector used in multiple places). The assigned variable is available for the rest of the template in that scope. Exact syntax (e.g. assignment block format and scope) is in the official Logic documentation.

---

## Fallbacks

Fallbacks supply a default when a variable is empty.

- **Default when missing:** Provide a fallback value so the template still produces readable output when the primary variable is empty.
- **Chaining fallbacks:** You can chain multiple fallbacks (e.g. try variable A, then B, then a literal default). The first non-empty value is used.
- **With filters:** Fallbacks can be used together with filters. The evaluation order (variable → fallback → filter, or other) is defined in the official docs under "With filters" and "Evaluation order."

---

## Loops

Loops iterate over array values (e.g. ingredients, instructions, tags).

- **Loop sources:** The array to iterate over—typically a variable that returns a list (e.g. `{{schema:Recipe:recipeIngredient}}`, `{{schema:Recipe:recipeInstructions}}`).
- **Loop variables:** Inside the loop you get a variable for the current item; you may also get an index or other loop metadata. Names and behavior are described in the official "Loop variables" and "Accessing array items by index" sections.
- **Accessing array items by index:** When you need the nth item of an array outside a loop, or need the current index inside a loop, the syntax is defined in the official documentation.
- **Nested loops:** Loops can be nested when you have arrays of structured data (e.g. steps each with sub-steps).
- **Combine logic:** Loops and conditionals can be combined (e.g. loop over items and show a subsection only when a field exists, or conditionally include a loop).

---

## Evaluation order and combining logic

The order in which variables, filters, fallbacks, conditionals, and loops are evaluated is defined in the official documentation. When you combine logic (e.g. conditionals inside loops, or variables used in both conditionals and output), follow the official "Evaluation order" and "Combine logic" sections so behavior matches expectations.

---

## Template validation

The Obsidian Web Clipper template editor **validates template syntax**. Invalid logic (e.g. malformed conditionals or loops) will be reported in the editor. When generating templates, use only logic constructs and syntax described on the official Logic page so that the template passes validation.
