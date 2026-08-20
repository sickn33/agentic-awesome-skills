---
name: chrome-extension-development
description: Build, review, debug, and secure Chrome extensions using Manifest V3, including service workers, content scripts, Chrome APIs, messaging, storage, permissions, authentication, and testing.
risk: safe
source: self
---

# Chrome Extension Development

## Overview

Build production-quality Chrome extensions using Manifest V3. Prioritize minimal permissions, clear extension-context boundaries, secure data handling, event-driven background processing, and maintainable architecture.

## When to Use This Skill

Use when:

- Creating or modifying a Chrome extension
- Migrating to Manifest V3
- Building popup, options, side-panel, or extension pages
- Writing content scripts or service workers
- Using Chrome APIs
- Communicating between extension contexts
- Using extension storage
- Integrating external APIs
- Adding authentication
- Debugging or reviewing an extension
- Preparing for Chrome Web Store submission

First determine whether the requirement actually needs an extension or privileged browser access.

## Core Concepts

### Manifest V3

Use Manifest V3 for new extensions.

Prefer:

- Extension service workers
- Content scripts
- Extension pages
- Chrome APIs
- Declarative APIs

Keep `manifest.json` minimal. Request only required permissions and narrowly scoped host permissions.

Avoid `<all_urls>` unless broad access is genuinely required.

### Extension Contexts

Treat these as separate contexts:

- Service worker
- Content script
- Popup
- Options page
- Side panel
- Other extension pages

Do not assume contexts share DOM access, variables, memory, APIs, or lifecycle.

Use explicit messaging between contexts.

### Service Workers

Manifest V3 service workers are event-driven and can be stopped and restarted.

Use them for:

- Message handling
- Lifecycle events
- API requests
- Storage
- Alarms
- Notifications
- Context menus
- Tab events

Do not treat a service worker as a persistent process. Persist state that must survive termination.

### Content Scripts

Use content scripts to inspect or modify webpages.

They should:

- Minimize DOM manipulation
- Avoid unnecessary polling
- Avoid global namespace collisions
- Handle dynamic content
- Clean up injected UI and listeners
- Use messaging for privileged operations

Do not assume content scripts can directly use privileged APIs.

### Messaging

Define explicit message contracts containing:

- Message type
- Payload
- Response
- Error behavior

Validate incoming messages and payloads.

Typical flow:

```text
Content Script
      |
      | sendMessage()
      v
Service Worker
      |
      | API / Storage
      v
Response
```

### Storage

Choose storage based on purpose:

- `chrome.storage.local` — persistent local data
- `chrome.storage.sync` — small synchronized preferences
- `chrome.storage.session` — temporary session state

Handle missing, invalid, outdated, and corrupt values.

Do not treat extension storage as a secure secret store.

## Step-by-Step Guide

### 1. Understand the Requirement

Identify:

- User workflow
- Required extension contexts
- Required Chrome APIs
- Permissions
- Message flow
- Persistent state
- Authentication
- External APIs
- Security constraints

Choose the smallest architecture that satisfies the requirement.

### 2. Design the Extension

A typical structure is:

```text
extension/
├── manifest.json
├── service-worker.js
├── content/
│   └── content.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   └── options.js
└── assets/
```

Do not create unnecessary contexts, files, frameworks, or dependencies.

### 3. Define Permissions

Before adding a permission:

1. Identify why it is required.
2. Check for a narrower alternative.
3. Consider optional permissions.
4. Consider security and Web Store implications.

### 4. Implement the Service Worker

Keep background processing event-driven.

Do not depend on in-memory state surviving service-worker termination.

Use storage for durable state.

### 5. Implement Content Scripts

Keep webpage manipulation isolated.

Use messaging when privileged operations are required.

Avoid unnecessary polling and DOM observers.

### 6. Implement UI

Keep popup code focused on short user interactions.

For complex workflows, consider a side panel or dedicated extension page.

Use accessible controls and meaningful labels.

### 7. Integrate External APIs

Use the service worker for privileged or cross-origin operations when appropriate.

Handle:

- Authentication failures
- Timeouts
- Network failures
- Invalid responses
- Rate limits

Consider caching, throttling, debouncing, pagination, and request deduplication.

Never hard-code private credentials into extension code.

### 8. Implement Authentication

Prefer OAuth/OIDC when appropriate.

Consider:

