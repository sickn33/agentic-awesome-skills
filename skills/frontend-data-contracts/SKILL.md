---
name: frontend-data-contracts
description: A portable, framework-agnostic discipline for type safety at the network edge of any React or React Native app. Establishes one typed API client as the single fetch boundary, a parse-don't-validate rule that turns wire JSON into trusted domain types before it enters the app, a single...
risk: unknown
source: https://github.com/stareezy-1/frontend-architecture-skill/tree/main/skills/frontend-data-contracts
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE
---

# Frontend Data Contracts (typed network boundary)
## When to Use

Use this skill when you need a portable, framework-agnostic discipline for type safety at the network edge of any React or React Native app. Establishes one typed API client as the single fetch boundary, a parse-don't-validate rule that turns wire JSON into trusted domain types before it enters the app, a single...


> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes a **discipline at the network edge** — one client, one envelope, one error
> type, validated types — not a state library or a styling system. It pairs with the
> **frontend-architecture** skill (the client lives in `shared/api-client/`) and is the foundation
> the **frontend-optimistic-mutations** skill builds on.

The goal: the moment data crosses from the network into the app, it stops being `any`-shaped wire
JSON and becomes a **trusted, typed domain value** — or it becomes a **single, typed error**.
There is exactly one place this transformation happens, and nothing untyped escapes it.

---

## 0. The five core ideas

1. **One client is the only fetch boundary.** A single typed `apiClient` wraps `fetch`. Components and hooks never call `fetch`/`axios` directly — the boundary is enforceable in review and lint.
2. **Parse, don't validate.** Wire JSON is parsed into domain types at the boundary. After the client returns, the value is trusted everywhere downstream — no defensive `?.` chains, no re-checking shapes in components.
3. **One envelope.** Every response is `{ data }` on success or `{ error }` on failure. The client unwraps `data` and throws on `error`, so callers receive the payload directly or a typed throw.
4. **One normalized error type.** Server error envelope, non-2xx status, malformed body, network failure, and abort all become a single `ApiError` with a machine code, status, and optional per-field errors. Callers handle one shape.
5. **Identifiers are branded.** Domain IDs are nominal types (`InvoiceId`, `CustomerId`) so the compiler rejects passing one where another is expected — the most common silent bug in data-heavy UIs.

---

## 1. Directory layout

The boundary is one folder in `shared/` (per the frontend-architecture skill).

```
src/shared/api-client/
├── index.ts        ← barrel: apiClient, ApiError, types
├── client.ts       ← the fetch wrapper: buildUrl, headers, parse, verbs
├── config.ts       ← base URL resolution, default headers
├── error.ts        ← the ApiError class + code→message-key mapping
├── types.ts        ← envelope types, HttpMethod, RequestOptions, field errors
└── client.test.ts  ← boundary behavior tests (envelope, errors, network)
```

Domain entity types and their **schemas** live with their feature module
(`modules/{feature}/types/`) or a shared contract package; the client is generic over `T`.

---

## 2. One client, the only fetch boundary

Every verb returns the **unwrapped** `data` payload typed by the caller, and **throws** an
`ApiError` on any failure. Components never see envelopes or raw responses.

```ts
// shared/api-client/client.ts (essence)
export const apiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, body, options);
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    /* … */
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    /* … */
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    /* … */
  },
} as const;

export type ApiClient = typeof apiClient;
```

```ts
// CORRECT — a feature hook wraps the client, typed by the caller
const invoice = await apiClient.get<Invoice>(`/invoices/${id}`, { signal });

// WRONG — a raw fetch in a component bypasses the boundary entirely
const res = await fetch(`/api/invoices/${id}`); // untyped, unhandled errors, no envelope
```

**Hard rules:**

- No `fetch`/`axios`/`XMLHttpRequest` outside `shared/api-client/` — enforce with an ESLint `no-restricted-imports`/`no-restricted-globals` rule.
- The client is **framework-free**: no toasts, no router, no React. Side effects (toasts, redirects) live in the query layer's `onError` (see §6).
- Pass `AbortSignal` through `RequestOptions` so the query layer can cancel (wired by TanStack Query).

---

## 3. Parse, don't validate (the boundary transform)

