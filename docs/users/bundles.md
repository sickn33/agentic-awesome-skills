# Antigravity Skill Bundles

> **Curated collections of skills organized by role and expertise level.** Don't know where to start? Pick a bundle below to get a curated set of skills for your role.

> These packs are curated starter recommendations for humans. Generated bundle ids in `data/bundles.json` are broader catalog/workflow groupings and do not need to map 1:1 to the editorial packs below.

> **Important:** bundles are installable plugin subsets and activation presets, not invokable mega-skills such as `@web-wizard` or `/essentials-bundle`. Use the individual skills listed in the pack, install the bundle as a dedicated marketplace plugin, or use the activation scripts if you want only that bundle's skills active in your live Antigravity directory.

> **Plugin compatibility:** root plugins and bundle plugins only publish plugin-safe skills. `Agent Plugins 1.0 portable` means the bundle also has a standard root `plugin.json` and a flat, directly discoverable `skills/` layout. If a bundle shows `pending hardening` or `pending flat skill layout`, its skills still exist in the repository but AAS does not claim that packaging target yet. `Requires manual setup` means the bundle is installable, but one or more included skills need an explicit setup step before first use.

## Quick Start

1. **Install the repository or bundle plugin:**

   ```bash
   npx agentic-awesome-skills
   # or clone manually
   git clone https://github.com/sickn33/agentic-awesome-skills.git .agent/skills
   ```

2. **Choose your bundle** from the list below based on your role or interests.

3. **Use bundle plugins or individual skills** in your AI assistant:
   - Claude Code: install the matching marketplace bundle plugin, or invoke `>> /skill-name help me...`
   - Codex CLI / Codex app: install the matching bundle plugin where plugin marketplaces are available, or invoke `Use skill-name...`
   - Agent Plugins 1.0 clients: load the matching `plugins/agentic-bundle-*/` directory when its status says `Agent Plugins 1.0 portable`
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

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`concise-planning`](../../skills/concise-planning/): Always start with a plan.
- [`test-driven-development`](../../skills/test-driven-development/): Build features and fixes through a red-green-refactor loop.
- [`lint-and-validate`](../../skills/lint-and-validate/): Keep your code clean automatically.
- [`systematic-debugging`](../../skills/systematic-debugging/): Debug from evidence instead of guesses.
- [`git-pushing`](../../skills/git-pushing/): Save your work safely.


---

## 🎮 Game Development

### 🎮 The "Indie Game Dev" Pack

_For building games with AI assistants._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`game-development/game-design`](../../skills/game-development/game-design/): Mechanics and loops.
- [`game-development/2d-games`](../../skills/game-development/2d-games/): Sprites and physics.
- [`game-development/3d-games`](../../skills/game-development/3d-games/): Models and shaders.
- [`unity-developer`](../../skills/unity-developer/): Unity 6 LTS development.
- [`godot-gdscript-patterns`](../../skills/godot-gdscript-patterns/): Godot 4 GDScript patterns.
- [`game-development/game-audio`](../../skills/game-development/game-audio/): Design sound effects, music systems, and adaptive game audio.
- [`algorithmic-art`](../../skills/algorithmic-art/): Generate assets with code.


---

## 🐍 Backend & Languages

### 🦀 The "Systems Programming" Pack

_For low-level and performance-critical code._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`rust-pro`](../../skills/rust-pro/): Rust 1.75+ with async patterns.
- [`go-concurrency-patterns`](../../skills/go-concurrency-patterns/): Go concurrency mastery.
- [`golang-pro`](../../skills/golang-pro/): Go development expertise.
- [`memory-safety-patterns`](../../skills/memory-safety-patterns/): Memory-safe programming.
- [`cpp-pro`](../../skills/cpp-pro/): Modern C++ development.


---

## ⭐ Specialized Product Plugins

### 🌐 The "AAS Web App Builder" Plugin

_Frontend and full-stack developers shipping modern web apps._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`frontend-developer`](../../skills/frontend-developer/): Build production React and Next.js interfaces.
- [`frontend-design`](../../skills/frontend-design/): Apply strong UI layout and visual design patterns.
- [`react-best-practices`](../../skills/react-best-practices/): Optimize React performance and maintainability.
- [`nextjs-app-router-patterns`](../../skills/nextjs-app-router-patterns/): Use Next.js App Router patterns safely.
- [`browser-automation`](../../skills/browser-automation/): Verify user journeys through observed browser state and bounded checks.
- [`tailwind-patterns`](../../skills/tailwind-patterns/): Style efficiently with Tailwind CSS patterns.
- [`shadcn`](../../skills/shadcn/): Build polished interfaces with shadcn/ui.
- [`form-cro`](../../skills/form-cro/): Improve form conversion and usability.
- [`seo-audit`](../../skills/seo-audit/): Audit technical SEO and discoverability.
- [`ui-a11y`](../../skills/ui-a11y/): Audit WCAG, contrast, focus, labels, motion, and semantic HTML.
- [`build-ui`](../../skills/build-ui/): Implement the chosen UI from a concrete brief and existing project conventions.
- [`ui-states`](../../skills/ui-states/): Design loading, empty, error and success states with accessible feedback.
- [`frontend-api-integration-patterns`](../../skills/frontend-api-integration-patterns/): Connect client UI to APIs with explicit state, validation and error handling.
- [`react-patterns`](../../skills/react-patterns/): Modern React patterns and principles.
- [`nextjs-best-practices`](../../skills/nextjs-best-practices/): Next.js App Router patterns.
- [`accessibility-compliance-accessibility-audit`](../../skills/accessibility-compliance-accessibility-audit/): Audit WCAG issues and plan concrete remediation.
- [`typescript-expert`](../../skills/typescript-expert/): TypeScript mastery and advanced types.
- [`javascript-pro`](../../skills/javascript-pro/): Modern JavaScript with ES6+.
- [`nodejs-best-practices`](../../skills/nodejs-best-practices/): Node.js development principles.

