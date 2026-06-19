---
name: n8n-expression-syntax
description: Validate n8n expression syntax and fix common errors. Use when writing n8n expressions, using {{}} syntax, accessing $json/$node variables, troubleshooting expression errors, or working with webhook data in workflows.
risk: unknown
source: community
---

# n8n Expression Syntax

Expert guide for writing correct n8n expressions in workflows.

## When to Use
- You need to write or debug n8n expressions using `{{ ... }}` syntax.
- The task involves `$json`, `$node`, webhook payloads, or expression-related workflow errors.
- You want syntax-correct dynamic values inside n8n nodes and parameters.

---

## Expression Format

All dynamic content in n8n uses **double curly braces**:

```
{{expression}}
```

**Examples**:
```
✅ {{$json.email}}
✅ {{$json.body.name}}
✅ {{$node["HTTP Request"].json.data}}
❌ $json.email  (no braces - treated as literal text)
❌ {$json.email}  (single braces - invalid)
```

---

## Core Variables

### $json - Current Node Output

Access data from the current node:

```javascript
{{$json.fieldName}}
{{$json['field with spaces']}}
{{$json.nested.property}}
{{$json.items[0].name}}
```

### $node - Reference Other Nodes

Access data from any previous node:

```javascript
{{$node["Node Name"].json.fieldName}}
{{$node["HTTP Request"].json.data}}
{{$node["Webhook"].json.body.email}}
```

**Important**:
- Node names **must** be in quotes
- Node names are **case-sensitive**
- Must match exact node name from workflow

### $now - Current Timestamp

Access current date/time:

```javascript
{{$now}}
{{$now.toFormat('yyyy-MM-dd')}}
{{$now.toFormat('HH:mm:ss')}}
{{$now.plus({days: 7})}}
```

### $env - Environment Variables

Access environment variables:

```javascript
{{$env.API_KEY}}
{{$env.DATABASE_URL}}
```

---

## 🚨 CRITICAL: Webhook Data Structure

**Most Common Mistake**: Webhook data is **NOT** at the root!

### Webhook Node Output Structure

```javascript
{
  "headers": {...},
  "params": {...},
  "query": {...},
  "body": {           // ⚠️ USER DATA IS HERE!
    "name": "John",
    "email": "john@example.com",
    "message": "Hello"
  }
}
```

### Correct Webhook Data Access

```javascript
❌ WRONG: {{$json.name}}
❌ WRONG: {{$json.email}}

✅ CORRECT: {{$json.body.name}}
✅ CORRECT: {{$json.body.email}}
✅ CORRECT: {{$json.body.message}}
```

**Why**: Webhook node wraps incoming data under `.body` property to preserve headers, params, and query parameters.

---

## Common Patterns

### Access Nested Fields

```javascript
// Simple nesting
{{$json.user.email}}

// Array access
{{$json.data[0].name}}
{{$json.items[0].id}}

// Bracket notation for spaces
{{$json['field name']}}
{{$json['user data']['first name']}}
```

### Reference Other Nodes

```javascript
// Node without spaces
{{$node["Set"].json.value}}

// Node with spaces (common!)
{{$node["HTTP Request"].json.data}}
{{$node["Respond to Webhook"].json.message}}

// Webhook node
{{$node["Webhook"].json.body.email}}
```

### Combine Variables

```javascript
// Concatenation (automatic)
Hello {{$json.body.name}}!

// In URLs
https://api.example.com/users/{{$json.body.user_id}}

// In object properties
{
  "name": "={{$json.body.name}}",
  "email": "={{$json.body.email}}"
}
```

---

## When NOT to Use Expressions

### ❌ Code Nodes

Code nodes use **direct JavaScript access**, NOT expressions!

```javascript
// ❌ WRONG in Code node
const email = '={{$json.email}}';
const name = '{{$json.body.name}}';

// ✅ CORRECT in Code node
const email = $json.email;
const name = $json.body.name;

// Or using Code node API
const email = $input.item.json.email;
const allItems = $input.all();
```

### ❌ Webhook Paths

```javascript
// ❌ WRONG
path: "{{$json.user_id}}/webhook"

// ✅ CORRECT
path: "user-webhook"  // Static paths only
```

### ❌ Credential Fields

```javascript
// ❌ WRONG
apiKey: "={{$env.API_KEY}}"

// ✅ CORRECT
Use n8n credential system, not expressions
```

---

## Validation Rules

### 1. Always Use {{}}

Expressions **must** be wrapped in double curly braces.

```javascript
❌ $json.field
✅ {{$json.field}}
```

### 2. Use Quotes for Spaces

Field or node names with spaces require **bracket notation**:

```javascript
❌ {{$json.field name}}
✅ {{$json['field name']}}

❌ {{$node.HTTP Request.json}}
✅ {{$node["HTTP Request"].json}}
```

### 3. Match Exact Node Names

Node references are **case-sensitive**:

```javascript
❌ {{$node["http request"].json}}  // lowercase
❌ {{$node["Http Request"].json}}  // wrong case
✅ {{$node["HTTP Request"].json}}  // exact match
```

### 4. No Nested {{}}

Don't double-wrap expressions:

```javascript
❌ {{{$json.field}}}
✅ {{$json.field}}
```

---

## Common Mistakes

For complete error catalog with fixes, see COMMON_MISTAKES.md

### Quick Fixes

