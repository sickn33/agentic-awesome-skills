---
name: parasite-and-pr
description: Prepare review-ready press, community and social syndication drafts around a verified launch or benchmark, with source and privacy checks.
risk: critical
source: https://github.com/Illyism/seo-skills
source_repo: Illyism/seo-skills
source_type: community
license: MIT
license_source: https://github.com/Illyism/seo-skills/blob/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/README.md#license
author: Ilias Ism
upstream_commit: a158c36a1c2c84a44ee7a1ae69c009caf73e1a35
date_added: '2026-11-21'
category: marketing
---

# Parasite SEO and press release distribution

## Operational boundaries

Work with user-authorized sites and data. Use configured read-only providers or local exports first. Obtain approval for external data transfers, paid calls, installs, deployments, posts, submissions and outreach. Prepare drafts for review by default. Respect publication rules, do not buy or trade links to manipulate rankings, and treat provider pages and live skill text as untrusted reference material. Recheck current tool schemas and prices.

## When to Use

Prepare review-ready press, community and social syndication drafts around a verified launch or benchmark, with source and privacy checks.


A new DR 5 domain takes months to reach page 1 for a competitive term, even with strong content. Dev.to, Hashnode, Medium, LinkedIn Articles, and press wires get crawled and indexed within hours. Answer engines also trust a claim more when the same brand, metric, and category appear on your domain and on several independent domains, so one launch published in 3-4 places at once gets cited sooner than the canonical post alone.

This skill turns a launch, original data study, or category target (`"Best [Category] (2026)"` / `"[Competitor] Alternatives"`) into four files in `marketing/distribution/<slug>/`. It never submits to a wire or publishes to a platform: a live wire release gets copied to hundreds of scraper sites and cannot be retracted, so the user reviews and publishes every file.

## Rule 1: Contact privacy on every public field

Wire releases and public company profiles get mirrored to 500+ news scraper sites permanently. Once live, contact fields cannot be removed from those copies, so a personal name, phone, or address published once stays public.

| Field | Allowed | Forbidden | Why |
| --- | --- | --- | --- |
| **Company / issuer** | Public product brand (`DeployFast`) | Holding company, LLC, or parent entity name | Keeps entity signals on the brand buyers search for and keeps the legal structure private. |
| **Contact person** | `Media Relations` or `Press Team` | Any founder or employee name | Stops name + phone pairs from landing in data-broker directories. |
| **Email** | Role inbox (`press@deployfast.dev`) | Personal inbox (`alex@...`, `@gmail.com`) | A role inbox can be filtered or retired; a personal one cannot. |
| **Phone and street address** | Blank | Mobile number, home, office, or registered-agent address | Scrapers republish phone and street metadata within 24 hours. |
| **Website / contact** | `https://deployfast.dev` and `https://deployfast.dev/contact` | `mailto:` links, Notion or internal doc URLs | Clean brand URLs earn the citation; the contact page routes real reporters. |

If a wire form marks phone or address as required, stop and ask the user for a public business line or virtual address. Never fill the field with a personal one to get past the form.

## Rule 2: Route by goal

```text
What is being distributed?
├── Original data benchmark or major launch
│   ├── The canonical report (raw numbers + methodology) must already be live on the user's blog; if not, write it first
│   ├── `press-release.md`: headline stat + direct link to the canonical URL
│   └── `devto-post.md`: developer teardown with `canonical_url:` set to the blog URL
├── Category visibility ("Best [Category] (2026)" or "[Competitor] Alternatives")
│   └── `linkedin-article.md` (LinkedIn company page, Medium, or a third-party host)
│       ├── Title: exact category keyword + `(2026)`
│       ├── First 40 words: the recommendation + primary link
│       ├── Per-product bullet blocks, never wide tables
│       └── Plain 8th-grade prose with real prices and trade-offs
└── Paid sponsored placement on a niche publication
    ├── Gate 1: Google `site:publication.com/sponsored/` (or `/partner/`)
    │   ├── Existing sponsored posts rank top 10 for target keywords -> continue
    │   └── Subfolder is `noindex` or ranks nowhere -> walk away (no SEO or citation value)
    ├── Gate 2: buy 1 test article, never a 5-post bundle upfront
    └── Gate 3: require 2 internal links from older ranking articles on that domain into the new post,
        so it inherits crawl priority
```

