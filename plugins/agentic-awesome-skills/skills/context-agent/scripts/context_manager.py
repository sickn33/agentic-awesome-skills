#!/usr/bin/env python3
"""
Context Manager — Entry point CLI do Context Agent.
Orquestra save, load, status, search, archive e maintain.

Uso:
  python context_manager.py init              # Bootstrap do sistema
  python context_manager.py save [--session PATH]  # Salvar contexto da sessão
  python context_manager.py load              # Carregar contexto (briefing)
  python context_manager.py status            # Status rápido
  python context_manager.py search QUERY      # Buscar no histórico
  python context_manager.py briefing          # Briefing completo
  python context_manager.py archive           # Arquivar sessões antigas
  python context_manager.py maintain          # Auto-manutenção
"""

import argparse
import io
import sys
from pathlib import Path

# Fix Windows console encoding for Unicode output
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Adicionar diretório dos scripts ao path
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DATA_DIR, SESSIONS_DIR, ARCHIVE_DIR, LOGS_DIR,
    ACTIVE_CONTEXT_PATH, PROJECT_REGISTRY_PATH,
)
from session_parser import (
    parse_session_file, get_latest_session_file, get_session_metadata,
    extract_files_modified, extract_tool_calls,
)
from session_summary import (
    generate_summary, save_session_summary, get_next_session_number,
)
from active_context import (
    load_active_context, update_active_context,
    save_active_context, sync_to_memory, check_drift,
)
from project_registry import (
    load_registry, save_registry, detect_projects_from_session, update_project,
)
from compressor import auto_maintain as compress_maintain
from context_loader import generate_briefing, get_quick_status
from search import init_search_db, index_session, search as fts_search, reindex_all


def cmd_init(args):
    """Bootstrap: cria diretórios e arquivos iniciais."""
    dirs = [DATA_DIR, SESSIONS_DIR, ARCHIVE_DIR, LOGS_DIR]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

    # Inicializar banco de busca
    init_search_db()

    # Criar ACTIVE_CONTEXT.md se não existir
    if not ACTIVE_CONTEXT_PATH.exists():
        ctx = load_active_context()
        projects = load_registry()
        save_active_context(ctx, projects)

    # Criar PROJECT_REGISTRY.md se não existir
    if not PROJECT_REGISTRY_PATH.exists():
        projects = load_registry()
        save_registry(projects)

    # Sincronizar com MEMORY.md
    sync_to_memory()

    print("Context Agent inicializado com sucesso!")
    print(f"  Diretório de dados: {DATA_DIR}")
    print(f"  Sessões: {SESSIONS_DIR}")
    print(f"  Arquivo: {ARCHIVE_DIR}")
    print(f"  Contexto ativo: {ACTIVE_CONTEXT_PATH}")
    print(f"  Registro de projetos: {PROJECT_REGISTRY_PATH}")


def cmd_save(args):
    """Salva contexto da sessão atual."""
    # Encontrar arquivo de sessão
    if args.session:
        session_path = Path(args.session)
    else:
        session_path = get_latest_session_file()

    if not session_path or not session_path.exists():
        print("Nenhum arquivo de sessão encontrado.")
        sys.exit(1)

    print(f"Processando sessão: {session_path.name}")

    # 1. Parse da sessão
    entries = parse_session_file(session_path)
    if not entries:
        print("Sessão vazia — nada para salvar.")
        return

    metadata = get_session_metadata(entries)
    session_number = get_next_session_number()

    print(f"  Sessão #{session_number:03d} — {metadata.get('slug', '?')}")
    print(f"  {metadata.get('message_count', 0)} mensagens, {metadata.get('tool_call_count', 0)} tool calls")

    # 2. Gerar resumo
    summary = generate_summary(entries, session_number, metadata)

    # 3. Detectar projetos tocados
    files_mod = extract_files_modified(entries)
    tool_calls = extract_tool_calls(entries)
    projects_touched = detect_projects_from_session(files_mod, tool_calls)
    summary.projects_touched = projects_touched

    # 4. Salvar resumo da sessão
    path = save_session_summary(summary)
    print(f"  Resumo salvo: {path}")

    # 5. Atualizar registro de projetos
    projects = load_registry()
    for pname in projects_touched:
        projects = update_project(
            projects, pname,
            last_touched=summary.date,
            last_session=session_number,
            status="active",
        )
    save_registry(projects)

    # 6. Atualizar contexto ativo
    ctx = load_active_context()
    ctx = update_active_context(ctx, summary)
    save_active_context(ctx, projects)

    # 7. Sincronizar com MEMORY.md
    sync_to_memory()
    print("  MEMORY.md sincronizado")

    # 8. Indexar para busca
    init_search_db()
    sections = {
        "topics": "\n".join(summary.topics),
        "decisions": "\n".join(summary.decisions),
        "tasks_completed": "\n".join(summary.tasks_completed),
        "tasks_pending": "\n".join(
            t.description if hasattr(t, 'description') else str(t)
            for t in summary.tasks_pending
        ),
        "files_modified": "\n".join(f["path"] for f in summary.files_modified),
        "key_findings": "\n".join(summary.key_findings),
        "errors": "\n".join(e["error"] for e in summary.errors_resolved),
    }
    index_session(session_number, summary.date, sections)
    print("  Índice de busca atualizado")

    print(f"\nContexto da sessão {session_number:03d} salvo com sucesso!")
    print(f"  Tópicos: {len(summary.topics)}")
    print(f"  Decisões: {len(summary.decisions)}")
    print(f"  Tarefas completadas: {len(summary.tasks_completed)}")
    print(f"  Tarefas pendentes: {len(summary.tasks_pending)}")
    print(f"  Arquivos modificados: {len(summary.files_modified)}")


