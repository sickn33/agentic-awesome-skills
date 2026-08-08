"""
Gerencia o ACTIVE_CONTEXT.md — arquivo que é sincronizado com MEMORY.md.
Limite rígido de ~150 linhas para caber no system prompt.
"""

import shutil
from datetime import datetime
from pathlib import Path

from config import (
    ACTIVE_CONTEXT_PATH,
    MEMORY_DIR,
    MEMORY_MD_PATH,
    MAX_ACTIVE_CONTEXT_LINES,
)
from models import ActiveContext, SessionSummary, ProjectInfo, PendingTask


def load_active_context() -> ActiveContext:
    """Carrega o contexto ativo do arquivo markdown."""
    if not ACTIVE_CONTEXT_PATH.exists():
        return ActiveContext()

    text = ACTIVE_CONTEXT_PATH.read_text(encoding="utf-8")
    ctx = ActiveContext()

    # Parse simples por seções
    current_section = ""
    for line in text.splitlines():
        if line.startswith("# Contexto Ativo"):
            continue
        if line.startswith("## "):
            current_section = line[3:].strip().lower()
            continue

        stripped = line.strip()
        if not stripped or stripped.startswith("|---"):
            continue

        if current_section == "tarefas pendentes":
            if stripped.startswith("- [ ]"):
                task_text = stripped[5:].strip()
                priority = "medium"
                if "(alta)" in task_text.lower() or "(high)" in task_text.lower():
                    priority = "high"
                elif "(baixa)" in task_text.lower() or "(low)" in task_text.lower():
                    priority = "low"
                ctx.pending_tasks.append(PendingTask(
                    description=task_text,
                    priority=priority,
                ))
        elif current_section == "decisões recentes":
            if stripped.startswith("- "):
                ctx.recent_decisions.append(stripped[2:])
        elif current_section == "bloqueadores ativos":
            if stripped.startswith("- ") and stripped != "- Nenhum":
                ctx.active_blockers.append(stripped[2:])
        elif current_section == "convenções estabelecidas":
            if stripped.startswith("- "):
                ctx.conventions.append(stripped[2:])
        elif current_section.startswith("últimas sessões"):
            if stripped.startswith("- "):
                ctx.recent_sessions.append(stripped[2:])

    return ctx


def update_active_context(ctx: ActiveContext, summary: SessionSummary) -> ActiveContext:
    """Merge uma nova sessão no contexto ativo."""
    ctx.last_updated = datetime.now().strftime("%Y-%m-%d %H:%M")
    ctx.total_sessions = summary.session_number

    # Adicionar decisões novas (prefixar com número da sessão)
    for d in summary.decisions:
        entry = f"[session-{summary.session_number:03d}] {d}"
        if entry not in ctx.recent_decisions:
            ctx.recent_decisions.append(entry)

    # Manter apenas as 15 decisões mais recentes
    ctx.recent_decisions = ctx.recent_decisions[-15:]

    # Atualizar tarefas: marcar completadas, adicionar novas
    completed_descriptions = {t.lower().strip() for t in summary.tasks_completed}
    ctx.pending_tasks = [
        t for t in ctx.pending_tasks
        if t.description.lower().strip() not in completed_descriptions
    ]

    for pt in summary.tasks_pending:
        if isinstance(pt, PendingTask):
            if not any(t.description == pt.description for t in ctx.pending_tasks):
                ctx.pending_tasks.append(pt)
        elif isinstance(pt, str):
            if not any(t.description == pt for t in ctx.pending_tasks):
                ctx.pending_tasks.append(PendingTask(
                    description=pt,
                    source_session=summary.session_number,
                    created_date=summary.date,
                ))

    # Atualizar sessões recentes
    session_entry = f"session-{summary.session_number:03d}: {', '.join(summary.topics[:3])}"
    ctx.recent_sessions.append(session_entry)
    ctx.recent_sessions = ctx.recent_sessions[-5:]

    # Adicionar bloqueadores se houver
    for q in summary.open_questions:
        if q not in ctx.active_blockers:
            ctx.active_blockers.append(q)

    return ctx