### 🎨 The "AAS Product Design Studio" Plugin

_Builders who want richer UI, brand, portfolio, and visual product work._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`ui-ux-pro-max`](../../skills/ui-ux-pro-max/): Use advanced UI/UX reasoning and design systems.
- [`high-end-visual-design`](../../skills/high-end-visual-design/): Raise visual polish for premium interfaces.
- [`frontend-design`](../../skills/frontend-design/): Apply strong UI layout and visual design patterns.
- [`mobile-design`](../../skills/mobile-design/): Design mobile-first interaction patterns.
- [`3d-web-experience`](../../skills/3d-web-experience/): Create immersive Three.js web experiences.
- [`canvas-design`](../../skills/canvas-design/): Generate visual assets, posters, and diagrams.
- [`scroll-experience`](../../skills/scroll-experience/): Design scroll-driven web experiences.
- [`interactive-portfolio`](../../skills/interactive-portfolio/): Create compelling interactive portfolios.
- [`ui-a11y`](../../skills/ui-a11y/): Audit WCAG, contrast, focus, labels, motion, and semantic HTML.
- [`ui-review`](../../skills/ui-review/): Review UI quality, usability, and product fit.
- [`write-design-md`](../../skills/write-design-md/): Record visual decisions and reusable interface rules in a design document.
- [`ui-from-screenshot`](../../skills/ui-from-screenshot/): Translate a supplied screenshot into an interface with explicit assumptions.
- [`ui-states`](../../skills/ui-states/): Design loading, empty, error and success states with accessible feedback.
- [`accessibility-compliance-accessibility-audit`](../../skills/accessibility-compliance-accessibility-audit/): Audit WCAG issues and plan concrete remediation.
- [`content-creator`](../../skills/content-creator/): SEO-optimized blog posts.
- [`copy-editing`](../../skills/copy-editing/): Polish your prose.
- [`algorithmic-art`](../../skills/algorithmic-art/): Code-generated masterpieces.

### 🛡️ The "AAS Security Engineer" Plugin

_Authorized security testing, audit, and hardening teams._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`ethical-hacking-methodology`](../../skills/ethical-hacking-methodology/): Follow an authorized pentest methodology.
- [`burp-suite-testing`](../../skills/burp-suite-testing/): Test web apps with Burp Suite workflows.
- [`top-web-vulnerabilities`](../../skills/top-web-vulnerabilities/): Cover OWASP-aligned vulnerability classes.
- [`api-security-testing`](../../skills/api-security-testing/): Test REST and GraphQL API security.
- [`linux-privilege-escalation`](../../skills/linux-privilege-escalation/): Assess Linux privilege escalation paths.
- [`cloud-penetration-testing`](../../skills/cloud-penetration-testing/): Assess AWS, Azure, and GCP environments.
- [`security-auditor`](../../skills/security-auditor/): Run comprehensive security audits.
- [`vulnerability-scanner`](../../skills/vulnerability-scanner/): Analyze and validate vulnerability findings.
- [`sast-configuration`](../../skills/sast-configuration/): Configure static application security testing.
- [`web-security-testing`](../../skills/web-security-testing/): Test web application security defensively.
- [`threat-modeling-expert`](../../skills/threat-modeling-expert/): Map trust boundaries, threats and mitigations before active assessment.
- [`skill-security-audit`](../../skills/skill-security-audit/): Inspect agent skill instructions and bundled files for unsafe authority or data flows.

### 🔐 The "AAS Secure App Builder" Plugin

_Application developers who want security embedded while building features._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`api-security-best-practices`](../../skills/api-security-best-practices/): Design secure APIs from the start.
- [`auth-implementation-patterns`](../../skills/auth-implementation-patterns/): Implement auth, sessions, JWT, and OAuth2 safely.
- [`backend-security-coder`](../../skills/backend-security-coder/): Apply secure backend coding practices.
- [`frontend-security-coder`](../../skills/frontend-security-coder/): Prevent XSS and client-side security bugs.
- [`cc-skill-security-review`](../../skills/cc-skill-security-review/): Review features with a security checklist.
- [`pci-compliance`](../../skills/pci-compliance/): Handle payment security and PCI expectations.
- [`sast-configuration`](../../skills/sast-configuration/): Configure static application security testing.
- [`secrets-management`](../../skills/secrets-management/): Manage application and CI/CD secrets with least privilege and rotation.
- [`django-access-review`](../../skills/django-access-review/): Review Django access control and authorization behavior.
- [`security-requirement-extraction`](../../skills/security-requirement-extraction/): Turn identified threats into testable security requirements.
- [`threat-modeling-expert`](../../skills/threat-modeling-expert/): Map trust boundaries, threats and mitigations before active assessment.
- [`dependency-management-deps-audit`](../../skills/dependency-management-deps-audit/): Audit dependency vulnerabilities, licenses, and supply-chain risk.

### 📄 The "AAS Documents & Presentations" Plugin

_Users creating, editing, converting, and automating office documents._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`office-productivity`](../../skills/office-productivity/): Coordinate document, spreadsheet, and slide workflows.
- [`pdf-conversion-router`](../../skills/pdf-conversion-router/): Choose high-fidelity PDF conversion routes.
- [`google-docs-automation`](../../skills/google-docs-automation/): Automate Google Docs creation and updates.
- [`google-sheets-automation`](../../skills/google-sheets-automation/): Automate Google Sheets reads and writes.
- [`google-slides-automation`](../../skills/google-slides-automation/): Automate Google Slides updates.
- [`doc-coauthoring`](../../skills/doc-coauthoring/): Develop document structure through drafting and reader review.
- [`copy-editing`](../../skills/copy-editing/): Edit supplied content for clarity, consistency and supported claims.

