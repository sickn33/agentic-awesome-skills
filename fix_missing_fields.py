#!/usr/bin/env python3
"""
fix_missing_fields.py
Aggiunge automaticamente category, tags, tools e author mancanti
nelle skill di antigravity-awesome-skills.
Autore: Emanuele Odierna
"""

import os
import re
import sys
from datetime import date

SKILLS_DIR = "skills"
TODAY = date.today().isoformat()
DEFAULT_AUTHOR = "emanueleodierna"
DEFAULT_TOOLS = ["claude-code", "cursor", "gemini-cli", "antigravity", "codex-cli"]

# Mappa keyword → category
CATEGORY_MAP = [
    (["security", "pentest", "owasp", "attack", "hack", "vuln", "threat", "red-team", "blue-team", "firewall"], "security"),
    (["frontend", "react", "vue", "svelte", "tailwind", "css", "html", "ui", "ux", "design", "figma", "component"], "frontend"),
    (["backend", "api", "rest", "graphql", "grpc", "server", "endpoint", "microservice"], "backend"),
    (["devops", "docker", "kubernetes", "k8s", "ci", "cd", "pipeline", "deploy", "helm", "terraform", "ansible"], "devops"),
    (["database", "sql", "postgres", "mysql", "mongo", "redis", "orm", "migration", "schema"], "database"),
    (["ai", "llm", "gpt", "claude", "gemini", "openai", "anthropic", "embedding", "vector", "rag", "agent", "langchain"], "ai"),
    (["test", "testing", "tdd", "bdd", "unit", "integration", "e2e", "playwright", "jest", "pytest", "cypress"], "testing"),
    (["data", "analytics", "etl", "pipeline", "pandas", "spark", "dbt", "warehouse", "csv", "json"], "data"),
    (["marketing", "seo", "ads", "campaign", "email", "newsletter", "growth", "conversion"], "marketing"),
    (["writing", "content", "blog", "copywriting", "documentation", "docs", "readme"], "content"),
    (["mobile", "ios", "android", "flutter", "react-native", "swift", "kotlin"], "mobile"),
    (["python", "javascript", "typescript", "rust", "go", "java", "ruby", "php", "csharp", "cpp"], "development"),
    (["cloud", "aws", "gcp", "azure", "s3", "lambda", "cloudflare", "vercel", "netlify"], "cloud"),
    (["git", "github", "gitlab", "pr", "pull-request", "branch", "commit", "merge"], "git-workflow"),
    (["product", "roadmap", "sprint", "agile", "scrum", "jira", "planning", "backlog"], "product"),
    (["finance", "accounting", "invoice", "payment", "billing", "stripe"], "finance"),
    (["health", "medical", "clinical", "therapy", "wellness", "fitness", "nutrition"], "health"),
    (["legal", "contract", "compliance", "gdpr", "privacy", "law"], "legal"),
    (["orchestrat", "multi-agent", "workflow", "automation", "zap", "make", "n8n"], "workflow"),
]

TOOLS_MAP = {
    "claude": "claude-code",
    "cursor": "cursor",
    "gemini": "gemini-cli",
    "antigravity": "antigravity",
    "codex": "codex-cli",
}

def infer_category(name: str, content: str) -> str:
    text = (name + " " + content).lower()
    for keywords, cat in CATEGORY_MAP:
        if any(kw in text for kw in keywords):
            return cat
    return "general"

def infer_tags(name: str, content: str) -> list:
    text = (name + " " + content).lower()
    tags = set()
    all_keywords = []
    for keywords, cat in CATEGORY_MAP:
        all_keywords.extend(keywords)
    found = [kw for kw in all_keywords if kw in text]
    # Deduplica e prendi max 6 tag
    for kw in found:
        tags.add(kw)
        if len(tags) >= 6:
            break
    return sorted(list(tags))[:6] if tags else [name.replace("-", "_").split("_")[0]]

