"""
Analyzer de seguranca.

Verifica: secrets hardcoded, SQL injection, validacao de input,
HTTPS enforcement, tokens em logs, padroes de autenticacao.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

from config import SECRET_EXCEPTIONS, SECRET_PATTERNS, SQL_INJECTION_PATTERNS


def _check_secrets(source: str, rel_path: str, skill_name: str) -> List[Dict[str, Any]]:
    """Verifica patterns de secrets hardcoded."""
    findings = []
    for i, line in enumerate(source.splitlines(), 1):
        for pattern in SECRET_PATTERNS:
            if pattern.search(line):
                # Checar se eh excecao conhecida
                is_exception = any(exc in line for exc in SECRET_EXCEPTIONS)
                if is_exception:
                    continue
                findings.append({
                    "skill_name": skill_name,
                    "dimension": "security",
                    "severity": "critical",
                    "category": "hardcoded_secret",
                    "title": f"Possivel secret hardcoded em {rel_path}:{i}",
                    "description": "Credencial ou token encontrado no codigo-fonte. "
                                   "Mover para variavel de ambiente.",
                    "file_path": rel_path,
                    "line_number": i,
                    "recommendation": "Usar os.environ.get() ou arquivo .env (nao versionado)",
                    "effort": "low",
                    "impact": "high",
                })
    return findings


def _check_sql_injection(source: str, rel_path: str, skill_name: str) -> List[Dict[str, Any]]:
    """Verifica uso de f-strings/format em queries SQL."""
    findings = []
    for i, line in enumerate(source.splitlines(), 1):
        for pattern in SQL_INJECTION_PATTERNS:
            if pattern.search(line):
                findings.append({
                    "skill_name": skill_name,
                    "dimension": "security",
                    "severity": "high",
                    "category": "sql_injection",
                    "title": f"Possivel SQL injection em {rel_path}:{i}",
                    "description": "Interpolacao de string em query SQL. Usar queries parametrizadas (?)",
                    "file_path": rel_path,
                    "line_number": i,
                    "recommendation": "Substituir f-string/format por query parametrizada: cursor.execute(sql, [param])",
                    "effort": "low",
                    "impact": "high",
                })
    return findings


def _check_https(source: str, rel_path: str, skill_name: str) -> List[Dict[str, Any]]:
    """Verifica se URLs usam HTTP em vez de HTTPS."""
    findings = []
    http_pattern = re.compile(r'["\']http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)')
    for i, line in enumerate(source.splitlines(), 1):
        if http_pattern.search(line):
            findings.append({
                "skill_name": skill_name,
                "dimension": "security",
                "severity": "medium",
                "category": "insecure_http",
                "title": f"URL HTTP insegura em {rel_path}:{i}",
                "description": "Uso de HTTP em vez de HTTPS para comunicacao externa.",
                "file_path": rel_path,
                "line_number": i,
                "recommendation": "Trocar http:// por https://",
                "effort": "low",
                "impact": "medium",
            })
    return findings


def _check_token_in_logs(source: str, rel_path: str, skill_name: str) -> List[Dict[str, Any]]:
    """Verifica se tokens/secrets aparecem em print/logging."""
    findings = []
    log_pattern = re.compile(
        r'(?:print|logging\.\w+|logger\.\w+)\s*\(.*(?:token|secret|password|key|credential)',
        re.I
    )
    for i, line in enumerate(source.splitlines(), 1):
        if log_pattern.search(line):
            findings.append({
                "skill_name": skill_name,
                "dimension": "security",
                "severity": "high",
                "category": "token_in_log",
                "title": f"Possivel token em log em {rel_path}:{i}",
                "description": "Dados sensiveis podem estar sendo logados.",
                "file_path": rel_path,
                "line_number": i,
                "recommendation": "Nao logar tokens/secrets. Usar mascaramento ou remover do log.",
                "effort": "low",
                "impact": "high",
            })
    return findings


def _check_input_validation(source: str, rel_path: str, skill_name: str) -> List[Dict[str, Any]]:
    """Verifica se argumentos CLI sao validados."""
    findings = []
    # Se usa argparse mas nao tem choices/type/nargs restritivos, e warning leve
    if "argparse" in source and "add_argument" in source:
        # Verificar se ao menos alguns args tem type= ou choices=
        args_count = source.count("add_argument")
        typed_count = len(re.findall(r'add_argument\([^)]*(?:type=|choices=)', source))
        if args_count > 3 and typed_count == 0:
            findings.append({
                "skill_name": skill_name,
                "dimension": "security",
                "severity": "low",
                "category": "weak_input_validation",
                "title": f"Validacao fraca de argumentos CLI em {rel_path}",
                "description": f"{args_count} argumentos sem type= ou choices=",
                "file_path": rel_path,
                "recommendation": "Adicionar type= e choices= nos argumentos do argparse",
                "effort": "low",
                "impact": "low",
            })
    return findings


def analyze(skill_data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    """Analisa seguranca de uma skill. Retorna (score, findings)."""
    score = 100.0
    findings: List[Dict[str, Any]] = []
    skill_name = skill_data["name"]
    skill_path = Path(skill_data["path"])

    has_auth_module = False
    uses_env_vars = False

    for rel_path in skill_data.get("python_files", []):
        filepath = skill_path / rel_path
        if not filepath.exists():
            continue

        try:
            source = filepath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        if "auth" in rel_path.lower():
            has_auth_module = True
        if "os.environ" in source or "os.getenv" in source or "dotenv" in source:
            uses_env_vars = True

        # Checks
        secret_findings = _check_secrets(source, rel_path, skill_name)
        findings.extend(secret_findings)
        score -= len([f for f in secret_findings if f["severity"] == "critical"]) * 20
        score -= len([f for f in secret_findings if f["severity"] == "high"]) * 10

        sql_findings = _check_sql_injection(source, rel_path, skill_name)
        findings.extend(sql_findings)
        score -= len(sql_findings) * 15

        https_findings = _check_https(source, rel_path, skill_name)
        findings.extend(https_findings)
        score -= len(https_findings) * 5

        token_findings = _check_token_in_logs(source, rel_path, skill_name)
        findings.extend(token_findings)
        score -= len(token_findings) * 10

        input_findings = _check_input_validation(source, rel_path, skill_name)
        findings.extend(input_findings)
        score -= len(input_findings) * 2

    # Bonus por boas praticas
    if has_auth_module:
        score = min(100.0, score + 5)
    if uses_env_vars:
        score = min(100.0, score + 5)

    return max(0.0, min(100.0, score)), findings
