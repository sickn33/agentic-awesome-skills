---
name: seo-aeo-orchestrator
description: "Runs an audit-first SEO/AEO growth workflow from project discovery through implementation, foundational content, measurement setup, deployment verification, and optional weekly monitoring."
risk: critical
source: self
source_type: self
date_added: "2026-09-16"
---

# SEO-AEO Growth Orchestrator Workflow

**File:** `.agent/workflows/seo-aeo-orchestrator/WORKFLOW.md`
**Workflow ID:** `seo-aeo-orchestrator`
**Version:** 2.0.0
**Execution Mode:** sequential gates with parallel content work where safe

## Purpose

Turn a website or codebase into an evidence-backed SEO/AEO growth system. The workflow starts with an audit, implements approved fixes, confirms the business and keyword strategy, researches current search intent, creates foundational content, prepares external distribution, configures measurement, deploys, verifies, and offers weekly monitoring.

The workflow is designed for coding agents working directly in a repository. It must understand the project’s framework, routes, content storage, metadata implementation, sitemap/robots generation, deployment path, and authentication boundaries before editing or publishing.

## Workflow entry point

```json
{
  "workflow_input": {
    "project_path": "string — current project or repository",
    "site_url": "string — optional live URL",
    "business_type": "string — optional description of the business",
    "target_audience": "string — optional audience",
    "conversion_goal": "string — signup, demo, purchase, download, contact, or other",
    "user_keywords": ["string — optional owner-approved targets"],
    "location": "string — optional market or country",
    "foundation_page_count": "integer — 5–10, default 10",
    "research_mode": "browser | api | both | unavailable — default both",
    "existing_content": ["string — optional URLs, routes, or titles"],
    "tone": "professional | conversational | bold | empathetic | authoritative",
    "monitoring_preference": "ask | one-time | recurring | none — default ask"
  }
}
```

## Authorization gates

The agent may inspect the codebase, run local checks, and draft recommendations without additional confirmation. Before each external or material mutation, obtain the required authorization:

- implementing code/content changes: follow the user’s request and preserve unrelated work;
- deploying or pushing to Git: confirm when the user has not already requested it;
- accessing Google Search Console or Bing Webmaster: ask the user to authenticate in the browser or provide an approved connector;
- submitting URLs or sitemaps: confirm the exact property and URLs before submission;
- creating recurring monitoring: ask whether the user wants it, even if `monitoring_preference` is `ask`.

Never claim an account is connected, a sitemap is submitted, a URL is indexed, or a deployment is live without observable evidence.

## Execution architecture

```
PHASE 0 — DISCOVERY
  inspect codebase, framework, routes, live URL, deployment, and content model
        │
        ▼
PHASE 1 — AUDIT
  SEO/AEO/technical/conversion audit with evidence and prioritized fixes
        │
        ▼
PHASE 2 — IMPLEMENTATION
  apply approved audit fixes, then re-audit and verify build/routes
        │
        ▼
PHASE 3 — STRATEGY CONFIRMATION
  ask for business context, target keywords, audience, location, and conversion goal
        │
        ▼
PHASE 4 — SEARCH-INTENT RESEARCH
  browser + API research when available; semantic fallback when unavailable
        │
        ▼
PHASE 5 — CONTENT FOUNDATION
  landing/product improvements + 5–10 foundational pages, default 10 when justified
        │
        ├───────────────┐
        ▼               ▼
  internal content   external distribution plan
        │               │
        └───────┬───────┘
                ▼
PHASE 6 — MEASUREMENT AND PUBLISHING
  Search Console/Bing setup (gated), sitemap/URL submission, deploy, verify
                │
                ▼
PHASE 7 — MONITORING
  weekly analysis, refresh recommendations, optional recurring automation
```

## Phase 0 — Discover the project

1. Inspect the repository without overwriting user work.
2. Identify framework, package manager, routes, page components, content files/CMS, metadata helpers, sitemap and robots generation, schema implementation, internal-link patterns, environment configuration, and deployment commands.
3. Identify whether a blog already exists. If not, determine the project’s native way to add pages and preserve its conventions.
4. Inspect the live URL when supplied and record what was actually checked.
5. Produce a short project map before making content recommendations.

**Output:** `project-discovery.md` with framework, routes, content model, deployment path, measurement status, and access limitations.

