---
title: Initialize Client for External Access
impact: HIGH
impactDescription: Enables external applications to interact with DBOS workflows
tags: client, external, setup, initialization
---

## Initialize Client for External Access

Use `dbos.NewClient` to interact with DBOS from external applications like API servers, CLI tools, or separate services. The Client connects directly to the DBOS system database.

**Incorrect (using full DBOS context from an external app):**

```go
// Full DBOS context requires Launch() - too heavy for external clients
ctx, _ := dbos.NewDBOSContext(context.Background(), config)
dbos.Launch(ctx)
```

**Correct (using Client):**

```go
client, err := dbos.NewClient(context.Background(), dbos.ClientConfig{
	DatabaseURL: os.Getenv("DBOS_SYSTEM_DATABASE_URL"),
})
if err != nil {
	log.Fatal(err)
}
defer client.Shutdown(10 * time.Second)

// Send a message to a workflow
err = client.Send(workflowID, "notification", "topic")

// Get an event from a workflow
event, err := client.GetEvent(workflowID, "status", 60*time.Second)

// Retrieve a workflow handle
handle, err := client.RetrieveWorkflow(workflowID)
result, err := handle.GetResult()

// List workflows
workflows, err := client.ListWorkflows(
	dbos.WithStatus([]dbos.WorkflowStatusType{dbos.WorkflowStatusError}),
)

// Workflow management
err = client.CancelWorkflow(workflowID)
handle, err = client.ResumeWorkflow(workflowID)

// Read a stream
values, closed, err := client.ClientReadStream(workflowID, "results")

// Read a stream asynchronously
ch, err := client.ClientReadStreamAsync(workflowID, "results")
```

ClientConfig options:
- `DatabaseURL` (required unless `SystemDBPool` is set): PostgreSQL connection string
- `SystemDBPool`: Custom `*pgxpool.Pool`
- `DatabaseSchema`: Schema name (default: `"dbos"`)
- `Logger`: Custom `*slog.Logger`

Always call `client.Shutdown()` when done.

Reference: [DBOS Client](https://docs.dbos.dev/golang/reference/client)
