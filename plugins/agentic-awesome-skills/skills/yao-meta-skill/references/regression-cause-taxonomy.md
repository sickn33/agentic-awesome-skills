# Regression Cause Taxonomy

This taxonomy explains how iteration regressions are classified when a description candidate is evaluated for promotion.

## Core Principle

A candidate should not be judged only by aggregate pass/fail counts. The iteration system should explain why a candidate was blocked, kept behind the current description, or promoted.

## Cause Tags

### `no_candidate_outperformed_current`

The selected winner is still the current description. No candidate earned promotion.

### `visible_holdout_regression`

The candidate regressed on the visible holdout suite by adding false positives or false negatives.

### `blind_holdout_regression`

The candidate regressed on blind holdout prompts. This blocks promotion because the failure is not only local to the tuning loop.

### `current_holdout_gap_present`

The current or selected winner still carries a visible holdout miss. Promotion may still stay on `keep_current`, but the iteration bundle should show the unresolved gap.

### `current_holdout_risk`

The visible holdout calibration still looks risky even when promotion is not blocked. This is an audit signal that the route boundary needs future work.

### `judge_blind_regression`

The rubric judge found worse blind-holdout behavior than the current or baseline description.

### `judge_blind_low_agreement`

The judge-backed blind evaluation did not produce enough agreement confidence to support promotion.

### `adversarial_regression`

The candidate performed worse on adversarial holdout prompts that simulate route collisions or disguised requests.

### `adversarial_overlap_risk`

The adversarial calibration layer reports an `overlap` risk band, meaning route boundaries are too weak for safe promotion.

### `adversarial_watch_risk`

The adversarial calibration layer reports a non-failing but cautionary risk band such as `watch` or `tight`.

### `family_instability`

At least one tracked family stops being clean under blind, judge-backed blind, or adversarial evaluation.

### `route_confusion`

The route confusion matrix shows route theft or misrouting between sibling skills.

### `route_ambiguity`

The route confusion matrix reports ambiguous cases near the configured margin-warning threshold.

### `longer_without_gain`

The candidate is materially longer than the current description without producing a better route outcome.

### `promotion_ready`

The candidate passed every promotion gate and is eligible for review and promotion.

## Usage

These cause tags should appear in:

- promotion decisions
- iteration bundles
- regression histories
- human review summaries

They are intended to make iteration auditable rather than merely descriptive.