| Mistake | Fix |
|---------|-----|
| `$json.field` | `{{$json.field}}` |
| `{{$json.field name}}` | `{{$json['field name']}}` |
| `{{$node.HTTP Request}}` | `{{$node["HTTP Request"]}}` |
| `{{{$json.field}}}` | `{{$json.field}}` |
| `{{$json.name}}` (webhook) | `{{$json.body.name}}` |
| `'={{$json.email}}'` (Code node) | `$json.email` |

---

## Working Examples

For real workflow examples, see EXAMPLES.md

### Example 1: Webhook to Slack

**Webhook receives**:
```json
{
  "body": {
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello!"
  }
}
```

**In Slack node text field**:
```
New form submission!

Name: {{$json.body.name}}
Email: {{$json.body.email}}
Message: {{$json.body.message}}
```

### Example 2: HTTP Request to Email

**HTTP Request returns**:
```json
{
  "data": {
    "items": [
      {"name": "Product 1", "price": 29.99}
    ]
  }
}
```

**In Email node** (reference HTTP Request):
```
Product: {{$node["HTTP Request"].json.data.items[0].name}}
Price: ${{$node["HTTP Request"].json.data.items[0].price}}
```

### Example 3: Format Timestamp

```javascript
// Current date
{{$now.toFormat('yyyy-MM-dd')}}
// Result: 2025-10-20

// Time
{{$now.toFormat('HH:mm:ss')}}
// Result: 14:30:45

// Full datetime
{{$now.toFormat('yyyy-MM-dd HH:mm')}}
// Result: 2025-10-20 14:30
```

---

## Data Type Handling

### Arrays

```javascript
// First item
{{$json.users[0].email}}

// Array length
{{$json.users.length}}

// Last item
{{$json.users[$json.users.length - 1].name}}
```

### Objects

```javascript
// Dot notation (no spaces)
{{$json.user.email}}

// Bracket notation (with spaces or dynamic)
{{$json['user data'].email}}
```

### Strings

```javascript
// Concatenation (automatic)
Hello {{$json.name}}!

// String methods
{{$json.email.toLowerCase()}}
{{$json.name.toUpperCase()}}
```

### Numbers

```javascript
// Direct use
{{$json.price}}

// Math operations
{{$json.price * 1.1}}  // Add 10%
{{$json.quantity + 5}}
```

---

## Advanced Patterns

### Conditional Content

```javascript
// Ternary operator
{{$json.status === 'active' ? 'Active User' : 'Inactive User'}}

// Default values
{{$json.email || 'no-email@example.com'}}
```

### Date Manipulation

```javascript
// Add days
{{$now.plus({days: 7}).toFormat('yyyy-MM-dd')}}

// Subtract hours
{{$now.minus({hours: 24}).toISO()}}

// Set specific date
{{DateTime.fromISO('2025-12-25').toFormat('MMMM dd, yyyy')}}
```

### String Manipulation

```javascript
// Substring
{{$json.email.substring(0, 5)}}

// Replace
{{$json.message.replace('old', 'new')}}

// Split and join
{{$json.tags.split(',').join(', ')}}
```

---

## Debugging Expressions

### Test in Expression Editor

1. Click field with expression
2. Open expression editor (click "fx" icon)
3. See live preview of result
4. Check for errors highlighted in red

### Common Error Messages

**"Cannot read property 'X' of undefined"**
→ Parent object doesn't exist
→ Check your data path

**"X is not a function"**
→ Trying to call method on non-function
→ Check variable type

**Expression shows as literal text**
→ Missing {{ }}
→ Add curly braces

---

## Expression Helpers

### Available Methods

**String**:
- `.toLowerCase()`, `.toUpperCase()`
- `.trim()`, `.replace()`, `.substring()`
- `.split()`, `.includes()`

**Array**:
- `.length`, `.map()`, `.filter()`
- `.find()`, `.join()`, `.slice()`

**DateTime** (Luxon):
- `.toFormat()`, `.toISO()`, `.toLocal()`
- `.plus()`, `.minus()`, `.set()`

**Number**:
- `.toFixed()`, `.toString()`
- Math operations: `+`, `-`, `*`, `/`, `%`

---

## Best Practices

### ✅ Do

- Always use {{ }} for dynamic content
- Use bracket notation for field names with spaces
- Reference webhook data from `.body`
- Use $node for data from other nodes
- Test expressions in expression editor

### ❌ Don't

- Don't use expressions in Code nodes
- Don't forget quotes around node names with spaces
- Don't double-wrap with extra {{ }}
- Don't assume webhook data is at root (it's under .body!)
- Don't use expressions in webhook paths or credentials

---

## Related Skills

- **n8n MCP Tools Expert**: Learn how to validate expressions using MCP tools
- **n8n Workflow Patterns**: See expressions in real workflow examples
- **n8n Node Configuration**: Understand when expressions are needed

---

## Summary

**Essential Rules**:
1. Wrap expressions in {{ }}
2. Webhook data is under `.body`
3. No {{ }} in Code nodes
4. Quote node names with spaces
5. Node names are case-sensitive

**Most Common Mistakes**:
- Missing {{ }} → Add braces
- `{{$json.name}}` in webhooks → Use `{{$json.body.name}}`
- `{{$json.email}}` in Code → Use `$json.email`
- `{{$node.HTTP Request}}` → Use `{{$node["HTTP Request"]}}`

For more details, see:
- COMMON_MISTAKES.md - Complete error catalog
- EXAMPLES.md - Real workflow examples

---

**Need Help?** Reference the n8n expression documentation or use n8n-mcp validation tools to check your expressions.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
