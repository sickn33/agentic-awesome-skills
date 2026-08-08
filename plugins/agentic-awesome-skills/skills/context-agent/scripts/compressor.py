"""
Compressão inteligente e arquivamento de sessões antigas.
Mantém o histórico enxuto sem perder informação crítica.
"""

import shutil
from datetime import datetime
from pathlib import Path

from config import SESSIONS_DIR, ARCHIVE_DIR, ARCHIVE_AFTER_SESSIONS


def should_archive(session_number: int, current_session: int) -> bool:
    """Verifica se uma sessão deve ser arquivada."""
    return (current_session - session_number) > ARCHIVE_AFTER_SESSIONS


def archive_session(session_path: Path):
    """Move sessão para archive/ com resumo compacto."""
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    text = session_path.read_text(encoding="utf-8")
    compressed = _compress_session(text)

    archive_path = ARCHIVE_DIR / session_path.name
    archive_path.write_text(compressed, encoding="utf-8")

    session_path.unlink()


def _compress_session(text: str) -> str:
    """Comprime uma sessão mantendo apenas informação essencial."""
    lines = text.splitlines()
    compressed = []
    keep_sections = {
        "tópicos", "decisões", "tarefas pendentes",
        "descobertas", "erros resolvidos", "convenções",
    }
    skip_sections = {
        "métricas", "arquivos modificados", "dívida técnica",
    }

    current_section = ""
    keeping = True

    for line in lines:
        # Sempre manter cabeçalho
        if line.startswith("# Sessão"):
            compressed.append(line)
            compressed.append("")
            continue

        if line.startswith("## "):
            section_name = line[3:].strip().lower()
            if section_name in skip_sections:
                keeping = False
            elif section_name in keep_sections:
                keeping = True
                compressed.append(line)
            else:
                keeping = False
            current_section = section_name
            continue

        if keeping and line.strip():
            compressed.append(line)

    compressed.append("")
    compressed.append("*[Sessão arquivada — detalhes completos removidos]*")
    return "\n".join(compressed)


def compress_archive():
    """Consolida arquivos antigos em ARCHIVE_YYYY.md."""
    if not ARCHIVE_DIR.exists():
        return

    year = datetime.now().strftime("%Y")
    archive_files = sorted(ARCHIVE_DIR.glob("session-*.md"))

    if len(archive_files) < 5:
        return  # Não vale consolidar com poucos arquivos

    consolidated_path = ARCHIVE_DIR / f"ARCHIVE_{year}.md"
    consolidated_lines = [
        f"# Arquivo Consolidado — {year}",
        "",
    ]

    for af in archive_files:
        text = af.read_text(encoding="utf-8")
        # Extrair apenas título e decisões
        session_header = ""
        decisions = []
        in_decisions = False

        for line in text.splitlines():
            if line.startswith("# Sessão"):
                session_header = line
            elif line.startswith("## Decisões"):
                in_decisions = True
            elif line.startswith("## "):
                in_decisions = False
            elif in_decisions and line.strip().startswith("- "):
                decisions.append(line.strip())

        if session_header:
            consolidated_lines.append(f"### {session_header.lstrip('#').strip()}")
            for d in decisions:
                consolidated_lines.append(f"  {d}")
            consolidated_lines.append("")

        af.unlink()

    consolidated_path.write_text("\n".join(consolidated_lines), encoding="utf-8")


def auto_maintain(current_session: int):
    """Executa arquivamento e compressão automáticos."""
    if not SESSIONS_DIR.exists():
        return

    # Arquivar sessões antigas
    for session_file in sorted(SESSIONS_DIR.glob("session-*.md")):
        try:
            num = int(session_file.stem.split("-")[1])
        except (IndexError, ValueError):
            continue

        if should_archive(num, current_session):
            archive_session(session_file)

    # Consolidar arquivo se necessário
    compress_archive()


def get_archive_summary() -> str:
    """Retorna resumo do que está arquivado."""
    if not ARCHIVE_DIR.exists():
        return "Nenhuma sessão arquivada."

    archive_files = list(ARCHIVE_DIR.glob("*.md"))
    if not archive_files:
        return "Nenhuma sessão arquivada."

    lines = [f"Sessões arquivadas: {len(archive_files)} arquivo(s)"]
    for af in sorted(archive_files):
        lines.append(f"  - {af.name}")
    return "\n".join(lines)
