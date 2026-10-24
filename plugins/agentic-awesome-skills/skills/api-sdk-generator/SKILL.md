---
name: api-sdk-generator
description: "Generates client SDK code, API wrapper libraries, request/response models, and language-specific usage patterns for any REST API."
risk: critical
source: https://github.com/LambdaTest/agent-skills/tree/main/api-skill/api-sdk-generator
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# API SDK & Codegen Skill
## When to Use

Use this skill when you need generates client SDK code, API wrapper libraries, request/response models, and language-specific usage patterns for any REST API. Use whenever the user asks to "generate an SDK", "write a client library", "create API wrappers", "generate TypeScript types from my API", "write a Python...


Generate API-specific client drafts; production readiness requires the actual contract, tests and target-language review.

---

## SDK Structure (any language)

```
sdk/
├── client.{ext}          — main client class with base URL, auth, retry
├── resources/
│   ├── users.{ext}       — one file per API resource
│   ├── orders.{ext}
│   └── ...
├── models/
│   ├── user.{ext}        — request/response data models
│   └── ...
├── errors.{ext}          — typed error classes
└── utils/
    ├── retry.{ext}
    └── pagination.{ext}
```

---

## Base Client Pattern

### Python
```python
import httpx
from typing import Optional
import time

class APIClient:
    def __init__(self, api_key: str, base_url: str = "https://api.example.com/v1"):
        self.base_url = base_url
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "example-sdk-python/1.0.0"
        }
        self._client = httpx.Client(timeout=30.0)

    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.base_url}{path}"
        # No automatic replay of writes: add bounded retries only for operations
        # documented as safe/idempotent, with API-supported idempotency keys.
        resp = self._client.request(method, url, headers=self._headers, **kwargs)
        if resp.is_error:
            raise APIError(resp.status_code, "Request failed")  # redact bodies/secrets
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()  # validate against the endpoint response schema

    def close(self):
        self._client.close()

```

### TypeScript
```typescript
class APIClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(apiKey: string, baseUrl = 'https://api.example.com/v1') {
    this.baseUrl = baseUrl;
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      throw new Error(`API request failed: HTTP ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return await res.json() as T; // A cast is not runtime schema validation.
  }
}
```

---

## Resource Class Pattern

### Python
```python
from dataclasses import dataclass
from typing import Optional, List

@dataclass
class User:
    id: str
    name: str
    email: str
    created_at: str
    role: Optional[str] = None

class UsersResource:
    def __init__(self, client: APIClient):
        self._client = client

    def list(self, page: int = 1, limit: int = 20) -> List[User]:
        data = self._client._request("GET", f"/users?page={page}&limit={limit}")
        return [User(**u) for u in data["data"]]

    def get(self, user_id: str) -> User:
        data = self._client._request("GET", f"/users/{user_id}")
        return User(**data)

    def create(self, name: str, email: str, role: Optional[str] = None) -> User:
        payload = {"name": name, "email": email}
        if role:
            payload["role"] = role
        data = self._client._request("POST", "/users", json=payload)
        return User(**data)

    def delete(self, user_id: str) -> None:
        self._client._request("DELETE", f"/users/{user_id}")
```

---

## Typed Error Classes

```python
class APIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"HTTP {status_code}: {message}")

class AuthenticationError(APIError): pass   # 401
class AuthorizationError(APIError): pass    # 403
class NotFoundError(APIError): pass         # 404
class ValidationError(APIError): pass       # 422
class RateLimitError(APIError): pass        # 429
class ServerError(APIError): pass           # 5xx
```

---

## Pagination Helper

```python
def paginate_pages(fetch_page, max_pages=100):
    """fetch_page(page) must return {data: [...], total_pages: int}."""
    for page in range(1, max_pages + 1):
        result = fetch_page(page)
        yield from result["data"]
        if page >= result["total_pages"]:
            return
    raise RuntimeError("Pagination limit reached")
```

This helper requires a page-envelope endpoint, not `UsersResource.list` above, which returns a list. Adapt cursor/page semantics to the actual API, validate envelopes and bound total items/time. Encode path identifiers (including slashes), pass query values through the HTTP client's parameter encoder, constrain base URLs to trusted HTTPS origins and avoid leaking authorization to redirects. Close Python clients in a `finally` block or implement a context manager. The examples assume JSON success bodies other than 204; binary/text endpoints need separate response handling.


---

## Rules

- Retry only eligible operations within a deadline/attempt budget; parse Retry-After dates or seconds, cap delays and add jitter. Never automatically replay non-idempotent writes without documented support.
- Always include a `User-Agent` header identifying the SDK name and version.
- All models must be typed (dataclasses in Python, interfaces in TypeScript, structs in Go).
- Resource classes should mirror the API resource hierarchy.
- Provide a usage example for every generated class.

---


## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
