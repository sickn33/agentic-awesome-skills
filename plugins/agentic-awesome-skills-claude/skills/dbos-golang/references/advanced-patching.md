---
title: Use Patching for Safe Workflow Upgrades
impact: LOW
impactDescription: Safely deploy breaking workflow changes without disrupting in-progress workflows
tags: advanced, patching, upgrade, breaking-change
---

## Use Patching for Safe Workflow Upgrades

Use `dbos.Patch` to safely deploy breaking changes to workflow code. Breaking changes alter which steps run or their order, which can cause recovery failures.

**Incorrect (breaking change without patching):**

```go
// BEFORE: original workflow
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	result, _ := dbos.RunAsStep(ctx, foo, dbos.WithStepName("foo"))
	_, _ = dbos.RunAsStep(ctx, bar, dbos.WithStepName("bar"))
	return result, nil
}

// AFTER: breaking change - recovery will fail for in-progress workflows!
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	result, _ := dbos.RunAsStep(ctx, baz, dbos.WithStepName("baz")) // Changed step
	_, _ = dbos.RunAsStep(ctx, bar, dbos.WithStepName("bar"))
	return result, nil
}
```

**Correct (using patch):**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	useBaz, err := dbos.Patch(ctx, "use-baz")
	if err != nil {
		return "", err
	}
	var result string
	if useBaz {
		result, _ = dbos.RunAsStep(ctx, baz, dbos.WithStepName("baz")) // New workflows
	} else {
		result, _ = dbos.RunAsStep(ctx, foo, dbos.WithStepName("foo")) // Old workflows
	}
	_, _ = dbos.RunAsStep(ctx, bar, dbos.WithStepName("bar"))
	return result, nil
}
```

`dbos.Patch` returns `true` for new workflows and `false` for workflows that started before the patch.

**Deprecating patches (after all old workflows complete):**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	dbos.DeprecatePatch(ctx, "use-baz") // Always takes the new path
	result, _ := dbos.RunAsStep(ctx, baz, dbos.WithStepName("baz"))
	_, _ = dbos.RunAsStep(ctx, bar, dbos.WithStepName("bar"))
	return result, nil
}
```

**Removing patches (after all workflows using DeprecatePatch complete):**

```go
func myWorkflow(ctx dbos.DBOSContext, input string) (string, error) {
	result, _ := dbos.RunAsStep(ctx, baz, dbos.WithStepName("baz"))
	_, _ = dbos.RunAsStep(ctx, bar, dbos.WithStepName("bar"))
	return result, nil
}
```

Lifecycle: `Patch()` → deploy → wait for old workflows → `DeprecatePatch()` → deploy → wait → remove patch entirely.

**Required configuration** — patching must be explicitly enabled:

```go
ctx, _ := dbos.NewDBOSContext(context.Background(), dbos.Config{
	AppName:        "my-app",
	DatabaseURL:    os.Getenv("DBOS_SYSTEM_DATABASE_URL"),
	EnablePatching: true, // Required for dbos.Patch and dbos.DeprecatePatch
})
```

Without `EnablePatching: true`, calls to `dbos.Patch` and `dbos.DeprecatePatch` will fail.

Reference: [Patching](https://docs.dbos.dev/golang/tutorials/upgrading-workflows#patching)