### 📊 The "AAS Data Analytics & Business Intelligence" Plugin

_Operators, analysts, and builders working with product analytics, SQL, dashboards, and experiments._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`analytics-tracking`](../../skills/analytics-tracking/): Set up reliable product analytics.
- [`analytics-product`](../../skills/analytics-product/): Model product analytics and product metrics.
- [`sql-pro`](../../skills/sql-pro/): Query and model data with modern SQL.
- [`postgres-best-practices`](../../skills/postgres-best-practices/): Optimize Postgres schemas and queries.
- [`data-quality-frameworks`](../../skills/data-quality-frameworks/): Validate dataset assumptions, data contracts and analytical transformations.
- [`dbt-transformation-patterns`](../../skills/dbt-transformation-patterns/): Build dbt transformation pipelines.
- [`claude-d3js-skill`](../../skills/claude-d3js-skill/): Create custom D3 visualizations.
- [`kpi-dashboard-design`](../../skills/kpi-dashboard-design/): Design dashboards for decision-making.
- [`ab-test-setup`](../../skills/ab-test-setup/): Plan and validate experiments.
- [`business-analyst`](../../skills/business-analyst/): Analyze business context, requirements, and tradeoffs.
- [`sql-optimization-patterns`](../../skills/sql-optimization-patterns/): Review analytical query performance without changing metric semantics.
- [`data-storytelling`](../../skills/data-storytelling/): Explain verified analytical results with context, uncertainty and clear visuals.
- [`database-architect`](../../skills/database-architect/): Database design from scratch.
- [`startup-metrics-framework`](../../skills/startup-metrics-framework/): SaaS metrics and unit economics.
- [`startup-financial-modeling`](../../skills/startup-financial-modeling/): 3-5 year financial projections.
- [`market-sizing-analysis`](../../skills/market-sizing-analysis/): TAM/SAM/SOM calculations.

### 🤖 The "AAS Agent & MCP Builder" Plugin

_Developers building agentic apps, MCP tools, RAG systems, and evaluation loops._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`ai-agents-architect`](../../skills/ai-agents-architect/): Design autonomous AI agent systems.
- [`agent-evaluation`](../../skills/agent-evaluation/): Evaluate agent reliability and performance.
- [`mcp-builder`](../../skills/mcp-builder/): Create MCP interfaces for agents.
- [`mcp-tool-developer`](../../skills/mcp-tool-developer/): Build MCP servers and tools.
- [`llm-app-patterns`](../../skills/llm-app-patterns/): Use production LLM application patterns.
- [`rag-engineer`](../../skills/rag-engineer/): Build retrieval-augmented generation systems.
- [`langgraph`](../../skills/langgraph/): Implement stateful agent workflows.
- [`langfuse`](../../skills/langfuse/): Trace, evaluate, and monitor LLM apps.
- [`context-window-management`](../../skills/context-window-management/): Manage long context effectively.
- [`prompt-engineering`](../../skills/prompt-engineering/): Design effective prompts and LLM interaction patterns.
- [`skill-security-audit`](../../skills/skill-security-audit/): Inspect agent skill instructions and bundled files for unsafe authority or data flows.
- [`agent-harness-fault-injection`](../../skills/agent-harness-fault-injection/): Exercise bounded agent failures with controlled fault scenarios.
- [`agent-evaluation-reporting`](../../skills/agent-evaluation-reporting/): Report observed agent results, limitations and reproduction evidence.
- [`agent-memory-systems`](../../skills/agent-memory-systems/): Design durable short- and long-term memory for agents.
- [`rag-implementation`](../../skills/rag-implementation/): Retrieval-Augmented Generation.
- [`prompt-caching`](../../skills/prompt-caching/): Cache strategies for LLM prompts.
- [`llm-evaluation`](../../skills/llm-evaluation/): Measure LLM quality with automated and human evaluation.

### 🧪 The "AAS QA & Test Automation" Plugin

_Engineers and QA teams writing, debugging, and stabilizing test suites._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable · Requires manual setup

- [`test-driven-development`](../../skills/test-driven-development/): Use red-green-refactor development loops.
- [`systematic-debugging`](../../skills/systematic-debugging/): Trace failures to root cause.
- [`browser-automation`](../../skills/browser-automation/): Automate browsers for testing and scraping.
- [`e2e-testing-patterns`](../../skills/e2e-testing-patterns/): Build reliable end-to-end suites.
- [`playwright-skill`](../../skills/playwright-skill/): Use Playwright for browser test automation. _(manual setup)_
- [`webapp-testing`](../../skills/webapp-testing/): Test local web applications with Playwright.
- [`k6-load-testing`](../../skills/k6-load-testing/): Run load and scalability tests.
- [`test-fixing`](../../skills/test-fixing/): Fix failing tests systematically.
- [`code-review-checklist`](../../skills/code-review-checklist/): Catch common bugs in reviews.
- [`screen-reader-testing`](../../skills/screen-reader-testing/): Test interfaces with screen-reader expectations.
- [`testing-patterns`](../../skills/testing-patterns/): Write isolated unit tests and correctly await asynchronous outcomes.
- [`api-contract-testing`](../../skills/api-contract-testing/): Test provider and consumer runtime contracts, invalid fixtures and version compatibility.
- [`python-testing-patterns`](../../skills/python-testing-patterns/): Build Python fixtures, parametrized cases and async regression tests.
- [`ci-cd-and-automation`](../../skills/ci-cd-and-automation/): Run automated test gates consistently in CI/CD.

