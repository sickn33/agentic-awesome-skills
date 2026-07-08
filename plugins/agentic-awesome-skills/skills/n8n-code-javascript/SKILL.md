---
name: n8n-code-javascript
description: Write JavaScript code in n8n Code nodes. Use when writing JavaScript in n8n, using $input/$json/$node syntax, making HTTP requests with $helpers, working with dates using DateTime, troubleshooting Code node errors, or choosing between Code node modes.
risk: unknown
source: community
---

# JavaScript Code Node

Expert guidance for writing JavaScript code in n8n Code nodes.

---

## Quick Start

```javascript
// Basic template for Code nodes
const items = $input.all();

// Process data
const processed = items.map(item => ({
  json: {
    ...item.json,
    processed: true,
    timestamp: new Date().toISOString()
  }
}));

return processed;
```

### Essential Rules

1. **Choose "Run Once for All Items" mode** (recommended for most use cases)
2. **Access data**: `$input.all()`, `$input.first()`, or `$input.item`
3. **CRITICAL**: Must return `[{json: {...}}]` format
4. **CRITICAL**: Webhook data is under `$json.body` (not `$json` directly)
5. **Built-ins available**: $helpers.httpRequest(), DateTime (Luxon), $jmespath()

---

## Mode Selection Guide

The Code node offers two execution modes. Choose based on your use case:

### Run Once for All Items (Recommended - Default)

**Use this mode for:** 95% of use cases

- **How it works**: Code executes **once** regardless of input count
- **Data access**: `$input.all()` or `items` array
- **Best for**: Aggregation, filtering, batch processing, transformations, API calls with all data
- **Performance**: Faster for multiple items (single execution)

```javascript
// Example: Calculate total from all items
const allItems = $input.all();
const total = allItems.reduce((sum, item) => sum + (item.json.amount || 0), 0);

return [{
  json: {
    total,
    count: allItems.length,
    average: total / allItems.length
  }
}];
```

**When to use:**
- ✅ Comparing items across the dataset
- ✅ Calculating totals, averages, or statistics
- ✅ Sorting or ranking items
- ✅ Deduplication
- ✅ Building aggregated reports
- ✅ Combining data from multiple items

### Run Once for Each Item

**Use this mode for:** Specialized cases only

- **How it works**: Code executes **separately** for each input item
- **Data access**: `$input.item` or `$item`
- **Best for**: Item-specific logic, independent operations, per-item validation
- **Performance**: Slower for large datasets (multiple executions)

```javascript
// Example: Add processing timestamp to each item
const item = $input.item;

return [{
  json: {
    ...item.json,
    processed: true,
    processedAt: new Date().toISOString()
  }
}];
```

**When to use:**
- ✅ Each item needs independent API call
- ✅ Per-item validation with different error handling
- ✅ Item-specific transformations based on item properties
- ✅ When items must be processed separately for business logic

**Decision Shortcut:**
- **Need to look at multiple items?** → Use "All Items" mode
- **Each item completely independent?** → Use "Each Item" mode
- **Not sure?** → Use "All Items" mode (you can always loop inside)

---

## Data Access Patterns

### Pattern 1: $input.all() - Most Common

**Use when**: Processing arrays, batch operations, aggregations

```javascript
// Get all items from previous node
const allItems = $input.all();

// Filter, map, reduce as needed
const valid = allItems.filter(item => item.json.status === 'active');
const mapped = valid.map(item => ({
  json: {
    id: item.json.id,
    name: item.json.name
  }
}));

return mapped;
```

### Pattern 2: $input.first() - Very Common

**Use when**: Working with single objects, API responses, first-in-first-out

```javascript
// Get first item only
const firstItem = $input.first();
const data = firstItem.json;

return [{
  json: {
    result: processData(data),
    processedAt: new Date().toISOString()
  }
}];
```

### Pattern 3: $input.item - Each Item Mode Only

**Use when**: In "Run Once for Each Item" mode

