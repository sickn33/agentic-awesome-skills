# Angular Best Practices

Performance optimization and best practices for Angular applications optimized for AI agents and LLMs.

## Overview

This skill provides prioritized performance guidelines across:

- **Change Detection** - OnPush strategy, Signals, Zoneless apps
- **Async Operations** - Avoiding waterfalls, SSR preloading
- **Bundle Optimization** - Lazy loading, `@defer`, tree-shaking
- **Rendering Performance** - TrackBy, virtual scrolling, CDK
- **SSR & Hydration** - Server-side rendering patterns
- **Template Optimization** - Structural directives, pipe memoization
- **State Management** - Efficient reactivity patterns
- **Memory Management** - Subscription cleanup, detached refs

## Structure

The `SKILL.md` file is organized by priority:

1. **Critical Priority** - Largest performance gains (change detection, async)
2. **High Priority** - Significant impact (bundles, rendering)
3. **Medium Priority** - Noticeable improvements (SSR, templates)
4. **Low Priority** - Incremental gains (memory, cleanup)

Each rule includes:

- ❌ **WRONG** - What not to do
- ✅ **CORRECT** - Recommended pattern
- 📝 **Why** - Explanation of the impact

## Quick Reference Checklist

**For New Components:**

- [ ] Using `ChangeDetectionStrategy.OnPush`
- [ ] Using Signals for reactive state
- [ ] Using `@defer` for non-critical content
- [ ] Using `trackBy` for `*ngFor` loops
- [ ] No subscriptions without cleanup

**For Performance Reviews:**

- [ ] No async waterfalls (parallel data fetching)
- [ ] Routes lazy-loaded
- [ ] Large libraries code-split
- [ ] Images use `NgOptimizedImage`

## Version

Current version: 1.0.0 (February 2026)

## References

- [Angular Performance](https://angular.dev/guide/performance)
- [Zoneless Angular](https://angular.dev/guide/zoneless)
- [Angular SSR](https://angular.dev/guide/ssr)
