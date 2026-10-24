"""
Analyzer de dependencias.

Verifica: requirements.txt existe, versoes pinadas, dependencias nao usadas,
dependencias importadas mas nao listadas.
"""
from __future__ import annotations

import re
import ast
import sys
from pathlib import Path
from source_io import read_text
from typing import Any, Dict, List, Set, Tuple


def _extract_imports(source: str) -> Set[str]:
    """Extrai nomes de pacotes importados de um arquivo Python."""
    try: tree = ast.parse(source)
    except SyntaxError: return set()
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import): imports.update(x.name.split(".")[0] for x in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            imports.add(node.module.split(".")[0])
    return imports - set(sys.stdlib_module_names)


def _normalize_pkg_name(name: str) -> str:
    """Normaliza nome de pacote para comparacao (- e _ sao equivalentes)."""
    return name.lower().replace("-", "_")


def analyze(skill_data: Dict[str, Any]) -> Tuple[float, List[Dict[str, Any]]]:
    """Analisa dependencias de uma skill. Retorna (score, findings)."""
    score = 100.0
    findings: List[Dict[str, Any]] = []
    skill_name = skill_data["name"]
    skill_path = Path(skill_data["path"])

    requirements = skill_data.get("requirements", [])
    reqs_path = skill_path / "scripts" / "requirements.txt"

    # Sem requirements.txt
    if not reqs_path.exists():
        # Se nao tem Python files, nao precisa
        if skill_data.get("file_count", 0) > 0:
            findings.append({
                "skill_name": skill_name,
                "dimension": "dependencies",
                "severity": "medium",
                "category": "missing_requirements",
                "title": "requirements.txt nao encontrado",
                "recommendation": "Criar scripts/requirements.txt com todas as dependencias",
                "effort": "low",
                "impact": "medium",
            })
            score -= 15
        return max(0.0, score), findings

    # Verificar versoes pinadas
    unpinned = [r for r in requirements if not r.get("pinned")]
    if unpinned and len(requirements) > 1:
        names = ", ".join(r["name"] for r in unpinned[:5])
        findings.append({
            "skill_name": skill_name,
            "dimension": "dependencies",
            "severity": "low",
            "category": "unpinned_versions",
            "title": f"{len(unpinned)} dependencia(s) sem versao pinada",
            "description": f"Pacotes sem ==: {names}",
            "recommendation": "Pinar versoes com == para reproducibilidade (ex: pacote==<versao-revisada>)",
            "effort": "low",
            "impact": "medium",
        })
        score -= min(10, len(unpinned) * 2)

    # Verificar deps importadas vs listadas
    all_imports: Set[str] = set()
    for rel_path in skill_data.get("python_files", []):
        filepath = skill_path / rel_path
        if not filepath.exists():
            continue
        try:
            source = read_text(filepath, root=skill_path)
        except OSError:
            continue
        all_imports.update(_extract_imports(source))

    local_names = {Path(f).stem for f in skill_data.get("python_files", [])} | {"analyzers"}
    all_imports -= local_names

    listed_names = {_normalize_pkg_name(r["name"]) for r in requirements}

    # Importadas mas nao listadas (possivel dep faltando)
    # Mapear nomes de import para nomes de pacote (alguns diferem)
    import_to_pkg = {
        "PIL": "pillow",
        "cv2": "opencv_python",
        "bs4": "beautifulsoup4",
        "yaml": "pyyaml",
        "dotenv": "python_dotenv",
        "playwright": "playwright",
    }

    for imp in all_imports:
        pkg_name = _normalize_pkg_name(import_to_pkg.get(imp, imp))
        if pkg_name not in listed_names:
            findings.append({
                "skill_name": skill_name,
                "dimension": "dependencies",
                "severity": "low",
                "category": "unlisted_dependency",
                "title": f"Pacote '{imp}' importado mas nao em requirements.txt",
                "recommendation": f"Adicionar {imp} ao requirements.txt",
                "effort": "low",
                "impact": "low",
            })
            score -= 2

    return max(0.0, min(100.0, score)), findings
