"""
Scanner de skills: descobre e inventaria todas as skills do ecossistema.

Percorre os diretorios conhecidos procurando SKILL.md com frontmatter YAML,
e coleta metricas de arquivo para cada skill encontrada.

Uso:
    from scanner import SkillScanner
    scanner = SkillScanner()
    skills = scanner.discover_all()
    for s in skills:
        print(s["name"], s["path"], s["file_count"])
"""
from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import (
    IGNORE_DIRS,
    SKILL_MAX_DEPTH,
    SKILL_SEARCH_PATHS,
    SKILLS_ROOT,
)


def _parse_yaml_frontmatter(content: str) -> Dict[str, str]:
    """Extrai frontmatter YAML simples de um arquivo SKILL.md."""
    if not content.startswith("---"):
        return {}
    end = content.find("---", 3)
    if end == -1:
        return {}
    frontmatter = content[3:end].strip()
    result = {}
    for line in frontmatter.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Tratar continuacao de description com >-
        if ":" in line and not line.startswith("-") and not line.startswith(" "):
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if value == ">-" or value == ">":
                # Multi-line: coletar proximas linhas indentadas
                continue
            result[key] = value
        elif line.startswith(" ") and "description" not in result:
            # Continuacao multi-line de description
            result.setdefault("description", "")
            result["description"] += " " + line.strip()
    # Limpar description
    if "description" in result:
        result["description"] = result["description"].strip().strip('"').strip("'")
    return result


def _count_lines(filepath: Path) -> int:
    """Conta linhas de um arquivo de texto."""
    try:
        return len(filepath.read_text(encoding="utf-8", errors="replace").splitlines())
    except (OSError, UnicodeDecodeError):
        return 0


# .claude is an explicit SKILL_SEARCH_PATH so its .py files must be scanned
_PY_IGNORE_DIRS = IGNORE_DIRS - {".claude"}


def _list_python_files(directory: Path) -> List[Path]:
    """Lista todos os .py dentro de um diretorio (recursivo)."""
    result = []
    if not directory.exists():
        return result
    for p in directory.rglob("*.py"):
        if not any(part in _PY_IGNORE_DIRS for part in p.parts):
            result.append(p)
    return sorted(result)


def _extract_functions(filepath: Path) -> List[Dict[str, Any]]:
    """Extrai informacoes de funcoes/classes via AST."""
    try:
        source = filepath.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(filepath))
    except (SyntaxError, OSError):
        return []

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append({
                "name": node.name,
                "type": "async_function" if isinstance(node, ast.AsyncFunctionDef) else "function",
                "line": node.lineno,
                "end_line": getattr(node, "end_lineno", node.lineno),
                "has_docstring": (
                    isinstance(node.body[0], ast.Expr)
                    and isinstance(node.body[0].value, (ast.Constant, ast.Str))
                    if node.body else False
                ),
                "args_count": len(node.args.args),
            })
        elif isinstance(node, ast.ClassDef):
            functions.append({
                "name": node.name,
                "type": "class",
                "line": node.lineno,
                "end_line": getattr(node, "end_lineno", node.lineno),
                "has_docstring": (
                    isinstance(node.body[0], ast.Expr)
                    and isinstance(node.body[0].value, (ast.Constant, ast.Str))
                    if node.body else False
                ),
                "args_count": 0,
            })
    return functions


def _parse_requirements(skill_dir: Path) -> List[Dict[str, str]]:
    """Parse requirements.txt se existir."""
    reqs_path = skill_dir / "scripts" / "requirements.txt"
    if not reqs_path.exists():
        return []
    deps = []
    try:
        for line in reqs_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            # Parse "package==1.0" ou "package>=1.0" ou "package"
            match = re.match(r'^([a-zA-Z0-9_-]+)\s*([><=!~]+)?\s*([\d.]*)', line)
            if match:
                deps.append({
                    "name": match.group(1),
                    "version_spec": (match.group(2) or "") + (match.group(3) or ""),
                    "pinned": "==" in (match.group(2) or ""),
                })
    except OSError:
        pass
    return deps


