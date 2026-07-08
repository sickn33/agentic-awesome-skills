"""
Gerador de resumos estruturados de sessão.
Analisa mensagens e gera session-NNN.md.
"""

import re
from datetime import datetime
from pathlib import Path

from config import (
    SESSIONS_DIR,
    DECISION_MARKERS,
    PENDING_MARKERS,
)
from models import SessionSummary, PendingTask, SessionEntry


def get_next_session_number() -> int:
    """Retorna o próximo número de sessão disponível."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    existing = list(SESSIONS_DIR.glob("session-*.md"))
    if not existing:
        return 1
    numbers = []
    for f in existing:
        try:
            num = int(f.stem.split("-")[1])
            numbers.append(num)
        except (IndexError, ValueError):
            continue
    return max(numbers) + 1 if numbers else 1


def generate_summary(
    entries: list[SessionEntry],
    session_number: int,
    metadata: dict,
) -> SessionSummary:
    """Gera um resumo estruturado a partir das entradas da sessão."""
    user_messages = [e.content for e in entries if e.role == "user" and e.content.strip()]
    assistant_messages = [e.content for e in entries if e.role == "assistant" and e.content.strip()]
    all_messages = user_messages + assistant_messages
    all_tool_calls = []
    all_files_modified = []

    for e in entries:
        all_tool_calls.extend(e.tool_calls)
        all_files_modified.extend(e.files_modified)

    # Deduplicate files
    seen_files = set()
    unique_files = []
    for f in all_files_modified:
        if f["path"] not in seen_files:
            seen_files.add(f["path"])
            unique_files.append(f)

    # Extrair data
    date_str = ""
    start_time = metadata.get("start_time", "")
    if start_time:
        try:
            dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except ValueError:
            date_str = datetime.now().strftime("%Y-%m-%d")
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")

    summary = SessionSummary(
        session_number=session_number,
        session_id=metadata.get("session_id", ""),
        slug=metadata.get("slug", ""),
        date=date_str,
        start_time=start_time,
        end_time=metadata.get("end_time", ""),
        duration_minutes=metadata.get("duration_minutes", 0),
        model=metadata.get("model", ""),
        total_input_tokens=metadata.get("total_input_tokens", 0),
        total_output_tokens=metadata.get("total_output_tokens", 0),
        total_cache_tokens=metadata.get("total_cache_tokens", 0),
        message_count=metadata.get("message_count", 0),
        tool_call_count=metadata.get("tool_call_count", 0),
        files_modified=unique_files,
    )

    # Extrair tópicos das mensagens do usuário
    summary.topics = _extract_topics(user_messages)

    # Extrair decisões
    summary.decisions = _extract_decisions(all_messages)

    # Extrair tarefas
    summary.tasks_completed = _extract_completed_tasks(all_messages)
    summary.tasks_pending = _extract_pending_tasks(all_messages, session_number, date_str)

    # Extrair erros
    summary.errors_resolved = _extract_errors(assistant_messages)

    # Extrair findings
    summary.key_findings = _extract_findings(assistant_messages)

    return summary


def _extract_topics(user_messages: list[str]) -> list[str]:
    """Identifica tópicos principais das mensagens do usuário."""
    topics = []
    for msg in user_messages:
        # Limpar mensagens muito longas
        msg_clean = msg[:500] if len(msg) > 500 else msg
        # Pegar a primeira frase significativa como tópico
        sentences = re.split(r'[.!?\n]', msg_clean)
        for s in sentences:
            s = s.strip()
            if len(s) > 10 and len(s) < 200:
                topics.append(s)
                break

    # Deduplicate e limitar
    seen = set()
    unique = []
    for t in topics:
        t_lower = t.lower()
        if t_lower not in seen:
            seen.add(t_lower)
            unique.append(t)

    return unique[:10]


def _extract_decisions(messages: list[str]) -> list[str]:
    """Encontra decisões nas mensagens."""
    decisions = []
    for msg in messages:
        for line in msg.split("\n"):
            line_lower = line.lower().strip()
            for marker in DECISION_MARKERS:
                if marker in line_lower:
                    clean = line.strip()
                    if 15 < len(clean) < 300:
                        decisions.append(clean)
                    break
    return list(dict.fromkeys(decisions))[:10]  # Deduplicate, max 10


def _extract_completed_tasks(messages: list[str]) -> list[str]:
    """Encontra tarefas concluídas."""
    completed = []
    patterns = [
        r"- \[x\]\s+(.+)",
        r"✅\s+(.+)",
        r"(?:concluí|completei|terminei|finalizei|done|completed|finished)\s+(.+)",
    ]
    for msg in messages:
        for line in msg.split("\n"):
            for pattern in patterns:
                m = re.search(pattern, line, re.IGNORECASE)
                if m:
                    task = m.group(1).strip()
                    if len(task) > 5:
                        completed.append(task)
    return list(dict.fromkeys(completed))[:15]


def _extract_pending_tasks(
    messages: list[str],
    session_number: int,
    date: str,
) -> list[PendingTask]:
    """Encontra tarefas pendentes. Foca em checkboxes não marcados nas mensagens do user."""
    tasks = []
    for msg in messages:
        # Ignorar mensagens muito longas (provavelmente tool results, não conversação)
        if len(msg) > 5000:
            continue

        for line in msg.split("\n"):
            stripped = line.strip()

            # Checkbox não marcado — sinal claro de tarefa
            m = re.match(r"- \[ \]\s+(.+)", stripped)
            if m:
                desc = m.group(1).strip()
                # Filtrar descrições que parecem código/documentação
                if 10 < len(desc) < 200 and not desc.startswith("`") and not desc.startswith("-"):
                    tasks.append(PendingTask(
                        description=desc,
                        source_session=session_number,
                        created_date=date,
                    ))

    # Deduplicate
    seen = set()
    unique = []
    for t in tasks:
        if t.description not in seen:
            seen.add(t.description)
            unique.append(t)

    return unique[:10]


def _extract_errors(assistant_messages: list[str]) -> list[dict]:
    """Encontra erros e suas soluções."""
    errors = []
    error_patterns = [
        r"(?:error|erro|falha|failed|exception)[\s:]+(.+)",
    ]
    for msg in assistant_messages:
        for pattern in error_patterns:
            matches = re.findall(pattern, msg, re.IGNORECASE)
            for match in matches:
                if len(match) > 10:
                    errors.append({"error": match[:200], "solution": ""})
    return errors[:5]


def _extract_findings(assistant_messages: list[str]) -> list[str]:
    """Extrai descobertas/findings importantes."""
    findings = []
    markers = [
        "descobri que", "encontrei", "notei que", "importante:",
        "found that", "noticed that", "important:", "key finding",
    ]
    for msg in assistant_messages:
        for line in msg.split("\n"):
            line_lower = line.lower().strip()
            for marker in markers:
                if marker in line_lower and len(line.strip()) > 20:
                    findings.append(line.strip()[:200])
                    break
    return list(dict.fromkeys(findings))[:5]


def save_session_summary(summary: SessionSummary):
    """Salva resumo como arquivo markdown."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    path = SESSIONS_DIR / f"session-{summary.session_number:03d}.md"

    lines = [
        f"# Sessão {summary.session_number:03d} — {summary.date}",
        f"**Slug:** {summary.slug} | **Duração:** ~{summary.duration_minutes}min | **Modelo:** {summary.model}",
        "",
    ]

    if summary.topics:
        lines.append("## Tópicos")
        for t in summary.topics:
            lines.append(f"- {t}")
        lines.append("")

    if summary.decisions:
        lines.append("## Decisões")
        for d in summary.decisions:
            lines.append(f"- {d}")
        lines.append("")

    if summary.tasks_completed:
        lines.append("## Tarefas Concluídas")
        for t in summary.tasks_completed:
            lines.append(f"- [x] {t}")
        lines.append("")

    if summary.tasks_pending:
        lines.append("## Tarefas Pendentes")
        for t in summary.tasks_pending:
            if isinstance(t, PendingTask):
                lines.append(f"- [ ] {t.description} (prioridade: {t.priority})")
            else:
                lines.append(f"- [ ] {t}")
        lines.append("")

    if summary.files_modified:
        lines.append("## Arquivos Modificados")
        for f in summary.files_modified:
            lines.append(f"- `{f['path']}` — {f['action']}")
        lines.append("")

    if summary.key_findings:
        lines.append("## Descobertas")
        for f in summary.key_findings:
            lines.append(f"- {f}")
        lines.append("")

    if summary.errors_resolved:
        lines.append("## Erros Resolvidos")
        for e in summary.errors_resolved:
            lines.append(f"- {e['error']}")
        lines.append("")

    if summary.open_questions:
        lines.append("## Questões em Aberto")
        for q in summary.open_questions:
            lines.append(f"- {q}")
        lines.append("")

    if summary.technical_debt:
        lines.append("## Dívida Técnica")
        for d in summary.technical_debt:
            lines.append(f"- {d}")
        lines.append("")

    lines.append("## Métricas")
    lines.append(f"- Input tokens: {summary.total_input_tokens:,}")
    lines.append(f"- Output tokens: {summary.total_output_tokens:,}")
    lines.append(f"- Cache tokens: {summary.total_cache_tokens:,}")
    lines.append(f"- Mensagens: {summary.message_count}")
    lines.append(f"- Tool calls: {summary.tool_call_count}")
    lines.append("")

    # Link para sessão anterior
    if summary.session_number > 1:
        prev = summary.session_number - 1
        lines.append("---")
        lines.append(f"*Sessão anterior: [session-{prev:03d}](session-{prev:03d}.md)*")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path