def infer_tools(content: str) -> list:
    text = content.lower()
    found = []
    for kw, tool in TOOLS_MAP.items():
        if kw in text and tool not in found:
            found.append(tool)
    # Sempre includi almeno claude-code
    if not found or "claude-code" not in found:
        found = ["claude-code"] + [t for t in found if t != "claude-code"]
    return found[:4]

def parse_frontmatter(content: str):
    m = re.match(r'^---\n(.*?)\n---\n?(.*)', content, re.DOTALL)
    if not m:
        return None, None
    return m.group(1), m.group(2)

def has_field(fm: str, field: str) -> bool:
    return bool(re.search(rf'^{field}[\s:]', fm, re.MULTILINE))

def add_field(fm: str, field: str, value) -> str:
    if isinstance(value, list):
        val_str = "\n" + "\n".join(f"- {v}" for v in value)
        fm += f"\n{field}:{val_str}"
    else:
        fm += f"\n{field}: '{value}'"
    return fm

def fix_skill(skill_dir: str, dry_run: bool = False) -> dict:
    path = os.path.join(SKILLS_DIR, skill_dir, "SKILL.md")
    if not os.path.isfile(path):
        return {}

    content = open(path, encoding="utf-8").read()
    fm, body = parse_frontmatter(content)
    if fm is None:
        return {"skill": skill_dir, "error": "no frontmatter"}

    changes = []
    original_fm = fm

    # Category
    if not has_field(fm, "category"):
        cat = infer_category(skill_dir, body)
        fm = add_field(fm, "category", cat)
        changes.append(f"category: {cat}")

    # Tags
    if not has_field(fm, "tags"):
        tags = infer_tags(skill_dir, body)
        fm = add_field(fm, "tags", tags)
        changes.append(f"tags: {tags}")

    # Tools
    if not has_field(fm, "tools"):
        tools = infer_tools(body)
        fm = add_field(fm, "tools", tools)
        changes.append(f"tools: {tools}")

    # Author
    if not has_field(fm, "author"):
        fm = add_field(fm, "author", DEFAULT_AUTHOR)
        changes.append(f"author: {DEFAULT_AUTHOR}")

    # Date added
    if not has_field(fm, "date_added"):
        fm = add_field(fm, "date_added", TODAY)
        changes.append(f"date_added: {TODAY}")

    if changes and not dry_run:
        new_content = f"---\n{fm}\n---\n{body}"
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)

    return {"skill": skill_dir, "changes": changes}

def main():
    dry_run = "--dry-run" in sys.argv
    limit = None
    for arg in sys.argv[1:]:
        if arg.startswith("--limit="):
            limit = int(arg.split("=")[1])

    print(f"🔧 Fix Missing Fields {'(DRY RUN)' if dry_run else ''}")
    print(f"   Skills directory: {SKILLS_DIR}")
    print()

    skills = [s for s in sorted(os.listdir(SKILLS_DIR))
              if os.path.isfile(os.path.join(SKILLS_DIR, s, "SKILL.md"))]

    if limit:
        skills = skills[:limit]

    total_fixed = 0
    total_changes = 0

    for skill in skills:
        result = fix_skill(skill, dry_run=dry_run)
        if result.get("changes"):
            total_fixed += 1
            total_changes += len(result["changes"])
            action = "Would fix" if dry_run else "Fixed"
            print(f"  ✅ {action}: {skill}")
            for c in result["changes"]:
                print(f"       + {c}")
        elif result.get("error"):
            print(f"  ❌ Error: {skill} — {result['error']}")

    print()
    print(f"{'=' * 50}")
    print(f"  Skill {'da fixare' if dry_run else 'fixate'}: {total_fixed}")
    print(f"  Campi {'da aggiungere' if dry_run else 'aggiunti'}: {total_changes}")
    if not dry_run:
        print()
        print("  💡 Prossimo step:")
        print("     npm run fix:missing-sections")
        print("     npm run sync:risk-labels")
        print("     npm run chain")

if __name__ == "__main__":
    main()
