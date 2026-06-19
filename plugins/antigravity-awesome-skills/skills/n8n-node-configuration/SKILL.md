---
name: n8n-node-configuration
description: Operation-aware node configuration guidance. Use when configuring nodes, understanding property dependencies, determining required fields, choosing between get_node detail levels, or learning common configuration patterns by node type.
risk: unknown
source: community
---

# n8n Node Configuration

Expert guidance for operation-aware node configuration with property dependencies.

## When to Use
- You need to configure an n8n node correctly for a specific resource and operation.
- The task involves required fields, property dependencies, or choosing the right `get_node` detail level.
- You are troubleshooting node setup rather than overall workflow architecture.

---

## Configuration Philosophy

**Progressive disclosure**: Start minimal, add complexity as needed

Configuration best practices:
- `get_node` with `detail: "standard"` is the most used discovery pattern
- 56 seconds average between configuration edits
- Covers 95% of use cases with 1-2K tokens response

**Key insight**: Most configurations need only standard detail, not full schema!

---

## Core Concepts

### 1. Operation-Aware Configuration

**Not all fields are always required** - it depends on operation!

**Example**: Slack node
```javascript
// For operation='post'
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",  // Required for post
  "text": "Hello!"        // Required for post
}

// For operation='update'
{
  "resource": "message",
  "operation": "update",
  "messageId": "123",     // Required for update (different!)
  "text": "Updated!"      // Required for update
  // channel NOT required for update
}
```

**Key**: Resource + operation determine which fields are required!

### 2. Property Dependencies

**Fields appear/disappear based on other field values**

**Example**: HTTP Request node
```javascript
// When method='GET'
{
  "method": "GET",
  "url": "https://api.example.com"
  // sendBody not shown (GET doesn't have body)
}

// When method='POST'
{
  "method": "POST",
  "url": "https://api.example.com",
  "sendBody": true,       // Now visible!
  "body": {               // Required when sendBody=true
    "contentType": "json",
    "content": {...}
  }
}
```

**Mechanism**: displayOptions control field visibility

### 3. Progressive Discovery

**Use the right detail level**:

1. **get_node({detail: "standard"})** - DEFAULT
   - Quick overview (~1-2K tokens)
   - Required fields + common options
   - **Use first** - covers 95% of needs

2. **get_node({mode: "search_properties", propertyQuery: "..."})** (for finding specific fields)
   - Find properties by name
   - Use when looking for auth, body, headers, etc.

3. **get_node({detail: "full"})** (complete schema)
   - All properties (~3-8K tokens)
   - Use only when standard detail is insufficient

---

## Configuration Workflow

### Standard Process

```
1. Identify node type and operation
   ↓
2. Use get_node (standard detail is default)
   ↓
3. Configure required fields
   ↓
4. Validate configuration
   ↓
5. If field unclear → get_node({mode: "search_properties"})
   ↓
6. Add optional fields as needed
   ↓
7. Validate again
   ↓
8. Deploy
```

### Example: Configuring HTTP Request

**Step 1**: Identify what you need
```javascript
// Goal: POST JSON to API
```

**Step 2**: Get node info
```javascript
const info = get_node({
  nodeType: "nodes-base.httpRequest"
});

// Returns: method, url, sendBody, body, authentication required/optional
```

**Step 3**: Minimal config
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none"
}
```

**Step 4**: Validate
```javascript
validate_node({
  nodeType: "nodes-base.httpRequest",
  config,
  profile: "runtime"
});
// → Error: "sendBody required for POST"
```

**Step 5**: Add required field
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none",
  "sendBody": true
}
```

**Step 6**: Validate again
```javascript
validate_node({...});
// → Error: "body required when sendBody=true"
```

**Step 7**: Complete configuration
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none",
  "sendBody": true,
  "body": {
    "contentType": "json",
    "content": {
      "name": "={{$json.name}}",
      "email": "={{$json.email}}"
    }
  }
}
```

**Step 8**: Final validation
```javascript
validate_node({...});
// → Valid! ✅
```

---

## get_node Detail Levels

### Standard Detail (DEFAULT - Use This!)

**✅ Starting configuration**
```javascript
get_node({
  nodeType: "nodes-base.slack"
});
// detail="standard" is the default
```

**Returns** (~1-2K tokens):
- Required fields
- Common options
- Operation list
- Metadata

**Use**: 95% of configuration needs

### Full Detail (Use Sparingly)

**✅ When standard isn't enough**
```javascript
get_node({
  nodeType: "nodes-base.slack",
  detail: "full"
});
```

**Returns** (~3-8K tokens):
- Complete schema
- All properties
- All nested options

**Warning**: Large response, use only when standard insufficient

### Search Properties Mode

**✅ Looking for specific field**
```javascript
get_node({
  nodeType: "nodes-base.httpRequest",
  mode: "search_properties",
  propertyQuery: "auth"
});
```

**Use**: Find authentication, headers, body fields, etc.

### Decision Tree

```
┌─────────────────────────────────┐
│ Starting new node config?       │
├─────────────────────────────────┤
│ YES → get_node (standard)       │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Standard has what you need?     │
├─────────────────────────────────┤
│ YES → Configure with it         │
│ NO  → Continue                  │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Looking for specific field?     │
├─────────────────────────────────┤
│ YES → search_properties mode    │
│ NO  → Continue                  │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ Still need more details?        │
├─────────────────────────────────┤
│ YES → get_node({detail: "full"})│
└─────────────────────────────────┘
```

---

## Property Dependencies Deep Dive

### displayOptions Mechanism

**Fields have visibility rules**:

```javascript
{
  "name": "body",
  "displayOptions": {
    "show": {
      "sendBody": [true],
      "method": ["POST", "PUT", "PATCH"]
    }
  }
}
```

**Translation**: "body" field shows when:
- sendBody = true AND
- method = POST, PUT, or PATCH

### Common Dependency Patterns

#### Pattern 1: Boolean Toggle

**Example**: HTTP Request sendBody
```javascript
// sendBody controls body visibility
{
  "sendBody": true   // → body field appears
}
```

#### Pattern 2: Operation Switch

**Example**: Slack resource/operation
```javascript
// Different operations → different fields
{
  "resource": "message",
  "operation": "post"
  // → Shows: channel, text, attachments, etc.
}

