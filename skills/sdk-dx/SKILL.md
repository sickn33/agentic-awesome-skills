---
name: sdk-dx
description: 'Design SDKs that developers love to use—APIs that feel native, error messages that guide, and experiences that reduce friction. This skill covers creating SDKs that drive adoption through exceptional developer experience rather than aggressive marketing. Trigger phrases: "SDK design",...'
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/sdk-dx
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# SDK Design and Developer Experience
## When to Use

Use this skill when you need design SDKs that developers love to use—APIs that feel native, error messages that guide, and experiences that reduce friction. This skill covers creating SDKs that drive adoption through exceptional developer experience rather than aggressive marketing. Trigger phrases: "SDK design",...


The best SDK marketing is an SDK that developers can't stop talking about. When your SDK makes developers feel productive and competent, they become your advocates. When it frustrates them, no amount of marketing will save you.

## Overview

SDK developer experience (DX) encompasses everything a developer feels when using your library:
- **Discovery**: How easily can they find and install it?
- **Learning**: How quickly can they understand how to use it?
- **Using**: How productive are they day-to-day?
- **Debugging**: How easily can they fix problems?
- **Upgrading**: How painlessly can they adopt new versions?

Great SDK DX is a competitive advantage. Developers choose tools that make them feel smart.

## Before You Start

Review the **developer-audience-context** skill to understand:
- What languages and frameworks do your target developers use?
- What IDE/editor setups are most common?
- What's their experience level with your problem domain?
- What competing SDKs have they used? What do they like/dislike?

SDK design decisions should flow from deep understanding of your users.

## API Design Principles

### Principle 1: Optimize for the Common Case

The most frequent use case should require the least code.

**Good Design:**
```python
# Common case: send a simple message
client.messages.send("Hello world", to="+1234567890")

# Full control when needed
client.messages.send(
    body="Hello world",
    to="+1234567890",
    from_="+0987654321",
    status_callback="https://...",
    media_urls=["https://..."]
)
```

**Bad Design:**
```python
# Every call requires full configuration
message = Message(
    body="Hello world",
    to=PhoneNumber("+1234567890"),
    from_=PhoneNumber(config.get_default_from()),
    options=MessageOptions(
        status_callback=None,
        media_urls=[]
    )
)
client.messages.send(message)
```

### Principle 2: Progressive Disclosure

Start simple, reveal complexity as needed.

```javascript
// Level 1: Simplest possible usage
const result = await client.analyze("Hello world");

// Level 2: Common options
const result = await client.analyze("Hello world", {
  language: "en",
  features: ["sentiment", "entities"]
});

// Level 3: Full control
const result = await client.analyze("Hello world", {
  language: "en",
  features: ["sentiment", "entities"],
  model: "v2-large",
  timeout: 30000,
  retries: { max: 3, backoff: "exponential" }
});
```

### Principle 3: Fail Fast and Clearly

Catch errors as early as possible, with actionable messages.

**Good:**
```python
# Validation at construction time
client = MyClient(api_key="")
# Raises immediately: ValueError: API key cannot be empty.
# Get your API key at https://dashboard.example.com/keys

# Clear error at runtime
client.users.get("invalid-id")
# Raises: NotFoundError: User 'invalid-id' not found.
# Use client.users.list() to see available users.
```

**Bad:**
```python
client = MyClient(api_key="")  # No validation
result = client.users.get("invalid-id")
# Returns: None (is this an error? empty result? who knows?)
# Or worse: raises generic Exception with stack trace
```

### Principle 4: Sensible Defaults

Default values should work for most cases without configuration.

```javascript
// This should just work without configuration
const client = new MyClient({ apiKey: process.env.MY_API_KEY });

// Sensible defaults:
// - Automatic retries with exponential backoff
// - Reasonable timeouts
// - JSON content type
// - Standard auth headers
// - Connection pooling
```

## Error Messages That Guide

Error messages are documentation. Make them helpful.

### The Error Message Framework

Every error message should answer:
1. **What** happened?
2. **Why** did it happen?
3. **How** do I fix it?

### Good vs. Bad Error Messages

