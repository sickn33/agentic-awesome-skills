import os
import json
import pathlib
import shutil
import re
import sys
from collections.abc import Mapping
from datetime import date, datetime

import yaml
from _project_paths import find_repo_root
from plugin_compatibility import build_report as build_plugin_compatibility_report
from plugin_compatibility import compatibility_by_path as plugin_compatibility_by_path

# Ensure UTF-8 output for Windows compatibility
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


CATEGORY_RULES = [
    {
        "name": "security",
        "keywords": [
            "security", "auth", "authentication", "authorization", "oauth", "jwt",
            "cryptography", "encryption", "vulnerability", "threat", "pentest",
            "xss", "sqli", "gdpr", "pci", "compliance",
        ],
    },
    {
        "name": "testing",
        "keywords": [
            "test", "testing", "tdd", "qa", "e2e", "playwright", "cypress",
            "pytest", "jest", "benchmark", "evaluation", "end to end",
        ],
        "strong_keywords": ["playwright", "cypress", "pytest", "jest", "e2e", "end to end"],
    },
    {
        "name": "automation",
        "keywords": [
            "automation", "workflow", "trigger", "integration", "slack",
            "airtable", "calendar", "gmail", "google", "hubspot", "notion",
            "zendesk", "stripe", "shopify", "sendgrid", "clickup", "n8n",
            "zapier", "make", "zoom",
        ],
    },
    {
        "name": "devops",
        "keywords": [
            "docker", "kubernetes", "k8s", "helm", "terraform", "deploy",
            "deployment", "cicd", "gitops", "observability", "monitoring",
            "grafana", "prometheus", "incident", "sre", "tracing",
        ],
    },
    {
        "name": "cloud",
        "keywords": [
            "aws", "azure", "gcp", "cloud", "serverless", "lambda", "storage",
            "functions", "cdn", "azure", "azd",
        ],
    },
    {
        "name": "database",
        "keywords": [
            "database", "sql", "postgres", "postgresql", "mysql", "mongodb",
            "redis", "orm", "schema", "migration", "query", "prisma",
        ],
    },
    {
        "name": "ai-ml",
        "keywords": [
            "ai", "ml", "llm", "agent", "agents", "gpt", "embedding",
            "vector", "rag", "prompt", "model", "training", "inference",
            "pytorch", "tensorflow", "hugging", "openai",
        ],
    },
    {
        "name": "mobile",
        "keywords": [
            "mobile", "android", "ios", "swift", "swiftui", "kotlin",
            "flutter", "expo", "react native", "app store", "play store",
            "jetpack compose",
        ],
    },
    {
        "name": "game-development",
        "keywords": [
            "game", "unity", "unreal", "godot", "threejs", "3d", "2d",
            "shader", "rendering", "webgl", "physics",
        ],
    },
    {
        "name": "web-development",
        "keywords": [
            "web", "frontend", "react", "nextjs", "vue", "angular", "svelte",
            "tailwind", "css", "html", "browser", "extension", "component",
            "ui", "ux", "javascript", "typescript",
        ],
    },
    {
        "name": "backend",
        "keywords": [
            "backend", "api", "fastapi", "django", "flask", "express",
            "node", "server", "middleware", "graphql", "rest",
        ],
    },
    {
        "name": "data-science",
        "keywords": [
            "data", "analytics", "pandas", "numpy", "statistics",
            "matplotlib", "plotly", "seaborn", "scipy", "notebook",
        ],
    },
    {
        "name": "content",
        "keywords": [
            "content", "copy", "copywriting", "writing", "documentation",
            "transcription", "transcribe", "seo", "blog", "markdown",
        ],
    },
    {
        "name": "business",
        "keywords": [
            "business", "product", "market", "sales", "finance", "startup",
            "legal", "customer", "competitive", "pricing", "kpi",
        ],
    },
    {
        "name": "architecture",
        "keywords": [
            "architecture", "adr", "microservices", "ddd", "domain",
            "cqrs", "saga", "patterns",
        ],
    },
    {
        "name": "education",
        "keywords": [
            "education", "student", "syllabus", "exam", "study", "learning",
            "course", "teacher", "curriculum", "classroom", "school",
            "examprep", "roadmap",
        ],
    },
]

