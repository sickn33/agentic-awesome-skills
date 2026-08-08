# Client-Side and Browser Hunting

#### When to use this file

Reach for this file when meaningful trust decisions or untrusted rendering happen in the browser: single-page apps, browser extensions, embedded webviews, and anything that renders attacker-influenceable content into the DOM, receives cross-window messages, opens WebSockets, or serves credentialed cross-origin responses. These bugs live in code the server never executes — the fragment after `#`, `window.name`, a `postMessage` payload — so server-side escaping and the classes in `ATTACK-CLASSES.md` don't cover them.

Use alongside `ATTACK-CLASSES.md`. The injection class there covers server-side sinks; this file covers the browser-side source→sink paths, cross-origin trust, and UI-redress classes that only exist client-side.

Pick the relevant classes based on Phase 1. Split per surface (DOM rendering, message/WebSocket handlers, auth-carrying endpoints) for large front-ends.

## Core discipline (include in every agent prompt for this domain)

```
- Client-side taint needs a controllable SOURCE and an executing SINK on the client path. A source with no sink, or a sink fed only server-rendered trusted data, is not a finding. Name both and show untrusted data reaching the sink unsanitized.
- The impact must cross to a victim or cross an origin. XSS in the attacker's own DOM, or a "leak" of the attacker's own data, is not a finding. State whose session executes it or whose cross-origin data it steals.
- Framework auto-escaping is a real mitigation. React/Vue/Angular escape interpolation by default — the finding is where the code opts OUT (`dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrust*`, `$sce.trustAs*`). Do not report escaped interpolation.
- A missing header or attribute (X-Frame-Options, frame-ancestors, rel=noopener, SameSite) is only a finding with a concrete sensitive action behind it. A bare missing flag with no state-changing action or credentialed cross-origin read is a hardening note.
```

## DOM-based injection attack classes (subagent_type: `general`)

**DOM-based XSS**
Trace client-side sources — `location.hash`/`search`/`href`/`pathname`, `document.referrer`, `window.name`, `postMessage` data, `document.cookie` — into execution sinks: `innerHTML`/`outerHTML`, `document.write`, `eval`, `Function`, `setTimeout`/`setInterval` with a string argument, `element.src`/`href` set to a `javascript:` URI, jQuery `$(...)`/`.html()`, or framework escape hatches (`dangerouslySetInnerHTML`, `v-html`, `bypassSecurityTrustHtml`). The bug is source→sink with no sanitization *on the client path*; server-side escaping never sees fragment or `window.name` data.

**DOM clobbering**
Attacker-injected `id`/`name` attributes — surviving an HTML sanitizer that strips script but allows attributes — that shadow a global the script later reads (`window.config`, a `form.action`, a flag checked before initialization). Look for code reading `window.X`/`document.X` that an injected element named `X` can override. Requires a markup-injection sink that permits `id`/`name`.

## Client-side trust and messaging attack classes (subagent_type: `general`)

**postMessage origin trust**
A `message` handler that acts on `event.data` (writes the DOM, calls a privileged function, stores a token) without checking `event.origin` against an allowlist, or with a weak check (`indexOf`, `startsWith`, unanchored regex, `endsWith` on the host). Also the send side: `postMessage(data, '*')` leaking data to any embedder. Confirm the handler does something security-relevant with the data.

**Cross-site WebSocket hijacking (CSWSH)**
A WebSocket handshake authenticated only by ambient cookies, with no `Origin` check and no per-session CSRF token — an attacker page opens a socket in the victim's authenticated context and reads/writes their data. Find the upgrade handler; check whether it validates `Origin` and binds to a token, not just the cookie.

**CORS with credentials**
A server that reflects the request `Origin` into `Access-Control-Allow-Origin` while sending `Access-Control-Allow-Credentials: true`, or allowlists `null` or a weak suffix match — any origin then reads authenticated responses. The finding is reflection or weak-match *with credentials*, not a wildcard alone (`*` with credentials is rejected by browsers).

