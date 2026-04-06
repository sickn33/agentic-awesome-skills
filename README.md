<!-- registry-sync: version=9.3.0; skills=1340; stars=28867; updated_at=2026-03-30T19:33:19+00:00 -->
# 🌌 Antigravity Awesome Skills: 1,340+ Agentic Skills for Claude Code, Gemini CLI, Cursor, Copilot & More

> **Installable GitHub library of 1,340+ agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.**

Antigravity Awesome Skills is a GitHub repository and installer CLI for reusable `SKILL.md` playbooks. Instead of collecting random prompts, you get a searchable, installable skill library for planning, coding, debugging, testing, security review, infrastructure work, product workflows, and growth tasks across the major AI coding assistants.

**Start here:** [Star the repo](https://github.com/sickn33/antigravity-awesome-skills/stargazers) · [Install in 1 minute](#installation) · [Plugins for Claude Code and Codex](docs/users/plugins.md) · [Choose your tool](#choose-your-tool) · [Best skills by tool](#best-skills-by-tool) · [Bundles](docs/users/bundles.md) · [Workflows](docs/users/workflows.md)

[![GitHub stars](https://img.shields.io/badge/⭐%2029%2C000%2B%20Stars-gold?style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills/stargazers)
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

**Current release: V9.3.0.** Trusted by 29k+ GitHub stargazers, this repository combines official and community skill collections with bundles, workflows, installation paths, and docs that help you go from first install to daily use quickly.

## Why Developers Star This Repo

- **Installable, not just inspirational**: use `npx antigravity-awesome-skills` to put skills where your tool expects them.
- **Built for major agent workflows**: Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, Kiro, OpenCode, Copilot, and more.
- **Broad coverage with real utility**: 1,340+ skills across development, testing, security, infrastructure, product, and marketing.
- **Faster onboarding**: bundles and workflows reduce the time from "I found this repo" to "I used my first skill".
- **Useful whether you want breadth or curation**: browse the full catalog, start with top bundles, or compare alternatives before installing.

## Table of Contents

- [🚀 New Here? Start Here!](#new-here-start-here)
- [📖 Complete Usage Guide](docs/users/usage.md) - **Start here if confused after installation!**
- [🧠 Core Concepts](#core-concepts)
- [🔌 Compatibility &amp; Invocation](#compatibility--invocation)
- [🛠️ Installation](#installation)
- [🧩 Plugins For Claude Code And Codex](#plugins-for-claude-code-and-codex)
- [🧭 Integration Guides](#integration-guides)
- [🧰 Best Skills By Tool](#best-skills-by-tool)
- [❓ Quick FAQ](#quick-faq)
- [🛡️ Security Posture](#security-posture)
- [🧯 Troubleshooting](#troubleshooting)
- [🎁 Curated Collections (Bundles)](#curated-collections)
- [🧭 Antigravity Workflows](#antigravity-workflows)
- [⚖️ Alternatives &amp; Comparisons](#alternatives--comparisons)
- [📦 Features & Categories](#features--categories)
- [📚 Browse 1,340+ Skills](#browse-1340-skills)
- [🤝 Contributing](#contributing)
- [💬 Community](#community)
- [☕ Support the Project](#support-the-project)
- [🏆 Credits &amp; Sources](#credits--sources)
- [👥 Repo Contributors](#repo-contributors)
- [⚖️ License](#license)
- [🌟 Star History](#star-history)

---

## New Here? Start Here!

If you searched for **Claude Code skills**, **Cursor skills**, **Codex CLI skills**, **Gemini CLI skills**, or **AI agent skills on GitHub**, this is the fastest path to installing a serious working library and using it the same day.

### 1. 🐣 Context: What is this?

**Antigravity Awesome Skills** (Release 9.3.0) is a large, installable skill library for AI coding assistants. It includes onboarding docs, bundles, workflows, generated catalogs, and a CLI installer so you can move from discovery to actual usage without manually stitching together dozens of repos.

AI agents are smart, but they still need **task-specific operating instructions**. Skills are focused markdown playbooks that teach an agent how to perform a workflow repeatedly and with better context, whether that means deployment, API design, testing, product strategy, SEO, or documentation.

### 2. ⚡️ Quick Start (1 minute)

Install once; then use Starter Packs in [docs/users/bundles.md](docs/users/bundles.md) to focus on your role.

1. **Install**:

   ```bash
   # Default: ~/.gemini/antigravity/skills (Antigravity global). Use --path for other locations.
   npx antigravity-awesome-skills
   ```
   The npm installer uses a shallow clone by default so first-run installs stay lighter than a full repository history checkout.
2. **Verify**:

   ```bash
   test -d ~/.gemini/antigravity/skills && echo "Skills installed in ~/.gemini/antigravity/skills"
   ```
3. **Run your first skill**:

   > "Use **@brainstorming** to plan a SaaS MVP."
   >
4. **Pick a bundle**:

   - **Web Dev?** start with `Web Wizard`.
   - **Security?** start with `Security Engineer`.
   - **General use?** start with `Essentials`.

### 3. 🧠 How to use

Once installed, just ask your agent naturally:

> "Use the **@brainstorming** skill to help me plan a SaaS."
> "Run **@lint-and-validate** on this file."

👉 **NEW:** [**Complete Usage Guide - Read This First!**](docs/users/usage.md) (answers: "What do I do after installation?", "How do I execute skills?", "What should prompts look like?")

👉 **[Full Getting Started Guide](docs/users/getting-started.md)**

---

## Core Concepts

Before you compare bundles or start installing tool-specific paths, it helps to separate four ideas:

- **Skills**: reusable `SKILL.md` playbooks that teach an AI assistant how to execute a workflow well.
- **MCP tools**: integrations and external capabilities the assistant can call. Tools provide actions; skills provide operating instructions.
- **Plugins**: installable, marketplace-friendly distributions of the repository for Claude Code and Codex, including root plugins and curated bundle plugins.
- **Bundles**: curated recommendations for which skills to start with for a role or domain.
- **Workflows**: ordered execution playbooks that show how to combine multiple skills step by step.

If you want the clearest explanation of **skills vs MCP/tools**, start here:

- [Skills vs MCP Tools](docs/users/skills-vs-mcp-tools.md)
- [Plugins for Claude Code and Codex](docs/users/plugins.md)
- [Bundles](docs/users/bundles.md)
- [Workflows](docs/users/workflows.md)

## Integration Guides

If your real question is "how do I use Antigravity Awesome Skills with my tool?", use the matching guide:

- **[Claude Code](docs/users/claude-code-skills.md)**: install paths, starter prompts, plugin marketplace flow, and first-use guidance.
- **[Cursor](docs/users/cursor-skills.md)**: chat-first usage, frontend/full-stack starter skills, and practical prompts.
- **[Codex CLI](docs/users/codex-cli-skills.md)**: planning, implementation, debugging, testing, and review loops for local coding work.
- **[Gemini CLI](docs/users/gemini-cli-skills.md)**: broad engineering, agent systems, integrations, and AI workflow coverage.
- **[AI agent skills guide](docs/users/ai-agent-skills.md)**: how to evaluate this repo against broader or narrower alternatives.

## Quick FAQ

### What is Antigravity Awesome Skills?

It is an installable GitHub library of reusable `SKILL.md` playbooks for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and related AI coding assistants.

### How do I install it?

Use `npx antigravity-awesome-skills`, or a tool-specific flag like `--codex`, `--cursor`, `--gemini`, or `--claude` when you want the installer to target a specific skills directory.

### What is the difference between skills and MCP tools?

Skills are reusable playbooks that tell an AI assistant how to execute a workflow. MCP tools expose external systems or actions the assistant can call. Skills guide behavior; MCP tools provide capabilities.

### What is the difference between bundles and workflows?

Bundles are curated sets of recommended skills. Workflows are ordered execution playbooks for concrete outcomes.

For the expanded version, read [FAQ](docs/users/faq.md).

---

## Compatibility & Invocation

These skills follow the universal **SKILL.md** format and work with any AI coding assistant that supports agentic skills.

| Tool                  | Type | Invocation Example                  | Path                                                                      |
| :-------------------- | :--- | :---------------------------------- | :------------------------------------------------------------------------ |
| **Claude Code** | CLI  | `>> /skill-name help me...`       | `.claude/skills/`                                                       |
| **Gemini CLI**  | CLI  | `(User Prompt) Use skill-name...` | `.gemini/skills/`                                                       |
| **Codex CLI**   | CLI  | `(User Prompt) Use skill-name...` | `.codex/skills/`                                                        |
| **Kiro CLI**    | CLI  | `(Auto) Skills load on-demand`    | Global:`~/.kiro/skills/` · Workspace: `.kiro/skills/`                |
| **Kiro IDE**    | IDE  | `/skill-name or (Auto)`           | Global:`~/.kiro/skills/` · Workspace: `.kiro/skills/`                |
| **Antigravity** | IDE  | `(Agent Mode) Use skill...`       | Global:`~/.gemini/antigravity/skills/` · Workspace: `.agent/skills/` |
| **Cursor**      | IDE  | `@skill-name (in Chat)`           | `.cursor/skills/`                                                       |
| **Copilot**     | Ext  | `(Paste content manually)`        | N/A                                                                       |
| **OpenCode**    | CLI  | `opencode run @skill-name`        | `.agents/skills/`                                                       |
| **AdaL CLI**    | CLI  | `(Auto) Skills load on-demand`    | `.adal/skills/`                                                         |

> [!TIP]
> **Default installer path**: `~/.gemini/antigravity/skills` (Antigravity global). Use `--path ~/.agent/skills` for workspace-specific install. For manual clone, `.agent/skills/` works as workspace path for Antigravity.
> **OpenCode Path Update**: opencode path is changed to `.agents/skills` for global skills. See [Place Files](https://opencode.ai/docs/skills/#place-files) directive on OpenCode Docs.

> [!TIP]
> **Windows Users**: use the standard install commands. The legacy `core.symlinks=true` / Developer Mode workaround is no longer required for this repository.

## Installation

To use these skills with **Claude Code**, **Gemini CLI**, **Codex CLI**, **Kiro CLI**, **Kiro IDE**, **Cursor**, **Antigravity**, **OpenCode**, or **AdaL**:

### Option A: npx (recommended)

```bash
npx antigravity-awesome-skills
```

2. Verify the default install:

```bash
test -d ~/.gemini/antigravity/skills && echo "Skills installed"
```

3. Use your first skill:

```text
Use @brainstorming to plan a SaaS MVP.
```

4. Browse starter collections in [`docs/users/bundles.md`](docs/users/bundles.md) and execution playbooks in [`docs/users/workflows.md`](docs/users/workflows.md).

### Option B: Claude Code plugin marketplace

If you use Claude Code and prefer the plugin marketplace flow, this repository now ships a root `.claude-plugin/marketplace.json`:

```text
/plugin marketplace add sickn33/antigravity-awesome-skills
/plugin install antigravity-awesome-skills
```

This installs the same repository-backed skill library through Claude Code's plugin marketplace entrypoint.

The Claude plugin is a plugin-safe filtered distribution of the repo. Skills that still contain host-specific paths or undeclared setup remain in the repository, but are excluded from the plugin until they are hardened.

### Option C: Codex plugin marketplace metadata

If you use Codex and prefer a marketplace-style plugin source instead of copying skills into `.codex/skills/`, this repository now ships:

- `.agents/plugins/marketplace.json`
- `plugins/antigravity-awesome-skills/.codex-plugin/plugin.json`

The Codex plugin points at the same curated `skills/` tree through a repo-local plugin entry, so the library can be exposed as an installable Codex plugin source without duplicating the catalog.

Bundle users can also install focused Claude Code and Codex bundle plugins from the generated marketplace metadata instead of taking the full library at once.

Like the Claude distribution, the Codex plugin only exposes plugin-safe skills. Repo-only skills are still available through clone or installer flows while they are being hardened for marketplace use.

## Plugins for Claude Code and Codex

Release `9.0.0` formalizes plugins as a first-class distribution model for this repository.

- The **full library install** remains the broadest path: use `npx antigravity-awesome-skills --claude` or `--codex` when you want the largest available catalog.
- The **root plugin** gives Claude Code or Codex a marketplace-friendly installable distribution of the repository.
- **Bundle plugins** give you narrower role-based installs such as `Essentials`, `Security Engineer`, or `Web Wizard`.
- Plugin distributions are intentionally **plugin-safe**. Skills that still depend on host-specific paths, undeclared setup, or extra hardening remain in the repository, but stay out of marketplace publication until they are ready.

If you want the full explanation of root plugins, bundle plugins, full-library installs, and the difference between Claude Code and Codex plugin surfaces, read:

- [Plugins for Claude Code and Codex](docs/users/plugins.md)

## Choose Your Tool

| Tool           | Install                                                                  | First Use                                              |
| -------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Claude Code    | `npx antigravity-awesome-skills --claude` or Claude plugin marketplace | `>> /brainstorming help me plan a feature`           |
| Cursor         | `npx antigravity-awesome-skills --cursor`                              | `@brainstorming help me plan a feature`              |
| Gemini CLI     | `npx antigravity-awesome-skills --gemini`                              | `Use brainstorming to plan a feature`                |
| Codex CLI      | `npx antigravity-awesome-skills --codex`                               | `Use brainstorming to plan a feature`                |
| Antigravity    | `npx antigravity-awesome-skills --antigravity`                         | `Use @brainstorming to plan a feature`               |
| Kiro CLI       | `npx antigravity-awesome-skills --kiro`                                | `Use brainstorming to plan a feature`                |
| Kiro IDE       | `npx antigravity-awesome-skills --path ~/.kiro/skills`                 | `Use @brainstorming to plan a feature`               |
| GitHub Copilot | _No installer — paste skills or rules manually_                       | `Ask Copilot to use brainstorming to plan a feature` |
| OpenCode       | `npx antigravity-awesome-skills --path .agents/skills`                 | `opencode run @brainstorming help me plan a feature` |
| AdaL CLI       | `npx antigravity-awesome-skills --path .adal/skills`                   | `Use brainstorming to plan a feature`                |
| Custom path    | `npx antigravity-awesome-skills --path ./my-skills`                    | Depends on your tool                                   |

## Best Skills By Tool

If you want a faster answer than "browse all 1,340+ skills", start with a tool-specific guide:

- **[Claude Code skills](docs/users/claude-code-skills.md)**: install paths, starter skills, prompt examples, and plugin marketplace flow.
- **[Cursor skills](docs/users/cursor-skills.md)**: best starter skills for `.cursor/skills/`, UI-heavy work, and pair-programming flows.
- **[Codex CLI skills](docs/users/codex-cli-skills.md)**: planning, implementation, debugging, and review skills for local coding loops.
- **[Gemini CLI skills](docs/users/gemini-cli-skills.md)**: starter stack for research, agent systems, integrations, and engineering workflows.
- **[AI agent skills guide](docs/users/ai-agent-skills.md)**: how to evaluate skill libraries, choose breadth vs curation, and pick the right starting point.

## Security Posture

These skills are continuously reviewed and hardened, but the collection is not "safe by default". They are instructions and examples that can include risky operations by design.

- Runtime hardening now protects the `/api/refresh-skills` mutation flow (method/host checks and optional token gate) before any repo mutation.
- The published GitHub Pages catalog runs in static public-catalog mode, so the maintainer-only `/api/refresh-skills` flow is hidden in production unless you are using the local Vite dev server with the explicit sync flag.
- Skill saves in the web UI are intentionally browser-local today. Optional Supabase configuration is read-only and should not be treated as a shared write path or authoritative leaderboard.
- Markdown rendering in the web app avoids raw HTML passthrough (`rehype-raw`) and follows safer defaults for skill content display.
- A repo-wide `SKILL.md` security scan checks for high-risk command patterns (for example `curl|bash`, `wget|sh`, `irm|iex`, command-line token examples) with explicit allowlisting for deliberate exceptions.
- Pull requests that touch `SKILL.md` files now also run an automated `skill-review` GitHub Actions check, so contributors and maintainers get a second pass focused on skill structure and review quality.
- Maintainer-facing tooling has additional path/symlink checks and parser robustness guards for safer sync, index, and install operations.
- Security test coverage for endpoint authorization, rendering safety, and doc-risk patterns is part of the normal CI/release validation flow.

---

## What This Repo Includes

- **Skills library**: `skills/` contains the reusable `SKILL.md` collection.
- **Installer**: the npm CLI installs skills into the right directory for each tool.
- **Catalog**: [`CATALOG.md`](CATALOG.md), `skills_index.json`, and `data/` provide generated indexes.
- **Web app**: [`apps/web-app`](apps/web-app) gives you search, filters, rendering, and copy helpers.
- **Bundles**: [`docs/users/bundles.md`](docs/users/bundles.md) groups starter skills by role.
- **Workflows**: [`docs/users/workflows.md`](docs/users/workflows.md) gives step-by-step execution playbooks.

## Project Structure

| Path                   | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `skills/`            | The canonical skill library                               |
| `docs/users/`        | Getting started, usage, bundles, workflows, visual guides |
| `docs/contributors/` | Templates, anatomy, examples, quality bar, community docs |
| `docs/maintainers/`  | Release, audit, CI drift, metadata maintenance docs       |
| `docs/sources/`      | Attribution and licensing references                      |
| `apps/web-app/`      | Interactive browser for the skill catalog                 |
| `tools/`             | Installer, validators, generators, and support scripts    |
| `data/`              | Generated catalog, aliases, bundles, and workflows        |

## Top Starter Skills

- `@brainstorming` for planning before implementation.
- `@architecture` for system and component design.
- `@test-driven-development` for TDD-oriented work.
- `@doc-coauthoring` for structured documentation writing.
- `@lint-and-validate` for lightweight quality checks.
- `@create-pr` for packaging work into a clean pull request.
- `@debugging-strategies` for systematic troubleshooting.
- `@api-design-principles` for API shape and consistency.
- `@frontend-design` for UI and interaction quality.
- `@security-auditor` for security-focused reviews.


### Community Contributed Skills

- [Overnight Worker](https://github.com/fullstackcrew-alpha/skill-overnight-worker) - Autonomous overnight work agent. Assign tasks before sleep, get structured results by morning.
- [Cost Optimizer](https://github.com/fullstackcrew-alpha/skill-cost-optimizer) - Save 60-80% on AI token costs with smart model routing, context compression, and heartbeat tuning.
- [DevOps Agent](https://github.com/fullstackcrew-alpha/skill-devops-agent) - One-click deploy, monitoring setup, scheduled backups, fault diagnosis with safety-first design.
- [CN Content Matrix](https://github.com/fullstackcrew-alpha/skill-cn-content-matrix) - Chinese multi-platform content generator for Xiaohongshu, WeChat, Douyin, Bilibili with true style transfer.
- [Smart PR Review](https://github.com/fullstackcrew-alpha/skill-smart-pr-review) - Opinionated AI code reviewer with 6-layer deep review, Devil's Advocate mode, MUST FIX/SHOULD FIX/SUGGESTION output.
- [HubSpot Admin Skills](https://github.com/TomGranot/hubspot-admin-skills) - 32 Claude Code skills for auditing, cleaning, enriching, and automating HubSpot CRM. Includes Python scripts, Breeze AI workflow prompts, and a full audit → plan → execute → maintain flow.
- [Tutor Skills](https://github.com/RoundTable02/tutor-skills) - Transform PDFs, docs, and codebases into Obsidian study vaults with interactive quiz-based learning and proficiency tracking.
- [CoinPaprika & DexPaprika Skills](https://github.com/coinpaprika/skills) - Two crypto data skills: CoinPaprika (12K+ coins, 350+ exchanges, OHLCV, tickers) and DexPaprika (34 chains, 30M+ DEX pools, real-time streaming). Free, no API key. Install: `npx skills add github.com/coinpaprika/skills`
- [SoulPass](https://github.com/soulpassai/soulpass-skill) - Hardware-secured Solana wallet, trading terminal, and agent identity layer with Jupiter swaps, meme coin trading, DeFi yield, trading bots, encrypted agent-to-agent messaging, and Apple Secure Enclave key storage.

## Three Real Examples

```text
Use @brainstorming to turn this product idea into a concrete MVP plan.
```

```text
Use @security-auditor to review this API endpoint for auth and validation risks.
```

## Curated Collections

**Bundles** are curated groups of skills for a specific role or goal (for example: `Web Wizard`, `Security Engineer`, `OSS Maintainer`).

They help you avoid picking through the full catalog one by one.

### ⚠️ Important: Bundles Are NOT Separate Installations!

**Common confusion:** "Do I need to install each bundle separately?"

**Answer: NO!** Here's what bundles actually are:

**What bundles ARE:**

- ✅ Recommended skill lists organized by role
- ✅ Curated starting points to help you decide what to use
- ✅ Time-saving shortcuts for discovering relevant skills

**What bundles are NOT:**

- ❌ Separate installations or downloads
- ❌ Different git commands
- ❌ Something most users need to activate during normal install

### How to use bundles:

1. **Install the repository once** (you already have all skills)
2. **Browse bundles** in [docs/users/bundles.md](docs/users/bundles.md) to find your role
3. **Pick 3-5 skills** from that bundle to start using in your prompts
4. **Reference them in your conversations** with your AI (e.g., "Use @brainstorming...")

If Antigravity starts hitting context limits with too many active skills, the optional activation scripts in [`docs/users/agent-overload-recovery.md`](docs/users/agent-overload-recovery.md) can materialize only the bundles or skill ids you want in the live Antigravity directory.

For detailed examples of how to actually use skills, see the [**Usage Guide**](docs/users/usage.md).

### Examples:

- Building a SaaS MVP: `Essentials` + `Full-Stack Developer` + `QA & Testing`.
- Hardening production: `Security Developer` + `DevOps & Cloud` + `Observability & Monitoring`.
- Shipping OSS changes: `Essentials` + `OSS Maintainer`.

## Antigravity Workflows

Bundles help you choose skills. Workflows help you execute them in order.

- Use bundles when you need curated recommendations by role.
- Use workflows when you need step-by-step execution for a concrete goal.

Start here:

- [docs/users/workflows.md](docs/users/workflows.md): human-readable playbooks.
- [data/workflows.json](data/workflows.json): machine-readable workflow metadata.

Initial workflows include:

- Ship a SaaS MVP
- Security Audit for a Web App
- Build an AI Agent System
- QA and Browser Automation (with optional `@go-playwright` support for Go stacks)
- Design a DDD Core Domain

## Alternatives & Comparisons

Need to compare this repository with other skill libraries before you install? Start here:

- **[Antigravity Awesome Skills vs Awesome Claude Skills](docs/users/antigravity-awesome-skills-vs-awesome-claude-skills.md)** for breadth vs curated-list tradeoffs.
- **[Best Claude Code skills on GitHub](docs/users/best-claude-code-skills-github.md)** for a high-intent shortlist.
- **[Best Cursor skills on GitHub](docs/users/best-cursor-skills-github.md)** for Cursor-compatible options and selection criteria.

## Features & Categories

The repository is organized into specialized domains to transform your AI into an expert across the entire software development lifecycle:

| Category       | Focus                                              | Example skills                                                                        |
| :------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------ |
| Architecture   | System design, ADRs, C4, and scalable patterns     | `architecture`, `c4-context`, `senior-architect`                                |
| Business       | Growth, pricing, CRO, SEO, and go-to-market        | `copywriting`, `pricing-strategy`, `seo-audit`                                  |
| Data & AI      | LLM apps, RAG, agents, observability, analytics    | `rag-engineer`, `prompt-engineer`, `langgraph`                                  |
| Development    | Language mastery, framework patterns, code quality | `typescript-expert`, `python-patterns`, `react-patterns`                        |
| General        | Planning, docs, product ops, writing, guidelines   | `brainstorming`, `doc-coauthoring`, `writing-plans`                             |
| Infrastructure | DevOps, cloud, serverless, deployment, CI/CD       | `docker-expert`, `aws-serverless`, `vercel-deployment`                          |
| Security       | AppSec, pentesting, vuln analysis, compliance      | `api-security-best-practices`, `sql-injection-testing`, `vulnerability-scanner` |
| Testing        | TDD, test design, fixes, QA workflows              | `test-driven-development`, `testing-patterns`, `test-fixing`                    |
| Workflow       | Automation, orchestration, jobs, agents            | `workflow-automation`, `inngest`, `trigger-dev`                                 |

Counts change as new skills are added. For the current full registry, see [CATALOG.md](CATALOG.md).

## Browse 1,340+ Skills

- Open the interactive browser in [`apps/web-app`](apps/web-app).
- Read the full catalog in [`CATALOG.md`](CATALOG.md).
- Start with tool-specific guides in [`docs/users/claude-code-skills.md`](docs/users/claude-code-skills.md), [`docs/users/cursor-skills.md`](docs/users/cursor-skills.md), [`docs/users/codex-cli-skills.md`](docs/users/codex-cli-skills.md), and [`docs/users/gemini-cli-skills.md`](docs/users/gemini-cli-skills.md).
- Start with role-based bundles in [`docs/users/bundles.md`](docs/users/bundles.md).
- Follow outcome-driven workflows in [`docs/users/workflows.md`](docs/users/workflows.md).
- Use the onboarding guides in [`docs/users/getting-started.md`](docs/users/getting-started.md) and [`docs/users/usage.md`](docs/users/usage.md).

## Documentation

| For Users                                                       | For Contributors                                                          | For Maintainers                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/users/getting-started.md`](docs/users/getting-started.md) | [`CONTRIBUTING.md`](CONTRIBUTING.md)                                       | [`docs/maintainers/release-process.md`](docs/maintainers/release-process.md)                                                              |
| [`docs/users/usage.md`](docs/users/usage.md)                     | [`docs/contributors/skill-anatomy.md`](docs/contributors/skill-anatomy.md) | [`docs/maintainers/audit.md`](docs/maintainers/audit.md)                                                                                  |
| [`docs/users/faq.md`](docs/users/faq.md)                         | [`docs/contributors/quality-bar.md`](docs/contributors/quality-bar.md)     | [`docs/maintainers/ci-drift-fix.md`](docs/maintainers/ci-drift-fix.md)                                                                    |
| [`docs/users/plugins.md`](docs/users/plugins.md)                 | [`docs/contributors/examples.md`](docs/contributors/examples.md)           | [`docs/maintainers/repo-growth-seo.md`](docs/maintainers/repo-growth-seo.md) · [`docs/maintainers/skills-update-guide.md`](docs/maintainers/skills-update-guide.md) · [`.github/MAINTENANCE.md`](.github/MAINTENANCE.md) |
| [`docs/users/claude-code-skills.md`](docs/users/claude-code-skills.md) · [`docs/users/cursor-skills.md`](docs/users/cursor-skills.md) · [`docs/users/codex-cli-skills.md`](docs/users/codex-cli-skills.md) · [`docs/users/gemini-cli-skills.md`](docs/users/gemini-cli-skills.md) |  |  |
| [`docs/users/visual-guide.md`](docs/users/visual-guide.md) · [`docs/users/ai-agent-skills.md`](docs/users/ai-agent-skills.md) · [`docs/users/best-claude-code-skills-github.md`](docs/users/best-claude-code-skills-github.md) · [`docs/users/best-cursor-skills-github.md`](docs/users/best-cursor-skills-github.md) |  |  |

## Troubleshooting

### Windows install note

Use the normal install flow on Windows:

```bash
git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
```

If you have an older clone created around the removed symlink workaround, reinstall into a fresh directory or rerun the `npx antigravity-awesome-skills` installer.

### Windows truncation or context crash loop

If Antigravity or a Jetski/Cortex-based host keeps reopening into a truncation error, use the dedicated recovery guide:

- [`docs/users/windows-truncation-recovery.md`](docs/users/windows-truncation-recovery.md)

That guide includes:

- backup paths before cleanup
- the storage folders that usually need to be cleared
- an optional batch helper adapted from [issue #274](https://github.com/sickn33/antigravity-awesome-skills/issues/274)

### Linux and macOS agent overload

If Antigravity becomes unstable only when too many skills are active at once, use the cross-platform overload guide:

- [`docs/users/agent-overload-recovery.md`](docs/users/agent-overload-recovery.md)

### Fixing agent overload (activation scripts)

If your agent is struggling with context window limits due to too many loaded skills, use the activation scripts. They keep the full library in a separate archive folder and only activate the bundles or skills you need into the live Antigravity skills directory.

**Important Usage Instructions:**

1. **First, manually close the repository** (e.g., exit your AI agent or close your IDE).
2. Open a terminal inside the folder where you cloned this repository (NOTE: repository has to be cloned).
3. Run the script located in the `scripts` folder.

macOS/Linux examples:

```bash
# Activate specific bundles
./scripts/activate-skills.sh "Web Wizard" "Integration & APIs"

# Activate literal skill ids
./scripts/activate-skills.sh brainstorming systematic-debugging

# Clear and reset (archives the live directory first)
./scripts/activate-skills.sh --clear
```

Windows examples:

```bat
:: Activate specific bundles
.\scripts\activate-skills.bat "Web Wizard" "Integration & APIs"

:: Clear and reset (removes all skills except the Essentials bundle)
.\scripts\activate-skills.bat --clear
```

## Web App

The web app is the fastest way to navigate a large repository like this.

**Run locally:**

```bash
npm run app:install
npm run app:dev
```

That will copy the generated skill index into `apps/web-app/public/skills.json`, mirror the current `skills/` tree into `apps/web-app/public/skills/`, and start the Vite development server.

On the hosted GitHub Pages site, the same app runs as a static public catalog: dev-only sync controls stay hidden there, and save/star actions remain local to the browser.

**Hosted online:** The same app is available at [https://sickn33.github.io/antigravity-awesome-skills/](https://sickn33.github.io/antigravity-awesome-skills/) and is deployed automatically on every push to `main`. To enable it once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

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
- [Follow @sickn33 on X](https://x.com/sickn33) for project updates and releases.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community expectations and moderation standards.
- [`SECURITY.md`](SECURITY.md) for security reporting.

## Support the Project

Support is optional. The project stays free and open-source for everyone.

- [Buy me a book on Buy Me a Coffee](https://buymeacoffee.com/sickn33)
- Star the repository
- Open reproducible issues
- Contribute docs, fixes, and skills

---

## Credits & Sources

We stand on the shoulders of giants.

👉 **[View the Full Attribution Ledger](docs/sources/sources.md)**

Key contributors and sources include:

- **HackTricks**
- **OWASP**
- **Anthropic / OpenAI / Google**
- **The Open Source Community**

This collection would not be possible without the incredible work of the Claude Code community and official sources:

### Official Sources

- **[anthropics/skills](https://github.com/anthropics/skills)**: Official Anthropic skills repository - Document manipulation (DOCX, PDF, PPTX, XLSX), Brand Guidelines, Internal Communications.
- **[anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)**: Official notebooks and recipes for building with Claude.
- **[remotion-dev/skills](https://github.com/remotion-dev/skills)**: Official Remotion skills - Video creation in React with 28 modular rules.
- **[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)**: Vercel Labs official skills - React Best Practices, Web Design Guidelines.
- **[openai/skills](https://github.com/openai/skills)**: OpenAI Codex skills catalog - Agent skills, Skill Creator, Concise Planning.
- **[supabase/agent-skills](https://github.com/supabase/agent-skills)**: Supabase official skills - Postgres Best Practices.
- **[microsoft/skills](https://github.com/microsoft/skills)**: Official Microsoft skills - Azure cloud services, Bot Framework, Cognitive Services, and enterprise development patterns across .NET, Python, TypeScript, Go, Rust, and Java.
- **[google-gemini/gemini-skills](https://github.com/google-gemini/gemini-skills)**: Official Gemini skills - Gemini API, SDK and model interactions.
- **[apify/agent-skills](https://github.com/apify/agent-skills)**: Official Apify skills - Web scraping, data extraction and automation.

### Community Contributors

- **[rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills)**: For the massive contribution of 300+ Enterprise skills and the catalog generation logic.
- **[amartelr/antigravity-workspace-manager](https://github.com/amartelr/antigravity-workspace-manager)**: Official Workspace Manager CLI companion to dynamically auto-provision subsets of skills across unlimited local development environments.
- **[obra/superpowers](https://github.com/obra/superpowers)**: The original "Superpowers" by Jesse Vincent.
- **[guanyang/antigravity-skills](https://github.com/guanyang/antigravity-skills)**: Core Antigravity extensions.
- **[diet103/claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)**: Infrastructure and Backend/Frontend Guidelines.
- **[ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)**: React UI patterns and Design Systems.
- **[travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)**: Loki Mode and Playwright integration.
- **[Dimillian/Skills](https://github.com/Dimillian/Skills)**: Curated Codex skills focused on Apple platforms, GitHub workflows, refactoring, and performance. Source for `app-store-changelog`, `github`, `ios-debugger-agent`, `macos-menubar-tuist-app`, `macos-spm-app-packaging`, `orchestrate-batch-refactor`, `project-skill-audit`, `react-component-performance`, `simplify-code`, `swift-concurrency-expert`, `swiftui-liquid-glass`, `swiftui-performance-audit`, `swiftui-ui-patterns`, and `swiftui-view-refactor` (MIT).
- **[zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)**: Comprehensive Security suite & Guide (Source for ~60 new skills).
- **[alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)**: Senior Engineering and PM toolkit.
- **[karanb192/awesome-claude-skills](https://github.com/karanb192/awesome-claude-skills)**: A massive list of verified skills for Claude Code.
- **[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)**: Curated collection of 61 high-quality skills including official team skills from Sentry, Trail of Bits, Expo, Hugging Face, and comprehensive context engineering suite (v4.3.0 integration).
- **[zircote/.claude](https://github.com/zircote/.claude)**: Shopify development skill reference.
- **[vibeforge1111/vibeship-spawner-skills](https://github.com/vibeforge1111/vibeship-spawner-skills)**: AI Agents, Integrations, Maker Tools (57 skills, Apache 2.0).
- **[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)**: Marketing skills for CRO, copywriting, SEO, paid ads, and growth (23 skills, MIT).
- **[AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)**: SEO workflow collection covering technical SEO, hreflang, sitemap, geo, schema, and programmatic SEO patterns.
- **[jonathimer/devmarketing-skills](https://github.com/jonathimer/devmarketing-skills)**: Developer marketing skills — HN strategy, technical tutorials, docs-as-marketing, Reddit engagement, developer onboarding, and more (33 skills, MIT).
- **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)**: Obsidian-focused skills for markdown, Bases, JSON Canvas, CLI workflows, and content cleanup.
- **[Silverov/yandex-direct-skill](https://github.com/Silverov/yandex-direct-skill)**: Yandex Direct (API v5) advertising audit skill — 55 automated checks, A-F scoring, campaign/ad/keyword analysis for the Russian PPC market (MIT).
- **[vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit)**: AI Agent templates with Skills, Agents, and Workflows (33 skills, MIT).
- **[affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)**: Complete Claude Code configuration collection from Anthropic hackathon winner - skills only (8 skills, MIT).
- **[whatiskadudoing/fp-ts-skills](https://github.com/whatiskadudoing/fp-ts-skills)**: Practical fp-ts skills for TypeScript – fp-ts-pragmatic, fp-ts-react, fp-ts-errors (v4.4.0).
- **[webzler/agentMemory](https://github.com/webzler/agentMemory)**: Source for the agent-memory-mcp skill.
- **[sstklen/claude-api-cost-optimization](https://github.com/sstklen/claude-api-cost-optimization)**: Save 50-90% on Claude API costs with smart optimization strategies (MIT).
- **[rafsilva85/credit-optimizer-v5](https://github.com/rafsilva85/credit-optimizer-v5)**: Manus AI credit optimizer skill — intelligent model routing, context compression, and smart testing. Saves 30-75% on credits with zero quality loss. Audited across 53 scenarios.
- **[Wittlesus/cursorrules-pro](https://github.com/Wittlesus/cursorrules-pro)**: Professional .cursorrules configurations for 8 frameworks - Next.js, React, Python, Go, Rust, and more. Works with Cursor, Claude Code, and Windsurf.
- **[nedcodes-ok/rule-porter](https://github.com/nedcodes-ok/rule-porter)**: Bidirectional rule converter between Cursor (.mdc), Claude Code (CLAUDE.md), GitHub Copilot, Windsurf, and legacy .cursorrules formats. Zero dependencies.
- **[SSOJet/skills](https://github.com/ssojet/skills)**: Production-ready SSOJet skills and integration guides for popular frameworks and platforms — Node.js, Next.js, React, Java, .NET Core, Go, iOS, Android, and more. Works seamlessly with SSOJet SAML, OIDC, and enterprise SSO flows. Works with Cursor, Antigravity, Claude Code, and Windsurf.
- **[MojoAuth/skills](https://github.com/MojoAuth/skills)**: Production-ready MojoAuth guides and examples for popular frameworks like Node.js, Next.js, React, Java, .NET Core, Go, iOS, and Android.
- **[Xquik-dev/x-twitter-scraper](https://github.com/Xquik-dev/x-twitter-scraper)**: X (Twitter) data platform — tweet search, user lookup, follower extraction, engagement metrics, giveaway draws, monitoring, webhooks, 19 extraction tools, MCP server.
- **[shmlkv/dna-claude-analysis](https://github.com/shmlkv/dna-claude-analysis)**: Personal genome analysis toolkit — Python scripts analyzing raw DNA data across 17 categories (health risks, ancestry, pharmacogenomics, nutrition, psychology, etc.) with terminal-style single-page HTML visualization.
- **[AlmogBaku/debug-skill](https://github.com/AlmogBaku/debug-skill)**: Interactive debugger skill for AI agents — breakpoints, stepping, variable inspection, and stack traces via the `dap` CLI. Supports Python, Go, Node.js/TypeScript, Rust, and C/C++.
- **[uberSKILLS](https://github.com/uberskillsdev/uberSKILLS)**: Design, test, and deploy Claude Code Agent Skills through a visual, AI-assisted workflow.
- **[christopherlhammer11-ai/tool-use-guardian](https://github.com/christopherlhammer11-ai/tool-use-guardian)**: Source for the Tool Use Guardian skill — tool-call reliability wrapper with retries, recovery, and failure classification.
- **[christopherlhammer11-ai/recallmax](https://github.com/christopherlhammer11-ai/recallmax)**: Source for the RecallMax skill — long-context memory, summarization, and conversation compression for agents.
- **[tsilverberg/webapp-uat](https://github.com/tsilverberg/webapp-uat)**: Full browser UAT skill — Playwright testing with console/network error capture, WCAG 2.2 AA accessibility checks, i18n validation, responsive testing, and P0-P3 bug triage. Read-only by default, works with React, Vue, Angular, Ionic, Next.js.
- **[Wolfe-Jam/faf-skills](https://github.com/Wolfe-Jam/faf-skills)**: AI-context and project DNA skills — .faf format management, AI-readiness scoring, bi-sync, MCP server building, and championship-grade testing (17 skills, MIT).
- **[fullstackcrew-alpha/privacy-mask](https://github.com/fullstackcrew-alpha/privacy-mask)**: Local image privacy masking for AI coding agents. Detects and redacts PII, API keys, and secrets in screenshots via OCR + 47 regex rules. Claude Code hook integration for automatic masking. Supports Tesseract and RapidOCR. 100% offline (MIT).

### Inspirations

- **[f/awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts)**: Inspiration for the Prompt Library.
- **[leonardomso/33-js-concepts](https://github.com/leonardomso/33-js-concepts)**: Inspiration for JavaScript Mastery.

### Additional Sources

- **[agent-cards/skill](https://github.com/agent-cards/skill)**: Manage prepaid virtual Visa cards for AI agents. Create cards, check balances, view credentials, close cards, and get support via MCP tools.

## Repo Contributors

<a href="https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sickn33/antigravity-awesome-skills" alt="Repository contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks). *(Image may be cached; [view live contributors](https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors) on GitHub.)*

We officially thank the following contributors for their help in making this repository awesome!

- [@sck000](https://github.com/sck000)
- [@github-actions[bot]](https://github.com/apps/github-actions)
- [@sickn33](https://github.com/sickn33)
- [@munir-abbasi](https://github.com/munir-abbasi)
- [@Mohammad-Faiz-Cloud-Engineer](https://github.com/Mohammad-Faiz-Cloud-Engineer)
- [@zinzied](https://github.com/zinzied)
- [@ssumanbiswas](https://github.com/ssumanbiswas)
- [@Champbreed](https://github.com/Champbreed)
- [@Dokhacgiakhoa](https://github.com/Dokhacgiakhoa)
- [@sx4im](https://github.com/sx4im)
- [@maxdml](https://github.com/maxdml)
- [@IanJ332](https://github.com/IanJ332)
- [@skyruh](https://github.com/skyruh)
- [@ar27111994](https://github.com/ar27111994)
- [@chauey](https://github.com/chauey)
- [@itsmeares](https://github.com/itsmeares)
- [@suhaibjanjua](https://github.com/suhaibjanjua)
- [@GuppyTheCat](https://github.com/GuppyTheCat)
- [@Copilot](https://github.com/apps/copilot-swe-agent)
- [@8hrsk](https://github.com/8hrsk)
- [@fernandorych](https://github.com/fernandorych)
- [@nikolasdehor](https://github.com/nikolasdehor)
- [@SnakeEye-sudo](https://github.com/SnakeEye-sudo)
- [@talesperito](https://github.com/talesperito)
- [@zebbern](https://github.com/zebbern)
- [@sstklen](https://github.com/sstklen)
- [@0xrohitgarg](https://github.com/0xrohitgarg)
- [@tejasashinde](https://github.com/tejasashinde)
- [@jackjin1997](https://github.com/jackjin1997)
- [@HuynhNhatKhanh](https://github.com/HuynhNhatKhanh)
- [@taksrules](https://github.com/taksrules)
- [@liyin2015](https://github.com/liyin2015)
- [@fullstackcrew-alpha](https://github.com/fullstackcrew-alpha)
- [@dz3ai](https://github.com/dz3ai)
- [@fernandezbaptiste](https://github.com/fernandezbaptiste)
- [@Gizzant](https://github.com/Gizzant)
- [@JayeHarrill](https://github.com/JayeHarrill)
- [@AssassinMaeve](https://github.com/AssassinMaeve)
- [@arathiesh](https://github.com/arathiesh)
- [@Tiger-Foxx](https://github.com/Tiger-Foxx)
- [@RamonRiosJr](https://github.com/RamonRiosJr)
- [@Musayrlsms](https://github.com/Musayrlsms)
- [@Wittlesus](https://github.com/Wittlesus)
- [@wahidzzz](https://github.com/wahidzzz)
- [@Vonfry](https://github.com/Vonfry)
- [@qcwssss](https://github.com/qcwssss)
- [@vprudnikoff](https://github.com/vprudnikoff)
- [@viktor-ferenczi](https://github.com/viktor-ferenczi)
- [@code-vj](https://github.com/code-vj)
- [@SenSei2121](https://github.com/SenSei2121)
- [@babysor](https://github.com/babysor)
- [@uriva](https://github.com/uriva)
- [@UrRhb](https://github.com/UrRhb)
- [@truongnmt](https://github.com/truongnmt)
- [@TomGranot](https://github.com/TomGranot)
- [@terryspitz](https://github.com/terryspitz)
- [@Onsraa](https://github.com/Onsraa)
- [@yubing744](https://github.com/yubing744)
- [@SebConejo](https://github.com/SebConejo)
- [@SuperJMN](https://github.com/SuperJMN)
- [@Enreign](https://github.com/Enreign)
- [@sohamganatra](https://github.com/sohamganatra)
- [@Silverov](https://github.com/Silverov)
- [@conspirafi](https://github.com/conspirafi)
- [@shubhamdevx](https://github.com/shubhamdevx)
- [@ronanguilloux](https://github.com/ronanguilloux)
- [@sraphaz](https://github.com/sraphaz)
- [@ProgramadorBrasil](https://github.com/ProgramadorBrasil)
- [@prewsh](https://github.com/prewsh)
- [@PabloASMD](https://github.com/PabloASMD)
- [@vuth-dogo](https://github.com/vuth-dogo)
- [@hazemezz123](https://github.com/hazemezz123)
- [@yang1002378395-cmyk](https://github.com/yang1002378395-cmyk)
- [@viliawang-pm](https://github.com/viliawang-pm)
- [@uucz](https://github.com/uucz)
- [@tsilverberg](https://github.com/tsilverberg)
- [@thuanlm215](https://github.com/thuanlm215)
- [@shmlkv](https://github.com/shmlkv)
- [@rafsilva85](https://github.com/rafsilva85)
- [@nocodemf](https://github.com/nocodemf)
- [@marsiandeployer](https://github.com/marsiandeployer)
- [@ksgisang](https://github.com/ksgisang)
- [@KrisnaSantosa15](https://github.com/KrisnaSantosa15)
- [@kostakost2](https://github.com/kostakost2)
- [@junited31](https://github.com/junited31)
- [@fbientrigo](https://github.com/fbientrigo)
- [@developer-victor](https://github.com/developer-victor)
- [@ckdwns9121](https://github.com/ckdwns9121)
- [@dependabot[bot]](https://github.com/apps/dependabot)
- [@christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)
- [@c1c3ru](https://github.com/c1c3ru)
- [@buzzbysolcex](https://github.com/buzzbysolcex)
- [@BenZinaDaze](https://github.com/BenZinaDaze)
- [@avimak](https://github.com/avimak)
- [@antbotlab](https://github.com/antbotlab)
- [@amalsam](https://github.com/amalsam)
- [@ziuus](https://github.com/ziuus)
- [@Cerdore](https://github.com/Cerdore)
- [@Wolfe-Jam](https://github.com/Wolfe-Jam)
- [@ivankoriako](https://github.com/ivankoriako)
- [@rcigor](https://github.com/rcigor)
- [@hvasconcelos](https://github.com/hvasconcelos)
- [@Guilherme-ruy](https://github.com/Guilherme-ruy)
- [@FrancyJGLisboa](https://github.com/FrancyJGLisboa)
- [@framunoz](https://github.com/framunoz)
- [@Digidai](https://github.com/Digidai)
- [@dbhat93](https://github.com/dbhat93)
- [@decentraliser](https://github.com/decentraliser)
- [@MAIOStudio](https://github.com/MAIOStudio)
- [@wd041216-bit](https://github.com/wd041216-bit)
- [@conorbronsdon](https://github.com/conorbronsdon)
- [@RoundTable02](https://github.com/RoundTable02)
- [@ChaosRealmsAI](https://github.com/ChaosRealmsAI)
- [@kriptoburak](https://github.com/kriptoburak)
- [@BenedictKing](https://github.com/BenedictKing)
- [@acbhatt12](https://github.com/acbhatt12)
- [@Andruia](https://github.com/Andruia)
- [@AlmogBaku](https://github.com/AlmogBaku)
- [@Allen930311](https://github.com/Allen930311)
- [@alexmvie](https://github.com/alexmvie)
- [@Al-Garadi](https://github.com/Al-Garadi)
- [@Sayeem3051](https://github.com/Sayeem3051)
- [@Abdulrahmansoliman](https://github.com/Abdulrahmansoliman)
- [@HMAKT99](https://github.com/HMAKT99)
- [@ALEKGG1](https://github.com/ALEKGG1)
- [@8144225309](https://github.com/8144225309)
- [@1bcMax](https://github.com/1bcMax)
- [@olgasafonova](https://github.com/olgasafonova)
- [@sharmanilay](https://github.com/sharmanilay)
- [@KhaiTrang1995](https://github.com/KhaiTrang1995)
- [@LocNguyenSGU](https://github.com/LocNguyenSGU)
- [@nedcodes-ok](https://github.com/nedcodes-ok)
- [@MMEHDI0606](https://github.com/MMEHDI0606)
- [@iftikharg786](https://github.com/iftikharg786)
- [@halith-smh](https://github.com/halith-smh)
- [@mertbaskurt](https://github.com/mertbaskurt)
- [@modi2meet](https://github.com/modi2meet)
- [@MatheusCampagnolo](https://github.com/MatheusCampagnolo)
- [@donbagger](https://github.com/donbagger)
- [@Marvin19700118](https://github.com/Marvin19700118)
- [@djmahe4](https://github.com/djmahe4)
- [@MArbeeGit](https://github.com/MArbeeGit)
- [@majorelalexis-stack](https://github.com/majorelalexis-stack)
- [@Svobikl](https://github.com/Svobikl)
- [@kromahlusenii-ops](https://github.com/kromahlusenii-ops)
- [@Krishna-Modi12](https://github.com/Krishna-Modi12)
- [@k-kolomeitsev](https://github.com/k-kolomeitsev)
- [@kennyzheng-builds](https://github.com/kennyzheng-builds)
- [@keyserfaty](https://github.com/keyserfaty)
- [@kage-art](https://github.com/kage-art)
- [@whatiskadudoing](https://github.com/whatiskadudoing)
- [@joselhurtado](https://github.com/joselhurtado)
- [@jonathimer](https://github.com/jonathimer)
- [@Jonohobs](https://github.com/Jonohobs)
- [@JaskiratAnand](https://github.com/JaskiratAnand)
- [@jamescha-earley](https://github.com/jamescha-earley)

## License

Original code and tooling are licensed under the MIT License. See [LICENSE](LICENSE).

Original documentation and other non-code written content are licensed under [CC BY 4.0](LICENSE-CONTENT), unless a more specific upstream notice says otherwise. See [docs/sources/sources.md](docs/sources/sources.md) for attributions and third-party license details.

---

## Star History

[![sickn33/antigravity-awesome-skills - Star History Chart](https://api.star-history.com/image?repos=sickn33/antigravity-awesome-skills&style=landscape1)](https://star-history.com/sickn33/antigravity-awesome-skills)

[![Star History Chart](https://api.star-history.com/svg?repos=sickn33/antigravity-awesome-skills&type=date&legend=top-left)](https://www.star-history.com/#sickn33/antigravity-awesome-skills&type=date&legend=top-left)

If Antigravity Awesome Skills has been useful, consider ⭐ starring the repo!

<!-- GitHub Topics (for maintainers): claude-code, gemini-cli, codex-cli, antigravity, cursor, github-copilot, opencode, agentic-skills, ai-coding, llm-tools, ai-agents, autonomous-coding, mcp, ai-developer-tools, ai-pair-programming, vibe-coding, skill, skills, SKILL.md, rules.md, CLAUDE.md, GEMINI.md, CURSOR.md -->
