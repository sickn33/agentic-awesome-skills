"""
Registro e tracking de projetos/skills.
Mantém PROJECT_REGISTRY.md atualizado.
"""

import re
from datetime import datetime
from pathlib import Path

from config import (
    PROJECT_REGISTRY_PATH,
    SKILLS_ROOT,
    KNOWN_PROJECTS,
)
from models import ProjectInfo


def load_registry() -> list[ProjectInfo]:
    """Carrega projetos do PROJECT_REGISTRY.md."""
    if not PROJECT_REGISTRY_PATH.exists():
        return _discover_projects()

    text = PROJECT_REGISTRY_PATH.read_text(encoding="utf-8")
    projects = []
    in_table = False

    for line in text.splitlines():
        if line.startswith("|") and "Projeto" in line:
            in_table = True
            continue
        if in_table and line.startswith("|---"):
            continue
        if in_table and line.startswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) >= 4:
                projects.append(ProjectInfo(
                    name=cells[0],
                    path=cells[1] if len(cells) > 4 else "",
                    status=cells[2] if len(cells) > 4 else cells[1],
                    last_touched=cells[3] if len(cells) > 4 else cells[2],
                    last_session=_extract_session_number(cells[-1]) if cells[-1] else 0,
                    next_actions=[a.strip() for a in (cells[4] if len(cells) > 4 else cells[3]).split(";") if a.strip()],
                ))
        elif in_table and not line.strip():
            in_table = False

    return projects if projects else _discover_projects()


def _extract_session_number(text: str) -> int:
    """Extrai número de sessão de texto como 'session-005'."""
    m = re.search(r"session-(\d+)", text)
    return int(m.group(1)) if m else 0


def _discover_projects() -> list[ProjectInfo]:
    """Auto-detecta projetos a partir da estrutura de diretórios."""
    projects = []
    for name, display_name in KNOWN_PROJECTS.items():
        project_path = SKILLS_ROOT / name
        if project_path.exists() and project_path.is_dir():
            projects.append(ProjectInfo(
                name=display_name,
                path=str(project_path),
                status="active",
                last_touched=datetime.now().strftime("%Y-%m-%d"),
            ))
    return projects


def detect_projects_from_session(files_modified: list[dict], tool_calls: list[dict]) -> list[str]:
    """Detecta quais projetos foram tocados numa sessão via paths."""
    touched = set()

    # Verificar arquivos modificados
    all_paths = [f.get("path", "") for f in files_modified]

    # Verificar tool_calls com file_path
    for tc in tool_calls:
        inp = tc.get("input", {})
        if isinstance(inp, dict):
            fp = inp.get("file_path", "") or inp.get("path", "")
            if fp:
                all_paths.append(fp)

    skills_root_str = str(SKILLS_ROOT).replace("\\", "/").lower()
    for p in all_paths:
        p_norm = p.replace("\\", "/").lower()
        if skills_root_str in p_norm:
            relative = p_norm.split(skills_root_str)[-1].lstrip("/")
            top_dir = relative.split("/")[0] if "/" in relative else relative
            if top_dir in KNOWN_PROJECTS:
                touched.add(KNOWN_PROJECTS[top_dir])

    return list(touched)


def update_project(projects: list[ProjectInfo], name: str, **fields) -> list[ProjectInfo]:
    """Atualiza campos de um projeto existente ou cria novo."""
    for p in projects:
        if p.name == name:
            for k, v in fields.items():
                if hasattr(p, k):
                    setattr(p, k, v)
            return projects

    # Projeto novo
    new_project = ProjectInfo(name=name, **fields)
    projects.append(new_project)
    return projects


def save_registry(projects: list[ProjectInfo]):
    """Salva PROJECT_REGISTRY.md."""
    PROJECT_REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        f"# Registro de Projetos — Atualizado em {now}",
        "",
        "| Projeto | Status | Última Interação | Próximas Ações |",
        "|---------|--------|------------------|----------------|",
    ]
    for p in projects:
        actions = "; ".join(p.next_actions) if p.next_actions else "—"
        session_ref = f"session-{p.last_session:03d}" if p.last_session else "—"
        lines.append(
            f"| {p.name} | {p.status} | {p.last_touched} ({session_ref}) | {actions} |"
        )

    lines.append("")
    PROJECT_REGISTRY_PATH.write_text("\n".join(lines), encoding="utf-8")
