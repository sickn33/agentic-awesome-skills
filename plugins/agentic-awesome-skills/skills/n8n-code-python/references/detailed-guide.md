# Python Code Node (Native) - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## ⚠️ Important: JavaScript First

**Recommendation**: Use **JavaScript when n8n-specific helpers are needed**. Only use Python when:
- You need specific Python standard library functions
- You're significantly more comfortable with Python syntax
- You're doing data transformations better suited to Python

**Why JavaScript is preferred:**
- Full n8n helper functions ($helpers.httpRequest, etc.)
- Luxon DateTime library for advanced date/time operations
- Module access is deployment-restricted
- Better n8n documentation and community support

---


## Quick Start

```python
# Basic template for Python Code nodes
items = _items

# Process data
processed = []
for item in items:
    processed.append({
        "json": {
            **item["json"],
            "processed": True,
            "processed": True
        }
    })

return processed
```

### Essential Rules

1. **Consider JavaScript first** - Use Python only when necessary
2. **Access data**: `_items`, `_items[0]`, or `_item`
3. Return a list in all-items mode, a single item object in per-item mode.
4. **CRITICAL**: Webhook data is under the current item's `json.body` for JSON POST payloads (inspect actual input)
5. **CRITICAL LIMITATION**: **Imports depend on runner policy**, not the language alone
6. Every import below is conditional on the deployed runner allowlist.

---


## Mode Selection Guide

Same as JavaScript - choose based on your use case:

### Run Once for All Items (Recommended - Default)

**Use this mode for:** bounded batch transformations

- **How it works**: Code executes **once** regardless of input count
- **Data access**: `_items` or `_items` array (Native mode)
- **Best for**: Aggregation, filtering, batch processing, transformations
- **Performance**: Faster for multiple items (single execution)

```python
# Example: Calculate total from all items
all_items = _items
total = sum(item["json"].get("amount", 0) for item in all_items)

return [{
    "json": {
        "total": total,
        "count": len(all_items),
        "average": total / len(all_items) if all_items else 0
    }
}]
```

### Run Once for Each Item

Use `_item` for the current item and return one object:

```python
return {"json": {**_item["json"], "processed": True}}
```

---

## Runtime selection

Use the native runtime contract and complete examples in the root skill. Python
Beta/Pyodide was removed in n8n 2. Historical helper names are not interchangeable
with native Python; use only `_items` or `_item` as appropriate. Imports below
require runner policy approval and may be unavailable. The native cloud runtime
must not be assumed to include even standard modules.

## Data Access Patterns

### Pattern 1: _items - Most Common

**Use when**: Processing arrays, batch operations, aggregations

```python
# Get all items from previous node
all_items = _items

# Filter, transform as needed
valid = [item for item in all_items if item["json"].get("status") == "active"]

processed = []
for item in valid:
    processed.append({
        "json": {
            "id": item["json"]["id"],
            "name": item["json"]["name"]
        }
    })

return processed
```

### Pattern 2: _items[0] - Very Common

**Use when**: Working with single objects, API responses

```python
# Get first item only
first_item = _items[0]
data = first_item["json"]

return [{
    "json": {
        "result": process_data(data),
        "processed": True
    }
}]
```

### Pattern 3: Per-item transformation

```python
return {"json": {**_item["json"], "item_processed": True}}
```

### Accessing other nodes

Native Python has no `_node` helper. Map required fields into this node's input
with ordinary workflow nodes; do not guess undeclared variables or search for
credentials. References to DATA_ACCESS.md and other uppercase auxiliary files
below are upstream-only, not bundled resources.

## Critical: Webhook Data Structure

**MOST COMMON MISTAKE**: Webhook data is nested under `["body"]`

```python
# ❌ WRONG - Will raise KeyError
name = _item["json"]["name"]
email = _item["json"]["email"]

# ✅ CORRECT - Webhook data is under ["body"]
name = _item["json"]["body"]["name"]
email = _item["json"]["body"]["email"]

# ✅ SAFER - Use .get() for safe access
webhook_data = _item["json"].get("body", {})
name = webhook_data.get("name")
```

**Why**: Webhook node wraps all request data under `body` property. JSON POST content is typically under body; query parameters and headers are separate fields. Inspect the actual configured Webhook output and validate its type.

**See**: DATA_ACCESS.md for full webhook structure details

---


## Return Format Requirements

List examples in this section are ALL-ITEMS mode. In per-item mode return one
`{"json": {...}}` object (root example), not a list. Preserve `pairedItem` when
filtering or reordering input, and binary fields if required. `.get()` does not
validate null/non-dict objects; reject invalid input rather than invent defaults
for required amounts or identifiers. Imported examples are conditional on policy.


