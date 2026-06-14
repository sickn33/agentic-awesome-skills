# Antigravity Skill Bundles

> **Curated collections of skills organized by role and expertise level.** Don't know where to start? Pick a bundle below to get a curated set of skills for your role.

> These packs are curated starter recommendations for humans. Generated bundle ids in `data/bundles.json` are broader catalog/workflow groupings and do not need to map 1:1 to the editorial packs below.

> **Important:** bundles are installable plugin subsets and activation presets, not invokable mega-skills such as `@web-wizard` or `/essentials-bundle`. Use the individual skills listed in the pack, install the bundle as a dedicated marketplace plugin, or use the activation scripts if you want only that bundle's skills active in your live Antigravity directory.

> **Plugin compatibility:** root plugins and bundle plugins only publish plugin-safe skills. If a bundle shows `pending hardening`, the skills still exist in the repository, but that bundle is not yet published for that target. `Requires manual setup` means the bundle is installable, but one or more included skills need an explicit setup step before first use.

## Quick Start

1. **Install the repository or bundle plugin:**

   ```bash
   npx antigravity-awesome-skills
   # or clone manually
   git clone https://github.com/sickn33/antigravity-awesome-skills.git .agent/skills
   ```

2. **Choose your bundle** from the list below based on your role or interests.

3. **Use bundle plugins or individual skills** in your AI assistant:
   - Claude Code: install the matching marketplace bundle plugin, or invoke `>> /skill-name help me...`
   - Codex CLI / Codex app: install the matching bundle plugin where plugin marketplaces are available, or invoke `Use skill-name...`
   - Cursor: `@skill-name` in chat
   - Gemini CLI: `Use skill-name...`

If you want a bundle to behave like a focused active subset instead of a full install, use:

- macOS/Linux: `./scripts/activate-skills.sh --clear Essentials`
- macOS/Linux: `./scripts/activate-skills.sh --clear "Web Wizard"`
- Windows: `.\scripts\activate-skills.bat --clear Essentials`

---

## Essentials & Core

### 🚀 The "Essentials" Starter Pack

_For everyone. Install these first._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`concise-planning`](../../skills/concise-planning/): Always start with a plan.
- [`lint-and-validate`](../../skills/lint-and-validate/): Keep your code clean automatically.
- [`git-pushing`](../../skills/git-pushing/): Save your work safely.
- [`kaizen`](../../skills/kaizen/): Continuous improvement mindset.
- [`systematic-debugging`](../../skills/systematic-debugging/): Debug like a pro.


---

## Security & Compliance

### 🛡️ The "Security Engineer" Pack

_For pentesting, auditing, and hardening._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`ethical-hacking-methodology`](../../skills/ethical-hacking-methodology/): The Bible of ethical hacking.
- [`burp-suite-testing`](../../skills/burp-suite-testing/): Web vulnerability scanning.
- [`top-web-vulnerabilities`](../../skills/top-web-vulnerabilities/): OWASP-aligned vulnerability taxonomy.
- [`linux-privilege-escalation`](../../skills/linux-privilege-escalation/): Advanced Linux security assessment.
- [`cloud-penetration-testing`](../../skills/cloud-penetration-testing/): AWS/Azure/GCP security.
- [`security-auditor`](../../skills/security-auditor/): Comprehensive security audits.
- [`vulnerability-scanner`](../../skills/vulnerability-scanner/): Advanced vulnerability analysis.

### 🔐 The "Security Developer" Pack

_For building secure applications._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`api-security-best-practices`](../../skills/api-security-best-practices/): Secure API design patterns.
- [`auth-implementation-patterns`](../../skills/auth-implementation-patterns/): JWT, OAuth2, session management.
- [`backend-security-coder`](../../skills/backend-security-coder/): Secure backend coding practices.
- [`frontend-security-coder`](../../skills/frontend-security-coder/): XSS prevention and client-side security.
- [`cc-skill-security-review`](../../skills/cc-skill-security-review/): Security checklist for features.
- [`pci-compliance`](../../skills/pci-compliance/): Payment card security standards.


---

## 🌐 Web Development

### 🌐 The "Web Wizard" Pack

_For building modern, high-performance web apps._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`frontend-design`](../../skills/frontend-design/): UI guidelines and aesthetics.
- [`react-best-practices`](../../skills/react-best-practices/): React & Next.js performance optimization.
- [`react-patterns`](../../skills/react-patterns/): Modern React patterns and principles.
- [`nextjs-best-practices`](../../skills/nextjs-best-practices/): Next.js App Router patterns.
- [`tailwind-patterns`](../../skills/tailwind-patterns/): Tailwind CSS v4 styling superpowers.
- [`form-cro`](../../skills/form-cro/): Optimize your forms for conversion.
- [`seo-audit`](../../skills/seo-audit/): Get found on Google.

### 🖌️ The "Web Designer" Pack

_For pixel-perfect experiences._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`ui-ux-pro-max`](../../skills/ui-ux-pro-max/): Premium design systems and tokens.
- [`frontend-design`](../../skills/frontend-design/): The base layer of aesthetics.
- [`3d-web-experience`](../../skills/3d-web-experience/): Three.js & React Three Fiber magic.
- [`canvas-design`](../../skills/canvas-design/): Static visuals and posters.
- [`mobile-design`](../../skills/mobile-design/): Mobile-first design principles.
- [`scroll-experience`](../../skills/scroll-experience/): Immersive scroll-driven experiences.

### ⚡ The "Full-Stack Developer" Pack