FAMILY_CATEGORY_RULES = [
    ("azure-", "cloud"),
    ("aws-", "cloud"),
    ("gcp-", "cloud"),
    ("apify-", "automation"),
    ("google-", "automation"),
    ("n8n-", "automation"),
    ("makepad-", "development"),
    ("robius-", "development"),
    ("avalonia-", "development"),
    ("hig-", "development"),
    ("fp-", "development"),
    ("fp-ts-", "development"),
    ("threejs-", "web-development"),
    ("react-", "web-development"),
    ("vue-", "web-development"),
    ("angular-", "web-development"),
    ("browser-", "web-development"),
    ("expo-", "mobile"),
    ("swiftui-", "mobile"),
    ("android-", "mobile"),
    ("ios-", "mobile"),
    ("hugging-face-", "ai-ml"),
    ("agent-", "ai-ml"),
    ("agents-", "ai-ml"),
    ("ai-", "ai-ml"),
    ("claude-", "ai-ml"),
    ("context-", "ai-ml"),
    ("fal-", "ai-ml"),
    ("yann-", "ai-ml"),
    ("llm-", "ai-ml"),
    ("rag-", "ai-ml"),
    ("embedding-", "ai-ml"),
    ("odoo-", "business"),
    ("product-", "business"),
    ("data-", "data-science"),
    ("wiki-", "content"),
    ("documentation-", "content"),
    ("copy", "content"),
    ("audio-", "content"),
    ("video-", "content"),
    ("api-", "backend"),
    ("django-", "backend"),
    ("fastapi-", "backend"),
    ("backend-", "backend"),
    ("python-", "development"),
    ("bash-", "development"),
    ("code-", "development"),
    ("codebase-", "development"),
    ("error-", "development"),
    ("framework-", "development"),
    ("debugging-", "development"),
    ("javascript-", "development"),
    ("go-", "development"),
    ("performance-", "development"),
    ("dbos-", "development"),
    ("conductor-", "workflow"),
    ("workflow-", "workflow"),
    ("create-", "workflow"),
    ("git-", "workflow"),
    ("github-", "workflow"),
    ("gitlab-", "workflow"),
    ("skill-", "meta"),
    ("cc-skill-", "meta"),
    ("tdd-", "testing"),
    ("test-", "testing"),
    ("security-", "security"),
    ("database-", "database"),
    ("c4-", "architecture"),
    ("deployment-", "devops"),
    ("incident-", "devops"),
    ("terraform-", "devops"),
]