"Validate" leaves you with the same untyped value and a boolean. "Parse" returns a **new, typed
value** — so downstream code is guaranteed correct by the type system. Run a schema parse at the
boundary; after that, the value is trusted.

```ts
// modules/invoice/types/invoice.schema.ts
import { z } from "zod";

export const invoiceSchema = z.object({
  id: z.string().transform(toInvoiceId), // brand it (see §5)
  number: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  total: z.number().int(), // minor units — never float money
  issuedAt: z.string().datetime(),
});
export type Invoice = z.infer<typeof invoiceSchema>;
```

```ts
// the client (or a thin per-entity wrapper) parses at the edge
const raw = await apiClient.get<unknown>(`/invoices/${id}`, { signal });
return invoiceSchema.parse(raw); // throws on contract drift → surfaces as a typed failure
```

**Why this matters:** a backend that renames a field or sends a `null` it shouldn't is caught **at
the boundary**, with a clear error, instead of producing `undefined` three components deep where
the stack trace is useless. Components downstream never write `invoice?.total ?? 0` defensively.

> Validation library is your choice — **Zod**, **Valibot**, **ArkType**, **io-ts**. The rule is
> constant: a parse step converts `unknown` wire data into a typed domain value at one boundary.

---

## 4. One response envelope

Mirror the backend's single envelope in the client and unwrap it once.

```ts
// shared/api-client/types.ts
export interface ApiSuccessEnvelope<T> {
  data: T;
}
export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}
export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function isApiErrorEnvelope<T>(
  e: ApiEnvelope<T>,
): e is ApiErrorEnvelope {
  return typeof e === "object" && e !== null && "error" in e;
}

export interface ApiErrorBody {
  code: ServerErrorCode; // machine-readable, stable
  message: string; // server message (NOT shown to users directly)
  fields?: Record<string, string[]>; // per-field validation errors
}
```

The parse step handles every shape: `204 No Content` → `undefined`; `{ error }` → throw; non-2xx
with no well-formed envelope → synthesize an error; `{ data }` → return `data`. The caller only
ever sees a typed payload or a throw.

---

## 5. Branded (nominal) identifiers

Strings are interchangeable; domain IDs are not. Brand them so the compiler stops you passing a
`CustomerId` where an `InvoiceId` is required.

```ts
// shared/types/id.ts
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type InvoiceId = Brand<string, "InvoiceId">;
export type CustomerId = Brand<string, "CustomerId">;

export const toInvoiceId = (s: string): InvoiceId => s as InvoiceId;
export const toCustomerId = (s: string): CustomerId => s as CustomerId;
```

```ts
function loadInvoice(id: InvoiceId) {
  /* … */
}
loadInvoice(customerId); // ❌ compile error — exactly the bug you want caught
loadInvoice(invoiceId); // ✅
```

Brand IDs at the parse boundary (§3) so every ID in the app is already nominal. The runtime cost is
zero — brands erase at compile time.

---

## 6. One normalized error type

Collapse every failure mode into a single `ApiError` so callers handle one shape. It carries a
machine `code`, the HTTP `status`, optional per-field errors, and a stable key for localized
messages (it does **not** localize — that's the UI's job).

```ts
// shared/api-client/error.ts (essence)
export class ApiError extends Error {
  readonly code: ServerErrorCode;
  readonly status: number; // 0 when no response (network/abort)
  readonly fields?: Record<string, string[]>;

  get isNetworkError() {
    return this.status === 0;
  }
  get hasFieldErrors() {
    return !!this.fields && Object.keys(this.fields).length > 0;
  }
  /** Stable key under an `errors` i18n namespace — never a raw server string. */
  get messageKey() {
    if (this.isNetworkError) return "network";
    return ERROR_CODE_MESSAGE_KEYS[this.code] ?? "generic";
  }

  static fromEnvelope(body: ApiErrorBody, status: number) {
    /* server { error } */
  }
  static fromNetwork(cause: unknown) {
    /* offline / CORS / abort → status 0 */
  }
}
```

### 6.1 Where side effects live

The client throws; the **query layer** decides what the user sees. Keep toasts/redirects out of the
client.