_For end-to-end web application development._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`senior-fullstack`](../../skills/senior-fullstack/): Complete fullstack development guide.
- [`frontend-developer`](../../skills/frontend-developer/): React 19+ and Next.js 15+ expertise.
- [`backend-dev-guidelines`](../../skills/backend-dev-guidelines/): Node.js/Express/TypeScript patterns.
- [`api-patterns`](../../skills/api-patterns/): REST vs GraphQL vs tRPC selection.
- [`database-design`](../../skills/database-design/): Schema design and ORM selection.
- [`stripe-integration`](../../skills/stripe-integration/): Payments and subscriptions.


---

## 🤖 AI & Agents

### 🤖 The "Agent Architect" Pack

_For building AI systems and autonomous agents._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`agent-evaluation`](../../skills/agent-evaluation/): Test and benchmark your agents.
- [`langgraph`](../../skills/langgraph/): Build stateful agent workflows.
- [`mcp-builder`](../../skills/mcp-builder/): Create your own MCP tools.
- [`prompt-engineering`](../../skills/prompt-engineering/): Master the art of talking to LLMs.
- [`ai-agents-architect`](../../skills/ai-agents-architect/): Design autonomous AI agents.
- [`rag-engineer`](../../skills/rag-engineer/): Build RAG systems with vector search.

### 🧠 The "LLM Application Developer" Pack

_For building production LLM applications._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`llm-app-patterns`](../../skills/llm-app-patterns/): Production-ready LLM patterns.
- [`rag-implementation`](../../skills/rag-implementation/): Retrieval-Augmented Generation.
- [`prompt-caching`](../../skills/prompt-caching/): Cache strategies for LLM prompts.
- [`context-window-management`](../../skills/context-window-management/): Manage LLM context efficiently.
- [`langfuse`](../../skills/langfuse/): LLM observability and tracing.


---

## 🎮 Game Development

### 🎮 The "Indie Game Dev" Pack

_For building games with AI assistants._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`game-development/game-design`](../../skills/game-development/game-design/): Mechanics and loops.
- [`game-development/2d-games`](../../skills/game-development/2d-games/): Sprites and physics.
- [`game-development/3d-games`](../../skills/game-development/3d-games/): Models and shaders.
- [`unity-developer`](../../skills/unity-developer/): Unity 6 LTS development.
- [`godot-gdscript-patterns`](../../skills/godot-gdscript-patterns/): Godot 4 GDScript patterns.
- [`algorithmic-art`](../../skills/algorithmic-art/): Generate assets with code.


---

## 🐍 Backend & Languages

### 🐍 The "Python Pro" Pack

_For backend heavyweights and data scientists._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`python-pro`](../../skills/python-pro/): Master Python 3.12+ with modern features.
- [`python-patterns`](../../skills/python-patterns/): Idiomatic Python code.
- [`fastapi-pro`](../../skills/fastapi-pro/): High-performance async APIs.
- [`fastapi-templates`](../../skills/fastapi-templates/): Production-ready FastAPI projects.
- [`django-pro`](../../skills/django-pro/): The battery-included framework.
- [`python-testing-patterns`](../../skills/python-testing-patterns/): Comprehensive testing with pytest.
- [`async-python-patterns`](../../skills/async-python-patterns/): Python asyncio mastery.

### 🟦 The "TypeScript & JavaScript" Pack

_For modern web development._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`typescript-expert`](../../skills/typescript-expert/): TypeScript mastery and advanced types.
- [`javascript-pro`](../../skills/javascript-pro/): Modern JavaScript with ES6+.
- [`react-best-practices`](../../skills/react-best-practices/): React performance optimization.
- [`nodejs-best-practices`](../../skills/nodejs-best-practices/): Node.js development principles.
- [`nextjs-app-router-patterns`](../../skills/nextjs-app-router-patterns/): Next.js 14+ App Router.

### 🦀 The "Systems Programming" Pack

_For low-level and performance-critical code._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`rust-pro`](../../skills/rust-pro/): Rust 1.75+ with async patterns.
- [`go-concurrency-patterns`](../../skills/go-concurrency-patterns/): Go concurrency mastery.
- [`golang-pro`](../../skills/golang-pro/): Go development expertise.
- [`memory-safety-patterns`](../../skills/memory-safety-patterns/): Memory-safe programming.
- [`cpp-pro`](../../skills/cpp-pro/): Modern C++ development.


---

## 🦄 Product & Business

### 🦄 The "Startup Founder" Pack

_For building products, not just code._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`product-manager-toolkit`](../../skills/product-manager-toolkit/): RICE prioritization, PRD templates.
- [`competitive-landscape`](../../skills/competitive-landscape/): Competitor analysis.
- [`competitor-alternatives`](../../skills/competitor-alternatives/): Create comparison pages.
- [`launch-strategy`](../../skills/launch-strategy/): Product launch planning.
- [`copywriting`](../../skills/copywriting/): Marketing copy that converts.
- [`stripe-integration`](../../skills/stripe-integration/): Get paid from day one.

### 📊 The "Business Analyst" Pack

_For data-driven decision making._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`business-analyst`](../../skills/business-analyst/): AI-powered analytics and KPIs.
- [`startup-metrics-framework`](../../skills/startup-metrics-framework/): SaaS metrics and unit economics.
- [`startup-financial-modeling`](../../skills/startup-financial-modeling/): 3-5 year financial projections.
- [`market-sizing-analysis`](../../skills/market-sizing-analysis/): TAM/SAM/SOM calculations.
- [`kpi-dashboard-design`](../../skills/kpi-dashboard-design/): Effective KPI dashboards.

### 📈 The "Marketing & Growth" Pack

_For driving user acquisition and retention._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`content-creator`](../../skills/content-creator/): SEO-optimized marketing content.
- [`seo-audit`](../../skills/seo-audit/): Technical SEO health checks.
- [`programmatic-seo`](../../skills/programmatic-seo/): Create pages at scale.
- [`analytics-tracking`](../../skills/analytics-tracking/): Set up GA4/PostHog correctly.
- [`ab-test-setup`](../../skills/ab-test-setup/): Validated learning experiments.
- [`email-sequence`](../../skills/email-sequence/): Automated email campaigns.