## Phase 1 — Run the SEO/AEO audit

Use `seo-aeo-content-quality-auditor` with `input_type: codebase`, `website`, or both. Inspect:

- crawlability, indexability, robots.txt, sitemap, canonical URLs, redirects, status codes, and duplicate routes;
- title tags, meta descriptions, Open Graph/Twitter metadata, headings, URLs, image alt text, and structured data;
- page purpose, search intent, topical coverage, thin/duplicate content, cannibalization, orphan pages, and internal links;
- direct-answer blocks, definitions, steps, FAQs, comparison content, visible evidence, and AEO extractability;
- conversion paths from foundational content to product, signup, pricing, demo, download, or contact pages;
- performance/accessibility symptoms that affect search or conversion.

Every finding must include severity, evidence, impact, exact fix, verification method, and dependencies.

**Output:** `audit-report.md` and `audit-fix-plan.md`.

## Phase 2 — Implement and verify audit fixes

1. Apply blocker and high-priority fixes first.
2. Fix technical foundations before producing new content: metadata, canonical behavior, sitemap, robots, routes, broken links, schema, and internal navigation.
3. Fix landing-page content and conversion paths identified by the audit.
4. Re-run the audit and compare before/after findings.
5. Run the project’s build, test, lint, route, and link checks where available.

Do not start the foundation content phase while critical indexability or deployment blockers remain unresolved unless the user explicitly accepts the risk.

**Output:** updated code/content plus `audit-verification.md`.

## Phase 3 — Confirm strategy with the owner

Ask concise questions if the answers are not already known:

1. What does the business/product do, and who should convert?
2. Which keywords or topics does the owner want to rank for?
3. What market, location, conversion goal, and product pages should content support?

If the owner does not know target keywords, continue with provisional candidates derived from the audit and site, but label them clearly and request confirmation before treating them as final.

## Phase 4 — Research search intent

Use `seo-aeo-keyword-research` with `research_mode: both` by default:

- use browser research to inspect current Google/Bing result pages, related searches, snippets, People Also Ask-style questions, ranking formats, and wording;
- use available search or keyword APIs for repeatable query, volume, trend, or competitor data;
- reconcile disagreements and record the source, date, market/device, and confidence;
- if only one source is available, say which one;
- if neither is available, use semantic analysis only and mark live metrics unverified.

Prioritize problem-related queries that the product can genuinely solve. Search intent outranks attractive but irrelevant volume.

**Output:** `seo-aeo-keyword-research-report.md` containing owner keywords, provisional candidates, search-intent evidence, cannibalization risks, keywords to avoid, and a content map.

## Phase 5 — Create the content foundation

Use `seo-aeo-content-cluster` to create between 5 and 10 foundational pages, defaulting to 10 only when there are 10 distinct defensible intents. If fewer than 5 distinct intents exist, explain the limitation instead of inventing topics.

Each foundational page must have:

- one primary query and one dominant intent;
- a specific problem it solves;
- a search-intent-led H1;
- a factual answer/extraction block;
- useful body content, lists or steps where appropriate, and FAQs when warranted;
- internal links to related foundational pages and a relevant product conversion path;
- metadata, canonical URL, schema decision, and publishing route;
- an external distribution candidate when republishing is appropriate.

Use `seo-aeo-blog-writer` to write the approved pages. Content should convert without unsupported claims, and every article should include a visible answer block plus a relevant product CTA when the intent supports it.

Create a separate 20-day editorial calendar after the foundation is mapped. It should contain distinct topics, target queries, intent, format, internal-link targets, product CTA, and suggested external distribution platform.

**Outputs:** `foundational-content-plan.md`, foundational page files in the project’s native content location, `20-day-editorial-calendar.md`, and `external-distribution-plan.md`.

## Phase 6 — Measurement, publishing, and deployment

1. Detect and validate sitemap and robots output locally.
2. Ask whether the user wants Google Search Console and Bing Webmaster setup now.
3. If yes, ask the user to authenticate in the browser or use an approved connector. Do not request or store passwords.
4. Verify the correct property, submit the sitemap, and submit important URLs only after showing the exact targets.
5. Build and deploy using the project’s established process when authorized.
6. Verify production routes, canonical tags, metadata, sitemap, robots, schema, internal links, and conversion CTAs.
7. Report what was completed, what was only prepared, and what is waiting for indexing or external confirmation.