CURATED_CATEGORY_OVERRIDES = {
    "ai-agents-architect": "ai-agents",
    "agent-evaluation": "ai-agents",
    "agent-manager-skill": "ai-agents",
    "langgraph": "ai-agents",
    "multi-agent-patterns": "ai-agents",
    "pydantic-ai": "ai-agents",
    "plaid-fintech": "api-integration",
    "stripe-integration": "api-integration",
    "paypal-integration": "api-integration",
    "hubspot-integration": "api-integration",
    "twilio-communications": "api-integration",
    "pakistan-payments-stack": "api-integration",
    "javascript-typescript-typescript-scaffold": "app-builder",
    "fastapi-templates": "app-builder",
    "frontend-mobile-development-component-scaffold": "app-builder",
    "templates": "app-builder",
    "blockchain-developer": "blockchain",
    "crypto-bd-agent": "blockchain",
    "defi-protocol-templates": "blockchain",
    "goldrush-api": "blockchain",
    "lightning-architecture-review": "blockchain",
    "lightning-channel-factories": "blockchain",
    "lightning-factory-explainer": "blockchain",
    "web3-testing": "blockchain",
    "javascript-pro": "code",
    "python-pro": "code",
    "typescript-pro": "code",
    "golang-pro": "code",
    "rust-pro": "code",
    "uncle-bob-craft": "code-quality",
    "clean-code": "code-quality",
    "kaizen": "code-quality",
    "code-review-checklist": "code-quality",
    "codebase-cleanup-tech-debt": "code-quality",
    "code-refactoring-refactor-clean": "code-quality",
    "comprehensive-review-full-review": "code-quality",
    "comprehensive-review-pr-enhance": "code-quality",
    "data-engineer": "data",
    "dbt-transformation-patterns": "data",
    "analytics-tracking": "data",
    "sql-pro": "data",
    "web-scraper": "data",
    "x-twitter-scraper": "data",
    "ai-engineering-toolkit": "data-ai",
    "embedding-strategies": "data-ai",
    "llm-app-patterns": "data-ai",
    "local-llm-expert": "data-ai",
    "rag-engineer": "data-ai",
    "seek-and-analyze-video": "data-ai",
    "vector-database-engineer": "data-ai",
    "database-admin": "database-processing",
    "database-architect": "database-processing",
    "database-design": "database-processing",
    "database-optimizer": "database-processing",
    "base": "database-processing",
    "using-neon": "database-processing",
    "bug-hunter": "development-and-testing",
    "debugging-strategies": "development-and-testing",
    "openclaw-github-repo-commander": "development-and-testing",
    "systematic-debugging": "development-and-testing",
    "test-fixing": "development-and-testing",
    "antigravity-design-expert": "design",
    "design-md": "design",
    "design-orchestration": "design",
    "design-spells": "design",
    "stitch-ui-design": "design",
    "web-design-guidelines": "design",
    "docx-official": "document-processing",
    "doc-coauthoring": "document-processing",
    "pdf": "document-processing",
    "pdf-official": "document-processing",
    "writer": "document-processing",
    "landing-page-generator": "front-end",
    "frontend-design": "front-end",
    "frontend-developer": "front-end",
    "frontend-dev-guidelines": "front-end",
    "ui-ux-pro-max": "front-end",
    "astro": "frontend",
    "nextjs-best-practices": "frontend",
    "react-patterns": "frontend",
    "sveltekit": "frontend",
    "tailwind-patterns": "frontend",
    "django-pro": "framework",
    "fastapi-pro": "framework",
    "nestjs-expert": "framework",
    "nextjs-app-router-patterns": "framework",
    "trpc-fullstack": "framework",
    "typescript-expert": "framework",
    "algorithmic-art": "graphics-processing",
    "canvas-design": "graphics-processing",
    "draw": "graphics-processing",
    "image-studio": "graphics-processing",
    "imagen": "graphics-processing",
    "laravel-expert": "framework",
    "laravel-security-audit": "security",
    "advogado-criminal": "legal",
    "advogado-especialista": "legal",
    "customs-trade-compliance": "legal",
    "employment-contract-templates": "legal",
    "legal-advisor": "legal",
    "lex": "legal",
    "app-store-optimization": "marketing",
    "brand-guidelines": "marketing",
    "brand-guidelines-anthropic": "marketing",
    "brand-guidelines-community": "marketing",
    "content-creator": "marketing",
    "copy-editing": "marketing",
    "copywriting": "marketing",
    "email-sequence": "marketing",
    "free-tool-strategy": "marketing",
    "growth-engine": "marketing",
    "instagram": "marketing",
    "instagram-automation": "marketing",
    "launch-strategy": "marketing",
    "linkedin-automation": "marketing",
    "linkedin-cli": "marketing",
    "marketing-ideas": "marketing",
    "marketing-psychology": "marketing",
    "programmatic-seo": "marketing",
    "social-content": "marketing",
    "social-orchestrator": "marketing",
    "remotion-best-practices": "media",
    "sora": "media",
    "videodb": "media",
    "videodb-skills": "media",
    "agent-memory-systems": "memory",
    "context-window-management": "memory",
    "conversation-memory": "memory",
    "hierarchical-agent-memory": "memory",
    "memory-systems": "memory",
    "recallmax": "memory",
    "memory-forensics": "security",
    "memory-safety-patterns": "development",
    "m365-agents-dotnet": "ai-agents",
    "m365-agents-ts": "ai-agents",
    "hosted-agents": "ai-agents",
    "hosted-agents-v2-py": "ai-agents",
    "multi-advisor": "ai-agents",
    "multi-platform-apps-multi-platform": "development",
    "mobile-design": "mobile",
    "mobile-security-coder": "mobile",
    "blueprint": "planning",
    "concise-planning": "planning",
    "planning-with-files": "planning",
    "track-management": "planning",
    "google-slides-automation": "presentation-processing",
    "frontend-slides": "presentation-processing",
    "impress": "presentation-processing",
    "pptx-official": "presentation-processing",
    "file-organizer": "productivity",
    "google-calendar-automation": "productivity",
    "interview-coach": "productivity",
    "office-productivity": "productivity",
    "risk-manager": "business",
    "risk-metrics-calculation": "business",
    "github-issue-creator": "project-management",
    "linear-claude-skill": "project-management",
    "progressive-estimation": "project-management",
    "team-collaboration-issue": "project-management",
    "team-collaboration-standup-notes": "project-management",
    "freshservice-automation": "project-management",
    "wrike-automation": "project-management",
    "distributed-debugging-debug-trace": "reliability",
    "distributed-tracing": "reliability",
    "incident-responder": "reliability",
    "observability-engineer": "reliability",
    "postmortem-writing": "reliability",
    "slo-implementation": "reliability",
    "tool-use-guardian": "reliability",
    "calc": "spreadsheet-processing",
    "google-sheets-automation": "spreadsheet-processing",
    "googlesheets-automation": "spreadsheet-processing",
    "xlsx-official": "spreadsheet-processing",
    "awt-e2e-testing": "test-automation",
    "browser-automation": "test-automation",
    "e2e-testing-patterns": "test-automation",
    "go-playwright": "test-automation",
    "playwright-java": "test-automation",
    "playwright-skill": "test-automation",
    "test-automator": "test-automation",
    "webapp-testing": "test-automation",
    "ffuf-claude-skill": "security",
    "ffuf-web-fuzzing": "security",
    "file-path-traversal": "security",
    "file-uploads": "security",
    "semgrep-rule-creator": "security",
    "semgrep-rule-variant-creator": "security",
    "seo-audit": "content",
    "seo-forensic-incident-response": "content",
    "fixing-accessibility": "front-end",
    "fixing-metadata": "front-end",
    "fixing-motion-performance": "front-end",
    "internal-comms-anthropic": "content",
    "internal-comms-community": "content",
    "leiloeiro-avaliacao": "leiloeiro",
    "leiloeiro-edital": "leiloeiro",
    "leiloeiro-ia": "leiloeiro",
    "leiloeiro-juridico": "leiloeiro",
    "leiloeiro-mercado": "leiloeiro",
    "leiloeiro-risco": "leiloeiro",
    "linux-privilege-escalation": "security",
    "linux-shell-scripting": "development",
    "mcp-builder": "ai-agents",
    "mcp-builder-ms": "ai-agents",
    "monorepo-architect": "development",
    "monorepo-management": "development",
    "pentest-checklist": "security",
    "pentest-commands": "security",
    "salesforce-automation": "api-integration",
    "salesforce-development": "api-integration",
    "segment-automation": "data",
    "segment-cdp": "data",
    "senior-architect": "development",
    "senior-fullstack": "development",
    "shopify-apps": "api-integration",
    "shopify-development": "api-integration",
    "sred-project-organizer": "project-management",
    "sred-work-summary": "project-management",
    "startup-business-analyst-financial-projections": "business",
    "startup-financial-modeling": "business",
    "telegram-automation": "api-integration",
    "telegram-bot-builder": "api-integration",
    "temporal-golang-pro": "workflow",
    "temporal-python-pro": "workflow",
    "using-git-worktrees": "development",
    "using-superpowers": "meta",
    "varlock": "security",
    "varlock-claude-skill": "security",
    "vexor": "development",
    "vexor-cli": "development",
    "audio-transcriber": "voice-agents",
    "fal-audio": "voice-agents",
    "pipecat-friday-agent": "voice-agents",
    "3d-web-experience": "design",
    "ab-test-setup": "marketing",
    "acceptance-orchestrator": "workflow",
    "accessibility-compliance-accessibility-audit": "design",
    "active-directory-attacks": "security",
    "activecampaign-automation": "marketing",
    "alpha-vantage": "data",
    "amplitude-automation": "data",
    "analytics-product": "data",
    "analyze-project": "meta",
    "antigravity-workflows": "workflow",
    "anti-reversing-techniques": "security",
    "arm-cortex-expert": "development",
    "asana-automation": "project-management",
    "ask-questions-if-underspecified": "workflow",
    "audit-context-building": "meta",
    "basecamp-automation": "project-management",
    "bazel-build-optimization": "development",
    "behavioral-modes": "meta",
    "bitbucket-automation": "workflow",
    "blog-writing-guide": "content",
    "box-automation": "productivity",
    "brevo-automation": "marketing",
    "broken-authentication": "security",
    "building-native-ui": "mobile",
    "bullmq-specialist": "framework",
    "burp-suite-testing": "security",
    "business-analyst": "business",
    "busybox-on-windows": "development",
    "c-pro": "code",
    "cal-com-automation": "productivity",
    "calendly-automation": "productivity",
    "canva-automation": "design",
    "carrier-relationship-management": "business",
    "changelog-automation": "workflow",
    "cloudflare-workers-expert": "framework",
    "closed-loop-delivery": "workflow",
    "commit": "workflow",
    "confluence-automation": "project-management",
    "constant-time-analysis": "security",
    "context7-auto-research": "meta",
    "convex": "framework",
    "convertkit-automation": "marketing",
    "cpp-pro": "code",
    "cred-omega": "security",
    "csharp-pro": "code",
    "datadog-automation": "reliability",
    "dependency-upgrade": "development",
    "differential-review": "security",
    "discord-automation": "api-integration",
    "docusign-automation": "productivity",
    "dotnet-architect": "development",
    "dropbox-automation": "productivity",
    "dx-optimizer": "development",
    "elixir-pro": "code",
    "electron-development": "development",
    "energy-procurement": "business",
    "environment-setup-guide": "development",
    "ethical-hacking-methodology": "security",
    "executing-plans": "workflow",
    "fda-food-safety-auditor": "legal",
    "fda-medtech-compliance-auditor": "legal",
    "figma-automation": "design",
    "filesystem-context": "meta",
    "flutter-expert": "mobile",
    "gha-security-review": "security",
    "gh-review-requests": "workflow",
    "gmail-automation": "productivity",
    "haskell-pro": "code",
    "hr-pro": "business",
    "inngest": "workflow",
    "inventory-demand-planning": "business",
    "iterate-pr": "workflow",
    "java-pro": "code",
    "jira-automation": "project-management",
    "klaviyo-automation": "marketing",
    "linear-automation": "project-management",
    "mailchimp-automation": "marketing",
    "microsoft-teams-automation": "api-integration",
    "miro-automation": "project-management",
    "mixpanel-automation": "data",
    "ml-pipeline-workflow": "workflow",
    "monday-automation": "project-management",
    "on-call-handoff-patterns": "reliability",
    "one-drive-automation": "productivity",
    "pagerduty-automation": "reliability",
    "php-pro": "code",
    "pipedrive-automation": "business",
    "plan-writing": "planning",
    "postmark-automation": "api-integration",
    "posthog-automation": "data",
    "pr-writer": "workflow",
    "privacy-by-design": "security",
    "receiving-code-review": "workflow",
    "reddit-automation": "marketing",
    "requesting-code-review": "workflow",
    "ruby-pro": "code",
    "scala-pro": "code",
    "sentry-automation": "reliability",
    "service-mesh-expert": "reliability",
    "shadcn": "framework",
    "square-automation": "api-integration",
    "subagent-driven-development": "workflow",
    "tanstack-query-expert": "framework",
    "tiktok-automation": "marketing",
    "todoist-automation": "project-management",
    "trello-automation": "project-management",
    "trigger-dev": "workflow",
    "twitter-automation": "marketing",
    "ui-visual-validator": "design",
    "unreal-engine-cpp-pro": "code",
    "uv-package-manager": "development",
    "webflow-automation": "design",
    "whatsapp-automation": "api-integration",
    "writing-plans": "planning",
    "youtube-automation": "marketing",
    "zod-validation-expert": "framework",
    "zoho-crm-automation": "business",
    "address-github-comments": "workflow",
    "airflow-dag-patterns": "workflow",
    "algolia-search": "api-integration",
    "android_ui_verification": "test-automation",
    "application-performance-performance-optimization": "reliability",
    "architect-review": "architecture",
    "astropy": "science",
    "async-python-patterns": "development",
    "auri-core": "voice-agents",
    "binary-analysis-patterns": "security",
    "biopython": "science",
    "build": "workflow",
    "burpsuite-project-parser": "security",
    "cdk-patterns": "cloud",
    "chat-widget": "front-end",
    "chrome-extension-developer": "front-end",
    "cirq": "science",
    "citation-management": "content",
    "cloudformation-best-practices": "cloud",
    "computer-vision-expert": "ai-ml",
    "cqrs-implementation": "architecture",
    "ddd-strategic-design": "architecture",
    "deep-research": "ai-ml",
    "dispatching-parallel-agents": "ai-agents",
    "emergency-card": "health",
    "evaluation": "ai-ml",
    "event-store-design": "architecture",
    "exa-search": "data-ai",
    "examprep-ai": "education",
    "explain-like-socrates": "content",
    "family-health-analyzer": "health",
    "find-bugs": "code-quality",
    "finishing-a-development-branch": "workflow",
    "firebase": "cloud",
    "firmware-analyst": "security",
    "fitness-analyzer": "health",
    "fix-review": "code-quality",
    "food-database-query": "health",
    "freshdesk-automation": "automation",
    "form-cro": "marketing",
    "full-stack-orchestration-full-stack-feature": "workflow",
    "game-development": "game-development",
    "gdpr-data-handling": "security",
    "gemini-api-dev": "ai-ml",
    "geo-fundamentals": "marketing",
    "goal-analyzer": "health",
    "graphql-architect": "architecture",
    "health-trend-analyzer": "health",
    "helpdesk-automation": "automation",
    "html-injection-testing": "security",
    "hybrid-cloud-networking": "cloud",
    "i18n-localization": "development",
    "idor-testing": "security",
    "interactive-portfolio": "front-end",
    "intercom-automation": "automation",
    "issues": "workflow",
    "keyword-extractor": "marketing",
    "legacy-modernizer": "development",
    "lint-and-validate": "workflow",
    "local-legal-seo-audit": "marketing",
    "malware-analyst": "security",
    "mental-health-analyzer": "health",
    "metasploit-framework": "security",
    "micro-saas-launcher": "business",
    "modern-javascript-patterns": "development",
    "monetization": "business",
    "mtls-configuration": "security",
    "native-data-fetching": "development",
    "networkx": "science",
    "notion-template-business": "business",
    "nutrition-analyzer": "health",
    "nx-workspace-patterns": "development",
    "onboarding-cro": "marketing",
    "occupational-health-analyzer": "health",
    "openapi-spec-generation": "api-integration",
    "oral-health-analyzer": "health",
    "page-cro": "marketing",
    "paid-ads": "marketing",
    "parallel-agents": "ai-agents",
    "payment-integration": "api-integration",
    "paywall-upgrade-cro": "marketing",
    "popup-cro": "marketing",
    "privilege-escalation-methods": "security",
    "production-scheduling": "business",
    "professional-proofreader": "content",
    "progressive-web-app": "front-end",
    "projection-patterns": "architecture",
    "protocol-reverse-engineering": "security",
    "pydantic-models-py": "development",
    "pypict-skill": "testing",
    "qiskit": "science",
    "quality-nonconformance": "business",
    "readme": "content",
    "red-team-tactics": "security",
    "reference-builder": "content",
    "referral-program": "marketing",
    "rehabilitation-analyzer": "health",
    "render-automation": "automation",
    "returns-reverse-logistics": "business",
    "reverse-engineer": "security",
    "rust-async-patterns": "development",
    "saas-mvp-launcher": "business",
    "sast-configuration": "security",
    "scanpy": "science",
    "schema-markup": "marketing",
    "scientific-writing": "content",
    "screen-reader-testing": "testing",
    "screenshots": "marketing",
    "scroll-experience": "front-end",
    "search-specialist": "content",
    "seaborn": "science",
    "secrets-management": "security",
    "shodan-reconnaissance": "security",
    "signup-flow-cro": "marketing",
    "similarity-search-patterns": "data-ai",
    "skin-health-analyzer": "health",
    "sleep-analyzer": "health",
    "spec-to-code-compliance": "code-quality",
    "sql-injection-testing": "security",
    "ssh-penetration-testing": "security",
    "systems-programming-rust-project": "development",
    "tcm-constitution-analyzer": "health",
    "team-composition-analysis": "business",
    "travel-health-analyzer": "health",
    "vibe-code-auditor": "code-quality",
    "vibers-code-review": "code-quality",
    "voice-ai-development": "voice-agents",
    "weightloss-analyzer": "health",
    "windows-privilege-escalation": "security",
    "wordpress-penetration-testing": "security",
    "xss-html-injection": "security",
    "backtesting-frameworks": "business",
    "bamboohr-automation": "business",
    "beautiful-prose": "content",
    "clarity-gate": "data-ai",
    "codex-review": "code-quality",
    "customer-support": "business",
    "debugger": "development-and-testing",
    "devcontainer-setup": "development",
    "diary": "meta",
    "dwarf-expert": "development",
    "firecrawl-scraper": "data",
    "godot-4-migration": "game-development",
    "grpc-golang": "development",
    "istio-traffic-management": "cloud",
    "julia-pro": "code",
    "kotlin-coroutines-expert": "development",
    "matplotlib": "science",
    "mermaid-expert": "content",
    "minecraft-bukkit-pro": "game-development",
    "moodle-external-api-development": "api-integration",
    "nanobanana-ppt-skills": "presentation-processing",
    "notebooklm": "data-ai",
    "prompt-library": "content",
    "quant-analyst": "business",
    "remotion": "media",
    "server-management": "reliability",
    "sexual-health-analyzer": "health",
    "shellcheck-configuration": "code-quality",
    "slack-bot-builder": "api-integration",
    "software-architecture": "architecture",
    "spark-optimization": "data",
    "statsmodels": "science",
    "stability-ai": "media",
    "sympy": "science",
    "task-intelligence": "workflow",
    "tavily-web": "data-ai",
    "theme-factory": "design",
    "turborepo-caching": "development",
    "tutorial-engineer": "content",
    "typescript-advanced-types": "code",
    "unity-ecs-patterns": "game-development",
    "unsplash-integration": "api-integration",
    "upgrading-expo": "mobile",
    "upstash-qstash": "workflow",
    "vector-index-tuning": "data-ai",
    "verification-before-completion": "workflow",
    "viral-generator-builder": "marketing",
    "vizcom": "design",
    "wcag-audit-patterns": "design",
    "web-performance-optimization": "front-end",
    "wireshark-analysis": "security",
    "x-article-publisher-skill": "marketing",
    "zeroize-audit": "security",
    "zustand-store-ts": "frontend",
}


