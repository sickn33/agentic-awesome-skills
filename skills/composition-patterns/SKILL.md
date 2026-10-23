---
name: composition-patterns
description: "Use when working with composition-patterns tasks or workflows"
risk: safe
source: "https://github.com/vercel-labs/agent-skills"
date_added: "2026-06-02"
---

# React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid
boolean prop proliferation by using compound components, lifting state, and
composing internals. These patterns make codebases easier for both humans and AI
agents to work with as they scale.

## When to Use
Reference these guidelines when:

- Refactoring components with many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Working with compound components or context providers

## Rule Categories by Priority

| Priority | Category                | Impact | Prefix          |
| -------- | ----------------------- | ------ | --------------- |
| 1        | Component Architecture  | HIGH   | `architecture-` |
| 2        | State Management        | MEDIUM | `state-`        |
| 3        | Implementation Patterns | MEDIUM | `patterns-`     |
| 4        | React 19 APIs           | MEDIUM | `react19-`      |

## Quick Reference

### 1. Component Architecture (HIGH)

- `architecture-avoid-boolean-props` - Don't add boolean props to customize
  behavior; use composition
- `architecture-compound-components` - Structure complex components with shared
  context

### 2. State Management (MEDIUM)

- `state-decouple-implementation` - Provider is the only place that knows how
  state is managed
- `state-context-interface` - Define generic interface with state, actions, meta
  for dependency injection
- `state-lift-state` - Move state into provider components for sibling access

### 3. Implementation Patterns (MEDIUM)

- `patterns-explicit-variants` - Create explicit variant components instead of
  boolean modes
- `patterns-children-over-render-props` - Use children for composition instead
  of renderX props

### 4. React 19 APIs (MEDIUM)

> **⚠️ React 19+ only.** Skip this section if using React 18 or earlier.

- `react19-no-forwardref` - Prefer ref-as-prop for React 19-only components; `use()` and `useContext()` are both supported

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/architecture-avoid-boolean-props.md
rules/state-context-interface.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

No compiled AGENTS.md is bundled here; use the individual rule files.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Version, completeness and behavior boundaries

All examples using `<Context value>`, `use(Context)` or ref-as-prop assume React 19, including files outside the react19 category. React 18 consumers need Context.Provider, useContext and forwardRef adapters. useContext remains a valid supported API in React 19; migrate only when useful. Null-default contexts require the guarded useComposer helper shown in the compound-component rule, imported wherever used.

Snippets omit application components, imports and some types; TextInput/onChangeText/onPress are React Native-style or custom abstractions, not browser input/button props. Supply meta.inputRef in every provider used by an input, type refs as nullable, forward placeholder/label props and handle submit semantics deliberately. Composer.Frame currently renders a form: wire onSubmit/preventDefault and button types to avoid reloads or duplicate sends. Explicit variants do not prove impossible states or preserve existing behavior automatically. Simple boolean state props such as disabled remain appropriate; composition is a design choice, not a universal ban.
