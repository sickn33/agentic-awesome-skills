# Production operations for aaskills.tech

## Deployment model

The public catalog is a static Vite application served from Vercel. The repository's GitHub Pages workflow is a separate release-only deployment surface. Do not migrate DNS or change the canonical host as part of routine releases.

Use a Vercel preview deployment to review a candidate before production promotion. Protect preview deployments with Vercel Deployment Protection or the project's current equivalent; verify authentication does not block the production hostname. The Vercel project settings are managed in the dashboard and should be reviewed by an owner.

Vercel builds the catalog from the skill sources and pack definitions in its Git checkout. The commands in `vercel.json` install the index generator's pinned Python dependency in the build workspace and refresh the index before Vite copies and prerenders assets. The generated registry files committed for distribution remain release-owned. The public sitemap lists every active skill once. The legacy redirect site keeps its ranked 180-skill sitemap while generating redirects for every current skill. To reproduce a build failure, run the Vercel install and build commands in a disposable checkout of the affected SHA.

## Incident response

1. Confirm the symptom from an independent network and record the time, affected URL, status, and Vercel request/deployment ID.
2. Check [Vercel Status](https://www.vercel-status.com/) and the latest production deployment/build logs.
3. Escalate platform-wide incidents through Vercel Support/status channels. For an application regression, notify the AAS maintainers in the repository's existing maintainer coordination channel and link the failing deployment and relevant commit.
4. If a known-good production deployment exists, use Vercel's instant rollback from the project dashboard. Do not rewrite DNS for an application rollback.
5. Verify the canonical hostname and key routes after rollback, then document the cause, impact, and follow-up issue in the repository.

## Release and rollback checks

Before promoting a deployment, verify the candidate's build, key catalog routes, static assets, sitemap, and browser console. After promotion, confirm `/`, `/core`, `/docs`, `/plugins`, `/workbench`, `/robots.txt`, `/sitemap.xml`, and `/site.webmanifest` return expected content. Keep the previous known-good deployment available for instant rollback.

## Platform settings review

A Vercel project owner should periodically confirm: production branch and build settings; preview protection; team access roles and MFA/SSO options available on the current plan; firewall/bot rules appropriate to public traffic; log retention or drains; usage alerts/spending controls; domain and TLS status; and whether project-level analytics or Speed Insights is enabled. Avoid enabling paid add-ons without reviewing plan and cost.