---

## DevOps & Infrastructure

### 🌧️ The "DevOps & Cloud" Pack

_For infrastructure and scaling._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`docker-expert`](../../skills/docker-expert/): Master containers and multi-stage builds.
- [`aws-serverless`](../../skills/aws-serverless/): Serverless on AWS (Lambda, DynamoDB).
- [`kubernetes-architect`](../../skills/kubernetes-architect/): K8s architecture and GitOps.
- [`terraform-specialist`](../../skills/terraform-specialist/): Infrastructure as Code mastery.
- [`environment-setup-guide`](../../skills/environment-setup-guide/): Standardization for teams.
- [`deployment-procedures`](../../skills/deployment-procedures/): Safe rollout strategies.
- [`bash-linux`](../../skills/bash-linux/): Terminal wizardry.

### 📊 The "Observability & Monitoring" Pack

_For production reliability._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`observability-engineer`](../../skills/observability-engineer/): Comprehensive monitoring systems.
- [`distributed-tracing`](../../skills/distributed-tracing/): Track requests across microservices.
- [`slo-implementation`](../../skills/slo-implementation/): Service Level Objectives.
- [`incident-responder`](../../skills/incident-responder/): Rapid incident response.
- [`postmortem-writing`](../../skills/postmortem-writing/): Blameless postmortems.
- [`performance-engineer`](../../skills/performance-engineer/): Application performance optimization.


---

## 📊 Data & Analytics

### 📊 The "Data & Analytics" Pack

_For making sense of the numbers._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`analytics-tracking`](../../skills/analytics-tracking/): Set up GA4/PostHog correctly.
- [`claude-d3js-skill`](../../skills/claude-d3js-skill/): Beautiful custom visualizations with D3.js.
- [`sql-pro`](../../skills/sql-pro/): Modern SQL with cloud-native databases.
- [`postgres-best-practices`](../../skills/postgres-best-practices/): Postgres optimization.
- [`ab-test-setup`](../../skills/ab-test-setup/): Validated learning.
- [`database-architect`](../../skills/database-architect/): Database design from scratch.

### 🔄 The "Data Engineering" Pack

_For building data pipelines._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`data-engineer`](../../skills/data-engineer/): Data pipeline architecture.
- [`airflow-dag-patterns`](../../skills/airflow-dag-patterns/): Apache Airflow DAGs.
- [`dbt-transformation-patterns`](../../skills/dbt-transformation-patterns/): Analytics engineering.
- [`vector-database-engineer`](../../skills/vector-database-engineer/): Vector databases for RAG.
- [`embedding-strategies`](../../skills/embedding-strategies/): Embedding model selection.


---

## 🎨 Creative & Content

### 🎨 The "Creative Director" Pack

_For visuals, content, and branding._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`canvas-design`](../../skills/canvas-design/): Generate posters and diagrams.
- [`frontend-design`](../../skills/frontend-design/): UI aesthetics.
- [`content-creator`](../../skills/content-creator/): SEO-optimized blog posts.
- [`copy-editing`](../../skills/copy-editing/): Polish your prose.
- [`algorithmic-art`](../../skills/algorithmic-art/): Code-generated masterpieces.
- [`interactive-portfolio`](../../skills/interactive-portfolio/): Portfolios that land jobs.


---

## 🐞 Quality Assurance

### 🐞 The "QA & Testing" Pack

_For breaking things before users do._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`test-driven-development`](../../skills/test-driven-development/): Red, Green, Refactor.
- [`systematic-debugging`](../../skills/systematic-debugging/): Debug like Sherlock Holmes.
- [`browser-automation`](../../skills/browser-automation/): End-to-end testing with Playwright.
- [`e2e-testing-patterns`](../../skills/e2e-testing-patterns/): Reliable E2E test suites.
- [`ab-test-setup`](../../skills/ab-test-setup/): Validated experiments.
- [`code-review-checklist`](../../skills/code-review-checklist/): Catch bugs in PRs.
- [`test-fixing`](../../skills/test-fixing/): Fix failing tests systematically.


---

## ⭐ Specialized Product Plugins

### 🌐 The "AAS Web App Builder" Plugin

_Frontend and full-stack developers shipping modern web apps._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`frontend-developer`](../../skills/frontend-developer/): Build production React and Next.js interfaces.
- [`frontend-design`](../../skills/frontend-design/): Apply strong UI layout and visual design patterns.
- [`react-best-practices`](../../skills/react-best-practices/): Optimize React performance and maintainability.
- [`nextjs-app-router-patterns`](../../skills/nextjs-app-router-patterns/): Use Next.js App Router patterns safely.
- [`nextjs-best-practices`](../../skills/nextjs-best-practices/): Ship high-quality Next.js applications.
- [`tailwind-patterns`](../../skills/tailwind-patterns/): Style efficiently with Tailwind CSS patterns.
- [`shadcn`](../../skills/shadcn/): Build polished interfaces with shadcn/ui.
- [`form-cro`](../../skills/form-cro/): Improve form conversion and usability.
- [`seo-audit`](../../skills/seo-audit/): Audit technical SEO and discoverability.

### 🎨 The "AAS Product Design Studio" Plugin

