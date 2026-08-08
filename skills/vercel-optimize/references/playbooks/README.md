# Playbooks

Application-profile-specific advice that shapes how recommendations are phrased and ordered. Playbooks never invent claims — every rec still traces to a verified candidate or finding. They tell the recommender what to emphasize when a project matches a profile.

## How a playbook gets applied

1. Step 1 detects the project's stack + dependencies.
2. The recommender heuristics infer an application profile (best guess from frameworks + dep signals).
3. The matching playbook(s) are included in the recommender's context.
4. Recommendations are shaped: ordering tilts toward the profile's priority list; phrasing nods to profile-specific concerns.

## Profile detection (best-effort heuristics)

| Signals → | Profile |
|---|---|
| `@vercel/sandbox`, `@ai-sdk/*`, `ai`, `openai`, `@anthropic-ai/sdk` deps OR AI Gateway / Sandbox SKU active in `usage.services` | `ai-application` |
| `stripe`, `@shopify/*`, `react-stripe-js`, "cart"/"checkout" routes | `ecommerce` |
| `next-auth`, `clerk`, dashboard routes, multi-tenant headers | `saas` |
| Only `pages/api/**` or `app/api/**`, no UI routes | `api-service` |
| Heavy MDX / markdown, mostly static routes | `content-site` |
| Lots of `/(marketing)/` route groups, A/B test deps | `marketing` |

`ai-application` is checked first — AI-shaped customers often share routes with SaaS/ecommerce surfaces, but the billing shape (AI Gateway dominant) and remediation set (provider failover, sandbox reuse, OIDC keyless) belong to this profile.

When detection is uncertain, no playbook is applied. The recommender works fine without one — the playbook is a tilt, not a requirement.

## Playbook schema

Each playbook is a Markdown file with a fixed shape so the recommender can parse it reliably. Required sections:

```markdown
# {Profile name}

## Typical billing shape
(Which dimensions dominate — e.g., "Edge Requests > Function Duration > Image Optimization")

## Priority patterns
(Ordered list of patterns this profile particularly benefits from)

## Frequent gotchas
(Anti-patterns specific to this profile)

## Cross-references
(Rec IDs from recommendations.md or rule names from vercel-react-best-practices)
```

## Contributing a new playbook

1. Identify a clear application profile and one or two representative project profiles that exemplify it.
2. Create `references/playbooks/<profile>.md` matching the schema.
3. Add detection signals to the table above (the heuristics live in the recommender code; document them here).
4. Update the playbook selection matrix in `references/scoring.md`.
5. Run `node --test packages/vercel-optimize-tests/test/support-topics.test.mjs packages/vercel-optimize-tests/test/investigation-brief.test.mjs`. No tests directly cover playbooks (they're content), but the schema validator runs in CI.
