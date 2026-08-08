# Angular UI Patterns

Modern UI patterns for building robust Angular applications optimized for AI agents and LLMs.

## Overview

This skill covers essential UI patterns for:

- **Loading States** - Skeleton vs spinner decision trees
- **Error Handling** - Error boundary hierarchy and recovery
- **Progressive Disclosure** - Using `@defer` for lazy rendering
- **Data Display** - Handling empty, loading, and error states
- **Form Patterns** - Submission states and validation feedback
- **Dialog/Modal Patterns** - Proper dialog lifecycle management

## Core Principles

1. **Never show stale UI** - Only show loading when no data exists
2. **Surface all errors** - Never silently fail
3. **Optimistic updates** - Update UI before server confirms
4. **Progressive disclosure** - Use `@defer` to load non-critical content
5. **Graceful degradation** - Fallback for failed features

## Structure

The `SKILL.md` file includes:

1. **Golden Rules** - Non-negotiable patterns to follow
2. **Decision Trees** - When to use skeleton vs spinner
3. **Code Examples** - Correct vs incorrect implementations
4. **Anti-patterns** - Common mistakes to avoid

## Quick Reference

```html
<!-- Angular template pattern for data states -->
@if (error()) {
<app-error-state [error]="error()" (retry)="load()" />
} @else if (loading() && !data()) {
<app-skeleton-state />
} @else if (!data()?.length) {
<app-empty-state message="No items found" />
} @else {
<app-data-display [data]="data()" />
}
```

## Version

Current version: 1.0.0 (February 2026)

## References

- [Angular @defer](https://angular.dev/guide/defer)
- [Angular Templates](https://angular.dev/guide/templates)
