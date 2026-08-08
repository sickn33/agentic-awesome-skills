# Resource Boundary Spec

This spec defines where information belongs inside a skill package.

## Principle

Keep the main skill small enough to route and execute clearly. Move detail out of `SKILL.md` as soon as it stops helping routing or branch selection.

Do not add structure for imagined future needs. A folder, script, eval, or governance file belongs in the package only when it reduces current ambiguity, execution burden, route risk, or maintenance risk.

## Context Budget Tiers

Use the lightest budget that still fits the package.

- `scaffold`: `700` initial-load tokens
- `production`: `1000` initial-load tokens
- `library`: `1300` initial-load tokens
- `governed`: `1300` initial-load tokens

If `manifest.json` sets `context_budget_tier`, that tier overrides the default budget derived from lifecycle or maturity metadata. This allows a high-governance skill to keep a stricter initial-load budget than its lifecycle label alone would imply.

## Placement Rules

### Put content in `SKILL.md` when it is:

- part of the trigger surface
- part of the core execution skeleton
- part of the output contract
- necessary for branch selection or safe defaults

### Put content in `references/` when it is:

- domain guidance
- long examples
- policy material
- schemas or templates humans or agents may read on demand

### Put content in `scripts/` when it is:

- deterministic
- repetitive
- brittle if rewritten from prose
- easier to validate as code than as instructions

### Put content in `evals/` when:

- the skill is reused enough that routing mistakes matter
- near-neighbor confusion is likely
- quality claims should be reproducible

### Put content in `assets/` when:

- the package includes output artifacts, examples, or static files that should not bloat prompt context

## Anti-Patterns

Avoid these:

- storing long policy text directly in `SKILL.md`
- adding `references/` with no files that are actually used
- adding `scripts/` for logic that is still best expressed in prose
- adding `evals/` for one-off or disposable skills
- creating every folder by default even when empty
- keeping folders that are neither referenced in `SKILL.md` nor declared as factory components
- adding broad configuration knobs before a real variation exists
- adding governance or reports to make a scaffold look mature when no reuse pressure exists

## Heuristics

### `SKILL.md`

- should stay focused
- should not become the full knowledge base
- should mention any optional directory that materially affects execution

### `references/`

- should earn their keep
- should usually be named and discoverable from `SKILL.md`

### `scripts/`

- should exist only when deterministic logic or formatting logic is real
- should be referenced explicitly from `SKILL.md` when required for execution

### `evals/`

- should exist when routing or quality claims need to be defended
- should be skipped for disposable personal drafts

## Unused Resource Detection

`resource_boundary_check.py` warns when a non-empty optional directory appears decorative:

- the directory exists and contains files
- the main `SKILL.md` does not reference it
- and the directory is not declared in `manifest.json` factory components

This protects the package from looking more sophisticated than it actually is.

## Quality Density

The checker also reports `quality_density`, a local signal for how much governance and quality evidence is packed into the initial load budget.

It combines:

- governance score
- presence of evals
- presence of reports
- references and scripts
- interface and manifest metadata
- failure or test evidence

Higher density means the package is staying lean while still proving quality.

## Quality Intent

The best skill is not the one with the most files. The best skill is the smallest package that still makes the recurring job reliable, reusable, and auditable.

See [Authoring Discipline](authoring-discipline.md) for the author and reviewer rules that keep resource growth tied to a real user goal.
