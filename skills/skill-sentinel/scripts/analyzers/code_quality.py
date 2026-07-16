"""
Analyzer de qualidade de codigo.

Usa AST (stdlib) para medir complexidade ciclomatica, tamanho de funcoes,
cobertura de docstrings e padroes de error handling.
"""
from __future__ import annotations

import ast
from pathlib import Path
from typing import Any, Dict, List, Tuple

from config import (
    MAX_CYCLOMATIC_COMPLEXITY,
    MAX_FILE_LINES,
    MAX_FUNCTION_LINES,
    PENALTY_BARE_EXCEPT,
    PENALTY_BROAD_EXCEPT,
    PENALTY_HIGH_COMPLEXITY,
    PENALTY_LONG_FILE,
    PENALTY_LONG_FUNCTION,
    PENALTY_NO_DOCSTRING,
)


def _cyclomatic_complexity(node: ast.AST) -> int:
    """Calcula complexidade ciclomatica de uma funcao/metodo."""
    complexity = 1  # base
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.IfExp)):
            complexity += 1
        elif isinstance(child, (ast.For, ast.AsyncFor, ast.While)):
            complexity += 1
        elif isinstance(child, ast.ExceptHandler):
            complexity += 1
        elif isinstance(child, (ast.With, ast.AsyncWith)):
            complexity += 1
        elif isinstance(child, ast.BoolOp):
            # cada and/or adiciona um path
            complexity += len(child.values) - 1
        elif isinstance(child, ast.Assert):
            complexity += 1
    return complexity


def _check_except_patterns(node: ast.AST) -> List[Dict[str, Any]]:
    """Verifica padroes de except (bare except, broad except)."""
    issues = []
    for child in ast.walk(node):
        if isinstance(child, ast.ExceptHandler):
            if child.type is None:
                issues.append({
                    "type": "bare_except",
                    "line": child.lineno,
                    "severity": "high",
                })
            elif isinstance(child.type, ast.Name) and child.type.id == "Exception":
                # Verificar se tem logging no corpo
                has_log = False
                for stmt in ast.walk(child):
                    if isinstance(stmt, ast.Call):
                        func = stmt.func
                        if isinstance(func, ast.Attribute) and func.attr in (
                            "error", "warning", "exception", "critical"
                        ):
                            has_log = True
                            break
                        if isinstance(func, ast.Name) and func.id == "print":
                            has_log = True
                            break
                if not has_log:
                    issues.append({
                        "type": "broad_except_no_log",
                        "line": child.lineno,
                        "severity": "medium",
                    })
    return issues


