"""
Analyzer cross-skill.

Identifica padroes compartilhados entre skills que poderiam ser
extraidos em modulos comuns, reducindo duplicacao.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


def analyze_cross_skill(all_skills: List[Dict[str, Any]]) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Analisa padroes cross-skill. Diferente dos outros analyzers,
    recebe TODAS as skills e retorna findings globais.
    Retorna (score_medio, findings).
    """
    findings: List[Dict[str, Any]] = []

    if len(all_skills) < 2:
        return 100.0, findings

    # -- 1. Detectar modulos duplicados (mesmo nome de arquivo em multiplas skills) ---
    module_presence: Dict[str, List[str]] = {}
    for skill in all_skills:
        for rel_path in skill.get("python_files", []):
            filename = Path(rel_path).name
            module_presence.setdefault(filename, []).append(skill["name"])

    shared_modules = {k: v for k, v in module_presence.items() if len(v) > 1}

    if shared_modules:
        for module, skills in shared_modules.items():
            if module in ("__init__.py", "requirements.txt"):
                continue
            findings.append({
                "skill_name": "cross-skill",
                "dimension": "cross_skill",
                "severity": "medium",
                "category": "duplicated_module",
                "title": f"Modulo '{module}' presente em {len(skills)} skills",
                "description": f"Skills: {', '.join(skills)}. "
                               "Potencial para extrair em modulo compartilhado.",
                "recommendation": f"Avaliar se {module} pode ser extraido para uma lib compartilhada "
                                  f"(ex: shared-core/scripts/{module})",
                "effort": "medium",
                "impact": "high",
            })

    # -- 2. Padroes de Database (mesmo pattern _connect) --------------------------
    db_skills = [s for s in all_skills if s.get("has_db")]
    if len(db_skills) > 1:
        findings.append({
            "skill_name": "cross-skill",
            "dimension": "cross_skill",
            "severity": "low",
            "category": "shared_db_pattern",
            "title": f"{len(db_skills)} skills com modulo db.py independente",
            "description": f"Skills: {', '.join(s['name'] for s in db_skills)}. "
                           "Padrao Database._connect() com WAL mode eh repetido.",
            "recommendation": "Criar classe BaseDatabase em shared-core com _connect(), "
                              "e cada skill herdar e definir apenas suas tabelas.",
            "effort": "medium",
            "impact": "medium",
        })

    # -- 3. Padroes de Config (mesmo pattern ROOT_DIR) ----------------------------
    config_skills = [s for s in all_skills if s.get("has_config")]
    if len(config_skills) > 1:
        findings.append({
            "skill_name": "cross-skill",
            "dimension": "cross_skill",
            "severity": "info",
            "category": "shared_config_pattern",
            "title": f"{len(config_skills)} skills com config.py similar",
            "description": "Padrao de paths (ROOT_DIR, DATA_DIR, etc) repetido.",
            "recommendation": "Considerar base_config.py compartilhado com paths padrao",
            "effort": "low",
            "impact": "low",
        })

    # -- 4. Skills sem governanca vs com governanca --------------------------------
    gov_skills = [s for s in all_skills if s.get("has_governance")]
    no_gov_skills = [s for s in all_skills if not s.get("has_governance")]

    if gov_skills and no_gov_skills:
        findings.append({
            "skill_name": "cross-skill",
            "dimension": "cross_skill",
            "severity": "medium",
            "category": "inconsistent_governance",
            "title": "Governanca inconsistente entre skills",
            "description": f"Com governanca: {', '.join(s['name'] for s in gov_skills)}. "
                           f"Sem governanca: {', '.join(s['name'] for s in no_gov_skills)}.",
            "recommendation": "Padronizar governanca em todas as skills. "
                              "Extrair GovernanceManager para modulo compartilhado.",
            "effort": "medium",
            "impact": "high",
        })

    # -- 5. Padroes de export (json/csv/parquet) -----------------------------------
    export_skills = []
    for skill in all_skills:
        for rel_path in skill.get("python_files", []):
            if "export" in rel_path.lower():
                export_skills.append(skill["name"])
                break

    if len(export_skills) > 1:
        findings.append({
            "skill_name": "cross-skill",
            "dimension": "cross_skill",
            "severity": "low",
            "category": "shared_export_pattern",
            "title": f"{len(export_skills)} skills com modulo de export",
            "description": f"Skills: {', '.join(export_skills)}",
            "recommendation": "Considerar export utils compartilhados (json/csv/parquet)",
            "effort": "low",
            "impact": "low",
        })

    # Score baseado na quantidade de duplicacao encontrada
    score = 100.0
    for f in findings:
        if f["severity"] == "medium":
            score -= 8
        elif f["severity"] == "low":
            score -= 3
        elif f["severity"] == "info":
            score -= 1

    return max(0.0, min(100.0, score)), findings