_Builders who want richer UI, brand, portfolio, and visual product work._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`ui-ux-pro-max`](../../skills/ui-ux-pro-max/): Use advanced UI/UX reasoning and design systems.
- [`high-end-visual-design`](../../skills/high-end-visual-design/): Raise visual polish for premium interfaces.
- [`frontend-design`](../../skills/frontend-design/): Apply strong UI layout and visual design patterns.
- [`mobile-design`](../../skills/mobile-design/): Design mobile-first interaction patterns.
- [`3d-web-experience`](../../skills/3d-web-experience/): Create immersive Three.js web experiences.
- [`canvas-design`](../../skills/canvas-design/): Generate visual assets, posters, and diagrams.
- [`scroll-experience`](../../skills/scroll-experience/): Design scroll-driven web experiences.
- [`interactive-portfolio`](../../skills/interactive-portfolio/): Create compelling interactive portfolios.

### 🛡️ The "AAS Security Engineer" Plugin

_Authorized security testing, audit, and hardening teams._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`ethical-hacking-methodology`](../../skills/ethical-hacking-methodology/): Follow an authorized pentest methodology.
- [`burp-suite-testing`](../../skills/burp-suite-testing/): Test web apps with Burp Suite workflows.
- [`top-web-vulnerabilities`](../../skills/top-web-vulnerabilities/): Cover OWASP-aligned vulnerability classes.
- [`api-security-testing`](../../skills/api-security-testing/): Test REST and GraphQL API security.
- [`linux-privilege-escalation`](../../skills/linux-privilege-escalation/): Assess Linux privilege escalation paths.
- [`cloud-penetration-testing`](../../skills/cloud-penetration-testing/): Assess AWS, Azure, and GCP environments.
- [`security-auditor`](../../skills/security-auditor/): Run comprehensive security audits.
- [`vulnerability-scanner`](../../skills/vulnerability-scanner/): Analyze and validate vulnerability findings.
- [`sast-configuration`](../../skills/sast-configuration/): Configure static application security testing.

### 🔐 The "AAS Secure App Builder" Plugin

_Application developers who want security embedded while building features._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`api-security-best-practices`](../../skills/api-security-best-practices/): Design secure APIs from the start.
- [`auth-implementation-patterns`](../../skills/auth-implementation-patterns/): Implement auth, sessions, JWT, and OAuth2 safely.
- [`backend-security-coder`](../../skills/backend-security-coder/): Apply secure backend coding practices.
- [`frontend-security-coder`](../../skills/frontend-security-coder/): Prevent XSS and client-side security bugs.
- [`cc-skill-security-review`](../../skills/cc-skill-security-review/): Review features with a security checklist.
- [`pci-compliance`](../../skills/pci-compliance/): Handle payment security and PCI expectations.
- [`sast-configuration`](../../skills/sast-configuration/): Configure static application security testing.
- [`sql-injection-testing`](../../skills/sql-injection-testing/): Find and validate SQL injection risks.

### 📄 The "AAS Documents & Presentations" Plugin

_Users creating, editing, converting, and automating office documents._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`office-productivity`](../../skills/office-productivity/): Coordinate document, spreadsheet, and slide workflows.
- [`docx-official`](../../skills/docx-official/): Create, edit, and inspect Word-compatible documents.
- [`xlsx-official`](../../skills/xlsx-official/): Create and analyze formula-backed spreadsheets.
- [`pptx-official`](../../skills/pptx-official/): Create and edit PowerPoint-compatible presentations.
- [`pdf-official`](../../skills/pdf-official/): Extract, generate, and manipulate PDFs.
- [`pdf-conversion-router`](../../skills/pdf-conversion-router/): Choose high-fidelity PDF conversion routes.
- [`google-sheets-automation`](../../skills/google-sheets-automation/): Automate Google Sheets reads and writes.
- [`google-slides-automation`](../../skills/google-slides-automation/): Automate Google Slides updates.

### 📊 The "AAS Data Analytics" Plugin

_Operators, analysts, and builders working with product analytics, SQL, dashboards, and experiments._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`analytics-tracking`](../../skills/analytics-tracking/): Set up reliable product analytics.
- [`sql-pro`](../../skills/sql-pro/): Query and model data with modern SQL.
- [`postgres-best-practices`](../../skills/postgres-best-practices/): Optimize Postgres schemas and queries.
- [`database-architect`](../../skills/database-architect/): Design robust database structures.
- [`dbt-transformation-patterns`](../../skills/dbt-transformation-patterns/): Build dbt transformation pipelines.
- [`claude-d3js-skill`](../../skills/claude-d3js-skill/): Create custom D3 visualizations.
- [`kpi-dashboard-design`](../../skills/kpi-dashboard-design/): Design dashboards for decision-making.
- [`ab-test-setup`](../../skills/ab-test-setup/): Plan and validate experiments.

### 🤖 The "AAS Agent & MCP Builder" Plugin

_Developers building agentic apps, MCP tools, RAG systems, and evaluation loops._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`ai-agents-architect`](../../skills/ai-agents-architect/): Design autonomous AI agent systems.
- [`agent-evaluation`](../../skills/agent-evaluation/): Evaluate agent reliability and performance.
- [`mcp-builder`](../../skills/mcp-builder/): Create MCP interfaces for agents.
- [`mcp-tool-developer`](../../skills/mcp-tool-developer/): Build MCP servers and tools.
- [`llm-app-patterns`](../../skills/llm-app-patterns/): Use production LLM application patterns.
- [`rag-engineer`](../../skills/rag-engineer/): Build retrieval-augmented generation systems.
- [`langgraph`](../../skills/langgraph/): Implement stateful agent workflows.
- [`langfuse`](../../skills/langfuse/): Trace, evaluate, and monitor LLM apps.
- [`context-window-management`](../../skills/context-window-management/): Manage long context effectively.

### 🧰 The "AAS OSS Maintainer" Plugin

