import os
import json
import re
import sys
from collections.abc import Mapping
from datetime import date, datetime

import yaml
from _project_paths import find_repo_root

# Ensure UTF-8 output for Windows compatibility
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


CATEGORY_KEYWORDS = {
    "web-engineering": [
        "react", "vue", "angular", "svelte", "nextjs", "tailwind", "frontend",
        "html", "css", "browser", "web", "dom", "accessibility", "seo",
    ],
    "backend": [
        "backend", "api", "server", "fastapi", "django", "flask", "express",
        "spring", "node", "golang", "rust", "php", "laravel",
    ],
    "database": [
        "database", "sql", "postgres", "mysql", "mongodb", "redis", "dynamodb",
        "orm", "schema", "query",
    ],
    "ai-ml": [
        "llm", "gpt", "ai", "machine learning", "deep learning", "pytorch",
        "tensorflow", "embedding", "rag", "transformer", "model",
    ],
    "cloud-devops": [
        "docker", "kubernetes", "k8s", "ci/cd", "github actions", "terraform",
        "ansible", "aws", "azure", "gcp", "deployment", "devops", "serverless",
    ],
    "security": [
        "security", "owasp", "audit", "vulnerability", "threat", "penetration",
        "authentication", "authorization", "jwt", "oauth", "compliance",
    ],
    "testing-qa": [
        "test", "testing", "pytest", "jest", "cypress", "playwright", "quality",
        "regression", "coverage", "e2e",
    ],
    "mobile": [
        "android", "ios", "react native", "flutter", "swift", "kotlin", "mobile",
    ],
    "data-engineering": [
        "etl", "pipeline", "airflow", "spark", "warehouse", "analytics", "data",
    ],
    "research": [
        "research", "manuscript", "systematic review", "meta-analysis", "grade",
        "consort", "prisma", "study",
    ],
    "bioinformatics": [
        "genomics", "proteomics", "rna", "sequencing", "variant", "phylogenetics",
        "biopython", "single-cell", "biomedical",
    ],
    "geospatial": [
        "geospatial", "gis", "spatial", "remote sensing", "raster", "vector",
    ],
    "finance": [
        "finance", "trading", "portfolio", "risk", "market", "economic", "treasury",
    ],
}

STOPWORD_TOKENS = {
    "skill", "skills", "tool", "tools", "builder", "expert", "guide", "workflow",
    "workflows", "system", "systems", "analysis", "integration", "development",
    "testing", "management", "engineer", "engineering", "automation", "framework",
    "advanced", "modern", "official", "pro", "expert", "starter", "setup", "patterns",
    "using", "with", "for", "and", "the", "a", "an", "v2", "v3", "ts", "py", "dotnet",
}


def normalize_category(value):
    """Normalize category values to lowercase kebab-case."""
    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    text = text.replace("_", "-")
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^a-z0-9-]", "", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or None


def infer_dynamic_category(skill_id):
    """
    Infer a category dynamically from skill id tokens.

    This allows new categories without a fixed allow-list.
    """
    raw_tokens = [
        token for token in re.split(r"[^a-z0-9]+", skill_id.lower()) if token
    ]
    tokens = [token for token in raw_tokens if token not in STOPWORD_TOKENS and len(token) >= 3]

    if len(tokens) >= 2 and tokens[0] in {
        "azure", "aws", "google", "github", "gitlab", "slack", "discord", "shopify",
        "wordpress", "odoo", "notion", "expo", "react", "nextjs", "kubernetes",
    }:
        category = normalize_category(f"{tokens[0]}-{tokens[1]}")
        if category:
            return category, 0.42, f"derived-from-id-prefix:{tokens[0]}-{tokens[1]}"

    if tokens:
        category = normalize_category(tokens[-1])
        if category:
            return category, 0.34, f"derived-from-id-token:{tokens[-1]}"

    return "general", 0.20, "fallback:general"


def infer_category(skill_info, metadata, body_text):
    """Infer category, confidence, and reason with deterministic priority rules."""
    explicit_category = normalize_category(metadata.get("category"))
    parent_category = normalize_category(skill_info.get("category"))

    if explicit_category and explicit_category != "uncategorized":
        return explicit_category, 1.0, "frontmatter:category"

    if parent_category and parent_category != "uncategorized":
        return parent_category, 0.95, "path:folder"

    combined_text = " ".join(
        [
            str(skill_info.get("id", "")),
            str(skill_info.get("name", "")),
            str(skill_info.get("description", "")),
            body_text,
        ]
    ).lower()

    best_category = None
    best_score = 0
    best_hits = []

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        hits = []
        for keyword in keywords:
            if re.search(r"\\b" + re.escape(keyword) + r"\\b", combined_text):
                score += 3
                hits.append(keyword)
            elif len(keyword) >= 5 and keyword in combined_text:
                score += 1
                hits.append(keyword)

        if score > best_score:
            best_category = category
            best_score = score
            best_hits = hits

    if best_category and best_score > 0:
        confidence = min(0.92, 0.45 + (0.05 * best_score))
        reason_hits = ",".join(best_hits[:3]) if best_hits else "keyword-match"
        return best_category, round(confidence, 2), f"keyword-match:{reason_hits}"

    return infer_dynamic_category(str(skill_info.get("id", "")))


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
    fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
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

def generate_index(skills_dir, output_file):
    print(f"🏗️ Generating index from: {skills_dir}")
    skills = []

    for root, dirs, files in os.walk(skills_dir):
        # Skip .disabled or hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        if "SKILL.md" in files:
            skill_path = os.path.join(root, "SKILL.md")
            dir_name = os.path.basename(root)
            parent_dir = os.path.basename(os.path.dirname(root))
            
            # Default values
            rel_path = os.path.relpath(root, os.path.dirname(skills_dir))
            # Force forward slashes for cross-platform JSON compatibility
            skill_info = {
                "id": dir_name,
                "path": rel_path.replace(os.sep, '/'),
                "category": parent_dir if parent_dir != "skills" else None,  # Will be overridden by frontmatter if present
                "category_confidence": None,
                "category_reason": None,
                "name": dir_name.replace("-", " ").title(),
                "description": "",
                "risk": "unknown",
                "source": "unknown",
                "date_added": None
            }
            
            try:
                with open(skill_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except Exception as e:
                print(f"⚠️ Error reading {skill_path}: {e}")
                continue

            # Parse Metadata
            metadata = parse_frontmatter(content)

            body = content
            fm_match = re.search(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
            if fm_match:
                body = content[fm_match.end():].strip()
            
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
            if category is not None:
                skill_info["category"] = category
            
            # Category: prefer frontmatter, then folder structure, then default
            inferred_category, confidence, reason = infer_category(skill_info, metadata, body)
            skill_info["category"] = inferred_category or "uncategorized"
            skill_info["category_confidence"] = confidence
            skill_info["category_reason"] = reason
            
            # Fallback for description if missing in frontmatter (legacy support)
            if not skill_info["description"]:
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

    # Sort validation: by name
    skills.sort(key=lambda x: (x["name"].lower(), x["id"].lower()))

    with open(output_file, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(skills, f, indent=2)
    
    print(f"✅ Generated rich index with {len(skills)} skills at: {output_file}")
    return skills

if __name__ == "__main__":
    base_dir = str(find_repo_root(__file__))
    skills_path = os.path.join(base_dir, "skills")
    output_path = os.path.join(base_dir, "skills_index.json")
    generate_index(skills_path, output_path)