```javascript
// Current item in loop (Each Item mode only)
const currentItem = $input.item;

return [{
  json: {
    ...currentItem.json,
    itemProcessed: true
  }
}];
```

### Pattern 4: $node - Reference Other Nodes

**Use when**: Need data from specific nodes in workflow

```javascript
// Get output from specific node
const webhookData = $node["Webhook"].json;
const httpData = $node["HTTP Request"].json;

return [{
  json: {
    combined: {
      webhook: webhookData,
      api: httpData
    }
  }
}];
```

**See**: DATA_ACCESS.md for comprehensive guide

---

## Critical: Webhook Data Structure

**MOST COMMON MISTAKE**: Webhook data is nested under `.body`

```javascript
// ❌ WRONG - Will return undefined
const name = $json.name;
const email = $json.email;

// ✅ CORRECT - Webhook data is under .body
const name = $json.body.name;
const email = $json.body.email;

// Or with $input
const webhookData = $input.first().json.body;
const name = webhookData.name;
```

**Why**: Webhook node wraps all request data under `body` property. This includes POST data, query parameters, and JSON payloads.

**See**: DATA_ACCESS.md for full webhook structure details

---

## Return Format Requirements

**CRITICAL RULE**: Always return array of objects with `json` property

### Correct Return Formats

```javascript
// ✅ Single result
return [{
  json: {
    field1: value1,
    field2: value2
  }
}];

// ✅ Multiple results
return [
  {json: {id: 1, data: 'first'}},
  {json: {id: 2, data: 'second'}}
];

// ✅ Transformed array
const transformed = $input.all()
  .filter(item => item.json.valid)
  .map(item => ({
    json: {
      id: item.json.id,
      processed: true
    }
  }));
return transformed;

// ✅ Empty result (when no data to return)
return [];

// ✅ Conditional return
if (shouldProcess) {
  return [{json: processedData}];
} else {
  return [];
}
```

### Incorrect Return Formats

```javascript
// ❌ WRONG: Object without array wrapper
return {
  json: {field: value}
};

// ❌ WRONG: Array without json wrapper
return [{field: value}];

// ❌ WRONG: Plain string
return "processed";

// ❌ WRONG: Raw data without mapping
return $input.all();  // Missing .map()

// ❌ WRONG: Incomplete structure
return [{data: value}];  // Should be {json: value}
```

**Why it matters**: Next nodes expect array format. Incorrect format causes workflow execution to fail.

**See**: ERROR_PATTERNS.md #3 for detailed error solutions

---

## Common Patterns Overview

Based on production workflows, here are the most useful patterns:

### 1. Multi-Source Data Aggregation
Combine data from multiple APIs, webhooks, or nodes

```javascript
const allItems = $input.all();
const results = [];

for (const item of allItems) {
  const sourceName = item.json.name || 'Unknown';
  // Parse source-specific structure
  if (sourceName === 'API1' && item.json.data) {
    results.push({
      json: {
        title: item.json.data.title,
        source: 'API1'
      }
    });
  }
}

return results;
```

### 2. Filtering with Regex
Extract patterns, mentions, or keywords from text

```javascript
const pattern = /\b([A-Z]{2,5})\b/g;
const matches = {};

for (const item of $input.all()) {
  const text = item.json.text;
  const found = text.match(pattern);

  if (found) {
    found.forEach(match => {
      matches[match] = (matches[match] || 0) + 1;
    });
  }
}

return [{json: {matches}}];
```

### 3. Data Transformation & Enrichment
Map fields, normalize formats, add computed fields

```javascript
const items = $input.all();

return items.map(item => {
  const data = item.json;
  const nameParts = data.name.split(' ');

  return {
    json: {
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
      email: data.email,
      created_at: new Date().toISOString()
    }
  };
});
```

### 4. Top N Filtering & Ranking
Sort and limit results

```javascript
const items = $input.all();

const topItems = items
  .sort((a, b) => (b.json.score || 0) - (a.json.score || 0))
  .slice(0, 10);

return topItems.map(item => ({json: item.json}));
```

