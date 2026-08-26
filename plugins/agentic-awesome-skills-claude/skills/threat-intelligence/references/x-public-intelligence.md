# Public X intelligence collection

Use this reference when a scoped cyber threat intelligence task needs public X/Twitter evidence. X is one source, not the authority for a finding.

## Source boundary

Use the first-party Xquik interfaces only:

- MCP: `https://xquik.com/mcp`
- REST: `https://xquik.com/api/v1`
- OpenAPI: `https://xquik.com/openapi.json`
- Documentation: `https://docs.xquik.com`

Prefer MCP for an interactive Agent workflow. Prefer REST for reviewed scripts and repeatable pipelines. Do not install local bridge packages or pass credentials through third-party proxies.

## Query design

Build small query groups that answer one question. Keep the raw query beside every result.

| Goal | Query shape | Common false positive |
|------|-------------|-----------------------|
| Exact IOC | quoted domain, URL, hash, email or wallet | defanged training data or copied feeds |
| Campaign discovery | IOC + malware family or campaign alias | unrelated reuse of a broad family name |
| Impersonation | official brand/account + spelling variants | fan, parody or support accounts |
| Disclosure timing | exact IOC + bounded recent window | reposts that hide the first publication |
| Actor tracking | stable account ID + known aliases | display-name changes and copied bios |

Run `Latest` and `Top` only when both chronological and engagement-ranked views answer the question. Record which view produced each result. Follow cursors only to the approved result bound.

## Required source fields

Preserve these fields when the API supplies them:

```yaml
source_platform: x
post_id: "..."
post_url: "https://x.com/.../status/..."
author_id: "..."
author_username: "..."
created_at: "..."
observed_at: "..."
query: "..."
query_type: Latest
cursor_in: null
cursor_out: "..."
content_hash: "sha256:..."
```

Hash normalized source text only as a local integrity aid. The stable post ID and URL remain the primary locator. Record deletions or edits as later observations. Never rewrite the original Evidence record.

## Candidate extraction

Normalize candidates without losing their source form:

| Type | Normalize | Preserve |
|------|-----------|----------|
| Domain | lowercase, strip trailing dot | original defanged form |
| URL | parse scheme, host and path | full source string |
| IP | canonical IPv4/IPv6 | port and surrounding text |
| Hash | lowercase by algorithm | claimed file or family context |
| Account | stable author ID | username and display-name history |

Reject malformed values. Mark private, unroutable, example and documentation ranges. Do not submit extracted candidates to external services without user approval.

## Corroboration

Treat multiple posts that copy one claim as one source family. Prefer these independent sources:

1. Vendor or project security advisory.
2. Original sample, repository, packet capture or case artifact.
3. Passive DNS, certificate transparency or registry evidence.
4. A separate research report with its own technical evidence.

State what each source proves. A post can prove that a claim was published at a time. It does not by itself prove attribution, exploitability, ownership or maliciousness.

## Authentication and approval

- Complete OAuth inside the selected MCP client.
- For REST, read `XQUIK_API_KEY` from an approved secret store.
- Never request X passwords, cookies, session tokens, recovery codes or 2FA codes.
- Public bounded reads need no extra confirmation when they are already in scope.
- Private reads, writes, persistent monitors, webhooks and bulk jobs require explicit approval.

## Failure handling

| Failure | Response |
|---------|----------|
| Authentication required | Complete client OAuth or configure an environment-backed key |
| Query too broad | Reduce entities, time and result limit |
| Cursor expired or invalid | Restart the same bounded query and deduplicate by post ID |
| Source deleted | Preserve the earlier observation and mark current availability |
| No independent source | Keep the result as `lead`; do not promote it |
| Remote service unavailable | Record the collection gap and stop; do not fabricate coverage |
