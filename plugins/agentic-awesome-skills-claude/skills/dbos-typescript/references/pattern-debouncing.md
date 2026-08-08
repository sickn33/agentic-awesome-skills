---
title: Debounce Workflows to Prevent Wasted Work
impact: MEDIUM
impactDescription: Prevents redundant workflow executions during rapid triggers
tags: pattern, debounce, delay, efficiency
---

## Debounce Workflows to Prevent Wasted Work

Use `Debouncer` to delay workflow execution until some time has passed since the last trigger. This prevents wasted work when a workflow is triggered multiple times in quick succession.

**Incorrect (executing on every trigger):**

```typescript
async function processInputFn(userInput: string) {
  // Expensive processing
}
const processInput = DBOS.registerWorkflow(processInputFn);

// Every keystroke triggers a new workflow - wasteful!
async function onInputChange(userInput: string) {
  await processInput(userInput);
}
```

**Correct (using Debouncer):**

```typescript
import { DBOS, Debouncer } from "@dbos-inc/dbos-sdk";

async function processInputFn(userInput: string) {
  // Expensive processing
}
const processInput = DBOS.registerWorkflow(processInputFn);

const debouncer = new Debouncer({
  workflow: processInput,
  debounceTimeoutMs: 120000, // Max wait: 2 minutes
});

async function onInputChange(userId: string, userInput: string) {
  // Delays execution by 60 seconds from the last call
  // Uses the LAST set of inputs when finally executing
  await debouncer.debounce(userId, 60000, userInput);
}
```

Key behaviors:
- `debounceKey` groups executions that are debounced together (e.g., per user)
- `debouncePeriodMs` delays execution by this amount from the last call
- `debounceTimeoutMs` sets a max wait time since the first trigger
- When the workflow finally executes, it uses the **last** set of inputs
- After execution begins, the next `debounce` call starts a new cycle
- Workflows from `ConfiguredInstance` classes cannot be debounced

Reference: [Debouncing Workflows](https://docs.dbos.dev/typescript/tutorials/workflow-tutorial#debouncing-workflows)
