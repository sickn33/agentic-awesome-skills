"""
Gerador de relatorios Markdown.

Produz relatorio estruturado com resumo executivo, scores por skill,
findings por severidade, recomendacoes e plano de acao.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import DIMENSION_WEIGHTS, REPORTS_DIR, SEVERITY_ORDER, get_score_label


def _severity_icon(severity: str) -> str:
    """Retorna indicador textual de severidade."""
    icons = {
        "critical": "[CRITICO]",
        "high": "[ALTO]",
        "medium": "[MEDIO]",
        "low": "[BAIXO]",
        "info": "[INFO]",
    }
    return icons.get(severity, "[?]")


def _format_score(score: Optional[float]) -> str:
    """Formata score como string."""
    if score is None:
        return "N/A"
    return f"{score:.0f}"


def generate_report(
    snapshots: List[Dict[str, Any]],
    findings: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]],
    overall_score: float,
    previous_snapshots: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Gera relatorio Markdown completo."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: List[str] = []

    # -- Header ----------------------------------------------------------------
    lines.append("# Relatorio Sentinel - Auditoria do Ecossistema de Skills")
    lines.append("")
    lines.append(f"**Data:** {now}")
    lines.append(f"**Skills Analisadas:** {len(snapshots)}")
    lines.append(f"**Score Geral:** {overall_score:.0f}/100 ({get_score_label(overall_score)})")
    lines.append("")
    lines.append("---")
    lines.append("")

    # -- Resumo Executivo (tabela) ---------------------------------------------
    lines.append("## Resumo Executivo")
    lines.append("")
    lines.append("| Skill | Score | Qualidade | Seguranca | Performance | Governanca | Docs | Deps |")
    lines.append("|-------|-------|-----------|-----------|-------------|------------|------|------|")

    for snap in sorted(snapshots, key=lambda s: -(s.get("overall_score") or 0)):
        name = snap.get("skill_name", "?")
        overall = _format_score(snap.get("overall_score"))
        cq = _format_score(snap.get("code_quality"))
        sec = _format_score(snap.get("security"))
        perf = _format_score(snap.get("performance"))
        gov = _format_score(snap.get("governance"))
        doc = _format_score(snap.get("documentation"))
        deps = _format_score(snap.get("dependencies"))
        lines.append(f"| {name} | {overall} | {cq} | {sec} | {perf} | {gov} | {doc} | {deps} |")

    lines.append("")

    # -- Tendencias (se houver dados anteriores) --------------------------------
    if previous_snapshots:
        lines.append("## Tendencias")
        lines.append("")
        prev_map = {s["skill_name"]: s for s in previous_snapshots}
        for snap in snapshots:
            name = snap.get("skill_name", "?")
            prev = prev_map.get(name)
            if prev:
                curr_score = snap.get("overall_score", 0) or 0
                prev_score = prev.get("overall_score", 0) or 0
                delta = curr_score - prev_score
                if delta > 0:
                    trend = f"+{delta:.0f} pts"
                elif delta < 0:
                    trend = f"{delta:.0f} pts"
                else:
                    trend = "sem alteracao"
                lines.append(f"- **{name}**: {prev_score:.0f} -> {curr_score:.0f} ({trend})")
        lines.append("")

    # -- Findings por Severidade ------------------------------------------------
    lines.append("## Findings por Severidade")
    lines.append("")

    # Agrupar
    by_severity: Dict[str, List[Dict[str, Any]]] = {}
    for f in findings:
        sev = f.get("severity", "info")
        by_severity.setdefault(sev, []).append(f)

    severity_labels = {
        "critical": "Criticos",
        "high": "Altos",
        "medium": "Medios",
        "low": "Baixos",
        "info": "Informativos",
    }

    for sev in ["critical", "high", "medium", "low", "info"]:
        items = by_severity.get(sev, [])
        label = severity_labels.get(sev, sev)
        lines.append(f"### {label} ({len(items)})")
        lines.append("")
        if not items:
            lines.append("Nenhum.")
            lines.append("")
            continue
        for f in items:
            skill = f.get("skill_name", "?")
            title = f.get("title", "?")
            lines.append(f"- {_severity_icon(sev)} **[{skill}]** {title}")
            if f.get("recommendation"):
                lines.append(f"  - Recomendacao: {f['recommendation']}")
            if f.get("file_path"):
                loc = f["file_path"]
                if f.get("line_number"):
                    loc += f":{f['line_number']}"
                lines.append(f"  - Local: `{loc}`")
        lines.append("")

    # -- Analise por Skill -----------------------------------------------------
    lines.append("## Analise por Skill")
    lines.append("")

    for snap in sorted(snapshots, key=lambda s: s.get("skill_name", "")):
        name = snap.get("skill_name", "?")
        overall = snap.get("overall_score", 0)
        lines.append(f"### {name} ({_format_score(overall)}/100 - {get_score_label(overall or 0)})")
        lines.append("")
        lines.append(f"- Arquivos Python: {snap.get('file_count', 0)}")
        lines.append(f"- Linhas de codigo: {snap.get('line_count', 0)}")
        lines.append(f"- Qualidade: {_format_score(snap.get('code_quality'))} | "
                     f"Seguranca: {_format_score(snap.get('security'))} | "
                     f"Performance: {_format_score(snap.get('performance'))}")
        lines.append(f"- Governanca: {_format_score(snap.get('governance'))} | "
                     f"Docs: {_format_score(snap.get('documentation'))} | "
                     f"Deps: {_format_score(snap.get('dependencies'))}")
        lines.append("")

        # Findings desta skill
        skill_findings = [f for f in findings if f.get("skill_name") == name and f.get("severity") != "info"]
        if skill_findings:
            for f in sorted(skill_findings, key=lambda x: SEVERITY_ORDER.get(x.get("severity", "info"), 9)):
                lines.append(f"  - {_severity_icon(f['severity'])} {f['title']}")
        else:
            lines.append("  Nenhum finding significativo.")
        lines.append("")

    # -- Recomendacoes de Novas Skills -----------------------------------------
    if recommendations:
        lines.append("## Recomendacoes de Novas Skills")
        lines.append("")
        for i, rec in enumerate(recommendations, 1):
            name = rec.get("suggested_name", "?")
            priority = rec.get("priority", "?")
            rationale = rec.get("rationale", "")
            caps = rec.get("capabilities", [])
            if isinstance(caps, str):
                caps = [caps]
            lines.append(f"### {i}. {name} (prioridade: {priority})")
            lines.append("")
            lines.append(f"**Razao:** {rationale}")
            lines.append("")
            if caps:
                lines.append(f"**Capacidades:** {', '.join(caps)}")
                lines.append("")

    # -- Plano de Acao Priorizado ----------------------------------------------
    lines.append("## Plano de Acao Priorizado")
    lines.append("")

    actionable = [
        f for f in findings
        if f.get("severity") in ("critical", "high", "medium") and f.get("recommendation")
    ]
    actionable.sort(key=lambda x: (
        SEVERITY_ORDER.get(x.get("severity", "info"), 9),
        {"low": 0, "medium": 1, "high": 2}.get(x.get("effort", "medium"), 1),
    ))

    if actionable:
        lines.append("| # | Severidade | Skill | Acao | Esforco |")
        lines.append("|---|-----------|-------|------|---------|")
        for i, f in enumerate(actionable[:20], 1):
            sev = f.get("severity", "?")
            skill = f.get("skill_name", "?")
            rec = f.get("recommendation", "?")[:80]
            effort = f.get("effort", "?")
            lines.append(f"| {i} | {sev} | {skill} | {rec} | {effort} |")
    else:
        lines.append("Nenhuma acao prioritaria identificada.")

    lines.append("")
    lines.append("---")
    lines.append(f"*Gerado por skill-sentinel em {now}*")

    return "\n".join(lines)


def save_report(content: str, filename: Optional[str] = None) -> str:
    """Salva relatorio em arquivo e retorna o path."""
    if not filename:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"audit_{timestamp}.md"

    filepath = REPORTS_DIR / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding="utf-8")
    return str(filepath)
