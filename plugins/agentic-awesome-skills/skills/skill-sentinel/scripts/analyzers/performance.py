"""
Analyzer de performance.

Verifica: chamadas API sequenciais, caching, N+1 queries,
connection reuse, retry/backoff, timeouts.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


def analyze(skill_data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    """Analisa performance de uma skill. Retorna (score, findings)."""
    score = 100.0
    findings: List[Dict[str, Any]] = []
    skill_name = skill_data["name"]
    skill_path = Path(skill_data["path"])

    has_retry = False
    has_timeout = False
    has_caching = False
    has_connection_pool = False
    has_async = False
    has_concurrency = False

    api_call_files = []

    for rel_path in skill_data.get("python_files", []):
        filepath = skill_path / rel_path
        if not filepath.exists():
            continue
        try:
            source = filepath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        # Detectar patterns de performance
        if re.search(r'(?:retry|backoff|MAX_RETRIES|RETRY_BACKOFF)', source, re.I):
            has_retry = True
        if re.search(r'(?:timeout|REQUEST_TIMEOUT)', source, re.I):
            has_timeout = True
        if re.search(r'(?:cache|lru_cache|functools\.cache|_cache)', source, re.I):
            has_caching = True
        if re.search(r'(?:session|Session\(\)|httpx\.Client)', source, re.I):
            has_connection_pool = True
        if re.search(r'(?:async\s+def|asyncio|aiohttp|httpx\.AsyncClient)', source):
            has_async = True
        if re.search(r'(?:concurrent|ThreadPool|ProcessPool|asyncio\.gather|--concurrency)', source, re.I):
            has_concurrency = True

        # Contar chamadas API (requests.get/post, httpx, etc)
        api_calls = len(re.findall(
            r'(?:requests\.\w+|httpx\.\w+|self\.\w*(?:get|post|put|delete|patch))\s*\(',
            source
        ))
        if api_calls > 0:
            api_call_files.append((rel_path, api_calls))

        # Detectar N+1 patterns (loop com query SQL dentro)
        # Analise linha-a-linha para evitar backtracking em regex DOTALL
        lines = source.splitlines()
        in_for_loop = False
        for line_text in lines:
            stripped = line_text.strip()
            if stripped.startswith("for ") and stripped.endswith(":"):
                in_for_loop = True
            elif in_for_loop and stripped and not stripped[0].isspace() and not line_text[0].isspace():
                in_for_loop = False
            elif in_for_loop and re.search(r'(?:SELECT|\.execute)\s*\(', stripped):
                findings.append({
                    "skill_name": skill_name,
                    "dimension": "performance",
                    "severity": "medium",
                    "category": "n_plus_1",
                    "title": f"Possivel N+1 query em {rel_path}",
                    "description": "Loop com query SQL pode causar muitas chamadas ao banco",
                    "file_path": rel_path,
                    "recommendation": "Carregar dados em batch antes do loop",
                    "effort": "medium",
                    "impact": "high",
                })
                score -= 8
                break

        # Criar conexao dentro de loop (analise simples)
        has_connect_in_loop = False
        in_for_loop = False
        for line_text in lines:
            stripped = line_text.strip()
            if stripped.startswith("for ") and stripped.endswith(":"):
                in_for_loop = True
            elif in_for_loop and stripped and not line_text[0].isspace():
                in_for_loop = False
            elif in_for_loop and "_connect()" in stripped:
                has_connect_in_loop = True
                break

        if has_connect_in_loop:
            findings.append({
                "skill_name": skill_name,
                "dimension": "performance",
                "severity": "medium",
                "category": "connection_per_iteration",
                "title": f"Conexao criada dentro de loop em {rel_path}",
                "file_path": rel_path,
                "recommendation": "Mover _connect() para fora do loop, reutilizar conexao",
                "effort": "low",
                "impact": "high",
            })
            score -= 5

    # Verificar ausencia de boas praticas
    if not has_retry and api_call_files:
        findings.append({
            "skill_name": skill_name,
            "dimension": "performance",
            "severity": "medium",
            "category": "no_retry",
            "title": "Sem retry/backoff para chamadas API",
            "description": f"Encontradas chamadas API em {len(api_call_files)} arquivo(s) sem mecanismo de retry",
            "recommendation": "Implementar retry com exponential backoff (ex: tenacity, ou manual)",
            "effort": "medium",
            "impact": "high",
        })
        score -= 10

    if not has_timeout and api_call_files:
        findings.append({
            "skill_name": skill_name,
            "dimension": "performance",
            "severity": "medium",
            "category": "no_timeout",
            "title": "Sem timeout configurado para chamadas HTTP",
            "recommendation": "Adicionar timeout= em todas as chamadas requests/httpx",
            "effort": "low",
            "impact": "medium",
        })
        score -= 5

    if not has_connection_pool and len(api_call_files) > 2:
        findings.append({
            "skill_name": skill_name,
            "dimension": "performance",
            "severity": "low",
            "category": "no_connection_reuse",
            "title": "Sem reuso de conexoes HTTP",
            "description": "Multiplos arquivos fazem chamadas HTTP sem Session/Client compartilhado",
            "recommendation": "Usar requests.Session() ou httpx.Client() para reutilizar conexoes",
            "effort": "low",
            "impact": "medium",
        })
        score -= 3

    # Bonus
    if has_retry:
        score = min(100.0, score + 5)
    if has_async or has_concurrency:
        score = min(100.0, score + 5)
    if has_caching:
        score = min(100.0, score + 3)

    return max(0.0, min(100.0, score)), findings
