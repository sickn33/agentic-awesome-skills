"""
Parser dos logs JSONL do Claude Code.
Lê arquivos de sessão e extrai informações estruturadas.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Optional

from config import CLAUDE_SESSION_DIR, FILE_MODIFYING_TOOLS
from models import SessionEntry


def parse_session_file(path: Path) -> list[SessionEntry]:
    """Lê um arquivo JSONL e retorna lista de SessionEntry."""
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
                entry = _parse_raw_entry(raw)
                if entry:
                    entries.append(entry)
            except json.JSONDecodeError:
                continue
    return entries


def _parse_raw_entry(raw: dict) -> Optional[SessionEntry]:
    """Converte um dict JSON bruto em SessionEntry."""
    entry_type = raw.get("type", "")

    if entry_type == "queue-operation":
        return SessionEntry(
            type="queue",
            timestamp=raw.get("timestamp", ""),
            session_id=raw.get("sessionId", ""),
            content=raw.get("content", ""),
        )

    if entry_type not in ("user", "assistant"):
        return None

    msg = raw.get("message", {})
    role = msg.get("role", "")
    slug = raw.get("slug", "")
    session_id = raw.get("sessionId", "")
    timestamp = raw.get("timestamp", "")

    # Extrair texto e tool_calls do content
    text_parts = []
    tool_calls = []
    files_modified = []
    model = msg.get("model", "")

    content = msg.get("content", "")
    if isinstance(content, str):
        text_parts.append(content)
    elif isinstance(content, list):
        for block in content:
            if not isinstance(block, dict):
                continue
            block_type = block.get("type", "")
            if block_type == "text":
                text_parts.append(block.get("text", ""))
            elif block_type == "tool_use":
                tool_name = block.get("name", "")
                tool_input = block.get("input", {})
                tool_calls.append({"name": tool_name, "input": tool_input})
                # Detectar arquivos modificados
                if tool_name in FILE_MODIFYING_TOOLS:
                    fp = tool_input.get("file_path", "")
                    if fp:
                        files_modified.append({"path": fp, "action": tool_name.lower()})
            elif block_type == "tool_result":
                # Resultados de ferramentas (em mensagens do user)
                result_content = block.get("content", "")
                if isinstance(result_content, list):
                    for rc in result_content:
                        if isinstance(rc, dict) and rc.get("type") == "text":
                            text_parts.append(rc.get("text", ""))
                elif isinstance(result_content, str):
                    text_parts.append(result_content)

    # Token usage
    usage = msg.get("usage", {})
    token_usage = {}
    if usage:
        token_usage = {
            "input": usage.get("input_tokens", 0),
            "output": usage.get("output_tokens", 0),
            "cache_read": usage.get("cache_read_input_tokens", 0),
            "cache_creation": usage.get("cache_creation_input_tokens", 0),
        }

    return SessionEntry(
        type=entry_type,
        timestamp=timestamp,
        session_id=session_id,
        slug=slug,
        role=role,
        content="\n".join(text_parts),
        tool_calls=tool_calls,
        token_usage=token_usage,
        model=model,
        files_modified=files_modified,
    )


def extract_user_messages(entries: list[SessionEntry]) -> list[str]:
    """Extrai apenas o texto das mensagens do usuário."""
    return [e.content for e in entries if e.role == "user" and e.content.strip()]


def extract_assistant_messages(entries: list[SessionEntry]) -> list[str]:
    """Extrai apenas o texto das respostas do assistente."""
    return [e.content for e in entries if e.role == "assistant" and e.content.strip()]


def extract_tool_calls(entries: list[SessionEntry]) -> list[dict]:
    """Extrai todas as chamadas de ferramentas."""
    calls = []
    for e in entries:
        calls.extend(e.tool_calls)
    return calls


def extract_files_modified(entries: list[SessionEntry]) -> list[dict]:
    """Extrai lista de arquivos modificados (sem duplicatas)."""
    seen = set()
    files = []
    for e in entries:
        for f in e.files_modified:
            key = f["path"]
            if key not in seen:
                seen.add(key)
                files.append(f)
    return files


def get_session_metadata(entries: list[SessionEntry]) -> dict:
    """Extrai metadados da sessão: slug, timestamps, modelo, tokens."""
    if not entries:
        return {}

    timestamps = [e.timestamp for e in entries if e.timestamp]
    slugs = [e.slug for e in entries if e.slug]
    models = [e.model for e in entries if e.model]

    total_input = sum(e.token_usage.get("input", 0) for e in entries)
    total_output = sum(e.token_usage.get("output", 0) for e in entries)
    total_cache = sum(e.token_usage.get("cache_read", 0) for e in entries)

    user_msgs = [e for e in entries if e.role == "user"]
    assistant_msgs = [e for e in entries if e.role == "assistant"]

    # Calcular duração
    duration_minutes = 0
    if len(timestamps) >= 2:
        try:
            t_start = datetime.fromisoformat(timestamps[0].replace("Z", "+00:00"))
            t_end = datetime.fromisoformat(timestamps[-1].replace("Z", "+00:00"))
            duration_minutes = int((t_end - t_start).total_seconds() / 60)
        except (ValueError, IndexError):
            pass

    return {
        "slug": slugs[0] if slugs else "",
        "session_id": entries[0].session_id if entries else "",
        "start_time": timestamps[0] if timestamps else "",
        "end_time": timestamps[-1] if timestamps else "",
        "duration_minutes": duration_minutes,
        "model": models[0] if models else "",
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_cache_tokens": total_cache,
        "message_count": len(user_msgs) + len(assistant_msgs),
        "tool_call_count": sum(len(e.tool_calls) for e in entries),
    }


def get_latest_session_file() -> Optional[Path]:
    """Encontra o arquivo JSONL mais recente."""
    if not CLAUDE_SESSION_DIR.exists():
        return None
    jsonl_files = sorted(
        CLAUDE_SESSION_DIR.glob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return jsonl_files[0] if jsonl_files else None


def get_all_session_files() -> list[Path]:
    """Retorna todos os arquivos JSONL ordenados por data de modificação."""
    if not CLAUDE_SESSION_DIR.exists():
        return []
    return sorted(
        CLAUDE_SESSION_DIR.glob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
