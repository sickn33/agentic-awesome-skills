---
name: add-webmcp
description: Analyze an existing web application, identify safe user-visible capabilities
  across routes, forms, server actions, handlers, and schemas, then implement first-party
  WebMCP tools and validate discover…
compatibility: Requires Node.js 22.18 or newer. Validation needs Chrome/Chromium locally
  or BROWSERBASE_API_KEY for a publicly reachable preview.
license: MIT
allowed-tools: Bash Read Grep Edit Write
source_repo: browserbase/skills
source_type: official
source: browserbase
date_added: '2026-09-21'
risk: unknown
---

## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Add WebMCP

Turn capabilities already implemented by a web app into maintained, first-party WebMCP tools. Modify the target codebase and its tests; do not introduce a hosted proxy or third-party runtime.

Compatibility: the bundled Stagehand validator requires Node.js 22.18 or newer. Validation needs Chrome/Chromium locally or `BROWSERBASE_API_KEY` for a publicly reachable preview.

Be verbose as you work: report what each step found as you go, not only in the final report.

Use `webmcp-gen` instead when the requested output is a standalone init script derived from a live URL. This skill starts from source code and integrates tools into the application.

## 1. Establish the application boundary

Read the target repository's instructions, package manifests, framework configuration, and current git status. Preserve unrelated changes.

Set `ADD_WEBMCP_SKILL_DIR` to the directory containing this file and run the bounded scanner:

```bash
node "$ADD_WEBMCP_SKILL_DIR/scripts/scan-codebase.mjs" "$TARGET_REPO"
```

Treat scanner results as leads, not conclusions. In a monorepo, identify the actual browser app and the server packages it calls before editing.

## 2. Build a capability inventory

Trace each candidate from its user-visible entry point through the client handler, validation schema, server boundary, authorization checks, side effect, and returned state. Look at:

- routes and screens;
- forms and their submit handlers;
- server actions, API handlers, RPC procedures, and service clients;
- Zod, Valibot, Yup, Joi, JSON Schema, or equivalent validators;
- authentication, authorization, CSRF, idempotency, rate limits, and audit hooks.

Prefer complete user tasks such as `search_catalog` or `save_draft`, not a mechanical tool per endpoint. Exclude internal/admin-only operations, authentication bypasses, raw database access, secret-bearing operations, and capabilities the UI does not grant the current user.

For each selected tool, record its source files, existing validation and authorization boundary, side effects, risk class, confirmation behavior, and a safe fixture input. Read [references/implementation-and-validation.md] for the detailed inventory and framework patterns.

## 3. Design the tool contract

- Use a stable verb-noun name and describe the user-visible effect, prerequisites, and important exclusions.
- Derive JSON Schema from the application's existing validator or domain type. Do not invent a second, looser contract. Close object schemas with `additionalProperties: false` and make the execute-time parser reject unknown fields too; a closed discovery schema backed by a permissive runtime parser is not a closed contract.
- Return compact JSON-serializable domain results. Do not return DOM nodes, credentials, cookies, tokens, or entire HTML documents.
- Call the same client/service boundary as the UI so existing validation, authorization, observability, and business rules remain authoritative.
- Validate again inside the handler. Agent-provided input is untrusted.
- Never echo the request back as the result. Read the outcome from the application's own state, and where that state is updated asynchronously (React and most reactive stores do not reflect a change on the next line), poll until it settles before reading, then report whatever is actually true. Echoing turns a silent no-op into a passing test.

Assign annotations deliberately:

| Risk | Tool design | Annotation and confirmation behavior |
| --- | --- | --- |
| Read-only | No state mutation | Register `readOnlyHint: true`; add `untrustedContentHint: true` when output includes page or user-controlled text |
| Reversible mutation | Drafts, preferences, cart edits | Register `readOnlyHint: false`; preserve auth/idempotency; test only with disposable state |
| Consequential or irreversible | Purchase, send, publish, delete, permission changes | Split preview/prepare from commit where possible; do not add declarative `toolautosubmit`; keep the final action behind the app's real confirmation control |

Registration uses the current WebMCP hint names `readOnlyHint` and `untrustedContentHint`. Stagehand v4 normalizes discovered annotations to `readOnly`, `untrustedContent`, and, for declarative forms, `autosubmit`. These are hints to the browser or agent, not security enforcement. The application must enforce permissions, validation, confirmation, idempotency, and replay protection.

## 4. Integrate with the application

Use the runtime model context exposed by the browser:

```js
const modelContext = navigator.modelContext || document.modelContext;
```

Keep both accessors: current Chrome exposes `document.modelContext` as a native `ModelContext` while `navigator.modelContext` is `undefined`, so the fallback is load-bearing rather than defensive. The surface is browser-provided and present on any page, so the application ships no polyfill.

Register imperative tools from a client-only root/provider after the application is ready. `registerTool` returns a promise and is idempotent by name — re-registering replaces the previous definition rather than duplicating it, and there is no unregister handle — so remounting and hot reload are safe without teardown. Use declarative form attributes when an existing form already represents the exact task and preserving a visible review step is valuable.