```ts
// a TanStack Query mutation maps the typed error to a localized toast
useMutation({
  mutationFn: (input) => apiClient.post<Invoice>("/invoices", input),
  onError: (error: ApiError) => notifyError(error), // looks up error.messageKey in i18n
});
```

### 6.2 Per-field errors → form fields

Server validation (`fields`) maps straight onto form-field errors — one place, typed.

```ts
if (error.hasFieldErrors) {
  for (const [field, messages] of Object.entries(error.fields!)) {
    form.setError(field as Path<FormValues>, { message: messages[0] });
  }
}
```

**Hard rules:**

- Never `throw new Error(string)` from the data layer — always `ApiError` with a `code`.
- Never show `error.message` (a server/dev string) directly to users — resolve `messageKey` through i18n.
- A 2xx with an unparseable body is a **contract violation** → throw `INVALID_RESPONSE`, don't silently return `undefined`.

---

## 7. Library adapters

The discipline is constant; the data-fetching library only changes where `onError`/parsing hangs.

| Library                    | Where the client is called                                                | Where `ApiError` is handled                                                      |
| -------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **TanStack Query**         | `queryFn`/`mutationFn` call `apiClient.*`                                 | `onError` per query/mutation, or a global `QueryCache`/`MutationCache` `onError` |
| **RTK Query**              | `baseQuery` wraps `apiClient`, parses + returns `{ data }` or `{ error }` | `transformErrorResponse` → `ApiError`; handle in component or middleware         |
| **SWR**                    | `fetcher = (key) => apiClient.get(key)`                                   | `onError` in `SWRConfig` or per-hook                                             |
| **Plain fetch hooks (RN)** | a `useAsync` wrapper calls `apiClient.*`                                  | try/catch sets a typed error state                                               |

For **React Native**, the client is unchanged — `fetch` and `AbortController` exist in RN. Only
`credentials: "include"` (cookie auth) may need swapping for a token header depending on your auth.

---

## 8. Conventions checklist (enforce in review)

- [ ] Exactly one `apiClient` in `shared/api-client/`; no `fetch`/`axios` anywhere else (lint-enforced).
- [ ] The client is framework-free — no toasts, router, or React inside it.
- [ ] Responses are parsed into typed domain values at the boundary (parse, don't validate).
- [ ] One `{ data } / { error }` envelope, unwrapped once in the client.
- [ ] Every failure becomes one `ApiError` (code + status + optional fields); no bare `throw new Error`.
- [ ] Domain IDs are branded; IDs are branded at the parse boundary.
- [ ] `error.messageKey` resolves through i18n — server `message` is never shown to users.
- [ ] Per-field server errors map onto form fields via the typed `fields` map.
- [ ] `AbortSignal` flows through `RequestOptions` for cancellation.
- [ ] A 2xx with a malformed body throws a contract-violation error, not `undefined`.

---

## 9. How to apply this skill

**Adding the boundary to a project:** create `shared/api-client/` with `client.ts`, `error.ts`,
`types.ts`, `config.ts`. Add the lint rule banning `fetch`/`axios` elsewhere. Define your envelope
to match the backend, and your `ApiError` codes.

**Adding a new entity:** define its schema (Zod/Valibot) and `z.infer` type in the feature module,
brand its ID at parse time, and wrap `apiClient` in typed query/mutation hooks — never call the
client from a component.

**Debugging "undefined three components deep":** add/repair the boundary parse so contract drift
fails loudly at the edge with a typed error, instead of leaking `undefined` downstream.

**Reviewing the data layer:** run the checklist in §8. The highest-value catches are raw `fetch` in
components (boundary bypass) and `throw new Error(string)` from the data layer (untyped failures).

---

## Publishing / installing this skill

This skill follows the Anthropic `SKILL.md` format and is portable across agents.

1. Keep it under `skills/frontend-data-contracts/SKILL.md` in a public GitHub repo.
2. Keep the frontmatter `name` and high-signal `description` — discovery indexes match against it.
3. Install with: `npx skills add <org>/<repo> --skill "frontend-data-contracts"`.
4. Non-`SKILL.md` agents can be pointed here from `AGENTS.md` / `CLAUDE.md`; Kiro can mirror it as a steering file.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
