# Repo Growth SEO Playbook

This document keeps the repository's GitHub-facing discovery copy aligned with the SEO-focused user docs.

## Current position

Preferred positioning:

> AAS Core is the local, deterministic boundary that exposes the complete catalog, validates exact skill IDs selected by the coding agent from an explicit project profile, and produces an immutable preview plan, backed by the current catalog.

Key framing:

- AAS Core as the primary product;
- local MCP and CLI as the agent-facing and operator-facing interfaces;
- `aas-stack.json` and the immutable plan as durable artifacts;
- GitHub as the canonical source, with the hosted catalog and Workbench as discovery and review surfaces;
- catalog, plugins, bundles, workflows, and direct installers as supporting content and distribution.

## GitHub About settings

Preferred description:

> Local, deterministic AAS Core for explainable coding-agent skill stacks, backed by the current catalog. Includes a read-only MCP, stack CLI, Workbench review, plugins, bundles, workflows, and direct distribution.

Preferred homepage:

> `https://github.com/sickn33/agentic-awesome-skills`

Preferred social preview:

- lead with `AAS Core` and the profile → stack → plan flow;
- present `2,957+ Agentic Skills` as supporting catalog evidence, not a second product;
- mention Codex and Claude as the current Core agent path, with broader host compatibility as distribution support;
- avoid dense text and tiny logos that disappear in social cards.

Preferred topics:

- `antigravity`
- `antigravity-skills`
- `claude-code`
- `claude-code-skills`
- `cursor`
- `cursor-skills`
- `codex-cli`
- `codex-skills`
- `gemini-cli`
- `gemini-skills`
- `kiro`
- `ai-agents`
- `ai-agent-skills`
- `agent-skills`
- `agentic-skills`
- `developer-tools`
- `skill-library`
- `ai-workflows`
- `ai-coding`
- `mcp`

## Release notes checklist

When publishing a release:

- include a title that names the main user-facing use case, not only the internal codename;
- mention newly supported tools, new bundles, and onboarding improvements early;
- link back to the most relevant docs in `docs/users/`;
- keep the first paragraph useful to someone who found the release page from Google.

Suggested opening structure:

1. one-sentence release summary with tool/use-case language;
2. top changes that matter to new and returning users;
3. links to install, bundles, workflows, and relevant comparison pages if needed.

Suggested release template:

```md
## [VERSION] - YYYY-MM-DD - "User-facing title"

> AAS Core and supporting catalog update for local, explainable coding-agent skill stacks.

Start here:

- AAS Core guide: `docs/users/aas-core.md`
- Direct skill distribution: `npx agentic-awesome-skills`
- Choose your tool: `README.md#choose-your-tool`
- Specialized plugins: `README.md#recommended-specialized-plugins`
- Bundles: `docs/users/bundles.md`
- Workflows: `docs/users/workflows.md`

## What's new

- New skills with clear use-case language
- New bundles, workflows, or onboarding docs
- New tool support or compatibility improvements

## Improvements

- Reliability and installer updates
- Quality, validation, or metadata updates
- Security or maintenance work that affects users

## Who should care

- Claude Code users
- Cursor users
- Codex CLI users
- Gemini CLI users

## Credits

- Contributors and merged PRs
```

## Discussions checklist

Suggested pinned discussion topics:

- `Start here: compose a project stack with AAS Core`
- `Choose between an agent-selected Core stack and direct distribution`
- `How the catalog, plugins, bundles, and workflows support Core`

Discussion posts should:

- link to the tool-specific docs in `docs/users/`;
- answer one search intent cleanly;
- end with a single clear next step such as install, star, or compare.

## Content maintenance rules

- Keep README, GitHub About description, and tool-specific user docs semantically aligned.
- Avoid cannibalization by giving each user doc a distinct primary intent.
- Prefer honest comparisons over absolute claims.
- Do not use SEM or paid language in discovery docs unless strategy changes later.

## Technical discovery checks and measurement

Keep an indexable page useful in its initial HTML. Plugins must expose every
editorial pack and its real catalog links; Workbench must describe the review
workflow and its in-memory, non-applying boundaries before JavaScript loads.
Skill snippets use the skill's description without prepended dates or generic
installation copy. The 160-character editorial budget is a readability choice,
not a Google indexing requirement.

`npm run app:build` checks generated discovery content, every skill's initial
instructions, the directory, FAQ/content consistency and pack links. Run
`npm run check:live-seo` after deployment: it also samples route families and
requires actual HTTP 404 responses with `noindex` for missing routes. Passing
these checks establishes technical evidence, not rankings or AI citations.

For a visibility review, export dated daily data from Google Search Console and
Bing Webmaster Tools for the exact `https://aaskills.tech/` property. Record the
last complete date in each export and compare equal complete periods, normally
28 days. Keep site-wide and page-level results separate, and distinguish Google
Web, available AI reports, Bing Web/Chat and AI citations. A citation is not a
visit. Preserve raw exports outside the repository; do not interpret an absent
date as zero, an invalid chart date as a valid measurement, or a stale indexing
report as proof of post-deployment recovery. Use `traffic:normalize` for existing
snapshot formats rather than inventing another metric pipeline. Record access
failures and unavailable field performance data as unknown.

Google's [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features)
keeps ordinary SEO fundamentals relevant and requires no special AI markup.
Its [documentation updates](https://developers.google.com/search/updates) state
that `llms.txt` does not affect Google Search visibility and that FAQ rich results
were retired in May 2026. Useful visible questions and answers can remain;
`FAQPage`, `SearchAction`, or crawler allow directives are not evidence of ranking
or citation gains. Never infer a penalty or causation from a release followed by
short-term traffic movement.
