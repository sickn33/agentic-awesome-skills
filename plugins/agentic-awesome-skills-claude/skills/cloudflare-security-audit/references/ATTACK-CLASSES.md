# Attack Classes

#### Attack classes — choose and split based on Phase 1

Select attack classes relevant to the application type. Not every class applies to every codebase. The list below is a starting point — add application-specific ones based on Phase 1. For large codebases, split classes per subsystem.

> **Native / binary / kernel targets** (C/C++/Rust-unsafe, kernel modules, parsers and decoders, reverse-engineering tooling, runtimes/JITs, firmware): the web-oriented classes below fit poorly. Use the memory-safety, binary, and kernel classes in [MEMORY-SAFETY-AND-BINARY.md](MEMORY-SAFETY-AND-BINARY.md) instead of or alongside them.
>
> **AI / LLM / agent targets** (chatbots, RAG pipelines, tool-calling agents, MCP servers/clients, anything that builds prompts from untrusted input or acts on model output): use the prompt-injection, agency, and output-handling classes in [AI-AND-LLM.md](AI-AND-LLM.md) alongside the classes below.
>
> **HTTP-protocol and auth targets** (reverse proxies, CDNs, API gateways, custom HTTP parsers, and anything implementing sessions, JWT, OAuth/OIDC, or SAML): use the request-framing, cache, and auth-protocol classes in [WEB-PROTOCOL-AND-AUTH.md](WEB-PROTOCOL-AND-AUTH.md) alongside the classes below.
>
> **Client-side / browser targets** (SPAs, browser extensions, embedded webviews, anything using `postMessage`, CORS, or WebSockets, or that renders untrusted content in the DOM): use the DOM-injection, messaging-trust, and UI-redress classes in [CLIENT-SIDE.md](CLIENT-SIDE.md) alongside the classes below.

**Injection** (subagent_type: `general`)
Trace untrusted input from entry point to dangerous sink. What counts as a "dangerous sink" depends on the application:
- Web apps: SQL queries, HTML output, shell commands, template engines, file paths, HTTP redirects, deserialization
- Libraries: any function that processes caller-supplied data without validation — buffer operations, parsers, format strings
- CLI tools: shell command construction, file path handling, environment variable interpolation
- Services: query construction, message serialization, log injection, LDAP/XPATH queries
- Client-side (browser/JS): DOM XSS, prototype pollution, `postMessage`/origin trust, and other browser-side classes — see [CLIENT-SIDE.md](CLIENT-SIDE.md)

Don't just check the obvious direct paths. Look for indirect injection: data stored safely, then retrieved and used in a dangerous context by different code. Look for injection through field names, keys, headers, and metadata — not just values. Look for injection into secondary systems (logs, caches, search indexes, analytics).

**Access control** (subagent_type: `general`)
Can a caller do something they shouldn't? Go beyond checking whether permission checks exist — verify they check the *right* permission for the *right* resource via the *right* mechanism:
- Is there a path to the same state change that checks a different (weaker) permission?
- Can a field in the request body override what the permission system intended to restrict?
- Are there endpoints that gate on authentication but forget authorization?
- Does the same resource have multiple access paths with inconsistent checks?
- What about bulk/batch/export/import operations — do they enforce per-item permissions?

For complex access models, split into separate agents for auth bypass vs authorization logic.

**Resource and file handling** (subagent_type: `general`)
- Path traversal (reading/writing outside intended directories) — including through symlinks, encoded sequences, and null bytes
- SSRF (making the application fetch attacker-controlled URLs) — including through redirects, DNS rebinding, and URL parser differentials
- Unsafe deserialization, archive extraction (zip slip), temp file handling
- Memory safety (if applicable): buffer overflows, use-after-free, integer overflow
- Race conditions on file operations (TOCTOU between check and use)

**Cryptography and secrets** (subagent_type: `general`)
- Weak randomness for security-critical values (tokens, keys, nonces)
- Hardcoded secrets, secrets in logs, error messages, URLs, or client-visible responses
- Broken key derivation, missing HMAC verification, nonce reuse
- Timing side-channels on secret comparison
- Misuse of crypto primitives (ECB mode, unauthenticated encryption, static IVs, etc.)
- What happens when crypto operations fail? Does the error path fall back to no-crypto?

