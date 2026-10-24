# Bug bounty evidence and review details

This reference supports the root workflow and its per-command authorization gate.
It is a static-review checklist, not an instruction to execute payload collections,
exfiltrate tokens, persist on runners, tamper with releases or bypass monitoring.

## Review by security boundary

| Area | Source review / controlled test question | Evidence limit |
|---|---|---|
| Object authorization | Are subject, action, object and tenant checked server-side? | A 200 response alone is not cross-user access |
| SSRF | Are parsed origin, resolved address, redirects and protocols constrained? | DNS callback is not HTTP access, metadata credentials or RCE |
| OAuth/OIDC | Are redirect validation, state/nonce, issuer/audience and PKCE appropriate to the flow? | Missing one field is not automatically ATO |
| Uploads | Are size/type/content, storage isolation and execution boundaries enforced? | Magic bytes or extension alone do not establish a safe file |
| Races/logic | Are invariant checks and updates atomic and retry-safe? | Concurrent requests do not guarantee simultaneous execution or double spending |
| XSS | Does untrusted data reach an executable browser context? | HttpOnly blocks cookie reads, not all actions available to an XSS payload |
| SQL/templates | Does untrusted input alter structure rather than remain bound data? | Error text/arithmetic output alone can have other causes |
| Cache | Are identity, tenant and response variation represented in key/access policy? | Reflection alone is not evidence that another user consumes poisoned data |
| AI tools | Does untrusted content cross into unauthorized tool use or data disclosure? | Prompt text alone does not prove tool execution or extracted training data |
| Infrastructure | Are management interfaces, storage and credentials appropriately scoped? | Public listing or banner is not automatic Critical severity |

Use the exact version's documentation and a controlled lab to resolve ambiguities.
Encoding operations can panic on attacker-influenced values too; do not discard
Rust panic paths solely because they encode rather than decode. Lexical matches
are not complete dataflow analysis and excluded files can contain relevant code.

## GitHub Actions source review

Trace trigger, principal, immutable checkout, called actions/build hooks, token and
secret grants, runner boundary, cache/artifact writer and consumer. Inspect all
relevant files as inert source. Do not prove impact by stealing real secrets,
registering a runner, modifying a release or triggering privileged production jobs.

- Untrusted expressions in shell source can inject code. Pass validated data via
  environment and quote it, but also apply semantic allowlists; quoting an
  attacker-chosen Docker image does not make that image safe.
- A heredoc with a fixed delimiter and direct expression interpolation does not
  fix injection. Prefer avoiding environment-file transport for untrusted text;
  otherwise validate values and use collision-resistant delimiters correctly.
- `pull_request_target` normally checks out the base context; checking out a PR
  head and executing its code changes the threat model. Reduced token permission
  does not remove other explicit secrets or host privileges.
- Full commit SHAs are immutable values. Approval must bind that SHA and trusted
  origin; a mutable branch can move. Do not claim the same SHA silently changes.
- Verify artifact writer identity, run, commit and trusted provenance before use.
  A checksum delivered by the same untrusted source is not independent proof.
  Same-run artifacts can still cross privilege boundaries.
- Cache scope, version and allowed writer matter as well as key. Ordinary PR
  caches scoped to merge refs do not become default-branch caches simply because
  their key matches. Conversely, a unique key is not a general trust boundary.
  Consult the current cache-access rules and trace the actual privileged writer.
- Ephemeral runners reduce persistence duration but do not prevent access to
  host/network/credentials during a job. Private repos and prior contributor
  status do not prove inputs are trusted. Restrict network, host and secret access.
- Exact actor identities cannot be spoofed merely by a similar username. Label
  mutation permissions and repository policy must be checked, not assumed.
- `GITHUB_TOKEN` permissions and repository settings constrain workflow changes;
  `contents: write` alone is not proof of arbitrary workflow creation or access
  to every organization secret. `secrets: inherit` inherits available secrets,
  not all secrets regardless of repository/environment policy.

These are review questions, not a scanner pass. Tool coverage, GHSA histories,
payout figures and detection claims require their own pinned sources and tests.

## Severity and report quality

Use FIRST's actual calculator/specification for the requested CVSS version. For
CVSS 3.1, AV, AC, PR, UI, S, C, I and A combine into a vector and score; individual
metric choices are not low/medium/high score buckets. Qualitative bands are None
0, Low 0.1–3.9, Medium 4.0–6.9, High 7.0–8.9 and Critical 9.0–10.0. Record the
vector, assumptions and any program-specific business impact separately.

CORS wildcard with credentialed browser reads is not automatically exploitable:
browsers reject wildcard allow-origin for credentialed sharing. Reflected allowed
origins, credential mode and actual sensitive responses require independent
validation. An OAuth client ID is public; suspected secrets depend on client type
and use. A redirect, dangling CNAME or expired/reset token needs contextual proof,
not a universal severity label. Never register a third-party resource or use a
real victim's account to strengthen a report without specific permission.

```text
Title: [boundary failure] at [version/location] permits [bounded effect]
Scope and authorization: [exact asset, policy and test limits]
Prerequisites: [role, accounts, configuration, interaction]
Observed: [minimal redacted evidence and expected/actual comparison]
Reproduction: [safe steps; label source-only/unexecuted steps]
Impact: [demonstrated effect, inferred scope and uncertainty separately]
Severity: [requested CVSS version/vector plus program interpretation]
Remediation: [specific boundary enforcement and regression test]
Untested / stop conditions: [what was deliberately not accessed or changed]
```

Do not claim all users are affected from one test, suppress prerequisites, promise
payouts or demand confidential duplicate-report details. Duplicates may be private;
ask for clarification professionally. Report suspected issues honestly rather than
silently deleting them because live exploitation would exceed approved scope.
Keep reports as drafts until authorized submission; avoid public disclosure of
sensitive evidence. This source review does not execute probes or certify tools.

## Primary references

- [FIRST CVSS 3.1 specification](https://www.first.org/cvss/v3.1/specification-document)
- [GitHub cache-access rules](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions security](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

Upstream attribution and licensing declarations remain in the root frontmatter;
this reference replaces unsafe and technically incorrect executable recipes with
bounded verification requirements. It is not a new license certification.