_Open-source maintainers managing PRs, releases, reviews, and contributor handoffs._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`agents-md`](../../skills/agents-md/): Create concise durable agent instructions.
- [`commit`](../../skills/commit/): Write high-quality conventional commits.
- [`create-pr`](../../skills/create-pr/): Create review-ready pull requests.
- [`requesting-code-review`](../../skills/requesting-code-review/): Ask for targeted code reviews.
- [`receiving-code-review`](../../skills/receiving-code-review/): Apply review feedback rigorously.
- [`changelog-automation`](../../skills/changelog-automation/): Keep changelogs and release notes consistent.
- [`git-advanced-workflows`](../../skills/git-advanced-workflows/): Handle advanced Git recovery and history workflows.
- [`github-actions-advanced`](../../skills/github-actions-advanced/): Build and debug advanced GitHub Actions.
- [`address-github-comments`](../../skills/address-github-comments/): Address GitHub review comments systematically.
- [`lint-and-validate`](../../skills/lint-and-validate/): Run validation and quality checks.

### 🧪 The "AAS QA & Test Automation" Plugin

_Engineers and QA teams writing, debugging, and stabilizing test suites._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Requires manual setup

- [`test-driven-development`](../../skills/test-driven-development/): Use red-green-refactor development loops.
- [`systematic-debugging`](../../skills/systematic-debugging/): Trace failures to root cause.
- [`browser-automation`](../../skills/browser-automation/): Automate browsers for testing and scraping.
- [`e2e-testing-patterns`](../../skills/e2e-testing-patterns/): Build reliable end-to-end suites.
- [`playwright-skill`](../../skills/playwright-skill/): Use Playwright for browser test automation. _(manual setup)_
- [`webapp-testing`](../../skills/webapp-testing/): Test local web applications with Playwright.
- [`k6-load-testing`](../../skills/k6-load-testing/): Run load and scalability tests.
- [`test-fixing`](../../skills/test-fixing/): Fix failing tests systematically.
- [`code-review-checklist`](../../skills/code-review-checklist/): Catch common bugs in reviews.

### ☁️ The "AAS DevOps & Cloud" Plugin

_Teams shipping infrastructure, deployments, and operational workflows._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`docker-expert`](../../skills/docker-expert/): Build and operate containers cleanly.
- [`aws-serverless`](../../skills/aws-serverless/): Ship serverless workloads on AWS.
- [`kubernetes-architect`](../../skills/kubernetes-architect/): Design Kubernetes and GitOps systems.
- [`terraform-specialist`](../../skills/terraform-specialist/): Manage infrastructure as code.
- [`github-actions-templates`](../../skills/github-actions-templates/): Use production GitHub Actions patterns.
- [`environment-setup-guide`](../../skills/environment-setup-guide/): Standardize team environments.
- [`deployment-procedures`](../../skills/deployment-procedures/): Roll out changes safely.
- [`bash-linux`](../../skills/bash-linux/): Use Linux shell workflows effectively.
- [`incident-responder`](../../skills/incident-responder/): Respond to incidents with clear procedure.


---

## 🧩 Specialized Product Plugins - Next Wave

### 📈 The "AAS Marketing, SEO & Growth" Plugin

_Founders and growth teams creating content, SEO systems, experiments, and email campaigns._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`content-creator`](../../skills/content-creator/): Create SEO-aware marketing content.
- [`seo-audit`](../../skills/seo-audit/): Audit technical SEO and discoverability.
- [`seo-fundamentals`](../../skills/seo-fundamentals/): Apply durable SEO principles.
- [`programmatic-seo`](../../skills/programmatic-seo/): Create scalable SEO page systems.
- [`analytics-tracking`](../../skills/analytics-tracking/): Set up reliable product analytics.
- [`ab-test-setup`](../../skills/ab-test-setup/): Plan and validate experiments.
- [`email-sequence`](../../skills/email-sequence/): Write automated email campaigns.
- [`copywriting`](../../skills/copywriting/): Write conversion-focused copy.
- [`schema-markup`](../../skills/schema-markup/): Add structured data for search visibility.

### ⚙️ The "AAS Automation Builder" Plugin

_Teams designing reliable automations across tools, data stores, and communication platforms._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`workflow-automation`](../../skills/workflow-automation/): Design durable automation workflows.
- [`mcp-builder`](../../skills/mcp-builder/): Create MCP interfaces for agents.
- [`make-automation`](../../skills/make-automation/): Build Make/Integromat automations.
- [`airtable-automation`](../../skills/airtable-automation/): Automate Airtable data and views.
- [`notion-automation`](../../skills/notion-automation/): Automate Notion pages and databases.
- [`slack-automation`](../../skills/slack-automation/): Automate Slack workflows.
- [`googlesheets-automation`](../../skills/googlesheets-automation/): Automate Google Sheets operations.
- [`github-automation`](../../skills/github-automation/): Automate GitHub issues and repository work.

### 📡 The "AAS Observability IR" Plugin

_Engineering teams monitoring systems, debugging production issues, and writing postmortems._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`observability-engineer`](../../skills/observability-engineer/): Design monitoring and observability systems.
- [`distributed-tracing`](../../skills/distributed-tracing/): Trace requests across services.
- [`slo-implementation`](../../skills/slo-implementation/): Define and operate service level objectives.
- [`incident-responder`](../../skills/incident-responder/): Respond to incidents with clear procedure.
- [`postmortem-writing`](../../skills/postmortem-writing/): Write clear blameless postmortems.
- [`performance-engineer`](../../skills/performance-engineer/): Diagnose and improve application performance.
- [`grafana-dashboards`](../../skills/grafana-dashboards/): Create useful Grafana dashboards.
- [`langfuse`](../../skills/langfuse/): Trace, evaluate, and monitor LLM apps.

### 🐍 The "AAS Python API Builder" Plugin

