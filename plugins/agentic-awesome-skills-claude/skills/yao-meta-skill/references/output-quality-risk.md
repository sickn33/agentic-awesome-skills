# Output Quality Risk

Use this layer when a generated skill produces user-facing artifacts such as tutorials, reports, Markdown pages, screenshots, tables, code snippets, or research summaries.

## Principle

A skill is not complete when it can route and execute. It also needs to predict how its final output can fail in small but visible ways, then constrain those failures before the user sees them.

## Common Failure Modes

- generic headings that make a tutorial feel templated
- dense footnotes or citation markers that interrupt reading
- tables that render poorly or hide decisions inside long cells
- screenshot references that point to the wrong state, crop, or missing asset
- polished summaries that lose the user's actual audience or scenario
- commands or snippets that omit working directory, inputs, outputs, or side effects

## Required Author Behavior

Before finalizing a generated skill:

1. infer the most likely output families from the job and target output
2. generate `reports/output-risk-profile.md`
3. generate `reports/artifact-design-profile.md` when the output is a report, tutorial, viewer, dashboard, screenshot, Markdown page, or visual artifact
4. add output-specific constraints to the generated skill's operating frame
5. expose the risk and design profiles in the review viewer
6. treat unresolved output risks as iteration candidates instead of pretending the first version is complete

## Self-Repair Rule

Every output-facing skill should do a final pass for:

- specificity: headings, titles, and summaries fit the actual domain
- readability: Markdown, tables, and lists remain pleasant to scan
- evidence hygiene: citations support real claims without clutter
- visual truthfulness: screenshots and images are real, relevant, and correctly described
- execution clarity: commands and snippets name their assumptions and expected results

## Reviewer Rule

Reviewers should approve the skill only when the likely output mistakes are visible and the generated package contains a reasonable self-repair path for the highest-risk family.
