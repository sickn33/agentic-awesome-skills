# Artifact Design Doctrine

Use this layer when a skill produces user-facing artifacts: HTML reports, Markdown tutorials, review viewers, dashboards, screenshots, tables, slide-like pages, or generated skill overview pages.

## Principle

Output quality is part of skill quality. A generated skill should not only know what to do; it should also know how its final artifact should read, scan, and hold up under review.

The visual system must follow the artifact's purpose. Do not inherit a fixed house style just because a reference skill uses one. For example, Kami's paper-editorial discipline is useful, but its warm parchment background is not a default requirement for Yao-generated artifacts.

## What To Borrow From Document Skills

- route by artifact type before designing the page
- extract facts, claims, numbers, actions, and missing inputs before formatting
- ask one focused question when the artifact lacks a necessary audience, input, or output standard
- keep prose, layout, and production checks separated
- verify placeholders, headings, paths, screenshots, and render-critical assumptions before delivery

## What To Borrow From Presentation Skills

- plan the artifact's role, hierarchy, density, rhythm, and evidence before writing HTML
- choose a concrete visual direction from the topic, not from a generic AI template
- use structure, spacing, type, and contrast before decoration
- split dense content instead of squeezing it into one surface
- reject generic purple gradients, glass cards, repeated card grids, and decorative screenshots

## Content-Led Visual Direction

Pick the design system from the work:

- high-trust reports: restrained editorial layout, strong hierarchy, compact evidence blocks
- tutorials: clear progressive sections, success checks, screenshots only when real and necessary
- dashboards: compact metrics, visible deltas, short explanations, no paragraph-heavy tables
- review viewers: side-by-side comparison, reviewer-visible evidence, explicit tradeoffs
- slide-like artifacts: rhythm, section breaks, big claims, controlled density

## Non-Negotiables

- headings must be specific to the user's domain and outcome
- tables are used only when comparison is the main job
- citations and footnotes must not interrupt ordinary reading
- screenshots and visual evidence must be real, sourceable, and correctly described
- final HTML must not contain absolute local filesystem paths
- mobile and narrow-width reading must remain usable
- design tokens must be named and coherent: type, color, spacing, surface, and emphasis

## Reviewer Rule

Reviewers should see both the artifact's intended visual direction and the top risks that could make the output feel low quality. If a report looks polished but hides weak headings, bad tables, wrong screenshots, or citation clutter, the skill is not ready.
