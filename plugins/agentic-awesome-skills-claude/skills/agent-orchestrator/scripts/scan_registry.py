#!/usr/bin/env python3
"""
Auto-Discovery Engine for Agent Orchestrator.

Scans the skills ecosystem for SKILL.md files, parses metadata,
and maintains a centralized registry (registry.json).

Features:
- Runs only when explicitly invoked
- Uses SHA-256 metadata caching; timing depends on tree size
- Auto-includes new skills, auto-removes deleted skills
- Zero manual intervention required

Usage:
    python scan_registry.py              # Quick scan (hash-based)
    python scan_registry.py --status     # Verbose status table
    python scan_registry.py --force      # Full re-scan ignoring hashes
"""

import os
import sys
import json
import hashlib
import re
import tempfile
import argparse
from pathlib import Path
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────────────────

# Resolve paths relative to this script's location
_SCRIPT_DIR = Path(__file__).resolve().parent
ORCHESTRATOR_DIR = _SCRIPT_DIR.parent
SKILLS_ROOT = ORCHESTRATOR_DIR.parent
_data_directory = os.environ.get("AGENT_ORCHESTRATOR_DATA_DIR")
if not _data_directory or not Path(_data_directory).is_absolute():
    raise ValueError("Set AGENT_ORCHESTRATOR_DATA_DIR to an authorized absolute storage directory")
DATA_DIR = Path(_data_directory)
if any(path.is_symlink() for path in [DATA_DIR, *DATA_DIR.parents]):
    raise ValueError("Storage directory and ancestors must not be symlinks")
REGISTRY_PATH = DATA_DIR / "registry.json"
HASHES_PATH = DATA_DIR / "registry_hashes.json"

# Where to search for SKILL.md files
SEARCH_PATHS = [
    SKILLS_ROOT / ".claude" / "skills",   # registered skills
    SKILLS_ROOT,                           # top-level standalone
]
MAX_DEPTH = 3  # max directory depth for SKILL.md search

# Capability keyword mapping (PT + EN)
CAPABILITY_MAP = {
    "data-extraction": [
        "scrape", "extract", "crawl", "parse", "harvest", "collect",
        "raspar", "extrair", "coletar", "dados",
    ],
    "messaging": [
        "whatsapp", "message", "send", "chat", "notification", "sms",
        "mensagem", "enviar", "notificacao", "atendimento",
    ],
    "social-media": [
        "instagram", "facebook", "twitter", "post", "stories", "reels",
        "social", "engagement", "feed", "follower",
    ],
    "government-data": [
        "junta", "leiloeiro", "cadastro", "governo", "comercial",
        "tribunal", "diario oficial", "certidao", "registro",
    ],
    "web-automation": [
        "browser", "selenium", "playwright", "automate", "click",
        "navegador", "automatizar", "automacao",
    ],
    "api-integration": [
        "api", "endpoint", "webhook", "rest", "graph", "oauth",
        "integracao", "integrar",
    ],
    "analytics": [
        "insight", "analytics", "metrics", "dashboard", "report",
        "relatorio", "metricas", "analise",
    ],
    "content-management": [
        "publish", "schedule", "template", "content", "media",
        "publicar", "agendar", "conteudo", "midia",
    ],
    "legal": [
        "advogado", "direito", "juridico", "lei", "processo",
        "acao", "peticao", "recurso", "sentenca", "juiz",
        "divorcio", "guarda", "alimentos", "pensao", "alimenticia", "inventario", "heranca", "partilha",
        "acidente de trabalho", "acidente",
        "familia", "criminal", "penal", "crime", "feminicidio", "maria da penha",
        "violencia domestica", "medida protetiva", "stalking",
        "danos morais", "responsabilidade civil", "indenizacao", "dano",
        "consumidor", "cdc", "plano de saude",
        "trabalhista", "clt", "rescisao", "fgts", "horas extras",
        "previdenciario", "aposentadoria", "aposentar", "inss",
        "imobiliario", "usucapiao", "despejo", "inquilinato",
        "alienacao fiduciaria", "bem de familia",
        "tributario", "imposto", "icms", "execucao fiscal",
        "administrativo", "licitacao", "improbidade", "mandado de seguranca",
        "empresarial", "societario", "falencia", "recuperacao judicial",
        "empresa", "ltda", "cnpj", "mei", "eireli", "contrato social",
        "contrato", "clausula", "contestacao", "apelacao", "agravo",
        "habeas corpus", "mandado", "liminar", "tutela",
        "cpc", "stj", "stf", "sumula", "jurisprudencia",
        "oab", "honorarios", "custas",
    ],
    "auction": [
        "leilao", "leilao judicial", "leilao extrajudicial", "hasta publica",
        "arrematacao", "arrematar", "arrematante", "lance", "desagio",
        "edital leilao", "penhora", "adjudicacao", "praca",
        "imissao na posse", "carta arrematacao", "vil preco",
        "avaliacao imovel", "laudo", "perito", "matricula",
        "leiloeiro", "comissao leiloeiro",
    ],
    "security": [
        "seguranca", "security", "owasp", "vulnerability", "incident",
        "pentest", "firewall", "malware", "phishing", "cve",
        "autenticacao", "criptografia", "encryption",
    ],
    "image-generation": [
        "imagem", "image", "gerar imagem", "generate image",
        "stable diffusion", "comfyui", "midjourney", "dall-e",
        "foto", "ilustracao", "arte", "design",
    ],
    "monitoring": [
        "monitor", "monitorar", "health", "status",
        "audit", "auditoria", "sentinel", "check",
    ],
    "context-management": [
        "contexto", "context", "sessao", "session", "compactacao", "compaction",
        "comprimir", "compress", "snapshot", "checkpoint", "briefing",
        "continuidade", "continuity", "preservar", "preserve",
        "memoria", "memory", "resumo", "summary",
        "salvar estado", "save state", "context window", "janela de contexto",
        "perda de dados", "data loss", "backup",
    ],
}

