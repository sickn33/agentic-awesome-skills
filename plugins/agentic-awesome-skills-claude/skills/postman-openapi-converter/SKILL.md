---
name: postman-openapi-converter
description: Convert OpenAPI 3.x or Swagger 2.0 specs (YAML or JSON) into complete, import-ready Postman Collection v2.1 JSON files. Use this skill whenever the user provides or references an OpenAPI spec, Swagger file, openapi.yaml, swagger.json, or uses phrases like "convert my OpenAPI spec",...
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/api-skill/postman/postman-openapi-converter
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# OpenAPI → Postman Collection Converter
## When to Use

Use this skill when you need convert OpenAPI 3.x or Swagger 2.0 specs (YAML or JSON) into complete, import-ready Postman Collection v2.1 JSON files. Use this skill whenever the user provides or references an OpenAPI spec, Swagger file, openapi.yaml, swagger.json, or uses phrases like "convert my OpenAPI spec",...


Converts **OpenAPI 3.x** or **Swagger 2.0** specs into a valid **Postman Collection v2.1**.

---

## Step 1 — Detect & Validate Input

Identify the spec version from the input:
- `openapi: 3.x.x` → OpenAPI 3
- `swagger: "2.0"` → Swagger 2

If the input is truncated or partial, convert what's available and note missing sections.

---

## Step 2 — Extraction Mapping

### OpenAPI 3 → Postman

| OpenAPI field | Postman mapping |
|---|---|
| `info.title` | Collection name |
| `info.description` | Collection description |
| `servers[0].url` | `{{base_url}}` variable |
| `paths.<path>.<method>` | One request item per operation |
| `operationId` or `summary` | Request name |
| `parameters` (path/query/header) | URL path variables, query params, headers |
| `requestBody.content.application/json.schema` | Body (raw JSON), generate example from schema |
| `responses` | Saved example responses |
| `components.securitySchemes` | Collection-level auth |
| `tags` | Folder grouping |

### Swagger 2 → Postman

| Swagger field | Postman mapping |
|---|---|
| `host` + `basePath` | `{{base_url}}` |
| `paths.<path>.<method>` | Request item |
| `parameters` | Query/path/header/body params |
| `consumes` / `produces` | Content-Type / Accept headers |
| `securityDefinitions` | Collection auth |
| `tags` | Folders |

---

## Step 3 — Generate Example Bodies

For each request with a `requestBody` or `body` parameter, generate a realistic example JSON body from the schema:
- Use property names as keys
- Infer sensible example values from type + format (e.g., `"email"` format → `"user@example.com"`, `"date-time"` → `"2024-01-15T10:30:00Z"`)
- For `$ref` schemas, resolve them inline

---

## Step 4 — Auth Handling

Map security schemes to Postman auth:

| OpenAPI scheme | Postman auth type |
|---|---|
| `http: bearer` | `bearer` with `{{token}}` |
| `http: basic` | `basic` with `{{username}}` / `{{password}}` |
| `apiKey: header` | `apikey` header with `{{api_key}}` |
| `apiKey: query` | `apikey` query param |
| `oauth2` | `oauth2` (note: requires manual token setup) |

Apply auth at **collection level** if all endpoints share the same scheme. Override at request level for exceptions.

---

## Step 5 — Build Collection JSON

Use the standard v2.1 structure (same schema as postman-collection-generator skill).

Key differences for spec-converted collections:
- Always group by `tags` into folders
- Include `description` field on each request from `operationId` + `summary` + `description`
- Add saved example responses where `responses` are defined in the spec

```json
"response": [
  {
    "name": "200 OK",
    "status": "OK",
    "code": 200,
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "body": "{ \"id\": 1, \"name\": \"example\" }",
    "originalRequest": { <copy of the request> }
  }
]
```

---

## Step 6 — Environment File

Extract all variables into a companion environment:
- `base_url` from `servers[0].url` or `host + basePath`
- `token`, `api_key`, `username`, `password` as empty placeholders
- Any server variables from `servers[0].variables`

---

## Step 7 — Output

1. `collection.json` — Full Postman Collection v2.1
2. `environment.json` — Matching environment file
3. **Conversion summary**: number of endpoints converted, folders created, auth type detected, any fields skipped or approximated
4. Import instructions

---

## Edge Cases

- **`$ref` chains**: Resolve all `$ref` pointers inline before mapping
- **`allOf` / `oneOf` / `anyOf`**: Use the first/primary schema for body generation; note alternatives in description
- **Path parameters**: Convert `{param}` to `:param` in URL path AND add to `variable` array in url object
- **Multiple content types**: Prefer `application/json`; note others in request description
- **No operationId**: Generate name from `METHOD /path` (e.g., `GET /users/{id}` → `Get User by ID`)

---

## Quality Checklist

- [ ] Every `paths` entry produces at least one request
- [ ] Path params use `:param` format in Postman URL
- [ ] All `$ref` resolved — no raw `$ref` strings in output
- [ ] Auth tokens are `{{variables}}`, never hardcoded
- [ ] JSON output is valid and importable

---

## After Completing the API Design

Once the API design output is delivered, ask the user:

"Would you like me to generate API documentation for this design? (yes/no)"

If the user says **yes**:
- Check if the API Documentation skill is available in the installed skills list
- If the skill **is available**:
  - Read and follow the instructions in the API Documentation skill
  - Use the API design output above as the input
- If the skill **is NOT available**:
  - Inform the user: "It looks like the API Documentation skill isn't installed.
    You can install it and re-run.

If the user says **no**:
- End the task here

---

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