class SkillScanner:
    """Descobre e inventaria skills no ecossistema."""

    def __init__(self, skills_root: Path = SKILLS_ROOT):
        self.skills_root = skills_root

    def discover_all(self) -> List[Dict[str, Any]]:
        """Descobre todas as skills, retornando metadados enriquecidos."""
        skill_dirs = self._find_skill_dirs()
        skills = []
        for skill_dir in skill_dirs:
            info = self._analyze_skill(skill_dir)
            if info:
                skills.append(info)
        return sorted(skills, key=lambda s: s["name"])

    def discover_skill(self, name: str) -> Optional[Dict[str, Any]]:
        """Descobre uma skill especifica pelo nome."""
        for skill in self.discover_all():
            if skill["name"] == name:
                return skill
        return None

    def _find_skill_dirs(self) -> List[Path]:
        """Encontra diretorios que contem SKILL.md."""
        found = []
        for search_path in SKILL_SEARCH_PATHS:
            if not search_path.exists():
                continue
            self._search_recursive(search_path, found, depth=0)
        # Deduplica
        seen = set()
        unique = []
        for p in found:
            resolved = p.resolve()
            if resolved not in seen:
                seen.add(resolved)
                unique.append(p)
        return unique

    def _search_recursive(self, directory: Path, found: List[Path], depth: int) -> None:
        """Busca recursiva por SKILL.md com limite de profundidade."""
        if depth > SKILL_MAX_DEPTH:
            return
        try:
            for item in sorted(directory.iterdir()):
                if not item.is_dir():
                    continue
                if item.name in IGNORE_DIRS:
                    continue
                skill_md = item / "SKILL.md"
                if skill_md.exists():
                    found.append(item)
                else:
                    self._search_recursive(item, found, depth + 1)
        except PermissionError:
            pass

    def _analyze_skill(self, skill_dir: Path) -> Optional[Dict[str, Any]]:
        """Analisa uma skill e retorna metadados completos."""
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            return None

        try:
            content = skill_md.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None

        meta = _parse_yaml_frontmatter(content)
        if not meta.get("name"):
            # Inferir nome do diretorio
            meta["name"] = skill_dir.name

        py_files = _list_python_files(skill_dir / "scripts")
        total_lines = sum(_count_lines(f) for f in py_files)

        all_functions = {}
        for f in py_files:
            funcs = _extract_functions(f)
            if funcs:
                all_functions[str(f.relative_to(skill_dir))] = funcs

        ref_dir = skill_dir / "references"
        ref_files = sorted(ref_dir.glob("*.md")) if ref_dir.exists() else []

        deps = _parse_requirements(skill_dir)

        return {
            "name": meta.get("name", skill_dir.name),
            "path": str(skill_dir),
            "version": meta.get("version", ""),
            "description": meta.get("description", ""),
            "skill_md_path": str(skill_md),
            "skill_md_lines": _count_lines(skill_md),
            "python_files": [str(f.relative_to(skill_dir)) for f in py_files],
            "file_count": len(py_files),
            "line_count": total_lines,
            "functions": all_functions,
            "requirements": deps,
            "reference_files": [str(f.relative_to(skill_dir)) for f in ref_files],
            "has_scripts_dir": (skill_dir / "scripts").is_dir(),
            "has_references_dir": ref_dir.is_dir(),
            "has_data_dir": (skill_dir / "data").is_dir(),
            "has_governance": any("governance" in f.name for f in py_files),
            "has_db": any("db" in f.name for f in py_files),
            "has_config": any("config" in f.name for f in py_files),
        }


# -- CLI -----------------------------------------------------------------------
if __name__ == "__main__":
    import json
    scanner = SkillScanner()
    skills = scanner.discover_all()
    print(f"Skills encontradas: {len(skills)}\n")
    for s in skills:
        print(f"  {s['name']} (v{s['version'] or '?'})")
        print(f"    Path: {s['path']}")
        print(f"    Files: {s['file_count']} Python ({s['line_count']} lines)")
        print(f"    Refs: {len(s['reference_files'])} docs")
        print(f"    Gov: {'sim' if s['has_governance'] else 'nao'} | "
              f"DB: {'sim' if s['has_db'] else 'nao'} | "
              f"Config: {'sim' if s['has_config'] else 'nao'}")
        print()
