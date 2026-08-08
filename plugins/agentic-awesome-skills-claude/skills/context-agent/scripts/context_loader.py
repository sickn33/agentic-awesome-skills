"""
Carrega contexto no início de uma nova sessão.
Gera briefings de diferentes níveis de detalhe.
"""

from pathlib import Path

from config import SESSIONS_DIR, MAX_RECENT_SESSIONS
from models import SessionSummary
from active_context import load_active_context, ACTIVE_CONTEXT_PATH
from project_registry import load_registry, PROJECT_REGISTRY_PATH
from compressor import get_archive_summary


def generate_briefing() -> str:
    """Gera briefing completo para início de sessão."""
    sections = []

    # 1. Cabeçalho
    sections.append("# Briefing de Contexto")
    sections.append("")

    # 2. Contexto ativo
    ctx = load_active_context()
    if ctx.recent_sessions:
        sections.append(f"**Total de sessões registradas:** {ctx.total_sessions}")
        sections.append("")

    # 3. Projetos ativos
    projects = load_registry()
    active_projects = [p for p in projects if p.status == "active"]
    if active_projects:
        sections.append("## Projetos Ativos")
        for p in active_projects:
            session_ref = f"session-{p.last_session:03d}" if p.last_session else "—"
            actions = "; ".join(p.next_actions) if p.next_actions else "nenhuma definida"
            sections.append(f"- **{p.name}** ({p.status}) — última: {session_ref} — próxima: {actions}")
        sections.append("")

    # 4. Tarefas pendentes de alta prioridade
    high_tasks = [t for t in ctx.pending_tasks if t.priority == "high"]
    if high_tasks:
        sections.append("## Tarefas Pendentes (Alta Prioridade)")
        for t in high_tasks:
            src = f" (desde session-{t.source_session:03d})" if t.source_session else ""
            sections.append(f"- {t.description}{src}")
        sections.append("")

    # 5. Todas as tarefas pendentes
    other_tasks = [t for t in ctx.pending_tasks if t.priority != "high"]
    if other_tasks:
        sections.append("## Outras Tarefas Pendentes")
        for t in other_tasks[:10]:
            sections.append(f"- [{t.priority}] {t.description}")
        sections.append("")

    # 6. Bloqueadores
    if ctx.active_blockers:
        sections.append("## Bloqueadores Ativos")
        for b in ctx.active_blockers:
            sections.append(f"- {b}")
        sections.append("")

    # 7. Decisões recentes
    if ctx.recent_decisions:
        sections.append("## Decisões Recentes")
        for d in ctx.recent_decisions[-10:]:
            sections.append(f"- {d}")
        sections.append("")

    # 8. Convenções
    if ctx.conventions:
        sections.append("## Convenções do Projeto")
        for c in ctx.conventions:
            sections.append(f"- {c}")
        sections.append("")

    # 9. Últimas sessões (resumo)
    recent_files = _get_recent_session_files(MAX_RECENT_SESSIONS)
    if recent_files:
        sections.append("## Resumo das Últimas Sessões")
        for sf in recent_files:
            snippet = _get_session_snippet(sf)
            sections.append(snippet)
        sections.append("")

    # 10. Arquivo
    archive_info = get_archive_summary()
    if "Nenhuma" not in archive_info:
        sections.append("## Arquivo")
        sections.append(archive_info)
        sections.append("")

    return "\n".join(sections)


def get_quick_status() -> str:
    """Versão curta: projetos + pendências críticas."""
    lines = ["## Status Rápido", ""]

    projects = load_registry()
    active = [p for p in projects if p.status == "active"]
    if active:
        lines.append("**Projetos:** " + ", ".join(p.name for p in active))

    ctx = load_active_context()
    high = [t for t in ctx.pending_tasks if t.priority == "high"]
    if high:
        lines.append(f"**Pendências críticas:** {len(high)}")
        for t in high[:3]:
            lines.append(f"  - {t.description}")

    total_pending = len(ctx.pending_tasks)
    if total_pending:
        lines.append(f"**Total de pendências:** {total_pending}")

    if ctx.active_blockers:
        lines.append(f"**Bloqueadores:** {len(ctx.active_blockers)}")

    if ctx.recent_sessions:
        lines.append(f"**Última sessão:** {ctx.recent_sessions[-1]}")

    return "\n".join(lines)


def _get_recent_session_files(n: int) -> list[Path]:
    """Retorna os N arquivos de sessão mais recentes."""
    if not SESSIONS_DIR.exists():
        return []
    files = sorted(SESSIONS_DIR.glob("session-*.md"), reverse=True)
    return files[:n]


def _get_session_snippet(session_path: Path) -> str:
    """Extrai um resumo curto de um arquivo de sessão."""
    text = session_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    # Extrair cabeçalho e tópicos
    header = ""
    topics = []
    in_topics = False

    for line in lines:
        if line.startswith("# Sessão"):
            header = line.lstrip("#").strip()
        elif line.startswith("## Tópicos"):
            in_topics = True
        elif line.startswith("## ") and in_topics:
            break
        elif in_topics and line.strip().startswith("- "):
            topics.append(line.strip()[2:])

    topic_str = "; ".join(topics[:3]) if topics else "sem tópicos registrados"
    return f"- **{header}**: {topic_str}"