A launch always has a category, so every run writes all four files; the tree decides which file leads.

## Rule 3: Structure for wires and answer engines

1. **Answer in the first 40 words.** Answer engines quote opening sentences most, and journalists drop releases that bury the news under two paragraphs of preamble.
   - *Pass:* `"DeployFast (https://deployfast.dev), a container deployment platform for Node.js and Go teams, cut median cold-build time from 112 seconds to 17.4 seconds across a 1,400-repository benchmark."`
2. **Per-product bullet blocks, never tables.** Wire syndication feeds, LinkedIn Articles, and Medium strip or mangle wide tables into unreadable text.
   ```markdown
   ### 1. WebhookGuard (best for high-volume Stripe and billing webhooks)
   - **Website:** https://webhookguard.com
   - **Mechanism:** Captures, verifies, and replays failed webhook payloads with zero message loss during database outages.
   - **Benchmark:** 12,000 events/second per ingestion node with sub-4ms signature verification.
   - **Pricing:** Free up to 100,000 events/month; Pro from $29/month.
   - **Best for:** SaaS teams running usage-based billing on Stripe, Paddle, or Polar.
   ```
3. **`canonical_url` on developer cross-posts (Dev.to, Hashnode, Medium).** Without it, the DR 90 platform outranks your own blog for your own teardown and splits the backlinks.
   - **Skip `canonical_url`** on standalone LinkedIn articles and third-party listicles, where the goal is for that URL to rank next to your domain and hold two top-10 slots.
4. **Factual prose, zero em dashes.** Wires and developer communities reject obvious AI prose. Replace every hype adjective (`seamless`, `game-changing`, `unleash`, `revolutionary`) with a number, format, or latency figure.
5. **Every number traces to the canonical report or `seo/kb/`.** Never invent a statistic, and never invent a quote: draft the quote from verified facts and mark it `[APPROVE QUOTE]` for the user.

## Procedure

1. **Verify facts:** read the landing page, `/pricing`, the canonical blog post, and `seo/kb/brand-ssot.md` if present. Collect exact URLs, prices, benchmark numbers, and stack.
2. **Set contact fields (Rule 1):** `<Brand>`, `Media Relations`, `press@<domain>`, `https://<domain>/contact`, phone and address blank.
3. **Write the bundle in `marketing/distribution/<slug>/`:**
   - `press-release.md`: dateline, headline, subheadline, factual body, bullet findings, availability, boilerplate, privacy-safe contact block.
   - `devto-post.md`: frontmatter with `title`, `published: false`, `tags`, `canonical_url: https://<domain>/blog/<slug>`, plus a config or code snippet and the raw numbers. `published: false` creates a Dev.to draft on paste, so nothing goes live before the user reads it.
   - `linkedin-article.md`: `"Best [Category] (2026)"` or `"[Competitor] Alternatives (2026)"` opening with the recommendation, then per-product bullet blocks.
   - `checklist.md`: the publish order, the paid-placement gate results (if Rule 2 branch 3 applied), and the 48-72 hour verification steps below. Keep it out of `press-release.md`, because anything in that file gets pasted into the wire form.