### ☁️ The "AAS DevOps & Cloud" Plugin

_Teams shipping infrastructure, deployments, and operational workflows._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`docker-expert`](../../skills/docker-expert/): Build and operate containers cleanly.
- [`aws-serverless`](../../skills/aws-serverless/): Ship serverless workloads on AWS.
- [`kubernetes-architect`](../../skills/kubernetes-architect/): Design Kubernetes and GitOps systems.
- [`terraform-specialist`](../../skills/terraform-specialist/): Manage infrastructure as code.
- [`github-actions-templates`](../../skills/github-actions-templates/): Use production GitHub Actions patterns.
- [`environment-setup-guide`](../../skills/environment-setup-guide/): Standardize team environments.
- [`deployment-procedures`](../../skills/deployment-procedures/): Roll out changes safely.
- [`bash-linux`](../../skills/bash-linux/): Use Linux shell workflows effectively.
- [`incident-responder`](../../skills/incident-responder/): Respond to incidents with clear procedure.
- [`devops-troubleshooter`](../../skills/devops-troubleshooter/): Diagnose infrastructure and deployment issues.
- [`secrets-management`](../../skills/secrets-management/): Plan least-privilege secret storage, access and rotation without exposing values.
- [`ci-cd-and-automation`](../../skills/ci-cd-and-automation/): Build CI/CD pipelines with automated quality gates.
- [`azd-deployment`](../../skills/azd-deployment/): Ship Azure apps with Azure Developer CLI workflows.
- [`azure-functions`](../../skills/azure-functions/): Build serverless workloads with Azure Functions.
- [`azure-ai-openai-dotnet`](../../skills/azure-ai-openai-dotnet/): Use Azure OpenAI from .NET applications.
- [`azure-search-documents-py`](../../skills/azure-search-documents-py/): Build search, hybrid search, and indexing in Python.
- [`azure-identity-py`](../../skills/azure-identity-py/): Handle Azure authentication flows in Python services.
- [`azure-monitor-opentelemetry-ts`](../../skills/azure-monitor-opentelemetry-ts/): Add telemetry and tracing from TypeScript apps.


---

## 🧩 Specialized Product Plugins - Next Wave

### 📈 The "AAS Marketing, SEO & Growth" Plugin

_Founders and growth teams creating content, SEO systems, experiments, and email campaigns._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`content-creator`](../../skills/content-creator/): Create SEO-aware marketing content.
- [`seo-audit`](../../skills/seo-audit/): Audit technical SEO and discoverability.
- [`seo-fundamentals`](../../skills/seo-fundamentals/): Apply durable SEO principles.
- [`seo-content-planner`](../../skills/seo-content-planner/): Plan SEO content clusters and calendars.
- [`programmatic-seo`](../../skills/programmatic-seo/): Create scalable SEO page systems.
- [`analytics-tracking`](../../skills/analytics-tracking/): Set up reliable product analytics.
- [`ab-test-setup`](../../skills/ab-test-setup/): Plan and validate experiments.
- [`email-sequence`](../../skills/email-sequence/): Write automated email campaigns.
- [`copywriting`](../../skills/copywriting/): Write conversion-focused copy.
- [`schema-markup`](../../skills/schema-markup/): Add structured data for search visibility.
- [`product-marketing-context`](../../skills/product-marketing-context/): Capture verified audience, product and positioning inputs for channel work.
- [`copy-editing`](../../skills/copy-editing/): Edit supplied content for clarity, consistency and supported claims.
- [`content-strategy`](../../skills/content-strategy/): Prioritize audience-relevant content and define an editorial plan.
- [`seo-content-writer`](../../skills/seo-content-writer/): Produce search-aware content drafts with intent alignment.
- [`seo-structure-architect`](../../skills/seo-structure-architect/): Improve hierarchy, internal links, and structure.
- [`seo-cannibalization-detector`](../../skills/seo-cannibalization-detector/): Find overlapping pages competing for the same intent.
- [`seo-content-auditor`](../../skills/seo-content-auditor/): Audit existing content quality and optimization gaps.

### ⚙️ The "AAS Automation Builder" Plugin

_Teams designing reliable automations across tools, data stores, and communication platforms._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`workflow-automation`](../../skills/workflow-automation/): Design durable automation workflows.
- [`mcp-builder`](../../skills/mcp-builder/): Create MCP interfaces for agents.
- [`make-automation`](../../skills/make-automation/): Build Make/Integromat automations.
- [`zapier-make-patterns`](../../skills/zapier-make-patterns/): Design Zapier and Make automation patterns.
- [`airtable-automation`](../../skills/airtable-automation/): Automate Airtable data and views.
- [`notion-automation`](../../skills/notion-automation/): Automate Notion pages and databases.
- [`slack-automation`](../../skills/slack-automation/): Automate Slack workflows.
- [`googlesheets-automation`](../../skills/googlesheets-automation/): Automate Google Sheets operations.
- [`github-automation`](../../skills/github-automation/): Automate GitHub issues and repository work.
- [`n8n-workflow-patterns`](../../skills/n8n-workflow-patterns/): Choose proven architectures for webhook, sync, scheduled, and AI-agent workflows.
- [`api-integration`](../../skills/api-integration/): Design API adapters and authenticated webhook handling with explicit boundaries.
- [`api-rate-limit-handler`](../../skills/api-rate-limit-handler/): Implement replay-safe bounded retries that respect provider wait hints.
- [`browser-automation`](../../skills/browser-automation/): Automate workflows when a service has no suitable API.
- [`hubspot-automation`](../../skills/hubspot-automation/): Automate contacts, companies, deals, and tickets.
- [`sendgrid-automation`](../../skills/sendgrid-automation/): Automate email sends, contacts, and templates.
- [`zendesk-automation`](../../skills/zendesk-automation/): Automate support tickets and reply workflows.
- [`google-calendar-automation`](../../skills/google-calendar-automation/): Schedule events and manage availability.
- [`outlook-calendar-automation`](../../skills/outlook-calendar-automation/): Automate Outlook meetings and invitations.
- [`stripe-automation`](../../skills/stripe-automation/): Automate billing, invoices, and subscriptions.
- [`shopify-automation`](../../skills/shopify-automation/): Automate products, orders, customers, and inventory.

