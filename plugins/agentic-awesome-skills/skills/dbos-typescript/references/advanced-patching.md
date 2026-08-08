---
title: Use Patching for Safe Workflow Upgrades
impact: LOW
impactDescription: Safely deploy breaking workflow changes without disrupting in-progress workflows
tags: advanced, patching, upgrade, breaking-change
---

## Use Patching for Safe Workflow Upgrades

Use `DBOS.patch()` to safely deploy breaking changes to workflow code. Breaking changes alter which steps run or their order, which can cause recovery failures.

**Incorrect (breaking change without patching):**

```typescript
// BEFORE: original workflow
async function workflowFn() {
  await foo();
  await bar();
}
const workflow = DBOS.registerWorkflow(workflowFn);

// AFTER: breaking change - recovery will fail for in-progress workflows!
async function workflowFn() {
  await baz(); // Changed step
  await bar();
}
const workflow = DBOS.registerWorkflow(workflowFn);
```

**Correct (using patch):**

```typescript
async function workflowFn() {
  if (await DBOS.patch("use-baz")) {
    await baz(); // New workflows run this
  } else {
    await foo(); // Old workflows continue with original code
  }
  await bar();
}
const workflow = DBOS.registerWorkflow(workflowFn);
```

`DBOS.patch()` returns `true` for new workflows and `false` for workflows that started before the patch.

**Deprecating patches (after all old workflows complete):**

```typescript
async function workflowFn() {
  if (await DBOS.deprecatePatch("use-baz")) { // Always returns true
    await baz();
  }
  await bar();
}
const workflow = DBOS.registerWorkflow(workflowFn);
```

**Removing patches (after all workflows using deprecatePatch complete):**

```typescript
async function workflowFn() {
  await baz();
  await bar();
}
const workflow = DBOS.registerWorkflow(workflowFn);
```

Lifecycle: `patch()` → deploy → wait for old workflows → `deprecatePatch()` → deploy → wait → remove patch entirely.

Use `DBOS.listWorkflows` to check for active old workflows before deprecating or removing patches.

Reference: [Patching](https://docs.dbos.dev/typescript/tutorials/upgrading-workflows#patching)
