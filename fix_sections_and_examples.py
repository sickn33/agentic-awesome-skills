#!/usr/bin/env python3
"""
fix_sections_and_examples.py
Aggiunge sezioni 'When to Use' e 'Examples' mancanti
alle skill di antigravity-awesome-skills, inferendo dal contenuto.
"""

import os
import re
import sys

SKILLS_DIR = "skills"

# ─────────────────────────────────────────────
# TEMPLATE WHEN TO USE per categoria
# ─────────────────────────────────────────────
WHEN_TEMPLATES = {
    "security":    ["When you need to audit code or infrastructure for vulnerabilities", "When performing threat modeling (STRIDE, PASTA, OWASP)", "When hardening systems, APIs, or configurations", "When responding to a security incident or breach"],
    "frontend":    ["When building or reviewing UI components, layouts, or design systems", "When you need help with HTML, CSS, or JavaScript/TypeScript frontend code", "When auditing for accessibility, performance, or responsiveness", "When migrating or refactoring a frontend framework"],
    "backend":     ["When designing or implementing REST, GraphQL, or gRPC APIs", "When you need help with server-side logic, routing, or middleware", "When optimizing database queries or server performance", "When setting up authentication, authorization, or session handling"],
    "devops":      ["When setting up CI/CD pipelines or deployment workflows", "When containerizing applications with Docker or Kubernetes", "When configuring infrastructure as code (Terraform, Ansible, Helm)", "When troubleshooting deployment failures or environment issues"],
    "database":    ["When designing schemas, writing migrations, or optimizing queries", "When choosing between SQL and NoSQL solutions", "When setting up replication, backups, or data integrity checks", "When debugging slow queries or index performance"],
    "ai":          ["When building LLM-powered features, agents, or pipelines", "When implementing RAG, embeddings, or vector search", "When evaluating model outputs or prompt engineering", "When integrating AI APIs (OpenAI, Anthropic, Gemini)"],
    "testing":     ["When writing unit, integration, or end-to-end tests", "When setting up test infrastructure or coverage reporting", "When debugging flaky tests or test failures", "When implementing TDD or BDD workflows"],
    "data":        ["When building ETL pipelines or data transformations", "When analyzing datasets, cleaning data, or building dashboards", "When integrating data sources or warehouses", "When working with Pandas, Spark, dbt, or similar tools"],
    "marketing":   ["When planning or executing marketing campaigns", "When writing SEO-optimized content or ad copy", "When analyzing campaign performance and conversion funnels", "When setting up email marketing or growth automation"],
    "content":     ["When writing, editing, or reviewing technical documentation", "When creating blog posts, READMEs, or user guides", "When structuring content for clarity and readability", "When localizing or translating content"],
    "mobile":      ["When developing iOS, Android, or cross-platform mobile apps", "When debugging mobile-specific layout or performance issues", "When implementing push notifications, deep links, or offline support", "When migrating between mobile frameworks"],
    "cloud":       ["When deploying or managing cloud infrastructure (AWS, GCP, Azure)", "When setting up serverless functions, CDN, or storage buckets", "When optimizing cloud costs or resource allocation", "When configuring IAM roles, networking, or security groups"],
    "workflow":    ["When automating repetitive tasks or multi-step processes", "When orchestrating multi-agent or multi-tool workflows", "When building integrations between services (Zapier, Make, n8n)", "When designing agentic pipelines that require coordination"],
    "general":     ["When the task matches the domain described in this skill", "When you need specialized guidance not covered by generic assistants", "When the user explicitly requests this skill or its domain", "When other skills do not cover the required expertise"],
}

DONOT_TEMPLATES = {
    "security":    ["When the task is unrelated to security, compliance, or vulnerabilities", "When a simpler code review without security scope is sufficient"],
    "frontend":    ["When the task is purely backend or infrastructure-related", "When no UI, design, or browser environment is involved"],
    "backend":     ["When the task is purely frontend or UI-focused", "When no server-side logic or API design is needed"],
    "devops":      ["When the task is purely about application logic rather than infrastructure", "When no deployment, containerization, or pipeline work is needed"],
    "database":    ["When no database interaction is involved in the task", "When the task is purely about application or UI logic"],
    "ai":          ["When the task does not involve machine learning, LLMs, or AI APIs", "When a simpler rule-based solution is more appropriate"],
    "testing":     ["When the task is about writing production code rather than tests", "When no automated or manual testing is required"],
    "data":        ["When the task involves no data processing, analysis, or transformation", "When working with live systems without a data engineering component"],
    "marketing":   ["When the task is technical and unrelated to marketing or growth", "When no campaign, content, or audience analysis is needed"],
    "content":     ["When the task is purely technical with no documentation component", "When the user needs code rather than written content"],
    "mobile":      ["When the task targets desktop or server environments exclusively", "When no mobile-specific considerations are present"],
    "cloud":       ["When running fully on-premises with no cloud components", "When no infrastructure provisioning or cloud config is needed"],
    "workflow":    ["When a single-step or manual task is more appropriate", "When the workflow does not require multi-tool coordination"],
    "general":     ["When the task clearly falls outside the domain of this skill", "When a more specific skill is available and better suited"],
}

