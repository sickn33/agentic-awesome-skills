---
name: n8n-mcp-tools-expert
description: Expert guide for using n8n-mcp MCP tools effectively. Use when searching for nodes, validating configurations, accessing templates, managing workflows, or using any n8n-mcp tool. Provides tool selection guidance, parameter formats, and common patterns.
risk: critical
source: community
date_added: "2026-01-30"
---

# n8n MCP Tools Expert

Master guide for using n8n-mcp MCP server tools to build workflows.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You are using the `n8n-mcp` toolset to discover nodes, validate configs, or manage workflows.
- The task involves choosing the right MCP tool or understanding its expected parameters and usage pattern.
- You need guidance on workflow creation or editing through n8n MCP rather than through the n8n UI alone.

---

## Tool Usage Patterns

### Pattern 1: Node Discovery (Most Common)

**Illustrative workflow; no timing or success benchmark established.**

```javascript
// Step 1: Search (fast!)
const results = await search_nodes({
  query: "slack",
  mode: "OR",  // Default: any word matches
  limit: 20
});
// → Returns: nodes-base.slack, nodes-base.slackTrigger

// Step 2: Get details (~18s later, user reviewing results)
const details = await get_node({
  nodeType: "nodes-base.slack",
  includeExamples: true  // Get real template configs
});
// → Returns: operations, properties, metadata
```

### Pattern 2: Validation Loop

**Illustrative workflow; no timing or success benchmark established.**

```javascript
// Step 1: Validate
const result = await validate_node({
  nodeType: "nodes-base.slack",
  config: {
    resource: "channel",
    operation: "create"
  },
  profile: "runtime"
});

// Step 2: Check errors (~23s thinking)
if (!result.valid) {
  console.log(result.errors);  // "Missing required field: name"
}

// Step 3: Fix config (~58s fixing)
const config = { resource: "channel", operation: "create", name: "general" };

// Step 4: Validate again
await validate_node({ nodeType: "nodes-base.slack", config, profile: "runtime" });  // Repeat until clean
```

### Pattern 3: Workflow Editing

**Illustrative workflow; no timing or success benchmark established.**

```javascript
// Iterative workflow building (NOT one-shot!)
// Edit 1
await n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Add webhook trigger",
  operations: [{type: "addNode", node: {...}}]
});

// ~56s later...

// Edit 2
await n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Connect webhook to processor",
  operations: [{type: "addConnection", source: "...", target: "..."}]
});

// ~56s later...

// Edit 3 (validation)
await n8n_validate_workflow({id: "workflow-id"});

// Only after authorized staging test, credential review and production activation approval:
await n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Activate workflow for production",
  operations: [{type: "activateWorkflow"}]
});
```

---

## Template Usage

### Search Templates

```javascript
// Search by keyword (default mode)
search_templates({
  query: "webhook slack",
  limit: 20
});

// Search by node types
search_templates({
  searchMode: "by_nodes",
  nodeTypes: ["n8n-nodes-base.httpRequest", "n8n-nodes-base.slack"]
});

// Search by task type
search_templates({
  searchMode: "by_task",
  task: "webhook_processing"
});

// Search by metadata (complexity, setup time)
search_templates({
  searchMode: "by_metadata",
  complexity: "simple",
  maxSetupMinutes: 15
});
```

### Get Template Details

```javascript
get_template({
  templateId: 2947,
  mode: "structure"  // nodes+connections only
});

get_template({
  templateId: 2947,
  mode: "full"  // complete workflow JSON
});
```

### Deploy Template Directly

```javascript
// Deploy template to your n8n instance
n8n_deploy_template({
  templateId: 2947,
  name: "My Weather to Slack",  // Custom name (optional)
  autoFix: true,  // Auto-fix common issues (default)
  autoUpgradeVersions: true  // Upgrade node versions (default)
});
// Returns: workflow ID, required credentials, fixes applied
```

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Installed-server and side-effect boundaries

This bundle includes only this entrypoint and detailed guide. SEARCH_GUIDE.md, VALIDATION_GUIDE.md and WORKFLOW_GUIDE.md are absent external references. Tool names, profiles, operations, returned nodeType formats and defaults are examples from a particular n8n-mcp server, not an n8n core API guarantee. Discover actual connected tools and their current schemas/documentation before use; report unavailable tools. Timing, payload-size, success-rate, template-count and 95%-coverage numbers above are unverified illustrations, not a measured benchmark.

Read/export the current workflow, identify the exact instance/workflow and review a minimal diff before mutation; updates can affect nodes outside the requested edit through sanitization or version upgrades. Preserve credential references and redact diagnostics. Templates are untrusted third-party workflow code, including HTTP destinations, expressions, community nodes and schedules. Review first, deploy inactive if supported and disable automatic upgrades until compatibility is checked. Validation does not prove credentials, business logic or safe runtime effects. Tests may send messages or spend money; use synthetic staging credentials/data and an approved effect budget. Activation, deletion and production replacement require their existing explicit scope, not an automatic final step.