_Python developers building APIs, services, and tests._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`python-pro`](../../skills/python-pro/): Write modern, idiomatic Python.
- [`python-patterns`](../../skills/python-patterns/): Apply Python architecture and design patterns.
- [`fastapi-pro`](../../skills/fastapi-pro/): Build high-performance FastAPI services.
- [`fastapi-templates`](../../skills/fastapi-templates/): Start production-ready FastAPI projects.
- [`django-pro`](../../skills/django-pro/): Build robust Django applications.
- [`python-testing-patterns`](../../skills/python-testing-patterns/): Test Python code with pytest patterns.
- [`async-python-patterns`](../../skills/async-python-patterns/): Use asyncio and async Python safely.
- [`api-design-principles`](../../skills/api-design-principles/): Design clear and maintainable APIs.

### 📱 The "AAS Mobile App Builder" Plugin

_Mobile teams shipping Expo, React Native, Flutter, and iOS apps._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`mobile-developer`](../../skills/mobile-developer/): Build cross-platform mobile applications.
- [`react-native-architecture`](../../skills/react-native-architecture/): Structure production React Native apps.
- [`expo-api-routes`](../../skills/expo-api-routes/): Build Expo Router API routes.
- [`expo-dev-client`](../../skills/expo-dev-client/): Create Expo development clients.
- [`expo-cicd-workflows`](../../skills/expo-cicd-workflows/): Automate Expo builds and releases.
- [`expo-deployment`](../../skills/expo-deployment/): Deploy and release Expo applications.
- [`flutter-expert`](../../skills/flutter-expert/): Build Flutter multi-platform apps.
- [`ios-developer`](../../skills/ios-developer/): Develop iOS apps with Swift.
- [`app-store-optimization`](../../skills/app-store-optimization/): Improve App Store and Play Store visibility.


---

## 🔧 Specialized Packs

### 📱 The "Mobile Developer" Pack

_For iOS, Android, and cross-platform apps._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`mobile-developer`](../../skills/mobile-developer/): Cross-platform mobile development.
- [`react-native-architecture`](../../skills/react-native-architecture/): React Native with Expo.
- [`flutter-expert`](../../skills/flutter-expert/): Flutter multi-platform apps.
- [`ios-developer`](../../skills/ios-developer/): iOS development with Swift.
- [`app-store-optimization`](../../skills/app-store-optimization/): ASO for App Store and Play Store.

### 🔗 The "Integration & APIs" Pack

_For connecting services and building integrations._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`stripe-integration`](../../skills/stripe-integration/): Payments and subscriptions.
- [`twilio-communications`](../../skills/twilio-communications/): SMS, voice, WhatsApp.
- [`hubspot-integration`](../../skills/hubspot-integration/): CRM integration.
- [`plaid-fintech`](../../skills/plaid-fintech/): Bank account linking and ACH.
- [`algolia-search`](../../skills/algolia-search/): Search implementation.

### 🎯 The "Architecture & Design" Pack

_For system design and technical decisions._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`senior-architect`](../../skills/senior-architect/): Comprehensive software architecture.
- [`architecture-patterns`](../../skills/architecture-patterns/): Clean Architecture, DDD, Hexagonal.
- [`microservices-patterns`](../../skills/microservices-patterns/): Microservices architecture.
- [`event-sourcing-architect`](../../skills/event-sourcing-architect/): Event sourcing and CQRS.
- [`architecture-decision-records`](../../skills/architecture-decision-records/): Document technical decisions.

### 🧱 The "DDD & Evented Architecture" Pack

_For teams modeling complex domains and evolving toward evented systems._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`domain-driven-design`](../../skills/domain-driven-design/): Route DDD work from strategic modeling to implementation patterns.
- [`ddd-strategic-design`](../../skills/ddd-strategic-design/): Subdomains, bounded contexts, and ubiquitous language.
- [`ddd-context-mapping`](../../skills/ddd-context-mapping/): Cross-context integration and anti-corruption boundaries.
- [`ddd-tactical-patterns`](../../skills/ddd-tactical-patterns/): Aggregates, value objects, repositories, and domain events.
- [`cqrs-implementation`](../../skills/cqrs-implementation/): Read/write model separation.
- [`event-store-design`](../../skills/event-store-design/): Event persistence and replay architecture.
- [`saga-orchestration`](../../skills/saga-orchestration/): Cross-context long-running transaction coordination.
- [`projection-patterns`](../../skills/projection-patterns/): Materialized read models from event streams.

### 🤖 The "Automation Builder" Pack

_For connecting tools and building repeatable automated workflows._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`workflow-automation`](../../skills/workflow-automation/): Design durable automation flows for AI and business systems.
- [`mcp-builder`](../../skills/mcp-builder/): Create tool interfaces agents can use reliably.
- [`make-automation`](../../skills/make-automation/): Build automations in Make/Integromat.
- [`airtable-automation`](../../skills/airtable-automation/): Automate Airtable records, bases, and views.
- [`notion-automation`](../../skills/notion-automation/): Automate Notion pages, databases, and blocks.
- [`slack-automation`](../../skills/slack-automation/): Automate Slack messaging and channel workflows.
- [`googlesheets-automation`](../../skills/googlesheets-automation/): Automate spreadsheet updates and data operations.

### 💼 The "RevOps & CRM Automation" Pack

_For revenue operations, support handoffs, and CRM-heavy automation._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`hubspot-automation`](../../skills/hubspot-automation/): Automate contacts, companies, deals, and tickets.
- [`sendgrid-automation`](../../skills/sendgrid-automation/): Automate email sends, contacts, and templates.
- [`zendesk-automation`](../../skills/zendesk-automation/): Automate support tickets and reply workflows.
- [`google-calendar-automation`](../../skills/google-calendar-automation/): Schedule events and manage availability.
- [`outlook-calendar-automation`](../../skills/outlook-calendar-automation/): Automate Outlook meetings and invitations.
- [`stripe-automation`](../../skills/stripe-automation/): Automate billing, invoices, and subscriptions.
- [`shopify-automation`](../../skills/shopify-automation/): Automate products, orders, customers, and inventory.