### 📡 The "AAS Observability & Incident Response" Plugin

_Engineering teams monitoring systems, debugging production issues, and writing postmortems._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`observability-engineer`](../../skills/observability-engineer/): Design monitoring and observability systems.
- [`observability-and-instrumentation`](../../skills/observability-and-instrumentation/): Instrument production code with useful logs, metrics, traces, and alerts.
- [`distributed-tracing`](../../skills/distributed-tracing/): Trace requests across services.
- [`slo-implementation`](../../skills/slo-implementation/): Define and operate service level objectives.
- [`grafana-dashboards`](../../skills/grafana-dashboards/): Create useful Grafana dashboards.
- [`performance-engineer`](../../skills/performance-engineer/): Diagnose and improve application performance.
- [`incident-responder`](../../skills/incident-responder/): Respond to incidents with clear procedure.
- [`devops-troubleshooter`](../../skills/devops-troubleshooter/): Diagnose infrastructure and deployment issues.
- [`postmortem-writing`](../../skills/postmortem-writing/): Write clear blameless postmortems.
- [`langfuse`](../../skills/langfuse/): Trace, evaluate, and monitor LLM apps.
- [`on-call-handoff-patterns`](../../skills/on-call-handoff-patterns/): Draft an evidence-based shift handoff with owners and unresolved risks.
- [`ai-sre-incident-response`](../../skills/ai-sre-incident-response/): Investigate AI service incidents with latency, cost and fallback constraints.

### 🐍 The "AAS Python Development" Plugin

_Python developers building APIs, services, and tests._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`python-pro`](../../skills/python-pro/): Write modern, idiomatic Python.
- [`python-patterns`](../../skills/python-patterns/): Apply Python architecture and design patterns.
- [`fastapi-pro`](../../skills/fastapi-pro/): Build high-performance FastAPI services.
- [`fastapi-templates`](../../skills/fastapi-templates/): Start production-ready FastAPI projects.
- [`django-pro`](../../skills/django-pro/): Build robust Django applications.
- [`python-testing-patterns`](../../skills/python-testing-patterns/): Test Python code with pytest patterns.
- [`async-python-patterns`](../../skills/async-python-patterns/): Use asyncio and async Python safely.
- [`api-design-principles`](../../skills/api-design-principles/): Design clear and maintainable APIs.
- [`pydantic-models-py`](../../skills/pydantic-models-py/): Design Pydantic models for Python APIs.
- [`openapi-spec-generation`](../../skills/openapi-spec-generation/): Generate and maintain OpenAPI specifications.
- [`api-security-best-practices`](../../skills/api-security-best-practices/): Apply authorization, validation and security checks to service boundaries.
- [`sql-optimization-patterns`](../../skills/sql-optimization-patterns/): Review analytical query performance without changing metric semantics.
- [`api-rate-limit-handler`](../../skills/api-rate-limit-handler/): Implement replay-safe bounded retries that respect provider wait hints.

### 📱 The "AAS Mobile App Builder" Plugin

_Mobile teams shipping Expo, React Native, Flutter, and iOS apps._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`mobile-developer`](../../skills/mobile-developer/): Build cross-platform mobile applications.
- [`react-native-architecture`](../../skills/react-native-architecture/): Structure production React Native apps.
- [`expo-api-routes`](../../skills/expo-api-routes/): Build Expo Router API routes.
- [`expo-dev-client`](../../skills/expo-dev-client/): Create Expo development clients.
- [`expo-cicd-workflows`](../../skills/expo-cicd-workflows/): Automate Expo builds and releases.
- [`expo-deployment`](../../skills/expo-deployment/): Deploy and release Expo applications.
- [`flutter-expert`](../../skills/flutter-expert/): Build Flutter multi-platform apps.
- [`ios-developer`](../../skills/ios-developer/): Develop iOS apps with Swift.
- [`app-store-optimization`](../../skills/app-store-optimization/): Improve App Store and Play Store visibility.
- [`multi-platform-apps-multi-platform`](../../skills/multi-platform-apps-multi-platform/): Plan and build multi-platform app experiences.
- [`ios-screens`](../../skills/ios-screens/): Build native iOS screens using the existing navigation and UI conventions.
- [`frontend-api-integration-patterns`](../../skills/frontend-api-integration-patterns/): Connect client UI to APIs with explicit state, validation and error handling.
- [`expo-tailwind-setup`](../../skills/expo-tailwind-setup/): Set up Tailwind and NativeWind in Expo apps.
- [`hig-foundations`](../../skills/hig-foundations/): Learn the core Apple Human Interface Guidelines.
- [`hig-patterns`](../../skills/hig-patterns/): Apply Apple interaction and UX patterns correctly.
- [`hig-components-layout`](../../skills/hig-components-layout/): Use Apple layout and navigation components well.
- [`hig-inputs`](../../skills/hig-inputs/): Design for gestures, keyboards, Pencil, focus, and controllers.
- [`hig-components-system`](../../skills/hig-components-system/): Work with widgets, live activities, and system surfaces.
- [`hig-platforms`](../../skills/hig-platforms/): Adapt experiences across Apple device families.


---

## 🔧 Specialized Packs