def save_active_context(ctx: ActiveContext, projects: list[ProjectInfo] = None):
    """Salva ACTIVE_CONTEXT.md respeitando limite de linhas."""
    ACTIVE_CONTEXT_PATH.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        f"# Contexto Ativo — Atualizado em {now}",
        "",
    ]

    # Projetos ativos
    if projects:
        lines.append("## Projetos Ativos")
        lines.append("| Projeto | Status | Última Sessão | Próxima Ação |")
        lines.append("|---------|--------|---------------|--------------|")
        for p in projects:
            session_ref = f"session-{p.last_session:03d}" if p.last_session else "—"
            action = p.next_actions[0] if p.next_actions else "—"
            lines.append(f"| {p.name} | {p.status} | {session_ref} | {action} |")
        lines.append("")

    # Tarefas pendentes
    if ctx.pending_tasks:
        lines.append("## Tarefas Pendentes")
        high = [t for t in ctx.pending_tasks if t.priority == "high"]
        medium = [t for t in ctx.pending_tasks if t.priority == "medium"]
        low = [t for t in ctx.pending_tasks if t.priority == "low"]

        if high:
            lines.append("### Alta Prioridade")
            for t in high:
                src = f" (desde session-{t.source_session:03d})" if t.source_session else ""
                lines.append(f"- [ ] {t.description}{src}")
        if medium:
            lines.append("### Média Prioridade")
            for t in medium:
                src = f" (desde session-{t.source_session:03d})" if t.source_session else ""
                lines.append(f"- [ ] {t.description}{src}")
        if low:
            lines.append("### Baixa Prioridade")
            for t in low[:5]:  # Limitar para economizar espaço
                lines.append(f"- [ ] {t.description}")
        lines.append("")

    # Decisões recentes
    if ctx.recent_decisions:
        lines.append("## Decisões Recentes")
        for d in ctx.recent_decisions[-10:]:
            lines.append(f"- {d}")
        lines.append("")

    # Bloqueadores
    lines.append("## Bloqueadores Ativos")
    if ctx.active_blockers:
        for b in ctx.active_blockers[:5]:
            lines.append(f"- {b}")
    else:
        lines.append("- Nenhum")
    lines.append("")

    # Convenções
    if ctx.conventions:
        lines.append("## Convenções Estabelecidas")
        for c in ctx.conventions:
            lines.append(f"- {c}")
        lines.append("")

    # Últimas sessões
    if ctx.recent_sessions:
        lines.append("## Últimas Sessões")
        for s in ctx.recent_sessions:
            lines.append(f"- {s}")
        lines.append("")

    # Garantir limite de linhas
    if len(lines) > MAX_ACTIVE_CONTEXT_LINES:
        lines = lines[:MAX_ACTIVE_CONTEXT_LINES - 1]
        lines.append("*[Contexto truncado — execute `python context_manager.py maintain` para otimizar]*")

    ACTIVE_CONTEXT_PATH.write_text("\n".join(lines), encoding="utf-8")


def sync_to_memory():
    """Copia ACTIVE_CONTEXT.md para MEMORY.md no diretório de auto-memory do Claude."""
    if not ACTIVE_CONTEXT_PATH.exists():
        return

    MEMORY_DIR.mkdir(parents=True, exist_ok=True)

    # Ler conteúdo e adaptar para MEMORY.md
    content = ACTIVE_CONTEXT_PATH.read_text(encoding="utf-8")

    # Adicionar cabeçalho de referência para o agente
    header = (
        "<!-- Auto-generated by context-agent. Para detalhes: "
        "python C:\\Users\\renat\\skills\\context-agent\\scripts\\context_manager.py load -->\n\n"
    )

    MEMORY_MD_PATH.write_text(header + content, encoding="utf-8")


def check_drift() -> bool:
    """Verifica se ACTIVE_CONTEXT.md e MEMORY.md estão sincronizados."""
    if not ACTIVE_CONTEXT_PATH.exists() or not MEMORY_MD_PATH.exists():
        return True  # Drift se algum não existe

    active = ACTIVE_CONTEXT_PATH.read_text(encoding="utf-8").strip()
    memory = MEMORY_MD_PATH.read_text(encoding="utf-8").strip()

    # MEMORY.md tem header extra, então compara sem ele
    if "<!-- Auto-generated" in memory:
        memory = memory.split("-->", 1)[-1].strip()

    return active != memory
