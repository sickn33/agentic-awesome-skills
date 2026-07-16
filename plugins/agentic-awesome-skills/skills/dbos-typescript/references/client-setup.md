---
title: Initialize DBOSClient for External Access
impact: MEDIUM
impactDescription: Enables external applications to interact with DBOS workflows
tags: client, external, setup, initialization
---

## Initialize DBOSClient for External Access

Use `DBOSClient` to interact with DBOS from external applications like API servers, CLI tools, or separate services. `DBOSClient` connects directly to the DBOS system database.

**Incorrect (using DBOS directly from an external app):**

```typescript
// DBOS requires full setup with launch() - too heavy for external clients
DBOS.setConfig({ ... });
await DBOS.launch();
```

**Correct (using DBOSClient):**

```typescript
import { DBOSClient } from "@dbos-inc/dbos-sdk";

const client = await DBOSClient.create({
  systemDatabaseUrl: process.env.DBOS_SYSTEM_DATABASE_URL,
});

// Send a message to a workflow
await client.send(workflowID, "notification", "topic");

// Get an event from a workflow
const event = await client.getEvent<string>(workflowID, "status");

// Read a stream from a workflow
for await (const value of client.readStream(workflowID, "results")) {
  console.log(value);
}

// Retrieve a workflow handle
const handle = client.retrieveWorkflow<string>(workflowID);
const result = await handle.getResult();

// List workflows
const workflows = await client.listWorkflows({ status: "ERROR" });

// Workflow management
await client.cancelWorkflow(workflowID);
await client.resumeWorkflow(workflowID);

// Always destroy when done
await client.destroy();
```

Constructor options:
- `systemDatabaseUrl`: Connection string to the Postgres system database (required)
- `systemDatabasePool`: Optional custom `node-postgres` connection pool
- `serializer`: Optional custom serializer (must match the DBOS application's serializer)

Reference: [DBOS Client](https://docs.dbos.dev/typescript/reference/client)