### 🎯 The "Architecture & Domain Modeling" Plugin

_For system design and technical decisions._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`senior-architect`](../../skills/senior-architect/): Comprehensive software architecture.
- [`architecture-patterns`](../../skills/architecture-patterns/): Clean Architecture, DDD, Hexagonal.
- [`microservices-patterns`](../../skills/microservices-patterns/): Microservices architecture.
- [`event-sourcing-architect`](../../skills/event-sourcing-architect/): Event sourcing and CQRS.
- [`architecture-decision-records`](../../skills/architecture-decision-records/): Document technical decisions.
- [`domain-driven-design`](../../skills/domain-driven-design/): Route DDD work from strategic modeling to implementation patterns.
- [`ddd-strategic-design`](../../skills/ddd-strategic-design/): Subdomains, bounded contexts, and ubiquitous language.
- [`ddd-context-mapping`](../../skills/ddd-context-mapping/): Cross-context integration and anti-corruption boundaries.
- [`ddd-tactical-patterns`](../../skills/ddd-tactical-patterns/): Aggregates, value objects, repositories, and domain events.
- [`cqrs-implementation`](../../skills/cqrs-implementation/): Read/write model separation.
- [`event-store-design`](../../skills/event-store-design/): Event persistence and replay architecture.
- [`saga-orchestration`](../../skills/saga-orchestration/): Cross-context long-running transaction coordination.
- [`projection-patterns`](../../skills/projection-patterns/): Materialized read models from event streams.

### 💳 The "Payments & Service Integrations" Plugin

_For monetization, payments, and commerce workflows._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`stripe-integration`](../../skills/stripe-integration/): Build robust checkout, subscription, and webhook flows.
- [`paypal-integration`](../../skills/paypal-integration/): Integrate PayPal payments and related flows.
- [`plaid-fintech`](../../skills/plaid-fintech/): Link bank accounts and handle ACH-related use cases.
- [`hubspot-integration`](../../skills/hubspot-integration/): Connect CRM data into product and revenue workflows.
- [`algolia-search`](../../skills/algolia-search/): Add search and discovery to commerce experiences.
- [`monetization`](../../skills/monetization/): Design pricing and monetization systems deliberately.
- [`api-integration`](../../skills/api-integration/): Design service contracts, webhooks, and integration pipelines.
- [`twilio-communications`](../../skills/twilio-communications/): SMS, voice, WhatsApp.

### 🏢 The "Odoo ERP" Pack

_For teams building or operating around Odoo-based business systems._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`odoo-module-developer`](../../skills/odoo-module-developer/): Create custom Odoo modules cleanly.
- [`odoo-orm-expert`](../../skills/odoo-orm-expert/): Work effectively with Odoo ORM patterns and performance.
- [`odoo-sales-crm-expert`](../../skills/odoo-sales-crm-expert/): Optimize sales pipelines, leads, and forecasting.
- [`odoo-ecommerce-configurator`](../../skills/odoo-ecommerce-configurator/): Configure storefront, catalog, and order flows.
- [`odoo-performance-tuner`](../../skills/odoo-performance-tuner/): Diagnose and improve slow Odoo instances.
- [`odoo-security-rules`](../../skills/odoo-security-rules/): Apply secure access controls and rule design.
- [`odoo-docker-deployment`](../../skills/odoo-docker-deployment/): Deploy and run Odoo in Docker-based environments.

### 🧩 The "Makepad Builder" Pack

_For building UI-heavy apps with the Makepad ecosystem._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`makepad-basics`](../../skills/makepad-basics/): Start with Makepad fundamentals and mental model.
- [`makepad-layout`](../../skills/makepad-layout/): Handle sizing, flow, alignment, and layout composition.
- [`makepad-widgets`](../../skills/makepad-widgets/): Build interfaces from Makepad widgets.
- [`makepad-event-action`](../../skills/makepad-event-action/): Wire interaction and event handling correctly.
- [`makepad-shaders`](../../skills/makepad-shaders/): Create GPU-driven visual effects and custom drawing.
- [`makepad-deployment`](../../skills/makepad-deployment/): Package and ship Makepad projects.


---

## 🧰 Maintainer & OSS

### 🛠️ The "OSS Maintainer" Pack

_For shipping clean changes in public repositories._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`commit`](../../skills/commit/): High-quality conventional commits.
- [`create-branch`](../../skills/create-branch/): Create a safe topic branch before committing.
- [`create-pr`](../../skills/create-pr/): PR creation with review-ready context.
- [`pr-writer`](../../skills/pr-writer/): Write and open structured pull requests.
- [`requesting-code-review`](../../skills/requesting-code-review/): Ask for targeted, high-signal reviews.
- [`receiving-code-review`](../../skills/receiving-code-review/): Apply feedback with technical rigor.
- [`changelog-automation`](../../skills/changelog-automation/): Keep release notes and changelogs consistent.
- [`git-advanced-workflows`](../../skills/git-advanced-workflows/): Rebase, cherry-pick, bisect, recovery.
- [`documentation-templates`](../../skills/documentation-templates/): Standardize docs and handoffs.
- [`finishing-a-development-branch`](../../skills/finishing-a-development-branch/): Close a branch with verified integration, merge, and cleanup options.

### 🧱 The "Skill Author" Pack

_For creating and maintaining high-quality SKILL.md assets._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`skill-creator`](../../skills/skill-creator/): Design effective new skills.
- [`effective-agent-skills`](../../skills/effective-agent-skills/): Design portable triggers, progressive disclosure, and safe skill workflows.
- [`writing-skills`](../../skills/writing-skills/): Improve clarity and structure of skill instructions.
- [`documentation-generation-doc-generate`](../../skills/documentation-generation-doc-generate/): Generate maintainable technical docs.
- [`lint-and-validate`](../../skills/lint-and-validate/): Validate quality after edits.
- [`verification-before-completion`](../../skills/verification-before-completion/): Confirm changes before claiming done.