**Business logic** (subagent_type: `general`)
This is where the real bugs hide. Standard scanners can't find logic errors. For each major workflow:
- **State machine violations**: Can you skip steps? Go backwards? Reach an invalid state? What happens if you replay a completed flow? What about partial failure — if step 2 of 3 fails, is step 1 rolled back?
- **Race conditions with business impact**: Concurrent operations that produce invalid states (double-spend, double-approve, lost updates). Focus on operations that check-then-act non-atomically.
- **Numeric/quantity manipulation**: Negative values, zero values, overflow, precision loss, type coercion between string and number.
- **Access boundary violations**: Not "does the permission check exist" but "is it the right check for the business rule?" Can input to one operation bypass a restriction enforced on a different operation for the same effect?
- **Implicit trust assumptions**: Data from storage, config, other components, or plugins assumed safe because "we validated it on the way in." What if a different code path wrote it?
- **Time-based logic**: Expiry checks, scheduling, rate windows, clock skew. What happens at exact boundary moments? What about timezone differences between components?
- **Default and fallback behavior**: What's the security posture when config is missing? When a feature flag is off? When a dependency is unavailable? When the system is mid-migration?

**Feature abuse and data leakage** (subagent_type: `general`)
Legitimate features used for unintended purposes. Don't look for bugs in the code — look for bugs in the design:
- **Export/backup as exfiltration**: Can a low-privilege user trigger an export, snapshot, or backup that includes data above their access level? Can they export other users' data? Does the export include deleted/draft/private content? Revision history that was supposed to be pruned?
- **Import/restore as injection**: Can import overwrite existing data? Can it create records that bypass normal validation? Can it inject content into collections the user doesn't have write access to? Does it respect the same permission model as the UI?
- **Search/filter/sort as oracle**: Can search queries reveal whether content exists that the user can't directly access? Do filter parameters let users probe statuses, roles, or fields they shouldn't know about? Does sorting by a hidden field reveal its values through result ordering?
- **Enumeration through side effects**: Do error messages differ between "doesn't exist" and "you don't have access"? Do response times differ? Response sizes? HTTP status codes? Can you enumerate users through password reset, invite, or registration flows?
- **Preview/draft/staging leakage**: Are preview tokens scoped to one item or do they unlock broader access? Can draft content be discovered through search, RSS feeds, sitemaps, or API listing endpoints? Can cache headers cause a CDN to serve private content publicly?
- **Notification/webhook as SSRF**: Can a user set a notification URL, webhook URL, or callback URL that the server fetches? Is it validated against internal networks? What about after a redirect?

**Chained attacks and trust boundaries** (subagent_type: `general`)
Individual safe behaviors that become dangerous in combination. Think about the full system:
- **Multi-step chains**: Map out what a low-privilege user CAN do, then look for combinations. Info disclosure (learning a resource ID) + IDOR (accessing it directly) + missing rate limit (brute-forcing the ID space). Open redirect + OAuth callback = token theft. Benign XSS in a low-value context + CSRF to escalate it.
- **Cross-component trust gaps**: Component A validates input and passes it to component B. Does B re-validate or trust A? What if A's validation is subtly different from what B needs (e.g., A allows 255 chars but B truncates at 128, creating a different string)? What about plugin/extension trust — can third-party code manipulate core state, bypass permission hooks, or access storage directly?
- **Second-order attacks**: Data safe when stored but dangerous when used in a different context. A field name safe in SQL becomes a key in a JSON path expression. A slug safe in a URL becomes part of a file path. Content stored HTML-escaped gets double-escaped or rendered in a context that expects raw text. Config values stored as strings get parsed as URLs, regexes, or templates.
- **Scope and capability escalation**: Tokens, API keys, or OAuth scopes that grant broader access than their name implies. A `read` scope that also allows listing draft content. Session cookies that survive a role downgrade. Plugin capabilities that provide a stepping stone to higher access. MCP or AI tool integrations that inherit the user's full session.
- **Timing and ordering**: Can you use a feature before setup/migration is complete? Act on a resource between soft-delete and hard-delete? Use a token between revocation and cache expiry? Exploit the gap between two non-atomic operations (check-then-act, read-then-write, validate-then-use)?
- **Rollback and recovery abuse**: What happens when an operation is undone? Undelete, restore from backup, revert a revision, cancel a pending action. Does the rollback restore more than intended? Does it bypass current permissions? Can you restore a resource into a state that's no longer valid?

