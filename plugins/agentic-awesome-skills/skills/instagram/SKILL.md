---
name: instagram
description: Integracao completa com Instagram via Graph API. Publicacao, analytics, comentarios, DMs, hashtags, agendamento, templates e gestao de contas Business/Creator.
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- social-media
- instagram
- graph-api
- content
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Instagram Graph API toolkit

## Overview

Community Python toolkit for profile/media reads, local SQLite analytics, exports and publication previews. The bundled integration uses **Facebook Login**, `graph.facebook.com` and a linked Facebook Page; it does not implement the separate Instagram Login flow. API v21.0, metrics, permissions, quotas and media specifications are historical examples: verify current Meta documentation for the selected account and API version before use.

## When to Use

Use for an explicitly requested Instagram account workflow or inspection of these scripts. Prefer an available service connector for supported tasks. An Instagram mention alone does not authorize account changes, OAuth, uploads, publishing or messages.

## Workflow

1. Read the relevant scripts and references. Use an isolated environment and review dependencies before installing `scripts/requirements.txt`. Commands below run from this skill directory.
2. For an authorized account connection, configure your own Meta app and the exact redirect URI, then run `python3 scripts/auth.py --setup`. This opens a browser and requests the listed OAuth scopes. The local database stores token and app secret in plaintext, protected by local permissions, outside the skill source (`AAS_INSTAGRAM_DATA_DIR` or the per-user application data directory in `config.py`). Do not commit or share this directory, its backups or exports.
3. Inspect `python3 scripts/auth.py --status`, then request only the reads needed. Read commands may attempt token renewal and persist fetched data. Token renewal can fail or require reauthorization; it is not guaranteed unattended. `--revoke` only deactivates the local account; revoke provider access through Meta separately.
4. Review output and partial failures. Sync reads one page per resource, not the entire account. Check current permissions, account ownership and retention policy before collecting comments or conversations.

## Examples

```bash
python3 scripts/profile.py --view
python3 scripts/media.py --list --limit 10
python3 scripts/run_all.py --dry-run
python3 scripts/insights.py --media --media-id MEDIA_ID --metrics reach
python3 scripts/analyze.py --top-posts --limit 10
python3 scripts/export.py --type posts --format csv --output /absolute/private/export-directory
python3 scripts/serve_api.py --host 127.0.0.1
```

The dashboard is unauthenticated and must remain loopback-only (including when launched via ASGI tooling); do not proxy or expose it to a network. It reads all stored accounts for some statistics. Chart.js loads from a third-party CDN. Exports may contain personal data; keep them private.

## Publication and messaging boundaries

`publish.py` returns previews/confirmation requests. The existing CLI confirmation IDs are not persisted or bound to an immutable payload/account, so confirmed execution is disabled. Video/carousel execution and comment/DM confirmation handling remain incomplete. `schedule.py --process` is disabled until durable approval, atomic worker claims and ambiguous-outcome reconciliation exist. `schedule.py` does not accept `--at` or create scheduled posts. Do not bypass these guards or change the confirmation categories to execute a preview.

Drafts no longer upload local media. Public Imgur upload requires your own `IMGUR_CLIENT_ID`, explicit authorization to share that file with Imgur, and `AAS_INSTAGRAM_ALLOW_IMGUR_UPLOAD=1`; this option is intended only for a reviewed integration, not to bypass disabled publication. Local videos are not supported by the image upload/conversion path. Prefer an already authorized public HTTPS media URL when implementing an integration. A public URL can disclose content before Instagram publication.

Graph writes are attempted once: a timeout may mean the action succeeded. Reconcile with Meta before any retry. Local rate counters are estimates, not provider enforcement: they do not fully account for failed calls, other clients or concurrent workers; DM and unique-hashtag enforcement is incomplete. Respect live provider errors/headers.

## References

- `references/graph_api.md`: historical endpoints and request shapes
- `references/permissions.md`: Facebook Login scope examples
- `references/account_types.md`: account setup considerations
- `references/publishing_guide.md`: historical media examples and limitations
- `references/rate_limits.md`: local estimates and provider limits
- `references/setup_walkthrough.md`: historical Meta setup UI
- `references/schema.md`: local data schema; `scripts/db.py` is authoritative

## Limitations

No live account/API compatibility or app review is certified. Insights snapshots are repeated lifetime measurements, not additive events; historical metrics may be retired and period/metric support must be checked. Best-time results describe observed samples in UTC, not causal optimal posting times. Webhook handlers return 501 and accept no events. There is no durable scheduler, multi-tenant authorization, encrypted secret vault or production-ready confirmation service.