---

## ⭐ Specialized Product Plugins

### ♿ The "AAS Accessibility & Inclusive UX" Plugin

_Design, frontend, QA, and product teams improving accessible user experiences._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable · Requires manual setup

- [`accesslint-audit`](../../skills/accesslint-audit/): Audit accessibility issues with AccessLint workflows.
- [`accesslint-scan`](../../skills/accesslint-scan/): Scan interfaces for accessibility regressions.
- [`screen-reader-testing`](../../skills/screen-reader-testing/): Test interfaces with screen-reader expectations.
- [`accesslint-diff`](../../skills/accesslint-diff/): Review accessibility changes and regressions in diffs.
- [`fixing-accessibility`](../../skills/fixing-accessibility/): Fix accessibility issues in product UI.
- [`ui-a11y`](../../skills/ui-a11y/): Audit WCAG, contrast, focus, labels, motion, and semantic HTML.
- [`webapp-testing`](../../skills/webapp-testing/): Use webapp-testing in this workflow.
- [`playwright-skill`](../../skills/playwright-skill/): Use playwright-skill in this workflow. _(manual setup)_
- [`wcag-audit-patterns`](../../skills/wcag-audit-patterns/): Map accessibility findings to criteria and verify fixes manually and with tools.
- [`ui-states`](../../skills/ui-states/): Design loading, empty, error and success states with accessible feedback.

### 🔌 The "AAS Backend & API Platform" Plugin

_Backend and platform teams designing APIs, contracts, auth, security, load tests, and observability._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`api-design-principles`](../../skills/api-design-principles/): Design clear and maintainable APIs.
- [`api-patterns`](../../skills/api-patterns/): Choose REST, GraphQL, tRPC, and API patterns.
- [`openapi-spec-generation`](../../skills/openapi-spec-generation/): Generate and maintain OpenAPI specifications.
- [`api-documentation`](../../skills/api-documentation/): Document APIs for users and maintainers.
- [`api-endpoint-builder`](../../skills/api-endpoint-builder/): Build API endpoints with sound boundaries.
- [`auth-implementation-patterns`](../../skills/auth-implementation-patterns/): Implement auth, sessions, JWT, and OAuth2 safely.
- [`api-security-best-practices`](../../skills/api-security-best-practices/): Apply secure API design practices.
- [`backend-architect`](../../skills/backend-architect/): Architect backend services and platform boundaries.
- [`k6-load-testing`](../../skills/k6-load-testing/): Run API and service load tests.
- [`observability-engineer`](../../skills/observability-engineer/): Design monitoring and observability systems.
- [`api-contract-testing`](../../skills/api-contract-testing/): Test provider and consumer runtime contracts, invalid fixtures and version compatibility.
- [`api-rate-limit-handler`](../../skills/api-rate-limit-handler/): Implement replay-safe bounded retries that respect provider wait hints.
- [`deprecation-and-migration`](../../skills/deprecation-and-migration/): Plan consumer migration and verified removal of obsolete API behavior.
- [`senior-fullstack`](../../skills/senior-fullstack/): Complete fullstack development guide.
- [`frontend-developer`](../../skills/frontend-developer/): React 19+ and Next.js 15+ expertise.
- [`backend-dev-guidelines`](../../skills/backend-dev-guidelines/): Node.js/Express/TypeScript patterns.
- [`database-design`](../../skills/database-design/): Schema design and ORM selection.
- [`stripe-integration`](../../skills/stripe-integration/): Payments and subscriptions.
- [`e2e-testing-patterns`](../../skills/e2e-testing-patterns/): Verify critical user journeys with reliable E2E tests.

### 💸 The "AAS SaaS Launch & Revenue" Plugin

_Founders and product teams launching, pricing, monetizing, measuring, and improving SaaS products._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`saas-mvp-launcher`](../../skills/saas-mvp-launcher/): Launch SaaS MVPs with practical product flow.
- [`micro-saas-launcher`](../../skills/micro-saas-launcher/): Plan and ship micro-SaaS products.
- [`pricing-strategy`](../../skills/pricing-strategy/): Design pricing and packaging strategy.
- [`monetization`](../../skills/monetization/): Design monetization systems deliberately.
- [`stripe-integration`](../../skills/stripe-integration/): Integrate Stripe payments and subscriptions.
- [`analytics-product`](../../skills/analytics-product/): Model product analytics and product metrics.
- [`launch-strategy`](../../skills/launch-strategy/): Plan product launches and go-to-market steps.
- [`referral-program`](../../skills/referral-program/): Design referral and growth loops.
- [`email-sequence`](../../skills/email-sequence/): Write automated lifecycle email campaigns.
- [`seo-audit`](../../skills/seo-audit/): Audit technical SEO and discoverability.
- [`usage-based-pricing`](../../skills/usage-based-pricing/): Model usage meters, unit economics and cost limits with verified inputs.
- [`onboarding-cro`](../../skills/onboarding-cro/): Review activation journeys while preserving verification and consent controls.
- [`product-marketing-context`](../../skills/product-marketing-context/): Capture verified audience, product and positioning inputs for channel work.
- [`product-manager-toolkit`](../../skills/product-manager-toolkit/): RICE prioritization, PRD templates.
- [`competitive-landscape`](../../skills/competitive-landscape/): Competitor analysis.
- [`competitor-alternatives`](../../skills/competitor-alternatives/): Create comparison pages.
- [`copywriting`](../../skills/copywriting/): Marketing copy that converts.