**Good:**
```
AuthenticationError: Invalid API key provided.

The API key 'sk_test_abc...' (test key) cannot be used for
production requests.

To fix this:
1. Go to https://dashboard.example.com/keys
2. Copy your production API key (starts with 'sk_live_')
3. Update your environment variable: MY_API_KEY=sk_live_...

Docs: https://docs.example.com/authentication
```

**Bad:**
```
Error: 401 Unauthorized
```

### Error Types to Distinguish

Create specific error types that developers can catch:

```python
from myapi.errors import (
    AuthenticationError,  # Invalid/missing credentials
    AuthorizationError,   # Valid creds, insufficient permissions
    ValidationError,      # Invalid input data
    NotFoundError,        # Resource doesn't exist
    RateLimitError,       # Too many requests
    ServerError,          # Our fault, retry might help
)

try:
    client.users.get(user_id)
except NotFoundError as e:
    # Handle missing user specifically
except AuthenticationError as e:
    # Handle auth issues specifically
except MyAPIError as e:
    # Catch-all for other API errors
```

### Include Context in Errors

```javascript
// Bad: generic error
throw new Error("Invalid parameter");

// Good: contextual error
throw new ValidationError({
  message: "Invalid phone number format",
  field: "to",
  value: "+1abc",
  expected: "E.164 format (e.g., +14155551234)",
  docs: "https://docs.example.com/phone-numbers"
});
```

## Type Safety

Type safety is documentation that never goes stale.

### TypeScript Best Practices

```typescript
// Define explicit types for all inputs and outputs
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

interface CreateUserInput {
  email: string;
  name: string;
  metadata?: Record<string, unknown>;
}

// Return types are explicit
async function createUser(input: CreateUserInput): Promise<User> {
  // ...
}

// Use discriminated unions for responses
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
```

### Autocomplete-Driven Design

Design for IDE autocomplete:

```typescript
// Good: autocomplete shows all options
client.messages.create({
  to: "+1...",     // IDE shows: (property) to: string
  body: "...",    // IDE shows: (property) body: string
  // User types 'me' and sees 'mediaUrls' autocomplete
});

// Bad: requires memorization
client.send("messages", { /* what goes here? */ });
```

### Enum and Literal Types

```typescript
// Good: constrained values with autocomplete
type MessageStatus = "queued" | "sending" | "sent" | "failed";

interface Message {
  status: MessageStatus;  // IDE shows valid values
}

// Bad: any string accepted
interface Message {
  status: string;  // No guidance, errors at runtime
}
```

## IDE Integration

### Make Discovery Easy

Structure your SDK so IDE features help developers:

```typescript
// Namespace methods logically
client.users.get(id)
client.users.list()
client.users.create(data)
client.users.update(id, data)
client.users.delete(id)

// After typing 'client.users.' the IDE shows all user operations
```

### JSDoc/Docstrings Everywhere

```typescript
/**
 * Creates a new user in your organization.
 *
 * @param input - The user details
 * @param input.email - Must be a valid email address
 * @param input.name - Display name (max 100 characters)
 * @returns The created user with generated ID
 * @throws {ValidationError} If email format is invalid
 * @throws {ConflictError} If email already exists
 *
 * @example
 * const user = await client.users.create({
 *   email: "jane@example.com",
 *   name: "Jane Developer"
 * });
 */
async createUser(input: CreateUserInput): Promise<User>
```

### Inline Examples

```python
def send_message(self, body: str, to: str, **kwargs) -> Message:
    """
    Send an SMS message.

    Args:
        body: The message content (max 1600 characters)
        to: Recipient phone number in E.164 format

    Returns:
        Message object with ID and status

    Example:
        >>> message = client.messages.send(
        ...     body="Hello from Python!",
        ...     to="+14155551234"
        ... )
        >>> print(message.status)
        'queued'
    """
```

## Versioning Strategy

### Semantic Versioning