def cmd_load(args):
    """Carrega contexto — briefing completo."""
    briefing = generate_briefing()
    print(briefing)


def cmd_status(args):
    """Status rápido."""
    status = get_quick_status()
    print(status)

    # Verificar drift
    if check_drift():
        print("\n⚠ ACTIVE_CONTEXT.md e MEMORY.md estão dessincronizados.")
        print("  Execute: python context_manager.py maintain")


def cmd_search(args):
    """Busca no histórico."""
    query = " ".join(args.query)
    if not query:
        print("Forneça um termo de busca.")
        sys.exit(1)

    init_search_db()
    results = fts_search(query)

    if not results:
        print(f"Nenhum resultado para: {query}")
        return

    print(f"Resultados para '{query}':")
    print()
    for r in results:
        print(f"  [session-{r.session_number:03d}] ({r.date}) [{r.section}]")
        print(f"    {r.snippet}")
        print()


def cmd_briefing(args):
    """Briefing detalhado."""
    briefing = generate_briefing()
    print(briefing)


def cmd_archive(args):
    """Arquivar sessões antigas."""
    from session_summary import get_next_session_number
    current = get_next_session_number() - 1
    if current <= 0:
        print("Nenhuma sessão para arquivar.")
        return

    compress_maintain(current)
    print(f"Manutenção concluída. Sessão mais recente: {current:03d}")


def cmd_maintain(args):
    """Auto-manutenção: arquivar, comprimir, sincronizar."""
    from session_summary import get_next_session_number
    current = get_next_session_number() - 1

    # 1. Arquivar sessões antigas
    if current > 0:
        compress_maintain(current)
        print("Sessões antigas arquivadas.")

    # 2. Verificar e corrigir drift
    if check_drift():
        sync_to_memory()
        print("MEMORY.md ressincronizado.")

    # 3. Reindexar busca
    init_search_db()
    reindex_all(SESSIONS_DIR)
    print("Índice de busca reconstruído.")

    print("\nManutenção concluída.")


def main():
    parser = argparse.ArgumentParser(
        description="Context Agent — Gerenciamento de contexto entre sessões",
    )
    subparsers = parser.add_subparsers(dest="command", help="Comando")

    # init
    subparsers.add_parser("init", help="Bootstrap do sistema")

    # save
    save_parser = subparsers.add_parser("save", help="Salvar contexto da sessão")
    save_parser.add_argument("--session", help="Path para arquivo JSONL específico")

    # load
    subparsers.add_parser("load", help="Carregar contexto (briefing)")

    # status
    subparsers.add_parser("status", help="Status rápido")

    # search
    search_parser = subparsers.add_parser("search", help="Buscar no histórico")
    search_parser.add_argument("query", nargs="+", help="Termo de busca")

    # briefing
    subparsers.add_parser("briefing", help="Briefing completo")

    # archive
    subparsers.add_parser("archive", help="Arquivar sessões antigas")

    # maintain
    subparsers.add_parser("maintain", help="Auto-manutenção")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "init": cmd_init,
        "save": cmd_save,
        "load": cmd_load,
        "status": cmd_status,
        "search": cmd_search,
        "briefing": cmd_briefing,
        "archive": cmd_archive,
        "maintain": cmd_maintain,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