{
  "resource": "message",
  "operation": "update"
  // → Shows: messageId, text (different fields!)
}
```

#### Pattern 3: Type Selection

**Example**: IF node conditions
```javascript
{
  "type": "string",
  "operation": "contains"
  // → Shows: value1, value2
}

{
  "type": "boolean",
  "operation": "equals"
  // → Shows: value1, value2, different operators
}
```

### Finding Property Dependencies

**Use get_node with search_properties mode**:
```javascript
get_node({
  nodeType: "nodes-base.httpRequest",
  mode: "search_properties",
  propertyQuery: "body"
});

// Returns property paths matching "body" with descriptions
```

**Or use full detail for complete schema**:
```javascript
get_node({
  nodeType: "nodes-base.httpRequest",
  detail: "full"
});

// Returns complete schema with displayOptions rules
```

**Use this when**: Validation fails and you don't understand why field is missing/required

---

## Common Node Patterns

### Pattern 1: Resource/Operation Nodes

**Examples**: Slack, Google Sheets, Airtable

**Structure**:
```javascript
{
  "resource": "<entity>",      // What type of thing
  "operation": "<action>",     // What to do with it
  // ... operation-specific fields
}
```

**How to configure**:
1. Choose resource
2. Choose operation
3. Use get_node to see operation-specific requirements
4. Configure required fields

### Pattern 2: HTTP-Based Nodes

**Examples**: HTTP Request, Webhook

**Structure**:
```javascript
{
  "method": "<HTTP_METHOD>",
  "url": "<endpoint>",
  "authentication": "<type>",
  // ... method-specific fields
}
```

**Dependencies**:
- POST/PUT/PATCH → sendBody available
- sendBody=true → body required
- authentication != "none" → credentials required

### Pattern 3: Database Nodes

**Examples**: Postgres, MySQL, MongoDB

**Structure**:
```javascript
{
  "operation": "<query|insert|update|delete>",
  // ... operation-specific fields
}
```

**Dependencies**:
- operation="executeQuery" → query required
- operation="insert" → table + values required
- operation="update" → table + values + where required

### Pattern 4: Conditional Logic Nodes

**Examples**: IF, Switch, Merge

**Structure**:
```javascript
{
  "conditions": {
    "<type>": [
      {
        "operation": "<operator>",
        "value1": "...",
        "value2": "..."  // Only for binary operators
      }
    ]
  }
}
```

**Dependencies**:
- Binary operators (equals, contains, etc.) → value1 + value2
- Unary operators (isEmpty, isNotEmpty) → value1 only + singleValue: true

---

## Operation-Specific Configuration

### Slack Node Examples

#### Post Message
```javascript
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",      // Required
  "text": "Hello!",           // Required
  "attachments": [],          // Optional
  "blocks": []                // Optional
}
```

#### Update Message
```javascript
{
  "resource": "message",
  "operation": "update",
  "messageId": "1234567890",  // Required (different from post!)
  "text": "Updated!",         // Required
  "channel": "#general"       // Optional (can be inferred)
}
```

#### Create Channel
```javascript
{
  "resource": "channel",
  "operation": "create",
  "name": "new-channel",      // Required
  "isPrivate": false          // Optional
  // Note: text NOT required for this operation
}
```

### HTTP Request Node Examples

#### GET Request
```javascript
{
  "method": "GET",
  "url": "https://api.example.com/users",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth",
  "sendQuery": true,                    // Optional
  "queryParameters": {                  // Shows when sendQuery=true
    "parameters": [
      {
        "name": "limit",
        "value": "100"
      }
    ]
  }
}
```

#### POST with JSON
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/users",
  "authentication": "none",
  "sendBody": true,                     // Required for POST
  "body": {                             // Required when sendBody=true
    "contentType": "json",
    "content": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### IF Node Examples

#### String Comparison (Binary)
```javascript
{
  "conditions": {
    "string": [
      {
        "value1": "={{$json.status}}",
        "operation": "equals",
        "value2": "active"              // Binary: needs value2
      }
    ]
  }
}
```

#### Empty Check (Unary)
```javascript
{
  "conditions": {
    "string": [
      {
        "value1": "={{$json.email}}",
        "operation": "isEmpty",
        // No value2 - unary operator
        "singleValue": true             // Auto-added by sanitization
      }
    ]
  }
}
```

---

## Handling Conditional Requirements

### Example: HTTP Request Body

**Scenario**: body field required, but only sometimes

**Rule**:
```
body is required when:
  - sendBody = true AND
  - method IN (POST, PUT, PATCH, DELETE)