### 💳 The "Commerce & Payments" Pack

_For monetization, payments, and commerce workflows._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`stripe-integration`](../../skills/stripe-integration/): Build robust checkout, subscription, and webhook flows.
- [`paypal-integration`](../../skills/paypal-integration/): Integrate PayPal payments and related flows.
- [`plaid-fintech`](../../skills/plaid-fintech/): Link bank accounts and handle ACH-related use cases.
- [`hubspot-integration`](../../skills/hubspot-integration/): Connect CRM data into product and revenue workflows.
- [`algolia-search`](../../skills/algolia-search/): Add search and discovery to commerce experiences.
- [`monetization`](../../skills/monetization/): Design pricing and monetization systems deliberately.

### 🏢 The "Odoo ERP" Pack

_For teams building or operating around Odoo-based business systems._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`odoo-module-developer`](../../skills/odoo-module-developer/): Create custom Odoo modules cleanly.
- [`odoo-orm-expert`](../../skills/odoo-orm-expert/): Work effectively with Odoo ORM patterns and performance.
- [`odoo-sales-crm-expert`](../../skills/odoo-sales-crm-expert/): Optimize sales pipelines, leads, and forecasting.
- [`odoo-ecommerce-configurator`](../../skills/odoo-ecommerce-configurator/): Configure storefront, catalog, and order flows.
- [`odoo-performance-tuner`](../../skills/odoo-performance-tuner/): Diagnose and improve slow Odoo instances.
- [`odoo-security-rules`](../../skills/odoo-security-rules/): Apply secure access controls and rule design.
- [`odoo-docker-deployment`](../../skills/odoo-docker-deployment/): Deploy and run Odoo in Docker-based environments.

### ☁️ The "Azure AI & Cloud" Pack

_For building on Azure across cloud, AI, and platform services._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`azd-deployment`](../../skills/azd-deployment/): Ship Azure apps with Azure Developer CLI workflows.
- [`azure-functions`](../../skills/azure-functions/): Build serverless workloads with Azure Functions.
- [`azure-ai-openai-dotnet`](../../skills/azure-ai-openai-dotnet/): Use Azure OpenAI from .NET applications.
- [`azure-search-documents-py`](../../skills/azure-search-documents-py/): Build search, hybrid search, and indexing in Python.
- [`azure-identity-py`](../../skills/azure-identity-py/): Handle Azure authentication flows in Python services.
- [`azure-monitor-opentelemetry-ts`](../../skills/azure-monitor-opentelemetry-ts/): Add telemetry and tracing from TypeScript apps.

### 📲 The "Expo & React Native" Pack

_For shipping mobile apps with Expo and React Native._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`react-native-architecture`](../../skills/react-native-architecture/): Structure production React Native apps well.
- [`expo-api-routes`](../../skills/expo-api-routes/): Build API routes in Expo Router and EAS Hosting.
- [`expo-dev-client`](../../skills/expo-dev-client/): Build and distribute Expo development clients.
- [`expo-tailwind-setup`](../../skills/expo-tailwind-setup/): Set up Tailwind and NativeWind in Expo apps.
- [`expo-cicd-workflows`](../../skills/expo-cicd-workflows/): Automate builds and releases with EAS workflows.
- [`expo-deployment`](../../skills/expo-deployment/): Deploy Expo apps and manage release flow.
- [`app-store-optimization`](../../skills/app-store-optimization/): Improve App Store and Play Store discoverability.

### 🍎 The "Apple Platform Design" Pack

_For teams designing native-feeling Apple platform experiences._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`hig-foundations`](../../skills/hig-foundations/): Learn the core Apple Human Interface Guidelines.
- [`hig-patterns`](../../skills/hig-patterns/): Apply Apple interaction and UX patterns correctly.
- [`hig-components-layout`](../../skills/hig-components-layout/): Use Apple layout and navigation components well.
- [`hig-inputs`](../../skills/hig-inputs/): Design for gestures, keyboards, Pencil, focus, and controllers.
- [`hig-components-system`](../../skills/hig-components-system/): Work with widgets, live activities, and system surfaces.
- [`hig-platforms`](../../skills/hig-platforms/): Adapt experiences across Apple device families.

### 🧩 The "Makepad Builder" Pack

_For building UI-heavy apps with the Makepad ecosystem._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`makepad-basics`](../../skills/makepad-basics/): Start with Makepad fundamentals and mental model.
- [`makepad-layout`](../../skills/makepad-layout/): Handle sizing, flow, alignment, and layout composition.
- [`makepad-widgets`](../../skills/makepad-widgets/): Build interfaces from Makepad widgets.
- [`makepad-event-action`](../../skills/makepad-event-action/): Wire interaction and event handling correctly.
- [`makepad-shaders`](../../skills/makepad-shaders/): Create GPU-driven visual effects and custom drawing.
- [`makepad-deployment`](../../skills/makepad-deployment/): Package and ship Makepad projects.

### 🔎 The "SEO Specialist" Pack

_For technical SEO, content structure, and search growth._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`seo-fundamentals`](../../skills/seo-fundamentals/): Build from sound SEO principles and search constraints.
- [`seo-content-planner`](../../skills/seo-content-planner/): Plan clusters, calendars, and content gaps.
- [`seo-content-writer`](../../skills/seo-content-writer/): Produce search-aware content drafts with intent alignment.
- [`seo-structure-architect`](../../skills/seo-structure-architect/): Improve hierarchy, internal links, and structure.
- [`seo-cannibalization-detector`](../../skills/seo-cannibalization-detector/): Find overlapping pages competing for the same intent.
- [`seo-content-auditor`](../../skills/seo-content-auditor/): Audit existing content quality and optimization gaps.
- [`schema-markup`](../../skills/schema-markup/): Add structured data to support richer search results.

