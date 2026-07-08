"""
Analyzers: modulos de analise por dimensao.

Cada analyzer recebe os dados de uma skill (do scanner) e retorna:
- score (0-100)
- findings (lista de problemas/recomendacoes)
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

# Tipo padrao para resultado de um analyzer
AnalyzerResult = Tuple[float, List[Dict[str, Any]]]
