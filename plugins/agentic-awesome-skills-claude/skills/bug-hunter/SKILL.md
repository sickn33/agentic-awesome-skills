---
name: bug-hunter
description: "Systematically finds and fixes bugs using proven debugging techniques. Traces from symptoms to root cause, implements fixes, and prevents regression."
category: development
risk: safe
source: community
date_added: "2026-03-05"
---

# Bug Hunter

Systematically hunt down and fix bugs using proven debugging techniques. No guessing—follow the evidence.

## When to Use This Skill

- User reports a bug or error
- Something isn't working as expected
- User says "fix the bug" or "debug this"
- Intermittent failures or weird behavior
- Production issues need investigation

## The Debugging Process

### 1. Reproduce the Bug

First, make it happen consistently:

```
1. Get exact steps to reproduce
2. Try to reproduce locally
3. Note what triggers it
4. Document the error message/behavior
5. Check if it happens every time or randomly
```

If you can't reproduce it, gather more info:
- What environment? (dev, staging, prod)
- What browser/device?
- What user actions preceded it?
- Any error logs?

### 2. Gather Evidence

Collect all available information:

**Check logs:**
```bash
# Application logs
tail -f logs/app.log

# System logs
journalctl -u myapp -f

# Browser console
# Open DevTools → Console tab
```

**Check error messages:**
- Full stack trace
- Error type and message
- Line numbers
- Timestamp

**Check state:**
- What data was being processed?
- What was the user trying to do?
- What's in the database?
- What's in local storage/cookies?

### 3. Form a Hypothesis

Based on evidence, guess what's wrong:

```
"The login times out because the session cookie 
expires before the auth check completes"

"The form fails because email validation regex 
doesn't handle plus signs"

"The API returns 500 because the database query 
has a syntax error with special characters"
```

### 4. Test the Hypothesis

Prove or disprove your guess:

**Add logging:**
```javascript
console.log('Before API call:', userData);
const response = await api.login(userData);
console.log('After API call:', response);
```

**Use debugger:**
```javascript
debugger; // Execution pauses here
const result = processData(input);
```

**Isolate the problem:**
```javascript
// Comment out code to narrow down
// const result = complexFunction();
const result = { mock: 'data' }; // Use mock data
```

### 5. Find Root Cause

Trace back to the actual problem:

**Common root causes:**
- Null/undefined values
- Wrong data types
- Race conditions
- Missing error handling
- Incorrect logic
- Off-by-one errors
- Async/await issues
- Missing validation

**Example trace:**
```
Symptom: "Cannot read property 'name' of undefined"
↓
Where: user.profile.name
↓
Why: user.profile is undefined
↓
Why: API didn't return profile
↓
Why: User ID was null
↓
Root cause: Login didn't set user ID in session
```

### 6. Implement Fix

Fix the root cause, not the symptom:

**Bad fix (symptom):**
```javascript
// Just hide the error
const name = user?.profile?.name || 'Unknown';
```

**Good fix (root cause):**
```javascript
// Ensure user ID is set on login
const login = async (credentials) => {
  const user = await authenticate(credentials);
  if (user) {
    session.userId = user.id; // Fix: Set user ID
    return user;
  }
  throw new Error('Invalid credentials');
};
```

### 7. Test the Fix

Verify it actually works:

```
1. Reproduce the original bug
2. Apply the fix
3. Try to reproduce again (should fail)
4. Test edge cases
5. Test related functionality
6. Run existing tests
```

### 8. Prevent Regression

Add a test so it doesn't come back:

```javascript
test('login sets user ID in session', async () => {
  const user = await login({ email: 'test@example.com', password: 'pass' });
  
  expect(session.userId).toBe(user.id);
  expect(session.userId).not.toBeNull();
});
```

## Debugging Techniques

### Binary Search

Cut the problem space in half repeatedly:

```javascript
// Does the bug happen before or after this line?
console.log('CHECKPOINT 1');
// ... code ...
console.log('CHECKPOINT 2');
// ... code ...
console.log('CHECKPOINT 3');
```

### Rubber Duck Debugging

Explain the code line by line out loud. Often you'll spot the issue while explaining.

### Print Debugging

Strategic console.logs:

```javascript
console.log('Input:', input);
console.log('After transform:', transformed);
console.log('Before save:', data);
console.log('Result:', result);
```

### Diff Debugging

Compare working vs broken:
- What changed recently?
- What's different between environments?
- What's different in the data?

### Time Travel Debugging

Use git to find when it broke:

```bash
git bisect start
git bisect bad  # Current commit is broken
git bisect good abc123  # This old commit worked
# Git will check out commits for you to test
```

## Common Bug Patterns

### Null/Undefined

```javascript
// Bug
const name = user.profile.name;

// Fix
const name = user?.profile?.name || 'Unknown';

// Better fix
if (!user || !user.profile) {
  throw new Error('User profile required');
}
const name = user.profile.name;
```

### Race Condition

```javascript
// Bug
let data = null;
fetchData().then(result => data = result);
console.log(data); // null - not loaded yet

// Fix
const data = await fetchData();
console.log(data); // correct value
```

### Off-by-One

```javascript
// Bug
for (let i = 0; i <= array.length; i++) {
  console.log(array[i]); // undefined on last iteration
}

// Fix
for (let i = 0; i < array.length; i++) {
  console.log(array[i]);
}
```

### Type Coercion

```javascript
// Bug
if (count == 0) { // true for "", [], null
  
// Fix
if (count === 0) { // only true for 0
```

### Async Without Await

```javascript
// Bug
const result = asyncFunction(); // Returns Promise
console.log(result.data); // undefined

// Fix
const result = await asyncFunction();
console.log(result.data); // correct value
```

## Debugging Tools

### Browser DevTools

```
Console: View logs and errors
Sources: Set breakpoints, step through code
Network: Check API calls and responses
Application: View cookies, storage, cache
Performance: Find slow operations
```

### Node.js Debugging

```javascript
// Built-in debugger
node --inspect app.js

// Then open chrome://inspect in Chrome
```

### VS Code Debugging

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug App",
  "program": "${workspaceFolder}/app.js"
}
```

## When You're Stuck

1. Take a break (seriously, walk away for 10 minutes)
2. Explain it to someone else (or a rubber duck)
3. Search for the exact error message
4. Check if it's a known issue (GitHub issues, Stack Overflow)
5. Simplify: Create minimal reproduction
6. Start over: Delete and rewrite the problematic code
7. Ask for help (provide context, what you've tried)

## Documentation Template

After fixing, document it:

```markdown
## Bug: Login timeout after 30 seconds

**Symptom:** Users get logged out immediately after login

**Root Cause:** Session cookie expires before auth check completes

**Fix:** Increased session timeout from 30s to 3600s in config

**Files Changed:**
- config/session.js (line 12)

**Testing:** Verified login persists for 1 hour

**Prevention:** Added test for session persistence
```

## Key Principles

- Reproduce first, fix second
- Follow the evidence, don't guess
- Fix root cause, not symptoms
- Test the fix thoroughly
- Add tests to prevent regression
- Document what you learned

## Related Skills

- `@systematic-debugging` - Advanced debugging
- `@test-driven-development` - Testing
- `@codebase-audit-pre-push` - Code review

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
