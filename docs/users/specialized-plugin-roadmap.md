# Specialized Plugin Roadmap

This roadmap shifts Antigravity Awesome Skills from "one giant plugin with every safe skill" toward a smaller set of focused, high-value Codex and Claude plugins.

The full catalog remains useful as a repository and installer. The plugin product should be different: clear jobs, narrow install surfaces, strong names, and skill groups that users can trust without browsing 1,678 options.

## Official Codex Basis

The current Codex manual draws a useful line between skills and plugins:

- Skills are the reusable workflow authoring format.
- Plugins are the installable distribution unit for reusable skills, apps, MCP servers, and stable workflows.
- Codex uses progressive disclosure for skills, but the initial skills list has a context budget. Very large installed sets can have shortened descriptions or omitted skills.
- Plugin authors should build a plugin when they want to share a workflow across teams, bundle app integrations or MCP configuration, package hooks, or publish a stable package.

That makes specialized plugins the better default product shape. A root plugin can exist for compatibility and advanced users, but it should not be the main recommendation.

## Selection Method

This snapshot pass evaluated the then-current local catalog. For current catalog checks, use the canonical root `skills_index.json` and treat `data/skills_index.json` only as the compatibility mirror:

- Total skills evaluated in this snapshot: 1,678.
- Broadest categories: development, cloud, AI/ML, security, business, workflow, content, marketing, automation, and web development.
- Existing editorial bundles are all small and mostly plugin-compatible, which makes them a good starting point.
- The stronger opportunity is to turn the best bundles into first-class product plugins with sharper names, richer descriptions, and optional app/MCP extensions.

Candidate details live in `data/specialized-plugin-candidates.json`. Each listed skill ID exists in the catalog and was checked as Codex-supported.

The candidates are now enabled as editorial bundle plugins. Running `npm run bundles:sync` materializes them under `plugins/antigravity-bundle-aas-*`, adds Codex marketplace entries in `.agents/plugins/marketplace.json`, adds Claude marketplace entries in `.claude-plugin/marketplace.json`, and refreshes `docs/users/bundles.md`.

## Tier 1 Plugins

These should become the primary marketplace surface.

| Plugin | Job | Why it deserves focus |
| --- | --- | --- |
| AAS Web App Builder | Build modern React/Next.js web apps. | High-demand, coherent path from UI design to implementation, forms, Tailwind, and SEO. |
| AAS Product Design Studio | Create richer UI, brand, motion, 3D, and visual assets. | Stronger than a generic design bundle; it has a clear creative/product promise. |
| AAS Security Engineer | Run authorized testing, audit, and hardening workflows. | Security is deep enough to justify a standalone plugin with explicit boundaries. |
| AAS Secure App Builder | Build secure application features. | Keeps defensive implementation separate from offensive assessment. |
| AAS Documents & Presentations | Create, edit, convert, and automate DOCX/XLSX/PPTX/PDF/Google files. | Concrete productivity plugin with obvious user value and room for app integrations. |
| AAS Data Analytics | Track, query, visualize, dashboard, and experiment. | Data workflows need a repeatable toolchain, not one isolated skill. |
| AAS Agent & MCP Builder | Build agentic apps, MCP tools, RAG, and eval loops. | Maps directly to plugin-based agent workflows because it can grow into MCP config. |
| AAS OSS Maintainer | Manage PRs, reviews, releases, changelogs, and repo guidance. | Very useful for this repository's own maintainer workflow. |
| AAS QA & Test Automation | Write, debug, stabilize, and scale tests. | Testing is a workflow chain: TDD, browser automation, failure diagnosis, and regression prevention. |
| AAS DevOps & Cloud | Ship infrastructure, deployment, and operational workflows. | Strong fit for scripts, deployment gates, incident practice, and cloud patterns. |
| AAS Accessibility & Inclusive UX | Audit, test, and fix accessible product experiences. | Accessibility is a standalone product-quality workflow across audit, automated scans, screen readers, fixes, and QA. |
| AAS API Platform Builder | Design language-agnostic API platforms. | Complements Python API Builder with OpenAPI, auth, security, documentation, load testing, and observability. |
| AAS SaaS Launch & Revenue | Launch, price, monetize, measure, and grow SaaS products. | Turns startup, pricing, payments, analytics, lifecycle, referral, and SEO skills into one revenue workflow. |
| AAS AI Product & Evaluation Ops | Define, evaluate, instrument, and improve AI product features. | Covers the PM/product side of AI: metrics, evals, tracing, experiments, model evaluation, and context constraints. |