## UI-redress and navigation attack classes (subagent_type: `general`)

**Clickjacking**
A state-changing action (transfer, delete, grant, confirm) reachable in a framed page with no `X-Frame-Options: DENY`/`SAMEORIGIN` and no `frame-ancestors` CSP and no UI framebusting. A missing frame guard on a read-only page with no sensitive action is not a finding — require the action.

**Reverse tabnabbing**
A link whose target is attacker-influenceable, opened with `target="_blank"`, letting the opened page rewrite `window.opener.location` to a phishing origin. Modern browsers imply `noopener` for `target="_blank"`, so this is a finding only where the code sets `rel="opener"` explicitly, uses `window.open` without `noopener`, or the threat model includes older browsers — check before reporting.

**Client-side open redirect / navigation**
A navigation built from a client source (`location = params.get('next')`, `location.hash` fed into `location.href`, a router redirect) with no allowlist — including `javascript:`/`data:` schemes that promote the redirect into XSS. Distinct from a server open-redirect: the sink is in JS, so the server never sees it.

## Prototype pollution attack classes (subagent_type: `general`)

**Prototype pollution and gadget chain**
An attacker-controlled key (`__proto__`, `constructor.prototype`) reaching a *nested/recursive* write — a deep merge, `lodash.set`-style path assignment, `obj[a][b]=v` with an attacker-controlled segment, or a query-string parser that builds nested objects — that lands on `Object.prototype`. A plain `JSON.parse` or shallow `Object.assign` does NOT pollute. Require the recursive sink AND a gadget that reads the polluted property (an options object checked with `opts.isAdmin`, a template reading a config default, a sink that concatenates a polluted `src`). Pollution with no reachable gadget is not exploitable; the gadget is what turns it into XSS, auth bypass, or (in Node) RCE.

## Universal moves (apply across the above)

- **Start from the sink and walk back to a client source.** Grep the execution sinks (`innerHTML`, `eval`, `document.write`, `dangerouslySetInnerHTML`, `postMessage`, `new WebSocket`) and trace each argument back to `location`/`name`/`referrer`/message data. A sink fed only server-rendered trusted data is not a finding.
- **Server escaping ends where the fragment begins.** Data after `#`, plus `window.name` and cross-window messages, never reaches the server — so server-side filters can't see it. That blind spot is the DOM-XSS goldmine.
- **Enumerate the escape hatches.** In an auto-escaping framework, the candidate list *is* every `dangerouslySetInnerHTML`/`v-html`/`bypassSecurityTrust*`/`$sce.trustAs*` call. Start there.

## Validation rules (apply before reporting ANY finding here)

1. **Confirm a controllable source AND an executing sink on the client path.** Cite the source (`location.hash`, `event.data`, `window.name`) and the sink (`innerHTML`, `eval`, navigation), and show untrusted data reaching the sink without sanitization. A source with no sink, or a sink fed only trusted data, is not a finding.
2. **For prototype pollution, prove the recursive write AND a gadget.** Show the nested/recursive assignment that reaches `Object.prototype`, then the code that later reads the polluted property to a security-relevant effect. Pollution with no reachable gadget is not exploitable.
3. **For messaging / CORS / WebSocket, show the origin check is absent or weak.** Cite the handler and the missing or `indexOf`/`startsWith`/unanchored-regex origin check, and that the data drives a security-relevant action or a credentialed cross-origin read. Reflection plus credentials, not a bare wildcard.
4. **For UI-redress, require the sensitive action behind the missing guard.** Name the state-changing action that gets framed (clickjacking) or the attacker-controlled `_blank` link (tabnabbing). A missing `X-Frame-Options`/`rel=noopener` with nothing sensitive behind it is a hardening note — and framebusting, `frame-ancestors`, or the browser's `noopener` default may already defeat it. Check before reporting.
5. **Return ONLY confirmed findings** with the client source→sink path and whose session it fires in — or "No exploitable client-side issues found" if that's honest.