### 🧠 The "AAS AI Product & Evaluation Ops" Plugin

_PMs, founders, and AI product teams defining, measuring, and improving AI features._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`ai-wrapper-product`](../../skills/ai-wrapper-product/): Shape AI wrapper products with clearer value.
- [`agent-evaluation`](../../skills/agent-evaluation/): Evaluate agent reliability and performance.
- [`langfuse`](../../skills/langfuse/): Trace, evaluate, and monitor LLM apps.
- [`llm-app-patterns`](../../skills/llm-app-patterns/): Use production LLM application patterns.
- [`context-window-management`](../../skills/context-window-management/): Manage long context effectively.
- [`kpi-dashboard-design`](../../skills/kpi-dashboard-design/): Design dashboards for decision-making.
- [`analytics-product`](../../skills/analytics-product/): Model product analytics and product metrics.
- [`product-manager`](../../skills/product-manager/): Apply product management judgment and planning.
- [`ab-test-setup`](../../skills/ab-test-setup/): Plan and validate experiments.
- [`hugging-face-evaluation`](../../skills/hugging-face-evaluation/): Evaluate AI models and datasets with Hugging Face workflows.
- [`advanced-evaluation`](../../skills/advanced-evaluation/): Design judge rubrics, position swaps and human-calibrated evaluation.
- [`skill-security-audit`](../../skills/skill-security-audit/): Inspect agent skill instructions and bundled files for unsafe authority or data flows.
- [`agent-evaluation-reporting`](../../skills/agent-evaluation-reporting/): Report observed agent results, limitations and reproduction evidence.


---

## 🧩 Specialized Product Plugins - Next Wave

### 🛠️ The "AAS Data Engineering Platform" Plugin

_Data and AI platform teams building pipelines, warehouses, transforms, embeddings, and RAG-ready data foundations._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`data-engineer`](../../skills/data-engineer/): Design and operate data pipelines.
- [`airflow-dag-patterns`](../../skills/airflow-dag-patterns/): Build maintainable Airflow DAGs.
- [`dbt-transformation-patterns`](../../skills/dbt-transformation-patterns/): Build dbt transformation pipelines.
- [`postgres-best-practices`](../../skills/postgres-best-practices/): Optimize Postgres schemas and queries.
- [`database-architect`](../../skills/database-architect/): Design robust database structures.
- [`vector-database-engineer`](../../skills/vector-database-engineer/): Design vector database systems.
- [`embedding-strategies`](../../skills/embedding-strategies/): Choose and operate embedding strategies.
- [`rag-engineer`](../../skills/rag-engineer/): Build retrieval-augmented generation systems.
- [`sql-pro`](../../skills/sql-pro/): Query and model data with modern SQL.
- [`data-quality-frameworks`](../../skills/data-quality-frameworks/): Implement data contracts, validation, dbt tests, and quality monitoring.
- [`warehouse`](../../skills/warehouse/): Review read-only warehouse analysis for grain, privacy and provenance.

### 🧾 The "AAS Privacy & Compliance Engineering" Plugin

_Teams building privacy-aware and compliance-sensitive SaaS, AI, finance, and cloud systems._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`privacy-by-design`](../../skills/privacy-by-design/): Apply privacy-by-design principles.
- [`gdpr-data-handling`](../../skills/gdpr-data-handling/): Handle GDPR-sensitive data safely.
- [`pci-compliance`](../../skills/pci-compliance/): Handle payment security and PCI expectations.
- [`fsi-compliance-checker`](../../skills/fsi-compliance-checker/): Check financial-services compliance requirements.
- [`cc-skill-security-review`](../../skills/cc-skill-security-review/): Review features with a security checklist.
- [`data-privacy-controls`](../../skills/data-privacy-controls/): Draft empty control registers with owners and unresolved policy decisions.

### 🌍 The "AAS Localization & International Growth" Plugin

_Growth, content, and product teams expanding sites and products across languages and markets._

**Plugin status:** Codex plugin-safe · Claude plugin-safe · Agent Plugins 1.0 portable

- [`i18n-localization`](../../skills/i18n-localization/): Internationalize and localize product interfaces.
- [`seo-hreflang`](../../skills/seo-hreflang/): Implement hreflang and international SEO signals.
- [`seo-fundamentals`](../../skills/seo-fundamentals/): Apply durable SEO principles.
- [`seo-content-planner`](../../skills/seo-content-planner/): Plan SEO content clusters and calendars.
- [`seo-content-writer`](../../skills/seo-content-writer/): Write search-aware content drafts.
- [`schema-markup`](../../skills/schema-markup/): Add structured data for search visibility.
- [`content-creator`](../../skills/content-creator/): Create SEO-aware marketing content.
- [`copywriting`](../../skills/copywriting/): Write conversion-focused copy.
- [`analytics-tracking`](../../skills/analytics-tracking/): Set up reliable product analytics.
- [`apify-market-research`](../../skills/apify-market-research/): Research markets and competitors with Apify workflows.
- [`copy-editing`](../../skills/copy-editing/): Edit supplied content for clarity, consistency and supported claims.
- [`seo-content-refresher`](../../skills/seo-content-refresher/): Refresh verified locale-specific claims without inventing freshness signals.

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
- **Agent Plugins clients**: load the portable bundle directory using the client-specific installation flow
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

Found a skill that should be in a bundle? Or want to create a new bundle? [Open an issue](https://github.com/sickn33/agentic-awesome-skills/issues) or submit a PR!

---

## Related Documentation

- [Getting Started Guide](getting-started.md)
- [Full Skill Catalog](../../CATALOG.md)
- [Contributing Guide](../../CONTRIBUTING.md)

---

_Last updated: June 2026 | Total Skills: 2,743+ | Total Bundles: 30_