## Tier 2 Plugins

These are promising and should be hardened after Tier 1.

| Plugin | Job | Why it is promising |
| --- | --- | --- |
| AAS Marketing, SEO & Growth | Plan, write, measure, and improve acquisition work. | Better as a growth workflow than many isolated copy/SEO skills. |
| AAS Automation Builder | Design durable automations across tools. | Can become much stronger when paired with apps and MCP configuration. |
| AAS Observability IR | Monitor systems, debug production, and write postmortems. | Operational work benefits from consistent proof gates. |
| AAS Python API Builder | Build Python APIs and services with tests. | Language-specialized plugin with practical framework coverage. |
| AAS Mobile App Builder | Ship Expo, React Native, Flutter, and iOS apps. | Covers architecture, release, CI, native platforms, and store optimization. |
| AAS Data Engineering Platform | Build pipelines, transforms, warehouses, embeddings, and RAG-ready data foundations. | Connects analytics engineering, data pipelines, vector databases, and AI data foundations. |
| AAS Privacy & Compliance Engineering | Engineer privacy and compliance controls. | Uses existing GDPR, PCI, privacy-by-design, compliance, spec, and security review skills without inventing new skills. |
| AAS Localization & International Growth | Expand products across languages and markets. | Combines existing i18n, hreflang, SEO, content, copy, analytics, and market research skills. |

## Recommended Product Changes

1. Keep the root plugin as an advanced "full plugin-safe library" path.
2. Make specialized plugins the default recommendation in README, docs, and marketplace ordering.
3. Rename or reframe bundle plugins as product plugins where the job is clear.
4. Add richer `interface` metadata to the strongest plugin manifests: display name, short description, brand color, and default prompt.
5. Add per-plugin quality gates:
  - every skill exists in canonical `skills_index.json`;
   - every skill is Codex-supported before Codex publication;
   - every skill is Claude-supported before Claude publication;
   - every plugin has a 5-10 skill target range unless it has a concrete reason to be larger;
   - every plugin description says who it is for, what it helps do, and what it does not cover.
6. Move social and launch messaging from daily individual skills to plugin stories:
   - "Web App Builder: from design to tested Next.js app";
   - "Documents & Presentations: DOCX/PPTX/XLSX/PDF without manual file surgery";
   - "OSS Maintainer: PR review, changelog, release, and contributor handoff".

## What Not To Do

- Do not present the root plugin as the best default for new users.
- Do not create plugin names that are just categories, such as "development" or "cloud".
- Do not publish large plugins whose only promise is "more skills".
- Do not mix offensive security, defensive app security, and general code review into one vague security plugin.
- Do not treat a bundle as good enough merely because all included skills are compatible.

## Implementation Status

Implemented in the repository:

- `data/editorial-bundles.json` includes all 22 specialized plugin candidates.
- `data/specialized-plugin-candidates.json` remains the source-of-truth shortlist and rationale.
- `plugins/antigravity-bundle-aas-*` contains the generated plugin folders.
- `.agents/plugins/marketplace.json` and `.claude-plugin/marketplace.json` expose the generated plugin entries.
- `docs/users/bundles.md` renders the specialized plugin sections for users.

Future improvements should focus on brand metadata, optional MCP/app integrations where a plugin naturally needs live tools, and keeping every plugin backed by existing canonical skills.
