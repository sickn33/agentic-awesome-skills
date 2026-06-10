<!-- registry-sync: version=12.3.0; skills=1527; stars=40206; updated_at=2026-06-10T07:45:17+00:00 -->
[![Antigravity Awesome Skills hero](assets/aas-readme-hero.jpeg)](https://github.com/sickn33/antigravity-awesome-skills)

# 🌌 Antigravity Awesome Skills: 1,527+ Agentic Skills for Claude Code, Gemini CLI, Cursor, Copilot & More

> **Installable GitHub library of 1,527+ agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.**

Antigravity Awesome Skills is an installable GitHub library and npm installer for reusable `SKILL.md` playbooks. It is designed for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, Kiro, OpenCode, GitHub Copilot, and other AI coding assistants that benefit from structured operating instructions. Instead of collecting one-off prompt snippets, this repository gives you a searchable, installable catalog of skills, bundles, workflows, plugin-safe distributions, and practical docs that help agents perform recurring tasks with better context, stronger constraints, and clearer outputs.

You can use this repo to install a broad multi-tool skill library, start from focused plugin bundles, or jump into workflow-driven execution for planning, coding, debugging, testing, security review, infrastructure, product work, and growth tasks. The root README is intentionally a high-signal landing page: understand what the project is, install the right surface quickly, choose the right tool path, and then follow deeper docs only when you need them.

The canonical project page is the GitHub repository at <https://github.com/sickn33/antigravity-awesome-skills>; the hosted catalog is a companion discovery surface for search, plugins, and skill detail pages.

**Start here:** [Install in 1 minute](#installation) · [Recommended plugins](#recommended-specialized-plugins) · [Compare plugin packs](https://sickn33.github.io/antigravity-awesome-skills/plugins) · [Choose your tool](#choose-your-tool) · [📚 Browse 1,527+ Skills](#browse-1527-skills) · [Bundles & workflows](#bundles--workflows) · [Support the project](#support-the-project)

[![GitHub stars](https://img.shields.io/badge/⭐%2040%2C000%2B%20Stars-gold?style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills/stargazers)
[![Follow @AASkills_ on X](https://img.shields.io/badge/Follow-%40AASkills__-black?style=for-the-badge&logo=x)](https://x.com/AASkills_)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Anthropic-purple)](https://claude.ai)
[![Cursor](https://img.shields.io/badge/Cursor-AI%20IDE-orange)](https://cursor.sh)
[![Codex CLI](https://img.shields.io/badge/Codex%20CLI-OpenAI-green)](https://github.com/openai/codex)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-Google-blue)](https://github.com/google-gemini/gemini-cli)
[![Latest Release](https://img.shields.io/github/v/release/sickn33/antigravity-awesome-skills?display_name=tag&style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills/releases/latest)
[![Install with NPX](https://img.shields.io/badge/Install-npx%20antigravity--awesome--skills-black?style=for-the-badge&logo=npm)](#installation)
[![Kiro](https://img.shields.io/badge/Kiro-AWS-orange?style=for-the-badge)](https://kiro.dev)
[![Copilot](https://img.shields.io/badge/Copilot-GitHub-lightblue?style=for-the-badge)](https://github.com/features/copilot)
[![OpenCode](https://img.shields.io/badge/OpenCode-CLI-gray?style=for-the-badge)](https://github.com/opencode-ai/opencode)
[![Antigravity](https://img.shields.io/badge/Antigravity-AI%20IDE-red?style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills)

**Current release: V12.3.0.** Trusted by 40k+ GitHub stargazers, this repository combines official and community skill collections with bundles, workflows, installation paths, and docs that help you go from first install to daily use quickly.

## Why This Repo

- **Installable, not just inspirational**: use `npx antigravity-awesome-skills` to put skills where your tool expects them.
- **Built for major agent workflows**: Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, Kiro, OpenCode, Copilot, and more.
- **Broad coverage with real utility**: 1,527+ skills across development, testing, security, infrastructure, product, and marketing.
- **Focused by default**: specialized plugins help you start with the web, security, data, docs, DevOps, QA, OSS, or agent/MCP workflows you actually need.
- **Useful whether you want breadth or curation**: install the full catalog, choose a specialized plugin, start with bundles, or compare alternatives before installing.

## Table of Contents

- [Why This Repo](#why-this-repo)
- [Installation](#installation)
- [Recommended Specialized Plugins](#recommended-specialized-plugins)
- [Choose Your Tool](#choose-your-tool)
- [Quick FAQ](#quick-faq)
- [Bundles & Workflows](#bundles--workflows)
- [Browse 1,527+ Skills](#browse-1527-skills)
- [Troubleshooting](#troubleshooting)
- [Stable Skills Manifest v1](#stable-skills-manifest-v1)
- [Support the Project](#support-the-project)
- [Contributing](#contributing)
- [Community](#community)
- [Credits & Sources](#credits--sources)
- [Repo Contributors](#repo-contributors)
- [Star History](#star-history)
- [License](#license)

## Installation

Most users should start by choosing the smallest useful surface:

- **Specialized plugins** when the job has a clear domain.
- **Full library install** when you want every skill available in a local skills directory.
- **Bundles and workflows** when you want role-based recommendations or ordered execution playbooks.

### Full library install

```bash
# Default: ~/.agents/skills (Antigravity 2.0 global). Use --path for other locations.
npx antigravity-awesome-skills

# Antigravity CLI slash commands (agy): ~/.gemini/antigravity-cli/skills/<skill>/SKILL.md
npx antigravity-awesome-skills --agy
```

The npm installer uses a shallow, release-pinned clone by default so first-run installs stay lighter than a full repository history checkout while matching the published npm package version. Use `--tag main` only when you intentionally want the current repository tip.

### Verify the install

```bash
test -d ~/.agents/skills && echo "Skills installed in ~/.agents/skills"
```

### Run your first skill

```text
Use @brainstorming to plan a SaaS MVP.
```

### Prefer plugins for Claude Code or Codex?

- Use a specialized plugin when you want a focused marketplace-style distribution.
- Use the full-library plugin only when you want the widest plugin-safe catalog.
- Read [Plugins for Claude Code and Codex](docs/users/plugins.md) for full-library plugin install vs specialized plugin install vs direct skills install.

## Recommended Specialized Plugins

Do not install everything first if you already know the work. Start with the focused plugin for your job, then add more only when the task expands.

All specialized plugins are generated as Claude Code and Codex plugin bundles. For Antigravity, use the same `SKILL.md` content through the installer or supported skills paths.

| Plugin | Skills | Best for |
| --- | ---: | --- |
| AAS Web App Builder | 9 | Frontend and full-stack developers shipping modern web apps. |
| AAS Product Design Studio | 8 | Product UI, brand, portfolio, and richer visual work. |
| AAS Security Engineer | 9 | Authorized security testing, audit, and hardening. |
| AAS Secure App Builder | 8 | Developers who want security embedded while building features. |
| AAS Documents & Presentations | 8 | Office files, document conversion, decks, and slide workflows. |
| AAS Data Analytics | 8 | Product analytics, SQL, dashboards, and experiments. |
| AAS Agent & MCP Builder | 9 | Agentic apps, MCP tools, RAG systems, and evaluation loops. |
| AAS OSS Maintainer | 10 | PRs, releases, reviews, and contributor handoffs. |
| AAS QA & Test Automation | 9 | Test suites, browser automation, and QA stabilization. |
| AAS DevOps & Cloud | 9 | Infrastructure, deployments, and operational workflows. |

Next-wave plugins cover marketing/SEO/growth, automation, observability/incident response, Python APIs, and mobile apps.

- Read the [specialized plugin roadmap](docs/users/specialized-plugin-roadmap.md).
- Read the [plugin guide for Claude Code and Codex](docs/users/plugins.md).
- Compare the hosted [specialized plugin landing page](https://sickn33.github.io/antigravity-awesome-skills/plugins).
- Browse the generated plugin folders in [`plugins/`](plugins/).

## Choose Your Tool

Use the same repository, but install or invoke it in the way your host expects.

| Tool           | Install                                                                  | First Use                                              |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Claude Code    | `npx antigravity-awesome-skills --claude` or Claude plugin marketplace | `>> /brainstorming help me plan a feature`           |
| Cursor         | `npx antigravity-awesome-skills --cursor`                              | `@brainstorming help me plan a feature`              |
| Gemini CLI     | `npx antigravity-awesome-skills --gemini`                              | `Use brainstorming to plan a feature`                |
| Codex CLI      | `npx antigravity-awesome-skills --codex`                               | `Use brainstorming to plan a feature`                |
| Antigravity IDE | `npx antigravity-awesome-skills --antigravity`                        | `Use @brainstorming to plan a feature`               |
| Antigravity CLI (`agy`) | `npx antigravity-awesome-skills --agy`                        | `/brainstorming help me plan a feature`              |
| Kiro CLI       | `npx antigravity-awesome-skills --kiro`                                | `Use brainstorming to plan a feature`                |
| Kiro IDE       | `npx antigravity-awesome-skills --path ~/.kiro/skills`                 | `Use @brainstorming to plan a feature`               |
| GitHub Copilot | _No installer — paste skills or rules manually_                       | `Ask Copilot to use brainstorming to plan a feature` |
| OpenCode       | `npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none` | `opencode run @brainstorming help me plan a feature` |
| AdaL CLI       | `npx antigravity-awesome-skills --path .adal/skills`                   | `Use brainstorming to plan a feature`                |
| Custom path    | `npx antigravity-awesome-skills --path ./my-skills`                    | Depends on your tool                                   |

Use the table above for install targets. Use specialized plugins when you are choosing what to install for a domain, then use the host guides below only for path details, prompt examples, and setup caveats.

- [Claude Code skills](docs/users/claude-code-skills.md): install paths, starter skills, prompt examples, and plugin marketplace flow.
- [Cursor skills](docs/users/cursor-skills.md): `.cursor/skills/` setup, UI-heavy work, and pair-programming flows.
- [Codex CLI skills](docs/users/codex-cli-skills.md): planning, implementation, debugging, and review skills for local coding loops.
- [Gemini CLI skills](docs/users/gemini-cli-skills.md): research, agent systems, integrations, and engineering workflows.
- [AI agent skills guide](docs/users/ai-agent-skills.md): breadth vs curation, skill-library evaluation, and starting-point selection.

## Quick FAQ

### What is Antigravity Awesome Skills?

**Antigravity Awesome Skills** (Release 12.3.0) is a large, installable skill library for AI coding assistants. It packages 1,527+ reusable `SKILL.md` playbooks, specialized plugins, bundles, workflows, generated catalogs, and a CLI installer so Claude Code, Codex CLI, Cursor, Gemini CLI, Antigravity, and similar tools can reuse proven operating instructions instead of one-off prompts.

### How do I install it?

Run `npx antigravity-awesome-skills` for the default full-library install. Use a tool-specific flag such as `--codex`, `--cursor`, `--gemini`, `--claude`, or `--antigravity` when you want the installer to place skills in the directory your assistant already watches.

### What are AAS specialized plugins?

AAS specialized plugins are focused, domain-specific distributions of the skill library. They package the most relevant skills for web apps, security, data analytics, documents, DevOps, QA, OSS maintenance, and agent or MCP work so users can start with the right surface instead of activating the entire catalog.

### Should I use the full library or a plugin?

Use the full library if you want the biggest catalog and direct filesystem control. Use a specialized plugin when you want a smaller, marketplace-style distribution for a specific workflow in Claude Code or Codex. For Antigravity, install the matching skills into the supported skills path. The complete explanation lives in [Plugins for Claude Code and Codex](docs/users/plugins.md).

### How are plugins, bundles, and workflows different?

Plugins are installable packaging surfaces, bundles are curated skill recommendations, and workflows are ordered execution playbooks. Start with a plugin when the domain is clear, use bundles to compare adjacent skills, and use workflows when the important part is sequencing planning, coding, testing, auditing, or release work.

### Where do I browse plugins, bundles, workflows, and the full catalog?

Start with [Specialized Plugins](#recommended-specialized-plugins) when you want an installable domain pack. Use [Bundles](docs/users/bundles.md) for role-based recommendations, [Workflows](docs/users/workflows.md) for ordered execution playbooks, [CATALOG.md](CATALOG.md) for the full registry, and the hosted [GitHub Pages catalog](https://sickn33.github.io/antigravity-awesome-skills/) for searchable browsing.


## Bundles & Workflows

Plugins, bundles, and workflows answer different questions. Plugins are the installable packaging surface; bundles are curated recommendations; workflows are ordered playbooks for getting a result.

| Surface | Answers | Use it for |
| --- | --- | --- |
| Specialized plugin | What should I install or activate for this domain? | Focused Claude Code/Codex plugin packaging and Antigravity-compatible skill selection. |
| Bundle | Which skills naturally belong together? | Role-based discovery after a full-library install or when building a custom subset. |
| Workflow | What order should the agent run skills in? | Planning, shipping, auditing, testing, or incident-style execution. |

Use a specialized plugin first when your domain is clear. Use bundles to explore adjacent skills or assemble a custom install. Use workflows when the hard part is sequencing the work.

### Start with bundles

Bundles are curated groups of recommended skills for a role or goal such as `Web Wizard`, `Security Engineer`, or `OSS Maintainer`.

- Bundles are recommendations, not separate installs.
- Install the closest specialized plugin when one matches your work, or install the repository once and use [docs/users/bundles.md](docs/users/bundles.md) to pick a starting set.
- Good starter combinations:
  - SaaS MVP: `Essentials` + `Full-Stack Developer` + `QA & Testing`
  - Production hardening: `Security Developer` + `DevOps & Cloud` + `Observability & Monitoring`
  - OSS shipping: `Essentials` + `OSS Maintainer`

### Use workflows for outcome-driven execution

- Read [docs/users/workflows.md](docs/users/workflows.md) for human-readable playbooks.
- Use [data/workflows.json](data/workflows.json) for machine-readable workflow metadata.
- Initial workflows include shipping a SaaS MVP, security audits, AI agent systems, QA/browser automation, and DDD-oriented design work.

### Need fewer active skills at runtime?

If Antigravity starts hitting context limits with too many active skills, the activation guidance in [docs/users/agent-overload-recovery.md](docs/users/agent-overload-recovery.md) can materialize only the bundles or skill ids you want in the live Antigravity directory.

If you use OpenCode or another `.agents/skills` host, prefer a reduced install up front instead of copying the full library into a context-sensitive runtime. The installer now supports `--risk`, `--category`, and `--tags` so you can keep the installed set narrow.

## Browse 1,527+ Skills

Use the root repo as a landing page, then jump into the deeper surface that matches your intent.

### What you get in this repository

- **Skills library** in [`skills/`](skills/)
- **Installer CLI** powered by the npm package in [`package.json`](package.json)
- **Generated catalog and metadata** in [`CATALOG.md`](CATALOG.md), `skills_index.json`, and [`data/`](data/)
- **Hosted and local web app** in [`apps/web-app`](apps/web-app) and on [GitHub Pages](https://sickn33.github.io/antigravity-awesome-skills/)
- **Role-based bundles** in [docs/users/bundles.md](docs/users/bundles.md)
- **Specialized plugin surfaces** in [docs/users/specialized-plugin-roadmap.md](docs/users/specialized-plugin-roadmap.md), [docs/users/plugins.md](docs/users/plugins.md), and [`plugins/`](plugins/)
- **Execution workflows** in [docs/users/workflows.md](docs/users/workflows.md)
- **User, contributor, and maintainer docs** under [`docs/`](docs/)
- **Project visuals** in [`assets/`](assets/), including the [hero](assets/aas-readme-hero.jpeg), [social card](assets/aas-social-card.jpeg), [logo](assets/aas-logo.jpeg), and [support banner](assets/buy-me-a-coffee-banner.png)

### Best ways to explore

- Read the full catalog in [`CATALOG.md`](CATALOG.md).
- Browse the hosted catalog at [https://sickn33.github.io/antigravity-awesome-skills/](https://sickn33.github.io/antigravity-awesome-skills/).
- Start with [Getting Started](docs/users/getting-started.md) and [Usage](docs/users/usage.md) if you are new after installation.
- Use [Bundles](docs/users/bundles.md) for role-based discovery and [Workflows](docs/users/workflows.md) for step-by-step execution.
- Use [Plugins for Claude Code and Codex](docs/users/plugins.md) when you care about marketplace-safe distribution, and the [Specialized Plugin Roadmap](docs/users/specialized-plugin-roadmap.md) when you want the best plugin candidates.

### Compare alternatives

- **[Antigravity Awesome Skills vs Awesome Claude Skills](docs/users/antigravity-awesome-skills-vs-awesome-claude-skills.md)** for breadth vs curated-list tradeoffs.
- **[Best Claude Code skills on GitHub](docs/users/best-claude-code-skills-github.md)** for a high-intent shortlist.
- **[Best Cursor skills on GitHub](docs/users/best-cursor-skills-github.md)** for Cursor-compatible options and selection criteria.

## Troubleshooting

Keep the root README short; use the dedicated docs for recovery and platform-specific guidance.

- If you are confused after installation, start with the [Usage Guide](docs/users/usage.md).
- If you integrate antigravity-awesome-skills into a host, read the discovery contract first: [Stable Skills Manifest v1](docs/users/discovery-manifest.md).
- For Windows truncation or context crash loops, use [docs/users/windows-truncation-recovery.md](docs/users/windows-truncation-recovery.md).
- For Linux/macOS overload or selective activation, use [docs/users/agent-overload-recovery.md](docs/users/agent-overload-recovery.md).
- For OpenCode or other `.agents/skills` installs, prefer a reduced install such as `npx antigravity-awesome-skills --path .agents/skills --category development,backend --risk safe,none`.
- For plugin install details, host compatibility, and marketplace-safe distribution, use [docs/users/plugins.md](docs/users/plugins.md).
- For contributor expectations and guardrails, use [CONTRIBUTING.md](CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and [`SECURITY.md`](SECURITY.md).

## Stable Skills Manifest v1

Host integrations should use:

- [`skills_index.json`](./skills_index.json) as the **canonical array-format manifest**.
- [`schemas/skills-index.v1.schema.json`](./schemas/skills-index.v1.schema.json) for the JSON shape.
- [`data/skills_index.json`](./data/skills_index.json) as the compatibility mirror.

This keeps discovery stable (`id`, `path`, metadata) while ensuring hosts only load `SKILL.md` for requested `@skill-id` values.

## Support the Project

Support is optional. The project stays free and open-source for everyone.

[![Buy me a coffee](assets/buy-me-a-coffee-banner.png)](https://buymeacoffee.com/sickn33)

- [Buy me a book on Buy Me a Coffee](https://buymeacoffee.com/sickn33)
- Star the repository
- Open reproducible issues
- Contribute docs, fixes, and skills

---

## Contributing

- Add new skills under `skills/<skill-name>/SKILL.md`.
- Follow the contributor guide in [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Use the template in [`docs/contributors/skill-template.md`](docs/contributors/skill-template.md).
- Validate with `npm run validate` before opening a PR.
- Keep community PRs source-only: do not commit generated registry artifacts like `CATALOG.md`, `skills_index.json`, or `data/*.json`.
- If your PR changes `SKILL.md`, expect the automated `skill-review` check on GitHub in addition to the usual validation and security scans.
- If your PR changes skills or risky guidance, manual logic review is still required even when the automated checks are green.

## Community

- [Discussions](https://github.com/sickn33/antigravity-awesome-skills/discussions) for questions, ideas, showcase posts, and community feedback.
- [Issues](https://github.com/sickn33/antigravity-awesome-skills/issues) for reproducible bugs and concrete, actionable improvement requests.
- [Follow @AASkills_ on X](https://x.com/AASkills_) for daily skills, practical workflows, and example prompts from the repo.
- [Follow @sickn33 on X](https://x.com/sickn33) for project updates and releases.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community expectations and moderation standards.
- [`SECURITY.md`](SECURITY.md) for security reporting.

## Credits & Sources

We stand on the shoulders of giants.

👉 **[View the Full Attribution Ledger](docs/sources/sources.md)**

Source credits stay here for attribution and auditability. Repository contributor credit lives separately in [Repo Contributors](#repo-contributors).

Key source families include:

- **Official AI platform and tool repositories**
- **Security, web, infrastructure, data, design, and automation communities**
- **Independent skill authors and open-source maintainers**

<details open>
<summary><strong>Official Sources</strong></summary>

### Official Sources

- **[anthropics/skills](https://github.com/anthropics/skills)**: Official Anthropic skills repository - Document manipulation (DOCX, PDF, PPTX, XLSX), Brand Guidelines, Internal Communications.
- **[anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)**: Official notebooks and recipes for building with Claude.
- **[remotion-dev/skills](https://github.com/remotion-dev/skills)**: Official Remotion skills - Video creation in React with 28 modular rules.
- **[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)**: Vercel Labs official skills - React Best Practices, Web Design Guidelines.
- **[openai/skills](https://github.com/openai/skills)**: OpenAI Codex skills catalog - Agent skills, Skill Creator, Concise Planning.
- **[supabase/agent-skills](https://github.com/supabase/agent-skills)**: Supabase official skills - Postgres Best Practices.
- **[microsoft/skills](https://github.com/microsoft/skills)**: Official Microsoft skills - Azure cloud services, Bot Framework, Cognitive Services, and enterprise development patterns across .NET, Python, TypeScript, Go, Rust, and Java.
- **[MiniMax-AI/cli](https://github.com/MiniMax-AI/cli)**: Official MiniMax CLI - text, image, video, speech, music, vision, and web-search workflows for MiniMax models and APIs.
- **[google-gemini/gemini-skills](https://github.com/google-gemini/gemini-skills)**: Official Gemini skills - Gemini API, SDK and model interactions.
- **[apify/agent-skills](https://github.com/apify/agent-skills)**: Official Apify skills - Web scraping, data extraction and automation.
- **[BuyWhere/buywhere-mcp](https://github.com/BuyWhere/buywhere-mcp)**: Official BuyWhere MCP server — search and compare products from Singapore, SEA, and US markets via Model Context Protocol.
- **[expo/skills](https://github.com/expo/skills)**: Official Expo skills - Expo project workflows and Expo Application Services guidance.
- **[huggingface/skills](https://github.com/huggingface/skills)**: Official Hugging Face skills - Models, Spaces, datasets, inference, and broader Hugging Face ecosystem workflows.
- **[longbridge/skills](https://github.com/longbridge/skills)**: Official Longbridge Securities skills - real-time quotes, charts, fundamentals, portfolio analysis, options, and market workflows for HK, US, A-share, and SG markets.
- **[HasData/hasdata-cli](https://github.com/HasData/hasdata-cli)**: Official HasData CLI and API guidance for search, scraping, ecommerce, travel, jobs, local business, and structured web data workflows.
- **[runapi-ai/cli-skill](https://github.com/runapi-ai/cli-skill)**: Official RunAPI CLI skill - generate AI images, videos, and music/audio from agent workflows, plus run other model API jobs.
- **[neondatabase/agent-skills](https://github.com/neondatabase/agent-skills)**: Official Neon skills - Serverless Postgres workflows and Neon platform guidance.
- **[Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern)**: Official Skyvern browser automation skill — AI-powered browser control using Vision LLMs and computer vision for navigating sites, filling forms, and extracting structured data.
- **[scopeblind/scopeblind-gateway](https://github.com/scopeblind/scopeblind-gateway)**: Official Scopeblind MCP governance toolkit - Cedar policy authoring, shadow-to-enforce rollout, and signed-receipt verification guidance for agent tool calls.

</details>

<details>
<summary><strong>Community Contributors & Source Repositories</strong></summary>

### Community Contributors

- **[Suraj1235/open-dynamic-workflows](https://github.com/Suraj1235/open-dynamic-workflows)**: Source for the `open-dynamic-workflows` skill - open-source dynamic multi-agent workflow engine that plans, orchestrates, and adversarially verifies parallel AI coding agents across OpenCode, Codex, Antigravity, and VS Code (MIT).
- **[multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)**: Source for the `andrej-karpathy` skill - English Karpathy-inspired LLM coding guidelines for simplicity, surgical changes, assumption surfacing, and verifiable success criteria (MIT).
- **[mskadu/opencode-agent-skills](https://github.com/mskadu/opencode-agent-skills)**: Source for opencode behavior, permission, skill-suggestion, and smart Git automation skills.
- **[adelaidasofia/ai-brain-starter](https://github.com/adelaidasofia/ai-brain-starter)**: Source for the `ingest-youtube` skill - YouTube transcript ingestion into markdown vaults with yt-dlp metadata, VTT cleanup, and capture-seed stubs (MIT).
- **[JularDepick/user-thoughts.SKILL](https://github.com/JularDepick/user-thoughts.SKILL)**: Source for the `user-thoughts` skill - persistent project idea repository workflows for capturing decisions, tech stack notes, UI/UX rationale, and MDBASE-backed project memory (MIT).
- **[ZeroPointRepo/youtube-skills](https://github.com/ZeroPointRepo/youtube-skills)**: Source for the `youtube-full` skill - TranscriptAPI-backed YouTube transcripts, search, channel browsing, playlists, and cloud-safe video research workflows (MIT).
- **[ejentum/ejentum-mcp](https://github.com/ejentum/ejentum-mcp)**: Source for the `ejentum-reasoning-harness` skill - MCP cognitive harness modes for reasoning, code review, anti-deception checks, and memory-drift analysis (MIT).
- **[luoyuctl/agenttrace](https://github.com/luoyuctl/agenttrace)**: Source for the `agenttrace-session-audit` skill - local AI coding-agent session audits for cost spikes, tool failures, latency gaps, anomalies, health gates, and session diffs (MIT).
- **[mturac/recsys-pipeline-architect](https://github.com/mturac/recsys-pipeline-architect)**: Source for the `recsys-pipeline-architect` skill - recommendation, ranking, and feed pipeline architecture using Source, Hydrator, Filter, Scorer, Selector, and SideEffect stages (MIT).
- **[aomi-labs/skills](https://github.com/aomi-labs/skills)**: Source for the `aomi-transact` skill — natural-language driver for the Aomi CLI with account-abstraction-first execution and simulate-then-sign across 25+ DeFi apps (MIT).
- **[rich-elicitation](https://github.com/CyberZenithX/Rich-Elicitation-Skill)**: Source for the `rich-elicitation` skill - asks clarifying questions in multiple rounds before starting ambiguous tasks.
- **[CodeShuX/mockhunter](https://github.com/CodeShuX/mockhunter)**: Source for the `mock-hunter` skill - Playwright-based live-page audits that classify visible values as real, mock, LLM-generated, hardcoded, broken, or unknown (MIT).
- **[commitshow/production-audit](https://github.com/commitshow/production-audit)**: Source for the `production-audit` skill - shipped-app readiness auditing across deployment health, RLS, webhooks, secrets exposure, grants, Stripe idempotency, and mobile UX.
- **[MohamedAbdallah-14/unslop](https://github.com/MohamedAbdallah-14/unslop)**: Source for the `unslop` skill - deterministic and LLM-assisted cleanup for AI-generated prose across CLI and agent tool workflows.
- **[monte-carlo-data/mc-agent-toolkit](https://github.com/monte-carlo-data/mc-agent-toolkit)**: Monte Carlo data observability skills — table health checks, change impact assessment, monitor creation, push ingestion, and SQL validation notebooks for dbt changes.
- **[openclaw/skills](https://github.com/openclaw/skills)**: Source for the `daily-gift` skill - relationship-aware creative gift generation with editorial judgment, concept selection, and multi-format rendering.
- **[umutbozdag/agent-skills-manager](https://github.com/umutbozdag/agent-skills-manager)**: Source for the `manage-skills` skill - cross-tool skill discovery, creation, editing, toggling, copying, moving, and deletion workflows across major agent coding tools.
- **[pumanitro/global-chat](https://github.com/pumanitro/global-chat)**: Source for the Global Chat Agent Discovery skill - cross-protocol discovery of MCP servers and AI agents across multiple registries.
- **[bitjaru/styleseed](https://github.com/bitjaru/styleseed)**: StyleSeed Toss UI and UX skill collection - setup wizard, page and pattern generation, design-token management, accessibility review, UX audits, feedback states, and microcopy guidance for professional mobile-first UI.
- **[yikuansun/PhotopeaAPI](https://github.com/yikuansun/PhotopeaAPI)**: Source for the `photopea-embedded-editor` skill - Photopea embedding, host-page messaging, file I/O, scripting, and export workflows for web apps (MIT).
- **[milkomida77/guardian-agent-prompts](https://github.com/milkomida77/guardian-agent-prompts)**: Source for the Multi-Agent Task Orchestrator skill - production-tested delegation patterns, anti-duplication, and quality gates for coordinated agent work.
- **[Elkidogz/technical-change-skill](https://github.com/Elkidogz/technical-change-skill)**: Source for the Technical Change Tracker skill - structured JSON change records, session handoff, and accessible HTML dashboards for coding continuity.
- **[vipin-si/article-illustrations](https://github.com/vipin-si/article-illustrations)**: Source for the `article-illustrations` skill - Grav-style hand-drawn article illustrations with whiteboard sketches, sparse annotations, and visual metaphor QA guidance (MIT).
- **[274326424/video-content-extractor](https://github.com/274326424/video-content-extractor)**: Source for the `video-content-extractor` skill - FFmpeg and Tesseract OCR workflows for extracting timestamped screen text and structured Markdown reports from MP4 videos (MIT).
- **[rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills)**: For the massive contribution of 300+ Enterprise skills and the catalog generation logic.
- **[amartelr/antigravity-workspace-manager](https://github.com/amartelr/antigravity-workspace-manager)**: Workspace Manager CLI companion to dynamically auto-provision subsets of skills across local development environments.
- **[obra/superpowers](https://github.com/obra/superpowers)**: The original "Superpowers" by Jesse Vincent.
- **[guanyang/antigravity-skills](https://github.com/guanyang/antigravity-skills)**: Core Antigravity extensions.
- **[diet103/claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)**: Infrastructure and Backend/Frontend Guidelines.
- **[ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)**: React UI patterns and Design Systems.
- **[travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)**: Loki Mode and Playwright integration.
- **[Dimillian/Skills](https://github.com/Dimillian/Skills)**: Curated Codex skills focused on Apple platforms, GitHub workflows, refactoring, and performance (MIT).
- **[zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)**: Comprehensive Security suite & Guide (Source for ~60 new skills).
- **[morsechimwai/lemmaly](https://github.com/morsechimwai/lemmaly)**: Source for the `lemmaly`, `mathguard`, `invariant-guard`, and `complexity-cuts` skills — algorithm-first discipline layer that forces AI coding agents to state Big-O, name the data structure, prove termination, and pick the right algorithm before writing the loop. Ships a deterministic CI scanner with 59 rules across 11 languages (Apache-2.0).
- **[alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)**: Senior Engineering and PM toolkit.
- **[karanb192/awesome-claude-skills](https://github.com/karanb192/awesome-claude-skills)**: A massive list of verified skills for Claude Code.
- **[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)**: Curated collection of 1000+ official and community agent skills from leading development teams (MIT).
- **[zircote/.claude](https://github.com/zircote/.claude)**: Archived Claude Code dotfiles/config repo with a Shopify development skill reference.
- **[vibeforge1111/vibeship-spawner-skills](https://github.com/vibeforge1111/vibeship-spawner-skills)**: AI agents, integrations, maker tools, and other production-grade skill packs.
- **[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)**: Marketing skills for CRO, copywriting, SEO, paid ads, and growth (23 skills, MIT).
- **[iradoweck/antigravity-awesome-skills](https://github.com/iradoweck/antigravity-awesome-skills)**: Source for the GeminiIgnore FinOps skill - `.geminiignore` setup patterns for context-window efficiency and token cost reduction.
- **[heyneuron/flowhunt-skill](https://github.com/heyneuron/flowhunt-skill)**: Source for the FlowHunt automation discovery audit skill - workflow intake, tool-by-tool audit, and opportunity prioritization for productivity automation.
- **[Intelligent-Internet/II-Commons-Skills](https://github.com/Intelligent-Internet/II-Commons-Skills)**: Source for the II-Commons research skill - deterministic retrieval across arXiv, PubMed/PMC, and supported US policy corpora.
- **[AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)**: SEO workflow collection covering technical SEO, hreflang, sitemap, geo, schema, and programmatic SEO patterns.
- **[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)**: Frontend design taste skill collection covering premium UI generation, redesign audits, GSAP motion, Stitch design systems, minimalist and brutalist visual modes, and full-output enforcement.
- **[2slides/slides-generation-2slides-skills](https://github.com/2slides/slides-generation-2slides-skills)**: Source for the `2slides-ppt-generator` skill - AI presentation generation, PDF deck creation, narration, theme search, and slide export workflows using the 2slides API (MIT).
- **[sarveshtalele/linkedin-content-skill](https://github.com/sarveshtalele/linkedin-content-skill)**: Source for the `linkedin-content-generator` skill - LinkedIn post, carousel, newsletter, and content-calendar generation workflows with local feedback memory (MIT).
- **[mrprewsh/seo-aeo-engine](https://github.com/mrprewsh/seo-aeo-engine)**: SEO/AEO content-growth system covering keyword research, content clustering, landing pages, blog structure, schema, internal linking, and audit workflows.
- **[jonathimer/devmarketing-skills](https://github.com/jonathimer/devmarketing-skills)**: Developer marketing skills — HN strategy, technical tutorials, docs-as-marketing, Reddit engagement, developer onboarding, and more (33 skills, MIT).
- **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)**: Obsidian-focused skills for markdown, Bases, JSON Canvas, CLI workflows, and content cleanup.
- **[lewiswigmore/agent-skills](https://github.com/lewiswigmore/agent-skills)**: Source for the `vscode-extension-guide-en` skill - VS Code extension development workflows, packaging, Marketplace publishing, TreeView, and webview patterns.
- **[mbenhard/unship](https://github.com/mbenhard/unship)**: Source for the `unship` skill - local workflow for comparing AI-generated UI variants in a real app, then keeping one option and cleaning up temporary alternatives (MIT).
- **[Silverov/yandex-direct-skill](https://github.com/Silverov/yandex-direct-skill)**: Yandex Direct (API v5) advertising audit skill — 55 automated checks, A-F scoring, campaign/ad/keyword analysis for the Russian PPC market (MIT).
- **[vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit)**: AI Agent templates with Skills, Agents, and Workflows (33 skills, MIT).
- **[affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)**: Large Claude Code configuration and workflow collection from an Anthropic hackathon winner (MIT).
- **[whatiskadudoing/fp-ts-skills](https://github.com/whatiskadudoing/fp-ts-skills)**: Practical fp-ts skills for TypeScript – fp-ts-pragmatic, fp-ts-react, fp-ts-errors (v4.4.0).
- **[warmskull/idea-darwin](https://github.com/warmskull/idea-darwin)**: Darwinian idea-evolution workflow for structured ideation rounds, mutation, crossbreeding, critique, and lineage tracking.
- **[Slashworks-biz/idea-os](https://github.com/Slashworks-biz/idea-os)**: Source for the `idea-os` skill - five-phase pipeline (triage -> clarify -> research -> PRD -> plan) that turns raw ideas into a build-ready PRD and execution plan.
- **[webzler/agentMemory](https://github.com/webzler/agentMemory)**: Source for the agent-memory-mcp skill.
- **[rafsilva85/credit-optimizer-v5](https://github.com/rafsilva85/credit-optimizer-v5)**: Manus AI credit optimizer skill — intelligent model routing, context compression, and smart testing. Saves 30-75% on credits with zero quality loss. Audited across 53 scenarios.
- **[ndesv21/socialclaw](https://github.com/ndesv21/socialclaw)**: Source for the SocialClaw social media publishing skill - campaign scheduling and publishing across major social platforms with a single workspace API key.
- **[Wittlesus/cursorrules-pro](https://github.com/Wittlesus/cursorrules-pro)**: Professional .cursorrules configurations for 8 frameworks - Next.js, React, Python, Go, Rust, and more. Works with Cursor, Claude Code, and Windsurf.
- **[nedcodes-ok/rule-porter](https://github.com/nedcodes-ok/rule-porter)**: Bidirectional rule converter between Cursor (.mdc), Claude Code (CLAUDE.md), GitHub Copilot, Windsurf, and legacy .cursorrules formats. Zero dependencies.
- **[SSOJet/skills](https://github.com/ssojet/skills)**: Production-ready SSOJet skills and integration guides for popular frameworks and platforms — Node.js, Next.js, React, Java, .NET Core, Go, iOS, Android, and more. Works seamlessly with SSOJet SAML, OIDC, and enterprise SSO flows. Works with Cursor, Antigravity, Claude Code, and Windsurf.
- **[MojoAuth/skills](https://github.com/MojoAuth/skills)**: Production-ready MojoAuth guides and examples for popular frameworks like Node.js, Next.js, React, Java, .NET Core, Go, iOS, and Android.
- **[mishanefedov/skill-issue](https://github.com/mishanefedov/skill-issue)**: Source for the `skill-issue` activation-audit skill for grading SKILL.md trigger metadata, prompt matching, and collision clusters (MIT).
- **[yehudalevy-collab/polis-protocol](https://github.com/yehudalevy-collab/polis-protocol)**: Source for the `polis-protocol` multi-agent coordination skill with capability cards, routing history, and protocol amendments (MIT).
- **[Xquik-dev/x-twitter-scraper](https://github.com/Xquik-dev/x-twitter-scraper)**: X (Twitter) data platform — tweet search, user lookup, follower extraction, engagement metrics, giveaway draws, monitoring, webhooks, 19 extraction tools, MCP server.
- **[connerlambden/helium-mcp](https://github.com/connerlambden/helium-mcp)**: Source for the `helium-mcp` skill — MCP server for news intelligence, media bias analysis, market data, options pricing, and semantic meme search.
- **[shmlkv/dna-claude-analysis](https://github.com/shmlkv/dna-claude-analysis)**: Personal genome analysis toolkit — Python scripts analyzing raw DNA data across 17 categories (health risks, ancestry, pharmacogenomics, nutrition, psychology, etc.) with terminal-style single-page HTML visualization.
- **[AlmogBaku/debug-skill](https://github.com/AlmogBaku/debug-skill)**: Interactive debugger skill for AI agents — breakpoints, stepping, variable inspection, and stack traces via the `dap` CLI. Supports Python, Go, Node.js/TypeScript, Rust, and C/C++.
- **[sendblue-api/sendblue-cli](https://github.com/sendblue-api/sendblue-cli)**: Source for the `sendblue-cli`, `sendblue-api`, and `sendblue-notify` skills — iMessage, SMS, and RCS messaging via Sendblue's CLI and HTTP API, plus "text me when X finishes" notification patterns for Claude Code hooks and `/loop` / `/schedule` jobs (MIT).
- **[njerschow/textme](https://github.com/njerschow/textme)**: Source for the `textme` skill — local daemon bridging inbound iMessages (via Sendblue) to a Claude Code session on the user's machine, with voice notes, image input, code execution, and a phone-number whitelist (MIT).
- **[aptratcn/skill-audit](https://github.com/aptratcn/skill-audit)**: Pre-install security audit skill for detecting malicious, overprivileged, or suspicious third-party agent skills before installation (MIT).
- **[uberSKILLS](https://github.com/uberskillsdev/uberSKILLS)**: Design, test, and deploy Claude Code Agent Skills through a visual, AI-assisted workflow.
- **[christopherlhammer11-ai/tool-use-guardian](https://github.com/christopherlhammer11-ai/tool-use-guardian)**: Source for the Tool Use Guardian skill — tool-call reliability wrapper with retries, recovery, and failure classification.
- **[christopherlhammer11-ai/recallmax](https://github.com/christopherlhammer11-ai/recallmax)**: Source for the RecallMax skill — long-context memory, summarization, and conversation compression for agents.
- **[tsilverberg/webapp-uat](https://github.com/tsilverberg/webapp-uat)**: Full browser UAT skill — Playwright testing with console/network error capture, WCAG 2.2 AA accessibility checks, i18n validation, responsive testing, and P0-P3 bug triage. Read-only by default, works with React, Vue, Angular, Ionic, Next.js.
- **[Wolfe-Jam/faf-skills](https://github.com/Wolfe-Jam/faf-skills)**: AI-context and project DNA skills — .faf format management, AI-readiness scoring, bi-sync, MCP server building, and championship-grade testing (17 skills, MIT).
- **[fullstackcrew-alpha/privacy-mask](https://github.com/fullstackcrew-alpha/privacy-mask)**: Local image privacy masking for AI coding agents. Detects and redacts PII, API keys, and secrets in screenshots via OCR + 47 regex rules. Claude Code hook integration for automatic masking. Supports Tesseract and RapidOCR. 100% offline (MIT).
- **[AvdLee/SwiftUI-Agent-Skill](https://github.com/AvdLee/SwiftUI-Agent-Skill)**: SwiftUI best-practices skill for agent workflows (MIT).
- **[CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills)**: Three.js-focused skill collection for agent-assisted 3D web work.
- **[K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills)**: Scientific, research, engineering, finance, and writing skill suite (MIT).
- **[NotMyself/claude-win11-speckit-update-skill](https://github.com/NotMyself/claude-win11-speckit-update-skill)**: Archived Speckit update skill for Claude Code (MIT).
- **[SHADOWPR0/beautiful_prose](https://github.com/SHADOWPR0/beautiful_prose)**: Writing-quality skill for improving prose and reducing generic output.
- **[SHADOWPR0/security-bluebook-builder](https://github.com/SHADOWPR0/security-bluebook-builder)**: Security documentation/buildbook skill for agent workflows.
- **[SeanZoR/claude-speed-reader](https://github.com/SeanZoR/claude-speed-reader)**: RSVP-style speed-reading helper for Claude responses (MIT).
- **[Shpigford/skills](https://github.com/Shpigford/skills)**: General-purpose agent skills for common development tasks (MIT).
- **[ZhangHanDong/makepad-skills](https://github.com/ZhangHanDong/makepad-skills)**: Makepad app-development skills and references (MIT).
- **[czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)**: n8n workflow-building skills for Claude Code (MIT).
- **[frmoretto/clarity-gate](https://github.com/frmoretto/clarity-gate)**: Verification protocol for marking uncertainty and reducing hallucinated certainty in LLM-facing docs.
- **[fruitwyatt/puzzle-activity-planner](https://github.com/fruitwyatt/puzzle-activity-planner)**: Puzzle activity-planning skill for classrooms, parties, and events with generator-link workflows.
- **[gokapso/agent-skills](https://github.com/gokapso/agent-skills)**: Kapso/WhatsApp-oriented agent skills.
- **[huifer/WellAlly-health](https://github.com/huifer/WellAlly-health)**: Healthcare assistant project cited in release history as a source for health-focused agent capabilities (MIT).
- **[hyhmrright/brooks-lint](https://github.com/hyhmrright/brooks-lint)**: AI code-review skill grounded in classic software engineering books for design-smell, coupling, and architecture review.
- **[hyhmrright/logic-lens](https://github.com/hyhmrright/logic-lens)**: AI code-review skill for formal logic inspection across bugs, race conditions, security risks, and API contract issues.
- **[ibelick/ui-skills](https://github.com/ibelick/ui-skills)**: UI-polish skills for improving interfaces built by agents (MIT).
- **[jackjin1997/ClawForge](https://github.com/jackjin1997/ClawForge)**: Resource hub of skills, MCP servers, and agent tooling for OpenClaw.
- **[jthack/ffuf_claude_skill](https://github.com/jthack/ffuf_claude_skill)**: FFUF skill for web fuzzing workflows in Claude.
- **[kubestellar/console](https://github.com/kubestellar/console)**: KubeStellar Console multi-cluster Kubernetes dashboard with `kc-agent` MCP integration, AI-assisted operations, and built-in agent skills.
- **[MetcalfSolutions/Satori](https://github.com/MetcalfSolutions/Satori)**: Clinically informed wisdom companion blending psychology frameworks and wisdom traditions into a structured reflective partner.
- **[muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)**: Context-engineering, multi-agent, and production agent-system skill collection (MIT).
- **[robzolkos/skill-rails-upgrade](https://github.com/robzolkos/skill-rails-upgrade)**: Rails upgrade skill for agent-assisted migrations.
- **[sanjay3290/ai-skills](https://github.com/sanjay3290/ai-skills)**: Apache-licensed collection of agent skills for AI coding assistants.
- **[scarletkc/vexor](https://github.com/scarletkc/vexor)**: Semantic search engine for files and code, referenced in release history.
- **[sstklen/infinite-gratitude](https://github.com/sstklen/infinite-gratitude)**: Multi-agent research skill from the AI Dojo series (MIT).
- **[wrsmith108/linear-claude-skill](https://github.com/wrsmith108/linear-claude-skill)**: Linear issue/project/team management skill with MCP and GraphQL workflows (MIT).
- **[wrsmith108/varlock-claude-skill](https://github.com/wrsmith108/varlock-claude-skill)**: Secure environment-variable management skill for Claude Code (MIT).
- **[zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides)**: Frontend slide-creation skills for web-based presentations (MIT).
- **[zxkane/aws-skills](https://github.com/zxkane/aws-skills)**: AWS-focused Claude agent skills (MIT).
- **[UrRhb/agentflow](https://github.com/UrRhb/agentflow)**: Kanban-driven AI development pipeline for orchestrating multi-worker Claude Code workflows with deterministic quality gates, adversarial review, cost tracking, and crash-proof execution (MIT).
- **[AgentPhone-AI/skills](https://github.com/AgentPhone-AI/skills)**: AgentPhone plugin for Claude Code — API-first telephony workflows for AI agents, including phone calls, SMS, phone-number management, voice-agent setup, streaming webhooks, and tool-calling patterns.
- **[uxuiprinciples/agent-skills](https://github.com/uxuiprinciples/agent-skills)**: Research-backed UX/UI agent skills for auditing interfaces against 168 principles, detecting antipatterns, and injecting UX context into AI coding sessions.
- **[voidborne-d/humanize-chinese](https://github.com/voidborne-d/humanize-chinese)**: Chinese AI-text detection and humanization toolkit for scoring, rewriting, academic AIGC reduction, and style conversion workflows.
- **[voidborne-d/lambda-lang](https://github.com/voidborne-d/lambda-lang)**: Agent-to-agent coordination language with compact atoms for multi-agent messaging, orchestration, and structured coordination logs.
- **[LambdaTest/agent-skills](https://github.com/LambdaTest/agent-skills)**: Production-grade agent skills for test automation — 46 skills covering E2E, unit, mobile, BDD, visual, and cloud testing across 15+ languages (MIT).
- **[flyingsquirrel0419/squirrel-skill](https://github.com/flyingsquirrel0419/squirrel-skill)**: Full-cycle software development skill — plans, builds, tests, lints, fixes bugs, and writes production-grade docs. Auto-detects project state and adapts its 8-phase pipeline. Works on 9 AI coding agent platforms (Apache 2.0).
- **[CodeShuX/tokenwise](https://github.com/CodeShuX/tokenwise)**: Source for the `tokenwise` skill — measurement-driven Haiku/Sonnet/Opus router for Claude Code with per-task NDJSON logging, A/B test mode, and verified $-saved reports (MIT).

</details>

<details>
<summary><strong>Inspirations & Additional Sources</strong></summary>

### Inspirations

- **[f/awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts)**: Inspiration for the Prompt Library.
- **[leonardomso/33-js-concepts](https://github.com/leonardomso/33-js-concepts)**: Inspiration for JavaScript Mastery.

### Additional Sources

- **[agent-cards/skill](https://github.com/agent-cards/skill)**: Manage prepaid virtual Visa cards for AI agents. Create cards, check balances, view credentials, close cards, and get support via MCP tools.

</details>

## Repo Contributors

<a href="https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sickn33/antigravity-awesome-skills&max=500" alt="Repository contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks). *(Image may be cached; [view live contributors](https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors) on GitHub.)*

We officially thank the following contributors for their help in making this repository awesome!

## Star History

<a href="https://www.star-history.com/#sickn33/antigravity-awesome-skills&type=date&legend=top-left">
 <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=sickn33/antigravity-awesome-skills&type=date&legend=top-left&cache_bust=202606100731" />
</a>

<a href="https://www.star-history.com/sickn33/antigravity-awesome-skills">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=sickn33/antigravity-awesome-skills&style=landscape1&theme=dark&cache_bust=202606100731" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=sickn33/antigravity-awesome-skills&style=landscape1&cache_bust=202606100731" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=sickn33/antigravity-awesome-skills&style=landscape1&cache_bust=202606100731" />
 </picture>
</a>

If Antigravity Awesome Skills has been useful, consider ⭐ starring the repo!

<!-- GitHub Topics (for maintainers): claude-code, gemini-cli, codex-cli, antigravity, cursor, github-copilot, opencode, agentic-skills, ai-coding, llm-tools, ai-agents, autonomous-coding, mcp, ai-developer-tools, ai-pair-programming, vibe-coding, skill, skills, SKILL.md, rules.md, CLAUDE.md, GEMINI.md, CURSOR.md -->

## License

Original code and tooling are licensed under the MIT License. See [LICENSE](LICENSE).

Original documentation and other non-code written content are licensed under [CC BY 4.0](LICENSE-CONTENT), unless a more specific upstream notice says otherwise. See [docs/sources/sources.md](docs/sources/sources.md) for attributions and third-party license details.

---
