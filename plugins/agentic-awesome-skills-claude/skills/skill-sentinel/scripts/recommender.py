"""
Recommender: gap analysis e sugestao de novas skills.

Analisa as capacidades existentes, identifica lacunas no ecossistema
e gera templates de SKILL.md para skills sugeridas.
"""
from __future__ import annotations

from typing import Any, Dict, List, Set

from config import CAPABILITY_TAXONOMY


def _map_capabilities(skills: List[Dict[str, Any]]) -> Dict[str, Set[str]]:
    """Mapeia cada skill para suas capacidades detectadas."""
    capability_keywords = {
        "data-extraction":    ["scraper", "extract", "crawl", "parse", "scraping"],
        "social-media":       ["instagram", "facebook", "twitter", "tiktok", "social"],
        "messaging":          ["whatsapp", "message", "dm", "chat", "sms", "telegram"],
        "government-data":    ["junta", "governo", "government", "registro", "legal"],
        "web-automation":     ["browser", "playwright", "selenium", "automation"],
        "api-integration":    ["api_client", "graph_api", "oauth", "webhook"],
        "analytics":          ["insights", "analytics", "metrics", "dashboard"],
        "content-management": ["publish", "template", "schedule", "content"],
        "monitoring":         ["monitor", "alert", "health", "sentinel"],
        "security-audit":     ["security", "audit", "governance", "compliance"],
    }

    skill_caps: Dict[str, Set[str]] = {}
    for skill in skills:
        caps: Set[str] = set()
        desc = (skill.get("description", "") + " " + skill.get("name", "")).lower()
        files = " ".join(skill.get("python_files", [])).lower()
        combined = desc + " " + files

        for cap, keywords in capability_keywords.items():
            if any(kw in combined for kw in keywords):
                caps.add(cap)

        skill_caps[skill["name"]] = caps
    return skill_caps


def _identify_gaps(covered: Set[str]) -> List[Dict[str, Any]]:
    """Identifica capacidades nao cobertas."""
    gaps = []
    for cap_id, cap_desc in CAPABILITY_TAXONOMY.items():
        if cap_id not in covered:
            gaps.append({
                "capability": cap_id,
                "description": cap_desc,
            })
    return gaps


def _generate_skill_template(name: str, description: str, capabilities: List[str]) -> str:
    """Gera um rascunho de SKILL.md para uma skill sugerida."""
    cap_list = ", ".join(capabilities)
    return f"""---
name: {name}
description: >-
  {description}
  Capacidades: {cap_list}.
version: 0.1.0
---

# Skill: {name.replace('-', ' ').title()}

## Resumo

{description}

## Estrutura Sugerida

```
{name}/
├── SKILL.md
├── scripts/
│   ├── requirements.txt
│   ├── config.py
│   ├── db.py
│   └── [modulos de features]
├── references/
│   └── [documentacao tecnica]
└── data/
    └── {name}.db
```

## Proximos Passos

1. Definir escopo detalhado e APIs necessarias
2. Criar modulos core (config, db, governance)
3. Implementar features principais
4. Adicionar testes e documentacao
"""


def _prioritize_gap(cap_id: str, all_skills: List[Dict[str, Any]]) -> str:
    """Define prioridade baseada na relevancia para o ecossistema atual."""
    high_priority = {"testing", "monitoring", "data-pipeline", "notification"}
    medium_priority = {"scheduling", "email-integration", "documentation-gen", "ci-cd"}

    if cap_id in high_priority:
        return "high"
    elif cap_id in medium_priority:
        return "medium"
    return "low"


