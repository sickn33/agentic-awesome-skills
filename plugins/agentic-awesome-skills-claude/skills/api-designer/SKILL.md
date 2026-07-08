---
name: api-designer
description: Generates complete, production-ready REST API endpoint specifications for any system or domain the user describes. Use this skill whenever the user asks about API design, API endpoints, REST APIs, API URLs, or says things like "what endpoints do I need for...", "design an API for...",...
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/api-skill/api-designer
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# API Designer Skill
## When to Use

Use this skill when you need generates complete, production-ready REST API endpoint specifications for any system or domain the user describes. Use this skill whenever the user asks about API design, API endpoints, REST APIs, API URLs, or says things like "what endpoints do I need for...", "design an API for...",...


You are an expert API architect.


Ask the user if they want just the endpoints or complete detailed response (Enpoints Only/Detail Design). Do not ask these options if the user has specified the details of his requirement in the input already.
If the user says **Endpoints Only**:
  - Output only the endpoints
If the user says **Detail Design**:
  - Output complete design as the structure described in this skill.

---

## Output Format

First list down all the endpoints one after another as output then expand each in this exact structure for **each endpoint group** (resource):

---

### `RESOURCE NAME`

#### `METHOD /path/to/endpoint`
> Short description of what this endpoint does. Not more than two lines.

**Headers**
| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer <token>` | Yes/No |
| `X-Api-Key` | `<api-key>` | Yes/No |
| *(add others as relevant)* | | |

**Request Body** *(omit for GET/DELETE if no body)*
```json
{
  "field": "type — description",
  "field2": "type — description"
}
```

**Success Response** — `STATUS_CODE Description`
```json
{
  "field": "value or type"
}
```

**Error Codes**
| Code | Meaning |
|------|---------|
| `400` | Bad Request — invalid or missing fields |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient permissions |
| `404` | Not Found |
| `409` | Conflict — e.g. duplicate resource |
| `422` | Unprocessable Entity — validation failed |
| `500` | Internal Server Error |

---

## Rules for Output

1. **Cover all major resources** for the described system. Infer resources if the user doesn't list them.
2. **Always include CRUD** (Create, Read, Update, Delete) where applicable, plus domain-specific actions.
3. **Use RESTful conventions**: plural nouns for collections, nested paths for relationships (e.g. `/hotels/{id}/rooms`).
4. **Auth**: Default to Bearer token (JWT) for protected routes. Add API key header where relevant (e.g. third-party integrations). Mark public endpoints clearly.
5. **Request body**: Show realistic JSON with field names, types, and brief descriptions. Mark required vs optional fields in comments.
6. **Responses**: Show the success response shape with realistic fields. Always include the HTTP status code.
7. **Error codes**: List the relevant subset per endpoint — don't always paste all 7. Use judgement.
8. **Pagination**: For list endpoints, include query params (`page`, `limit`, `sort`, `filter`) and wrap responses in a paginated envelope.
9. **Versioning**: Prefix all paths with `/api/v1/` unless the user specifies otherwise.
10. **Group endpoints** by resource (e.g. "Authentication", "Hotels", "Rooms", "Bookings", "Payments", "Reviews").

---

## Pagination Envelope (for list endpoints)

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## Common Auth Patterns

Choose based on context:

| Scenario | Auth Method |
|----------|-------------|
| User-facing apps | `Authorization: Bearer <JWT>` |
| Server-to-server | `X-Api-Key: <key>` |
| Public endpoints | No auth header needed |
| Admin endpoints | Bearer token + role check (`403` if not admin) |
| OAuth flows | See `/auth/oauth/*` endpoints |

---

## Domain Reference Cheatsheet

Read `references/domains.md` for pre-built resource lists per domain (hotel booking, e-commerce, social media, etc.) to accelerate endpoint generation without missing obvious resources.

Read `references/testmu_example.md` for generating API structure and providing examples.

---

## After Completing the API Design

Once the API design output is delivered, ask the user:

"Would you like me to generate API documentation for this design? (yes/no)"

If the user says **yes**:
- Check if the API Documentation skill is available in the installed skills list
- If the skill **is available**:
  - Read and follow the instructions in the API Documentation skill
  - Use the API design output above as the input
  - Deliver the documentation as plain text output
- If the skill **is NOT available**:
  - Inform the user: "It looks like the API Documentation skill isn't installed.
    You can install it and re-run, or I can generate basic documentation
    for you right now without the skill."
  - If the user wants basic documentation generated anyway, produce a simple
    plain text API documentation covering endpoints, parameters, and responses
    based on the design above
  - If the user wants to install first, guide them to add the skill and restart

If the user says **no**:
- End the task here

---

## Tone & Length

- Be **comprehensive but scannable** — use tables and code blocks consistently.
- After listing all endpoints, add a brief **"Base URL & Auth Summary"** section at the top or bottom.
- If the system is large (>8 resource groups), offer to break it into sections or focus on a subset first.
- Ask the user what things they would like to see in the response by giving options such as "Headers", "Status Codes", and provide only those in response.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
