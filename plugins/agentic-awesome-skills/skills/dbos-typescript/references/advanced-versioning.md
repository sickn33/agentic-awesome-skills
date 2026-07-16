---
title: Use Versioning for Blue-Green Deployments
impact: LOW
impactDescription: Enables safe deployment of new code versions alongside old ones
tags: advanced, versioning, blue-green, deployment
---

## Use Versioning for Blue-Green Deployments

Set `applicationVersion` in configuration to tag workflows with a version. DBOS only recovers workflows matching the current application version, preventing code mismatches during recovery.

**Incorrect (deploying new code that breaks in-progress workflows):**

```typescript
DBOS.setConfig({
  name: "my-app",
  systemDatabaseUrl: process.env.DBOS_SYSTEM_DATABASE_URL,
  // No version set - all workflows recovered regardless of code version
});
```

**Correct (versioned deployment):**

```typescript
DBOS.setConfig({
  name: "my-app",
  systemDatabaseUrl: process.env.DBOS_SYSTEM_DATABASE_URL,
  applicationVersion: "2.0.0",
});
```

By default, the application version is automatically computed from a hash of workflow source code. Set it explicitly for more control.

**Blue-green deployment strategy:**

1. Deploy new version (v2) alongside old version (v1)
2. Direct new traffic to v2 processes
3. Let v1 processes "drain" (complete in-progress workflows)
4. Check for remaining v1 workflows:

```typescript
const oldWorkflows = await DBOS.listWorkflows({
  applicationVersion: "1.0.0",
  status: "PENDING",
});
```

5. Once all v1 workflows are complete, retire v1 processes

**Fork to new version (for stuck workflows):**

```typescript
// Fork a workflow from a failed step to run on the new version
const handle = await DBOS.forkWorkflow<string>(
  workflowID,
  failedStepID,
  { applicationVersion: "2.0.0" }
);
```

Reference: [Versioning](https://docs.dbos.dev/typescript/tutorials/upgrading-workflows#versioning)