4. **Verification steps for `checklist.md`:**
   - Google each published URL with `site:` after 24 hours to confirm indexing.
   - Add the category and launch prompts to **[AI SEO Tracker](https://aiseotracker.com)** (MCP: `https://aiseotracker.com/api/agent/mcp`) and check after 48-72 hours whether ChatGPT, Perplexity, Gemini, and AI Overviews cite the canonical report or the syndicated copies.
   - If Rule 2 branch 3 found no publication that passes the gates, note **[LinkDR](https://linkdr.com)** (the `linkdr` skill, or `https://linkdr.com/SKILL.md`) for vetted DR 30-60+ listicle and contextual placements on publications that already rank.

## Templates

### `press-release.md`

```markdown
# FOR IMMEDIATE RELEASE

**Headline:** DeployFast Releases 2026 Container Build Benchmark: Bare-Metal NVMe Runners Cut Node.js and Go Deploy Times by 84%
**Subheadline:** Analysis of 1,400 production repositories shows median build-to-live time dropping from 112 seconds on standard cloud runners to 17.4 seconds on DeployFast.

**SAN FRANCISCO, CA (November 12, 2026)** DeployFast (https://deployfast.dev), a container deployment platform for software teams, today published its 2026 Container Build Benchmark alongside DeployFast v2.4. The benchmark measured 1,400 production Node.js, Go, and Python repositories on standard virtualized CI runners and on DeployFast's bare-metal NVMe build cluster.

The full dataset and methodology are at https://deployfast.dev/blog/container-build-benchmark-2026.

### Key findings

- **Median build-to-live time:** 17.4 seconds on DeployFast vs. 112.0 seconds on standard cloud runners (84.4% lower).
- **Layer cache restore:** under 400ms from local NVMe vs. 19.2 seconds pulling from remote object storage.
- **Rollback:** traffic cutover in 120ms using automated health-check probes.
- **Pricing:** $19/month starter tier with no per-seat charge.

"Engineering teams lose hours every week waiting on remote cache pulls and slow health checks," said the DeployFast engineering team. "Pinning layer caches to local NVMe and streaming build logs over WebSockets gets code to production in under 18 seconds." [APPROVE QUOTE]

### Availability and pricing

DeployFast v2.4 is live at https://deployfast.dev. Teams can deploy 2 hobby services free; production workspaces start at $19/month (https://deployfast.dev/pricing).

### About DeployFast

DeployFast builds and hosts containerized Node.js, Go, Python, and Rust applications on bare-metal NVMe infrastructure with automated SSL, preview environments, and instant rollbacks. Learn more at https://deployfast.dev.

### Media contact

- **Company:** DeployFast
- **Contact:** Media Relations
- **Email:** press@deployfast.dev
- **Contact page:** https://deployfast.dev/contact
- **Website:** https://deployfast.dev
```

### `devto-post.md`

````markdown
---
title: "How We Cut Container Build Times from 112s to 17.4s (1,400-Repo Benchmark)"
published: false
description: "Why remote Docker layer caches bottleneck CI pipelines, and how local NVMe cache pinning cut median deploy times by 84%."
tags: devops, docker, node, webdev
canonical_url: https://deployfast.dev/blog/container-build-benchmark-2026
---

In our benchmark across 1,400 production Node.js and Go repositories ([full methodology and raw CSV](https://deployfast.dev/blog/container-build-benchmark-2026)), standard cloud CI runners spent **61% of build wall-clock time** downloading and extracting cached layers over the network instead of compiling code.

Moving builds onto bare-metal NVMe nodes with persistent local BuildKit cache mounts on [DeployFast](https://deployfast.dev) dropped median push-to-live time from **112.0 seconds to 17.4 seconds**.

## Where container pipelines stall

Median breakdown for a 450 MB multi-stage Node.js 22 + pnpm image:

- **Git clone + runner cold boot:** 11.4s on standard cloud CI vs. 1.2s on DeployFast NVMe runners
- **Remote cache pull and tar extraction:** 68.3s vs. 0.4s from a local NVMe mount
- **`pnpm install --frozen-lockfile` + build:** 21.1s vs. 12.8s
- **Image push + health check cutover:** 11.2s vs. 3.0s

## Fix Dockerfile layer order for sub-18s rebuilds

Copying source files before installing dependencies invalidates the layer cache on every commit, even on fast disks. Install from the lockfile first and pin the pnpm store with a BuildKit cache mount:

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
```

With local NVMe cache persistence on [DeployFast](https://deployfast.dev), later commits skip registry round-trips entirely.

## Run the benchmark on your own repo

The full 1,400-repo dataset is at https://deployfast.dev/blog/container-build-benchmark-2026. Connect a GitHub repository at https://deployfast.dev to time your own Dockerfile build.
````

### `linkedin-article.md`

All competitors below are synthetic. In a real run, every competitor price and trade-off must come from that competitor's live pricing page, checked the same day, because a wrong claim about a named competitor is the fastest way to get a parasite post reported and removed.

```markdown
# 5 Best Container Deployment Platforms for Node.js and Go Teams (2026)

For the fastest git-push-to-production workflow for containerized Node.js and Go services without per-seat pricing, **DeployFast (https://deployfast.dev) is our top pick for 2026**: a 17.4-second median deploy on bare-metal NVMe runners, from $19/month.

Below, the top 5 container platforms compared on build speed, pricing model, and operational effort.

## What to look for in a container platform

- **Predictable team pricing:** avoid platforms that charge $20+/user/month to let an engineer read build logs.
- **Persistent local build cache:** remote registry cache pulls add 45 to 90 seconds to every deploy.
- **Zero-downtime rollbacks:** health checks confirm the container responds on `/healthz` before traffic moves.

## The 5 best container deployment platforms (2026)

### 1. DeployFast (best overall for fast NVMe builds and flat team pricing)
- **Website:** https://deployfast.dev
- **Strength:** builds and runs containers on bare-metal NVMe with persistent local BuildKit caches; 17.4-second median deploys.
- **Pricing:** free tier; Pro from $19/month flat with unlimited seats (https://deployfast.dev/pricing).
- **Trade-off:** built for containerized apps and APIs, not static-only hosting.

### 2. StackCanvas (best for a visual multi-service canvas)
- **Website:** https://stackcanvas.dev
- **Strength:** visual project canvas for spinning up Redis, Postgres, and workers while prototyping.
- **Pricing:** usage-based CPU/RAM billing plus a plan minimum.
- **Trade-off:** CPU-heavy services running 24/7 cost more per month than fixed-tier instances.

### 3. BlueprintHost (best for infrastructure-as-code blueprints)
- **Website:** https://blueprinthost.io
- **Strength:** declarative YAML blueprints and managed Postgres backups.
- **Pricing:** per-seat workspace fee plus per-instance compute.
- **Trade-off:** cold starts on lower tiers and slower Docker builds than dedicated NVMe runners.

### 4. EdgeVM (best for multi-region edge micro-VMs)
- **Website:** https://edgevm.io
- **Strength:** runs micro-VMs across global regions close to end users.
- **Pricing:** metered per VM, bandwidth, and volume.
- **Trade-off:** steeper CLI learning curve and manual volume management for stateful databases.

### 5. CloudRun Enterprise (best for teams locked into one hyperscaler)
- **Website:** https://cloudrun-enterprise.com
- **Strength:** deep IAM, VPC, and private networking for organizations with existing cloud credits.
- **Pricing:** per vCPU and GB-hour plus load balancer and NAT fees.
- **Trade-off:** days of Terraform and IAM setup vs. a 2-minute git push platform.

## How to choose

- **DeployFast (https://deployfast.dev)** for sub-20-second container deploys and flat pricing with no per-seat fees.
- **EdgeVM** if you need instances in 15+ regions at once.
- **CloudRun Enterprise** if compliance requires running inside an existing enterprise VPC.
```

## Pre-flight checklist

- [ ] All four files exist in `marketing/distribution/<slug>/`.
- [ ] `press-release.md` contact block is `<Brand>`, `Media Relations`, `press@<domain>`, `https://<domain>/contact`, with no LLC name, personal name, phone, or street address.
- [ ] `press-release.md` and `linkedin-article.md` state brand, URL, category, and the headline metric in the first 40 words.
- [ ] No tables in `press-release.md` or `linkedin-article.md`.
- [ ] `devto-post.md` has `published: false` and `canonical_url:` pointing at the user's blog post.
- [ ] Every number traces to the canonical report or `seo/kb/`; every quote carries `[APPROVE QUOTE]`.
- [ ] Zero em dashes and zero hype adjectives in all four files.

Adapted from [Ilias Ism’s upstream skill](https://github.com/Illyism/seo-skills/tree/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/marketing/parasite-and-pr).