- Token expiration
- Logout
- Refresh
- Storage
- Context exposure
- Authentication failures

Never embed confidential client secrets or private credentials in client-side code.

Do not put sensitive tokens into URLs.

## Security

Treat extensions as privileged software.

### Untrusted Content

Never insert untrusted data directly into HTML.

Prefer:

```javascript
element.textContent = value;
```

over unsafe HTML insertion.

### Dynamic Code

Do not introduce:

```javascript
eval()
new Function()
```

or equivalent dynamic code execution.

### Message Validation

Validate:

- Message type
- Required fields
- Data types
- Allowed values

### External Data

Treat webpage content and API responses as untrusted.

Validate and sanitize before rendering or processing.

### Secrets

Never commit or bundle:

- Private API keys
- Private keys
- Service-account JSON
- Passwords
- Production credentials

## Performance

Prefer event-driven behavior.

Avoid:

- Aggressive polling
- Excessive DOM observers
- Repeated API requests
- Unnecessary content-script injection
- Large in-memory datasets

Use debouncing, throttling, caching, pagination, request deduplication, and appropriate retries when needed.

## Error Handling

Handle failures explicitly, including:

- Permission denial
- Unsupported URLs
- Missing active tabs
- Service-worker restart
- API timeout
- Network failure
- Authentication failure
- Invalid API responses
- Storage failure
- Message delivery failure

User-facing errors should explain the problem and provide a useful recovery action.

Do not silently swallow errors.

## Existing Extensions

Before modifying an existing extension:

1. Read `manifest.json`.
2. Identify extension contexts.
3. Inspect messaging and storage.
4. Inspect permissions.
5. Identify frameworks and build tooling.
6. Follow existing project conventions.

Do not rewrite the architecture unnecessarily.

Preserve unrelated functionality.

If the project already uses React, Vue, Svelte, TypeScript, or another framework, follow the existing build system.

## Testing

Test the actual extension contexts.

### Installation

Test:

- Fresh installation
- Reload
- Upgrade

### UI

Test popup, options, side panel, and relevant viewport sizes.

### Content Scripts

Test:

- Supported pages
- Unsupported pages
- Dynamic content
- Navigation
- Multiple tabs

### Service Worker

Test:

- Startup
- Restart
- Messages
- Alarms/events
- Error handling

### Authentication

Test:

- Login
- Logout
- Expired token
- Invalid credentials
- Network failure

### Storage

Test:

- Empty storage
- Existing data
- Invalid data
- Large datasets when relevant

## Debugging

When debugging:

1. Identify the failing extension context.
2. Inspect the relevant console.
3. Inspect service-worker and content-script logs.
4. Inspect runtime messages.
5. Inspect network requests.
6. Verify permissions and manifest configuration.
7. Reproduce the smallest failing scenario.
8. Fix the root cause.

Do not assume a webpage console error originated from the extension.

## Chrome Web Store Readiness

Before publishing, review:

- Name and description
- Icons and screenshots
- Manifest
- Permissions
- Host permissions
- Privacy requirements
- Remote code
- Third-party dependencies
- Authentication
- Data collection
- Privacy policy requirements
- User disclosures

Remove development credentials, test credentials, debug code, unnecessary logging, and unused permissions.

## Common Mistakes

Avoid:

- Treating a service worker as persistent
- Assuming content scripts can use privileged APIs
- Requesting unnecessarily broad permissions
- Storing secrets in source code
- Trusting messages without validation
- Rendering untrusted data with unsafe HTML
- Depending on in-memory service-worker state
- Polling when events are available
- Forgetting service-worker restart tests
- Assuming popup state persists after closing
- Adding unnecessary frameworks

## Review Checklist

Before considering an extension complete:

- Manifest V3 is used
- Permissions are minimal
- Host permissions are justified
- Context boundaries are clear
- Messages are validated
- Secrets are not bundled
- External data is treated as untrusted
- Service-worker state survives restarts
- Errors are handled
- Relevant contexts are tested
- Security risks are reviewed
- Web Store requirements are considered

  ## Limitations

- This skill provides development guidance; it does not replace current Chrome extension documentation.
- Chrome APIs and Web Store policies can change, so current official documentation should be checked for behavior that may have changed.
- Client-side extension code cannot safely contain confidential server-side secrets.
- Authentication architecture depends on the external identity provider and application backend.
- Browser and website restrictions may prevent an extension from accessing certain pages or resources.
