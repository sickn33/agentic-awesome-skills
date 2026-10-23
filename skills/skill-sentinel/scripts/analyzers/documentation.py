"""
Analyzer de documentacao.

Verifica completude do SKILL.md, secoes obrigatorias, frontmatter,
triggers, exemplos e cobertura de reference files.
"""
from __future__ import annotations

import re
from pathlib import Path
from source_io import read_text
from typing import Any, Dict, List, Tuple

from config import SKILL_MD_RECOMMENDED_SECTIONS, SKILL_MD_REQUIRED_SECTIONS


def _check_frontmatter(content: str) -> Dict[str, bool]:
    """Verifica presenca de campos no frontmatter YAML."""
    from scanner import _parse_yaml_frontmatter
    try: metadata = _parse_yaml_frontmatter(content)
    except ValueError: return {}
    return {key: bool(metadata.get(key)) for key in ("name", "description", "version")}


def _check_sections(content: str) -> Dict[str, bool]:
    """Verifica presenca de secoes recomendadas no corpo."""
    lower = content.lower()
    sections = {}
    section_keywords = {
        "instalacao": ["instalacao", "installation", "instalação", "setup", "pip install"],
        "comandos": ["comandos", "commands", "uso", "usage", "cli", "como usar"],
        "governanca": ["governanca", "governance", "governança", "rate limit", "audit"],
        "referencias": ["referencias", "references", "referências", "reference"],
    }
    for key, keywords in section_keywords.items():
        sections[key] = any(kw in lower for kw in keywords)
    return sections


def _check_triggers(description: str) -> Dict[str, Any]:
    """Verifica se description tem triggers adequados."""
    if not description:
        return {"has_triggers": False, "trigger_count": 0}
    # Contar palavras-chave de trigger
    words = re.findall(r'\b\w+\b', description.lower())
    return {
        "has_triggers": len(words) > 10,
        "trigger_count": len(words),
        "has_bilingual": any(w in description.lower() for w in ["use when", "use esta", "triggers on"]),
    }


def analyze(skill_data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    """Analisa documentacao de uma skill. Retorna (score, findings)."""
    score = 100.0
    findings: List[Dict[str, Any]] = []
    skill_name = skill_data["name"]
    skill_path = Path(skill_data["path"])

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "critical",
            "category": "missing_skill_md",
            "title": "SKILL.md nao encontrado",
            "recommendation": "Criar SKILL.md com frontmatter YAML e documentacao completa",
            "effort": "medium",
            "impact": "high",
        })
        return 0.0, findings

    try:
        content = read_text(skill_md, root=skill_path)
    except OSError:
        return 0.0, findings

    lines = len(content.splitlines())

    # Frontmatter
    fm = _check_frontmatter(content)
    if not fm.get("name"):
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "high",
            "category": "missing_frontmatter_name",
            "title": "Frontmatter sem campo 'name'",
            "recommendation": "Adicionar 'name: skill-name' no frontmatter YAML",
            "effort": "low",
            "impact": "high",
        })
        score -= 20

    if not fm.get("description"):
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "high",
            "category": "missing_frontmatter_description",
            "title": "Frontmatter sem campo 'description'",
            "recommendation": "Adicionar 'description:' com trigger keywords no frontmatter YAML",
            "effort": "medium",
            "impact": "high",
        })
        score -= 20

    if not fm.get("version"):
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "low",
            "category": "missing_version",
            "title": "Sem versao no frontmatter",
            "recommendation": "Adicionar version somente se o contrato do catalogo exigir; nao inventar uma versao",
            "effort": "low",
            "impact": "low",
        })
        score -= 3

    # Triggers
    desc = skill_data.get("description", "")
    trigger_info = _check_triggers(desc)
    if not trigger_info["has_triggers"]:
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "medium",
            "category": "weak_triggers",
            "title": "Description com poucas palavras-chave de trigger",
            "description": f"Apenas {trigger_info['trigger_count']} palavras. "
                           "Contagem de palavras nao comprova qualidade de ativacao; revisar escopo e exemplos.",
            "recommendation": "Expandir description com mais trigger keywords em PT-BR e EN",
            "effort": "low",
            "impact": "high",
        })
        score -= 10

    # Secoes do corpo
    sections = _check_sections(content)
    for section_key in ["instalacao", "comandos", "governanca", "referencias"]:
        if not sections.get(section_key):
            findings.append({
                "skill_name": skill_name,
                "dimension": "documentation",
                "severity": "low",
                "category": f"missing_section_{section_key}",
                "title": f"Secao '{section_key}' nao encontrada no SKILL.md",
                "recommendation": f"Adicionar secao de {section_key} no SKILL.md",
                "effort": "low",
                "impact": "low",
            })
            score -= 3

    # Reference files
    ref_files = skill_data.get("reference_files", [])
    if not ref_files and skill_data.get("has_references_dir"):
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "low",
            "category": "empty_references",
            "title": "Diretorio references/ vazio",
            "recommendation": "Adicionar documentacao de referencia em references/",
            "effort": "medium",
            "impact": "low",
        })
        score -= 5

    # SKILL.md tamanho: muito curto eh ruim
    if lines < 20:
        findings.append({
            "skill_name": skill_name,
            "dimension": "documentation",
            "severity": "medium",
            "category": "short_skill_md",
            "title": f"SKILL.md muito curto ({lines} linhas)",
            "recommendation": "Expandir SKILL.md com exemplos, workflows e detalhes de uso",
            "effort": "medium",
            "impact": "medium",
        })
        score -= 10

    return max(0.0, min(100.0, score)), findings