# ─────────────────────────────────────────────
# TEMPLATE EXAMPLES per categoria
# ─────────────────────────────────────────────
EXAMPLE_TEMPLATES = {
    "security":    [('Audit a Node.js API for OWASP Top 10 vulnerabilities', 'Review the Express routes in `src/routes/` for injection, broken auth, and insecure deserialization issues.'), ('Threat model a new microservice', 'Apply STRIDE to the payment service: identify spoofing risks on the JWT endpoint and tampering risks on the webhook handler.')],
    "frontend":    [('Build a responsive card component in React', 'Create a `<ProductCard>` component with Tailwind CSS, supporting dark mode and a loading skeleton state.'), ('Audit a landing page for accessibility', 'Check `index.html` for missing alt attributes, focus traps, and contrast ratio violations per WCAG 2.1 AA.')],
    "backend":     [('Design a REST API for user management', 'Scaffold `/users` endpoints with CRUD operations, JWT auth middleware, and rate limiting using Express and Zod validation.'), ('Optimize a slow database query', 'Profile the `/orders?status=pending` endpoint and add a composite index on `(user_id, status, created_at)`.')],
    "devops":      [('Set up a GitHub Actions CI pipeline', 'Create `.github/workflows/ci.yml` that runs lint, tests, and Docker build on every pull request.'), ('Dockerize a Python FastAPI app', 'Write a multi-stage `Dockerfile` with a slim base image and a `docker-compose.yml` for local development.')],
    "database":    [('Design a schema for a SaaS app', 'Create tables for `users`, `organizations`, `memberships`, and `audit_logs` with proper foreign keys and indexes.'), ('Write a migration to add soft deletes', 'Add a `deleted_at TIMESTAMPTZ` column to the `posts` table and update queries to filter by `deleted_at IS NULL`.')],
    "ai":          [('Build a RAG pipeline over internal docs', 'Chunk markdown files, embed with `text-embedding-3-small`, store in Pinecone, and retrieve context for a Claude completion.'), ('Evaluate prompt output quality', 'Define an eval rubric for factual accuracy, tone, and length, then run 50 samples and compute pass rates.')],
    "testing":     [('Write unit tests for a utility function', 'Test `calculateDiscount(price, coupon)` with Jest: cover valid coupon, expired coupon, zero price, and invalid input cases.'), ('Set up Playwright E2E tests for login', 'Record a login flow, assert redirect to `/dashboard`, and check the session cookie is set correctly.')],
    "data":        [('Clean a messy CSV dataset', 'Remove duplicate rows, normalize date formats to ISO 8601, fill missing `country` values from the `zip_code` column.'), ('Build a dbt model for monthly revenue', 'Create a `revenue_monthly` model that joins `orders` and `payments`, grouping by month and currency.')],
    "marketing":   [('Write ad copy for a product launch', 'Draft 3 variants of a Facebook ad for a SaaS tool launch: one benefit-focused, one pain-point-focused, one social-proof-focused.'), ('Analyze email campaign performance', 'Compare open rates, CTR, and conversions across 5 campaigns and recommend subject line improvements.')],
    "content":     [('Write a README for a CLI tool', 'Document installation, usage, flags, examples, and contribution guidelines for the `antigravity` CLI.'), ('Edit a blog post for clarity', 'Shorten sentences over 30 words, replace jargon with plain language, and add subheadings every 300 words.')],
    "mobile":      [('Build a Flutter login screen', 'Create a `LoginPage` widget with email/password fields, form validation, and a loading spinner on submit.'), ('Debug an iOS layout issue', 'Identify why the bottom tab bar overlaps content on iPhone SE and fix with `SafeAreaView` padding.')],
    "cloud":       [('Deploy a Lambda function on AWS', 'Package a Python handler, create an IAM role with least-privilege, and configure an API Gateway trigger with a custom domain.'), ('Set up a GCS bucket with lifecycle rules', 'Create a bucket, apply a 30-day transition to Nearline and 90-day deletion rule for `logs/` prefix.')],
    "workflow":    [('Automate a daily report workflow', 'Fetch data from a REST API, format it as a Markdown table, and post it to a Slack channel via webhook every morning.'), ('Orchestrate a multi-agent coding task', 'Use a planner agent to decompose a feature request, dispatch sub-tasks to specialist agents, and merge results.')],
    "general":     [('Use this skill for a domain-specific task', 'Describe your task and let the skill guide you through the appropriate steps and best practices.'), ('Get expert guidance on a complex problem', 'Share your context and constraints, and the skill will provide structured recommendations.')],
}