### 5. Aggregation & Reporting
Sum, count, group data

```javascript
const items = $input.all();
const total = items.reduce((sum, item) => sum + (item.json.amount || 0), 0);

return [{
  json: {
    total,
    count: items.length,
    average: total / items.length,
    timestamp: new Date().toISOString()
  }
}];
```

**See**: COMMON_PATTERNS.md for 10 detailed production patterns

---

## Error Prevention - Top 5 Mistakes

### #1: Empty Code or Missing Return (Most Common)

```javascript
// ❌ WRONG: No return statement
const items = $input.all();
// ... processing code ...
// Forgot to return!

// ✅ CORRECT: Always return data
const items = $input.all();
// ... processing ...
return items.map(item => ({json: item.json}));
```

### #2: Expression Syntax Confusion

```javascript
// ❌ WRONG: Using n8n expression syntax in code
const value = "{{ $json.field }}";

// ✅ CORRECT: Use JavaScript template literals
const value = `${$json.field}`;

// ✅ CORRECT: Direct access
const value = $input.first().json.field;
```

### #3: Incorrect Return Wrapper

```javascript
// ❌ WRONG: Returning object instead of array
return {json: {result: 'success'}};

// ✅ CORRECT: Array wrapper required
return [{json: {result: 'success'}}];
```

### #4: Missing Null Checks

```javascript
// ❌ WRONG: Crashes if field doesn't exist
const value = item.json.user.email;

// ✅ CORRECT: Safe access with optional chaining
const value = item.json?.user?.email || 'no-email@example.com';

// ✅ CORRECT: Guard clause
if (!item.json.user) {
  return [];
}
const value = item.json.user.email;
```

### #5: Webhook Body Nesting

```javascript
// ❌ WRONG: Direct access to webhook data
const email = $json.email;

// ✅ CORRECT: Webhook data under .body
const email = $json.body.email;
```

**See**: ERROR_PATTERNS.md for comprehensive error guide

---

## Built-in Functions & Helpers

### $helpers.httpRequest()

Make HTTP requests from within code:

```javascript
const response = await $helpers.httpRequest({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  }
});

return [{json: {data: response}}];
```

### DateTime (Luxon)

Date and time operations:

```javascript
// Current time
const now = DateTime.now();

// Format dates
const formatted = now.toFormat('yyyy-MM-dd');
const iso = now.toISO();

// Date arithmetic
const tomorrow = now.plus({days: 1});
const lastWeek = now.minus({weeks: 1});

return [{
  json: {
    today: formatted,
    tomorrow: tomorrow.toFormat('yyyy-MM-dd')
  }
}];
```

### $jmespath()

Query JSON structures:

```javascript
const data = $input.first().json;

// Filter array
const adults = $jmespath(data, 'users[?age >= `18`]');

// Extract fields
const names = $jmespath(data, 'users[*].name');

return [{json: {adults, names}}];
```

**See**: BUILTIN_FUNCTIONS.md for complete reference

---

## Best Practices

### 1. Always Validate Input Data

```javascript
const items = $input.all();

// Check if data exists
if (!items || items.length === 0) {
  return [];
}

// Validate structure
if (!items[0].json) {
  return [{json: {error: 'Invalid input format'}}];
}

// Continue processing...
```

### 2. Use Try-Catch for Error Handling

```javascript
try {
  const response = await $helpers.httpRequest({
    url: 'https://api.example.com/data'
  });

  return [{json: {success: true, data: response}}];
} catch (error) {
  return [{
    json: {
      success: false,
      error: error.message
    }
  }];
}
```

### 3. Prefer Array Methods Over Loops

```javascript
// ✅ GOOD: Functional approach
const processed = $input.all()
  .filter(item => item.json.valid)
  .map(item => ({json: {id: item.json.id}}));

// ❌ SLOWER: Manual loop
const processed = [];
for (const item of $input.all()) {
  if (item.json.valid) {
    processed.push({json: {id: item.json.id}});
  }
}
```

### 4. Filter Early, Process Late