Do not duplicate server business logic in the tool executor. Do not weaken CSRF, same-origin, auth, or confirmation checks to make a smoke test pass. Never embed secrets in browser code.

## 5. Verify the implementation

Run the target's focused tests, typecheck, and production build. Then create a small `webmcp.e2e.json` with every expected tool. Discovery is mandatory; invocation is opt-in per test case and must use synthetic or disposable data.

Install the validator dependencies once:

```bash
pnpm --dir "$ADD_WEBMCP_SKILL_DIR" install --frozen-lockfile
```

Validate localhost with a Stagehand-launched local browser:

```bash
node "$ADD_WEBMCP_SKILL_DIR/scripts/validate-stagehand.mjs" \
  --url http://localhost:3000 \
  --config "$TARGET_REPO/webmcp.e2e.json" \
  --local
```

Local runs are headed by default so the browser is visible while it validates; pass `--headless` for CI or unattended runs.

If discovery reports zero tools, check the host before suspecting the code: dev servers commonly bind `localhost` only, so `--url http://127.0.0.1:PORT` finds nothing while `http://localhost:PORT` works. The failure looks identical to tools never registering.

Use `--browserbase` only for a publicly reachable deployed preview. The validator uses Stagehand v4's real `page.tools()`, `tool.invoke()`, and `invocation.result()` path. It refuses consequential invocations unless `--allow-consequential` is explicitly supplied.

An injected init script is useful for testing the validator itself, but it is not proof that the target app ships its own tools. Final application proof must run without `--init-script`.

## 6. Adversarially verify the tools actually worked

Step 5 proves each tool is discoverable and that its executor ran. It does not prove the tool did what it claimed, and a passing config is not evidence of a sound contract. Run this step last, after step 5 is green, and drive it yourself against the live page rather than encoding it in `webmcp.e2e.json` — the point is to probe inputs the author did not anticipate.

Drive the page with a persistent browser session so probes accumulate against real state. The browse CLI is the lightest option — one global install, and the session survives between commands:

```bash
browse open http://localhost:3000 --session probe --local --headed
browse eval --session probe '(async()=>{const mc=document.modelContext;const t=(await mc.getTools()).find(x=>x.name==="my_tool");try{return "ACCEPTED "+JSON.stringify(await mc.executeTool(t,JSON.stringify({/* probe input */})));}catch(e){return "REJECTED";}})()'
browse screenshot --session probe --path /tmp/effect.png
```

Three things will cost time otherwise: `browse open` defaults to a **cloud** browser that cannot reach localhost, so `--local` is required; `browse eval` reliably accepts only single-line scripts, so run one probe per command; and `executeTool` takes the tool **object** plus arguments as a **JSON string** — a plain object fails with "Failed to parse input arguments".

Assert on rejected-versus-accepted, not on error text. The WebMCP layer replaces a handler's message with a generic invocation-failed string, so a precise reason never reaches the caller.

Use the discovered `tool.inputSchema` as the thing under test, not as the source of truth. For each tool, probe:

- **Schema closure.** Invoke with an extra field the schema does not declare. A tool honoring §3 rejects it. Acceptance means the closed contract is decorative.
- **Required fields.** Omit a `required` property. The invocation must fail; a `Completed` status carrying a null or partial result is worse than an error, because the agent believes it succeeded.
- **Types and constraints.** Send a string where the schema says `number`, an out-of-range value against `minimum`/`maximum`, and a value outside an `enum`. Silent coercion or echo-back means the handler never validated.
- **Error honesty.** Confirm a tool that should fail reports a non-`Completed` status rather than returning a success-shaped body.
- **Annotation honesty.** Compare each tool's real `annotations` against the risk you assigned in step 3. A pure lookup advertising `readOnly: false`, or a mutating tool advertising `readOnly: true`, is a defect even though discovery passes.
- **Clean rejection.** After the malformed probes above, re-read the application's state. A rejected call must leave nothing behind; partial state from a half-applied invocation is a defect the accept/reject result alone will not surface.
- **Consequential gating.** Never invoke these. Verify the tool declares its risk, that no declarative `toolautosubmit` is present, and that the app's own confirmation control still stands between the agent and the effect.

Then verify the **effect**, not the return value. Invoke the tool, then inspect the application independently — DOM assertions for rendered state, a screenshot when the surface is a canvas or chart. A handler that returns `{saved: true}` without changing anything passes step 5 and fails here. When the surface has no readable DOM, have the tool read back from the application's real store so the returned value is grounded in actual state rather than composed by the executor.

Treat every discrepancy as a defect in the application or the tool contract, and fix it there. Do not loosen a schema, downgrade an annotation, or delete a probe to make this step pass.

## 7. Report the result

List the capabilities considered and explain exclusions. For each implemented tool, report its contract, backing code path, risk/confirmation treatment, actual Stagehand discovery/invocation result, and the step 6 adversarial probes it survived. State any environment or browser support not tested.

For a comparative benchmark, quality audit, or scored evaluation, read [references/quality-rubric.md]. Apply its qualification gates before reporting numerical scores; do not let a high diagnostic score hide fabricated behavior, an unsafe consequence boundary, or missing production discovery.

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
