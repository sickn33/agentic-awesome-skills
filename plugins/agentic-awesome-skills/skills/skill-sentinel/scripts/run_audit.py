"""
CLI principal do Sentinel: orquestra a auditoria completa do ecossistema.

Uso:
    python run_audit.py                     # Auditoria completa
    python run_audit.py --skill instagram   # Auditoria de uma skill
    python run_audit.py --recommend         # Apenas gap analysis
    python run_audit.py --compare           # Comparar com auditoria anterior
    python run_audit.py --history           # Ver historico de auditorias
    python run_audit.py --format json       # Output em JSON
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Garantir que o diretorio scripts esta no path
sys.path.insert(0, str(Path(__file__).parent))

from config import DIMENSION_WEIGHTS, get_score_label
from db import Database
from governance import SentinelGovernance
from report_generator import generate_report, save_report
from scanner import SkillScanner

# Importar analyzers
from analyzers import code_quality, security, performance
from analyzers import governance_audit, documentation, dependencies
from analyzers import cross_skill as cross_skill_analyzer
import cost_optimizer
import recommender


def _compute_overall_score(scores: Dict[str, float]) -> float:
    """Calcula score composto ponderado."""
    total = 0.0
    weight_sum = 0.0
    for dim, weight in DIMENSION_WEIGHTS.items():
        if dim in scores and scores[dim] is not None:
            total += scores[dim] * weight
            weight_sum += weight
    if weight_sum == 0:
        return 0.0
    return total / weight_sum


def _run_analyzers(skill_data: Dict[str, Any]) -> Dict[str, Any]:
    """Executa todos os analyzers em uma skill e retorna resultados."""
    results: Dict[str, Any] = {
        "scores": {},
        "findings": [],
    }

    analyzers = {
        "code_quality": code_quality.analyze,
        "security": security.analyze,
        "performance": performance.analyze,
        "governance": governance_audit.analyze,
        "documentation": documentation.analyze,
        "dependencies": dependencies.analyze,
    }

    for dim_name, analyzer_fn in analyzers.items():
        score, findings = analyzer_fn(skill_data)
        results["scores"][dim_name] = score
        results["findings"].extend(findings)

    # Cost optimizer (findings adicionais, nao eh dimensao de score)
    _, cost_findings = cost_optimizer.analyze(skill_data)
    results["findings"].extend(cost_findings)

    # Score composto
    results["overall_score"] = _compute_overall_score(results["scores"])

    return results


def run_audit(
    skill_filter: Optional[str] = None,
    include_recommendations: bool = True,
    compare_previous: bool = False,
    output_format: str = "markdown",
) -> Dict[str, Any]:
    """
    Executa auditoria completa. Retorna dict com resultados.
    """
    db = Database()
    db.init()
    gov = SentinelGovernance(db)

    scanner = SkillScanner()
    all_skills = scanner.discover_all()

    if skill_filter:
        all_skills = [s for s in all_skills if s["name"] == skill_filter]
        if not all_skills:
            return {"error": f"Skill '{skill_filter}' nao encontrada."}

    gov.log_audit_start([s["name"] for s in all_skills])

    # Criar audit run
    run_id = db.create_audit_run()

    # Analisar cada skill
    all_snapshots = []
    all_findings = []

    for skill_data in all_skills:
        results = _run_analyzers(skill_data)

        # Salvar snapshot
        snapshot = {
            "skill_name": skill_data["name"],
            "skill_path": skill_data["path"],
            "version": skill_data.get("version", ""),
            "file_count": skill_data.get("file_count", 0),
            "line_count": skill_data.get("line_count", 0),
            "overall_score": results["overall_score"],
            "code_quality": results["scores"].get("code_quality"),
            "security": results["scores"].get("security"),
            "performance": results["scores"].get("performance"),
            "governance": results["scores"].get("governance"),
            "documentation": results["scores"].get("documentation"),
            "dependencies": results["scores"].get("dependencies"),
            "raw_metrics": results["scores"],
        }
        db.insert_skill_snapshot(run_id, snapshot)
        all_snapshots.append(snapshot)

        # Salvar findings
        db.insert_findings_batch(run_id, results["findings"])
        all_findings.extend(results["findings"])

        # Score history
        for dim, score in results["scores"].items():
            db.insert_score_history(run_id, skill_data["name"], dim, score)

    # Cross-skill analysis (se mais de uma skill)
    if len(all_skills) > 1:
        cross_score, cross_findings = cross_skill_analyzer.analyze_cross_skill(all_skills)
        db.insert_findings_batch(run_id, cross_findings)
        all_findings.extend(cross_findings)

    # Recomendacoes
    all_recommendations = []
    if include_recommendations:
        all_recommendations = recommender.recommend(all_skills)
        for rec in all_recommendations:
            db.insert_recommendation(run_id, rec)
            gov.log_recommendation(rec["suggested_name"], rec.get("priority", "low"))

    # Score geral do ecossistema
    if all_snapshots:
        ecosystem_score = sum(s["overall_score"] for s in all_snapshots) / len(all_snapshots)
    else:
        ecosystem_score = 0.0

    # Dados de comparacao
    previous_snapshots = None
    if compare_previous:
        prev_run = db.get_latest_completed_run()
        if prev_run:
            previous_snapshots = db.get_snapshots_for_run(prev_run["id"])

    # Gerar relatorio
    report_content = generate_report(
        all_snapshots, all_findings, all_recommendations,
        ecosystem_score, previous_snapshots,
    )
    report_path = save_report(report_content)

    # Completar audit run
    db.complete_audit_run(run_id, len(all_skills), len(all_findings), ecosystem_score, report_path)
    gov.log_audit_complete(run_id, ecosystem_score, len(all_findings))

    result = {
        "run_id": run_id,
        "skills_scanned": len(all_skills),
        "overall_score": ecosystem_score,
        "score_label": get_score_label(ecosystem_score),
        "total_findings": len(all_findings),
        "findings_by_severity": {},
        "snapshots": all_snapshots,
        "recommendations": all_recommendations,
        "report_path": report_path,
    }

    # Contar por severidade
    for f in all_findings:
        sev = f.get("severity", "info")
        result["findings_by_severity"][sev] = result["findings_by_severity"].get(sev, 0) + 1

    return result


def show_history(db: Database) -> None:
    """Mostra historico de auditorias."""
    runs = db.get_audit_runs(10)
    if not runs:
        print("Nenhuma auditoria realizada ainda.")
        return

    print("Historico de Auditorias:")
    print("-" * 70)
    for r in runs:
        score = r.get("overall_score")
        score_str = f"{score:.0f}/100" if score else "N/A"
        print(f"  #{r['id']} | {r['started_at'][:19]} | "
              f"{r['status']:10s} | Score: {score_str} | "
              f"Skills: {r['skills_scanned']} | Findings: {r['total_findings']}")


def main():
    parser = argparse.ArgumentParser(
        description="Sentinel: Auditoria do ecossistema de skills",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python run_audit.py                     # Auditoria completa
  python run_audit.py --skill instagram   # Apenas uma skill
  python run_audit.py --recommend         # Apenas recomendacoes
  python run_audit.py --compare           # Comparar com anterior
  python run_audit.py --history           # Ver historico
  python run_audit.py --format json       # Output JSON
        """,
    )
    parser.add_argument("--skill", help="Auditar apenas esta skill")
    parser.add_argument("--recommend", action="store_true", help="Apenas gap analysis e recomendacoes")
    parser.add_argument("--compare", action="store_true", help="Comparar com auditoria anterior")
    parser.add_argument("--history", action="store_true", help="Mostrar historico de auditorias")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown", help="Formato de output")

    args = parser.parse_args()

    if args.history:
        db = Database()
        db.init()
        show_history(db)
        return

    result = run_audit(
        skill_filter=args.skill,
        include_recommendations=True,
        compare_previous=args.compare,
        output_format=args.format,
    )

    if "error" in result:
        print(f"Erro: {result['error']}", file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    else:
        # Exibir resumo no terminal
        print(f"\n{'='*60}")
        print(f"  SENTINEL - Auditoria do Ecossistema")
        print(f"{'='*60}")
        print(f"  Skills analisadas: {result['skills_scanned']}")
        print(f"  Score geral: {result['overall_score']:.0f}/100 ({result['score_label']})")
        print(f"  Total de findings: {result['total_findings']}")

        if result.get("findings_by_severity"):
            print(f"\n  Por severidade:")
            for sev in ["critical", "high", "medium", "low", "info"]:
                count = result["findings_by_severity"].get(sev, 0)
                if count:
                    print(f"    {sev:10s}: {count}")

        print(f"\n  Scores por skill:")
        for snap in result.get("snapshots", []):
            name = snap["skill_name"]
            score = snap["overall_score"]
            label = get_score_label(score)
            print(f"    {name:25s} {score:5.0f}/100 ({label})")

        if result.get("recommendations"):
            print(f"\n  Recomendacoes de novas skills ({len(result['recommendations'])}):")
            for rec in result["recommendations"][:5]:
                print(f"    [{rec.get('priority', '?'):6s}] {rec['suggested_name']}")

        print(f"\n  Relatorio completo: {result['report_path']}")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
