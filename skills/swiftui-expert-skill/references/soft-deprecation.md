# Handling Soft-Deprecated APIs

This file covers *how to behave* when you encounter soft-deprecated SwiftUI APIs. For the actual list of deprecated-to-modern transitions, see `references/latest-apis.md`.

## What "soft-deprecated" means

A soft-deprecated API is marked deprecated in the SDK headers but with a placeholder deprecation version (`100000.0`) that suppresses compiler warnings. It still compiles and works correctly — it just signals that the API shouldn't be used in new code. Examples include `NavigationView` (use `NavigationStack` / `NavigationSplitView`), `ActionSheet` / `Alert` (use the `.confirmationDialog` / `.alert` modifiers), `MagnificationGesture` (renamed `MagnifyGesture`), and `PresentationMode` (use `\.dismiss`).

Because these still work, treat them as **informational**, not urgent.

## Scoping rule — read this first

All soft-deprecation guidance is scoped to the code you are **directly modifying**. If a file contains several views and the task touches only one, the other views are out of scope.

- Only discuss the view(s) you actually edited.
- Do not mention, flag, or offer to migrate soft-deprecated APIs in code you weren't asked to change — including trailing "while I'm here, want me to migrate `OtherView`?" questions.
- This takes precedence over any prompt asking for "observations" or "other notes."

Mentioning soft-deprecated APIs in untouched code creates noise, distracts from the task, and pressures the user into unrelated work.

## When generating new code

Never introduce a new usage of a soft-deprecated API. If you're unsure whether an API is soft-deprecated, check `references/latest-apis.md` before recommending it — any API that worked in a prior release could have been soft-deprecated since.

## When asked to review, refactor, modernize, or clean up

Point out soft-deprecated APIs in the code under review and suggest the modern replacement. Keep the tone informational — these still compile and run, so frame migration as an improvement, not a bug fix.

## When asked to add a feature or fix a bug

If the view you're editing already uses a soft-deprecated API, **keep it as-is** in your change. Don't silently swap `NavigationView` for `NavigationStack` while adding a search bar — that produces unexpected diffs, risks regressions (state resets, navigation behavior changes), and makes the change harder to review. After delivering the requested change, you may add a brief one-line offer to migrate as a separate step.

If a *different* view in the same file uses a soft-deprecated API, ignore it entirely (see the scoping rule).

## General guidance

- Never introduce new usages of soft-deprecated APIs in code written from scratch.
- Don't proactively scan a codebase for soft-deprecated APIs — only notice them when they appear in code you're directly modifying for the user's request.
- Migrations are real edits with behavioral risk; they belong in their own focused change, not bundled into unrelated work.
