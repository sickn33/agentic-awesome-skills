"""
Cost Optimizer: analisa padroes que impactam consumo de tokens e custos de API.

Identifica SKILL.md muito grandes (impacto direto em tokens consumidos pelo Claude),
output verboso, oportunidades de cache, e padrao de chamadas API.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple


def analyze(skill_data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Analisa custos de uma skill. Retorna (score, findings).
    Score alto = skill eficiente em custo.
    """
    score = 100.0
    findings: List[Dict[str, Any]] = []
    skill_name = skill_data["name"]
    skill_path = Path(skill_data["path"])

    # -- 1. Tamanho do SKILL.md (impacto direto em context window) ---------------
    skill_md_lines = skill_data.get("skill_md_lines", 0)

    if skill_md_lines > 500:
        cost_impact = "alto"
        severity = "high"
        score -= 20
    elif skill_md_lines > 300:
        cost_impact = "medio"
        severity = "medium"
        score -= 10
    elif skill_md_lines > 150:
        cost_impact = "baixo"
        severity = "low"
        score -= 3
    else:
        cost_impact = None

    if cost_impact:
        # Estimar tokens: ~1.3 tokens por palavra, ~10 palavras por linha
        est_tokens = int(skill_md_lines * 10 * 1.3)
        findings.append({
            "skill_name": skill_name,
            "dimension": "cost",
            "severity": severity,
            "category": "large_skill_md",
            "title": f"SKILL.md com {skill_md_lines} linhas (~{est_tokens:,} tokens estimados)",
            "description": f"Impacto de custo {cost_impact}. Cada ativacao desta skill "
                           f"consome ~{est_tokens:,} tokens do context window.",
            "recommendation": "Mover detalhes para references/ e manter SKILL.md < 200 linhas. "
                              "Usar progressive disclosure: SKILL.md = overview, "
                              "references/ = detalhes lidos sob demanda.",
            "effort": "medium",
            "impact": "high",
        })

    # -- 2. References muito grandes ----------------------------------------------
    ref_dir = skill_path / "references"
    if ref_dir.exists():
        for ref_file in ref_dir.glob("*.md"):
            try:
                lines = len(ref_file.read_text(encoding="utf-8", errors="replace").splitlines())
            except OSError:
                continue
            if lines > 300:
                est_tokens = int(lines * 10 * 1.3)
                findings.append({
                    "skill_name": skill_name,
                    "dimension": "cost",
                    "severity": "low",
                    "category": "large_reference",
                    "title": f"Reference grande: {ref_file.name} ({lines} linhas, ~{est_tokens:,} tokens)",
                    "description": "Se carregado inteiro no contexto, consome muitos tokens.",
                    "file_path": f"references/{ref_file.name}",
                    "recommendation": "Adicionar indice/TOC no inicio. Instruir no SKILL.md "
                                      "para ler apenas secoes relevantes.",
                    "effort": "low",
                    "impact": "medium",
                })
                score -= 3

    # -- 3. Output verboso dos scripts --------------------------------------------
    for rel_path in skill_data.get("python_files", []):
        filepath = skill_path / rel_path
        if not filepath.exists():
            continue
        try:
            source = filepath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        # Contar prints verbosos
        import re
        print_count = len(re.findall(r'\bprint\s*\(', source))
        lines = len(source.splitlines())

        # Se >10% das linhas sao prints, eh verboso
        if lines > 20 and print_count > 0 and (print_count / lines) > 0.08:
            findings.append({
                "skill_name": skill_name,
                "dimension": "cost",
                "severity": "low",
                "category": "verbose_output",
                "title": f"Output verboso em {rel_path} ({print_count} prints em {lines} linhas)",
                "description": "Output excessivo consome tokens do context window quando "
                               "Claude le a saida do script.",
                "file_path": rel_path,
                "recommendation": "Usar --verbose flag ou logging levels em vez de prints fixos. "
                                  "Retornar JSON conciso por padrao.",
                "effort": "low",
                "impact": "medium",
            })
            score -= 3

    # -- 4. Verificar se scripts retornam JSON estruturado vs texto livre -----------
    has_json_output = False
    for rel_path in skill_data.get("python_files", []):
        filepath = skill_path / rel_path
        if not filepath.exists():
            continue
        try:
            source = filepath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if "json.dumps" in source or "json.dump" in source:
            has_json_output = True
            break

    if not has_json_output and skill_data.get("file_count", 0) > 3:
        findings.append({
            "skill_name": skill_name,
            "dimension": "cost",
            "severity": "low",
            "category": "no_structured_output",
            "title": "Sem output JSON estruturado",
            "description": "Scripts que retornam JSON sao mais eficientes para o Claude processar "
                           "do que texto livre.",
            "recommendation": "Adicionar opcao --json para output estruturado em scripts principais",
            "effort": "low",
            "impact": "medium",
        })
        score -= 5

    return max(0.0, min(100.0, score)), findings
