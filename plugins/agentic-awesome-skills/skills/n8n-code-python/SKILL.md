---
name: n8n-code-python
description: Write Python code in n8n Code nodes. Use when writing Python in n8n, using _input/_json/_node syntax, working with standard library, or need to understand Python limitations in n8n Code nodes.
risk: critical
source: community
date_added: "2026-01-30"
---

# Python Code Node (Native)

## When to Use

Use for bounded Python transformations in an n8n Code node when native nodes or
expressions are insufficient. Check the installed n8n version and task runner first.

## Runtime contract

n8n 2 removed the legacy Pyodide runtime. Native Python uses `_items` in all-items
mode and `_item` in per-item mode; legacy `_input`, `_json`, `_node` and `_now`
helpers are unavailable. Self-hosted imports depend on installed runner packages
and explicit allowlists. Cloud imports may be unavailable, including standard
modules. JavaScript imports are restricted too; switching languages does not
provide unrestricted filesystem, networking or package access.

## Examples

All-items mode, with no imports:

```python
return [
    {"json": {"id": item["json"].get("id"), "processed": True},
     "pairedItem": {"item": index}}
    for index, item in enumerate(_items)
    if item["json"].get("active")
]
```

Per-item mode:

```python
return {"json": {**_item["json"], "name_upper": (_item["json"].get("name") or "").upper()}}
```

Validate actual input types before string operations. Use HTTP Request nodes with
managed credentials for remote calls and enforce allowed destinations. Do not log
payloads/tokens or execute code supplied by webhook users. Keep item count, input
size and runtime bounded; prepare changes in an inactive test workflow before
activating workflows that send messages, spend money or modify external systems.

## Detailed Guide

Read [the guide](references/detailed-guide.md) for transformation patterns and
migration caveats. The referenced upstream auxiliary files are not bundled.

## Limitations

No workflow or runner is included. Import availability and output normalization
must be checked in the deployed version; item linking, binary data and aggregation
require explicit handling. No runtime tests are established by these examples.

Primary runtime reference: [n8n Code node documentation source](https://github.com/n8n-io/n8n-docs/blob/main/docs/reusable-content/.gitbook/includes/integrations/builtin/core-nodes/code-node.md).
