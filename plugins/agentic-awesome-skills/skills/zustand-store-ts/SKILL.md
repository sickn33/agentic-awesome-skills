---
name: zustand-store-ts
description: "Create Zustand stores following established patterns with proper TypeScript types and middleware."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Zustand Store

Create Zustand stores following established patterns with proper TypeScript types and middleware.

## Quick Start

Copy the template from assets/template.ts and replace placeholders:
- `{{StoreName}}` → PascalCase store name (e.g., `Project`)
- `{{description}}` → Brief description for JSDoc

## Always Use subscribeWithSelector

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useMyStore = create<MyStore>()(
  subscribeWithSelector((set, get) => ({
    // state and actions
  }))
);
```

## Separate State and Actions

```typescript
export interface MyState {
  items: Item[];
  isLoading: boolean;
}

export interface MyActions {
  addItem: (item: Item) => void;
  loadItems: () => Promise<void>;
}

export type MyStore = MyState & MyActions;
```

## Use Individual Selectors

```typescript
// Good - only re-renders when `items` changes
const items = useMyStore((state) => state.items);

// Avoid - re-renders on any state change
const { items, isLoading } = useMyStore();
```

## Subscribe Outside React

```typescript
useMyStore.subscribe(
  (state) => state.selectedId,
  (selectedId) => console.log('Selected:', selectedId)
);
```

## Integration Steps

1. Create store in `src/frontend/src/store/`
2. Export from `src/frontend/src/store/index.ts`
3. Add tests in `src/frontend/src/store/*.test.ts`

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
