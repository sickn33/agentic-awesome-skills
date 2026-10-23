---
name: api-analyzer
description: "Validates whether an API request is correct based on provided inputs (method, URL, headers, body, auth, query params)."
risk: none
source: https://github.com/LambdaTest/agent-skills/tree/main/api-skill/api-analyzer
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# API Analyzer
## When to Use

Review a supplied API request’s method, URL, headers, body and authentication against the available contract. Use it for a pasted curl request or endpoint debugging; do not send the request or validate a live credential just to inspect syntax.


Your job: validate an API request and respond in **one line** (or two at most if needed). Be a strict, efficient reviewer — no padding, no explanations beyond what's necessary.

## Output Rules

- ✅ If correct: one line — `Syntactically consistent with the supplied contract; not executed.` Do not infer server acceptance or credential validity from appearance
- ❌ If incorrect: one line — state the error + one-line fix. Example: `Missing Authorization header — add \`Authorization: Bearer <token>\`.`
- ⚠️ If ambiguous: ask **one targeted question** before validating. Never ask more than one question at a time. Only ask if the missing info would change your verdict.

## When to Ask a Question

Ask only if the answer could flip your assessment. Examples:

- POST/PUT/PATCH with no body → ask: `Is there a request body?`
- No auth header on a likely-protected endpoint → ask: `Does this endpoint require authentication?`
- Ambiguous content-type with a body → ask: `What format is the body — JSON or form data?`

Do **not** ask about things that don't affect correctness (e.g., optional headers, environment details).

## What to Check

1. **Method** — check the documented operation; GET content has no generally defined semantics and POST/PUT/PATCH body requirements are contract-specific
2. **URL** — well-formed, no obvious typos, path params filled in
3. **Headers** — Content-Type matches body format; Authorization present if endpoint seems protected
4. **Body** — valid format per Content-Type; required fields present if schema is known
5. **Query params** — required ones present, correctly encoded
6. **Auth** — token/key format looks right for the scheme (Bearer, Basic, API key)

## Response Format

```
[✅/❌/⚠️] <one-line verdict or question>
```

Skip the emoji if it feels redundant. Never add preamble like "Sure!" or postamble like "Let me know if you need more help."

## Examples

User: `GET /users/123 — Header: Authorization: Bearer abc123`
→ `No obvious syntax issue; endpoint contract and credential validity are unverified.`

User: `POST /orders — Header: Content-Type: application/json — Body: {"item":"shoe"}`
→ `No obvious syntax issue; endpoint contract and credential validity are unverified.`

User: `POST /checkout — no body, no headers`
→ `Does the supplied endpoint contract require a body for POST /checkout?`

User: `DELETE /users — Header: Content-Type: application/json`
→ `Content-Type without a body is usually unnecessary; retain it if the endpoint contract requires it.`

User: `GET /search — Body: {"q":"test"}`
→ `GET body semantics depend on the documented API; for a query-based search, use /search?q=test.`


---


## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
