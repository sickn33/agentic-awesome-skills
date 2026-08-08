# Angular State Management

Complete state management patterns for Angular applications optimized for AI agents and LLMs.

## Overview

This skill provides decision frameworks and implementation patterns for:

- **Signal-based Services** - Lightweight state for shared data
- **NgRx SignalStore** - Feature-scoped state with computed values
- **NgRx Store** - Enterprise-scale global state management
- **RxJS ComponentStore** - Reactive component-level state
- **Forms State** - Reactive and template-driven form patterns

## Structure

The `SKILL.md` file is organized into:

1. **State Categories** - Local, shared, global, server, URL, and form state
2. **Selection Criteria** - Decision trees for choosing the right solution
3. **Implementation Patterns** - Complete examples for each approach
4. **Migration Guides** - Moving from BehaviorSubject to Signals
5. **Bridging Patterns** - Integrating Signals with RxJS

## When to Use Each Pattern

- **Signal Service**: Shared UI state (theme, user preferences)
- **NgRx SignalStore**: Feature state with computed values
- **NgRx Store**: Complex cross-feature dependencies
- **ComponentStore**: Component-scoped async operations
- **Reactive Forms**: Form state with validation

## Version

Current version: 1.0.0 (February 2026)

## References

- [Angular Signals](https://angular.dev/guide/signals)
- [NgRx](https://ngrx.io)
- [NgRx SignalStore](https://ngrx.io/guide/signals)