# ── Utility Functions ──────────────────────────────────────────────────────

def sha256_file(path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_yaml_frontmatter(path: Path) -> dict:
    """Extract YAML frontmatter from a SKILL.md file."""
    text = path.read_text(encoding="utf-8")

    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}

    import yaml  # required dependency; do not approximate malformed YAML
    metadata = yaml.safe_load(match.group(1)) or {}
    if not isinstance(metadata, dict):
        raise ValueError("Skill frontmatter must be a mapping")
    return metadata


def find_skill_files() -> list[Path]:
    """Find all SKILL.md files in the ecosystem."""
    found = set()

    for base in SEARCH_PATHS:
        if not base.exists():
            continue
        def fail_walk(error):
            raise error
        for root, dirs, files in os.walk(base, onerror=fail_walk):
            depth = len(Path(root).relative_to(base).parts)
            if depth > MAX_DEPTH:
                dirs.clear()
                continue

            # Skip the orchestrator itself
            if Path(root).resolve() == ORCHESTRATOR_DIR:
                dirs.clear()
                continue

            if "SKILL.md" in files:
                candidate = Path(root) / "SKILL.md"
                if candidate.is_symlink():
                    raise ValueError("Refusing symlink skill entrypoint")
                if candidate.stat().st_size > 1024 * 1024:
                    raise ValueError("Skill entrypoint exceeds 1 MiB")
                found.add(candidate)
                if len(found) > 10000:
                    raise ValueError("Scan exceeds 10000 entrypoints")

    return sorted(found)


def detect_language(skill_dir: Path) -> str:
    """Detect primary language from scripts/ directory."""
    scripts_dir = skill_dir / "scripts"
    if not scripts_dir.exists():
        return "none"

    extensions = set()
    for f in scripts_dir.rglob("*"):
        if f.is_file():
            extensions.add(f.suffix.lower())

    if ".py" in extensions:
        return "python"
    if extensions & {".ts", ".js", ".mjs", ".cjs", ".tsx", ".jsx"}:
        return "nodejs"
    if ".sh" in extensions:
        return "bash"
    return "none"


def extract_capabilities(description: str) -> list[str]:
    """Map description keywords to capability tags using word boundary matching."""
    if not description:
        return []

    desc_lower = description.lower()
    desc_words = set(re.findall(r'[a-zA-ZÀ-ÿ]+', desc_lower))
    caps = []
    for cap, keywords in CAPABILITY_MAP.items():
        for kw in keywords:
            # Multi-word keywords: substring match. Single-word: exact word match.
            if " " in kw:
                if kw in desc_lower:
                    caps.append(cap)
                    break
            elif kw in desc_words:
                caps.append(cap)
                break
    return sorted(caps)