```

**How to discover**:
```javascript
// Option 1: Read validation error
validate_node({...});
// Error: "body required when sendBody=true"

// Option 2: Search for the property
get_node({
  nodeType: "nodes-base.httpRequest",
  mode: "search_properties",
  propertyQuery: "body"
});
// Shows: body property with displayOptions rules

// Option 3: Try minimal config and iterate
// Start without body, validation will tell you if needed
```

### Example: IF Node singleValue

**Scenario**: singleValue property appears for unary operators

**Rule**:
```
singleValue should be true when:
  - operation IN (isEmpty, isNotEmpty, true, false)
```

**Good news**: Auto-sanitization fixes this!

**Manual check**:
```javascript
get_node({
  nodeType: "nodes-base.if",
  detail: "full"
});
// Shows complete schema with operator-specific rules
```

---

## Configuration Anti-Patterns

### ❌ Don't: Over-configure Upfront

**Bad**:
```javascript
// Adding every possible field
{
  "method": "GET",
  "url": "...",
  "sendQuery": false,
  "sendHeaders": false,
  "sendBody": false,
  "timeout": 10000,
  "ignoreResponseCode": false,
  // ... 20 more optional fields
}
```

**Good**:
```javascript
// Start minimal
{
  "method": "GET",
  "url": "...",
  "authentication": "none"
}
// Add fields only when needed
```

### ❌ Don't: Skip Validation

**Bad**:
```javascript
// Configure and deploy without validating
const config = {...};
n8n_update_partial_workflow({...});  // YOLO
```

**Good**:
```javascript
// Validate before deploying
const config = {...};
const result = validate_node({...});
if (result.valid) {
  n8n_update_partial_workflow({...});
}
```

### ❌ Don't: Ignore Operation Context

**Bad**:
```javascript
// Same config for all Slack operations
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",
  "text": "..."
}

// Then switching operation without updating config
{
  "resource": "message",
  "operation": "update",  // Changed
  "channel": "#general",  // Wrong field for update!
  "text": "..."
}
```

**Good**:
```javascript
// Check requirements when changing operation
get_node({
  nodeType: "nodes-base.slack"
});
// See what update operation needs (messageId, not channel)
```

---

## Best Practices

### ✅ Do

1. **Start with get_node (standard detail)**
   - ~1-2K tokens response
   - Covers 95% of configuration needs
   - Default detail level

2. **Validate iteratively**
   - Configure → Validate → Fix → Repeat
   - Average 2-3 iterations is normal
   - Read validation errors carefully

3. **Use search_properties mode when stuck**
   - If field seems missing, search for it
   - Understand what controls field visibility
   - `get_node({mode: "search_properties", propertyQuery: "..."})`

4. **Respect operation context**
   - Different operations = different requirements
   - Always check get_node when changing operation
   - Don't assume configs are transferable

5. **Trust auto-sanitization**
   - Operator structure fixed automatically
   - Don't manually add/remove singleValue
   - IF/Switch metadata added on save

### ❌ Don't

1. **Jump to detail="full" immediately**
   - Try standard detail first
   - Only escalate if needed
   - Full schema is 3-8K tokens

2. **Configure blindly**
   - Always validate before deploying
   - Understand why fields are required
   - Use search_properties for conditional fields

3. **Copy configs without understanding**
   - Different operations need different fields
   - Validate after copying
   - Adjust for new context

4. **Manually fix auto-sanitization issues**
   - Let auto-sanitization handle operator structure
   - Focus on business logic
   - Save and let system fix structure

---

## Detailed References

For comprehensive guides on specific topics:

- **DEPENDENCIES.md** - Deep dive into property dependencies and displayOptions
- **OPERATION_PATTERNS.md** - Common configuration patterns by node type

---

## Summary

**Configuration Strategy**:
1. Start with `get_node` (standard detail is default)
2. Configure required fields for operation
3. Validate configuration
4. Search properties if stuck
5. Iterate until valid (avg 2-3 cycles)
6. Deploy with confidence

**Key Principles**:
- **Operation-aware**: Different operations = different requirements
- **Progressive disclosure**: Start minimal, add as needed
- **Dependency-aware**: Understand field visibility rules
- **Validation-driven**: Let validation guide configuration

**Related Skills**:
- **n8n MCP Tools Expert** - How to use discovery tools correctly
- **n8n Validation Expert** - Interpret validation errors
- **n8n Expression Syntax** - Configure expression fields
- **n8n Workflow Patterns** - Apply patterns with proper configuration

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
