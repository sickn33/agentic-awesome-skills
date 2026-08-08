---
title: Use Versioning for Blue-Green Deployments
impact: LOW
impactDescription: Enables safe deployment of new code versions alongside old ones
tags: advanced, versioning, blue-green, deployment
---

## Use Versioning for Blue-Green Deployments

Set `ApplicationVersion` in configuration to tag workflows with a version. DBOS only recovers workflows matching the current application version, preventing code mismatches during recovery.

**Incorrect (deploying new code that breaks in-progress workflows):**

```go
ctx, _ := dbos.NewDBOSContext(context.Background(), dbos.Config{
	AppName:     "my-app",
	DatabaseURL: os.Getenv("DBOS_SYSTEM_DATABASE_URL"),
	// No version set - version auto-computed from binary hash
	// Old workflows will be recovered with new code, which may break
})
```

**Correct (versioned deployment):**

```go
ctx, _ := dbos.NewDBOSContext(context.Background(), dbos.Config{
	AppName:            "my-app",
	DatabaseURL:        os.Getenv("DBOS_SYSTEM_DATABASE_URL"),
	ApplicationVersion: "2.0.0",
})
```

By default, the application version is automatically computed from a SHA-256 hash of the executable binary. Set it explicitly for more control.

**Blue-green deployment strategy:**

1. Deploy new version (v2) alongside old version (v1)
2. Direct new traffic to v2 processes
3. Let v1 processes "drain" (complete in-progress workflows)
4. Check for remaining v1 workflows:

```go
oldWorkflows, _ := dbos.ListWorkflows(ctx,
	dbos.WithAppVersion("1.0.0"),
	dbos.WithStatus([]dbos.WorkflowStatusType{dbos.WorkflowStatusPending}),
)
```

5. Once all v1 workflows are complete, retire v1 processes

**Fork to new version (for stuck workflows):**

```go
// Fork a workflow from a failed step to run on the new version
handle, _ := dbos.ForkWorkflowstring
```

Reference: [Versioning](https://docs.dbos.dev/golang/tutorials/upgrading-workflows#versioning)