def analyze(skill_data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Analisa qualidade de codigo de uma skill.
    Retorna (score, findings).
    """
    score = 100.0
    findings: List[Dict[str, Any]] = []
    skill_name = skill_data["name"]
    skill_path = Path(skill_data["path"])

    total_functions = 0
    functions_with_docs = 0

    for rel_path in skill_data.get("python_files", []):
        filepath = skill_path / rel_path
        if not filepath.exists():
            continue

        try:
            source = filepath.read_text(encoding="utf-8", errors="replace")
            tree = ast.parse(source, filename=str(filepath))
        except SyntaxError as e:
            findings.append({
                "skill_name": skill_name,
                "dimension": "code_quality",
                "severity": "high",
                "category": "syntax_error",
                "title": f"Erro de sintaxe em {rel_path}",
                "description": str(e),
                "file_path": rel_path,
                "line_number": getattr(e, "lineno", None),
                "recommendation": "Corrigir o erro de sintaxe",
                "effort": "low",
                "impact": "high",
            })
            score -= 15
            continue

        lines = source.splitlines()
        file_lines = len(lines)

        # Arquivo muito longo
        if file_lines > MAX_FILE_LINES:
            findings.append({
                "skill_name": skill_name,
                "dimension": "code_quality",
                "severity": "medium",
                "category": "long_file",
                "title": f"Arquivo longo: {rel_path} ({file_lines} linhas)",
                "description": f"Arquivo excede {MAX_FILE_LINES} linhas. Considerar dividir em modulos menores.",
                "file_path": rel_path,
                "recommendation": "Extrair funcionalidades em modulos separados",
                "effort": "medium",
                "impact": "medium",
            })
            score -= PENALTY_LONG_FILE

        # Analisar funcoes e classes
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                total_functions += 1
                func_name = node.name
                end_line = getattr(node, "end_lineno", node.lineno)
                func_lines = end_line - node.lineno + 1

                # Docstring
                has_doc = (
                    node.body
                    and isinstance(node.body[0], ast.Expr)
                    and isinstance(node.body[0].value, (ast.Constant, ast.Str))
                )
                if has_doc:
                    functions_with_docs += 1
                else:
                    if not func_name.startswith("_"):
                        score -= PENALTY_NO_DOCSTRING

                # Funcao longa
                if func_lines > MAX_FUNCTION_LINES:
                    findings.append({
                        "skill_name": skill_name,
                        "dimension": "code_quality",
                        "severity": "medium",
                        "category": "long_function",
                        "title": f"Funcao longa: {func_name} ({func_lines} linhas) em {rel_path}",
                        "file_path": rel_path,
                        "line_number": node.lineno,
                        "recommendation": f"Reduzir {func_name} para < {MAX_FUNCTION_LINES} linhas extraindo sub-funcoes",
                        "effort": "medium",
                        "impact": "medium",
                    })
                    score -= PENALTY_LONG_FUNCTION

                # Complexidade ciclomatica
                complexity = _cyclomatic_complexity(node)
                if complexity > MAX_CYCLOMATIC_COMPLEXITY:
                    findings.append({
                        "skill_name": skill_name,
                        "dimension": "code_quality",
                        "severity": "medium",
                        "category": "high_complexity",
                        "title": f"Alta complexidade: {func_name} (CC={complexity}) em {rel_path}",
                        "file_path": rel_path,
                        "line_number": node.lineno,
                        "recommendation": f"Simplificar {func_name} (CC={complexity} > {MAX_CYCLOMATIC_COMPLEXITY})",
                        "effort": "medium",
                        "impact": "medium",
                    })
                    score -= PENALTY_HIGH_COMPLEXITY

            elif isinstance(node, ast.ClassDef):
                total_functions += 1
                has_doc = (
                    node.body
                    and isinstance(node.body[0], ast.Expr)
                    and isinstance(node.body[0].value, (ast.Constant, ast.Str))
                )
                if has_doc:
                    functions_with_docs += 1

        # Padroes de except
        except_issues = _check_except_patterns(tree)
        for issue in except_issues:
            if issue["type"] == "bare_except":
                findings.append({
                    "skill_name": skill_name,
                    "dimension": "code_quality",
                    "severity": "high",
                    "category": "bare_except",
                    "title": f"Bare except em {rel_path}:{issue['line']}",
                    "file_path": rel_path,
                    "line_number": issue["line"],
                    "recommendation": "Usar except especifico (ex: except ValueError) em vez de bare except",
                    "effort": "low",
                    "impact": "high",
                })
                score -= PENALTY_BARE_EXCEPT
            elif issue["type"] == "broad_except_no_log":
                findings.append({
                    "skill_name": skill_name,
                    "dimension": "code_quality",
                    "severity": "medium",
                    "category": "broad_except",
                    "title": f"except Exception sem logging em {rel_path}:{issue['line']}",
                    "file_path": rel_path,
                    "line_number": issue["line"],
                    "recommendation": "Adicionar logging.error() ou re-raise dentro do except Exception",
                    "effort": "low",
                    "impact": "medium",
                })
                score -= PENALTY_BROAD_EXCEPT

    # Bonus/penalidade por cobertura de docstrings
    if total_functions > 0:
        doc_coverage = functions_with_docs / total_functions
        if doc_coverage < 0.3:
            findings.append({
                "skill_name": skill_name,
                "dimension": "code_quality",
                "severity": "low",
                "category": "low_docstring_coverage",
                "title": f"Baixa cobertura de docstrings ({doc_coverage:.0%})",
                "recommendation": "Adicionar docstrings em funcoes publicas para melhorar manutenibilidade",
                "effort": "low",
                "impact": "low",
            })

    return max(0.0, min(100.0, score)), findings