Follow semver strictly:
- **MAJOR**: Breaking changes (removal, signature changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### What Constitutes a Breaking Change

**Breaking changes (require major version bump):**
- Removing a public method or property
- Changing method signatures
- Changing return types
- Changing default behavior
- Removing support for a language/runtime version

**Not breaking (minor or patch):**
- Adding new methods
- Adding optional parameters
- Deprecating (but not removing) features
- Bug fixes that change incorrect behavior

### Deprecation Process

```python
import warnings

def old_method(self):
    """
    .. deprecated:: 2.3.0
       Use :meth:`new_method` instead. Will be removed in 3.0.0.
    """
    warnings.warn(
        "old_method() is deprecated, use new_method() instead. "
        "See migration guide: https://docs.example.com/migrate-v3",
        DeprecationWarning,
        stacklevel=2
    )
    return self.new_method()
```

## Migration Guides

### Migration Guide Structure

```markdown
# Migrating from v2 to v3

## Overview
Version 3 introduces [major change] and removes [deprecated feature].
Migration typically takes [time estimate].

## Breaking Changes

### 1. Client Initialization
**Before (v2):**
```python
client = MyClient(key="...")
```

**After (v3):**
```python
client = MyClient(api_key="...")
```

**Why**: Consistency with other SDK parameters.

### 2. [Next breaking change]
...

## Deprecated Features Removed
- `client.old_method()` - Use `client.new_method()` instead
- `LegacyClass` - Use `ModernClass` instead

## New Features
- [Feature that makes migration worthwhile]

## Need Help?
- [Migration support channel]
- [Office hours for migration questions]
```

### Codemods and Automation

When possible, provide automated migration:

```bash
# Provide migration scripts
npx @myapi/migrate-v3

# Or codemods
npx jscodeshift -t @myapi/codemods/v2-to-v3 src/
```

## Making SDKs Feel Native

### Language Idioms

**Python**: Use snake_case, context managers, generators
```python
# Pythonic
with client.batch() as batch:
    for user in client.users.list():
        batch.add(user.send_notification("Hello"))

# Not Pythonic
users = client.getUsers()
batch = client.createBatch()
for i in range(len(users)):
    batch.addOperation(users[i].sendNotification("Hello"))
batch.execute()
```

**JavaScript**: Use Promises, async/await, destructuring
```javascript
// Idiomatic JS
const { data, error } = await client.users.get(id);

// Not idiomatic
client.users.get(id, function(err, result) {
    if (err) { /* callback hell */ }
});
```

**Go**: Use error returns, interfaces, channels
```go
// Idiomatic Go
user, err := client.Users.Get(ctx, userID)
if err != nil {
    return fmt.Errorf("getting user: %w", err)
}

// Not idiomatic
user := client.Users.Get(userID)  // panics on error
```

### Match Ecosystem Conventions

- Use the package manager developers expect (npm, pip, gem, go get)
- Follow naming conventions of popular libraries in that language
- Integrate with popular frameworks (Express, Django, Rails)
- Support popular testing patterns

## SDK Quality Checklist

### Before Release

- [ ] All public APIs have documentation
- [ ] All public APIs have types (where language supports)
- [ ] Error messages include remediation steps
- [ ] Code examples in docs are tested automatically
- [ ] Changelog is updated with all changes
- [ ] Migration guide for breaking changes
- [ ] Deprecation warnings for removed features

### For Great DX

- [ ] Quickstart achieves success in < 5 minutes
- [ ] IDE autocomplete works for all operations
- [ ] Errors are catchable by specific type
- [ ] Retry logic handles transient failures
- [ ] Logging is configurable and useful
- [ ] Debug mode shows request/response details

## Tools

### SDK Generation
- **OpenAPI Generator**: Generate SDKs from OpenAPI specs
- **Swagger Codegen**: Alternative generator
- **Speakeasy**: Modern SDK generation platform
- **Fern**: Type-safe SDK generation

### Testing
- **VCR/Betamax**: Record and replay HTTP interactions
- **WireMock**: Mock HTTP services
- **Pact**: Contract testing

### Documentation
- **TypeDoc**: TypeScript documentation
- **Sphinx**: Python documentation
- **GoDoc**: Go documentation
- **YARD**: Ruby documentation

## Related Skills

- **docs-as-marketing**: Documentation that showcases SDK capabilities
- **api-onboarding**: First experience with your SDK
- **changelog-updates**: Communicating SDK changes effectively
- **developer-sandbox**: Try SDK without installing
- **developer-audience-context**: Understanding SDK users

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