### 📄 The "Documents & Presentations" Pack

_For document-heavy workflows, spreadsheets, PDFs, and presentations._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`office-productivity`](../../skills/office-productivity/): Coordinate document, spreadsheet, and presentation workflows.
- [`docx-official`](../../skills/docx-official/): Create and edit Word-compatible documents.
- [`pptx-official`](../../skills/pptx-official/): Create and edit PowerPoint-compatible presentations.
- [`xlsx-official`](../../skills/xlsx-official/): Create and analyze spreadsheet files with formulas and formatting.
- [`pdf-official`](../../skills/pdf-official/): Extract, generate, and manipulate PDFs programmatically.
- [`google-slides-automation`](../../skills/google-slides-automation/): Automate presentation updates in Google Slides.
- [`google-sheets-automation`](../../skills/google-sheets-automation/): Automate reads and writes in Google Sheets.


---

## 🧰 Maintainer & OSS

### 🛠️ The "OSS Maintainer" Pack

_For shipping clean changes in public repositories._

**Plugin status:** Codex plugin-safe · Claude plugin-safe

- [`commit`](../../skills/commit/): High-quality conventional commits.
- [`create-pr`](../../skills/create-pr/): PR creation with review-ready context.
- [`requesting-code-review`](../../skills/requesting-code-review/): Ask for targeted, high-signal reviews.
- [`receiving-code-review`](../../skills/receiving-code-review/): Apply feedback with technical rigor.
- [`changelog-automation`](../../skills/changelog-automation/): Keep release notes and changelogs consistent.
- [`git-advanced-workflows`](../../skills/git-advanced-workflows/): Rebase, cherry-pick, bisect, recovery.
- [`documentation-templates`](../../skills/documentation-templates/): Standardize docs and handoffs.

### 🧱 The "Skill Author" Pack

_For creating and maintaining high-quality SKILL.md assets._

**Plugin status:** Codex pending hardening · Claude pending hardening

- [`skill-creator`](../../skills/skill-creator/): Design effective new skills.
- [`skill-developer`](../../skills/skill-developer/): Implement triggers, hooks, and skill lifecycle.
- [`writing-skills`](../../skills/writing-skills/): Improve clarity and structure of skill instructions.
- [`documentation-generation-doc-generate`](../../skills/documentation-generation-doc-generate/): Generate maintainable technical docs.
- [`lint-and-validate`](../../skills/lint-and-validate/): Validate quality after edits.
- [`verification-before-completion`](../../skills/verification-before-completion/): Confirm changes before claiming done.

## 📚 How to Use Bundles

### 1) Pick by immediate goal

- Need to ship a feature now: `Essentials` + one domain pack (`Web Wizard`, `Python Pro`, `DevOps & Cloud`).
- Need reliability and hardening: add `QA & Testing` + `Security Developer`.
- Need product growth: add `Startup Founder` or `Marketing & Growth`.

### 2) Start with 3-5 skills, not 20

Pick the minimum set for your current milestone. Expand only when you hit a real gap.

### 3) Invoke skills consistently

- **Claude Code**: install a bundle plugin or use `>> /skill-name help me...`
- **Codex CLI**: install a bundle plugin where marketplaces are available, or use `Use skill-name...`
- **Cursor**: `@skill-name` in chat
- **Gemini CLI**: `Use skill-name...`

### 4) Build your personal shortlist

Keep a small list of high-frequency skills and reuse it across tasks to reduce context switching.

## 🧩 Recommended Bundle Combos

### Ship a SaaS MVP (2 weeks)

`Essentials` + `Full-Stack Developer` + `QA & Testing` + `Startup Founder`

### Harden an existing production app

`Essentials` + `Security Developer` + `DevOps & Cloud` + `Observability & Monitoring`

### Build an AI product

`Essentials` + `Agent Architect` + `LLM Application Developer` + `Data Engineering`

### Grow traffic and conversions

`Web Wizard` + `Marketing & Growth` + `Data & Analytics`

### Launch and maintain open source

`Essentials` + `OSS Maintainer` + `Architecture & Design`

---

## Learning Paths

### Beginner → Intermediate → Advanced

**Web Development:**

1. Start: `Essentials` → `Web Wizard`
2. Grow: `Full-Stack Developer` → `Architecture & Design`
3. Master: `Observability & Monitoring` → `Security Developer`

**AI/ML:**

1. Start: `Essentials` → `Agent Architect`
2. Grow: `LLM Application Developer` → `Data Engineering`
3. Master: Advanced RAG and agent orchestration

**Security:**

1. Start: `Essentials` → `Security Developer`
2. Grow: `Security Engineer` → Advanced pentesting
3. Master: Red team tactics and threat modeling

**Open Source Maintenance:**

1. Start: `Essentials` → `OSS Maintainer`
2. Grow: `Architecture & Design` → `QA & Testing`
3. Master: `Skill Author` + release automation workflows

---

## Contributing

Found a skill that should be in a bundle? Or want to create a new bundle? [Open an issue](https://github.com/sickn33/antigravity-awesome-skills/issues) or submit a PR!

---

## Related Documentation

- [Getting Started Guide](getting-started.md)
- [Full Skill Catalog](../../CATALOG.md)
- [Contributing Guide](../../CONTRIBUTING.md)

---

_Last updated: March 2026 | Total Skills: 1,544+ | Total Bundles: 52_
