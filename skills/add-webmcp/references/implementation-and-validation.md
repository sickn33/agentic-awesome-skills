# Implementation and validation reference

Read this reference while analyzing a target repository, choosing integration points, or configuring the Stagehand validator.

## Capability inventory

Build a compact table before editing:

| Capability | UI entry | Handler/service | Validator | Auth/guard | Side effect | Risk | Proposed tool/test |
| --- | --- | --- | --- | --- | --- | --- | --- |

Trace real call paths. A route name or schema alone does not prove that a capability is usable, authorized, or safe to expose.

Framework signals worth checking:

- Next.js App Router: `app/**/page.*`, `route.*`, files containing `"use server"`, client components, server actions, and root layouts/providers.
- Next.js Pages Router: `pages/**`, `pages/api/**`, `_app.*`, API clients, and form handlers.
- React routers: `<Route>`, `createBrowserRouter`, route modules, mutation/query hooks, and the root render entry.
- Vue/Nuxt, Svelte/SvelteKit, Remix, and similar systems: route modules, server/load/action files, composables, and root layouts.
- Any stack: `<form>`, submit listeners, named task functions such as `search*`, `calculate*`, or `save*`, network clients and query/mutation hooks, RPC routers, OpenAPI/JSON Schema, validation libraries, authorization middleware, local persistence or state stores (including localForage), and existing `modelContext` usage.

The bundled scanner reports file/line leads without printing source snippets. Open only the relevant files and follow imports and calls manually.

## Choosing imperative or declarative tools

Use imperative registration when the application already has a typed client or service function and the tool should return a structured result without UI navigation.

Use declarative form integration when a visible form is the source of truth and user review is part of the intended flow. Current experimental Chromium builds recognize attributes such as:

```html
<form toolname="search_catalog" tooldescription="Search the public product catalog.">
  <input
    name="query"
    required
    toolparamdescription="Words in the product name or description"
  />
  <button type="submit">Search</button>
</form>
```

Do not add automatic submission to payment, message sending, publishing, deletion, permission changes, or other consequential forms.

## Imperative registration shape

Keep the definitions next to the existing client boundary or in a small client-only module imported by the root provider:

```ts
const modelContext = navigator.modelContext || document.modelContext;

if (modelContext?.registerTool) {
  await modelContext.registerTool({
    name: "search_catalog",
    description: "Search products visible to the current user without changing application state.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: true,
    },
    execute: async (input) => {
      const parsed = SearchCatalogInput.parse(input);
      const response = await searchCatalog(parsed);
      return {
        results: response.items.map(({ id, name, price }) => ({ id, name, price })),
      };
    },
  });
}
```

WebMCP browser APIs are still evolving. Check the browser and project versions before choosing cleanup behavior. Register once at the application root; use supported abort/unregister behavior when present, and guard development hot reload from duplicate names. Do not guess an unregistration signature.

The registration API currently accepts `readOnlyHint` and `untrustedContentHint`. Stagehand v4 exposes their discovered values as `tool.annotations.readOnly` and `tool.annotations.untrustedContent`; declarative tools may also expose `tool.annotations.autosubmit`. Keep this registration-versus-discovery naming distinction in tests.

## Security and reliability checks

- Treat every input as untrusted and use the same schema as the UI/server path. Keep discovery and runtime acceptance aligned: when JSON Schema says `additionalProperties: false`, configure the execute-time validator to reject unknown keys rather than silently stripping or accepting them.
- Preserve session, same-origin, CSRF, authorization, rate-limit, and audit enforcement.
- Use idempotency keys for replay-sensitive mutations when the product already supports them.
- Prefer prepare/preview plus explicit commit for consequential workflows.
- Return minimal data and mark page/user-controlled output as untrusted content.
- Never expose tokens, cookies, headers, stack traces, hidden form fields, internal IDs that bypass normal lookup, or unrestricted URLs.
- Keep tool availability aligned with the current authenticated state and page capability.

## Stagehand validator configuration

The validator expects JSON shaped like:

```json
{
  "timeoutMs": 5000,
  "expectedDom": [
    {
      "selector": "#last-tool",
      "text": "search_catalog"
    }
  ],
  "tools": [
    {
      "name": "search_catalog",
      "risk": "read-only",
      "expectedAnnotations": {
        "readOnly": true,
        "untrustedContent": true
      },
      "input": {
        "query": "notebook",
        "limit": 3
      },
      "expectedOutputSubset": {
        "results": []
      }
    },
    {
      "name": "submit_order",
      "risk": "consequential"
    }
  ]
}
```

Rules:

- Every listed tool is discovered and checked for a non-empty description and object input schema.
- A case with no `input` is discovery-only.
- A case with `input` is invoked and must finish with `expectedStatus` (default `Completed`).
- `expectedAnnotations` and `expectedOutputSubset` are recursive subset assertions.
- `expectedDom` checks exact `textContent` after all configured invocations, proving the page observed the calls.
- `risk` must be `read-only`, `reversible`, or `consequential`.
- Consequential cases with input are rejected unless `--allow-consequential` is supplied. Supply it only for an explicitly authorized sandbox with synthetic data.
- The validator prints only the configured expected subset, not arbitrary live output.

Local application validation:

```bash
node scripts/validate-stagehand.mjs \
  --url http://127.0.0.1:3000 \
  --config /path/to/webmcp.e2e.json \
  --local
```

If Chrome is installed outside the platform default locations, add `--executable-path /path/to/chrome`. In an isolated CI container that cannot launch Chrome's sandbox, add `--no-sandbox`; do not use that flag on an ordinary workstation.

Public preview validation on Browserbase:

```bash
node scripts/validate-stagehand.mjs \
  --url https://preview.example.test \
  --config /path/to/webmcp.e2e.json \
  --browserbase
```

Use `--init-script /path/to/register.js` only to validate a generated registration module or the validator fixture. Run the final target proof without it.

## Test ladder

1. Run the scanner and review the inventory manually.
2. Run target unit/integration tests for the wrapped services and validators.
3. Run the target typecheck and production build.
4. Start the actual app and verify tool discovery with Stagehand.
5. Invoke read-only and safely reversible fixtures; verify state or structured output.
6. Discover consequential tools, but do not invoke them unless an authorized sandbox and explicit test boundary exist.
7. Re-run after production build or on a deployed preview to catch client-only registration and bundling mistakes.

## Maintainer smoke target

The Browserbase-owned Stagehand eval site is a stable no-injection check for the validator itself:

```bash
pnpm test:e2e:owned
```

It discovers all four tools published by `https://browserbase.github.io/stagehand-eval-sites/sites/webmcp-test/`, invokes two deterministic read-only tools, and leaves the failure and support-submission tools discovery-only. Purpose-built catalog and support gym configurations live under `tests/fixtures/`; run them against their local eval-site checkout before publishing changes.
