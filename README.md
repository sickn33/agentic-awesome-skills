<!-- registry-sync: version=9.4.0; skills=1340; stars=28867; updated_at=2026-03-31T16:30:41+00:00 -->
# 🌌 Antigravity Awesome Skills: 1,340+ Agentic Skills for Claude Code, Gemini CLI, Cursor, Copilot & More

> **Installable GitHub library of 1,340+ agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.**

Antigravity Awesome Skills is an installable GitHub library and npm installer for reusable `SKILL.md` playbooks. It is designed for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, Kiro, OpenCode, GitHub Copilot, and other AI coding assistants that benefit from structured operating instructions. Instead of collecting one-off prompt snippets, this repository gives you a searchable, installable catalog of skills, bundles, workflows, plugin-safe distributions, and practical docs that help agents perform recurring tasks with better context, stronger constraints, and clearer outputs.

You can use this repo to install a broad multi-tool skill library, start from role-based bundles, or jump into workflow-driven execution for planning, coding, debugging, testing, security review, infrastructure, product work, and growth tasks. The root README is intentionally a high-signal landing page: understand what the project is, install it quickly, choose the right tool path, and then follow deeper docs only when you need them.

**Start here:** [Star the repo](https://github.com/sickn33/antigravity-awesome-skills/stargazers) · [Install in 1 minute](#installation) · [Choose your tool](#choose-your-tool) · [Best skills by tool](#best-skills-by-tool) · [📚 Browse 1,340+ Skills](#browse-1340-skills) · [Bundles](docs/users/bundles.md) · [Workflows](docs/users/workflows.md) · [Plugins for Claude Code and Codex](docs/users/plugins.md)

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

**Current release: V9.4.0.** Trusted by 29k+ GitHub stargazers, this repository combines official and community skill collections with bundles, workflows, installation paths, and docs that help you go from first install to daily use quickly.

## Why This Repo

- **Installable, not just inspirational**: use `npx antigravity-awesome-skills` to put skills where your tool expects them.
- **Built for major agent workflows**: Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, Kiro, OpenCode, Copilot, and more.
- **Broad coverage with real utility**: 1,340+ skills across development, testing, security, infrastructure, product, and marketing.
- **Faster onboarding**: bundles and workflows reduce the time from "I found this repo" to "I used my first skill".
- **Useful whether you want breadth or curation**: browse the full catalog, start with top bundles, or compare alternatives before installing.

## Table of Contents

- [Why This Repo](#why-this-repo)
- [Installation](#installation)
- [Choose Your Tool](#choose-your-tool)
- [Quick FAQ](#quick-faq)
- [Best Skills By Tool](#best-skills-by-tool)
- [Bundles & Workflows](#bundles--workflows)
- [Browse 1,340+ Skills](#browse-1340-skills)
- [Troubleshooting](#troubleshooting)
- [Support the Project](#support-the-project)
- [Contributing](#contributing)
- [Community](#community)
- [Credits & Sources](#credits--sources)
- [Repo Contributors](#repo-contributors)
- [Star History](#star-history)
- [License](#license)

## Installation

Most users should start with the full library install and use bundles or workflows to narrow down what to try first.

### Full library install

```bash
# Default: ~/.gemini/antigravity/skills (Antigravity global). Use --path for other locations.
npx antigravity-awesome-skills
```

The npm installer uses a shallow clone by default so first-run installs stay lighter than a full repository history checkout.

### Verify the install

```bash
test -d ~/.gemini/antigravity/skills && echo "Skills installed in ~/.gemini/antigravity/skills"
```

### Run your first skill

```text
Use @brainstorming to plan a SaaS MVP.
```

### Prefer plugins for Claude Code or Codex?

- Use the full library install when you want the broadest catalog and direct control over your installed skills directory.
- Use the plugin route when you want a marketplace-style, plugin-safe distribution for Claude Code or Codex.
- Read [Plugins for Claude Code and Codex](docs/users/plugins.md) for the full breakdown of full-library install vs plugin install vs bundle plugins.

## Choose Your Tool

Use the same repository, but install or invoke it in the way your host expects.

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

For path details, prompt examples, and setup caveats by host, go to:

- [Claude Code skills](docs/users/claude-code-skills.md)
- [Cursor skills](docs/users/cursor-skills.md)
- [Codex CLI skills](docs/users/codex-cli-skills.md)
- [Gemini CLI skills](docs/users/gemini-cli-skills.md)
- [AI agent skills guide](docs/users/ai-agent-skills.md)

## Quick FAQ

### What is Antigravity Awesome Skills?

It is an installable GitHub library of reusable `SKILL.md` playbooks for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and related AI coding assistants. The repo packages those skills with an installer CLI, bundles, workflows, generated catalogs, and docs so you can move from discovery to daily usage quickly.

### How do I install it?

Run `npx antigravity-awesome-skills` for the default full-library install, or use a tool-specific flag such as `--codex`, `--cursor`, `--gemini`, `--claude`, or `--antigravity` when you want the installer to target a known skills directory directly.

### Should I use the full library or a plugin?

Use the full library if you want the biggest catalog and direct filesystem control. Use plugins when you want a marketplace-style, plugin-safe distribution for Claude Code or Codex. The complete explanation lives in [Plugins for Claude Code and Codex](docs/users/plugins.md).

### Where do I browse bundles, workflows, and the full catalog?

Start with [Bundles](docs/users/bundles.md) for role-based recommendations, [Workflows](docs/users/workflows.md) for ordered execution playbooks, [CATALOG.md](CATALOG.md) for the full registry, and the hosted [GitHub Pages catalog](https://sickn33.github.io/antigravity-awesome-skills/) when you want a browsable web UI.

## Best Skills By Tool

If you want a faster answer than "browse all 1,340+ skills", start with a tool-specific guide:

- **[Claude Code skills](docs/users/claude-code-skills.md)**: install paths, starter skills, prompt examples, and plugin marketplace flow.
- **[Cursor skills](docs/users/cursor-skills.md)**: best starter skills for `.cursor/skills/`, UI-heavy work, and pair-programming flows.
- **[Codex CLI skills](docs/users/codex-cli-skills.md)**: planning, implementation, debugging, and review skills for local coding loops.
- **[Gemini CLI skills](docs/users/gemini-cli-skills.md)**: starter stack for research, agent systems, integrations, and engineering workflows.
- **[AI agent skills guide](docs/users/ai-agent-skills.md)**: how to evaluate skill libraries, choose breadth vs curation, and pick the right starting point.

### Universal starter skills

- `@brainstorming` for planning before implementation.
- `@test-driven-development` for TDD-oriented work.
- `@debugging-strategies` for systematic troubleshooting.
- `@lint-and-validate` for lightweight quality checks.
- `@security-auditor` for security-focused reviews.
- `@frontend-design` for UI and interaction quality.
- `@api-design-principles` for API shape and consistency.
- `@create-pr` for packaging work into a clean pull request.

### Real prompt examples

```text
Use @brainstorming to turn this product idea into a concrete MVP plan.
```

```text
Use @security-auditor to review this API endpoint for auth and validation risks.
```

## Bundles & Workflows

Bundles help you choose where to start. Workflows help you execute skills in the right order.

### Start with bundles

Bundles are curated groups of recommended skills for a role or goal such as `Web Wizard`, `Security Engineer`, or `OSS Maintainer`.

- Bundles are recommendations, not separate installs.
- Install the repository once, then use [docs/users/bundles.md](docs/users/bundles.md) to pick a starting set.
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

## Browse 1,340+ Skills

Use the root repo as a landing page, then jump into the deeper surface that matches your intent.

### What you get in this repository

- **Skills library** in [`skills/`](skills/)
- **Installer CLI** powered by the npm package in [`package.json`](package.json)
- **Generated catalog and metadata** in [`CATALOG.md`](CATALOG.md), `skills_index.json`, and [`data/`](data/)
- **Hosted and local web app** in [`apps/web-app`](apps/web-app) and on [GitHub Pages](https://sickn33.github.io/antigravity-awesome-skills/)
- **Role-based bundles** in [docs/users/bundles.md](docs/users/bundles.md)
- **Execution workflows** in [docs/users/workflows.md](docs/users/workflows.md)
- **User, contributor, and maintainer docs** under [`docs/`](docs/)

### Best ways to explore

- Read the full catalog in [`CATALOG.md`](CATALOG.md).
- Browse the hosted catalog at [https://sickn33.github.io/antigravity-awesome-skills/](https://sickn33.github.io/antigravity-awesome-skills/).
- Start with [Getting Started](docs/users/getting-started.md) and [Usage](docs/users/usage.md) if you are new after installation.
- Use [Bundles](docs/users/bundles.md) for role-based discovery and [Workflows](docs/users/workflows.md) for step-by-step execution.
- Use [Plugins for Claude Code and Codex](docs/users/plugins.md) when you care about marketplace-safe distribution.

### Compare alternatives

- **[Antigravity Awesome Skills vs Awesome Claude Skills](docs/users/antigravity-awesome-skills-vs-awesome-claude-skills.md)** for breadth vs curated-list tradeoffs.
- **[Best Claude Code skills on GitHub](docs/users/best-claude-code-skills-github.md)** for a high-intent shortlist.
- **[Best Cursor skills on GitHub](docs/users/best-cursor-skills-github.md)** for Cursor-compatible options and selection criteria.

## Troubleshooting

Keep the root README short; use the dedicated docs for recovery and platform-specific guidance.

- If you are confused after installation, start with the [Usage Guide](docs/users/usage.md).
- For Windows truncation or context crash loops, use [docs/users/windows-truncation-recovery.md](docs/users/windows-truncation-recovery.md).
- For Linux/macOS overload or selective activation, use [docs/users/agent-overload-recovery.md](docs/users/agent-overload-recovery.md).
- For plugin install details, host compatibility, and marketplace-safe distribution, use [docs/users/plugins.md](docs/users/plugins.md).
- For contributor expectations and guardrails, use [CONTRIBUTING.md](CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and [`SECURITY.md`](SECURITY.md).

## Support the Project

Support is optional. The project stays free and open-source for everyone.

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
- [Follow @sickn33 on X](https://x.com/sickn33) for project updates and releases.
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community expectations and moderation standards.
- [`SECURITY.md`](SECURITY.md) for security reporting.

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
- **[expo/skills](https://github.com/expo/skills)**: Official Expo skills - Expo project workflows and Expo Application Services guidance.
- **[huggingface/skills](https://github.com/huggingface/skills)**: Official Hugging Face skills - Models, Spaces, datasets, inference, and broader Hugging Face ecosystem workflows.
- **[neondatabase/agent-skills](https://github.com/neondatabase/agent-skills)**: Official Neon skills - Serverless Postgres workflows and Neon platform guidance.

### Community Contributors

- **[rmyndharis/antigravity-skills](https://github.com/rmyndharis/antigravity-skills)**: For the massive contribution of 300+ Enterprise skills and the catalog generation logic.
- **[amartelr/antigravity-workspace-manager](https://github.com/amartelr/antigravity-workspace-manager)**: Workspace Manager CLI companion to dynamically auto-provision subsets of skills across local development environments.
- **[obra/superpowers](https://github.com/obra/superpowers)**: The original "Superpowers" by Jesse Vincent.
- **[guanyang/antigravity-skills](https://github.com/guanyang/antigravity-skills)**: Core Antigravity extensions.
- **[diet103/claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)**: Infrastructure and Backend/Frontend Guidelines.
- **[ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)**: React UI patterns and Design Systems.
- **[travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)**: Loki Mode and Playwright integration.
- **[Dimillian/Skills](https://github.com/Dimillian/Skills)**: Curated Codex skills focused on Apple platforms, GitHub workflows, refactoring, and performance (MIT).
- **[zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide)**: Comprehensive Security suite & Guide (Source for ~60 new skills).
- **[alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills)**: Senior Engineering and PM toolkit.
- **[karanb192/awesome-claude-skills](https://github.com/karanb192/awesome-claude-skills)**: A massive list of verified skills for Claude Code.
- **[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)**: Curated collection of 1000+ official and community agent skills from leading development teams (MIT).
- **[zircote/.claude](https://github.com/zircote/.claude)**: Archived Claude Code dotfiles/config repo with a Shopify development skill reference.
- **[vibeforge1111/vibeship-spawner-skills](https://github.com/vibeforge1111/vibeship-spawner-skills)**: AI agents, integrations, maker tools, and other production-grade skill packs.
- **[coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)**: Marketing skills for CRO, copywriting, SEO, paid ads, and growth (23 skills, MIT).
- **[AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo)**: SEO workflow collection covering technical SEO, hreflang, sitemap, geo, schema, and programmatic SEO patterns.
- **[jonathimer/devmarketing-skills](https://github.com/jonathimer/devmarketing-skills)**: Developer marketing skills — HN strategy, technical tutorials, docs-as-marketing, Reddit engagement, developer onboarding, and more (33 skills, MIT).
- **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)**: Obsidian-focused skills for markdown, Bases, JSON Canvas, CLI workflows, and content cleanup.
- **[Silverov/yandex-direct-skill](https://github.com/Silverov/yandex-direct-skill)**: Yandex Direct (API v5) advertising audit skill — 55 automated checks, A-F scoring, campaign/ad/keyword analysis for the Russian PPC market (MIT).
- **[vudovn/antigravity-kit](https://github.com/vudovn/antigravity-kit)**: AI Agent templates with Skills, Agents, and Workflows (33 skills, MIT).
- **[affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)**: Large Claude Code configuration and workflow collection from an Anthropic hackathon winner (MIT).
- **[whatiskadudoing/fp-ts-skills](https://github.com/whatiskadudoing/fp-ts-skills)**: Practical fp-ts skills for TypeScript – fp-ts-pragmatic, fp-ts-react, fp-ts-errors (v4.4.0).
- **[webzler/agentMemory](https://github.com/webzler/agentMemory)**: Source for the agent-memory-mcp skill.
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
- **[gokapso/agent-skills](https://github.com/gokapso/agent-skills)**: Kapso/WhatsApp-oriented agent skills.
- **[huifer/WellAlly-health](https://github.com/huifer/WellAlly-health)**: Healthcare assistant project cited in release history as a source for health-focused agent capabilities (MIT).
- **[ibelick/ui-skills](https://github.com/ibelick/ui-skills)**: UI-polish skills for improving interfaces built by agents (MIT).
- **[jackjin1997/ClawForge](https://github.com/jackjin1997/ClawForge)**: Resource hub of skills, MCP servers, and agent tooling for OpenClaw.
- **[jthack/ffuf_claude_skill](https://github.com/jthack/ffuf_claude_skill)**: FFUF skill for web fuzzing workflows in Claude.
- **[muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)**: Context-engineering, multi-agent, and production agent-system skill collection (MIT).
- **[robzolkos/skill-rails-upgrade](https://github.com/robzolkos/skill-rails-upgrade)**: Rails upgrade skill for agent-assisted migrations.
- **[sanjay3290/ai-skills](https://github.com/sanjay3290/ai-skills)**: Apache-licensed collection of agent skills for AI coding assistants.
- **[scarletkc/vexor](https://github.com/scarletkc/vexor)**: Semantic search engine for files and code, referenced in release history.
- **[sstklen/infinite-gratitude](https://github.com/sstklen/infinite-gratitude)**: Multi-agent research skill from the AI Dojo series (MIT).
- **[wrsmith108/linear-claude-skill](https://github.com/wrsmith108/linear-claude-skill)**: Linear issue/project/team management skill with MCP and GraphQL workflows (MIT).
- **[wrsmith108/varlock-claude-skill](https://github.com/wrsmith108/varlock-claude-skill)**: Secure environment-variable management skill for Claude Code (MIT).
- **[zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides)**: Frontend slide-creation skills for web-based presentations (MIT).
- **[zxkane/aws-skills](https://github.com/zxkane/aws-skills)**: AWS-focused Claude agent skills (MIT).

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

- [@sickn33](https://github.com/sickn33)
- [@github-actions[bot]](https://github.com/apps/github-actions)
- [@sck000](https://github.com/sck000)
- [@WHOISABHISHEKADHIKARI](https://github.com/WHOISABHISHEKADHIKARI)
- [@munir-abbasi](https://github.com/munir-abbasi)
- [@Mohammad-Faiz-Cloud-Engineer](https://github.com/Mohammad-Faiz-Cloud-Engineer)
- [@zinzied](https://github.com/zinzied)
- [@beatra-ai](https://github.com/beatra-ai)
- [@Prince-1652](https://github.com/Prince-1652)
- [@ssumanbiswas](https://github.com/ssumanbiswas)
- [@waynehamadi](https://github.com/waynehamadi)
- [@FrancoStino](https://github.com/FrancoStino)
- [@jhuang-tt](https://github.com/jhuang-tt)
- [@Champbreed](https://github.com/Champbreed)
- [@Dokhacgiakhoa](https://github.com/Dokhacgiakhoa)
- [@sx4im](https://github.com/sx4im)
- [@IanJ332](https://github.com/IanJ332)
- [@maxdml](https://github.com/maxdml)
- [@skyruh](https://github.com/skyruh)
- [@ar27111994](https://github.com/ar27111994)
- [@chauey](https://github.com/chauey)
- [@wwewtech](https://github.com/wwewtech)
- [@itsmeares](https://github.com/itsmeares)
- [@Copilot](https://github.com/apps/copilot-swe-agent)
- [@specterslient95-lgtm](https://github.com/specterslient95-lgtm)
- [@suhaibjanjua](https://github.com/suhaibjanjua)
- [@harshmaur](https://github.com/harshmaur)
- [@IRONICBo](https://github.com/IRONICBo)
- [@GuppyTheCat](https://github.com/GuppyTheCat)
- [@Whxuan0701](https://github.com/Whxuan0701)
- [@happy520ai](https://github.com/happy520ai)
- [@jack-reson8](https://github.com/jack-reson8)
- [@xiaolai](https://github.com/xiaolai)
- [@octo-patch](https://github.com/octo-patch)
- [@ShianMike](https://github.com/ShianMike)
- [@nickdesi](https://github.com/nickdesi)
- [@josselinlbe](https://github.com/josselinlbe)
- [@8hrsk](https://github.com/8hrsk)
- [@0xrohitgarg](https://github.com/0xrohitgarg)
- [@f-o-x11](https://github.com/f-o-x11)
- [@zebbern](https://github.com/zebbern)
- [@xizhuomengcontin](https://github.com/xizhuomengcontin)
- [@ronaldmanlupig30-web](https://github.com/ronaldmanlupig30-web)
- [@owengu-ai](https://github.com/owengu-ai)
- [@PzocikErwin](https://github.com/PzocikErwin)
- [@zealous1](https://github.com/zealous1)
- [@Wolfe-Jam](https://github.com/Wolfe-Jam)
- [@tejasashinde](https://github.com/tejasashinde)
- [@talesperito](https://github.com/talesperito)
- [@Swpn0neel](https://github.com/Swpn0neel)
- [@SnakeEye-sudo](https://github.com/SnakeEye-sudo)
- [@pierrebrunelle](https://github.com/pierrebrunelle)
- [@nikolasdehor](https://github.com/nikolasdehor)
- [@GeekLuffy](https://github.com/GeekLuffy)
- [@fernandorych](https://github.com/fernandorych)
- [@emanoelCarvalho](https://github.com/emanoelCarvalho)
- [@alen-hh](https://github.com/alen-hh)
- [@CeciliaZ030](https://github.com/CeciliaZ030)
- [@arathiesh](https://github.com/arathiesh)
- [@dz3ai](https://github.com/dz3ai)
- [@edudeftones-cloud](https://github.com/edudeftones-cloud)
- [@fullstackcrew-alpha](https://github.com/fullstackcrew-alpha)
- [@jiawood2006](https://github.com/jiawood2006)
- [@kimtth](https://github.com/kimtth)
- [@liyin2015](https://github.com/liyin2015)
- [@alapha888](https://github.com/alapha888)
- [@ununununium](https://github.com/ununununium)
- [@ymxlx](https://github.com/ymxlx)
- [@merc1305](https://github.com/merc1305)
- [@xiehuan123](https://github.com/xiehuan123)
- [@Tiger-Foxx](https://github.com/Tiger-Foxx)
- [@mdagnolops](https://github.com/mdagnolops)
- [@morluto](https://github.com/morluto)
- [@takeaseatventure](https://github.com/takeaseatventure)
- [@evadsh3ll](https://github.com/evadsh3ll)
- [@tellmefrankie](https://github.com/tellmefrankie)
- [@sstklen](https://github.com/sstklen)
- [@hazemezz123](https://github.com/hazemezz123)
- [@muratkaragozgil](https://github.com/muratkaragozgil)
- [@kissmyabs32](https://github.com/kissmyabs32)
- [@Rsmiyani](https://github.com/Rsmiyani)
- [@memurcie](https://github.com/memurcie)
- [@jackjin1997](https://github.com/jackjin1997)
- [@HuynhNhatKhanh](https://github.com/HuynhNhatKhanh)
- [@BuyWhere](https://github.com/BuyWhere)
- [@berkantay](https://github.com/berkantay)
- [@connerkward](https://github.com/connerkward)
- [@fernandezbaptiste](https://github.com/fernandezbaptiste)
- [@georgeatparallel](https://github.com/georgeatparallel)
- [@Antheurus](https://github.com/Antheurus)
- [@Ghost011118](https://github.com/Ghost011118)
- [@Gizzant](https://github.com/Gizzant)
- [@himanshub42](https://github.com/himanshub42)
- [@javierluraschi](https://github.com/javierluraschi)
- [@JayeHarrill](https://github.com/JayeHarrill)
- [@cruisekkk](https://github.com/cruisekkk)
- [@kench001](https://github.com/kench001)
- [@sahilaghara1911](https://github.com/sahilaghara1911)
- [@wu736139669](https://github.com/wu736139669)
- [@Ranjeet2063](https://github.com/Ranjeet2063)
- [@slavaolesik](https://github.com/slavaolesik)
- [@TerminallyLazy](https://github.com/TerminallyLazy)
- [@RamonRiosJr](https://github.com/RamonRiosJr)
- [@prewsh](https://github.com/prewsh)
- [@prateeks367](https://github.com/prateeks367)
- [@mosinlshaikh](https://github.com/mosinlshaikh)
- [@Musayrlsms](https://github.com/Musayrlsms)
- [@morsechimwai](https://github.com/morsechimwai)
- [@AssassinMaeve](https://github.com/AssassinMaeve)
- [@MetcalfSolutions](https://github.com/MetcalfSolutions)
- [@djmahe4](https://github.com/djmahe4)
- [@moooai](https://github.com/moooai)
- [@SuperJMN](https://github.com/SuperJMN)
- [@sudosubin](https://github.com/sudosubin)
- [@stas4000](https://github.com/stas4000)
- [@Enreign](https://github.com/Enreign)
- [@Specstreamai](https://github.com/Specstreamai)
- [@sohamganatra](https://github.com/sohamganatra)
- [@Simon-He95](https://github.com/Simon-He95)
- [@Silverov](https://github.com/Silverov)
- [@siddanta-ar1](https://github.com/siddanta-ar1)
- [@shouryamaanjain](https://github.com/shouryamaanjain)
- [@ShaunLinTW](https://github.com/ShaunLinTW)
- [@rainmanjam](https://github.com/rainmanjam)
- [@unitedideas](https://github.com/unitedideas)
- [@googio](https://github.com/googio)
- [@yabloky](https://github.com/yabloky)
- [@SergiuPogor](https://github.com/SergiuPogor)
- [@sergebulaev](https://github.com/sergebulaev)
- [@conspirafi](https://github.com/conspirafi)
- [@code-vj](https://github.com/code-vj)
- [@SenSei2121](https://github.com/SenSei2121)
- [@babysor](https://github.com/babysor)
- [@vanshyadav1408](https://github.com/vanshyadav1408)
- [@uriva](https://github.com/uriva)
- [@UrRhb](https://github.com/UrRhb)
- [@UmarSiddiqui](https://github.com/UmarSiddiqui)
- [@tuantqse90](https://github.com/tuantqse90)
- [@truongnmt](https://github.com/truongnmt)
- [@TomGranot](https://github.com/TomGranot)
- [@timwukp](https://github.com/timwukp)
- [@timini](https://github.com/timini)
- [@ThibautMelen](https://github.com/ThibautMelen)
- [@terryspitz](https://github.com/terryspitz)
- [@Onsraa](https://github.com/Onsraa)
- [@tarunbatta](https://github.com/tarunbatta)
- [@taksrules](https://github.com/taksrules)
- [@tomjwxf](https://github.com/tomjwxf)
- [@SebConejo](https://github.com/SebConejo)
- [@3516027002att-ui](https://github.com/3516027002att-ui)
- [@Suraj1235](https://github.com/Suraj1235)
- [@SchwartzKamel](https://github.com/SchwartzKamel)
- [@pravin-python](https://github.com/pravin-python)
- [@pranshuchittora](https://github.com/pranshuchittora)
- [@Pranav-Nexus](https://github.com/Pranav-Nexus)
- [@seifip](https://github.com/seifip)
- [@phuryn](https://github.com/phuryn)
- [@Pangolin-spg](https://github.com/Pangolin-spg)
- [@PabloASMD](https://github.com/PabloASMD)
- [@yubing744](https://github.com/yubing744)
- [@Optim-Agent](https://github.com/Optim-Agent)
- [@onkarbadve](https://github.com/onkarbadve)
- [@omaralbeik](https://github.com/omaralbeik)
- [@OlyaTi](https://github.com/OlyaTi)
- [@olgasafonova](https://github.com/olgasafonova)
- [@ohad6k](https://github.com/ohad6k)
- [@sharmanilay](https://github.com/sharmanilay)
- [@polnikale](https://github.com/polnikale)
- [@KhaiTrang1995](https://github.com/KhaiTrang1995)
- [@LocNguyenSGU](https://github.com/LocNguyenSGU)
- [@nedcodes-ok](https://github.com/nedcodes-ok)
- [@Necmttn](https://github.com/Necmttn)
- [@dklymentiev](https://github.com/dklymentiev)
- [@0xsarwagya](https://github.com/0xsarwagya)
- [@sarveshtalele](https://github.com/sarveshtalele)
- [@santifer](https://github.com/santifer)
- [@sanjay3290](https://github.com/sanjay3290)
- [@Imasaikiran](https://github.com/Imasaikiran)
- [@shubhamdevx](https://github.com/shubhamdevx)
- [@Rudra-G-23](https://github.com/Rudra-G-23)
- [@ronanguilloux](https://github.com/ronanguilloux)
- [@RomanShprenger](https://github.com/RomanShprenger)
- [@romankurnovskii](https://github.com/romankurnovskii)
- [@roli-lpci](https://github.com/roli-lpci)
- [@therohitdas](https://github.com/therohitdas)
- [@robinsadeghpour](https://github.com/robinsadeghpour)
- [@roberttidball](https://github.com/roberttidball)
- [@rbatista191](https://github.com/rbatista191)
- [@Reak-Z](https://github.com/Reak-Z)
- [@sraphaz](https://github.com/sraphaz)
- [@Keviniscool-boy](https://github.com/Keviniscool-boy)
- [@instax-dutta](https://github.com/instax-dutta)
- [@Quinnod345](https://github.com/Quinnod345)
- [@ProgramadorBrasil](https://github.com/ProgramadorBrasil)
- [@winsley-jeune](https://github.com/winsley-jeune)
- [@hyhmrright](https://github.com/hyhmrright)
- [@himanshu-2l](https://github.com/himanshu-2l)
- [@hafiz-actyte](https://github.com/hafiz-actyte)
- [@gongdear](https://github.com/gongdear)
- [@globalchatapp](https://github.com/globalchatapp)
- [@glasserai](https://github.com/glasserai)
- [@gjwang](https://github.com/gjwang)
- [@fruitwyatt](https://github.com/fruitwyatt)
- [@flreey](https://github.com/flreey)
- [@fbientrigo](https://github.com/fbientrigo)
- [@ejentum](https://github.com/ejentum)
- [@Whq02](https://github.com/Whq02)
- [@digitamaz](https://github.com/digitamaz)
- [@dhyabi2](https://github.com/dhyabi2)
- [@developer-victor](https://github.com/developer-victor)
- [@ckdwns9121](https://github.com/ckdwns9121)
- [@dependabot[bot]](https://github.com/apps/dependabot)
- [@demo112](https://github.com/demo112)
- [@danhe6](https://github.com/danhe6)
- [@cshara1](https://github.com/cshara1)
- [@cryptoque](https://github.com/cryptoque)
- [@moez552](https://github.com/moez552)
- [@metrox-eth](https://github.com/metrox-eth)
- [@merabtinenadirb-png](https://github.com/merabtinenadirb-png)
- [@mturac](https://github.com/mturac)
- [@MBK-fr](https://github.com/MBK-fr)
- [@mbenhard](https://github.com/mbenhard)
- [@marsiandeployer](https://github.com/marsiandeployer)
- [@mark1ian](https://github.com/mark1ian)
- [@maleksaadi0109](https://github.com/maleksaadi0109)
- [@m1amgn](https://github.com/m1amgn)
- [@luchtan-GIT](https://github.com/luchtan-GIT)
- [@lodar](https://github.com/lodar)
- [@laulauraluo](https://github.com/laulauraluo)
- [@liyangbing](https://github.com/liyangbing)
- [@lilhawk7077](https://github.com/lilhawk7077)
- [@ksgisang](https://github.com/ksgisang)
- [@KrisnaSantosa15](https://github.com/KrisnaSantosa15)
- [@kotobuki09](https://github.com/kotobuki09)
- [@kostakost2](https://github.com/kostakost2)
- [@junited31](https://github.com/junited31)
- [@jinliyl](https://github.com/jinliyl)
- [@jiawei248](https://github.com/jiawei248)
- [@zeeshangulzar](https://github.com/zeeshangulzar)
- [@Hanyuyuan6](https://github.com/Hanyuyuan6)
- [@ukorvl](https://github.com/ukorvl)
- [@263311487-ux](https://github.com/263311487-ux)
- [@baskduf](https://github.com/baskduf)
- [@TheaDust](https://github.com/TheaDust)
- [@YannisKiefer](https://github.com/YannisKiefer)
- [@Cerdore](https://github.com/Cerdore)
- [@WyattAu](https://github.com/WyattAu)
- [@Wittlesus](https://github.com/Wittlesus)
- [@Siphon880gh](https://github.com/Siphon880gh)
- [@jwcastillo](https://github.com/jwcastillo)
- [@theguysaccount](https://github.com/theguysaccount)
- [@wassim-azi](https://github.com/wassim-azi)
- [@Wakmagpie](https://github.com/Wakmagpie)
- [@wahidzzz](https://github.com/wahidzzz)
- [@Vonfry](https://github.com/Vonfry)
- [@vshulcz](https://github.com/vshulcz)
- [@vprudnikoff](https://github.com/vprudnikoff)
- [@Sharrmavishal](https://github.com/Sharrmavishal)
- [@vssinghh](https://github.com/vssinghh)
- [@viktor-ferenczi](https://github.com/viktor-ferenczi)
- [@christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)
- [@chenli-yy](https://github.com/chenli-yy)
- [@c1c3ru](https://github.com/c1c3ru)
- [@buzzbysolcex](https://github.com/buzzbysolcex)
- [@bulkmockupsfiller-ai](https://github.com/bulkmockupsfiller-ai)
- [@bosmdavid-gif](https://github.com/bosmdavid-gif)
- [@bin1874](https://github.com/bin1874)
- [@BenZinaDaze](https://github.com/BenZinaDaze)
- [@awss1i](https://github.com/awss1i)
- [@avimak](https://github.com/avimak)
- [@assaylabdesk-sudo](https://github.com/assaylabdesk-sudo)
- [@artem-morgunov](https://github.com/artem-morgunov)
- [@antbotlab](https://github.com/antbotlab)
- [@amalsam](https://github.com/amalsam)
- [@alfredtech2026](https://github.com/alfredtech2026)
- [@alexrosuleks](https://github.com/alexrosuleks)
- [@alexprivalov](https://github.com/alexprivalov)
- [@adriansurething](https://github.com/adriansurething)
- [@ziuus](https://github.com/ziuus)
- [@zillapi](https://github.com/zillapi)
- [@huyanxius](https://github.com/huyanxius)
- [@zenlee123](https://github.com/zenlee123)
- [@dineroenlamesa](https://github.com/dineroenlamesa)
- [@deveweber](https://github.com/deveweber)
- [@Digidai](https://github.com/Digidai)
- [@dbhat93](https://github.com/dbhat93)
- [@derricke](https://github.com/derricke)
- [@decentraliser](https://github.com/decentraliser)
- [@MAIOStudio](https://github.com/MAIOStudio)
- [@drogers0](https://github.com/drogers0)
- [@thecsdoctor](https://github.com/thecsdoctor)
- [@daniel3303](https://github.com/daniel3303)
- [@wd041216-bit](https://github.com/wd041216-bit)
- [@dbhurley](https://github.com/dbhurley)
- [@Courier-Britva](https://github.com/Courier-Britva)
- [@conorbronsdon](https://github.com/conorbronsdon)
- [@commitshow](https://github.com/commitshow)
- [@Metroxe](https://github.com/Metroxe)
- [@RoundTable02](https://github.com/RoundTable02)
- [@Clagoss](https://github.com/Clagoss)
- [@ChaosRealmsAI](https://github.com/ChaosRealmsAI)
- [@CahidArda](https://github.com/CahidArda)
- [@clubanderson](https://github.com/clubanderson)
- [@markqian](https://github.com/markqian)
- [@Chkhikvadze](https://github.com/Chkhikvadze)
- [@CosmoBlk](https://github.com/CosmoBlk)
- [@genefold-ai](https://github.com/genefold-ai)
- [@Gautam8387](https://github.com/Gautam8387)
- [@Sketchjar](https://github.com/Sketchjar)
- [@Nictheboy](https://github.com/Nictheboy)
- [@furkanerday](https://github.com/furkanerday)
- [@Franklyn-R-Silva](https://github.com/Franklyn-R-Silva)
- [@FrancyJGLisboa](https://github.com/FrancyJGLisboa)
- [@framunoz](https://github.com/framunoz)
- [@fkauanGIT](https://github.com/fkauanGIT)
- [@fclairamb](https://github.com/fclairamb)
- [@Evozim](https://github.com/Evozim)
- [@estevecastells](https://github.com/estevecastells)
- [@aptratcn](https://github.com/aptratcn)
- [@Elkidogz](https://github.com/Elkidogz)
- [@RabbitDesigns22](https://github.com/RabbitDesigns22)
- [@iradoweck](https://github.com/iradoweck)
- [@tomelias10](https://github.com/tomelias10)
- [@eli-alvarado](https://github.com/eli-alvarado)
- [@Nedomas](https://github.com/Nedomas)
- [@Andruia](https://github.com/Andruia)
- [@AlmogBaku](https://github.com/AlmogBaku)
- [@Allen930311](https://github.com/Allen930311)
- [@alexmvie](https://github.com/alexmvie)
- [@Pazificateur69](https://github.com/Pazificateur69)
- [@Al-Garadi](https://github.com/Al-Garadi)
- [@aditya-marble](https://github.com/aditya-marble)
- [@adelaidasofia](https://github.com/adelaidasofia)
- [@CyberZenithX](https://github.com/CyberZenithX)
- [@Sayeem3051](https://github.com/Sayeem3051)
- [@abhinaykrupa](https://github.com/abhinaykrupa)
- [@Abdulrahmansoliman](https://github.com/Abdulrahmansoliman)
- [@ASI2030](https://github.com/ASI2030)
- [@HMAKT99](https://github.com/HMAKT99)
- [@TobeMagic](https://github.com/TobeMagic)
- [@codegiveness](https://github.com/codegiveness)
- [@ALEKGG1](https://github.com/ALEKGG1)
- [@8144225309](https://github.com/8144225309)
- [@70v-Yoyo](https://github.com/70v-Yoyo)
- [@2slides](https://github.com/2slides)
- [@274326424](https://github.com/274326424)
- [@cj-ant](https://github.com/cj-ant)
- [@cis2042](https://github.com/cis2042)
- [@ranglang](https://github.com/ranglang)
- [@zambodotdev](https://github.com/zambodotdev)
- [@walidboulanouar](https://github.com/walidboulanouar)
- [@Bluemacro](https://github.com/Bluemacro)
- [@BlueSkyID666](https://github.com/BlueSkyID666)
- [@twoicewoo](https://github.com/twoicewoo)
- [@BenedictKing](https://github.com/BenedictKing)
- [@bekservice](https://github.com/bekservice)
- [@dieudonneAwa](https://github.com/dieudonneAwa)
- [@avij1109](https://github.com/avij1109)
- [@wede-wx](https://github.com/wede-wx)
- [@spideyashith](https://github.com/spideyashith)
- [@acbhatt12](https://github.com/acbhatt12)
- [@AshenJyy](https://github.com/AshenJyy)
- [@anup-a](https://github.com/anup-a)
- [@AntonioCardenas](https://github.com/AntonioCardenas)
- [@anthony-chaudhary](https://github.com/anthony-chaudhary)
- [@AnthonyFirth](https://github.com/AnthonyFirth)
- [@Anil-matcha](https://github.com/Anil-matcha)
- [@pagefarms](https://github.com/pagefarms)
- [@marina-aronchik](https://github.com/marina-aronchik)
- [@Mann-Makhecha](https://github.com/Mann-Makhecha)
- [@ManiShah7](https://github.com/ManiShah7)
- [@browseract-skill](https://github.com/browseract-skill)
- [@MArbeeGit](https://github.com/MArbeeGit)
- [@majorelalexis-stack](https://github.com/majorelalexis-stack)
- [@LydiaTools](https://github.com/LydiaTools)
- [@lumifyai](https://github.com/lumifyai)
- [@Svobikl](https://github.com/Svobikl)
- [@lorocopey-ocs](https://github.com/lorocopey-ocs)
- [@kromahlusenii-ops](https://github.com/kromahlusenii-ops)
- [@LoganOneal](https://github.com/LoganOneal)
- [@liujuanjuan1984](https://github.com/liujuanjuan1984)
- [@Linji-x](https://github.com/Linji-x)
- [@liaujianjie](https://github.com/liaujianjie)
- [@playbookTV](https://github.com/playbookTV)
- [@KyleMillion](https://github.com/KyleMillion)
- [@Krishna-Modi12](https://github.com/Krishna-Modi12)
- [@k-kolomeitsev](https://github.com/k-kolomeitsev)
- [@konradbachowski](https://github.com/konradbachowski)
- [@jakemarsh](https://github.com/jakemarsh)
- [@Natchannnn](https://github.com/Natchannnn)
- [@nachoiacovino](https://github.com/nachoiacovino)
- [@gncmustafa](https://github.com/gncmustafa)
- [@MMEHDI0606](https://github.com/MMEHDI0606)
- [@iftikharg786](https://github.com/iftikharg786)
- [@MohammadHijjawi97](https://github.com/MohammadHijjawi97)
- [@halith-smh](https://github.com/halith-smh)
- [@MohamedAbdallah-14](https://github.com/MohamedAbdallah-14)
- [@makeev](https://github.com/makeev)
- [@mikececco](https://github.com/mikececco)
- [@mishanefedov](https://github.com/mishanefedov)
- [@mertbaskurt](https://github.com/mertbaskurt)
- [@modi2meet](https://github.com/modi2meet)
- [@nazmulislam-lab](https://github.com/nazmulislam-lab)
- [@mksd0398](https://github.com/mksd0398)
- [@maxko87](https://github.com/maxko87)
- [@maxbaluev](https://github.com/maxbaluev)
- [@MattDavies](https://github.com/MattDavies)
- [@MatheusCampagnolo](https://github.com/MatheusCampagnolo)
- [@donbagger](https://github.com/donbagger)
- [@Marvin19700118](https://github.com/Marvin19700118)
- [@vanrensbird](https://github.com/vanrensbird)
- [@JaclynFitzpatrick](https://github.com/JaclynFitzpatrick)
- [@jcaiagent7143-ui](https://github.com/jcaiagent7143-ui)
- [@shrk7x](https://github.com/shrk7x)
- [@ivankoriako](https://github.com/ivankoriako)
- [@borzelo](https://github.com/borzelo)
- [@SfImran](https://github.com/SfImran)
- [@ilya-bogin-keenable](https://github.com/ilya-bogin-keenable)
- [@igrlk](https://github.com/igrlk)
- [@rcigor](https://github.com/rcigor)
- [@ianzepp](https://github.com/ianzepp)
- [@ianjennings](https://github.com/ianjennings)
- [@hogan-yuan](https://github.com/hogan-yuan)
- [@htafolla](https://github.com/htafolla)
- [@hvasconcelos](https://github.com/hvasconcelos)
- [@hqhq1025](https://github.com/hqhq1025)
- [@hank-metalbear](https://github.com/hank-metalbear)
- [@HEOJUNFO](https://github.com/HEOJUNFO)
- [@xwmxcz](https://github.com/xwmxcz)
- [@Guilherme-ruy](https://github.com/Guilherme-ruy)
- [@gregkonush](https://github.com/gregkonush)
- [@glukicov](https://github.com/glukicov)
- [@ljhskyso](https://github.com/ljhskyso)
- [@kevinmmiddleton](https://github.com/kevinmmiddleton)
- [@kennyzheng-builds](https://github.com/kennyzheng-builds)
- [@kavinduUdhara](https://github.com/kavinduUdhara)
- [@Karthikeya-Meesala](https://github.com/Karthikeya-Meesala)
- [@keyserfaty](https://github.com/keyserfaty)
- [@kage-art](https://github.com/kage-art)
- [@whatiskadudoing](https://github.com/whatiskadudoing)
- [@818cortex](https://github.com/818cortex)
- [@JunsW](https://github.com/JunsW)
- [@Junaid-PK](https://github.com/Junaid-PK)
- [@JularDepick](https://github.com/JularDepick)
- [@JuampiHernandez](https://github.com/JuampiHernandez)
- [@joselhurtado](https://github.com/joselhurtado)
- [@jonathimer](https://github.com/jonathimer)
- [@Jonohobs](https://github.com/Jonohobs)
- [@jianyangzhai](https://github.com/jianyangzhai)
- [@Jess-yaozu](https://github.com/Jess-yaozu)
- [@Kadajett](https://github.com/Kadajett)
- [@JaskiratAnand](https://github.com/JaskiratAnand)
- [@JanYork](https://github.com/JanYork)
- [@jamescha-earley](https://github.com/jamescha-earley)

## Star History

[![sickn33/antigravity-awesome-skills - Star History Chart](https://api.star-history.com/image?repos=sickn33/antigravity-awesome-skills&style=landscape1)](https://star-history.com/sickn33/antigravity-awesome-skills)

[![Star History Chart](https://api.star-history.com/svg?repos=sickn33/antigravity-awesome-skills&type=date&legend=top-left)](https://www.star-history.com/#sickn33/antigravity-awesome-skills&type=date&legend=top-left)

If Antigravity Awesome Skills has been useful, consider ⭐ starring the repo!

<!-- GitHub Topics (for maintainers): claude-code, gemini-cli, codex-cli, antigravity, cursor, github-copilot, opencode, agentic-skills, ai-coding, llm-tools, ai-agents, autonomous-coding, mcp, ai-developer-tools, ai-pair-programming, vibe-coding, skill, skills, SKILL.md, rules.md, CLAUDE.md, GEMINI.md, CURSOR.md -->

## License

Original code and tooling are licensed under the MIT License. See [LICENSE](LICENSE).

Original documentation and other non-code written content are licensed under [CC BY 4.0](LICENSE-CONTENT), unless a more specific upstream notice says otherwise. See [docs/sources/sources.md](docs/sources/sources.md) for attributions and third-party license details.

---