def get_category(fm: str) -> str:
    m = re.search(r"category:\s*['\"]?([a-z0-9_-]+)", fm)
    if m:
        cat = m.group(1)
        for key in WHEN_TEMPLATES:
            if key in cat:
                return key
    return "general"

def has_section(content: str, section: str) -> bool:
    return section.lower() in content.lower()

def insert_after_overview(content: str, new_section: str) -> str:
    """Inserisce la sezione dopo ## Overview o dopo il frontmatter se non c'è Overview"""
    # Cerca ## Overview
    m = re.search(r'(## Overview.*?)(\n## )', content, re.DOTALL)
    if m:
        pos = m.end(1)
        return content[:pos] + "\n\n" + new_section + content[pos:]
    # Altrimenti inserisci dopo il blocco frontmatter + titolo
    m2 = re.search(r'(^---\n.*?\n---\n\s*#[^\n]*\n)', content, re.DOTALL)
    if m2:
        pos = m2.end(1)
        return content[:pos] + "\n" + new_section + "\n" + content[pos:]
    return content + "\n\n" + new_section

def build_when_section(cat: str, skill_name: str, description: str) -> str:
    whens = WHEN_TEMPLATES.get(cat, WHEN_TEMPLATES["general"])
    donots = DONOT_TEMPLATES.get(cat, DONOT_TEMPLATES["general"])
    lines = ["## When to Use This Skill", ""]
    for w in whens:
        lines.append(f"- {w}")
    lines += ["", "## Do Not Use This Skill When", ""]
    for d in donots:
        lines.append(f"- {d}")
    return "\n".join(lines)

def build_examples_section(cat: str) -> str:
    examples = EXAMPLE_TEMPLATES.get(cat, EXAMPLE_TEMPLATES["general"])
    lines = ["## Examples", ""]
    for i, (title, body) in enumerate(examples, 1):
        lines += [f"### Example {i}: {title}", "", body, ""]
    return "\n".join(lines)

def fix_skill(skill: str, dry_run: bool) -> dict:
    path = os.path.join(SKILLS_DIR, skill, "SKILL.md")
    if not os.path.isfile(path):
        return {}
    content = open(path, encoding="utf-8").read()
    fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        return {}
    fm = fm_match.group(1)
    cat = get_category(fm)
    desc = re.search(r'description:\s*["\']?(.*?)["\']?\n', fm)
    desc_text = desc.group(1) if desc else skill
    changes = []

    if not has_section(content, "when to use"):
        section = build_when_section(cat, skill, desc_text)
        if not dry_run:
            content = insert_after_overview(content, section)
        changes.append("added When to Use")

    if not has_section(content, "## examples") and not has_section(content, "### example"):
        section = build_examples_section(cat)
        if not dry_run:
            content = content.rstrip() + "\n\n" + section + "\n"
        changes.append("added Examples")

    if changes and not dry_run:
        open(path, "w", encoding="utf-8").write(content)

    return {"skill": skill, "changes": changes, "cat": cat}

def main():
    dry_run = "--dry-run" in sys.argv
    limit = None
    for arg in sys.argv[1:]:
        if arg.startswith("--limit="):
            limit = int(arg.split("=")[1])

    print(f"📝 Fix Sections & Examples {'(DRY RUN)' if dry_run else ''}")
    print()

    skills = [s for s in sorted(os.listdir(SKILLS_DIR))
              if os.path.isfile(os.path.join(SKILLS_DIR, s, "SKILL.md"))]
    if limit:
        skills = skills[:limit]

    total_fixed = 0
    total_changes = 0
    for skill in skills:
        r = fix_skill(skill, dry_run)
        if r.get("changes"):
            total_fixed += 1
            total_changes += len(r["changes"])
            action = "Would fix" if dry_run else "✅ Fixed"
            print(f"  {action}: {skill} [{r['cat']}] — {', '.join(r['changes'])}")

    print()
    print(f"{'='*50}")
    print(f"  Skill {'da fixare' if dry_run else 'fixate'}: {total_fixed}")
    print(f"  Sezioni {'da aggiungere' if dry_run else 'aggiunte'}: {total_changes}")

if __name__ == "__main__":
    main()