def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def infer_category(skill_id, skill_name, description):
    for prefix, category in FAMILY_CATEGORY_RULES:
        if skill_id.startswith(prefix):
            return category

    normalized_name = skill_name if isinstance(skill_name, str) else ""
    normalized_description = description if isinstance(description, str) else ""
    combined_text = f"{skill_id} {normalized_name} {normalized_description}".lower()
    token_set = set(tokenize(combined_text))
    scores = {}

    for rule in CATEGORY_RULES:
        score = 0
        strong_keywords = {keyword.lower() for keyword in rule.get("strong_keywords", [])}
        for keyword in rule["keywords"]:
            keyword_lower = keyword.lower()
            if " " in keyword_lower:
                if keyword_lower in combined_text:
                    score += 4 if keyword_lower in strong_keywords else 3
                continue

            if keyword_lower in token_set:
                score += 3 if keyword_lower in strong_keywords else 2
            elif keyword_lower in combined_text:
                score += 1

        if score > 0:
            scores[rule["name"]] = score

    if not scores:
        return None

    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    best_category, best_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0

    if best_score < 4:
        return None

    if best_score < 8 and (best_score - second_score) < 2:
        return None

    return best_category


def normalize_category(category):
    if not isinstance(category, str):
        return category
    return category.strip().lower()