**All-items rule**: Return a list of item dictionaries with `"json"` key

### Correct Return Formats

```python
# ✅ Single result
return [{
    "json": {
        "field1": value1,
        "field2": value2
    }
}]

# ✅ Multiple results
return [
    {"json": {"id": 1, "data": "first"}},
    {"json": {"id": 2, "data": "second"}}
]

# ✅ List comprehension
transformed = [
    {"json": {"id": item["json"]["id"], "processed": True}}
    for item in _items
    if item["json"].get("valid")
]
return transformed

# ✅ Empty result (when no data to return)
return []

# ✅ Conditional return
if should_process:
    return [{"json": processed_data}]
else:
    return []
```

### Incorrect Return Formats

```python
# ❌ WRONG: Dictionary without list wrapper
return {
    "json": {"field": value}
}

# ❌ WRONG: List without json wrapper
return [{"field": value}]

# ❌ WRONG: Plain string
return "processed"

# ❌ WRONG: Incomplete structure
return [{"data": value}]  # Should be {"json": value}
```

**Why it matters**: Next nodes expect list format. Incorrect format causes workflow execution to fail.

**See**: ERROR_PATTERNS.md #2 for detailed error solutions

---


## Common Patterns Overview

Based on production workflows, here are the most useful Python patterns:

### 1. Data Transformation
Transform all items with list comprehensions

```python
items = _items

return [
    {
        "json": {
            "id": item["json"].get("id"),
            "name": item["json"].get("name", "Unknown").upper(),
            "processed": True
        }
    }
    for item in items
]
```

### 2. Filtering & Aggregation
Sum, filter, count with built-in functions

```python
items = _items
total = sum(item["json"].get("amount", 0) for item in items)
valid_items = [item for item in items if item["json"].get("amount", 0) > 0]

return [{
    "json": {
        "total": total,
        "count": len(valid_items)
    }
}]
```

### 3. String Processing with Regex
Extract patterns from text

```python
import re

items = _items
email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'

all_emails = []
for item in items:
    text = item["json"].get("text", "")
    emails = re.findall(email_pattern, text)
    all_emails.extend(emails)

# Remove duplicates
unique_emails = list(set(all_emails))

return [{
    "json": {
        "emails": unique_emails,
        "count": len(unique_emails)
    }
}]
```

### 4. Data Validation
Validate and clean data

```python
items = _items
validated = []

for item in items:
    data = item["json"]
    errors = []

    # Validate fields
    if not data.get("email"):
        errors.append("Email required")
    if not data.get("name"):
        errors.append("Name required")

    validated.append({
        "json": {
            **data,
            "valid": len(errors) == 0,
            "errors": errors if errors else None
        }
    })

return validated
```

### 5. Statistical Analysis
Calculate statistics with statistics module

```python
from statistics import mean, median, stdev

items = _items
values = [item["json"].get("value", 0) for item in items if "value" in item["json"]]

if values:
    return [{
        "json": {
            "mean": mean(values),
            "median": median(values),
            "stdev": stdev(values) if len(values) > 1 else 0,
            "min": min(values),
            "max": max(values),
            "count": len(values)
        }
    }]
else:
    return [{"json": {"error": "No values found"}}]
```

**See**: COMMON_PATTERNS.md for 10 detailed Python patterns

---


## Error Prevention - Top 5 Mistakes

### #1: Importing External Libraries (Python-Specific!)

```python
# ❌ WRONG: Trying to import external library
import requests  # Available only when installed AND explicitly allowlisted.

# ✅ CORRECT: Use HTTP Request node or JavaScript
# Add HTTP Request node before Code node
# OR switch to JavaScript and use $helpers.httpRequest()
```

### #2: Empty Code or Missing Return

```python
# ❌ WRONG: No return statement
items = _items
# Processing...
# Forgot to return!

# ✅ CORRECT: Always return data
items = _items
# Processing...
return [{"json": item["json"]} for item in items]
```

### #3: Incorrect Return Format

```python
# ❌ WRONG: Returning dict instead of list
return {"json": {"result": "success"}}

# ✅ CORRECT: List wrapper required
return [{"json": {"result": "success"}}]
```

### #4: KeyError on Dictionary Access

```python
# ❌ WRONG: Direct access crashes if missing
name = _item["json"]["user"]["name"]  # KeyError!

# ✅ CORRECT: Use .get() for safe access
name = _item["json"].get("user", {}).get("name", "Unknown")
```

### #5: Webhook Body Nesting

```python
# ❌ WRONG: Direct access to webhook data
email = _item["json"]["email"]  # KeyError!

# ✅ CORRECT: Webhook data under ["body"]
email = _item["json"]["body"]["email"]

# ✅ BETTER: Safe access with .get()
email = _item["json"].get("body", {}).get("email", "no-email")
```