def recommend(all_skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analisa ecossistema e retorna recomendacoes de novas skills.
    """
    recommendations: List[Dict[str, Any]] = []

    # Mapear capacidades existentes
    skill_caps = _map_capabilities(all_skills)
    all_covered = set()
    for caps in skill_caps.values():
        all_covered.update(caps)

    # Gap analysis
    gaps = _identify_gaps(all_covered)

    # Gerar recomendacoes especificas por gap
    skill_suggestions = {
        "testing": {
            "name": "skill-tester",
            "rationale": "O ecossistema nao tem infraestrutura de testes automatizados. "
                         "Um skill-tester permitiria validar todas as skills automaticamente.",
            "capabilities": ["testing", "ci-cd"],
        },
        "monitoring": {
            "name": "skill-monitor",
            "rationale": "Sem monitoramento ativo de saude das APIs e servicos externos. "
                         "Alertas proativos evitariam downtime.",
            "capabilities": ["monitoring"],
        },
        "data-pipeline": {
            "name": "data-pipeline",
            "rationale": "Multiplas skills fazem ETL (extract, transform, export) de forma isolada. "
                         "Um pipeline unificado reduziria duplicacao.",
            "capabilities": ["data-pipeline", "data-extraction"],
        },
        "notification": {
            "name": "notification-hub",
            "rationale": "Instagram e WhatsApp existem como canais isolados. "
                         "Um hub de notificacoes unificaria envio multi-canal.",
            "capabilities": ["notification", "messaging"],
        },
        "scheduling": {
            "name": "scheduler",
            "rationale": "Agendamento implementado de forma ad-hoc em skills individuais. "
                         "Um scheduler centralizado com cron-like expressions.",
            "capabilities": ["scheduling"],
        },
        "email-integration": {
            "name": "email-integration",
            "rationale": "Sem integracao com email. Util para relatorios automaticos, "
                         "alertas e comunicacao profissional.",
            "capabilities": ["email-integration", "notification"],
        },
        "documentation-gen": {
            "name": "doc-generator",
            "rationale": "Geracao automatica de documentacao a partir do codigo. "
                         "Manteria SKILL.md e references/ sempre atualizados.",
            "capabilities": ["documentation-gen"],
        },
        "database-management": {
            "name": "db-manager",
            "rationale": "Multiplas skills usam SQLite de forma independente. "
                         "Um gerenciador centralizado com migrations, backup e otimizacao.",
            "capabilities": ["database-management"],
        },
        "file-management": {
            "name": "file-manager",
            "rationale": "Gestao de arquivos (upload, download, conversao, limpeza) "
                         "util para alimentar outras skills.",
            "capabilities": ["file-management"],
        },
        "cost-optimization": {
            "name": "cost-optimizer",
            "rationale": "Analise e reducao de custos de API, tokens e recursos computacionais.",
            "capabilities": ["cost-optimization", "monitoring"],
        },
    }

    # Cross-skill recommendations baseadas em padroes detectados
    db_skills = [s for s in all_skills if s.get("has_db")]
    if len(db_skills) > 1:
        recommendations.append({
            "suggested_name": "shared-core",
            "rationale": f"Os modulos db.py, config.py e export.py sao compartilhados entre "
                         f"{len(db_skills)} skills ({', '.join(s['name'] for s in db_skills)}). "
                         f"Extrair para modulo compartilhado reduziria duplicacao.",
            "capabilities": ["database", "export", "configuration"],
            "priority": "high",
            "skill_md_draft": _generate_skill_template(
                "shared-core",
                "Modulos base compartilhados por todas as skills do ecossistema. "
                "Database, config, export, governance.",
                ["database", "export", "configuration"],
            ),
        })

    # Adicionar gaps como recomendacoes
    for gap in gaps:
        cap_id = gap["capability"]
        if cap_id in skill_suggestions:
            sugg = skill_suggestions[cap_id]
            priority = _prioritize_gap(cap_id, all_skills)
            recommendations.append({
                "suggested_name": sugg["name"],
                "rationale": sugg["rationale"],
                "capabilities": sugg["capabilities"],
                "priority": priority,
                "skill_md_draft": _generate_skill_template(
                    sugg["name"],
                    sugg["rationale"],
                    sugg["capabilities"],
                ),
            })

    # Ordenar por prioridade
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda r: priority_order.get(r.get("priority", "low"), 3))

    return recommendations