**Wildcard** (subagent_type: `general`)
You are not given a category. You are given the codebase and told to break it.

Ignore the standard vulnerability classes — other agents are covering those. Your job is to find the thing nobody thought to look for. Read code that looks boring. Follow functions that seem unrelated to security. Get curious about the weird stuff.

Some starting points, but don't limit yourself to these:
- What's the strangest code in the codebase? Why does it exist? What happens if it's abused?
- Are there any features that feel half-finished, experimental, or bolted on? Those have the weakest security because they got the least review.
- What happens if you use the API in a way the frontend never would? The UI constrains users, but the API doesn't. What API calls are possible but never made by the client?
- Are there any hidden or undocumented endpoints, parameters, headers, or features? Look at route registrations, middleware, and config for things that aren't in the docs.
- What happens when you mix features that weren't designed to work together? Localization + preview + caching. Import + plugins + webhooks. OAuth + impersonation + API keys.
- Is there anything interesting in the git history? Reverted security fixes, commented-out auth checks, secrets that were committed then removed (still in history).
- What would you do if you had a valid account but wanted to cause maximum damage without being detected? Not escalation — sabotage. Corrupting data, poisoning caches, exhausting resources, creating confusing state.
- Are there any operations that are irreversible? What if you trick an admin into performing one?
- What assumptions does the code make about the environment? That the database is local, that the clock is accurate, that DNS is trustworthy, that the filesystem is case-sensitive?
- Look at the test files — what are they NOT testing? What edge cases did the developer think about (tests exist) vs. what they didn't (no tests)?

Follow rabbit holes. If something looks weird, dig. If a function has a comment explaining why it's safe, verify the explanation. If a variable is named `temp` or `hack` or `legacy`, read every line of it.

**Obvious things** (subagent_type: `general`)
The other agents are hunting for subtle bugs. This agent checks the dumb stuff that's easy to overlook because everyone assumes someone else already checked it:
- Are there any hardcoded passwords, API keys, tokens, or secrets in the source? (grep for `password`, `secret`, `apikey`, `token`, `Bearer`, `-----BEGIN`, common default passwords)
- Are there any TODO/FIXME/HACK/XXX comments that reference security? (`TODO: add auth`, `FIXME: validate input`, `HACK: skip permission check`)
- Is debug mode / dev mode properly gated? Can it be enabled in production via environment variable, query parameter, or header?
- Are there test/example/seed credentials that work in production?
- Is there a `/debug`, `/admin`, `/test`, `/status`, `/health`, `/metrics`, `/env`, `/.env`, `/config` endpoint that's unprotected?
- Are there any `.env`, `.env.local`, `credentials.json`, `*.pem`, `*.key` files checked into the repo?
- Does the `.gitignore` actually cover secrets, uploads, and local config?
- Are dependencies pinned? Are there known CVEs in the dependency tree? (check lockfiles)
- Are there any `eval()`, `exec()`, `child_process`, `Function()`, `vm.runInContext`, `import()` with dynamic input?
- Are CORS headers set to `*` or overly permissive? Is `Access-Control-Allow-Credentials` combined with a wildcard origin?
- Are cookies missing `HttpOnly`, `Secure`, or `SameSite` attributes?
- Are there any open redirects? (parameters named `redirect`, `return`, `next`, `url`, `goto`, `continue` that feed into redirects without validation)
- Is TLS enforced? Are there any HTTP-only endpoints?
- Are error responses in production returning stack traces, internal paths, or SQL errors?

This agent doesn't need to be creative. It needs to be thorough and literal. Check every item. Report what it finds.

IMPORTANT: For any finding this agent reports, it must verify the full code path, not just surface appearance. If a cookie is missing `HttpOnly`, check whether the cookie contains security-sensitive data and whether JS needs to read it by design. If an error message contains a field name, check whether the field is ever actually populated with sensitive data. A flag is not a finding — trace the impact before reporting.