**See**: ERROR_PATTERNS.md for comprehensive error guide

---


## Standard Library Reference

### Most Useful Modules

```python
# JSON operations
import json
data = json.loads(json_string)
json_output = json.dumps({"key": "value"})

# Date/time
from datetime import datetime, timedelta
now = datetime.now()
tomorrow = now + timedelta(days=1)
formatted = now.strftime("%Y-%m-%d")

# Regular expressions
import re
matches = re.findall(r'\d+', text)
cleaned = re.sub(r'[^\w\s]', '', text)

# Base64 encoding
import base64
encoded = base64.b64encode(data).decode()
decoded = base64.b64decode(encoded)

# Hashing
import hashlib
hash_value = hashlib.sha256(text.encode()).hexdigest()

# URL parsing
import urllib.parse
params = urllib.parse.urlencode({"key": "value"})
parsed = urllib.parse.urlparse(url)

# Statistics
from statistics import mean, median, stdev
average = mean([1, 2, 3, 4, 5])
```

**See**: STANDARD_LIBRARY.md for complete reference

---


## Best Practices

### 1. Always Use .get() for Dictionary Access

```python
# ✅ SAFE: Won't crash if field missing
value = item["json"].get("field", "default")

# ❌ RISKY: Crashes if field doesn't exist
value = item["json"]["field"]
```

### 2. Handle None/Null Values Explicitly

```python
# ✅ GOOD: Default to 0 if None
amount = item["json"].get("amount") or 0

# ✅ GOOD: Check for None explicitly
text = item["json"].get("text")
if text is None:
    text = ""
```

### 3. Use List Comprehensions for Filtering

```python
# ✅ PYTHONIC: List comprehension
valid = [item for item in items if item["json"].get("active")]

# ❌ VERBOSE: Manual loop
valid = []
for item in items:
    if item["json"].get("active"):
        valid.append(item)
```

### 4. Return Consistent Structure

```python
# ✅ CONSISTENT: Always list with "json" key
return [{"json": result}]  # Single result
return results  # Multiple results (already formatted)
return []  # No results
```

### 5. Debug with print() Statements

```python
# Debug statements appear in browser console (F12)
items = _items
print(f"Processing {len(items)} items")
# Do not print complete items: they may contain personal data or credentials.
```

---


## Integration with Other Skills

### Works With:

**n8n Expression Syntax**:
- Expressions use `{{ }}` syntax in other nodes
- Code nodes use Python directly (no `{{ }}`)
- When to use expressions vs code

**n8n MCP Tools Expert**:
- How to find Code node: `search_nodes({query: "code"})`
- Get configuration help: `get_node_essentials("nodes-base.code")`
- Validate code: `validate_node_operation()`

**n8n Node Configuration**:
- Mode selection (All Items vs Each Item)
- Language selection (Python vs JavaScript)
- Understanding property dependencies

**n8n Workflow Patterns**:
- Code nodes in transformation step
- When to use Python vs JavaScript in patterns

**n8n Validation Expert**:
- Validate Code node configuration
- Handle validation errors
- Auto-fix common issues

**n8n Code JavaScript**:
- When to use JavaScript instead
- Comparison of JavaScript vs Python features
- Migration from Python to JavaScript

---


## Quick Reference Checklist

Before deploying Python Code nodes, verify:

- [ ] **Considered JavaScript first** - Using Python only when necessary
- [ ] **Code is not empty** - Must have meaningful logic
- [ ] **Return statement exists** - Must return list of dictionaries
- [ ] **Proper return format** - Each item: `{"json": {...}}`
- [ ] **Data access correct** - Use `_items` only in batch mode and `_item` only in per-item mode
- [ ] **Imports reviewed** - Confirm packages and explicit runner allowlists
- [ ] **Safe dictionary access** - Using `.get()` to avoid KeyError
- [ ] **Webhook data** - Access via `["body"]` if from webhook
- [ ] **Mode selection** - "All Items" for most cases
- [ ] **Output consistent** - All code paths return same structure

---


## Additional Resources

### Related Files
- DATA_ACCESS.md - Comprehensive Python data access patterns
- COMMON_PATTERNS.md - 10 Python patterns for n8n
- ERROR_PATTERNS.md - Top 5 errors and solutions
- STANDARD_LIBRARY.md - Complete standard library reference

### n8n Documentation
- Code Node Guide: https://docs.n8n.io/code/code-node/
- Python in n8n: https://docs.n8n.io/code/builtin/python-modules/

---

**Ready to write Python in n8n Code nodes - but consider JavaScript first!** Use Python for specific needs, reference the error patterns guide to avoid common mistakes, and leverage the standard library effectively.