Internal pages should be published on the website. External articles should be adapted for the selected platform, use canonical links where supported, and link naturally to the relevant internal article and product page. Do not mass-publish duplicated content or promise backlink outcomes.

## Phase 7 — Monitor and refresh

After publishing, offer the user these choices:

- one-time monitoring analysis;
- weekly recurring monitoring;
- no monitoring setup yet.

Ask explicitly before creating a recurring automation. If accepted, create a quiet monitor that reports only meaningful changes, completion, failures, or required user action. A recurring run should review Search Console/Bing data when connected: impressions, clicks, CTR, query changes, indexed pages, ranking movement, pages with rising impressions but low CTR, pages with clicks but weak conversion paths, emerging queries, cannibalization, and content needing refresh.

**Output:** `weekly-seo-monitoring-report.md` with observed metrics, changes since the last period, interpretation, recommended actions, and unresolved access limitations.

## Final deliverables

```
outputs/
├── project-discovery.md
├── audit-report.md
├── audit-fix-plan.md
├── audit-verification.md
├── seo-aeo-keyword-research-report.md
├── foundational-content-plan.md
├── 20-day-editorial-calendar.md
├── external-distribution-plan.md
├── landing-page.md
├── internal-link-map.md
├── schema-markup.md
├── publishing-verification.md
└── weekly-seo-monitoring-report.md  # when monitoring runs
```

## Completion gates

### Before content production

- [ ] Project structure and publishing path understood
- [ ] Critical technical audit blockers addressed or explicitly accepted
- [ ] Business, audience, conversion goal, and market recorded
- [ ] Owner keywords confirmed or provisional keywords clearly labelled
- [ ] Search-intent evidence recorded with sources and dates

### Before deployment

- [ ] 5–10 foundational pages planned, default 10 only when justified
- [ ] No foundational pages cannibalize each other
- [ ] Every page has a problem, intent, answer block, internal links, and relevant CTA
- [ ] Metadata, canonical URLs, sitemap, robots, schema, and routes verified
- [ ] Build/tests/lint pass where available
- [ ] External distribution plan does not duplicate content recklessly

### After deployment

- [ ] Production URLs checked
- [ ] Search Console/Bing setup status recorded honestly
- [ ] Important URLs and sitemap submitted only with authorization
- [ ] Monitoring preference asked explicitly
- [ ] Recurring automation created only after user approval

## Error handling

| Condition | Behaviour |
|-----------|-----------|
| No codebase or URL | Ask for a project path or live URL before a technical audit |
| No target keywords | Produce provisional candidates and ask for confirmation |
| No browser/API research | Continue semantically and label live metrics unverified |
| Critical indexability blocker | Halt content publishing; return fix plan |
| Fewer than 5 defensible foundation topics | Explain the constraint; do not invent topics |
| Missing external credentials | Prepare exact steps and wait for user authentication |
| Deployment or build failure | Do not claim publish success; return logs and next fix |
| User declines monitoring | Finish without creating recurring automation |
| Script unavailable | Continue manually and record the skipped verification |

## Connected skills

| Phase | Skill | Purpose |
|------|-------|---------|
| Audit | `seo-aeo-content-quality-auditor` | Technical, content, AEO, and conversion audit |
| Research | `seo-aeo-keyword-research` | Owner-confirmed and live search-intent strategy |
| Foundation | `seo-aeo-content-cluster` | Foundational pages and 20-day calendar |
| Writing | `seo-aeo-landing-page-writer`, `seo-aeo-blog-writer` | Conversion pages and intent-led articles |
| Metadata | `seo-aeo-meta-description-generator` | Title, description, and social metadata |
| Links | `seo-aeo-internal-linking` | Semantic links, product paths, and orphan fixes |
| Structure | `seo-aeo-schema-generator` | Valid structured data for visible content |

## When to Use

Use when coordinating a complete audit-first SEO/AEO growth engagement across a website or codebase, including authorized implementation, publishing, measurement setup, and optional monitoring.


## Limitations

- This workflow cannot guarantee rankings, indexing, conversions, deployment success, or third-party account state; it must report observable evidence and stop at missing authorization or credentials.
