---
title: List and Inspect Workflows
impact: MEDIUM
impactDescription: Enables monitoring and debugging of workflow executions
tags: workflow, list, inspect, status, monitoring
---

## List and Inspect Workflows

Use `dbos.ListWorkflows` to query workflow executions by status, name, time range, and other criteria.

**Incorrect (no monitoring of workflow state):**

```go
// Start workflow with no way to check on it later
dbos.RunWorkflow(ctx, processTask, "data")
// If something goes wrong, no way to find or debug it
```

**Correct (listing and inspecting workflows):**

```go
// List workflows by status
erroredWorkflows, err := dbos.ListWorkflows(ctx,
	dbos.WithStatus([]dbos.WorkflowStatusType{dbos.WorkflowStatusError}),
)

for _, wf := range erroredWorkflows {
	fmt.Printf("Workflow %s: %s - %v\n", wf.ID, wf.Name, wf.Error)
}
```

List workflows with multiple filters:

```go
workflows, err := dbos.ListWorkflows(ctx,
	dbos.WithName("processOrder"),
	dbos.WithStatus([]dbos.WorkflowStatusType{dbos.WorkflowStatusSuccess}),
	dbos.WithLimit(100),
	dbos.WithSortDesc(),
	dbos.WithLoadOutput(true),
)
```

List workflow steps:

```go
steps, err := dbos.GetWorkflowSteps(ctx, workflowID)
for _, step := range steps {
	fmt.Printf("Step %d: %s\n", step.StepID, step.StepName)
	if step.Error != nil {
		fmt.Printf("  Error: %v\n", step.Error)
	}
	if step.ChildWorkflowID != "" {
		fmt.Printf("  Child: %s\n", step.ChildWorkflowID)
	}
}
```

Workflow status values: `WorkflowStatusPending`, `WorkflowStatusEnqueued`, `WorkflowStatusSuccess`, `WorkflowStatusError`, `WorkflowStatusCancelled`, `WorkflowStatusMaxRecoveryAttemptsExceeded`

To optimize performance, avoid loading inputs/outputs when you don't need them (they are not loaded by default).

Reference: [Workflow Management](https://docs.dbos.dev/golang/tutorials/workflow-management#listing-workflows)