def extract_triggers(description: str) -> list[str]:
    """Extract trigger keywords from description text using word boundary matching."""
    if not description:
        return []

    # Collect all keywords from all capability categories
    all_keywords = set()
    for keywords in CAPABILITY_MAP.values():
        all_keywords.update(keywords)

    desc_lower = description.lower()
    desc_words = set(re.findall(r'[a-zA-ZÀ-ÿ]+', desc_lower))
    found = []
    for kw in sorted(all_keywords):
        if " " in kw:
            if kw in desc_lower:
                found.append(kw)
        elif kw in desc_words:
            found.append(kw)
    return found


def assess_status(skill_dir: Path) -> str:
    """Check if skill is complete (active) or incomplete."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return "missing"

    has_scripts = (skill_dir / "scripts").exists()
    has_refs = (skill_dir / "references").exists()

    # Parse frontmatter to check for required fields
    meta = parse_yaml_frontmatter(skill_md)
    has_name = bool(meta.get("name"))
    has_desc = bool(meta.get("description"))

    if has_name and has_desc:
        return "active"
    return "incomplete"


def is_registered(skill_dir: Path) -> bool:
    """Check if skill is in .claude/skills/."""
    claude_skills = SKILLS_ROOT / ".claude" / "skills"
    try:
        skill_dir.relative_to(claude_skills)
        return True
    except ValueError:
        return False


# ── Main Logic ─────────────────────────────────────────────────────────────

def read_cache(path: Path, default: dict) -> dict:
    if path.is_symlink():
        raise ValueError("Cache file must not be a symlink")
    if not path.exists():
        return default
    if path.stat().st_size > 16 * 1024 * 1024:
        raise ValueError("Cache exceeds 16 MiB")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Cache must be a JSON object")
    return data


def write_cache(path: Path, data: dict):
    # Caller chooses private storage; refuse existing linked ancestors/targets.
    for ancestor in [DATA_DIR, *DATA_DIR.parents]:
        if ancestor.is_symlink():
            raise ValueError("Storage ancestors must not be symlinks")
    DATA_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    if path.is_symlink():
        raise ValueError("Cache target must not be a symlink")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=DATA_DIR,
                                         prefix=".registry-", delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(data, stream, indent=2, ensure_ascii=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def load_hashes() -> dict:
    data = read_cache(HASHES_PATH, {})
    if any(not isinstance(k, str) or not isinstance(v, str) for k, v in data.items()):
        raise ValueError("Hash cache entries must be strings")
    return data


def save_hashes(hashes: dict):
    write_cache(HASHES_PATH, hashes)


def load_registry() -> dict:
    data = read_cache(REGISTRY_PATH, {"generated_at": None, "skills_root": str(SKILLS_ROOT), "skills": []})
    if not isinstance(data.get("skills"), list) or any(not isinstance(v, dict) for v in data["skills"]):
        raise ValueError("Registry skills must be objects")
    return data


def save_registry(registry: dict):
    registry["generated_at"] = datetime.now().isoformat()
    write_cache(REGISTRY_PATH, registry)


def build_skill_entry(skill_md_path: Path) -> dict:
    """Build a registry entry from a SKILL.md file."""
    skill_dir = skill_md_path.parent
    meta = parse_yaml_frontmatter(skill_md_path)
    name = meta.get("name", skill_dir.name)
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Skill name must be a nonempty string")
    description = meta.get("description", "")
    if not isinstance(description, str):
        raise ValueError("Skill description must be a string")

    # Support explicit capabilities in frontmatter
    explicit_caps = meta.get("capabilities", [])
    if isinstance(explicit_caps, str):
        explicit_caps = [c.strip() for c in explicit_caps.split(",")]

    if not isinstance(explicit_caps, list) or any(not isinstance(c, str) for c in explicit_caps):
        raise ValueError("Capabilities must be strings")

    auto_caps = extract_capabilities(description)
    all_caps = sorted(set(auto_caps + explicit_caps))

    return {
        "name": name,
        "description": description,
        "version": meta.get("version", ""),
        "location": str(skill_dir),
        "skill_md": str(skill_md_path),
        "registered": is_registered(skill_dir),
        "has_scripts": (skill_dir / "scripts").exists(),
        "has_references": (skill_dir / "references").exists(),
        "has_data": (skill_dir / "data").exists(),
        "capabilities": all_caps,
        "triggers": extract_triggers(description),
        "language": detect_language(skill_dir),
        "status": assess_status(skill_dir),
        "last_modified": datetime.fromtimestamp(
            skill_md_path.stat().st_mtime
        ).isoformat(),
    }


def scan(force: bool = False) -> dict:
    """
    Main scan function.

    With hash caching:
    1. Find all SKILL.md files
    2. Compare SHA-256 hashes with stored values
    3. Only re-parse files that changed, were added, or removed
    4. Update registry incrementally
    """
    current_files = find_skill_files()
    current_paths = {str(f): f for f in current_files}

    stored_hashes = load_hashes()
    registry = load_registry()

    # Build lookup of existing registry entries by skill_md path
    existing_by_path = {}
    for entry in registry.get("skills", []):
        existing_by_path[entry.get("skill_md", "")] = entry

    registry["complete_inventory"] = False
    registry["coverage"] = {"max_depth": MAX_DEPTH, "roots": [str(p) for p in SEARCH_PATHS], "metadata_only": True}

    # Compute current hashes
    new_hashes = {}
    changed = False

    for path_str, path_obj in current_paths.items():
        current_hash = sha256_file(path_obj)
        new_hashes[path_str] = current_hash

        if force or path_str not in existing_by_path or path_str not in stored_hashes or stored_hashes[path_str] != current_hash:
            # New or modified - rebuild entry
            entry = build_skill_entry(path_obj)
            existing_by_path[path_str] = entry
            changed = True

    # Detect removed skills
    for old_path in list(existing_by_path.keys()):
        if old_path not in current_paths and old_path != "":
            del existing_by_path[old_path]
            changed = True

    # Check if file set changed (additions/removals)
    if set(new_hashes.keys()) != set(stored_hashes.keys()):
        changed = True

    # Preserve distinct paths even when names coincide; names are not identities.
    if changed or not REGISTRY_PATH.exists():
        registry["skills"] = sorted(existing_by_path.values(), key=lambda s: s.get("skill_md", ""))
        save_registry(registry)
        save_hashes(new_hashes)
        return registry
    else:
        # Nothing changed, return existing
        return registry


def print_status(registry: dict):
    """Print a formatted status table."""
    skills = registry.get("skills", [])

    if not skills:
        print("No skills found in the ecosystem.")
        return

    print(f"\n{'='*80}")
    print(f"  Agent Orchestrator - Skill Registry Status")
    print(f"  Scanned at: {registry.get('generated_at', 'N/A')}")
    print(f"  Root: {registry.get('skills_root', 'N/A')}")
    print(f"{'='*80}\n")

    # Header
    print(f"  {'Name':<22} {'Status':<12} {'Lang':<10} {'Registered':<12} {'Capabilities'}")
    print(f"  {'-'*22} {'-'*12} {'-'*10} {'-'*12} {'-'*30}")

    for s in sorted(skills, key=lambda x: x.get("name", "")):
        name = s.get("name", "?")[:20]
        status = s.get("status", "?")
        lang = s.get("language", "none")
        reg = "Yes" if s.get("registered") else "No"
        caps = ", ".join(s.get("capabilities", []))[:30]
        print(f"  {name:<22} {status:<12} {lang:<10} {reg:<12} {caps}")

    print(f"\n  Total: {len(skills)} skills")

    # Recommendations
    unregistered = [s for s in skills if not s.get("registered")]
    incomplete = [s for s in skills if s.get("status") == "incomplete"]

    if unregistered:
        print(f"\n  [!] {len(unregistered)} skill(s) not registered in .claude/skills/:")
        for s in unregistered:
            print(f"      - {s['name']} ({s['location']})")

    if incomplete:
        print(f"\n  [!] {len(incomplete)} skill(s) with incomplete status:")
        for s in incomplete:
            print(f"      - {s['name']} ({s['location']})")

    print()


# ── CLI Entry Point ────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scan bounded local skill metadata")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args()
    force = args.force
    show_status = args.status

    registry = scan(force=force)

    if show_status:
        print_status(registry)
    else:
        # Default: output JSON summary for Claude to parse
        skills = registry.get("skills", [])
        summary = {
            "complete_inventory": False,
            "coverage": "Explicit local roots, bounded depth; metadata only",
            "total": len(skills),
            "active": len([s for s in skills if s.get("status") == "active"]),
            "incomplete": len([s for s in skills if s.get("status") == "incomplete"]),
            "skills": [
                {
                    "name": s.get("name"),
                    "status": s.get("status"),
                    "capabilities": s.get("capabilities", []),
                }
                for s in skills
            ],
        }
        print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