def normalize_yaml_value(value):
    if isinstance(value, Mapping):
        return {key: normalize_yaml_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [normalize_yaml_value(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray)):
        return bytes(value).decode("utf-8", errors="replace")
    return value


def coerce_metadata_text(value):
    if value is None or isinstance(value, (Mapping, list, tuple, set)):
        return None
    if isinstance(value, str):
        return value
    return str(value)

def parse_frontmatter(content):
    """
    Parses YAML frontmatter, sanitizing unquoted values containing @.
    Handles single values and comma-separated lists by quoting the entire line.
    """
    fm_match = re.search(r'^---\s*\n(.*?)\n?---(?:\s*\n|$)', content, re.DOTALL)
    if not fm_match:
        return {}
    
    yaml_text = fm_match.group(1)
    
    # Process line by line to handle values containing @ and commas
    sanitized_lines = []
    for line in yaml_text.splitlines():
        # Match "key: value" (handles keys with dashes like 'package-name')
        match = re.match(r'^(\s*[\w-]+):\s*(.*)$', line)
        if match:
            key, val = match.groups()
            val_s = val.strip()
            # If value contains @ and isn't already quoted, wrap the whole string in double quotes
            if '@' in val_s and not (val_s.startswith('"') or val_s.startswith("'")):
                # Escape any existing double quotes within the value string
                safe_val = val_s.replace('"', '\\"')
                line = f'{key}: "{safe_val}"'
        sanitized_lines.append(line)
    
    sanitized_yaml = '\n'.join(sanitized_lines)
    
    try:
        parsed = yaml.safe_load(sanitized_yaml) or {}
        parsed = normalize_yaml_value(parsed)
        if not isinstance(parsed, Mapping):
            print("⚠️ YAML frontmatter must be a mapping/object")
            return {}
        return dict(parsed)
    except yaml.YAMLError as e:
        print(f"⚠️ YAML parsing error: {e}")
        return {}

def generate_index(skills_dir, output_file, compatibility_report=None):
    print(f"🏗️ Generating index from: {skills_dir}")
    skills = []
    if compatibility_report is None:
        compatibility_report = build_plugin_compatibility_report(pathlib.Path(skills_dir))
    compatibility_lookup = plugin_compatibility_by_path(compatibility_report)

    for root, dirs, files in os.walk(skills_dir):
        # Skip .disabled or hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            if os.path.islink(skill_path):
                print(f"⚠️ Skipping symlinked SKILL.md: {skill_path}")
                continue
            dir_name = os.path.basename(root)
            parent_dir = os.path.basename(os.path.dirname(root))
            
            # Default values
            rel_path = os.path.relpath(root, os.path.dirname(skills_dir))
            # Force forward slashes for cross-platform JSON compatibility
            skill_info = {
                "id": dir_name,
                "path": rel_path.replace(os.sep, '/'),
                "category": parent_dir if parent_dir != "skills" else None,  # Will be overridden by frontmatter if present
                "name": dir_name.replace("-", " ").title(),
                "description": "",
                "risk": "unknown",
                "source": "unknown",
                "date_added": None,
                "plugin": {
                    "targets": {
                        "codex": "supported",
                        "claude": "supported",
                    },
                    "setup": {
                        "type": "none",
                        "summary": "",
                        "docs": None,
                    },
                    "reasons": [],
                },
            }
            
            try:
                with open(skill_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                print(f"⚠️ Error reading {skill_path}: {e}")
                continue

            # Parse Metadata
            metadata = parse_frontmatter(content)
            
            # Merge Metadata (frontmatter takes priority)
            name = coerce_metadata_text(metadata.get("name"))
            description = coerce_metadata_text(metadata.get("description"))
            risk = coerce_metadata_text(metadata.get("risk"))
            source = coerce_metadata_text(metadata.get("source"))
            date_added = coerce_metadata_text(metadata.get("date_added"))
            category = coerce_metadata_text(metadata.get("category"))

            if name is not None:
                skill_info["name"] = name
            if description is not None:
                skill_info["description"] = description
            if risk is not None:
                skill_info["risk"] = risk
            if source is not None:
                skill_info["source"] = source
            if date_added is not None:
                skill_info["date_added"] = date_added
            
            # Category: prefer frontmatter, then folder structure, then conservative inference
            if category is not None:
                skill_info["category"] = category
            elif skill_info["category"] is None:
                inferred_category = infer_category(
                    skill_info["id"],
                    skill_info["name"],
                    skill_info["description"],
                )
                skill_info["category"] = inferred_category or "uncategorized"
            if skill_info["id"] in CURATED_CATEGORY_OVERRIDES:
                skill_info["category"] = CURATED_CATEGORY_OVERRIDES[skill_info["id"]]
            skill_info["category"] = normalize_category(skill_info["category"])

            plugin_info = compatibility_lookup.get(skill_info["path"])
            if plugin_info:
                skill_info["plugin"] = {
                    "targets": dict(plugin_info["targets"]),
                    "setup": dict(plugin_info["setup"]),
                    "reasons": list(plugin_info["reasons"]),
                }
            
            # Fallback for description if missing in frontmatter (legacy support)
            if not skill_info["description"]:
                body = content
                fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
                if fm_match:
                    body = content[fm_match.end():].strip()
                
                # Simple extraction of first non-header paragraph
                lines = body.split('\n')
                desc_lines = []
                for line in lines:
                    if line.startswith('#') or not line.strip():
                        if desc_lines: break
                        continue
                    desc_lines.append(line.strip())
                
                if desc_lines:
                    skill_info["description"] = " ".join(desc_lines)[:250].strip()

            skills.append(skill_info)

    seen_ids: dict[str, str] = {}
    duplicate_ids: list[tuple[str, str, str]] = []
    for skill in skills:
        existing_path = seen_ids.get(skill["id"])
        if existing_path is not None:
            duplicate_ids.append((skill["id"], existing_path, skill["path"]))
        else:
            seen_ids[skill["id"]] = skill["path"]
    if duplicate_ids:
        details = "; ".join(
            f"{skill_id}: {first_path} conflicts with {second_path}"
            for skill_id, first_path, second_path in duplicate_ids
        )
        raise ValueError(f"Duplicate skill ids in generated index: {details}")

    # Sort validation: by name
    skills.sort(key=lambda x: (x["name"].lower(), x["id"].lower()))

    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(skills, f, indent=2)
    
    print(f"✅ Generated rich index with {len(skills)} skills at: {output_file}")
    return skills

def mirror_canonical_index(output_path):
    """Mirror the root public manifest into data/ for compatibility consumers."""
    output_path = pathlib.Path(output_path)
    root = pathlib.Path(find_repo_root(__file__))
    root_index = root / "skills_index.json"
    if output_path.resolve() != root_index.resolve():
        return None

    data_index = root / "data" / "skills_index.json"
    data_index.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(output_path, data_index)
    print(f"✅ Mirrored canonical index to: {data_index}")
    return data_index

if __name__ == "__main__":
    base_dir = str(find_repo_root(__file__))
    skills_path = os.path.join(base_dir, "skills")
    output_path = os.path.join(base_dir, "skills_index.json")
    generate_index(skills_path, output_path)
    mirror_canonical_index(output_path)
