#!/usr/bin/env python3
"""
Skill Matching Algorithm for Agent Orchestrator.

Scores and ranks skills against a user query to determine
which agents are relevant for the current request.

Scoring:
- Skill name appears in query: +15
- Exact trigger keyword match: +10 per keyword
- Capability category match:   +5 per category
- Description word overlap:    +1 per word
- Project assignment boost:    +20 if skill is assigned to active project

Usage:
    python match_skills.py "raspar dados de um site"
    python match_skills.py "coletar precos e enviar por whatsapp"
    python match_skills.py --project myproject "query here"
"""

import json
import sys
import os
import re
import subprocess
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────

# Resolve paths relative to this script's location
_SCRIPT_DIR = Path(__file__).resolve().parent
ORCHESTRATOR_DIR = _SCRIPT_DIR.parent
SKILLS_ROOT = ORCHESTRATOR_DIR.parent
DATA_DIR = ORCHESTRATOR_DIR / "data"
REGISTRY_PATH = DATA_DIR / "registry.json"
PROJECTS_PATH = DATA_DIR / "projects.json"
SCAN_SCRIPT = _SCRIPT_DIR / "scan_registry.py"

# Capability keywords for query -> category matching (PT + EN)
CAPABILITY_KEYWORDS = {
    "data-extraction": [
        "scrape", "extract", "crawl", "parse", "harvest", "collect", "data",
        "raspar", "extrair", "coletar", "dados", "tabela", "table", "csv",
        "web data", "pull info", "get data",
    ],
    "messaging": [
        "whatsapp", "message", "send", "chat", "notify", "notification", "sms",
        "mensagem", "enviar", "notificar", "notificacao", "atendimento",
        "comunicar", "avisar",
    ],
    "social-media": [
        "instagram", "facebook", "twitter", "post", "stories", "reels",
        "social", "feed", "follower", "publicar", "rede social", "engajamento",
    ],
    "government-data": [
        "junta", "leiloeiro", "cadastro", "governo", "comercial", "tribunal",
        "diario oficial", "certidao", "registro", "uf", "estado",
    ],
    "web-automation": [
        "browser", "selenium", "playwright", "automate", "click", "fill form",
        "navegador", "automatizar", "automacao", "preencher",
    ],
    "api-integration": [
        "api", "endpoint", "webhook", "rest", "graph", "oauth", "token",
        "integracao", "integrar", "conectar",
    ],
    "analytics": [
        "insight", "analytics", "metrics", "dashboard", "report", "stats",
        "relatorio", "metricas", "analise", "estatistica",
    ],
    "content-management": [
        "publish", "schedule", "template", "content", "media", "upload",
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


# ── Functions ──────────────────────────────────────────────────────────────

def ensure_registry():
    """Run scan if registry doesn't exist."""
    if not REGISTRY_PATH.exists():
        subprocess.run(
            [sys.executable, str(SCAN_SCRIPT)],
            capture_output=True, text=True
        )


def load_registry() -> list[dict]:
    """Load skills from registry.json."""
    ensure_registry()
    if not REGISTRY_PATH.exists():
        return []
    try:
        data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        return data.get("skills", [])
    except Exception:
        return []


def load_projects() -> dict:
    """Load project assignments."""
    if not PROJECTS_PATH.exists():
        return {"projects": []}
    try:
        return json.loads(PROJECTS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"projects": []}


def get_project_skills(project_name: str) -> set:
    """Get set of skill names assigned to a project."""
    projects = load_projects()
    for p in projects.get("projects", []):
        if p.get("name", "").lower() == project_name.lower():
            return set(p.get("skills", []))
    return set()


def query_to_capabilities(query: str) -> list[str]:
    """Map a query to capability categories using word boundary matching."""
    q_lower = query.lower()
    q_words = set(re.findall(r'[a-zA-ZÀ-ÿ]+', q_lower))
    caps = []
    for cap, keywords in CAPABILITY_KEYWORDS.items():
        for kw in keywords:
            # Multi-word keywords: substring match. Single-word: exact word match.
            if " " in kw:
                if kw in q_lower:
                    caps.append(cap)
                    break
            elif kw in q_words:
                caps.append(cap)
                break
    return caps


def normalize(text: str) -> set[str]:
    """Normalize text to a set of lowercase words."""
    return set(re.findall(r'[a-zA-ZÀ-ÿ]{3,}', text.lower()))


def score_skill(skill: dict, query: str, project_skills: set = None) -> dict:
    """
    Score a skill's relevance to a query.

    Returns dict with score, reasons, and skill info.
    """
    q_lower = query.lower()
    score = 0
    reasons = []

    name = skill.get("name", "")
    description = skill.get("description", "")
    triggers = skill.get("triggers", [])
    capabilities = skill.get("capabilities", [])

    # 1. Skill name in query (+15)
    if name.lower() in q_lower or name.lower().replace("-", " ") in q_lower:
        score += 15
        reasons.append(f"name:{name}")

    # 2. Trigger keyword matches (+10 each) - word boundary matching
    q_words = set(re.findall(r'[a-zA-ZÀ-ÿ]+', q_lower))
    for trigger in triggers:
        trigger_lower = trigger.lower()
        # Multi-word triggers: substring match. Single-word: exact word match.
        if " " in trigger_lower:
            if trigger_lower in q_lower:
                score += 10
                reasons.append(f"trigger:{trigger}")
        elif trigger_lower in q_words:
            score += 10
            reasons.append(f"trigger:{trigger}")

    # 3. Capability category match (+5 each)
    query_caps = query_to_capabilities(query)
    for cap in capabilities:
        if cap in query_caps:
            score += 5
            reasons.append(f"capability:{cap}")

    # 4. Description word overlap (+1 each, max 10)
    query_words = normalize(query)
    desc_words = normalize(description)
    overlap = query_words & desc_words
    overlap_score = min(len(overlap), 10)
    if overlap_score > 0:
        score += overlap_score
        reasons.append(f"word_overlap:{overlap_score}")

    # 5. Project assignment boost (+20)
    if project_skills and name in project_skills:
        score += 20
        reasons.append("project_boost")

    return {
        "name": name,
        "score": score,
        "reasons": reasons,
        "location": skill.get("location", ""),
        "skill_md": skill.get("skill_md", ""),
        "capabilities": capabilities,
        "status": skill.get("status", "unknown"),
    }


def match(query: str, project: str = None, top_n: int = 5, threshold: int = 5) -> list[dict]:
    """
    Match a query against all registered skills.

    Returns top N skills with score >= threshold, sorted by score descending.
    """
    skills = load_registry()
    if not skills:
        return []

    project_skills = get_project_skills(project) if project else set()

    results = []
    for skill in skills:
        result = score_skill(skill, query, project_skills)
        if result["score"] >= threshold:
            results.append(result)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


# ── CLI Entry Point ────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    project = None
    query_parts = []

    i = 0
    while i < len(args):
        if args[i] == "--project" and i + 1 < len(args):
            project = args[i + 1]
            i += 2
        else:
            query_parts.append(args[i])
            i += 1

    query = " ".join(query_parts)

    if not query:
        print(json.dumps({
            "error": "No query provided",
            "usage": 'python match_skills.py "your query here"'
        }, indent=2))
        sys.exit(1)

    results = match(query, project=project)

    output = {
        "query": query,
        "project": project,
        "matched": len(results),
        "skills": results,
    }

    if len(results) == 0:
        output["recommendation"] = "No skills matched. Operate without skills or suggest creating a new one."
    elif len(results) == 1:
        output["recommendation"] = f"Single skill match: use '{results[0]['name']}' directly."
        output["action"] = "load_skill"
    else:
        output["recommendation"] = f"Multiple skills matched ({len(results)}). Use orchestration."
        output["action"] = "orchestrate"

    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