```javascript
// ✅ GOOD: Filter first to reduce processing
const processed = $input.all()
  .filter(item => item.json.status === 'active')  // Reduce dataset first
  .map(item => expensiveTransformation(item));  // Then transform

// ❌ WASTEFUL: Transform everything, then filter
const processed = $input.all()
  .map(item => expensiveTransformation(item))  // Wastes CPU
  .filter(item => item.json.status === 'active');
```

### 5. Use Descriptive Variable Names

```javascript
// ✅ GOOD: Clear intent
const activeUsers = $input.all().filter(item => item.json.active);
const totalRevenue = activeUsers.reduce((sum, user) => sum + user.json.revenue, 0);

// ❌ BAD: Unclear purpose
const a = $input.all().filter(item => item.json.active);
const t = a.reduce((s, u) => s + u.json.revenue, 0);
```

### 6. Debug with console.log()

```javascript
// Debug statements appear in browser console
const items = $input.all();
console.log(`Processing ${items.length} items`);

for (const item of items) {
  console.log('Item data:', item.json);
  // Process...
}

return result;
```

---

## When to Use Code Node

Use Code node when:
- ✅ Complex transformations requiring multiple steps
- ✅ Custom calculations or business logic
- ✅ Recursive operations
- ✅ API response parsing with complex structure
- ✅ Multi-step conditionals
- ✅ Data aggregation across items

Consider other nodes when:
- ❌ Simple field mapping → Use **Set** node
- ❌ Basic filtering → Use **Filter** node
- ❌ Simple conditionals → Use **IF** or **Switch** node
- ❌ HTTP requests only → Use **HTTP Request** node

**Code node excels at**: Complex logic that would require chaining many simple nodes

---

## Integration with Other Skills

### Works With:

**n8n Expression Syntax**:
- Expressions use `{{ }}` syntax in other nodes
- Code nodes use JavaScript directly (no `{{ }}`)
- When to use expressions vs code

**n8n MCP Tools Expert**:
- How to find Code node: `search_nodes({query: "code"})`
- Get configuration help: `get_node_essentials("nodes-base.code")`
- Validate code: `validate_node_operation()`

**n8n Node Configuration**:
- Mode selection (All Items vs Each Item)
- Language selection (JavaScript vs Python)
- Understanding property dependencies

**n8n Workflow Patterns**:
- Code nodes in transformation step
- Webhook → Code → API pattern
- Error handling in workflows

**n8n Validation Expert**:
- Validate Code node configuration
- Handle validation errors
- Auto-fix common issues

---

## Quick Reference Checklist

Before deploying Code nodes, verify:

- [ ] **Code is not empty** - Must have meaningful logic
- [ ] **Return statement exists** - Must return array of objects
- [ ] **Proper return format** - Each item: `{json: {...}}`
- [ ] **Data access correct** - Using `$input.all()`, `$input.first()`, or `$input.item`
- [ ] **No n8n expressions** - Use JavaScript template literals: `` `${value}` ``
- [ ] **Error handling** - Guard clauses for null/undefined inputs
- [ ] **Webhook data** - Access via `.body` if from webhook
- [ ] **Mode selection** - "All Items" for most cases
- [ ] **Performance** - Prefer map/filter over manual loops
- [ ] **Output consistent** - All code paths return same structure

---

## Additional Resources

### Related Files
- DATA_ACCESS.md - Comprehensive data access patterns
- COMMON_PATTERNS.md - 10 production-tested patterns
- ERROR_PATTERNS.md - Top 5 errors and solutions
- BUILTIN_FUNCTIONS.md - Complete built-in reference

### n8n Documentation
- Code Node Guide: https://docs.n8n.io/code/code-node/
- Built-in Methods: https://docs.n8n.io/code-examples/methods-variables-reference/
- Luxon Documentation: https://moment.github.io/luxon/

---

**Ready to write JavaScript in n8n Code nodes!** Start with simple transformations, use the error patterns guide to avoid common mistakes, and reference the pattern library for production-ready examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
